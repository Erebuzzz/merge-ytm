"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BlendInfo = { id: string; names: string; score: number } | null;

export function ContextBar() {
  const [blend, setBlend] = useState<BlendInfo>(null);

  useEffect(() => {
    const stored = localStorage.getItem("merge_last_blend");
    if (stored) {
      try { setBlend(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  if (!blend) {
    return (
      <div className="h-12 flex items-center justify-center px-4 glass-surface border-t border-white/5">
        <p className="text-xs text-text-muted font-medium">
          Create your first blend to see it here
        </p>
      </div>
    );
  }

  return (
    <Link
      href={`/blend/${blend.id}`}
      className="h-12 flex items-center gap-3 px-4 glass-surface border-t border-white/5 hover:bg-surface-highlight/40 transition-colors group"
    >
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-ytgradient1 to-brand-ytmusic flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-white">{blend.score.toFixed(0)}%</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-white truncate">{blend.names}</p>
        <p className="text-[10px] text-text-muted">Latest blend</p>
      </div>
      <span className="text-text-muted group-hover:text-white transition-colors text-xs">View</span>
    </Link>
  );
}
