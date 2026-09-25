// Telegram-Meldungen an den Wirt: Eingang, Nachholen, Erinnerung.
//
// Grundsätze
//   • Telegram ist ein Alarmkanal. Nichts hier bestätigt, lehnt ab oder ändert
//     einen Vorgang; ein Telegram-Ausfall rollt keine Gastanfrage zurück.
//   • Gesendet wird nur im Benachrichtigungsfenster des Betriebs
//     (src/telegramZeitfenster.js). Außerhalb bleibt der Vorgang „zurück-
//     gestellt“ und wird beim nächsten Fenster nachgemeldet, falls er dann
//     noch offen ist – bei vielen Vorgängen als eine Sammelmeldung.
//   • Die Erinnerungsfrist (Standard 2 Minuten) beginnt erst, wenn der Wirt
//     den Vorgang per Telegram erfahren hat (sofort oder nachgemeldet).
//     Höchstens EINE Erinnerung je Vorgang; fällt sie in eine Pause, wird sie
//     genau einmal im nächsten Fenster nachgeholt.
//   • Der Stand steht dauerhaft am Vorgang (Feld telegram) – kein flüchtiger
//     setTimeout. Ein Planer-Durchlauf (fuehreTaktAus) findet nach einem
//     Neustart alles Fällige wieder.
//   • Vor jedem Versand wird frisch geladen und erneut geprüft (Fenster,
//     Einstellungen, Ziel, Status), und der Vorgang wird im selben
//     Schreibvorgang als „sendet“ markiert. So verschickt auch ein zweiter
//     Durchlauf nichts doppelt. Bricht der Prozess mitten im Versand ab, gilt
//     der Versand als „unklar“ und wird nicht wiederholt (lieber höchstens
//     einmal als doppelt).
//   • Fehlschläge: höchstens 3 Versuche (nach 1 und 5 Minuten), danach
//     „fehlgeschlagen“ – sichtbar im Wirt-Dashboard.
//
// Zustand je Vorgang:
//   telegram: {
//     eingang:    { zustand, grund, versuche, letzterVersuch, naechsterVersuch, gesendetAm, fehler, claim, sammel }
//                 zustand: sendet | gesendet | zurueckgestellt | nachgeholt | wiederholen | fehlgeschlagen | unklar | entfallen
//     fristAb:    ISO – ab hier läuft die Erinnerungsfrist
//     erinnerung: { zustand, grund, versuche, letzterVersuch, naechsterVersuch, gesendetAm, fehler, claim }
//                 zustand: wartet | geplant | sendet | gesendet | wiederholen | fehlgeschlagen | unklar | entfallen | aus
//     storno:     { zustand, gesendetAm, fehler }            (nur Bestellungen)
//   }

import { ladeBetrieb, speichereBetrieb, betriebExistiert, uhrHook } from "../../src/betriebStore.js";
import {
  telegramEinstellungen,
  meldungMoeglich,
  darfJetztMelden,
  istOffen,
  fristMinuten,
  erinnerungAn,
  eingangUhrzeit,
  GRUND_TEXT,
  VORGANG_ARTEN,
} from "../../src/telegramRegeln.js";
import { benachrichtigungsFenster, zeitpunktAm } from "../../src/telegramZeitfenster.js";
import { datumIn, uhrzeitIn, zeitpunktFuerUhrzeit, ZEITZONE_STANDARD } from "../../src/abholzeiten.js";
import { api, vorgangsNachricht, sammelNachricht, stornoNachricht, tagesuebersicht } from "./telegramNachrichten.js";
import { alleBetriebe, mitV2Standards, merkeTagesuebersicht } from "./wirtAdapter.js";

export const MAX_VERSUCHE = 3;
const WARTEN_MINUTEN = [1, 5];
/** Ab so vielen Vorgängen für denselben Chat gibt es eine Sammelmeldung. */
export const SAMMEL_AB = 4;
const CLAIM_VERFALL_MINUTEN = 5;
/** Vorgänge, deren Termin länger als das vorbei ist, werden nicht mehr gemeldet. */
const TERMIN_KULANZ_MINUTEN = 60;
const MINUTE = 60_000;

