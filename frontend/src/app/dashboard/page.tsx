"use client";

import { useSession } from "@/lib/auth/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
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

// Isolated component so useSearchParams is inside Suspense
function YtmConnectedToast() {
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const ytmConnected = searchParams.get("ytm_connected");
    const error = searchParams.get("error");

    if (ytmConnected === "1") {
      setShow(true);
      setTimeout(() => setShow(false), 4000);
      window.history.replaceState({}, "", "/dashboard");
    }

    if (error) {
      const messages: Record<string, string> = {
        invalid_code: "Google OAuth failed — the authorization code was invalid or expired. Please try connecting again.",
        access_denied: "Google sign-in was cancelled.",
      };
      setErrorMsg(messages[error] ?? `OAuth error: ${error}`);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams]);

  if (errorMsg) {
    return (
      <div className="fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-brand-ytred/30 bg-brand-ytred/10 px-5 py-3 shadow-xl animate-fade-in-up max-w-sm">
        <span className="text-brand-ytred text-lg flex-shrink-0">⚠️</span>
        <p className="text-sm font-medium text-white">{errorMsg}</p>
        <button type="button" onClick={() => setErrorMsg(null)} className="text-text-muted hover:text-white ml-2 flex-shrink-0">✕</button>
      </div>
    );
  }

  if (!show) return null;

  return (
    <div className="fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-brand-ytmusic/30 bg-brand-ytmusic/10 px-5 py-3 shadow-xl animate-fade-in-up">
      <span className="text-brand-ytmusic text-lg">✓</span>
      <p className="text-sm font-bold text-white">YouTube Music connected successfully!</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [blends, setBlends] = useState<BlendSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (session?.user.id) {
      fetch(`${API_BASE_URL}/blends/mine?user_id=${session.user.id}`, { credentials: "include" })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch");
          return res.json();
        })
        .then((data) => {
          setBlends(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [session?.user.id]);

  if (isPending || !session) {
    return <div className="flex h-[50vh] items-center justify-center animate-pulse text-brand-ytmusic">Loading Dashboard...</div>;
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* useSearchParams must be inside Suspense */}
      <Suspense fallback={null}>
        <YtmConnectedToast />
      </Suspense>

      <div className="flex items-center justify-between pb-6 border-b border-white/5">
        <div>
          <h1 className="text-4xl font-display font-black text-white">Dashboard</h1>
          <p className="text-text-secondary mt-1">Welcome back, {session.user.name}</p>
        </div>
        <Link href="/blend/create" className="px-6 py-3 rounded-full bg-white text-black font-bold hover:scale-105 transition shadow-lg">
          + New Blend
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-2xl font-display font-bold text-white">Your Blends</h2>
          {loading ? (
            <div className="animate-pulse">
              <div className="h-24 bg-surface-highlight/20 rounded-2xl w-full" />
            </div>
          ) : blends.length === 0 ? (
            <div className="bg-surface-highlight/20 border border-white/5 rounded-2xl p-10 text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-brand-ytmusic/10 flex items-center justify-center text-4xl">🎵</div>
              <div>
                <h3 className="text-white font-bold text-lg mb-1">No blends yet</h3>
                <p className="text-sm text-text-muted max-w-xs mx-auto">Connect YouTube Music and create your first blend to see your shared taste with a friend.</p>
              </div>
              <Link href="/blend/create" className="inline-flex px-6 py-3 rounded-full bg-white text-black font-bold text-sm hover:scale-105 transition shadow-lg">
                Create your first blend
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {blends.map((blend) => (
                <Link href={`/blend/${blend.id}`} key={blend.id} className="group glass-panel border border-white/5 rounded-2xl p-5 hover:border-brand-ytmusic transition-colors relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand-ytmusic/5 mix-blend-screen rounded-full blur-[30px] group-hover:bg-brand-ytmusic/20 transition-all opacity-50 pointer-events-none" />
                  <div className="flex justify-between items-center relative z-10">
                    <div>
                      <h4 className="font-bold text-white text-lg">{blend.participant_a_name} + {blend.participant_b_name}</h4>
                      <p className="text-xs text-text-muted mt-1">{new Date(blend.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-brand-ytmusic font-black text-2xl">{(blend.compatibility_score ?? 0).toFixed(0)}%</span>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Match</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <SectionCard eyebrow="YouTube Music" title="Connection">
            <ConnectYouTubeMusic
              showLegacyOption
              onLegacyUploadClick={() => router.push("/auth-upload")}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
