"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOutMerge } from "./sidebar-nav";

const tabs = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/blend/create", label: "Create", icon: CreateIcon },
  { href: "/dashboard", label: "Library", icon: LibraryIcon },
] as const;

export function MobileTabs() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-elevated border-t border-white/5 pb-safe">
        <div className="flex items-center justify-around h-14">
          {tabs.map((tab) => {
            const active = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors ${
                  active ? "text-brand-ytmusic" : "text-text-muted"
                }`}
              >
                <tab.icon active={active} />
                <span className="text-[10px] font-semibold">{tab.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full text-text-muted transition-colors`}
          >
            <MoreIcon />
            <span className="text-[10px] font-semibold">More</span>
          </button>
        </div>
      </nav>

      {sheetOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setSheetOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute bottom-0 left-0 right-0 glass-elevated rounded-t-2xl animate-slide-up pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-4" />
            <div className="px-4 pb-6 space-y-1">
              <SheetLink href="/faq" label="Docs & FAQ" onClick={() => setSheetOpen(false)} />
              <SheetLink href="/invite" label="Invite a Friend" onClick={() => setSheetOpen(false)} />
              <div className="border-t border-white/5 my-3" />
              <button
                type="button"
                onClick={() => { setSheetOpen(false); signOutMerge(); }}
                className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-brand-ytred hover:bg-surface-highlight transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SheetLink({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-3 rounded-xl text-sm font-semibold text-text-secondary hover:bg-surface-highlight hover:text-white transition-colors"
    >
      {label}
    </Link>
  );
}

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function CreateIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function LibraryIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
    </svg>
  );
}
