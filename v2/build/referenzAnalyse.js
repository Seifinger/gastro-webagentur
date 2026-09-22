// Referenzanalyse: liest aus einer realen Website heraus, was ein
// Designsystem von ihr lernen kann – Farbpalette, Typografie-Charakter,
// Spacing-Rhythmus, Layout-Asymmetrie und Motion-Charakter.
//
// Zwei Quellen:
//   1. Eine normale URL: HTML plus bis zu acht verlinkte Stylesheets werden
//      geladen und statisch ausgewertet (kein Browser nötig, läuft auch in
//      einer schlanken CI).
//   2. Ein Refero-Style (https://styles.refero.design/style/<uuid>): Refero
//      hat die Seite bereits ausgewertet; Farben, Schriften und die
//      "northStar"-Beschreibung kommen aus der öffentlichen JSON-API.
//
// Das Ergebnis ist bewusst grob und robust statt pixelgenau: Es soll die
// Richtung einer Referenz festhalten (warm/kühl, Serife/Grotesk, luftig/dicht,
// symmetrisch/versetzt, ruhig/lebendig), nicht ihre Werte kopieren. Die
// Werte selbst setzt der Designsystem-Generator, eingepasst in unsere
// Stimmungen.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hexToHsl, rgbToHex, hexToRgb } from "../../src/colorMath.js";
import { starteBrowser } from "./browser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REFERENZ_DIR = path.join(__dirname, "..", "referenzen");
export const ANALYSE_DIR = path.join(REFERENZ_DIR, "analysen");
export const KATALOG_PFAD = path.join(REFERENZ_DIR, "referenzkatalog.json");

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const REFERO_API = "https://styles.refero.design/api/styles";

/* ------------------------------------------------------------------ */
/* Laden                                                               */
/* ------------------------------------------------------------------ */

