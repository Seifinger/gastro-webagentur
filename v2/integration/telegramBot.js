// Telegram-Bot für Wirte (Stage 7c) – ein eigenständiger, optionaler Kanal
// neben dem Wirt-Dashboard, kein Ersatz. Maßgeblich bleibt das Dashboard.
//
//   • Meldungen: neue Reservierung, neue Bestellung, Stornierung durch den Gast,
//     Nachmelden nach einer Pause, eine Erinnerung an Unbestätigtes
//     (telegramPlaner.js) – nur in den Telegram-Zeiten des Betriebs
//   • Kurzbefehle direkt in Telegram (Inline-Knöpfe):
//       Reservierung bestätigen / absagen
//       Bestellung: Neu → In Zubereitung → Bereit → Abgeholt (oder ablehnen)
//   • Tagesübersicht, /heute, /offen, /hilfe, /abmelden
//
// Chat-Modi je Betrieb (Einstellung im Wirt-Dashboard, src/telegramRegeln.js):
//   ein-chat    ein Bot, ein Chat für alles (bisheriger Standard, Feld telegramChatId)
//   zwei-chats  ein Bot, getrennte Chats für Reservierungen und Bestellungen
//   zwei-bots   eigener Reservierungs-Bot und eigener Bestell-Bot (eigene Tokens)
// Dieselbe Logik für alle Bots: Jede Anfrage trägt die Kennung des Bots, über
// den sie kam, und wirkt nur für die Arten, für die genau dieser Chat über
// genau diesen Bot konfiguriert ist.
//
// Start als eigener Dienst:   npm run v2:telegram
// oder im Wirt-Server:        npm run v2:wirt -- --betrieb <slug> --telegram
// Je Bot-Token läuft höchstens ein Abruf (Sperre, auch prozessübergreifend).

import { fileURLToPath } from "node:url";
import { ladeBetrieb, uhrHook } from "../../src/betriebStore.js";
import { stelleGastMeldungenZu } from "../../src/kundenBenachrichtigung.js";
import { wirtGastHinweis } from "../../src/gastStatus.js";
import { konfigurierteBots, telegramEinstellungen, betriebsName, botDoppelt, BOT_ROLLEN } from "../../src/telegramRegeln.js";
import { Bremse } from "../../src/anfrageSchutz.js";
import {
  alleBetriebe,
  zugaengeFuerChat,
  loeseCodeEinFuerChat,
  trenneChat,
  setzeKuechenStatus,
  kuechenStatusVon,
  bestaetigeReservierung,
  sageReservierungAb,
  KANAL_NAME,
} from "./wirtAdapter.js";
import {
  api,
  telegramApiHook,
  telegramKonfiguriert,
  reservierungsText,
  bestellungsText,
  reservierungsKnoepfe,
  bestellungsKnoepfe,
  tagesuebersicht,
  vorgangsNachricht,
  LAUFEND,
} from "./telegramNachrichten.js";
import { benachrichtige, fuehreTaktAus, sendeFaelligeUebersichten } from "./telegramPlaner.js";
import { sichereSperre, tokenKennung, SPERR_DIR } from "./telegramSperren.js";

export {
  telegramApiHook,
  telegramKonfiguriert,
  reservierungsText,
  bestellungsText,
  reservierungsKnoepfe,
  bestellungsKnoepfe,
  tagesuebersicht,
  benachrichtige,
  fuehreTaktAus,
  sendeFaelligeUebersichten,
};

const ART_TEXT = { reservierung: "Reservierungen", bestellung: "Bestellungen" };

function hilfe(arten = ["reservierung", "bestellung"]) {
  const was = arten.length ? arten.map((a) => ART_TEXT[a]).join(" und ") : "nichts (derzeit anderer Chat eingestellt)";
  return [
    `Dieser Chat bekommt: ${was}.`,
    "Befehle:",
    "/heute – Überblick für heute (ohne Gastdaten)",
    "/offen – alles, was auf eine Entscheidung wartet (mit Knöpfen)",
    "/abmelden – diesen Chat vom Betrieb trennen",
    "/hilfe – diese Übersicht",
    "Details zu Gästen stehen nur im Wirt-Dashboard.",
  ].join("\n");
}

