import type { ReactNode } from "react";

type SectionCardProps = {
  eyebrow?: string;
  title?: string;
  children: ReactNode;
  className?: string;
};

export function SectionCard({ eyebrow, title, children, className = "" }: SectionCardProps) {
  return (
    <section className={`glass-panel rounded-2xl md:rounded-[30px] p-5 md:p-8 relative overflow-hidden ${className}`}>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <div className="relative z-10">
        {eyebrow ? <p className="text-[10px] font-bold uppercase tracking-widest text-brand-ytgradient2 mb-2">{eyebrow}</p> : null}
        {title ? <h2 className="font-display text-display-sm text-white mb-4 md:mb-6">{title}</h2> : null}
        <div>{children}</div>
      </div>
    </section>
  );
}
