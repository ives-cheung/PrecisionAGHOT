// Run after the web build. The production router reads only this local HTTP API stub.
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import type { FeedItemSummary, HotEntryView } from "@aihot/contracts/site";

let web: ChildProcess;
let origin: string;
let logs = "";
let entries: HotEntryView[] = [];
let poolItems: FeedItemSummary[] = [];
const requests: string[] = [];
const api = createServer((req, res) => {
  const url = new URL(req.url!, "http://api.local");
  requests.push(url.pathname);
  res.setHeader("Content-Type", "application/json");
  if (url.pathname === "/api/site/meta") return res.end(JSON.stringify({ changelogVersion: null }));
  if (url.pathname === "/api/site/hot") return res.end(JSON.stringify({ entries, windowHours: 48, computedAt: "2026-09-30T09:55:00Z", ruleVersion: "test-48h" }));
  if (url.pathname === "/api/site/pool") return res.end(JSON.stringify({
    filters: { channel: "all", category: null, tag: null, topic: null, q: null, tab: "time" },
    items: poolItems, page: 1, pageCount: 3, total: poolItems.length ? 111 : 0, todayCount: 0,
    freshness: "2026-09-30T09:55:00Z", generatedAt: "2026-09-30T09:55:00Z",
  }));
  res.statusCode = 404;
  res.end(JSON.stringify({ code: "not_found" }));
});

before(async () => {
  api.listen(0, "127.0.0.1");
  await once(api, "listening");
  web = spawn(process.execPath, [fileURLToPath(new URL("../server.ts", import.meta.url))], {
    env: { ...process.env, NODE_ENV: "production", WEB_PORT: "0", TRUST_PROXY: "false", API_BASE_URL: `http://127.0.0.1:${(api.address() as AddressInfo).port}` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`web did not start: ${logs}`)), 15_000);
    web.on("exit", () => { clearTimeout(timeout); reject(new Error(`web exited: ${logs}`)); });
    web.stderr!.on("data", (chunk) => { logs += String(chunk); });
    web.stdout!.on("data", (chunk) => {
      logs += String(chunk);
      const match = logs.match(/"msg":"web started","port":(\d+)/);
      if (match) {
        origin = `http://127.0.0.1:${match[1]}`;
        clearTimeout(timeout);
        resolve();
      }
    });
  });
});

after(async () => {
  if (web && web.exitCode === null) {
    web.kill("SIGTERM");
    await once(web, "exit");
  }
  api.closeAllConnections();
  await new Promise<void>((resolve) => api.close(() => resolve()));
});

const sourceReports: FeedItemSummary[] = Array.from({ length: 11 }, (_, index) => ({
  id: `source-report-${index}`, title: `农业技术来源报道 ${index}（测试）`, summary: `第 ${index} 条测试来源摘要。`, reason: null,
  source: { name: "农业科技测试来源" }, publishedAt: `2026-09-${String(17 + index).padStart(2, "0")}T06:00:00Z`,
  timelineAt: "2026-09-30T09:30:00Z", category: "guidance", tags: ["自动转向"], score: null, selected: false, channel: "news", x: null,
}));

test("empty hot ranking shows at most ten real source reports by source date in HTML and navigation", async () => {
  poolItems = sourceReports;
  try {
    for (const pathname of ["/hot", "/hot.data"]) {
      const start = requests.length;
      const response = await fetch(origin + pathname);
      assert.equal(response.status, 200);
      const body = await response.text();
      assert.ok(body.includes(sourceReports[10]!.title) && body.includes(sourceReports[1]!.title), pathname);
      assert.ok(!body.includes(sourceReports[0]!.title), "the eleventh report stays out of the fallback");
      assert.ok(body.includes(sourceReports[10]!.summary!) && body.includes(sourceReports[10]!.source.name));
      assert.deepEqual(requests.slice(start).filter((p) => p === "/api/site/hot" || p === "/api/site/pool"), ["/api/site/hot", "/api/site/pool"]);
      if (pathname === "/hot") {
        assert.match(body, /最近来源动态/);
        assert.match(body, /至少有 2 个独立来源/);
        assert.match(body.replace(/<!--.*?-->/g, ""), /全部动态 · 111 条/);
        assert.ok(body.includes(`/items/${sourceReports[10]!.id}`));
        assert.match(body, /href="\/all"/);
        assert.equal(body.match(/data-item-id="/g)?.length, 10);
        assert.match(body, /datetime="2026-09-27T06:00:00Z"/i);
        assert.doesNotMatch(body, /datetime="2026-09-30T09:30:00Z"/i);
        assert.ok(body.indexOf(`data-item-id="${sourceReports[10]!.id}"`) < body.indexOf(`data-item-id="${sourceReports[1]!.id}"`));
        assert.doesNotMatch(body, /讨论最多的 10 件事|热度指数<\/div>/);
      }
    }
  } finally {
    poolItems = [];
  }
});

const rankedEvent: HotEntryView = {
  rank: 1, story: { publicId: "ranked-story", title: "多来源自动转向发布（测试）" }, heat: 19.2, trend: "new", trendPct: null, badges: [],
  participantCount: 2, sourceCount: 2, signalCount: 0, reportCount: 2, sourceNames: ["测试官方来源", "测试独立媒体"],
  latestAt: "2026-09-30T08:00:00Z", firstReportAt: "2026-09-30T07:00:00Z", representative: null, participants: [],
  spark: Array(24).fill(null), summary: "两个独立来源报道同一自动转向系统发布。", latest: null, cover: null,
};

test("nonempty hot ranking keeps ranked events and makes no source-pool request", async () => {
  entries = [rankedEvent];
  poolItems = sourceReports;
  try {
    for (const pathname of ["/hot", "/hot.data"]) {
      const start = requests.length;
      const response = await fetch(origin + pathname);
      assert.equal(response.status, 200);
      const body = await response.text();
      assert.ok(body.includes(rankedEvent.story.title) && body.includes(rankedEvent.summary!), pathname);
      assert.ok(!body.includes(sourceReports[10]!.title), pathname);
      assert.deepEqual(requests.slice(start).filter((p) => p === "/api/site/hot" || p === "/api/site/pool"), ["/api/site/hot"]);
      if (pathname === "/hot") {
        assert.match(body, /href="\/story\/ranked-story"/);
        assert.doesNotMatch(body, /最近来源动态/);
        assert.match(body, /热度指数/);
      }
    }
  } finally {
    entries = [];
    poolItems = [];
  }
});

test("a genuinely empty source pool explains collection and keeps a useful all-items link", async () => {
  const response = await fetch(`${origin}/hot`);
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /暂未出现多来源热点/);
  assert.match(body, /来源动态正在收集/);
  assert.match(body, /href="\/all"/);
  assert.doesNotMatch(body, /data-item-id="/);
});
