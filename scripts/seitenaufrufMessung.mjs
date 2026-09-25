// Schaltet die aggregierte Zählung von Seitenaufrufen für einen Betrieb ein
// oder aus (src/seitenaufrufe.js). Nur einschalten, wenn der Host der
// Kundenseite zaehleAbruf() bei jeder Anfrage tatsächlich aufruft – sonst
// zeigt das Dashboard eine falsche 0. Vorher: Datenschutzerklärung
// ergänzen, Host/AVV klären (docs-intern/STATISTIK-UND-RECHTSTEXTE.md).
//
//   node scripts/seitenaufrufMessung.mjs --betrieb <slug> --quelle host-aggregat
//   node scripts/seitenaufrufMessung.mjs --betrieb <slug> --quelle keine

import { setzeSeitenaufrufMessung, betriebExistiert } from "../src/betriebStore.js";

const wert = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? "" : String(process.argv[i + 1] ?? "");
};
const slug = wert("--betrieb");
const quelle = wert("--quelle");
if (!slug || !quelle) {
  console.log("Aufruf: node scripts/seitenaufrufMessung.mjs --betrieb <slug> --quelle host-aggregat|keine");
  process.exit(1);
}
if (!betriebExistiert(slug)) {
  console.log(`Betrieb "${slug}" gibt es nicht.`);
  process.exit(1);
}
const ergebnis = setzeSeitenaufrufMessung(slug, quelle);
console.log(ergebnis ? `Zählung aktiv seit ${ergebnis.aktivSeit} (Quelle ${ergebnis.quelle}).` : "Zählung aus – das Dashboard zeigt „noch nicht messbar“.");
