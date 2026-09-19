// Drei Stimmungen je Küche statt drei Gestaltungswelten für zwölf Küchen.
//
// Vorher teilten sich Griechisch und Italienisch dasselbe Trattoria-Theme und
// Türkisch saß auf dem dunklen Neo-Asian – die Speisekarte und die
// Hero-Signatur waren küchenspezifisch, die Farbwelt nicht. Genau das fiel
// beim Wirt auf: Sein Lokal sah aus wie das italienische zwei Straßen weiter.
//
// Jede Küche bekommt deshalb drei ausgearbeitete Welten entlang derselben drei
// Archetypen. Das ist auch die Frage, die man dem Wirt stellen kann:
// traditionell, abendlich oder hell – was ist Ihr Haus?
//
// Der Archetyp bestimmt das Layout (siehe ARCHETYP_PRESET in designPresets.js),
// die Küche bestimmt Farbe, Schrift und Bildauswahl. Die Hero-Signatur bleibt
// über alle drei Stimmungen dieselbe: Sie ist die Identität der Küche, nicht
// die der Stimmung.

import { boldAccent } from "./colorMath.js";

const SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// Sechs Anzeigeschriften für zwölf Küchen. Alle liegen lokal (fontLibrary.js),
// damit nichts von Googles Servern nachgeladen wird.
const SERIF_ELEGANT = "'Playfair Display', Georgia, 'Times New Roman', serif";
const SERIF_RUSTIKAL = "'Merriweather', Georgia, 'Times New Roman', serif";
const SERIF_FEIN = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const SERIF_KONTRAST = "'DM Serif Display', Georgia, 'Times New Roman', serif";
const SANS_GEOMETRISCH = "'Montserrat', 'Inter', Helvetica, Arial, sans-serif";
const SANS_SCHMAL = "'Oswald', 'Inter', Helvetica, Arial, sans-serif";

export const ARCHETYPEN = ["traditionell", "abend", "hell", "editorial"];

// Die drei Archetypen, die je Küche von Hand ausgearbeitet sind. "editorial"
// steht bewusst nicht darin: Diese Welt wird aus der traditionellen abgeleitet
// (siehe editorialStimmung weiter unten) und teilt sich deren Farben.
export const GRUND_ARCHETYPEN = ["traditionell", "abend", "hell"];

export const ARCHETYP_LABEL = {
  traditionell: "Traditionell",
  abend: "Abend",
  hell: "Hell & modern",
  editorial: "Editorial",
};

// Helle und dunkle Grundgerüste. Die Stimmung setzt darauf nur noch ihre
// eigenen Töne – das hält 36 Welten lesbar und verhindert, dass irgendwo
// versehentlich graue Schrift auf grauem Grund steht.
function hell({ bg, surface, ink, inkSoft, line, soft }) {
  return { dark: false, bg, surface, ink, inkSoft, line, soft };
}

function dunkel({ bg, surface, ink, inkSoft, line, soft }) {
  return { dark: true, bg, surface, ink, inkSoft, line, soft };
}

const PAPIER = hell({
  bg: "#fdfaf5",
  surface: "#ffffff",
  ink: "#2a211a",
  inkSoft: "#6f6154",
  line: "#e9dfd1",
  soft: "#f6eee3",
});

const KALK = hell({
  bg: "#fbfcfd",
  surface: "#ffffff",
  ink: "#1c2733",
  inkSoft: "#5d6b7a",
  line: "#dde5ec",
  soft: "#eef3f7",
});

const LEINEN = hell({
  bg: "#fbfaf7",
  surface: "#ffffff",
  ink: "#23241f",
  inkSoft: "#63665c",
  line: "#e4e3db",
  soft: "#f2f1ea",
});

const SAND = hell({
  bg: "#fdfbf7",
  surface: "#ffffff",
  ink: "#2d2519",
  inkSoft: "#726550",
  line: "#eae0cf",
  soft: "#f6f0e3",
});

const TUSCHE = dunkel({
  bg: "#0f1012",
  surface: "#17181c",
  ink: "#f4f4f6",
  inkSoft: "#a0a0ac",
  line: "#2a2b33",
  soft: "#141519",
});

