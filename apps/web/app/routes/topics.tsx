import { SITE } from "@aihot/industry/site";
import { Link, useLoaderData } from "react-router";
import { apiGet } from "../lib/api.server";
import { pageMeta } from "../lib/seo";

interface TopicSummary {
  slug: string;
  name: string;
  group: "company" | "field" | "genre";
  definition: string;
  total: number;
  recent: number;
  indexable: boolean;
  latestAt: string | null;
  allTotal: number;
  allLatestAt: string | null;
}

export async function loader({ request }: { request: Request }) {
  return apiGet<{ topics: TopicSummary[] }>("/api/site/topics", { signal: request.signal });
}

export function meta() {
  return pageMeta({ title: "主题", description: `按公司与机构、技术方向、内容形态聚合的${SITE.subject}主题页，覆盖农机装备、自动转向、智能终端、农场软件、数据平台与技术服务。`, path: "/topics", image: "/og/pages/topics.png" });
}

export function headers() {
  return { "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600" };
}

const GROUPS = [
  { key: "company", name: "公司与机构", blurb: "追踪全球厂商与研究机构：新品发布、产业进展与合作" },
  { key: "field", name: "技术方向", blurb: "按方向追踪：导航转向、智能作业、农场软件、数据平台与技术服务" },
  { key: "genre", name: "内容形态", blurb: "按内容类型浏览：论文、教程、观点、政策……" },
] as const;

export default function TopicsPage() {
  const { topics } = useLoaderData<typeof loader>();
  return (
    <div className="pb-16">
      <header className="pb-5 pt-7 lg:pt-1">
        <p className="eyebrow">持续追踪你关心的方向</p>
        <h1 className="page-title mt-3">探索{SITE.subject}</h1>
        <p className="page-lead mt-4">
          按公司与机构、技术方向、内容形态浏览 <span className="num">{topics.length}</span> 个主题，持续汇集近期焦点与精选。
        </p>
      </header>
      {GROUPS.map((g) => (
        <section key={g.key} aria-labelledby={`topics-${g.key}`} className="pt-8 sm:pt-10">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-b border-line pb-5">
            <h2 id={`topics-${g.key}`} className="section-title">
              {g.name}
            </h2>
            <p className="text-[13px] leading-relaxed text-ink-4">{g.blurb}</p>
          </div>
          <ul className="grid gap-x-10 sm:grid-cols-2">
            {topics
              .filter((t) => t.group === g.key)
              .map((t) => (
                <li key={t.slug} className="border-b border-line">
                  <Link
                    to={`/topics/${t.slug}`}
                    prefetch="intent"
                    aria-label={`查看${t.name}相关动态与精选文章`}
                    className="group flex h-full flex-col py-6"
                  >
                    <span className="flex items-start justify-between gap-5 text-[18px] font-medium leading-[1.5] text-ink"><span className="decoration-line-strong underline-offset-4 group-hover:underline">{t.name}</span><span aria-hidden="true" className="text-ink-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">↗</span></span>
                    <span className="mt-2.5 line-clamp-2 flex-1 text-[14px] leading-[1.8] text-ink-3">{t.definition}</span>
                    <span className="num mt-4 text-[12px] text-ink-4">{t.allTotal ?? t.total} 条动态 · {t.total} 条精选</span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
