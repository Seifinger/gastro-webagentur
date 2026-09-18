import { mkdirSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { landingPagesDir } from "./config.js";
import { escapeHtml } from "./landingPageGenerator.js";
import { assetFileName } from "./imageLibrary.js";
import { loadLeadEdits } from "./leadEdits.js";
import { merkeEntwuerfe, merkeEntwurf } from "./entwurfsManifest.js";
import {
  parseArgs,
  pruefeKueche,
  waehleLeads,
  baueEintraege,
  leadFuerSlug,
  ladeBilder,
  ladeSchriften,
  schreibeSeiten,
} from "./buildSite.js";

function buildOverviewPage(entries) {
  const cards = entries
    .map(
      ({ lead, slug, cuisine, gestaltung }) => `
      <a class="card" href="./${escapeHtml(slug)}/index.html">
        <div class="thumb" style="--tint:${gestaltung.theme.tint}">
          <img src="./assets/${assetFileName(gestaltung.heroImage, "hero")}" alt="" loading="lazy">
          <span class="score" style="background:${gestaltung.theme.accent}">${escapeHtml(String(lead.score ?? "–"))}</span>
        </div>
        <div class="body">
          <strong>${escapeHtml(lead.name)}</strong>
          <span class="meta">${escapeHtml(lead.ort ?? "")} · ${escapeHtml(cuisine)}</span>
          <span class="meta">Stimmung: ${escapeHtml(gestaltung.theme.label)} (${escapeHtml(gestaltung.theme.varianteName)})</span>
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
  <p class="lead">${entries.length} Entwürfe, sortiert nach Lead-Score. Jede Seite hat eine Stimmung passend zur Küche, Highlights aus der Karte, Abholbestellung und Tischreservierung.</p>
  <div class="grid">${cards}</div>
</div>
</body>
</html>
`;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  const fehler = pruefeKueche(args.cuisine);
  if (fehler) {
    console.log(`\n${fehler}\n`);
    process.exitCode = 1;
    return;
  }

  mkdirSync(landingPagesDir, { recursive: true });

  // --only <slug>: ausschließlich diesen einen Entwurf neu bauen. Die
  // Aufräum- und Übersichtsschritte weiter unten setzen eine vollständige
  // Lead-Liste voraus und würden sonst die übrigen ~55 Entwürfe aus dem
  // Manifest werfen bzw. deren Ordner löschen – deshalb ein eigener,
  // kurzer Zweig, der nur den einen Ordner anfasst.
  if (args.only) {
    const lead = leadFuerSlug(args.only);
    if (!lead) {
      console.log(
        `\nKein Lead für Slug "${args.only}" gefunden. Erst einen vollständigen Lauf ("npm run pages") ausführen.\n`,
      );
      process.exitCode = 1;
      return;
    }

    const [entry] = baueEintraege([lead], args.cuisine).map((entry) => ({
      ...entry,
      editUebersteuerung: loadLeadEdits(entry.slug),
    }));

    if (entry.slug !== args.only) {
      console.log(
        `\nDer errechnete Slug ("${entry.slug}") weicht von "${args.only}" ab – nichts geändert.\n`,
      );
      process.exitCode = 1;
      return;
    }

    const assetsDir = path.join(landingPagesDir, "assets");
    console.log(`\n📷 Prüfe Bildmaterial für "${entry.slug}" ...`);
    await ladeBilder([entry], assetsDir);
    console.log("🔤 Prüfe Schriften ...");
    const fontCss = await ladeSchriften(path.join(assetsDir, "fonts"));

    // Ohne resonanzUrl: Die lokale Fassung ist die Vorschau des Betreibers,
    // und die darf die Nachfassliste nicht mit eigenen Aufrufen füllen.
    // Gemessen wird nur, was unter docs/ veröffentlicht beim Wirt landet.
    schreibeSeiten([entry], landingPagesDir, { kontaktEmail: args.email, fontCss, apiUrl: args.api });

    // Nur den einen Eintrag im Manifest aktualisieren – die Zuordnung der
    // übrigen Leads bleibt unverändert erhalten.
    merkeEntwurf(lead.placeId, entry.slug);

    console.log(`\n✅ Entwurf "${entry.slug}" neu gebaut.`);
    console.log(`   Ordner: ${path.join(landingPagesDir, entry.slug)}\n`);
    return;
  }

  const leads = waehleLeads(args);
  if (leads.length === 0) {
    console.log(
      "\nKeine passenden Leads gefunden. Erst 'npm start' ausführen oder die Filter lockern.\n",
    );
    return;
  }

  // Was ein Kunde für seinen Entwurf selbst eingepflegt hat. Ohne Datei bleibt
  // es beim generischen Entwurf – der Normalfall für die übrigen Leads.
  const entries = baueEintraege(leads, args.cuisine).map((entry) => ({
    ...entry,
    editUebersteuerung: loadLeadEdits(entry.slug),
  }));

  // Entwurfsordner aus früheren Läufen entfernen – sonst bleiben Seiten mit
  // veralteter Küche oder altem Namen liegen und das Dashboard verlinkt sie
  // womöglich weiter. Die heruntergeladenen Bilder bleiben erhalten.
  const aktuell = new Set(entries.map((e) => e.slug));
  for (const eintrag of readdirSync(landingPagesDir, { withFileTypes: true })) {
    if (!eintrag.isDirectory() || eintrag.name === "assets") continue;
    if (!aktuell.has(eintrag.name)) {
      rmSync(path.join(landingPagesDir, eintrag.name), { recursive: true, force: true });
    }
  }

  // Bilder und Schriften einmalig laden, damit die Entwürfe beim Termin auch
  // ohne Internet funktionieren.
  const assetsDir = path.join(landingPagesDir, "assets");
  console.log("\n📷 Prüfe Bildmaterial ...");
  await ladeBilder(entries, assetsDir);
  console.log("🔤 Prüfe Schriften ...");
  const fontCss = await ladeSchriften(path.join(assetsDir, "fonts"));

  schreibeSeiten(entries, landingPagesDir, { kontaktEmail: args.email, fontCss, apiUrl: args.api });

  const overviewPath = path.join(landingPagesDir, "index.html");
  writeFileSync(overviewPath, buildOverviewPage(entries), "utf-8");

  // Zuordnung placeId -> Ordnername, damit das Dashboard den passenden
  // Entwurf verlinken kann (Ordnernamen können durchnummeriert sein). Der
  // festgehaltene Veröffentlichungsstand (Engine-Fassung, Datum) bleibt dabei
  // erhalten – dieser Lauf baut nur die lokale Vorschau, nicht docs/.
  merkeEntwuerfe(entries.map(({ lead, slug }) => ({ placeId: lead.placeId, slug })));

  console.log(`\n✅ ${entries.length} Landing-Page-Entwürfe erstellt.`);
  console.log(`   Übersicht: ${overviewPath}`);
  console.log(`   Im Dashboard verlinkt (npm run dashboard)\n`);
}

run();
