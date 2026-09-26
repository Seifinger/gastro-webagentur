// Speisekarte als Daten (Speisekarten-Seite, Stand 25.09.2026).
//
// Eine Quelle für alles, was ein Gericht auf der Website ausmacht: Startseite
// (kleine Auswahl), Speisekarten-Seite (ganze Karte) und Warenkorb
// (PAGE_DATA.warenkorb.karte) lesen dieselbe aufbereitete Karte. Es gibt keine
// zweite Menü- oder Preis-Datenhaltung – die Karte kommt aus dem Küchenkatalog
// (src/menuCatalog.js, als Musterkarte) oder aus der Karte des Betriebs
// (lead-edits.speisekarte), beide im selben Format:
//
//   { kategorien: [{ name, beschreibung?, gerichte: [...], gruppen?: [{ name, gerichte }] }] }
//
// Ein Gericht: { name, beschreibung?, preis, id?, varianten?: [{ name, preis }],
//   extras?: [{ name, preis? }], vegetarisch?, bild?, signatur?,
//   ausverkauft? | verfuegbar: false, aktiv: false | freigegeben: false,
//   empfehlungsrolle? }  – Kategorien und Gruppen dürfen ebenfalls eine
//   "empfehlungsrolle" tragen (für „Passt gut dazu“, src/empfehlungen.js).
//
// Regeln:
//   - Kategorien und Gruppen erscheinen nur, wenn sie freigegebene Gerichte haben.
//   - "aktiv: false"/"freigegeben: false" blendet ein Gericht ganz aus.
//   - "ausverkauft" (oder verfuegbar: false) bleibt sichtbar, ist aber nicht
//     bestellbar und steht nicht im Warenkorb-Katalog.
//   - Flache Karten bleiben flach; Gruppen nur, wenn die Daten sie haben.
//
// Stabile Kennungen: Jedes Gericht bekommt einen Schlüssel aus seinem Namen
// (oder seiner eigenen "id"), nicht aus seiner Position. Wird die Karte
// umsortiert oder ergänzt, zeigen Links wie speisekarte/index.html#gericht-…
// und ein begonnener Warenkorb weiter auf dasselbe Gericht.

import { slugify } from "./v1Funktionen.js";

/** Pfad der Speisekarten-Seite relativ zur Startseite. */
export const KARTE_PFAD = "speisekarte/index.html";
/** Pfad der Startseite relativ zur Speisekarten-Seite. */
export const START_PFAD = "../index.html";

const ausgeblendet = (g) => g?.aktiv === false || g?.freigegeben === false;
const istAusverkauft = (g) => g?.ausverkauft === true || g?.verfuegbar === false;
const preisOk = (p) => Number.isFinite(Number(p)) && Number(p) >= 0;

function schluesselBasis(text) {
  return slugify(String(text ?? "")).replace(/^-+|-+$/g, "") || "gericht";
}

function eindeutig(basis, vergeben) {
  let s = basis;
  for (let n = 2; vergeben.has(s); n += 1) s = `${basis}-${n}`;
  vergeben.add(s);
  return s;
}

function normVarianten(g, schluessel) {
  const liste = Array.isArray(g.varianten) ? g.varianten.filter((v) => v?.name && preisOk(v.preis) && !ausgeblendet(v)) : [];
  const vergeben = new Set();
  return liste.map((v) => ({
    id: `${schluessel}--${eindeutig(schluesselBasis(v.id ?? v.name), vergeben)}`,
    name: String(v.name),
    preis: Number(v.preis),
    ausverkauft: istAusverkauft(v),
  }));
}

function normExtras(g) {
  return (Array.isArray(g.extras) ? g.extras : [])
    .filter((x) => x?.name)
    .map((x) => ({ name: String(x.name), ...(preisOk(x.preis) ? { preis: Number(x.preis) } : {}) }));
}

/**
 * Bereitet eine Karte auf. `index` ("<kategorie>-<gericht>") bleibt die
 * Kennung für Medien und Dashboard-Texte (lead-edits.highlightBeschreibungen,
 * medien "gericht:<index>"), `schluessel` die öffentliche, stabile Kennung.
 *
 * @param {object} menu
 * @param {object} [o]
 * @param {Record<string,string>} [o.beschreibungen] - Übersteuerte Beschreibungen je index
 * @returns {{ kategorien: object[], gerichte: object[], katalog: Record<string,[string, number]> }}
 */
