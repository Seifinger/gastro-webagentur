// Design-Judge (Stage 5).
//
// Rendert eine gebaute v2-Seite im Browser (Desktop 1440 + Mobil 390),
// misst die tatsächlich berechneten Styles und bewertet fünf Kriterien auf
// einer Skala 0–10:
//
//   farbdisziplin      – nur Palettenfarben, Akzent höchstens 8 % der Fläche
//   typografie         – klare Stufen h1 > h2 > h3 > Text, Schriften geladen
//   rhythmus           – Sektionsabstände aus der Skala, nicht gleichförmig,
//                        kein horizontaler Überlauf mobil
//   bildintegration    – Bilder geladen, nicht hochskaliert, mit Alt-Text,
//                        Titelbild trägt den ersten Bildschirm
//   verboteneMuster    – Anti-Slop-Lint plus Muster, die erst im Browser
//                        sichtbar werden (zentrierte Einheitssektionen)
//
// Bestanden: jedes Kriterium ≥ 7 und Mittel ≥ 7,5. Sonst entsteht eine
// Korrekturliste (höchstens fünf Punkte) im Vokabular von
// siteBuilder.wendeKorrekturenAn().

import { contrastRatio, hexToRgb } from "../../src/colorMath.js";
import { lint } from "../build/antiSlopLint.js";
import { oeffneSeite } from "../build/screenshot.js";

export const SCHWELLE_KRITERIUM = 7;
export const SCHWELLE_MITTEL = 7.5;

/* ------------------------------------------------------------------ */
/* Messung im Browser                                                  */
/* ------------------------------------------------------------------ */

