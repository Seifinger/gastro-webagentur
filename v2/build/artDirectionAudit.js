// Art-Direction-Audit (Phase A): misst, wie ähnlich die v2-Seiten einander
// strukturell sind. Liest nur, schreibt nichts.
//
//   node v2/build/artDirectionAudit.js
//
// Ausgabe: Struktur-Cluster der Designsysteme, Bilder auf ≥ 3 Seiten,
// Überschriften auf ≥ 10 Seiten, Verteilung der Hero-Varianten.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const V2 = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export function strukturCluster(dsDir = path.join(V2, "designsysteme")) {
  const cluster = new Map();
  for (const f of readdirSync(dsDir).filter((f) => f.endsWith(".json") && f !== "dashboard.json")) {
    const d = JSON.parse(readFileSync(path.join(dsDir, f), "utf-8"));
    const L = d.layout;
    const schluessel = JSON.stringify([L.sektionsReihenfolge, L.highlights, L.karte, L.stimmen, L.betonterMoment, L.primaerAktion, [...L.heroVarianten].sort()]);
    if (!cluster.has(schluessel)) cluster.set(schluessel, []);
    cluster.get(schluessel).push(d.id);
  }
  return [...cluster.entries()].map(([bauplan, seiten]) => ({ bauplan: JSON.parse(bauplan), seiten }));
}

export function wiederholungen(sitesDir = path.join(V2, "output", "sites")) {
  const bilder = new Map();
  const ueberschriften = new Map();
  const hero = {};
  for (const s of readdirSync(sitesDir)) {
    const datei = path.join(sitesDir, s, "index.html");
    if (!existsSync(datei)) continue;
    const html = readFileSync(datei, "utf-8");
    const add = (map, k) => map.set(k, (map.get(k) ?? new Set()).add(s));
    for (const m of html.matchAll(/<img[^>]*src="([^"]+)"/g)) add(bilder, m[1].replace(/\?.*/, ""));
    for (const m of html.matchAll(/<h2[^>]*>([^<]+)</g)) add(ueberschriften, m[1].trim());
    const v = /<meta name="v2-hero" content="([^"]+)"/.exec(html)?.[1];
    if (v) hero[v] = (hero[v] ?? 0) + 1;
  }
  const liste = (map, min) => [...map.entries()].filter(([, v]) => v.size >= min).map(([k, v]) => ({ wert: k, seiten: v.size })).sort((a, b) => b.seiten - a.seiten);
  return { bilder: liste(bilder, 3), ueberschriften: liste(ueberschriften, 10), hero };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cl = strukturCluster();
  console.log(`${cl.length} strukturell verschiedene Baupläne für ${cl.reduce((n, c) => n + c.seiten.length, 0)} Designsysteme:`);
  for (const c of cl) console.log(`  ${c.seiten.length}× ${c.bauplan[0].join(" → ")} | ${c.bauplan.slice(1, 6).join(" / ")}`);
  const w = wiederholungen();
  console.log("\nBilder auf ≥ 3 Seiten:");
  for (const b of w.bilder) console.log(`  ${b.seiten}× ${b.wert}`);
  console.log("\nÜberschriften auf ≥ 10 Seiten:");
  for (const u of w.ueberschriften) console.log(`  ${u.seiten}× „${u.wert}“`);
  console.log("\nHero-Varianten:", w.hero);
}