export function karteAusDaten(menu, { beschreibungen = {} } = {}) {
  const vergeben = new Set();
  const ankerVergeben = new Set();
  const alle = [];
  const kategorien = [];
  (menu?.kategorien ?? []).forEach((k, ki) => {
    let gi = 0;
    // Optionale Empfehlungsrolle der Kategorie bzw. Gruppe (src/empfehlungen.js).
    const kategorieRolle = k?.empfehlungsrolle ? { kategorieRolle: String(k.empfehlungsrolle) } : {};
    const gericht = (g, kategorie, gruppe) => {
      const index = `${ki}-${gi}`;
      gi += 1;
      if (!g?.name || ausgeblendet(g)) return null;
      const schluessel = eindeutig(schluesselBasis(g.schluessel ?? (typeof g.id === "string" && !/^\d+-\d+$/.test(g.id) ? g.id : g.name)), vergeben);
      const varianten = normVarianten(g, schluessel);
      if (!varianten.length && !preisOk(g.preis)) return null;
      const eintrag = {
        ...g,
        index,
        schluessel,
        anker: `gericht-${schluessel}`,
        kategorie,
        ...kategorieRolle,
        ...(gruppe?.name ? { gruppe: String(gruppe.name) } : {}),
        ...(gruppe?.empfehlungsrolle ? { gruppenRolle: String(gruppe.empfehlungsrolle) } : {}),
        name: String(g.name),
        beschreibung: beschreibungen[index] ?? g.beschreibung ?? "",
        preis: varianten.length ? Math.min(...varianten.map((v) => v.preis)) : Number(g.preis),
        varianten,
        extras: normExtras(g),
        ausverkauft: istAusverkauft(g) || (varianten.length > 0 && varianten.every((v) => v.ausverkauft)),
      };
      alle.push(eintrag);
      return eintrag;
    };
    const direkt = (k.gerichte ?? []).map((g) => gericht(g, k.name)).filter(Boolean);
    const gruppen = (k.gruppen ?? [])
      .map((gr) => ({ name: String(gr?.name ?? ""), gerichte: (gr?.gerichte ?? []).map((g) => gericht(g, k.name, gr)).filter(Boolean) }))
      .filter((gr) => gr.gerichte.length > 0);
    const anzahl = direkt.length + gruppen.reduce((s, gr) => s + gr.gerichte.length, 0);
    if (!k?.name || anzahl === 0) return;
    kategorien.push({
      name: String(k.name),
      beschreibung: k.beschreibung ?? "",
      anker: `kat-${eindeutig(schluesselBasis(k.name), ankerVergeben)}`,
      gerichte: direkt,
      gruppen,
      anzahl,
    });
  });

  // Warenkorb-Katalog: was bestellbar ist, mit Name und Preis aus der Karte.
  const katalog = {};
  for (const g of alle) {
    if (g.ausverkauft) continue;
    if (g.varianten.length) {
      for (const v of g.varianten) if (!v.ausverkauft) katalog[v.id] = [`${g.name} (${v.name})`, v.preis];
    } else {
      katalog[g.schluessel] = [g.name, g.preis];
    }
  }
  return { kategorien, gerichte: alle, katalog };
}

/** Das aufbereitete Gericht zu einem Eintrag aus highlightCandidates (über den index). */
export function gerichtZuIndex(karte, index) {
  return karte.gerichte.find((g) => g.index === index) ?? null;
}

/**
 * Kleine Auswahl für die Startseite: zuerst als "signatur" markierte Gerichte,
 * sonst reihum je Kategorie das erste noch nicht gezeigte – so zeigt die
 * Auswahl die Breite der Karte statt fünfmal Pizza. Gerichte, die schon auf
 * dem Tisch (Collage) stehen, und ausverkaufte kommen nicht noch einmal.
 */
export function auswahlFuerStartseite(karte, { ohne = [], anzahl = 4 } = {}) {
  const frei = (g) => !g.ausverkauft && !ohne.includes(g.schluessel);
  const gewaehlt = karte.gerichte.filter((g) => g.signatur && frei(g)).slice(0, anzahl);
  const warteschlangen = karte.kategorien.map((k) => [...k.gerichte, ...k.gruppen.flatMap((gr) => gr.gerichte)].filter(frei));
  for (let runde = 0; gewaehlt.length < anzahl && warteschlangen.some((w) => w.length > runde); runde += 1) {
    for (const w of warteschlangen) {
      const g = w[runde];
      if (g && !gewaehlt.includes(g) && gewaehlt.length < anzahl) gewaehlt.push(g);
    }
  }
  return gewaehlt;
}

/** Link von der Startseite zu einem Gericht auf der Speisekarten-Seite. */
export function gerichtLink(g) {
  return `${KARTE_PFAD}#${g.anker}`;
}
