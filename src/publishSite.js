import { mkdirSync, writeFileSync, rmSync, existsSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { docsDir, resonanzUrl } from "./config.js";
import { escapeHtml } from "./landingPageGenerator.js";
import { remoteImageUrl } from "./imageLibrary.js";
import { menuForCuisine } from "./menuCatalog.js";
import { themeForLead } from "./landingPageGenerator.js";
import { DEMO_LEADS } from "./demoLeads.js";
import { loadLeadEdits } from "./leadEdits.js";
import { merkeVeroeffentlichung } from "./entwurfsManifest.js";
import { uploadsDir } from "./bildUpload.js";
import {
  parseArgs,
  pruefeKueche,
  waehleLeads,
  baueEintraege,
  leadFuerSlug,
  ladeSchriften,
  schreibeSeiten,
} from "./buildSite.js";
import { ladeEngineWahl, engineFuerLead as engineAusWahl } from "../v2/integration/dashboardV2.js";
import { ausdruckFuerSlug, stimmungFuerSlug } from "../v2/build/ausdruck.js";
import { ladeEigeneMedien } from "../v2/assets-pipeline/mediaGenerator.js";

/** Vorschaubild der Übersicht: das eigene Titelbild der Seite, sonst das Stockfoto. */
function vorschauBild(slug, gestaltung) {
  const eigen = ladeEigeneMedien()[slug]?.hero;
  return eigen ? `./${slug}/medien/hero${path.extname(eigen.datei)}` : remoteImageUrl(gestaltung.heroImage, "hero");
}
import { baueImZyklus } from "../v2/build/zyklus.js";

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
 * Ausdruck (v2/ausdruck-wahl.json) gibt es nur in v2, sie wird immer über v2 gebaut.
 */
function engineFuerLead(placeId, wahl, slug) {
  if (slug && ausdruckFuerSlug(slug)) return "v2";
  return wahl ? engineAusWahl(placeId, wahl) : engineAusWahl(placeId);
}

async function baueUndSchreibeV2Entwurf(lead, slug, kueche, stimmung, { email = "", api = "", zielordner = docsDir, judge = false, fiktiv = false } = {}) {
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
      ...(ausdruckFuerSlug(slug) ? { ausdruck: ausdruckFuerSlug(slug) } : {}),
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
 * Eigene Fotos liegen lokal unter public/uploads/<slug>/<rolle>.jpg und
 * werden dort nur vom Dashboard-Server ausgeliefert (siehe bildUpload.js) –
 * auf GitHub Pages gibt es diesen Server nicht, ein referenzierter
 * "/uploads/..."-Pfad wäre dort ein totes Bild. Für die Veröffentlichung wird
 * die Datei deshalb mit in den Entwurfsordner kopiert und die Referenz auf
 * einen relativen Pfad umgeschrieben – die veröffentlichte Seite bleibt
 * damit in sich geschlossen, wie schon die Stock-Bilder unter docs/assets/.
 */
function lokalisiereEigeneBilder(editUebersteuerung, slug, zielordner) {
  const bilder = editUebersteuerung?.bilder;
  if (!bilder) return editUebersteuerung;

  const erwarteterPrefix = `/uploads/${slug}/`;
  const uebersetzt = {};
  let veraendert = false;

  for (const [rolle, pfad] of Object.entries(bilder)) {
    if (typeof pfad !== "string" || !pfad.startsWith(erwarteterPrefix)) {
      uebersetzt[rolle] = pfad;
      continue;
    }

    const dateiname = path.basename(pfad);
    const quelle = path.join(uploadsDir, slug, dateiname);
    if (!existsSync(quelle)) {
      // Datei lokal nicht (mehr) vorhanden – lieber der alte Pfad als ein
      // abgebrochener Build; das eine Bild bliebe dann zwar tot, der Rest
      // der Seite aber nicht.
      uebersetzt[rolle] = pfad;
      continue;
    }

    const zielDatei = path.join(zielordner, slug, "bilder", dateiname);
    mkdirSync(path.dirname(zielDatei), { recursive: true });
    copyFileSync(quelle, zielDatei);

    uebersetzt[rolle] = `./bilder/${dateiname}`;
    veraendert = true;
  }

  return veraendert ? { ...editUebersteuerung, bilder: uebersetzt } : editUebersteuerung;
}

/**
 * Baut genau einen Entwurf und schreibt ihn nach zielordner/<slug>/ – ohne
 * den Rest von zielordner anzufassen. Grundlage für "npm run publish-site --
 * --only <slug>" (unten) und für den Veröffentlichen-Knopf im
 * Bearbeiten-Dashboard (siehe src/veroeffentlichung.js). zielordner ist
 * überschreibbar, damit Tests gegen ein leeres Verzeichnis prüfen können,
 * ohne das echte docs/ anzufassen – im Betrieb ist es immer docsDir.
 */
// resonanz kommt per Default aus der .env, damit der Einzel-Publish aus dem
// Dashboard (veroeffentlichung.js) das Beacon nicht stillschweigend abschaltet.
export async function baueUndSchreibeEinzelnenEntwurf(
  slug,
  { cuisine, email = "", api = "", resonanz = resonanzUrl, zielordner = docsDir } = {},
) {
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

  if (engineFuerLead(lead.placeId, undefined, entry.slug) === "v2") {
    const { ordner } = await baueUndSchreibeV2Entwurf(lead, entry.slug, entry.cuisine, entry.gestaltung?.stimmung, { email, api, zielordner });
    if (zielordner === docsDir) {
      merkeVeroeffentlichung({ placeId: lead.placeId, slug: entry.slug, archetyp: entry.gestaltung?.archetyp ?? "" });
    }
    return { slug: entry.slug, ordner };
  }

  const fontCss = await ladeSchriften(path.join(zielordner, "assets", "fonts"));

  schreibeSeiten(
    [{ ...entry, editUebersteuerung: lokalisiereEigeneBilder(entry.editUebersteuerung, entry.slug, zielordner) }],
    zielordner,
    {
      kontaktEmail: email,
      fontCss,
      veroeffentlicht: true,
      apiUrl: api,
      resonanzUrl: resonanz,
      // Wie beim vollständigen Lauf: Bilder kommen im Netz direkt von Unsplash.
      bildUrl: remoteImageUrl,
    },
  );

  // Nur ein echter Lauf nach docs/ ist eine Veröffentlichung. Ein Bau in ein
  // anderes Verzeichnis (Vorschau, Tests) darf den festgehaltenen Stand des
  // Kunden nicht verschieben – sonst sähe eine Seite "frisch" aus, die online
  // unverändert alt ist.
  if (zielordner === docsDir) {
    merkeVeroeffentlichung({
      placeId: lead.placeId,
      slug: entry.slug,
      archetyp: entry.gestaltung?.archetyp ?? "",
    });
  }

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
    if (engineFuerLead(lead.placeId, ladeEngineWahl(), args.beispiel) === "v2") {
      await baueUndSchreibeV2Entwurf(lead, args.beispiel, lead.kueche, gestaltung?.stimmung, { email: args.email, api: args.api, zielordner: docsDir, fiktiv: true });
    } else {
      const fontCss = await ladeSchriften(path.join(docsDir, "assets", "fonts"));
      schreibeSeiten([{ lead, cuisine: lead.kueche, gestaltung, slug: args.beispiel }], docsDir, { kontaktEmail: args.email, fontCss, veroeffentlicht: true, apiUrl: args.api, bildUrl: remoteImageUrl, fiktiv: true });
    }
    // Übersicht mitziehen, damit die Karte das neue Titelbild zeigt.
    const demoEntries = DEMO_LEADS.map((l) => ({ lead: l, gestaltung: themeForLead(l, l.kueche, stimmungFuerSlug(`beispiel-${l.kueche}`) ?? undefined), slug: `beispiel-${l.kueche}`, menu: menuForCuisine(l.kueche) }));
    writeFileSync(path.join(docsDir, "index.html"), buildShowcasePage(demoEntries, args.kontakt), "utf-8");
    const ausdruck = ausdruckFuerSlug(args.beispiel);
    console.log(`\n✅ Beispielseite "${args.beispiel}" neu gebaut${ausdruck ? ` (Ausdruck: ${ausdruck})` : ""}. Geschrieben: ${path.join(docsDir, args.beispiel)} und die Übersicht docs/index.html\n`);
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
        resonanz: args.resonanz,
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

  const entries = baueEintraege(leads, args.cuisine).map((entry) => {
    const editUebersteuerung = loadLeadEdits(entry.slug);
    return { ...entry, editUebersteuerung: lokalisiereEigeneBilder(editUebersteuerung, entry.slug, docsDir) };
  });

  console.log("\n🔤 Prüfe Schriften ...");
  const fontCss = await ladeSchriften(path.join(docsDir, "assets", "fonts"));

  const gemeinsam = {
    kontaktEmail: args.email,
    fontCss,
    veroeffentlicht: true,
    apiUrl: args.api,
    resonanzUrl: args.resonanz,
    // Bilder kommen im Netz direkt von Unsplash, damit das Repository nicht
    // um mehrere Megabyte Stockfotos wächst.
    bildUrl: remoteImageUrl,
  };

  // Echte Leads: veröffentlicht, aber von nirgendwo verlinkt. Nur wer den
  // QR-Code oder Link bekommen hat, findet den Entwurf. Die Engine-Wahl
  // (Dashboard-Toggle bzw. ENGINE_STANDARD) entscheidet pro Lead, welche
  // der beiden Engines tatsächlich schreibt.
  const wahl = ladeEngineWahl();
  const v1Entries = entries.filter((e) => engineFuerLead(e.lead.placeId, wahl, e.slug) !== "v2");
  const v2Entries = entries.filter((e) => engineFuerLead(e.lead.placeId, wahl, e.slug) === "v2");

  if (v1Entries.length) schreibeSeiten(v1Entries, docsDir, gemeinsam);

  if (v2Entries.length) {
    console.log(`\n🧬 Baue ${v2Entries.length} Entwurf/Entwürfe über die v2-Engine ...`);
    for (const entry of v2Entries) {
      console.log(`  ▶ ${entry.slug}`);
      await baueUndSchreibeV2Entwurf(entry.lead, entry.slug, entry.cuisine, entry.gestaltung?.stimmung, {
        email: args.email,
        api: args.api,
        zielordner: docsDir,
      });
    }
  }

  // Jede Seite, die dieser Lauf wirklich nach docs/ geschrieben hat, bekommt
  // den aktuellen Engine-Stand ins Manifest. Der Archetyp bleibt dabei der,
  // der dem Lead schon zugeordnet war (stimmungsWahl.js bzw. der Seed über
  // die drei Grund-Archetypen) – ein Sammel-Lauf stellt niemanden um.
  const jetzt = new Date().toISOString();
  for (const entry of entries) {
    merkeVeroeffentlichung({
      placeId: entry.lead.placeId,
      slug: entry.slug,
      archetyp: entry.gestaltung?.archetyp ?? "",
      zeitpunkt: jetzt,
    });
  }

  // Erfundene Lokale: das, was auf der Startseite steht. Nutzen dieselbe
  // Engine-Wahl wie die echten Leads (Standard, keine Einzelübersteuerung
  // in data/v2-engine.json vorgesehen).
  const demoEntries = DEMO_LEADS.map((lead) => ({
    lead,
    cuisine: lead.kueche,
    gestaltung: themeForLead(lead, lead.kueche, stimmungFuerSlug(`beispiel-${lead.kueche}`) ?? undefined),
    slug: `beispiel-${lead.kueche}`,
    menu: menuForCuisine(lead.kueche),
  }));
  const demoV1 = demoEntries.filter((e) => engineFuerLead(e.lead.placeId, wahl, e.slug) !== "v2");
  const demoV2 = demoEntries.filter((e) => engineFuerLead(e.lead.placeId, wahl, e.slug) === "v2");

  if (demoV1.length) schreibeSeiten(demoV1, docsDir, { ...gemeinsam, fiktiv: true });

  if (demoV2.length) {
    console.log(`\n🧬 Baue ${demoV2.length} Beispiel-Entwurf/Entwürfe über die v2-Engine ...`);
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
