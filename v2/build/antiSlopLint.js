// Anti-Slop-Lint: prüft eine fertig gerenderte Seite auf die Muster, an
// denen man generierte Landing-Pages erkennt. Jeder Fund mit Schwere
// "fehler" bricht den Build ab (siteBuilder.js); "warnung" landet im
// Bericht und beim Judge.
//
// Geprüft wird die Ausgabe, nicht die Absicht: Was im HTML/CSS steht, zählt.

import {
  parseHtml,
  alleElemente,
  elementKinder,
  klassen,
  textInhalt,
  parseCss,
  rootVariablen,
  loeseVariablen,
  minPx,
  cssAusHtml,
} from "./parser.js";
import { istVerboten, VERBOTENE_SCHRIFTEN } from "./schriften.js";
import { hexToRgb, hexToHsl, rgbToHex } from "../../src/colorMath.js";

export const REGELN = {
  "generische-schrift": "Verbotene Schrift (Inter, Roboto, system-ui …) im CSS",
  "mehrfarb-verlauf": "Verlauf über mehr als einen Farbton",
  "drei-gleiche-karten": "Mindestens drei gleich gebaute Karten mit Bild und Überschrift nebeneinander",
  "kleine-textschrift": "Fließtext unter 16px oder Text unter 12px",
  "raster-bruch": "Abstand außerhalb des 8px-Rasters (4px als einziger Halbschritt)",
  "text-auf-foto-mit-verlauf": "Verlaufsschleier im Hero (außer dem geprüften Schleier-Token --schleier der Bühne)",
  glasmorphismus: "Milchglas (backdrop-filter)",
  "leucht-schatten": "Leuchtender Textschatten",
  "emoji-icons": "Emoji als Zeichen",
  "pillen-flut": "Pillenform auf Knöpfen, Karten oder Feldern",
  "hartkodierte-farbe": "Farbwert außerhalb der Designsystem-Variablen",
};

const ABSTAND_EIGENSCHAFTEN = /^(margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left|margin-(top|right|bottom|left|block|inline)(-start|-end)?|padding-(top|right|bottom|left|block|inline)(-start|-end)?|scroll-margin-top)$/;

function aufRaster(px) {
  const n = Math.abs(px);
  return n === 0 || n === 4 || n % 8 === 0;
}

/* ---------- Farben in Verläufen ---------- */

function farbenIn(text) {
  const farben = [];
  for (const [treffer] of text.matchAll(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi)) {
    if (treffer.startsWith("#")) {
      try {
        farben.push(rgbToHex(hexToRgb(treffer.slice(0, 7).length === 4 ? treffer : treffer.slice(0, 7))));
      } catch {
        // ungültig – ignorieren
      }
    } else {
      const z = treffer.match(/[\d.]+/g)?.map(Number) ?? [];
      if (z.length >= 3) farben.push(rgbToHex({ r: z[0], g: z[1], b: z[2] }));
    }
  }
  return farben;
}