const NACHTHOLZ = dunkel({
  bg: "#141013",
  surface: "#1d1719",
  ink: "#f6f1ec",
  inkSoft: "#b0a099",
  line: "#332a2c",
  soft: "#191315",
});

const NACHTBLAU = dunkel({
  bg: "#0d1218",
  surface: "#151c24",
  ink: "#eef3f8",
  inkSoft: "#94a4b4",
  line: "#243040",
  soft: "#111820",
});

/**
 * Eine Stimmung: Grundgerüst, Anzeigeschrift und Akzenttöne.
 *
 * bilder gibt an, welche Bilder aus dem Pool der Küche diese Stimmung nutzt –
 * je Küche liegen sechs Hero- und drei Interieurbilder bereit (imageLibrary.js),
 * die sich damit sauber auf drei Stimmungen aufteilen.
 */
function stimmung(id, label, archetyp, basis, extras) {
  const { display, transform = "none", tracking = "-0.01em", radius = "12px", bilder, ...toene } = extras;
  return {
    id,
    label,
    archetyp,
    display,
    body: SANS,
    displayTransform: transform,
    displayTracking: tracking,
    radius,
    ...basis,
    ...toene,
    bilder,
  };
}

const GRUND_STIMMUNGEN = {
  bayerisch: [
    stimmung("wirtshaus", "Wirtshaus", "traditionell", LEINEN, {
      display: SERIF_RUSTIKAL,
      radius: "12px",
      accent: "#3f5d3a", accentDark: "#2d452a", onAccent: "#ffffff",
      gold: "#b8862f", tint: "#1e2a1c", tintRgb: "30,42,28",
      bilder: [0, 1],
    }),
    stimmung("kellerstube", "Kellerstube", "abend", NACHTHOLZ, {
      display: SERIF_RUSTIKAL,
      radius: "10px",
      accent: "#a8583a", accentDark: "#85422b", onAccent: "#ffffff",
      gold: "#c99a4e", tint: "#0e0a0b", tintRgb: "14,10,11",
      bilder: [2, 3],
    }),
    stimmung("biergarten", "Biergarten", "hell", KALK, {
      display: SANS_GEOMETRISCH, transform: "none", tracking: "0",
      radius: "18px",
      accent: "#568238", accentDark: "#44682c", onAccent: "#ffffff",
      gold: "#c8a63c", tint: "#1e2a18", tintRgb: "30,42,24",
      bilder: [4, 5],
    }),
  ],

  italienisch: [
    stimmung("trattoria", "Trattoria", "traditionell", PAPIER, {
      display: SERIF_ELEGANT,
      radius: "16px",
      accent: "#b4451f", accentDark: "#8d3416", onAccent: "#ffffff",
      gold: "#c1872c", tint: "#2e2018", tintRgb: "46,32,24",
      bilder: [0, 1],
    }),
    stimmung("osteria-notte", "Osteria Notte", "abend", NACHTHOLZ, {
      display: SERIF_KONTRAST, tracking: "0",
      radius: "8px",
      accent: "#ab3946", accentDark: "#8c2f39", onAccent: "#ffffff",
      gold: "#c39b3f", tint: "#120c0e", tintRgb: "18,12,14",
      bilder: [2, 3],
    }),
    stimmung("costiera", "Costiera", "hell", KALK, {
      display: SERIF_FEIN, tracking: "0",
      radius: "20px",
      accent: "#2e7da6", accentDark: "#22617f", onAccent: "#ffffff",
      gold: "#d9a92c", tint: "#16303d", tintRgb: "22,48,61",
      bilder: [4, 5],
    }),
  ],

  griechisch: [
    stimmung("taverne-am-hafen", "Taverne am Hafen", "traditionell", KALK, {
      display: SERIF_ELEGANT,
      radius: "14px",
      accent: "#1f6f9c", accentDark: "#155273", onAccent: "#ffffff",
      gold: "#cfa53a", tint: "#12293a", tintRgb: "18,41,58",
      bilder: [0, 1],
    }),
    stimmung("athener-moderne", "Athener Moderne", "abend", TUSCHE, {
      display: SANS_GEOMETRISCH, transform: "uppercase", tracking: "0.02em",
      radius: "4px",
      accent: "#c9a227", accentDark: "#a3811b", onAccent: "#1a1406",
      gold: "#c9a227", tint: "#08090b", tintRgb: "8,9,11",
      bilder: [2, 3],
    }),
    stimmung("olivenhain", "Olivenhain", "hell", LEINEN, {
      display: SERIF_FEIN, tracking: "0",
      radius: "18px",
      accent: "#6b7d3d", accentDark: "#4f5e2c", onAccent: "#ffffff",
      gold: "#b8923c", tint: "#242a18", tintRgb: "36,42,24",
      bilder: [4, 5],
    }),
  ],

  tuerkisch: [
    stimmung("basar", "Basar", "traditionell", SAND, {
      display: SANS_SCHMAL, transform: "uppercase", tracking: "0.03em",
      radius: "10px",
      accent: "#c0392b", accentDark: "#96291d", onAccent: "#ffffff",
      gold: "#d6a233", tint: "#2c1713", tintRgb: "44,23,19",
      bilder: [0, 1],
    }),
    stimmung("bosporus-nacht", "Bosporus bei Nacht", "abend", NACHTBLAU, {
      display: SERIF_KONTRAST, tracking: "0",
      radius: "6px",
      accent: "#2b8181", accentDark: "#1f6767", onAccent: "#ffffff",
      gold: "#c9a227", tint: "#0a1016", tintRgb: "10,16,22",
      bilder: [2, 3],
    }),
    stimmung("anatolische-erde", "Anatolische Erde", "hell", SAND, {
      display: SERIF_RUSTIKAL,
      radius: "16px",
      accent: "#a85c2e", accentDark: "#834320", onAccent: "#ffffff",
      gold: "#c08a33", tint: "#2b1d12", tintRgb: "43,29,18",
      bilder: [4, 5],
    }),
  ],

  syrisch: [
    stimmung("damaszener-hof", "Damaszener Hof", "traditionell", KALK, {
      display: SERIF_ELEGANT,
      radius: "14px",
      accent: "#3c8369", accentDark: "#2d6751", onAccent: "#ffffff",
      gold: "#c9a227", tint: "#16302a", tintRgb: "22,48,42",
      bilder: [0, 1],
    }),
    stimmung("gewuerzbasar", "Gewürzbasar", "abend", NACHTHOLZ, {
      display: SANS_SCHMAL, transform: "uppercase", tracking: "0.03em",
      radius: "8px",
      accent: "#c8791f", accentDark: "#b66b17", onAccent: "#1a0f05",
      gold: "#d8a33c", tint: "#140d08", tintRgb: "20,13,8",
      bilder: [2, 3],
    }),
    stimmung("levante-modern", "Levante Modern", "hell", SAND, {
      display: SERIF_FEIN, tracking: "0",
      radius: "18px",
      accent: "#8a6a3f", accentDark: "#6a502e", onAccent: "#ffffff",
      gold: "#c0994a", tint: "#2a2016", tintRgb: "42,32,22",
      bilder: [4, 5],
    }),
  ],

  chinesisch: [
    stimmung("rote-laterne", "Rote Laterne", "traditionell", PAPIER, {
      display: SERIF_ELEGANT,
      radius: "12px",
      accent: "#b31e1e", accentDark: "#8a1515", onAccent: "#ffffff",
      gold: "#c9a227", tint: "#2a1212", tintRgb: "42,18,18",
      bilder: [0, 1],
    }),
    stimmung("shanghai-nacht", "Shanghai Nacht", "abend", TUSCHE, {
      display: SANS_GEOMETRISCH, transform: "uppercase", tracking: "0.01em",
      radius: "6px",
      accent: "#dd353a", accentDark: "#c02a2f", onAccent: "#ffffff",
      gold: "#d9a441", tint: "#08090b", tintRgb: "8,9,11",
      bilder: [2, 3],
    }),
    stimmung("teehaus", "Teehaus", "hell", LEINEN, {
      display: SERIF_FEIN, tracking: "0",
      radius: "18px",
      accent: "#3f7d6a", accentDark: "#2d5c4d", onAccent: "#ffffff",
      gold: "#b8923c", tint: "#1c2b26", tintRgb: "28,43,38",
      bilder: [4, 5],
    }),
  ],

  thailaendisch: [
    stimmung("orchidee", "Orchidee", "traditionell", KALK, {
      display: SERIF_ELEGANT,
      radius: "16px",
      accent: "#b13a7a", accentDark: "#8b2a5e", onAccent: "#ffffff",
      gold: "#c9a227", tint: "#2c1424", tintRgb: "44,20,36",
      bilder: [0, 1],
    }),
    stimmung("streetfood-nacht", "Streetfood Nacht", "abend", TUSCHE, {
      display: SANS_SCHMAL, transform: "uppercase", tracking: "0.04em",
      radius: "4px",
      accent: "#f36d1f", accentDark: "#d05712", onAccent: "#1a0d05",
      gold: "#e3a13a", tint: "#0b0a0a", tintRgb: "11,10,10",
      bilder: [2, 3],
    }),
    stimmung("andamanen", "Andamanen", "hell", KALK, {
      display: SANS_GEOMETRISCH, tracking: "0",
      radius: "20px",
      accent: "#1a837f", accentDark: "#15746f", onAccent: "#ffffff",
      gold: "#d9a92c", tint: "#0f3230", tintRgb: "15,50,48",
      bilder: [4, 5],
    }),
  ],

  vietnamesisch: [
    stimmung("indochine", "Indochine", "traditionell", SAND, {
      display: SERIF_ELEGANT,
      radius: "14px",
      accent: "#8a5a2b", accentDark: "#6a431e", onAccent: "#ffffff",
      gold: "#c0994a", tint: "#2a1d12", tintRgb: "42,29,18",
      bilder: [0, 1],
    }),
    stimmung("hanoi-nacht", "Hanoi Nacht", "abend", NACHTHOLZ, {
      display: SERIF_KONTRAST, tracking: "0",
      radius: "8px",
      accent: "#d08a1f", accentDark: "#b07015", onAccent: "#1a1205",
      gold: "#e0ab45", tint: "#140f0a", tintRgb: "20,15,10",
      bilder: [2, 3],
    }),
    stimmung("strassenkueche", "Straßenküche", "hell", LEINEN, {
      display: SANS_GEOMETRISCH, tracking: "0",
      radius: "18px",
      accent: "#48833a", accentDark: "#3a6b2e", onAccent: "#ffffff",
      gold: "#c8a63c", tint: "#1e2a18", tintRgb: "30,42,24",
      bilder: [4, 5],
    }),
  ],

  japanisch: [
    stimmung("izakaya", "Izakaya", "traditionell", NACHTHOLZ, {
      display: SANS_GEOMETRISCH, transform: "uppercase", tracking: "0.02em",
      radius: "6px",
      accent: "#c8352f", accentDark: "#9e2723", onAccent: "#ffffff",
      gold: "#d9a441", tint: "#120d0e", tintRgb: "18,13,14",
      bilder: [0, 1],
    }),
    stimmung("omakase", "Omakase", "abend", TUSCHE, {
      display: SERIF_KONTRAST, tracking: "0.01em",
      radius: "2px",
      accent: "#b99a4e", accentDark: "#94793a", onAccent: "#12100a",
      gold: "#b99a4e", tint: "#07080a", tintRgb: "7,8,10",
      bilder: [2, 3],
    }),
    stimmung("washitsu", "Washitsu", "hell", LEINEN, {
      display: SERIF_FEIN, tracking: "0.01em",
      radius: "2px",
      accent: "#6b6256", accentDark: "#4e473e", onAccent: "#ffffff",
      gold: "#a8905c", tint: "#262320", tintRgb: "38,35,32",
      bilder: [4, 5],
    }),
  ],

  indisch: [
    stimmung("gewuerzmarkt", "Gewürzmarkt", "traditionell", SAND, {
      display: SANS_SCHMAL, transform: "uppercase", tracking: "0.03em",
      radius: "12px",
      accent: "#c87f1e", accentDark: "#b06d16", onAccent: "#1a1005",
      gold: "#d8a33c", tint: "#2c1e0d", tintRgb: "44,30,13",
      bilder: [0, 1],
    }),
    stimmung("maharadscha", "Maharadscha", "abend", NACHTBLAU, {
      display: SERIF_KONTRAST, tracking: "0",
      radius: "8px",
      accent: "#974381", accentDark: "#6c2e5c", onAccent: "#ffffff",
      gold: "#c9a227", tint: "#0c0a12", tintRgb: "12,10,18",
      bilder: [2, 3],
    }),
    stimmung("suedindisch-hell", "Südindisch hell", "hell", LEINEN, {
      display: SERIF_FEIN, tracking: "0",
      radius: "18px",
      accent: "#46833c", accentDark: "#36672d", onAccent: "#ffffff",
      gold: "#c8a63c", tint: "#1e2a18", tintRgb: "30,42,24",
      bilder: [4, 5],
    }),
  ],

  asiatisch: [
    stimmung("marktstand", "Marktstand", "traditionell", SAND, {
      display: SANS_SCHMAL, transform: "uppercase", tracking: "0.03em",
      radius: "10px",
      accent: "#c1571d", accentDark: "#9c4414", onAccent: "#ffffff",
      gold: "#d8a33c", tint: "#2c1a0d", tintRgb: "44,26,13",
      bilder: [0, 1],
    }),
    stimmung("neon", "Neon", "abend", TUSCHE, {
      display: SANS_GEOMETRISCH, transform: "uppercase", tracking: "0.01em",
      radius: "6px",
      accent: "#dd353a", accentDark: "#c02a2f", onAccent: "#ffffff",
      gold: "#d9a441", tint: "#08090b", tintRgb: "8,9,11",
      bilder: [2, 3],
    }),
    stimmung("fusion-minimal", "Fusion Minimal", "hell", KALK, {
      display: SANS_GEOMETRISCH, tracking: "0",
      radius: "4px",
      accent: "#2f4858", accentDark: "#1f3240", onAccent: "#ffffff",
      gold: "#a8905c", tint: "#16222b", tintRgb: "22,34,43",
      bilder: [4, 5],
    }),
  ],

  cafe: [
    stimmung("wiener-kaffeehaus", "Wiener Kaffeehaus", "traditionell", PAPIER, {
      display: SERIF_ELEGANT,
      radius: "14px",
      accent: "#2f5d4a", accentDark: "#214436", onAccent: "#ffffff",
      gold: "#b8923c", tint: "#1c2b24", tintRgb: "28,43,36",
      bilder: [0, 1],
    }),
    stimmung("konditorei", "Konditorei", "abend", PAPIER, {
      display: SERIF_KONTRAST, tracking: "0",
      radius: "20px",
      accent: "#b8557a", accentDark: "#91405e", onAccent: "#ffffff",
      gold: "#c9a227", tint: "#2e1a22", tintRgb: "46,26,34",
      bilder: [2, 3],
    }),
    stimmung("third-wave", "Third Wave", "hell", KALK, {
      display: SANS_GEOMETRISCH, tracking: "0",
      radius: "4px",
      accent: "#5c6b5a", accentDark: "#434f42", onAccent: "#ffffff",
      gold: "#a8905c", tint: "#242a23", tintRgb: "36,42,35",
      bilder: [4, 5],
    }),
  ],
};

