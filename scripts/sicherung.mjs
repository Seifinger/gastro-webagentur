// Sicherung und Wiederherstellungsprobe der Laufzeitdaten (Audit 25.09.2026).
//
//   npm run sicherung -- erstellen [--ziel <ordner>]
//   npm run sicherung -- pruefen <datei.tar.gz>
//
// erstellen  packt alle Laufzeitdaten mit Gast-, Kunden- oder Lead-Bezug in
//            ein Archiv (nur für den Besitzer lesbar, Standardziel
//            data/sicherung/ – gitignoriert). Liest nur, ändert nichts.
// pruefen    entpackt das Archiv in einen Temp-Ordner, prüft jede JSON-Datei
//            und zählt Reservierungen/Bestellungen je Betrieb. Ohne Fehler
//            ist die Sicherung wiederherstellbar. Der Temp-Ordner wird gelöscht.
//
// Das Archiv enthält Gastdaten und das Geheimnis der Status-Links. Eine
// Kopie auf derselben Platte ist keine Sicherung: Archiv verschlüsselt an
// einen zweiten Ort bringen (siehe LAUNCH-CHECKLISTE.md).

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export const SICHERUNGS_PFADE = [
  "data/betrieb",
  "data/kunden",
  "data/zuverlaessigkeit",
  "data/wartezeitLernen",
  "data/lead-edits",
  "data/seitenaufrufe",
  "data/resonanz",
  "data/output",
  "data/kuechen.json",
  "data/stimmungen.json",
  "data/landingpages/entwuerfe.json",
  "public/uploads",
  "v2/medien/eigene.json",
];

export function erstelleSicherung({ wurzel = WURZEL, ziel = path.join(wurzel, "data", "sicherung"), jetzt = new Date() } = {}) {
  const vorhanden = SICHERUNGS_PFADE.filter((p) => existsSync(path.join(wurzel, p)));
  if (vorhanden.length === 0) throw new Error("Keine Laufzeitdaten gefunden – nichts zu sichern.");
  mkdirSync(ziel, { recursive: true, mode: 0o700 });
  const datei = path.join(ziel, `gastro-sicherung-${jetzt.toISOString().replace(/[:.]/g, "-")}.tar.gz`);
  // execFile ohne Shell: Pfade gehen als Argumente, nie als Befehlstext.
  execFileSync("tar", ["-czf", datei, "-C", wurzel, ...vorhanden]);
  chmodSync(datei, 0o600);
  return { datei, pfade: vorhanden, bytes: statSync(datei).size };
}

function alleDateien(ordner) {
  return readdirSync(ordner, { withFileTypes: true }).flatMap((e) => {
    const voll = path.join(ordner, e.name);
    return e.isDirectory() ? alleDateien(voll) : [voll];
  });
}

export function pruefeSicherung(archiv) {
  if (!existsSync(archiv)) throw new Error(`Archiv nicht gefunden: ${archiv}`);
  const temp = mkdtempSync(path.join(tmpdir(), "gastro-wiederherstellung-"));
  try {
    execFileSync("tar", ["-xzf", archiv, "-C", temp]);
    const fehler = [];
    const betriebe = {};
    let jsonDateien = 0;
    for (const datei of alleDateien(temp)) {
      const relativ = path.relative(temp, datei);
      if (!relativ.endsWith(".json")) continue;
      jsonDateien += 1;
      let daten;
      try {
        daten = JSON.parse(readFileSync(datei, "utf-8"));
      } catch {
        fehler.push(`${relativ}: kein gültiges JSON`);
        continue;
      }
      if (relativ.startsWith(`data${path.sep}betrieb${path.sep}`)) {
        betriebe[path.basename(relativ, ".json")] = {
          reservierungen: daten.reservierungen?.length ?? 0,
          bestellungen: daten.bestellungen?.length ?? 0,
          rechtsdokumente: daten.rechtsdokumente?.length ?? 0,
        };
      }
    }
    const geheimnis = existsSync(path.join(temp, "data", "betrieb", ".gast-status-geheimnis"));
    return { ok: fehler.length === 0, fehler, jsonDateien, betriebe, statusLinkGeheimnis: geheimnis };
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [befehl, ...rest] = process.argv.slice(2);
  try {
    if (befehl === "erstellen") {
      const i = rest.indexOf("--ziel");
      const s = erstelleSicherung(i !== -1 && rest[i + 1] ? { ziel: path.resolve(rest[i + 1]) } : {});
      console.log(`✅ Sicherung: ${s.datei} (${Math.round(s.bytes / 1024)} KB)\n   enthält: ${s.pfade.join(", ")}`);
      console.log("   Enthält Gastdaten – verschlüsselt an einen zweiten Ort bringen, dann mit „pruefen“ testen.");
    } else if (befehl === "pruefen" && rest[0]) {
      const p = pruefeSicherung(path.resolve(rest[0]));
      for (const [slug, z] of Object.entries(p.betriebe)) console.log(`   ${slug}: ${z.reservierungen} Reservierungen, ${z.bestellungen} Bestellungen, ${z.rechtsdokumente} Rechtsdokumente`);
      console.log(`   ${p.jsonDateien} JSON-Dateien geprüft, Status-Link-Geheimnis ${p.statusLinkGeheimnis ? "enthalten" : "NICHT enthalten"}.`);
      if (!p.ok) {
        for (const f of p.fehler) console.log(`   ⛔ ${f}`);
        process.exitCode = 1;
      } else console.log("✅ Wiederherstellungsprobe bestanden.");
    } else {
      console.log("Aufruf: npm run sicherung -- erstellen [--ziel <ordner>] | pruefen <datei.tar.gz>");
      process.exitCode = 1;
    }
  } catch (fehler) {
    console.log(`⛔ ${fehler.message}`);
    process.exitCode = 1;
  }
}
