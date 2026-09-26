// Sperrdateien für den Telegram-Dienst: nie zwei Abrufe (getUpdates) für
// denselben Bot-Token und nie zwei Planer für denselben Betrieb – auch nicht
// über Prozessgrenzen hinweg (z. B. `npm run v2:wirt -- --telegram` und
// `npm run v2:telegram` gleichzeitig).
//
// Eine Sperre ist eine Datei mit der PID des Besitzers. Gehört sie einem
// Prozess, der nicht mehr läuft, wird sie übernommen. Der Token selbst steht
// nie im Dateinamen, nur ein Kurz-Hash.

import { openSync, writeSync, closeSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { BETRIEB_DIR } from "./wirtAdapter.js";

export const SPERR_DIR = path.join(BETRIEB_DIR, ".telegram-sperren");

const imProzess = new Map();

function lebt(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (fehler) {
    return fehler.code === "EPERM";
  }
}

export function tokenKennung(token) {
  return createHash("sha256").update(String(token)).digest("hex").slice(0, 16);
}

/**
 * Versucht eine Sperre zu setzen.
 * @returns {{ ok: true, freigeben: () => void } | { ok: false, grund: string }}
 */
export function sichereSperre(name, dir = SPERR_DIR) {
  const datei = path.join(dir, `${name}.lock`);
  if (imProzess.has(datei)) return { ok: false, grund: "läuft bereits in diesem Prozess" };
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  for (let versuch = 0; versuch < 2; versuch += 1) {
    try {
      const fd = openSync(datei, "wx", 0o600);
      try {
        writeSync(fd, JSON.stringify({ pid: process.pid, seit: new Date().toISOString() }));
      } finally {
        closeSync(fd);
      }
      const freigeben = () => {
        if (!imProzess.has(datei)) return;
        imProzess.delete(datei);
        rmSync(datei, { force: true });
      };
      imProzess.set(datei, freigeben);
      aufSignaleAchten();
      return { ok: true, freigeben };
    } catch (fehler) {
      if (fehler.code !== "EEXIST") throw fehler;
      let inhalt = null;
      try {
        inhalt = JSON.parse(readFileSync(datei, "utf-8"));
      } catch {
        inhalt = null;
      }
      if (inhalt?.pid && inhalt.pid !== process.pid && lebt(inhalt.pid)) return { ok: false, grund: `läuft bereits in Prozess ${inhalt.pid}` };
      // Verwaist (Prozess beendet oder Datei unlesbar): übernehmen.
      rmSync(datei, { force: true });
    }
  }
  return { ok: false, grund: "Sperre konnte nicht gesetzt werden" };
}

/** Beim Beenden alle eigenen Sperren entfernen. */
function alleFreigeben() {
  for (const freigeben of [...imProzess.values()]) freigeben();
}
process.on("exit", alleFreigeben);

// Strg+C bzw. Stopp durch den Host: Ohne eigenen Handler endet Node, ohne
// „exit“ auszulösen, und die Sperre bliebe liegen. Nur solange dieser
// Prozess eine Sperre hält – sonst bleibt das Verhalten unverändert.
let signaleAktiv = false;
function beiSignal(signal) {
  alleFreigeben();
  process.exit(signal === "SIGINT" ? 130 : 143);
}
/**
 * Der Prozess beendet sich selbst geordnet (scripts/wirtStart.mjs: erst
 * Server schließen, dann Sperren freigeben). Dann keine eigenen Handler,
 * die sofort process.exit() aufrufen würden.
 */
export function signaleSelbstBehandeln() {
  signaleAktiv = true;
}

export function aufSignaleAchten() {
  if (signaleAktiv) return;
  signaleAktiv = true;
  process.once("SIGINT", beiSignal);
  process.once("SIGTERM", beiSignal);
}
