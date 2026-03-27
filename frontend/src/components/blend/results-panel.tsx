"use client";

import Link from "next/link";
import { useState } from "react";

import { createYTMusicPlaylist } from "@/lib/api";
import type { BlendDetail } from "@/types/blend";
import { SectionCard } from "@/components/ui/section-card";

type ResultsPanelProps = {
  blend: BlendDetail;
};

export function ResultsPanel({ blend }: ResultsPanelProps) {
  const [selectedUserId, setSelectedUserId] = useState(
    blend.participants.userA.hasAuth ? blend.participants.userA.userId : blend.participants.userB.userId,
  );
  const [playlistTitle, setPlaylistTitle] = useState(
    `${blend.participants.userA.name} + ${blend.participants.userB.name} Blend`,
  );
  const [playlistDescription, setPlaylistDescription] = useState("Private playlist created by YTMusic Sync.");
  const [exportState, setExportState] = useState<{
    status: "idle" | "submitting" | "success" | "error";
    message?: string;
  }>({ status: "idle" });

  const canExport = blend.participants.userA.hasAuth || blend.participants.userB.hasAuth;

  async function handleExport() {
    if (!canExport) {
      setExportState({
        status: "error",
        message: "Upload headers_auth.json for one of the listeners before exporting.",
      });
      return;
    }

    setExportState({
      status: "submitting",
      message: "Creating the private playlist on YouTube Music",
    });

    try {
      const result = await createYTMusicPlaylist({
        blendId: blend.id,
        userId: selectedUserId,
        title: playlistTitle,
        description: playlistDescription,
      });

      setExportState({
        status: "success",
        message: `Playlist created with id ${result.playlistId}.`,
      });
    } catch (error) {
      setExportState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not create the playlist.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <SectionCard eyebrow="Compatibility" title={`${blend.compatibilityScore.toFixed(1)}% overlap`}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-[#f8efe5] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d96e3d]">Shared tracks</p>
              <p className="mt-3 text-3xl font-semibold text-[#1d1720]">{String(blend.diagnostics.commonCount ?? 0)}</p>
            </div>
            <div className="rounded-2xl bg-[#f8efe5] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d96e3d]">Listener A pool</p>
              <p className="mt-3 text-3xl font-semibold text-[#1d1720]">{String(blend.diagnostics.userACount ?? 0)}</p>
            </div>
            <div className="rounded-2xl bg-[#f8efe5] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d96e3d]">Listener B pool</p>
              <p className="mt-3 text-3xl font-semibold text-[#1d1720]">{String(blend.diagnostics.userBCount ?? 0)}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[#1d1720]/10 bg-white px-4 py-4 text-sm leading-7 text-[#5d5257]">
            Shared taste seeds the front of the playlist, then the two side sections pull in unique tracks that still map back to the common
            center through artist similarity and diversity balancing.
          </div>
        </SectionCard>

        <SectionCard eyebrow="Export" title="Push to YouTube Music">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#3b3238]">Export with</span>
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="w-full rounded-2xl border border-[#1d1720]/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#d96e3d] focus:ring-2 focus:ring-[#d96e3d]/20"
              >
                <option value={blend.participants.userA.userId}>
                  {blend.participants.userA.name}
                  {blend.participants.userA.hasAuth ? "" : " (auth missing)"}
                </option>
                <option value={blend.participants.userB.userId}>
                  {blend.participants.userB.name}
                  {blend.participants.userB.hasAuth ? "" : " (auth missing)"}
                </option>
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href={`/auth-upload?userId=${blend.participants.userA.userId}`}
                className="rounded-2xl border border-[#1d1720]/10 px-4 py-3 text-sm font-semibold transition hover:border-[#d96e3d] hover:text-[#d96e3d]"
              >
                Upload auth for {blend.participants.userA.name}
              </Link>
              <Link
                href={`/auth-upload?userId=${blend.participants.userB.userId}`}
                className="rounded-2xl border border-[#1d1720]/10 px-4 py-3 text-sm font-semibold transition hover:border-[#d96e3d] hover:text-[#d96e3d]"
              >
                Upload auth for {blend.participants.userB.name}
              </Link>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#3b3238]">Playlist title</span>
              <input
                value={playlistTitle}
                onChange={(event) => setPlaylistTitle(event.target.value)}
                className="w-full rounded-2xl border border-[#1d1720]/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#d96e3d] focus:ring-2 focus:ring-[#d96e3d]/20"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#3b3238]">Description</span>
              <textarea
                value={playlistDescription}
                onChange={(event) => setPlaylistDescription(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-[#1d1720]/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#d96e3d] focus:ring-2 focus:ring-[#d96e3d]/20"
              />
            </label>

            <button
              type="button"
              onClick={handleExport}
              disabled={exportState.status === "submitting"}
              className="w-full rounded-full bg-[#1d1720] px-6 py-3 text-sm font-semibold text-[#f9f0e3] transition hover:bg-[#433645] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportState.status === "submitting" ? "Creating playlist..." : "Create on YT Music"}
            </button>

            {exportState.message ? (
              <p className={`text-sm ${exportState.status === "error" ? "text-[#b24d2c]" : "text-[#5d5257]"}`}>{exportState.message}</p>
            ) : null}
            {blend.youtubePlaylistId ? <p className="text-sm text-[#5f7757]">Existing playlist id: {blend.youtubePlaylistId}</p> : null}
          </div>
        </SectionCard>
      </div>

      {blend.sections.map((section) => (
        <SectionCard key={section.title} eyebrow={section.title} title={section.description}>
          {section.tracks.length === 0 ? (
            <p className="text-sm text-[#5d5257]">No tracks landed in this section for the current inputs.</p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {section.tracks.map((track, index) => (
                <article key={`${section.title}-${track.videoId ?? track.title}-${index}`} className="rounded-2xl bg-[#f8efe5] px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[#1d1720]">{track.title}</p>
                      <p className="mt-1 text-sm text-[#5d5257]">
                        {track.artist}
                        {track.score ? ` • score ${track.score.toFixed(1)}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#5d5257]">{index + 1}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      ))}
    </div>
  );
}