/* ---------- Abgeleitete Schicht: kräftigerer Akzent + Editorial ---------- */

/**
 * Der kräftigere Akzent jeder Stimmung. Statt 36 (jetzt 48) Farbwerte von Hand
 * nachzuziehen, hebt colorMath.boldAccent Sättigung und – falls nötig –
 * Helligkeit an, bis der Ton mindestens 4.5:1 gegen den eigenen Grund steht.
 *
 * Der rohe accent bleibt unangetastet daneben stehen: Er steckt in jeder
 * bereits veröffentlichten Seite, und die Knopfschrift (onAccent) ist gegen
 * genau ihn geprüft. accentBold ist die zusätzliche Ebene, die der
 * Editorial-Archetyp für große Flächen und Schrift nutzt.
 */
function mitBoldAccent(s) {
  return {
    ...s,
    accentBold: boldAccent(s.accent, { against: s.bg, saturationBoost: 18, targetContrast: 4.5 }),
    // Derselbe Gedanke, nur streng genug für Text: Der Akzent trägt Schrift
    // nicht nur auf bg, sondern auch auf surface (Karten, Formulare) und soft
    // (Karten- und Stimmen-Sektion). accentBold erreicht 4.5:1 nur gegen bg
    // und fällt auf den beiden anderen Gründen in 35 von 48 Stimmungen durch
    // (nachzurechnen mit scripts/colorSwatchCheck.mjs). accentLesbar prüft
    // gegen alle drei und nimmt den ungünstigsten.
    accentLesbar: boldAccent(s.accent, {
      against: [s.bg, s.surface, s.soft],
      saturationBoost: 18,
      targetContrast: 4.5,
    }),
  };
}

