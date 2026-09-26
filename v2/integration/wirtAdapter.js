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
//   telegramKanaele  getrennte Chats je Art (siehe src/telegramRegeln.js)
//   kuechenStatus je Bestellung: "in-zubereitung" | "bereit" | "abgeholt"
//
// Fehlen diese Felder (jeder Betrieb, der vor v2 angelegt wurde), gelten die
// Standardwerte aus mitV2Standards(). Es gibt keine schreibende Migration:
// Bestehende Dateien werden erst angefasst, wenn der Wirt eine v2-Funktion
// wirklich benutzt.

import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { datenPfad } from "../../src/datenPfad.js";
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
import { telegramEinstellungen, botFuerArt, zielFuer, kanalLink, botName, VORGANG_ARTEN } from "../../src/telegramRegeln.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BETRIEB_DIR = datenPfad("betrieb");

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
//
// Drei Arten, einen Chat zu verbinden – immer per Einmal-Code, den der Wirt
// im Dashboard erzeugt und im Chat mit /start CODE sendet:
//
//   gemeinsamer Chat (Modus „ein-chat“, wie bisher)  Code „ABC234“  → telegramChatId
//   Reservierungs-Chat                                Code „R-ABC234“ → telegramKanaele.reservierung.links[<bot>]
//   Bestell-Chat                                      Code „B-ABC234“ → telegramKanaele.bestellung.links[<bot>]
//
// Der Code steht nur beim Kanal, für den er erzeugt wurde, und gilt nur für
// den Bot, der diesen Kanal bedient. Ein Reservierungs-Code kann deshalb nie
// einen Bestell-Chat verbinden. Verknüpfungen bleiben beim Wechsel des Modus
// erhalten (je Bot getrennt gespeichert) – gelöscht wird nur mit „Trennen“.

const CODE_GUELTIG_MINUTEN = 30;
const CODE_ZEICHEN = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const KANAL_PRAEFIX = { reservierung: "R", bestellung: "B" };
export const KANAL_NAME = { gemeinsam: "Reservierungen und Bestellungen", reservierung: "Reservierungen", bestellung: "Bestellungen" };

const zufallsCode = () => Array.from({ length: 6 }, () => CODE_ZEICHEN[randomInt(CODE_ZEICHEN.length)]).join("");

function kanaeleVon(daten) {
  const k = daten.telegramKanaele ?? {};
  const kanal = (art) => ({ links: {}, code: "", codeAblauf: "", codeBot: "", ...(k[art] ?? {}), links: { ...(k[art]?.links ?? {}) } });
  return { reservierung: kanal("reservierung"), bestellung: kanal("bestellung") };
}

function aendereKanaele(slug, fn) {
  return aendereV2(slug, (d) => {
    d.telegramKanaele = kanaeleVon(d);
    return fn(d.telegramKanaele, d);
  });
}

/**
 * Einmal-Code, den der Wirt im Chat eingibt (/start CODE). 30 Minuten gültig.
 * kanal "alle" = gemeinsamer Chat wie bisher; "reservierung"/"bestellung" =
 * getrennter Chat für den Bot, der diesen Kanal im gewählten Modus bedient.
 */
export function erzeugeVerknuepfungscode(slug, jetzt = new Date(), { kanal = "alle" } = {}) {
  const gueltigBis = new Date(jetzt.getTime() + CODE_GUELTIG_MINUTEN * 60_000).toISOString();
  if (kanal === "alle") {
    const code = zufallsCode();
    return aendereV2(slug, (d) => {
      d.telegramV2 = { ...TELEGRAM_STANDARD, ...(d.telegramV2 ?? {}), code, codeAblauf: gueltigBis };
      return { code, gueltigBis, kanal, bot: "standard" };
    });
  }
  if (!VORGANG_ARTEN.includes(kanal)) throw new Error(`Unbekannter Kanal "${kanal}".`);
  const bot = botFuerArt(telegramEinstellungen(ladeBetrieb(slug)).modus, kanal);
  const code = `${KANAL_PRAEFIX[kanal]}-${zufallsCode()}`;
  return aendereKanaele(slug, (k) => {
    Object.assign(k[kanal], { code, codeAblauf: gueltigBis, codeBot: bot });
    return { code, gueltigBis, kanal, bot };
  });
}

function gleicherChat(a, b) {
  return String(a ?? "").trim() !== "" && String(a) === String(b);
}

/** Ist dieser Chat (über diesen Bot) schon der Chat des anderen Kanals? */
function belegtVonAnderemKanal(k, kanal, bot, chatId) {
  const anderer = kanal === "reservierung" ? "bestellung" : "reservierung";
  return gleicherChat(k[anderer].links[bot]?.chatId, chatId) ? anderer : "";
}

const BOT_BESCHREIBUNG = { standard: "den Haupt-Bot", reservierung: "den Reservierungs-Bot", bestellung: "den Bestell-Bot" };