const LISTE = { reservierung: "reservierungen", bestellung: "bestellungen" };

const iso = (t) => new Date(t).toISOString();
const jetztVon = (jetzt) => (jetzt ? new Date(jetzt) : uhrHook.jetzt());
const eintragIn = (daten, art, id) => (daten[LISTE[art]] ?? []).find((e) => e.id === id);
const zielSchluessel = (ziel) => (ziel ? `${ziel.bot}|${ziel.chatId}` : "");

function aendere(slug, fn) {
  const daten = ladeBetrieb(slug);
  const ergebnis = fn(daten);
  speichereBetrieb(slug, daten);
  return ergebnis;
}

/** Fehlermeldung ohne Token (falls ein Netzwerkfehler die Adresse enthielte). */
function fehlerText(fehler) {
  return String(fehler?.message ?? fehler).replace(/\d{5,}:[A-Za-z0-9_-]{20,}/g, "[Token]").slice(0, 200);
}

/** Chat gelöscht, Bot blockiert, Token falsch: Wiederholen bringt nichts. */
function dauerhafterFehler(fehler) {
  return [400, 401, 403, 404].includes(Number(fehler?.status));
}

function neuerZustand() {
  return {
    eingang: { zustand: "", grund: "", versuche: 0, letzterVersuch: "", naechsterVersuch: "", gesendetAm: "", fehler: "", claim: "" },
    fristAb: "",
    erinnerung: { zustand: "wartet", grund: "", versuche: 0, letzterVersuch: "", naechsterVersuch: "", gesendetAm: "", fehler: "", claim: "" },
  };
}

function merkeVersand(daten, ziel, ok, fehler, t) {
  daten.telegramZustand = {
    ...(daten.telegramZustand ?? {}),
    ...(ok ? { letzterErfolg: iso(t) } : { letzterFehler: { zeit: iso(t), text: fehler, kanal: ziel?.kanal ?? "" } }),
  };
}

/** Ergebnis eines Versuchs am Stand (eingang oder erinnerung) festhalten. */
function vermerkeFehlschlag(stand, fehler, t) {
  stand.versuche = (stand.versuche ?? 0) + 1;
  stand.letzterVersuch = iso(t);
  stand.fehler = fehlerText(fehler);
  stand.claim = "";
  if (dauerhafterFehler(fehler) || stand.versuche >= MAX_VERSUCHE) {
    stand.zustand = "fehlgeschlagen";
    stand.naechsterVersuch = "";
  } else {
    stand.zustand = "wiederholen";
    stand.naechsterVersuch = iso(t.getTime() + WARTEN_MINUTEN[Math.min(stand.versuche, WARTEN_MINUTEN.length) - 1] * MINUTE);
  }
}

/** Der Wirt weiß Bescheid: Frist starten, Erinnerung planen (falls eingeschaltet). */
function eingangGemeldet(x, art, einstellungen, zustand, t, { sammel = false } = {}) {
  const e = x.telegram.eingang;
  e.zustand = zustand;
  e.versuche = (e.versuche ?? 0) + 1;
  e.letzterVersuch = iso(t);
  e.gesendetAm = iso(t);
  e.fehler = "";
  e.claim = "";
  e.naechsterVersuch = "";
  e.sammel = sammel;
  x.telegram.fristAb = iso(t);
  x.telegram.erinnerung = { ...x.telegram.erinnerung, zustand: erinnerungAn(einstellungen, art) ? "geplant" : "aus", claim: "" };
}

/** Zeitpunkt des Termins (Reservierung) bzw. der Abholung (Bestellung). */
function terminZeitpunkt(art, e, zeitzone) {
  if (art === "reservierung") {
    const [h, m] = String(e.uhrzeit ?? "").split(":").map(Number);
    return /^\d{4}-\d{2}-\d{2}$/.test(String(e.datum)) && Number.isFinite(h) && Number.isFinite(m) ? zeitpunktAm(e.datum, h * 60 + m, zeitzone) : null;
  }
  const zeit = e.bestaetigteAbholzeit || e.abholzeit;
  if (e.abholZeitpunkt && zeit === e.abholzeit) return new Date(e.abholZeitpunkt).getTime();
  const bezug = e.abholZeitpunkt || e.eingegangen;
  return bezug && zeit ? zeitpunktFuerUhrzeit(bezug, zeit, zeitzone) : null;
}

