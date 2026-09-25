import { mkdirSync, writeFileSync, rmSync, existsSync, mkdtempSync, renameSync } from "node:fs";
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
  ladeSchriften,
  schreibeSeiten,
} from "./buildSite.js";
import { ladeEngineWahl, engineFuerLead as engineAusWahl } from "../v2/integration/dashboardV2.js";
import { ausdruckZumBauen, stimmungFuerSlug } from "../v2/build/ausdruck.js";
import { ladeEigeneMedien } from "../v2/assets-pipeline/mediaGenerator.js";
import { demoEinstellungen } from "./demoEinstellungen.js";
import { baueDemo } from "../v2/integration/demoBau.js";
import { pruefeOeffentlicheAusgabe } from "./oeffentlichkeit.js";

/** Vorschaubild der Übersicht: das eigene Titelbild der Seite, sonst das Stockfoto. */
function vorschauBild(slug, gestaltung) {
  const eigen = ladeEigeneMedien()[slug]?.hero;
  return eigen ? `./${slug}/medien/hero${path.extname(eigen.datei)}` : remoteImageUrl(gestaltung.heroImage, "hero");
}
import { baueImZyklus } from "../v2/build/zyklus.js";
import { OUTPUT_DIR } from "../v2/build/siteBuilder.js";

const LEADS_DIR = path.join(OUTPUT_DIR, "leads");

/**
 * Baut einen Entwurf über die v2-Engine nach zielordner/<slug>/ – dieselbe
 * Engine-Wahl (data/v2-engine.json bzw. ENGINE_STANDARD), die auch das
 * Dashboard für den Einzel-Build nutzt (v2/integration/dashboardV2.js).
 * Fonts landen unter zielordner/assets/fonts (wie bei v1), damit sich beide
 * Engines denselben Ordner unter docs/ teilen können.
 *
 * Bekannte Lücke gegenüber v1: das Resonanz-Beacon (Öffnungs-Tracking) ist
 * in v2 noch nicht verdrahtet – veröffentlichte v2-Seiten senden aktuell
 * keine Resonanz-Daten.
 */
/**
 * Engine je Lead wie im Dashboard gewählt – mit einer Ausnahme: Eine Seite mit
 * Ausdruck (gewählt in v2/ausdruck-wahl.json oder Standard der Küche) gibt es
 * nur in v2, sie wird immer über v2 gebaut.
 */
function engineFuerLead(placeId, wahl, slug, kueche) {
  if (slug && ausdruckZumBauen(slug, kueche).ausdruck) return "v2";
  return wahl ? engineAusWahl(placeId, wahl) : engineAusWahl(placeId);
}

async function baueUndSchreibeV2Entwurf(lead, slug, kueche, stimmung, { email = "", api = "", zielordner = docsDir, judge = false, fiktiv = false } = {}) {
  const { ausdruck } = ausdruckZumBauen(slug, kueche);
  const { protokoll, ordner } = await baueImZyklus({
    lead,
    kueche,
    // Farbwelt aus v2/ausdruck-wahl.json hat Vorrang (bewusste Wahl statt Seed).
    stimmung: stimmungFuerSlug(slug) ?? stimmung,
    judge,
    zielDir: zielordner,
    slug,
    fontsDir: path.join(zielordner, "assets", "fonts"),
    fontsPfad: "../assets/fonts",
    optionen: {
      fiktiv,
      apiUrl: api,
      kontaktEmail: email,
      editUebersteuerung: fiktiv ? undefined : loadLeadEdits(slug),
      ...(ausdruck ? { ausdruck } : {}),
    },
  });
  return { slug, ordner, protokoll };
}

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
          <img src="${escapeHtml(vorschauBild(slug, gestaltung))}" alt="" loading="lazy">
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
 * Baut genau eine Lead-Demo aus der neuen Vorlage (v2/integration/demoBau.js)
 * und schreibt sie nach zielordner/<slug>/ – ohne den Rest anzufassen.
 * Grundlage für "npm run publish-site -- --only <slug>" (lokal nach
 * v2/output/leads/).
 *
 * - Der Slug kommt aus dem Manifest und wird nie neu berechnet.
 * - Gebaut wird in einen Temp-Ordner daneben; erst ein vollständiger Bau
 *   ersetzt zielordner/<slug>. Ein Abbruch lässt die bisherige Fassung stehen.
 * - Nie nach docs/ (öffentlich): src/oeffentlichkeit.js lehnt das ab.
 */
