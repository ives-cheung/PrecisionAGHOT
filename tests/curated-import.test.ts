import { tag } from "./setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { overrideFields } from "@aihot/backend/admin/content";
import { assertCuratedImportSafety, importCuratedMaterial, parseCuratedMaterials, type CuratedMaterial } from "@aihot/backend/content/curated-import";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { loadItemDetail } from "@aihot/backend/publication/detail";
import { loadPool } from "@aihot/backend/publication/pool";
import { TOPIC_TAGS } from "@aihot/industry/taxonomy";

const T = tag();
const SOURCE = `test-curated-${T}`;
const FULL = `test-curated-full-${T}`;
const now = new Date();
const publishedAt = new Date(now.getTime() - 7 * 86400_000).toISOString();
const material = (suffix: string): CuratedMaterial => ({
  sourceId: SOURCE, url: `https://example.com/curated-${T}-${suffix}`, title: `Synthetic source title ${T}-${suffix}`,
  publishedAt, excerpt: "Synthetic source excerpt, used only by the test.", bodyText: "ORIGINAL-PRIVATE-BODY",
  titleZh: `农场软件测试${T}-${suffix}`, summaryZh: `测试夹具 ${T}-${suffix}：农场软件新增作业记录导出功能，不是真实新闻。`,
  category: "software", tags: ["产品更新", "农场软件", "数据互通"], subjects: ["agrivi"], evidence: { fixture: true },
});

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, first_party, site_fulltext, syndicate_fulltext, next_fetch_at)
    VALUES (${SOURCE}, ${`Test curated ${T}`}, 'rss', 'T1', 'editorial', true, false, false, '2100-01-01'),
      (${FULL}, 'Full-text source fixture', 'rss', 'T1', 'editorial', true, true, false, '2100-01-01')`;
});
after(() => closeDb());

test("curated source summaries use the public pool, with no score, selected ledger, receipts or full text", async () => {
  const input = material("public");
  const poolQuery = { channel: "all" as const, category: "software" as const, tag: null, q: `${T}-public`, now };
  const todayBefore = (await loadPool(poolQuery)).todayCount;
  const imported = await importCuratedMaterial(input, { now });
  assert.equal(imported.status, "imported");
  const pool = await loadPool(poolQuery);
  const item = pool.items.find((row) => row.id === imported.articleId)!;
  assert.ok(item);
  assert.equal(item.title, input.titleZh);
  assert.equal(item.score, null);
  assert.equal(item.selected, false);
  assert.equal(item.publishedAt, publishedAt);
  assert.equal(item.timelineAt, publishedAt);
  assert.equal(pool.todayCount, todayBefore);
  const detail = await loadItemDetail(imported.articleId, now);
  assert.equal(detail.kind, "found");
  if (detail.kind !== "found") return;
  assert.equal(detail.detail.links.original, input.url);
  assert.equal(detail.detail.body, null);
  assert.equal(detail.detail.indexable, false);
  assert.ok(detail.row.tags.includes("entity:agrivi"));
  const [row] = await sql`SELECT a.processing_state, a.backfill, p.selected, p.score, p.body_mode,
    an.origin, an.model, an.receipt_ids FROM articles a JOIN publications p ON p.article_id = a.id
    JOIN analyses an ON an.id = p.analysis_id WHERE a.id = ${imported.articleId}`;
  assert.deepEqual([row!.processing_state, row!.backfill, row!.selected, row!.score, row!.body_mode, row!.origin, row!.model],
    ["analyzed", true, false, null, "summary", "rule", null]);
  assert.deepEqual(row!.receipt_ids, []);
  assert.equal((await sql`SELECT 1 FROM selected_ledger WHERE article_id = ${imported.articleId}`).length, 0);
  assert.equal((await sql`SELECT 1 FROM receipts WHERE subject LIKE ${`%${imported.articleId}%`}`).length, 0);
  assert.equal((await sql`SELECT 1 FROM fact_articles WHERE article_id = ${imported.articleId}`).length, 0);
  const [queue] = await sql`SELECT to_regclass('pgboss.job') AS name`;
  if (queue!.name) assert.equal((await sql`SELECT 1 FROM pgboss.job WHERE data->>'articleId' = ${imported.articleId}`).length, 0);
});

test("repeated imports keep the material, analysis, editorial and publication revisions unchanged", async () => {
  const input = material("repeat");
  const first = await importCuratedMaterial(input, { now });
  const again = await importCuratedMaterial({ ...input, title: "changed source rendering", summaryZh: "新的摘要不能覆盖已有人工稿。" }, { now });
  assert.equal(again.status, "skipped");
  assert.equal(again.articleId, first.articleId);
  const [row] = await sql`SELECT a.revision, p.revision AS public_revision, p.summary, o.version,
    (SELECT count(*)::int FROM analyses WHERE article_id = a.id) AS analyses
    FROM articles a JOIN publications p ON p.article_id = a.id JOIN editorial_overrides o ON o.article_id = a.id
    WHERE a.id = ${first.articleId}`;
  assert.deepEqual([row!.revision, row!.public_revision, row!.version, row!.analyses, row!.summary], [1, 1, 1, 1, input.summaryZh]);
});

test("later editorial corrections and model analyses are preserved", async () => {
  const input = material("corrected");
  const first = await importCuratedMaterial(input, { now });
  await overrideFields(first.articleId, { fields: { title: "管理员后来修订的标题" }, reason: "test correction", version: 1 }, "test-editor");
  assert.equal((await importCuratedMaterial(input, { now })).status, "skipped");
  const detail = await loadItemDetail(first.articleId, now);
  assert.equal(detail.kind === "found" && detail.detail.title, "管理员后来修订的标题");
  const modelInput = material("model");
  const stored = await upsertMaterial({ sourceId: SOURCE, url: modelInput.url, title: modelInput.title!, via: "fetch" });
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, title_zh, summary_zh, score, selected)
    VALUES (${stored.articleId}, 1, 'model', 'pass', 'Existing model fixture', 'Existing test result', 40, false)`;
  assert.equal((await importCuratedMaterial(modelInput, { now })).reason, "existing-analysis");
  assert.equal((await sql`SELECT revision FROM articles WHERE id = ${stored.articleId}`)[0]!.revision, 1);
  assert.equal((await sql`SELECT 1 FROM editorial_overrides WHERE article_id = ${stored.articleId}`).length, 0);
});