function terminVorbei(art, e, zeitzone, t) {
  const termin = terminZeitpunkt(art, e, zeitzone);
  return termin !== null && Number.isFinite(termin) && termin + TERMIN_KULANZ_MINUTEN * MINUTE < t.getTime();
}

/* ------------------------------------------------------------------ */
/* Eingang (sofort, aus dem Wirt-Server)                               */
/* ------------------------------------------------------------------ */

/**
 * Meldet einen neuen Vorgang – sofort, wenn das Fenster offen ist, sonst wird
 * er zum Nachmelden zurückgestellt. Wirft nie: Ein fehlgeschlagener Versand
 * darf die Anfrage des Gastes nicht scheitern lassen.
 *
 * @param {string} slug
 * @param {{ art: "reservierung"|"bestellung"|"storno", id: string }} ereignis
 */
export async function benachrichtige(slug, ereignis, { jetzt } = {}) {
  try {
    return await benachrichtigeUnsicher(slug, ereignis, jetztVon(jetzt));
  } catch (fehler) {
    return { gesendet: false, grund: fehlerText(fehler) };
  }
}

async function benachrichtigeUnsicher(slug, { art, id }, t) {
  if (art === "storno") return meldeStorno(slug, id, t);
  if (!VORGANG_ARTEN.includes(art)) return { gesendet: false, grund: `Unbekannte Art "${art}"` };

  const vorab = ladeBetrieb(slug);
  if (!eintragIn(vorab, art, id)) return { gesendet: false, grund: art === "reservierung" ? "Reservierung nicht gefunden" : "Bestellung nicht gefunden" };
  const moeglich = meldungMoeglich(vorab, art);
  // Ohne eingerichteten Kanal wird nichts vermerkt – Betriebe ohne Telegram
  // bleiben unberührt, und ein später verbundener Chat bekommt keine Altlasten.
  if (!moeglich.ok) return { gesendet: false, grund: GRUND_TEXT[moeglich.grund] ?? moeglich.grund };

  const entscheidung = aendere(slug, (d) => {
    const x = eintragIn(d, art, id);
    if (x.telegram?.eingang?.zustand) return { schon: true };
    if (!istOffen(art, x)) return { nicht: "bereits erledigt" };
    const erlaubt = darfJetztMelden(d, art, t);
    x.telegram = neuerZustand();
    if (!erlaubt.ok && ["ausserhalb", "keine-oeffnungszeiten"].includes(erlaubt.grund)) {
      Object.assign(x.telegram.eingang, { zustand: "zurueckgestellt", grund: erlaubt.grund });
      return { zurueck: erlaubt.grund };
    }
    if (!erlaubt.ok) {
      delete x.telegram;
      return { nicht: GRUND_TEXT[erlaubt.grund] ?? erlaubt.grund };
    }
    Object.assign(x.telegram.eingang, { zustand: "sendet", claim: iso(t) });
    return { ziel: erlaubt.ziel };
  });
  if (entscheidung.schon) return { gesendet: false, grund: "bereits gemeldet" };
  if (entscheidung.nicht) return { gesendet: false, grund: entscheidung.nicht };
  if (entscheidung.zurueck) return { gesendet: false, zurueckgestellt: true, grund: GRUND_TEXT[entscheidung.zurueck] };

  const daten = ladeBetrieb(slug);
  const nachricht = vorgangsNachricht(art, eintragIn(daten, art, id), daten, slug, { jetzt: t });
  try {
    await api("sendMessage", { chat_id: entscheidung.ziel.chatId, ...nachricht }, entscheidung.ziel.bot);
  } catch (fehler) {
    aendere(slug, (d) => {
      vermerkeFehlschlag(eintragIn(d, art, id).telegram.eingang, fehler, t);
      merkeVersand(d, entscheidung.ziel, false, fehlerText(fehler), t);
    });
    return { gesendet: false, grund: fehlerText(fehler) };
  }
  aendere(slug, (d) => {
    eingangGemeldet(eintragIn(d, art, id), art, telegramEinstellungen(d), "gesendet", t);
    merkeVersand(d, entscheidung.ziel, true, "", t);
  });
  return { gesendet: true };
}

