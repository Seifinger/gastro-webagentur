// Designsystem-Generator (Stage 2).
//
// Erzeugt je Küche × Stimmung ein vollständiges Designsystem-Dokument als
// JSON (Maschine: siteBuilder.js liest ausschließlich daraus) und als
// Markdown (Mensch: lesbar, mit Herleitung jedes Werts).
//
// Eingänge:
//   1. die Stimmung aus src/stimmungen.js – Palette, Archetyp, Atmosphäre.
//      Diese Paletten sind in v1 bereits gegen 288 Farbpaare geprüft und
//      bleiben der Ausgangspunkt; v2 erfindet keine Küche neu.
//   2. das Layout des Archetyps aus src/designPresets.js (Sektionsfolge,
//      Kopfzeile, Hauptaktion) – dieselbe Quelle wie v1.
//   3. die Referenzanalyse aus Stage 1 (referenzen/analysen/*.json). Sie
//      verschiebt Temperatur, Sättigung und Akzent, bestimmt Dichte,
//      Asymmetrie und Bewegungscharakter und bestätigt (oder widerspricht)
//      der Schriftwahl.
//
// Jeder abgeleitete Wert trägt in `herleitung` seine Quelle. Kein Designwert
// ohne Herkunft.

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STIMMUNGEN, GRUND_ARCHETYPEN, ARCHETYP_LABEL } from "../../src/stimmungen.js";
import { presetFuerArchetyp } from "../../src/designPresets.js";
import { KUECHEN_LABEL } from "../../src/menuCatalog.js";
import { contrastRatio, mixColors, hexToHsl, hslToHex } from "../../src/colorMath.js";
import { ladeKatalog, ladeAnalyse } from "./referenzAnalyse.js";
import { SCHRIFTEN, schriftStapel, passendesGewicht, istVerboten } from "./schriften.js";
import { bildKanonFuer } from "./bildKanon.js";
import { sprachKanonFuer } from "./sprachKanon.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DESIGNSYSTEM_DIR = path.join(__dirname, "..", "designsysteme");

export const RASTER = 8;
export const WCAG_TEXT = 4.5;
export const WCAG_GROSS = 3;
export const WCAG_UI = 3;

/* ------------------------------------------------------------------ */
/* Schriftpaare – kuratiert, begründet im Entscheidungslog (E2.x)      */
/* ------------------------------------------------------------------ */

// display: Anzeigeschrift, text: Fließtext, versal: Überschriften in
// Versalien, rubrik: wie Rubriken/Eyebrows gesetzt werden.
export const SCHRIFTPAARE = {
  bayerisch: {
    wirtshaus: { display: "Vollkorn", gewicht: 700, text: "Alegreya Sans", rubrik: "versal" },
    kellerstube: { display: "Young Serif", gewicht: 400, text: "Alegreya Sans", rubrik: "etikett" },
    biergarten: { display: "Fraunces", gewicht: 600, text: "Figtree", rubrik: "versal" },
  },
  italienisch: {
    trattoria: { display: "EB Garamond", gewicht: 600, text: "Karla", rubrik: "etikett" },
    "osteria-notte": { display: "Bodoni Moda", gewicht: 600, text: "Instrument Sans", rubrik: "etikett" },
    costiera: { display: "Italiana", gewicht: 400, text: "Figtree", rubrik: "mono" },
  },
  griechisch: {
    "taverne-am-hafen": { display: "Marcellus", gewicht: 400, text: "Hanken Grotesk", rubrik: "versal" },
    "athener-moderne": { display: "Tenor Sans", gewicht: 400, text: "Instrument Sans", rubrik: "versal", versal: true },
    olivenhain: { display: "Cormorant Garamond", gewicht: 600, text: "Work Sans", rubrik: "mono" },
  },
  tuerkisch: {
    basar: { display: "Barlow Condensed", gewicht: 700, text: "Work Sans", rubrik: "versal", versal: true },
    "bosporus-nacht": { display: "Gloock", gewicht: 400, text: "Instrument Sans", rubrik: "etikett" },
    "anatolische-erde": { display: "Alegreya", gewicht: 700, text: "Alegreya Sans", rubrik: "versal" },
  },
  syrisch: {
    "damaszener-hof": { display: "Amiri", gewicht: 700, text: "Karla", rubrik: "versal" },
    gewuerzbasar: { display: "Reem Kufi", gewicht: 600, text: "Instrument Sans", rubrik: "versal", versal: true },
    "levante-modern": { display: "Libre Caslon Display", gewicht: 400, text: "Figtree", rubrik: "etikett" },
  },
  chinesisch: {
    "rote-laterne": { display: "Noto Serif Display", gewicht: 700, text: "Libre Franklin", rubrik: "versal" },
    "shanghai-nacht": { display: "Poiret One", gewicht: 400, text: "Instrument Sans", rubrik: "versal", versal: true },
    teehaus: { display: "Gilda Display", gewicht: 400, text: "Zen Kaku Gothic New", rubrik: "versal" },
  },
  thailaendisch: {
    orchidee: { display: "Yeseva One", gewicht: 400, text: "Karla", rubrik: "etikett" },
    "streetfood-nacht": { display: "Big Shoulders Display", gewicht: 800, text: "Libre Franklin", rubrik: "versal", versal: true },
    andamanen: { display: "Newsreader", gewicht: 500, text: "Figtree", rubrik: "mono" },
  },
  vietnamesisch: {
    indochine: { display: "Cormorant Garamond", gewicht: 700, text: "Source Serif 4", rubrik: "etikett" },
    "hanoi-nacht": { display: "DM Serif Display", gewicht: 400, text: "Instrument Sans", rubrik: "etikett" },
    strassenkueche: { display: "Chivo", gewicht: 800, text: "Karla", rubrik: "mono" },
  },
  japanisch: {
    izakaya: { display: "Antonio", gewicht: 700, text: "Zen Kaku Gothic New", rubrik: "versal", versal: true },
    omakase: { display: "Shippori Mincho", gewicht: 600, text: "Zen Kaku Gothic New", rubrik: "versal" },
    washitsu: { display: "Zen Old Mincho", gewicht: 600, text: "Zen Kaku Gothic New", rubrik: "versal" },
  },
  indisch: {
    gewuerzmarkt: { display: "Fjalla One", gewicht: 400, text: "Libre Franklin", rubrik: "versal", versal: true },
    maharadscha: { display: "Rozha One", gewicht: 400, text: "Instrument Sans", rubrik: "etikett" },
    "suedindisch-hell": { display: "Literata", gewicht: 600, text: "Figtree", rubrik: "versal" },
  },
  asiatisch: {
    marktstand: { display: "Archivo Black", gewicht: 400, text: "Work Sans", rubrik: "mono" },
    neon: { display: "Saira Extra Condensed", gewicht: 700, text: "Instrument Sans", rubrik: "versal", versal: true },
    "fusion-minimal": { display: "Instrument Serif", gewicht: 400, text: "Hanken Grotesk", rubrik: "versal" },
  },
  cafe: {
    "wiener-kaffeehaus": { display: "Old Standard TT", gewicht: 700, text: "Libre Franklin", rubrik: "versal" },
    konditorei: { display: "Rufina", gewicht: 700, text: "Karla", rubrik: "etikett" },
    "third-wave": { display: "Schibsted Grotesk", gewicht: 800, text: "Karla", rubrik: "mono" },
  },
};

