import { BlendForm } from "@/components/blend/blend-form";

export default function CreateBlendPage() {
  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in-up">
      <section className="glass-surface rounded-2xl md:rounded-3xl p-5 md:p-8 relative overflow-hidden border-l-2 border-l-brand-ytgradient2">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-ytgradient2/10 rounded-full blur-[40px] pointer-events-none" />
        <div className="relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Blend Builder</p>
          <h2 className="text-display-sm font-display text-white mb-4">Create a new blend</h2>
          <div className="grid gap-3 text-xs leading-relaxed text-text-secondary md:grid-cols-3">
            <p><span className="text-brand-ytgradient2 font-bold">1.</span> Connect or paste playlists</p>
            <p><span className="text-brand-ytgradient2 font-bold">2.</span> Add your friend&apos;s public URLs</p>
            <p><span className="text-brand-ytgradient2 font-bold">3.</span> Generate a scored playlist</p>
          </div>
        </div>
      </section>

      <div className="glass-panel rounded-2xl md:rounded-3xl p-4 md:p-8">
        <BlendForm />
      </div>
    </div>
  );
}
