import Link from "next/link";
import Image from "next/image";

const steps = [
  {
    step: "01",
    title: "Paste playlist links",
    description: "Drop in YouTube Music playlist URLs for both listeners. No spreadsheets, no setup.",
    icon: "https://img.icons8.com/3d-fluency/94/link.png",
  },
  {
    step: "02",
    title: "Generate blend",
    description: "Merge analyzes your combined taste \u2014 shared tracks, compatible picks, and discovery finds.",
    icon: "https://img.icons8.com/3d-fluency/94/music-record.png",
  },
  {
    step: "03",
    title: "Export to YouTube Music",
    description: "One click creates a private YouTube Music playlist ready to play.",
    icon: "https://img.icons8.com/3d-fluency/94/youtube-play.png",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-10 pb-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-surface-elevated border border-white/5 shadow-2xl">
        {/* Background glows */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-ytmusic/15 via-brand-ytgradient1/10 to-transparent pointer-events-none mix-blend-screen"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-ytmusic rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-ytgradient1 rounded-full mix-blend-screen filter blur-[100px] opacity-10"></div>

        <div className="relative p-10 md:p-16 flex flex-col md:flex-row gap-12 items-center justify-between z-10">
          <div className="max-w-xl animate-fade-in-up md:pr-8">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-ytgradient2 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 inline-flex"><img src="https://img.icons8.com/3d-fluency/94/fire-element.png" alt="Fire" /></span>
              Shared taste, perfected
            </p>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight text-white tracking-tight mb-6">
              Combine your music taste with friends and generate playlists that{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-ytgradient1 to-brand-ytmusic">
                actually fit both of you
              </span>
              .
            </h1>
            <p className="text-lg text-text-secondary mb-10 leading-relaxed font-medium">
              Not just shared songs. Merge builds playlists from your combined taste.
            </p>

            <div className="flex flex-wrap gap-5">
              <Link
                href="/blend/create"
                className="group relative px-8 py-4 bg-white text-black font-bold rounded-full overflow-hidden transition hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-brand-ytgradient1/20 to-brand-ytmusic/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative z-10">Create Merge</span>
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 rounded-full border border-white/20 font-bold text-white transition hover:bg-white/5 hover:border-white/40"
              >
                Login
              </Link>
            </div>
          </div>

          <div className="w-full max-w-sm glass-panel rounded-2xl p-6 hidden lg:block animate-slide-in-right border-t border-white/10 shadow-xl relative">
            <img src="https://img.icons8.com/3d-fluency/180/headphones.png" alt="Headphones" className="absolute -top-12 -right-12 w-32 h-32 opacity-80 drop-shadow-2xl animate-float pointer-events-none" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted mb-4">
              Blend Composition
            </p>
            <div className="space-y-3">
              <div className="group rounded-xl bg-surface-highlight p-4 border border-transparent transition hover:border-brand-ytmusic/30 hover:bg-brand-ytmusic/5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    <img className="w-4 h-4" src="https://img.icons8.com/3d-fluency/94/heart-suit.png" alt="" />
                    Shared Taste
                  </p>
                  <span className="text-xs text-brand-ytgradient2 font-medium">100% Match</span>
                </div>
                <p className="mt-1 text-xs text-text-muted line-clamp-1">
                  Tracks both listeners have on repeat.
                </p>
              </div>
              <div className="group rounded-xl bg-surface-highlight p-4 border border-transparent transition hover:border-white/20 hover:bg-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    <img className="w-4 h-4" src="https://img.icons8.com/3d-fluency/94/user-male-circle.png" alt="" />
                    From User A
                  </p>
                  <span className="text-xs text-text-muted">Discovery</span>
                </div>
                <p className="mt-1 text-xs text-text-muted line-clamp-1">
                  Ranked highly for compatibility.
                </p>
              </div>
              <div className="group rounded-xl bg-surface-highlight p-4 border border-transparent transition hover:border-brand-ytgradient1/30 hover:bg-brand-ytgradient1/5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    <img className="w-4 h-4" src="https://img.icons8.com/3d-fluency/94/user-female-circle.png" alt="" />
                    From User B
                  </p>
                  <span className="text-xs text-text-muted">Vibe matched</span>
                </div>
                <p className="mt-1 text-xs text-text-muted line-clamp-1">
                  Counterbalance picks along the centerline.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlight Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((item) => (
          <div
            key={item.step}
            className="glass-panel p-6 rounded-2xl hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden"
          >
            <span className="absolute top-4 right-5 text-5xl font-black text-white/5 select-none leading-none">
              {item.step}
            </span>
            <div className="w-14 h-14 rounded-full bg-surface-highlight/70 flex items-center justify-center mb-5 border border-white/5 shadow-inner">
              <img src={item.icon} alt="" className="w-8 h-8 drop-shadow-md" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
            <p className="text-sm leading-relaxed text-text-secondary">{item.description}</p>
          </div>
        ))}
      </div>

      {/* Community Message Block */}
      <section className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row gap-8 items-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-ytgradient1/10 rounded-full mix-blend-screen filter blur-[80px]"></div>
        <div className="hidden md:flex w-32 justify-center shrink-0 z-10">
          <img src="https://img.icons8.com/3d-fluency/180/diamond.png" alt="Diamond" className="w-24 h-24 drop-shadow-xl animate-float-delayed" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-ytgradient2 mb-3">
            Community-driven
          </p>
          <h2 className="text-3xl font-display font-bold text-white mb-6">
            Free, independent, and built in the open.
          </h2>
          <div className="grid gap-6 text-sm leading-relaxed text-text-secondary md:grid-cols-2">
            <p>
              Merge is free to use and not affiliated with any streaming platform. It runs on open-source tooling
              and is maintained by the community \u2014 no subscriptions, no lock-in.
            </p>
            <p>
              Whether you contribute code, report issues, or just share your blends, you&apos;re part of what keeps
              Merge going. Check out the project on GitHub and get involved.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
