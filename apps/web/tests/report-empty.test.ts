// Production SSR with a local HTTP fixture: source dynamics never become a formal edition.
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import type { FeedItemSummary, ReportCitation, ReportDetail, ReportKind, ReportNavigationEntry } from "@aihot/contracts/site";

let web: ChildProcess;
let origin: string;
let logs = "";
const reports: Record<ReportKind, ReportDetail | null> = { daily: null, weekly: null, monthly: null };
const archivedReports: Record<ReportKind, ReportDetail[]> = { daily: [], weekly: [], monthly: [] };
const requests: string[] = [];
let poolItems: FeedItemSummary[] = [];

function reportIndex(kind: ReportKind, report: ReportDetail | null): ReportNavigationEntry[] {
  return archivedReports[kind].length > 0
    ? archivedReports[kind].map((r) => ({ key: r.key, title: r.title }))
    : report ? [{ key: report.key, title: null }] : [];
}

const api = createServer((req, res) => {
  const url = new URL(req.url!, "http://api.local");
  requests.push(url.pathname);
  res.setHeader("Content-Type", "application/json");
  if (url.pathname === "/api/site/meta") return res.end(JSON.stringify({ changelogVersion: "2026-09-30T12:00" }));
  const match = /^\/api\/site\/reports\/(daily|weekly|monthly)\/latest-page$/.exec(url.pathname);
  if (match) {
    const report = reports[match[1] as ReportKind];
    return res.end(JSON.stringify({ report, index: reportIndex(match[1] as ReportKind, report) }));
  }
  const navigation = /^\/api\/site\/reports\/(daily|weekly|monthly)\/navigation\/([^/]+)$/.exec(url.pathname);
  if (navigation) {
    const report = reports[navigation[1] as ReportKind];
    return res.end(JSON.stringify({ items: reportIndex(navigation[1] as ReportKind, report) }));
  }
  const detail = /^\/api\/site\/reports\/(daily|weekly|monthly)\/([^/]+)$/.exec(url.pathname);
  if (detail) {
    const kind = detail[1] as ReportKind;
    const report = archivedReports[kind].find((r) => r.key === detail[2]) ?? reports[kind];
    if (report && report.key === detail[2]) return res.end(JSON.stringify(report));
  }
  if (url.pathname === "/api/site/pool") return res.end(JSON.stringify({ filters: {}, items: poolItems, page: 1, pageCount: 1, total: poolItems.length, todayCount: 0, freshness: null, generatedAt: "2026-09-30T12:00:00Z" }));
  res.statusCode = 404;
  res.end(JSON.stringify({ code: "not_found" }));
});

before(async () => {
  api.listen(0, "127.0.0.1");
  await once(api, "listening");
  web = spawn(process.execPath, [fileURLToPath(new URL("../server.ts", import.meta.url))], {
    env: { ...process.env, WEB_PORT: "0", TRUST_PROXY: "false", API_BASE_URL: `http://127.0.0.1:${(api.address() as AddressInfo).port}` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`web did not start: ${logs}`)), 15_000);
    web.on("exit", () => { clearTimeout(timeout); reject(new Error(`web exited: ${logs}`)); });
    web.stderr!.on("data", (chunk) => { logs += String(chunk); });
    web.stdout!.on("data", (chunk) => {
      logs += String(chunk);
      const match = logs.match(/"msg":"web started","port":(\d+)/);
      if (match) { origin = `http://127.0.0.1:${match[1]}`; clearTimeout(timeout); resolve(); }
    });
  });
});

after(async () => {
  if (web && web.exitCode === null) { web.kill("SIGTERM"); await once(web, "exit"); }
  api.closeAllConnections();
  await new Promise<void>((resolve) => api.close(() => resolve()));
});

const source: FeedItemSummary = {
  id: "source-guidance-test", title: "来源自动转向兼容性更新（测试）", summary: "真实来源动态的测试夹具，不是精选日报。", reason: null,
  source: { name: "农业装备来源（测试）" }, publishedAt: "2026-09-29T06:00:00Z", timelineAt: "2026-09-30T12:00:00Z",
  category: "guidance", tags: ["自动转向"], score: 45, selected: false, channel: "news", x: null,
};

function emptyReport(kind: ReportKind): ReportDetail {
  return {
    kind, key: kind === "daily" ? "2026-09-30" : kind === "weekly" ? "2026-W39" : "2026-08", title: "空报告测试",
    windowStart: "2026-09-29T00:00:00Z", windowEnd: "2026-09-30T00:00:00Z", generatedAt: "2026-09-30T00:15:00Z", revision: 1,
    lead: null, overview: null, highlights: [], sections: [], stories: [], flashes: [], cover: null,
    metrics: { totalEvents: 99 }, readingMinutes: 1, prev: null, next: null,
  };
}

const citation: ReportCitation = {
  itemId: "formal-report-citation", title: "正式报告精选装备进展（测试）", summary: "正式精选摘要。", sourceName: "精选来源",
  sourceUrl: "https://example.com/formal-release", sourceId: "test-source", sourceIconUrl: null, firstParty: true, role: "官方",
  storyPublicId: null, publishedAt: "2026-09-29T06:00:00Z", available: true,
};