/* ------------------------------------------------------------------ */
/* Referenz-Signal                                                     */
/* ------------------------------------------------------------------ */

function mehrheit(werte) {
  const zaehler = new Map();
  for (const w of werte.filter((x) => x && x !== "unbekannt")) zaehler.set(w, (zaehler.get(w) ?? 0) + 1);
  const sortiert = [...zaehler.entries()].sort((a, b) => b[1] - a[1]);
  return sortiert[0]?.[0] ?? null;
}

/**
 * Verdichtet die Analysen aller Referenzen einer Kombination zu einem
 * Signal. Nicht erreichbare Referenzen fallen heraus und werden genannt.
 */
export function referenzSignal(kombination, lade = ladeAnalyse) {
  const analysen = [];
  const fehlend = [];
  for (const r of kombination?.referenzen ?? []) {
    const a = lade(r.url);
    if (!a || a.fehler) fehlend.push(r.name);
    else analysen.push({ name: r.name, typ: r.typ, a });
  }
  const akzente = analysen.map(({ a }) => a.farben?.akzent).filter(Boolean);
  return {
    quellen: analysen.map(({ name, typ, a }) => ({ name, typ, modus: a.modus ?? a.quelle })),
    fehlend,
    temperatur: mehrheit(analysen.map(({ a }) => a.farben?.temperatur)),
    helligkeit: mehrheit(analysen.map(({ a }) => a.farben?.helligkeit ?? (a.farben?.schema === "dark" ? "dunkel" : a.farben?.schema === "light" ? "hell" : null))),
    saettigung: mehrheit(analysen.map(({ a }) => a.farben?.saettigung)),
    akzente,
    dichte: mehrheit(analysen.map(({ a }) => a.spacing?.dichte)),
    rasterBasis: mehrheit(analysen.map(({ a }) => (a.spacing?.basis ? String(a.spacing.basis) : null))),
    layout: mehrheit(analysen.map(({ a }) => a.layout?.beschreibung)),
    motion: mehrheit(analysen.map(({ a }) => a.motion?.charakter)),
    displayArten: analysen.map(({ a }) => a.typografie?.displayArt).filter((x) => x && x !== "unbekannt"),
    versalien: analysen.filter(({ a }) => a.typografie?.versalienUeberschrift || (a.typografie?.versalienAnteil ?? 0) > 0.15).length,
    leitsaetze: analysen.map(({ a }) => a.leitsatz).filter(Boolean),
  };
}

/* ------------------------------------------------------------------ */
/* Farben                                                              */
/* ------------------------------------------------------------------ */

const WARM_HUE = 36;
const KUEHL_HUE = 212;

/** Tönt einen fast unbunten Ton leicht in Richtung warm/kühl, Helligkeit bleibt. */
function toene(hex, zielHue, staerke) {
  const hsl = hexToHsl(hex);
  if (hsl.s > 30) return hex;
  const s = Math.min(28, hsl.s + staerke);
  return hslToHex({ h: zielHue, s, l: hsl.l });
}

