import { Link } from "react-router";
import type { HotStripEntry } from "@aihot/contracts/site";
import { IconArrowRight, IconMinus, IconTrendDown, IconTrendUp } from "../../components/icons";

function hrefOf(e: HotStripEntry): string {
  return e.storyPublicId ? `/story/${e.storyPublicId}` : e.itemId ? `/items/${e.itemId}` : "/hot";
}

/** A quiet direction marker for the live ranking. */
function TrendMark({ trend }: { trend: HotStripEntry["trend"] }) {
  if (trend === "up") return <IconTrendUp size={14} strokeWidth={1.6} className="text-ink-3" aria-label="热度上升" />;
  if (trend === "down") return <IconTrendDown size={14} strokeWidth={1.6} className="text-ink-4" aria-label="热度回落" />;
  if (trend === "new") return <span className="text-[11px] text-ink-3">新</span>;
  if (trend === "unknown") return null;
  return <IconMinus size={14} strokeWidth={1.6} className="text-ink-4" aria-label="热度持平" />;
}

/** The home page's current stories, set as a short index without decorative cards. */
export function HotTopics({ entries }: { entries: HotStripEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <section aria-labelledby="hot-topics" className="mb-10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id="hot-topics" className="section-title">当前热点</h2>
        <Link to="/hot" className="group inline-flex items-center gap-2 text-[13px] text-ink-3 transition-colors hover:text-ink">
          查看全部 <IconArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
      <ol className="border-t border-line">
        {entries.slice(0, 5).map((e) => (
          <li key={e.rank} className="border-b border-line">
            <Link to={hrefOf(e)} className="group grid grid-cols-[20px_minmax(0,1fr)_16px] items-baseline gap-x-4 py-5 sm:grid-cols-[24px_minmax(0,1fr)_auto_16px]">
              <span className="num text-[13px] text-ink-4">{String(e.rank).padStart(2, "0")}</span>
              <span className="line-clamp-2 min-w-0 text-[16px] font-medium leading-[1.6] text-ink decoration-line-strong underline-offset-4 group-hover:underline">{e.title}</span>
              <span className="hidden whitespace-nowrap text-[12px] text-ink-4 sm:inline" title="热度指数">
                <span className="num">{Math.round(e.heat)}</span> 热度
              </span>
              <span className="flex justify-center self-center"><TrendMark trend={e.trend} /></span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
