import type { ReactNode } from "react";

/** A quiet spaced label led by a hairline: 头条, 今日看点, 关于本站. */
export function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 text-[11px] font-medium tracking-[0.14em] text-ink-3 ${className}`}>
      <span className="h-px w-5 bg-line-strong" aria-hidden="true" />
      {children}
    </div>
  );
}
