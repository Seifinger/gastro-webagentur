// Visueller Charakter-Kanon je Küche × Stimmung.
//
// Er beschreibt, wie ein Bild für diese Seite aussehen muss – egal, ob es der
// Wirt mit dem Handy macht, ein Fotograf oder ein Bildmodell. Die
// Medien-Pipeline (assets-pipeline/mediaGenerator.js) baut daraus ihre
// Prompts; die Bearbeitungsansicht zeigt ihn dem Wirt als Foto-Anleitung.
//
// Licht und Perspektive hängen am Archetyp (Haltung des Hauses), Requisiten
// und Oberflächen an der Küche (Identität). Zusammen ergeben sie 36
// unterscheidbare Bildwelten, ohne dass 36 Texte von Hand gepflegt werden.

const LICHT = {
  traditionell: {
    de: "weiches Seitenlicht vom Fenster, später Vormittag, warm (ca. 3800 K), Schatten sichtbar aber offen",
    en: "soft window side light, late morning, warm 3800K, open soft shadows",
  },
  abend: {
    de: "Pendel- oder Kerzenlicht, tiefe Schatten, warm (ca. 2700 K), Hintergrund fällt ins Dunkle",
    en: "low pendant or candle light, deep shadows, warm 2700K, background falling into darkness",
  },
  hell: {
    de: "helles, diffuses Tageslicht, kaum Schatten, neutral (ca. 5000 K)",
    en: "bright diffused daylight, minimal shadows, neutral 5000K",
  },
};

const PERSPEKTIVE = {
  traditionell: {
    de: "45°-Tischperspektive, Anschnitt am Tellerrand, Hände des Personals dürfen im Bild sein",
    en: "45-degree table angle, cropped at the plate edge, staff hands allowed in frame",
  },
  abend: {
    de: "nah, geringe Schärfentiefe, ein Gericht oder ein Glas als einziges Licht im Bild",
    en: "close-up, shallow depth of field, a single dish or glass as the only lit object",
  },
  hell: {
    de: "Draufsicht oder frontal auf Tischhöhe, viel Luft um das Gericht",
    en: "overhead or straight-on at table height, generous negative space around the dish",
  },
};

const REQUISITEN = {
  bayerisch: { de: ["Eichenholztisch", "Steinkrug", "Brezen", "Leinenserviette", "Zinnteller"], en: "oak table, stoneware mug, pretzels, linen napkin, pewter plate" },
  italienisch: { de: ["Marmorplatte", "Olivenöl in Blechkanne", "Leinentuch", "Mehlstaub", "Wasserglas"], en: "marble slab, olive oil in a tin can, linen cloth, dusting of flour, simple water glass" },
  griechisch: { de: ["Kalkwand", "blau gestrichenes Holz", "Olivenzweig", "Emaillegeschirr", "Zitronen"], en: "whitewashed wall, blue painted wood, olive branch, enamel plates, lemons" },
  tuerkisch: { de: ["Kupfertablett", "Tulpenglas mit Tee", "Fladenbrot", "Sumach", "Keramik in Iznik-Blau"], en: "copper tray, tulip glass of tea, flatbread, sumac, Iznik-blue ceramics" },
  syrisch: { de: ["Messingtablett", "Mezze-Schälchen", "Granatapfel", "Fliesenmuster unscharf im Hintergrund"], en: "brass tray, small mezze bowls, pomegranate, blurred tile pattern in background" },
  chinesisch: { de: ["Bambuskörbe", "Porzellan mit Craquelé", "Lacktablett", "Tonteekanne"], en: "bamboo steamers, crackle-glaze porcelain, lacquer tray, clay teapot" },
  thailaendisch: { de: ["Bananenblatt", "Messingschalen", "Limetten", "Thai-Basilikum", "Emailleteller"], en: "banana leaf, brass bowls, limes, thai basil, enamel plate" },
  vietnamesisch: { de: ["Emailleschüsseln", "Kräuterbündel", "Fischsauce-Kännchen", "Stäbchen aus Holz"], en: "enamel bowls, bunches of fresh herbs, small fish sauce jug, wooden chopsticks" },
  japanisch: { de: ["Hinoki-Holz", "Keramik mit Kannyu-Glasur", "Stäbchenbänkchen", "Noren-Vorhang unscharf"], en: "hinoki wood counter, kannyu-glaze ceramics, chopstick rest, blurred noren curtain" },
  indisch: { de: ["Messing-Thali", "Kupfer-Kadai", "Gewürze in Schälchen", "Naan auf Baumwolltuch"], en: "brass thali, copper kadai, spices in small bowls, naan on cotton cloth" },
  asiatisch: { de: ["Kraftpapier", "Wok", "Emailleschüssel", "Essstäbchen"], en: "kraft paper, wok, enamel bowl, chopsticks" },
  cafe: { de: ["Marmortisch", "Porzellantasse mit Untertasse", "Zeitung", "Kuchengabel"], en: "marble cafe table, porcelain cup and saucer, newspaper, cake fork" },
};

