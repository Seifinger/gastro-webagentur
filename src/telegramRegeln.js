// Regeln für Telegram-Benachrichtigungen an den Wirt: ob, wohin, wann und
// mit welchem Inhalt. Eine Stelle für v1-Rückkanal (src/wirtServer.js) und
// v2-Bot (v2/integration/telegramBot.js) – damit beide dieselben Zeiten,
// dieselben Ziele und dieselbe Datensparsamkeit einhalten.
//
// Maßgeblich bleibt das Wirt-Dashboard. Telegram ist ein optionaler Alarm-
// und Aktionskanal; nichts hier entscheidet über Annahme oder Status eines
// Vorgangs.
//
// Gespeichert wird je Betrieb (data/betrieb/<slug>.json):
//   telegramBenachrichtigung  Einstellungen (siehe TELEGRAM_EINSTELLUNGEN_STANDARD)
//   telegramChatId            der bisherige gemeinsame Chat (Modus „ein-chat“, v1-Feld)
//   telegramKanaele           { reservierung|bestellung: { links: { <bot>: { chatId, verknuepftAm } }, code, codeAblauf, codeBot } }
//   telegramZustand           letzter Erfolg / letzter Fehler beim Versand
// Fehlen die Felder, gelten die Standardwerte – gelesen wird ohne zu schreiben.

import { ladeBetrieb, speichereBetrieb, uhrHook } from "./betriebStore.js";
import { referenzVon } from "./gastStatus.js";
import { benachrichtigungsFenster, fensterUebersicht, wochentagVon } from "./telegramZeitfenster.js";
import { datumIn, uhrzeitIn, ZEITZONE_STANDARD } from "./abholzeiten.js";

/* ------------------------------------------------------------------ */
/* Einstellungen                                                       */
/* ------------------------------------------------------------------ */

export const TELEGRAM_EINSTELLUNGEN_STANDARD = Object.freeze({
  aktiv: true,
  arten: "beide",
  modus: "ein-chat",
  // Rund um die Uhr ist nie die Voreinstellung.
  zeitfenster: "oeffnungszeiten",
  vorlaufMinuten: 30,
  nachlaufMinuten: 30,
  erinnerungReservierung: true,
  erinnerungBestellung: true,
  fristReservierungMinuten: 2,
  fristBestellungMinuten: 2,
});

export const TELEGRAM_GRENZEN = Object.freeze({
  vorlauf: { min: 0, max: 180 },
  nachlauf: { min: 0, max: 180 },
  frist: { min: 1, max: 60 },
});

export const TELEGRAM_ARTEN = ["beide", "reservierungen", "bestellungen"];
export const TELEGRAM_MODI = ["ein-chat", "zwei-chats", "zwei-bots"];
export const TELEGRAM_ZEITFENSTER = ["oeffnungszeiten", "rund-um-die-uhr"];

const ganzzahlIn = (wert, grenze) => Number.isInteger(wert) && wert >= grenze.min && wert <= grenze.max;

/** Die geltenden Einstellungen – gespeicherte Werte, sonst Standard. Schreibt nie. */
export function telegramEinstellungen(daten) {
  const roh = daten?.telegramBenachrichtigung ?? {};
  const s = TELEGRAM_EINSTELLUNGEN_STANDARD;
  const bool = (k) => (typeof roh[k] === "boolean" ? roh[k] : s[k]);
  const zahl = (k, grenze) => (ganzzahlIn(roh[k], grenze) ? roh[k] : s[k]);
  return {
    aktiv: bool("aktiv"),
    arten: TELEGRAM_ARTEN.includes(roh.arten) ? roh.arten : s.arten,
    modus: TELEGRAM_MODI.includes(roh.modus) ? roh.modus : s.modus,
    zeitfenster: TELEGRAM_ZEITFENSTER.includes(roh.zeitfenster) ? roh.zeitfenster : s.zeitfenster,
    vorlaufMinuten: zahl("vorlaufMinuten", TELEGRAM_GRENZEN.vorlauf),
    nachlaufMinuten: zahl("nachlaufMinuten", TELEGRAM_GRENZEN.nachlauf),
    erinnerungReservierung: bool("erinnerungReservierung"),
    erinnerungBestellung: bool("erinnerungBestellung"),
    fristReservierungMinuten: zahl("fristReservierungMinuten", TELEGRAM_GRENZEN.frist),
    fristBestellungMinuten: zahl("fristBestellungMinuten", TELEGRAM_GRENZEN.frist),
  };
}

