import { test } from "node:test";
import assert from "node:assert/strict";
import { designPresets, DEFAULT_PRESET } from "../src/designPresets.js";
import { buildLandingPage, themeForLead } from "../src/landingPageGenerator.js";
import { KUECHEN } from "../src/cuisineOverrides.js";
import { menuForCuisine } from "../src/menuCatalog.js";

const lead = {
  name: "Testlokal",
  adresse: "Stadtpl. 1, 84453 Mühldorf am Inn, Germany",
  telefon: "08631 12345",
  ort: "Mühldorf am Inn",
  rating: 4.5,
  anzahlBewertungen: 100,
};

test("jede Küche aus KUECHEN hat ein Design-Preset oder fällt sauber auf den Standard zurück", () => {
  for (const kueche of KUECHEN) {
    const preset = designPresets[kueche] ?? DEFAULT_PRESET;
    assert.ok(preset, `kein Preset/Fallback für ${kueche}`);
    assert.ok(["list", "grid", "card"].includes(preset.menu.layout), `unbekanntes Menü-Layout für ${kueche}`);
    assert.ok(["grid", "carousel", "featured_quote"].includes(preset.social.layout), `unbekanntes Social-Layout für ${kueche}`);
  }
});

test("unbekannte Küche fällt auf DEFAULT_PRESET zurück", () => {
  assert.equal(designPresets["nicht-existent"], undefined);
  assert.equal(DEFAULT_PRESET.menu.layout, "list");
});

test("buildLandingPage erzeugt für das grid-Menü-Preset valides Markup ohne Exceptions", () => {
  const gestaltung = themeForLead(lead, "thailaendisch");
  const html = buildLandingPage(lead, { menu: menuForCuisine("thailaendisch"), gestaltung });

  assert.ok(html.startsWith("<!DOCTYPE html>"));
  assert.ok(html.includes('class="menu-grid-section"'));
  assert.ok(!html.includes('<details class="kat"'));
});

test("buildLandingPage erzeugt für das card-Menü-Preset valides Markup ohne Exceptions", () => {
  const gestaltung = themeForLead(lead, "chinesisch");
  const html = buildLandingPage(lead, { menu: menuForCuisine("chinesisch"), gestaltung });

  assert.ok(html.startsWith("<!DOCTYPE html>"));
  assert.ok(html.includes('class="menu-card-grid"'));
  assert.ok(html.includes('class="menu-card"'));
});

test("buildLandingPage erzeugt für das list-Menü-Preset weiterhin die Akkordeon-Karte", () => {
  const gestaltung = themeForLead(lead, "italienisch");
  const html = buildLandingPage(lead, { menu: menuForCuisine("italienisch"), gestaltung });

  assert.ok(html.includes('<details class="kat" open>'));
});

test("carousel-Social-Proof-Layout erzeugt die entsprechende Klasse", () => {
  const gestaltung = themeForLead(lead, "asiatisch");
  const html = buildLandingPage(lead, { menu: menuForCuisine("asiatisch"), gestaltung, fiktiv: true });

  assert.ok(html.includes('class="stimmen-grid carousel"'));
});

test("featured_quote-Social-Proof-Layout hebt eine Stimme hervor", () => {
  const gestaltung = themeForLead(lead, "japanisch");
  const html = buildLandingPage(lead, { menu: menuForCuisine("japanisch"), gestaltung, fiktiv: true });

  assert.ok(html.includes('class="stimmen-grid featured"'));
  assert.ok(html.includes('class="stimme featured"'));
});

test("hero_widget-Reservierungsvariante zeigt das kompakte Widget im Hero", () => {
  const gestaltung = themeForLead(lead, "italienisch");
  const html = buildLandingPage(lead, { menu: menuForCuisine("italienisch"), gestaltung });

  assert.ok(html.includes('class="hero-res-widget"'));
});

test("Beliebt-Badge erscheint nur, wenn das Preset es vorsieht", () => {
  const mitBeliebt = themeForLead(lead, "chinesisch");
  const htmlMit = buildLandingPage(lead, { menu: menuForCuisine("chinesisch"), gestaltung: mitBeliebt });
  assert.ok(htmlMit.includes('class="beliebt"'));

  const ohneBeliebt = themeForLead(lead, "vietnamesisch");
  const htmlOhne = buildLandingPage(lead, { menu: menuForCuisine("vietnamesisch"), gestaltung: ohneBeliebt });
  assert.ok(!htmlOhne.includes('class="beliebt"'));
});
