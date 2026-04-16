"use client";

import { type FormEvent, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  createBlend,
  fetchPlaylistSources,
  generateBlend,
  generateBlendAsync,
  getJobStatus,
  getBlend,
} from "@/lib/api";
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

type ParticipantKey = "userA" | "userB";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BlendForm() {
  const router = useRouter();

  const [localUser, setLocalUser] = useState<{ id: string; name: string } | null>(null);

  // Load the current user for userA automatically
  useEffect(() => {
    const stored = localStorage.getItem("merge_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setLocalUser(u);
        setParticipantName("userA", u.name);
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Connection status just for userA (Listener B can't connect from A's browser)
  const [ytmConnectedA, setYtmConnectedA] = useState(false);
  const [selectedPlaylistIdsA, setSelectedPlaylistIdsA] = useState<string[]>([]);
  
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

  function participantHasSource(key: ParticipantKey): boolean {
    const p = draft[key];
    const hasPickedPlaylists = key === "userA" ? selectedPlaylistIdsA.length > 0 : false;
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
  }, [draft, linkErrors, selectedPlaylistIdsA]);

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
      const linksA = [
        ...selectedPlaylistIdsA,
        ...draft.userA.playlistLinks.filter(Boolean),
      ].slice(0, 5);
      const linksB = [...draft.userB.playlistLinks.filter(Boolean)].slice(0, 5);

      setStatusLine("Creating blend record...");
      const created = await createBlend({
        userA: { ...draft.userA, playlistLinks: linksA },
        userB: { ...draft.userB, playlistLinks: linksB },
        creatorId: localUser?.id,
      });

      setStatusLine("Fetching playlist tracks...");
      const fetched = await fetchPlaylistSources(created.blendId, true);
      const failures = fetched.sources.filter((s) => s.status === "failed");
      if (failures.length > 0) {
        throw new Error(failures.map((s) => `${s.sourceType}: ${s.failureReason}`).join(" | "));
      }

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
          blend = await getBlend(created.blendId);
        }
      } catch {
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
    <div className="space-y-8 animate-fade-in-up">
      {/* Mode Switcher */}
      <div className="flex border-b border-surface-border mb-8">
        <div className="px-6 py-3 border-b-2 border-brand-ytmusic text-white font-bold text-sm">
          Paste Playlists
        </div>
        <Link href="/invite" className="px-6 py-3 text-text-muted hover:text-white transition font-medium text-sm">
          Send Invite Link
        </Link>
      </div>

      <form className="space-y-8" onSubmit={handleSubmit}>
        <div className="grid gap-8 xl:grid-cols-2">
          
          {/* USER A: The Logged In User */}
          <SectionCard eyebrow="Your Music" title="Listener A">
            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-muted">Name</span>
                <input
                  value={draft.userA.name}
                  onChange={(e) => setParticipantName("userA", e.target.value)}
                  placeholder="Your Name"
                  readOnly={!!localUser}
                  className={`w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-white focus:outline-none ${localUser ? 'bg-surface-elevated/50 text-white/50 cursor-not-allowed' : 'bg-surface-highlight/50 focus:border-brand-ytmusic'}`}
                />
              </label>

              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted">YouTube Music</p>
                <ConnectYouTubeMusic
                  onStatusChange={(s) => setYtmConnectedA(s.connected)}
                />
              </div>

              {ytmConnectedA && (
                <PlaylistPicker
                  selectedIds={selectedPlaylistIdsA}
                  onSelectionChange={(ids) => setSelectedPlaylistIdsA(ids)}
                  includeLikedSongs={draft.userA.includeLikedSongs}
                  onIncludeLikedSongsChange={(v) => setIncludeLikedSongs("userA", v)}
                />
              )}

              <details className={ytmConnectedA ? "opacity-60" : ""}>
                <summary className="text-xs font-bold uppercase tracking-wider text-text-muted cursor-pointer hover:text-white transition-colors select-none">
                  {ytmConnectedA ? "Or paste playlist URLs manually" : "Paste playlist URLs"}
                </summary>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Up to 5 links</span>
                    <button
                      type="button"
                      onClick={() => addPlaylistLink("userA")}
                      className="text-[10px] font-bold uppercase tracking-widest text-brand-ytmusic hover:text-white transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                  {draft.userA.playlistLinks.map((link, index) => (
                    <div key={`userA-${index}`} className="flex flex-col gap-1">
                      <div className="flex gap-2">
                        <input
                          value={link}
                          onChange={(e) => {
                            setPlaylistLink("userA", index, e.target.value);
                            const err = validateYTMUrl(e.target.value) ?? "";
                            setLinkErrors((cur) => {
                              const updated = [...(cur.userA ?? [])];
                              updated[index] = err;
                              return { ...cur, userA: updated };
                            });
                          }}
                          placeholder="https://music.youtube.com/playlist?list=..."
                          className="w-full rounded-xl border border-white/10 bg-surface-highlight/50 px-4 py-3 text-sm text-white placeholder-text-muted outline-none transition-all focus:border-brand-ytmusic focus:ring-1 focus:ring-brand-ytmusic shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            removePlaylistLink("userA", index);
                            setLinkErrors((cur) => {
                              const updated = [...(cur.userA ?? [])];
                              updated.splice(index, 1);
                              return { ...cur, userA: updated };
                            });
                          }}
                          className="rounded-xl border border-white/10 bg-surface-elevated px-4 py-3 text-sm text-text-muted hover:text-brand-ytred hover:border-brand-ytred/30 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                      {linkErrors.userA[index] && (
                        <p className="text-xs text-brand-ytred">{linkErrors.userA[index]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </SectionCard>

          {/* USER B: The Friend (Manual URLs only) */}
          <SectionCard eyebrow="Friend's Music" title="Listener B">
            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-muted">Friend&apos;s Name</span>
                <input
                  value={draft.userB.name}
                  onChange={(e) => setParticipantName("userB", e.target.value)}
                  placeholder="Kabir"
                  className="w-full rounded-xl border border-white/10 bg-surface-highlight/50 px-4 py-3 text-sm text-white placeholder-text-muted outline-none transition-all focus:border-brand-ytmusic focus:ring-1 focus:ring-brand-ytmusic focus:bg-surface-elevated shadow-inner"
                />
              </label>

              <div className="rounded-xl border border-white/5 bg-surface-highlight/20 p-4 mb-4">
                <p className="text-sm text-text-secondary mb-2">Want your friend to log in and select their own playlists?</p>
                <Link href="/invite" className="text-xs font-bold uppercase tracking-widest text-brand-spotify hover:text-white transition-colors">
                  Send an Invite Link →
                </Link>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 cursor-pointer hover:text-white transition-colors select-none">
                  Paste public playlist URLs
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Up to 5 links</span>
                    <button
                      type="button"
                      onClick={() => addPlaylistLink("userB")}
                      className="text-[10px] font-bold uppercase tracking-widest text-brand-ytmusic hover:text-white transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                  {draft.userB.playlistLinks.map((link, index) => (
                    <div key={`userB-${index}`} className="flex flex-col gap-1">
                      <div className="flex gap-2">
                        <input
                          value={link}
                          onChange={(e) => {
                            setPlaylistLink("userB", index, e.target.value);
                            const err = validateYTMUrl(e.target.value) ?? "";
                            setLinkErrors((cur) => {
                              const updated = [...(cur.userB ?? [])];
                              updated[index] = err;
                              return { ...cur, userB: updated };
                            });
                          }}
                          placeholder="https://music.youtube.com/playlist?list=..."
                          className="w-full rounded-xl border border-white/10 bg-surface-highlight/50 px-4 py-3 text-sm text-white placeholder-text-muted outline-none transition-all focus:border-brand-ytmusic focus:ring-1 focus:ring-brand-ytmusic shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            removePlaylistLink("userB", index);
                            setLinkErrors((cur) => {
                              const updated = [...(cur.userB ?? [])];
                              updated.splice(index, 1);
                              return { ...cur, userB: updated };
                            });
                          }}
                          className="rounded-xl border border-white/10 bg-surface-elevated px-4 py-3 text-sm text-text-muted hover:text-brand-ytred hover:border-brand-ytred/30 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                      {linkErrors.userB[index] && (
                        <p className="text-xs text-brand-ytred">{linkErrors.userB[index]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Submit area */}
        <div className="flex flex-col gap-6 rounded-3xl bg-surface-highlight/20 border border-white/5 p-8 md:flex-row md:items-center md:justify-between shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-ytmusic/5 to-brand-ytgradient1/5 pointer-events-none" />

          <div className="relative z-10 max-w-xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4">How it works</p>
            <div className="flex flex-col sm:flex-row gap-6 text-sm">
              {[
                { n: "1", label: "Fetch", desc: "Pulls tracks from playlists." },
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
    </div>
  );
}
