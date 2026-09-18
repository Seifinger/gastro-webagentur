import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { istStimmungsId } from "./stimmungen.js";

// Welche der drei Stimmungen einer Küche ein Lokal bekommt, entscheidet sonst
// der Seed. Im Dashboard lässt sie sich von Hand setzen – vor dem Verschicken
// weiß man oft besser als jeder Hash, ob ein Haus traditionell, abendlich oder
// hell wirkt. Aufbau wie cuisineOverrides.js, inklusive Schlüssel: die placeId
// gibt es auch für Leads, zu denen noch kein Entwurf gebaut wurde.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wahlPath = path.join(__dirname, "..", "data", "stimmungen.json");

export function ladeStimmungsWahl() {
  try {
    const roh = JSON.parse(readFileSync(wahlPath, "utf-8"));
    // Der Eintrag hält die Küche fest, zu der die Stimmung gehört: Wird die
    // Küche eines Leads später umgestellt, passt die alte Stimmung nicht mehr
    // und muss verfallen, statt die Seite in eine fremde Welt zu kippen.
    return Object.fromEntries(
      Object.entries(roh).filter(
        ([placeId, eintrag]) =>
          placeId && eintrag?.kueche && istStimmungsId(eintrag.kueche, eintrag.stimmung),
      ),
    );
  } catch {
    return {};
  }
}

export function speichereStimmung(placeId, kueche, stimmung) {
  if (!placeId) throw new Error("placeId fehlt");

  const wahl = ladeStimmungsWahl();

  // Leerer Wert bedeutet: zurück zur automatischen Auswahl über den Seed.
  if (!stimmung) delete wahl[placeId];
  else if (istStimmungsId(kueche, stimmung)) wahl[placeId] = { kueche, stimmung };
  else throw new Error(`"${stimmung}" ist keine Stimmung der Küche "${kueche}"`);

  mkdirSync(path.dirname(wahlPath), { recursive: true });
  writeFileSync(wahlPath, `${JSON.stringify(wahl, null, 2)}\n`, "utf-8");
  return wahl;
}

/**
 * Gewählte Stimmung eines Leads, sofern sie noch zu seiner Küche passt.
 * Ohne Treffer undefined – dann entscheidet der Seed.
 */
export function stimmungFuerLead(lead, kueche, wahl = ladeStimmungsWahl()) {
  const eintrag = wahl[lead?.placeId];
  return eintrag && eintrag.kueche === kueche ? eintrag.stimmung : undefined;
}
