"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type LocalUser = { id: string; name: string; email: string };

export function signOutMerge() {
  localStorage.removeItem("merge_session_token");
  localStorage.removeItem("merge_user");
  window.location.href = "/login";
}

const navItems = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/blend/create", label: "Create Blend", icon: CreateIcon },
  { href: "/dashboard", label: "Dashboard", icon: DashIcon },
  { href: "/faq", label: "Docs & FAQ", icon: DocsIcon },
] as const;

export function SidebarNav({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("merge_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* corrupted */ }
    }
    setReady(true);
  }, []);

  function handleLogout() {
    signOutMerge();
    setUser(null);
    router.push("/login");
  }

  return (
    <nav className="flex flex-col gap-1 text-sm">
      {navItems.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={`flex items-center gap-3 rounded-xl transition-colors font-medium ${
              collapsed ? "justify-center px-2 py-3" : "px-3 py-2.5"
            } ${
              active
                ? "bg-surface-highlight text-white"
                : "text-text-secondary hover:bg-surface-highlight/50 hover:text-text-primary"
            }`}
          >
            <item.icon active={active} />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}

      <div className={`mt-4 pt-4 border-t border-white/5 space-y-1 ${collapsed ? "px-0" : ""}`}>
        {!ready ? (
          <div className={`py-3 text-text-muted animate-pulse ${collapsed ? "text-center" : "px-3"}`}>
            {collapsed ? "..." : "Loading..."}
          </div>
        ) : user ? (
          <>
            {!collapsed && (
              <div className="px-3 py-2 rounded-xl bg-surface-highlight/30 border border-white/5 mb-2">
                <p className="text-xs font-bold text-text-secondary truncate">{user.name}</p>
                <p className="text-[10px] text-text-muted truncate">{user.email}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              title={collapsed ? "Sign Out" : undefined}
              className={`w-full flex items-center gap-3 rounded-xl transition-colors text-text-secondary hover:bg-surface-highlight/50 hover:text-brand-ytred font-medium ${
                collapsed ? "justify-center px-2 py-3" : "px-3 py-2.5"
              }`}
            >
              <LogoutIcon />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className={`block rounded-xl transition-colors bg-surface-highlight/50 text-white font-bold border border-white/5 text-center ${
              collapsed ? "px-2 py-3 text-xs" : "px-3 py-2.5 text-sm"
            } hover:bg-brand-spotify/20 hover:text-brand-spotify`}
          >
            {collapsed ? "In" : "Sign In"}
          </Link>
        )}
      </div>
    </nav>
  );
}

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" /><path d="M9 21V12h6v9" /></svg>
  );
}
function CreateIcon({ active }: { active?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>
  );
}
function DashIcon({ active }: { active?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
  );
}
function DocsIcon({ active }: { active?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8M16 17H8M10 9H8" /></svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
  );
}
