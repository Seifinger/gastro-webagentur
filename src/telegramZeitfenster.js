// Wann darf Telegram den Wirt benachrichtigen?
//
// Regel (Standard): jedes Öffnungsintervall des Betriebs plus Vorlauf davor
// und Nachlauf danach (je 30 Minuten, vom Wirt einstellbar). Überlappende
// oder aneinanderstoßende Fenster werden zusammengeführt. Gerechnet wird mit
// vollen Zeitpunkten in der Zeitzone des Betriebs – nie mit Uhrzeit-Strings.
//
// Es gibt hier keine zweite Öffnungszeitenlogik: Die Zeilen { tage, zeiten }
// liest dieselbe Funktion wie das Bestellformular (abholzeiten.js,
// wochenplanAus), die Umrechnung Wanduhr → Zeitpunkt macht ebenfalls
// abholzeiten.js (zeitpunktFuerUhrzeit, inkl. Sommer-/Winterzeit). Neu ist
// nur, was das Formular nicht braucht: Tage aneinanderreihen, Vor-/Nachlauf
// anlegen und die Ausnahmen des Betriebs (oeffnungsAusnahmen) anwenden.
//
// Bewusst NICHT: Die Standard-Öffnungszeiten der Seite (Platzhalter) gelten
// hier nicht. Ohne eigene Öffnungszeiten gibt es kein Fenster und eine
// deutliche Warnung – keine scheinbar korrekte Rechnung und kein stilles
// „rund um die Uhr“.

import { wochenplanAus, zeitpunktFuerUhrzeit, uhrzeitIn, datumIn, ZEITZONE_STANDARD } from "./abholzeiten.js";

const MINUTE = 60_000;
const WOCHENTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const WOCHENTAGE_KURZ = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

const zweistellig = (n) => String(n).padStart(2, "0");

/** "2026-09-24" + n Tage (Kalenderrechnung, unabhängig von Zeitzonen). */
export function plusTage(datum, n) {
  const [j, m, t] = datum.split("-").map(Number);
  const d = new Date(Date.UTC(j, m - 1, t + n));
  return `${d.getUTCFullYear()}-${zweistellig(d.getUTCMonth() + 1)}-${zweistellig(d.getUTCDate())}`;
}

export function wochentagVon(datum) {
  const [j, m, t] = datum.split("-").map(Number);
  return new Date(Date.UTC(j, m - 1, t)).getUTCDay();
}

/**
 * Zeitpunkt für „Datum + Minuten ab Mitternacht“ in der Zeitzone des
 * Betriebs; Minuten ≥ 1440 liegen am Folgetag (Öffnung über Mitternacht).
 * Als Bezug dient die Wanduhrzeit selbst, als wäre sie UTC – der gesuchte
 * Zeitpunkt liegt höchstens um den Zeitzonenversatz daneben, die Nachbartage
 * fast 24 Stunden. Damit trifft zeitpunktFuerUhrzeit auch an den Tagen der
 * Zeitumstellung das richtige Datum.
 */
export function zeitpunktAm(datum, minuten, zeitzone) {
  const tage = Math.floor(minuten / 1440);
  const rest = minuten - tage * 1440;
  const [j, m, t] = plusTage(datum, tage).split("-").map(Number);
  const hh = Math.floor(rest / 60);
  const mm = rest % 60;
  return zeitpunktFuerUhrzeit(Date.UTC(j, m - 1, t, hh, mm), `${zweistellig(hh)}:${zweistellig(mm)}`, zeitzone);
}

/** Intervalle einer Zeitangabe („11:30–14:00 & 17:00–01:00“) – mit derselben Lesart wie die Wochenzeilen. */
function intervalleAusText(zeiten) {
  const plan = wochenplanAus([{ tage: "Montag", zeiten }]);
  return plan ? plan[1] : [];
}

/* ------------------------------------------------------------------ */
/* Ausnahmen                                                           */
/* ------------------------------------------------------------------ */

