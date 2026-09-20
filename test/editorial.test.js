import test from "node:test";
import assert from "node:assert/strict";
import { MOTION_EXTRA_CSS, MOTION_EXTRA_SKRIPT, MOTION_CSS, MOTION_SCRIPT } from "../src/motion.js";
import { ARCHETYP_PRESET, presetFuerArchetyp, withDesignDefaults } from "../src/designPresets.js";
import { buildLandingPage, themeForLead } from "../src/landingPageGenerator.js";
import { menuForCuisine } from "../src/menuCatalog.js";
import { stimmungenFuer } from "../src/stimmungen.js";
import { zeilenAufteilen, renderZeilenUeberschrift, renderHeroMedia } from "../src/sections/hero.js";

const lead = {
  name: "Trattoria Beispiel",
  ort: "Mühldorf am Inn",
  adresse: "Marktplatz 1, 84453 Mühldorf am Inn",
  telefon: "08631 123456",
  placeId: "test-editorial",
  rating: 4.6,
  anzahlBewertungen: 312,
};

function seite(stimmungsId, extra = {}) {
  const gestaltung = themeForLead(lead, "italienisch", stimmungsId);
  return buildLandingPage(lead, { menu: menuForCuisine("italienisch"), gestaltung, ...extra });
}

const editorialId = stimmungenFuer("italienisch").find((s) => s.archetyp === "editorial").id;

/* ---------- Bewegung: das Neue gehorcht denselben Regeln ---------- */

test("die neuen Effekte hängen nicht in MOTION_CSS, sondern in einem eigenen Block", () => {
  // Sonst änderte sich mit dem nächsten Publish jede bereits veröffentlichte
  // Kundenseite – das ist der ganze Grund für die Trennung.
  for (const teil of [".auftritt-zeile", ".bild-zoom", ".link-strich", ".hero-video"]) {
    assert.ok(!MOTION_CSS.includes(teil), `${teil} steht fälschlich in MOTION_CSS`);
    assert.ok(MOTION_EXTRA_CSS.includes(teil), `${teil} fehlt im Erweiterungsblock`);
  }
  assert.ok(!MOTION_SCRIPT.includes("auftritt-zeile"));
});

test("jeder neue Effekt wird bei prefers-reduced-motion abgeschaltet", () => {
  const start = MOTION_EXTRA_CSS.indexOf("@media (prefers-reduced-motion: reduce)");
  const klasse = MOTION_EXTRA_CSS.indexOf(".bewegung-aus {");
  assert.ok(start > -1 && klasse > start);

  const reduziert = MOTION_EXTRA_CSS.slice(start, klasse);
  for (const selektor of [".zeile", ".bild-zoom img", ".link-strich::after", ".hero-video"]) {
    assert.ok(reduziert.includes(selektor), `${selektor} wird nicht zurückgenommen`);
  }
});

test("?bewegung=aus nimmt dieselben Regeln zurück wie die Systemeinstellung", () => {
  const start = MOTION_EXTRA_CSS.indexOf("@media (prefers-reduced-motion: reduce)");
  const klasse = MOTION_EXTRA_CSS.indexOf(".bewegung-aus {");
  const geteilt = ".hero-video { display: none; }";
  assert.ok(MOTION_EXTRA_CSS.slice(start, klasse).includes(geteilt));
  assert.ok(MOTION_EXTRA_CSS.slice(klasse).includes(geteilt));

  // Das Skript muss aussteigen, bevor es irgendetwas in Bewegung setzt.
  const abbruch = MOTION_EXTRA_SKRIPT.indexOf("if (ruhig.matches || erzwungenRuhig)");
  const bewegtGesetzt = MOTION_EXTRA_SKRIPT.indexOf('classList.add("bewegt")');
  assert.ok(abbruch > -1 && abbruch < bewegtGesetzt);
});

test("auch im Erweiterungsblock werden nur transform und opacity bewegt", () => {
  const erlaubt = /^(transform|opacity|none)$/;
  for (const treffer of MOTION_EXTRA_CSS.matchAll(/transition:\s*([^;]+);/g)) {
    const liste = treffer[1].replace(/\([^)]*\)/g, "");
    for (const teil of liste.split(",")) {
      assert.match(teil.trim().split(/\s+/)[0], erlaubt, `teure Eigenschaft: ${teil}`);
    }
  }
});

test("die Hover-Effekte greifen nur auf Geräten mit echtem Zeiger", () => {
  for (const selektor of [".bild-zoom:hover img", ".link-strich:hover::after"]) {
    const index = MOTION_EXTRA_CSS.indexOf(selektor);
    assert.ok(index > -1, `${selektor} fehlt`);
    const davor = MOTION_EXTRA_CSS.slice(0, index);
    assert.ok(
      davor.lastIndexOf("@media (hover: hover)") > davor.lastIndexOf("\n}\n"),
      `${selektor} steht nicht in @media (hover: hover)`,
    );
  }
});

/* ---------- Zeilenweise Überschrift ---------- */

test("die Überschrift wird serverseitig in höchstens drei Zeilen gelegt", () => {
  assert.deepEqual(zeilenAufteilen("Trattoria Bella Vista"), ["Trattoria", "Bella", "Vista"]);
  assert.equal(zeilenAufteilen("Ein sehr langer Name mit vielen Wörtern hier").length, 3);
  assert.deepEqual(zeilenAufteilen("   "), []);
});

