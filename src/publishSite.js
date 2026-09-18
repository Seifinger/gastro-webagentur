import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { docsDir } from "./config.js";
import { escapeHtml } from "./landingPageGenerator.js";
import { remoteImageUrl } from "./imageLibrary.js";
import { menuForCuisine } from "./menuCatalog.js";
import { themeForLead } from "./landingPageGenerator.js";
import { DEMO_LEADS } from "./demoLeads.js";
import { loadLeadEdits } from "./leadEdits.js";
import {
  parseArgs,
  pruefeKueche,
  waehleLeads,
  baueEintraege,
  leadFuerSlug,
  ladeSchriften,
  schreibeSeiten,
} from "./buildSite.js";

const HINWEIS =
  "Alle hier gezeigten Lokale sind frei erfunden – es sind Beispielseiten, keine Kunden. " +
  "Gerichte, Preise, Öffnungszeiten und Fotos sind Platzhalter.";

function kontaktZeile(kontakt) {
  if (!kontakt) return "";
  return `<p class="kontakt">${escapeHtml(kontakt)}</p>`;
}

/**
 * Öffentliche Übersicht. Bewusst ohne Lead-Score und Priorität – das sind
 * interne Vertriebsdaten und gehören nicht ins Netz.
 */
function buildShowcasePage(entries, kontakt) {
  const cards = entries
    .map(
      ({ lead, slug, gestaltung, menu }) => `
      <a class="card" href="./${escapeHtml(slug)}/">
        <div class="thumb" style="background:${gestaltung.theme.tint}">
          <img src="${escapeHtml(remoteImageUrl(gestaltung.heroImage, "hero"))}" alt="" loading="lazy">
        </div>
        <div class="body">
          <strong>${escapeHtml(lead.name)}</strong>
          <span class="meta">${escapeHtml(menu.konzept)}${lead.ort ? ` · ${escapeHtml(lead.ort)}` : ""}</span>
        </div>
      </a>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Website-Entwürfe für Gastronomie</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🍽️%3C/text%3E%3C/svg%3E">
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0 0 72px; background: #12110f; color: #f4f1ec;
         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         line-height: 1.6; }
  .wrap { max-width: 1140px; margin: 0 auto; padding: 0 20px; }
  header { padding: 72px 0 40px; }
  h1 { font-size: clamp(30px, 5vw, 46px); line-height: 1.15; margin: 0 0 16px;
       font-family: Georgia, "Times New Roman", serif; font-weight: 600; }
  .intro { color: #b9b1a6; font-size: 18px; max-width: 620px; margin: 0; }
  .kontakt { margin: 22px 0 0; font-size: 15px; color: #e7e1d8; }
  .disclaimer { margin: 28px 0 0; padding: 14px 18px; border-left: 3px solid #b4451f;
                background: #1b1917; color: #b9b1a6; font-size: 14px; max-width: 720px; }
  .grid { display: grid; gap: 22px; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); }
  .card { background: #1b1917; border-radius: 14px; overflow: hidden; text-decoration: none;
          color: inherit; display: block; transition: transform .16s ease; }
  .card:hover { transform: translateY(-4px); }
  .thumb { aspect-ratio: 16 / 10; }
  .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .body { padding: 16px 18px 20px; display: flex; flex-direction: column; gap: 4px; }
  .body strong { font-size: 17px; }
  .meta { font-size: 14px; color: #a9a196; }
  footer { margin-top: 56px; padding-top: 24px; border-top: 1px solid #2a2724; color: #8d857b; font-size: 13px; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>Website-Entwürfe für Gastronomie</h1>
    <p class="intro">Beispielseiten mit Online-Reservierung, Abholbestellung und vollständiger Speisekarte –
       jede auf ihre Küche zugeschnitten, vom Wirtshaus bis zur Sushi-Bar.</p>
    ${kontaktZeile(kontakt)}
    <p class="disclaimer">${escapeHtml(HINWEIS)}</p>
  </header>

  <div class="grid">${cards}</div>

  <footer>${escapeHtml(HINWEIS)}</footer>
</div>
</body>
</html>
`;
}

/**
 * Baut genau einen Entwurf und schreibt ihn nach zielordner/<slug>/ – ohne
 * den Rest von zielordner anzufassen. Grundlage für "npm run publish-site --
 * --only <slug>" (unten) und für den Veröffentlichen-Knopf im
 * Bearbeiten-Dashboard (siehe src/veroeffentlichung.js). zielordner ist
 * überschreibbar, damit Tests gegen ein leeres Verzeichnis prüfen können,
 * ohne das echte docs/ anzufassen – im Betrieb ist es immer docsDir.
 */
export async function baueUndSchreibeEinzelnenEntwurf(slug, { cuisine, email = "", api = "", zielordner = docsDir } = {}) {
  const lead = leadFuerSlug(slug);
  if (!lead) throw new Error(`Kein Lead für Slug "${slug}" gefunden.`);

  const [entry] = baueEintraege([lead], cuisine).map((entry) => ({
    ...entry,
    editUebersteuerung: loadLeadEdits(entry.slug),
  }));

  if (entry.slug !== slug) {
    throw new Error(`Der errechnete Slug ("${entry.slug}") weicht von "${slug}" ab.`);
  }

  mkdirSync(zielordner, { recursive: true });
  const fontCss = await ladeSchriften(path.join(zielordner, "assets", "fonts"));

  schreibeSeiten([entry], zielordner, {
    kontaktEmail: email,
    fontCss,
    veroeffentlicht: true,
    apiUrl: api,
    // Wie beim vollständigen Lauf: Bilder kommen im Netz direkt von Unsplash.
    bildUrl: remoteImageUrl,
  });

  return { slug: entry.slug, ordner: path.join(zielordner, entry.slug) };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  const fehler = pruefeKueche(args.cuisine);
  if (fehler) {
    console.log(`\n${fehler}\n`);
    process.exitCode = 1;
    return;
  }

  // --only <slug>: ausschließlich diesen einen Entwurf veröffentlichen. Der
  // gesamte übrige docs/-Ordner (die anderen Entwürfe, die Demo-Seiten, die
  // Übersichtsseite) bleibt dabei unangetastet – anders als beim
  // vollständigen Lauf unten, der docs/ komplett neu aufbaut.
  if (args.only) {
    try {
      const { slug, ordner } = await baueUndSchreibeEinzelnenEntwurf(args.only, {
        cuisine: args.cuisine,
        email: args.email,
        api: args.api,
      });
      console.log(`\n✅ Entwurf "${slug}" veröffentlicht (nur dieser Ordner wurde geschrieben).`);
      console.log(`   Ordner: ${ordner}\n`);
    } catch (error) {
      console.log(`\n${error.message}\n`);
      process.exitCode = 1;
    }
    return;
  }

  const leads = waehleLeads(args);
  if (leads.length === 0) {
    console.log("\nKeine passenden Leads gefunden. Erst 'npm start' ausführen.\n");
    return;
  }

  // Komplett neu aufbauen: Ein abgewählter Entwurf muss auch wirklich
  // verschwinden und nicht als Altlast online bleiben.
  rmSync(docsDir, { recursive: true, force: true });
  mkdirSync(docsDir, { recursive: true });

  const entries = baueEintraege(leads, args.cuisine).map((entry) => ({
    ...entry,
    editUebersteuerung: loadLeadEdits(entry.slug),
  }));

  console.log("\n🔤 Prüfe Schriften ...");
  const fontCss = await ladeSchriften(path.join(docsDir, "assets", "fonts"));

  const gemeinsam = {
    kontaktEmail: args.email,
    fontCss,
    veroeffentlicht: true,
    apiUrl: args.api,
    // Bilder kommen im Netz direkt von Unsplash, damit das Repository nicht
    // um mehrere Megabyte Stockfotos wächst.
    bildUrl: remoteImageUrl,
  };

  // Echte Leads: veröffentlicht, aber von nirgendwo verlinkt. Nur wer den
  // QR-Code oder Link bekommen hat, findet den Entwurf.
  schreibeSeiten(entries, docsDir, gemeinsam);

  // Erfundene Lokale: das, was auf der Startseite steht.
  const demoEntries = DEMO_LEADS.map((lead) => ({
    lead,
    cuisine: lead.kueche,
    gestaltung: themeForLead(lead, lead.kueche),
    slug: `beispiel-${lead.kueche}`,
    menu: menuForCuisine(lead.kueche),
  }));
  schreibeSeiten(demoEntries, docsDir, { ...gemeinsam, fiktiv: true });

  writeFileSync(path.join(docsDir, "index.html"), buildShowcasePage(demoEntries, args.kontakt), "utf-8");
  writeFileSync(path.join(docsDir, ".nojekyll"), "", "utf-8");
  writeFileSync(
    path.join(docsDir, "robots.txt"),
    "User-agent: *\nDisallow: /\n",
    "utf-8",
  );

  console.log(`\n✅ ${entries.length} Entwürfe für die Veröffentlichung vorbereitet.`);
  console.log(`   Ordner: ${docsDir}`);
  console.log("\n   Nächster Schritt:");
  console.log("     git add docs && git commit -m \"Entwürfe veröffentlichen\" && git push");
  console.log("\n   Danach unter GitHub → Settings → Pages als Quelle");
  console.log("   \"Deploy from a branch\", Branch: main, Ordner: /docs auswählen.\n");
}

// Nur beim direkten Start läuft der volle Publish-Lauf. dashboardServer.js
// (über veroeffentlichung.js) importiert baueUndSchreibeEinzelnenEntwurf
// direkt – ohne diesen Schutz würde schon der Import einen kompletten,
// unerwünschten docs/-Neuaufbau auslösen.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