async function ladeText(url, { timeoutMs = 12_000, abruf = fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const antwort = await abruf(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html,text/css,*/*" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
    return { text: await antwort.text(), url: antwort.url || url };
  } finally {
    clearTimeout(timer);
  }
}

/** Alle <link rel="stylesheet" href="…"> einer Seite, absolut aufgelöst. */
export function stylesheetLinks(html, basisUrl) {
  const links = [];
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    if (!/rel\s*=\s*["']?[^"'>]*stylesheet/i.test(tag)) continue;
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href) continue;
    try {
      links.push(new URL(href.replace(/&amp;/g, "&"), basisUrl).href);
    } catch {
      // kaputte href überspringen
    }
  }
  return [...new Set(links)];
}

/** Inline-<style>-Blöcke und style="…"-Attribute als ein CSS-Text. */
export function inlineCss(html) {
  const bloecke = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  const attribute = [...html.matchAll(/\sstyle\s*=\s*"([^"]*)"/gi)].map((m) => `x{${m[1]}}`);
  return [...bloecke, ...attribute].join("\n");
}

/* ------------------------------------------------------------------ */
/* Farben                                                              */
/* ------------------------------------------------------------------ */

const FARB_MUSTER = /#(?:[0-9a-f]{3}|[0-9a-f]{6})\b|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*[\d.]+)?\s*\)|rgba?\(\s*\d{1,3}\s+\d{1,3}\s+\d{1,3}(?:\s*\/\s*[\d.%]+)?\s*\)/gi;

export function normiereFarbe(roh) {
  const wert = roh.trim().toLowerCase();
  if (wert.startsWith("#")) {
    try {
      return rgbToHex(hexToRgb(wert));
    } catch {
      return null;
    }
  }
  const zahlen = wert.match(/[\d.]+%?/g);
  if (!zahlen || zahlen.length < 3) return null;
  const alpha = zahlen[3] === undefined ? 1 : parseFloat(zahlen[3]) / (zahlen[3].endsWith("%") ? 100 : 1);
  // Fast durchsichtige Farben sind Schatten und Schleier, keine Palette.
  if (alpha < 0.35) return null;
  return rgbToHex({ r: Number(zahlen[0]), g: Number(zahlen[1]), b: Number(zahlen[2]) });
}

function farbAbstand(a, b) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return Math.sqrt((x.r - y.r) ** 2 + (x.g - y.g) ** 2 + (x.b - y.b) ** 2);
}

/**
 * Zählt Farben getrennt nach Rolle: Hintergrund (background*, fill) und
 * Vordergrund (color, border, stroke). Nahe beieinanderliegende Töne werden
 * zusammengefasst, sonst zerfällt ein Verlauf in zwanzig "Farben".
 */
export function farbPalette(css) {
  const zaehler = { hintergrund: new Map(), vordergrund: new Map() };
  for (const [, eigenschaft, wert] of css.matchAll(/([a-z-]+)\s*:\s*([^;{}]+)/gi)) {
    const e = eigenschaft.toLowerCase();
    let rolle = null;
    if (/^background|^fill$/.test(e)) rolle = "hintergrund";
    else if (/^color$|^border|^stroke$|^outline|^text-decoration-color|^caret-color/.test(e)) rolle = "vordergrund";
    else if (e.startsWith("--")) rolle = /bg|background|surface|paper|canvas/.test(e) ? "hintergrund" : "vordergrund";
    if (!rolle) continue;
    for (const [treffer] of wert.matchAll(FARB_MUSTER)) {
      const hex = normiereFarbe(treffer);
      if (!hex) continue;
      zaehler[rolle].set(hex, (zaehler[rolle].get(hex) ?? 0) + 1);
    }
  }

  const buendeln = (map) => {
    const liste = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const cluster = [];
    for (const [hex, anzahl] of liste) {
      const nah = cluster.find((c) => farbAbstand(c.hex, hex) < 18);
      if (nah) nah.anzahl += anzahl;
      else cluster.push({ hex, anzahl });
    }
    return cluster.sort((a, b) => b.anzahl - a.anzahl);
  };

  const hintergrund = buendeln(zaehler.hintergrund).slice(0, 8);
  const vordergrund = buendeln(zaehler.vordergrund).slice(0, 8);
  return { hintergrund, vordergrund, ...farbCharakter([...hintergrund, ...vordergrund]) };
}

/** Warm/kühl, hell/dunkel, bunt/gedeckt – und der kräftigste Akzent. */
export function farbCharakter(farben) {
  if (farben.length === 0) return { temperatur: "unbekannt", helligkeit: "unbekannt", saettigung: "unbekannt", akzent: null };
  let warm = 0;
  let kuehl = 0;
  let saettigungSumme = 0;
  let hellSumme = 0;
  let gewichtSumme = 0;
  let akzent = null;
  for (const { hex, anzahl = 1 } of farben) {
    const { h, s, l } = hexToHsl(hex);
    const gewicht = anzahl;
    gewichtSumme += gewicht;
    saettigungSumme += s * gewicht;
    hellSumme += l * gewicht;
    if (s > 12) {
      if (h < 70 || h > 330) warm += gewicht;
      else if (h > 160 && h < 290) kuehl += gewicht;
    }
    // Der Akzent: gesättigt, weder fast weiß noch fast schwarz.
    if (s > 35 && l > 18 && l < 78 && (!akzent || s * Math.log2(anzahl + 1) > akzent.wert)) {
      akzent = { hex, wert: s * Math.log2(anzahl + 1) };
    }
  }
  const mittelS = saettigungSumme / gewichtSumme;
  const mittelL = hellSumme / gewichtSumme;
  return {
    temperatur: warm > kuehl * 1.3 ? "warm" : kuehl > warm * 1.3 ? "kühl" : "neutral",
    helligkeit: mittelL > 62 ? "hell" : mittelL < 32 ? "dunkel" : "gemischt",
    saettigung: mittelS > 45 ? "kräftig" : mittelS > 18 ? "gedeckt" : "fast unbunt",
    akzent: akzent?.hex ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Typografie                                                          */
/* ------------------------------------------------------------------ */

// Icon-, Emoji- und Systemschriften sagen nichts über den Charakter einer Seite.
const RAUSCHEN = /icon|awesome|emoji|dashicons|glyph|symbol|sfmono|segoe ui|helvetica neue|arial|sans-serif\)|inherit\)|judgeme|slick|swiper|star/i;

const GENERISCH = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "inherit", "initial", "unset", "system-ui", "ui-sans-serif", "ui-serif", "ui-monospace", "-apple-system", "blinkmacsystemfont", "var"]);

