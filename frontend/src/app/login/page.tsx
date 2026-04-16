"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getYouTubeAuthUrl } from "@/lib/api";

const OAUTH_ERRORS: Record<string, string> = {
  access_denied: "You cancelled the Google sign-in. Please try again.",
  token_exchange_failed: "Google sign-in failed — the authorisation code expired. Please try again.",
  missing_id_token: "Google did not return identity info. Please try again.",
  invalid_id_token: "Google returned an invalid token. Please try again.",
  email_not_provided: "Your Google account did not share an email address. Please allow email access and try again.",
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="flex-shrink-0">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const errorCode = searchParams.get("error");
    if (errorCode) {
      setError(OAUTH_ERRORS[errorCode] ?? `Sign-in error: ${errorCode}. Please try again.`);
      window.history.replaceState({}, "", "/login");
    }
  }, [searchParams]);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    try {
      const res = await getYouTubeAuthUrl();
      if (res.url) {
        window.location.href = res.url;
      } else {
        throw new Error("Unable to retrieve authorization URL.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  }

  return (
    <div className="flex justify-center items-center min-h-[70vh] animate-fade-in-up">
      <div className="glass-panel w-full max-w-md p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-ytmusic/20 blur-[80px] mix-blend-screen pointer-events-none rounded-full" />

        <div className="relative z-10 flex flex-col items-center">
          <h1 className="text-3xl font-display font-black text-white text-center mb-2">Welcome Back</h1>
          <p className="text-sm text-center text-text-muted mb-8 leading-relaxed">
            Link your Google account to automatically import your library and connect to YouTube Music.
          </p>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white px-4 py-4 text-sm font-bold text-black transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-60 disabled:hover:scale-100 mb-6"
          >
            <GoogleIcon />
            {googleLoading ? "Redirecting to Google..." : "Continue with Google"}
          </button>

          {error && (
            <div className="bg-brand-ytred/10 border border-brand-ytred/20 text-brand-ytred text-xs font-medium px-4 py-3 text-center mb-2 rounded-lg w-full">
              {error}
            </div>
          )}

          <div className="mt-6 text-center text-xs text-text-muted opacity-70">
            By connecting, you allow Merge to securely sync your playlists.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="glass-panel w-full max-w-md p-8 rounded-3xl border border-white/5 shadow-2xl animate-pulse">
          <div className="h-8 bg-surface-highlight/30 rounded-xl mb-4" />
          <div className="h-14 bg-surface-highlight/30 rounded-xl" />
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
