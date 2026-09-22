import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analysiereCss,
  farbPalette,
  spacingRhythmus,
  layoutAsymmetrie,
  motionCharakter,
  klassifiziereFamilie,
  analysiereRefero,
  analyseDateiName,
  ladeKatalog,
  stylesheetLinks,
} from "../v2/build/referenzAnalyse.js";
import { sucheStyles } from "../v2/build/referoSuche.js";
import { STIMMUNGEN, GRUND_ARCHETYPEN } from "../src/stimmungen.js";

test("Katalog deckt alle 36 Küche×Stimmung-Kombinationen mit 2–3 Referenzen ab", () => {
  const katalog = ladeKatalog();
  const erwartet = Object.entries(STIMMUNGEN).flatMap(([kueche, liste]) =>
    liste.filter((s) => GRUND_ARCHETYPEN.includes(s.archetyp)).map((s) => `${kueche}/${s.id}`),
  );
  const vorhanden = katalog.kombinationen.map((k) => `${k.kueche}/${k.stimmung}`);
  assert.deepEqual([...vorhanden].sort(), [...erwartet].sort());
  for (const k of katalog.kombinationen) {
    assert.ok(k.referenzen.length >= 2 && k.referenzen.length <= 3, `${k.kueche}/${k.stimmung}`);
    assert.ok(k.richtung.length > 20, "jede Kombination begründet ihre Richtung");
    for (const r of k.referenzen) {
      assert.match(r.url, /^https:\/\//);
      assert.ok(r.warum && r.uebernehmen.length > 0, `${r.name} braucht Begründung und Übernahme`);
    }
  }
});

test("jede Kombination hat mindestens eine reale Restaurant-Website oder einen Gastro-Refero-Style", () => {
  for (const k of ladeKatalog().kombinationen) {
    assert.ok(k.referenzen.some((r) => r.typ === "restaurant") || k.referenzen.length >= 2, `${k.kueche}/${k.stimmung}`);
  }
});

test("farbPalette trennt Hintergrund und Vordergrund und bündelt nahe Töne", () => {
  const p = farbPalette("body{background:#faf6ee;color:#221a14} .b{background-color:#fbf7ef} a{color:#b4451f} .x{border-color:#b4461f}");
  assert.equal(p.hintergrund.length, 1, "#faf6ee und #fbf7ef sind ein Ton");
  assert.equal(p.hintergrund[0].anzahl, 2);
  assert.equal(p.temperatur, "warm");
  assert.equal(p.akzent, "#b4451f");
});

test("fast durchsichtige Farben (Schatten) zählen nicht zur Palette", () => {
  const p = farbPalette(".k{background:rgba(0,0,0,.08)}");
  assert.equal(p.hintergrund.length, 0);
});

test("spacingRhythmus erkennt ein 8px-Raster", () => {
  const r = spacingRhythmus(".a{padding:16px 32px;margin:48px 0;gap:24px} .b{padding:8px} .c{margin-top:4rem}");
  assert.equal(r.basis, 8);
  assert.equal(r.treffer, 1);
});

test("layoutAsymmetrie unterscheidet 1fr 1fr von 5fr 7fr", () => {
  assert.equal(layoutAsymmetrie(".g{grid-template-columns:1fr 1fr}").beschreibung, "symmetrisch");
  assert.equal(layoutAsymmetrie(".g{grid-template-columns:5fr 7fr}").beschreibung, "versetzt/asymmetrisch");
});

test("motionCharakter: keine Übergänge = statisch, viele Keyframes = lebendig", () => {
  assert.equal(motionCharakter("a{color:red}").charakter, "statisch");
  const lebendig = Array.from({ length: 10 }, (_, i) => `@keyframes k${i}{to{opacity:1}}`).join("");
  assert.equal(motionCharakter(lebendig).charakter, "lebendig");
});

test("klassifiziereFamilie ordnet bekannte Schriften ein", () => {
  assert.equal(klassifiziereFamilie("Playfair Display"), "serif");
  assert.equal(klassifiziereFamilie("Oswald"), "schmal");
  assert.equal(klassifiziereFamilie("JetBrains Mono"), "mono");
  assert.equal(klassifiziereFamilie("Neue Haas Unica"), "grotesk");
});

test("analysiereCss liefert alle fünf Kategorien", () => {
  const a = analysiereCss("h1{font-family:'Fraunces',serif;font-size:64px} body{font-family:Karla;font-size:17px}");
  assert.deepEqual(Object.keys(a), ["farben", "typografie", "spacing", "layout", "motion"]);
  assert.equal(a.typografie.displayArt, "serif");
});

test("analysiereRefero übersetzt die strukturierten Refero-Daten", () => {
  const a = analysiereRefero({
    colorScheme: "dark",
    colors: [{ name: "Void", hex: "#140b00" }, { name: "Amber", hex: "#c8792a" }],
    fonts: ["Canela", "Söhne"],
    northStar: "embers on saddle leather, generous whitespace",
  });
  assert.equal(a.typografie.displayArt, "serif");
  assert.equal(a.spacing.dichte, "luftig");
  assert.equal(a.farben.schema, "dark");
});

test("stylesheetLinks löst relative Pfade auf", () => {
  const html = '<link rel="stylesheet" href="/css/a.css"><link href="b.css" rel="preload"><link rel="stylesheet" href="https://cdn.x/c.css">';
  assert.deepEqual(stylesheetLinks(html, "https://beispiel.de/seite/"), ["https://beispiel.de/css/a.css", "https://cdn.x/c.css"]);
});

test("analyseDateiName ist stabil und dateisystemtauglich", () => {
  assert.equal(analyseDateiName("https://www.kuffler.de/de/seehaus"), "kuffler.de-de-seehaus.json");
  assert.equal(analyseDateiName("https://styles.refero.design/style/0d914ef0-fa84-4c60-a9aa-cef0b5eb6e5d"), "refero-0d914ef0-fa84-4c60-a9aa-cef0b5eb6e5d.json");
});

test("sucheStyles ist eine UND-Suche und filtert nach Schema", () => {
  const katalog = [
    { siteName: "Limón", url: "x", northStar: "moody brasserie under candlelight", colorScheme: "dark" },
    { siteName: "Other", url: "y", northStar: "sunny brasserie", colorScheme: "light" },
  ];
  assert.equal(sucheStyles(katalog, ["brasserie"]).length, 2);
  assert.equal(sucheStyles(katalog, ["brasserie", "candlelight"]).length, 1);
  assert.equal(sucheStyles(katalog, ["brasserie"], { schema: "light" })[0].siteName, "Other");
});
