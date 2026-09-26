// Wo die Wirt-App ihre Laufzeitdaten ablegt – und wie sie sicher schreibt.
//
// Standard ist data/ im Repository (wie bisher, lokal und in allen Tests).
// Im Container zeigt GASTRO_DATEN_DIR auf das persistente Volume (z. B.
// /data auf Fly.io). Dann liegen dort ALLE Laufzeitdaten der Wirt-App:
//
//   betrieb/<slug>.json                 Betrieb: Tische, Reservierungen, Bestellungen,
//                                       Statusverläufe, Gastmeldungen/Versandstände,
//                                       Rechtstexte und Zustimmungsnachweise, Bestellkarte,
//                                       Rabattaktionen, Empfehlungen, Telegram-Verknüpfungen
//                                       und Erinnerungszustände, Push-Abos, Einstellungen
//   betrieb/.gast-status-geheimnis      Schlüssel der Status-Links (falls nicht als Secret)
//   betrieb/.telegram-sperren/          Sperre „ein Abruf je Bot-Token“
//   zuverlaessigkeit/<slug>.json        No-Show-Zähler je Telefonnummer
//   wartezeitLernen/<slug>.json         gelernte Wartezeiten
//   seitenaufrufe/<slug>.json           aggregierte Aufrufzahlen (falls Quelle aktiv)
//   sicherung/                          Stand der automatischen Sicherung (nur Metadaten)
//
// Agentur-Daten (Leads, Kundenprojekte, Medien) gehören NICHT in die Wirt-App;
// sie bleiben im Agentur-Dashboard (data/ im Repository bzw. dessen Volume).

import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Wurzel der Laufzeitdaten (GASTRO_DATEN_DIR oder data/ im Repository). */
export const DATEN_DIR = process.env.GASTRO_DATEN_DIR ? path.resolve(process.env.GASTRO_DATEN_DIR) : path.join(REPO_DIR, "data");

/** Die Unterordner, die die Wirt-App beschreibt – auch Grundlage der Sicherung. */
export const WIRT_DATEN = ["betrieb", "zuverlaessigkeit", "wartezeitLernen", "seitenaufrufe"];

export const datenPfad = (...teile) => path.join(DATEN_DIR, ...teile);

/**
 * Schreibt erst eine Nachbardatei (fsync) und benennt sie dann um: Ein
 * Absturz oder eine volle Platte mitten im Schreiben hinterlässt die alte,
 * vollständige Datei statt einer halben. Fehlende Ordner werden angelegt.
 */
export function schreibeAtomar(ziel, inhalt, { modus = 0o600 } = {}) {
  mkdirSync(path.dirname(ziel), { recursive: true, mode: 0o700 });
  const tmp = `${ziel}.${process.pid}-${randomBytes(4).toString("hex")}.tmp`;
  try {
    const fd = openSync(tmp, "w", modus);
    try {
      const bytes = Buffer.isBuffer(inhalt) ? inhalt : Buffer.from(inhalt, "utf-8");
      for (let geschrieben = 0; geschrieben < bytes.length; ) geschrieben += writeSync(fd, bytes, geschrieben);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, ziel);
  } catch (fehler) {
    rmSync(tmp, { force: true });
    throw fehler;
  }
}

/**
 * Liest eine Nebendatei (Zähler, gelernte Werte). Fehlt sie: `leer`. Ist sie
 * beschädigt, wird das laut gemeldet und `leer` geliefert – überschrieben wird
 * sie erst von speichereJson, und dann nie still (siehe dort).
 */
export function ladeJson(datei, leer) {
  let roh;
  try {
    roh = readFileSync(datei, "utf-8");
  } catch (fehler) {
    if (fehler.code === "ENOENT") return leer();
    throw fehler;
  }
  try {
    return JSON.parse(roh);
  } catch {
    console.error(`⛔ ${datei} ist beschädigt – sie wird vor dem nächsten Speichern beiseitegelegt, nicht überschrieben.`);
    return leer();
  }
}

/**
 * Speichert eine Nebendatei atomar. Ist die vorhandene Datei beschädigt, wird
 * sie zuerst als <name>.beschaedigt-<Zeitpunkt> beiseitegelegt – ihr Inhalt
 * bleibt für eine Rettung erhalten.
 */
export function speichereJson(datei, daten) {
  if (existsSync(datei)) {
    try {
      JSON.parse(readFileSync(datei, "utf-8"));
    } catch {
      const beiseite = `${datei}.beschaedigt-${new Date().toISOString().replace(/[:.]/g, "-")}`;
      renameSync(datei, beiseite);
      console.error(`⛔ Beschädigte Datei beiseitegelegt: ${beiseite}`);
    }
  }
  schreibeAtomar(datei, `${JSON.stringify(daten, null, 2)}\n`);
  return daten;
}
