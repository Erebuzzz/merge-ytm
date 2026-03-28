"use client";

import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function SidebarNav() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.push("/");
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
        Docs & FAQ
      </Link>

      <div className="pt-4 mt-2 border-t border-white/5 space-y-2">
        {isPending ? (
          <div className="px-4 py-3 text-text-muted animate-pulse">Loading...</div>
        ) : session ? (
          <>
            <div className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-text-muted">
              {session.user.name}
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