/** Hinweis, wenn automatische Meldungen gerade gar nicht kommen können. */
function pausenHinweis(slug) {
  const d = ladeBetrieb(slug);
  const e = telegramEinstellungen(d);
  if (d.demoBetrieb) return "ℹ️ Demo-Betrieb: Es werden keine automatischen Meldungen verschickt.";
  if (!e.aktiv) return "ℹ️ Automatische Meldungen sind im Wirt-Dashboard ausgeschaltet.";
  const zeilen = Array.isArray(d.oeffnungszeiten) ? d.oeffnungszeiten : [];
  if (e.zeitfenster === "oeffnungszeiten" && !zeilen.length) {
    return "⚠️ Automatische Meldungen pausieren: Für diesen Betrieb sind keine Öffnungszeiten hinterlegt. Bitte im Wirt-Dashboard (Reiter „Telegram“) einstellen.";
  }
  return "";
}

// Falsche Verknüpfungscodes: höchstens 5 je Chat in 15 Minuten (Befund O-08).
const CODE_FEHLVERSUCHE_MAX = 5;
const codeFehlversuche = new Bremse({ fensterMs: 15 * 60_000 });

/** Für Tests. */
export function setzeCodeBremseZurueck() {
  codeFehlversuche.leeren();
}

/* ------------------------------------------------------------------ */
/* Eingehende Updates                                                  */
/* ------------------------------------------------------------------ */

const OFFEN_MAX = 10;

/** Offene Vorgänge einzeln mit Knöpfen – nur die Arten dieses Chats. */
async function sendeOffene(antworte, zugaenge) {
  let anzahl = 0;
  for (const { slug, arten } of zugaenge) {
    const d = ladeBetrieb(slug);
    const liste = [
      ...(arten.includes("reservierung") ? d.reservierungen.filter((r) => r.status === "neu").map((e) => ["reservierung", e]) : []),
      ...(arten.includes("bestellung") ? d.bestellungen.filter(LAUFEND).map((e) => ["bestellung", e]) : []),
    ];
    for (const [art, e] of liste.slice(0, OFFEN_MAX)) {
      const n = vorgangsNachricht(art, e, d, slug, { titel: art === "reservierung" ? "Offene Reservierung" : "Bestellung", jetzt: uhrHook.jetzt() });
      await antworte(n.text, n.reply_markup ? { reply_markup: n.reply_markup } : {});
    }
    if (liste.length > OFFEN_MAX) await antworte(`… und ${liste.length - OFFEN_MAX} weitere bei ${betriebsName(d, slug)} – siehe Wirt-Dashboard.`);
    anzahl += liste.length;
  }
  if (!anzahl) await antworte("Nichts offen.");
  return anzahl;
}

