"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn.email({
      email,
      password,
      fetchOptions: {
        onError: (ctx) => {
          setError(ctx.error.message || "Invalid credentials." )
        },
        onSuccess: () => {
          router.push("/dashboard")
        }
      }
    });
    setLoading(false);
  }

  return (
    <div className="flex justify-center items-center min-h-[70vh] animate-fade-in-up">
      <div className="glass-panel w-full max-w-md p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
        {/* Glow behind */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-spotify/30 blur-[80px] mix-blend-screen pointer-events-none rounded-full" />
        
        <div className="relative z-10">
          <h1 className="text-3xl font-display font-black text-white text-center mb-2">Welcome Back</h1>
          <p className="text-sm text-center text-text-muted mb-8">Sign in to sync to YouTube Music</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full rounded-xl border border-white/10 bg-surface-highlight/50 px-4 py-3 text-sm text-white outline-none transition-all focus:border-brand-spotify focus:ring-1 focus:ring-brand-spotify focus:bg-surface-elevated shadow-inner"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-white/10 bg-surface-highlight/50 px-4 py-3 text-sm text-white outline-none transition-all focus:border-brand-spotify focus:ring-1 focus:ring-brand-spotify focus:bg-surface-elevated shadow-inner"
              />
            </div>

            {error && (
              <div className="bg-brand-ytred/10 border border-brand-ytred/20 text-brand-ytred text-xs font-medium px-4 py-2 flex items-center justify-center rounded-lg mt-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 rounded-full bg-white px-6 py-4 text-sm font-black tracking-wide text-black transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-text-muted">
            Don't have an account?{" "}
            <Link href="/register" className="text-white font-bold hover:underline">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
