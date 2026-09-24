import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gesamtPlaetze, freiePlaetze, verfuegbareAbholzeiten } from "./betriebStore.js";

// Lernt je Betrieb, wie viel länger eine Abholung im Schnitt wirklich dauert
// als versprochen – aufgeschlüsselt nach Wochentag, Zeitfenster und
// Auslastung. Eigene Datei je Betrieb, getrennt von betriebStore.js: dort
// bleiben nur die Rohdaten (Bestellungen, Tische), hier die daraus gelernten
// Werte. Default aus (siehe wartezeitLernenAktiv in betriebStore.js) – ohne
// Aktivierung verhält sich alles exakt wie zuvor.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lernDir = path.join(__dirname, "..", "data", "wartezeitLernen");

export const MINDEST_BEOBACHTUNGEN = 5;
export const MAX_GLEITENDER_DURCHSCHNITT = 20;
export const AUSLASTUNGSSTUFEN = ["niedrig", "mittel", "hoch"];

function datei(slug) {
  return path.join(lernDir, `${slug}.json`);
}

export function ladeLernTabelle(slug) {
  try {
    return JSON.parse(readFileSync(datei(slug), "utf-8"));
  } catch {
    return {};
  }
}

export function speichereLernTabelle(slug, tabelle) {
  mkdirSync(lernDir, { recursive: true });
  writeFileSync(datei(slug), `${JSON.stringify(tabelle, null, 2)}\n`, "utf-8");
  return tabelle;
}

function aendere(slug, fn) {
  const tabelle = ladeLernTabelle(slug);
  const ergebnis = fn(tabelle);
  speichereLernTabelle(slug, tabelle);
  return ergebnis;
}

/**
 * Wie ausgelastet das Haus zu einem Zeitpunkt ist – aus derselben
 * 120-Minuten-Kapazitätsprüfung, die schon die Tischreservierungen nutzen
 * (freiePlaetze/BELEGDAUER_MINUTEN in betriebStore.js). Ohne Tischplan gilt
 * "niedrig", nicht "hoch": eine leere Platzzahl ist keine Vollauslastung.
 */
export function auslastungsStufe(betrieb, datum, uhrzeit) {
  const gesamt = gesamtPlaetze(betrieb);
  if (gesamt === 0) return "niedrig";

  const frei = freiePlaetze(betrieb, datum, uhrzeit);
  const belegtAnteil = Math.max(0, Math.min(1, (gesamt - frei) / gesamt));

  if (belegtAnteil > 0.8) return "hoch";
  if (belegtAnteil >= 0.5) return "mittel";
  return "niedrig";
}

/** 2-Stunden-Zeitfenster, 0-11 (0 = 00:00-01:59, 11 = 22:00-23:59). */
export function zeitfenster(uhrzeit) {
  const [stunde] = String(uhrzeit ?? "").split(":").map(Number);
  if (!Number.isFinite(stunde)) return 0;
  return Math.min(11, Math.max(0, Math.floor(stunde / 2)));
}

/** 0 (Sonntag) bis 6 (Samstag), wie Date.prototype.getDay(). */
export function wochentag(datum) {
  const tag = new Date(`${datum}T00:00:00`).getDay();
  return Number.isNaN(tag) ? 0 : tag;
}

function schluessel(wochentagWert, fenster, stufe) {
  return `${wochentagWert}|${fenster}|${stufe}`;
}

function leererEintrag() {
  return { zuschlagMinuten: 0, beobachtungen: 0 };
}

export function eintragFuer(tabelle, wochentagWert, fenster, stufe) {
  return tabelle[schluessel(wochentagWert, fenster, stufe)] ?? leererEintrag();
}

/**
 * Aktualisiert die passende Tabellenzeile per gleitendem Durchschnitt.
 * differenzMinuten: tatsächliche Fertigstellung minus versprochene Abholzeit
 * (positiv = es hat länger gedauert). Die Gewichtung ist bei 20 gedeckelt,
 * damit ein einzelner Ausreißer nach vielen Beobachtungen nicht mehr alles
 * verzerren kann, das System sich aber trotzdem weiter anpasst.
 */
export function lerneAusBeobachtung(slug, { datum, uhrzeit, auslastung, differenzMinuten }) {
  return aendere(slug, (tabelle) => {
    const key = schluessel(wochentag(datum), zeitfenster(uhrzeit), auslastung);
    const bisher = tabelle[key] ?? leererEintrag();
    const neueAnzahl = bisher.beobachtungen + 1;
    const gewicht = Math.min(neueAnzahl, MAX_GLEITENDER_DURCHSCHNITT);
    const neuerWert = bisher.zuschlagMinuten + (differenzMinuten - bisher.zuschlagMinuten) / gewicht;

    tabelle[key] = { zuschlagMinuten: neuerWert, beobachtungen: neueAnzahl };
    return tabelle[key];
  });
}

