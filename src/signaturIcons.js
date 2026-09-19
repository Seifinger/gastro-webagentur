// Gezeichnete Marken statt Symbolschrift.
//
// heroSignature.js hat für jede Küche ein eigenes, von Hand gezeichnetes
// Element im Hero – den Olivenzweig, den Minztee, die Laterne. Genau das
// Prinzip wird hier auf die kleinen, wiederkehrenden Stellen ausgeweitet: die
// Symbole der Kontaktliste, den Haken der USP-Leiste und eine
// Küchenmarke, die an mehreren Stellen derselben Seite auftaucht.
//
// Warum überhaupt: Bisher standen dort Emoji (📍 📞 🥡 ✓). Emoji sind
// Systemschriften – auf Android, iOS und Windows sehen sie jeweils anders aus,
// sie tragen fremde Farben in die Palette, und sie gehören niemandem. Ein
// gezeichnetes Symbol gehört dem Haus.
//
// Drei Regeln, an denen sich hier alles messen lassen muss:
//
// 1. Ein Strich, keine Fläche. Alles arbeitet mit `currentColor` als Kontur,
//    damit das Symbol die Farbe seines Textes erbt und der Kontrast nie
//    getrennt geprüft werden muss.
// 2. Keine geometrische Konstruktion. Die Kurven sind bewusst ungleich, damit
//    die Zeichen nach Hand aussehen und nicht nach Icon-Bibliothek.
// 3. Rein dekorativ. Jedes Symbol steht neben seinem Text, nie an dessen
//    Stelle, und trägt deshalb `aria-hidden`.

const ATTR = 'aria-hidden="true" focusable="false"';

/** Rahmen für die Strichsymbole der Kontaktliste und der USP-Leiste. */
function strich(viewBox, inhalt, klasse = "ikon") {
  return `<svg class="${klasse}" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${ATTR}>${inhalt}</svg>`;
}

/**
 * Die drei Symbole der Kontaktliste. Sie ersetzen 📍 📞 🥡 – gezeichnet, nicht
 * gesetzt.
 */
export const KONTAKT_IKONEN = {
  // Ein Wegweiser statt der üblichen Tropfenform: Das Haus steht an einer
  // Straße, nicht auf einer Landkarte.
  ort: strich(
    "0 0 24 24",
    '<path d="M11.4 20.6V4.3"/><path d="M11.4 5.4h7.9l-1.9 2.7 1.9 2.7h-7.9"/><path d="M8.6 20.8h5.6"/>',
  ),
  // Der gebogene Hörer eines Tischapparats – die Form, die in einem Wirtshaus
  // tatsächlich an der Wand hängt.
  telefon: strich(
    "0 0 24 24",
    '<path d="M4.9 5.4c1.3-1.2 2.5-1 3.2.1.5.8.9 1.6 1.3 2.4.3.6.1 1.1-.5 1.5l-.9.7c-.3.2-.4.6-.2.9 1 1.9 2.5 3.4 4.4 4.3.3.2.7.1.9-.2l.7-.9c.4-.6 1-.8 1.5-.5.9.4 1.7.9 2.5 1.4 1.1.7 1.2 1.9 0 3.2"/>',
  ),
  // Die Papiertüte mit umgeschlagenem Rand: das, was der Gast mitnimmt.
  abholung: strich(
    "0 0 24 24",
    '<path d="M6.3 8.5h11.4l-.9 10.9c0 .7-.6 1.2-1.3 1.2H8.5c-.7 0-1.2-.5-1.3-1.2Z"/><path d="M9.3 8.5c-.1-2.4 1-3.9 2.7-3.9 1.8 0 2.9 1.5 2.8 3.9"/><path d="M6.6 11.7h10.8"/>',
  ),
};

/**
 * Der Haken der USP-Leiste und der Reservierungs-Pluspunkte. Ein Strich mit
 * ungleichen Schenkeln statt des gesetzten ✓.
 */
export function haken() {
  return strich("0 0 24 24", '<path d="M4 12.4c2.1 1 3.8 2.5 5.1 4.4C12 11.6 15.8 7.4 21 4.6"/>', "ikon ikon-haken");
}

// ---------------------------------------------------------------------------
// Die Küchenmarke
// ---------------------------------------------------------------------------
//
// Ein kleines Zeichen je Küche, aus derselben Motivfamilie wie die
// Hero-Signatur: Wo im Hero ein Olivenzweig schaukelt, steht hier eine Olive
// am Zweig. Es taucht mehrfach auf derselben Seite auf (Sektionsmarke,
// Siegel der Hausempfehlung, Fußzeile) – daran erkennt man die Seite wieder,
// ohne den Namen zu lesen.

