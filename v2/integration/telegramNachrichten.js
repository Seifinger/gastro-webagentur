// Telegram-API und Nachrichten des Wirt-Bots.
//
// Inhalt nach dem Grundsatz „nur, was als Alarm nötig ist“ (Zeilen aus
// src/telegramRegeln.js): Betrieb, Referenznummer, Termin bzw. Abholzeit,
// Personenzahl, Status und die zulässigen Knöpfe. Keine Namen, Telefon-
// nummern, E-Mail-Adressen, Wünsche/Hinweise, Positionen, Summen, No-Show-
// oder Rechnungsangaben, keine Tokens – Details stehen im Wirt-Dashboard.
// Dasselbe gilt für /heute, /offen, Tagesübersicht, Erinnerungen und die
// nach einem Knopfdruck bearbeitete Nachricht.

import { ladeBetrieb, uhrHook } from "../../src/betriebStore.js";
import {
  botToken,
  konfigurierteBots,
  betriebsName,
  reservierungZeile,
  bestellungZeile,
  datumKurz,
  RESERVIERUNG_STATUS_TEXT,
} from "../../src/telegramRegeln.js";
import { datumIn, ZEITZONE_STANDARD } from "../../src/abholzeiten.js";
import { referenzVon } from "../../src/gastStatus.js";
import { kuechenStatusVon, KUECHEN_STATUS_LABEL } from "./wirtAdapter.js";

const API = "https://api.telegram.org";

/** Ist mindestens ein Bot eingerichtet? */
export function telegramKonfiguriert() {
  return konfigurierteBots().length > 0;
}

