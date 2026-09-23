// Schriften der v2-Designsysteme.
//
// Anders als v1 (Inter als Textschrift für alle 36 Welten) bekommt in v2 jede
// Stimmung ein eigenes Paar aus Anzeige- und Textschrift. Inter, Roboto und
// system-ui sind ausgeschlossen – genauso die Schriften, die in generierten
// Landing-Pages inzwischen so häufig vorkommen, dass sie selbst zum Erkennungs-
// zeichen geworden sind (siehe VERBOTENE_SCHRIFTEN).
//
// Alle Familien stehen unter der SIL Open Font License und werden wie in v1
// einmalig von Google Fonts geladen und lokal abgelegt (keine Aufrufe an
// Google beim Seitenbesuch, DSGVO).

import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";

export const VERBOTENE_SCHRIFTEN = [
  "Inter",
  "Roboto",
  "system-ui",
  "-apple-system",
  "BlinkMacSystemFont",
  "Segoe UI",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Raleway",
  "DM Sans",
  "Manrope",
  "Plus Jakarta Sans",
  "Space Grotesk",
  "Syne",
  "Satoshi",
  "Outfit",
  "Clash Display",
  "General Sans",
];

// Rückfall-Stapel ohne verbotene Systemschriften. Greifen nur, wenn die
// lokale Datei fehlt (erster Lauf offline).
export const RUECKFALL = {
  serif: "Georgia, 'Times New Roman', serif",
  grotesk: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  schmal: "'Arial Narrow', 'Helvetica Neue', Arial, sans-serif",
  mono: "'Courier New', Courier, monospace",
};

/**
 * Jede Familie, die ein v2-Designsystem verwenden darf. `gewichte` sind die
 * Schnitte, die Google Fonts wirklich anbietet – angefragt wird nur, was das
 * Designsystem braucht.
 */
