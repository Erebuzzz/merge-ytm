"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type LocalUser = { id: string; name: string; email: string };

export function TopHeader() {
  const [user, setUser] = useState<LocalUser | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("merge_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* corrupted */ }
    }
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : null;

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 md:px-6 glass-elevated">
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <span className="font-display text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-spotify to-brand-ytmusic">
          Merge
        </span>
      </Link>

      <div className="flex items-center gap-3">
        {user ? (
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-full bg-surface-highlight/60 border border-white/5 pl-3 pr-1.5 py-1 hover:bg-surface-highlight transition-colors"
          >
            <span className="text-xs font-semibold text-text-secondary hidden sm:inline truncate max-w-[120px]">
              {user.name}
            </span>
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-ytgradient1 to-brand-ytmusic flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {initials}
            </span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-xs font-bold text-white bg-surface-highlight/60 border border-white/5 rounded-full px-4 py-2 hover:bg-surface-highlight transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
