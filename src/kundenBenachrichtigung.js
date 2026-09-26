// Benachrichtigt Gäste über ihre Reservierung oder Bestellung.
//
// Kanäle, in dieser Reihenfolge:
//   1. E-Mail – kostenlos für den Gast, freiwillig angegeben, nur für diese
//      eine Anfrage. In Produktion über Resend (RESEND_API_KEY und
//      GAST_EMAIL_ABSENDER, nur serverseitig aus der Umgebung), in Tests
//      über emailHook.
//   2. SMS – nur, wenn jemand ausdrücklich einen Anbieter in smsHook
//      einträgt (kostet Geld; dieses Projekt setzt keinen voraus) und keine
//      E-Mail-Adresse vorliegt.
//   3. Sonst: kein automatischer Kanal. Der Gast sieht den Stand über seinen
//      Status-Link, und das Wirt-Dashboard zeigt bei Ablehnung oder
//      geänderter Zeit „Gast nicht automatisch informiert – bitte anrufen“.
//
// Welche Nachricht fällig ist, entscheidet nicht dieses Modul, sondern die
// beim Speichern abgeleitete Meldung (betriebStore.js → gastMeldungen). Hier
// wird nur zugestellt – jede Meldung höchstens einmal, mit ihrer ID als
// Idempotenzschlüssel beim Anbieter.

import {
  ladeBetrieb,
  aendereGastMeldung,
  gastTokenFuer,
  betriebsKontakt,
} from "./betriebStore.js";
import { gastEmail } from "./gastStatus.js";

// Austauschbar für Tests und für einen anderen Anbieter, wie llmAufrufHook in
// promptEdits.js. Gesetzt haben sie Vorrang vor der Resend-Anbindung.
//   emailHook.aktuell(empfaenger, betreff, text, anhaenge?, { idempotenzSchluessel }?) → { id? }
//   smsHook.aktuell(telefon, text)
export const smsHook = { aktuell: null };
export const emailHook = { aktuell: null };

// Für Tests der Resend-Anbindung selbst (ohne echten Netzwerkaufruf).
export const fetchHook = { aktuell: (...args) => fetch(...args) };

// RESEND_API_BASIS lenkt auf eine Sandbox bzw. einen Test-Empfänger um (lokale
// End-to-End-Tests ohne echten Versand). Ohne Angabe: der echte Dienst.
const RESEND_API = `${String(process.env.RESEND_API_BASIS || "https://api.resend.com").replace(/\/+$/, "")}/emails`;

function smsKonfiguriert() {
  return typeof smsHook.aktuell === "function";
}

/**
 * Ist ein E-Mail-Versand eingerichtet? Gibt den Grund zurück, wenn nicht –
 * das Dashboard zeigt ihn an, statt einen Versand vorzutäuschen.
 */
export function emailEinrichtung() {
  if (typeof emailHook.aktuell === "function") return { eingerichtet: true, anbieter: "hook" };
  const schluessel = String(process.env.RESEND_API_KEY ?? "").trim();
  const absender = String(process.env.GAST_EMAIL_ABSENDER ?? "").trim();
  if (!schluessel) return { eingerichtet: false, grund: "E-Mail nicht eingerichtet: RESEND_API_KEY fehlt." };
  if (!absender) return { eingerichtet: false, grund: "E-Mail nicht eingerichtet: GAST_EMAIL_ABSENDER (verifizierte Absenderadresse) fehlt." };
  return { eingerichtet: true, anbieter: "resend" };
}

/**
 * Für Gast-Statusmails zusätzlich nötig: die öffentliche Adresse dieses
 * Servers, damit der Link in der E-Mail zur Statusseite führt.
 */
export function gastEmailEinrichtung() {
  const basis = emailEinrichtung();
  if (!basis.eingerichtet) return basis;
  if (!oeffentlicheBasisUrl()) {
    return { eingerichtet: false, grund: "E-Mail nicht eingerichtet: WIRT_OEFFENTLICHE_URL (öffentliche Adresse des Wirt-Servers) fehlt." };
  }
  return basis;
}

