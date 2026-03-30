"use client";

import Link from "next/link";
import { useState } from "react";

import { createYTMusicPlaylist, submitTrackFeedback, submitBlendFeedback } from "@/lib/api";
import type { BlendDetail } from "@/types/blend";
import { SectionCard } from "@/components/ui/section-card";
import { useBlendStore } from "@/store/blend-store";
import type { TrackAction } from "@/store/blend-store";

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
  const [playlistDescription, setPlaylistDescription] = useState("Private playlist created by Merge.");
  const [exportState, setExportState] = useState<{
    status: "idle" | "submitting" | "success" | "error";
    message?: string;
  }>({ status: "idle" });
  const [blendFeedbackDismissed, setBlendFeedbackDismissed] = useState(false);

  const {
    trackFeedback,
    blendRating,
    blendQuickOption,
    hasSubmittedFeedback,
    setTrackFeedback,
    setBlendRating,
    setBlendQuickOption,
    setHasSubmittedFeedback,
  } = useBlendStore();

  const canExport = blend.participants.userA.hasAuth || blend.participants.userB.hasAuth;

  async function handleTrackFeedback(blendId: string, trackId: string, action: TrackAction) {
    const current = trackFeedback[trackId];
    const next = current === action ? null : action;
    setTrackFeedback(trackId, next);
    setHasSubmittedFeedback(true);
    if (next !== null) {
      try {
        await submitTrackFeedback({ blendId, trackId, action: next });
      } catch {
        // silently ignore — feedback is best-effort
      }
    }
  }

  async function handleBlendFeedback() {
    if (blendRating === null && blendQuickOption === null) return;
    try {
      await submitBlendFeedback({ blendId: blend.id, rating: blendRating, quickOption: blendQuickOption });
    } catch {
      // silently ignore
    }
    setBlendFeedbackDismissed(true);
    setHasSubmittedFeedback(true);
  }

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
          {!canExport ? (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 rounded-2xl border border-white/5 bg-surface-highlight/20">
              <div className="w-12 h-12 rounded-full bg-brand-spotify/10 flex items-center justify-center text-brand-spotify text-xl mb-2">🔒</div>
              <div>
                <h4 className="font-bold text-white tracking-wide">Authentication Required</h4>
                <p className="text-xs text-text-muted mt-1 max-w-[250px]">To push this playlist directly to your library, verify your YouTube Music session first.</p>
              </div>
              <Link
                href="/auth-upload"
                className="mt-4 px-6 py-3 rounded-full bg-brand-ytmusic text-black font-bold text-xs hover:scale-105 transition shadow-lg"
              >
                Upload Auth JSON
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-xs text-text-secondary">Ready to sync directly to your YouTube Music library.</p>
              
              <div className="space-y-4">
                <details className="group border border-white/10 rounded-xl bg-surface-highlight/30 overflow-hidden open:bg-surface-elevated transition-colors">
                  <summary className="px-5 py-4 cursor-pointer flex justify-between items-center text-sm font-bold text-white select-none">
                    Advanced Options
                    <span className="text-text-muted group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  
                  <div className="p-5 border-t border-white/5 space-y-5">
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-muted">Export Account</span>
                      <select
                        value={selectedUserId}
                        onChange={(event) => setSelectedUserId(event.target.value)}
                        className="w-full appearance-none rounded-xl border border-white/10 bg-surface-highlight/50 px-4 py-3 text-sm text-white outline-none transition-all focus:border-brand-ytmusic focus:ring-1 focus:ring-brand-ytmusic focus:bg-surface-elevated shadow-inner"
                      >
                        {blend.participants.userA.hasAuth && (
                          <option value={blend.participants.userA.userId} className="bg-surface-elevated text-white">
                            {blend.participants.userA.name}
                          </option>
                        )}
                        {blend.participants.userB.hasAuth && (
                          <option value={blend.participants.userB.userId} className="bg-surface-elevated text-white">
                            {blend.participants.userB.name}
                          </option>
                        )}
                      </select>
                    </label>

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
                </details>
              </div>

              <button
                type="button"
                onClick={handleExport}
                disabled={exportState.status === "submitting"}
                className="w-full rounded-full bg-white px-6 py-4 text-sm font-black tracking-wide text-black transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 disabled:bg-surface-border disabled:text-text-muted"
              >
                {exportState.status === "submitting" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin"></span>
                    Creating Playlist...
                  </span>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                     <span className="text-xl leading-none -mt-0.5">+</span> Sync to YT Music
                  </div>
                )}
              </button>

              {exportState.message ? (
                <p className={`text-xs font-medium text-center p-3 rounded-lg animate-fade-in-up ${exportState.status === "error" ? "bg-brand-ytred/10 text-brand-ytred border border-brand-ytred/20" : exportState.status === "success" ? "bg-brand-spotify/10 text-brand-spotify border border-brand-spotify/20" : "text-text-muted"}`}>
                  {exportState.message}
                </p>
              ) : null}
              {blend.youtubePlaylistId ? (
                <p className="text-xs font-bold text-brand-spotify text-center uppercase tracking-wider mt-2 bg-brand-spotify/10 py-2 rounded-lg border border-brand-spotify/20">
                  ✓ Synced: {blend.youtubePlaylistId}
                </p>
              ) : null}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Playlist Tracks Section */}
      <div className="space-y-6">
        {blend.sections.map((section, sIdx) => (
          <div key={section.title} className="glass-panel rounded-2xl overflow-hidden shadow-xl border border-white/5">
            <div className={`p-6 border-b border-white/5 ${sIdx === 0 ? "bg-brand-ytgradient2/10" : section.title === "New Discoveries" ? "bg-brand-spotify/10" : "bg-black/20"}`}>
               <h3 className="font-display text-xl font-bold text-white mb-1 flex items-center gap-2">
                 {section.title === "New Discoveries" && <span className="text-brand-spotify text-[16px]">✨</span>}
                 {section.title}
               </h3>
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
                        <div className="flex-1 hidden md:flex items-center gap-2">
                          <p className="text-sm text-text-secondary truncate group-hover:text-white transition-colors">{track.artist}</p>
                          {/* Feedback controls - visible on hover */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                            {(["like", "dislike", "skip"] as const).map((action) => {
                              const icons = { like: "👍", dislike: "👎", skip: "⏭" };
                              const trackKey = track.normalizedKey ?? track.title;
                              const isSelected = trackFeedback[trackKey] === action;
                              return (
                                <button
                                  key={action}
                                  type="button"
                                  onClick={() => handleTrackFeedback(blend.id, trackKey, action)}
                                  className={`text-sm px-1.5 py-0.5 rounded-lg transition-all ${
                                    isSelected
                                      ? "bg-brand-ytmusic/20 scale-110"
                                      : "hover:bg-surface-highlight/60"
                                  }`}
                                  title={action}
                                >
                                  {icons[action]}
                                </button>
                              );
                            })}
                          </div>
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

      {/* No-feedback hint */}
      {!hasSubmittedFeedback && (
        <p className="text-xs text-text-muted text-center py-3 italic">
          Give a quick 👍 or 👎 to help improve recommendations
        </p>
      )}

      {/* Blend Feedback Widget */}
      {!blendFeedbackDismissed && (
        <div className="glass-panel rounded-2xl p-6 border border-white/5 animate-fade-in-up">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-white">How was this blend?</p>
              <p className="text-xs text-text-muted mt-1">Your feedback helps improve future recommendations.</p>
            </div>
            <button
              type="button"
              onClick={() => setBlendFeedbackDismissed(true)}
              className="text-text-muted hover:text-white transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {/* Star Rating */}
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => {
                  setBlendRating(blendRating === star ? null : star);
                }}
                className={`text-2xl transition-all hover:scale-110 ${
                  blendRating !== null && star <= blendRating ? "opacity-100" : "opacity-30"
                }`}
              >
                ⭐
              </button>
            ))}
          </div>

          {/* Quick Options */}
          <div className="flex gap-3 mb-4">
            {(["accurate", "missed_vibe"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setBlendQuickOption(blendQuickOption === option ? null : option)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                  blendQuickOption === option
                    ? "bg-brand-ytmusic/20 border-brand-ytmusic text-brand-ytmusic"
                    : "border-white/10 text-text-secondary hover:border-white/30"
                }`}
              >
                {option === "accurate" ? "Felt accurate" : "Missed the vibe"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleBlendFeedback}
            disabled={blendRating === null && blendQuickOption === null}
            className="px-6 py-2 rounded-full bg-white text-black text-xs font-bold transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
          >
            Submit Feedback
          </button>
        </div>
      )}
    </div>
  );
}