/**
 * Prüft eine (auch teilweise) Änderung und liefert die vollständigen neuen
 * Einstellungen. Wirft mit einer verständlichen Meldung.
 */
export function pruefeTelegramEinstellungen(eingabe, bisher = TELEGRAM_EINSTELLUNGEN_STANDARD) {
  const e = eingabe && typeof eingabe === "object" ? eingabe : {};
  const neu = { ...bisher };
  const hat = (k) => Object.prototype.hasOwnProperty.call(e, k) && e[k] !== undefined;

  for (const k of ["aktiv", "erinnerungReservierung", "erinnerungBestellung"]) {
    if (!hat(k)) continue;
    if (typeof e[k] !== "boolean") throw new Error(`„${k}“ muss an oder aus sein.`);
    neu[k] = e[k];
  }
  const auswahl = (k, erlaubt, text) => {
    if (!hat(k)) return;
    if (!erlaubt.includes(e[k])) throw new Error(text);
    neu[k] = e[k];
  };
  auswahl("arten", TELEGRAM_ARTEN, "Bitte wählen: Reservierungen und Bestellungen, nur Reservierungen oder nur Bestellungen.");
  auswahl("modus", TELEGRAM_MODI, "Unbekannter Chat-Modus.");
  auswahl("zeitfenster", TELEGRAM_ZEITFENSTER, "Bitte wählen: nach Öffnungszeiten oder rund um die Uhr.");
  const minuten = (k, grenze, bezeichnung) => {
    if (!hat(k)) return;
    const wert = typeof e[k] === "string" && e[k].trim() !== "" ? Number(e[k]) : e[k];
    if (!ganzzahlIn(wert, grenze)) throw new Error(`${bezeichnung} muss eine ganze Zahl zwischen ${grenze.min} und ${grenze.max} Minuten sein.`);
    neu[k] = wert;
  };
  minuten("vorlaufMinuten", TELEGRAM_GRENZEN.vorlauf, "Der Vorlauf vor Öffnung");
  minuten("nachlaufMinuten", TELEGRAM_GRENZEN.nachlauf, "Der Nachlauf nach Schließung");
  minuten("fristReservierungMinuten", TELEGRAM_GRENZEN.frist, "Die Erinnerungsfrist für Reservierungen");
  minuten("fristBestellungMinuten", TELEGRAM_GRENZEN.frist, "Die Erinnerungsfrist für Bestellungen");

  if (neu.modus === "zwei-bots" && bisher.modus !== "zwei-bots" && !zweiBotsVerfuegbar()) {
    throw new Error("Zwei eigene Bots sind auf dem Server nicht eingerichtet: Es fehlen TELEGRAM_BOT_TOKEN_RESERVIERUNG und TELEGRAM_BOT_TOKEN_BESTELLUNG (zwei verschiedene Tokens). Bis dahin bitte „Zwei Chats mit einem Bot“ nutzen.");
  }
  return neu;
}

/** Speichert geprüfte Einstellungen dauerhaft am Betrieb. */
export function setzeTelegramEinstellungen(slug, eingabe, jetzt = new Date()) {
  const daten = ladeBetrieb(slug);
  const neu = pruefeTelegramEinstellungen(eingabe, telegramEinstellungen(daten));
  daten.telegramBenachrichtigung = { ...neu, geaendertAm: new Date(jetzt).toISOString() };
  speichereBetrieb(slug, daten);
  return neu;
}

/* ------------------------------------------------------------------ */
/* Bots (Tokens nur aus der Umgebung, nie aus Dateien)                 */
/* ------------------------------------------------------------------ */

const BOT_UMGEBUNG = {
  standard: { token: "TELEGRAM_BOT_TOKEN", name: "TELEGRAM_BOT_NAME" },
  reservierung: { token: "TELEGRAM_BOT_TOKEN_RESERVIERUNG", name: "TELEGRAM_BOT_NAME_RESERVIERUNG" },
  bestellung: { token: "TELEGRAM_BOT_TOKEN_BESTELLUNG", name: "TELEGRAM_BOT_NAME_BESTELLUNG" },
};
export const BOT_ROLLEN = Object.keys(BOT_UMGEBUNG);

