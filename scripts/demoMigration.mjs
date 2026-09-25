// Kontrollierte Migration der vorhandenen Lead-Demos auf die neuen Vorlagen
// (v2/DEMO-UMBAU.md, Teil 3 "Altbestand"). Nie gesammelt, immer je Seite:
//
//   npm run demo:migration -- --plan              Bestand prüfen, Bericht schreiben
//   npm run demo:migration -- --sichern           Bestand und Zuordnungen sichern
//   npm run demo:migration -- --vorschau <slug>   neue Fassung lokal bauen (nicht öffentlich)
//   npm run demo:migration -- --abschalten        öffentliche Alt-Demos sichern und aus docs/ entfernen
//
// Seit 25.09.2026 werden Lead-Demos nicht mehr veröffentlicht
// (src/oeffentlichkeit.js); --freigeben lehnt ab. Frühere eigene Texte und
// Bilder (data/lead-edits) werden in die lokale Vorschau übernommen.

import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync, cpSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { docsDir, landingPagesDir, siteBaseUrl } from "../src/config.js";
import { ladeManifest, placeIdFuerSlug } from "../src/entwurfsManifest.js";
import { readAllLeads } from "../src/csvImport.js";
import { demoEinstellungen } from "../src/demoEinstellungen.js";
import { veroeffentlichungsHindernisse, baueDemo } from "../v2/integration/demoBau.js";
import { MELDUNG_NICHT_OEFFENTLICH, istFiktivesBeispiel, slugHash, ABGESCHALTET_PFAD, ladeAbgeschaltete } from "../src/oeffentlichkeit.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION_DIR = path.join(landingPagesDir, "migration");
const VORSCHAU_DIR = path.join(REPO, "v2", "output", "leads");

/** Alle Lead-Demos unter docs/ (keine Beispielseiten, keine Assets). */
export function leadOrdner(dir = docsDir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !istFiktivesBeispiel(e.name) && !e.name.startsWith(".") && e.name !== "assets")
    .filter((e) => existsSync(path.join(dir, e.name, "index.html")))
    .map((e) => e.name)
    .sort();
}

function meta(html, name) {
  return new RegExp(`<meta name="${name}" content="([^"]*)"`).exec(html)?.[1] ?? "";
}

/** Bestandsaufnahme je Seite: was ist online, was fehlt für die Migration. */
export function migrationsPlan({ dir = docsDir, manifest = ladeManifest(), leads = readAllLeads() } = {}) {
  return leadOrdner(dir).map((slug) => {
    const html = readFileSync(path.join(dir, slug, "index.html"), "utf-8");
    const eintrag = {
      slug,
      engine: meta(html, "engine") || "unbekannt",
      ausdruck: meta(html, "v2-ausdruck"),
      konzept: meta(html, "demo-art") === "konzept",
      googleNoteImHtml: /auf Google|stimmen-note|leiste-note/.test(html),
    };
    const placeId = placeIdFuerSlug(manifest, slug);
    if (!placeId) return { ...eintrag, migrierbar: false, grund: "Kein Manifest-Eintrag (data/landingpages/entwuerfe.json) – Zuordnung zum Lead fehlt." };
    if (!leads.some((l) => l.placeId === placeId)) return { ...eintrag, placeId, migrierbar: false, grund: "Kein Lead-Datensatz (data/output/*.csv) zu dieser Place ID – Leads neu abrufen (npm start)." };
    const e = demoEinstellungen(slug, { manifest, leads });
    const hindernisse = veroeffentlichungsHindernisse(e);
    return {
      ...eintrag,
      placeId,
      migrierbar: true,
      bereit: hindernisse.length === 0,
      vorlage: e.vorlage.id,
      farbschema: e.farbschema.id,
      eigeneTexte: Boolean(e.slogan.manuell),
      hindernisse,
    };
  });
}