function verlaeufe(wert) {
  const liste = [];
  const muster = /(?:repeating-)?(?:linear|radial|conic)-gradient\(/gi;
  let m;
  while ((m = muster.exec(wert)) !== null) {
    let tiefe = 1;
    let j = m.index + m[0].length;
    while (j < wert.length && tiefe > 0) {
      if (wert[j] === "(") tiefe += 1;
      else if (wert[j] === ")") tiefe -= 1;
      j += 1;
    }
    liste.push(wert.slice(m.index, j));
  }
  return liste;
}

/** Zählt verschiedene Farbtöne; Deckkraft-Stufen desselben Tons zählen einmal. */
export function farbtoene(verlauf) {
  const toene = [];
  for (const hex of farbenIn(verlauf)) {
    const hsl = hexToHsl(hex);
    const unbunt = hsl.s < 8 || hsl.l < 6 || hsl.l > 96;
    const neu = !toene.some((t) => (unbunt && t.unbunt && Math.abs(t.l - hsl.l) < 101) || (!unbunt && !t.unbunt && Math.abs(t.h - hsl.h) < 12 && Math.abs(t.s - hsl.s) < 25));
    if (neu) toene.push({ ...hsl, unbunt });
  }
  return toene.length;
}

/* ---------- Karten ---------- */

function signatur(el) {
  const kinder = elementKinder(el).map((k) => `${k.tag}.${klassen(k).sort().join(".")}`);
  return `${el.tag}.${klassen(el).sort().join(".")}>${kinder.join(",")}`;
}

function inBedienelement(k, grenze) {
  for (let p = k.eltern; p && p !== grenze; p = p.eltern) if (p.tag === "button" || p.tag === "a") return true;
  return false;
}

/**
 * Kartenartig heißt: ein Bild (oder ein freistehendes Icon wie bei den
 * typischen „Feature-Karten“) plus eine Überschrift. Icons in Knöpfen und
 * Links (Plus zum Vorbestellen) machen aus einer Speisekarten-Kategorie
 * noch keine Karte.
 */
function istKartenartig(el) {
  let bild = false;
  let kopf = false;
  for (const k of alleElemente(el)) {
    if (["img", "picture", "video"].includes(k.tag)) bild = true;
    if (k.tag === "svg" && !inBedienelement(k, el)) bild = true;
    if (["h2", "h3", "h4"].includes(k.tag)) kopf = true;
  }
  return bild && kopf;
}

/* ---------- Lint ---------- */

export function lint(html) {
  const funde = [];
  const fund = (regel, schwere, meldung, stelle = "") => funde.push({ regel, schwere, meldung, stelle });

  const { bloecke, inline } = cssAusHtml(html);
  const regeln = [...parseCss(bloecke), ...parseCss(inline)];
  const vars = rootVariablen(regeln);

  for (const r of regeln) {
    const istRoot = r.selektor.trim() === ":root";
    for (const { eigenschaft, wert } of r.deklarationen) {
      const aufgeloest = loeseVariablen(wert, vars);

      // Schriften: in font-family und in den Schrift-Variablen.
      if (eigenschaft === "font-family" || eigenschaft === "font" || eigenschaft.startsWith("--f-")) {
        for (const teil of aufgeloest.split(",")) {
          const familie = teil.trim().replace(/^["']|["']$/g, "");
          if (familie && istVerboten(familie)) fund("generische-schrift", "fehler", `${familie} in ${r.selektor}`, r.selektor);
        }
      }

      // Verläufe
      for (const verlauf of verlaeufe(aufgeloest)) {
        if (farbtoene(verlauf) > 1) fund("mehrfarb-verlauf", "fehler", `${verlauf.slice(0, 80)} in ${r.selektor}`, r.selektor);
        // Einzige Ausnahme: der Schleier-Token der Bühne (ausdruck.js) – ein
        // Ton, Deckkraft gegen reines Weiß auf Kontrast nachgewiesen.
        const schleierToken = wert.trim() === "var(--schleier)";
        if (/hero|buehne/.test(r.selektor) && !schleierToken) fund("text-auf-foto-mit-verlauf", "fehler", `Verlauf im Hero (${r.selektor})`, r.selektor);
      }

      // Abstände
      if (ABSTAND_EIGENSCHAFTEN.test(eigenschaft) || (istRoot && /^--(s-|sektion|rinne|rand)/.test(eigenschaft))) {
        if (/calc\(|%|auto|vw|vh|em(?!\w)/.test(aufgeloest) && !/px|rem/.test(aufgeloest.replace(/calc\([^)]*\)/g, ""))) continue;
        for (const [, n, e] of aufgeloest.replace(/calc\([^)]*\)/g, "").matchAll(/(-?[\d.]+)(px|rem)\b/g)) {
          const px = Number(n) * (e === "rem" ? 16 : 1);
          if (!aufRaster(px)) fund("raster-bruch", "fehler", `${eigenschaft}: ${wert} (${px}px) in ${r.selektor}`, r.selektor);
        }
      }

      if (eigenschaft === "backdrop-filter" || eigenschaft === "-webkit-backdrop-filter") {
        if (!/none/.test(aufgeloest)) fund("glasmorphismus", "fehler", `${r.selektor}`, r.selektor);
      }
      if (eigenschaft === "text-shadow" && !/none/.test(aufgeloest)) {
        fund("leucht-schatten", "fehler", `${r.selektor}: ${wert}`, r.selektor);
      }
      if (eigenschaft === "border-radius" && /btn|knopf|karte|card|panel|button|input|select|textarea|feld/.test(r.selektor)) {
        const px = minPx(aufgeloest);
        if (px !== null && px >= 99) fund("pillen-flut", "fehler", `${r.selektor}: ${wert}`, r.selektor);
      }

      // Farben dürfen nur in :root stehen – alles andere läuft über var().
      if (!istRoot && !r.at && !eigenschaft.startsWith("--") && /#[0-9a-f]{3,8}\b|rgba?\(\s*\d/i.test(wert)) {
        fund("hartkodierte-farbe", "fehler", `${r.selektor} { ${eigenschaft}: ${wert} }`, r.selektor);
      }

      if (eigenschaft === "font-size") {
        const px = minPx(aufgeloest);
        if (px !== null && px < 12) fund("kleine-textschrift", "fehler", `${r.selektor}: ${wert} (${px}px)`, r.selektor);
      }
    }
  }

  // Fließtext: body muss mindestens 16px haben.
  const body = regeln.filter((r) => !r.media && /(^|,)\s*body\s*($|,)/.test(r.selektor));
  const bodyGroesse = body.flatMap((r) => r.deklarationen).filter((d) => d.eigenschaft === "font-size").pop();
  if (!bodyGroesse) fund("kleine-textschrift", "fehler", "body ohne font-size – Fließtext unbestimmt", "body");
  else {
    const px = minPx(loeseVariablen(bodyGroesse.wert, vars));
    if (px === null || px < 16) fund("kleine-textschrift", "fehler", `body font-size ${bodyGroesse.wert} (${px}px)`, "body");
  }

  // HTML: Karten, Emoji
  const baum = parseHtml(html);
  for (const el of alleElemente(baum)) {
    const kinder = elementKinder(el);
    if (kinder.length >= 3) {
      const karten = kinder.filter(istKartenartig);
      if (karten.length >= 3 && karten.length === kinder.length && new Set(karten.map(signatur)).size === 1) {
        fund("drei-gleiche-karten", "fehler", `${kinder.length} gleiche Karten in <${el.tag} class="${el.attrs.class ?? ""}">`, el.attrs.class ?? el.tag);
      }
    }
  }
  const sichtbarerText = textInhalt(baum);
  const emoji = sichtbarerText.match(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}]/gu);
  if (emoji) fund("emoji-icons", "fehler", `Emoji im Text: ${[...new Set(emoji)].join(" ")}`);
  const attributEmoji = html.match(/="[^"]*[\u{1F000}-\u{1FAFF}][^"]*"/gu);
  if (attributEmoji) fund("emoji-icons", "fehler", `Emoji in Attribut: ${attributEmoji[0].slice(0, 60)}`);

  return {
    ok: !funde.some((f) => f.schwere === "fehler"),
    fehler: funde.filter((f) => f.schwere === "fehler"),
    warnungen: funde.filter((f) => f.schwere === "warnung"),
    geprueft: Object.keys(REGELN),
    verboteneSchriften: VERBOTENE_SCHRIFTEN.length,
  };
}
