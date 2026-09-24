import { test } from "node:test";
import assert from "node:assert/strict";
import { ausdruckFuerSlug } from "../v2/build/ausdruck.js";

test("Ausdruck-Wahl: versionierte Zuordnung je Slug, Unbekanntes wird ignoriert", () => {
  assert.equal(ausdruckFuerSlug("beispiel-bayerisch"), "gesellig");
  assert.equal(ausdruckFuerSlug("beispiel-italienisch"), null);
  assert.equal(ausdruckFuerSlug("_hinweis"), null);
  assert.equal(ausdruckFuerSlug("x", "/gibt/es/nicht.json"), null);
});