const rohToken = (rolle) => String(process.env[BOT_UMGEBUNG[rolle]?.token] ?? "").trim();

/**
 * Token eines Bots. Ist derselbe Token schon für eine frühere Rolle
 * eingetragen, gilt er nicht als eigener Bot – sonst würden zwei Abrufe
 * denselben Token abfragen und Nachrichten zwischen „Bots“ verschwimmen.
 */
export function botToken(rolle) {
  const token = rohToken(rolle);
  if (!token) return "";
  const frueher = BOT_ROLLEN.slice(0, BOT_ROLLEN.indexOf(rolle));
  return frueher.some((r) => rohToken(r) === token) ? "" : token;
}

export function botDoppelt(rolle) {
  return Boolean(rohToken(rolle)) && !botToken(rolle);
}

export function botName(rolle) {
  return String(process.env[BOT_UMGEBUNG[rolle]?.name] ?? "").trim().replace(/^@/, "");
}

export function konfigurierteBots() {
  return BOT_ROLLEN.filter((r) => botToken(r)).map((rolle) => ({ rolle, token: botToken(rolle) }));
}

export function zweiBotsVerfuegbar() {
  return Boolean(botToken("reservierung") && botToken("bestellung"));
}

/* ------------------------------------------------------------------ */
/* Ziele                                                               */
/* ------------------------------------------------------------------ */

export const VORGANG_ARTEN = ["reservierung", "bestellung"];

export function artAktiv(einstellungen, art) {
  return einstellungen.arten === "beide" || einstellungen.arten === `${art}en`;
}

/** Welcher Bot bedient eine Art im gewählten Modus? */
export function botFuerArt(modus, art) {
  return modus === "zwei-bots" ? art : "standard";
}

export function kanalLink(daten, art, bot) {
  const link = daten?.telegramKanaele?.[art]?.links?.[bot];
  return link && String(link.chatId ?? "").trim() ? link : null;
}

/**
 * Wohin eine Meldung dieser Art geht – genau ein Ziel oder keines. Es gibt
 * keinen Ersatzweg: Ist der konfigurierte Chat nicht verbunden, geht nichts
 * raus (der bisherige gemeinsame Chat bekommt im Zwei-Chat-Modus nichts).
 */
export function zielFuer(daten, art, einstellungen = telegramEinstellungen(daten)) {
  if (einstellungen.modus === "ein-chat") {
    const chatId = String(daten?.telegramChatId ?? "").trim();
    return chatId ? { bot: "standard", chatId, kanal: "gemeinsam" } : null;
  }
  const bot = botFuerArt(einstellungen.modus, art);
  const link = kanalLink(daten, art, bot);
  return link ? { bot, chatId: String(link.chatId), kanal: art } : null;
}

export const GRUND_TEXT = {
  demo: "Demo-Betrieb – es wird nichts an Telegram gesendet.",
  aus: "Telegram-Benachrichtigungen sind ausgeschaltet.",
  "art-aus": "Für diese Art sind Telegram-Benachrichtigungen ausgeschaltet.",
  "kein-chat": "Es ist kein Telegram-Chat verbunden.",
  "kein-token": "Der Bot ist auf dem Server nicht eingerichtet (Token fehlt).",
  ausserhalb: "Außerhalb der Telegram-Zeiten.",
  "keine-oeffnungszeiten": "Keine Öffnungszeiten hinterlegt – Telegram-Zeiten nicht berechenbar.",
};

/**
 * Käme eine Meldung dieser Art grundsätzlich an? (ohne Uhrzeit)
 * @returns {{ ok: boolean, grund: string, ziel: object|null, einstellungen: object }}
 */
export function meldungMoeglich(daten, art) {
  const einstellungen = telegramEinstellungen(daten);
  const ziel = zielFuer(daten, art, einstellungen);
  const ergebnis = (grund) => ({ ok: !grund, grund, ziel, einstellungen });
  if (daten?.demoBetrieb) return ergebnis("demo");
  if (!einstellungen.aktiv) return ergebnis("aus");
  if (!artAktiv(einstellungen, art)) return ergebnis("art-aus");
  if (!ziel) return ergebnis("kein-chat");
  if (!botToken(ziel.bot)) return ergebnis("kein-token");
  return ergebnis("");
}

