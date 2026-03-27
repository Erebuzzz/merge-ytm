"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";

import { createBlend, fetchPlaylistSources, generateBlend, uploadAuth } from "@/lib/api";
import { useBlendStore } from "@/store/blend-store";
import { SectionCard } from "@/components/ui/section-card";

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
  const [authFiles, setAuthFiles] = useState<Record<ParticipantKey, File | null>>({
    userA: null,
    userB: null,
  });
  const [statusLine, setStatusLine] = useState<string | null>(null);
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
    return (["userA", "userB"] as ParticipantKey[]).every((key) => {
      const participant = draft[key];
      const hasName = participant.name.trim().length > 0;
      const hasPlaylist = participant.playlistLinks.some((link) => link.trim().length > 0);
      const hasLikedSongs = participant.includeLikedSongs;
      return hasName && (hasPlaylist || hasLikedSongs);
    });
  }, [draft]);

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
      const created = await createBlend(draft);

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
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-6 xl:grid-cols-2">
        {(["userA", "userB"] as ParticipantKey[]).map((key) => {
          const participant = draft[key];

          return (
            <SectionCard key={key} eyebrow={participantMeta[key].label} title={participantMeta[key].description}>
              <div className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#3b3238]">Name</span>
                  <input
                    value={participant.name}
                    onChange={(event) => setParticipantName(key, event.target.value)}
                    placeholder={key === "userA" ? "Aanya" : "Kabir"}
                    className="w-full rounded-2xl border border-[#1d1720]/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#d96e3d] focus:ring-2 focus:ring-[#d96e3d]/20"
                  />
                </label>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#3b3238]">Playlist links</p>
                    <button
                      type="button"
                      onClick={() => addPlaylistLink(key)}
                      className="rounded-full border border-[#1d1720]/10 px-3 py-1 text-xs font-semibold transition hover:border-[#d96e3d] hover:text-[#d96e3d]"
                    >
                      Add link
                    </button>
                  </div>

                  {participant.playlistLinks.map((link, index) => (
                    <div key={`${key}-${index}`} className="flex gap-3">
                      <input
                        value={link}
                        onChange={(event) => setPlaylistLink(key, index, event.target.value)}
                        placeholder="https://music.youtube.com/playlist?list=..."
                        className="w-full rounded-2xl border border-[#1d1720]/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#d96e3d] focus:ring-2 focus:ring-[#d96e3d]/20"
                      />
                      <button
                        type="button"
                        onClick={() => removePlaylistLink(key, index)}
                        className="rounded-2xl border border-[#1d1720]/10 px-4 py-3 text-sm font-semibold transition hover:border-[#d96e3d] hover:text-[#d96e3d]"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-[#1d1720]/10 bg-[#f8efe5] px-4 py-4">
                  <input
                    checked={participant.includeLikedSongs}
                    onChange={(event) => setIncludeLikedSongs(key, event.target.checked)}
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-[#1d1720]/20 text-[#d96e3d] focus:ring-[#d96e3d]"
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-semibold text-[#1d1720]">Include liked songs</span>
                    <span className="block text-sm text-[#5d5257]">
                      Requires <code>headers_auth.json</code>. Attach it below or use the separate auth page later.
                    </span>
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#3b3238]">Optional auth upload</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] ?? null;
                      setAuthFiles((current) => ({ ...current, [key]: nextFile }));
                    }}
                    className="block w-full rounded-2xl border border-dashed border-[#1d1720]/15 bg-white px-4 py-4 text-sm text-[#5d5257]"
                  />
                </label>
              </div>
            </SectionCard>
          );
        })}
      </div>

      <SectionCard eyebrow="Flow" title="What the app does once you submit">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-[#f8efe5] px-4 py-4 text-sm text-[#5d5257]">
            <p className="font-semibold text-[#1d1720]">Fetch</p>
            <p className="mt-2">The backend pulls tracks from playlist links and liked songs sources with retries.</p>
          </div>
          <div className="rounded-2xl bg-[#f8efe5] px-4 py-4 text-sm text-[#5d5257]">
            <p className="font-semibold text-[#1d1720]">Normalize</p>
            <p className="mt-2">Titles and artists are cleaned, deduplicated, and fuzzy matched.</p>
          </div>
          <div className="rounded-2xl bg-[#f8efe5] px-4 py-4 text-sm text-[#5d5257]">
            <p className="font-semibold text-[#1d1720]">Blend</p>
            <p className="mt-2">The engine scores overlap, artist similarity, and diversity to shape the final sections.</p>
          </div>
        </div>
      </SectionCard>

      <div className="flex flex-col gap-4 rounded-[30px] bg-[#1d1720] px-6 py-6 text-[#f9f0e3] md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[#f3a56b]">Need to upload later?</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#f9f0e3]/72">
            You can attach auth files now for a one-pass flow, or use the separate upload page once the users exist.
          </p>
          <Link href="/auth-upload" className="mt-3 inline-flex text-sm font-semibold text-[#f3a56b] transition hover:text-white">
            Open auth upload
          </Link>
        </div>

        <div className="min-w-[17rem]">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-[#f3a56b] px-6 py-3 text-sm font-semibold text-[#1d1720] transition hover:bg-[#ffc085] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Building blend..." : "Generate blend"}
          </button>
          {statusLine ? <p className="mt-3 text-sm text-[#f9f0e3]/70">{statusLine}</p> : null}
          {error ? <p className="mt-2 text-sm text-[#ffb8a3]">{error}</p> : null}
        </div>
      </div>
    </form>
  );
}
