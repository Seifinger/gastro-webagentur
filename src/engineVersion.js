// Welche Fassung der Template-Engine eine Seite gebaut hat.
//
// Hintergrund: Unter docs/ liegen bereits Kundenseiten, die vor dem Umbau
// (Sektionsfunktionen, Editorial-Archetyp, ausgebautes Motion-System)
// veröffentlicht wurden. Sie sollen sich nicht von selbst ändern – ein neues
// Aussehen ist eine Entscheidung pro Kunde, kein Nebeneffekt eines
// Sammel-Laufs.
//
// Wichtig: Das ist bewusst KEIN Schalter zwischen zwei Renderpfaden. Der
// Umbau der Phasen 0–5 ist für die Archetypen traditionell/abend/hell Zeichen
// für Zeichen dieselbe Ausgabe wie vorher (nachgeprüft per Byte-Diff), und
// alles Neue (Magazin-Raster, größere Typo, zusätzliche Bewegung, der
// kräftigere accentBold) hängt an einem Preset, das es ausdrücklich anfordert.
// Zwei Codepfade zu pflegen hätte also nur Kosten und keinen Nutzen.
//
// Der Marker beantwortet deshalb genau eine Frage: Wann wurde diese Seite
// zuletzt wirklich neu gebaut und veröffentlicht? Daran sieht der
// Agenturinhaber, welche Kunden noch auf dem alten Stand stehen und für eine
// Auffrischung in Frage kommen (siehe npm run engine-status).

/** Aktuelle Engine – Stand nach dem Umbau der Phasen 0–5. */
export const ENGINE_VERSION = 2;

/**
 * Alles, was schon unter docs/ liegt und keinen Marker trägt, stammt aus der
 * Zeit davor. Es gibt dafür keinen Eintrag, den man nachträglich setzen
 * könnte – das Fehlen des Markers IST die Angabe.
 */
export const LEGACY_ENGINE_VERSION = 1;

/**
 * Die Marker-Zeilen für den <head>. Rein additiv: Am übrigen Seiteninhalt
 * ändert sich dadurch nichts.
 */
export function engineMarkerMeta({ archetyp = "", version = ENGINE_VERSION } = {}) {
  const zeilen = [`<meta name="engine-version" content="${version}">`];
  // Der Archetyp steht mit in der Seite, damit der Statusbericht auch dann
  // etwas zu sagen hat, wenn das (gitignorierte) Manifest auf einem anderen
  // Rechner liegt oder neu aufgebaut wurde.
  if (archetyp) zeilen.push(`<meta name="engine-archetype" content="${archetyp}">`);
  return zeilen.join("\n");
}

/** Liest die Engine-Fassung aus fertigem HTML. Ohne Marker: Legacy. */
export function leseEngineVersion(html) {
  const treffer = /<meta name="engine-version" content="(\d+)">/.exec(String(html));
  return treffer ? Number(treffer[1]) : LEGACY_ENGINE_VERSION;
}

/** Liest den Archetyp aus fertigem HTML. Ohne Marker: null (alte Seite). */
export function leseEngineArchetyp(html) {
  const treffer = /<meta name="engine-archetype" content="([^"]*)">/.exec(String(html));
  return treffer ? treffer[1] : null;
}
