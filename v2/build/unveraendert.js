// Unveränderungs-Prüfung für den Gestaltungs-Umbau (v2/GESTALTUNGS-UMBAU-PLAN.md, AP0).
//
// Der neue "Ausdruck" ist opt-in: Jede Seite, die keinen Ausdruck anfordert,
// muss Byte für Byte so gebaut werden wie vorher. Dazu hält
// test/fixtures/v2-unveraendert.json einen SHA-256 je Seite fest – für alle
// 36 Test-Leads (je Küche × Stimmung) und die 11 Beispielseiten, jeweils ohne
// und mit Betriebsserver (apiUrl).
//
// Eine gewollte Änderung an allen Seiten (z. B. AP1) wird bewusst mit
//   npm run v2:snapshot
// neu festgehalten – nie stillschweigend.

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { baueSite } from "./siteBuilder.js";
import { testLeads } from "./testLeads.js";
import { DEMO_LEADS } from "../../src/demoLeads.js";

export const SNAPSHOT_PFAD = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "test", "fixtures", "v2-unveraendert.json");

const API = "http://localhost:3200";

function hash(html) {
  return createHash("sha256").update(html).digest("hex");
}

/** Alle Seiten, die der Snapshot abdeckt, als [schluessel, baueSite-Parameter]. */
export function snapshotFaelle() {
  const faelle = [];
  for (const lead of testLeads()) {
    const basis = { lead, kueche: lead.kueche, stimmung: lead.stimmung };
    faelle.push([`test:${lead.kueche}--${lead.stimmung}`, { ...basis, optionen: { fiktiv: true, fontCss: "" } }]);
    faelle.push([`test:${lead.kueche}--${lead.stimmung}:api`, { ...basis, optionen: { fiktiv: true, fontCss: "", apiUrl: API } }]);
  }
  for (const lead of DEMO_LEADS) {
    const basis = { lead, kueche: lead.kueche };
    faelle.push([`beispiel-${lead.kueche}`, { ...basis, optionen: { fiktiv: true, veroeffentlicht: true, fontCss: "" } }]);
    faelle.push([`beispiel-${lead.kueche}:api`, { ...basis, optionen: { fiktiv: true, veroeffentlicht: true, fontCss: "", apiUrl: API } }]);
  }
  return faelle;
}

export function snapshotHashes() {
  return Object.fromEntries(snapshotFaelle().map(([schluessel, p]) => [schluessel, hash(baueSite(p).html)]));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const hashes = snapshotHashes();
  writeFileSync(SNAPSHOT_PFAD, `${JSON.stringify(hashes, null, 2)}\n`);
  console.log(`${Object.keys(hashes).length} Seiten festgehalten → ${path.relative(process.cwd(), SNAPSHOT_PFAD)}`);
}
