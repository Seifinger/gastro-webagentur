import { test } from "node:test";
import assert from "node:assert/strict";
import { DESIGN_PRESETS, getPresetVariant, withDesignDefaults } from "../src/designPresets.js";
import { MENUS } from "../src/menuCatalog.js";

const REQUIRED_FIELD_GROUPS = ["hero", "header", "layout", "menu", "reservation", "social", "mobile"];

test("es gibt für jede der 12 Küchen aus MENUS ein Preset", () => {
  const kuechen = Object.keys(MENUS);

  assert.equal(kuechen.length, 12);
  for (const kueche of kuechen) {
    assert.ok(DESIGN_PRESETS[kueche], `Preset für "${kueche}" fehlt`);
  }
});

test("jedes Preset hat eine 'default'-Variante mit allen Feldgruppen", () => {
  for (const [kueche, varianten] of Object.entries(DESIGN_PRESETS)) {
    assert.ok(varianten.default, `"${kueche}" hat keine default-Variante`);
    for (const gruppe of REQUIRED_FIELD_GROUPS) {
      assert.ok(varianten.default[gruppe], `"${kueche}".default.${gruppe} fehlt`);
    }
  }
});

test("die default-Variante entspricht überall dem bisherigen Verhalten", () => {
  for (const [kueche, varianten] of Object.entries(DESIGN_PRESETS)) {
    const preset = varianten.default;

    assert.equal(preset.hero.type, "signature", `${kueche}: hero.type`);
    assert.equal(preset.hero.primaryAction, "order", `${kueche}: hero.primaryAction`);
    assert.equal(preset.header.sticky, true, `${kueche}: header.sticky`);
    assert.equal(preset.menu.layout, "accordion", `${kueche}: menu.layout`);
    assert.equal(preset.menu.showBadges, true, `${kueche}: menu.showBadges`);
    assert.equal(preset.reservation.widgetVariant, "inline-form", `${kueche}: reservation.widgetVariant`);
    assert.equal(preset.social.layout, "grid-3", `${kueche}: social.layout`);
    assert.equal(preset.mobile.stickyActionBar, true, `${kueche}: mobile.stickyActionBar`);
    assert.deepEqual(
      preset.layout.sectionOrder,
      ["highlights", "karte", "ambiente", "stimmen", "reservierung", "kontakt"],
      `${kueche}: layout.sectionOrder`,
    );
  }
});

test("jede Küche hat mindestens eine alternative Variante für A/B-Tests", () => {
  for (const [kueche, varianten] of Object.entries(DESIGN_PRESETS)) {
    const namen = Object.keys(varianten).filter((name) => name !== "default");
    assert.ok(namen.length >= 1, `"${kueche}" hat keine alternative Variante`);
  }
});

test("getPresetVariant liefert ohne variantName die default-Variante", () => {
  const preset = getPresetVariant("italienisch");

  assert.equal(preset.hero.type, "signature");
  assert.deepEqual(preset, DESIGN_PRESETS.italienisch.default);
});

test("getPresetVariant liefert eine benannte alternative Variante", () => {
  const preset = getPresetVariant("italienisch", "photo-hero");

  assert.equal(preset.hero.type, "dish_photo");
});

test("getPresetVariant fällt bei unbekannter Küche auf bayerisch zurück", () => {
  const preset = getPresetVariant("erfundene-kueche");

  assert.deepEqual(preset, DESIGN_PRESETS.bayerisch.default);
});

test("getPresetVariant fällt bei unbekanntem Variantennamen auf default zurück", () => {
  const preset = getPresetVariant("italienisch", "gibt-es-nicht");

  assert.deepEqual(preset, DESIGN_PRESETS.italienisch.default);
});

test("withDesignDefaults ohne Angaben entspricht der Standardvariante", () => {
  assert.deepEqual(withDesignDefaults(), DESIGN_PRESETS.bayerisch.default);
  assert.deepEqual(withDesignDefaults({}), DESIGN_PRESETS.bayerisch.default);
});

test("withDesignDefaults füllt fehlende Felder einer Feldgruppe auf", () => {
  const preset = withDesignDefaults({ hero: { type: "dish_photo" } });

  assert.equal(preset.hero.type, "dish_photo");
  // primaryAction wurde nicht angegeben - Fallback auf den Standardwert.
  assert.equal(preset.hero.primaryAction, "order");
});

test("withDesignDefaults füllt komplett fehlende Feldgruppen auf", () => {
  const preset = withDesignDefaults({ social: { layout: "list" } });

  assert.equal(preset.social.layout, "list");
  // header wurde gar nicht angegeben - komplette Feldgruppe aus den Defaults.
  assert.deepEqual(preset.header, { sticky: true });
  assert.deepEqual(preset.mobile, { stickyActionBar: true });
});

test("das 'minimal'-Preset von bayerisch stellt mehrere Felder gleichzeitig um", () => {
  const preset = getPresetVariant("bayerisch", "minimal");

  assert.equal(preset.header.sticky, false);
  assert.equal(preset.mobile.stickyActionBar, false);
  assert.equal(preset.social.layout, "list");
  assert.equal(preset.menu.showBadges, false);
  assert.deepEqual(preset.layout.sectionOrder[0], "karte");
});
