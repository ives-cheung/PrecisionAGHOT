// Published dates on list pages: a date without a zone is read in the source's offset, whatever zone
// the server runs in (Docker runs in UTC; run this file with TZ=UTC and TZ=Asia/Shanghai to see both).
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseLooseDate } from "@aihot/backend/sources/web-list";

const iso = (v: string, offset?: string, format?: "DMY" | "MDY") => parseLooseDate(v, offset, format)?.toISOString() ?? null;

test("a date and time without a zone is in the source's offset, not the server's", () => {
  assert.equal(iso("2026-09-26 10:00"), "2026-09-26T02:00:00.000Z");
  assert.equal(iso("2026-09-26T10:00:00"), "2026-09-26T02:00:00.000Z");
  assert.equal(iso("2026/09/26 10:00"), "2026-09-26T02:00:00.000Z");
  assert.equal(iso("2026年9月26日 10:00"), "2026-09-26T02:00:00.000Z");
  assert.equal(iso("2026-09-26 10:00", "-07:00"), "2026-09-26T17:00:00.000Z");
});

test("a bare date is midnight in the source's offset; an ISO date alone stays UTC midnight", () => {
  assert.equal(iso("2026/09/26"), "2026-09-25T16:00:00.000Z");
  assert.equal(iso("2026年9月26日"), "2026-09-25T16:00:00.000Z");
  assert.equal(iso("Sep 26, 2026"), "2026-09-25T16:00:00.000Z");
  assert.equal(iso("2026-09-26"), "2026-09-26T00:00:00.000Z");
  assert.equal(iso("September 26th, 2026", "+00:00"), "2026-09-26T00:00:00.000Z");
});

test("a date that carries its zone keeps it", () => {
  assert.equal(iso("2026-09-26T10:00:00Z"), "2026-09-26T10:00:00.000Z");
  assert.equal(iso("2026-09-26T10:00:00.000+09:00"), "2026-09-26T01:00:00.000Z");
  assert.equal(iso("Sat, 26 Sep 2026 10:00:00 GMT"), "2026-09-26T10:00:00.000Z");
  assert.equal(iso("Sat, 26 Sep 2026 10:00:00 +0200", "-07:00"), "2026-09-26T08:00:00.000Z");
});

test("no date at all is null", () => {
  assert.equal(iso(""), null);
  assert.equal(iso("yesterday"), null);
});

test("an explicit numeric date order distinguishes European and American listings", () => {
  assert.equal(iso("23.03.2026", "+00:00", "DMY"), "2026-03-23T00:00:00.000Z");
  assert.equal(iso("09.07.2026", "+00:00", "DMY"), "2026-07-09T00:00:00.000Z");
  assert.equal(iso("06.04.2026", "+02:00", "DMY"), "2026-04-05T22:00:00.000Z");
  assert.equal(iso("09.01.2026", "+00:00", "DMY"), "2026-01-09T00:00:00.000Z");
  assert.equal(iso("09.01.2026", "+00:00", "MDY"), "2026-09-01T00:00:00.000Z");
  assert.equal(iso("09.01.2026", "+00:00"), "2026-09-01T00:00:00.000Z", "unconfigured sources retain their previous parsing");
  assert.equal(iso("30.11.2025 10:30", "+00:00", "DMY"), "2025-11-30T10:30:00.000Z");
  assert.equal(iso("29.02.2024", "+00:00", "DMY"), "2024-02-29T00:00:00.000Z");
  for (const bad of ["29.02.2026", "31.04.2026", "00.03.2026", "23.13.2026", "23.03.2026 25:00"]) assert.equal(iso(bad, undefined, "DMY"), null);
  for (const bad of ["02.29.2026", "04.31.2026", "13.23.2026"]) assert.equal(iso(bad, undefined, "MDY"), null);
});
