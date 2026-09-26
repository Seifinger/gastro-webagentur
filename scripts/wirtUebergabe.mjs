// Übergabe-Paket aus dem Agentur-Dashboard in die Wirt-App übernehmen –
// direkt auf dem Host (Alternative zu POST /intern/uebergabe).
//
//   node scripts/wirtUebergabe.mjs <wirt-uebergabe.json>
//
// Nutzt BETRIEB und GASTRO_DATEN_DIR wie die laufende Wirt-App.

import { readFileSync } from "node:fs";

const datei = process.argv[2];
const slug = process.env.BETRIEB;
try {
  if (!datei || !slug) throw new Error("Aufruf: BETRIEB=<kürzel> node scripts/wirtUebergabe.mjs <wirt-uebergabe.json>");
  const { uebernimmUebergabe } = await import("../src/wirtUebergabe.js");
  const r = uebernimmUebergabe(slug, JSON.parse(readFileSync(datei, "utf-8")));
  console.log(`✅ Übernommen für ${r.betrieb}: ${r.gerichte} bestellbare Positionen aus ${r.kunde} (Prüfsumme ${r.pruefsumme.slice(0, 12)}…)`);
} catch (fehler) {
  console.error(`⛔ ${fehler.message}`);
  process.exitCode = 1;
}
