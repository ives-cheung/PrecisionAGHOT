import { SITE } from "@aihot/industry/site";
import { Link, redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/topic";
import type { FeedItemSummary, PoolResponse } from "@aihot/contracts/site";
import { loadOr404 } from "../lib/api.server";
import { breadcrumbLd, pageMeta, titled } from "../lib/seo";
import { DayList, Pagination } from "../features/feed/DayList";
import { EmptyState, MoreLink } from "../components/ui/Page";

/** Selected items of a topic: shared caches keep the page as long as its api answer (one minute). */
export function headers() {
  return { "Cache-Control": "public, max-age=0, s-maxage=60" };
}

interface TopicPageData {
  topic: { slug: string; name: string; group: string; definition: string; total: number; allTotal: number; allLatestAt: string | null; indexable: boolean; related: Array<{ slug: string; name: string }> };
  items: FeedItemSummary[];
  page: number;
  pageCount: number;
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const page = params.page ? Number(params.page) : 1;
  if (params.page !== undefined && (!/^\d+$/.test(params.page) || page < 1)) throw new Response("Not found", { status: 404 });
  // Page 1 lives at the topic's own address (308).
  if (params.page === "1") throw redirect(`/topics/${params.slug}`, 308);
  const data = await loadOr404<TopicPageData>(`/api/site/topics/${encodeURIComponent(params.slug)}?page=${page}`, { signal: request.signal });
  const sources = page === 1 && data.items.length === 0
    ? await loadOr404<PoolResponse>(`/api/site/pool?topic=${encodeURIComponent(data.topic.slug)}`, { signal: request.signal })
    : null;
  const recent = (sources?.items ?? [])
    .map((item) => ({ ...item, timelineAt: item.publishedAt ?? item.timelineAt }))
    .sort((a, b) => Date.parse(b.timelineAt) - Date.parse(a.timelineAt))
    .slice(0, 10);
  return { data, sources: sources ? { ...sources, items: recent } : null };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: titled("主题不存在") }, { name: "robots", content: "noindex" }];
  const { topic, page } = loaderData.data;
  const path = page > 1 ? `/topics/${topic.slug}/page/${page}` : `/topics/${topic.slug}`;
  return pageMeta({
    title: page > 1 ? `${topic.name} · 第 ${page} 页` : topic.name,
    description: topic.definition,
    path,
    image: `/og/topics/${topic.slug}.png`,
    noindex: !topic.indexable,
    jsonLd: breadcrumbLd([{ name: SITE.name, path: "/" }, { name: "主题", path: "/topics" }, { name: topic.name, path: `/topics/${topic.slug}` }]),
  });
}

export default function TopicPage() {
  const { data, sources } = useLoaderData<typeof loader>();
  const { topic, items, page, pageCount } = data;
  const hasSources = !!sources?.items.length;
  const allHref = `/all?topic=${encodeURIComponent(topic.slug)}`;
  const href = (p: number) => (p <= 1 ? `/topics/${topic.slug}` : `/topics/${topic.slug}/page/${p}`);
  const first = (page - 1) * 20 + 1;
  const last = first + items.length - 1;
  return (
    <div className="pb-6">
      <header className="mb-7 border-b border-line pb-7 pt-7 lg:pt-1">
        <div className="mb-4"><MoreLink to="/topics">全部主题</MoreLink></div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="page-title">{topic.name}</h1>
        </div>
        <p className="page-lead mt-4">{topic.definition}</p>
        <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-3">
          <span className="text-[12.5px] text-ink-4">
            <span className="num mr-1 text-[20px] font-medium text-ink">{(topic.allTotal ?? sources?.total ?? topic.total).toLocaleString("zh-CN")}</span>条动态
            <span className="num ml-3">· {topic.total.toLocaleString("zh-CN")} 条精选</span>
          </span>
          {topic.related.length > 0 && (
            <span className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
              <span className="text-ink-4">相关主题</span>
              {topic.related.map((r) => (
                <Link key={r.slug} to={`/topics/${r.slug}`} className="chip">
                  {r.name}
                </Link>
              ))}
            </span>
          )}
        </div>
      </header>

      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="section-title">{hasSources ? "来源动态" : "最新精选"}</h2>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          {items.length > 0 && (
            <span className="num text-[12px] text-ink-4">
              第 {first}–{last} 条 · 共 {topic.total.toLocaleString("zh-CN")} 条
            </span>
          )}
          <Link to={allHref} className="text-[13px] text-ink-3 hover:text-ink">全部动态 ↗</Link>
        </div>
      </div>
      {items.length === 0 ? (
        hasSources ? (
          <div>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-3">这个主题暂时还没有精选，以下为已发布的来源动态，按原文日期排列。</p>
            <DayList items={sources.items} />
          </div>
        ) : (
          <EmptyState title="这个主题暂时还没有精选内容" action={<Link to={allHref} className="text-[14px] text-ink underline underline-offset-4">浏览这个主题的全部动态 ↗</Link>} />
        )
      ) : (
        <DayList items={items} />
      )}
      <Pagination page={page} pageCount={pageCount} href={href} />
    </div>
  );
}