export async function baueUndSchreibeEinzelnenEntwurf(slug, { email = "", api = "", zielordner = docsDir, buildId = "", fontsDir, fontsPfad } = {}) {
  // Lead-Demos gehen nie nach docs/ (src/oeffentlichkeit.js) – nur lokal.
  pruefeOeffentlicheAusgabe(zielordner, slug);
  const einstellungen = demoEinstellungen(slug);
  if (!einstellungen) throw new Error(`Kein Lead für Slug "${slug}" gefunden.`);

  mkdirSync(zielordner, { recursive: true });
  const temp = mkdtempSync(path.join(zielordner, `.bau-${slug.slice(0, 40)}-`));
  try {
    await baueDemo(slug, {
      zielDir: temp,
      apiUrl: api,
      buildId,
      kontaktEmail: email,
      fontsDir: fontsDir ?? path.join(zielordner, "assets", "fonts"),
      fontsPfad: fontsPfad ?? "../assets/fonts",
    });
    const neu = path.join(temp, slug);
    if (!existsSync(path.join(neu, "index.html"))) throw new Error("Der Bau hat keine index.html erzeugt.");
    const ziel = path.join(zielordner, slug);
    const alt = path.join(temp, ".vorher");
    if (existsSync(ziel)) renameSync(ziel, alt);
    try {
      renameSync(neu, ziel);
    } catch (fehler) {
      if (existsSync(alt)) renameSync(alt, ziel);
      throw fehler;
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }

  return { slug, ordner: path.join(zielordner, slug), einstellungen };
}

/**
 * Räumt interne Build-Berichte aus den Beispielseiten unter docs/ (ältere
 * Läufe haben sie dort abgelegt). Neue Läufe schreiben sie nach
 * v2/output/berichte/ (siteBuilder.berichtOrdnerFuer).
 */
export function entferneDiagnoseAusDocs(dir = docsDir) {
  const entfernt = [];
  for (const lead of DEMO_LEADS) {
    for (const datei of ["bericht.json", "zyklus.json"]) {
      const pfad = path.join(dir, `beispiel-${lead.kueche}`, datei);
      if (existsSync(pfad)) {
        rmSync(pfad);
        entfernt.push(path.relative(dir, pfad));
      }
    }
  }
  return entfernt;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  const fehler = pruefeKueche(args.cuisine);
  if (fehler) {
    console.log(`\n${fehler}\n`);
    process.exitCode = 1;
    return;
  }

  // --beispiel beispiel-<küche>: nur diese eine Beispielseite nach docs/ bauen
  // (z. B. nach einer Gestaltungsänderung). Übersicht, übrige Seiten und
  // Kundenentwürfe bleiben unangetastet.
  if (args.beispiel) {
    const lead = DEMO_LEADS.find((l) => `beispiel-${l.kueche}` === args.beispiel);
    if (!lead) {
      console.log(`\nUnbekannte Beispielseite "${args.beispiel}". Möglich: ${DEMO_LEADS.map((l) => `beispiel-${l.kueche}`).join(", ")}\n`);
      process.exitCode = 1;
      return;
    }
    const gestaltung = themeForLead(lead, lead.kueche, stimmungFuerSlug(args.beispiel) ?? undefined);
    if (engineFuerLead(lead.placeId, ladeEngineWahl(), args.beispiel, lead.kueche) === "v2") {
      await baueUndSchreibeV2Entwurf(lead, args.beispiel, lead.kueche, gestaltung?.stimmung, { email: args.email, api: args.api, zielordner: docsDir, fiktiv: true });
    } else {
      const fontCss = await ladeSchriften(path.join(docsDir, "assets", "fonts"));
      schreibeSeiten([{ lead, cuisine: lead.kueche, gestaltung, slug: args.beispiel }], docsDir, { kontaktEmail: args.email, fontCss, veroeffentlicht: true, apiUrl: args.api, bildUrl: remoteImageUrl, fiktiv: true });
    }
    // Übersicht mitziehen, damit die Karte das neue Titelbild zeigt.
    const demoEntries = DEMO_LEADS.map((l) => ({ lead: l, gestaltung: themeForLead(l, l.kueche, stimmungFuerSlug(`beispiel-${l.kueche}`) ?? undefined), slug: `beispiel-${l.kueche}`, menu: menuForCuisine(l.kueche) }));
    writeFileSync(path.join(docsDir, "index.html"), buildShowcasePage(demoEntries, args.kontakt), "utf-8");
    const { ausdruck } = ausdruckZumBauen(args.beispiel, lead.kueche);
    console.log(`\n✅ Beispielseite "${args.beispiel}" neu gebaut${ausdruck ? ` (Ausdruck: ${ausdruck})` : ""}. Geschrieben: ${path.join(docsDir, args.beispiel)} und die Übersicht docs/index.html\n`);
    return;
  }

  // --only <slug>: die Konzept-Demo dieses einen Leads LOKAL bauen
  // (v2/output/leads/<slug>/, im Dashboard unter /v2/leads/<slug>/). Nach
  // docs/ kommt sie nicht – siehe src/oeffentlichkeit.js.
  if (args.only) {
    try {
      const { slug, ordner } = await baueUndSchreibeEinzelnenEntwurf(args.only, {
        email: args.email,
        zielordner: LEADS_DIR,
        fontsDir: path.join(OUTPUT_DIR, "assets", "fonts"),
        fontsPfad: "../../assets/fonts",
      });
      console.log(`\n✅ Konzept-Demo "${slug}" lokal gebaut – nicht veröffentlicht. Zeigen: Dashboard → „Präsentation im WLAN“.`);
      console.log(`   Ordner: ${ordner}\n`);
    } catch (error) {
      console.log(`\n${error.message}\n`);
      process.exitCode = 1;
    }
    return;
  }

  // Gesamtlauf: nur die erfundenen Beispielseiten (Typ A) und die Übersicht.
  // Lead-Demos werden nie nach docs/ geschrieben (src/oeffentlichkeit.js).
  mkdirSync(docsDir, { recursive: true });
  const wahl = ladeEngineWahl();
  const demoEntries = DEMO_LEADS.map((lead) => ({
    lead,
    cuisine: lead.kueche,
    gestaltung: themeForLead(lead, lead.kueche, stimmungFuerSlug(`beispiel-${lead.kueche}`) ?? undefined),
    slug: `beispiel-${lead.kueche}`,
    menu: menuForCuisine(lead.kueche),
  }));
  const demoV1 = demoEntries.filter((e) => engineFuerLead(e.lead.placeId, wahl, e.slug, e.cuisine) !== "v2");
  const demoV2 = demoEntries.filter((e) => engineFuerLead(e.lead.placeId, wahl, e.slug, e.cuisine) === "v2");

  if (demoV1.length) {
    const fontCss = await ladeSchriften(path.join(docsDir, "assets", "fonts"));
    schreibeSeiten(demoV1, docsDir, { kontaktEmail: args.email, fontCss, veroeffentlicht: true, apiUrl: args.api, bildUrl: remoteImageUrl, fiktiv: true });
  }
  if (demoV2.length) {
    console.log(`\n🧬 Baue ${demoV2.length} Beispielseite(n) über die v2-Engine ...`);
    for (const entry of demoV2) {
      console.log(`  ▶ ${entry.slug}`);
      await baueUndSchreibeV2Entwurf(entry.lead, entry.slug, entry.cuisine, entry.gestaltung?.stimmung, {
        email: args.email,
        api: args.api,
        zielordner: docsDir,
        fiktiv: true,
      });
    }
  }

  writeFileSync(path.join(docsDir, "index.html"), buildShowcasePage(demoEntries, args.kontakt), "utf-8");
  entferneDiagnoseAusDocs();
  writeFileSync(path.join(docsDir, ".nojekyll"), "", "utf-8");
  writeFileSync(path.join(docsDir, "robots.txt"), "User-agent: *\nDisallow: /\n", "utf-8");

  console.log(`\n✅ ${demoEntries.length} Beispielseiten und die Übersicht gebaut. Lead-Demos bleiben lokal (Dashboard oder --only <slug>).`);
  console.log(`   Ordner: ${docsDir}\n`);
}

// Nur beim direkten Start läuft der volle Publish-Lauf. dashboardServer.js
// (über veroeffentlichung.js) importiert baueUndSchreibeEinzelnenEntwurf
// direkt – ohne diesen Schutz würde schon der Import einen kompletten,
// unerwünschten docs/-Neuaufbau auslösen.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
