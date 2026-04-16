"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getYouTubeAuthUrl } from "@/lib/api";

const OAUTH_ERRORS: Record<string, string> = {
  access_denied: "You cancelled the Google sign-in. Please try again.",
  token_exchange_failed: "Google sign-in failed. Please try again.",
  missing_id_token: "Google did not return identity info. Please try again.",
  invalid_id_token: "Google returned an invalid token. Please try again.",
  email_not_provided: "Your Google account did not share an email address. Please allow email access and try again.",
};

function RegisterContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const errorCode = searchParams.get("error");
    if (errorCode) {
      const oauthError = searchParams.get("oauth_error");
      const oauthErrorDescription = searchParams.get("oauth_error_description");

      let message = OAUTH_ERRORS[errorCode] ?? `Sign-in error: ${errorCode}`;
      if (errorCode === "token_exchange_failed") {
        const details: string[] = [];
        if (oauthError) details.push(oauthError);
        if (oauthErrorDescription) details.push(oauthErrorDescription);
        const detailStr = details.length ? ` (${details.join(": ")})` : "";
        message = `Google sign-in failed${detailStr}. Please try again.`;
      }

      setError(message);
      window.history.replaceState({}, "", "/register");
    }
  }, [searchParams]);

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    try {
      const { url } = await getYouTubeAuthUrl();
      if (url) window.location.href = url;
      else throw new Error("Could not get authorization URL.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] md:min-h-[70vh] animate-fade-in-up">
      <div className="w-full max-w-sm mx-auto">
        <div className="glass-panel rounded-2xl md:rounded-3xl p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-spotify to-brand-ytmusic" />
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-brand-spotify/15 blur-[80px] rounded-full pointer-events-none" />

          <div className="relative z-10">
            <h1 className="text-display-sm font-display text-white text-center mb-1">Create account</h1>
            <p className="text-xs text-text-muted text-center mb-8">
              Connect your Google account to get started
            </p>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-bold text-black transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-50 disabled:hover:scale-100 touch-target"
            >
              <GoogleIcon />
              {loading ? "Redirecting..." : "Continue with Google"}
            </button>

            {error && (
              <div className="mt-4 bg-brand-ytred/10 border border-brand-ytred/20 text-brand-ytred text-xs font-medium px-4 py-3 rounded-xl text-center animate-fade-in-up">
                {error}
              </div>
            )}

            <p className="mt-6 text-center text-[11px] text-text-muted">
              Already have an account?{" "}
              <Link href="/login" className="text-brand-spotify hover:text-white transition-colors font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-[10px] text-text-muted/50 text-center mt-4">
          By continuing, you allow Merge to sync your playlists.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh] animate-pulse text-text-muted">Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
