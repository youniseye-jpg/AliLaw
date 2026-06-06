import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const dir = new URL("../lib/i18n/", import.meta.url).pathname;
const files = readdirSync(dir).filter(f => f.endsWith(".ts") && !["index.ts","languages.ts"].includes(f));
const all = new Map();
for (const f of files) {
  const src = readFileSync(join(dir, f), "utf8");
  const keys = [...src.matchAll(/^  "((?:\\.|[^"])*)":/gm)].map(m => JSON.parse('"' + m[1] + '"'));
  all.set(f.replace(".ts", ""), new Set(keys));
}
const base = all.get("en");
let failed = false;
for (const [locale, keys] of all) {
  const missing = [...base].filter(k => !keys.has(k));
  if (missing.length) { failed = true; console.log(locale, "missing", missing.length, missing.slice(0, 20)); }
}
if (!failed) console.log("i18n keys are aligned.");
