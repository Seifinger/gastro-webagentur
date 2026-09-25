// Telegram-Bot für Wirte (Stage 7c) – ein eigenständiger, optionaler Kanal
// neben dem Wirt-Dashboard, kein Ersatz.
//
//   • Push: neue Reservierung, neue Bestellung, Stornierung durch den Gast
//   • Kurzbefehle direkt in Telegram (Inline-Knöpfe):
//       Reservierung bestätigen / absagen
//       Bestellung: Neu → In Zubereitung → Bereit → Abgeholt (oder ablehnen)
//   • Tagesübersicht am Morgen (Reservierungen des Tages, offene Bestellungen)
//   • /heute, /offen, /hilfe, /abmelden
//
// Betriebe ohne verknüpften Chat bleiben unberührt – alles läuft weiter über
// das Dashboard. Ein Bot-Token gilt für die ganze Agentur; welcher Chat zu
// welchem Betrieb gehört, steht im bestehenden Feld telegramChatId des
// Betriebs (Verknüpfung per Einmal-Code, siehe TELEGRAM-SETUP.md).
//
// Start als eigener Dienst:   npm run v2:telegram
// oder im Wirt-Server:        npm run v2:wirt -- --betrieb <slug> --telegram

import { fileURLToPath } from "node:url";
import { ladeBetrieb } from "../../src/betriebStore.js";
import { stelleGastMeldungenZu } from "../../src/kundenBenachrichtigung.js";
import { wirtGastHinweis } from "../../src/gastStatus.js";
import {
  alleBetriebe,
  betriebFuerChat,
  loeseCodeEin,
  trenneTelegram,
  setzeKuechenStatus,
  kuechenStatusVon,
  KUECHEN_STATUS_LABEL,
  bestaetigeReservierung,
  sageReservierungAb,
  ladeBetriebV2,
  merkeTagesuebersicht,
} from "./wirtAdapter.js";

const API = "https://api.telegram.org";

export function telegramKonfiguriert() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

