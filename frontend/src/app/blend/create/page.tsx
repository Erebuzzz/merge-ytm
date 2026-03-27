import { BlendForm } from "@/components/blend/blend-form";

export default function CreateBlendPage() {
  return (
    <div className="space-y-8 animate-fade-in-up">
      <section className="glass-panel p-8 rounded-2xl border-l-4 border-l-brand-spotify relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-spotify/20 rounded-full mix-blend-screen filter blur-[40px]"></div>
        <div className="relative z-10 text-text-primary">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Blend Builder</p>
          <h2 className="text-3xl font-display font-bold mb-4">Create a new shared playlist</h2>
          <div className="grid gap-4 text-sm leading-relaxed text-text-secondary md:grid-cols-3 font-medium">
            <p className="flex items-start gap-2"><span className="text-brand-ytgradient2">1.</span> Paste up to five playlist links per listener.</p>
            <p className="flex items-start gap-2"><span className="text-brand-ytgradient2">2.</span> Attach auth only for liked songs import.</p>
            <p className="flex items-start gap-2"><span className="text-brand-ytgradient2">3.</span> Generate a compact playlist with a readable score.</p>
          </div>
        </div>
      </section>

      <div className="glass-panel p-8 rounded-2xl shadow-xl">
        <BlendForm />
      </div>
    </div>
  );
}
