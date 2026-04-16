import type { Metadata } from "next";
import Link from "next/link";
import { Manrope, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopHeader } from "@/components/layout/top-header";
import { MobileTabs } from "@/components/layout/mobile-tabs";
import { ContextBar } from "@/components/layout/context-bar";

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
  title: "Merge",
  description: "Create playlists from your combined music taste on YouTube Music.",
  icons: { icon: "/favicon.ico", shortcut: "/favicon.ico" },
  viewport: {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} dark`}>
      <body className="font-sans antialiased bg-background text-text-primary">
        <div className="flex h-dvh w-full relative overflow-hidden">

          {/* Desktop sidebar */}
          <aside className="hidden md:flex w-56 lg:w-64 flex-shrink-0 flex-col bg-surface-elevated/80 backdrop-blur-xl border-r border-surface-border relative z-20">
            <div className="p-4 lg:p-5">
              <Link href="/" className="block mb-6 hover:opacity-80 transition-opacity">
                <p className="font-display text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-spotify to-brand-ytmusic">
                  Merge
                </p>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-text-muted mt-0.5 leading-tight">
                  Shared playlists for YTM
                </p>
              </Link>
              <SidebarNav />
            </div>

            <div className="mt-auto p-4 lg:p-5 space-y-3">
              <div className="flex flex-wrap gap-2 text-[11px] font-medium text-text-muted">
                <a href="https://github.com/Erebuzzz/merge-ytm" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
                <span className="text-white/10">|</span>
                <a href="https://x.com/erebuzzz" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">X</a>
                <span className="text-white/10">|</span>
                <a href="https://discord.com/users/1206267175267074049" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Discord</a>
              </div>
              <p className="text-[10px] text-text-muted/40">v1.0 &bull; MIT</p>
            </div>
          </aside>

          {/* Main content area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile-only top header */}
            <div className="md:hidden">
              <TopHeader />
            </div>

            {/* Scrollable main */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="px-4 py-6 md:px-6 md:py-8 lg:px-8 max-w-[1200px] mx-auto min-h-full pb-20 md:pb-4">
                {children}
              </div>
            </main>

            {/* Desktop context bar */}
            <div className="hidden md:block">
              <ContextBar />
            </div>
          </div>

        </div>

        {/* Mobile bottom tabs */}
        <MobileTabs />
      </body>
    </html>
  );
}
