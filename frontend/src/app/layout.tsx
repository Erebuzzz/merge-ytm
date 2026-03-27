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
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="font-sans text-[#1d1720] antialiased">
        <div className="relative mx-auto min-h-screen max-w-7xl px-6 py-6 md:px-8">
          <header className="mb-8 flex flex-col gap-5 rounded-[32px] border border-white/60 bg-white/68 px-6 py-5 shadow-glow backdrop-blur md:flex-row md:items-center md:justify-between">
            <Link href="/" className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#d96e3d]">Private music blend</p>
              <p className="font-display text-2xl font-bold">YTMusic Sync</p>
            </Link>

            <nav className="flex flex-wrap gap-3 text-sm font-semibold text-[#453c43]">
              <Link href="/" className="rounded-full border border-[#1d1720]/10 px-4 py-2 transition hover:border-[#d96e3d] hover:text-[#d96e3d]">
                Home
              </Link>
              <Link
                href="/blend/create"
                className="rounded-full border border-[#1d1720]/10 px-4 py-2 transition hover:border-[#d96e3d] hover:text-[#d96e3d]"
              >
                Create Blend
              </Link>
              <Link
                href="/auth-upload"
                className="rounded-full border border-[#1d1720]/10 px-4 py-2 transition hover:border-[#d96e3d] hover:text-[#d96e3d]"
              >
                Auth Upload
              </Link>
            </nav>
          </header>

          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
