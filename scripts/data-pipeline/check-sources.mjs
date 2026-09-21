/*
 * Weekly source check: fetch every URL in the source manifest, report
 * unreachable sources and content drift against the last snapshot
 * (data/source-status.json). Detection only — a human (or an agent run)
 * researches flagged items and updates the data files through a PR that
 * the BDD data-integrity scenarios validate. Run locally with
 * `npm run check-sources`; add `--write` to refresh the snapshot.
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const require = createRequire(import.meta.url);
const { collectSources } = require("./collect-sources.js");

const SNAPSHOT = new URL("../../data/source-status.json", import.meta.url).pathname;
const WRITE = process.argv.includes("--write");
const UA = "phone-plan-optimizer source-check (+https://github.com/mannix77/phone-plan-optimizer)";

async function probe(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow", signal: controller.signal });
    clearTimeout(timer);
    const body = await res.text();
    return { status: res.status, ok: res.ok, bytes: body.length };
  } catch (err) {
    return { status: 0, ok: false, bytes: 0, error: String(err && err.cause ? err.cause : err).slice(0, 120) };
  }
}

const urls = [...new Set(collectSources().map((e) => e.url))].sort();
const previous = existsSync(SNAPSHOT) ? JSON.parse(readFileSync(SNAPSHOT, "utf8")) : null;
const results = {};
for (const url of urls) results[url] = await probe(url);

const unreachable = urls.filter((u) => !results[u].ok);
const drifted = previous
  ? urls.filter((u) => {
      const prev = previous[u];
      if (!prev || !prev.ok || !results[u].ok) return false;
      const delta = Math.abs(results[u].bytes - prev.bytes);
      return prev.bytes > 0 && delta / prev.bytes > 0.25;
    })
  : [];

console.log(`# Source check — ${new Date().toISOString().slice(0, 10)}`);
console.log(`\nChecked ${urls.length} distinct sources.`);
if (!previous) console.log("\nNo snapshot found (data/source-status.json) — drift detection starts after `npm run check-sources -- --write` lands in a PR.");
if (unreachable.length) {
  console.log(`\n## Unreachable (${unreachable.length})\n`);
  for (const u of unreachable) console.log(`- ${u} — ${results[u].error || `HTTP ${results[u].status}`}`);
}
if (drifted.length) {
  console.log(`\n## Content drift >25% (${drifted.length}) — re-verify the numbers cited from these\n`);
  for (const u of drifted) console.log(`- ${u} (${previous[u].bytes} → ${results[u].bytes} bytes)`);
}
if (!unreachable.length && !drifted.length && previous) console.log("\nAll sources reachable, no significant drift.");

if (WRITE) {
  writeFileSync(SNAPSHOT, JSON.stringify(results, null, 2) + "\n");
  console.log(`\nSnapshot written to ${SNAPSHOT}`);
}
process.exitCode = 0;
