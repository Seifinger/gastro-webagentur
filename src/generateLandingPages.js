import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { landingPagesDir } from "./config.js";
import { readAllLeads } from "./csvImport.js";
import { buildLandingPage, slugify, escapeHtml } from "./landingPageGenerator.js";
import { detectCuisine, menuForCuisine } from "./menuCatalog.js";

function parseArgs(argv) {
  const args = { region: null, limit: null, minScore: 0, email: "" };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--region") args.region = argv[++i];
    if (argv[i] === "--limit") args.limit = Number(argv[++i]);
    if (argv[i] === "--min-score") args.minScore = Number(argv[++i]);
    if (argv[i] === "--email") args.email = argv[++i];
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
  const rows = entries
    .map(
      ({ lead, slug, cuisine }) => `
      <tr>
        <td><a href="./${escapeHtml(slug)}/index.html">${escapeHtml(lead.name)}</a></td>
        <td>${escapeHtml(lead.ort ?? "")}</td>
        <td>${escapeHtml(String(lead.score ?? ""))}</td>
        <td>${escapeHtml(lead.priorität ?? "")}</td>
        <td>${escapeHtml(cuisine)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Landing-Page-Entwürfe</title>
<style>
  body { margin: 0; padding: 40px 20px; background: #f6f7f9; color: #1f2430;
         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .wrap { max-width: 940px; margin: 0 auto; }
  h1 { font-size: 26px; margin: 0 0 8px; }
  p.lead { color: #6b7280; margin: 0 0 28px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  th, td { text-align: left; padding: 12px 16px; border-bottom: 1px solid #e3e6ea; font-size: 15px; }
  th { background: #fafbfc; font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: #6b7280; }
  tr:last-child td { border-bottom: none; }
  a { color: #2563eb; font-weight: 600; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Landing-Page-Entwürfe</h1>
  <p class="lead">${entries.length} Entwürfe, sortiert nach Lead-Score. Jede Seite ist eine eigenständige HTML-Datei mit Speisekarte, Abholbestellung und Tischreservierung.</p>
  <table>
    <thead>
      <tr><th>Restaurant</th><th>Ort</th><th>Score</th><th>Priorität</th><th>Küche</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>
</body>
</html>
`;
}

function run() {
  const args = parseArgs(process.argv.slice(2));
  const leads = selectLeads(readAllLeads(), args);

  if (leads.length === 0) {
    console.log(
      "\nKeine passenden Leads gefunden. Erst 'npm start' ausführen oder die Filter lockern.\n",
    );
    return;
  }

  mkdirSync(landingPagesDir, { recursive: true });

  const taken = new Set();
  const entries = [];

  for (const lead of leads) {
    const slug = uniqueSlug(lead.name, taken);
    const cuisine = detectCuisine(lead.name);
    const html = buildLandingPage(lead, {
      menu: menuForCuisine(cuisine),
      kontaktEmail: args.email,
    });

    const dir = path.join(landingPagesDir, slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "index.html"), html, "utf-8");

    entries.push({ lead, slug, cuisine });
  }

  const overviewPath = path.join(landingPagesDir, "index.html");
  writeFileSync(overviewPath, buildOverviewPage(entries), "utf-8");

  console.log(`\n✅ ${entries.length} Landing-Page-Entwürfe erstellt.`);
  console.log(`   Übersicht: ${overviewPath}\n`);
}

run();
