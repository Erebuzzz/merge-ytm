"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createBlend,
  fetchPlaylistSources,
  generateBlend,
  generateBlendAsync,
  getJobStatus,
  getBlend,
  uploadAuth,
  getYouTubeStatus,
} from "@/lib/api";
import { useSession } from "@/lib/auth/client";
import { useBlendStore } from "@/store/blend-store";
import { SectionCard } from "@/components/ui/section-card";
import { ConnectYouTubeMusic } from "@/components/auth/connect-youtube-music";
import { PlaylistPicker } from "@/components/blend/playlist-picker";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const YTM_URL_PATTERN = /^(https:\/\/music\.youtube\.com\/(playlist\?list=|watch\?.*list=)[A-Za-z0-9_\-]+|[A-Za-z0-9_\-]{10,})$/;

function validateYTMUrl(url: string): string | null {
  if (!url.trim()) return null;
  if (!YTM_URL_PATTERN.test(url.trim())) {
    return "Must be a YouTube Music playlist URL (music.youtube.com/playlist?list=...)";
  }
  return null;
}

async function pollJob(
  jobId: string,
  onProgress: (p: number, label: string) => void,
): Promise<void> {
  const MAX_MS = 10 * 60 * 1000;
  const start = Date.now();
  let delay = 1000;

  const STEP_LABELS: Record<string, string> = {
    fetch: "Fetching playlist tracks...",
    generate: "Scoring overlap and diversity...",
    export: "Creating YouTube Music playlist...",
  };

  while (Date.now() - start < MAX_MS) {
    await new Promise((r) => setTimeout(r, delay));
    const job = await getJobStatus(jobId);
    const label = STEP_LABELS[job.jobType] ?? "Processing...";
    onProgress(job.progress ?? 0, label);
    if (job.status === "done") return;
    if (job.status === "failed") throw new Error(job.errorMessage ?? "Job failed");
    delay = Math.min(delay * 2, 10000);
  }
  throw new Error("Timed out waiting for blend to complete. Please try again.");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ParticipantKey = "userA" | "userB";

const participantMeta: Record<ParticipantKey, { label: string; placeholder: string }> = {
  userA: { label: "Listener A", placeholder: "Aanya" },
  userB: { label: "Listener B", placeholder: "Kabir" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BlendForm() {
  const router = useRouter();
  const { data: session } = useSession();

  // Auth files (legacy headers_auth.json — optional)
  const [authFiles, setAuthFiles] = useState<Record<ParticipantKey, File | null>>({ userA: null, userB: null });
  // YouTube Music connection status per participant
  const [ytmConnected, setYtmConnected] = useState<Record<ParticipantKey, boolean>>({ userA: false, userB: false });
  // Playlist picker selected IDs per participant
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Record<ParticipantKey, string[]>>({ userA: [], userB: [] });
  // Show legacy upload panel
  const [showLegacy, setShowLegacy] = useState<Record<ParticipantKey, boolean>>({ userA: false, userB: false });

  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [linkErrors, setLinkErrors] = useState<Record<ParticipantKey, string[]>>({ userA: [], userB: [] });

  const {
    draft,
    error,
    isSubmitting,
    setParticipantName,
    setPlaylistLink,
    addPlaylistLink,
    removePlaylistLink,
    setIncludeLikedSongs,
    setSubmitting,
    setError,
    setResult,
  } = useBlendStore();

  // A participant has a valid source if:
  // - they have selected playlists from picker, OR
  // - they have pasted at least one valid URL, OR
  // - they have includeLikedSongs checked
  function participantHasSource(key: ParticipantKey): boolean {
    const p = draft[key];
    const hasPickedPlaylists = selectedPlaylistIds[key].length > 0;
    const hasPastedLinks = p.playlistLinks.some((l) => l.trim().length > 0);
    return hasPickedPlaylists || hasPastedLinks || p.includeLikedSongs;
  }

  const canSubmit = useMemo(() => {
    const hasLinkErrors = (["userA", "userB"] as ParticipantKey[]).some((key) =>
      linkErrors[key].some((e) => e !== ""),
    );
    if (hasLinkErrors) return false;
    return (["userA", "userB"] as ParticipantKey[]).every((key) => {
      const hasName = draft[key].name.trim().length > 0;
      return hasName && participantHasSource(key);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, linkErrors, selectedPlaylistIds]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setJobProgress(0);

    if (!canSubmit) {
      setError("Both listeners need a name and at least one music source.");
      return;
    }

    setSubmitting(true);

    try {
      // Build playlist links: combine picker IDs (as bare IDs) + manually pasted URLs
      const linksA = [
        ...selectedPlaylistIds.userA,
        ...draft.userA.playlistLinks.filter(Boolean),
      ].slice(0, 5);
      const linksB = [
        ...selectedPlaylistIds.userB,
        ...draft.userB.playlistLinks.filter(Boolean),
      ].slice(0, 5);

      setStatusLine("Creating blend record...");
      const created = await createBlend({
        userA: { ...draft.userA, playlistLinks: linksA },
        userB: { ...draft.userB, playlistLinks: linksB },
        creatorId: session?.user.id,
      });

      // Upload legacy auth files if provided
      for (const key of ["userA", "userB"] as ParticipantKey[]) {
        const file = authFiles[key];
        if (file) {
          setStatusLine(`Uploading auth for ${participantMeta[key].label}...`);
          await uploadAuth(created.userIds[key], file);
        }
      }

      // Fetch sources
      setStatusLine("Fetching playlist tracks...");
      const fetched = await fetchPlaylistSources(created.blendId, true);
      const failures = fetched.sources.filter((s) => s.status === "failed");
      if (failures.length > 0) {
        throw new Error(failures.map((s) => `${s.sourceType}: ${s.failureReason}`).join(" | "));
      }

      // Generate blend — use async path if Redis is available (taskId present), else sync
      setStatusLine("Generating blend...");
      let blend;
      try {
        const asyncResult = await generateBlendAsync(created.blendId);
        if (asyncResult.taskId || asyncResult.jobId) {
          const jobId = asyncResult.jobId ?? asyncResult.taskId!;
          await pollJob(jobId, (progress, label) => {
            setJobProgress(progress);
            setStatusLine(label);
          });
          blend = await getBlend(created.blendId);
        } else {
          // Already done (idempotent) or no Celery
          blend = await getBlend(created.blendId);
        }
      } catch {
        // Celery not configured — fall back to sync
        blend = await generateBlend(created.blendId);
      }

      setResult(blend);
      router.push(`/blend/${blend.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the blend.");
    } finally {
      setSubmitting(false);
      setStatusLine(null);
      setJobProgress(0);
    }
  }

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <div className="grid gap-8 xl:grid-cols-2">
        {(["userA", "userB"] as ParticipantKey[]).map((key) => {
          const participant = draft[key];
          const isConnected = ytmConnected[key];

          return (
            <SectionCard key={key} eyebrow={participantMeta[key].label} title={`Listener ${key === "userA" ? "A" : "B"}`}>
              <div className="space-y-5">
                {/* Name */}
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-muted">Name</span>
                  <input
                    value={participant.name}
                    onChange={(e) => setParticipantName(key, e.target.value)}
                    placeholder={participantMeta[key].placeholder}
                    className="w-full rounded-xl border border-white/10 bg-surface-highlight/50 px-4 py-3 text-sm text-white placeholder-text-muted outline-none transition-all focus:border-brand-ytmusic focus:ring-1 focus:ring-brand-ytmusic focus:bg-surface-elevated shadow-inner"
                  />
                </label>

                {/* YouTube Music connection */}
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-text-muted">YouTube Music</p>
                  <ConnectYouTubeMusic
                    onStatusChange={(s) => setYtmConnected((prev) => ({ ...prev, [key]: s.connected }))}
                    showLegacyOption={!isConnected}
                    onLegacyUploadClick={() => setShowLegacy((prev) => ({ ...prev, [key]: !prev[key] }))}
                  />
                </div>

                {/* Playlist picker (shown when connected) */}
                {isConnected && (
                  <PlaylistPicker
                    selectedIds={selectedPlaylistIds[key]}
                    onSelectionChange={(ids) => setSelectedPlaylistIds((prev) => ({ ...prev, [key]: ids }))}
                    includeLikedSongs={participant.includeLikedSongs}
                    onIncludeLikedSongsChange={(v) => setIncludeLikedSongs(key, v)}
                  />
                )}

                {/* Manual URL input (always available as fallback) */}
                <details className={isConnected ? "opacity-60" : ""}>
                  <summary className="text-xs font-bold uppercase tracking-wider text-text-muted cursor-pointer hover:text-white transition-colors select-none">
                    {isConnected ? "Or paste playlist URLs manually" : "Paste playlist URLs"}
                  </summary>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-muted">Up to 5 links</span>
                      <button
                        type="button"
                        onClick={() => addPlaylistLink(key)}
                        className="text-[10px] font-bold uppercase tracking-widest text-brand-ytmusic hover:text-white transition-colors"
                      >
                        + Add
                      </button>
                    </div>
                    {participant.playlistLinks.map((link, index) => (
                      <div key={`${key}-${index}`} className="flex flex-col gap-1">
                        <div className="flex gap-2">
                          <input
                            value={link}
                            onChange={(e) => {
                              setPlaylistLink(key, index, e.target.value);
                              const err = validateYTMUrl(e.target.value) ?? "";
                              setLinkErrors((cur) => {
                                const updated = [...(cur[key] ?? [])];
                                updated[index] = err;
                                return { ...cur, [key]: updated };
                              });
                            }}
                            placeholder="https://music.youtube.com/playlist?list=..."
                            className="w-full rounded-xl border border-white/10 bg-surface-highlight/50 px-4 py-3 text-sm text-white placeholder-text-muted outline-none transition-all focus:border-brand-ytmusic focus:ring-1 focus:ring-brand-ytmusic shadow-inner"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              removePlaylistLink(key, index);
                              setLinkErrors((cur) => {
                                const updated = [...(cur[key] ?? [])];
                                updated.splice(index, 1);
                                return { ...cur, [key]: updated };
                              });
                            }}
                            className="rounded-xl border border-white/10 bg-surface-elevated px-4 py-3 text-sm text-text-muted hover:text-brand-ytred hover:border-brand-ytred/30 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                        {linkErrors[key][index] && (
                          <p className="text-xs text-brand-ytred">{linkErrors[key][index]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </details>

                {/* Legacy headers_auth.json upload (collapsed by default) */}
                {showLegacy[key] && (
                  <div className="rounded-xl border border-white/10 bg-surface-highlight/20 p-4 space-y-3 animate-fade-in-up">
                    <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Advanced: headers_auth.json</p>
                    <div className="relative group cursor-pointer">
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={(e) => setAuthFiles((cur) => ({ ...cur, [key]: e.target.files?.[0] ?? null }))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-full rounded-xl border border-dashed border-white/20 bg-surface-highlight/20 px-4 py-4 text-sm text-text-muted text-center group-hover:border-brand-ytmusic group-hover:bg-brand-ytmusic/5 transition-colors">
                        {authFiles[key] ? (
                          <span className="text-brand-ytmusic font-semibold">✓ {authFiles[key]?.name}</span>
                        ) : "Click to select headers_auth.json"}
                      </div>
                    </div>
                    {!isConnected && (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={participant.includeLikedSongs}
                          onChange={(e) => setIncludeLikedSongs(key, e.target.checked)}
                          className="h-4 w-4 rounded border border-white/30 checked:bg-brand-ytmusic"
                        />
                        <span className="text-xs text-text-secondary">Include liked songs</span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            </SectionCard>
          );
        })}
      </div>

      {/* Submit area */}
      <div className="flex flex-col gap-6 rounded-3xl bg-surface-highlight/20 border border-white/5 p-8 md:flex-row md:items-center md:justify-between shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-ytmusic/5 to-brand-ytgradient1/5 pointer-events-none" />

        {/* Step indicators */}
        <div className="relative z-10 max-w-xl">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4">How it works</p>
          <div className="flex flex-col sm:flex-row gap-6 text-sm">
            {[
              { n: "1", label: "Fetch", desc: "Pulls tracks from your playlists." },
              { n: "2", label: "Normalize", desc: "Deduplicates and fuzzy matches." },
              { n: "3", label: "Blend", desc: "Scores overlap and diversity." },
            ].map((step) => (
              <div key={step.n} className="flex-1">
                <p className="font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-surface-border flex items-center justify-center text-[10px]">{step.n}</span>
                  {step.label}
                </p>
                <p className="mt-1 text-text-muted text-xs">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Button + status */}
        <div className="min-w-[17rem] relative z-10 space-y-3">
          <button
            type="submit"
            disabled={isSubmitting || !canSubmit}
            className={`w-full rounded-full px-8 py-4 text-sm font-bold transition-all shadow-xl ${
              isSubmitting || !canSubmit
                ? "bg-surface-border text-text-muted cursor-not-allowed"
                : "bg-white text-black hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            }`}
          >
            {isSubmitting ? "Generating..." : "Generate Blend"}
          </button>

          {/* Progress bar */}
          {isSubmitting && jobProgress > 0 && (
            <div className="w-full h-1.5 bg-surface-border rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-ytmusic rounded-full transition-all duration-500"
                style={{ width: `${jobProgress}%` }}
              />
            </div>
          )}

          {statusLine && (
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-brand-ytmusic animate-fade-in-up">
              <span className="w-3 h-3 rounded-full border-2 border-brand-ytmusic border-t-transparent animate-spin" />
              {statusLine}
            </div>
          )}

          {error && (
            <div className="text-center text-xs font-medium text-brand-ytred bg-brand-ytred/10 border border-brand-ytred/20 rounded-lg p-2 animate-fade-in-up">
              {error}
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
