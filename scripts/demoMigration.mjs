// Kontrollierte Migration der vorhandenen Lead-Demos auf die neuen Vorlagen
// (v2/DEMO-UMBAU.md, Teil 3 "Altbestand"). Nie gesammelt, immer je Seite:
//
//   npm run demo:migration -- --plan              Bestand prüfen, Bericht schreiben
//   npm run demo:migration -- --sichern           Bestand und Zuordnungen sichern
//   npm run demo:migration -- --vorschau <slug>   neue Fassung lokal bauen (nicht öffentlich)
//   npm run demo:migration -- --freigeben <slug>  veröffentlichen, bis online nachgewiesen
//
// Slug und URL bleiben gleich (Manifest) – QR-Codes und geteilte Links gelten
// weiter. Frühere eigene Texte und Bilder (data/lead-edits) werden übernommen.

import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync, cpSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { docsDir, landingPagesDir } from "../src/config.js";
import { ladeManifest, placeIdFuerSlug } from "../src/entwurfsManifest.js";
import { readAllLeads } from "../src/csvImport.js";
import { demoEinstellungen } from "../src/demoEinstellungen.js";
import { veroeffentlichungsHindernisse, baueDemo } from "../v2/integration/demoBau.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION_DIR = path.join(landingPagesDir, "migration");
const VORSCHAU_DIR = path.join(REPO, "v2", "output", "leads");

/** Alle Lead-Demos unter docs/ (keine Beispielseiten, keine Assets). */
export function leadOrdner(dir = docsDir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("beispiel-") && !e.name.startsWith(".") && e.name !== "assets")
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

Ablauf je Seite: --vorschau <slug> ansehen → im Dashboard Name (und ggf. Adresse/Telefon) bestätigen → --freigeben <slug>.
Erst eine Pilot-Seite, dann je Küchentyp eine, dann der Rest – nie gesammelt.
`;
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
  if (befehl === "--freigeben" && slug) {
    const { starteVeroeffentlichung } = await import("../src/veroeffentlichung.js");
    console.log(`Veröffentliche ${slug} … (wartet auf den Nachweis, dass GitHub Pages die neue Fassung ausliefert)`);
    const ende = await starteVeroeffentlichung(slug).fertig;
    console.log(ende.zustand === "online" ? `✅ online: ${ende.online.url}` : `❌ ${ende.fehler}`);
    if (ende.zustand !== "online") process.exitCode = 1;
    return;
  }
  console.log("Aufruf: npm run demo:migration -- --plan | --sichern | --vorschau <slug> | --freigeben <slug>");
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((fehler) => {
    console.error(fehler.message);
    process.exitCode = 1;
  });
}
