// The config keys each kind of source implements. Anything else is refused: a key a collector does not
// know would otherwise fall back silently to the generic parse (menus and sentence fragments as
// articles, dates never found).
import type { SourceRow } from "./types.ts";

// Rules applied in collect.ts to every kind read through collectSource.
const COLLECTED = ["_aihot", "maxItemsPerRun", "maxAgeMonths", "requirePublishedAt", "allowUrlPrefixes", "denyUrlPrefixes", "ingestNoiseFilter", "itemUrlPrefixRewrite", "sortByPublishedAt", "detail", "fetchPublicContent"];

const KEYS: Record<SourceRow["kind"], string[]> = {
  rss: [...COLLECTED, "feedUrl", "summaryIsBody", "preserveUrlFragment", "allowCategories", "denyCategories"],
  web_list: [
    ...COLLECTED, "url", "baseUrl", "parseMode", "adapter", "cacheToleranceSeconds", "linksStartLine", "preserveUrlFragment",
    "itemSelector", "linkSelector", "titleSelector", "publishedAtSelector", "publishedAtRegex", "publishedAtUtcOffset", "publishedAtFormat", "pagination",
  ],
  json_list: [
    ...COLLECTED, "url", "mode", "method", "headers", "bodyJson", "jsonKey", "windowVar", "itemsPath", "itemsObjectValues",
    "titlePaths", "summaryPaths", "summaryIsBody", "authorPaths", "publishedAtPath", "publishedAtUnit", "externalIdPath",
    "urlTemplate", "urlTemplateFallback", "rawDropKeys", "requireBoolean", "minNumeric",
  ],
  // X accounts are mostly read in shards, which apply only these.
  x_search: ["_aihot", "ingestNoiseFilter", "itemUrlPrefixRewrite", "query", "searchType"],
  mp_account: ["wxid", "ghid", "nickname"],
  external: [],
};

// Objects with fixed keys (headers and bodyJson are request data, free-form).
const NESTED: Record<string, string[]> = {
  _aihot: ["initialBackfillLimit", "initialBackfillMonths"],
  pagination: ["nextSelector", "maxPages"],
  ingestNoiseFilter: ["dropMarkers", "dropMarkersTitleOnly", "keepIfMatches"],
  itemUrlPrefixRewrite: ["from", "to"],
  requireBoolean: ["path", "equals"],
  minNumeric: ["path", "min"],
  detail: [
    "maxFetches", "publishedAtSelector", "publishedAtRegex", "publishedAtUtcOffset", "publishedAtFormat", "publishedAtAuthoritative", "upgradeDatePrecision",
    "titleSelector", "titleRegex", "titleAuthoritative", "summarySelector",
  ],
};

const VALUES: Record<string, string[]> = {
  adapter: ["mimo_home"],
  parseMode: ["html", "markdown", "docusaurus_changelog"],
  publishedAtFormat: ["DMY", "MDY"],
};

/** The config entries a source of this kind would ignore or cannot run, e.g. ["adapter=site_cards", "detail.titleFoo"]. */
export function unsupportedConfig(kind: SourceRow["kind"], config: Record<string, unknown>): string[] {
  const allowed = new Set(KEYS[kind] ?? []);
  const out: string[] = [];
  for (const [key, value] of Object.entries(config ?? {})) {
    if (!allowed.has(key)) out.push(key);
    else if (VALUES[key] && !VALUES[key]!.includes(String(value))) out.push(`${key}=${String(value)}`);
    else if (NESTED[key] && value && typeof value === "object") {
      for (const [sub, nested] of Object.entries(value)) {
        if (!NESTED[key]!.includes(sub)) out.push(`${key}.${sub}`);
        else if (VALUES[sub] && !VALUES[sub]!.includes(String(nested))) out.push(`${key}.${sub}=${String(nested)}`);
      }
    }
  }
  if (allowed.has("maxItemsPerRun") && "maxItemsPerRun" in config && !boundedInteger(config.maxItemsPerRun, 1, 500)) out.push("maxItemsPerRun (1–500)");
  if (allowed.has("maxAgeMonths") && "maxAgeMonths" in config && !boundedInteger(config.maxAgeMonths, 1, 120)) out.push("maxAgeMonths (1–120)");
  if (allowed.has("requirePublishedAt") && "requirePublishedAt" in config && typeof config.requirePublishedAt !== "boolean") out.push("requirePublishedAt (boolean)");
  if (kind === "web_list" && "pagination" in config) {
    const p = config.pagination;
    if (!p || typeof p !== "object" || Array.isArray(p)) out.push("pagination");
    else {
      const page = p as Record<string, unknown>;
      if (typeof page.nextSelector !== "string" || !page.nextSelector.trim()) out.push("pagination.nextSelector");
      if (!boundedInteger(page.maxPages, 1, 10)) out.push("pagination.maxPages (1–10)");
    }
    if (config.adapter || (config.parseMode && config.parseMode !== "html") || String(config.url ?? "").startsWith("https://r.jina.ai/")) {
      out.push("pagination (requires a direct HTML listing)");
    }
  }
  return out;
}

const boundedInteger = (value: unknown, min: number, max: number): boolean =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

export class UnsupportedConfig extends Error {
  readonly statusCode = 400;
}

/** Refuses a config with entries its kind does not implement (admin create, edit and preview). */
export function assertSupportedConfig(kind: SourceRow["kind"], config: Record<string, unknown>): void {
  const bad = unsupportedConfig(kind, config);
  if (bad.length) throw new UnsupportedConfig(`不支持的配置项：${bad.join("、")}`);
}
