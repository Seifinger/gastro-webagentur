import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bereinigeJpeg, bereinigePng, bereinigeWebp, entferneBildMetadaten, jpegAusrichtung, mp4HatStandort } from "../src/bildMetadaten.js";
import { bildMasse } from "../src/bildUpload.js";
import { png } from "./hilfen/bilder.js";

// Befund aus dem Audit (25.09.2026): Kundenfotos wurden Byte für Byte
// gespeichert und in die Kundenseite kopiert – samt Aufnahmeort (GPS),
// Kamera-Seriennummer und Namen. Synthetische Metadaten, echtes Grundbild.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GRUNDBILD = readFileSync(path.join(__dirname, "..", "v2", "output", "vergleich", "cafe--third-wave--v2-mobil.jpg"));

function segment(marke, nutzlast) {
  const kopf = Buffer.alloc(4);
  kopf.writeUInt16BE(0xff00 | marke, 0);
  kopf.writeUInt16BE(nutzlast.length + 2, 2);
  return Buffer.concat([kopf, nutzlast]);
}

/** Exif mit Ausrichtung, Kameramodell und GPS-Block (Little Endian, wie viele Telefone). */
function exif(ausrichtung) {
  const t = Buffer.alloc(160);
  t.write("II", 0, "latin1");
  t.writeUInt16LE(42, 2);
  t.writeUInt32LE(8, 4);
  t.writeUInt16LE(3, 8); // drei Einträge
  const eintrag = (n, tag, typ, anzahl, wert) => {
    const o = 10 + n * 12;
    t.writeUInt16LE(tag, o);
    t.writeUInt16LE(typ, o + 2);
    t.writeUInt32LE(anzahl, o + 4);
    t.writeUInt32LE(wert, o + 8);
  };
  eintrag(0, 0x010f, 2, 19, 60); // Make → Text bei 60
  eintrag(1, 0x0112, 3, 1, ausrichtung); // Orientation
  eintrag(2, 0x8825, 4, 1, 100); // GPS-IFD bei 100
  t.writeUInt32LE(0, 46);
  t.write("Testkamera-SN-4711\0", 60, "latin1");
  t.writeUInt16LE(1, 100);
  t.writeUInt16LE(0x0001, 102); // GPSLatitudeRef
  t.writeUInt16LE(2, 104);
  t.writeUInt32LE(2, 106);
  t.write("N\0", 110, "latin1");
  t.write("GPS-48.1372-11.5756", 120, "latin1");
  return Buffer.concat([Buffer.from("Exif\0\0", "latin1"), t]);
}

function jpegMitMetadaten(ausrichtung = 6) {
  const app0Ende = 2 + 2 + GRUNDBILD.readUInt16BE(4);
  return Buffer.concat([
    GRUNDBILD.subarray(0, app0Ende),
    segment(0xe1, exif(ausrichtung)),
    segment(0xe1, Buffer.from("http://ns.adobe.com/xap/1.0/\0<x:xmpmeta><dc:creator>Max Mustermann</dc:creator></x:xmpmeta>", "latin1")),
    segment(0xed, Buffer.from("Photoshop 3.0\x008BIM\x04\x04 Autor: Max Mustermann", "latin1")),
    segment(0xfe, Buffer.from("Kommentar: privat", "latin1")),
    GRUNDBILD.subarray(app0Ende),
    Buffer.from("MPF-Zusatzbild-mit-GPS-48.1372", "latin1"),
  ]);
}

const PRIVAT = /Testkamera|GPS-48|Mustermann|Photoshop|Kommentar|Zusatzbild/;

test("JPEG: Aufnahmeort, Kamera, Namen und Zusatzbilder fallen weg, Bild und Ausrichtung bleiben", () => {
  const roh = jpegMitMetadaten(6);
  assert.match(roh.toString("latin1"), PRIVAT, "Voraussetzung: Metadaten stehen drin");
  const sauber = bereinigeJpeg(roh);
  assert.doesNotMatch(sauber.toString("latin1"), PRIVAT);
  assert.match(sauber.toString("latin1"), /ICC_PROFILE/, "Farbprofil bleibt");
  assert.deepEqual(bildMasse(sauber), bildMasse(GRUNDBILD));
  assert.equal(jpegAusrichtung(sauber), 6, "Hochkant-Fotos bleiben hochkant");
  assert.equal(sauber.readUInt16BE(sauber.length - 2), 0xffd9, "endet mit EOI");
  // Ohne Metadaten und ohne Drehung ist das Ergebnis das Grundbild selbst.
  assert.deepEqual(bereinigeJpeg(GRUNDBILD), GRUNDBILD);
  assert.equal(jpegAusrichtung(bereinigeJpeg(jpegMitMetadaten(1))), 1);
});

test("unsauber aufgebaute Bilder werden abgelehnt statt samt Metadaten gespeichert", () => {
  // Kommentar-Segment mit falscher Länge: Browser zeigen so ein Bild trotzdem an.
  const app0Ende = 2 + 2 + GRUNDBILD.readUInt16BE(4);
  const kaputt = Buffer.concat([GRUNDBILD.subarray(0, app0Ende), segment(0xe1, exif(6)), Buffer.from("FFFE0010", "hex"), Buffer.from("Kommentar-privat", "latin1"), GRUNDBILD.subarray(app0Ende)]);
  assert.throws(() => entferneBildMetadaten(kaputt, "image/jpeg"), /nicht sicher/);
  assert.throws(() => entferneBildMetadaten(GRUNDBILD.subarray(0, GRUNDBILD.length - 200), "image/jpeg"), /nicht sicher/, "abgeschnitten, ohne EOI");
  assert.throws(() => entferneBildMetadaten(png(4, 4).subarray(0, 40), "image/png"), /nicht sicher/);
});

