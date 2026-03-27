import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";

const features = [
  {
    title: "Zero-friction input",
    description: "Paste playlist links and let the backend collect track data with no spreadsheets or CSV cleanup.",
    icon: "🔗"
  },
  {
    title: "Optional power-user auth",
    description: "Upload headers_auth.json only when you need liked songs imports or playlist export.",
    icon: "🔐"
  },
  {
    title: "Blend-ready structure",
    description: "Results are split into shared taste, then side recommendations with transparent scoring.",
    icon: "📊"
  },
];

export default function HomePage() {
  return (
    <div className="space-y-10 pb-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-surface-elevated border border-white/5 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-ytmusic/20 via-brand-spotify/10 to-transparent pointer-events-none mix-blend-screen"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-ytmusic rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-spotify rounded-full mix-blend-screen filter blur-[100px] opacity-20"></div>

        <div className="relative p-10 md:p-16 flex flex-col md:flex-row gap-12 items-center justify-between z-10">
          <div className="max-w-xl animate-fade-in-up">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-ytgradient2 mb-4">Shared taste, perfected</p>
            <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight text-white tracking-tight mb-6">
              Blend your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-spotify to-brand-ytmusic">
                YouTube Music
              </span> <br />
              libraries.
            </h1>
            <p className="text-lg text-text-secondary mb-10 leading-relaxed font-medium">
              A private engine that takes two listeners, a few inputs, and generates one clean result. We handle the 
              normalized fuzzy matching, you just hit play.
            </p>

            <div className="flex flex-wrap gap-5">
              <Link 
                href="/blend/create" 
                className="group relative px-8 py-4 bg-white text-black font-bold rounded-full overflow-hidden transition hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-brand-spotify/20 to-brand-ytmusic/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative z-10">Start a Blend</span>
              </Link>
              <Link
                href="/auth-upload"
                className="px-8 py-4 rounded-full border border-white/20 font-bold text-white transition hover:bg-white/5 hover:border-white/40"
              >
                Upload Auth
              </Link>
            </div>
          </div>

          {/* Aesthetic UI Preview Card */}
          <div className="w-full max-w-sm glass-panel rounded-2xl p-6 hidden lg:block animate-slide-in-right border-t border-white/10 shadow-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted mb-4">Blend Composition</p>
            <div className="space-y-3">
              <div className="group rounded-xl bg-surface-highlight p-4 border border-transparent transition hover:border-brand-spotify/30 hover:bg-brand-spotify/5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">Shared Taste</p>
                  <span className="text-xs text-brand-spotify font-medium">100% Match</span>
                </div>
                <p className="mt-1 text-xs text-text-muted line-clamp-1">Tracks both listeners have on repeat.</p>
              </div>
              <div className="group rounded-xl bg-surface-highlight p-4 border border-transparent transition hover:border-white/20 hover:bg-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">From User A</p>
                  <span className="text-xs text-text-muted">Discovery</span>
                </div>
                <p className="mt-1 text-xs text-text-muted line-clamp-1">Ranked highly for compatibility.</p>
              </div>
              <div className="group rounded-xl bg-surface-highlight p-4 border border-transparent transition hover:border-brand-ytmusic/30 hover:bg-brand-ytmusic/5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">From User B</p>
                  <span className="text-xs text-text-muted">Vibe matched</span>
                </div>
                <p className="mt-1 text-xs text-text-muted line-clamp-1">Counterbalance picks along the centerline.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {features.map((feature, idx) => (
          <div key={feature.title} className="glass-panel p-6 rounded-2xl hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 rounded-full bg-surface-highlight flex items-center justify-center text-xl mb-4 border border-white/5 shadow-inner">
              {feature.icon}
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
            <p className="text-sm leading-relaxed text-text-secondary">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Info Section */}
      <section className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-spotify/10 rounded-full mix-blend-screen filter blur-[80px]"></div>
        <div className="relative z-10 max-w-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-spotify mb-3">Why this works</p>
          <h2 className="text-3xl font-display font-bold text-white mb-6">Simple for casual users, <br/>flexible for advanced users.</h2>
          <div className="grid gap-6 text-sm leading-relaxed text-text-secondary md:grid-cols-2">
            <p>
              Casual contributors can stay entirely in the playlist-link path. That still gives the blend engine enough signal to find common
              tracks and rank recommendations with our optimized fuzzy matching system.
            </p>
            <p>
              Advanced users can unlock liked songs and one-click export through encrypted auth uploads, but the default path stays lightweight and completely frictionless.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