export async function verarbeiteUpdate(update, { betriebe = alleBetriebe(), bot = "standard" } = {}) {
  if (update.callback_query) return verarbeiteKnopf(update.callback_query, betriebe, bot);
  const nachricht = update.message;
  if (!nachricht?.text) return null;
  const chatId = nachricht.chat.id;
  const antworte = (text, extra = {}) => api("sendMessage", { chat_id: chatId, text, ...extra }, bot);
  const [roh, ...rest] = nachricht.text.trim().split(/\s+/);
  // In Gruppen hängt Telegram den Bot-Namen an: /start@MeinLokalBot CODE
  const befehl = roh.replace(/@\w+$/, "");
  const zugaenge = zugaengeFuerChat(bot, chatId, betriebe);

  if (befehl === "/start" || befehl === "/verknuepfen") {
    const code = rest[0];
    if (code) {
      const schluessel = `${bot}|${chatId}`;
      if (codeFehlversuche.anzahl(schluessel) >= CODE_FEHLVERSUCHE_MAX) {
        await antworte("Zu viele ungültige Codes. Bitte 15 Minuten warten und dann einen neuen Code im Wirt-Dashboard erzeugen.");
        return { aktion: "code-gesperrt" };
      }
      const e = loeseCodeEinFuerChat(code, chatId, { betriebe, bot });
      if (e.ok) {
        const d = ladeBetrieb(e.slug);
        const arten = e.kanal === "gemeinsam" ? ["reservierung", "bestellung"] : [e.kanal];
        const hinweis = pausenHinweis(e.slug);
        await antworte(`Verbunden mit „${betriebsName(d, e.slug)}“ für ${KANAL_NAME[e.kanal]}.${hinweis ? `\n${hinweis}` : ""}\n\n${hilfe(arten)}`);
        return e.kanal === "gemeinsam" ? { aktion: "verknuepft", slug: e.slug } : { aktion: "verknuepft", slug: e.slug, kanal: e.kanal };
      }
      codeFehlversuche.zaehle(schluessel);
      await antworte(e.text);
      return { aktion: e.grund === "unbekannt" ? "code-ungueltig" : e.grund };
    }
    if (zugaenge.length) {
      const teile = zugaenge.map(({ slug, arten }) => `„${betriebsName(ladeBetrieb(slug), slug)}“ (${arten.length ? arten.map((a) => ART_TEXT[a]).join(" und ") : "derzeit keine Meldungen"})`);
      await antworte(`Dieser Chat ist verbunden mit ${teile.join(", ")}.\n\n${hilfe(zugaenge.flatMap((z) => z.arten))}`);
    } else {
      await antworte("Hallo! Zum Verbinden bitte im Wirt-Dashboard unter „Telegram“ einen Code erzeugen und hier „/start CODE“ senden.");
    }
    return { aktion: "start" };
  }
  if (!zugaenge.length) {
    await antworte("Dieser Chat ist noch mit keinem Betrieb verbunden. Code aus dem Wirt-Dashboard mit „/start CODE“ senden.");
    return { aktion: "unverknuepft" };
  }
  const slug = zugaenge[0].slug;
  if (befehl === "/heute") {
    for (const z of zugaenge) {
      if (!z.arten.length) {
        await antworte(`Für „${betriebsName(ladeBetrieb(z.slug), z.slug)}“ bekommt dieser Chat derzeit keine Meldungen (im Wirt-Dashboard ist ein anderer Chat eingestellt).`);
        continue;
      }
      const hinweis = pausenHinweis(z.slug);
      await antworte(tagesuebersicht(z.slug, undefined, { arten: z.arten, titel: "📅 Heute", jetzt: uhrHook.jetzt() }) + (hinweis ? `\n${hinweis}` : ""));
    }
    return { aktion: "heute", slug };
  }
  if (befehl === "/offen") {
    if (zugaenge.every((z) => !z.arten.length)) {
      await antworte("Dieser Chat bekommt derzeit keine Meldungen – im Wirt-Dashboard ist ein anderer Chat eingestellt.");
      return { aktion: "offen", slug, anzahl: 0 };
    }
    const anzahl = await sendeOffene(antworte, zugaenge);
    return { aktion: "offen", slug, anzahl };
  }
  if (befehl === "/abmelden") {
    const getrennt = trenneChat(bot, chatId, betriebe);
    await antworte("Getrennt. Es kommen keine Nachrichten mehr hierher; das Dashboard funktioniert wie gewohnt.");
    return { aktion: "abgemeldet", slug, betriebe: getrennt };
  }
  const hinweis = pausenHinweis(slug);
  await antworte(hilfe(zugaenge.flatMap((z) => z.arten)) + (hinweis ? `\n\n${hinweis}` : ""));
  return { aktion: "hilfe", slug };
}

/**
 * Zulässige Übergänge per Telegram-Knopf. Ein erneut gedrückter Knopf ändert
 * nichts (gleicher Zielzustand); alles andere – etwa ein alter Knopf nach
 * einer Entscheidung im Dashboard – wird abgelehnt statt still umgestellt.
 */
const RESERVIERUNG_KNOPF = { ok: { ziel: "bestaetigt", von: ["neu"] }, ab: { ziel: "abgesagt", von: ["neu"] } };
const BESTELLUNG_KNOPF = {
  zub: { ziel: "in-zubereitung", von: ["neu"] },
  bereit: { ziel: "bereit", von: ["in-zubereitung"] },
  weg: { ziel: "abgeholt", von: ["bereit"] },
  ab: { ziel: "abgelehnt", von: ["neu"] },
};
const RES_STATUS_TEXT = { neu: "offen", bestaetigt: "bestätigt", abgesagt: "abgesagt" };