function hueAbstand(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Verschiebt die Helligkeit, bis der Ton gegen alle Gründe mindestens `ziel` erreicht. */
export function sichereKontrast(hex, gruende, ziel = WCAG_TEXT) {
  const liste = Array.isArray(gruende) ? gruende : [gruende];
  const schlechtester = (f) => Math.min(...liste.map((g) => contrastRatio(f, g)));
  if (schlechtester(hex) >= ziel) return hex;
  const mittelLum = liste.reduce((s, g) => s + hexToHsl(g).l, 0) / liste.length;
  const richtung = mittelLum > 50 ? -1 : 1;
  const hsl = hexToHsl(hex);
  let kandidat = hex;
  for (let i = 0; i < 100 && schlechtester(kandidat) < ziel; i += 1) {
    hsl.l = Math.max(0, Math.min(100, hsl.l + richtung));
    kandidat = hslToHex(hsl);
    if (hsl.l === 0 || hsl.l === 100) break;
  }
  return kandidat;
}

/**
 * Knopffarbe + Knopfschrift: Weiß oder dunkle Tinte, je nachdem was trägt.
 * Reicht keins, wird der Akzent selbst verschoben – die Knopfschrift ist
 * nicht verhandelbar.
 */
function knopfPaar(akzent, dunkel) {
  const kandidaten = ["#ffffff", dunkel];
  let a = akzent;
  for (let i = 0; i < 60; i += 1) {
    const best = kandidaten.map((t) => ({ t, k: contrastRatio(a, t) })).sort((x, y) => y.k - x.k)[0];
    if (best.k >= WCAG_TEXT) return { akzent: a, aufAkzent: best.t };
    const hsl = hexToHsl(a);
    hsl.l += best.t === "#ffffff" ? -1 : 1;
    a = hslToHex(hsl);
  }
  return { akzent: a, aufAkzent: "#ffffff" };
}

export function leiteFarbenAb(stimmung, signal) {
  const herleitung = [];
  let { bg, surface, soft, ink, inkSoft, line, accent, gold, tint } = stimmung;

  // 1. Temperatur der Referenzen tönt die Neutralen. Nur leicht: Die Küche
  //    bleibt erkennbar, die Referenz zieht sie in eine Richtung.
  if (signal.temperatur === "warm" || signal.temperatur === "kühl") {
    const ziel = signal.temperatur === "warm" ? WARM_HUE : KUEHL_HUE;
    const vorher = bg;
    bg = toene(bg, ziel, 6);
    soft = toene(soft, ziel, 8);
    line = toene(line, ziel, 8);
    herleitung.push(`Neutrale ${signal.temperatur} getönt (${vorher} → ${bg}), weil die Referenzen mehrheitlich ${signal.temperatur} sind.`);
  }

  // 2. Sättigung: gedeckte Referenzen dämpfen den Akzent. Grelle Akzente sind
  //    das häufigste Merkmal generierter Seiten.
  const akzentHsl = hexToHsl(accent);
  if (signal.saettigung === "fast unbunt" || signal.saettigung === "gedeckt") {
    const faktor = signal.saettigung === "fast unbunt" ? 0.8 : 0.9;
    const neu = hslToHex({ ...akzentHsl, s: akzentHsl.s * faktor });
    herleitung.push(`Akzent gedämpft (${accent} → ${neu}, Sättigung ×${faktor}), Referenzen sind ${signal.saettigung}.`);
    accent = neu;
  }

  // 3. Liegt ein Referenz-Akzent in derselben Farbfamilie, wird der eigene
  //    Akzent ein Fünftel in dessen Richtung gezogen – bestätigt durch eine
  //    echte Seite statt frei gewählt.
  const nah = signal.akzente
    .map((hex) => ({ hex, d: hueAbstand(hexToHsl(hex).h, hexToHsl(accent).h) }))
    .filter((x) => x.d <= 35 && hexToHsl(x.hex).s > 20)
    .sort((a, b) => a.d - b.d)[0];
  if (nah) {
    const neu = mixColors(accent, nah.hex, 0.8);
    herleitung.push(`Akzent 20 % Richtung Referenz-Akzent ${nah.hex} gezogen (${accent} → ${neu}).`);
    accent = neu;
  } else if (signal.akzente.length) {
    herleitung.push(`Kein Referenz-Akzent in derselben Farbfamilie (${signal.akzente.join(", ")}) – Küchen-Akzent bleibt.`);
  }

  // 4. Kontraste sichern (Build prüft sie danach noch einmal hart).
  const dunkel = stimmung.dark;
  const tinte = dunkel ? tint : ink;
  let knopf = knopfPaar(accent, dunkel ? "#141013" : tinte);
  // Der Knopf muss sich als Fläche vom Grund abheben (WCAG 1.4.11, 3:1).
  // Helle Orangetöne auf Cream schaffen das nicht – dann wird der Akzent
  // Richtung Kontrast geschoben und die Knopfschrift neu gewählt.
  for (let i = 0; i < 60 && contrastRatio(knopf.akzent, bg) < WCAG_UI; i += 1) {
    const hsl = hexToHsl(knopf.akzent);
    hsl.l += dunkel ? 1 : -1;
    knopf = knopfPaar(hslToHex(hsl), dunkel ? "#141013" : tinte);
  }
  if (knopf.akzent !== accent) herleitung.push(`Akzent für lesbare Knopfschrift und 3:1 gegen den Grund verschoben (${accent} → ${knopf.akzent}).`);
  accent = knopf.akzent;
  const akzentTief = sichereKontrast(mixColors(accent, dunkel ? "#ffffff" : "#000000", 0.82), [knopf.aufAkzent], WCAG_TEXT);
  const textLeise = sichereKontrast(inkSoft, [bg, surface, soft]);
  if (textLeise !== inkSoft) herleitung.push(`Leiser Text für 4,5:1 auf allen Gründen nachgedunkelt (${inkSoft} → ${textLeise}).`);
  const akzentText = sichereKontrast(accent, [bg, surface, soft]);
  const signalText = sichereKontrast(gold, [bg, surface, soft]);
  const aufTint = sichereKontrast(dunkel ? ink : mixColors(bg, "#ffffff", 0.5), [tint], 7);
  const aufTintLeise = sichereKontrast(mixColors(aufTint, tint, 0.72), [tint]);
  const signalAufTint = sichereKontrast(gold, [tint]);
  const linieStark = sichereKontrast(mixColors(line, ink, 0.45), [surface, bg], WCAG_UI);
  const fehler = sichereKontrast(dunkel ? "#ff8a80" : "#b3261e", [surface, bg, soft]);

  const f = (hex, aufgabe, verwendung, extra = {}) => ({ hex, aufgabe, verwendung, ...extra });
  return {
    schema: dunkel ? "dunkel" : "hell",
    rollen: {
      grund: f(bg, "Seitengrund – trägt rund 60 % der Fläche", ["body", "Sektionen ohne eigene Fläche"]),
      flaeche: f(surface, "Erhöhte Fläche – Formulare, Warenkorb, Tafeln", ["Formular-Panel", "Drawer", "Menütafel"]),
      flaecheTief: f(soft, "Zweiter Grund für Sektionswechsel – ersetzt Trennlinien", ["jede zweite Sektion", "Passepartout"]),
      text: f(ink, "Fließtext und Überschriften", ["body", "h1–h3"]),
      textLeise: f(textLeise, "Nebeninformation: Beschreibungen, Hinweise, Zeiten", ["Gerichtsbeschreibung", "Formularhinweis"]),
      linie: f(line, "Dekorative Haarlinie – nie alleiniger Träger von Information", ["Tabellenzeilen", "Sektionskanten"]),
      linieStark: f(linieStark, "Begrenzung von Bedienelementen (≥ 3:1)", ["Eingabefelder", "Mengenknöpfe"]),
      akzent: f(accent, "Handlung – ausschließlich Knöpfe und aktive Zustände", ["Primärknopf", "Fokusring", "aktive Rubrik"], { maxFlaechenAnteil: 0.08 }),
      akzentTief: f(akzentTief, "Hover/gedrückt des Primärknopfs", ["Primärknopf :hover"]),
      aufAkzent: f(knopf.aufAkzent, "Schrift auf Akzentfläche", ["Primärknopf-Beschriftung"]),
      akzentText: f(akzentText, "Akzent als Schrift – Links, Rubriken, Preise", ["Links", "Rubrik", "Plus-Knopf"]),
      signal: f(gold, "Signalton für kleine Marken – nie als Fläche", ["Sterne", "Hausempfehlung-Siegel"]),
      signalText: f(signalText, "Signalton als lesbare Schrift auf hellen Gründen", ["Platzhalter-Kennzeichnung", "Note"]),
      tint: f(tint, "Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay", ["Hero-Tafel", "Fußzeile"], { rgb: tintRgb(tint) }),
      aufTint: f(aufTint, "Schrift auf der Tafel", ["Hero-Tafel", "Fußzeile"]),
      aufTintLeise: f(aufTintLeise, "Nebenschrift auf der Tafel", ["Fußzeilen-Links"]),
      signalAufTint: f(signalAufTint, "Signalton auf der Tafel", ["Sterne im Hero"]),
      fehler: f(fehler, "Fehlermeldungen in Formularen", ["Formularfehler", "Ablehnung"]),
    },
    herleitung,
  };
}

function tintRgb(hex) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(",");
}

/**
 * Jedes Paar aus Schrift und Grund, das auf einer v2-Seite tatsächlich
 * vorkommt. siteBuilder.js prüft genau diese Liste und bricht bei einem
 * einzigen Verstoß ab.
 */
