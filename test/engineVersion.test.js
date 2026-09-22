import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  ENGINE_VERSION,
  LEGACY_ENGINE_VERSION,
  engineMarkerMeta,
  leseEngineVersion,
  leseEngineArchetyp,
} from "../src/engineVersion.js";
import {
  ladeManifest,
  schreibeManifest,
  slugFuerPlaceId,
  placeIdFuerSlug,
  eintragFuerSlug,
  merkeEntwuerfe,
  merkeEntwurf,
  merkeVeroeffentlichung,
  manifestPfad,
} from "../src/entwurfsManifest.js";
import { buildLandingPage, themeForLead } from "../src/landingPageGenerator.js";
import { DEMO_LEADS } from "../src/demoLeads.js";
import { menuForCuisine } from "../src/menuCatalog.js";
import { formatiereTabelle } from "../scripts/engineStatus.mjs";

const scratch = mkdtempSync(path.join(tmpdir(), "engine-manifest-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

/* --------------------------- Marker im <head> --------------------------- */

test("jede erzeugte Seite trägt die Engine-Fassung im head", () => {
  const lead = DEMO_LEADS[0];
  const gestaltung = themeForLead(lead, lead.kueche);
  const html = buildLandingPage(lead, { menu: menuForCuisine(lead.kueche), gestaltung });

  assert.match(html, /<meta name="engine-version" content="3">/);
  assert.equal(leseEngineVersion(html), ENGINE_VERSION);
  assert.equal(leseEngineArchetyp(html), gestaltung.archetyp);
});

test("eine Seite ohne Marker gilt als Altbestand", () => {
  assert.equal(leseEngineVersion("<html><head></head></html>"), LEGACY_ENGINE_VERSION);
  assert.equal(leseEngineArchetyp("<html><head></head></html>"), null);
});

test("ohne Archetyp bleibt es bei der einen Marker-Zeile", () => {
  assert.equal(engineMarkerMeta(), '<meta name="engine-version" content="3">');
});

/* ------------------------------- Manifest ------------------------------- */

test("die alte String-Form des Manifests wird weiter gelesen", () => {
  writeFileSync(manifestPfad(scratch), JSON.stringify({ "place-1": "wirtshaus-abc1234" }), "utf-8");
  const manifest = ladeManifest(scratch);

  assert.equal(slugFuerPlaceId(manifest, "place-1"), "wirtshaus-abc1234");
  assert.equal(placeIdFuerSlug(manifest, "wirtshaus-abc1234"), "place-1");
  assert.deepEqual(eintragFuerSlug(manifest, "wirtshaus-abc1234"), {
    placeId: "place-1",
    slug: "wirtshaus-abc1234",
  });
});

test("ein fehlendes oder kaputtes Manifest ergibt ein leeres Manifest", () => {
  const leer = mkdtempSync(path.join(tmpdir(), "engine-leer-"));
  assert.deepEqual(ladeManifest(leer), {});
  writeFileSync(manifestPfad(leer), "kein json", "utf-8");
  assert.deepEqual(ladeManifest(leer), {});
  rmSync(leer, { recursive: true, force: true });
});

test("eine Veröffentlichung hält Fassung, Archetyp und Zeitpunkt fest", () => {
  schreibeManifest({}, scratch);
  merkeEntwurf("place-2", "ratskeller-9999999", scratch);
  merkeVeroeffentlichung(
    { placeId: "place-2", slug: "ratskeller-9999999", archetyp: "abend", zeitpunkt: "2026-09-18T10:00:00.000Z" },
    scratch,
  );

  const eintrag = ladeManifest(scratch)["place-2"];
  assert.equal(eintrag.slug, "ratskeller-9999999");
  assert.equal(eintrag.engineVersion, ENGINE_VERSION);
  assert.equal(eintrag.archetyp, "abend");
  assert.equal(eintrag.veroeffentlichtAm, "2026-09-18T10:00:00.000Z");
  assert.match(readFileSync(manifestPfad(scratch), "utf-8"), /\n$/);
});

test("ein vollständiger lokaler Lauf lässt den Veröffentlichungsstand stehen", () => {
  schreibeManifest({}, scratch);
  merkeVeroeffentlichung(
    { placeId: "place-3", slug: "hof-1111111", archetyp: "hell", zeitpunkt: "2026-01-02T00:00:00.000Z" },
    scratch,
  );

  merkeEntwuerfe(
    [
      { placeId: "place-3", slug: "hof-1111111" },
      { placeId: "place-4", slug: "neu-2222222" },
    ],
    scratch,
  );

  const manifest = ladeManifest(scratch);
  assert.equal(manifest["place-3"].veroeffentlichtAm, "2026-01-02T00:00:00.000Z");
  assert.equal(manifest["place-3"].engineVersion, ENGINE_VERSION);
  // Ein Entwurf, der nie veröffentlicht wurde, bekommt keine Fassung angedichtet.
  assert.equal(manifest["place-4"].engineVersion, undefined);
});

test("ein neuer Ordnername wirft den alten Veröffentlichungsstand weg", () => {
  schreibeManifest({}, scratch);
  merkeVeroeffentlichung(
    { placeId: "place-5", slug: "alt-3333333", archetyp: "hell" },
    scratch,
  );
  merkeEntwuerfe([{ placeId: "place-5", slug: "neu-3333333" }], scratch);

  const eintrag = ladeManifest(scratch)["place-5"];
  assert.equal(eintrag.slug, "neu-3333333");
  assert.equal(eintrag.veroeffentlichtAm, undefined);
});

test("leads ohne placeId landen nicht im Manifest", () => {
  schreibeManifest({}, scratch);
  merkeEntwuerfe([{ placeId: "", slug: "ohne-id" }], scratch);
  assert.deepEqual(ladeManifest(scratch), {});
});

/* ------------------------------- Bericht -------------------------------- */

test("der Statusbericht stellt alte und aktuelle Entwürfe gegenüber", () => {
  const tabelle = formatiereTabelle([
    { slug: "alt-1234567", version: 1, archetyp: "?", veroeffentlichtAm: "" },
    { slug: "neu-7654321", version: 2, archetyp: "editorial", veroeffentlichtAm: "2026-09-18T10:00:00.000Z" },
  ]);

  assert.match(tabelle, /alt-1234567\s+1 \(alt\)\s+\?\s+–/);
  assert.match(tabelle, /neu-7654321\s+2\s+editorial\s+2026-09-18/);
});