/**
 * Löst einen Code ein. Liefert { ok, slug, kanal } oder { ok: false, grund,
 * text }. Prüft Ablauf, Kanal und Bot; ein Chat kann nicht zugleich
 * Reservierungs- und Bestell-Chat desselben Bots sein.
 */
export function loeseCodeEinFuerChat(code, chatId, { betriebe = alleBetriebe(), jetzt = new Date(), bot = "standard" } = {}) {
  const sauber = String(code ?? "").trim().toUpperCase();
  const unbekannt = { ok: false, grund: "unbekannt", text: "Der Code ist unbekannt oder abgelaufen. Bitte im Wirt-Dashboard einen neuen erzeugen." };
  const kanalCode = /^([RB])-?([A-Z0-9]{6})$/.exec(sauber);
  if (!kanalCode && !/^[A-Z0-9]{6}$/.test(sauber)) return unbekannt;

  for (const slug of betriebe) {
    const d = ladeBetriebV2(slug);
    if (!kanalCode) {
      if (d.telegramV2.code !== sauber || !(new Date(d.telegramV2.codeAblauf) > jetzt)) continue;
      if (bot !== "standard") return { ok: false, grund: "falscher-bot", text: "Dieser Code gehört zum Haupt-Bot des Betriebs. Bitte dort senden." };
      setzeTelegramChatId(slug, String(chatId));
      aendereV2(slug, (x) => {
        x.telegramV2 = { ...TELEGRAM_STANDARD, ...(x.telegramV2 ?? {}), code: "", codeAblauf: "", verknuepftAm: jetzt.toISOString() };
      });
      return { ok: true, slug, kanal: "gemeinsam" };
    }
    const kanal = kanalCode[1] === "R" ? "reservierung" : "bestellung";
    const k = kanaeleVon(d)[kanal];
    if (k.code !== `${kanalCode[1]}-${kanalCode[2]}` || !(new Date(k.codeAblauf) > jetzt)) continue;
    if (k.codeBot !== bot) {
      const name = botName(k.codeBot);
      return { ok: false, grund: "falscher-bot", text: `Dieser Code ist für ${BOT_BESCHREIBUNG[k.codeBot] ?? "einen anderen Bot"}${name ? ` (@${name})` : ""}. Bitte ihn dort senden.` };
    }
    const belegt = belegtVonAnderemKanal(kanaeleVon(d), kanal, bot, chatId);
    if (belegt) {
      return { ok: false, grund: "anderer-kanal", text: `Dieser Chat ist bereits der Chat für ${KANAL_NAME[belegt]}. Für ${KANAL_NAME[kanal]} bitte einen eigenen Chat (z. B. eine zweite Gruppe) verwenden.` };
    }
    aendereKanaele(slug, (alle) => {
      alle[kanal].links[bot] = { chatId: String(chatId), verknuepftAm: jetzt.toISOString() };
      Object.assign(alle[kanal], { code: "", codeAblauf: "", codeBot: "" });
    });
    return { ok: true, slug, kanal };
  }
  return unbekannt;
}

/**
 * Löst einen Code ein und liefert den Betrieb (oder null) – die bisherige
 * Schnittstelle. Details (Kanal, Grund) liefert loeseCodeEinFuerChat.
 */
export function loeseCodeEin(code, chatId, optionen = {}) {
  const e = loeseCodeEinFuerChat(code, chatId, optionen);
  return e.ok ? e.slug : null;
}

/** Trennt den gemeinsamen Chat (Modus „ein-chat“, bisheriges Feld). */
export function trenneTelegram(slug) {
  setzeTelegramChatId(slug, "");
  aendereV2(slug, (d) => {
    d.telegramV2 = { ...TELEGRAM_STANDARD, ...(d.telegramV2 ?? {}), verknuepftAm: "" };
  });
}

/** Trennt einen Kanal – für den Bot, der ihn im aktuellen Modus bedient. */
export function trenneKanal(slug, kanal) {
  if (kanal === "alle" || kanal === "gemeinsam") return trenneTelegram(slug);
  if (!VORGANG_ARTEN.includes(kanal)) throw new Error(`Unbekannter Kanal "${kanal}".`);
  const bot = botFuerArt(telegramEinstellungen(ladeBetrieb(slug)).modus, kanal);
  aendereKanaele(slug, (k) => {
    delete k[kanal].links[bot];
  });
}

/**
 * Übernimmt den bisherigen gemeinsamen Chat als Chat eines Kanals (nur mit
 * dem Haupt-Bot, der diesen Chat schon kennt). Der gemeinsame Chat bleibt
 * gespeichert.
 */