export function kontrastPaare() {
  const text = (v, h) => ({ vordergrund: v, hintergrund: h, mindest: WCAG_TEXT, art: "text" });
  const ui = (v, h) => ({ vordergrund: v, hintergrund: h, mindest: WCAG_UI, art: "ui" });
  return [
    text("text", "grund"), text("text", "flaeche"), text("text", "flaecheTief"),
    text("textLeise", "grund"), text("textLeise", "flaeche"), text("textLeise", "flaecheTief"),
    text("akzentText", "grund"), text("akzentText", "flaeche"), text("akzentText", "flaecheTief"),
    text("aufAkzent", "akzent"), text("aufAkzent", "akzentTief"),
    text("signalText", "grund"), text("signalText", "flaeche"), text("signalText", "flaecheTief"),
    text("aufTint", "tint"), text("aufTintLeise", "tint"), text("signalAufTint", "tint"),
    text("fehler", "flaeche"), text("fehler", "grund"), text("fehler", "flaecheTief"),
    ui("linieStark", "flaeche"), ui("linieStark", "grund"),
    ui("akzent", "grund"),
  ];
}

/* ------------------------------------------------------------------ */
/* Typografie                                                          */
/* ------------------------------------------------------------------ */

const SKALA_JE_ARCHETYP = { traditionell: 1.25, abend: 1.333, hell: 1.2 };
const SKALA_NAME = { 1.2: "kleine Terz", 1.25: "große Terz", 1.333: "Quarte", 1.414: "übermäßige Quarte" };

const px = (n) => `${Math.round(n)}px`;
const rem = (n) => `${Number((n / 16).toFixed(3))}rem`;

export function leiteTypografieAb(kueche, stimmung, signal) {
  // Fallback für v1-Stimmungen mit "-editorial"-Suffix (z. B. "trattoria-editorial"):
  // Editorial-Stimmungen nutzen die Schriftpaare ihrer Basis-Stimmung.
  let schriftpaareId = stimmung.id;
  if (schriftpaareId.endsWith("-editorial")) {
    schriftpaareId = schriftpaareId.replace(/-editorial$/, "");
  }
  const paar = SCHRIFTPAARE[kueche]?.[schriftpaareId];
  if (!paar) throw new Error(`Kein Schriftpaar für ${kueche}/${stimmung.id}`);
  for (const familie of [paar.display, paar.text]) {
    if (istVerboten(familie)) throw new Error(`${familie} ist verboten`);
  }
  const herleitung = [];
  const displayArt = SCHRIFTEN[paar.display].art;
  const refArten = signal.displayArten;
  const passend = refArten.filter((a) => a === displayArt || (displayArt === "grotesk" && a === "schmal") || (displayArt === "schmal" && a === "grotesk")).length;
  herleitung.push(
    refArten.length
      ? `${passend} von ${refArten.length} ausgewerteten Referenzen führen ebenfalls mit ${displayArt === "serif" ? "Serife" : displayArt === "schmal" ? "schmaler Grotesk" : "Grotesk"} (${refArten.join(", ")}).`
      : "Keine Referenz lieferte eine auswertbare Anzeigeschrift – Wahl nach Stimmung.",
  );

  let ratio = SKALA_JE_ARCHETYP[stimmung.archetyp] ?? 1.25;
  // Kontrastreiche Referenzen (große Headline, kleiner Text) heben die Skala
  // um eine Stufe – aber nie über die Quarte hinaus bei hellen Häusern.
  if (signal.dichte === "luftig" && stimmung.archetyp !== "hell" && ratio < 1.333) {
    ratio = 1.333;
    herleitung.push("Skala auf Quarte angehoben: Referenzen sind luftig, große Headlines tragen.");
  }
  const textArt = SCHRIFTEN[paar.text].art;
  // Schriften mit kleiner x-Höhe brauchen 18px, um wie 17px zu wirken.
  const basis = textArt === "serif" || ["Karla", "Alegreya Sans", "Zen Kaku Gothic New"].includes(paar.text) ? 18 : 17;
  const schmal = displayArt === "schmal";
  const stufe = (n) => basis * ratio ** n;

  const stufen = {
    klein: { px: Math.max(14, Math.round(basis / ratio)), einsatz: "Labels, Hinweise, Rubriken" },
    basis: { px: basis, einsatz: "Fließtext, Formular" },
    gross: { px: Math.round(stufe(1)), einsatz: "Einleitungen, Preise der Hausempfehlung" },
    h3: { px: Math.round(stufe(2)), einsatz: "Gerichtsnamen, Kartenköpfe" },
    h2: { px: Math.round(stufe(4)), mobil: Math.round(stufe(3)), einsatz: "Sektionstitel" },
    h1: { px: Math.round(stufe(6) * (schmal ? 1.15 : 1)), mobil: Math.round(stufe(4.5)), einsatz: "Name des Hauses" },
    display: { px: Math.round(stufe(7) * (schmal ? 1.2 : 1)), mobil: Math.round(stufe(5)), einsatz: "Typo-Hero" },
  };
  for (const s of Object.values(stufen)) {
    s.rem = rem(s.px);
    if (s.mobil) s.fluessig = `clamp(${rem(s.mobil)}, ${((s.px / 1280) * 100).toFixed(2)}vw, ${rem(s.px)})`;
  }

  const versal = Boolean(paar.versal);
  return {
    display: {
      familie: paar.display,
      stapel: schriftStapel(paar.display),
      gewicht: passendesGewicht(paar.display, paar.gewicht),
      art: displayArt,
      charakter: SCHRIFTEN[paar.display].charakter,
      versalien: versal,
      sperrung: versal ? "0.04em" : displayArt === "serif" ? "-0.012em" : "-0.02em",
      zeilenhoehe: schmal ? 1.02 : versal ? 1.06 : 1.1,
    },
    text: {
      familie: paar.text,
      stapel: schriftStapel(paar.text),
      gewicht: 400,
      gewichtStark: passendesGewicht(paar.text, 600),
      art: textArt,
      charakter: SCHRIFTEN[paar.text].charakter,
      zeilenhoehe: textArt === "serif" ? 1.65 : 1.6,
    },
    label:
      paar.rubrik === "mono"
        ? { familie: "Courier Prime", stapel: schriftStapel("Courier Prime"), gewicht: 400 }
        : null,
    rubrik: {
      stil: paar.rubrik,
      beschreibung: {
        versal: "Versalien, weit gesperrt (0.14em), klein",
        etikett: "Anzeigeschrift aufrecht in Einleitungsgröße – wie ein Etikett (keine künstliche Kursive)",
        mono: "Schreibmaschine – Etikett, Zeit, Preis",
      }[paar.rubrik],
    },
    skala: { verhaeltnis: ratio, name: SKALA_NAME[ratio] ?? String(ratio), basisPx: basis, stufen },
    herleitung,
  };
}

/* ------------------------------------------------------------------ */
/* Spacing, Radius, Schatten, Motion                                   */
/* ------------------------------------------------------------------ */

export const SPACING_SKALA = { halb: 4, 1: 8, 2: 16, 3: 24, 4: 32, 5: 40, 6: 48, 8: 64, 10: 80, 12: 96, 16: 128 };