/** Wie meldungMoeglich, dazu das Zeitfenster zum Zeitpunkt jetzt. */
export function darfJetztMelden(daten, art, jetzt = uhrHook.jetzt()) {
  const m = meldungMoeglich(daten, art);
  if (!m.ok) return m;
  const fenster = benachrichtigungsFenster(daten, m.einstellungen, { jetzt, tageVoraus: 1 });
  if (fenster.jetztErlaubt) return m;
  return { ...m, ok: false, grund: fenster.zustand === "keine-oeffnungszeiten" ? "keine-oeffnungszeiten" : "ausserhalb" };
}

/** Wartet ein Vorgang noch auf die Entscheidung des Wirts? */
export function istOffen(art, eintrag) {
  return eintrag?.status === "neu";
}

export function fristMinuten(einstellungen, art) {
  return art === "reservierung" ? einstellungen.fristReservierungMinuten : einstellungen.fristBestellungMinuten;
}

export function erinnerungAn(einstellungen, art) {
  return art === "reservierung" ? einstellungen.erinnerungReservierung : einstellungen.erinnerungBestellung;
}

/* ------------------------------------------------------------------ */
/* Inhalte – nur, was als Alarm nötig ist                              */
/* ------------------------------------------------------------------ */
//
// Nie an Telegram: Namen, Telefonnummern, E-Mail-Adressen, freie Wünsche und
// Hinweise (können Allergien/Gesundheitsangaben enthalten), Bestellpositionen,
// Summen, No-Show-Zustimmungen, Rechnungen, Status- oder Zugriffstokens.
// Details stehen im geschützten Wirt-Dashboard.

const WOCHENTAG_KURZ = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function betriebsName(daten, slug = "") {
  return String(daten?.anzeigeName || slug || "Betrieb").trim();
}

export function datumKurz(datum) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(datum ?? ""))) return String(datum ?? "");
  const [j, m, t] = datum.split("-");
  return `${WOCHENTAG_KURZ[wochentagVon(datum)]} ${t}.${m}.${j}`;
}

export const RESERVIERUNG_STATUS_TEXT = { neu: "offen – noch nicht bestätigt", bestaetigt: "bestätigt", abgesagt: "abgesagt" };

/** „RES-1234 · Sa 26.09.2026 · 19:00 Uhr · 4 Personen“ */
export function reservierungZeile(r) {
  const p = Number(r.personen) || 0;
  return `${referenzVon("reservierung", r)} · ${datumKurz(r.datum)} · ${r.uhrzeit} Uhr · ${p} ${p === 1 ? "Person" : "Personen"}`;
}

/** „AB-1234 · Abholung 18:30 Uhr (gewünscht)“ – mit Datum, falls nicht heute. */
export function bestellungZeile(b, { zeitzone = ZEITZONE_STANDARD, jetzt = uhrHook.jetzt() } = {}) {
  const bestaetigt = Boolean(b.bestaetigteAbholzeit) && b.status !== "neu";
  const zeit = bestaetigt ? b.bestaetigteAbholzeit : b.abholzeit;
  const art = bestaetigt ? "bestätigt" : b.abholArt === "asap" ? "so schnell wie möglich" : "gewünscht";
  const bezug = b.abholZeitpunkt || b.eingegangen;
  let tag = "";
  if (bezug && !Number.isNaN(new Date(bezug).getTime())) {
    const datum = datumIn(new Date(bezug).getTime(), zeitzone);
    if (datum !== datumIn(new Date(jetzt).getTime(), zeitzone)) tag = ` am ${datumKurz(datum)}`;
  }
  return `${referenzVon("bestellung", b)} · Abholung${tag} ${zeit} Uhr (${art})`;
}

/** Eingangszeit in der Zeit des Betriebs, z. B. „23:47“. */
export function eingangUhrzeit(eintrag, zeitzone = ZEITZONE_STANDARD) {
  const t = new Date(eintrag?.eingegangen ?? "").getTime();
  return Number.isNaN(t) ? "" : uhrzeitIn(t, zeitzone);
}

/**
 * Text für den v1-Rückkanal (src/wirtServer.js, reiner Text ohne Knöpfe).
 * Dieselben Zeilen wie im v2-Bot.
 */
