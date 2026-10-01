import { SITE, withSubject } from "@aihot/industry/site";
import { Link } from "react-router";
import type { ReportKind, ReportNavigationEntry } from "@aihot/contracts/site";
import { KIND_LABEL, reportPath } from "./format";

/** History belongs to the page layout so empty editions retain the same reading navigation. */
export function ReportHistory({ kind, index, current }: { kind: ReportKind; index: ReportNavigationEntry[]; current: string | null }) {
  // The daily archive already lists its issues; daily pages reach the complete archive directly.
  if (kind === "daily") {
    return current ? (
      <section id="report-history" className="mt-10 border-t border-line pt-5">
        <Link to="/daily/archive" className="inline-flex items-center gap-2 text-[13px] text-ink-3 hover:text-ink">浏览日报合订本 <span aria-hidden="true">↗</span></Link>
      </section>
    ) : null;
  }
  const others = index.filter((e) => e.key !== current);
  return (
    <section id="report-history" aria-labelledby="report-history-title" className="mt-10 scroll-mt-6 border-t border-line pt-6">
      <h2 id="report-history-title" className="text-[13px] font-medium text-ink-3">往期 {withSubject(KIND_LABEL[kind])}</h2>
      {others.length > 0 ? (
        <ul className="mt-3">
          {others.map((e) => (
            <li key={e.key}>
              <Link to={reportPath(kind, e.key)} className="group flex items-baseline gap-4 border-b border-line py-3">
                <span className="num w-[76px] shrink-0 text-[12.5px] text-ink-4">{e.key}</span>
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink-2 transition-colors group-hover:text-accent">{e.title ?? `${SITE.name} ${KIND_LABEL[kind]} · ${e.key}`}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-[13px] text-ink-4">暂无其他已发布刊期。</p>}
    </section>
  );
}
