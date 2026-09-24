import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { richteTestLeadsEin, PFADE } from "./hilfen/testLead.js";
import { speichereDemoEinstellungen, demoEinstellungen } from "../src/demoEinstellungen.js";
import { baueDemo, veroeffentlichungsHindernisse } from "../v2/integration/demoBau.js";
import { baueUndSchreibeEinzelnenEntwurf } from "../src/publishSite.js";
import { ladeManifest } from "../src/entwurfsManifest.js";

const BAYER = { slug: "__test-demo-bayer-0abc123", placeId: "ChIJtestDemoBayer", name: "Gasthof Zum Hirschen", adresse: "Kirchplatz 7, 84453 Mühldorf am Inn, Deutschland", telefon: "08631 99999", ort: "Mühldorf am Inn", rating: 4.3, anzahlBewertungen: 287 };
const SUSHI = { slug: "__test-demo-sushi-0def456", placeId: "ChIJtestDemoSushi", name: "Sushi Kaito", adresse: "Bahnhofstr. 2, 84503 Altötting, Deutschland", telefon: "08671 12121", ort: "Altötting", rating: 4.9, anzahlBewertungen: 1203 };
const ZIEL = mkdtempSync(path.join(tmpdir(), "demo-bau-"));
let umgebung;
before(() => {
  umgebung = richteTestLeadsEin([BAYER, SUSHI], "__test-demo-bau");
});
after(() => {
  umgebung.aufraeumen();
  rmSync(ZIEL, { recursive: true, force: true });
});

const sichtbar = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

async function bau(slug) {
  const { ordner } = await baueDemo(slug, { zielDir: ZIEL, offline: true });
  return readFileSync(path.join(ordner, "index.html"), "utf-8");
}