export function rueckkanalText(art, eintrag, daten, slug) {
  const kopf = art === "reservierung" ? "🪑 Neue Reservierung" : "🥡 Neue Bestellung";
  const zeile = art === "reservierung" ? reservierungZeile(eintrag) : bestellungZeile(eintrag, { zeitzone: daten?.zeitzone || ZEITZONE_STANDARD });
  return `${kopf} · ${betriebsName(daten, slug)}\n${zeile}\nDetails im Wirt-Dashboard.`;
}

/* ------------------------------------------------------------------ */
/* Stand fürs Wirt-Dashboard                                           */
/* ------------------------------------------------------------------ */

const PROBLEM_ZUSTAENDE = new Set(["wiederholen", "fehlgeschlagen", "unklar"]);

function problemeVon(daten, jetzt) {
  const grenze = new Date(jetzt).getTime() - 7 * 86_400_000;
  const liste = [];
  for (const [art, schluessel] of [["reservierung", "reservierungen"], ["bestellung", "bestellungen"]]) {
    for (const e of daten?.[schluessel] ?? []) {
      const t = e.telegram;
      if (!t) continue;
      for (const [anlass, stand] of [["Eingang", t.eingang], ["Erinnerung", t.erinnerung]]) {
        if (!stand || !PROBLEM_ZUSTAENDE.has(stand.zustand)) continue;
        const zeit = stand.letzterVersuch || e.eingegangen;
        if (new Date(zeit).getTime() < grenze) continue;
        liste.push({ art, referenz: referenzVon(art, e), anlass, zustand: stand.zustand, fehler: stand.fehler ?? "", zeit });
      }
    }
  }
  return liste.sort((a, b) => String(b.zeit).localeCompare(String(a.zeit))).slice(0, 20);
}

/** Alles, was der Reiter „Telegram“ zu den Zeiten und Einstellungen braucht. */
export function telegramStand(daten, { jetzt = uhrHook.jetzt() } = {}) {
  const einstellungen = telegramEinstellungen(daten);
  const fenster = fensterUebersicht(benachrichtigungsFenster(daten, einstellungen, { jetzt }));
  const ziele = {};
  for (const art of VORGANG_ARTEN) {
    const m = meldungMoeglich(daten, art);
    ziele[art] = { ok: m.ok, grund: m.grund, grundText: GRUND_TEXT[m.grund] ?? "", bot: m.ziel?.bot ?? botFuerArt(einstellungen.modus, art), verbunden: Boolean(m.ziel) };
  }
  return {
    einstellungen,
    standard: TELEGRAM_EINSTELLUNGEN_STANDARD,
    grenzen: TELEGRAM_GRENZEN,
    fenster,
    ziele,
    demo: Boolean(daten?.demoBetrieb),
    bots: {
      standard: Boolean(botToken("standard")),
      reservierung: Boolean(botToken("reservierung")),
      bestellung: Boolean(botToken("bestellung")),
      zweiBotsVerfuegbar: zweiBotsVerfuegbar(),
      doppelt: BOT_ROLLEN.filter(botDoppelt),
    },
    zustand: daten?.telegramZustand ?? null,
    probleme: problemeVon(daten, jetzt),
  };
}

/**
 * Ein Satz für die Kopfzeile des Dashboards, wenn Telegram eingerichtet ist,
 * aber gerade nicht melden kann – sonst leer.
 */
export function telegramHinweis(daten, jetzt = uhrHook.jetzt()) {
  const eingerichtet = VORGANG_ARTEN.some((art) => zielFuer(daten, art));
  if (!eingerichtet || daten?.demoBetrieb) return "";
  const einstellungen = telegramEinstellungen(daten);
  if (!einstellungen.aktiv) return "";
  const fenster = benachrichtigungsFenster(daten, einstellungen, { jetzt, tageVoraus: 1 });
  if (fenster.zustand === "keine-oeffnungszeiten") return "Telegram pausiert: Es sind keine Öffnungszeiten hinterlegt (Reiter „Telegram“).";
  if (problemeVon(daten, jetzt).some((p) => p.zustand !== "wiederholen")) return "Telegram: Nachrichten konnten nicht zugestellt werden (Reiter „Telegram“).";
  return "";
}

