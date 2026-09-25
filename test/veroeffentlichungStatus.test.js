import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { richteTestLeadsEin } from "./hilfen/testLead.js";
import { starteVeroeffentlichung, baueEntwurfHook, gitAufrufHook, abrufHook, pruefeOeffentlich, laeuftGerade } from "../src/veroeffentlichung.js";
import { demoEinstellungen, speichereDemoEinstellungen } from "../src/demoEinstellungen.js";

// Veröffentlichen aus dem Dashboard ist für Lead-Demos abgeschaltet
// (src/oeffentlichkeit.js). Der Online-Nachweis bleibt für einen späteren
// Kunden-Workflow (Typ C) erhalten und getestet.

const LEAD = { slug: "testdemo-status-0aaa111", placeId: "ChIJtestStatus01", name: "Trattoria Da Test", ort: "Altötting" };
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let umgebung;
before(() => { umgebung = richteTestLeadsEin([LEAD], "__test-status"); });
after(() => umgebung.aufraeumen());

const schnell = { taktMs: 1, grenzeMs: 50, warte: () => new Promise((r) => setTimeout(r, 1)) };

async function mit({ bau, git, abruf }, fn) {
  const alt = [baueEntwurfHook.aktuell, gitAufrufHook.aktuell, abrufHook.aktuell];
  baueEntwurfHook.aktuell = bau ?? (async (slug) => ({ slug, ordner: path.join(repoRoot, "docs", slug) }));
  gitAufrufHook.aktuell = git ?? (async (args) => ({ stdout: args[0] === "status" ? " M x\n" : "" }));
  abrufHook.aktuell = abruf ?? (async () => ({ status: 404, text: "" }));
  try { return await fn(); } finally { [baueEntwurfHook.aktuell, gitAufrufHook.aktuell, abrufHook.aktuell] = alt; }
}

test("starteVeroeffentlichung: Lead-Demos werden abgelehnt – Status bleibt, kein Bau, kein Git, kein Abruf", async () => {
  const aufrufe = [];
  const vorher = demoEinstellungen(LEAD.slug).status;
  await mit({
    bau: async (slug) => { aufrufe.push(["bau", slug]); return { slug, ordner: path.join(repoRoot, "docs", slug) }; },
    git: async (a) => { aufrufe.push(["git", ...a]); return { stdout: "" }; },
    abruf: async (url) => { aufrufe.push(["abruf", url]); return { status: 200, text: "" }; },
  }, async () => {
    assert.throws(() => starteVeroeffentlichung(LEAD.slug, { pruefOptionen: schnell }), /nicht mehr veröffentlicht/);
  });
  assert.deepEqual(aufrufe, []);
  assert.equal(laeuftGerade(LEAD.slug), false);
  assert.deepEqual(demoEinstellungen(LEAD.slug).status, vorher);
  // Speichern der Einstellungen funktioniert weiter.
  assert.equal(speichereDemoEinstellungen(LEAD.slug, { slogan: "Lokal gebaut" }).slogan.wert, "Lokal gebaut");
});

test("pruefeOeffentlich: nur die exakte Build-ID zählt, Netzfehler werden überbrückt", async () => {
  let n = 0;
  await mit({ abruf: async () => { n += 1; if (n === 1) throw new Error("ECONNRESET"); return { status: 200, text: '<meta name="demo-build" content="b-42">' }; } }, async () => {
    assert.equal(await pruefeOeffentlich("https://x/y/", "b-42", schnell), true);
    assert.equal(await pruefeOeffentlich("https://x/y/", "b-4", schnell), false);
  });
});
