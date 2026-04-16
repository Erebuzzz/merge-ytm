"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type LocalUser = { id: string; name: string; email: string };

export function signOutMerge() {
  localStorage.removeItem("merge_session_token");
  localStorage.removeItem("merge_user");
  window.location.href = "/login";
}

export function SidebarNav() {
  const router = useRouter();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("merge_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // corrupted
      }
    }
    setReady(true);
  }, []);

  function handleLogout() {
    signOutMerge();
    setUser(null);
    router.push("/login");
  }

  return (
    <nav className="flex flex-col gap-2 font-semibold text-sm text-text-secondary">
      <Link href="/" className="px-4 py-3 rounded-lg transition hover:bg-surface-highlight hover:text-text-primary">
        Home
      </Link>
      <Link href="/blend/create" className="px-4 py-3 rounded-lg transition hover:bg-surface-highlight hover:text-text-primary">
        Create Blend
      </Link>
      <Link href="/faq" className="px-4 py-3 rounded-lg transition hover:bg-surface-highlight hover:text-text-primary">
        Docs &amp; FAQ
      </Link>

      <div className="pt-4 mt-2 border-t border-white/5 space-y-2">
        {!ready ? (
          <div className="px-4 py-3 text-text-muted animate-pulse">Loading...</div>
        ) : user ? (
          <>
            <div className="px-4 py-2 rounded-lg bg-surface-highlight/30 border border-white/5">
              <p className="text-xs font-bold uppercase tracking-widest text-text-muted">{user.name}</p>
              <p className="text-[11px] text-text-muted/80 truncate">{user.email}</p>
            </div>
            <Link href="/dashboard" className="block px-4 py-3 rounded-lg transition hover:bg-surface-highlight hover:text-text-primary text-brand-spotify">
              Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 rounded-lg transition hover:bg-surface-highlight hover:text-brand-ytred"
            >
              Sign Out
            </button>
          </>
        ) : (
          <Link href="/login" className="block px-4 py-3 rounded-lg transition hover:bg-brand-spotify/20 hover:text-brand-spotify bg-surface-highlight/50 text-white font-bold text-center border border-white/5">
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
