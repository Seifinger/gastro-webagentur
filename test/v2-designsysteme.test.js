import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  kombinationen,
  erzeugeDesignsystem,
  ladeDesignsystem,
  designsystemPfad,
  HERO_VARIANTEN,
  SPACING_SKALA,
  sichereKontrast,
  leiteFarbenAb,
  referenzSignal,
} from "../v2/build/designsystemGenerator.js";
import { istVerboten, VERBOTENE_SCHRIFTEN } from "../v2/build/schriften.js";
import { contrastRatio } from "../src/colorMath.js";
import { stimmungenFuer } from "../src/stimmungen.js";

const alle = kombinationen().map(({ kueche, stimmung }) => ladeDesignsystem(kueche, stimmung.id));

test("für alle 36 Kombinationen liegen JSON und Markdown vor", () => {
  assert.equal(alle.length, 36);
  for (const ds of alle) {
    assert.ok(existsSync(designsystemPfad(ds.kueche, ds.stimmung)));
    assert.ok(existsSync(designsystemPfad(ds.kueche, ds.stimmung).replace(/\.json$/, ".md")));
  }
});

test("die eingecheckten Designsysteme entsprechen dem Generator (kein Handeditieren)", () => {
  for (const { kueche, stimmung } of kombinationen()) {
    const frisch = erzeugeDesignsystem(kueche, stimmung);
    const gespeichert = ladeDesignsystem(kueche, stimmung.id);
    assert.deepEqual(JSON.parse(JSON.stringify(frisch)), gespeichert, `${kueche}/${stimmung.id} veraltet – npm run v2:designsysteme`);
  }
});

test("jede Farbe hat eine Aufgabe und jede Kontrastpaarung erreicht ihr Minimum", () => {
  for (const ds of alle) {
    for (const [rolle, farbe] of Object.entries(ds.farben.rollen)) {
      assert.match(farbe.hex, /^#[0-9a-f]{6}$/, `${ds.id}.${rolle}`);
      assert.ok(farbe.aufgabe.length > 10, `${ds.id}.${rolle} braucht eine Aufgabe`);
    }
    for (const p of ds.kontrastPaare) {
      const k = contrastRatio(ds.farben.rollen[p.vordergrund].hex, ds.farben.rollen[p.hintergrund].hex);
      assert.ok(k >= p.mindest, `${ds.id}: ${p.vordergrund} auf ${p.hintergrund} = ${k.toFixed(2)}`);
    }
  }
});

test("keine verbotene Schrift, Fließtext mindestens 16px", () => {
  for (const ds of alle) {
    const t = ds.typografie;
    for (const f of [t.display.familie, t.text.familie, t.label?.familie].filter(Boolean)) {
      assert.equal(istVerboten(f), false, `${ds.id}: ${f}`);
    }
    for (const verboten of VERBOTENE_SCHRIFTEN) {
      assert.ok(!t.display.stapel.includes(`'${verboten}'`) && !t.text.stapel.includes(`'${verboten}'`), `${ds.id}: Stapel enthält ${verboten}`);
      assert.ok(!t.text.stapel.split(",").map((s) => s.trim()).includes(verboten));
    }
    assert.ok(t.skala.basisPx >= 16);
  }
});

test("Typo-Skala steigt monoton", () => {
  for (const ds of alle) {
    const s = ds.typografie.skala.stufen;
    const reihe = [s.klein.px, s.basis.px, s.gross.px, s.h3.px, s.h2.px, s.h1.px];
    for (let i = 1; i < reihe.length; i += 1) assert.ok(reihe[i] > reihe[i - 1], `${ds.id}: ${reihe}`);
  }
});

test("Spacing liegt komplett auf dem 8px-Raster (4px als einziger Halbschritt)", () => {
  const aufRaster = (n) => n % 8 === 0 || n === 4;
  for (const v of Object.values(SPACING_SKALA)) assert.ok(aufRaster(v), String(v));
  for (const ds of alle) {
    const sp = ds.spacing;
    for (const n of [sp.sektion.desktop, sp.sektion.mobil, sp.sektionBetont.desktop, sp.sektionBetont.mobil, sp.sektionEng.desktop, sp.rinne, sp.rand.desktop, sp.rand.mobil]) {
      assert.ok(aufRaster(n), `${ds.id}: ${n}`);
    }
  }
});

test("mindestens drei strukturell verschiedene Hero-Varianten je Stimmung", () => {
  for (const ds of alle) {
    const strukturen = new Set(ds.layout.heroVarianten.map((h) => HERO_VARIANTEN[h].struktur));
    assert.ok(strukturen.size >= 3, `${ds.id}: ${ds.layout.heroVarianten}`);
  }
});

test("Designsystem trägt Herleitung, Referenzen, verbotene Muster, Bild- und Sprachkanon", () => {
  for (const ds of alle) {
    assert.ok(ds.referenzen.length >= 2);
    assert.ok(ds.typografie.herleitung.length > 0 && ds.spacing.herleitung.length > 0 && ds.layout.herleitung.length > 0);
    assert.ok(ds.verboteneMuster.global.some((m) => m.id === "drei-gleiche-karten"));
    assert.ok(ds.verboteneMuster.kueche.length > 0);
    assert.ok(ds.bildKanon.promptBasis.includes("no text"));
    assert.equal(ds.sprache.anrede, "Sie");
  }
});

test("die Sektionsfolge kommt unverändert aus designPresets.js", () => {
  const abend = alle.find((ds) => ds.archetyp === "abend");
  assert.equal(abend.layout.sektionsReihenfolge[0], "ambiente");
  const hell = alle.find((ds) => ds.archetyp === "hell");
  assert.equal(hell.layout.kopfzeileFest, false);
});

test("sichereKontrast hebt einen zu hellen Ton über 4,5:1", () => {
  const neu = sichereKontrast("#cccccc", ["#ffffff"]);
  assert.ok(contrastRatio(neu, "#ffffff") >= 4.5);
});

test("leiteFarbenAb dämpft den Akzent bei gedeckten Referenzen und protokolliert es", () => {
  const stimmung = stimmungenFuer("italienisch")[0];
  const f = leiteFarbenAb(stimmung, { temperatur: null, saettigung: "gedeckt", akzente: [] });
  assert.ok(f.herleitung.some((h) => h.includes("gedämpft")));
});

test("referenzSignal überspringt nicht auswertbare Referenzen und nennt sie", () => {
  const signal = referenzSignal(
    { referenzen: [{ name: "A", url: "a" }, { name: "B", url: "b" }] },
    (url) => (url === "a" ? { farben: { temperatur: "warm" }, spacing: {}, layout: {}, motion: {}, typografie: {} } : { fehler: "HTTP 403" }),
  );
  assert.deepEqual(signal.fehlend, ["B"]);
  assert.equal(signal.temperatur, "warm");
});

test("Markdown nennt jede Referenz mit Link", () => {
  const ds = alle[0];
  const md = readFileSync(designsystemPfad(ds.kueche, ds.stimmung).replace(/\.json$/, ".md"), "utf-8");
  for (const r of ds.referenzen) assert.ok(md.includes(r.url));
});