export const SCHRIFTEN = {
  // Anzeigeschriften
  "Vollkorn": { art: "serif", gewichte: [400, 600, 700, 800], charakter: "kräftige Werkserife, deutsches Design (F. Althausen) – Wirtshaus, Brotzeit, Papier" },
  "Young Serif": { art: "serif", gewichte: [400], charakter: "schwere Antiqua mit weichen Kehlen – Bräustüberl-Schild, Kellerlicht" },
  "Fraunces": { art: "serif", gewichte: [400, 600, 700], charakter: "weiche Old-Style-Serife mit Charakter – Tageslicht, Kastanien" },
  "EB Garamond": { art: "serif", gewichte: [400, 600, 700], charakter: "Garamond wie im Kochbuch – Trattoria ohne Karo" },
  "Bodoni Moda": { art: "serif", gewichte: [400, 600, 700], charakter: "Parma-Bodoni, hoher Kontrast – Kerzenlicht, Weinkarte" },
  "Italiana": { art: "serif", gewichte: [400], charakter: "schlanke italienische Versalform – Küste, Mittagslicht" },
  "Marcellus": { art: "serif", gewichte: [400], charakter: "Inschriften-Antiqua mit flachen Serifen – Hafenmole, Kalk" },
  "Tenor Sans": { art: "grotesk", gewichte: [400], charakter: "humanistische Versalgrotesk – Galerieschild bei Nacht" },
  "Cormorant Garamond": { art: "serif", gewichte: [500, 600, 700], charakter: "feine, luftige Garamond – Olivenhain, Kolonialhaus" },
  "Barlow Condensed": { art: "schmal", gewichte: [500, 600, 700], charakter: "schmale Schildergrotesk – Marktstand, Basar" },
  "Gloock": { art: "serif", gewichte: [400], charakter: "Kontrast-Serife mit scharfen Tropfen – Bosporus bei Nacht" },
  "Alegreya": { art: "serif", gewichte: [400, 700, 800], charakter: "kalligrafische Buchschrift – Erde, Ton, Handwerk" },
  "Amiri": { art: "serif", gewichte: [400, 700], charakter: "Naskh-inspirierte Buchantiqua – Damaszener Hof" },
  "Reem Kufi": { art: "grotesk", gewichte: [500, 600, 700], charakter: "kufisch geprägte Geometrie – Gewürzbasar-Schild" },
  "Libre Caslon Display": { art: "serif", gewichte: [400], charakter: "Caslon in Anzeigegröße – helle Levante, Kochbuch" },
  "Noto Serif Display": { art: "serif", gewichte: [600, 700], charakter: "klassische Kontrast-Antiqua – rote Tinte auf Papier" },
  "Poiret One": { art: "grotesk", gewichte: [400], charakter: "Art-déco-Linie – Shanghai-Bar der 30er" },
  "Gilda Display": { art: "serif", gewichte: [400], charakter: "zarte Didone – Porzellan, Teeschale" },
  "Yeseva One": { art: "serif", gewichte: [400], charakter: "festliche Anzeigeantiqua – Orchidee, Seide" },
  "Big Shoulders Display": { art: "schmal", gewichte: [700, 800], charakter: "Chicago-Schildergrotesk – Grill, Nachtmarkt" },
  "Newsreader": { art: "serif", gewichte: [400, 500, 600], charakter: "Zeitungsantiqua mit optischen Größen – Küste, Leselicht" },
  "DM Serif Display": { art: "serif", gewichte: [400], charakter: "hoher Kontrast, abendlich – Laternenlicht (aus v1 übernommen)" },
  "Chivo": { art: "grotesk", gewichte: [700, 800], charakter: "grobe Grotesk mit Druckerei-Kanten – Straßenküche" },
  "Antonio": { art: "schmal", gewichte: [600, 700], charakter: "schmale Laternenschrift – Izakaya-Tresen" },
  "Shippori Mincho": { art: "serif", gewichte: [500, 600, 700], charakter: "Mincho-Antiqua – Hinoki-Tresen, Omakase" },
  "Zen Old Mincho": { art: "serif", gewichte: [400, 600, 700], charakter: "alte Mincho-Form – Tatami, Papierwand" },
  "Fjalla One": { art: "schmal", gewichte: [400], charakter: "schmale Plakatgrotesk – Bombay-Café-Schild" },
  "Rozha One": { art: "serif", gewichte: [400], charakter: "Devanagari-inspirierte Kontrastantiqua – Samt, Messing" },
  "Literata": { art: "serif", gewichte: [500, 600, 700], charakter: "ruhige Buchantiqua – Bananenblatt, Kalk" },
  "Archivo Black": { art: "grotesk", gewichte: [400], charakter: "breite, schwere Grotesk – Nudelbar-Schild" },
  "Saira Extra Condensed": { art: "schmal", gewichte: [600, 700], charakter: "extrem schmale Leuchtschrift – Neon ohne Glow" },
  "Instrument Serif": { art: "serif", gewichte: [400], charakter: "enge, elegante Serife – Galerie, Schiefer" },
  "Old Standard TT": { art: "serif", gewichte: [400, 700], charakter: "Zeitungsantiqua des 19. Jahrhunderts – Kaffeehaus-Zeitung" },
  "Rufina": { art: "serif", gewichte: [400, 700], charakter: "kalligrafische Antiqua – Zuckerguss, Porzellan" },
  "Schibsted Grotesk": { art: "grotesk", gewichte: [600, 700, 800], charakter: "Zeitungsgrotesk – Rösterei, Beton" },

  // Textschriften
  "Alegreya Sans": { art: "grotesk", gewichte: [400, 500, 700], charakter: "humanistische Textgrotesk mit Schreibduktus" },
  "Figtree": { art: "grotesk", gewichte: [400, 500, 600, 700], charakter: "freundliche, offene Textgrotesk" },
  "Karla": { art: "grotesk", gewichte: [400, 500, 600, 700], charakter: "eigenwillige Grotesk mit engen Kurven" },
  "Instrument Sans": { art: "grotesk", gewichte: [400, 500, 600, 700], charakter: "präzise, schmal laufende Grotesk" },
  "Hanken Grotesk": { art: "grotesk", gewichte: [400, 500, 600, 700], charakter: "warme, neutrale Grotesk" },
  "Work Sans": { art: "grotesk", gewichte: [400, 500, 600, 700], charakter: "Grotesk mit Plakat-Wurzeln" },
  "Libre Franklin": { art: "grotesk", gewichte: [400, 500, 600, 700], charakter: "Franklin Gothic – Diner, Markt, Zeitung" },
  "Source Serif 4": { art: "serif", gewichte: [400, 600, 700], charakter: "lesestarke Textantiqua" },
  "Zen Kaku Gothic New": { art: "grotesk", gewichte: [400, 500, 700], charakter: "japanische Gothic mit ruhigen Lateinformen" },
  "Courier Prime": { art: "mono", gewichte: [400, 700], charakter: "Schreibmaschine – Etiketten, Zeiten, Preise" },
};