function snap(n, schritt = 4) {
  return Math.max(0, Math.round(n / schritt) * schritt);
}

export function leiteSpacingAb(stimmung, signal) {
  const dichte = signal.dichte ?? (stimmung.archetyp === "hell" ? "ausgewogen" : "luftig");
  const sektion = {
    luftig: { desktop: 128, mobil: 64 },
    ausgewogen: { desktop: 96, mobil: 64 },
    dicht: { desktop: 80, mobil: 48 },
  }[dichte] ?? { desktop: 96, mobil: 64 };
  return {
    raster: RASTER,
    halbschritt: 4,
    skala: SPACING_SKALA,
    sektion,
    sektionBetont: { desktop: sektion.desktop + 32, mobil: sektion.mobil + 16 },
    sektionEng: { desktop: 48, mobil: 32 },
    rinne: stimmung.archetyp === "hell" ? 24 : 32,
    rand: { desktop: 48, mobil: 24 },
    herleitung: [
      signal.dichte
        ? `Sektionsabstand ${sektion.desktop}px: Referenzen sind mehrheitlich „${signal.dichte}“.`
        : `Sektionsabstand ${sektion.desktop}px aus dem Archetyp (keine Referenz mit auswertbarer Dichte).`,
      signal.rasterBasis ? `Referenzen nutzen ein ${signal.rasterBasis}px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).` : "8px-Raster als Vorgabe.",
    ],
  };
}

export function leiteRadiusAb(stimmung) {
  const v1 = parseInt(stimmung.radius, 10) || 8;
  const archetyp = stimmung.archetyp;
  const karte = archetyp === "abend" ? Math.min(snap(v1), 8) : snap(v1);
  return {
    klein: archetyp === "abend" ? 2 : snap(Math.max(2, karte / 3), 2),
    karte,
    knopf: archetyp === "hell" ? Math.min(karte, 12) : archetyp === "abend" ? 2 : snap(Math.min(karte, 8), 2),
    bild: archetyp === "abend" ? 0 : karte,
    marke: 999,
    herleitung: [`Kartenradius aus v1-Stimmung (${stimmung.radius}) auf 4px gerastert${archetyp === "abend" ? ", im Abendhaus auf höchstens 8px begrenzt" : ""}; Pillenform nur für kleine Marken.`],
  };
}

export function leiteSchattenAb(stimmung, farben) {
  if (stimmung.dark || stimmung.archetyp === "hell") {
    return {
      stil: "linie",
      karte: `0 0 0 1px ${farben.rollen.linie.hex}`,
      schwebend: `0 24px 48px -24px rgba(${farben.rollen.tint.rgb},.55)`,
      herleitung: [stimmung.dark ? "Dunkler Grund: Schatten wären unsichtbar – Kanten statt Schatten." : "Helles Haus: flach, Kanten statt Schatten."],
    };
  }
  return {
    stil: "papier",
    karte: `0 1px 0 ${farben.rollen.linie.hex}, 0 16px 32px -24px rgba(${farben.rollen.tint.rgb},.35)`,
    schwebend: `0 24px 56px -24px rgba(${farben.rollen.tint.rgb},.45)`,
    herleitung: ["Traditionell: ein Papierschatten – Kante plus weicher Fall, nie auf jeder Karte."],
  };
}

const MOTION_JE_ARCHETYP = {
  // Dieselben Kurven wie die Handschrift der v1-Archetypen (styles/handschrift.css.js).
  traditionell: { kurve: "cubic-bezier(.2,.72,.3,1)", dauer: 520, distanz: 24, versatz: 80 },
  abend: { kurve: "cubic-bezier(.5,0,.1,1)", dauer: 720, distanz: 16, versatz: 120 },
  hell: { kurve: "cubic-bezier(.16,1,.3,1)", dauer: 360, distanz: 16, versatz: 48 },
};

