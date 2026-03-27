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
      message: "Creating the private playlist on YouTube Music...",
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
    <div className="space-y-8 animate-fade-in-up">
      {/* Top Banner Area mimicking Spotify Playlist Header */}
      <div className="flex flex-col md:flex-row items-end gap-6 relative z-10 glass-panel p-8 rounded-[30px] border-l-4 border-l-brand-ytgradient2">
        <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-brand-spotify via-brand-ytmusic to-[#121212] shadow-2xl flex-shrink-0 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center mix-blend-overlay opacity-50">
             <div className="w-full h-full bg-[radial-gradient(circle_at_center,white,transparent_80%)] mix-blend-color-dodge"></div>
          </div>
          <span className="text-6xl font-display font-black text-white mix-blend-overlay">{blend.compatibilityScore.toFixed(0)}%</span>
        </div>
        <div className="flex-1 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Blend Playlist</p>
          <h1 className="text-5xl md:text-6xl font-display font-black mb-4 tracking-tight drop-shadow-md">
            {blend.participants.userA.name} + {blend.participants.userB.name}
          </h1>
          <p className="text-sm font-medium text-text-secondary flex items-center gap-2">
            <span className="text-brand-spotify font-semibold">{blend.compatibilityScore.toFixed(1)}% Match</span>
            • {blend.sections.reduce((acc, curr) => acc + curr.tracks.length, 0)} songs
          </p>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.35fr_0.9fr]">
        <SectionCard eyebrow="Diagnostics" title="Compatibility Breakdown">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-surface-highlight/40 border border-white/5 px-5 py-5 text-center flex flex-col justify-center transition-all hover:bg-surface-highlight/60">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-spotify mb-1">Shared</p>
              <p className="text-4xl font-display font-bold text-white tracking-tighter">{String(blend.diagnostics.commonCount ?? 0)}</p>
            </div>
            <div className="rounded-2xl bg-surface-highlight/40 border border-white/5 px-5 py-5 text-center flex flex-col justify-center transition-all hover:bg-surface-highlight/60">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-ytmusic mb-1">{blend.participants.userA.name} Pool</p>
              <p className="text-4xl font-display font-bold text-white tracking-tighter">{String(blend.diagnostics.userACount ?? 0)}</p>
            </div>
            <div className="rounded-2xl bg-surface-highlight/40 border border-white/5 px-5 py-5 text-center flex flex-col justify-center transition-all hover:bg-surface-highlight/60">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-ytgradient2 mb-1">{blend.participants.userB.name} Pool</p>
              <p className="text-4xl font-display font-bold text-white tracking-tighter">{String(blend.diagnostics.userBCount ?? 0)}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-surface-elevated px-5 py-4 text-xs leading-relaxed text-text-secondary border-l-2 border-l-brand-spotify">
            Shared taste seeds the front of the playlist, then the two side sections pull in unique tracks that still map back to the common center through artist similarity and diversity balancing.
          </div>
        </SectionCard>

        <SectionCard eyebrow="Export" title="Push to YT Music">
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-muted">Export with</span>
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-surface-highlight/50 px-4 py-3 text-sm text-white outline-none transition-all focus:border-brand-ytmusic focus:ring-1 focus:ring-brand-ytmusic focus:bg-surface-elevated shadow-inner"
              >
                <option value={blend.participants.userA.userId} className="bg-surface-elevated text-white">
                  {blend.participants.userA.name}
                  {blend.participants.userA.hasAuth ? "" : " (auth missing)"}
                </option>
                <option value={blend.participants.userB.userId} className="bg-surface-elevated text-white">
                  {blend.participants.userB.name}
                  {blend.participants.userB.hasAuth ? "" : " (auth missing)"}
                </option>
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href={`/auth-upload?userId=${blend.participants.userA.userId}`}
                className="rounded-xl border border-white/10 bg-surface-highlight/20 px-4 py-3 text-xs font-bold text-center text-text-secondary transition-colors hover:border-brand-spotify hover:text-white hover:bg-brand-spotify/10"
              >
                Upload auth for {blend.participants.userA.name}
              </Link>
              <Link
                href={`/auth-upload?userId=${blend.participants.userB.userId}`}
                className="rounded-xl border border-white/10 bg-surface-highlight/20 px-4 py-3 text-xs font-bold text-center text-text-secondary transition-colors hover:border-brand-spotify hover:text-white hover:bg-brand-spotify/10"
              >
                Upload auth for {blend.participants.userB.name}
              </Link>
            </div>

            <div className="space-y-4 pt-2 border-t border-white/5">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-muted">Playlist title</span>
                <input
                  value={playlistTitle}
                  onChange={(event) => setPlaylistTitle(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-surface-highlight/50 px-4 py-3 text-sm text-white outline-none transition-all focus:border-brand-ytmusic focus:ring-1 focus:ring-brand-ytmusic focus:bg-surface-elevated shadow-inner"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-muted">Description</span>
                <textarea
                  value={playlistDescription}
                  onChange={(event) => setPlaylistDescription(event.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-surface-highlight/50 px-4 py-3 text-sm text-white outline-none transition-all focus:border-brand-ytmusic focus:ring-1 focus:ring-brand-ytmusic focus:bg-surface-elevated shadow-inner resize-none"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={exportState.status === "submitting"}
              className="w-full rounded-full bg-white px-6 py-3.5 text-sm font-bold text-black transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 disabled:bg-surface-border disabled:text-text-muted"
            >
              {exportState.status === "submitting" ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin"></span>
                  Creating Playlist...
                </span>
              ) : "Create on YT Music"}
            </button>

            {exportState.message ? (
              <p className={`text-xs font-medium text-center p-2 rounded-lg ${exportState.status === "error" ? "bg-brand-ytred/10 text-brand-ytred border border-brand-ytred/20" : exportState.status === "success" ? "bg-brand-spotify/10 text-brand-spotify border border-brand-spotify/20" : "text-text-muted"}`}>
                {exportState.message}
              </p>
            ) : null}
            {blend.youtubePlaylistId ? (
              <p className="text-xs font-bold text-brand-spotify text-center uppercase tracking-wider">
                ✓ Synced: {blend.youtubePlaylistId}
              </p>
            ) : null}
          </div>
        </SectionCard>
      </div>

      {/* Playlist Tracks Section */}
      <div className="space-y-6">
        {blend.sections.map((section, sIdx) => (
          <div key={section.title} className="glass-panel rounded-2xl overflow-hidden shadow-xl border border-white/5">
            <div className={`p-6 border-b border-white/5 ${sIdx === 0 ? "bg-brand-ytgradient2/10" : "bg-black/20"}`}>
               <h3 className="font-display text-xl font-bold text-white mb-1">{section.title}</h3>
               <p className="text-xs text-text-secondary">{section.description}</p>
            </div>
            
            <div className="p-2">
              {section.tracks.length === 0 ? (
                <div className="p-8 text-center text-sm text-text-muted italic">No tracks landed in this section.</div>
              ) : (
                <div className="w-full">
                  {/* Table Header */}
                  <div className="flex items-center px-4 py-3 border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    <div className="w-12 text-center">#</div>
                    <div className="flex-1">Title</div>
                    <div className="flex-1 hidden md:block">Artist</div>
                    <div className="w-24 text-right">Score</div>
                  </div>
                  
                  {/* Tracks List */}
                  <div className="flex flex-col pt-2 pb-2">
                    {section.tracks.map((track, index) => (
                      <div 
                        key={`${section.title}-${track.videoId ?? track.title}-${index}`} 
                        className="flex items-center px-4 py-3 rounded-xl transition-colors hover:bg-surface-elevated/80 group"
                      >
                        <div className="w-12 text-center text-text-muted font-medium text-sm group-hover:text-white transition-colors">
                          {index + 1}
                        </div>
                        <div className="flex-1 pr-4">
                          <p className="font-bold text-white text-sm truncate">{track.title}</p>
                          {/* Artist shown here on mobile */}
                          <p className="text-xs text-text-secondary mt-0.5 md:hidden truncate">{track.artist}</p>
                        </div>
                        <div className="flex-1 hidden md:block">
                          <p className="text-sm text-text-secondary truncate group-hover:text-white transition-colors">{track.artist}</p>
                        </div>
                        <div className="w-24 text-right">
                          {track.score ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-highlight/30 border border-white/5 text-xs font-semibold text-brand-ytgradient2 group-hover:bg-brand-ytgradient2/10 group-hover:border-brand-ytgradient2/20 transition-all">
                              {track.score.toFixed(1)}
                            </div>
                          ) : (
                            <span className="text-text-muted text-xs">—</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