/**
 * Storno durch den Gast: nur, wenn der Wirt die Bestellung per Telegram
 * kennt (oder sie aus der Zeit vor diesem Stand stammt), und nur im Fenster.
 */
async function meldeStorno(slug, id, t) {
  const vorab = ladeBetrieb(slug);
  const b = eintragIn(vorab, "bestellung", id);
  if (!b) return { gesendet: false, grund: "Bestellung nicht gefunden" };
  const moeglich = meldungMoeglich(vorab, "bestellung");
  if (!moeglich.ok) return { gesendet: false, grund: GRUND_TEXT[moeglich.grund] ?? moeglich.grund };

  const entscheidung = aendere(slug, (d) => {
    const x = eintragIn(d, "bestellung", id);
    const eingang = x.telegram?.eingang?.zustand;
    const bekannt = !x.telegram || ["gesendet", "nachgeholt", "unklar"].includes(eingang);
    if (!bekannt) return { nicht: "Bestellung war per Telegram noch nicht gemeldet" };
    if (x.telegram?.storno?.zustand) return { nicht: "Storno bereits gemeldet" };
    const erlaubt = darfJetztMelden(d, "bestellung", t);
    x.telegram ??= neuerZustand();
    if (!erlaubt.ok) {
      x.telegram.storno = { zustand: "entfallen", grund: erlaubt.grund };
      return { nicht: GRUND_TEXT[erlaubt.grund] ?? erlaubt.grund };
    }
    x.telegram.storno = { zustand: "sendet", claim: iso(t) };
    return { ziel: erlaubt.ziel };
  });
  if (entscheidung.nicht) return { gesendet: false, grund: entscheidung.nicht };
  const daten = ladeBetrieb(slug);
  try {
    await api("sendMessage", { chat_id: entscheidung.ziel.chatId, ...stornoNachricht(eintragIn(daten, "bestellung", id), daten, slug, { jetzt: t }) }, entscheidung.ziel.bot);
    aendere(slug, (d) => {
      eintragIn(d, "bestellung", id).telegram.storno = { zustand: "gesendet", gesendetAm: iso(t) };
      merkeVersand(d, entscheidung.ziel, true, "", t);
    });
    return { gesendet: true };
  } catch (fehler) {
    aendere(slug, (d) => {
      eintragIn(d, "bestellung", id).telegram.storno = { zustand: "fehlgeschlagen", fehler: fehlerText(fehler), letzterVersuch: iso(t) };
      merkeVersand(d, entscheidung.ziel, false, fehlerText(fehler), t);
    });
    return { gesendet: false, grund: fehlerText(fehler) };
  }
}

/* ------------------------------------------------------------------ */
/* Planer-Durchlauf                                                    */
/* ------------------------------------------------------------------ */

/**
 * Räumt auf, ohne zu senden: erledigte Vorgänge brauchen keine Meldung mehr,
 * abgebrochene Versände werden „unklar“, ausgeschaltete Erinnerungen entfallen.
 */
