// Topic coverage reads the same public projection and release gate as the source pool.
import { tag } from "./setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { setVisibility } from "@aihot/backend/admin/content";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { publishArticle, republishSource } from "@aihot/backend/publication/publish";
import { listTopicSummaries, loadTopicPage, seedTopics } from "@aihot/backend/publication/topics";

const T = tag();
const SOURCE = `test-topic-${T}`;
const SIGNAL = `${SOURCE}-signal`;
const ISOLATED = `${SOURCE}-isolated`;
const slugs: string[] = [];
const articleIds: string[] = [];

before(async () => {
  for (const [id, mode] of [[SOURCE, "editorial"], [SIGNAL, "hot_signal"], [ISOLATED, "isolated"]]) {
    await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at)
              VALUES (${id!}, 'Topic coverage test source', 'rss', 'T1', ${mode!}, '2100-01-01')`;
  }
});
after(async () => {
  if (articleIds.length) {
    await sql`DELETE FROM selected_ledger WHERE article_id IN ${sql(articleIds)}`;
    await sql`DELETE FROM articles WHERE id IN ${sql(articleIds)}`;
  }
  if (slugs.length) await sql`DELETE FROM topics WHERE slug IN ${sql(slugs)}`;
  await sql`DELETE FROM sources WHERE id IN ${sql([SOURCE, SIGNAL, ISOLATED])}`;
  await stopBoss();
  await closeDb();
});

async function topic(suffix: string, entityId: string | null = null): Promise<string> {
  const slug = `topic-${T}-${suffix}`;
  slugs.push(slug);
  await sql`INSERT INTO topics (slug, name, grp, entity_id, tags, definition, related, position)
            VALUES (${slug}, 'Topic test', ${entityId ? "company" : "field"}, ${entityId}, ${[slug]}, 'Test scope', '{}', 9999)`;
  return slug;
}

async function article(topicTag: string, opts: {
  source?: string; selected?: boolean; publishedAt?: Date; releaseAt?: Date;
  relevance?: string; summary?: string | null; subjects?: string[];
} = {}): Promise<string> {
  const result = await upsertMaterial({
    sourceId: opts.source ?? SOURCE, url: `https://example.com/topic-${T}-${articleIds.length}`, title: "Topic test original",
    publishedAt: opts.publishedAt ?? new Date(Date.now() - 86400_000), bodyText: "Test body", bodyStatus: "ok", via: "fetch",
  });
  articleIds.push(result.articleId);
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, tags, subjects, title_zh, summary_zh, score, selected)
            VALUES (${result.articleId}, 1, 'rule', ${opts.relevance ?? "pass"}, 'guidance', ${[topicTag]}, ${opts.subjects ?? []},
                    '主题测试报道', ${opts.summary === undefined ? "测试来源摘要" : opts.summary}, ${opts.selected ? 90 : 30}, ${opts.selected ?? false})`;
  await publishArticle(result.articleId, { releasedAt: opts.releaseAt ?? new Date(Date.now() - 1000) });
  return result.articleId;
}

async function summary(slug: string) {
  // Re-seeding clears the documented one-minute topic cache without an external service.
  await seedTopics();
  const found = (await listTopicSummaries()).find((t) => t.slug === slug);
  assert.ok(found);
  return found;
}

test("source coverage excludes private, irrelevant, unsummarised and unreleased items without making a topic indexable", async () => {
  const slug = await topic("public");
  const sourceDate = new Date(Date.now() - 3600_000);
  await article(slug, { publishedAt: sourceDate });
  for (let i = 0; i < 49; i += 1) await article(slug, { publishedAt: new Date(Date.now() - 60 * 86400_000) });
  const selected = await article(slug, { selected: true, publishedAt: new Date(Date.now() - 7200_000) });
  await article(slug, { source: SIGNAL });
  await article(slug, { source: ISOLATED });
  await article(slug, { relevance: "block" });
  await article(slug, { summary: null });
  await article(slug, { selected: true, releaseAt: new Date(Date.now() + 86400_000) });
  const withdrawn = await article(slug);
  await setVisibility(withdrawn, { visibility: "withdrawn", reason: "test", version: 0 }, "test");
  const restricted = await article(slug);
  await setVisibility(restricted, { visibility: "summary-only", reason: "test", version: 0 }, "test");
  await article(`${slug}-other`);

  const counts = await summary(slug);
  assert.equal(counts.allTotal, 51);
  assert.equal(counts.allLatestAt, sourceDate.toISOString(), "coverage uses original publication time");
  assert.equal(counts.total, 1);
  assert.equal(counts.recent, 1);
  assert.equal(counts.indexable, false, "fifty source reports do not become fifty selections");
  const page = await loadTopicPage(slug, 1);
  assert.ok(page);
  assert.deepEqual(page.items.map((item) => item.id), [selected]);
  assert.equal(page.pageCount, 1);
  assert.equal(await loadTopicPage(slug, 2), null);
});

test("withdrawal and source isolation leave the source-coverage count after its cache refresh", async () => {
  const slug = await topic("withdrawal");
  const withdrawn = await article(slug);
  const isolated = await article(slug);
  assert.equal((await summary(slug)).allTotal, 2);
  await setVisibility(withdrawn, { visibility: "withdrawn", reason: "test", version: 0 }, "test");
  assert.equal((await summary(slug)).allTotal, 1);
  await sql`UPDATE sources SET participation_mode = 'isolated' WHERE id = ${SOURCE}`;
  await republishSource(SOURCE);
  const counts = await summary(slug);
  assert.equal(counts.allTotal, 0);
  assert.equal(counts.allLatestAt, null);
  const [projection] = await sql<{ visibility: string }[]>`SELECT visibility FROM publications WHERE article_id = ${isolated}`;
  assert.equal(projection!.visibility, "withdrawn");
  await sql`UPDATE sources SET participation_mode = 'editorial' WHERE id = ${SOURCE}`;
});

test("company source coverage requires the entity subject rather than a matching mention tag", async () => {
  const entity = `topic-company-${T}`;
  const slug = await topic("company", entity);
  await article(slug, { subjects: [entity] });
  await article(slug);
  const counts = await summary(slug);
  assert.equal(counts.allTotal, 1);
  assert.equal(counts.total, 0);
  assert.equal(counts.indexable, false);
});