const DATUM = /(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})?/g;
const GESCHLOSSEN = /geschlossen|ruhetag|urlaub|betriebsferien|\bzu\b|closed/i;
const MAX_TAGE_JE_ZEILE = 62;

function gueltig(j, m, t) {
  const d = new Date(Date.UTC(j ?? 2024, m - 1, t));
  return m >= 1 && m <= 12 && d.getUTCMonth() === m - 1 && d.getUTCDate() === t;
}

/** Tage einer Ausnahmezeile: [{ schluessel: "JJJJ-MM-TT" | "MM-TT" }] oder null, wenn nicht lesbar. */
function tageDerAusnahme(text) {
  const teile = String(text ?? "").split(/[,;]|&|\bund\b/i).map((t) => t.trim()).filter(Boolean);
  if (!teile.length) return null;
  const tage = [];
  for (const teil of teile) {
    const treffer = [...teil.matchAll(DATUM)].map((x) => ({
      t: Number(x[1]),
      m: Number(x[2]),
      j: x[3] ? (x[3].length === 2 ? 2000 + Number(x[3]) : Number(x[3])) : null,
      index: x.index,
      laenge: x[0].length,
    }));
    if (treffer.length === 0 || treffer.length > 2) return null;
    if (treffer.length === 1) {
      const { j, m, t } = treffer[0];
      if (!gueltig(j, m, t)) return null;
      tage.push(j ? `${j}-${zweistellig(m)}-${zweistellig(t)}` : `${zweistellig(m)}-${zweistellig(t)}`);
      continue;
    }
    // Bereich „27.07.–10.08.“ bzw. „23.12.2026 bis 02.01.2027“
    const [a, b] = treffer;
    const zwischen = teil.slice(a.index + a.laenge, b.index);
    if (!/^\s*(?:–|—|-|bis)\s*$/i.test(zwischen)) return null;
    if (!gueltig(a.j, a.m, a.t) || !gueltig(b.j, b.m, b.t)) return null;
    const wiederkehrend = !a.j && !b.j;
    // Über den Jahreswechsel („23.12.–02.01.“) liegt das Ende im Folgejahr.
    const ueberJahreswechsel = a.m * 100 + a.t > b.m * 100 + b.t;
    let ja;
    let jb;
    if (wiederkehrend) {
      // Hilfsjahre (2024 hat einen 29. Februar), Schlüssel ohne Jahr.
      ja = 2024;
      jb = ueberJahreswechsel ? 2025 : 2024;
    } else if (a.j && b.j) {
      ja = a.j;
      jb = b.j;
    } else if (a.j) {
      ja = a.j;
      jb = ueberJahreswechsel ? a.j + 1 : a.j;
    } else {
      jb = b.j;
      ja = ueberJahreswechsel ? b.j - 1 : b.j;
    }
    let tag = `${ja}-${zweistellig(a.m)}-${zweistellig(a.t)}`;
    const ende = `${jb}-${zweistellig(b.m)}-${zweistellig(b.t)}`;
    if (tag > ende) return null;
    for (let i = 0; tag <= ende; i += 1, tag = plusTage(tag, 1)) {
      if (i >= MAX_TAGE_JE_ZEILE) return null;
      tage.push(wiederkehrend ? tag.slice(5) : tag);
    }
  }
  return tage;
}

/**
 * Liest die Ausnahmen des Betriebs (dieselben Zeilen wie im Kundenprojekt:
 * { tage: "24.12." | "27.07.–10.08." | "24.12.2026", zeiten: "geschlossen" |
 * "11:30–14:00" }). Ohne Jahr gilt eine Ausnahme jedes Jahr. Eine Zeile, die
 * sich nicht vollständig lesen lässt, wird gar nicht angewendet und als
 * unlesbar gemeldet – nie halb.
 */