function raeumeAuf(slug, t) {
  const daten = ladeBetrieb(slug);
  const einstellungen = telegramEinstellungen(daten);
  const zeitzone = daten.zeitzone || ZEITZONE_STANDARD;
  const verfallen = (claim) => claim && t.getTime() - new Date(claim).getTime() > CLAIM_VERFALL_MINUTEN * MINUTE;
  let geaendert = false;
  const setze = (stand, zustand, grund) => {
    if (stand.zustand === zustand && stand.grund === grund) return;
    Object.assign(stand, { zustand, grund, claim: "", naechsterVersuch: "" });
    geaendert = true;
  };

  for (const art of VORGANG_ARTEN) {
    const moeglich = meldungMoeglich(daten, art);
    for (const x of daten[LISTE[art]] ?? []) {
      const tg = x.telegram;
      if (!tg?.eingang) continue;
      const e = tg.eingang;
      const r = tg.erinnerung ?? (tg.erinnerung = neuerZustand().erinnerung);

      if (e.zustand === "sendet" && verfallen(e.claim)) {
        // Höchstens einmal: nicht erneut senden. Die Frist läuft ab dem
        // Versuch, damit eine Erinnerung als Rückfall trotzdem kommt.
        setze(e, "unklar", "Versand abgebrochen");
        tg.fristAb ||= e.letzterVersuch || iso(t);
        if (r.zustand === "wartet") r.zustand = erinnerungAn(einstellungen, art) ? "geplant" : "aus";
      }
      if (r.zustand === "sendet" && verfallen(r.claim)) setze(r, "unklar", "Versand abgebrochen");

      const offen = istOffen(art, x);
      const wartend = ["zurueckgestellt", "wiederholen"];
      const erinnerungWartend = ["wartet", "geplant", "wiederholen"];
      if (!offen) {
        if (wartend.includes(e.zustand)) setze(e, "entfallen", "erledigt");
        if (erinnerungWartend.includes(r.zustand)) setze(r, "entfallen", "erledigt");
        continue;
      }
      if (terminVorbei(art, x, zeitzone, t)) {
        if (wartend.includes(e.zustand)) setze(e, "entfallen", "Termin vorbei");
        if (erinnerungWartend.includes(r.zustand)) setze(r, "entfallen", "Termin vorbei");
        continue;
      }
      // Bewusst abgeschaltet (Telegram aus, Art aus, Demo): nichts nachholen.
      if (["aus", "art-aus", "demo"].includes(moeglich.grund)) {
        if (wartend.includes(e.zustand)) setze(e, "entfallen", moeglich.grund);
        if (erinnerungWartend.includes(r.zustand)) setze(r, "entfallen", moeglich.grund);
        continue;
      }
      if (["geplant", "wiederholen"].includes(r.zustand) && !erinnerungAn(einstellungen, art)) setze(r, "entfallen", "Erinnerung ausgeschaltet");
    }
  }
  if (geaendert) speichereBetrieb(slug, daten);
}

/** Was ist für diesen Betrieb jetzt fällig? Gruppiert nach Ziel-Chat. */
function faelligeGruppen(daten, t) {
  const einstellungen = telegramEinstellungen(daten);
  const gruppen = new Map();
  const faellig = (zeit) => !zeit || new Date(zeit).getTime() <= t.getTime();
  for (const art of VORGANG_ARTEN) {
    const moeglich = meldungMoeglich(daten, art);
    if (!moeglich.ok) continue;
    for (const x of daten[LISTE[art]] ?? []) {
      const tg = x.telegram;
      if (!tg?.eingang || !istOffen(art, x)) continue;
      let posten = null;
      if (tg.eingang.zustand === "zurueckgestellt") posten = { anlass: "nachholen", vorher: "zurueckgestellt" };
      else if (tg.eingang.zustand === "wiederholen" && faellig(tg.eingang.naechsterVersuch)) posten = { anlass: "eingang", vorher: "wiederholen" };
      else if (tg.erinnerung?.zustand === "geplant" && tg.fristAb && new Date(tg.fristAb).getTime() + fristMinuten(einstellungen, art) * MINUTE <= t.getTime()) posten = { anlass: "erinnerung", vorher: "geplant" };
      else if (tg.erinnerung?.zustand === "wiederholen" && faellig(tg.erinnerung.naechsterVersuch)) posten = { anlass: "erinnerung", vorher: "wiederholen" };
      if (!posten) continue;
      const schluessel = zielSchluessel(moeglich.ziel);
      if (!gruppen.has(schluessel)) gruppen.set(schluessel, { ziel: moeglich.ziel, posten: [] });
      gruppen.get(schluessel).posten.push({ ...posten, art, id: x.id });
    }
  }
  return [...gruppen.values()];
}

