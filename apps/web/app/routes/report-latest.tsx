import { SITE, withSubject } from "@aihot/industry/site";
import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/report-latest";
import type { PoolResponse, ReportDetail, ReportNavigationEntry } from "@aihot/contracts/site";
import { loadOr404 } from "../lib/api.server";
import { pageMeta } from "../lib/seo";
import { beijingDate } from "../lib/format";
import { EmptyState } from "../components/ui/Page";
import { ReportLayout } from "../features/report/ReportLayout";
import { ReportPaper } from "../features/report/ReportPaper";
import { DayList } from "../features/feed/DayList";
import { KIND_LABEL, kindFromPath } from "../features/report/format";

export async function loader({ request }: Route.LoaderArgs) {
  const kind = kindFromPath(new URL(request.url).pathname);
  const { index, report } = await loadOr404<{ index: ReportNavigationEntry[]; report: ReportDetail | null }>(`/api/site/reports/${kind}/latest-page`, { signal: request.signal });
  const hasContent = !!report && [...report.highlights, ...report.flashes, ...report.sections.flatMap((s) => s.items)].some((item) => item.available);
  const sources = hasContent ? null : await loadOr404<PoolResponse>("/api/site/pool", { signal: request.signal });
  // Source reports remain dated by their original publication, outside the edition's coverage.
  const sourceItems = sources?.items.slice(0, 10).map((item) => ({ ...item, timelineAt: item.publishedAt ?? item.timelineAt })) ?? [];
  return { kind, report, hasContent, sourceItems, index, today: beijingDate(Date.now()) };
}

export function meta({ loaderData, location }: Route.MetaArgs) {
  const kind = loaderData?.kind ?? "daily";
  return pageMeta({
    title: withSubject(KIND_LABEL[kind]),
    description: kind === "daily" ? `${SITE.name} 每天 08:00（北京时间）发布的${withSubject("日报")}。` : kind === "weekly" ? "每周综合回顾。" : "每月盘点。",
    path: location.pathname,
    image: `/og/pages/${kind}.png`,
  });
}

export function headers() {
  return { "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=300" };
}

export default function ReportLatestPage() {
  const { kind, report, hasContent, sourceItems, index, today } = useLoaderData<typeof loader>();
  return (
    <ReportLayout kind={kind} index={index} current={report?.key ?? null} today={today}>
      {report && hasContent ? <ReportPaper report={report} index={index} /> : (
        <div>
          <header className="border-b border-line pb-6 xl:pt-1">
            <p className="eyebrow">行业进展，定期回顾</p>
            <h1 className="page-title mt-3">{withSubject(KIND_LABEL[kind])}</h1>
            {report && <p className="num mt-2 text-[13px] text-ink-3">本期：{report.key}</p>}
          </header>
          <EmptyState title={report ? "本期没有符合精选条件的条目" : `首期${KIND_LABEL[kind]}尚未发布`}>
            {report ? "本期截止时尚无可刊载的精选报道，来源动态可继续浏览。" : "第一期正式发布后会出现在这里，可以先浏览最近来源动态。"}
          </EmptyState>
          <section className="border-t border-line pt-6" aria-labelledby="report-source-heading">
            <div className="flex items-center justify-between gap-4">
              <h2 id="report-source-heading" className="section-title">最近来源动态</h2>
              <Link to="/all" className="shrink-0 text-[13px] text-ink-3 hover:text-ink">全部动态 <span aria-hidden="true">↗</span></Link>
            </div>
            <p className="mb-5 mt-2 text-[13px] leading-relaxed text-ink-3">按原文发布日期浏览。这些报道独立于正式{KIND_LABEL[kind]}，不代表本期精选内容。</p>
            {sourceItems.length ? <DayList items={sourceItems} /> : <EmptyState title="暂时没有可读的来源动态">来源采集和处理完成后会出现在这里。</EmptyState>}
          </section>
        </div>
      )}
    </ReportLayout>
  );
}
