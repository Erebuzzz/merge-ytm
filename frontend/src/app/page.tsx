import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";

const features = [
  {
    title: "Zero-friction input",
    description: "Paste playlist links and let the backend collect track data with no spreadsheets or CSV cleanup.",
  },
  {
    title: "Optional power-user auth",
    description: "Upload headers_auth.json only when you need liked songs imports or playlist export.",
  },
  {
    title: "Blend-ready structure",
    description: "Results are split into shared taste, then side recommendations with transparent scoring.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[36px] border border-white/60 bg-white/76 px-6 py-10 shadow-glow backdrop-blur md:px-10 md:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_0.85fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#d96e3d]">Shared taste with a narrow workflow</p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl font-bold leading-tight text-[#1d1720] md:text-6xl">
              Turn two YouTube Music libraries into one private blend playlist.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#5d5257]">
              YTMusic Sync keeps the experience deliberately small. Two listeners, a few inputs, one clean result. The backend handles
              fetching, normalization, fuzzy matching, and export.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/blend/create" className="rounded-full bg-[#1d1720] px-6 py-3 text-sm font-semibold text-[#f9f0e3] transition hover:bg-[#433645]">
                Start a blend
              </Link>
              <Link
                href="/auth-upload"
                className="rounded-full border border-[#1d1720]/10 px-6 py-3 text-sm font-semibold text-[#1d1720] transition hover:border-[#d96e3d] hover:text-[#d96e3d]"
              >
                Upload auth
              </Link>
            </div>
          </div>

          <div className="rounded-[30px] bg-[#1d1720] px-6 py-6 text-[#f9f0e3]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f3a56b]">Blend shape</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-white/10 px-4 py-4">
                <p className="text-sm font-semibold">Shared Taste</p>
                <p className="mt-1 text-sm text-[#f9f0e3]/70">Overlap that both listeners already love.</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-4">
                <p className="text-sm font-semibold">From User A</p>
                <p className="mt-1 text-sm text-[#f9f0e3]/70">Unique picks ranked for compatibility and diversity.</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-4">
                <p className="text-sm font-semibold">From User B</p>
                <p className="mt-1 text-sm text-[#f9f0e3]/70">Counterbalance picks that still fit the centerline.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {features.map((feature) => (
          <SectionCard key={feature.title} eyebrow="Core feature" title={feature.title}>
            <p className="text-sm leading-6 text-[#5d5257]">{feature.description}</p>
          </SectionCard>
        ))}
      </div>

      <SectionCard eyebrow="Why this works" title="Simple for casual users, flexible for advanced users">
        <div className="grid gap-4 text-sm leading-7 text-[#5d5257] md:grid-cols-2">
          <p>
            Casual contributors can stay entirely in the playlist-link path. That still gives the blend engine enough signal to find common
            tracks and rank recommendations.
          </p>
          <p>
            Advanced users can unlock liked songs and one-click export through encrypted auth uploads, but the default path stays lightweight.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
