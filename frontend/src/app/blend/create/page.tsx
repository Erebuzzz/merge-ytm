import { BlendForm } from "@/components/blend/blend-form";
import { SectionCard } from "@/components/ui/section-card";

export default function CreateBlendPage() {
  return (
    <div className="space-y-6">
      <SectionCard eyebrow="Blend builder" title="Create a new shared playlist">
        <div className="grid gap-4 text-sm leading-7 text-[#5d5257] md:grid-cols-3">
          <p>Paste up to five playlist links per listener.</p>
          <p>Attach auth only for liked songs import or final export.</p>
          <p>Generate a compact playlist with clear sections and a readable score.</p>
        </div>
      </SectionCard>

      <BlendForm />
    </div>
  );
}