async function verarbeiteKnopf(knopf, betriebe, bot) {
  const chatId = knopf.message?.chat?.id;
  const [art, aktion, id] = String(knopf.data ?? "").split(":");
  const quittung = (text) => api("answerCallbackQuery", { callback_query_id: knopf.id, text }, bot);
  const zugaenge = zugaengeFuerChat(bot, chatId, betriebe);

  if (art === "o") {
    // „Einzeln anzeigen“ unter einer Sammelmeldung
    if (!zugaenge.length) {
      await quittung("Dieser Chat ist mit keinem Betrieb verbunden.");
      return { aktion: "verweigert" };
    }
    const nur = { r: ["reservierung"], b: ["bestellung"], a: ["reservierung", "bestellung"] }[aktion] ?? [];
    await quittung("Einzeln …");
    const anzahl = await sendeOffene((text, extra = {}) => api("sendMessage", { chat_id: chatId, text, ...extra }, bot), zugaenge.map((z) => ({ ...z, arten: z.arten.filter((a) => nur.includes(a)) })));
    return { aktion: "offen-einzeln", anzahl };
  }

  const vorgangsArt = { r: "reservierung", b: "bestellung" }[art];
  if (!vorgangsArt) {
    await quittung("Unbekannter Knopf");
    return { aktion: "fehler", fehler: "Unbekannter Knopf" };
  }
  if (!zugaenge.length) {
    await quittung("Dieser Chat ist mit keinem Betrieb verbunden.");
    return { aktion: "verweigert" };
  }
  // Richtiger Chat und richtiger Bot: nur wo dieser Chat für diese Art konfiguriert ist.
  const zustaendig = zugaenge.filter((z) => z.arten.includes(vorgangsArt));
  if (!zustaendig.length) {
    await quittung(`Dieser Chat ist nicht für ${ART_TEXT[vorgangsArt]} eingerichtet.`);
    return { aktion: "verweigert" };
  }
  // Richtiger Betrieb: der Vorgang muss zu einem dieser Betriebe gehören.
  const liste = vorgangsArt === "reservierung" ? "reservierungen" : "bestellungen";
  const slug = zustaendig.find((z) => ladeBetrieb(z.slug)[liste].some((x) => x.id === id))?.slug;
  if (!slug) {
    await quittung("Vorgang nicht gefunden.");
    return { aktion: "verweigert" };
  }

  try {
    const vorher = ladeBetrieb(slug)[liste].find((x) => x.id === id);
    let geaendert = false;
    if (vorgangsArt === "reservierung") {
      const regel = RESERVIERUNG_KNOPF[aktion];
      if (!regel) throw new Error("Unbekannte Aktion");
      if (vorher.status !== regel.ziel) {
        if (!regel.von.includes(vorher.status)) throw new Error(`Nicht möglich: Die Reservierung ist bereits ${RES_STATUS_TEXT[vorher.status] ?? vorher.status}. Änderungen bitte im Wirt-Dashboard.`);
        if (aktion === "ok") bestaetigeReservierung(slug, id);
        else sageReservierungAb(slug, id);
        geaendert = true;
      }
    } else {
      const regel = BESTELLUNG_KNOPF[aktion];
      if (!regel) throw new Error("Unbekannte Aktion");
      const status = kuechenStatusVon(vorher);
      if (status !== regel.ziel) {
        if (!regel.von.includes(status)) throw new Error(`Nicht möglich: Die Bestellung ist bereits „${status}“. Änderungen bitte im Wirt-Dashboard.`);
        setzeKuechenStatus(slug, id, regel.ziel);
        geaendert = true;
      }
    }
    // Gastmeldung zustellen (entstanden beim Speichern, wie bei einem Klick
    // im Dashboard). Ein doppelt gedrückter Knopf ändert nichts und
    // verschickt deshalb auch nichts.
    if (geaendert) await stelleGastMeldungenZu(slug);
    const stand = ladeBetrieb(slug);
    const eintrag = stand[liste].find((x) => x.id === id);
    const n = vorgangsNachricht(vorgangsArt, eintrag, stand, slug, { titel: vorgangsArt === "reservierung" ? "Reservierung" : "Bestellung", jetzt: uhrHook.jetzt() });
    const gast = wirtGastHinweis(vorgangsArt, eintrag, stand.gastMeldungen ?? []);
    // Ohne Telefonnummer: die steht im Dashboard.
    const text = gast?.anrufNoetig ? `${n.text}\n⚠️ Gast nicht automatisch informiert – bitte anrufen (Nummer im Wirt-Dashboard).` : n.text;
    if (geaendert) {
      // Die Nachricht zu aktualisieren ist Komfort: Scheitert es, gilt die Aktion trotzdem.
      await api("editMessageText", { chat_id: chatId, message_id: knopf.message.message_id, text, ...(n.reply_markup ? { reply_markup: n.reply_markup } : {}) }, bot).catch(() => {});
    }
    await quittung(geaendert ? "Erledigt" : "War schon erledigt");
    return { aktion: `${art}:${aktion}`, slug, id };
  } catch (e) {
    await quittung(e.message.slice(0, 190));
    return { aktion: "fehler", fehler: e.message };
  }
}

/* ------------------------------------------------------------------ */
/* Dienst                                                              */
/* ------------------------------------------------------------------ */

const warte = (ms) => new Promise((r) => setTimeout(r, ms).unref?.());

