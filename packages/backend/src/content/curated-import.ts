// Human-reviewed source summaries enter through the material and publication pipelines. This path
// records no model result, score, event, heat or paid job; an existing editorial result always wins.
import { z } from "zod";
import { CATEGORY_KEYS } from "@aihot/contracts/taxonomy";
import { ENTITIES } from "@aihot/industry/taxonomy";
import { overrideFields } from "../admin/content.ts";
import { Conflict } from "../admin/sources.ts";
import { sql } from "../db.ts";
import { normalizeTags } from "../editorial/vocabulary.ts";
import { sha256, stableJson } from "../lib/ids.ts";
import { normalizeUrl } from "../lib/url.ts";
import { itemUrl } from "../publication/links.ts";
import { FUTURE_TOLERANCE_MS, identityKeyFor, upsertMaterial } from "./materials.ts";

const text = (max: number) => z.string().trim().min(1).max(max);
export const CuratedMaterialSchema = z.object({
  sourceId: text(120),
  url: z.url().refine((value) => normalizeUrl(value) !== null, "a public HTTP(S) source URL is required"),
  title: text(1000).optional(),
  originalTitle: text(1000).nullable().optional(),
  publishedAt: z.union([z.iso.date(), z.iso.datetime({ offset: true })]),
  excerpt: text(12000).optional(),
  bodyText: text(100000).optional(),
  titleZh: text(300),
  summaryZh: text(2000),
  category: z.enum(CATEGORY_KEYS),
  tags: z.array(text(60)).min(1).max(20),
  subjects: z.array(text(80).refine((id) => Object.hasOwn(ENTITIES, id), "unknown subject entity")).max(6).default([]),
  evidence: z.unknown().optional(),
  curationMethod: text(120).optional(),
  datePrecision: z.enum(["day", "timestamp"]).optional(),
  manualNote: text(2000).optional(),
  modelGenerated: z.literal(false).default(false),
  selectionScore: z.null().default(null),
}).refine((item) => !!(item.originalTitle || item.title), "title or originalTitle is required")
  .refine((item) => new Set([...normalizeTags(item.tags, { max: 20 }), ...item.subjects.map((id) => `entity:${id}`)]).size <= 20,
    "curated tags and subject markers exceed the editorial field limit");

export type CuratedMaterial = z.input<typeof CuratedMaterialSchema>;
export type CuratedImportResult = { status: "imported" | "skipped"; articleId: string; publicUrl: string; reason?: string };
const IMPORT_VERSION = "manual-curated-v1";
class ExistingMaterialRace extends Error {
  readonly articleId: string;
  constructor(articleId: string) {
    super("existing material won the identity race");
    this.articleId = articleId;
  }
}

export function parseCuratedMaterials(value: unknown): CuratedMaterial[] {
  const rows = Array.isArray(value) ? value : z.object({ items: z.array(z.unknown()) }).parse(value).items;
  return z.array(CuratedMaterialSchema).parse(rows);
}

/** Require explicit closed valves, rather than relying on a deployment's defaults. */
export function assertCuratedImportSafety(env: NodeJS.ProcessEnv = process.env): void {
  const valves = new Set([
    "COLLECT_ENABLED", "MODEL_CALLS_ENABLED", "FEISHU_CONTENT_PUSH_ENABLED", "FEISHU_INTERNAL_ENABLED", "INDEXNOW_SUBMIT_ENABLED",
    ...Object.keys(env).filter((key) => /^FEISHU_.*_ENABLED$/.test(key)),
  ]);
  for (const valve of valves) if (env[valve] !== "false") throw new Error(`${valve} must be false for a curated import`);
}

/** Existing materials are never revised by an import. An interrupted reservation can resume only
 * when its fingerprint still matches and nobody has published, analysed or manually edited it. */
