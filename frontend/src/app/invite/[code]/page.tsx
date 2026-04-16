"use client";

import { use, useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getInvite, joinInvite } from "@/lib/api";
import { SectionCard } from "@/components/ui/section-card";
import { ConnectYouTubeMusic } from "@/components/auth/connect-youtube-music";
import { PlaylistPicker } from "@/components/blend/playlist-picker";

const YTM_URL_PATTERN = /^(https:\/\/music\.youtube\.com\/(playlist\?list=|watch\?.*list=)[A-Za-z0-9_\-]+|[A-Za-z0-9_\-]{10,})$/;

function validateYTMUrl(url: string): string | null {
  if (!url.trim()) return null;
  if (!YTM_URL_PATTERN.test(url.trim())) {
    return "Must be a YouTube Music playlist URL (music.youtube.com/playlist?list=...)";
  }
  return null;
}

export default function InviteJoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<{ creatorName: string; status: string; blendId: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [localUser, setLocalUser] = useState<{ id: string; name: string } | null>(null);
  const [ytmConnected, setYtmConnected] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [includeLiked, setIncludeLiked] = useState(false);
  const [links, setLinks] = useState<string[]>([""]);
  const [linkErrors, setLinkErrors] = useState<string[]>([]);
  
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    // Check session
    const stored = localStorage.getItem("merge_user");
    if (stored) {
      try {
        setLocalUser(JSON.parse(stored));
      } catch {}
    }

    // Load invite
    getInvite(code)
      .then(data => {
        setInvite(data);
        if (data.status !== "pending") {
          // If already accepted, route directly to the blend if authorized, or just show error.
          if (data.blendId) {
             router.push(`/blend/${data.blendId}`);
          } else {
             setError("This invite has already been accepted or expired.");
          }
        }
      })
      .catch(err => {
        setError(err.message || "Invite not found or expired.");
      })
      .finally(() => setLoading(false));
  }, [code, router]);

  const hasSource = selectedIds.length > 0 || includeLiked || links.some(l => l.trim().length > 0);
  const canSubmit = hasSource && linkErrors.every(e => !e);

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setJoining(true);
    setError(null);
    try {
      const allUrls = [...selectedIds, ...links.filter(Boolean)];
      const { blendId } = await joinInvite(code, { playlistUrls: allUrls, includeLikedSongs: includeLiked });
      router.push(`/blend/${blendId}`); // Redirecting to blend immediately. Next page handles generating/polling if not ready.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join blend");
      setJoining(false);
    }
  }

  if (loading) {
    return (
       <div className="max-w-2xl mx-auto mt-6 md:mt-12 animate-pulse space-y-4">
         <div className="h-28 bg-surface-highlight/30 rounded-2xl" />
         <div className="h-[300px] md:h-[400px] bg-surface-highlight/20 rounded-2xl" />
       </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <SectionCard eyebrow="Invite Error" title="Cannot join blend" className="text-center max-w-md">
           <p className="text-text-secondary mt-4 mb-8">
             {error || "Unknown error occurred"}
           </p>
           <Link href="/" className="px-6 py-3 rounded-full bg-white text-black font-bold">
             Back Home
           </Link>
        </SectionCard>
      </div>
    );
  }

  if (!localUser) {
    return (
      <div className="max-w-xl mx-auto mt-6 md:mt-12">
        <SectionCard eyebrow="You've been invited!" title={`${invite.creatorName} wants to blend with you`}>
          <p className="text-text-secondary text-sm mb-6 mt-2">
            Log in to connect your YouTube Music and see what your combined taste looks like.
          </p>
          <Link href={`/login?callbackUrl=/invite/${code}`} className="block w-full text-center px-6 py-3.5 rounded-full bg-gradient-to-r from-brand-ytgradient1 to-brand-ytmusic text-white font-bold hover:scale-105 transition-all shadow-brand-glow touch-target">
             Log in to Join
          </Link>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-6 md:mt-12 animate-fade-in-up">
      <SectionCard eyebrow={`Invited by ${invite.creatorName}`} title="Add your music">
        <p className="text-sm text-text-secondary mb-6">
          Connect your YouTube Music account or paste your playlist links below to complete the blend.
        </p>

        <form onSubmit={handleJoin} className="space-y-6">
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
                        
                        const errs = [...linkErrors];
                        errs[index] = validateYTMUrl(e.target.value) ?? "";
                        setLinkErrors(errs);
                      }}
                      placeholder="https://music.youtube.com/playlist?list=..."
                      className="w-full rounded-xl border border-white/10 bg-surface-highlight/50 px-4 py-3 text-sm text-white placeholder-text-muted outline-none transition-all"
                    />
                  </div>
                  {linkErrors[index] && <p className="text-xs text-brand-ytred">{linkErrors[index]}</p>}
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
            disabled={!canSubmit || joining}
            className={`w-full rounded-full px-8 py-4 text-sm font-bold transition-all shadow-xl mt-4 ${
              !canSubmit || joining
                ? "bg-surface-border text-text-muted cursor-not-allowed"
                : "bg-white text-black hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            }`}
          >
            {joining ? "Joining..." : "Join Blend"}
          </button>
        </form>
      </SectionCard>
    </div>
  );
}
