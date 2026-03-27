import Link from "next/link";

import { ResultsPanel } from "@/components/blend/results-panel";
import { SectionCard } from "@/components/ui/section-card";
import { getBlend } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function BlendResultPage({ params }: { params: { id: string } }) {
  try {
    const blend = await getBlend(params.id);
    return <ResultsPanel blend={blend} />;
  } catch (error) {
    return (
      <SectionCard eyebrow="Blend lookup" title="Could not load this blend">
        <p className="text-sm leading-7 text-[#5d5257]">
          {error instanceof Error ? error.message : "The backend did not return a usable blend."}
        </p>
        <Link href="/blend/create" className="mt-4 inline-flex rounded-full bg-[#1d1720] px-5 py-3 text-sm font-semibold text-[#f9f0e3] transition hover:bg-[#433645]">
          Create another blend
        </Link>
      </SectionCard>
    );
  }
}