const MARKEN = {
  // Hopfendolde – was im Krug ist, bevor es im Krug ist.
  bayerisch:
    '<path d="M14 4.6v3.1"/><path d="M14 8c-2.6.3-4.3 2-4.6 4.6 2.6-.3 4.3-2 4.6-4.6Z"/><path d="M14 8c2.6.3 4.3 2 4.6 4.6-2.6-.3-4.3-2-4.6-4.6Z"/><path d="M14 13.2c-2.6.3-4.3 2-4.6 4.6 2.6-.3 4.3-2 4.6-4.6Z"/><path d="M14 13.2c2.6.3 4.3 2 4.6 4.6-2.6-.3-4.3-2-4.6-4.6Z"/><path d="M14 18.6c-1.5 1.4-2.2 3-2.2 4.8 1.8-.6 3-2.2 3.4-4.8"/>',
  // Basilikumzweig – der Duft, der aus einer Trattoria auf die Straße kommt.
  italienisch:
    '<path d="M14 23V9.4"/><path d="M14 12.8c-2.9.6-4.6-.5-5.2-3.4 2.9-.6 4.6.5 5.2 3.4Z"/><path d="M14 10.3c2.7-.9 3.9-2.6 3.5-5.2-2.7.9-3.9 2.6-3.5 5.2Z"/><path d="M14 17.1c-2.5.4-4-.6-4.5-2.9 2.5-.4 4 .6 4.5 2.9Z"/>',
  // Olivenzweig – dasselbe Motiv wie im Hero (heroOliveBranch), nur klein.
  griechisch:
    '<path d="M5.2 23C9.4 19.4 13 14.4 15.4 8"/><path d="M9.8 16.6c-2.6-.7-3.4-2.4-2.3-5 2.6.7 3.4 2.4 2.3 5Z"/><path d="M14.6 9.4c-2.6-.7-3.4-2.4-2.3-5 2.6.7 3.4 2.4 2.3 5Z"/><path d="M13.6 13.2 17 14.8"/><ellipse cx="18.8" cy="16.2" rx="2.7" ry="3.6" transform="rotate(28 18.8 16.2)"/>',
  // Der Spieß, wie er im Fenster steht.
  tuerkisch:
    '<path d="M14 3.2v19.6"/><path d="M9.6 7.4c1.1-1.2 2.6-1.8 4.4-1.8s3.3.6 4.4 1.8c-1.1 1.2-2.6 1.8-4.4 1.8s-3.3-.6-4.4-1.8Z"/><path d="M9 12.6c1.3-1.2 2.9-1.8 5-1.8s3.7.6 5 1.8c-1.3 1.2-2.9 1.9-5 1.9s-3.7-.7-5-1.9Z"/><path d="M10.2 17.6c1-1 2.3-1.5 3.8-1.5s2.8.5 3.8 1.5c-1 1-2.3 1.6-3.8 1.6s-2.8-.6-3.8-1.6Z"/>',
  // Minzblatt – aus dem Glas, das im Hero eingegossen wird.
  syrisch:
    '<path d="M14 22.6c0-3.4.6-6 1.8-7.9"/><path d="M15.8 14.7c4.6.4 6.9-1.8 6.9-6.6-4.8-.5-7.1 1.7-6.9 6.6Z"/><path d="M15.8 14.7c-4.6.4-6.9-1.8-6.9-6.6 4.8-.5 7.1 1.7 6.9 6.6Z"/>',
  // Die rote Laterne – die Stimmung heißt so.
  chinesisch:
    '<path d="M14 2.6v2.6"/><path d="M10.2 5.2h7.6"/><path d="M10.2 5.2C6.6 9 6.6 14.6 10.2 18.4"/><path d="M17.8 5.2c3.6 3.8 3.6 9.4 0 13.2"/><path d="M14 5.2v13.2"/><path d="M10.2 18.4h7.6"/><path d="M14 18.4v3.4"/><path d="M12.4 24.6c1.1-.7 2.1-.7 3.2 0"/>',
  // Die Orchidee aus dem Hero, auf fünf Striche eingedampft.
  thailaendisch:
    '<g transform="translate(14 14)"><path d="M0,0 C-4.5,-2.8 -5.6,-8.4 -2.2,-11.8 C0,-12.9 0,-12.9 2.2,-11.8 C5.6,-8.4 4.5,-2.8 0,0 Z" transform="rotate(0)"/><path d="M0,0 C-4.5,-2.8 -5.6,-8.4 -2.2,-11.8 C0,-12.9 0,-12.9 2.2,-11.8 C5.6,-8.4 4.5,-2.8 0,0 Z" transform="rotate(72)"/><path d="M0,0 C-4.5,-2.8 -5.6,-8.4 -2.2,-11.8 C0,-12.9 0,-12.9 2.2,-11.8 C5.6,-8.4 4.5,-2.8 0,0 Z" transform="rotate(144)"/><path d="M0,0 C-4.5,-2.8 -5.6,-8.4 -2.2,-11.8 C0,-12.9 0,-12.9 2.2,-11.8 C5.6,-8.4 4.5,-2.8 0,0 Z" transform="rotate(216)"/><path d="M0,0 C-4.5,-2.8 -5.6,-8.4 -2.2,-11.8 C0,-12.9 0,-12.9 2.2,-11.8 C5.6,-8.4 4.5,-2.8 0,0 Z" transform="rotate(288)"/><circle r="1.7"/></g>',
  // Sternanis – das Gewürz, das in jeder Phở-Brühe steckt.
  vietnamesisch:
    '<path d="M14 5.6c.9 2.2.9 4 0 5.4-.9-1.4-.9-3.2 0-5.4Z"/><path d="M20.1 8.4c-.6 2.3-1.7 3.7-3.2 4.3.2-1.6 1.2-3.1 3.2-4.3Z"/><path d="M21.6 15.1c-2.1 1.1-3.8 1.3-5.3.7 1.2-1.1 3-1.3 5.3-.7Z"/><path d="M17.2 20.4c-1.8-1.5-2.8-3-2.8-4.6 1.5.6 2.5 2.1 2.8 4.6Z"/><path d="M10.8 20.4c.3-2.5 1.3-4 2.8-4.6 0 1.6-1 3.1-2.8 4.6Z"/><path d="M6.4 15.1c2.3-.6 4.1-.4 5.3.7-1.5.6-3.2.4-5.3-.7Z"/><path d="M7.9 8.4c2 1.2 3 2.7 3.2 4.3-1.5-.6-2.6-2-3.2-4.3Z"/>',
  // Ensō – der Kreis, der offen bleibt.
  japanisch:
    '<path d="M17.4 5.9c-4.5-2.2-9.2-.1-10.4 4.1-1.2 4.2 1.4 8.4 5.8 9.1 4.4.7 8-2.2 8.1-6.1.1-2.8-1.6-5.2-4.2-6.1"/>',
  // Mörser und Stößel – wo die Mischung entsteht.
  indisch:
    '<path d="M7.3 12.7h13.4c0 4.2-2.6 7.3-6.7 7.3s-6.7-3.1-6.7-7.3Z"/><path d="M11 20v2.4h6V20"/><path d="M17.8 11.4 21.4 5"/><path d="M16.1 10.6 19.7 4.2"/>',
  // Die dampfende Schale.
  asiatisch:
    '<path d="M5.6 13.4h16.8c0 4.4-3.1 7.6-8.4 7.6s-8.4-3.2-8.4-7.6Z"/><path d="M11.3 10c-1.1-1.3-1.1-2.6 0-3.9"/><path d="M15.6 10c-1.1-1.3-1.1-2.6 0-3.9"/>',
  // Die Bohne, von der alles ausgeht.
  cafe: '<ellipse cx="14" cy="13.6" rx="6" ry="8.4" transform="rotate(28 14 13.6)"/><path d="M10.8 20c1.7-4.4 2.9-8.6 3.6-12.8"/>',
};

