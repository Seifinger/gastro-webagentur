// Externe, verschlüsselte Sicherung der Wirt-App (src/sicherungExtern.js).
//
//   node scripts/wirtSicherung.mjs erstellen            jetzt sichern (sonst täglich automatisch)
//   node scripts/wirtSicherung.mjs liste                Sicherungen am Ziel
//   node scripts/wirtSicherung.mjs probe [--name …]     Wiederherstellungsprobe in einen Temp-Ordner,
//                                                       Vergleich mit den Live-Daten, danach gelöscht
//   node scripts/wirtSicherung.mjs wiederherstellen --ziel <leerer Ordner> [--name …]
//   node scripts/wirtSicherung.mjs vorbereiten [--name …]
//                                                       Austausch der Live-Daten beim nächsten Neustart
//
// Liest BACKUP_ZIEL, BACKUP_SCHLUESSEL (+ BACKUP_S3_* bei s3) und GASTRO_DATEN_DIR
// aus der Umgebung. Gibt nie Schlüssel oder Zugangsdaten aus.

import { rmSync } from "node:fs";
import { DATEN_DIR } from "../src/datenPfad.js";
import { erstelleExterneSicherung, stelleWiederHer, vorbereiteWiederherstellung, zielAusUmgebung, zaehleBetriebe, probeOrdner } from "../src/sicherungExtern.js";

const [befehl, ...rest] = process.argv.slice(2);
const wert = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? undefined : rest[i + 1];
};

try {
  if (befehl === "erstellen") {
    const r = await erstelleExterneSicherung();
    console.log(`✅ Sicherung ${r.name} (${Math.round(r.bytes / 1024)} KB, ${r.dateien} Dateien) → ${r.ziel}`);
    for (const [b, z] of Object.entries(r.betriebe)) console.log(`   ${b}: ${z.reservierungen} Reservierungen, ${z.bestellungen} Bestellungen, ${z.rabattaktionen} Rabattaktionen`);
    if (r.entfernt.length) console.log(`   aufgeräumt: ${r.entfernt.length} ältere Sicherung(en)`);
  } else if (befehl === "liste") {
    const ziel = zielAusUmgebung();
    if (!ziel) throw new Error("BACKUP_ZIEL ist nicht gesetzt.");
    for (const o of (await ziel.liste()).sort((a, b) => b.name.localeCompare(a.name))) console.log(`${o.name}  ${Math.round(o.bytes / 1024)} KB`);
  } else if (befehl === "probe") {
    const ordner = probeOrdner();
    try {
      const r = await stelleWiederHer({ name: wert("name") ?? null, zielDir: ordner });
      const live = zaehleBetriebe(DATEN_DIR);
      console.log(`✅ Wiederherstellungsprobe: ${r.name} entschlüsselt, ${r.manifest.dateien.length} Dateien mit Prüfsumme bestätigt.`);
      for (const [b, z] of Object.entries(r.zaehlung)) {
        const l = live[b];
        console.log(`   ${b}: gesichert ${z.reservierungen} Res./${z.bestellungen} Best./${z.rabattaktionen} Rabatte · live ${l ? `${l.reservierungen}/${l.bestellungen}/${l.rabattaktionen}` : "–"}`);
      }
    } finally {
      rmSync(ordner, { recursive: true, force: true });
    }
  } else if (befehl === "wiederherstellen" && wert("ziel")) {
    const r = await stelleWiederHer({ name: wert("name") ?? null, zielDir: wert("ziel") });
    console.log(`✅ ${r.name} → ${wert("ziel")} (${r.manifest.dateien.length} Dateien geprüft)`);
  } else if (befehl === "vorbereiten") {
    const r = await vorbereiteWiederherstellung({ name: wert("name") ?? null });
    console.log(`✅ ${r.name} geprüft bereitgelegt. Beim nächsten Neustart der Wirt-App werden die Live-Daten ersetzt (die bisherigen bleiben daneben erhalten).`);
  } else {
    console.log("Aufruf: erstellen | liste | probe [--name …] | wiederherstellen --ziel <ordner> [--name …] | vorbereiten [--name …]");
    process.exitCode = 1;
  }
} catch (fehler) {
  console.error(`⛔ ${fehler.message}`);
  process.exitCode = 1;
}