test("Bayerisch: neue Vorlage (Wirtshaus-Standard: gesellig, Bühne), tatsächlicher Name, Konzept-Kennzeichnung", async () => {
  const html = await bau(BAYER.slug);
  assert.match(html, /<meta name="v2-ausdruck" content="gesellig">/);
  assert.match(html, /<meta name="v2-hero" content="buehne">/);
  assert.match(html, /<meta name="demo-art" content="konzept">/);
  assert.match(html, /<meta name="v2-designsystem" content="bayerisch--/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  const text = sichtbar(html);
  assert.match(text, /Gasthof Zum Hirschen/);
  assert.match(text, /Konzept-Demo – unverbindlicher Entwurf, nicht die offizielle Website von Gasthof Zum Hirschen/);
  assert.match(text, /Einkehren in Mühldorf am Inn/, "Slogan-Standard der Vorlage");
});

test("keine erfundenen Öffnungszeiten, keine Haus-Geschichte, Karte nur als gekennzeichnete Musterkarte", async () => {
  const text = sichtbar(await bau(BAYER.slug));
  assert.doesNotMatch(text, /Montag – Donnerstag|11:30 – 14:00|Freitag – Samstag/);
  assert.match(text, /Ihre Öffnungszeiten tragen Sie selbst ein/);
  assert.doesNotMatch(text, /Seit Generationen|Metzger im Ort|Biergarten/);
  assert.match(text, /Musterkarte/);
  assert.match(text, /nicht die Karte von Gasthof Zum Hirschen/);
});

test("Google-Inhalte nicht im statischen HTML: keine Note, keine Anzahl, unbestätigte Adresse/Telefon fehlen; Maps-Link über Place ID", async () => {
  const html = await bau(BAYER.slug);
  const text = sichtbar(html);
  assert.doesNotMatch(text, /(?<!\d)4,3(?!\d)|(?<!\d)287(?!\d)|auf Google|Bewertungen/);
  assert.doesNotMatch(html, /Kirchplatz 7|08631 99999/, "unbestätigt: nicht auf der Demo");
  assert.match(html, /query_place_id=ChIJtestDemoBayer/);
  assert.match(text, /Auf Google Maps ansehen/);
});

test("ohne eigene Fotos: nur Konzeptbilder der Küchenrichtung, gekennzeichnet", async () => {
  const html = await bau(BAYER.slug);
  assert.match(html, /class="buehne-herkunft">Konzeptbild</);
  const bericht = JSON.parse(readFileSync(path.join(ZIEL, BAYER.slug, "bericht.json"), "utf-8"));
  assert.match(JSON.stringify(bericht.medien), /konzept:beispiel-bayerisch/);
  assert.ok(existsSync(path.join(ZIEL, BAYER.slug, "medien", "hero.jpg")));
});

test("andere Küche mit anderer Bildsprache: Japanisch → editorial (Titelblatt)", async () => {
  const html = await bau(SUSHI.slug);
  assert.match(html, /<meta name="v2-ausdruck" content="editorial">/);
  assert.match(html, /<meta name="v2-hero" content="titelblatt">/);
  assert.match(sichtbar(html), /Sushi Kaito/);
  assert.doesNotMatch(sichtbar(html), /(?<!\d)4,9(?!\d)|1\.203|auf Google/);
});

test("Slogan, Farbschema und bestätigte Angaben landen in der Demo und überstehen jede Regeneration", async () => {
  speichereDemoEinstellungen(BAYER.slug, {
    slogan: "Wo Mühldorf zu Mittag isst",
    farbschema: "biergarten",
    name: { wert: "Gasthof zum Hirschen", notiz: "Impressum" },
    adresse: { wert: "Kirchplatz 7, 84453 Mühldorf am Inn" },
    telefon: { wert: "08631 99999" },
  });
  for (let i = 0; i < 2; i += 1) {
    const html = await bau(BAYER.slug);
    assert.match(html, /<meta name="v2-designsystem" content="bayerisch--biergarten">/);
    const text = sichtbar(html);
    assert.match(text, /Wo Mühldorf zu Mittag isst/);
    assert.doesNotMatch(text, /Einkehren in Mühldorf/);
    assert.match(text, /Gasthof zum Hirschen/);
    assert.match(text, /Kirchplatz 7/);
    assert.match(html, /tel:0863199999/);
  }
  const d = demoEinstellungen(BAYER.slug);
  assert.equal(d.slogan.wert, "Wo Mühldorf zu Mittag isst");
  assert.equal(d.farbschema.id, "biergarten");
});

test("Veröffentlichen nach docs/ verlangt einen bestätigten Namen", () => {
  const e = demoEinstellungen(SUSHI.slug);
  assert.deepEqual(veroeffentlichungsHindernisse(e).length, 1);
  assert.equal(veroeffentlichungsHindernisse(demoEinstellungen(BAYER.slug)).length, 0);
});

test("Slug und QR-Ziel bleiben stabil, auch wenn Google den Namen ändert; ein fehlerhafter Bau lässt die alte Fassung stehen", async () => {
  const zielordner = mkdtempSync(path.join(tmpdir(), "demo-docs-"));
  try {
    mkdirSync(path.join(zielordner, "assets", "fonts"), { recursive: true });
    writeFileSync(path.join(zielordner, "assets", "fonts", "fonts.json"), "[]");
    const erst = await baueUndSchreibeEinzelnenEntwurf(BAYER.slug, { zielordner });
    assert.equal(erst.ordner, path.join(zielordner, BAYER.slug));
    // Google liefert jetzt einen anderen Namen – der Slug im Manifest bleibt.
    const csv = path.join(PFADE.output, "__test-demo-bau.csv");
    writeFileSync(csv, readFileSync(csv, "utf-8").replace("Gasthof Zum Hirschen", "Hirschenwirt Mühldorf"));
    const zweit = await baueUndSchreibeEinzelnenEntwurf(BAYER.slug, { zielordner });
    assert.equal(zweit.slug, BAYER.slug);
    assert.equal(ladeManifest()[BAYER.placeId].slug, BAYER.slug);
    const html = readFileSync(path.join(zielordner, BAYER.slug, "index.html"), "utf-8");
    assert.match(sichtbar(html), /Gasthof zum Hirschen/, "der bestätigte Name gilt, nicht der neue Google-Name");
    // Fehlerhafter Bau (unbekannter Lead) – die bestehende Fassung bleibt unangetastet.
    await assert.rejects(() => baueUndSchreibeEinzelnenEntwurf("__gibt-es-nicht", { zielordner }), /Kein Lead/);
    assert.equal(readFileSync(path.join(zielordner, BAYER.slug, "index.html"), "utf-8"), html);
  } finally {
    rmSync(zielordner, { recursive: true, force: true });
  }
});

test("übernommene Texte aus der Textgenerierung (Headline, Schlagzeile) haben auch in der Konzept-Demo Vorrang", async () => {
  const { saveLeadEdits, loadLeadEdits } = await import("../src/leadEdits.js");
  const vorher = loadLeadEdits(SUSHI.slug);
  saveLeadEdits(SUSHI.slug, { ...vorher, texte: { ...(vorher.texte ?? {}), headline: "Kaito am Bahnhof", schlagzeile: "Nigiri, die man vom Tresen aus entstehen sieht." } });
  const text = sichtbar(await bau(SUSHI.slug));
  assert.match(text, /Kaito am Bahnhof/);
  assert.match(text, /Nigiri, die man vom Tresen aus entstehen sieht\./);
  assert.doesNotMatch(text, /Ein Entwurf, wie sich Sushi Kaito/);
});