function hinweisFuer(p, eintrag, daten, t) {
  const zeitzone = daten.zeitzone || ZEITZONE_STANDARD;
  const eingang = new Date(eintrag.eingegangen ?? "").getTime();
  const tag = Number.isNaN(eingang) || datumIn(eingang, zeitzone) === datumIn(t.getTime(), zeitzone) ? "" : `${datumIn(eingang, zeitzone).split("-").reverse().join(".")}, `;
  const um = `${tag}${eingangUhrzeit(eintrag, zeitzone)} Uhr`;
  if (p.anlass === "nachholen") return `Eingegangen ${um} – außerhalb der Telegram-Zeiten.`;
  if (p.anlass === "eingang") return `Eingegangen ${um}.`;
  return `Noch nicht bestätigt (eingegangen ${um}).`;
}

function einzelNachricht(p, daten, slug, t) {
  const eintrag = eintragIn(daten, p.art, p.id);
  const titel = {
    nachholen: p.art === "reservierung" ? "Neue Reservierung (nachgemeldet)" : "Neue Bestellung (nachgemeldet)",
    eingang: p.art === "reservierung" ? "Neue Reservierung" : "Neue Bestellung",
    erinnerung: p.art === "reservierung" ? "Erinnerung: Reservierung offen" : "Erinnerung: Bestellung offen",
  }[p.anlass];
  return vorgangsNachricht(p.art, eintrag, daten, slug, { titel, symbol: p.anlass === "erinnerung" ? "⏰" : undefined, hinweis: hinweisFuer(p, eintrag, daten, t), jetzt: t });
}

/**
 * Versendet eine Gruppe fälliger Posten an einen Chat. Erst beanspruchen
 * (frisch geladen, alles erneut geprüft), dann senden, dann Ergebnis
 * vermerken.
 */
async function sendeGruppe(slug, gruppe, t) {
  const schluessel = zielSchluessel(gruppe.ziel);
  const beansprucht = aendere(slug, (d) => {
    const einstellungen = telegramEinstellungen(d);
    if (d.demoBetrieb || !benachrichtigungsFenster(d, einstellungen, { jetzt: t, tageVoraus: 1 }).jetztErlaubt) return [];
    return gruppe.posten.filter((p) => {
      const x = eintragIn(d, p.art, p.id);
      if (!x?.telegram || !istOffen(p.art, x)) return false;
      const moeglich = meldungMoeglich(d, p.art);
      if (!moeglich.ok || zielSchluessel(moeglich.ziel) !== schluessel) return false;
      const stand = p.anlass === "erinnerung" ? x.telegram.erinnerung : x.telegram.eingang;
      if (stand?.zustand !== p.vorher) return false;
      if (p.anlass === "erinnerung" && !erinnerungAn(einstellungen, p.art)) return false;
      stand.zustand = "sendet";
      stand.claim = iso(t);
      return true;
    });
  });
  if (!beansprucht.length) return 0;

  const daten = ladeBetrieb(slug);
  const sammel = beansprucht.length >= SAMMEL_AB;
  const sendungen = sammel
    ? [{ posten: beansprucht, nachricht: sammelNachricht(beansprucht.map((p) => ({ ...p, eintrag: eintragIn(daten, p.art, p.id) })), daten, slug, { jetzt: t }) }]
    : beansprucht.map((p) => ({ posten: [p], nachricht: einzelNachricht(p, daten, slug, t) }));

  let gesendet = 0;
  for (const { posten, nachricht } of sendungen) {
    let fehler = null;
    try {
      await api("sendMessage", { chat_id: gruppe.ziel.chatId, ...nachricht }, gruppe.ziel.bot);
      gesendet += 1;
    } catch (e) {
      fehler = e;
    }
    aendere(slug, (d) => {
      const einstellungen = telegramEinstellungen(d);
      for (const p of posten) {
        const x = eintragIn(d, p.art, p.id);
        if (!x?.telegram) continue;
        if (p.anlass === "erinnerung") {
          const r = x.telegram.erinnerung;
          if (fehler) vermerkeFehlschlag(r, fehler, t);
          else Object.assign(r, { zustand: "gesendet", gesendetAm: iso(t), letzterVersuch: iso(t), versuche: (r.versuche ?? 0) + 1, fehler: "", claim: "", naechsterVersuch: "", sammel });
        } else if (fehler) {
          vermerkeFehlschlag(x.telegram.eingang, fehler, t);
        } else {
          eingangGemeldet(x, p.art, einstellungen, p.anlass === "nachholen" ? "nachgeholt" : "gesendet", t, { sammel });
        }
      }
      merkeVersand(d, gruppe.ziel, !fehler, fehler ? fehlerText(fehler) : "", t);
    });
  }
  return gesendet;
}