export function leiteMotionAb(stimmung, signal) {
  const basis = MOTION_JE_ARCHETYP[stimmung.archetyp] ?? MOTION_JE_ARCHETYP.traditionell;
  let { dauer, distanz } = basis;
  const herleitung = [`Kurve ${basis.kurve} aus der v1-Handschrift „${stimmung.archetyp}“.`];
  if (signal.motion === "lebendig") {
    dauer = Math.round(dauer * 0.85);
    herleitung.push("Referenzen bewegen sich lebendig – Auftritte 15 % kürzer.");
  } else if (signal.motion === "statisch") {
    dauer = Math.round(dauer * 1.1);
    distanz = 8;
    herleitung.push("Referenzen sind nahezu statisch – Auftrittsweg auf 8px verkürzt.");
  }
  return {
    kurve: basis.kurve,
    dauerMs: { kurz: 160, mittel: Math.round(dauer * 0.6), lang: dauer },
    auftrittDistanzPx: snap(distanz, 8),
    versatzMs: basis.versatz,
    regeln: [
      "Animiert werden nur transform und opacity.",
      "Startzustände hängen an einer Klasse, die erst das Skript setzt – ohne JS ist alles sichtbar.",
      "prefers-reduced-motion: reduce schaltet jede Bewegung ab.",
      "Genau ein betonter Moment je Seite (siehe layout.betonterMoment).",
    ],
    herleitung,
  };
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

// Strukturell verschiedene Hero-Aufbauten. `struktur` ist die Signatur, an
// der siteBuilder.js prüft, dass eine Stimmung wirklich drei verschiedene
// Aufbauten hat und nicht dreimal denselben mit anderer Farbe.
export const HERO_VARIANTEN = {
  "spalte-bild": { struktur: "raster:text|bild;verhaeltnis:5/7;bild:randabfallend", beschreibung: "Textspalte auf dem Grund links, Foto randabfallend rechts" },
  tafel: { struktur: "vollbild:bild;ebene:tafel-unten-links", beschreibung: "Vollbild-Foto, darauf eine deckende Tafel unten links – kein Verlaufsschleier" },
  karte: { struktur: "raster:text|menuetafel;bild:einschub", beschreibung: "Name und Claim links, rechts eine Tagesempfehlung als Menütafel, Foto als Einschub" },
  typo: { struktur: "stapel:name-uebergross;band:bild-21x9", beschreibung: "Übergroßer Name über die Breite, darunter ein Bildband im Kinoformat" },
  passepartout: { struktur: "rahmen:bild;text:versetzt-ueberlappend", beschreibung: "Foto im Passepartout, Textblock überlappt die Rahmenkante versetzt" },
  streifen: { struktur: "stapel:text;band:drei-ungleiche-bilder-2/1/1", beschreibung: "Text oben, darunter drei Fotos in ungleichen Breiten" },
};

const HERO_JE_ARCHETYP = {
  traditionell: ["spalte-bild", "karte", "passepartout", "tafel"],
  abend: ["tafel", "passepartout", "typo", "spalte-bild"],
  hell: ["typo", "karte", "streifen", "spalte-bild"],
};

export function leiteLayoutAb(stimmung, signal) {
  const preset = presetFuerArchetyp(stimmung.archetyp);
  const herleitung = [`Sektionsfolge, Kopfzeile und Hauptaktion aus designPresets.js (Archetyp „${stimmung.archetyp}“).`];
  let hero = [...HERO_JE_ARCHETYP[stimmung.archetyp]];
  const asymmetrisch = signal.layout === "versetzt/asymmetrisch" || signal.layout === "gemischt";
  if (!asymmetrisch) {
    // Streng symmetrische Referenzen: die versetzten Aufbauten nach hinten.
    hero = [...hero.filter((h) => !["passepartout", "streifen"].includes(h)), ...hero.filter((h) => ["passepartout", "streifen"].includes(h))];
    herleitung.push("Referenzen eher symmetrisch – versetzte Hero-Aufbauten nachrangig.");
  } else {
    herleitung.push(`Referenzen ${signal.layout} – asymmetrisches Raster 5/7.`);
  }
  const betont = { traditionell: "hero", abend: "reservierung", hell: "highlights" }[stimmung.archetyp];
  return {
    maxBreite: { traditionell: 1200, abend: 1120, hell: 1280 }[stimmung.archetyp],
    spalten: 12,
    verhaeltnis: asymmetrisch ? "5/7" : "6/6",
    textBreite: "62ch",
    heroVarianten: hero,
    sektionsReihenfolge: preset.layout.sectionOrder,
    kopfzeileFest: preset.header.sticky !== false,
    primaerAktion: preset.hero.primaryAction,
    mobileAktionsleiste: preset.mobile.stickyActionBar !== false,
    highlights: { traditionell: "treppe", abend: "leseliste", hell: "reihe" }[stimmung.archetyp],
    karte: { traditionell: "tafel", abend: "spalten", hell: "liste" }[stimmung.archetyp],
    stimmen: { traditionell: "blatt", abend: "zitat", hell: "zeilen" }[stimmung.archetyp],
    betonterMoment: betont,
    sektionsWechsel: "Flächenwechsel grund ↔ flaecheTief statt Trennlinien",
    herleitung,
  };
}

/* ------------------------------------------------------------------ */
/* Verbotene Muster                                                    */
/* ------------------------------------------------------------------ */

export const VERBOTENE_MUSTER_GLOBAL = [
  { id: "drei-gleiche-karten", beschreibung: "Drei gleich gebaute Karten (Bild/Icon + Überschrift + Text) nebeneinander", pruefung: "lint" },
  { id: "mehrfarb-verlauf", beschreibung: "Verläufe über mehrere Farbtöne (Lila→Blau, Sonnenuntergang); erlaubt ist nur ein Ton in verschiedenen Deckkräften", pruefung: "lint" },
  { id: "generische-schrift", beschreibung: "Inter, Roboto, system-ui und die übrigen Standardschriften generierter Seiten", pruefung: "lint" },
  { id: "kleine-textschrift", beschreibung: "Fließtext unter 16px", pruefung: "lint" },
  { id: "raster-bruch", beschreibung: "Abstände außerhalb des 8px-Rasters (4px nur als Halbschritt)", pruefung: "lint" },
  { id: "text-auf-foto-mit-verlauf", beschreibung: "Zentrierter Text direkt auf abgedunkeltem Foto mit Verlaufsschleier", pruefung: "lint" },
  { id: "glasmorphismus", beschreibung: "Milchglas-Flächen (backdrop-filter: blur)", pruefung: "lint" },
  { id: "emoji-icons", beschreibung: "Emoji als Symbole statt gezeichneter Zeichen", pruefung: "lint" },
  { id: "leucht-schatten", beschreibung: "Leuchtende text-shadow/box-shadow in Akzentfarbe (Neon-Glow)", pruefung: "lint" },
  { id: "pillen-flut", beschreibung: "Pillenform (radius 999) auf Knöpfen und Karten – nur kleine Marken dürfen rund sein", pruefung: "lint" },
  { id: "akzent-flut", beschreibung: "Akzentfarbe auf mehr als 8 % der sichtbaren Fläche", pruefung: "judge" },
  { id: "fremde-farben", beschreibung: "Farben, die nicht aus der Palette stammen", pruefung: "judge" },
  { id: "gleichfoermige-sektionen", beschreibung: "Jede Sektion gleich hoch, gleich zentriert, gleich gepolstert", pruefung: "judge" },
  { id: "werbe-floskeln", beschreibung: "„Willkommen bei“, „Tauchen Sie ein“, „kulinarische Reise“ und verwandte Formeln", pruefung: "copy" },
];

const VERBOTEN_JE_KUECHE = {
  bayerisch: ["Rautenmuster und blau-weißes Karo", "Lederhosen-/Dirndl-Clipart", "Frakturschrift als Dekoration"],
  italienisch: ["Rot-weiß-grüne Flaggenstreifen", "Karo-Tischdecke als Hintergrund", "Kolosseum-/Gondel-Motive"],
  griechisch: ["Mäanderbordüren", "Säulen und Tempel-Silhouetten", "Flaggenblau als Vollfläche"],
  tuerkisch: ["Halbmond-Ornamente", "Bauchtanz-/Basar-Kitsch", "Gold-Arabesken als Rahmen"],
  syrisch: ["Wüsten- und Kamelmotive", "Laternen-Clipart", "Goldene Arabesken-Rahmen"],
  chinesisch: ["Drachen und Glückskatzen", "Gold auf Rot als Vollfläche", "Pinsel-Imitationsschriften"],
  thailaendisch: ["Buddha-Figuren als Dekoration", "Tempeldach-Silhouetten", "Orchideen-Clipart"],
  vietnamesisch: ["Reishut-Clipart", "Flaggen-Sterne", "Bambus-Rahmen"],
  japanisch: ["Kirschblüten-Clipart", "Pinselschrift-Imitationen", "Wellen-Holzschnitt als Hintergrund"],
  indisch: ["Mandala-Muster", "Taj-Mahal-Silhouetten", "Henna-Ornamente als Rahmen"],
  asiatisch: ["Mischung aus Pagode, Drache und Kirschblüte", "Essstäbchen als Aufzählungszeichen"],
  cafe: ["Kaffeebohnen-Clipart", "Latte-Art-Stockfoto als Hero", "Kreidetafel-Schriften"],
};

const VERBOTEN_JE_ARCHETYP = {
  traditionell: ["Neonfarben", "Glanz-Knöpfe"],
  abend: ["helle Vollflächen-Sektionen", "mehr als ein Akzentton", "schnelle Bewegungen unter 300ms"],
  hell: ["schwere, dunkle Fotos", "Schatten auf Karten", "zentrierte Fließtexte"],
};

export function verboteneMuster(kueche, archetyp) {
  return {
    global: VERBOTENE_MUSTER_GLOBAL,
    kueche: (VERBOTEN_JE_KUECHE[kueche] ?? []).map((beschreibung) => ({ beschreibung, pruefung: "manuell" })),
    archetyp: (VERBOTEN_JE_ARCHETYP[archetyp] ?? []).map((beschreibung) => ({ beschreibung, pruefung: "judge" })),
  };
}

/* ------------------------------------------------------------------ */
/* Zusammenbau                                                         */
/* ------------------------------------------------------------------ */

export function kombinationen() {
  return Object.entries(STIMMUNGEN).flatMap(([kueche, liste]) =>
    liste.filter((s) => GRUND_ARCHETYPEN.includes(s.archetyp)).map((stimmung) => ({ kueche, stimmung })),
  );
}

export function erzeugeDesignsystem(kueche, stimmung, { katalog = null, lade = ladeAnalyse } = {}) {
  const kombination = (katalog ?? ladeKatalog()).kombinationen.find((k) => k.kueche === kueche && k.stimmung === stimmung.id);
  const signal = referenzSignal(kombination, lade);
  const farben = leiteFarbenAb(stimmung, signal);
  const typografie = leiteTypografieAb(kueche, stimmung, signal);
  const spacing = leiteSpacingAb(stimmung, signal);
  const radius = leiteRadiusAb(stimmung);
  const schatten = leiteSchattenAb(stimmung, farben);
  const motion = leiteMotionAb(stimmung, signal);
  const layout = leiteLayoutAb(stimmung, signal);
  return {
    version: 1,
    id: `${kueche}--${stimmung.id}`,
    kueche,
    kuecheLabel: KUECHEN_LABEL[kueche] ?? kueche,
    stimmung: stimmung.id,
    label: stimmung.label,
    archetyp: stimmung.archetyp,
    archetypLabel: ARCHETYP_LABEL[stimmung.archetyp],
    richtung: kombination?.richtung ?? "",
    referenzen: (kombination?.referenzen ?? []).map(({ name, url, typ, uebernehmen, nichtUebernehmen }) => ({ name, url, typ, uebernehmen, nichtUebernehmen })),
    referenzSignal: signal,
    farben,
    kontrastPaare: kontrastPaare(),
    typografie,
    spacing,
    radius,
    schatten,
    motion,
    layout,
    verboteneMuster: verboteneMuster(kueche, stimmung.archetyp),
    bildKanon: bildKanonFuer(kueche, stimmung, signal),
    sprache: sprachKanonFuer(kueche, stimmung),
  };
}

/* ------------------------------------------------------------------ */
/* Markdown                                                            */
/* ------------------------------------------------------------------ */

export function alsMarkdown(ds) {
  const z = [];
  const r = ds.farben.rollen;
  z.push(`# ${ds.kuecheLabel} · ${ds.label}`);
  z.push("");
  z.push(`Archetyp **${ds.archetypLabel}** · Schema **${ds.farben.schema}** · Designsystem \`${ds.id}\` (maschinenlesbar: \`${ds.id}.json\`)`);
  z.push("");
  z.push(`> ${ds.richtung}`);
  z.push("");
  z.push("## Referenzen");
  z.push("");
  for (const ref of ds.referenzen) {
    z.push(`- **[${ref.name}](${ref.url})** (${ref.typ === "refero" ? "Refero-Style" : "Restaurant"}) – übernommen: ${ref.uebernehmen.join("; ")}${ref.nichtUebernehmen?.length ? ` · bewusst nicht: ${ref.nichtUebernehmen.join("; ")}` : ""}`);
  }
  const s = ds.referenzSignal;
  z.push("");
  z.push(`Referenz-Signal: Temperatur **${s.temperatur ?? "–"}**, Helligkeit **${s.helligkeit ?? "–"}**, Sättigung **${s.saettigung ?? "–"}**, Dichte **${s.dichte ?? "–"}**, Layout **${s.layout ?? "–"}**, Bewegung **${s.motion ?? "–"}**.${s.fehlend.length ? ` Nicht auswertbar: ${s.fehlend.join(", ")}.` : ""}`);
  z.push("");
  z.push("## Farben – jede mit einer Aufgabe");
  z.push("");
  z.push("| Rolle | Wert | Aufgabe | Verwendung |");
  z.push("|---|---|---|---|");
  for (const [rolle, f] of Object.entries(r)) {
    z.push(`| \`${rolle}\` | \`${f.hex}\` | ${f.aufgabe}${f.maxFlaechenAnteil ? ` (max. ${Math.round(f.maxFlaechenAnteil * 100)} % Fläche)` : ""} | ${f.verwendung.join(", ")} |`);
  }
  z.push("");
  z.push("Kontraste (vom Build erzwungen):");
  z.push("");
  z.push("| Schrift | Grund | Verhältnis | Mindestens |");
  z.push("|---|---|---|---|");
  for (const p of ds.kontrastPaare) {
    const k = contrastRatio(r[p.vordergrund].hex, r[p.hintergrund].hex);
    z.push(`| ${p.vordergrund} | ${p.hintergrund} | ${k.toFixed(2)}:1 | ${p.mindest}:1 |`);
  }
  if (ds.farben.herleitung.length) {
    z.push("");
    z.push("Herleitung: " + ds.farben.herleitung.join(" "));
  }
  const t = ds.typografie;
  z.push("");
  z.push("## Typografie");
  z.push("");
  z.push(`- **Anzeige:** ${t.display.familie} ${t.display.gewicht}${t.display.versalien ? ", Versalien" : ""} – ${t.display.charakter}`);
  z.push(`- **Text:** ${t.text.familie} ${t.text.gewicht}/${t.text.gewichtStark} – ${t.text.charakter}`);
  if (t.label) z.push(`- **Etiketten:** ${t.label.familie} – Preise, Zeiten, Rubriken`);
  z.push(`- **Rubriken:** ${t.rubrik.beschreibung}`);
  z.push(`- **Skala:** ${t.skala.name} (×${t.skala.verhaeltnis}), Basis ${t.skala.basisPx}px`);
  z.push("");
  z.push("| Stufe | Desktop | Mobil | Einsatz |");
  z.push("|---|---|---|---|");
  for (const [name, st] of Object.entries(t.skala.stufen)) z.push(`| ${name} | ${st.px}px | ${st.mobil ? `${st.mobil}px` : "–"} | ${st.einsatz} |`);
  z.push("");
  z.push("Ausgeschlossen: Inter, Roboto, system-ui und alle weiteren Schriften aus `VERBOTENE_SCHRIFTEN`.");
  z.push("");
  z.push("Herleitung: " + t.herleitung.join(" "));
  const sp = ds.spacing;
  z.push("");
  z.push("## Spacing (8px-Raster)");
  z.push("");
  z.push(`Skala: ${Object.entries(sp.skala).map(([k, v]) => `\`${k}\`=${v}px`).join(" · ")}`);
  z.push("");
  z.push(`Sektionen ${sp.sektion.desktop}px (mobil ${sp.sektion.mobil}px), betonte Sektion ${sp.sektionBetont.desktop}px, enge Leisten ${sp.sektionEng.desktop}px. Rinne ${sp.rinne}px, Seitenrand ${sp.rand.desktop}/${sp.rand.mobil}px.`);
  z.push("");
  z.push("Herleitung: " + sp.herleitung.join(" "));
  z.push("");
  z.push("## Radius, Schatten, Bewegung");
  z.push("");
  z.push(`- Radius: klein ${ds.radius.klein}px · Karte ${ds.radius.karte}px · Knopf ${ds.radius.knopf}px · Bild ${ds.radius.bild}px · Marke rund`);
  z.push(`- Schatten: ${ds.schatten.stil} (\`${ds.schatten.karte}\`)`);
  z.push(`- Bewegung: ${ds.motion.kurve}, ${ds.motion.dauerMs.lang}ms, Weg ${ds.motion.auftrittDistanzPx}px, Versatz ${ds.motion.versatzMs}ms`);
  for (const regel of ds.motion.regeln) z.push(`  - ${regel}`);
  z.push("");
  z.push("Herleitung: " + [...ds.radius.herleitung, ...ds.schatten.herleitung, ...ds.motion.herleitung].join(" "));
  const l = ds.layout;
  z.push("");
  z.push("## Layout-Regeln");
  z.push("");
  z.push(`- Maximale Breite ${l.maxBreite}px, ${l.spalten} Spalten, Verhältnis ${l.verhaeltnis}, Textbreite ${l.textBreite}`);
  z.push(`- Hero-Varianten (Seed wählt): ${l.heroVarianten.map((h) => `\`${h}\` – ${HERO_VARIANTEN[h].beschreibung}`).join("; ")}`);
  z.push(`- Sektionsfolge: ${l.sektionsReihenfolge.join(" → ")}`);
  z.push(`- Highlights als \`${l.highlights}\`, Karte als \`${l.karte}\`, Stimmen als \`${l.stimmen}\``);
  z.push(`- Betonter Moment: **${l.betonterMoment}** (einzige Sektion mit Extra-Luft und eigener Bewegung)`);
  z.push(`- Kopfzeile ${l.kopfzeileFest ? "fest" : "scrollt mit"}, Hauptaktion ${l.primaerAktion === "reservation" ? "Reservieren" : "Bestellen"}, mobile Aktionsleiste ${l.mobileAktionsleiste ? "an" : "aus"}`);
  z.push(`- ${l.sektionsWechsel}`);
  z.push("");
  z.push("Herleitung: " + l.herleitung.join(" "));
  z.push("");
  z.push("## Verbotene Muster");
  z.push("");
  for (const m of ds.verboteneMuster.global) z.push(`- ${m.beschreibung} _(${m.pruefung})_`);
  for (const m of ds.verboteneMuster.kueche) z.push(`- ${m.beschreibung} _(Küche)_`);
  for (const m of ds.verboteneMuster.archetyp) z.push(`- ${m.beschreibung} _(Archetyp)_`);
  const b = ds.bildKanon;
  z.push("");
  z.push("## Bild-Kanon");
  z.push("");
  z.push(`- Licht: ${b.licht}`);
  z.push(`- Perspektive: ${b.perspektive}`);
  z.push(`- Farbstimmung: ${b.farbstimmung}`);
  z.push(`- Oberflächen & Requisiten: ${b.requisiten.join(", ")}`);
  z.push(`- Nie: ${b.verboten.join(", ")}`);
  z.push(`- Prompt-Basis: \`${b.promptBasis}\``);
  const sp2 = ds.sprache;
  z.push("");
  z.push("## Sprache");
  z.push("");
  z.push(`- Ton: ${sp2.ton}`);
  z.push(`- Anrede: ${sp2.anrede}, Satzlänge: ${sp2.satzlaenge}`);
  z.push(`- Wortfeld: ${sp2.wortfeld.join(", ")}`);
  z.push("");
  return `${z.join("\n")}\n`;
}

