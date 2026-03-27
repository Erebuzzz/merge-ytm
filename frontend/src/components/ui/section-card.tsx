import type { ReactNode } from "react";

type SectionCardProps = {
  eyebrow?: string;
  title?: string;
  children: ReactNode;
  className?: string;
};

export function SectionCard({ eyebrow, title, children, className = "" }: SectionCardProps) {
  return (
    <section className={`glass-panel rounded-[30px] p-8 shadow-xl relative overflow-hidden ${className}`}>
      {/* Subtle top glare effect */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      
      <div className="relative z-10">
        {eyebrow ? <p className="text-[10px] font-bold uppercase tracking-widest text-brand-spotify mb-2">{eyebrow}</p> : null}
        {title ? <h2 className="font-display text-2xl font-bold text-white mb-6">{title}</h2> : null}
        <div className={title || eyebrow ? "" : ""}>{children}</div>
      </div>
    </section>
  );
}
