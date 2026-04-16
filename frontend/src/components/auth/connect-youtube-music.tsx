"use client";

import { useEffect, useState } from "react";
import { getYouTubeAuthUrl, getYouTubeStatus } from "@/lib/api";

type ConnectionStatus = {
  connected: boolean;
  method: "oauth" | null;
};

type Props = {
  /** Called after status is loaded or changes */
  onStatusChange?: (status: ConnectionStatus) => void;
};

export function ConnectYouTubeMusic({ onStatusChange }: Props) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    getYouTubeStatus()
      .then((s) => {
        setStatus(s);
        onStatusChange?.(s);
      })
      .catch(() => setStatus({ connected: false, method: null }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConnect() {
    setConnecting(true);
    try {
      const { url } = await getYouTubeAuthUrl();
      window.location.href = url;
    } catch {
      setConnecting(false);
    }
  }

  if (loading) {
    return (
      <div className="h-12 rounded-xl bg-surface-highlight/30 animate-pulse touch-target" />
    );
  }

  if (status?.connected) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-brand-spotify/30 bg-brand-spotify/5 px-4 py-3 touch-target">
        <span className="w-6 h-6 rounded-full bg-brand-spotify/20 flex items-center justify-center text-brand-spotify text-xs font-bold shrink-0">✓</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">YouTube Music connected</p>
          <p className="text-[11px] text-text-muted">via Google account</p>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={connecting}
      className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white px-4 py-3.5 text-sm font-bold text-black transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-60 disabled:hover:scale-100 touch-target"
    >
      {/* Google G icon */}
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
        <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
      </svg>
      {connecting ? "Redirecting..." : "Connect YouTube Music"}
    </button>
  );
}
