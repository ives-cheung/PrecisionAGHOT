// A quiet content row: source and time, headline, summary, then reading controls.
import { memo } from "react";
import { Link } from "react-router";
import { IntentLink } from "../../components/ui/IntentLink";
import type { GroupInfo, FeedItemSummary, TimelineFilters } from "@aihot/contracts/site";
import { CATEGORY_LABELS } from "@aihot/contracts/taxonomy";
import { beijingTime } from "../../lib/format";
import { MediaThumbs, SourceLine, StarButton } from "./parts";
import { GroupDevelopments, GroupSources, LatestDevelopment } from "./ReadingGroup";
import { QuotedLine } from "../item/QuotedPost";

export interface FeedItemProps {
  item: FeedItemSummary;
  group?: GroupInfo | null;
  filters?: TimelineFilters;
  read?: boolean;
  onOpen?: (id: string) => void;
  /** A grouped card is dated by its latest development. */
  at?: string;
  /** Show category and tags under the text (全部动态, topics, search). */
  showTags?: boolean;
}

export const FeedItem = memo(function FeedItem({ item, group, filters, read = false, onOpen, at = item.timelineAt, showTags = false }: FeedItemProps) {
  const isX = item.channel === "x" && !!item.x;
  const open = () => onOpen?.(item.id);
  const showSources = !!group && (group.additionalSourceCount > 0 || (group.developmentCount <= 1 && group.reportCount > 1));
  const showDevelopments = !!group?.story && group.developmentCount > 1;
  const tags = showTags ? item.tags.slice(0, 2) : [];

  return (
    <article className="group/entry relative min-w-0 py-6 sm:py-7" data-item-id={item.id}>
      <header className="flex min-h-7 items-center gap-2 text-[12px] leading-5 text-ink-4 sm:gap-3">
        <SourceLine item={item} className="text-ink-3" />
        <span aria-hidden="true" className="shrink-0">·</span>
        <time dateTime={at} className="num shrink-0">{beijingTime(at)}</time>
        {item.selected && <span className="hidden shrink-0 sm:inline">精选</span>}
        <StarButton item={item} size={32} className="ml-auto" />
      </header>

      {isX ? (
        <p className={`mt-3 whitespace-pre-line text-[18px] leading-[1.8] line-clamp-5 sm:line-clamp-4 ${read ? "text-ink-3" : "text-ink"}`}>
          <IntentLink to={`/items/${item.id}`} onClick={open} className="after:absolute after:inset-0 after:content-['']">
            {item.summary ?? item.title}
          </IntentLink>
        </p>
      ) : (
        <>
          <h3 className={`mt-2.5 line-clamp-3 text-[18px] font-semibold leading-[1.6] tracking-[-0.015em] sm:text-[20px] ${read ? "text-ink-3" : "text-ink"}`}>
            <IntentLink to={`/items/${item.id}`} onClick={open} className="decoration-line-strong underline-offset-4 group-hover/entry:underline after:absolute after:inset-0 after:content-['']">
              {item.title}
            </IntentLink>
          </h3>
          {item.summary && <p className="mt-2.5 line-clamp-3 text-[14px] leading-[1.9] text-ink-3 sm:line-clamp-2 sm:text-[15px]">{item.summary}</p>}
        </>
      )}

      {isX && item.x!.media.length > 0 && <MediaThumbs media={item.x!.media} className="mt-4" />}
      {isX && item.x!.quoted?.text && <QuotedLine quoted={item.x!.quoted} />}

      {(tags.length > 0 || (showTags && item.category) || item.score !== null) && (
        <div className="relative z-10 mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ink-4 sm:text-[12px]">
          {showTags && item.category && (
            <Link to={`/all?category=${item.category}`} className="transition-colors hover:text-ink">
              {CATEGORY_LABELS[item.category]}
            </Link>
          )}
          {tags.map((t) => (
            <Link key={t} to={`/all?tag=${encodeURIComponent(t)}`} className="transition-colors hover:text-ink">
              {t}
            </Link>
          ))}
          {item.score !== null && <span title={`AI 评分 ${Math.round(item.score)}/100`} aria-label={`AI 评分 ${Math.round(item.score)} 分`}>评分 {Math.round(item.score)}</span>}
        </div>
      )}

      {group && <LatestDevelopment group={group} />}
      {(showSources || showDevelopments) && (
        <div className="mt-3 flex flex-wrap items-start gap-x-5 gap-y-2">
          {showSources && <GroupSources group={group!} filters={filters} parentId={item.id} />}
          {showDevelopments && <GroupDevelopments group={{ ...group!, story: group!.story! }} filters={filters} parentId={item.id} />}
        </div>
      )}

      {item.reason && (
        <p className="mt-4 line-clamp-2 text-[13px] leading-[1.8] text-ink-4">值得关注 · {item.reason}</p>
      )}
    </article>
  );
});
