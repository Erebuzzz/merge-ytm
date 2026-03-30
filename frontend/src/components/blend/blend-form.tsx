"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";

const YTM_URL_PATTERN = /^(https:\/\/music\.youtube\.com\/(playlist\?list=|watch\?.*list=)[A-Za-z0-9_\-]+|[A-Za-z0-9_\-]{10,})$/;

function validateYTMUrl(url: string): string | null {
  if (!url.trim()) return null; // empty is ok
  if (!YTM_URL_PATTERN.test(url.trim())) {
    return "Must be a YouTube Music playlist URL (music.youtube.com/playlist?list=...)";
  }
  return null;
}

import { createBlend, fetchPlaylistSources, generateBlend, uploadAuth } from "@/lib/api";
import { useSession } from "@/lib/auth/client";
import { useBlendStore } from "@/store/blend-store";
import { SectionCard } from "@/components/ui/section-card";

async function pollJobStatus(jobId: string, onProgress?: (progress: number) => void): Promise<void> {
  const MAX_WAIT_MS = 10 * 60 * 1000; // 10 minutes
  const start = Date.now();
  let delay = 1000;
  const MAX_DELAY = 10000;

  while (Date.now() - start < MAX_WAIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, delay));

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/job/${jobId}`, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) break;

    const job = await response.json();
    onProgress?.(job.progress ?? 0);

    if (job.status === "done") return;
    if (job.status === "failed") throw new Error(job.errorMessage ?? "Job failed");

    delay = Math.min(delay * 2, MAX_DELAY);
  }
}

type ParticipantKey = "userA" | "userB";

const participantMeta: Record<ParticipantKey, { label: string; description: string }> = {
  userA: {
    label: "Listener A",
    description: "Anchor the shared center with someone whose taste defines the blend.",
  },
  userB: {
    label: "Listener B",
    description: "Add contrast and let the engine pull out the strongest overlaps.",
  },
};

export function BlendForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const [authFiles, setAuthFiles] = useState<Record<ParticipantKey, File | null>>({
    userA: null,
    userB: null,
  });
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [linkErrors, setLinkErrors] = useState<Record<ParticipantKey, string[]>>({
    userA: [],
    userB: [],
  });
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

  const canSubmit = useMemo(() => {
    const hasLinkErrors = (["userA", "userB"] as ParticipantKey[]).some((key) =>
      linkErrors[key].some((e) => e !== ""),
    );
    if (hasLinkErrors) return false;
    return (["userA", "userB"] as ParticipantKey[]).every((key) => {
      const participant = draft[key];
      const hasName = participant.name.trim().length > 0;
      const hasPlaylist = participant.playlistLinks.some((link) => link.trim().length > 0);
      const hasLikedSongs = participant.includeLikedSongs;
      return hasName && (hasPlaylist || hasLikedSongs);
    });
  }, [draft, linkErrors]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!canSubmit) {
      setError("Both listeners need a name and at least one music source.");
      return;
    }

    const missingAuth = (["userA", "userB"] as ParticipantKey[]).find(
      (key) => draft[key].includeLikedSongs && !authFiles[key],
    );
    if (missingAuth) {
      setError("Attach headers_auth.json for every listener who enables liked songs import.");
      return;
    }

    setSubmitting(true);

    try {
      setStatusLine("Creating a backend record for this blend");
      const created = await createBlend({ ...draft, creatorId: session?.user.id });

      for (const key of ["userA", "userB"] as ParticipantKey[]) {
        const file = authFiles[key];
        if (!file) {
          continue;
        }

        setStatusLine(`Uploading auth for ${participantMeta[key].label}`);
        await uploadAuth(created.userIds[key], file);
      }

      setStatusLine("Fetching playlist and liked songs data");
      const fetched = await fetchPlaylistSources(created.blendId, true);
      const failures = fetched.sources.filter((source) => source.status === "failed");
      if (failures.length > 0) {
        throw new Error(failures.map((source) => `${source.sourceType}: ${source.failureReason}`).join(" | "));
      }

      setStatusLine("Scoring overlap, similarity, and diversity");
      const blend = await generateBlend(created.blendId);
      setResult(blend);
      router.push(`/blend/${blend.id}`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Could not build the blend.");
    } finally {
      setSubmitting(false);
      setStatusLine(null);
    }
  }

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <div className="grid gap-8 xl:grid-cols-2">
        {(["userA", "userB"] as ParticipantKey[]).map((key) => {
          const participant = draft[key];

          return (
            <SectionCard key={key} eyebrow={participantMeta[key].label} title={participantMeta[key].description}>
              <div className="space-y-6">
                <label className="block relative group">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-muted transition-colors group-focus-within:text-white">Name</span>
                  <input
                    value={participant.name}
                    onChange={(event) => setParticipantName(key, event.target.value)}
                    placeholder={key === "userA" ? "Aanya" : "Kabir"}
                    className="w-full rounded-xl border border-white/10 bg-surface-highlight/50 px-4 py-3 text-sm text-white placeholder-text-muted outline-none transition-all duration-300 focus:border-brand-spotify focus:ring-1 focus:ring-brand-spotify focus:bg-surface-elevated shadow-inner"
                  />
                </label>

                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-white/5">
                    <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Playlist links</p>
                    <button
                      type="button"
                      onClick={() => addPlaylistLink(key)}
                      className="group flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-brand-spotify hover:text-white transition-colors"
                    >
                      <span className="w-4 h-4 rounded-full bg-brand-spotify/10 flex items-center justify-center group-hover:bg-brand-spotify group-hover:text-black transition-colors">+</span> Add
                    </button>
                  </div>

                  {participant.playlistLinks.map((link, index) => (
                    <div key={`${key}-${index}`} className="flex flex-col gap-1 animate-fade-in-up">
                      <div className="flex gap-2">
                        <input
                          value={link}
                          onChange={(event) => {
                            const newValue = event.target.value;
                            setPlaylistLink(key, index, newValue);
                            const error = validateYTMUrl(newValue) ?? "";
                            setLinkErrors((current) => {
                              const updated = [...(current[key] ?? [])];
                              updated[index] = error;
                              return { ...current, [key]: updated };
                            });
                          }}
                          placeholder="https://music.youtube.com/playlist?list=..."
                          className="w-full rounded-xl border border-white/10 bg-surface-highlight/50 px-4 py-3 text-sm text-white placeholder-text-muted outline-none transition-all duration-300 focus:border-brand-ytmusic focus:ring-1 focus:ring-brand-ytmusic focus:bg-surface-elevated shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            removePlaylistLink(key, index);
                            setLinkErrors((current) => {
                              const updated = [...(current[key] ?? [])];
                              updated.splice(index, 1);
                              return { ...current, [key]: updated };
                            });
                          }}
                          className="rounded-xl border border-white/10 bg-surface-elevated px-4 py-3 text-sm font-semibold text-text-muted transition-colors hover:border-brand-ytgradient2 hover:text-brand-ytgradient2 hover:bg-brand-ytgradient2/10"
                        >
                          ✕
                        </button>
                      </div>
                      {linkErrors[key][index] && (
                        <p className="text-xs text-brand-ytred mt-1">{linkErrors[key][index]}</p>
                      )}
                    </div>
                  ))}
                </div>

                <label className="flex items-start gap-4 rounded-xl border border-white/10 bg-surface-highlight/30 px-5 py-4 cursor-pointer hover:bg-surface-highlight/60 transition-colors">
                  <input
                    checked={participant.includeLikedSongs}
                    onChange={(event) => setIncludeLikedSongs(key, event.target.checked)}
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 appearance-none rounded border border-white/30 checked:bg-brand-spotify checked:border-brand-spotify flex-shrink-0 relative 
                      before:content-['✓'] before:absolute before:text-white before:text-[10px] before:left-0.5 before:top-px before:font-bold before:opacity-0 checked:before:opacity-100 transition-all"
                  />
                  <span className="space-y-1 block">
                    <span className="block text-sm font-bold text-white">Include liked songs</span>
                    <span className="block text-xs text-text-muted leading-relaxed">
                      Requires <code className="bg-surface-elevated px-1 py-0.5 rounded text-brand-ytgradient2">headers_auth.json</code>. Attach it below or use the separate auth page later.
                    </span>
                  </span>
                </label>

                {/* Only show auth upload if liked songs is checked to keep UI clean, though original had it always visible */}
                <div className={`transition-all duration-500 overflow-hidden ${participant.includeLikedSongs ? 'max-h-40 opacity-100' : 'max-h-24 opacity-50'}`}>
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-muted">Auth Upload (.json)</span>
                    <div className="relative group cursor-pointer">
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={(event) => {
                          const nextFile = event.target.files?.[0] ?? null;
                          setAuthFiles((current) => ({ ...current, [key]: nextFile }));
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-full rounded-xl border border-dashed border-white/20 bg-surface-highlight/20 px-4 py-4 text-sm text-text-muted text-center group-hover:border-brand-spotify group-hover:bg-brand-spotify/5 transition-colors">
                       {authFiles[key] ? (
                         <span className="text-brand-spotify font-semibold flex items-center justify-center gap-2">✓ {authFiles[key]?.name}</span>
                       ) : "Click to select or drop headers file"}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </SectionCard>
          );
        })}
      </div>

      <div className="flex flex-col gap-6 rounded-3xl bg-surface-highlight/20 border border-white/5 p-8 md:flex-row md:items-center md:justify-between shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-r from-transparent via-brand-spotify/5 to-brand-ytmusic/5 pointer-events-none"></div>
        <div className="relative z-10 max-w-xl">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Progress Flow</p>
          <div className="mt-4 flex flex-col sm:flex-row gap-6 text-sm">
            <div className="flex-1">
              <p className="font-bold text-white flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-surface-border flex items-center justify-center text-[10px]">1</span> Fetch</p>
              <p className="mt-1 text-text-muted text-xs leading-relaxed">Pulls tracks from playlists and liked sources.</p>
            </div>
            <div className="flex-1">
              <p className="font-bold text-white flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-surface-border flex items-center justify-center text-[10px]">2</span> Normalize</p>
              <p className="mt-1 text-text-muted text-xs leading-relaxed">Cleans, deduplicates, and fuzzy matches titles.</p>
            </div>
            <div className="flex-1">
              <p className="font-bold text-white flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-surface-border flex items-center justify-center text-[10px]">3</span> Blend</p>
              <p className="mt-1 text-text-muted text-xs leading-relaxed">Scores overlap, similarity, and diversity.</p>
            </div>
          </div>
        </div>

        <div className="min-w-[17rem] relative z-10">
          <button
            type="submit"
            disabled={isSubmitting || !canSubmit}
            className={`w-full rounded-full px-8 py-4 text-sm font-bold transition-all shadow-xl
              ${isSubmitting || !canSubmit 
                ? "bg-surface-border text-text-muted cursor-not-allowed" 
                : "bg-white text-black hover:scale-105 hover:shadow-[0_0_30px_rgba(29,185,84,0.3)]"}`}
          >
            {isSubmitting ? "Generating..." : "Generate Blend"}
          </button>
          
          {statusLine ? (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-brand-spotify animate-fade-in-up">
              <span className="w-3 h-3 rounded-full border-2 border-brand-spotify border-t-transparent animate-spin"></span>
              {statusLine}
            </div>
          ) : null}
          
          {error ? (
            <div className="mt-4 text-center text-xs font-medium text-brand-ytred bg-brand-ytred/10 border border-brand-ytred/20 rounded-lg p-2 animate-fade-in-up">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </form>
  );
}