export async function importCuratedMaterial(value: CuratedMaterial, options: { actor?: string; now?: Date } = {}): Promise<CuratedImportResult> {
  const item = CuratedMaterialSchema.parse(value);
  const now = options.now ?? new Date();
  const publishedAt = new Date(item.publishedAt);
  if (publishedAt.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) throw new Error("curated publication date is in the future");
  const title = item.originalTitle || item.title!;
  const tags = [...new Set([...normalizeTags(item.tags, { max: 20 }), ...item.subjects.map((id) => `entity:${id}`)])];
  if (tags.length > 20) throw new Error("curated tags and subject markers exceed the editorial field limit");
  const identityKey = identityKeyFor({ sourceId: item.sourceId, url: item.url, title, via: "import" });
  const fingerprint = sha256(stableJson({ ...item, title, tags }));
  const result = (status: CuratedImportResult["status"], articleId: string, reason?: string): CuratedImportResult =>
    ({ status, articleId, publicUrl: itemUrl(articleId), ...(reason ? { reason } : {}) });

  const prepared = await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${'curated:' + identityKey}))`;
    const [source] = await tx<{ participation_mode: string; site_fulltext: boolean; syndicate_fulltext: boolean }[]>`
      SELECT participation_mode, site_fulltext, syndicate_fulltext FROM sources WHERE id = ${item.sourceId} FOR SHARE`;
    if (!source || source.participation_mode !== "editorial") throw new Error("curated source must exist and participate in editorial content");
    if (source.site_fulltext || source.syndicate_fulltext) throw new Error("curated source must allow summaries only");
    const [existing] = await tx<{ id: string; has_override: boolean; has_publication: boolean; has_fact: boolean }[]>`
      SELECT a.id, EXISTS (SELECT 1 FROM editorial_overrides WHERE article_id = a.id) AS has_override,
        EXISTS (SELECT 1 FROM publications WHERE article_id = a.id) AS has_publication,
        EXISTS (SELECT 1 FROM fact_articles WHERE article_id = a.id) AS has_fact
      FROM articles a WHERE a.identity_key = ${identityKey} FOR UPDATE`;
    if (existing) {
      if (existing.has_override || existing.has_publication || existing.has_fact) return { articleId: existing.id, skip: "existing-editorial" };
      const analyses = await tx<{ origin: string; prompt_version: string | null; output: { fingerprint?: string } | null }[]>`
        SELECT origin, prompt_version, output FROM analyses WHERE article_id = ${existing.id} ORDER BY id DESC`;
      const ownReservation = analyses.length === 1 && analyses[0].origin === "rule" && analyses[0].prompt_version === IMPORT_VERSION
        && analyses[0].output?.fingerprint === fingerprint;
      if (!ownReservation) return { articleId: existing.id, skip: analyses.length ? "existing-analysis" : "existing-material" };
      return { articleId: existing.id, skip: null };
    }
    const material = await upsertMaterial({
      sourceId: item.sourceId, url: item.url, title, publishedAt, discoveredAt: now, excerpt: item.excerpt,
      bodyText: item.bodyText, bodyStatus: item.bodyText ? "ok" : "none", via: "import", backfill: "curated-import",
      raw: { curationMethod: "manual", evidence: item.evidence ?? null },
    }, tx);
    // Roll back any upsert changes if a collector won the identity race.
    if (!material.created) throw new ExistingMaterialRace(material.articleId);
    const [article] = await tx<{ revision: number }[]>`SELECT revision FROM articles WHERE id = ${material.articleId}`;
    await tx`
      INSERT INTO analyses (article_id, input_revision, origin, model, prompt_version, receipt_ids, relevance,
        category, tags, subjects, title_zh, summary_zh, reason_zh, score, selected, output)
      VALUES (${material.articleId}, ${article!.revision}, 'rule', NULL, ${IMPORT_VERSION}, '{}', 'pass',
        ${item.category}, ${normalizeTags(item.tags, { max: 20 })}, ${item.subjects}, ${item.titleZh}, ${item.summaryZh}, NULL, NULL, false,
        ${tx.json({ method: "manual-curated", fingerprint, modelGenerated: false, selectionScore: null,
          evidence: item.evidence ?? null, curationMethod: item.curationMethod ?? "manual", datePrecision: item.datePrecision ?? null,
          manualNote: item.manualNote ?? null } as never)})`;
    await tx`UPDATE articles SET processing_state = 'analyzed', processing_attempts = 0, processing_error = NULL,
      processing_retry_at = NULL, processing_queued_at = NULL WHERE id = ${material.articleId}`;
    return { articleId: material.articleId, skip: null };
  }).catch((error: unknown) => {
    if (error instanceof ExistingMaterialRace) return { articleId: error.articleId, skip: "existing-material" };
    throw error;
  });
  if (prepared.skip) return result("skipped", prepared.articleId, prepared.skip);
  try {
    // Version zero protects an editor who made a correction after the reservation committed.
    await overrideFields(prepared.articleId, {
      fields: { title: item.titleZh, summary: item.summaryZh, category: item.category, tags },
      reason: "人工核对公开来源并整理中文摘要；未进行模型筛选或评分。", version: 0,
    }, options.actor ?? "curated-import");
  } catch (error) {
    if (error instanceof Conflict) return result("skipped", prepared.articleId, "editorial-changed");
    throw error;
  }
  return result("imported", prepared.articleId);
}