/* ------------------------------------------------------------------ */
/* Laden / Schreiben                                                   */
/* ------------------------------------------------------------------ */

export function designsystemPfad(kueche, stimmung) {
  return path.join(DESIGNSYSTEM_DIR, `${kueche}--${stimmung}.json`);
}

export function ladeDesignsystem(kueche, stimmung) {
  const pfad = designsystemPfad(kueche, stimmung);
  if (!existsSync(pfad)) throw new Error(`Kein Designsystem für ${kueche}/${stimmung} – erst "npm run v2:designsysteme" ausführen.`);
  return JSON.parse(readFileSync(pfad, "utf-8"));
}

export function schreibeDesignsystem(ds) {
  mkdirSync(DESIGNSYSTEM_DIR, { recursive: true });
  writeFileSync(path.join(DESIGNSYSTEM_DIR, `${ds.id}.json`), `${JSON.stringify(ds, null, 2)}\n`, "utf-8");
  writeFileSync(path.join(DESIGNSYSTEM_DIR, `${ds.id}.md`), alsMarkdown(ds), "utf-8");
}

export function erzeugeAlle() {
  const katalog = ladeKatalog();
  return kombinationen().map(({ kueche, stimmung }) => {
    const ds = erzeugeDesignsystem(kueche, stimmung, { katalog });
    schreibeDesignsystem(ds);
    return ds;
  });
}

function indexMarkdown(alle) {
  const z = ["# v2-Designsysteme", "", "Ein Dokument je Küche × Stimmung, erzeugt von `v2/build/designsystemGenerator.js` (`npm run v2:designsysteme`). JSON für den Build, Markdown zum Lesen.", ""];
  z.push("| Küche | Stimmung | Archetyp | Anzeige / Text | Akzent | Hero-Varianten |");
  z.push("|---|---|---|---|---|---|");
  for (const ds of alle) {
    z.push(`| ${ds.kuecheLabel} | [${ds.label}](${ds.id}.md) | ${ds.archetypLabel} | ${ds.typografie.display.familie} / ${ds.typografie.text.familie} | \`${ds.farben.rollen.akzent.hex}\` | ${ds.layout.heroVarianten.join(", ")} |`);
  }
  return `${z.join("\n")}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const alle = erzeugeAlle();
  writeFileSync(path.join(DESIGNSYSTEM_DIR, "README.md"), indexMarkdown(alle), "utf-8");
  console.log(`${alle.length} Designsysteme geschrieben nach ${DESIGNSYSTEM_DIR}`);
}
