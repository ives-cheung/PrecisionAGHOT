// Run after the web build. Topic loaders use this local HTTP stub, never the database.
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import type { FeedItemSummary } from "@aihot/contracts/site";

let web: ChildProcess;
let origin: string;
let logs = "";
let selectedItems: FeedItemSummary[] = [];
let poolItems: FeedItemSummary[] = [];
const requests: URL[] = [];
const topic = {
  slug: "auto-steering", name: "自动转向", group: "field", definition: "GNSS 导航、自动转向与农机控制。", total: 0, recent: 0,
  indexable: false, latestAt: null, allTotal: 111, allLatestAt: "2026-09-27T06:00:00Z", related: [],
};
const api = createServer((req, res) => {
  const url = new URL(req.url!, "http://api.local");
  requests.push(url);
  res.setHeader("Content-Type", "application/json");
  if (url.pathname === "/api/site/meta") return res.end(JSON.stringify({ changelogVersion: null }));
  if (url.pathname === "/api/site/topics") return res.end(JSON.stringify({ topics: [topic] }));
  if (url.pathname === "/api/site/topics/auto-steering") return res.end(JSON.stringify({
    topic: { ...topic, total: selectedItems.length }, items: selectedItems, page: Number(url.searchParams.get("page") ?? 1), pageCount: 2,
  }));
  if (url.pathname === "/api/site/pool") return res.end(JSON.stringify({
    filters: { channel: "all", category: null, tag: null, topic: url.searchParams.get("topic"), q: null, tab: "time" },
    items: poolItems, page: 1, pageCount: 3, total: 111, todayCount: 0,
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
  id: `topic-source-${index}`, title: `自动转向来源报道 ${index}（测试）`, summary: `第 ${index} 条主题摘要。`, reason: null,
  source: { name: "导航测试来源" }, publishedAt: `2026-09-${String(17 + index).padStart(2, "0")}T06:00:00Z`,
  timelineAt: "2026-09-30T09:30:00Z", category: "guidance", tags: ["自动转向"], score: null, selected: false, channel: "news", x: null,
}));

test("topic directory distinguishes source coverage from zero selections", async () => {
  const response = await fetch(`${origin}/topics`);
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /href="\/topics\/auto-steering"/);
  assert.match(body.replace(/<!--.*?-->/g, ""), /111 条动态 · 0 条精选/);
  assert.match(body, /查看自动转向相关动态与精选文章/);
});

test("an empty selected topic loads only its scoped source pool, keeps source dates and SEO, and shows at most ten reports", async () => {
  poolItems = sourceReports;
  try {
    for (const pathname of ["/topics/auto-steering", "/topics/auto-steering.data"]) {
      const start = requests.length;
      const response = await fetch(origin + pathname);
      assert.equal(response.status, 200);
      const body = await response.text();
      assert.ok(body.includes(sourceReports[10]!.title) && body.includes(sourceReports[1]!.title), pathname);
      assert.ok(!body.includes(sourceReports[0]!.title), "the eleventh report stays out of the fallback");
      const relevant = requests.slice(start).filter((url) => url.pathname.startsWith("/api/site/topics/") || url.pathname === "/api/site/pool");
      assert.deepEqual(relevant.map((url) => url.pathname), ["/api/site/topics/auto-steering", "/api/site/pool"]);
      assert.equal(relevant[1]!.searchParams.get("topic"), "auto-steering");
      if (pathname.endsWith("auto-steering")) {
        assert.match(body, /这个主题暂时还没有精选，以下为已发布的来源动态/);
        assert.match(body, /href="\/all\?topic=auto-steering"/);
        assert.ok(body.includes(`/items/${sourceReports[10]!.id}`));
        assert.ok(body.includes(sourceReports[10]!.source.name) && body.includes(sourceReports[10]!.summary!));
        assert.equal(body.match(/data-item-id="/g)?.length, 10);
        assert.match(body, /datetime="2026-09-27T06:00:00Z"/i);
        assert.doesNotMatch(body, /datetime="2026-09-30T09:30:00Z"/i);
        assert.match(body, /name="robots" content="noindex, follow"/);
        assert.match(body, /rel="canonical"[^>]*href="[^"]*\/topics\/auto-steering"/);
        assert.ok(body.indexOf(`data-item-id="${sourceReports[10]!.id}"`) < body.indexOf(`data-item-id="${sourceReports[1]!.id}"`));
      }
    }
  } finally {
    poolItems = [];
  }
});

test("selected content and subsequent topic pages never fetch the source pool", async () => {
  selectedItems = [{ ...sourceReports[10]!, id: "topic-selected", title: "精选转向进展（测试）", selected: true, score: 85 }];
  poolItems = sourceReports;
  try {
    for (const pathname of ["/topics/auto-steering", "/topics/auto-steering.data", "/topics/auto-steering/page/2"]) {
      const start = requests.length;
      const response = await fetch(origin + pathname);
      assert.equal(response.status, 200);
      const body = await response.text();
      assert.ok(body.includes(selectedItems[0]!.title), pathname);
      assert.ok(!body.includes(sourceReports[10]!.title), pathname);
      assert.equal(requests.slice(start).filter((url) => url.pathname === "/api/site/pool").length, 0);
    }
    selectedItems = [];
    const start = requests.length;
    const second = await fetch(`${origin}/topics/auto-steering/page/2`);
    assert.equal(second.status, 200);
    const body = await second.text();
    assert.ok(!body.includes(sourceReports[10]!.title), "an emptied selected page does not turn into another source-pool page");
    assert.equal(requests.slice(start).filter((url) => url.pathname === "/api/site/pool").length, 0);
    assert.match(body, /rel="canonical"[^>]*href="[^"]*\/topics\/auto-steering\/page\/2"/);
  } finally {
    selectedItems = [];
    poolItems = [];
  }
});