test("curated input validates dates, safe source licences and manual provenance", async () => {
  assert.throws(() => parseCuratedMaterials([{ ...material("date"), publishedAt: "2026-02-30" }]));
  assert.throws(() => parseCuratedMaterials([{ ...material("score"), selectionScore: 90 }]));
  assert.throws(() => parseCuratedMaterials([{ ...material("model-generated"), modelGenerated: true }]));
  const parsed = parseCuratedMaterials({ items: [{ ...material("metadata"), sourceName: "ignored display name", extraNote: "metadata" }] });
  assert.equal(parsed.length, 1);
  assert.ok(!Object.hasOwn(parsed[0], "sourceName"));
  await assert.rejects(importCuratedMaterial({ ...material("full"), sourceId: FULL }, { now }), /summaries only/);
  await assert.rejects(importCuratedMaterial({ ...material("future"), publishedAt: new Date(now.getTime() + 2 * 3600_000).toISOString() }, { now }), /future/);
  const oversized = { ...material("tags"), tags: ["产品更新", ...TOPIC_TAGS.slice(0, 19)] };
  await assert.rejects(importCuratedMaterial(oversized, { now }), /editorial field limit/);
  assert.equal((await sql`SELECT 1 FROM articles WHERE url = ${oversized.url}`).length, 0);
  const valves = { COLLECT_ENABLED: "false", MODEL_CALLS_ENABLED: "false", FEISHU_CONTENT_PUSH_ENABLED: "false", FEISHU_INTERNAL_ENABLED: "false", INDEXNOW_SUBMIT_ENABLED: "false" };
  assert.doesNotThrow(() => assertCuratedImportSafety(valves));
  assert.throws(() => assertCuratedImportSafety({ ...valves, MODEL_CALLS_ENABLED: "true" }), /MODEL_CALLS_ENABLED/);
});
