// Volltextsuche über den Refero-Styles-Katalog (https://styles.refero.design).
//
// Refero hat keinen verbundenen MCP-Server in dieser Umgebung, aber eine
// öffentliche JSON-API (/api/styles?limit=…&page=…), die je Style Farben,
// Schriften und einen Leitsatz ("northStar") liefert. Dieses Skript lädt den
// Katalog seitenweise und durchsucht Name, URL und Leitsatz.
//
//   node v2/build/referoSuche.js brasserie candle
//   node v2/build/referoSuche.js --schema dark coffee

import { fileURLToPath } from "node:url";

const API = "https://styles.refero.design/api/styles";

export async function ladeReferoKatalog({ abruf = fetch, maxSeiten = 60 } = {}) {
  const alle = [];
  for (let seite = 1; seite <= maxSeiten; seite += 1) {
    const antwort = await abruf(`${API}?limit=50&page=${seite}`);
    if (!antwort.ok) break;
    const { styles = [], nextPage } = await antwort.json();
    alle.push(...styles);
    if (!nextPage || styles.length === 0) break;
  }
  return alle;
}

/**
 * Alle Begriffe müssen vorkommen (UND-Suche), Groß-/Kleinschreibung egal.
 * Sortiert nach Anzahl der Treffer im Leitsatz – der beschreibt die Stimmung.
 */
export function sucheStyles(katalog, begriffe, { schema } = {}) {
  const woerter = begriffe.map((b) => b.toLowerCase()).filter(Boolean);
  return katalog
    .filter((s) => !schema || s.colorScheme === schema || s.colorScheme === "both")
    .map((s) => {
      const text = `${s.siteName} ${s.url} ${s.northStar}`.toLowerCase();
      const passt = woerter.every((w) => text.includes(w));
      const gewicht = woerter.reduce((n, w) => n + (s.northStar.toLowerCase().includes(w) ? 2 : 0), 0);
      return { s, passt, gewicht };
    })
    .filter((t) => t.passt)
    .sort((a, b) => b.gewicht - a.gewicht)
    .map(({ s }) => s);
}

async function cli(argv) {
  const schemaIndex = argv.indexOf("--schema");
  const schema = schemaIndex !== -1 ? argv[schemaIndex + 1] : undefined;
  const begriffe = argv.filter((a, i) => a !== "--schema" && i !== schemaIndex + 1);
  const katalog = await ladeReferoKatalog();
  const treffer = sucheStyles(katalog, begriffe, { schema });
  console.log(`${treffer.length} von ${katalog.length} Styles passen.\n`);
  for (const s of treffer.slice(0, 25)) {
    console.log(`${s.siteName} – ${s.url}`);
    console.log(`  https://styles.refero.design/style/${s.id}`);
    console.log(`  ${s.colorScheme} · ${s.colors.map((c) => c.hex).join(" ")} · ${s.fonts.slice(0, 3).join(", ")}`);
    console.log(`  „${s.northStar}“\n`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli(process.argv.slice(2));
}
