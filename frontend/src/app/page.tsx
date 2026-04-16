import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-12 md:space-y-16">
      {/* Hero */}
      <section className="relative -mx-4 -mt-6 md:-mx-6 md:-mt-8 lg:-mx-8 px-4 pt-16 pb-14 md:px-10 md:pt-24 md:pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-ytmusic/10 via-brand-ytgradient1/5 to-transparent pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-80 md:w-[500px] h-80 md:h-[500px] bg-brand-ytmusic rounded-full mix-blend-screen blur-[120px] opacity-15 animate-glow-pulse" />
        <div className="absolute -bottom-40 -left-40 w-64 md:w-96 h-64 md:h-96 bg-brand-spotify rounded-full mix-blend-screen blur-[100px] opacity-10" />

        <div className="relative z-10 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-ytgradient2 mb-4 md:mb-5">
            Shared taste, perfected
          </p>
          <h1 className="text-display-xl font-display text-white mb-5 md:mb-6 tracking-tight">
            Combine your music taste with friends{" "}
            <span className="text-gradient-brand">and actually enjoy it together</span>.
          </h1>
          <p className="text-base md:text-lg text-text-secondary mb-8 md:mb-10 leading-relaxed max-w-xl">
            Not just shared songs. Merge builds playlists from your combined YouTube Music libraries — shared taste, compatible picks, and new discoveries.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link
              href="/blend/create"
              className="group relative inline-flex items-center justify-center px-7 py-3.5 bg-white text-black font-bold rounded-full overflow-hidden transition-all hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.15)] text-sm"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-brand-ytgradient1/20 to-brand-ytmusic/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10">Create a Blend</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-full border border-white/15 font-bold text-white transition-colors hover:bg-white/5 hover:border-white/30 text-sm"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted mb-6">How it works</p>
        <div className="grid gap-4 md:gap-6 md:grid-cols-3">
          {[
            { n: "01", title: "Paste or pick playlists", desc: "Drop YouTube Music URLs or connect your account to pick from your library." },
            { n: "02", title: "Generate blend", desc: "Merge analyzes your combined taste — overlap, compatibility, and discovery." },
            { n: "03", title: "Export to YouTube Music", desc: "One tap creates a private playlist on your YouTube Music library." },
          ].map((step) => (
            <div key={step.n} className="glass-surface rounded-2xl p-5 md:p-6 relative overflow-hidden group hover:border-white/10 transition-colors">
              <span className="absolute top-3 right-4 text-4xl font-black text-white/[0.03] select-none">{step.n}</span>
              <div className="w-10 h-10 rounded-xl bg-surface-highlight flex items-center justify-center mb-4 border border-white/5 text-sm font-bold text-text-muted">
                {step.n}
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">{step.title}</h3>
              <p className="text-xs leading-relaxed text-text-secondary">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Community */}
      <section className="glass-surface rounded-2xl md:rounded-3xl p-6 md:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-ytgradient1/8 rounded-full mix-blend-screen blur-[60px]" />
        <div className="relative z-10 max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-ytgradient2 mb-3">Open source</p>
          <h2 className="text-display-lg font-display text-white mb-5">
            Free, independent, and built in the open.
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-6">
            Merge is not affiliated with any streaming platform. No subscriptions, no lock-in.
            Contribute code, report issues, or share your blends.
          </p>
          <a
            href="https://github.com/Erebuzzz/merge-ytm"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-bold text-brand-spotify hover:text-white transition-colors"
          >
            View on GitHub
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17l9.2-9.2M17 17V7.8H7.8" /></svg>
          </a>
        </div>
      </section>
    </div>
  );
}