function berichtMarkdown(plan, jetzt) {
  const zeilen = plan.map((p) =>
    `| ${p.slug} | ${p.engine}${p.ausdruck ? `/${p.ausdruck}` : ""}${p.konzept ? " (Konzept)" : ""} | ${p.googleNoteImHtml ? "ja" : "–"} | ${p.migrierbar ? (p.bereit ? "bereit" : `wartet: ${p.hindernisse.join(" ")}`) : `nein: ${p.grund}`} | ${p.vorlage ?? "–"} / ${p.farbschema ?? "–"} |`,
  );
  const n = (f) => plan.filter(f).length;
  return `# Migrationsplan Lead-Demos (${jetzt})

${plan.length} Lead-Demos unter docs/ · migriert (Konzept): ${n((p) => p.konzept)} · mit Google-Note im statischen HTML: ${n((p) => p.googleNoteImHtml)} · migrierbar: ${n((p) => p.migrierbar)} · davon freigabebereit: ${n((p) => p.bereit)} · nicht automatisch migrierbar: ${n((p) => !p.migrierbar)}

| Slug | heute | Google-Note im HTML | Migration | neue Vorlage / Farbschema |
|---|---|---|---|---|
${zeilen.join("\n")}

Lead-Demos werden nicht mehr veröffentlicht. Öffentlicher Altbestand: --abschalten (sichert, entfernt, neutrale 404-Seite).
Neue Fassung je Lead lokal: --vorschau <slug> bzw. im Dashboard „Konzept-Demo lokal bauen“.
`;
}

/* ---------- Altbestand abschalten ---------- */

const SICHERUNG_DIR = path.join(REPO, "data", "sicherung");

/**
 * Neutrale Hinweisseite für GitHub Pages (docs/404.html). Pages liefert sie
 * für jede nicht vorhandene Adresse aus – also auch für jede frühere
 * Lead-Demo-URL und jeden alten QR-Code. Bewusst ohne Restaurantnamen und
 * ohne relative Pfade (die Seite erscheint unter beliebigen Adressen).
 */
