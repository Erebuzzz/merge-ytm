"use client";

import { useEffect, useState } from "react";
/* eslint-disable @next/next/no-img-element */
import { getUserPlaylists, getLikedSongsCount } from "@/lib/api";

type Playlist = { id: string; title: string; count: number; thumbnail: string };

type Props = {
  /** Called when selection changes — returns array of playlist IDs (max 5) */
  onSelectionChange: (ids: string[]) => void;
  selectedIds: string[];
  includeLikedSongs: boolean;
  onIncludeLikedSongsChange: (value: boolean) => void;
};

export function PlaylistPicker({ onSelectionChange, selectedIds, includeLikedSongs, onIncludeLikedSongsChange }: Props) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedCount, setLikedCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getUserPlaylists(), getLikedSongsCount()])
      .then(([pls, liked]) => {
        setPlaylists(pls);
        setLikedCount(liked.count);
      })
      .catch(() => setError("Could not load your playlists. Make sure YouTube Music is connected."))
      .finally(() => setLoading(false));
  }, []);

  function togglePlaylist(id: string) {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((s) => s !== id));
    } else if (selectedIds.length < 5) {
      onSelectionChange([...selectedIds, id]);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-surface-highlight/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-brand-ytred">{error}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Select playlists ({selectedIds.length}/5)
        </p>
      </div>

      {/* Liked Songs option */}
      {likedCount !== null && likedCount > 0 && (
        <button
          type="button"
          onClick={() => onIncludeLikedSongsChange(!includeLikedSongs)}
          className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
            includeLikedSongs
              ? "border-brand-ytmusic bg-brand-ytmusic/10"
              : "border-white/10 bg-surface-highlight/20 hover:border-white/30"
          }`}
        >
          <span className="text-xl">❤️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">Liked Songs</p>
            <p className="text-xs text-text-muted">{likedCount.toLocaleString()} tracks</p>
          </div>
          {includeLikedSongs && <span className="text-brand-ytmusic text-sm">✓</span>}
        </button>
      )}

      {/* Playlist list */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {playlists.map((pl) => {
          const selected = selectedIds.includes(pl.id);
          const disabled = !selected && selectedIds.length >= 5;
          return (
            <button
              key={pl.id}
              type="button"
              disabled={disabled}
              onClick={() => togglePlaylist(pl.id)}
              className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                selected
                  ? "border-brand-ytmusic bg-brand-ytmusic/10"
                  : disabled
                  ? "border-white/5 bg-surface-highlight/10 opacity-40 cursor-not-allowed"
                  : "border-white/10 bg-surface-highlight/20 hover:border-white/30"
              }`}
            >
              {pl.thumbnail ? (
                <img src={pl.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">🎵</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{pl.title}</p>
                <p className="text-xs text-text-muted">{pl.count} tracks</p>
              </div>
              {selected && <span className="text-brand-ytmusic text-sm flex-shrink-0">✓</span>}
            </button>
          );
        })}
      </div>

      {selectedIds.length === 5 && (
        <p className="text-xs text-text-muted text-center">Maximum 5 playlists selected</p>
      )}
    </div>
  );
}