async function rufeTelegram(methode, daten, bot = "standard") {
  const token = botToken(bot);
  if (!token) {
    const fehler = new Error(`Telegram-Bot „${bot}“ ist nicht eingerichtet (Token fehlt).`);
    fehler.status = 401;
    throw fehler;
  }
  const antwort = await fetch(`${API}/bot${token}/${methode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(daten),
  });
  const json = await antwort.json().catch(() => ({}));
  if (!antwort.ok || json.ok === false) {
    const fehler = new Error(`Telegram ${methode}: ${json.description ?? antwort.status}`);
    fehler.status = json.error_code ?? antwort.status;
    throw fehler;
  }
  return json.result;
}

// Austauschbar für Tests – dasselbe Muster wie telegramSendenHook in v1.
// Aufruf: (methode, daten, bot) – bot ist "standard", "reservierung" oder "bestellung".
export const telegramApiHook = { aktuell: rufeTelegram };
export const api = (methode, daten, bot = "standard") => telegramApiHook.aktuell(methode, daten, bot);

/* ------------------------------------------------------------------ */
/* Texte                                                               */
/* ------------------------------------------------------------------ */

const kopf = (symbol, titel, betrieb) => `${symbol} ${titel}${betrieb ? ` · ${betrieb}` : ""}`;

export function reservierungsText(r, { titel = "Neue Reservierung", symbol = "🪑", betrieb = "", hinweis = "" } = {}) {
  return [kopf(symbol, titel, betrieb), reservierungZeile(r), `Status: ${RESERVIERUNG_STATUS_TEXT[r.status] ?? r.status}`, hinweis].filter(Boolean).join("\n");
}

export function bestellungsText(b, { titel = "Neue Bestellung", symbol = "🥡", betrieb = "", hinweis = "", zeitzone = ZEITZONE_STANDARD, jetzt = uhrHook.jetzt() } = {}) {
  return [kopf(symbol, titel, betrieb), bestellungZeile(b, { zeitzone, jetzt }), `Status: ${KUECHEN_STATUS_LABEL[kuechenStatusVon(b)]}`, hinweis].filter(Boolean).join("\n");
}

export function reservierungsKnoepfe(r) {
  if (r.status !== "neu") return undefined;
  return { inline_keyboard: [[{ text: "✓ Bestätigen", callback_data: `r:ok:${r.id}` }, { text: "✗ Absagen", callback_data: `r:ab:${r.id}` }]] };
}

export function bestellungsKnoepfe(b) {
  const s = kuechenStatusVon(b);
  if (["abgeholt", "abgelehnt", "storniert"].includes(s)) return undefined;
  const reihe = [];
  if (s === "neu") reihe.push({ text: "In Zubereitung", callback_data: `b:zub:${b.id}` }, { text: "Ablehnen", callback_data: `b:ab:${b.id}` });
  if (s === "in-zubereitung") reihe.push({ text: "Bereit", callback_data: `b:bereit:${b.id}` });
  if (s === "bereit") reihe.push({ text: "Abgeholt", callback_data: `b:weg:${b.id}` });
  return { inline_keyboard: [reihe] };
}

/** Eine Einzelnachricht (Text + Knöpfe) zu einem Vorgang. */
export function vorgangsNachricht(art, eintrag, daten, slug, { titel, symbol, hinweis, jetzt = uhrHook.jetzt() } = {}) {
  const betrieb = betriebsName(daten, slug);
  const zeitzone = daten.zeitzone || ZEITZONE_STANDARD;
  if (art === "reservierung") return { text: reservierungsText(eintrag, { titel, symbol, betrieb, hinweis }), reply_markup: reservierungsKnoepfe(eintrag) };
  return { text: bestellungsText(eintrag, { titel, symbol, betrieb, hinweis, zeitzone, jetzt }), reply_markup: bestellungsKnoepfe(eintrag) };
}

export const LAUFEND = (b) => !["abgeholt", "abgelehnt", "storniert"].includes(kuechenStatusVon(b));

/**
 * Tagesübersicht (auch /heute) – nur Uhrzeit, Personenzahl und Referenz.
 * arten: welche Teile dieser Chat bekommt (im Zwei-Chat-Modus getrennt).
 */
export function tagesuebersicht(slug, datum, { arten = ["reservierung", "bestellung"], titel = "📅 Tagesübersicht", jetzt = uhrHook.jetzt() } = {}) {
  const d = ladeBetrieb(slug);
  const zeitzone = d.zeitzone || ZEITZONE_STANDARD;
  const tag = datum ?? datumIn(new Date(jetzt).getTime(), zeitzone);
  const zeilen = [`${titel} · ${betriebsName(d, slug)} – ${datumKurz(tag)}`];
  if (arten.includes("reservierung")) {
    const heute = d.reservierungen.filter((r) => r.datum === tag && r.status !== "abgesagt").sort((a, b) => a.uhrzeit.localeCompare(b.uhrzeit));
    const personen = heute.reduce((s, r) => s + Number(r.personen || 0), 0);
    const unbestaetigt = heute.filter((r) => r.status === "neu").length;
    zeilen.push(
      heute.length
        ? `Reservierungen: ${heute.length} (${personen} Gäste)${unbestaetigt ? `, davon ${unbestaetigt} noch unbestätigt` : ""}`
        : "Heute noch keine Reservierungen.",
      ...heute.map((r) => `  ${r.uhrzeit} · ${r.personen} P. · ${referenzVon("reservierung", r)}${r.status === "neu" ? " (offen)" : ""}`),
    );
  }
  if (arten.includes("bestellung")) {
    const laufend = d.bestellungen.filter(LAUFEND);
    const neu = laufend.filter((b) => b.status === "neu").length;
    zeilen.push(
      laufend.length
        ? `Laufende Bestellungen: ${laufend.length}${neu ? `, davon ${neu} noch unbestätigt` : ""} (${laufend.map((b) => referenzVon("bestellung", b)).join(", ")})`
        : "Keine laufenden Bestellungen.",
    );
  }
  zeilen.push("Details im Wirt-Dashboard.");
  return zeilen.join("\n");
}

const SAMMEL_ZEILEN_MAX = 15;

/**
 * Eine Meldung für viele offene Vorgänge (nach langer Pause) statt einer Flut
 * einzelner Nachrichten. posten: [{ art, eintrag, anlass }].
 */
export function sammelNachricht(posten, daten, slug, { jetzt = uhrHook.jetzt() } = {}) {
  const zeitzone = daten.zeitzone || ZEITZONE_STANDARD;
  const res = posten.filter((p) => p.art === "reservierung");
  const best = posten.filter((p) => p.art === "bestellung");
  const anzahl = [res.length ? `${res.length} ${res.length === 1 ? "Reservierung" : "Reservierungen"}` : "", best.length ? `${best.length} ${best.length === 1 ? "Bestellung" : "Bestellungen"}` : ""].filter(Boolean).join(" / ");
  const marke = { nachholen: " – eingegangen außerhalb der Telegram-Zeiten", eingang: "", erinnerung: " – Erinnerung" };
  const liste = (teil, zeile) => {
    const zeilen = teil.slice(0, SAMMEL_ZEILEN_MAX).map((p) => `• ${zeile(p.eintrag)}${marke[p.anlass] ?? ""}`);
    if (teil.length > SAMMEL_ZEILEN_MAX) zeilen.push(`• … und ${teil.length - SAMMEL_ZEILEN_MAX} weitere`);
    return zeilen;
  };
  const text = [
    `📋 Noch offen · ${betriebsName(daten, slug)}: ${anzahl} ${posten.length === 1 ? "ist" : "sind"} noch nicht bestätigt.`,
    ...(res.length ? ["Reservierungen:", ...liste(res, reservierungZeile)] : []),
    ...(best.length ? ["Bestellungen:", ...liste(best, (b) => bestellungZeile(b, { zeitzone, jetzt }))] : []),
    "Zum Bearbeiten „Einzeln anzeigen“ tippen oder /offen senden. Details im Wirt-Dashboard.",
  ].join("\n");
  const art = res.length && best.length ? "a" : res.length ? "r" : "b";
  return { text, reply_markup: { inline_keyboard: [[{ text: "Einzeln anzeigen", callback_data: `o:${art}` }]] } };
}

export function stornoNachricht(b, daten, slug, { jetzt = uhrHook.jetzt() } = {}) {
  return { text: bestellungsText(b, { titel: "Vom Gast storniert", symbol: "🚫", betrieb: betriebsName(daten, slug), zeitzone: daten.zeitzone || ZEITZONE_STANDARD, jetzt }) };
}

export function testNachricht(daten, slug, kanalName) {
  return { text: `✅ Testnachricht · ${betriebsName(daten, slug)}\nDieser Chat ist verbunden. Hierher kommen: ${kanalName}.\nKeine Gastdaten – Details stehen immer im Wirt-Dashboard.` };
}
