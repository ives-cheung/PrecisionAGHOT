// Archive pages stay bounded, within one origin and atomic before collection stores material.
import { tag } from "./setup.ts";
import assert from "node:assert/strict";
import http from "node:http";
import { after, test } from "node:test";
import { config } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { collectSource } from "@aihot/backend/sources/collect";
import { unsupportedConfig } from "@aihot/backend/sources/config-keys";
import { fetchWebList } from "@aihot/backend/sources/web-list";
import type { SourceRow } from "@aihot/backend/sources/types";

const T = tag();
const reads = new Map<string, number>();
const publishedAt = new Date(Date.now() - 3600_000).toISOString();
const card = (url: string, title: string) => `<article><a href="${url}">${title}</a><time datetime="${publishedAt}"></time></article>`;
const next = (url: string) => `<a rel="next" href="${url}">Next</a>`;
const server = http.createServer((req, res) => {
  const path = req.url ?? "/";
  reads.set(path, (reads.get(path) ?? 0) + 1);
  res.setHeader("content-type", "text/html");
  if (path === "/archive/one") res.end(card("posts/a", "First agriculture update") + card("posts/shared", "Shared agriculture update") + next("two"));
  else if (path === "/archive/two") res.end(card("posts/shared?utm_source=archive", "Duplicate agriculture update") + card("posts/b", "Second agriculture update") + next("three"));
  else if (path === "/archive/three") res.end(card("posts/c", "Third agriculture update"));
  else if (path === "/cycle/one") res.end(card("/cycle/post/a", "Cycle article A") + next("two"));
  else if (path === "/cycle/two") res.end(card("/cycle/post/b", "Cycle article B") + next("one#again"));
  else if (path === "/offsite") res.end(card("/offsite/post", "Offsite pagination test") + next("https://example.org/next"));
  else if (path === "/failure/one") res.end(card(`/failure/post-${T}`, "Failed later page test") + next("two"));
  else if (path === "/failure/two") { res.writeHead(503); res.end("Unavailable"); }
  else if (path.startsWith("/age/")) res.end(card(`${path}/recent`, "Recent agriculture update")
    + `<article><a href="${path}/old">Old agriculture update</a><time datetime="2020-01-01T00:00:00Z"></time></article>`
    + `<article><a href="${path}/unknown">Undated agriculture update</a></article>`);
  else if (path.startsWith("/detail-list/")) res.end(`<article><a href="${path.replace("detail-list", "detail-post")}">Dated only on the detail page</a></article>`
    + `<article><a href="/missing-${T}">Unverifiable date</a></article>`);
  else if (path.startsWith("/detail-post/")) res.end(`<time class="byline" datetime="${publishedAt}"></time>`);
  else if (path.startsWith("/bulk/")) res.end(Array.from({ length: 120 }, (_, i) => card(`${path}/post-${i}`, `Agriculture update ${i}`)).join(""));
  else { res.writeHead(404); res.end("Missing"); }
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
config.allowPrivateNetworkFetch = true;
const listing = (url: string, extra: Record<string, unknown> = {}): SourceRow => ({
  id: `test-pagination-${T}`, name: "Test pagination", kind: "web_list", tier: "T1", participation_mode: "editorial", first_party: true,
  interval_minutes: 60, enabled: true, cursor: null, fail_count: 0,
  config: { url: `${base}${url}`, itemSelector: "article", linkSelector: "a", titleSelector: "a", publishedAtSelector: "time", ...extra },
});
const pagination = (maxPages = 3) => ({ nextSelector: 'a[rel="next"]', maxPages });
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await stopBoss();
  await closeDb();
});

test("pagination follows relative links, preserves dates and deduplicates article identities", async () => {
  const out = await fetchWebList(listing("/archive/one", { pagination: pagination() }));
  assert.deepEqual(out.map((c) => c.url), ["a", "shared", "b", "c"].map((slug) => `${base}/archive/posts/${slug}`));
  assert.ok(out.every((c) => c.publishedAt?.toISOString() === publishedAt));
  const customBase = await fetchWebList(listing("/archive/one", { pagination: pagination(2), baseUrl: `${base}/canonical/` }));
  assert.deepEqual(customBase.map((c) => c.url), ["a", "shared", "b"].map((slug) => `${base}/canonical/posts/${slug}`));
  assert.equal(reads.get("/canonical/two"), undefined, "Next uses the actual listing URL, independent of the article base");
});

test("unconfigured sources remain single page and maxPages limits actual requests", async () => {
  const twoBefore = reads.get("/archive/two") ?? 0;
  assert.equal((await fetchWebList(listing("/archive/one"))).length, 2);
  assert.equal((await fetchWebList(listing("/archive/one", { pagination: pagination(1) }))).length, 2);
  assert.equal(reads.get("/archive/two") ?? 0, twoBefore);
});

test("pagination stops a cycle and refuses a next link outside the origin", async () => {
  const out = await fetchWebList(listing("/cycle/one", { pagination: pagination(10) }));
  assert.equal(out.length, 2);
  assert.equal(reads.get("/cycle/one"), 1);
  assert.equal(reads.get("/cycle/two"), 1);
  await assert.rejects(fetchWebList(listing("/offsite", { pagination: pagination() })), /changed origin/);
});

