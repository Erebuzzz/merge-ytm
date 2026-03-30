import { Suspense } from "react";
import Link from "next/link";
import { ResultsPanel } from "@/components/blend/results-panel";
import { SectionCard } from "@/components/ui/section-card";
import { getBlend } from "@/lib/api";

export const dynamic = "force-dynamic";

function BlendSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="glass-panel p-8 rounded-[30px] flex gap-6">
        <div className="w-48 h-48 rounded-2xl bg-surface-highlight/40 flex-shrink-0" />
        <div className="flex-1 space-y-4 pt-4">
          <div className="h-3 w-24 bg-surface-highlight/40 rounded" />
          <div className="h-12 w-3/4 bg-surface-highlight/40 rounded-xl" />
          <div className="h-4 w-40 bg-surface-highlight/40 rounded" />
        </div>
      </div>
      {/* Cards skeleton */}
      <div className="grid gap-8 xl:grid-cols-[1.35fr_0.9fr]">
        <div className="h-48 rounded-2xl bg-surface-highlight/20" />
        <div className="h-48 rounded-2xl bg-surface-highlight/20" />
      </div>
      {/* Track list skeleton */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-panel rounded-2xl overflow-hidden">
          <div className="h-16 bg-surface-highlight/20" />
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((j) => (
              <div key={j} className="flex items-center gap-4 px-2">
                <div className="w-8 h-4 bg-surface-highlight/30 rounded" />
                <div className="flex-1 h-4 bg-surface-highlight/30 rounded" />
                <div className="w-24 h-4 bg-surface-highlight/30 rounded hidden md:block" />
                <div className="w-12 h-4 bg-surface-highlight/30 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

async function BlendContent({ id }: { id: string }) {
  const blend = await getBlend(id);
  return <ResultsPanel blend={blend} />;
}

export default async function BlendResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Suspense fallback={<BlendSkeleton />}>
      <BlendContentWrapper id={id} />
    </Suspense>
  );
}

async function BlendContentWrapper({ id }: { id: string }) {
  try {
    return <BlendContent id={id} />;
  } catch (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <SectionCard eyebrow="Blend lookup" title="Could not load this blend" className="max-w-xl text-center">
          <p className="text-sm leading-7 text-text-secondary mt-4 mb-8">
            {error instanceof Error ? error.message : "The backend did not return a usable blend. It may have expired or never existed."}
          </p>
          <Link
            href="/blend/create"
            className="inline-flex rounded-full bg-brand-ytmusic px-8 py-3 text-sm font-bold text-black transition hover:scale-105"
          >
            Create another blend
          </Link>
        </SectionCard>
      </div>
    );
  }
}