async function rufeTelegram(methode, daten) {
  const antwort = await fetch(`${API}/bot${process.env.TELEGRAM_BOT_TOKEN}/${methode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(daten),
  });
  const json = await antwort.json().catch(() => ({}));
  if (!antwort.ok || json.ok === false) throw new Error(`Telegram ${methode}: ${json.description ?? antwort.status}`);
  return json.result;
}

// Austauschbar für Tests – dasselbe Muster wie telegramSendenHook in v1.
export const telegramApiHook = { aktuell: rufeTelegram };
const api = (methode, daten) => telegramApiHook.aktuell(methode, daten);

/* ------------------------------------------------------------------ */
/* Texte                                                               */
/* ------------------------------------------------------------------ */

const euro = (n) => `${Number(n || 0).toFixed(2).replace(".", ",")} €`;
const datumDe = (iso) => String(iso ?? "").split("-").reverse().join(".");

export function reservierungsText(r, { titel = "Neue Reservierung" } = {}) {
  return [
    `🪑 ${titel}`,
    `${r.personen} Personen · ${datumDe(r.datum)} · ${r.uhrzeit} Uhr`,
    `${r.name}${r.telefon ? ` · ${r.telefon}` : ""}`,
    r.wunsch ? `Wunsch: ${r.wunsch}` : "",
    `Status: ${{ neu: "offen", bestaetigt: "bestätigt", abgesagt: "abgesagt" }[r.status] ?? r.status}`,
  ].filter(Boolean).join("\n");
}

export function bestellungsText(b, { titel = "Neue Bestellung" } = {}) {
  const positionen = (b.positionen ?? []).map((p) => `  ${p.menge} × ${p.name}`).join("\n");
  return [
    `🥡 ${titel} ${b.nummer}`,
    positionen,
    `Summe ${euro(b.gesamt)} · Abholung ${b.bestaetigteAbholzeit || b.abholzeit}`,
    `${b.name}${b.telefon ? ` · ${b.telefon}` : ""}`,
    b.hinweis ? `Hinweis: ${b.hinweis}` : "",
    b.noShowZustimmung ? "No-Show-Pauschale zugestimmt" : "",
    `Küche: ${KUECHEN_STATUS_LABEL[kuechenStatusVon(b)]}`,
  ].filter(Boolean).join("\n");
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

export function tagesuebersicht(slug, datum = new Date().toISOString().slice(0, 10)) {
  const d = ladeBetrieb(slug);
  const heute = d.reservierungen
    .filter((r) => r.datum === datum && r.status !== "abgesagt")
    .sort((a, b) => a.uhrzeit.localeCompare(b.uhrzeit));
  const personen = heute.reduce((s, r) => s + Number(r.personen || 0), 0);
  const offen = d.bestellungen.filter((b) => !["abgeholt", "abgelehnt", "storniert"].includes(kuechenStatusVon(b)));
  const unbestaetigt = heute.filter((r) => r.status === "neu").length;
  return [
    `☀️ Guten Morgen – ${datumDe(datum)}`,
    heute.length ? `${heute.length} Reservierungen, ${personen} Gäste${unbestaetigt ? ` (${unbestaetigt} noch unbestätigt)` : ""}:` : "Heute noch keine Reservierungen.",
    ...heute.map((r) => `  ${r.uhrzeit} · ${r.personen} P. · ${r.name}${r.status === "neu" ? " (offen)" : ""}`),
    offen.length ? `\n${offen.length} offene Bestellung(en): ${offen.map((b) => b.nummer).join(", ")}` : "\nKeine offenen Bestellungen.",
  ].join("\n");
}

const HILFE = [
  "Befehle:",
  "/heute – Reservierungen und Bestellungen von heute",
  "/offen – alles, was auf eine Entscheidung wartet (mit Knöpfen)",
  "/abmelden – diesen Chat vom Betrieb trennen",
  "/hilfe – diese Übersicht",
].join("\n");

/* ------------------------------------------------------------------ */
/* Push aus dem Wirt-Server                                            */
/* ------------------------------------------------------------------ */

/**
 * Meldet ein Ereignis an den verknüpften Chat des Betriebs. Wirft nie: Ein
 * fehlgeschlagener Versand darf die Anfrage des Gastes nicht scheitern
 * lassen (wie benachrichtigeUeberTelegram in v1).
 *
 * @param {string} slug
 * @param {{art: "reservierung"|"bestellung"|"storno", id: string}} ereignis
 */
export async function benachrichtige(slug, ereignis) {
  const chatId = String(ladeBetrieb(slug).telegramChatId ?? "").trim();
  if (!chatId) return { gesendet: false, grund: "kein Telegram-Chat verknüpft" };
  if (!telegramKonfiguriert()) return { gesendet: false, grund: "kein TELEGRAM_BOT_TOKEN" };
  const d = ladeBetrieb(slug);
  let nachricht;
  if (ereignis.art === "reservierung") {
    const r = d.reservierungen.find((x) => x.id === ereignis.id);
    if (!r) return { gesendet: false, grund: "Reservierung nicht gefunden" };
    nachricht = { text: reservierungsText(r), reply_markup: reservierungsKnoepfe(r) };
  } else {
    const b = d.bestellungen.find((x) => x.id === ereignis.id);
    if (!b) return { gesendet: false, grund: "Bestellung nicht gefunden" };
    nachricht =
      ereignis.art === "storno"
        ? { text: bestellungsText(b, { titel: "Storniert:" }) }
        : { text: bestellungsText(b), reply_markup: bestellungsKnoepfe(b) };
  }
  try {
    await api("sendMessage", { chat_id: chatId, ...nachricht });
    return { gesendet: true };
  } catch (e) {
    return { gesendet: false, grund: e.message };
  }
}

/* ------------------------------------------------------------------ */
/* Eingehende Updates                                                  */
/* ------------------------------------------------------------------ */

async function antworte(chatId, text, extra = {}) {
  await api("sendMessage", { chat_id: chatId, text, ...extra });
}

export async function verarbeiteUpdate(update, { betriebe = alleBetriebe() } = {}) {
  if (update.callback_query) return verarbeiteKnopf(update.callback_query, betriebe);
  const nachricht = update.message;
  if (!nachricht?.text) return null;
  const chatId = nachricht.chat.id;
  const [roh, ...rest] = nachricht.text.trim().split(/\s+/);
  // In Gruppen hängt Telegram den Bot-Namen an: /start@MeinLokalBot CODE
  const befehl = roh.replace(/@\w+$/, "");
  const slug = betriebFuerChat(chatId, betriebe);

  if (befehl === "/start" || befehl === "/verknuepfen") {
    const code = rest[0];
    if (code) {
      const verknuepft = loeseCodeEin(code, chatId, { betriebe });
      if (verknuepft) {
        await antworte(chatId, `Verbunden mit „${verknuepft}“. Neue Reservierungen und Bestellungen kommen ab jetzt hierher.\n\n${HILFE}`);
        return { aktion: "verknuepft", slug: verknuepft };
      }
      await antworte(chatId, "Der Code ist unbekannt oder abgelaufen. Bitte im Wirt-Dashboard einen neuen erzeugen.");
      return { aktion: "code-ungueltig" };
    }
    await antworte(chatId, slug ? `Dieser Chat ist mit „${slug}“ verbunden.\n\n${HILFE}` : "Hallo! Zum Verbinden bitte im Wirt-Dashboard unter „Telegram“ einen Code erzeugen und hier „/start CODE“ senden.");
    return { aktion: "start" };
  }
  if (!slug) {
    await antworte(chatId, "Dieser Chat ist noch mit keinem Betrieb verbunden. Code aus dem Wirt-Dashboard mit „/start CODE“ senden.");
    return { aktion: "unverknuepft" };
  }
  if (befehl === "/heute") {
    await antworte(chatId, tagesuebersicht(slug));
    return { aktion: "heute", slug };
  }
  if (befehl === "/offen") {
    const d = ladeBetrieb(slug);
    const res = d.reservierungen.filter((r) => r.status === "neu");
    const best = d.bestellungen.filter((b) => !["abgeholt", "abgelehnt", "storniert"].includes(kuechenStatusVon(b)));
    if (!res.length && !best.length) await antworte(chatId, "Nichts offen.");
    for (const r of res) await antworte(chatId, reservierungsText(r, { titel: "Offene Reservierung" }), { reply_markup: reservierungsKnoepfe(r) });
    for (const b of best) await antworte(chatId, bestellungsText(b, { titel: "Bestellung" }), { reply_markup: bestellungsKnoepfe(b) });
    return { aktion: "offen", slug, anzahl: res.length + best.length };
  }
  if (befehl === "/abmelden") {
    trenneTelegram(slug);
    await antworte(chatId, "Getrennt. Es kommen keine Nachrichten mehr hierher; das Dashboard funktioniert wie gewohnt.");
    return { aktion: "abgemeldet", slug };
  }
  await antworte(chatId, HILFE);
  return { aktion: "hilfe", slug };
}

async function verarbeiteKnopf(knopf, betriebe) {
  const chatId = knopf.message?.chat?.id;
  const slug = betriebFuerChat(chatId, betriebe);
  const [art, aktion, id] = String(knopf.data ?? "").split(":");
  const quittung = (text) => api("answerCallbackQuery", { callback_query_id: knopf.id, text });
  if (!slug) {
    await quittung("Dieser Chat ist mit keinem Betrieb verbunden.");
    return { aktion: "verweigert" };
  }
  try {
    let text;
    let markup;
    if (art === "r") {
      const r = aktion === "ok" ? bestaetigeReservierung(slug, id) : sageReservierungAb(slug, id);
      text = reservierungsText(r, { titel: "Reservierung" });
      markup = reservierungsKnoepfe(r);
    } else if (art === "b") {
      const ziel = { zub: "in-zubereitung", bereit: "bereit", weg: "abgeholt", ab: "abgelehnt" }[aktion];
      if (!ziel) throw new Error("Unbekannte Aktion");
      const b = setzeKuechenStatus(slug, id, ziel);
      text = bestellungsText(b, { titel: "Bestellung" });
      markup = bestellungsKnoepfe(b);
    } else {
      throw new Error("Unbekannter Knopf");
    }
    // Gastmeldung zustellen (entstanden beim Speichern, wie bei einem Klick
    // im Dashboard). Ein doppelt gedrückter Knopf ändert nichts und
    // verschickt deshalb auch nichts.
    await stelleGastMeldungenZu(slug);
    const stand = ladeBetrieb(slug);
    const eintrag = (art === "r" ? stand.reservierungen : stand.bestellungen).find((x) => x.id === id);
    const gast = eintrag ? wirtGastHinweis(art === "r" ? "reservierung" : "bestellung", eintrag, stand.gastMeldungen ?? []) : null;
    if (gast?.anrufNoetig) text += `\n⚠️ ${gast.anrufText}`;
    await api("editMessageText", { chat_id: chatId, message_id: knopf.message.message_id, text, ...(markup ? { reply_markup: markup } : {}) });
    await quittung("Erledigt");
    return { aktion: `${art}:${aktion}`, slug, id };
  } catch (e) {
    await quittung(e.message.slice(0, 190));
    return { aktion: "fehler", fehler: e.message };
  }
}

/* ------------------------------------------------------------------ */
/* Tagesübersicht                                                      */
/* ------------------------------------------------------------------ */

/** Sendet fällige Tagesübersichten (einmal pro Tag und Betrieb, zur eingestellten Uhrzeit). */
export async function sendeFaelligeUebersichten(jetzt = new Date(), betriebe = alleBetriebe()) {
  const gesendet = [];
  const datum = `${jetzt.getFullYear()}-${String(jetzt.getMonth() + 1).padStart(2, "0")}-${String(jetzt.getDate()).padStart(2, "0")}`;
  const uhrzeit = `${String(jetzt.getHours()).padStart(2, "0")}:${String(jetzt.getMinutes()).padStart(2, "0")}`;
  for (const slug of betriebe) {
    const d = ladeBetriebV2(slug);
    if (!d.telegramChatId || !d.telegramV2.tagesuebersicht) continue;
    if (d.telegramV2.letzteUebersicht === datum || uhrzeit < d.telegramV2.uhrzeit) continue;
    try {
      await antworte(d.telegramChatId, tagesuebersicht(slug, datum));
      merkeTagesuebersicht(slug, datum);
      gesendet.push(slug);
    } catch {
      // nächster Versuch in einer Minute
    }
  }
  return gesendet;
}

/* ------------------------------------------------------------------ */
/* Dienst                                                              */
/* ------------------------------------------------------------------ */

/**
 * Long Polling (kein öffentlicher Webhook nötig – läuft auch hinter NAT auf
 * dem Rechner im Lokal) plus Minutentakt für die Tagesübersicht.
 */
export function starteDienst({ log = console.log } = {}) {
  if (!telegramKonfiguriert()) throw new Error("TELEGRAM_BOT_TOKEN fehlt – siehe v2/integration/TELEGRAM-SETUP.md");
  let offset = 0;
  let laeuft = true;
  const takt = setInterval(() => sendeFaelligeUebersichten().then((l) => l.length && log(`Tagesübersicht an ${l.join(", ")}`)), 60_000);
  (async () => {
    while (laeuft) {
      try {
        const updates = await api("getUpdates", { offset, timeout: 30, allowed_updates: ["message", "callback_query"] });
        for (const u of updates ?? []) {
          offset = u.update_id + 1;
          const ergebnis = await verarbeiteUpdate(u).catch((e) => ({ fehler: e.message }));
          if (ergebnis) log(`Telegram: ${JSON.stringify(ergebnis)}`);
        }
      } catch (e) {
        log(`Telegram nicht erreichbar (${e.message}) – neuer Versuch in 5 s`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  })();
  return () => {
    laeuft = false;
    clearInterval(takt);
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { config } = await import("dotenv");
  config();
  try {
    starteDienst();
    console.log(`🤖 Telegram-Dienst läuft für ${alleBetriebe().length} Betrieb(e). Beenden mit Strg+C.`);
  } catch (e) {
    console.log(`⚠️  ${e.message}`);
    process.exitCode = 1;
  }
}