test("pagination and collection limits reject invalid bounds instead of becoming unbounded", async () => {
  for (const maxPages of [0, 11, 1.5, "3", null]) {
    const source = listing("/archive/one", { pagination: { nextSelector: "a", maxPages } });
    assert.ok(unsupportedConfig("web_list", source.config).some((key) => key.startsWith("pagination.maxPages")));
    await assert.rejects(fetchWebList(source), /pagination.maxPages/);
  }
  for (const maxItemsPerRun of [0, 501, 1.5, "100", null]) {
    assert.ok(unsupportedConfig("rss", { feedUrl: "https://example.org/feed", maxItemsPerRun }).some((key) => key.startsWith("maxItemsPerRun")));
  }
  for (const maxAgeMonths of [0, 121, 1.5, "24", null]) {
    assert.ok(unsupportedConfig("web_list", { url: "https://example.org/news", maxAgeMonths }).some((key) => key.startsWith("maxAgeMonths")));
  }
  assert.ok(unsupportedConfig("web_list", { url: "https://example.org/", requirePublishedAt: "true" }).some((key) => key.startsWith("requirePublishedAt")));
  assert.deepEqual(unsupportedConfig("web_list", { url: "https://example.org/", publishedAtFormat: "DMY", detail: { publishedAtFormat: "MDY" } }), []);
  assert.deepEqual(unsupportedConfig("web_list", { url: "https://example.org/", publishedAtFormat: "YMD", detail: { publishedAtFormat: "YMD" } }), ["publishedAtFormat=YMD", "detail.publishedAtFormat=YMD"]);
  assert.deepEqual(unsupportedConfig("web_list", listing("/archive/one", { pagination: pagination(10), maxItemsPerRun: 500 }).config), []);
  assert.ok(unsupportedConfig("web_list", { url: "https://r.jina.ai/https://example.org/", pagination: pagination() }).some((key) => key.includes("direct HTML")));
});

async function createSource(name: string, source: SourceRow, initialized = true) {
  const id = `test-pagination-${name}-${T}`;
  await sql`INSERT INTO sources (id, name, kind, config, tier, participation_mode, cursor, next_fetch_at)
    VALUES (${id}, ${name}, 'web_list', ${sql.json(source.config)}, 'T1', 'editorial',
      ${initialized ? sql.json({ initializedAt: "2026-01-01T00:00:00Z" }) : null}, '2100-01-01')`;
  return id;
}

test("a failed later page stores no partial articles and does not advance the source cursor", async () => {
  const id = await createSource("failure", listing("/failure/one", { pagination: pagination() }));
  const result = await collectSource(id, { force: true });
  assert.equal(result.status, "failed");
  assert.match(result.error ?? "", /HTTP 503/);
  const [source] = await sql<{ cursor: Record<string, unknown>; last_ok_at: Date | null }[]>`SELECT cursor, last_ok_at FROM sources WHERE id = ${id}`;
  assert.deepEqual(source!.cursor, { initializedAt: "2026-01-01T00:00:00Z" });
  assert.equal(source!.last_ok_at, null);
  assert.equal((await sql`SELECT id FROM articles WHERE source_id = ${id}`).length, 0);
});

test("ordinary runs honor the configured item cap while first imports retain their backfill cap", async () => {
  const normal = await createSource("normal", listing(`/bulk/normal-${T}`));
  const wider = await createSource("wider", listing(`/bulk/wider-${T}`, { maxItemsPerRun: 90 }));
  const initial = await createSource("initial", listing(`/bulk/initial-${T}`, { maxItemsPerRun: 90, _aihot: { initialBackfillLimit: 2 } }), false);
  assert.equal((await collectSource(normal, { force: true })).created, 60);
  assert.equal((await collectSource(wider, { force: true })).created, 90);
  assert.equal((await collectSource(initial, { force: true })).created, 2);
  const initialItems = await sql<{ backfill: boolean; backfill_reason: string; published_at: Date }[]>`
    SELECT backfill, backfill_reason, published_at FROM articles WHERE source_id = ${initial}`;
  assert.ok(initialItems.every((a) => a.backfill && a.backfill_reason === "first-import" && a.published_at.toISOString() === publishedAt));
});

test("an initialized source applies an explicit history window without dropping undated candidates", async () => {
  const source = listing(`/age/${T}`, { maxAgeMonths: 24 });
  const id = await createSource("age", source);
  const result = await collectSource(id, { force: true });
  assert.equal(result.status, "ok");
  assert.equal(result.found, 3);
  const items = await sql<{ title: string }[]>`SELECT title FROM articles WHERE source_id = ${id} ORDER BY title`;
  assert.deepEqual(items.map((a) => a.title), ["Recent agriculture update", "Undated agriculture update"]);
});

test("a required publication date is checked after detail enrichment and skips unresolved dates", async () => {
  const source = listing(`/detail-list/${T}`, { requirePublishedAt: true, detail: { maxFetches: 2, publishedAtSelector: ".byline", publishedAtAuthoritative: true } });
  const id = await createSource("required-date", source);
  const result = await collectSource(id, { force: true });
  assert.equal(result.status, "ok");
  assert.equal(result.created, 1);
  const items = await sql<{ title: string; published_at: Date }[]>`SELECT title, published_at FROM articles WHERE source_id = ${id}`;
  assert.deepEqual(items.map((a) => a.title), ["Dated only on the detail page"]);
  assert.equal(items[0]!.published_at.toISOString(), publishedAt);
});
