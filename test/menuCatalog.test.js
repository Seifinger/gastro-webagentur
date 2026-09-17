import { test } from "node:test";
import assert from "node:assert/strict";
import { detectCuisine, menuForCuisine, menuForLead, MENUS } from "../src/menuCatalog.js";

test("detectCuisine erkennt die Küche am Restaurantnamen", () => {
  assert.equal(detectCuisine("Pizzeria Tropea"), "italienisch");
  assert.equal(detectCuisine("Döneria Neuötting"), "tuerkisch");
  assert.equal(detectCuisine("China Restaurant Lotus"), "asiatisch");
  assert.equal(detectCuisine("Taverna Akropolis"), "griechisch");
  assert.equal(detectCuisine("Café Kirchplatz"), "cafe");
});

test("detectCuisine ignoriert Groß-/Kleinschreibung", () => {
  assert.equal(detectCuisine("RISTORANTE DA MARIO"), "italienisch");
});

test("detectCuisine nimmt bayerisch als Standard für unbekannte Namen", () => {
  assert.equal(detectCuisine("Gasthof Huber"), "bayerisch");
  assert.equal(detectCuisine("Zur alten Linde"), "bayerisch");
  assert.equal(detectCuisine(""), "bayerisch");
  assert.equal(detectCuisine(undefined), "bayerisch");
});

test("menuForCuisine fällt bei unbekannter Küche auf die bayerische Karte zurück", () => {
  assert.equal(menuForCuisine("marsianisch"), MENUS.bayerisch);
});

test("menuForLead liefert eine vollständige Karte mit Preisen", () => {
  const menu = menuForLead({ name: "Pizzeria Tropea" });

  assert.equal(menu, MENUS.italienisch);
  assert.ok(menu.kategorien.length >= 3);
  for (const kategorie of menu.kategorien) {
    assert.ok(kategorie.gerichte.length > 0);
    for (const gericht of kategorie.gerichte) {
      assert.equal(typeof gericht.name, "string");
      assert.equal(typeof gericht.preis, "number");
      assert.ok(gericht.preis > 0);
    }
  }
});