/**
 * Die Editorial-Welt einer Küche. Sie erfindet keine neuen Farben, sondern
 * nimmt die der traditionellen Stimmung – die Identität der Küche bleibt also
 * dieselbe – und stellt nur die Form härter: keine runden Ecken, engere
 * Laufweite. Alles Weitere (Größe, Raster, Vollbild) steckt im Layout des
 * Archetyps, nicht in der Farbwelt.
 *
 * Sie greift auf alle drei Bildpaare zu (je ein Bild pro Grundstimmung): Ein
 * Magazin-Layout lebt vom Bild, da wäre eine Auswahl aus zwei Aufnahmen zu
 * knapp.
 */
function editorialStimmung(liste) {
  const basis = liste.find((s) => s.archetyp === "traditionell") ?? liste[0];
  return {
    ...basis,
    id: `${basis.id}-editorial`,
    label: `${basis.label} Editorial`,
    archetyp: "editorial",
    radius: "0px",
    displayTracking: "-0.03em",
    bilder: [0, 2, 4],
  };
}

export const STIMMUNGEN = Object.fromEntries(
  Object.entries(GRUND_STIMMUNGEN).map(([cuisine, liste]) => [
    cuisine,
    [...liste, editorialStimmung(liste)].map(mitBoldAccent),
  ]),
);

