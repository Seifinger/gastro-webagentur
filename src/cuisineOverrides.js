import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MENUS, detectCuisine } from "./menuCatalog.js";

// Die Namenserkennung liegt bei Lokalen ohne Stichwort im Namen daneben
// ("Klabwong" ist thailändisch, nicht bayerisch). Im Dashboard lässt sich die
// Küche deshalb von Hand setzen; diese Zuordnung hat immer Vorrang.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const overridesPath = path.join(__dirname, "..", "data", "kuechen.json");

export const KUECHEN = Object.keys(MENUS);

export function istKueche(wert) {
  return KUECHEN.includes(wert);
}

export function ladeZuordnungen() {
  try {
    const roh = JSON.parse(readFileSync(overridesPath, "utf-8"));
    // Nur bekannte Küchen durchlassen – eine von Hand verfremdete Datei soll
    // den Generator nicht auf eine nicht existierende Karte schicken.
    return Object.fromEntries(
      Object.entries(roh).filter(([placeId, kueche]) => placeId && istKueche(kueche)),
    );
  } catch {
    return {};
  }
}

export function speichereZuordnung(placeId, kueche) {
  if (!placeId) throw new Error("placeId fehlt");

  const zuordnungen = ladeZuordnungen();

  // Leerer Wert bedeutet: zurück zur automatischen Erkennung.
  if (!kueche) delete zuordnungen[placeId];
  else if (istKueche(kueche)) zuordnungen[placeId] = kueche;
  else throw new Error(`Unbekannte Küche "${kueche}"`);

  mkdirSync(path.dirname(overridesPath), { recursive: true });
  writeFileSync(overridesPath, `${JSON.stringify(zuordnungen, null, 2)}\n`, "utf-8");
  return zuordnungen;
}

/**
 * Küche eines Leads: von Hand gesetzte Zuordnung vor Namenserkennung.
 */
export function kuecheFuerLead(lead, zuordnungen = ladeZuordnungen()) {
  return zuordnungen[lead?.placeId] ?? detectCuisine(lead?.name);
}
