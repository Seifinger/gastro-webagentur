import { test } from "node:test";
import assert from "node:assert/strict";
import { AUSDRUECKE, AUSDRUCK_IDS, STANDARD_JE_KUECHE, ausdruckFuer } from "../v2/build/ausdruck.js";
import { baueSite } from "../v2/build/siteBuilder.js";
import { MENUS } from "../src/menuCatalog.js";
import { DEMO_LEADS } from "../src/demoLeads.js";

const demo = DEMO_LEADS.find((l) => l.kueche === "bayerisch");
const bau = (optionen = {}) => baueSite({ lead: demo, kueche: "bayerisch", optionen: { fiktiv: true, fontCss: "", ...optionen } });

test("vier Ausdrucksweisen, jede mit Hero, Kopfzeile, Abfolge und Verzicht", () => {
  assert.deepEqual(AUSDRUCK_IDS, ["kino", "gesellig", "handwerk", "editorial"]);
  for (const p of Object.values(AUSDRUECKE)) {
    assert.ok(p.hero.typ && p.kopfzeile.ueberHero && p.abfolge.length >= 4 && p.verzicht.length, p.id);
    assert.ok(["reservieren", "bestellen"].includes(p.hauptaktion), p.id);
  }
});

test("Standard je Küche deckt alle Küchen ab und vergibt kino nie automatisch", () => {
  assert.deepEqual(Object.keys(STANDARD_JE_KUECHE).sort(), Object.keys(MENUS).sort());
  assert.ok(!Object.values(STANDARD_JE_KUECHE).includes("kino"));
});

test("ausdruckFuer: leer = kein Ausdruck, unbekannt = Fehler", () => {
  assert.equal(ausdruckFuer(undefined), null);
  assert.equal(ausdruckFuer(""), null);
  assert.equal(ausdruckFuer("gesellig").id, "gesellig");
  assert.throws(() => ausdruckFuer("luxus"), /Unbekannter Ausdruck/);
});

test("Seite mit Ausdruck trägt Marker, Klasse und Variablen; ohne Ausdruck nichts davon", () => {
  const mit = bau({ ausdruck: "gesellig" });
  assert.match(mit.html, /<meta name="v2-ausdruck" content="gesellig">/);
  assert.match(mit.html, /class="[^"]*ausdruck-gesellig/);
  assert.match(mit.html, /--hero-hoehe: 75svh;/);
  assert.equal(mit.bericht.ausdruck, "gesellig");
  const ohne = bau();
  assert.ok(!ohne.html.includes("v2-ausdruck"));
  assert.ok(!ohne.html.includes("ausdruck-"));
  assert.equal(ohne.bericht.ausdruck, undefined);
});