function starteAbruf(rolle, { log, betriebe }) {
  let laeuft = true;
  let offset = 0;
  (async () => {
    while (laeuft) {
      try {
        const updates = await api("getUpdates", { offset, timeout: 30, allowed_updates: ["message", "callback_query"] }, rolle);
        for (const u of updates ?? []) {
          offset = u.update_id + 1;
          const ergebnis = await verarbeiteUpdate(u, { bot: rolle, betriebe: betriebe() }).catch((e) => ({ fehler: e.message }));
          if (ergebnis) log(`Telegram (${rolle}): ${JSON.stringify(ergebnis)}`);
        }
      } catch (e) {
        if (!laeuft) break;
        if (Number(e.status) === 409) {
          log(`Telegram (${rolle}): Ein anderer Prozess ruft für diesen Bot bereits Updates ab – neuer Versuch in 30 s.`);
          await warte(30_000);
        } else {
          log(`Telegram (${rolle}) nicht erreichbar (${e.message}) – neuer Versuch in 5 s`);
          await warte(5000);
        }
      }
    }
  })();
  return () => {
    laeuft = false;
  };
}

/**
 * Long Polling (kein öffentlicher Webhook nötig – läuft auch hinter NAT auf
 * dem Rechner im Lokal) – ein Abruf je eingerichtetem Bot-Token – plus der
 * Planer (Nachmelden, Erinnerungen, Tagesübersicht) im festen Takt.
 */
export function starteDienst({ log = console.log, taktMs = 30_000, sperrDir = SPERR_DIR, betriebe = () => alleBetriebe() } = {}) {
  const bots = konfigurierteBots();
  if (!bots.length) throw new Error("TELEGRAM_BOT_TOKEN fehlt – siehe v2/integration/TELEGRAM-SETUP.md");
  for (const rolle of BOT_ROLLEN.filter(botDoppelt)) log(`Telegram: Der Token für „${rolle}“ ist derselbe wie für einen anderen Bot – er wird nicht ein zweites Mal abgefragt.`);

  const stopps = [];
  const abrufe = [];
  for (const { rolle, token } of bots) {
    const sperre = sichereSperre(`abruf-${tokenKennung(token)}`, sperrDir);
    if (!sperre.ok) {
      log(`Telegram (${rolle}): Abruf ${sperre.grund} – hier kein zweiter Abruf.`);
      continue;
    }
    abrufe.push(rolle);
    stopps.push(starteAbruf(rolle, { log, betriebe }), sperre.freigeben);
  }

  // Planer: je Betrieb höchstens einer (Sperre wird beim ersten Durchlauf gesetzt und gehalten).
  const planerSperren = new Map();
  const eigene = () =>
    betriebe().filter((slug) => {
      if (planerSperren.has(slug)) return true;
      const sperre = sichereSperre(`planer-${slug}`, sperrDir);
      if (sperre.ok) planerSperren.set(slug, sperre.freigeben);
      return sperre.ok;
    });
  let laeuft = false;
  const takt = async () => {
    if (laeuft) return;
    laeuft = true;
    try {
      const bericht = await fuehreTaktAus({ betriebe: eigene(), jetzt: uhrHook.jetzt() });
      if (bericht.nachrichten) log(`Telegram: ${bericht.nachrichten} Meldung(en) nachgeholt/erinnert.`);
      if (bericht.uebersichten.length) log(`Tagesübersicht an ${bericht.uebersichten.join(", ")}`);
      for (const f of bericht.fehler) log(`Telegram-Planer ${f.slug}: ${f.fehler}`);
    } catch (e) {
      // Ohne .catch beendete ein einzelner Fehler (Netz, unlesbare Datei) den Prozess.
      log(`Telegram-Planer fehlgeschlagen (${e.message}) – neuer Versuch im nächsten Takt`);
    } finally {
      laeuft = false;
    }
  };
  const intervall = setInterval(takt, taktMs);
  takt();

  const stop = () => {
    clearInterval(intervall);
    for (const s of stopps) s();
    for (const freigeben of planerSperren.values()) freigeben();
    planerSperren.clear();
  };
  stop.abrufe = abrufe;
  return stop;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { config } = await import("dotenv");
  config();
  try {
    const stop = starteDienst();
    console.log(`🤖 Telegram-Dienst läuft für ${alleBetriebe().length} Betrieb(e), Bots: ${stop.abrufe.join(", ") || "keiner (bereits anderswo aktiv)"}. Beenden mit Strg+C.`);
  } catch (e) {
    console.log(`⚠️  ${e.message}`);
    process.exitCode = 1;
  }
}
