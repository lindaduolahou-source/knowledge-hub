#!/usr/bin/env node
/**
 * Apply a browser-exported site JSON into the repo seed file.
 *
 * Usage:
 *   npm run publish:content -- ./knowledge-hub-published-site.json
 *   node scripts/apply-published-content.mjs ./path/to/export.json
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "content/published-site.json");

const sourceArg = process.argv[2];
if (!sourceArg) {
  console.error(
    "Missing export file.\nUsage: npm run publish:content -- ./knowledge-hub-published-site.json",
  );
  process.exit(1);
}

const source = resolve(process.cwd(), sourceArg);
if (!existsSync(source)) {
  console.error(`File not found: ${source}`);
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(readFileSync(source, "utf8"));
} catch (error) {
  console.error("Invalid JSON:", error instanceof Error ? error.message : error);
  process.exit(1);
}

if (!parsed || typeof parsed !== "object" || parsed.version !== 1) {
  console.error("Export must be a version 1 published-site JSON object.");
  process.exit(1);
}

if (!parsed.moduleContent || !parsed.tocNotes) {
  console.error("Export is missing moduleContent or tocNotes.");
  process.exit(1);
}

mkdirSync(dirname(target), { recursive: true });

// Backup previous seed when present
if (existsSync(target)) {
  const backup = resolve(
    root,
    `content/published-site.backup.${Date.now()}.json`,
  );
  copyFileSync(target, backup);
  console.log(`Backed up previous seed → ${backup}`);
}

const normalized = {
  version: 1,
  exportedAt: parsed.exportedAt ?? new Date().toISOString(),
  moduleContent: {
    zh: parsed.moduleContent.zh ?? {},
    en: parsed.moduleContent.en ?? {},
  },
  tocNotes: {
    zh: parsed.tocNotes.zh ?? {},
    en: parsed.tocNotes.en ?? {},
  },
  moduleLayout: parsed.moduleLayout ?? null,
  moduleSections: parsed.moduleSections ?? null,
};

writeFileSync(target, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
console.log(`Wrote published site seed → ${target}`);
console.log("Next: commit, deploy, then share your public URL.");