const MOTIVE = {
  bayerisch: "Schweinsbraten mit Knödel",
  italienisch: "Pasta oder Pizza aus dem Holzofen",
  griechisch: "Grillteller und Meze",
  tuerkisch: "Grillspieß mit Fladenbrot",
  syrisch: "Mezze-Tisch mit Hummus",
  chinesisch: "Dim Sum im Bambuskorb",
  thailaendisch: "Curry in Messingschale",
  vietnamesisch: "Phở mit Kräutern",
  japanisch: "Nigiri auf Holzbrett",
  indisch: "Curry mit Naan",
  asiatisch: "Nudeln aus dem Wok",
  cafe: "Kuchen und Kaffee",
};

const VERBOTEN_GLOBAL = [
  "Menschen, die in die Kamera lächeln",
  "Hochglanz-Überschärfe und plastische Haut",
  "Schrift, Logos oder Wasserzeichen im Bild",
  "Gerichte mit unmöglich vielen Zutaten",
  "aufgesetzte Dampfschwaden",
  "Bokeh-Lichtkreise als Deko",
];

export function bildKanonFuer(kueche, stimmung, signal = {}) {
  const archetyp = stimmung.archetyp;
  const licht = LICHT[archetyp] ?? LICHT.traditionell;
  const perspektive = PERSPEKTIVE[archetyp] ?? PERSPEKTIVE.traditionell;
  const requisiten = REQUISITEN[kueche] ?? REQUISITEN.bayerisch;
  const dunkel = Boolean(stimmung.dark);
  const farbstimmung = `${dunkel ? "dunkel, satt" : "hell, luftig"}; Akzent ${stimmung.accent} darf im Bild vorkommen (Serviette, Keramik), sonst ${signal.temperatur === "kühl" ? "kühle" : "warme"} Neutrale`;
  return {
    motiv: MOTIVE[kueche] ?? "Hausgericht",
    licht: licht.de,
    perspektive: perspektive.de,
    farbstimmung,
    requisiten: requisiten.de,
    verboten: VERBOTEN_GLOBAL,
    promptBasis: `editorial restaurant photography, ${licht.en}, ${perspektive.en}, ${requisiten.en}, ${dunkel ? "dark moody palette" : "light airy palette"}, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`,
    negativPrompt: "text, watermark, logo, oversaturated, plastic, cgi, 3d render, bokeh circles, smiling people, steam effect, extra fingers",
    rollen: {
      hero: "Das Hausgericht im Licht des Hauses, Querformat 16:9, Raum links oder rechts für Text frei",
      haus: "Außenansicht oder Eingang, so dass Gäste das Haus auf der Straße erkennen",
      team: "Hände bei der Arbeit, kein Gruppenfoto",
      bestseller: "Das meistbestellte Gericht, ehrlich, ohne Deko",
      gericht: "Ein Gericht, freigestellt auf der Oberfläche des Hauses, 4:3",
    },
  };
}