export function ausnahmenAus(zeilen) {
  const tage = new Map();
  const unlesbar = [];
  const beruecksichtigt = [];
  for (const zeile of Array.isArray(zeilen) ? zeilen : []) {
    const text = `${zeile?.tage ?? ""} | ${zeile?.zeiten ?? ""}`;
    const daten = tageDerAusnahme(zeile?.tage);
    const intervalle = intervalleAusText(zeile?.zeiten);
    const geschlossen = !intervalle.length && GESCHLOSSEN.test(String(zeile?.zeiten ?? ""));
    if (!daten || (!intervalle.length && !geschlossen)) {
      unlesbar.push(text);
      continue;
    }
    for (const schluessel of daten) tage.set(schluessel, { intervalle, geschlossen, text });
    beruecksichtigt.push({ text, geschlossen, tage: daten.length });
  }
  return { tage, unlesbar, beruecksichtigt };
}

function ausnahmeFuer(ausnahmen, datum) {
  return ausnahmen.tage.get(datum) ?? ausnahmen.tage.get(datum.slice(5)) ?? null;
}

/* ------------------------------------------------------------------ */
/* Fenster                                                             */
/* ------------------------------------------------------------------ */

/**
 * Öffnungsintervalle als Zeitpunkte für die Tage von…bis (Datum des Beginns),
 * mit Ausnahmen. Jedes Intervall gehört zu dem Tag, an dem es beginnt – eine
 * Öffnung Freitag 18:00–02:00 endet Samstag 02:00, auch wenn Samstag laut
 * Ausnahme geschlossen ist.
 */
function oeffnungen(plan, ausnahmen, vonDatum, bisDatum, zeitzone) {
  const liste = [];
  for (let datum = vonDatum; datum <= bisDatum; datum = plusTage(datum, 1)) {
    const ausnahme = ausnahmeFuer(ausnahmen, datum);
    const intervalle = ausnahme ? ausnahme.intervalle : plan[wochentagVon(datum)];
    for (const [s, e] of intervalle) {
      const start = zeitpunktAm(datum, s, zeitzone);
      const ende = zeitpunktAm(datum, e, zeitzone);
      if (start !== null && ende !== null && ende > start) liste.push({ start, ende, tag: datum, ausnahme: Boolean(ausnahme) });
    }
  }
  return liste.sort((a, b) => a.start - b.start);
}

function zusammenfuehren(fenster) {
  const ergebnis = [];
  for (const f of [...fenster].sort((a, b) => a.start - b.start)) {
    const letztes = ergebnis.at(-1);
    if (letztes && f.start <= letztes.ende) {
      letztes.ende = Math.max(letztes.ende, f.ende);
      letztes.oeffnungen.push(...f.oeffnungen);
    } else {
      ergebnis.push({ ...f, oeffnungen: [...f.oeffnungen] });
    }
  }
  return ergebnis;
}

/**
 * Berechnet die Benachrichtigungsfenster eines Betriebs.
 *
 * @param {object} daten - Betriebsdaten (oeffnungszeiten, oeffnungsAusnahmen, zeitzone)
 * @param {{ zeitfenster: "oeffnungszeiten"|"rund-um-die-uhr", vorlaufMinuten: number, nachlaufMinuten: number }} einstellungen
 * @param {{ jetzt?: Date|number, tageVoraus?: number }} [optionen]
 */