test("PNG und WebP: Text- und Exif-Blöcke fallen weg", () => {
  const grund = png(4, 4);
  const block = (typ, daten) => {
    const b = Buffer.alloc(12 + daten.length);
    b.writeUInt32BE(daten.length, 0);
    b.write(typ, 4, "latin1");
    daten.copy(b, 8);
    return b; // Prüfsumme egal – der Block fällt ohnehin weg
  };
  const idatStart = 8 + 25;
  const mit = Buffer.concat([grund.subarray(0, idatStart), block("tEXt", Buffer.from("Author\0Max Mustermann", "latin1")), block("eXIf", Buffer.from("MM\0*GPS-48.1372", "latin1")), grund.subarray(idatStart)]);
  const sauberPng = bereinigePng(mit);
  assert.doesNotMatch(sauberPng.toString("latin1"), PRIVAT);
  assert.deepEqual(sauberPng, grund);

  const chunk = (typ, daten) => {
    const kopf = Buffer.alloc(8);
    kopf.write(typ, 0, "latin1");
    kopf.writeUInt32LE(daten.length, 4);
    return Buffer.concat([kopf, daten, daten.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
  };
  const vp8x = Buffer.alloc(10);
  vp8x[0] = 0x08 | 0x04 | 0x10; // EXIF, XMP, Alpha
  const inhalt = Buffer.concat([chunk("VP8X", vp8x), chunk("VP8L", Buffer.alloc(9, 1)), chunk("EXIF", Buffer.from("II*\0GPS-48.1372", "latin1")), chunk("XMP ", Buffer.from("Max Mustermann", "latin1"))]);
  const riff = Buffer.concat([Buffer.from("RIFF", "latin1"), Buffer.alloc(4), Buffer.from("WEBP", "latin1"), inhalt]);
  riff.writeUInt32LE(riff.length - 8, 4);
  const sauberWebp = bereinigeWebp(riff);
  assert.doesNotMatch(sauberWebp.toString("latin1"), PRIVAT);
  assert.equal(sauberWebp.readUInt32LE(4), sauberWebp.length - 8, "RIFF-Größe stimmt");
  assert.equal(sauberWebp[20] & 0x0c, 0, "Kennbits EXIF/XMP gelöscht");
  assert.equal(sauberWebp[20] & 0x10, 0x10, "Alpha bleibt");
  assert.equal(entferneBildMetadaten(Buffer.from("kein Bild"), "text/plain").toString(), "kein Bild");
});

test("MP4 mit Aufnahmeort wird erkannt, Zufallsbytes in den Bilddaten nicht", () => {
  const box = (typ, daten) => {
    const kopf = Buffer.alloc(8);
    kopf.writeUInt32BE(8 + daten.length, 0);
    kopf.write(typ, 4, "latin1");
    return Buffer.concat([kopf, daten]);
  };
  const ftyp = box("ftyp", Buffer.from("isom\0\0\0\0isom", "latin1"));
  const ort = Buffer.concat([Buffer.from([0xa9, 0x78, 0x79, 0x7a]), Buffer.from("+48.1372+011.5756/", "latin1")]);
  const mitOrt = Buffer.concat([ftyp, box("moov", box("udta", ort)), box("mdat", Buffer.alloc(64))]);
  const ohneOrt = Buffer.concat([ftyp, box("moov", box("udta", Buffer.from("nichts", "latin1"))), box("mdat", ort)]);
  assert.equal(mp4HatStandort(mitOrt), true);
  assert.equal(mp4HatStandort(ohneOrt), false);
});

/* ---------- Upload im Kundenprojekt ---------- */

const kp = await import("../src/kundenProjekt.js");
const { projektAusBeispiel } = await import("../v2/integration/kundenDashboard.js");
const angelegt = [];
after(() => {
  for (const id of angelegt) rmSync(path.join(kp.KUNDEN_DIR, id), { recursive: true, force: true });
});

test("Kundenprojekt speichert Fotos ohne Metadaten und lehnt Videos mit Aufnahmeort ab", () => {
  const p = projektAusBeispiel("italienisch");
  angelegt.push(p.id);
  const hoch = jpegMitMetadaten(6);
  // Das Grundbild ist 234 px breit – das reicht für den Logo-Platz (ab 160 px).
  const { projekt } = kp.aendereProjekt(p.id, undefined, (x, i) => kp.legeMediumVor(x, "logo", hoch, i));
  const gespeichert = readFileSync(path.join(kp.KUNDEN_DIR, p.id, "medien", projekt.medien.logo.vorschlag.datei));
  assert.doesNotMatch(gespeichert.toString("latin1"), PRIVAT);
  assert.equal(jpegAusrichtung(gespeichert), 6);
  assert.equal(projekt.medien.logo.vorschlag.bytes, gespeichert.length);

  const ftyp = Buffer.from("\0\0\0\x14ftypisom\0\0\0\0isom", "latin1");
  const moov = Buffer.concat([Buffer.from("\0\0\0\x1amoov", "latin1"), Buffer.from([0xa9, 0x78, 0x79, 0x7a]), Buffer.from("+48.1+011.5/", "latin1"), Buffer.alloc(2)]);
  assert.throws(() => kp.aendereProjekt(p.id, undefined, (x, i) => kp.legeMediumVor(x, "heroVideo", Buffer.concat([ftyp, moov]), i)), /Aufnahmeort/);
});
