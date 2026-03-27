import Link from "next/link";
import { ResultsPanel } from "@/components/blend/results-panel";
import { SectionCard } from "@/components/ui/section-card";
import { getBlend } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function BlendResultPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const blend = await getBlend(id);
    return <ResultsPanel blend={blend} />;
  } catch (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <SectionCard eyebrow="Blend lookup" title="Could not load this blend" className="max-w-xl text-center">
          <p className="text-sm leading-7 text-text-secondary mt-4 mb-8">
            {error instanceof Error ? error.message : "The backend did not return a usable blend. It may have expired or never existed."}
          </p>
          <Link 
            href="/blend/create" 
            className="inline-flex rounded-full bg-brand-spotify px-8 py-3 text-sm font-bold text-black transition hover:scale-105"
          >
            Create another blend
          </Link>
        </SectionCard>
      </div>
    );
  }
}
