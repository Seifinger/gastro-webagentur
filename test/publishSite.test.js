import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, leadFuerSlug, baueEintraege, schreibeSeiten } from "../src/buildSite.js";
import { baueUndSchreibeEinzelnenEntwurf } from "../src/publishSite.js";
import { uploadsDir } from "../src/bildUpload.js";
import { saveLeadEdits, loadLeadEdits } from "../src/leadEdits.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, "..", "data", "output");
const landingPagesDir = path.join(__dirname, "..", "data", "landingpages");
const manifestPath = path.join(landingPagesDir, "entwuerfe.json");
const leadEditsDir = path.join(__dirname, "..", "data", "lead-edits");
const scratchDocsDir = path.join(__dirname, "..", "data", "test-docs-scratch");

const CSV_HEADER =
  "name,adresse,telefon,website,hatWebsite,score,priorität,websiteErreichbar,hatBestellfunktion,hatReservierungsfunktion,mobilFreundlich,wirktVeraltet,rating,anzahlBewertungen,placeId,ort,fetchedAt";

function csvZeile(felder) {
  return Object.values(felder)
    .map((wert) => (/[",\n]/.test(String(wert)) ? `"${String(wert).replace(/"/g, '""')}"` : wert))
    .join(",");
}

function richteLeadEin(dateiSlug, placeId, name) {
  mkdirSync(outputDir, { recursive: true });
  mkdirSync(landingPagesDir, { recursive: true });

  const csv = [
    CSV_HEADER,
    csvZeile({
      name,
      adresse: "Stadtpl. 1, 84453 Mühldorf am Inn, Germany",
      telefon: "08631 12345",
      website: "",
      hatWebsite: "false",
      score: "90",
      priorität: "Sehr hoch",
      websiteErreichbar: "",
      hatBestellfunktion: "",
      hatReservierungsfunktion: "",
      mobilFreundlich: "",
      wirktVeraltet: "",
      rating: "4.5",
      anzahlBewertungen: "100",
      placeId,
      ort: "Mühldorf am Inn",
      fetchedAt: new Date().toISOString(),
    }),
  ].join("\n");
  writeFileSync(path.join(outputDir, `${dateiSlug}.csv`), csv, "utf-8");
}

function schreibeManifest(eintraege) {
  mkdirSync(landingPagesDir, { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(eintraege, null, 2), "utf-8");
}

function raeumeAuf(dateiSlug, placeId) {
  rmSync(path.join(outputDir, `${dateiSlug}.csv`), { force: true });
  rmSync(path.join(leadEditsDir, `${dateiSlug}.json`), { force: true });
}

/* ------------------------------ parseArgs ------------------------------ */

test("parseArgs erkennt --only", () => {
  const args = parseArgs(["--only", "gasthof-zur-post-0mlnj1b", "--region", "Mühldorf"]);
  assert.equal(args.only, "gasthof-zur-post-0mlnj1b");
  assert.equal(args.region, "Mühldorf");
});

test("parseArgs ohne --only lässt only bei null", () => {
  assert.equal(parseArgs(["--region", "Mühldorf"]).only, null);
});

/* ----------------------------- leadFuerSlug ----------------------------- */

test("leadFuerSlug findet den Lead über die Manifest-Zuordnung", (t) => {
  const placeId = "ChIJleadfuerslug1";
  richteLeadEin("test-leadfuerslug-1", placeId, "Gasthof Zur Post");
  schreibeManifest({ [placeId]: "gasthof-zur-post-abc1234" });
  t.after(() => raeumeAuf("test-leadfuerslug-1", placeId));

  const lead = leadFuerSlug("gasthof-zur-post-abc1234");
  assert.equal(lead?.name, "Gasthof Zur Post");
  assert.equal(lead?.placeId, placeId);
});

test("leadFuerSlug gibt null für einen unbekannten Slug zurück", (t) => {
  schreibeManifest({});
  t.after(() => rmSync(manifestPath, { force: true }));

  assert.equal(leadFuerSlug("gibt-es-nicht-0000000"), null);
});

test("leadFuerSlug gibt null zurück, wenn noch kein Manifest existiert", () => {
  rmSync(manifestPath, { force: true });
  assert.equal(leadFuerSlug("irgendein-slug"), null);
});

/* ------------- Granularität: nur der Ziel-Slug wird angefasst ------------- */

test("schreibeSeiten für einen einzelnen Eintrag lässt andere Ordner im Zielverzeichnis unberührt", () => {
  rmSync(scratchDocsDir, { recursive: true, force: true });
  mkdirSync(scratchDocsDir, { recursive: true });

  // Zwei "fremde" Entwürfe simulieren, wie sie ein voller Publish-Lauf
  // hinterlassen hätte.
  for (const fremderSlug of ["fremder-entwurf-a", "fremder-entwurf-b"]) {
    mkdirSync(path.join(scratchDocsDir, fremderSlug), { recursive: true });
    writeFileSync(
      path.join(scratchDocsDir, fremderSlug, "index.html"),
      `<html><body>unveränderter Inhalt von ${fremderSlug}</body></html>`,
      "utf-8",
    );
  }
  const inhaltVorher = {
    "fremder-entwurf-a": readFileSync(path.join(scratchDocsDir, "fremder-entwurf-a", "index.html"), "utf-8"),
    "fremder-entwurf-b": readFileSync(path.join(scratchDocsDir, "fremder-entwurf-b", "index.html"), "utf-8"),
  };

  const lead = { name: "Gasthof Zur Post", placeId: "ChIJgranular1", ort: "Mühldorf am Inn" };
  const [entry] = baueEintraege([lead], "bayerisch");

  schreibeSeiten([entry], scratchDocsDir, { veroeffentlicht: true });

  // Der Ziel-Ordner wurde neu geschrieben ...
  const zielDatei = path.join(scratchDocsDir, entry.slug, "index.html");
  assert.ok(existsSync(zielDatei));
  assert.match(readFileSync(zielDatei, "utf-8"), /Gasthof Zur Post/);

  // ... die beiden anderen Ordner sind byteidentisch zu vorher.
  for (const fremderSlug of ["fremder-entwurf-a", "fremder-entwurf-b"]) {
    const jetzt = readFileSync(path.join(scratchDocsDir, fremderSlug, "index.html"), "utf-8");
    assert.equal(jetzt, inhaltVorher[fremderSlug], `${fremderSlug} wurde verändert`);
  }

  // Und es kam kein weiterer, unerwarteter Ordner hinzu.
  const ordnerDanach = readdirSync(scratchDocsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  assert.deepEqual(ordnerDanach, ["fremder-entwurf-a", "fremder-entwurf-b", entry.slug].sort());
});

/* ------------------ editUebersteuerung erreicht den Build ------------------ */

test("die im --only-Build verwendete editUebersteuerung überschreibt die Hero-Texte", (t) => {
  const placeId = "ChIJgranularedit1";
  richteLeadEin("test-granular-edit", placeId, "Café Sonnenschein");
  t.after(() => raeumeAuf("test-granular-edit", placeId));

  const lead = { name: "Café Sonnenschein", placeId, ort: "Mühldorf am Inn" };
  const [entry] = baueEintraege([lead], "cafe");
  saveLeadEdits(entry.slug, { texte: { headline: "Café Sonne" } });
  t.after(() => rmSync(path.join(leadEditsDir, `${entry.slug}.json`), { force: true }));

  rmSync(scratchDocsDir, { recursive: true, force: true });
  mkdirSync(scratchDocsDir, { recursive: true });

  const entryMitEdit = { ...entry, editUebersteuerung: loadLeadEdits(entry.slug) };
  schreibeSeiten([entryMitEdit], scratchDocsDir, { veroeffentlicht: true });

  const html = readFileSync(path.join(scratchDocsDir, entry.slug, "index.html"), "utf-8");
  assert.match(html, /<h1>Café Sonne<\/h1>/);
});

/* --------------- baueUndSchreibeEinzelnenEntwurf (echter --only-Build) --------------- */

test("baueUndSchreibeEinzelnenEntwurf baut nur den Ziel-Slug in zielordner und respektiert editUebersteuerung", async (t) => {
  const placeId = "ChIJgranularvoll1";
  richteLeadEin("test-granular-voll", placeId, "Pizzeria Vesuvio");
  t.after(() => raeumeAuf("test-granular-voll", placeId));

  // Slug vorab so ermitteln, wie baueUndSchreibeEinzelnenEntwurf ihn intern
  // auch errechnet (deterministisch über placeId/Name) – Grundlage, um
  // Manifest und lead-edits unter demselben Namen anzulegen.
  const [{ slug }] = baueEintraege(
    [{ name: "Pizzeria Vesuvio", placeId, ort: "Mühldorf am Inn" }],
    "italienisch",
  );
  schreibeManifest({ [placeId]: slug });
  saveLeadEdits(slug, { texte: { headline: "Pizzeria Vesuvio Neu" } });
  t.after(() => rmSync(path.join(leadEditsDir, `${slug}.json`), { force: true }));

  rmSync(scratchDocsDir, { recursive: true, force: true });
  mkdirSync(path.join(scratchDocsDir, "assets", "fonts"), { recursive: true });
  // Leeres Font-Manifest vortäuschen: ladeSchriften() sieht ein vollständiges
  // Manifest (eine leere Liste ist immer "vollständig") und lädt nichts aus
  // dem Netz nach – der Test läuft damit offline.
  writeFileSync(path.join(scratchDocsDir, "assets", "fonts", "fonts.json"), "[]", "utf-8");
  mkdirSync(path.join(scratchDocsDir, "ein-anderer-entwurf"), { recursive: true });
  writeFileSync(path.join(scratchDocsDir, "ein-anderer-entwurf", "index.html"), "unveraendert", "utf-8");

  const ergebnis = await baueUndSchreibeEinzelnenEntwurf(slug, { zielordner: scratchDocsDir });

  assert.equal(ergebnis.slug, slug);
  assert.equal(ergebnis.ordner, path.join(scratchDocsDir, slug));

  const html = readFileSync(path.join(scratchDocsDir, slug, "index.html"), "utf-8");
  assert.match(html, /Pizzeria Vesuvio Neu/);

  assert.equal(
    readFileSync(path.join(scratchDocsDir, "ein-anderer-entwurf", "index.html"), "utf-8"),
    "unveraendert",
  );
});

test("baueUndSchreibeEinzelnenEntwurf kopiert ein eigenes Foto mit und schreibt den Pfad relativ um", async (t) => {
  const placeId = "ChIJgranularbild1";
  richteLeadEin("test-granular-bild", placeId, "Gasthaus Zum Löwen");
  t.after(() => raeumeAuf("test-granular-bild", placeId));

  const [{ slug }] = baueEintraege(
    [{ name: "Gasthaus Zum Löwen", placeId, ort: "Mühldorf am Inn" }],
    "bayerisch",
  );
  schreibeManifest({ [placeId]: slug });

  // Ein eigenes Foto simulieren, wie es bildUpload.js unter public/uploads/
  // ablegen würde – die Bilddaten selbst sind für den Test irrelevant, nur
  // dass die Datei existiert und danach byteidentisch woanders liegt.
  mkdirSync(path.join(uploadsDir, slug), { recursive: true });
  const bildInhalt = Buffer.from("fake-jpeg-bytes");
  writeFileSync(path.join(uploadsDir, slug, "hero.jpg"), bildInhalt);
  saveLeadEdits(slug, { bilder: { hero: `/uploads/${slug}/hero.jpg` } });
  t.after(() => {
    rmSync(path.join(leadEditsDir, `${slug}.json`), { force: true });
    rmSync(path.join(uploadsDir, slug), { recursive: true, force: true });
  });

  rmSync(scratchDocsDir, { recursive: true, force: true });
  mkdirSync(path.join(scratchDocsDir, "assets", "fonts"), { recursive: true });
  writeFileSync(path.join(scratchDocsDir, "assets", "fonts", "fonts.json"), "[]", "utf-8");

  await baueUndSchreibeEinzelnenEntwurf(slug, { zielordner: scratchDocsDir });

  // Die Referenz im HTML zeigt relativ in den Entwurfsordner selbst – nicht
  // mehr auf den lokalen, gitignorten /uploads/-Pfad, den es auf GitHub
  // Pages gar nicht gibt.
  const html = readFileSync(path.join(scratchDocsDir, slug, "index.html"), "utf-8");
  assert.match(html, /<img src="\.\/bilder\/hero\.jpg" alt="Gasthaus Zum Löwen">/);
  assert.ok(!html.includes("/uploads/"));

  const kopie = path.join(scratchDocsDir, slug, "bilder", "hero.jpg");
  assert.ok(existsSync(kopie));
  assert.deepEqual(readFileSync(kopie), bildInhalt);

  // Die Quelle unter public/uploads/ bleibt unverändert (nicht verschoben).
  assert.deepEqual(readFileSync(path.join(uploadsDir, slug, "hero.jpg")), bildInhalt);
});

test("fehlt die hochgeladene Datei lokal, bricht der Build nicht ab und behält den alten Pfad", async (t) => {
  const placeId = "ChIJgranularbildfehlt1";
  richteLeadEin("test-granular-bild-fehlt", placeId, "Gasthaus Ohne Foto");
  t.after(() => raeumeAuf("test-granular-bild-fehlt", placeId));

  const [{ slug }] = baueEintraege(
    [{ name: "Gasthaus Ohne Foto", placeId, ort: "Mühldorf am Inn" }],
    "bayerisch",
  );
  schreibeManifest({ [placeId]: slug });
  // Eintrag verweist auf eine Datei, die es unter public/uploads/ gar nicht
  // (mehr) gibt – z. B. manuell gelöscht.
  saveLeadEdits(slug, { bilder: { hero: `/uploads/${slug}/hero.jpg` } });
  t.after(() => rmSync(path.join(leadEditsDir, `${slug}.json`), { force: true }));

  rmSync(scratchDocsDir, { recursive: true, force: true });
  mkdirSync(path.join(scratchDocsDir, "assets", "fonts"), { recursive: true });
  writeFileSync(path.join(scratchDocsDir, "assets", "fonts", "fonts.json"), "[]", "utf-8");

  await assert.doesNotReject(baueUndSchreibeEinzelnenEntwurf(slug, { zielordner: scratchDocsDir }));

  const html = readFileSync(path.join(scratchDocsDir, slug, "index.html"), "utf-8");
  assert.match(html, new RegExp(`/uploads/${slug}/hero\\.jpg`));
});

test("baueUndSchreibeEinzelnenEntwurf wirft eine verständliche Meldung für einen unbekannten Slug", async () => {
  schreibeManifest({});
  await assert.rejects(
    baueUndSchreibeEinzelnenEntwurf("gibt-es-nicht-0000000", { zielordner: scratchDocsDir }),
    /Kein Lead für Slug/,
  );
});

after(() => {
  rmSync(scratchDocsDir, { recursive: true, force: true });
});