export function benachrichtigungsFenster(daten, einstellungen, { jetzt = Date.now(), tageVoraus = 8 } = {}) {
  const t = Number(new Date(jetzt).getTime());
  const zeitzone = daten?.zeitzone || ZEITZONE_STANDARD;
  const heute = datumIn(t, zeitzone);
  const ergebnis = {
    zustand: "ok",
    zeitzone,
    heute,
    jetzt: t,
    fenster: [],
    jetztErlaubt: false,
    aktuellesEnde: null,
    naechsterBeginn: null,
    warnungen: [],
    ausnahmen: { beruecksichtigt: [], unlesbar: [] },
    ausnahmeTage: [],
  };

  if (einstellungen?.zeitfenster === "rund-um-die-uhr") {
    ergebnis.zustand = "rund-um-die-uhr";
    ergebnis.jetztErlaubt = true;
    return ergebnis;
  }

  const zeilen = Array.isArray(daten?.oeffnungszeiten) ? daten.oeffnungszeiten : [];
  const plan = zeilen.length ? wochenplanAus(zeilen) : null;
  if (!plan) {
    ergebnis.zustand = "keine-oeffnungszeiten";
    ergebnis.warnungen.push(
      zeilen.length
        ? "Die hinterlegten Öffnungszeiten enthalten keine lesbaren Uhrzeiten. Telegram-Zeiten lassen sich so nicht berechnen – es werden keine automatischen Telegram-Nachrichten verschickt."
        : "Für diesen Betrieb sind keine eigenen Öffnungszeiten hinterlegt. Telegram-Zeiten lassen sich so nicht berechnen – es werden keine automatischen Telegram-Nachrichten verschickt, bis Öffnungszeiten hinterlegt sind oder Sie bewusst „rund um die Uhr“ wählen.",
    );
    return ergebnis;
  }
  if (zeilen.some((z) => /feiertag/i.test(String(z?.tage ?? "")))) {
    ergebnis.warnungen.push("Feiertage erkennt das System nicht automatisch – sie zählen wie der Wochentag. Abweichende Feiertage bitte als Ausnahme mit Datum hinterlegen.");
  }

  const ausnahmen = ausnahmenAus(daten?.oeffnungsAusnahmen);
  ergebnis.ausnahmen = { beruecksichtigt: ausnahmen.beruecksichtigt, unlesbar: ausnahmen.unlesbar };
  for (const text of ausnahmen.unlesbar) ergebnis.warnungen.push(`Ausnahme „${text}“ ist nicht auswertbar und wird für Telegram-Zeiten nicht berücksichtigt.`);
  if (ausnahmen.beruecksichtigt.length) {
    ergebnis.warnungen.push("Ausnahmen gelten hier nur für die Telegram-Zeiten. Das Bestellformular kennt sie nicht – an geschlossenen Tagen Online-Bestellungen bitte pausieren.");
  }

  const vor = Math.max(0, Number(einstellungen?.vorlaufMinuten) || 0) * MINUTE;
  const nach = Math.max(0, Number(einstellungen?.nachlaufMinuten) || 0) * MINUTE;
  const fensterAus = (bis) =>
    zusammenfuehren(
      oeffnungen(plan, ausnahmen, plusTage(heute, -1), bis, zeitzone).map((o) => ({ start: o.start - vor, ende: o.ende + nach, tag: o.tag, oeffnungen: [o] })),
    );

  ergebnis.fenster = fensterAus(plusTage(heute, tageVoraus));
  for (let datum = heute; datum <= plusTage(heute, tageVoraus); datum = plusTage(datum, 1)) {
    if (ausnahmeFuer(ausnahmen, datum)) ergebnis.ausnahmeTage.push(datum);
  }
  const aktuell = ergebnis.fenster.find((f) => f.start <= t && t < f.ende);
  ergebnis.jetztErlaubt = Boolean(aktuell);
  ergebnis.aktuellesEnde = aktuell ? aktuell.ende : null;
  let naechstes = ergebnis.fenster.find((f) => f.start > t);
  // Betriebsurlaub kann länger als eine Woche dauern.
  if (!naechstes) naechstes = fensterAus(plusTage(heute, 60)).find((f) => f.start > t);
  ergebnis.naechsterBeginn = naechstes ? naechstes.start : null;
  return ergebnis;
}

/** Nur die Frage „darf jetzt gesendet werden?“ – mit denselben Regeln. */
export function jetztErlaubt(daten, einstellungen, jetzt = Date.now()) {
  return benachrichtigungsFenster(daten, einstellungen, { jetzt, tageVoraus: 1 }).jetztErlaubt;
}

/* ------------------------------------------------------------------ */
/* Anzeige                                                             */
/* ------------------------------------------------------------------ */

