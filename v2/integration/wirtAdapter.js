// Adapter zwischen v2 und dem Wirt-Backend aus v1 (src/wirtServer.js,
// src/betriebStore.js).
//
// Grundsatz: v2-Seiten sprechen exakt dieselben Endpunkte an wie v1-Seiten
// (dasselbe Skript, siehe build/v1Funktionen.js). Reservierung, Bestellung,
// Tischverwaltung und No-Show-Schutz brauchen deshalb keine Übersetzung –
// dieser Adapter ergänzt nur, was v2 zusätzlich kann, und zwar ausschließlich
// über die exportierten Funktionen des Stores und über optionale Felder:
//
//   v2Design      { kueche, stimmung }        – welches Designsystem der Betrieb trägt
//   telegramV2    { code, codeAblauf, verknuepftAm, tagesuebersicht, uhrzeit, letzteUebersicht }
//   kuechenStatus je Bestellung: "in-zubereitung" | "bereit" | "abgeholt"
//
// Fehlen diese Felder (jeder Betrieb, der vor v2 angelegt wurde), gelten die
// Standardwerte aus mitV2Standards(). Es gibt keine schreibende Migration:
// Bestehende Dateien werden erst angefasst, wenn der Wirt eine v2-Funktion
// wirklich benutzt.

import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomInt } from "node:crypto";
import {
  ladeBetrieb,
  speichereBetrieb,
  setzeReservierungStatus,
  bestaetigeBestellung,
  setzeBestellungStatus,
  setzeTelegramChatId,
} from "../../src/betriebStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BETRIEB_DIR = path.join(__dirname, "..", "..", "data", "betrieb");

export const KUECHEN_STATUS = ["neu", "in-zubereitung", "bereit", "abgeholt", "abgelehnt", "storniert"];
export const KUECHEN_STATUS_LABEL = {
  neu: "Neu",
  "in-zubereitung": "In Zubereitung",
  bereit: "Bereit zur Abholung",
  abgeholt: "Abgeholt",
  abgelehnt: "Abgelehnt",
  storniert: "Storniert",
};

const TELEGRAM_STANDARD = { code: "", codeAblauf: "", verknuepftAm: "", tagesuebersicht: true, uhrzeit: "09:00", letzteUebersicht: "" };

/** Liest einen Betrieb mit v2-Standardwerten – ohne zu schreiben. */
export function mitV2Standards(daten) {
  return {
    ...daten,
    v2Design: daten.v2Design ?? null,
    telegramV2: { ...TELEGRAM_STANDARD, ...(daten.telegramV2 ?? {}) },
  };
}

export function ladeBetriebV2(slug) {
  return mitV2Standards(ladeBetrieb(slug));
}

function aendereV2(slug, fn) {
  const daten = ladeBetrieb(slug);
  const ergebnis = fn(daten);
  speichereBetrieb(slug, daten);
  return ergebnis;
}

/** Alle Betriebe auf der Platte (für den Telegram-Dienst). */
export function alleBetriebe(dir = BETRIEB_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((d) => d.endsWith(".json"))
    .map((d) => d.replace(/\.json$/, ""));
}

/* ---------- Design des Betriebs ---------- */

export function setzeBetriebsDesign(slug, { kueche, stimmung }) {
  if (!kueche || !stimmung) throw new Error("Küche und Stimmung angeben.");
  return aendereV2(slug, (d) => {
    d.v2Design = { kueche, stimmung };
    return d.v2Design;
  });
}

/* ---------- Küchenstatus (Telegram: Neu → In Zubereitung → Bereit) ---------- */

/**
 * Ordnet den Küchenstatus einer Bestellung zu. Die v1-Status bleiben die
 * Wahrheit für alles, was v1 auswertet (Kapazität, Lernen der Wartezeit,
 * No-Show): "in-zubereitung" bestätigt die Bestellung mit der gewünschten
 * Abholzeit (v1 „bestaetigt“), "abgeholt" setzt v1 „abgeholt“ (mit
 * tatsaechlichFertigUm fürs Wartezeit-Lernen). "bereit" existiert in v1
 * nicht und wird nur als Zusatzfeld geführt.
 */
export function setzeKuechenStatus(slug, id, status) {
  if (!KUECHEN_STATUS.includes(status)) throw new Error(`Unbekannter Küchenstatus "${status}".`);
  const vorher = ladeBetrieb(slug).bestellungen.find((b) => b.id === id);
  if (!vorher) throw new Error("Bestellung nicht gefunden.");
  if (vorher.status === "storniert") throw new Error("Diese Bestellung wurde vom Gast storniert.");

  if (status === "in-zubereitung" && vorher.status === "neu") {
    bestaetigeBestellung(slug, id, vorher.bestaetigteAbholzeit || vorher.abholzeit);
  }
  if (status === "bereit" && vorher.status === "neu") {
    bestaetigeBestellung(slug, id, vorher.abholzeit);
  }
  if (status === "abgeholt") setzeBestellungStatus(slug, id, "abgeholt");
  if (status === "abgelehnt") setzeBestellungStatus(slug, id, "abgelehnt");

  return aendereV2(slug, (d) => {
    const b = d.bestellungen.find((x) => x.id === id);
    b.kuechenStatus = status;
    b.kuechenStatusSeit = new Date().toISOString();
    return b;
  });
}