test("empty daily, weekly and monthly editions explain selection and show dated source reports separately", async () => {
  poolItems = [source];
  for (const kind of ["daily", "weekly", "monthly"] as const) {
    reports[kind] = emptyReport(kind);
    const start = requests.length;
    const res = await fetch(`${origin}/${kind}`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /本期没有符合精选条件的条目/);
    assert.match(html, /最近来源动态/);
    assert.match(html, /不代表本期精选内容/);
    assert.ok(html.includes(source.title) && html.includes(source.source.name) && html.includes(source.summary!));
    assert.ok(html.includes(`/items/${source.id}`));
    assert.match(html, /href="\/all"/);
    assert.match(html, /<time[^>]*dateTime="2026-09-29T06:00:00Z"/);
    assert.equal(requests.slice(start).filter((path) => path === "/api/site/pool").length, 1);
  }
});

test("unpublished first edition renders source dynamics in HTML and navigation, capped at ten", async () => {
  reports.daily = null;
  poolItems = Array.from({ length: 11 }, (_, i) => ({ ...source, id: `source-${i}`, title: `来源动态第${i + 1}条（测试）` }));
  for (const path of ["/daily", "/daily.data"]) {
    const res = await fetch(origin + path);
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.ok(body.includes(poolItems[0]!.title) && body.includes(poolItems[9]!.title));
    assert.ok(!body.includes(poolItems[10]!.title), "only the ten displayed reports are returned");
    if (path === "/daily") assert.match(body, /首期日报尚未发布/);
  }
});

test("a populated edition retains ReportPaper and never reads the source pool", async () => {
  reports.daily = { ...emptyReport("daily"), sections: [{ label: "农机装备", summary: null, items: [citation] }], stories: [{ ...citation, label: "农机装备" }], metrics: { totalEvents: 1 } };
  poolItems = [source];
  for (const path of ["/daily", "/daily.data", "/daily/2026-09-30", "/daily/2026-09-30.data"]) {
    const start = requests.length;
    const res = await fetch(origin + path);
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.ok(body.includes(citation.title));
    assert.ok(!body.includes(source.title));
    assert.ok(!requests.slice(start).includes("/api/site/pool"));
  }
});

test("weekly and monthly history remains reachable from empty and populated latest and dated editions", async () => {
  poolItems = [source];
  for (const kind of ["weekly", "monthly"] as const) {
    const keys = kind === "weekly" ? ["2026-W39", "2026-W38", "2026-W37", "2026-W36"] : ["2026-08", "2026-07", "2026-06", "2026-05"];
    archivedReports[kind] = keys.map((key) => ({ ...emptyReport(kind), key }));
    try {
      for (const populated of [false, true]) {
        const report = emptyReport(kind);
        reports[kind] = populated ? { ...report, sections: [{ label: "农机装备", summary: null, items: [citation] }], metrics: { totalEvents: 1 } } : report;
        archivedReports[kind][0] = reports[kind]!;
        for (const path of [`/${kind}`, `/${kind}/${report.key}`]) {
          const res = await fetch(origin + path);
          assert.equal(res.status, 200);
          const html = await res.text();
          const earlierHref = html.match(/<a\b[^>]*href="([^"]+)"[^>]*>更早<\/a>/)?.[1];
          assert.ok(earlierHref, "the recent-issue navigation includes the older-editions link");
          const earlierUrl = new URL(earlierHref, origin + path);
          assert.equal(earlierUrl.pathname, path, "history navigation stays on the current edition page");
          assert.equal(earlierUrl.hash, "#report-history");
          assert.equal((html.match(/id="report-history"/g) ?? []).length, 1, "the visible history anchor is unique");
          const history = html.match(/<section[^>]*id="report-history"[\s\S]*?<\/section>/)?.[0];
          assert.ok(history, "empty and populated editions both render a history section");
          assert.ok(history.includes(`href="/${kind}/${keys[3]}"`), "the fourth edition is linked beyond the recent three chips");
          if (populated) assert.ok(html.includes(citation.title));
          else assert.match(html, /本期没有(?:符合精选条件的条目|可读的精选条目)/);
        }
        const older = await fetch(`${origin}/${kind}/${keys[3]}`);
        assert.equal(older.status, 200, "the older edition link opens its dated route");
        const olderHtml = await older.text();
        assert.ok(olderHtml.includes(keys[3]!));
        assert.match(olderHtml, /本期没有可读的精选条目/);
      }
    } finally {
      archivedReports[kind] = [];
    }
  }
});

test("no source dynamics produces an explicit collection state without fabricated news", async () => {
  reports.daily = emptyReport("daily");
  poolItems = [];
  const res = await fetch(`${origin}/daily`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /本期没有符合精选条件的条目/);
  assert.match(html, /暂时没有可读的来源动态/);
});

test("dated empty editions retain their period and link to all dynamics without borrowing current sources", async () => {
  poolItems = [source];
  for (const kind of ["daily", "weekly", "monthly"] as const) {
    const report = emptyReport(kind);
    reports[kind] = report;
    for (const suffix of ["", ".data"]) {
      const start = requests.length;
      const res = await fetch(`${origin}/${kind}/${report.key}${suffix}`);
      assert.equal(res.status, 200);
      const body = await res.text();
      assert.ok(body.includes(report.key));
      assert.ok(!body.includes(source.title));
      assert.ok(!requests.slice(start).includes("/api/site/pool"));
      if (!suffix) {
        assert.match(body, /本期没有可读的精选条目/);
        assert.match(body, /href="\/all"[^>]*>查看全部动态/);
        assert.match(body, /其他日期的来源报道/);
        assert.doesNotMatch(body, /最近来源动态/);
      }
    }
  }
});
