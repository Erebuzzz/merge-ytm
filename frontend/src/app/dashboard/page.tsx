"use client";

import { useSession } from "@/lib/auth/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useCallback } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { ConnectYouTubeMusic } from "@/components/auth/connect-youtube-music";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

type BlendSummary = {
  id: string;
  participant_a_name: string;
  participant_b_name: string;
  compatibility_score: number;
  created_at: string;
};

type LocalSession = {
  user: { id: string; name: string; email: string };
};

function YtmConnectedToast() {
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("ytm_connected") === "1") {
      setShow(true);
      setTimeout(() => setShow(false), 4000);
      window.history.replaceState({}, "", "/dashboard");
    }
    const error = searchParams.get("error");
    if (error) {
      const messages: Record<string, string> = {
        invalid_code: "Google OAuth failed — the authorization code was invalid or expired.",
        access_denied: "Google sign-in was cancelled.",
      };
      setErrorMsg(messages[error] ?? `OAuth error: ${error}`);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams]);

  if (errorMsg) {
    return (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-brand-ytred/30 bg-brand-ytred/10 glass-elevated px-4 py-3 shadow-xl animate-fade-in-up max-w-[90vw] sm:max-w-sm">
        <p className="text-xs font-medium text-white flex-1">{errorMsg}</p>
        <button type="button" onClick={() => setErrorMsg(null)} className="text-text-muted hover:text-white shrink-0">x</button>
      </div>
    );
  }

  if (!show) return null;
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-brand-spotify/30 bg-brand-spotify/10 glass-elevated px-4 py-3 shadow-xl animate-fade-in-up">
      <span className="text-brand-spotify text-sm font-bold">Connected</span>
      <p className="text-xs font-medium text-white">YouTube Music linked</p>
    </div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const { data: neonSession, isPending: neonPending } = useSession();
  const router = useRouter();
  const [blends, setBlends] = useState<BlendSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LocalSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get("session_token");
    const urlUserId = searchParams.get("user_id");
    const urlName = searchParams.get("user_name");
    const urlEmail = searchParams.get("user_email");

    if (urlToken && urlUserId) {
      localStorage.setItem("merge_session_token", urlToken);
      const name = urlName ? decodeURIComponent(urlName) : urlEmail?.split("@")[0] || "User";
      const email = urlEmail ? decodeURIComponent(urlEmail) : "";
      localStorage.setItem("merge_user", JSON.stringify({ id: urlUserId, name, email }));
      setSession({ user: { id: urlUserId, name, email } });
      window.history.replaceState({}, "", "/dashboard");
      setSessionReady(true);
      return;
    }

    const storedToken = localStorage.getItem("merge_session_token");
    const storedUser = localStorage.getItem("merge_user");
    if (storedToken && storedUser) {
      try { setSession({ user: JSON.parse(storedUser) }); setSessionReady(true); return; } catch { /* fall through */ }
    }

    if (!neonPending) {
      if (neonSession?.user) {
        setSession({ user: neonSession.user as LocalSession["user"] });
      }
      setSessionReady(true);
    }
  }, [searchParams, neonPending, neonSession]);

  useEffect(() => {
    if (sessionReady && !session) router.push("/login");
  }, [sessionReady, session, router]);

  const fetchBlends = useCallback(async (userId: string) => {
    try {
      const token = localStorage.getItem("merge_session_token");
      const res = await fetch(`${API_BASE_URL}/blends/mine?user_id=${userId}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch");
      setBlends(await res.json());
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (session?.user.id) fetchBlends(session.user.id);
  }, [session?.user.id, fetchBlends]);

  if (!sessionReady || !session) {
    return <div className="flex h-[50vh] items-center justify-center animate-pulse text-text-muted">Loading...</div>;
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in-up">
      <Suspense fallback={null}><YtmConnectedToast /></Suspense>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-lg font-display text-white">Dashboard</h1>
          <p className="text-xs text-text-muted mt-1">Welcome, {session.user.name}</p>
        </div>
        <Link href="/blend/create" className="hidden sm:inline-flex px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs hover:scale-105 transition shadow-lg">
          + New Blend
        </Link>
      </div>

      {/* Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Blends */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Your Blends</h2>
          {loading ? (
            <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 bg-surface-highlight/20 rounded-xl animate-pulse" />)}</div>
          ) : blends.length === 0 ? (
            <div className="glass-surface rounded-2xl p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-brand-ytgradient1/20 to-brand-ytmusic/20 flex items-center justify-center text-3xl">
                🎵
              </div>
              <div>
                <h3 className="text-white font-bold text-sm mb-1">No blends yet</h3>
                <p className="text-xs text-text-muted max-w-xs mx-auto">Create your first blend to see your combined taste.</p>
              </div>
              <Link href="/blend/create" className="inline-flex px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs hover:scale-105 transition shadow-lg">
                Create blend
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {blends.map((blend) => (
                <Link href={`/blend/${blend.id}`} key={blend.id} className="group glass-surface rounded-xl p-4 flex justify-between items-center hover:border-white/10 transition-all">
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-sm truncate">{blend.participant_a_name} + {blend.participant_b_name}</h4>
                    <p className="text-[11px] text-text-muted mt-0.5">{new Date(blend.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className="text-brand-ytmusic font-black text-xl">{(blend.compatibility_score ?? 0).toFixed(0)}%</span>
                    <p className="text-[9px] uppercase font-bold tracking-widest text-text-muted">Match</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Connection */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider">YouTube Music</h2>
          <SectionCard>
            <ConnectYouTubeMusic />
          </SectionCard>
        </div>
      </div>

      {/* Mobile FAB */}
      <Link
        href="/blend/create"
        className="fixed bottom-20 right-4 z-40 sm:hidden w-14 h-14 rounded-full bg-gradient-to-br from-brand-ytgradient1 to-brand-ytmusic flex items-center justify-center shadow-brand-glow text-white text-2xl font-bold hover:scale-110 transition-transform"
      >
        +
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex h-[50vh] items-center justify-center animate-pulse text-text-muted">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