const FALLBACK_KUECHE = "bayerisch";

export function stimmungenFuer(cuisine) {
  return STIMMUNGEN[cuisine] ?? STIMMUNGEN[FALLBACK_KUECHE];
}

/**
 * Alle Stimmungen als flache Liste für die Auswahl im Dashboard.
 */
export function stimmungsAuswahl() {
  return Object.entries(STIMMUNGEN).map(([cuisine, liste]) => ({
    cuisine,
    stimmungen: liste.map(({ id, label, archetyp }) => ({
      id,
      label,
      archetyp,
      archetypLabel: ARCHETYP_LABEL[archetyp],
    })),
  }));
}

export function istStimmungsId(cuisine, id) {
  return stimmungenFuer(cuisine).some((s) => s.id === id);
}

/**
 * Löst eine Stimmung auf. Ohne Auswahl entscheidet der Seed – zwei Nachbarlokale
 * derselben Küche bekommen so unterschiedliche Welten, ohne dass jemand
 * eingreifen muss. Eine unbekannte Kennung fällt auf den Seed zurück statt zu
 * werfen: Ein Tippfehler in der Auswahl darf nie den Aufbau der Seite brechen.
 */
export function resolveStimmung(cuisine, { id, seed = 0 } = {}) {
  const liste = stimmungenFuer(cuisine);
  const gewaehlt = id ? liste.find((s) => s.id === id) : null;
  if (gewaehlt) return gewaehlt;

  // Ohne Auswahl bleibt der Seed bei den drei ausgearbeiteten Welten. Editorial
  // ist eine bewusste Entscheidung des Wirts, keine Zufallszuteilung – und ein
  // vierter Eintrag im Zufallstopf hätte jedem bestehenden Lead über Nacht eine
  // andere Stimmung gegeben.
  const grund = liste.filter((s) => GRUND_ARCHETYPEN.includes(s.archetyp));
  return grund[seed % grund.length];
}
