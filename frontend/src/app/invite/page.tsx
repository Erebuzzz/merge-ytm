"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConnectYouTubeMusic } from "@/components/auth/connect-youtube-music";
import { PlaylistPicker } from "@/components/blend/playlist-picker";
import { SectionCard } from "@/components/ui/section-card";
import { createInvite } from "@/lib/api";

const YTM_URL_PATTERN = /^(https:\/\/music\.youtube\.com\/(playlist\?list=|watch\?.*list=)[A-Za-z0-9_\-]+|[A-Za-z0-9_\-]{10,})$/;

function validateYTMUrl(url: string): string | null {
  if (!url.trim()) return null;
  if (!YTM_URL_PATTERN.test(url.trim())) {
    return "Must be a YouTube Music playlist URL (music.youtube.com/playlist?list=...)";
  }
  return null;
}

export default function InviteCreatePage() {
  const router = useRouter();

  const [ytmConnected, setYtmConnected] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [includeLiked, setIncludeLiked] = useState(false);
  const [links, setLinks] = useState<string[]>([""]);
  const [linkErrors, setLinkErrors] = useState<string[]>([]);

  const [creating, setCreating] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasSource = selectedIds.length > 0 || includeLiked || links.some(l => l.trim().length > 0);
  const canSubmit = hasSource && linkErrors.every(e => !e);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setCreating(true);
    setError(null);
    try {
      const allUrls = [...selectedIds, ...links.filter(Boolean)];
      const { shareUrl } = await createInvite({ playlistUrls: allUrls, includeLikedSongs: includeLiked });
      setInviteUrl(shareUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setCreating(false);
    }
  }

  if (inviteUrl) {
    return (
      <div className="max-w-xl mx-auto mt-12 animate-fade-in-up">
        <SectionCard eyebrow="Invite Created" title="Share with your friend">
          <div className="space-y-6">
            <p className="text-text-secondary text-sm">
              Your invite is ready! Send this link to your friend. When they open it, they can connect their YouTube Music and join the blend.
            </p>
            <div className="p-4 rounded-xl bg-surface-highlight/40 border border-white/10 break-all text-brand-spotify font-medium">
              {inviteUrl}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => navigator.clipboard.writeText(inviteUrl)}
                className="flex-1 rounded-full px-6 py-3 bg-white text-black font-bold text-sm transition hover:scale-105"
              >
                Copy Link
              </button>
              <Link href="/dashboard" className="flex-1 rounded-full px-6 py-3 bg-surface-elevated text-white font-bold text-sm transition hover:bg-surface-border text-center">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in-up">
      {/* Mode Switcher */}
      <div className="flex border-b border-surface-border mb-8">
        <Link href="/blend/create" className="px-6 py-3 text-text-muted hover:text-white transition font-medium text-sm">
          Paste Playlists
        </Link>
        <div className="px-6 py-3 border-b-2 border-brand-ytmusic text-white font-bold text-sm">
          Send Invite Link
        </div>
      </div>

      <SectionCard eyebrow="Step 1 of 2" title="Prepare your invite">
        <p className="text-sm text-text-secondary mb-6">
          First, select the playlists you want to contribute to the blend. Then we&apos;ll generate a link for your friend to add theirs.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted">YouTube Music</p>
            <ConnectYouTubeMusic onStatusChange={(s) => setYtmConnected(s.connected)} />
          </div>

          {ytmConnected && (
            <PlaylistPicker
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              includeLikedSongs={includeLiked}
              onIncludeLikedSongsChange={setIncludeLiked}
            />
          )}

          <details className={ytmConnected ? "opacity-60" : ""}>
            <summary className="text-xs font-bold uppercase tracking-wider text-text-muted cursor-pointer hover:text-white transition-colors select-none">
              {ytmConnected ? "Or paste playlist URLs manually" : "Paste playlist URLs"}
            </summary>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Up to 5 links</span>
                <button
                  type="button"
                  onClick={() => setLinks([...links, ""])}
                  className="text-[10px] font-bold uppercase tracking-widest text-brand-ytmusic hover:text-white transition-colors"
                >
                  + Add
                </button>
              </div>
              {links.map((link, index) => (
                <div key={index} className="flex flex-col gap-1">
                  <div className="flex gap-2">
                    <input
                      value={link}
                      onChange={(e) => {
                        const newLinks = [...links];
                        newLinks[index] = e.target.value;
                        setLinks(newLinks);
                        
                        const errors = [...linkErrors];
                        errors[index] = validateYTMUrl(e.target.value) ?? "";
                        setLinkErrors(errors);
                      }}
                      placeholder="https://music.youtube.com/playlist?list=..."
                      className="w-full rounded-xl border border-white/10 bg-surface-highlight/50 px-4 py-3 text-sm text-white placeholder-text-muted outline-none transition-all focus:border-brand-ytmusic focus:ring-1 focus:ring-brand-ytmusic shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newLinks = links.filter((_, i) => i !== index);
                        setLinks(newLinks.length ? newLinks : [""]);
                        const newErrors = linkErrors.filter((_, i) => i !== index);
                        setLinkErrors(newErrors);
                      }}
                      className="rounded-xl border border-white/10 bg-surface-elevated px-4 py-3 text-sm text-text-muted hover:text-brand-ytred hover:border-brand-ytred/30 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  {linkErrors[index] && (
                    <p className="text-xs text-brand-ytred">{linkErrors[index]}</p>
                  )}
                </div>
              ))}
            </div>
          </details>

          {error && (
            <div className="text-sm font-medium text-brand-ytred bg-brand-ytred/10 border border-brand-ytred/20 rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit || creating}
            className={`w-full rounded-full px-8 py-4 text-sm font-bold transition-all shadow-xl mt-4 ${
              !canSubmit || creating
                ? "bg-surface-border text-text-muted cursor-not-allowed"
                : "bg-brand-ytmusic text-black hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,0,0,0.2)]"
            }`}
          >
            {creating ? "Generating link..." : "Generate Invite Link"}
          </button>
        </form>
      </SectionCard>
    </div>
  );
}
