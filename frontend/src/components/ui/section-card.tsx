import type { ReactNode } from "react";

type SectionCardProps = {
  eyebrow?: string;
  title?: string;
  children: ReactNode;
  className?: string;
};

export function SectionCard({ eyebrow, title, children, className = "" }: SectionCardProps) {
  return (
    <section className={`rounded-[30px] border border-white/60 bg-white/72 p-6 shadow-glow backdrop-blur ${className}`}>
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d96e3d]">{eyebrow}</p> : null}
      {title ? <h2 className="mt-2 font-display text-2xl font-semibold text-[#1d1720]">{title}</h2> : null}
      <div className={title || eyebrow ? "mt-5" : ""}>{children}</div>
    </section>
  );
}
