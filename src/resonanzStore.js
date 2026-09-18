import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Wer hat den Entwurf angesehen? Eine JSON-Datei je Entwurf, parallel zu
// betriebStore.js aufgebaut.
//
// Bewusst grob: Festgehalten werden Zeitpunkt, gerundete Verweildauer und ob
// der Besucher bis zur Reservierungssektion gekommen ist. Keine IP, kein
// User-Agent, kein Referer, keine Besuchs-ID – gemessen wird die Reichweite
// eines selbst gebauten Entwurfs, nicht eine Person. Genau diese Grenze macht
// die Messung ohne Einwilligung tragfähig, deshalb sichert ein Test in
// test/resonanzStore.test.js sie gegen späteres Aufweichen ab.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resonanzDir = path.join(__dirname, "..", "data", "resonanz");

// Ab hier wäre die Datei nur noch Statistik, für die Nachfass-Entscheidung
// zählt ohnehin der letzte Aufruf. Der älteste fällt raus.
export const MAX_AUFRUFE = 50;

// Länger als zehn Minuten sagt nichts mehr aus – wer so lange offen hat, hat
// den Tab liegen lassen.
export const MAX_SEKUNDEN = 600;

// Auf diese Stufe wird gerundet. Die Ungenauigkeit ist Absicht: "eine halbe
// Minute" trägt dieselbe Entscheidung wie "34 Sekunden".
const STUFE_SEKUNDEN = 10;

function datei(slug) {
  return path.join(resonanzDir, `${slug}.json`);
}

function leereResonanz(slug) {
  return { slug, ersterAufruf: null, letzterAufruf: null, aufrufe: [] };
}

/**
 * Ein Slug wird zum Dateinamen – deshalb darf er nichts enthalten, womit man
 * aus dem Verzeichnis herausläuft.
 */
export function pruefeSlug(slug) {
  const sauber = String(slug ?? "").trim();
  if (!sauber) throw new Error("Ohne Entwurfskennung lässt sich nichts festhalten.");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(sauber)) {
    throw new Error(`Unerwartete Entwurfskennung "${sauber}".`);
  }
  return sauber;
}

export function ladeResonanz(slug) {
  const sauber = pruefeSlug(slug);
  try {
    const daten = JSON.parse(readFileSync(datei(sauber), "utf-8"));
    return { ...leereResonanz(sauber), ...daten };
  } catch {
    return leereResonanz(sauber);
  }
}

export function speichereResonanz(slug, daten) {
  const sauber = pruefeSlug(slug);
  mkdirSync(resonanzDir, { recursive: true });
  writeFileSync(datei(sauber), `${JSON.stringify(daten, null, 2)}\n`, "utf-8");
  return daten;
}

function gerundeteSekunden(wert) {
  const zahl = Number(wert);
  if (!Number.isFinite(zahl) || zahl < 0) return 0;
  return Math.min(MAX_SEKUNDEN, Math.round(zahl / STUFE_SEKUNDEN) * STUFE_SEKUNDEN);
}

// Dasselbe Tab meldet sich zweimal: beim Öffnen und beim Weggehen. Damit der
// zweite Ruf den ersten ergänzt statt einen zweiten Besuch vorzutäuschen,
// braucht es eine Zuordnung von Besuchs-ID zum angelegten Eintrag.
//
// Die steht bewusst nur im Arbeitsspeicher, genau wie die Rate-Bremse in
// resonanzServer.js: Die Besuchs-ID ist ein Wiedererkennungsmerkmal und hat
// auf der Platte nichts verloren. Der Preis ist, dass ein Serverneustart
// zwischen beiden Signalen einen Besuch doppelt zählt – bei einer Handvoll
// Aufrufen am Tag ist das der günstigere Tausch.
const besuchsZuordnung = new Map();
const MAX_ZUORDNUNGEN = 500;

function merkeZuordnung(schluessel, zeitpunkt) {
  // Map behält die Einfügereihenfolge, der älteste Schlüssel steht vorn.
  if (besuchsZuordnung.size >= MAX_ZUORDNUNGEN) {
    besuchsZuordnung.delete(besuchsZuordnung.keys().next().value);
  }
  besuchsZuordnung.set(schluessel, zeitpunkt);
}

/**
 * Hält einen Aufruf fest. Die Besuchs-ID dient nur der Zuordnung der beiden
 * Signale desselben Tabs und wird nicht gespeichert.
 */
export function vermerkeAufruf(slug, { besuch, sekunden = 0, reservierungGesehen = false } = {}) {
  const sauber = pruefeSlug(slug);
  const besuchsId = String(besuch ?? "").trim();
  if (!besuchsId) throw new Error("Ohne Besuchskennung lässt sich der Aufruf nicht zuordnen.");

  const daten = ladeResonanz(sauber);
  const jetzt = new Date().toISOString();
  const schluessel = `${sauber}|${besuchsId}`;

  const bekannterZeitpunkt = besuchsZuordnung.get(schluessel);
  const vorhanden = bekannterZeitpunkt
    ? daten.aufrufe.find((a) => a.zeitpunkt === bekannterZeitpunkt)
    : undefined;

  if (vorhanden) {
    vorhanden.sekunden = Math.max(vorhanden.sekunden, gerundeteSekunden(sekunden));
    vorhanden.reservierungGesehen = vorhanden.reservierungGesehen || Boolean(reservierungGesehen);
  } else {
    daten.aufrufe.push({
      zeitpunkt: jetzt,
      sekunden: gerundeteSekunden(sekunden),
      reservierungGesehen: Boolean(reservierungGesehen),
    });
    daten.ersterAufruf = daten.ersterAufruf ?? jetzt;
    merkeZuordnung(schluessel, jetzt);
  }

  daten.letzterAufruf = jetzt;
  if (daten.aufrufe.length > MAX_AUFRUFE) {
    daten.aufrufe = daten.aufrufe.slice(-MAX_AUFRUFE);
  }

  return speichereResonanz(sauber, daten);
}

/**
 * Verdichtet den Stand auf die Felder, die im Dashboard eine Zeile füllen.
 */
export function resonanzUebersicht(slug) {
  const daten = ladeResonanz(slug);
  const aufrufe = daten.aufrufe ?? [];

  return {
    geoeffnet: aufrufe.length > 0,
    anzahl: aufrufe.length,
    letzterAufruf: daten.letzterAufruf,
    maxSekunden: aufrufe.reduce((groesste, a) => Math.max(groesste, a.sekunden ?? 0), 0),
    reservierungGesehen: aufrufe.some((a) => a.reservierungGesehen),
  };
}
