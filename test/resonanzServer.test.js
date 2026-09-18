import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { handler } from "../src/resonanzServer.js";
import { ladeResonanz } from "../src/resonanzStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

// Der Collector nimmt nur Entwürfe an, die wirklich veröffentlicht sind –
// deshalb braucht der Test einen echten Ordner unter docs/.
const SLUG = "test-resonanz-server";
const entwurfOrdner = path.join(repoRoot, "docs", SLUG);
const standDatei = path.join(repoRoot, "data", "resonanz", `${SLUG}.json`);

before(() => {
  mkdirSync(entwurfOrdner, { recursive: true });
  writeFileSync(path.join(entwurfOrdner, "index.html"), "<!doctype html><title>Test</title>");
});

after(() => {
  rmSync(entwurfOrdner, { recursive: true, force: true });
  rmSync(standDatei, { force: true });
});

async function mitServer(fn) {
  const server = createServer(handler);
  await new Promise((fertig) => server.listen(0, "127.0.0.1", fertig));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((fertig) => server.close(fertig));
  }
}

function melde(basis, nutzlast) {
  return fetch(`${basis}/resonanz`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(nutzlast),
  });
}

test("der Vorabfrage antwortet der Collector mit den CORS-Kopfzeilen", () =>
  mitServer(async (basis) => {
    const antwort = await fetch(`${basis}/resonanz`, { method: "OPTIONS" });

    assert.equal(antwort.status, 204);
    // Die Entwürfe liegen auf GitHub Pages, also auf einer anderen Herkunft.
    assert.equal(antwort.headers.get("access-control-allow-origin"), "*");
  }));

test("ein gemeldeter Aufruf landet im Stand des Entwurfs", () =>
  mitServer(async (basis) => {
    const antwort = await melde(basis, {
      slug: SLUG,
      besuch: randomUUID(),
      sekunden: 40,
      reservierungGesehen: true,
    });

    assert.equal(antwort.status, 200);
    assert.deepEqual(await antwort.json(), { ok: true });

    const stand = ladeResonanz(SLUG);
    assert.equal(stand.aufrufe.length, 1);
    assert.equal(stand.aufrufe[0].sekunden, 40);
    assert.equal(stand.aufrufe[0].reservierungGesehen, true);
  }));

test("ein unbekannter Entwurf legt keine Datei an", () =>
  mitServer(async (basis) => {
    const antwort = await melde(basis, { slug: "gibt-es-nicht", besuch: randomUUID() });

    assert.equal(antwort.status, 400);
    assert.match((await antwort.json()).fehler, /Entwurf/);
    assert.equal(existsSync(path.join(repoRoot, "data", "resonanz", "gibt-es-nicht.json")), false);
  }));

test("ein Entwurfsname, der aus dem Ordner führen soll, wird abgewiesen", () =>
  mitServer(async (basis) => {
    const antwort = await melde(basis, { slug: "../../etc/passwd", besuch: randomUUID() });

    assert.equal(antwort.status, 400);
  }));

test("ohne Besuchskennung wird nichts vermerkt", () =>
  mitServer(async (basis) => {
    const antwort = await melde(basis, { slug: SLUG });

    assert.equal(antwort.status, 400);
    assert.match((await antwort.json()).fehler, /Besuchskennung/);
  }));

test("eine aufgeblähte Nutzlast wird abgewiesen, statt den Speicher zu füllen", () =>
  mitServer(async (basis) => {
    const antwort = await melde(basis, {
      slug: SLUG,
      besuch: randomUUID(),
      ballast: "x".repeat(30_000),
    });

    assert.equal(antwort.status, 400);
  }));

test("andere Pfade kennt der Collector nicht", () =>
  mitServer(async (basis) => {
    assert.equal((await fetch(`${basis}/`)).status, 404);
    assert.equal((await fetch(`${basis}/api/leads`)).status, 404);
    // Kein GET: der Endpunkt nimmt ausschließlich Meldungen entgegen.
    assert.equal((await fetch(`${basis}/resonanz`)).status, 404);
  }));

// Steht bewusst am Ende: Die Bremse zählt pro Prozess, ein früher ausgelöstes
// Limit würde die Tests darüber mitreißen.
test("zu viele Meldungen in Folge werden gebremst", () =>
  mitServer(async (basis) => {
    let letzte = 200;
    for (let i = 0; i < 25; i += 1) {
      letzte = (await melde(basis, { slug: SLUG, besuch: randomUUID() })).status;
    }

    assert.equal(letzte, 429);
  }));
