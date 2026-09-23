// Designsystem-Dokument → CSS-Variablen.
//
// Das ist die einzige Stelle, an der Werte aus dem Designsystem in CSS
// übersetzt werden. Die Komponenten-Styles (stil.js) kennen nur die Namen
// der Variablen, keinen einzigen Farb- oder Abstandswert.

import { contrastRatio } from "../../src/colorMath.js";

const kebab = (s) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

export function cssVariablen(ds) {
  const zeilen = [];
  const v = (name, wert) => zeilen.push(`  --${name}: ${wert};`);

  for (const [rolle, farbe] of Object.entries(ds.farben.rollen)) v(kebab(rolle), farbe.hex);
  v("tint-rgb", ds.farben.rollen.tint.rgb);

  const t = ds.typografie;
  v("f-display", t.display.stapel);
  v("f-display-gewicht", t.display.gewicht);
  v("f-display-transform", t.display.versalien ? "uppercase" : "none");
  v("f-display-sperrung", t.display.sperrung);
  v("f-display-zh", t.display.zeilenhoehe);
  v("f-text", t.text.stapel);
  v("f-text-stark", t.text.gewichtStark);
  v("f-text-zh", t.text.zeilenhoehe);
  v("f-label", t.label ? t.label.stapel : t.text.stapel);
  for (const [stufe, s] of Object.entries(t.skala.stufen)) v(`t-${stufe}`, s.fluessig ?? `${s.px}px`);

  const sp = ds.spacing;
  for (const [name, wert] of Object.entries(sp.skala)) v(`s-${name}`, `${wert}px`);
  v("sektion", `${sp.sektion.desktop}px`);
  v("sektion-betont", `${sp.sektionBetont.desktop}px`);
  v("sektion-eng", `${sp.sektionEng.desktop}px`);
  v("rinne", `${sp.rinne}px`);
  v("rand", `${sp.rand.desktop}px`);

  const r = ds.radius;
  v("r-klein", `${r.klein}px`);
  v("r-karte", `${r.karte}px`);
  v("r-knopf", `${r.knopf}px`);
  v("r-bild", `${r.bild}px`);
  v("r-marke", `${r.marke}px`);

  v("schatten-karte", ds.schatten.karte);
  v("schatten-schwebend", ds.schatten.schwebend);

  const m = ds.motion;
  v("m-kurve", m.kurve);
  v("m-kurz", `${m.dauerMs.kurz}ms`);
  v("m-mittel", `${m.dauerMs.mittel}ms`);
  v("m-lang", `${m.dauerMs.lang}ms`);
  v("m-weg", `${m.auftrittDistanzPx}px`);
  v("m-versatz", `${m.versatzMs}ms`);

  v("max-breite", `${ds.layout.maxBreite}px`);
  v("text-breite", ds.layout.textBreite);

  const mobil = [
    `  --sektion: ${sp.sektion.mobil}px;`,
    `  --sektion-betont: ${sp.sektionBetont.mobil}px;`,
    `  --sektion-eng: ${sp.sektionEng.mobil}px;`,
    `  --rand: ${sp.rand.mobil}px;`,
  ];
  return `:root {\n${zeilen.join("\n")}\n}\n@media (max-width: 767px) {\n:root {\n${mobil.join("\n")}\n}\n}`;
}

/**
 * Prüft jede Kontrastpaarung des Designsystems. Liefert die Verstöße;
 * siteBuilder.js bricht bei einem einzigen ab.
 */
export function pruefeKontraste(ds) {
  const rollen = ds.farben.rollen;
  return ds.kontrastPaare
    .map((p) => {
      const vorne = rollen[p.vordergrund]?.hex;
      const hinten = rollen[p.hintergrund]?.hex;
      if (!vorne || !hinten) return { ...p, verhaeltnis: 0, fehlt: true };
      return { ...p, verhaeltnis: Number(contrastRatio(vorne, hinten).toFixed(2)) };
    })
    .filter((p) => p.fehlt || p.verhaeltnis < p.mindest);
}