// Grobe Einordnung bekannter Familien. Unbekannte Namen werden über
// Wortbestandteile geraten (serif, grotesk, mono, script …).
const BEKANNT = {
  serif: /mrs[- ]?eaves|freight|cheltenham|clarendon|century|bembo|sabon|minion|garamond|hoefler|mercury|chronicle|austin|portrait|noe|ogg|gt sectra|tiempos|surt serif|editorial old|playfair|garamond|cormorant|merriweather|lora|caslon|baskerville|bodoni|didot|times|georgia|libre baskerville|crimson|spectral|fraunces|canela|tiempos|freight|domaine|reckless|editorial new|gt super|gt alpina|gt sectra|ivy|recoleta|lyon|plantin|sentinel|signifier|newsreader|dm serif|young serif|gloock|instrument serif|noto serif|source serif|pt serif|literata|eb garamond|cardo|alegreya(?! sans)|arapey|marcellus|cinzel|trajan|yeseva|rozha|abril|prata|nanum myeongjo|shippori|mincho|zen old|kinfolk|romie|jannon|heldane|tobias|copernicus|financier|martina|hedvig letters serif|rhymes|redaction|season/,
  mono: /mono|courier|consolas|menlo|fragment|berkeley|jetbrains|ibm plex mono|space mono|pressura mono|apercu mono/,
  schmal: /oswald|condensed|narrow|compressed|bebas|anton|league gothic|barlow condensed|big shoulders|pragmatica cond/,
  skript: /script|hand|brush|pacifico|caveat|dancing|satisfy|lobster/,
};

export function klassifiziereFamilie(familie) {
  const f = familie.toLowerCase();
  if (BEKANNT.mono.test(f)) return "mono";
  if (BEKANNT.skript.test(f)) return "skript";
  if (BEKANNT.schmal.test(f)) return "schmal";
  if (BEKANNT.serif.test(f) || /serif(?!.*sans)/.test(f) && !/sans/.test(f)) return "serif";
  return "grotesk";
}