// Läuft im Browser (von Playwright serialisiert) – keine Closures.
function messeImBrowser({ familien }) {
  const rgb = (s) => {
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(s || "");
    if (!m) return null;
    const a = m[4] === undefined ? 1 : Number(m[4]);
    if (a < 0.1) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a };
  };
  const sichtbar = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    }
    return true;
  };
  const doc = document.documentElement;
  const flaecheGesamt = doc.scrollWidth * doc.scrollHeight;
  const farben = [];
  for (const el of document.querySelectorAll("body, body *")) {
    if (["IMG", "VIDEO", "SCRIPT", "STYLE", "path", "circle", "line", "rect", "g", "polyline", "polygon", "ellipse"].includes(el.tagName)) continue;
    if (el.closest(".drawer, .confirm-box, .overlay")) continue;
    if (!sichtbar(el)) continue;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const text = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (text) farben.push({ art: "text", wert: rgb(s.color), flaeche: 0 });
    const bg = rgb(s.backgroundColor);
    if (bg) farben.push({ art: "grund", wert: bg, flaeche: r.width * r.height });
    if (parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== "none") farben.push({ art: "linie", wert: rgb(s.borderTopColor), flaeche: 0 });
  }
  const groesse = (sel) => {
    const els = [...document.querySelectorAll(sel)].filter(sichtbar);
    if (!els.length) return null;
    return els.map((e) => parseFloat(getComputedStyle(e).fontSize)).reduce((a, b) => a + b, 0) / els.length;
  };
  // Fließtextgröße = die Größe, in der die meisten Zeichen stehen – nicht
  // die häufigste Absatzgröße (viele kurze Etiketten würden sonst gewinnen).
  const zeichenJeGroesse = new Map();
  for (const p of document.querySelectorAll("p, li, blockquote")) {
    if (p.closest("header, footer, .drawer, .confirm-box") || !sichtbar(p)) continue;
    const g = parseFloat(getComputedStyle(p).fontSize);
    zeichenJeGroesse.set(g, (zeichenJeGroesse.get(g) || 0) + p.textContent.trim().length);
  }
  const textGroesse = [...zeichenJeGroesse.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? parseFloat(getComputedStyle(document.body).fontSize);
  const gerenderteFamilien = new Set();
  for (const el of document.querySelectorAll("h1, h2, h3, p, a, button, li, label")) {
    if (sichtbar(el)) gerenderteFamilien.add(getComputedStyle(el).fontFamily.split(",")[0].replace(/["']/g, "").trim());
  }
  const sektionen = [...new Set([...document.querySelectorAll("main > section, body > section, body > main > section")])].filter(sichtbar).map((s) => {
    const st = getComputedStyle(s);
    const kopf = s.querySelector("h2");
    return {
      id: s.id || s.className,
      oben: parseFloat(st.paddingTop),
      unten: parseFloat(st.paddingBottom),
      hoehe: s.getBoundingClientRect().height,
      grund: st.backgroundColor,
      zentriert: kopf ? getComputedStyle(kopf).textAlign === "center" : false,
    };
  });
  const hero = document.querySelector(".hero");
  let heroBildAnteil = 0;
  if (hero) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (const m of hero.querySelectorAll("img, video")) {
      const r = m.getBoundingClientRect();
      const b = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
      const h = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      heroBildAnteil += (b * h) / (vw * vh);
    }
  }
  const bilder = [...document.querySelectorAll("img")].filter((img) => !img.closest(".drawer, .confirm-box")).map((img) => {
    const r = img.getBoundingClientRect();
    return {
      src: img.currentSrc || img.src,
      geladen: img.complete && img.naturalWidth > 0,
      hochskaliert: img.naturalWidth > 0 && !/^data:/.test(img.src) && img.naturalWidth < r.width * 0.85,
      alt: img.getAttribute("alt") !== null,
      herkunft: img.dataset.herkunft || "",
      verzerrt: getComputedStyle(img).objectFit !== "cover" && img.naturalWidth > 0 && Math.abs(img.naturalWidth / img.naturalHeight - r.width / r.height) > 0.08,
    };
  });
  // Kontrast so, wie er gerendert wird: Textfarbe gegen den ersten
  // deckenden Grund darüber. Text auf Fotos (ohne deckenden Grund) wird
  // gezählt, aber nicht bewertet – er soll gar nicht vorkommen.
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const verh = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const kontrastFehler = [];
  let textAufFoto = 0;
  for (const el of document.querySelectorAll("h1, h2, h3, p, a, span, li, label, button, strong, figcaption")) {
    if (el.closest(".drawer, .confirm-box, .overlay") || !sichtbar(el)) continue;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const st = getComputedStyle(el);
    const farbe = rgb(st.color);
    if (!farbe) continue;
    let grund = null;
    let ueberBild = false;
    for (let p = el; p; p = p.parentElement) {
      const bg = rgb(getComputedStyle(p).backgroundColor);
      if (bg && bg.a >= 0.9) { grund = bg; break; }
      if (p.querySelector && p !== el && p.querySelector(":scope > img, :scope > video, :scope > figure > img")) ueberBild = true;
    }
    if (!grund) {
      if (ueberBild) { textAufFoto += 1; continue; }
      grund = { r: 255, g: 255, b: 255 };
    }
    const px = parseFloat(st.fontSize);
    const gross = px >= 24 || (px >= 18.66 && Number(st.fontWeight) >= 700);
    const k = verh(farbe, grund);
    if (k < (gross ? 3 : 4.5)) kontrastFehler.push({ text: el.textContent.trim().slice(0, 30), k: Number(k.toFixed(2)) });
  }
  // Zeilenlänge der Fließtexte (Zeichen je Zeile, grob über die Breite)
  // Zeichen je Zeile, exakt: Textlänge geteilt durch die gerenderten Zeilen.
  const zeilenLaengen = [...document.querySelectorAll("p")].filter((p) => sichtbar(p) && !p.closest(".drawer, .confirm-box")).map((p) => {
    const st = getComputedStyle(p);
    const zeilen = Math.round(p.getBoundingClientRect().height / parseFloat(st.lineHeight));
    return zeilen >= 2 ? Math.round(p.textContent.trim().length / zeilen) : 0;
  });
  const zeilenhoehe = parseFloat(getComputedStyle(document.body).lineHeight) / parseFloat(getComputedStyle(document.body).fontSize);
  // Touch-Ziele: Knöpfe und Links, die man antippt (nicht Fließtext-Links)
  const kleineZiele = [...document.querySelectorAll("button, .btn, input, select, textarea")].filter((el) => sichtbar(el) && !el.closest(".drawer, .confirm-box") && el.type !== "checkbox" && el.getBoundingClientRect().height < 40).length;
  return {
    kontrastFehler: kontrastFehler.slice(0, 12),
    textAufFoto,
    zeilenLaengen,
    zeilenhoehe,
    kleineZiele,
    farben,
    akzentFlaecheBasis: flaecheGesamt,
    typo: { h1: groesse("h1"), h2: groesse("section h2"), h3: groesse("section h3"), text: textGroesse, familien: [...gerenderteFamilien] },
    schriftenGeladen: familien.map((f) => ({ familie: f, geladen: document.fonts.check(`16px "${f}"`) })),
    sektionen,
    heroBildAnteil,
    bilder,
    ueberlauf: doc.scrollWidth > doc.clientWidth + 1,
  };
}

/* ------------------------------------------------------------------ */
/* Bewertung                                                           */
/* ------------------------------------------------------------------ */

const abstand = (a, b) => Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);

function palette(ds) {
  const liste = Object.entries(ds.farben.rollen).map(([rolle, f]) => ({ rolle, ...hexToRgb(f.hex) }));
  // Mischungen, die die Seite legitim erzeugt: Overlay/Schleier auf Tint, weiß und schwarz für Browser-Standards in Formularen.
  return liste;
}

function naechsteRolle(wert, pal) {
  let best = null;
  for (const p of pal) {
    const d = abstand(wert, p);
    if (!best || d < best.d) best = { rolle: p.rolle, d };
  }
  return best;
}

export function bewerteFarben(messung, ds) {
  const pal = palette(ds);
  const fremde = new Map();
  let akzentFlaeche = 0;
  const akzent = hexToRgb(ds.farben.rollen.akzent.hex);
  for (const { art, wert, flaeche } of messung.farben) {
    if (!wert) continue;
    const n = naechsteRolle(wert, pal);
    if (n.d > 14) fremde.set(`${wert.r},${wert.g},${wert.b}`, art);
    if (art === "grund" && abstand(wert, akzent) < 14) akzentFlaeche += flaeche;
  }
  const anteil = akzentFlaeche / messung.akzentFlaecheBasis;
  const maxAnteil = ds.farben.rollen.akzent.maxFlaechenAnteil ?? 0.08;
  let note = 10 - Math.min(6, fremde.size * 1.5) - (anteil > maxAnteil ? Math.min(4, (anteil - maxAnteil) * 60) : 0);
  const befunde = [];
  if (fremde.size) befunde.push(`${fremde.size} Farbe(n) außerhalb der Palette: ${[...fremde.keys()].slice(0, 4).map((k) => `rgb(${k})`).join(", ")}`);
  if (anteil > maxAnteil) befunde.push(`Akzent bedeckt ${(anteil * 100).toFixed(1)} % der Fläche (max. ${maxAnteil * 100} %)`);
  if (messung.kontrastFehler.length) {
    note -= Math.min(5, messung.kontrastFehler.length * 1.5);
    befunde.push(`${messung.kontrastFehler.length} Text(e) unter WCAG-AA im gerenderten Ergebnis: ${messung.kontrastFehler.slice(0, 3).map((f) => `„${f.text}“ ${f.k}:1`).join(", ")}`);
  }
  note = Math.max(0, Number(note.toFixed(1)));
  return { note, befunde, werte: { fremdeFarben: fremde.size, akzentAnteil: Number(anteil.toFixed(4)), kontrastFehler: messung.kontrastFehler.length } };
}

export function bewerteTypografie(messung) {
  const { h1, h2, h3, text } = messung.typo;
  const befunde = [];
  let note = 10;
  if (text < 16) { note -= 4; befunde.push(`Fließtext ${text}px < 16px`); }
  const stufen = [["h1", h1], ["h2", h2], ["h3", h3], ["Text", text]].filter(([, v]) => v);
  for (let i = 1; i < stufen.length; i += 1) {
    const verhaeltnis = stufen[i - 1][1] / stufen[i][1];
    if (verhaeltnis < 1.15) { note -= 2; befunde.push(`${stufen[i - 1][0]}/${stufen[i][0]} nur ${verhaeltnis.toFixed(2)}× – Stufe kaum sichtbar`); }
  }
  if (h1 && text && h1 / text < 2.5) { note -= 2; befunde.push(`h1 nur ${(h1 / text).toFixed(1)}× Fließtext – Name trägt den Kopf nicht`); }
  const fehlend = messung.schriftenGeladen.filter((s) => !s.geladen).map((s) => s.familie);
  if (fehlend.length) { note -= 3; befunde.push(`Schrift nicht geladen: ${fehlend.join(", ")}`); }
  if (messung.typo.familien.length > 3) { note -= 1; befunde.push(`${messung.typo.familien.length} Schriftfamilien gerendert`); }
  const zuLang = messung.zeilenLaengen.filter((l) => l > 90).length;
  if (zuLang) { note -= Math.min(2, zuLang * 0.5); befunde.push(`${zuLang} Absatz/Absätze mit über 90 Zeichen je Zeile`); }
  if (messung.zeilenhoehe < 1.4) { note -= 1; befunde.push(`Zeilenhöhe ${messung.zeilenhoehe.toFixed(2)} zu eng`); }
  return { note: Math.max(0, note), befunde, werte: { h1, h2, h3, text, verhaeltnisH1: h1 && text ? Number((h1 / text).toFixed(2)) : null } };
}

export function bewerteRhythmus(messungDesktop, messungMobil, ds) {
  const befunde = [];
  let note = 10;
  const skala = new Set([...Object.values(ds.spacing.skala), ds.spacing.sektion.desktop, ds.spacing.sektionBetont.desktop, ds.spacing.sektionEng.desktop, 0]);
  const aussen = messungDesktop.sektionen.filter((s) => !skala.has(Math.round(s.oben)) || !skala.has(Math.round(s.unten)));
  if (aussen.length) { note -= 2; befunde.push(`${aussen.length} Sektion(en) mit Abstand außerhalb der Skala`); }
  const abstaende = new Set(messungDesktop.sektionen.map((s) => Math.round(s.oben)));
  if (messungDesktop.sektionen.length > 3 && abstaende.size < 2) { note -= 2; befunde.push("Alle Sektionen gleich gepolstert – kein Rhythmus, kein betonter Moment"); }
  const gruende = new Set(messungDesktop.sektionen.map((s) => s.grund));
  if (gruende.size < 2) { note -= 1.5; befunde.push("Keine Flächenwechsel zwischen den Sektionen"); }
  const zentriert = messungDesktop.sektionen.filter((s) => s.zentriert).length;
  if (zentriert > messungDesktop.sektionen.length / 2) { note -= 2; befunde.push("Mehrheit der Sektionsköpfe zentriert"); }
  if (messungMobil?.ueberlauf) { note -= 4; befunde.push("Horizontaler Überlauf auf dem Handy"); }
  if (messungMobil && messungMobil.kleineZiele > 0) { note -= Math.min(2, messungMobil.kleineZiele * 0.25); befunde.push(`${messungMobil.kleineZiele} Bedienelement(e) auf dem Handy unter 40px Höhe`); }
  if (messungDesktop.sektionen.length < 4) { note -= 3; befunde.push(`Nur ${messungDesktop.sektionen.length} erkennbare Sektionen`); }
  return { note: Math.max(0, note), befunde, werte: { sektionen: messungDesktop.sektionen.length, abstaende: [...abstaende], ueberlaufMobil: Boolean(messungMobil?.ueberlauf) } };
}

export function bewerteBilder(messung) {
  const befunde = [];
  let note = 10;
  const kaputt = messung.bilder.filter((b) => !b.geladen);
  if (kaputt.length) { note -= Math.min(5, kaputt.length * 1.5); befunde.push(`${kaputt.length} Bild(er) nicht geladen`); }
  const hoch = messung.bilder.filter((b) => b.hochskaliert);
  if (hoch.length) { note -= Math.min(3, hoch.length); befunde.push(`${hoch.length} Bild(er) hochskaliert (unscharf)`); }
  if (messung.bilder.some((b) => !b.alt)) { note -= 1; befunde.push("Bild ohne alt-Attribut"); }
  if (messung.bilder.some((b) => b.verzerrt)) { note -= 2; befunde.push("Bild verzerrt (Seitenverhältnis)"); }
  if (messung.bilder.length === 0) { note -= 4; befunde.push("Keine Bilder gefunden"); }
  if (messung.heroBildAnteil < 0.18) { note -= 3; befunde.push(`Titelbild füllt nur ${(messung.heroBildAnteil * 100).toFixed(0)} % des ersten Bildschirms`); }
  return { note: Math.max(0, note), befunde, werte: { bilder: messung.bilder.length, heroBildAnteil: Number(messung.heroBildAnteil.toFixed(2)), herkunft: [...new Set(messung.bilder.map((b) => b.herkunft))] } };
}

export function bewerteMuster(html, messung) {
  const ergebnis = lint(html);
  const befunde = ergebnis.fehler.map((f) => `${f.regel}: ${f.meldung}`);
  let note = 10 - ergebnis.fehler.length * 3 - ergebnis.warnungen.length;
  const hoehen = messung.sektionen.map((s) => s.hoehe);
  if (hoehen.length > 3) {
    const mittel = hoehen.reduce((a, b) => a + b, 0) / hoehen.length;
    const streuung = Math.sqrt(hoehen.reduce((a, b) => a + (b - mittel) ** 2, 0) / hoehen.length) / mittel;
    if (streuung < 0.12) { note -= 2; befunde.push("gleichfoermige-sektionen: alle Sektionen fast gleich hoch"); }
  }
  return { note: Math.max(0, note), befunde, werte: { lintFehler: ergebnis.fehler.length } };
}

/* ------------------------------------------------------------------ */
/* Korrekturliste                                                      */
/* ------------------------------------------------------------------ */

/**
 * Übersetzt Befunde in höchstens fünf Korrekturen, die der Builder
 * automatisch umsetzen kann. Was sich nicht automatisch beheben lässt,
 * steht mit art "manuell" darin (und wird im Protokoll sichtbar).
 */
export function korrekturListe(urteil, ds, bisher = []) {
  const k = [];
  const hat = (art) => bisher.some((b) => b.art === art) || k.some((b) => b.art === art);
  const { farbdisziplin, typografie, rhythmus, bildintegration, verboteneMuster } = urteil.kriterien;
  if (farbdisziplin.note < SCHWELLE_KRITERIUM && farbdisziplin.werte.akzentAnteil > 0.08 && !hat("akzent-reduzieren")) {
    k.push({ kriterium: "farbdisziplin", art: "akzent-reduzieren", grund: farbdisziplin.befunde.join("; ") });
  }
  if (typografie.note < SCHWELLE_KRITERIUM && ((typografie.werte.verhaeltnisH1 ?? 3) < 2.5 || typografie.befunde.some((b) => /kaum sichtbar/.test(b)))) {
    k.push({ kriterium: "typografie", art: "typo-skala", faktor: 1.12, grund: typografie.befunde.join("; ") });
  }
  if (rhythmus.note < SCHWELLE_KRITERIUM && rhythmus.befunde.some((b) => /gleich gepolstert|Flächenwechsel/.test(b)) && !hat("rhythmus")) {
    k.push({ kriterium: "rhythmus", art: "rhythmus", grund: rhythmus.befunde.join("; ") });
  }
  if (bildintegration.note < SCHWELLE_KRITERIUM && bildintegration.werte.heroBildAnteil < 0.18) {
    const bildstark = ["tafel", "spalte-bild", "passepartout"].find((v) => ds.layout.heroVarianten.includes(v) && !bisher.some((b) => b.wert === v));
    if (bildstark) k.push({ kriterium: "bildintegration", art: "hero-variante", wert: bildstark, grund: bildintegration.befunde.join("; ") });
  }
  if (verboteneMuster.note < SCHWELLE_KRITERIUM && verboteneMuster.befunde.some((b) => /gleichfoermig/.test(b)) && !hat("rhythmus")) {
    k.push({ kriterium: "verboteneMuster", art: "rhythmus", grund: "gleichförmige Sektionen" });
  }
  for (const [name, kriterium] of Object.entries(urteil.kriterien)) {
    if (kriterium.note < SCHWELLE_KRITERIUM && !k.some((x) => x.kriterium === name)) {
      k.push({ kriterium: name, art: "manuell", grund: kriterium.befunde.join("; ") || "unter Schwelle" });
    }
  }
  return k.slice(0, 5);
}

/* ------------------------------------------------------------------ */
/* Einstieg                                                            */
/* ------------------------------------------------------------------ */

/**
 * Bewertet eine gebaute Seite.
 * @param {object} p
 * @param {import("playwright-core").Browser} p.browser
 * @param {string} p.url - file:// oder http(s)://
 * @param {string} p.html - der gebaute HTML-Text (für den Lint)
 * @param {object} p.ds - wirksames Designsystem (nach Korrekturen)
 * @param {string} [p.screenshot] - Pfad für den Desktop-Screenshot des ersten Bildschirms
 */
export async function beurteile({ browser, url, html, ds, screenshot = null }) {
  const familien = [ds.typografie.display.familie, ds.typografie.text.familie];
  const desk = await oeffneSeite(browser, url, { ansicht: "desktop" });
  let messungDesktop;
  try {
    messungDesktop = await desk.seite.evaluate(messeImBrowser, { familien });
    if (screenshot) await desk.seite.screenshot({ path: screenshot, type: "jpeg", quality: 62 });
  } finally {
    await desk.kontext.close();
  }
  const mob = await oeffneSeite(browser, url, { ansicht: "mobil" });
  let messungMobil;
  try {
    messungMobil = await mob.seite.evaluate(messeImBrowser, { familien });
  } finally {
    await mob.kontext.close();
  }

  const kriterien = {
    farbdisziplin: bewerteFarben(messungDesktop, ds),
    typografie: bewerteTypografie(messungDesktop),
    rhythmus: bewerteRhythmus(messungDesktop, messungMobil, ds),
    bildintegration: bewerteBilder(messungDesktop),
    verboteneMuster: bewerteMuster(html, messungDesktop),
  };
  const noten = Object.values(kriterien).map((k) => k.note);
  const mittel = Number((noten.reduce((a, b) => a + b, 0) / noten.length).toFixed(2));
  const bestanden = noten.every((n) => n >= SCHWELLE_KRITERIUM) && mittel >= SCHWELLE_MITTEL;
  return { bestanden, mittel, kriterien };
}

export { contrastRatio };