export function hinweisSeite({ uebersicht = `${siteBaseUrl}/` } = {}) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Vorschau nicht mehr verfügbar</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f6f3ee; color: #1f1d1a;
         font: 17px/1.6 Georgia, "Times New Roman", serif; }
  main { max-width: 34rem; padding: 32px 24px; }
  h1 { font-size: 1.6rem; line-height: 1.25; margin: 0 0 16px; }
  p { margin: 0 0 14px; }
  .klein { color: #5c564e; font-size: .95rem; }
  a { color: #7a2e12; }
</style>
</head>
<body>
<main>
  <h1>Diese Vorschau ist nicht mehr öffentlich verfügbar.</h1>
  <p>Unter dieser Adresse stand ein unverbindlicher Gestaltungsentwurf unserer Web-Agentur. Es war nie die Website eines Restaurants,
     und die dort gezeigten Gerichte, Preise, Zeiten und Bilder waren Platzhalter.</p>
  <p class="klein">Entwürfe für einzelne Betriebe zeigen wir nur noch persönlich. Fiktive Beispielseiten finden Sie in der
     <a href="${uebersicht}">Übersicht</a>.</p>
</main>
</body>
</html>
`;
}

/**
 * Sichert alle öffentlichen Lead-Demos (nach data/sicherung/, gitignoriert)
 * samt Liste der früheren URLs/QR-Ziele, entfernt sie aus docs/, trägt ihre
 * Slug-Hashes in v2/abgeschaltete-demos.json ein und legt docs/404.html an.
 * Die fiktiven Beispielseiten, assets/ und die Übersicht bleiben unangetastet.
 */
export function schalteAltbestandAb({ dir = docsDir, sicherungDir = SICHERUNG_DIR, abgeschaltetPfad = ABGESCHALTET_PFAD, jetzt = new Date() } = {}) {
  const slugs = leadOrdner(dir);
  const stempel = jetzt.toISOString().replace(/[:.]/g, "-");
  const ziel = path.join(sicherungDir, `oeffentliche-lead-demos-${stempel}`);
  const liste = slugs.map((slug) => {
    const html = readFileSync(path.join(dir, slug, "index.html"), "utf-8");
    return {
      slug,
      url: `${siteBaseUrl}/${slug}/`,
      engine: meta(html, "engine") || "unbekannt",
      ausdruck: meta(html, "v2-ausdruck"),
      googleNoteImHtml: /auf Google|stimmen-note|leiste-note/.test(html),
      dateien: readdirSync(path.join(dir, slug), { recursive: true }).map(String).sort(),
    };
  });
  if (slugs.length) {
    mkdirSync(ziel, { recursive: true });
    for (const slug of slugs) cpSync(path.join(dir, slug), path.join(ziel, "docs", slug), { recursive: true });
    writeFileSync(path.join(ziel, "liste.json"), `${JSON.stringify({ gesichertAm: jetzt.toISOString(), anzahl: slugs.length, demos: liste }, null, 2)}\n`);
    // Erst nach vollständiger Sicherung löschen – und nur, was gesichert ist.
    for (const slug of slugs) {
      if (!existsSync(path.join(ziel, "docs", slug, "index.html"))) throw new Error(`Sicherung von ${slug} unvollständig – nichts gelöscht.`);
    }
    for (const slug of slugs) rmSync(path.join(dir, slug), { recursive: true, force: true });
  }
  const bisher = ladeAbgeschaltete(abgeschaltetPfad);
  const hashes = [...new Set([...(bisher.slugHashes ?? []), ...slugs.map(slugHash)])].sort();
  writeFileSync(abgeschaltetPfad, `${JSON.stringify({
    hinweis: "SHA-256 der Slugs früher öffentlicher Lead-Demos (src/oeffentlichkeit.js). Namen stehen bewusst nicht im öffentlichen Repo; die Klartext-Liste liegt in der lokalen Sicherung unter data/sicherung/.",
    abgeschaltetAm: slugs.length ? jetzt.toISOString().slice(0, 10) : bisher.abgeschaltetAm ?? "",
    slugHashes: hashes,
  }, null, 2)}\n`);
  writeFileSync(path.join(dir, "404.html"), hinweisSeite());
  return { anzahl: slugs.length, sicherung: slugs.length ? ziel : "", liste };
}

async function main(argv) {
  const jetzt = new Date().toISOString();
  const [befehl, slug] = argv;
  if (befehl === "--plan") {
    const plan = migrationsPlan();
    mkdirSync(MIGRATION_DIR, { recursive: true });
    const datei = path.join(MIGRATION_DIR, `plan-${jetzt.slice(0, 10)}.md`);
    writeFileSync(datei, berichtMarkdown(plan, jetzt));
    writeFileSync(datei.replace(/\.md$/, ".json"), JSON.stringify(plan, null, 2));
    console.log(berichtMarkdown(plan, jetzt));
    console.log(`Bericht: ${path.relative(REPO, datei)}`);
    return;
  }
  if (befehl === "--sichern") {
    const ziel = path.join(MIGRATION_DIR, `sicherung-${jetzt.replace(/[:.]/g, "-")}`);
    mkdirSync(ziel, { recursive: true });
    for (const s of leadOrdner()) cpSync(path.join(docsDir, s), path.join(ziel, "docs", s), { recursive: true });
    for (const d of ["data/landingpages/entwuerfe.json", "data/kuechen.json", "data/stimmungen.json", "data/lead-edits"]) {
      const q = path.join(REPO, d);
      if (existsSync(q)) cpSync(q, path.join(ziel, d), { recursive: true });
    }
    console.log(`Gesichert: ${leadOrdner().length} Lead-Demos und die Zuordnungen → ${path.relative(REPO, ziel)}`);
    return;
  }
  if (befehl === "--vorschau" && slug) {
    const { ordner } = await baueDemo(slug, { zielDir: VORSCHAU_DIR });
    console.log(`Vorschau (nicht öffentlich): ${path.relative(REPO, ordner)}/index.html – im Dashboard unter /v2/leads/${slug}/`);
    return;
  }
  if (befehl === "--abschalten") {
    const { anzahl, sicherung } = schalteAltbestandAb();
    console.log(anzahl
      ? `${anzahl} öffentliche Lead-Demos gesichert (${path.relative(REPO, sicherung)}, mit liste.json) und aus docs/ entfernt. docs/404.html zeigt unter jeder früheren Adresse den neutralen Hinweis.\nNoch nicht online: docs/ committen und nach main pushen. In der Git-Historie, im Pages-Cache (bis ca. 10 Min.) und in fremden Kopien bleiben die alten Seiten erhalten.`
      : "Keine öffentlichen Lead-Demos unter docs/ – nichts zu tun. docs/404.html ist aktuell.");
    return;
  }
  if (befehl === "--freigeben") {
    console.log(MELDUNG_NICHT_OEFFENTLICH);
    process.exitCode = 1;
    return;
  }
  console.log("Aufruf: npm run demo:migration -- --plan | --sichern | --vorschau <slug> | --abschalten");
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((fehler) => {
    console.error(fehler.message);
    process.exitCode = 1;
  });
}