export function typografie(css) {
  const familien = new Map();
  for (const [, wert] of css.matchAll(/font-family\s*:\s*([^;{}]+)/gi)) {
    const erste = wert
      .split(",")
      .map((f) => f.trim().replace(/^["']|["']$/g, "").replace(/!important/i, "").trim())
      .find((f) => f && !GENERISCH.has(f.toLowerCase()) && !f.startsWith("var(") && !RAUSCHEN.test(f));
    if (erste) familien.set(erste, (familien.get(erste) ?? 0) + 1);
  }
  const sortiert = [...familien.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const pxGroessen = [...css.matchAll(/font-size\s*:\s*([\d.]+)(px|rem)\b/gi)].map(([, v, e]) =>
    e === "rem" ? Number(v) * 16 : Number(v),
  );
  const gross = pxGroessen.filter((v) => v >= 28);
  const versalien = (css.match(/text-transform\s*:\s*uppercase/gi) ?? []).length;
  const sperrung = [...css.matchAll(/letter-spacing\s*:\s*(-?[\d.]+)(em|px)/gi)].map(([, v, e]) =>
    e === "px" ? Number(v) / 16 : Number(v),
  );

  const arten = sortiert.map(([name, anzahl]) => ({ name, anzahl, art: klassifiziereFamilie(name) }));
  const display = arten.find((a) => a.art !== "grotesk" && a.art !== "mono") ?? arten[0] ?? null;
  return {
    familien: arten,
    charakter: beschreibeTypo(arten, versalien),
    groessteSchrift: gross.length ? Math.max(...gross) : pxGroessen.length ? Math.max(...pxGroessen) : null,
    kontrastVerhaeltnis:
      pxGroessen.length > 1 ? Number((Math.max(...pxGroessen) / Math.max(12, Math.min(...pxGroessen.filter((v) => v >= 12)))).toFixed(2)) : null,
    versalienAnteil: Number((versalien / Math.max(1, (css.match(/font-size/gi) ?? []).length)).toFixed(2)),
    mittlereSperrungEm: sperrung.length ? Number((sperrung.reduce((a, b) => a + b, 0) / sperrung.length).toFixed(3)) : 0,
    displayArt: display?.art ?? "unbekannt",
  };
}

function beschreibeTypo(arten, versalien) {
  if (arten.length === 0) return "nicht auslesbar";
  const teile = [];
  const art = (a) => ({ serif: "Serife", grotesk: "Grotesk", schmal: "schmale Grotesk", mono: "Monospace", skript: "Schreibschrift" })[a];
  teile.push(`${art(arten[0].art)} führt`);
  const zweite = arten.find((a) => a.art !== arten[0].art);
  if (zweite) teile.push(`${art(zweite.art)} als Gegenstimme`);
  if (versalien > 6) teile.push("viel Versalsatz");
  return teile.join(", ");
}

/* ------------------------------------------------------------------ */
/* Spacing, Layout, Motion                                             */
/* ------------------------------------------------------------------ */

function inPx(wert, einheit) {
  const n = Number(wert);
  if (einheit === "rem" || einheit === "em") return n * 16;
  return n;
}

/** Welche Grundeinheit trägt die Abstände? Prüft 4, 5, 6, 8, 10, 12. */
export function spacingRhythmus(css) {
  const werte = [];
  for (const [, , inhalt] of css.matchAll(/(padding|margin|gap|row-gap|column-gap)[a-z-]*\s*:\s*([^;{}]+)/gi)) {
    for (const [, zahl, einheit] of inhalt.matchAll(/(-?[\d.]+)(px|rem|em)\b/g)) {
      const px = Math.abs(inPx(zahl, einheit));
      if (px >= 2 && px <= 240) werte.push(Math.round(px));
    }
  }
  if (werte.length === 0) return { basis: null, treffer: 0, haeufigste: [], dichte: "unbekannt" };

  const kandidaten = [4, 5, 6, 8, 10, 12].map((basis) => ({
    basis,
    // Größere Basen werden leicht bevorzugt: Auf 4 passt fast alles, das
    // sagt wenig über den Rhythmus einer Seite.
    treffer: werte.filter((w) => w % basis === 0).length / werte.length,
  }));
  const beste = kandidaten
    .filter((k) => k.treffer >= 0.6)
    .sort((a, b) => b.basis - a.basis)[0] ?? kandidaten.sort((a, b) => b.treffer - a.treffer)[0];

  const haeufigkeit = new Map();
  for (const w of werte) haeufigkeit.set(w, (haeufigkeit.get(w) ?? 0) + 1);
  const haeufigste = [...haeufigkeit.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w);
  const median = [...werte].sort((a, b) => a - b)[Math.floor(werte.length / 2)];
  return {
    basis: beste.basis,
    treffer: Number(beste.treffer.toFixed(2)),
    haeufigste,
    median,
    dichte: median >= 32 ? "luftig" : median >= 16 ? "ausgewogen" : "dicht",
  };
}

/** Wie stark weicht das Raster von gleich breiten Spalten ab? 0 = streng symmetrisch. */
export function layoutAsymmetrie(css) {
  const raster = [...css.matchAll(/grid-template-columns\s*:\s*([^;{}]+)/gi)].map((m) => m[1].trim());
  let ungleich = 0;
  let gleich = 0;
  for (const wert of raster) {
    const fr = [...wert.matchAll(/([\d.]+)fr/g)].map((m) => Number(m[1]));
    if (/repeat\(/.test(wert) || (fr.length > 1 && new Set(fr).size === 1)) gleich += 1;
    else if (fr.length > 1 || /\d+%\s+\d+%/.test(wert) || /minmax\([^)]*\)\s+[\d.]+fr/.test(wert)) ungleich += 1;
  }
  const zentriert = (css.match(/text-align\s*:\s*center/gi) ?? []).length;
  const links = (css.match(/text-align\s*:\s*(left|start)/gi) ?? []).length;
  const versatz = (css.match(/translate[XY]?\(\s*-?\d/gi) ?? []).length + (css.match(/grid-(column|row)\s*:\s*\d+\s*\/\s*(span\s*)?\d+/gi) ?? []).length;
  const gesamt = ungleich + gleich;
  const wert = gesamt === 0 ? 0.3 : ungleich / gesamt;
  return {
    wert: Number(Math.min(1, wert + Math.min(0.2, versatz / 100)).toFixed(2)),
    ungleicheRaster: ungleich,
    gleicheRaster: gleich,
    zentrierAnteil: Number((zentriert / Math.max(1, zentriert + links)).toFixed(2)),
    beschreibung: wert > 0.5 ? "versetzt/asymmetrisch" : wert > 0.25 ? "gemischt" : "symmetrisch",
  };
}

export function motionCharakter(css) {
  const dauern = [...css.matchAll(/(?:transition|animation)(?:-duration)?\s*:[^;{}]*?([\d.]+)(ms|s)\b/gi)].map(([, v, e]) =>
    e === "s" ? Number(v) * 1000 : Number(v),
  );
  const kurven = [...css.matchAll(/cubic-bezier\([^)]+\)|\bease(?:-in-out|-in|-out)?\b|\blinear\b/gi)].map((m) => m[0].replace(/\s+/g, ""));
  const keyframes = (css.match(/@keyframes/gi) ?? []).length;
  const reduziert = /prefers-reduced-motion/i.test(css);
  const median = dauern.length ? [...dauern].sort((a, b) => a - b)[Math.floor(dauern.length / 2)] : null;
  const haeufigsteKurve = Object.entries(kurven.reduce((acc, k) => ({ ...acc, [k]: (acc[k] ?? 0) + 1 }), {})).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0] ?? null;
  return {
    uebergaenge: dauern.length,
    keyframes,
    medianDauerMs: median,
    haeufigsteKurve,
    respektiertReducedMotion: reduziert,
    charakter:
      dauern.length === 0 && keyframes === 0
        ? "statisch"
        : keyframes > 8 || (median !== null && median < 180)
          ? "lebendig"
          : "ruhig",
  };
}

/* ------------------------------------------------------------------ */
/* Einstieg                                                            */
/* ------------------------------------------------------------------ */

/** Wertet fertiges CSS aus – der Kern, getrennt vom Netzwerk testbar. */
export function analysiereCss(css) {
  return {
    farben: farbPalette(css),
    typografie: typografie(css),
    spacing: spacingRhythmus(css),
    layout: layoutAsymmetrie(css),
    motion: motionCharakter(css),
  };
}

export function referoIdAusUrl(url) {
  return /styles\.refero\.design\/style\/([0-9a-f-]{36})/i.exec(String(url))?.[1] ?? null;
}

/**
 * Sucht einen Refero-Style über die öffentliche API. Die API liefert
 * seitenweise; gesucht wird im Katalog-Auszug, falls vorhanden, sonst live.
 */
export async function ladeReferoStyle(id, { abruf = fetch, auszugPfad = path.join(REFERENZ_DIR, "refero-auszug.json") } = {}) {
  if (existsSync(auszugPfad)) {
    const auszug = JSON.parse(readFileSync(auszugPfad, "utf-8"));
    const treffer = auszug.styles.find((s) => s.id === id);
    if (treffer) return treffer;
  }
  for (let seite = 1; seite <= 40; seite += 1) {
    const antwort = await abruf(`${REFERO_API}?limit=50&page=${seite}`, { headers: { "User-Agent": BROWSER_UA } });
    if (!antwort.ok) break;
    const { styles = [], nextPage } = await antwort.json();
    const treffer = styles.find((s) => s.id === id);
    if (treffer) return treffer;
    if (!nextPage || styles.length === 0) break;
  }
  throw new Error(`Refero-Style ${id} nicht gefunden.`);
}

/** Analyse eines Refero-Styles aus dessen strukturierten Daten. */
export function analysiereRefero(style) {
  const farben = (style.colors ?? []).map((c, i) => ({ hex: normiereFarbe(c.hex) ?? c.hex, name: c.name, anzahl: 8 - i }));
  const familien = (style.fonts ?? []).map((name, i) => ({ name, anzahl: 5 - i, art: klassifiziereFamilie(name) }));
  const display = familien.find((f) => f.art !== "grotesk" && f.art !== "mono") ?? familien[0] ?? null;
  return {
    farben: {
      hintergrund: farben.filter((f) => hexToHsl(f.hex).l > 70 || hexToHsl(f.hex).l < 15).slice(0, 4),
      vordergrund: farben.filter((f) => hexToHsl(f.hex).l <= 70 && hexToHsl(f.hex).l >= 15).slice(0, 4),
      ...farbCharakter(farben),
      schema: style.colorScheme,
    },
    typografie: {
      familien,
      charakter: beschreibeTypo(familien, 0),
      displayArt: display?.art ?? "unbekannt",
    },
    // Refero beschreibt Abstände und Bewegung nicht strukturiert – der
    // Leitsatz ("northStar") trägt diese Information in Worten.
    spacing: { basis: null, dichte: /generous|quiet|breath|vast|sparse|whitespace|calm/i.test(style.northStar) ? "luftig" : "ausgewogen" },
    layout: { beschreibung: /editorial|asymmetr|broadsheet|magazine|scattered|offset/i.test(style.northStar) ? "versetzt/asymmetrisch" : "gemischt" },
    motion: { charakter: /neon|pulse|flicker|confetti|punk|spark/i.test(style.northStar) ? "lebendig" : "ruhig" },
    leitsatz: style.northStar,
  };
}

/* ------------------------------------------------------------------ */
/* Browser-Modus: berechnete Styles der gerenderten Seite              */
/* ------------------------------------------------------------------ */

// Läuft im Browser. Bewusst ohne Abhängigkeiten und ohne Closures auf
// Node-Seite – Playwright serialisiert die Funktion als Text.
function sammleImBrowser() {
  const rgbZuHex = (wert) => {
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(wert || "");
    if (!m) return null;
    if (m[4] !== undefined && Number(m[4]) < 0.35) return null;
    return `#${[m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, "0")).join("")}`;
  };
  const sichtbar = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const flaechen = new Map();
  const vw = window.innerWidth;
  for (const el of document.querySelectorAll("body, body *")) {
    if (!sichtbar(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < vw * 0.3 || r.height < 120) continue;
    const hex = rgbZuHex(getComputedStyle(el).backgroundColor);
    if (!hex) continue;
    flaechen.set(hex, (flaechen.get(hex) || 0) + r.width * Math.min(r.height, 3000));
  }
  const textFarben = new Map();
  for (const el of document.querySelectorAll("p, li, span, a, h1, h2, h3, h4")) {
    if (!sichtbar(el) || !el.textContent.trim()) continue;
    const hex = rgbZuHex(getComputedStyle(el).color);
    if (hex) textFarben.set(hex, (textFarben.get(hex) || 0) + 1);
  }
  const knopfFarben = new Map();
  for (const el of document.querySelectorAll("button, a[class*=btn], a[class*=button], [role=button], input[type=submit]")) {
    if (!sichtbar(el)) continue;
    const hex = rgbZuHex(getComputedStyle(el).backgroundColor);
    if (hex) knopfFarben.set(hex, (knopfFarben.get(hex) || 0) + 1);
  }
  const typo = (sel) => {
    const el = [...document.querySelectorAll(sel)].find(sichtbar);
    if (!el) return null;
    const s = getComputedStyle(el);
    return {
      familie: s.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
      groessePx: parseFloat(s.fontSize),
      gewicht: s.fontWeight,
      versalien: s.textTransform === "uppercase",
      sperrungPx: parseFloat(s.letterSpacing) || 0,
      zeilenhoehe: s.lineHeight,
    };
  };
  const abstaende = [];
  for (const el of document.querySelectorAll("section, header, footer, main > div, article")) {
    if (!sichtbar(el)) continue;
    const s = getComputedStyle(el);
    for (const v of [s.paddingTop, s.paddingBottom, s.marginTop, s.marginBottom, s.rowGap, s.columnGap]) {
      const px = parseFloat(v);
      if (px >= 2 && px <= 400) abstaende.push(Math.round(px));
    }
  }
  let reihen = 0;
  let ungleich = 0;
  for (const el of document.querySelectorAll("*")) {
    const s = getComputedStyle(el);
    if (s.display !== "grid" && s.display !== "flex") continue;
    const kinder = [...el.children].filter(sichtbar);
    if (kinder.length < 2) continue;
    const oben = kinder[0].getBoundingClientRect().top;
    const reihe = kinder.filter((k) => Math.abs(k.getBoundingClientRect().top - oben) < 4);
    if (reihe.length < 2) continue;
    const breiten = reihe.map((k) => k.getBoundingClientRect().width).filter((b) => b > 80);
    if (breiten.length < 2) continue;
    reihen += 1;
    if (Math.max(...breiten) / Math.min(...breiten) > 1.3) ungleich += 1;
  }
  const dauern = [];
  for (const el of document.querySelectorAll("a, button, img, section, div")) {
    const d = getComputedStyle(el).transitionDuration;
    for (const t of d.split(",")) {
      const ms = t.includes("ms") ? parseFloat(t) : parseFloat(t) * 1000;
      if (ms > 0) dauern.push(ms);
    }
  }
  const sortiere = (map) => [...map.entries()].sort((a, b) => b[1] - a[1]).map(([hex, gewicht]) => ({ hex, anzahl: Math.round(gewicht) }));
  return {
    flaechen: sortiere(flaechen).slice(0, 8),
    textFarben: sortiere(textFarben).slice(0, 6),
    knopfFarben: sortiere(knopfFarben).slice(0, 4),
    typo: { body: typo("p") || typo("body"), h1: typo("h1"), h2: typo("h2"), h3: typo("h3") },
    abstaende,
    raster: { reihen, ungleich },
    animationen: document.getAnimations ? document.getAnimations().length : 0,
    dauern: dauern.slice(0, 400),
  };
}

/**
 * Eine Seite hinter Cookie-Wall oder Bot-Schutz rendert nur Browser-
 * Standardwerte (Times New Roman, keine Flächen). Das ist keine Referenz,
 * sondern ein Messfehler – dann statisch weiter bzw. als Fehler vermerken.
 */
export function istLeer(roh) {
  const standardSchrift = !roh.typo.body || /times new roman|^serif$|^sans-serif$/i.test(roh.typo.body.familie);
  return roh.flaechen.length === 0 && roh.knopfFarben.length === 0 && standardSchrift;
}

/** Wertet die im Browser gesammelten Rohwerte zu denselben Kategorien aus wie die statische Analyse. */
export function werteBrowserAus(roh) {
  const hintergrund = roh.flaechen;
  const vordergrund = [...roh.knopfFarben, ...roh.textFarben];
  const familien = [];
  for (const rolle of ["h1", "h2", "body"]) {
    const t = roh.typo[rolle];
    if (t && !familien.some((f) => f.name === t.familie)) {
      familien.push({ name: t.familie, rolle, art: klassifiziereFamilie(t.familie) });
    }
  }
  const h1 = roh.typo.h1?.groessePx ?? roh.typo.h2?.groessePx ?? null;
  const body = roh.typo.body?.groessePx ?? 16;
  const basisKandidaten = [4, 5, 6, 8, 10, 12].map((basis) => ({
    basis,
    treffer: roh.abstaende.length ? roh.abstaende.filter((w) => w % basis === 0).length / roh.abstaende.length : 0,
  }));
  const basis = basisKandidaten.filter((k) => k.treffer >= 0.6).sort((a, b) => b.basis - a.basis)[0] ?? basisKandidaten.sort((a, b) => b.treffer - a.treffer)[0];
  const median = roh.abstaende.length ? [...roh.abstaende].sort((a, b) => a - b)[Math.floor(roh.abstaende.length / 2)] : null;
  const dauerMedian = roh.dauern.length ? [...roh.dauern].sort((a, b) => a - b)[Math.floor(roh.dauern.length / 2)] : null;
  const asym = roh.raster.reihen ? roh.raster.ungleich / roh.raster.reihen : 0;
  const display = familien.find((f) => f.rolle !== "body") ?? familien[0];
  return {
    farben: { hintergrund, vordergrund, ...farbCharakter([...hintergrund.slice(0, 3), ...roh.knopfFarben]) , akzent: roh.knopfFarben.find((k) => { const { s, l } = hexToHsl(k.hex); return s > 25 && l > 15 && l < 80; })?.hex ?? farbCharakter(vordergrund).akzent },
    typografie: {
      familien,
      charakter: beschreibeTypo(familien, roh.typo.h1?.versalien || roh.typo.h2?.versalien ? 10 : 0),
      displayArt: display?.art ?? "unbekannt",
      h1Px: h1,
      bodyPx: body,
      kontrastVerhaeltnis: h1 ? Number((h1 / body).toFixed(2)) : null,
      versalienUeberschrift: Boolean(roh.typo.h1?.versalien || roh.typo.h2?.versalien),
    },
    spacing: {
      basis: basis?.basis ?? null,
      treffer: Number((basis?.treffer ?? 0).toFixed(2)),
      median,
      dichte: median === null ? "unbekannt" : median >= 48 ? "luftig" : median >= 20 ? "ausgewogen" : "dicht",
    },
    layout: {
      wert: Number(asym.toFixed(2)),
      reihen: roh.raster.reihen,
      beschreibung: asym > 0.4 ? "versetzt/asymmetrisch" : asym > 0.2 ? "gemischt" : "symmetrisch",
    },
    motion: {
      animationen: roh.animationen,
      medianDauerMs: dauerMedian,
      charakter: roh.animationen > 6 || (dauerMedian !== null && dauerMedian < 180) ? "lebendig" : roh.dauern.length || roh.animationen ? "ruhig" : "statisch",
    },
  };
}

async function analysiereImBrowser(browser, url) {
  const kontext = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: BROWSER_UA });
  const seite = await kontext.newPage();
  try {
    await seite.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await seite.waitForTimeout(2500);
    // Einmal durchscrollen, damit Lazy-Sektionen ihre Styles bekommen.
    await seite.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight && y < 12_000; y += 700) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    return { titel: await seite.title(), roh: await seite.evaluate(sammleImBrowser) };
  } finally {
    await kontext.close();
  }
}

/**
 * Analysiert eine Referenz-URL vollständig. Fehler (offline, 403, Timeout)
 * werfen nicht, sondern landen als `fehler` im Ergebnis – eine einzelne
 * unerreichbare Referenz darf den Katalog-Lauf nicht abbrechen.
 */
export async function analysiereReferenz(url, { abruf = fetch, maxStylesheets = 8, browser = null } = {}) {
  const referoIdVorab = referoIdAusUrl(url);
  if (browser && !referoIdVorab) {
    // Mit Browser: berechnete Styles der gerenderten Seite. Sie schlagen die
    // statische Zählung, weil Framework-CSS (Icon-Fonts, Block-Bibliotheken)
    // dort nicht mitzählt, sondern nur, was wirklich auf der Seite steht.
    try {
      const { titel, roh } = await analysiereImBrowser(browser, url);
      if (!istLeer(roh)) {
        return { url, quelle: "website", modus: "browser", zeitpunkt: new Date().toISOString(), titel, ...werteBrowserAus(roh) };
      }
    } catch {
      // Browser scheitert (Bot-Schutz, Timeout) – statisch weiter.
    }
  }
  return analysiereStatisch(url, { abruf, maxStylesheets });
}

async function analysiereStatisch(url, { abruf, maxStylesheets }) {
  const zeitpunkt = new Date().toISOString();
  const referoId = referoIdAusUrl(url);
  try {
    if (referoId) {
      const style = await ladeReferoStyle(referoId, { abruf });
      return { url, quelle: "refero", zeitpunkt, name: style.siteName, originalUrl: style.url, ...analysiereRefero(style) };
    }

    const { text: html, url: endUrl } = await ladeText(url, { abruf });
    const teile = [inlineCss(html)];
    const links = stylesheetLinks(html, endUrl).slice(0, maxStylesheets);
    let geladen = 0;
    for (const link of links) {
      try {
        const { text } = await ladeText(link, { abruf, timeoutMs: 10_000 });
        // Riesige Framework-Bundles verzerren die Zählung – gekappt statt verworfen.
        teile.push(text.slice(0, 600_000));
        geladen += 1;
      } catch {
        // einzelnes Stylesheet fehlt – egal
      }
    }
    const css = teile.join("\n");
    if (css.trim().length < 200) throw new Error("Seite lieferte keine auswertbaren Styles (Cookie-Wall oder Bot-Schutz)");
    const titel = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ?? "";
    return {
      url,
      quelle: "website",
      modus: "statisch",
      zeitpunkt,
      titel,
      cssBytes: css.length,
      stylesheets: { gefunden: links.length, geladen },
      ...analysiereCss(css),
    };
  } catch (fehler) {
    return { url, quelle: referoId ? "refero" : "website", zeitpunkt, fehler: fehler.message || String(fehler) };
  }
}

export function analyseDateiName(url) {
  const referoId = referoIdAusUrl(url);
  if (referoId) return `refero-${referoId}.json`;
  const { hostname, pathname } = new URL(url);
  const pfad = pathname.replace(/\/+$/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `${hostname.replace(/^www\./, "")}${pfad ? `-${pfad}` : ""}.json`.toLowerCase();
}

export function ladeAnalyse(url) {
  const datei = path.join(ANALYSE_DIR, analyseDateiName(url));
  return existsSync(datei) ? JSON.parse(readFileSync(datei, "utf-8")) : null;
}

export function ladeKatalog() {
  return JSON.parse(readFileSync(KATALOG_PFAD, "utf-8"));
}

/**
 * CLI: analysiert jede URL des Katalogs (oder die per --url übergebene) und
 * legt das Ergebnis in referenzen/analysen/ ab. Bereits vorhandene Analysen
 * bleiben, außer mit --neu.
 */
async function cli(argv) {
  const einzel = argv.includes("--url") ? argv[argv.indexOf("--url") + 1] : null;
  const neu = argv.includes("--neu");
  const urls = einzel
    ? [einzel]
    : [...new Set(ladeKatalog().kombinationen.flatMap((k) => k.referenzen.map((r) => r.url)))];

  mkdirSync(ANALYSE_DIR, { recursive: true });
  let ok = 0;
  const fehler = [];
  const browser = argv.includes("--statisch") ? null : await starteBrowser();
  if (!browser) console.log("Kein Browser verfügbar – statische Analyse.");
  try {
  for (const url of urls) {
    const datei = path.join(ANALYSE_DIR, analyseDateiName(url));
    if (!neu && !einzel && existsSync(datei)) {
      ok += 1;
      continue;
    }
    const ergebnis = await analysiereReferenz(url, { browser });
    writeFileSync(datei, `${JSON.stringify(ergebnis, null, 2)}\n`, "utf-8");
    if (ergebnis.fehler) fehler.push(`${url}: ${ergebnis.fehler}`);
    else ok += 1;
    process.stdout.write(ergebnis.fehler ? "x" : ".");
  }
  } finally {
    await browser?.close().catch(() => {});
  }
  console.log(`\n${ok} Referenzen analysiert, ${fehler.length} nicht erreichbar.`);
  for (const f of fehler) console.log(`  – ${f}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli(process.argv.slice(2));
}
