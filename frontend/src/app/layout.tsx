import type { Metadata } from "next";
import Link from "next/link";
import { Manrope, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "YTMusic Sync",
  description: "Create a private shared blend playlist from YouTube Music listening data.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} dark`}>
      <body className="font-sans antialiased bg-background text-text-primary overflow-hidden">
        <div className="flex h-screen w-full relative">
          
          {/* Sidebar Navigation */}
          <aside className="w-64 flex-shrink-0 flex flex-col bg-surface-elevated/80 backdrop-blur-xl border-r border-surface-border relative z-20">
            <div className="p-6">
              <Link href="/" className="space-y-1 block mb-8 hover:opacity-80 transition-opacity">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Private music blend</p>
                <p className="font-display text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-spotify to-brand-ytmusic">
                  YTMusic Sync
                </p>
              </Link>

              <nav className="flex flex-col gap-2 font-semibold text-sm text-text-secondary">
                <Link href="/" className="px-4 py-3 rounded-lg transition hover:bg-surface-highlight hover:text-text-primary">
                  Home
                </Link>
                <Link
                  href="/blend/create"
                  className="px-4 py-3 rounded-lg transition hover:bg-surface-highlight hover:text-text-primary"
                >
                  Create Blend
                </Link>
                <Link
                  href="/auth-upload"
                  className="px-4 py-3 rounded-lg transition hover:bg-surface-highlight hover:text-text-primary"
                >
                  Auth Upload
                </Link>
              </nav>
            </div>
            
            <div className="mt-auto p-6 text-xs text-text-muted">
              v1.0.0 &bull; Hybrid MVP
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto relative pb-28">
            <div className="px-8 py-10 max-w-[1400px] mx-auto min-h-full">
              {children}
            </div>
          </main>

          {/* Persistent Player Bar */}
          <div className="glass-panel absolute bottom-0 left-0 right-0 h-24 z-30 flex items-center justify-between px-6 border-t border-white/5">
            <div className="flex items-center gap-4 w-1/3">
              <div className="w-14 h-14 bg-surface-highlight rounded-md shadow-lg flex items-center justify-center border border-white/5">
                {/* Simulated album art placeholder */}
                <span className="text-xl">🎵</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">Ready to Sync</p>
                <p className="text-xs text-text-muted">Create a blend to start playing</p>
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center w-1/3">
              <div className="flex items-center gap-6">
                <button className="text-text-muted hover:text-white transition pt-1">⏮</button>
                <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition shadow-lg">
                  <span className="ml-1 tracking-tighter">▶</span>
                </button>
                <button className="text-text-muted hover:text-white transition pt-1">⏭</button>
              </div>
              <div className="w-full max-w-md mt-2 h-1 bg-surface-border rounded-full flex">
                 <div className="w-0 h-full bg-brand-ytmusic rounded-full"></div>
              </div>
            </div>
            
            <div className="w-1/3 flex justify-end items-center gap-3 text-text-muted text-sm border-r pr-2 border-white/0">
              <span className="opacity-50 hover:opacity-100 cursor-pointer">🔈</span>
              <div className="w-24 h-1 bg-surface-border rounded-full cursor-pointer group">
                  <div className="h-full w-2/3 bg-text-secondary rounded-full group-hover:bg-brand-spotify transition-colors"></div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