function spanneText(f, zeitzone) {
  const bisTag = datumIn(f.ende, zeitzone);
  const vonTag = datumIn(f.start, zeitzone);
  const von = uhrzeitIn(f.start, zeitzone);
  const bis = uhrzeitIn(f.ende, zeitzone);
  return { von, bis, vonVortag: vonTag < f.tag, bisFolgetag: bisTag > f.tag, text: `${von} bis ${bis}${bisTag > f.tag ? " (Folgetag)" : ""}` };
}

function aufzaehlung(teile) {
  if (teile.length <= 1) return teile.join("");
  return `${teile.slice(0, -1).join(", ")} und ${teile.at(-1)}`;
}

/**
 * Was das Dashboard anzeigt: ein Satz für heute, die nächsten Tage, der
 * Stand jetzt. Fenster werden dem Tag zugeordnet, an dem ihre Öffnung beginnt.
 */
export function fensterUebersicht(ergebnis, { tage = 7 } = {}) {
  const { zeitzone, heute } = ergebnis;
  const uebersicht = {
    zustand: ergebnis.zustand,
    zeitzone,
    heute,
    jetztErlaubt: ergebnis.jetztErlaubt,
    warnungen: ergebnis.warnungen,
    ausnahmen: ergebnis.ausnahmen,
    heuteText: "",
    jetztText: "",
    tage: [],
  };
  if (ergebnis.zustand === "rund-um-die-uhr") {
    uebersicht.heuteText = "Telegram-Nachrichten kommen rund um die Uhr – auch nachts und an Ruhetagen.";
    uebersicht.jetztText = "Jetzt: Benachrichtigungen aktiv.";
    return uebersicht;
  }
  if (ergebnis.zustand === "keine-oeffnungszeiten") {
    uebersicht.heuteText = "Keine Telegram-Zeiten berechenbar – es fehlen verlässliche Öffnungszeiten.";
    uebersicht.jetztText = "Jetzt: keine automatischen Telegram-Nachrichten.";
    return uebersicht;
  }
  for (let i = 0; i < tage; i += 1) {
    const datum = plusTage(heute, i);
    const spannen = ergebnis.fenster.filter((f) => f.tag === datum).map((f) => spanneText(f, zeitzone));
    uebersicht.tage.push({
      datum,
      wochentag: WOCHENTAGE[wochentagVon(datum)],
      wochentagKurz: WOCHENTAGE_KURZ[wochentagVon(datum)],
      fenster: spannen,
      ausnahme: ergebnis.ausnahmeTage.includes(datum),
    });
  }
  const heuteSpannen = uebersicht.tage[0].fenster;
  uebersicht.heuteText = heuteSpannen.length
    ? `Heute kommen Telegram-Nachrichten ${aufzaehlung(heuteSpannen.map((s) => `von ${s.text}`))}.`
    : "Heute kommen keine Telegram-Nachrichten (geschlossen).";
  const beschreibe = (ms) => {
    const tag = datumIn(ms, zeitzone);
    const uhr = uhrzeitIn(ms, zeitzone);
    if (tag === heute) return `heute ${uhr} Uhr`;
    if (tag === plusTage(heute, 1)) return `morgen ${uhr} Uhr`;
    const [, m, t] = tag.split("-");
    return `${WOCHENTAGE[wochentagVon(tag)]}, ${t}.${m}., ${uhr} Uhr`;
  };
  if (ergebnis.jetztErlaubt) uebersicht.jetztText = `Jetzt: Benachrichtigungen aktiv bis ${beschreibe(ergebnis.aktuellesEnde)}.`;
  else if (ergebnis.naechsterBeginn) uebersicht.jetztText = `Jetzt: pausiert. Nächste Telegram-Nachrichten ab ${beschreibe(ergebnis.naechsterBeginn)}.`;
  else uebersicht.jetztText = "Jetzt: pausiert. In den nächsten Wochen ist kein Zeitfenster geöffnet.";
  return uebersicht;
}
