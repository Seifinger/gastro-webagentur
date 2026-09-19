import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Zählt bestätigte No-Shows je Telefonnummer und Betrieb (nicht nach Name –
// Namen sind leicht anders geschrieben, eine Telefonnummer bleibt gleich).
// Nur eine Warnung fürs Dashboard, keine automatische Blockade: die
// Entscheidung bleibt beim Wirt.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const zuverlaessigkeitDir = path.join(__dirname, "..", "data", "zuverlaessigkeit");

const NEUNZIG_TAGE_MS = 90 * 24 * 60 * 60 * 1000;

function datei(slug) {
  return path.join(zuverlaessigkeitDir, `${slug}.json`);
}

function ladeStand(slug) {
  try {
    return JSON.parse(readFileSync(datei(slug), "utf-8"));
  } catch {
    return {};
  }
}

function speichereStand(slug, stand) {
  mkdirSync(zuverlaessigkeitDir, { recursive: true });
  writeFileSync(datei(slug), `${JSON.stringify(stand, null, 2)}\n`, "utf-8");
  return stand;
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
