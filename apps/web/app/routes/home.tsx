import { data as withHeaders, Link, redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/home";
import type { PoolResponse, TimelineResponse } from "@aihot/contracts/site";
import { isCategoryKey, isChannelKey } from "@aihot/contracts/taxonomy";
import { loadOr404, queryString, releaseBoundCache } from "../lib/api.server";
import { listPath, organizationLd, pageMeta } from "../lib/seo";
import { Timeline } from "../features/feed/Timeline";
import { DayList } from "../features/feed/DayList";
import { HotTopics } from "../features/feed/HotTopics";
import { CategoryTabs, SearchField, SearchIconLink } from "../features/feed/Filters";
import { beijingDate, beijingWeekday } from "../lib/format";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  // Search lives on /all; keep the parameters so old links still land on results.
  if (q && q.trim()) throw redirect(`/all${url.search}`);
  const channelParam = url.searchParams.get("channel") ?? "all";
  const categoryParam = url.searchParams.get("category");
  const channel = isChannelKey(channelParam) ? channelParam : "all";
  const category = categoryParam && isCategoryKey(categoryParam) ? categoryParam : null;
  const tag = url.searchParams.get("tag")?.trim() || null;
  const upstream = new Headers();
  const query = queryString({ channel: channel === "all" ? null : channel, category, tag });
  const data = await loadOr404<TimelineResponse>(`/api/site/timeline${query}`, { responseHeaders: upstream, signal: request.signal });
  const sources = await loadOr404<PoolResponse>(`/api/site/pool${query}`, { signal: request.signal });
  return withHeaders({ data, sources, allHref: `/all${query}`, filters: { channel, category, tag, topic: null } }, { headers: releaseBoundCache(data.refreshAt, 60, Date.now(), upstream) });
}

export function meta({ loaderData }: Route.MetaArgs) {
  const f = loaderData?.filters;
  const path = listPath("/", { channel: f && f.channel !== "all" ? f.channel : null, category: f?.category, tag: f?.tag });
  return pageMeta({ path, jsonLd: path === "/" ? organizationLd() : undefined });
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

function TodayLabel() {
  const today = beijingDate(Date.now());
  const [, m, d] = today.split("-").map(Number) as [number, number, number];
  return (
    <span className="num whitespace-nowrap text-[12px] text-ink-4" suppressHydrationWarning>
      {m}月{d}日 · {beijingWeekday(today).replace("星期", "周")}
    </span>
  );
}

export default function Home() {
  const { data, sources, allHref, filters } = useLoaderData<typeof loader>();
  const hasSources = !!sources?.items.length;
  const title = filters.tag ? `#${filters.tag}` : hasSources ? "最新动态" : "行业精选";
  const FeedHeading = filters.tag || filters.category ? "h1" : "h2";
  return (
    <div className="pb-6">
      {!filters.tag && !filters.category && (
        <section className="mb-10 border-b border-line pb-9 pt-7 sm:pb-11 sm:pt-9 lg:pt-1" aria-label="全球精准农业情报">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <p className="eyebrow">GLOBAL AGRICULTURAL TECHNOLOGY</p>
            <TodayLabel />
          </div>
          <h1 className="mt-5 text-[36px] font-medium leading-[1.2] tracking-[-0.045em] text-ink sm:text-[48px] xl:text-[54px]">农业科技的下一步。</h1>
          <p className="mt-5 max-w-[650px] text-[15px] leading-[1.9] text-ink-3 sm:text-[16px]">自动转向、智能装备、农场软件与技术服务。<br />追踪全球精准农业，让重要进展清晰可读。</p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-[13px] text-ink-2">
            {[["guidance", "自动转向与导航"], ["software", "农场管理软件"], ["services", "农业技术服务"]].map(([key, label]) => (
              <Link key={key} to={`/all?category=${key}`} className="inline-flex items-center gap-2 underline-offset-4 hover:underline">{label} <span aria-hidden="true">↗</span></Link>
            ))}
          </div>
        </section>
      )}
      {data.hot && <HotTopics entries={data.hot} />}
      <div className="flex items-center justify-between gap-4">
        <FeedHeading className="section-title">{title}</FeedHeading>
        <Link to={allHref} className="shrink-0 text-[13px] text-ink-3 transition-colors hover:text-ink">全部动态 <span aria-hidden="true">↗</span></Link>
      </div>
      {hasSources && <p className="mt-2 text-[13px] leading-relaxed text-ink-3">已采集并处理的行业报道，按原文发布日期浏览。<span className="num">共 {sources.total} 条。</span></p>}
      <div className="mb-3 mt-6 hidden items-center justify-between gap-4 lg:flex">
        <div className="min-w-0 flex-1">
          <CategoryTabs base="/" category={filters.category} channel={filters.channel} layoutId="home-cat-desk" />
        </div>
        <SearchField variant="track" keep={{ category: filters.category, tag: filters.tag, channel: filters.channel === "all" ? null : filters.channel }} />
      </div>
      <div className="-mx-5 mb-3 mt-5 flex items-center gap-2 pl-5 pr-3 lg:hidden">
        <CategoryTabs base="/" category={filters.category} channel={filters.channel} layoutId="home-cat-mobile" size="sm" className="min-w-0 flex-1" />
        <SearchIconLink />
      </div>

      {hasSources ? <DayList items={sources.items} todayCount={sources.todayCount} /> : <Timeline initial={data} filters={data.filters} />}
      {hasSources && data.cards.length > 0 && (
        <section className="mt-10 border-t border-line pt-6" aria-labelledby="home-selected-heading">
          <h2 id="home-selected-heading" className="section-title mb-4">行业精选</h2>
          <Timeline initial={data} filters={data.filters} />
        </section>
      )}
    </div>
  );
}
