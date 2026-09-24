import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { richteTestLeadsEin } from "./hilfen/testLead.js";
import { migrationsPlan, leadOrdner } from "../scripts/demoMigration.mjs";
import { speichereDemoEinstellungen } from "../src/demoEinstellungen.js";
import { ladeManifest } from "../src/entwurfsManifest.js";
import { readAllLeads } from "../src/csvImport.js";

// Altbestand: Die Migration erkennt, was online steht (inkl. Google-Note im
// statischen HTML), was migrierbar ist und woran es noch hängt – und berichtet
// nicht migrierbare Seiten mit Grund.

const LEAD = { slug: "testdemo-alt-bestand-0m1", placeId: "ChIJtestMigration1", name: "Pizzeria Alt", ort: "Altötting" };
const DOCS = mkdtempSync(path.join(tmpdir(), "migration-docs-"));
let umgebung;
before(() => {
  umgebung = richteTestLeadsEin([LEAD], "__test-migration");
  const alt = (slug, html) => {
    mkdirSync(path.join(DOCS, slug), { recursive: true });
    writeFileSync(path.join(DOCS, slug, "index.html"), html);
  };
  alt(LEAD.slug, '<meta name="engine" content="v2"><li class="leiste-note"><strong>4,4</strong> auf Google</li>');
  alt("ohne-lead-0zz9", '<meta name="engine" content="v1">');
  alt("beispiel-bayerisch", "<html>");
  mkdirSync(path.join(DOCS, "assets"), { recursive: true });
});
after(() => {
  umgebung.aufraeumen();
  rmSync(DOCS, { recursive: true, force: true });
});

test("nur Lead-Demos werden erfasst (keine Beispielseiten, keine Assets)", () => {
  assert.deepEqual(leadOrdner(DOCS), ["ohne-lead-0zz9", LEAD.slug].sort());
});

test("Plan: Google-Note im HTML erkannt, migrierbar mit neuer Vorlage, wartet auf Namensbestätigung; ohne Zuordnung nicht migrierbar", () => {
  let plan = migrationsPlan({ dir: DOCS, manifest: ladeManifest(), leads: readAllLeads() });
  const alt = plan.find((p) => p.slug === LEAD.slug);
  assert.equal(alt.googleNoteImHtml, true);
  assert.equal(alt.migrierbar, true);
  assert.equal(alt.bereit, false);
  assert.equal(alt.vorlage, "italienisch/gesellig");
  assert.match(alt.hindernisse[0], /Name/);
  const fremd = plan.find((p) => p.slug === "ohne-lead-0zz9");
  assert.equal(fremd.migrierbar, false);
  assert.match(fremd.grund, /Manifest/);

  speichereDemoEinstellungen(LEAD.slug, { name: { wert: "Pizzeria Alt", notiz: "Schild" } });
  plan = migrationsPlan({ dir: DOCS, manifest: ladeManifest(), leads: readAllLeads() });
  assert.equal(plan.find((p) => p.slug === LEAD.slug).bereit, true);
});