export function kuechenStatusVon(bestellung) {
  if (bestellung.status === "storniert") return "storniert";
  if (bestellung.status === "abgelehnt") return "abgelehnt";
  if (bestellung.status === "abgeholt") return "abgeholt";
  return bestellung.kuechenStatus ?? (bestellung.status === "bestaetigt" ? "in-zubereitung" : "neu");
}

export function bestaetigeReservierung(slug, id) {
  return setzeReservierungStatus(slug, id, "bestaetigt");
}

export function sageReservierungAb(slug, id) {
  return setzeReservierungStatus(slug, id, "abgesagt");
}

/* ---------- Telegram-Verknüpfung ---------- */

const CODE_GUELTIG_MINUTEN = 30;
const CODE_ZEICHEN = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Einmal-Code, den der Wirt im Bot eingibt (/start CODE). 30 Minuten gültig. */
export function erzeugeVerknuepfungscode(slug, jetzt = new Date()) {
  const code = Array.from({ length: 6 }, () => CODE_ZEICHEN[randomInt(CODE_ZEICHEN.length)]).join("");
  return aendereV2(slug, (d) => {
    d.telegramV2 = { ...TELEGRAM_STANDARD, ...(d.telegramV2 ?? {}), code, codeAblauf: new Date(jetzt.getTime() + CODE_GUELTIG_MINUTEN * 60_000).toISOString() };
    return { code, gueltigBis: d.telegramV2.codeAblauf };
  });
}

/**
 * Löst einen Code ein: Der Chat wird mit dem Betrieb verknüpft. Die Chat-ID
 * landet im bestehenden v1-Feld telegramChatId (über setzeTelegramChatId) –
 * dasselbe Feld, das v1 als Rückkanal nutzt.
 */
export function loeseCodeEin(code, chatId, { betriebe = alleBetriebe(), jetzt = new Date() } = {}) {
  const sauber = String(code ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(sauber)) return null;
  for (const slug of betriebe) {
    const d = ladeBetriebV2(slug);
    if (d.telegramV2.code === sauber && new Date(d.telegramV2.codeAblauf) > jetzt) {
      setzeTelegramChatId(slug, String(chatId));
      aendereV2(slug, (x) => {
        x.telegramV2 = { ...TELEGRAM_STANDARD, ...(x.telegramV2 ?? {}), code: "", codeAblauf: "", verknuepftAm: jetzt.toISOString() };
      });
      return slug;
    }
  }
  return null;
}

export function trenneTelegram(slug) {
  setzeTelegramChatId(slug, "");
  aendereV2(slug, (d) => {
    d.telegramV2 = { ...TELEGRAM_STANDARD, ...(d.telegramV2 ?? {}), verknuepftAm: "" };
  });
}

export function betriebFuerChat(chatId, betriebe = alleBetriebe()) {
  return betriebe.find((slug) => String(ladeBetrieb(slug).telegramChatId ?? "") === String(chatId)) ?? null;
}

export function telegramStatus(slug) {
  const d = ladeBetriebV2(slug);
  return {
    verknuepft: Boolean(d.telegramChatId),
    verknuepftAm: d.telegramV2.verknuepftAm,
    tagesuebersicht: d.telegramV2.tagesuebersicht,
    uhrzeit: d.telegramV2.uhrzeit,
    offenerCode: d.telegramV2.code && new Date(d.telegramV2.codeAblauf) > new Date() ? d.telegramV2.code : "",
  };
}

export function setzeTagesuebersicht(slug, { aktiv, uhrzeit }) {
  if (uhrzeit !== undefined && !/^\d{2}:\d{2}$/.test(uhrzeit)) throw new Error("Uhrzeit im Format HH:MM angeben.");
  return aendereV2(slug, (d) => {
    d.telegramV2 = { ...TELEGRAM_STANDARD, ...(d.telegramV2 ?? {}), ...(aktiv !== undefined ? { tagesuebersicht: Boolean(aktiv) } : {}), ...(uhrzeit ? { uhrzeit } : {}) };
    return d.telegramV2;
  });
}

export function merkeTagesuebersicht(slug, datum) {
  aendereV2(slug, (d) => {
    d.telegramV2 = { ...TELEGRAM_STANDARD, ...(d.telegramV2 ?? {}), letzteUebersicht: datum };
  });
}
