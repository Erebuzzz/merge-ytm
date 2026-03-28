"use client";

import { useSession } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthUploadPanel } from "@/components/auth/auth-upload-panel";
import { SectionCard } from "@/components/ui/section-card";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

type BlendSummary = {
  id: string;
  participant_a_name: string;
  participant_b_name: string;
  compatibility_score: number;
  created_at: string;
};

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
      // Fetch historical blends for this user
      fetch(`${API_BASE_URL}/blends/mine?user_id=${session.user.id}`)
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
    return <div className="flex h-[50vh] items-center justify-center animate-pulse text-brand-spotify">Loading Dashboard...</div>;
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
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
                 <div className="animate-pulse flex space-x-4">
                     <div className="h-24 bg-surface-highlight/20 rounded-2xl w-full"></div>
                 </div>
            ) : blends.length === 0 ? (
                <div className="bg-surface-highlight/20 border border-white/5 rounded-2xl p-8 text-center">
                    <div className="text-4xl mb-4 opacity-50">💿</div>
                    <h3 className="text-white font-bold mb-2">No Blends Yet</h3>
                    <p className="text-sm text-text-muted mb-6">You haven't generated any private blends yet.</p>
                    <Link href="/blend/create" className="px-5 py-2.5 rounded-full bg-brand-spotify text-black font-bold text-sm">Create your first blend</Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {blends.map((blend) => (
                        <Link href={`/blend/${blend.id}`} key={blend.id} className="group glass-panel border border-white/5 rounded-2xl p-5 hover:border-brand-spotify transition-colors relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-spotify/5 mix-blend-screen rounded-full blur-[30px] group-hover:bg-brand-spotify/20 transition-all opacity-50 pointer-events-none" />
                            <div className="flex justify-between items-center relative z-10">
                                <div>
                                    <h4 className="font-bold text-white text-lg">{blend.participant_a_name} + {blend.participant_b_name}</h4>
                                    <p className="text-xs text-text-muted mt-1">{new Date(blend.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-brand-spotify font-black text-2xl">{(blend.compatibility_score ?? 0).toFixed(0)}%</span>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Match</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>

        <div>
           <AuthUploadPanel presetUserId={session.user.id} />
        </div>
      </div>
    </div>
  );
}