export function uebernimmBisherigenChat(slug, kanal, jetzt = new Date()) {
  if (!VORGANG_ARTEN.includes(kanal)) throw new Error(`Unbekannter Kanal "${kanal}".`);
  const d = ladeBetrieb(slug);
  const chatId = String(d.telegramChatId ?? "").trim();
  if (!chatId) throw new Error("Es gibt keinen bisherigen Chat, der übernommen werden könnte.");
  const bot = botFuerArt(telegramEinstellungen(d).modus, kanal);
  if (bot !== "standard") throw new Error("Im Modus „zwei eigene Bots“ muss jeder Chat mit seinem Bot neu verbunden werden (Code erzeugen).");
  return aendereKanaele(slug, (k) => {
    const belegt = belegtVonAnderemKanal(k, kanal, bot, chatId);
    if (belegt) throw new Error(`Der bisherige Chat ist bereits der Chat für ${KANAL_NAME[belegt]}.`);
    k[kanal].links[bot] = { chatId, verknuepftAm: jetzt.toISOString(), uebernommen: true };
    return true;
  });
}

/**
 * Welche Betriebe kennen diesen Chat über diesen Bot – und für welche Arten
 * ist er im aktuellen Modus das konfigurierte Ziel?
 * @returns {Array<{ slug: string, arten: string[] }>}
 */
export function zugaengeFuerChat(bot, chatId, betriebe = alleBetriebe()) {
  const liste = [];
  for (const slug of betriebe) {
    const d = ladeBetrieb(slug);
    const einstellungen = telegramEinstellungen(d);
    const arten = VORGANG_ARTEN.filter((art) => {
      const ziel = zielFuer(d, art, einstellungen);
      return ziel && ziel.bot === bot && gleicherChat(ziel.chatId, chatId);
    });
    const verknuepft =
      arten.length > 0 ||
      (bot === "standard" && gleicherChat(d.telegramChatId, chatId)) ||
      VORGANG_ARTEN.some((art) => gleicherChat(kanalLink(d, art, bot)?.chatId, chatId));
    if (verknuepft) liste.push({ slug, arten });
  }
  return liste;
}

/** Trennt alles, was diesen Chat über diesen Bot mit einem Betrieb verbindet (/abmelden). */
export function trenneChat(bot, chatId, betriebe = alleBetriebe()) {
  const getrennt = [];
  for (const slug of betriebe) {
    const d = ladeBetrieb(slug);
    let geaendert = false;
    if (bot === "standard" && gleicherChat(d.telegramChatId, chatId)) {
      trenneTelegram(slug);
      geaendert = true;
    }
    if (VORGANG_ARTEN.some((art) => gleicherChat(kanalLink(d, art, bot)?.chatId, chatId))) {
      aendereKanaele(slug, (k) => {
        for (const art of VORGANG_ARTEN) if (gleicherChat(k[art].links[bot]?.chatId, chatId)) delete k[art].links[bot];
      });
      geaendert = true;
    }
    if (geaendert) getrennt.push(slug);
  }
  return getrennt;
}

/** Bisherige Schnittstelle: Betrieb des gemeinsamen Chats (Haupt-Bot). */
export function betriebFuerChat(chatId, betriebe = alleBetriebe()) {
  return betriebe.find((slug) => String(ladeBetrieb(slug).telegramChatId ?? "") === String(chatId)) ?? null;
}

export function telegramStatus(slug, jetzt = new Date()) {
  const d = ladeBetriebV2(slug);
  const einstellungen = telegramEinstellungen(d);
  const k = kanaeleVon(d);
  const offen = (code, ablauf) => (code && new Date(ablauf) > jetzt ? code : "");
  const kanaele = {
    gemeinsam: { bot: "standard", verbunden: Boolean(String(d.telegramChatId ?? "").trim()), verknuepftAm: d.telegramV2.verknuepftAm, offenerCode: offen(d.telegramV2.code, d.telegramV2.codeAblauf) },
  };
  for (const art of VORGANG_ARTEN) {
    const bot = botFuerArt(einstellungen.modus, art);
    const link = kanalLink(d, art, bot);
    kanaele[art] = {
      bot,
      botName: botName(bot),
      verbunden: Boolean(link),
      verknuepftAm: link?.verknuepftAm ?? "",
      uebernommen: Boolean(link?.uebernommen),
      offenerCode: k[art].codeBot === bot ? offen(k[art].code, k[art].codeAblauf) : "",
      // Verknüpfungen mit dem jeweils anderen Bot bleiben gespeichert.
      andereBots: Object.keys(k[art].links).filter((b) => b !== bot && kanalLink(d, art, b)),
    };
  }
  return {
    verknuepft: kanaele.gemeinsam.verbunden,
    verknuepftAm: d.telegramV2.verknuepftAm,
    tagesuebersicht: d.telegramV2.tagesuebersicht,
    uhrzeit: d.telegramV2.uhrzeit,
    offenerCode: kanaele.gemeinsam.offenerCode,
    modus: einstellungen.modus,
    botName: botName("standard"),
    kanaele,
  };
}

export function setzeTagesuebersicht(slug, { aktiv, uhrzeit }) {
  if (uhrzeit !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(uhrzeit)) throw new Error("Uhrzeit im Format HH:MM angeben.");
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
