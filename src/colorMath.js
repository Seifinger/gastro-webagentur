// HSL-Hilfsfunktionen für spätere Farb-Arbeit (Phase 4: kräftigere Akzente,
// automatisch geprüfte Kontraste). Noch nicht verdrahtet – reine Bausteine.

// "#a3b" oder "#aa33bb" -> {r,g,b} (0-255).
export function hexToRgb(hex) {
  let value = String(hex ?? "").trim().replace(/^#/, "");
  if (value.length === 3) {
    value = value.split("").map((c) => c + c).join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(`Ungültiger Hex-Farbwert: ${hex}`);
  }
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }) {
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// {r,g,b} (0-255) -> {h (0-360), s (0-100), l (0-100)}.
export function rgbToHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s: s * 100, l: l * 100 };
}

// {h (0-360), s (0-100), l (0-100)} -> {r,g,b} (0-255).
export function hslToRgb({ h, s, l }) {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rn = 0;
  let gn = 0;
  let bn = 0;

  if (hp >= 0 && hp < 1) [rn, gn, bn] = [c, x, 0];
  else if (hp < 2) [rn, gn, bn] = [x, c, 0];
  else if (hp < 3) [rn, gn, bn] = [0, c, x];
  else if (hp < 4) [rn, gn, bn] = [0, x, c];
  else if (hp < 5) [rn, gn, bn] = [x, 0, c];
  else [rn, gn, bn] = [c, 0, x];

  const m = ln - c / 2;
  return { r: (rn + m) * 255, g: (gn + m) * 255, b: (bn + m) * 255 };
}

export function hexToHsl(hex) {
  return rgbToHsl(hexToRgb(hex));
}

export function hslToHex(hsl) {
  return rgbToHex(hslToRgb(hsl));
}

// Relative Luminanz nach WCAG 2.x (sRGB -> linear -> gewichtete Summe).
export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

// WCAG-Kontrastverhältnis zwischen zwei Hex-Farben, im Bereich 1 (kein
// Kontrast) bis 21 (schwarz auf weiß).
export function contrastRatio(hexA, hexB) {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

// Erfüllt der Kontrast zwischen zwei Farben WCAG AA (4.5:1 für Fließtext,
// 3:1 für große Schrift)?
export function meetsWcagAA(hexA, hexB, { largeText = false } = {}) {
  const ratio = contrastRatio(hexA, hexB);
  return ratio >= (largeText ? 3 : 4.5);
}

/**
 * Hebt Sättigung und (falls nötig) den Kontrast eines Akzenttons gegenüber
 * einer Hintergrundfarbe an – Grundlage für Phase 4 ("mutigere Farben"),
 * hier bewusst als reine, seiteneffektfreie Funktion.
 *
 * @param {string} hex - Ausgangsfarbe (Akzent).
 * @param {object} [options]
 * @param {number} [options.saturationBoost=15] - Prozentpunkte, die die
 *   Sättigung mindestens angehoben wird (auf max. 100 gedeckelt).
 * @param {string|string[]} [options.against] - Hintergrundfarbe, gegen die der
 *   Zielkontrast erreicht werden soll (z. B. --bg oder --surface). Mehrere
 *   Gründe als Liste: Dann wird so lange verschoben, bis der **ungünstigste**
 *   von ihnen den Zielkontrast erreicht. Eine Seite setzt denselben Akzent auf
 *   bg, surface und soft ein; gegen nur einen davon zu prüfen, lässt genau die
 *   Stellen durchfallen, die man nicht geprüft hat.
 * @param {number} [options.targetContrast=4.5] - Ziel-Kontrastverhältnis
 *   gegenüber `against`, per Helligkeitsverschiebung angenähert.
 * @returns {string} Neue Hex-Farbe.
 */
export function boldAccent(hex, options = {}) {
  const { saturationBoost = 15, against, targetContrast = 4.5 } = options;
  const hsl = hexToHsl(hex);
  hsl.s = Math.min(100, hsl.s + saturationBoost);

  if (!against) return hslToHex(hsl);

  const gruende = Array.isArray(against) ? against : [against];
  const schlechtester = (farbe) => Math.min(...gruende.map((grund) => contrastRatio(farbe, grund)));

  // Kontrast durch schrittweises Verdunkeln/Aufhellen annähern, ohne Farbton
  // oder Sättigung zu verändern. Bricht ab, sobald das Ziel erreicht ist oder
  // die Helligkeit an ihre Grenzen stößt.
  const darkerThanBg = relativeLuminance(gruende[0]) > 0.5;
  let candidate = hslToHex(hsl);
  let guard = 0;
  while (schlechtester(candidate) < targetContrast && guard < 100) {
    hsl.l += darkerThanBg ? -1 : 1;
    hsl.l = Math.max(0, Math.min(100, hsl.l));
    candidate = hslToHex(hsl);
    guard += 1;
    if (hsl.l === 0 || hsl.l === 100) break;
  }

  return candidate;
}
