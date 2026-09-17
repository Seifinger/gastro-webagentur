import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { landingPagesDir } from "./config.js";
import { readAllLeads } from "./csvImport.js";
import {
  buildLandingPage,
  slugify,
  escapeHtml,
  themeForLead,
  imageSpecsForLead,
} from "./landingPageGenerator.js";
import { detectCuisine, menuForCuisine, MENUS } from "./menuCatalog.js";
import { ensureAssets, assetFileName } from "./imageLibrary.js";

function parseArgs(argv) {
  const args = { region: null, limit: null, minScore: 0, email: "", cuisine: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--region") args.region = argv[++i];
    if (argv[i] === "--limit") args.limit = Number(argv[++i]);
    if (argv[i] === "--min-score") args.minScore = Number(argv[++i]);
    if (argv[i] === "--email") args.email = argv[++i];
    if (argv[i] === "--cuisine") args.cuisine = argv[++i];
  }
  return args;
}

function selectLeads(leads, { region, limit, minScore }) {
  let selected = leads
    .filter((lead) => (region ? lead.ort === region : true))
    .filter((lead) => (lead.score ?? 0) >= minScore)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  if (limit) selected = selected.slice(0, limit);
  return selected;
}

/**
 * Vergibt pro Lead einen eindeutigen Ordnernamen. Gleichnamige Restaurants in
 * verschiedenen Orten bekommen eine laufende Nummer angehängt.
 */
function uniqueSlug(name, taken) {
  const base = slugify(name);
  let slug = base;
  let counter = 2;
  while (taken.has(slug)) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  taken.add(slug);
  return slug;
}

function buildOverviewPage(entries) {
  const cards = entries
    .map(
      ({ lead, slug, cuisine, theme }) => `
      <a class="card" href="./${escapeHtml(slug)}/index.html">
        <div class="thumb" style="--tint:${theme.palette.tint}">
          <img src="./assets/${assetFileName(theme.heroImage, "hero")}" alt="" loading="lazy">
          <span class="score" style="background:${theme.palette.accent}">${escapeHtml(String(lead.score ?? "–"))}</span>
        </div>
        <div class="body">
          <strong>${escapeHtml(lead.name)}</strong>
          <span class="meta">${escapeHtml(lead.ort ?? "")} · ${escapeHtml(cuisine)}</span>
          <span class="meta">${escapeHtml(lead.priorität ?? "")}</span>
        </div>
      </a>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Landing-Page-Entwürfe</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 44px 20px 70px; background: #f6f7f9; color: #1f2430;
         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .wrap { max-width: 1180px; margin: 0 auto; }
  h1 { font-size: 28px; margin: 0 0 8px; }
  p.lead { color: #6b7280; margin: 0 0 32px; }
  .grid { display: grid; gap: 22px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
  .card { background: #fff; border-radius: 14px; overflow: hidden; text-decoration: none; color: inherit;
          box-shadow: 0 1px 3px rgba(0,0,0,.09); transition: transform .16s ease, box-shadow .16s ease; display: block; }
  .card:hover { transform: translateY(-3px); box-shadow: 0 16px 32px -18px rgba(0,0,0,.45); }
  .thumb { position: relative; aspect-ratio: 16 / 10; background: var(--tint); }
  .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .score { position: absolute; right: 10px; top: 10px; color: #fff; font-size: 13px; font-weight: 700;
           padding: 3px 10px; border-radius: 999px; }
  .body { padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 3px; }
  .body strong { font-size: 16px; }
  .meta { font-size: 13px; color: #6b7280; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Landing-Page-Entwürfe</h1>
  <p class="lead">${entries.length} Entwürfe, sortiert nach Lead-Score. Jede Seite hat ein eigenes Farb- und Layout-Thema, Highlights aus der Karte, Abholbestellung und Tischreservierung.</p>
  <div class="grid">${cards}</div>
</div>
</body>
</html>
`;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  if (args.cuisine && !MENUS[args.cuisine]) {
    console.log(
      `\nUnbekannte Küche "${args.cuisine}". Möglich sind: ${Object.keys(MENUS).join(", ")}\n`,
    );
    process.exitCode = 1;
    return;
  }

  const leads = selectLeads(readAllLeads(), args);

  if (leads.length === 0) {
    console.log(
      "\nKeine passenden Leads gefunden. Erst 'npm start' ausführen oder die Filter lockern.\n",
    );
    return;
  }

  mkdirSync(landingPagesDir, { recursive: true });

  const entries = leads.map((lead) => {
    const cuisine = args.cuisine ?? detectCuisine(lead.name);
    return { lead, cuisine, theme: themeForLead(lead, cuisine) };
  });

  // Bilder einmalig in einen gemeinsamen Ordner laden, damit die Entwürfe
  // später auch ohne Internet funktionieren.
  const specs = entries.flatMap(({ lead, cuisine }) => imageSpecsForLead(lead, cuisine));
  const assetsDir = path.join(landingPagesDir, "assets");
  console.log("\n📷 Prüfe Bildmaterial ...");
  const { geladen, fehlgeschlagen } = await ensureAssets(specs, assetsDir);
  console.log(
    geladen > 0 ? `   ${geladen} Bild(er) geladen.` : "   Alle Bilder bereits vorhanden.",
  );
  if (fehlgeschlagen.length > 0) {
    console.log(`   ⚠️  ${fehlgeschlagen.length} Bild(er) nicht geladen:`);
    fehlgeschlagen.forEach((zeile) => console.log(`      ${zeile}`));
  }

  const taken = new Set();
  for (const entry of entries) {
    entry.slug = uniqueSlug(entry.lead.name, taken);

    const html = buildLandingPage(entry.lead, {
      menu: menuForCuisine(entry.cuisine),
      theme: entry.theme,
      kontaktEmail: args.email,
    });

    const dir = path.join(landingPagesDir, entry.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "index.html"), html, "utf-8");
  }

  const overviewPath = path.join(landingPagesDir, "index.html");
  writeFileSync(overviewPath, buildOverviewPage(entries), "utf-8");

  // Zuordnung placeId -> Ordnername, damit das Dashboard den passenden
  // Entwurf verlinken kann (Ordnernamen können durchnummeriert sein).
  const manifest = Object.fromEntries(
    entries.filter(({ lead }) => lead.placeId).map(({ lead, slug }) => [lead.placeId, slug]),
  );
  writeFileSync(
    path.join(landingPagesDir, "entwuerfe.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf-8",
  );

  console.log(`\n✅ ${entries.length} Landing-Page-Entwürfe erstellt.`);
  console.log(`   Übersicht: ${overviewPath}`);
  console.log(`   Im Dashboard verlinkt (npm run dashboard)\n`);
}

run();