export function oeffentlicheBasisUrl() {
  const roh = String(process.env.WIRT_OEFFENTLICHE_URL ?? "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[^\s]+$/.test(roh) ? roh : "";
}

/**
 * Versand über die Resend-API. Liest Schlüssel und Absender ausschließlich
 * aus der Umgebung des Servers. Wirft bei jedem Fehler – ein Erfolg ist nur,
 * was Resend mit einer ID quittiert.
 */
export async function versendeUeberResend(empfaenger, betreff, text, anhaenge = [], { idempotenzSchluessel } = {}) {
  const schluessel = String(process.env.RESEND_API_KEY ?? "").trim();
  const absender = String(process.env.GAST_EMAIL_ABSENDER ?? "").trim();
  if (!schluessel || !absender) throw new Error("Resend ist nicht eingerichtet.");

  const koerper = { from: absender, to: [empfaenger], subject: betreff, text };
  const antwortAn = String(process.env.GAST_EMAIL_ANTWORT_AN ?? "").trim();
  if (antwortAn) koerper.reply_to = antwortAn;
  if (anhaenge?.length) {
    koerper.attachments = anhaenge.map((a) => ({
      filename: a.dateiname,
      content: Buffer.from(a.inhalt).toString("base64"),
    }));
  }

  const kopf = { Authorization: `Bearer ${schluessel}`, "Content-Type": "application/json" };
  // Resend verwirft eine Wiederholung mit demselben Schlüssel (24 h) –
  // zweite Sicherung gegen doppelte Mails, falls zwei Prozesse gleichzeitig
  // dieselbe Meldung aufgreifen.
  if (idempotenzSchluessel) kopf["Idempotency-Key"] = idempotenzSchluessel;

  let antwort;
  try {
    // Ein hängender Anbieter darf weder den Gast noch den Wirt warten lassen.
    antwort = await fetchHook.aktuell(RESEND_API, { method: "POST", headers: kopf, body: JSON.stringify(koerper), signal: AbortSignal.timeout(10_000) });
  } catch (fehler) {
    throw new Error(`Versanddienst nicht erreichbar (${fehler.message}).`);
  }
  const daten = await antwort.json().catch(() => ({}));
  if (!antwort.ok || !daten?.id) {
    throw new Error(`Versanddienst meldet Fehler (HTTP ${antwort.status}${daten?.message ? `: ${String(daten.message).slice(0, 160)}` : ""}).`);
  }
  return { id: daten.id };
}

function aktiverEmailVersand() {
  if (typeof emailHook.aktuell === "function") return emailHook.aktuell;
  return emailEinrichtung().eingerichtet ? versendeUeberResend : null;
}

/* ---------- Gastmeldungen zustellen ---------- */

// Innerhalb eines Prozesses läuft die Zustellung je Betrieb nacheinander:
// Zwei gleichzeitige Wirt-Klicks dürfen dieselbe Meldung nicht zweimal
// aufgreifen.
const warteschlangen = new Map();

function nacheinander(slug, fn) {
  const vorher = warteschlangen.get(slug) ?? Promise.resolve();
  const lauf = vorher.then(fn, fn);
  warteschlangen.set(slug, lauf.catch(() => {}));
  return lauf;
}

// Eine Meldung, die mitten im Versand hängen blieb (Absturz), darf nach
// dieser Zeit erneut versucht werden – mit demselben Idempotenzschlüssel.
const HAENGT_NACH_MS = 10 * 60_000;

/**
 * Stellt alle ausstehenden Gastmeldungen eines Betriebs zu. Wirft nie: Eine
 * gescheiterte Mail darf keine gespeicherte Änderung zurückrollen und keine
 * Anfrage des Wirts scheitern lassen – sie wird als "fehlgeschlagen"
 * vermerkt und ist im Dashboard erneut auslösbar.
 *
 * Gibt die bearbeiteten Meldungen zurück (mit ihrem neuen Versandstand).
 */
export function stelleGastMeldungenZu(slug) {
  return nacheinander(slug, async () => {
    const daten = ladeBetrieb(slug);
    const offen = (daten.gastMeldungen ?? []).filter((m) => m.versand?.zustand === "ausstehend");
    if (offen.length === 0) return [];

    // Je Reservierung/Bestellung nur die neueste offene Meldung: Wer in
    // einem Zug bestätigt und „bereit“ meldet, bekommt eine Mail, nicht zwei.
    const neueste = new Map();
    for (const m of offen) neueste.set(m.bezugId, m);
    const ergebnisse = [];

    for (const m of offen) {
      if (neueste.get(m.bezugId) !== m) {
        ergebnisse.push(aendereGastMeldung(slug, m.id, (meldung) => {
          meldung.versand.zustand = "ueberholt";
          return meldung;
        }));
        continue;
      }
      ergebnisse.push(await stelleEineZu(slug, m.id));
    }
    return ergebnisse;
  });
}

async function stelleEineZu(slug, meldungId) {
  // Vor dem Versand festhalten, dass er läuft – ein zweiter Prozess sieht
  // dann "wird-gesendet" und fasst die Meldung nicht an.
  const vorbereitung = aendereGastMeldung(slug, meldungId, (meldung, bezug, daten) => {
    if (meldung.versand.zustand !== "ausstehend") return { ueberspringen: true, meldung };
    if (!bezug) {
      meldung.versand.zustand = "fehlgeschlagen";
      meldung.versand.fehler = "Eintrag nicht mehr vorhanden.";
      return { ueberspringen: true, meldung };
    }
    if (daten.demoBetrieb) {
      meldung.versand.zustand = "demo";
      return { ueberspringen: true, meldung };
    }

    const email = String(bezug.email ?? "").trim();
    const telefon = String(bezug.telefon ?? "").trim();
    let kanal = "";
    if (email) {
      const einrichtung = gastEmailEinrichtung();
      if (einrichtung.eingerichtet) kanal = "email";
      else if (!(smsKonfiguriert() && telefon)) {
        meldung.versand.kanal = "email";
        meldung.versand.zustand = "nicht-eingerichtet";
        meldung.versand.fehler = einrichtung.grund;
        return { ueberspringen: true, meldung };
      }
    }
    if (!kanal && smsKonfiguriert() && telefon) kanal = "sms";
    if (!kanal) {
      meldung.versand.zustand = "keine-adresse";
      return { ueberspringen: true, meldung };
    }

    meldung.versand.kanal = kanal;
    meldung.versand.zustand = "wird-gesendet";
    meldung.versand.versuche += 1;
    meldung.versand.letzterVersuch = new Date().toISOString();
    meldung.versand.fehler = "";

    const token = gastTokenFuer(slug, meldung.art, bezug);
    const basis = oeffentlicheBasisUrl();
    const statusUrl = token && basis ? `${basis}/status#${token}` : "";
    const { betreff, text, kurz } = gastEmail(meldung, { betrieb: betriebsKontakt(slug, daten), statusUrl: statusUrl || "(Status-Link nicht verfügbar)" });
    return { ueberspringen: false, kanal, email, telefon, betreff, text, kurz, meldung: { ...meldung } };
  });

  if (vorbereitung.ueberspringen) return vorbereitung.meldung;

  try {
    let anbieterId = "";
    if (vorbereitung.kanal === "email") {
      const versand = aktiverEmailVersand();
      if (!versand) throw new Error("E-Mail nicht eingerichtet.");
      const ergebnis = await versand(vorbereitung.email, vorbereitung.betreff, vorbereitung.text, [], { idempotenzSchluessel: `gast-${meldungId}` });
      anbieterId = String(ergebnis?.id ?? "");
    } else {
      await smsHook.aktuell(vorbereitung.telefon, `${vorbereitung.betreff}\n${vorbereitung.kurz}`);
    }
    return aendereGastMeldung(slug, meldungId, (meldung) => {
      meldung.versand.zustand = "uebergeben";
      meldung.versand.anbieterId = anbieterId;
      return meldung;
    });
  } catch (fehler) {
    return aendereGastMeldung(slug, meldungId, (meldung) => {
      meldung.versand.zustand = "fehlgeschlagen";
      meldung.versand.fehler = String(fehler?.message ?? fehler).slice(0, 300);
      return meldung;
    });
  }
}

/**
 * Löst eine gescheiterte oder mangels Einrichtung liegengebliebene Meldung
 * erneut aus. Eine bereits übergebene Mail wird nie ein zweites Mal
 * geschickt.
 */
export async function versucheGastMeldungErneut(slug, meldungId) {
  aendereGastMeldung(slug, meldungId, (meldung) => {
    const z = meldung.versand.zustand;
    const haengt = z === "wird-gesendet" && Date.now() - new Date(meldung.versand.letzterVersuch).getTime() > HAENGT_NACH_MS;
    if (!["fehlgeschlagen", "nicht-eingerichtet"].includes(z) && !haengt) {
      throw new Error(z === "uebergeben" ? "Diese Nachricht wurde bereits übergeben – kein zweiter Versand." : "Diese Meldung kann nicht erneut versendet werden.");
    }
    meldung.versand.zustand = "ausstehend";
    return meldung;
  });
  await stelleGastMeldungenZu(slug);
  return ladeBetrieb(slug).gastMeldungen.find((m) => m.id === meldungId);
}

/* ---------- No-Show-Rechnung ---------- */

/**
 * Versendet die No-Show-Rechnung (PDF, siehe rechnungGenerator.js) an den
 * Gast – über denselben E-Mail-Weg wie oben. Ohne eingerichteten Versand
 * oder ohne hinterlegte Adresse passiert nichts; das Dashboard zeigt dann,
 * dass die Rechnung manuell verschickt werden muss (siehe wirtServer.js).
 */
export async function versendeRechnung({ email, betreff, text, anhaenge }) {
  const versand = aktiverEmailVersand();
  if (!versand || !String(email ?? "").trim()) return { versendet: false };

  try {
    await versand(email, betreff, text, anhaenge);
    return { versendet: true };
  } catch {
    return { versendet: false };
  }
}
