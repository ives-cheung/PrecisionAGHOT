// Local human-reviewed material import. No collection, model calls or public selection.
// node --env-file=.env scripts/import-curated.ts --input .data/bootstrap-materials.json
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { closeDb } from "@aihot/backend/db";
import { assertCuratedImportSafety, importCuratedMaterial, parseCuratedMaterials } from "@aihot/backend/content/curated-import";

try {
  const { values } = parseArgs({ options: { input: { type: "string" }, actor: { type: "string", default: "curated-import" } } });
  if (!values.input) throw new Error("--input is required");
  assertCuratedImportSafety();
  const items = parseCuratedMaterials(JSON.parse(readFileSync(values.input, "utf8")));
  let imported = 0;
  let skipped = 0;
  for (const item of items) {
    const result = await importCuratedMaterial(item, { actor: values.actor });
    if (result.status === "imported") imported += 1;
    else skipped += 1;
    console.log(`${result.status} ${result.publicUrl}${result.reason ? ` (${result.reason})` : ""}`);
  }
  console.log(`curated: ${imported} imported, ${skipped} skipped`);
} catch (error) {
  // Never echo input material, environment values or provider credentials.
  console.error(`Curated import failed (${error instanceof Error ? error.name : "Error"}); check input, source settings and closed safety valves.`);
  process.exitCode = 1;
} finally {
  await closeDb();
}
