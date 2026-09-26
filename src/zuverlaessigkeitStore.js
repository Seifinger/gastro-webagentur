import path from "node:path";
import { datenPfad, ladeJson, speichereJson } from "./datenPfad.js";

// Zählt bestätigte No-Shows je Telefonnummer und Betrieb (nicht nach Name –
// Namen sind leicht anders geschrieben, eine Telefonnummer bleibt gleich).
// Nur eine Warnung fürs Dashboard, keine automatische Blockade: die
// Entscheidung bleibt beim Wirt.

const zuverlaessigkeitDir = datenPfad("zuverlaessigkeit");

const NEUNZIG_TAGE_MS = 90 * 24 * 60 * 60 * 1000;

function datei(slug) {
  return path.join(zuverlaessigkeitDir, `${slug}.json`);
}

function ladeStand(slug) {
  return ladeJson(datei(slug), () => ({}));
}

function speichereStand(slug, stand) {
  return speichereJson(datei(slug), stand);
}

/** Nur Ziffern und ein führendes "+" – "0170 123 45" und "+49170 12345" bleiben vergleichbar. */
export function normalisiereTelefon(telefon) {
  return String(telefon ?? "").replace(/[^\d+]/g, "");
}

export function vermerkeNoShow(slug, telefon, jetzt = new Date()) {
  const nummer = normalisiereTelefon(telefon);
  if (!nummer) return [];

  const stand = ladeStand(slug);
  stand[nummer] = [...(stand[nummer] ?? []), jetzt.toISOString()];
  speichereStand(slug, stand);
  return stand[nummer];
}

/** Bestätigte No-Shows der letzten 90 Tage für eine Nummer. */
export function noShowAnzahl(slug, telefon, jetzt = new Date()) {
  const nummer = normalisiereTelefon(telefon);
  if (!nummer) return 0;

  const eintraege = ladeStand(slug)[nummer] ?? [];
  return eintraege.filter((iso) => jetzt.getTime() - new Date(iso).getTime() <= NEUNZIG_TAGE_MS).length;
}

export function warnhinweisNoetig(slug, telefon, schwelle, jetzt = new Date()) {
  return noShowAnzahl(slug, telefon, jetzt) >= schwelle;
}
