import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectCuisine,
  menuForCuisine,
  menuForLead,
  highlightCandidates,
  kuechenAuswahl,
  MENUS,
} from "../src/menuCatalog.js";

test("detectCuisine erkennt die Küche am Restaurantnamen", () => {
  assert.equal(detectCuisine("Pizzeria Tropea"), "italienisch");
  assert.equal(detectCuisine("Döneria Neuötting"), "tuerkisch");
  assert.equal(detectCuisine("China Restaurant Lotus"), "chinesisch");
  assert.equal(detectCuisine("Taverna Akropolis"), "griechisch");
  assert.equal(detectCuisine("Café Kirchplatz"), "cafe");
});

test("detectCuisine trennt die asiatischen Küchen", () => {
  // Der Grund für die Aufteilung: ein Sushi-Lokal soll keine Wok-Karte
  // bekommen und ein Thai kein Sushi.
  assert.equal(detectCuisine("Sushi Bar Kyoto"), "japanisch");
  assert.equal(detectCuisine("Kao Thai Restaurant"), "thailaendisch");
  assert.equal(detectCuisine("Saigon Bistro"), "vietnamesisch");
  assert.equal(detectCuisine("Restaurant Miss Hoi An"), "vietnamesisch");
  assert.equal(detectCuisine("China Restaurant Peking"), "chinesisch");
  assert.equal(detectCuisine("Ming Friends"), "chinesisch");
  assert.equal(detectCuisine("Taj Mahal"), "indisch");
  assert.equal(detectCuisine("Damaskus Grill"), "syrisch");

  // Wo der Name nichts Genaueres hergibt, bleibt die Sammelkategorie.
  assert.equal(detectCuisine("Asia Wok Express"), "asiatisch");
  assert.equal(detectCuisine("Nakama Rolls & Bowls"), "asiatisch");
});

test("die Aufteilung reißt keine bayerischen Namen mit", () => {
  // "Goldener Hirsch" oder "Zum Steer" dürfen nicht plötzlich chinesisch
  // werden, nur weil ein Stichwort zu grob gefasst ist.
  for (const name of [
    "Goldener Hirsch",
    "Gasthof zum Steer",
    "Wuhrmühle",
    "Jettenbacher Hof",
    "Sportheim Tüßling",
    "Brauerei Gasthof Bräu im Moos",
  ]) {
    assert.equal(detectCuisine(name), "bayerisch", `${name} sollte bayerisch bleiben`);
  }
});

test("jede Küche hat eine Beschriftung fürs Dashboard", () => {
  const auswahl = kuechenAuswahl();
  assert.equal(auswahl.length, Object.keys(MENUS).length);
  for (const { wert, label } of auswahl) {
    assert.ok(MENUS[wert], `${wert} hat keine Karte`);
    // Der rohe Schlüssel als Beschriftung wäre der vergessene Nachtrag.
    assert.notEqual(label, wert, `${wert} hat keine eigene Beschriftung`);
  }
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

test("jede Karte liefert genug bebilderte Gerichte für die Highlights", () => {
  for (const [name, menu] of Object.entries(MENUS)) {
    const kandidaten = highlightCandidates(menu);

    assert.ok(kandidaten.length >= 3, `${name} hat nur ${kandidaten.length} bebilderte Gerichte`);
    assert.ok(
      kandidaten.every((g) => g.bild && g.kategorie && /^\d+-\d+$/.test(g.id)),
      `${name}: Kandidat ohne Bild, Kategorie oder Kennung`,
    );
    assert.ok(menu.geschichte, `${name} hat keinen Beschreibungstext`);
  }
});

test("jede Karte hat Konzept-Zeile und USP-Badges", () => {
  for (const [name, menu] of Object.entries(MENUS)) {
    assert.ok(menu.konzept, `${name} hat keine Konzept-Zeile`);
    assert.ok(menu.konzept.length <= 40, `${name}: Konzept-Zeile zu lang für den Hero`);
    assert.equal(menu.usps.length, 3, `${name} hat nicht genau 3 USP-Badges`);
    assert.ok(menu.usps.every((u) => u.length <= 46), `${name}: USP zu lang für die Leiste`);
  }
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