/**
 * Verarbeitet eine tatsächlich abgeholte Bestellung zu einer Beobachtung.
 * Ohne bestätigte (oder wenigstens gewünschte) Abholzeit oder ohne
 * Eingangsdatum lässt sich nichts lernen – dann passiert nichts.
 */
export function beobachteAbholung(slug, betrieb, bestellung, tatsaechlichFertigUm = new Date()) {
  const zeit = bestellung.bestaetigteAbholzeit || bestellung.abholzeit;
  const datum = String(bestellung.eingegangen ?? "").slice(0, 10);
  if (!zeit || !datum) return null;

  const versprochen = new Date(`${datum}T${zeit}:00`);
  if (Number.isNaN(versprochen.getTime())) return null;

  const differenzMinuten = Math.round((tatsaechlichFertigUm.getTime() - versprochen.getTime()) / 60000);
  const auslastung = auslastungsStufe(betrieb, datum, zeit);

  return lerneAusBeobachtung(slug, { datum, uhrzeit: zeit, auslastung, differenzMinuten });
}

/**
 * Gelernter Zuschlag für eine Kombination – erst ab MINDEST_BEOBACHTUNGEN
 * Beobachtungen, sonst 0 (kein Einfluss). Ein einzelner Fehlwert am Anfang
 * soll die Schätzung nicht verzerren.
 */
export function gelernterZuschlag(tabelle, wochentagWert, fenster, stufe) {
  const eintrag = eintragFuer(tabelle, wochentagWert, fenster, stufe);
  return eintrag.beobachtungen >= MINDEST_BEOBACHTUNGEN ? eintrag.zuschlagMinuten : 0;
}

/**
 * Wie verfuegbareAbholzeiten() in betriebStore.js, nur mit dem gelernten
 * Zuschlag zusätzlich zur Basis-Zubereitungszeit (ABHOL_VORLAUF_MINUTEN) und
 * der manuellen Zusatz-Wartezeit (zusaetzlicheWartezeitMinuten) – letztere
 * bleibt dabei unverändert additiv, nie überschrieben.
 *
 * Ist das Lernsystem für den Betrieb ausgeschaltet, ruft diese Funktion nur
 * verfuegbareAbholzeiten() unverändert auf (Regressionsverhalten).
 */
export function verfuegbareAbholzeitenMitLernen(slug, betrieb, jetzt = new Date()) {
  if (!betrieb.wartezeitLernenAktiv) return verfuegbareAbholzeiten(betrieb, jetzt);

  const datum = jetzt.toISOString().slice(0, 10);
  const uhrzeit = `${String(jetzt.getHours()).padStart(2, "0")}:${String(jetzt.getMinutes()).padStart(2, "0")}`;
  const stufe = auslastungsStufe(betrieb, datum, uhrzeit);
  const tabelle = ladeLernTabelle(slug);
  const zuschlag = Math.max(
    0,
    Math.round(gelernterZuschlag(tabelle, wochentag(datum), zeitfenster(uhrzeit), stufe)),
  );

  // verfuegbareAbholzeiten() rechnet Grundvorlauf und manuelle
  // Zusatz-Wartezeit bereits ein – der gelernte Zuschlag kommt additiv
  // obendrauf. So bleibt die Basislogik einmalig an einer Stelle (abholzeiten.js).
  return verfuegbareAbholzeiten(betrieb, jetzt, { extraMinuten: zuschlag });
}

/**
 * Alle Zeilen mit mindestens einer Beobachtung, für die read-only-Übersicht
 * im Wirt-Dashboard – leere Zellen (216 Kombinationen wären meist leer)
 * würden dort nur unnötig Platz wegnehmen.
 */
export function lernUebersicht(slug) {
  const tabelle = ladeLernTabelle(slug);
  return Object.entries(tabelle)
    .map(([key, eintrag]) => {
      const [wochentagWert, fenster, auslastung] = key.split("|");
      return {
        wochentag: Number(wochentagWert),
        fenster: Number(fenster),
        auslastung,
        zuschlagMinuten: Math.round(eintrag.zuschlagMinuten),
        beobachtungen: eintrag.beobachtungen,
        gelernt: eintrag.beobachtungen >= MINDEST_BEOBACHTUNGEN,
      };
    })
    .sort((a, b) => a.wochentag - b.wochentag || a.fenster - b.fenster || a.auslastung.localeCompare(b.auslastung));
}
