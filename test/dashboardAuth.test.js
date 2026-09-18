import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handler } from "../src/dashboardServer.js";
import { baueEntwurfHook, gitAufrufHook } from "../src/veroeffentlichung.js";

// Muss zum repoRoot passen, den veroeffentlichung.js selbst berechnet – sonst
// ergibt path.relative() im Fake einen anderen Pfad als in der echten Route
// (siehe test/veroeffentlichung.test.js, derselbe Grund).
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
function fakeOrdner(slug) {
  return path.join(repoRoot, "docs", slug);
}

async function mitFakes({ baueEntwurf, gitAufruf }, fn) {
  const alterBau = baueEntwurfHook.aktuell;
  const alterGit = gitAufrufHook.aktuell;
  baueEntwurfHook.aktuell = baueEntwurf ?? alterBau;
  gitAufrufHook.aktuell = gitAufruf ?? alterGit;
  try {
    return await fn();
  } finally {
    baueEntwurfHook.aktuell = alterBau;
    gitAufrufHook.aktuell = alterGit;
  }
}

// DASHBOARD_TOKEN wird von dashboardServer.js bei jeder Anfrage frisch aus
// process.env gelesen (nicht einmalig gecacht) – genau wie ANTHROPIC_API_KEY
// in promptEdits.js. Das erlaubt, ihn je Testfall zu setzen, ohne das Modul
// neu zu laden. Nach jedem Testfall wird der Ausgangszustand wiederhergestellt.
async function mitToken(wert, fn) {
  const alter = process.env.DASHBOARD_TOKEN;
  if (wert === undefined) delete process.env.DASHBOARD_TOKEN;
  else process.env.DASHBOARD_TOKEN = wert;
  try {
    return await fn();
  } finally {
    if (alter === undefined) delete process.env.DASHBOARD_TOKEN;
    else process.env.DASHBOARD_TOKEN = alter;
  }
}

async function mitServer(fn) {
  const server = createServer(handler);
  await new Promise((fertig) => server.listen(0, "127.0.0.1", fertig));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((fertig) => server.close(fertig));
  }
}

const gueltigeFakes = {
  baueEntwurf: async (slug) => ({ slug, ordner: fakeOrdner(slug) }),
  gitAufruf: async (args) =>
    args[0] === "status" ? { stdout: " M docs/token-test/index.html\n" } : { stdout: "" },
};

test("mit gesetztem DASHBOARD_TOKEN: /intern/-Route ohne Token wird mit 401 abgelehnt", () =>
  mitToken("geheim-123", () =>
    mitFakes(gueltigeFakes, () =>
      mitServer(async (basis) => {
        const antwort = await fetch(`${basis}/intern/lead/token-test/veroeffentlichen`, { method: "POST" });
        const ergebnis = await antwort.json();

        assert.equal(antwort.status, 401);
        assert.equal(ergebnis.ok, false);
        assert.match(ergebnis.fehler, /Token/);
      }),
    ),
  ));

test("mit gesetztem DASHBOARD_TOKEN: /intern/-Route mit falschem Token wird mit 401 abgelehnt", () =>
  mitToken("geheim-123", () =>
    mitFakes(gueltigeFakes, () =>
      mitServer(async (basis) => {
        const antwort = await fetch(`${basis}/intern/lead/token-test/veroeffentlichen`, {
          method: "POST",
          headers: { "X-Dashboard-Token": "falsch" },
        });
        const ergebnis = await antwort.json();

        assert.equal(antwort.status, 401);
        assert.equal(ergebnis.ok, false);
      }),
    ),
  ));

test("mit gesetztem DASHBOARD_TOKEN: /intern/-Route mit korrektem Token funktioniert wie bisher", () =>
  mitToken("geheim-123", () =>
    mitFakes(gueltigeFakes, () =>
      mitServer(async (basis) => {
        const antwort = await fetch(`${basis}/intern/lead/token-test/veroeffentlichen`, {
          method: "POST",
          headers: { "X-Dashboard-Token": "geheim-123" },
        });
        const ergebnis = await antwort.json();

        assert.equal(antwort.status, 200);
        assert.equal(ergebnis.ok, true);
        assert.equal(ergebnis.veraendert, true);
      }),
    ),
  ));

test("mit gesetztem DASHBOARD_TOKEN: der Token wird auch als Cookie akzeptiert", () =>
  mitToken("geheim-123", () =>
    mitFakes(gueltigeFakes, () =>
      mitServer(async (basis) => {
        const antwort = await fetch(`${basis}/intern/lead/token-test/veroeffentlichen`, {
          method: "POST",
          headers: { Cookie: "dashboard_token=geheim-123" },
        });
        const ergebnis = await antwort.json();

        assert.equal(antwort.status, 200);
        assert.equal(ergebnis.ok, true);
      }),
    ),
  ));

test("mit gesetztem DASHBOARD_TOKEN: eine abgelehnte Anfrage führt keine der geschützten Aktionen aus", () =>
  mitToken("geheim-123", () =>
    mitServer(async (basis) => {
      // Absichtlich kein multipart-Content-Type mitgeschickt – würde die Route
      // wirklich bis zum Datei-Upload durchlaufen, käme ein anderer Fehler
      // ("kam ohne multipart-Grenze an") statt der 401-Ablehnung.
      const antwort = await fetch(`${basis}/intern/lead/token-test/bild`, {
        method: "POST",
        body: "irgendwas",
      });
      const ergebnis = await antwort.json();

      assert.equal(antwort.status, 401);
      assert.match(ergebnis.fehler, /Token/);
    }),
  ));

test("mit gesetztem DASHBOARD_TOKEN: die Kuechen-Override-Route ist ebenfalls geschützt", () =>
  mitToken("geheim-123", () =>
    mitServer(async (basis) => {
      const antwort = await fetch(`${basis}/api/kueche`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: "irgendeine-id", kueche: "" }),
      });

      assert.equal(antwort.status, 401);
    }),
  ));

test("mit gesetztem DASHBOARD_TOKEN: rein lesende Routen bleiben ungeschützt", () =>
  mitToken("geheim-123", () =>
    mitServer(async (basis) => {
      const antwort = await fetch(`${basis}/api/leads`);
      assert.equal(antwort.status, 200);
    }),
  ));

test("ohne gesetztes DASHBOARD_TOKEN: die Veroeffentlichen-Route funktioniert wie vor dieser Änderung (Regression)", () =>
  mitToken(undefined, () =>
    mitFakes(gueltigeFakes, () =>
      mitServer(async (basis) => {
        const antwort = await fetch(`${basis}/intern/lead/token-test/veroeffentlichen`, { method: "POST" });
        const ergebnis = await antwort.json();

        assert.equal(antwort.status, 200);
        assert.equal(ergebnis.ok, true);
      }),
    ),
  ));

test("ohne gesetztes DASHBOARD_TOKEN: eine leere DASHBOARD_TOKEN-Variable zählt als nicht gesetzt", () =>
  mitToken("", () =>
    mitFakes(gueltigeFakes, () =>
      mitServer(async (basis) => {
        const antwort = await fetch(`${basis}/intern/lead/token-test/veroeffentlichen`, { method: "POST" });
        assert.equal(antwort.status, 200);
      }),
    ),
  ));