test("jede Zeile bringt ihren Takt als CSS-Variable mit", () => {
  const html = renderZeilenUeberschrift("Trattoria Bella Vista");
  assert.match(html, /<h1 class="zeilen auftritt-zeile">/);
  assert.match(html, /style="--takt:0"/);
  assert.match(html, /style="--takt:2"/);
  // Ohne Skript steht der Text vollständig da – nichts versteckt sich im Markup.
  assert.ok(html.includes("Trattoria") && html.includes("Vista"));
});

/* ---------- Video-Hero ---------- */

test("ohne Videodatei bleibt es beim bisherigen Bild-Hero", () => {
  const html = renderHeroMedia({ heroImageSrc: "bild.jpg", heroVideoSrc: "", name: "Haus" });
  assert.ok(!html.includes("<video"));
  assert.match(html, /<div class="hero-media">\n    <img src="bild\.jpg" alt="Haus">\n  <\/div>/);
});

test("mit Videodatei läuft eine stumme Schleife mit dem Bild als Poster und Rückfall", () => {
  const html = renderHeroMedia({ heroImageSrc: "bild.jpg", heroVideoSrc: "film.mp4", name: "Haus" });
  for (const teil of ["autoplay", "muted", "loop", "playsinline", 'poster="bild.jpg"', 'src="film.mp4"']) {
    assert.ok(html.includes(teil), `${teil} fehlt`);
  }
  assert.ok(html.includes('class="hero-video-fallback"'), "Bild-Rückfall fehlt");
});

test("der Video-Hero wird beim Hinausscrollen angehalten", () => {
  assert.match(MOTION_EXTRA_SKRIPT, /IntersectionObserver/);
  assert.match(MOTION_EXTRA_SKRIPT, /video\.pause\(\)/);
});

test("ein Video-Preset ohne hinterlegte Datei ergibt die bisherige Seite", () => {
  const ohne = seite("trattoria");
  const mitPreset = seite("trattoria", { preset: withDesignDefaults({ hero: { type: "video_loop" } }) });
  assert.ok(!mitPreset.includes("<video"));
  // Der Hero-Block ist derselbe wie ohne das Preset.
  assert.ok(mitPreset.includes('<div class="hero-media">') && ohne.includes('<div class="hero-media">'));
});

/* ---------- Editorial-Archetyp ---------- */

test("der Editorial-Archetyp hat ein eigenes Preset mit asymmetrischem Raster", () => {
  const preset = presetFuerArchetyp("editorial");
  assert.equal(preset, ARCHETYP_PRESET.editorial);
  assert.equal(preset.hero.type, "editorial");
  assert.equal(preset.layout.gridStyle, "asymmetric");
  assert.equal(preset.typography.scale, "gross");
});

test("die bestehenden drei Archetypen behalten Raster und Schriftskala", () => {
  for (const archetyp of ["traditionell", "abend", "hell"]) {
    const preset = presetFuerArchetyp(archetyp);
    assert.equal(preset.layout.gridStyle, "standard", archetyp);
    assert.equal(preset.typography.scale, "standard", archetyp);
  }
});

test("die Editorial-Seite bringt Hero, Magazin-Raster und kräftigen Akzent mit", () => {
  const html = seite(editorialId);
  assert.ok(html.includes('class="hero hero-editorial"'));
  assert.ok(html.includes('class="zeilen auftritt-zeile"'));
  assert.ok(html.includes("hl-grid--magazin"));
  assert.ok(html.includes('class="gitter-asymmetrisch"'));
  assert.ok(html.includes("--accent-bold:"));
  assert.ok(html.includes("clamp(48px, 9vw, 128px)"));
  assert.ok(html.includes(".bewegt .auftritt-zeile .zeile"), "Erweiterungs-CSS fehlt");
});

test("die bestehenden Archetypen bekommen nichts vom Editorial-Stil zu sehen", () => {
  // Der eigentliche Regressionsschutz ist der Byte-Diff gegen eine Baseline;
  // dieser Test hält die Trennung im Alltag fest.
  for (const stimmung of stimmungenFuer("italienisch")) {
    if (stimmung.archetyp === "editorial") continue;
    const html = seite(stimmung.id);
    for (const teil of ["hl-grid--magazin", "gitter-asymmetrisch", "auftritt-zeile", "hero-video"]) {
      assert.ok(!html.includes(teil), `${stimmung.id}: ${teil} steht fälschlich in der Seite`);
    }
    // --accent-bold ist kein Editorial-Merkmal mehr: Jede Handschrift nutzt
    // ihn für Text, der sonst unter 4.5:1 gegen den eigenen Grund läge
    // (siehe docs-intern/design-tokens/). Die Archetypen ohne Handschrift
    // haben ihn weiterhin nicht.
    if (!presetFuerArchetyp(stimmung.archetyp).layout.handschrift) {
      assert.ok(!html.includes("--accent-bold"), `${stimmung.id}: --accent-bold steht fälschlich in der Seite`);
    }
  }
});

test("die Editorial-Seite behält Bestellweg und Warenkorb", () => {
  const html = seite(editorialId);
  // Eine Gestaltung, die den Bestellknopf verliert, ist keine Verbesserung.
  assert.ok(html.includes('id="cart-fab"'));
  assert.ok(html.includes('id="order-form"'));
  assert.ok(html.includes('id="karte"'));
  assert.ok(html.includes('id="reservierung"'));
});