/* ------------------------------------------------------------------ */
/* Tagesübersicht                                                      */
/* ------------------------------------------------------------------ */

/**
 * Sendet fällige Tagesübersichten: einmal pro Tag und Betrieb, ab der
 * eingestellten Uhrzeit (Zeitzone des Betriebs) – aber nur im
 * Benachrichtigungsfenster. Liegt die Uhrzeit davor, kommt die Übersicht mit
 * Beginn des ersten Fensters des Tages. Im Zwei-Chat-Modus bekommt jeder Chat
 * nur seinen Teil.
 */
export async function sendeFaelligeUebersichten(jetzt, betriebe = alleBetriebe()) {
  const t = jetztVon(jetzt);
  const gesendet = [];
  for (const slug of betriebe) {
    try {
      if (await sendeUebersicht(slug, t)) gesendet.push(slug);
    } catch {
      // nächster Versuch beim nächsten Durchlauf
    }
  }
  return gesendet;
}

async function sendeUebersicht(slug, t) {
  if (!betriebExistiert(slug)) return false;
  const daten = mitV2Standards(ladeBetrieb(slug));
  if (!daten.telegramV2.tagesuebersicht || daten.demoBetrieb) return false;
  const zeitzone = daten.zeitzone || ZEITZONE_STANDARD;
  const heute = datumIn(t.getTime(), zeitzone);
  if (daten.telegramV2.letzteUebersicht === heute || uhrzeitIn(t.getTime(), zeitzone) < daten.telegramV2.uhrzeit) return false;
  const einstellungen = telegramEinstellungen(daten);
  if (!benachrichtigungsFenster(daten, einstellungen, { jetzt: t, tageVoraus: 1 }).jetztErlaubt) return false;

  const ziele = new Map();
  for (const art of VORGANG_ARTEN) {
    const moeglich = meldungMoeglich(daten, art);
    if (!moeglich.ok) continue;
    const schluessel = zielSchluessel(moeglich.ziel);
    if (!ziele.has(schluessel)) ziele.set(schluessel, { ziel: moeglich.ziel, arten: [] });
    ziele.get(schluessel).arten.push(art);
  }
  if (!ziele.size) return false;
  let erfolg = false;
  for (const { ziel, arten } of ziele.values()) {
    try {
      await api("sendMessage", { chat_id: ziel.chatId, text: tagesuebersicht(slug, heute, { arten, jetzt: t }) }, ziel.bot);
      erfolg = true;
    } catch {
      // ein Chat nicht erreichbar – die anderen bekommen ihre Übersicht trotzdem
    }
  }
  if (erfolg) merkeTagesuebersicht(slug, heute);
  return erfolg;
}

/**
 * Ein Durchlauf für alle Betriebe: aufräumen, Tagesübersicht, Nachmelden,
 * Wiederholen, Erinnern. Beliebig oft aufrufbar – verschickt nichts doppelt.
 */
export async function fuehreTaktAus({ betriebe = alleBetriebe(), jetzt } = {}) {
  const t = jetztVon(jetzt);
  const bericht = { nachrichten: 0, uebersichten: [], fehler: [] };
  for (const slug of betriebe) {
    try {
      if (!betriebExistiert(slug)) continue;
      raeumeAuf(slug, t);
      if (await sendeUebersicht(slug, t).catch(() => false)) bericht.uebersichten.push(slug);
      const daten = ladeBetrieb(slug);
      if (daten.demoBetrieb) continue;
      if (!benachrichtigungsFenster(daten, telegramEinstellungen(daten), { jetzt: t, tageVoraus: 1 }).jetztErlaubt) continue;
      for (const gruppe of faelligeGruppen(daten, t)) bericht.nachrichten += await sendeGruppe(slug, gruppe, t);
    } catch (fehler) {
      // Eine beschädigte Datei hält die anderen Betriebe nicht auf.
      bericht.fehler.push({ slug, fehler: fehlerText(fehler) });
    }
  }
  return bericht;
}
