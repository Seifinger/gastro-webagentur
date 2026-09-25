import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  veroeffentlicheEntwurf,
  baueEntwurfHook,
  gitAufrufHook,
} from "../src/veroeffentlichung.js";

// Konzept-Demos für echte Betriebe werden nicht mehr veröffentlicht
// (src/oeffentlichkeit.js): docs/ ist GitHub Pages ohne Zugriffsschutz. Der
// Ablauf lehnt jeden Lead-Slug ab, bevor gebaut oder ein Git-Befehl
// ausgeführt wird – auch über die Dashboard-Route.

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

async function mitFakes(fn) {
  const aufrufe = { bau: [], git: [] };
  const alterBau = baueEntwurfHook.aktuell;
  const alterGit = gitAufrufHook.aktuell;
  baueEntwurfHook.aktuell = async (slug) => {
    aufrufe.bau.push(slug);
    return { slug, ordner: path.join(repoRoot, "docs", slug) };
  };
  gitAufrufHook.aktuell = async (args) => {
    aufrufe.git.push(args);
    return { stdout: " M x\n" };
  };
  try {
    await fn();
  } finally {
    baueEntwurfHook.aktuell = alterBau;
    gitAufrufHook.aktuell = alterGit;
  }
  return aufrufe;
}

test("veroeffentlicheEntwurf: ein Lead-Slug wird abgelehnt – kein Bau, kein Git-Befehl", async () => {
  const aufrufe = await mitFakes(async () => {
    await assert.rejects(veroeffentlicheEntwurf("pizzeria-beispielhaft-0abc123"), /nicht mehr veröffentlicht.*ohne Zugriffsschutz/);
  });
  assert.deepEqual(aufrufe, { bau: [], git: [] });
});

test("veroeffentlicheEntwurf: auch ein Slug, der wie ein Beispiel aussieht, aber keins ist, wird abgelehnt", async () => {
  const aufrufe = await mitFakes(async () => {
    await assert.rejects(veroeffentlicheEntwurf("beispiel-erfunden-aber-unbekannt"), /nicht mehr veröffentlicht/);
  });
  assert.deepEqual(aufrufe.git, []);
});

/* ------------------------ Route in dashboardServer.js ------------------------ */

async function mitServer(fn) {
  const { handler } = await import("../src/dashboardServer.js");
  const server = createServer(handler);
  await new Promise((fertig) => server.listen(0, "127.0.0.1", fertig));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((fertig) => server.close(fertig));
  }
}

test("POST /intern/lead/:slug/veroeffentlichen: 410 mit Erklärung, nichts gebaut, nichts gepusht", async () => {
  const aufrufe = await mitFakes(() =>
    mitServer(async (basis) => {
      const antwort = await fetch(`${basis}/intern/lead/route-slug/veroeffentlichen`, { method: "POST" });
      const ergebnis = await antwort.json();
      assert.equal(antwort.status, 410);
      assert.equal(ergebnis.ok, false);
      assert.match(ergebnis.fehler, /Präsentation im WLAN/);
      // Der Server steht danach weiterhin.
      assert.equal((await fetch(`${basis}/api/leads`)).status, 200);
    }),
  );
  assert.deepEqual(aufrufe, { bau: [], git: [] });
});