export function istVerboten(familie) {
  const f = String(familie).trim().replace(/^["']|["']$/g, "").toLowerCase();
  return VERBOTENE_SCHRIFTEN.some((v) => v.toLowerCase() === f);
}

export function schriftStapel(familie) {
  const eintrag = SCHRIFTEN[familie];
  if (!eintrag) throw new Error(`Unbekannte Schrift "${familie}" – erst in v2/build/schriften.js aufnehmen.`);
  if (istVerboten(familie)) throw new Error(`Schrift "${familie}" ist in v2 ausgeschlossen.`);
  return `'${familie}', ${RUECKFALL[eintrag.art] ?? RUECKFALL.grotesk}`;
}

/** Nächstliegendes angebotenes Gewicht. */
export function passendesGewicht(familie, gewuenscht) {
  const gewichte = SCHRIFTEN[familie]?.gewichte ?? [400];
  return gewichte.reduce((best, g) => (Math.abs(g - gewuenscht) < Math.abs(best - gewuenscht) ? g : best), gewichte[0]);
}

/* ---------- Laden (wie fontLibrary.js in v1, aber je Familie + Gewicht) ---------- */

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const SUBSETS = ["latin", "latin-ext"];
const MANIFEST = "schriften.json";

export function familienSlug(familie) {
  return familie.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function cssUrl(familie, gewichte) {
  return `https://fonts.googleapis.com/css2?family=${familie.replace(/ /g, "+")}:wght@${gewichte.join(";")}&display=swap`;
}

export function parseFontFaces(css) {
  const bloecke = [];
  const regex = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
  for (const [, subset, body] of css.matchAll(regex)) {
    if (!SUBSETS.includes(subset)) continue;
    const gewicht = body.match(/font-weight:\s*(\d+)/)?.[1];
    const url = body.match(/src:\s*url\(([^)]+)\)/)?.[1];
    const unicodeRange = body.match(/unicode-range:\s*([^;]+);/)?.[1];
    if (!gewicht || !url || !unicodeRange) continue;
    bloecke.push({ subset, gewicht: Number(gewicht), url, unicodeRange: unicodeRange.trim() });
  }
  return bloecke;
}

function ladeManifest(zielDir) {
  try {
    return JSON.parse(readFileSync(path.join(zielDir, MANIFEST), "utf-8"));
  } catch {
    return [];
  }
}

/**
 * Stellt sicher, dass alle angefragten Schnitte lokal liegen.
 * @param {{familie:string, gewicht:number}[]} bedarf
 */
export async function stelleSchriftenBereit(bedarf, zielDir, { abruf = fetch } = {}) {
  mkdirSync(zielDir, { recursive: true });
  const manifest = ladeManifest(zielDir);
  const vorhanden = (familie, gewicht) =>
    manifest.some((e) => e.familie === familie && e.gewicht === gewicht && existsSync(path.join(zielDir, e.datei)));

  const nachFamilie = new Map();
  for (const { familie, gewicht } of bedarf) {
    const g = passendesGewicht(familie, gewicht);
    if (vorhanden(familie, g)) continue;
    if (!nachFamilie.has(familie)) nachFamilie.set(familie, new Set());
    nachFamilie.get(familie).add(g);
  }

  const fehlgeschlagen = [];
  let geladen = 0;
  for (const [familie, gewichte] of nachFamilie) {
    let faces;
    try {
      const antwort = await abruf(cssUrl(familie, [...gewichte].sort((a, b) => a - b)), { headers: { "User-Agent": BROWSER_UA } });
      if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
      faces = parseFontFaces(await antwort.text());
    } catch (fehler) {
      fehlgeschlagen.push(`${familie}: ${fehler.message}`);
      continue;
    }
    for (const face of faces) {
      const datei = `${familienSlug(familie)}-${face.gewicht}-${face.subset}.woff2`;
      const ziel = path.join(zielDir, datei);
      if (!existsSync(ziel)) {
        try {
          const antwort = await abruf(face.url);
          if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
          writeFileSync(ziel, Buffer.from(await antwort.arrayBuffer()));
          geladen += 1;
        } catch (fehler) {
          fehlgeschlagen.push(`${familie} ${face.gewicht}: ${fehler.message}`);
          continue;
        }
      }
      if (!manifest.some((e) => e.datei === datei)) {
        manifest.push({ familie, gewicht: face.gewicht, subset: face.subset, datei, unicodeRange: face.unicodeRange });
      }
    }
  }
  writeFileSync(path.join(zielDir, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  return { geladen, fehlgeschlagen };
}

/** @font-face-Regeln nur für die Familien, die eine Seite wirklich nutzt. */
export function schriftCss(familien, zielDir, pfadPrefix) {
  const manifest = ladeManifest(zielDir);
  return manifest
    .filter((e) => familien.includes(e.familie))
    .map(
      (e) =>
        `@font-face{font-family:'${e.familie}';font-style:normal;font-weight:${e.gewicht};font-display:swap;src:url('${pfadPrefix}/${e.datei}') format('woff2');unicode-range:${e.unicodeRange};}`,
    )
    .join("\n");
}