/**
 * Die Marke einer Küche. Unbekannte Küchen bekommen keine – lieber kein
 * Zeichen als ein fremdes.
 */
export function kuechenMarke(cuisine, klasse = "marke") {
  const pfade = MARKEN[cuisine];
  if (!pfade) return "";
  return `<svg class="${klasse}" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ${ATTR}>${pfade}</svg>`;
}

export function hatKuechenMarke(cuisine) {
  return Boolean(MARKEN[cuisine]);
}

/**
 * Das CSS der Zeichen, gebunden an die Körperklasse der Handschrift, die es
 * anfordert. Es kommt zusammen mit dieser Handschrift in die Seite (siehe
 * styles/handschrift.css.js) – eine Seite ohne gezeichnete Zeichen bekommt es
 * gar nicht erst zu sehen, und keine Regel daraus kann einen anderen
 * Archetyp erreichen.
 *
 * @param {string} klasse - z. B. "hs-traditionell".
 */
export function ikonenCss(klasse) {
  return `
.${klasse} .ikon { width: 1.35em; height: 1.35em; flex: none; vertical-align: -.26em; }
.${klasse} .ikon-haken { width: 1.05em; height: 1.05em; opacity: .9; }
.${klasse} .marke { width: 1.5em; height: 1.5em; flex: none; vertical-align: -.34em; }
`;
}
