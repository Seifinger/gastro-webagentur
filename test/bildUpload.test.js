import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handler } from "../src/dashboardServer.js";
import { uploadsDir, bildMasse, parseMultipart } from "../src/bildUpload.js";
import { loadLeadEdits } from "../src/leadEdits.js";
// Echtes PNG (vollständig bis IEND): Beim Speichern werden Metadaten
// entfernt, dafür muss die Datei von Anfang bis Ende lesbar sein.
import { png } from "./hilfen/bilder.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const leadEditsDir = path.join(__dirname, "..", "data", "lead-edits");

// Ein JPEG, das nur aus Kopfdaten besteht: mehr als das SOF0-Segment liest
// bildMasse ohnehin nicht, und ein echtes Foto im Repository wäre nur Ballast.
function jpeg(breite, hoehe) {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    Buffer.from([
      0xff, 0xc0, 0x00, 0x11, 0x08,
      hoehe >> 8, hoehe & 0xff,
      breite >> 8, breite & 0xff,
      0x03, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1,
    ]),
    Buffer.from([0xff, 0xd9]),
  ]);
}


/**
 * Startet den Dashboard-Handler auf einem freien Port. Der Test schickt damit
 * echte HTTP-Anfragen durch die Route, statt nur die Speicherfunktion
 * aufzurufen.
 */
async function mitServer(fn) {
  const server = createServer(handler);
  await new Promise((fertig) => server.listen(0, "127.0.0.1", fertig));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((fertig) => server.close(fertig));
  }
}

function lade(basis, slug, rolle, inhalt, { typ = "image/jpeg", name = "foto.jpg" } = {}) {
  const formular = new FormData();
  formular.set("rolle", rolle);
  formular.set("datei", new Blob([inhalt], { type: typ }), name);

  return fetch(`${basis}/intern/lead/${slug}/bild`, { method: "POST", body: formular });
}

function raeumeAuf(slug) {
  rmSync(path.join(uploadsDir, slug), { recursive: true, force: true });
  rmSync(path.join(leadEditsDir, `${slug}.json`), { force: true });
}

test("POST /intern/lead/:slug/bild legt die Datei ab und trägt sie in lead-edits ein", async (t) => {
  const slug = "test-upload-ablage";
  t.after(() => raeumeAuf(slug));
  raeumeAuf(slug);

  const bild = jpeg(1600, 900);
  const antwort = await mitServer((basis) => lade(basis, slug, "hero", bild));
  const ergebnis = await antwort.json();

  assert.equal(antwort.status, 200);
  assert.deepEqual(ergebnis, { ok: true, pfad: `/uploads/${slug}/hero.jpg`, breite: 1600, hoehe: 900 });

  const datei = path.join(uploadsDir, slug, "hero.jpg");
  assert.ok(existsSync(datei), "die Bilddatei fehlt");
  assert.deepEqual(readFileSync(datei), bild, "die Datei kam nicht unversehrt an");

  assert.deepEqual(loadLeadEdits(slug).bilder, { hero: `/uploads/${slug}/hero.jpg` });
});

test("mehrere Rollen liegen nebeneinander, ein zweiter Upload ersetzt nur seine eigene", async (t) => {
  const slug = "test-upload-rollen";
  t.after(() => raeumeAuf(slug));
  raeumeAuf(slug);

  await mitServer(async (basis) => {
    await lade(basis, slug, "hero", jpeg(1600, 900));
    await lade(basis, slug, "team", jpeg(1200, 800));
    await lade(basis, slug, "hero", jpeg(1800, 1000));
  });

  assert.deepEqual(loadLeadEdits(slug).bilder, {
    hero: `/uploads/${slug}/hero.jpg`,
    team: `/uploads/${slug}/team.jpg`,
  });
  assert.deepEqual(bildMasse(readFileSync(path.join(uploadsDir, slug, "hero.jpg"))), {
    typ: "image/jpeg",
    breite: 1800,
    hoehe: 1000,
  });
  // Der überschriebene Stand steht im Verlauf derselben Datei.
  assert.equal(loadLeadEdits(slug).verlauf.length, 2);
});

test("der Upload weist unerlaubte Dateien ab, ohne etwas zu schreiben", async (t) => {
  const slug = "test-upload-abweisung";
  t.after(() => raeumeAuf(slug));
  raeumeAuf(slug);

  const faelle = [
    { was: "ein zu breites Bild", args: ["hero", jpeg(2400, 1200), {}], text: /2400 px breit/ },
    { was: "ein GIF", args: ["hero", Buffer.from("GIF89a..."), { typ: "image/gif" }], text: /JPEG, PNG und WebP/ },
    { was: "ein falsch angekündigtes PNG", args: ["hero", png(800, 600), { typ: "image/jpeg" }], text: /in Wirklichkeit image\/png/ },
    { was: "eine unbekannte Rolle", args: ["logo", jpeg(800, 600), {}], text: /Unbekannter Bildplatz/ },
    { was: "eine leere Datei", args: ["hero", Buffer.alloc(0), {}], text: /keine Datei/ },
  ];

  await mitServer(async (basis) => {
    for (const { was, args, text } of faelle) {
      const antwort = await lade(basis, slug, ...args);
      const ergebnis = await antwort.json();

      assert.equal(antwort.status, 400, `${was} wurde angenommen`);
      assert.match(ergebnis.fehler, text, was);
    }
  });

  assert.ok(!existsSync(path.join(uploadsDir, slug)), "trotz Ablehnung wurde ein Ordner angelegt");
  assert.deepEqual(loadLeadEdits(slug), {});
});

test("ein Slug mit Pfadwechsel kommt nicht aus dem Upload-Ordner heraus", async (t) => {
  const slug = "test-upload-pfad";
  t.after(() => raeumeAuf(slug));

  const antwort = await mitServer((basis) =>
    lade(basis, encodeURIComponent("../../public"), "hero", jpeg(800, 600)),
  );

  assert.equal(antwort.status, 400);
  assert.match((await antwort.json()).fehler, /Unbekannter Entwurf/);
});

test("ein PNG wird als solches erkannt und mit seinen echten Maßen angenommen", async (t) => {
  const slug = "test-upload-png";
  t.after(() => raeumeAuf(slug));
  raeumeAuf(slug);

  const antwort = await mitServer((basis) =>
    lade(basis, slug, "haus", png(1200, 900), { typ: "image/png", name: "haus.png" }),
  );

  assert.equal(antwort.status, 200);
  assert.deepEqual(await antwort.json(), {
    ok: true,
    pfad: `/uploads/${slug}/haus.jpg`,
    breite: 1200,
    hoehe: 900,
  });
});

test("parseMultipart trennt Felder von Dateien und lässt die Bytes unangetastet", () => {
  const bild = jpeg(640, 480);
  const grenze = "----testgrenze";
  const koerper = Buffer.concat([
    Buffer.from(`--${grenze}\r\nContent-Disposition: form-data; name="rolle"\r\n\r\nteam\r\n`),
    Buffer.from(
      `--${grenze}\r\nContent-Disposition: form-data; name="datei"; filename="a.jpg"\r\n` +
        `Content-Type: image/jpeg\r\n\r\n`,
    ),
    bild,
    Buffer.from(`\r\n--${grenze}--\r\n`),
  ]);

  const { felder, dateien } = parseMultipart(koerper, `multipart/form-data; boundary=${grenze}`);

  assert.equal(felder.rolle, "team");
  assert.equal(dateien.datei.dateiname, "a.jpg");
  assert.equal(dateien.datei.typ, "image/jpeg");
  assert.deepEqual(dateien.datei.inhalt, bild);
});
