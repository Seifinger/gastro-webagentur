// Rabattaktionen für Abholbestellungen – die eine Stelle, an der Preise nach
// Rabatt berechnet werden. Der Wirt-Server ist die Preis-Autorität: Die Seite
// des Restaurants bekommt fertige Preise (/oeffentlich/preise) und rechnet
// selbst keinen Rabatt aus; beim Absenden rechnet betriebStore.legeBestellungAn
// mit derselben Funktion erneut und hält das Ergebnis unveränderlich fest.
//
// Arten:
//   - "abholung": allgemeiner Abholrabatt in Prozent auf alle online
//     bestellbaren Produkte der Karte (optional ohne ausgewählte Kategorien).
//     Gilt nur für Abholbestellungen – Reservierungen haben keine Preise.
//   - "gericht": Rabatt in Prozent oder als fester Euro-Betrag auf einzelne
//     Gerichte (stabile Gericht-IDs der Karte; gilt für alle Varianten).
//
// Überschneidung: Rabatte werden NICHT addiert. Treffen mehrere Aktionen auf
// eine Position zu, gilt der für den Gast günstigere Endpreis (bei Gleichstand
// die Gericht-Aktion, dann die früher begonnene, dann die kleinere ID).
//   Beispiel: 12,00 € – allgemein 10 % → 10,80 €, Gericht −2,00 € → 10,00 €.
//   Der Gast zahlt 10,00 €, nicht 9,00 €.
//
// Rundung (in Cent, je Einheit): Prozent-Rabatt = kaufmännisch gerundet
// (ab 0,5 Cent aufwärts) auf den regulären Einzelpreis; Endpreis = regulär −
// Rabatt, nie unter 0; Positionswert = Endpreis × Menge.
//
// Zeit: Eine Aktion gilt, wenn der Zeitpunkt der Bestellabgabe (Serveruhr)
// im Intervall [Start, Ende) liegt – Start inklusive, Ende exklusive. Start
// und Ende werden als Wanduhrzeit in der Zeitzone des Betriebs eingegeben und
// als absolute Zeitpunkte gespeichert; so stimmen Tageswechsel und Sommer-/
// Winterzeit. Die Abholzeit spielt keine Rolle.

import { randomBytes } from "node:crypto";

export const ARTEN = { abholung: "Allgemeiner Abholrabatt", gericht: "Rabatt auf einzelne Gerichte" };
export const ZEITZONE_STANDARD = "Europe/Berlin";
const NAME_MAX = 80;

export class PreisGeaendert extends Error {
  constructor({ endbetragCent, erwartetCent, preisstand }) {
    super(
      `Der Preis Ihrer Bestellung hat sich geändert: jetzt ${euroText(endbetragCent)} statt ${euroText(erwartetCent)}. ` +
        "Der Warenkorb zeigt den aktuellen Stand – bitte prüfen Sie ihn und schicken Sie die Bestellung erneut ab.",
    );
    this.code = "PREIS_GEAENDERT";
    this.endbetragCent = endbetragCent;
    this.erwartetCent = erwartetCent;
    this.preisstand = preisstand;
  }
}

/* ------------------------------------------------------------------ */
/* Geld und Zeit                                                       */
/* ------------------------------------------------------------------ */

export const inCent = (euro) => Math.round(Number(euro) * 100);

export function euroText(cent) {
  const vorzeichen = cent < 0 ? "−" : "";
  return `${vorzeichen}${(Math.abs(cent) / 100).toFixed(2).replace(".", ",")} €`;
}

/** Rabatt je Einheit in Cent – die eine Rundungsregel. */
export function rabattCent(regulaerCent, rabatt) {
  if (rabatt.typ === "prozent") {
    const basispunkte = Math.round(rabatt.wert * 100);
    return Math.min(regulaerCent, Math.floor((regulaerCent * basispunkte + 5000) / 10000));
  }
  return Math.min(regulaerCent, rabatt.cent);
}

const formatierer = new Map();
function wandzeit(ms, zeitzone) {
  let f = formatierer.get(zeitzone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: zeitzone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", weekday: "short" });
    formatierer.set(zeitzone, f);
  }
  const w = {};
  for (const p of f.formatToParts(new Date(ms))) w[p.type] = p.value;
  return { jahr: Number(w.year), monat: Number(w.month), tag: Number(w.day), stunde: Number(w.hour) % 24, minute: Number(w.minute), wochentag: w.weekday };
}

const zwei = (n) => String(n).padStart(2, "0");

/** "2026-09-28T22:00" in der Zeitzone → Wanduhr-Text dieses Zeitpunkts. */
export function alsWanduhr(ms, zeitzone = ZEITZONE_STANDARD) {
  const w = wandzeit(ms, zeitzone);
  return `${w.jahr}-${zwei(w.monat)}-${zwei(w.tag)}T${zwei(w.stunde)}:${zwei(w.minute)}`;
}

/**
 * Wanduhrzeit "YYYY-MM-DDTHH:MM" in der Zeitzone des Betriebs → Zeitpunkt (ms).
 * Eine Uhrzeit, die es wegen der Umstellung auf Sommerzeit nicht gibt, wird
 * abgelehnt; eine doppelte (Umstellung auf Winterzeit) gilt beim ersten Mal.
 */
export function ausWanduhr(text, zeitzone = ZEITZONE_STANDARD) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(text ?? "").trim());
  if (!m) throw new Error("Bitte Datum und Uhrzeit vollständig angeben.");
  const [jahr, monat, tag, stunde, minute] = m.slice(1).map(Number);
  if (monat < 1 || monat > 12 || tag < 1 || tag > 31 || stunde > 23 || minute > 59) throw new Error("Datum oder Uhrzeit ungültig.");
  const utc = Date.UTC(jahr, monat - 1, tag, stunde, minute);
  if (new Date(utc).getUTCDate() !== tag) throw new Error("Dieses Datum gibt es nicht.");
  const versatz = (ms) => {
    const w = wandzeit(ms, zeitzone);
    return Date.UTC(w.jahr, w.monat - 1, w.tag, w.stunde, w.minute) - Math.floor(ms / 60000) * 60000;
  };
  const kandidaten = [...new Set([utc - versatz(utc - 12 * 3600000), utc - versatz(utc + 12 * 3600000)])]
    .filter((ms) => alsWanduhr(ms, zeitzone) === text.trim())
    .sort((a, b) => a - b);
  if (!kandidaten.length) throw new Error(`Die Uhrzeit ${zwei(stunde)}:${zwei(minute)} am ${zwei(tag)}.${zwei(monat)}. gibt es wegen der Zeitumstellung nicht.`);
  return kandidaten[0];
}

/** "Mo. 28.09.2026, 22:00 Uhr" in der Zeitzone des Betriebs. */
export function zeitText(ms, zeitzone = ZEITZONE_STANDARD) {
  const w = wandzeit(ms, zeitzone);
  const tage = { Mon: "Mo.", Tue: "Di.", Wed: "Mi.", Thu: "Do.", Fri: "Fr.", Sat: "Sa.", Sun: "So." };
  return `${tage[w.wochentag] ?? ""} ${zwei(w.tag)}.${zwei(w.monat)}.${w.jahr}, ${zwei(w.stunde)}:${zwei(w.minute)} Uhr`.trim();
}

/* ------------------------------------------------------------------ */
/* Karte: reguläre Preise aus der Bestellkarte des Betriebs            */
/* ------------------------------------------------------------------ */

/**
 * Welche Warenkorb-Kennung gehört zu welchem Gericht und welcher Kategorie?
 * Aus der Bestellkarte ({ katalog, produkte }) – andere Quellen gibt es nicht.
 */
export function kartenIndex(bestellkarte) {
  const katalog = bestellkarte?.katalog ?? {};
  const gerichtVon = {};
  const kategorieVon = {};
  for (const p of bestellkarte?.produkte ?? []) {
    const ids = p.varianten?.length ? p.varianten.map((v) => v.id) : [p.id];
    for (const id of ids) {
      gerichtVon[id] = p.id;
      kategorieVon[id] = p.kategorie ?? "";
    }
  }
  for (const id of Object.keys(katalog)) if (!gerichtVon[id]) gerichtVon[id] = id;
  return { katalog, gerichtVon, kategorieVon };
}

/* ------------------------------------------------------------------ */
/* Zustand und Gültigkeit                                              */
/* ------------------------------------------------------------------ */

/** "aktiv" (gilt jetzt), "geplant", "pausiert", "abgelaufen", "beendet". */
export function zustand(aktion, jetzt) {
  const t = new Date(jetzt).getTime();
  if (aktion.status === "beendet") return "beendet";
  if (aktion.ende && t >= Date.parse(aktion.ende)) return "abgelaufen";
  if (aktion.status === "pausiert") return "pausiert";
  if (t < Date.parse(aktion.start)) return "geplant";
  return "aktiv";
}

export const giltJetzt = (aktion, jetzt) => zustand(aktion, jetzt) === "aktiv";

/* ------------------------------------------------------------------ */
/* Preisberechnung                                                     */
/* ------------------------------------------------------------------ */

function trifft(aktion, id, index) {
  if (aktion.art === "gericht") return aktion.gerichte.includes(index.gerichtVon[id]);
  return !(aktion.ausgenommeneKategorien ?? []).includes(index.kategorieVon[id]);
}

/** Kurzbeschreibung eines Rabatts: "−10 %" / "−2,00 €". */
export function rabattText(rabatt) {
  return rabatt.typ === "prozent" ? `−${String(rabatt.wert).replace(".", ",")} %` : `−${euroText(rabatt.cent)}`;
}

/**
 * Preis je Einheit für eine Warenkorb-Kennung zum Zeitpunkt `jetzt`.
 * Ergebnis: { regulaerCent, preisCent, rabattCent, aktion|null, verworfen: [...] }
 * – `verworfen` nennt Aktionen, die ebenfalls zutreffen, aber nicht günstiger sind.
 */
export function preisFuer(id, { bestellkarte, aktionen = [], jetzt, index = kartenIndex(bestellkarte) }) {
  const eintrag = index.katalog[id];
  if (!eintrag) return null;
  const regulaerCent = inCent(eintrag[1]);
  const kandidaten = aktionen
    .filter((a) => giltJetzt(a, jetzt) && trifft(a, id, index))
    .map((a) => ({ aktion: a, preisCent: Math.max(0, regulaerCent - rabattCent(regulaerCent, a.rabatt)) }))
    .filter((k) => k.preisCent < regulaerCent)
    .sort((x, y) => x.preisCent - y.preisCent || (x.aktion.art === "gericht" ? -1 : 0) - (y.aktion.art === "gericht" ? -1 : 0) || Date.parse(x.aktion.start) - Date.parse(y.aktion.start) || x.aktion.id.localeCompare(y.aktion.id));
  const [beste, ...rest] = kandidaten;
  return {
    regulaerCent,
    preisCent: beste ? beste.preisCent : regulaerCent,
    rabattCent: beste ? regulaerCent - beste.preisCent : 0,
    aktion: beste ? beste.aktion : null,
    verworfen: rest.map((k) => ({ aktion: k.aktion, preisCent: k.preisCent })),
  };
}

/** Knapper Nachweis einer angewendeten Aktion (für Snapshot und Anzeige). */
export function aktionsNachweis(a) {
  return { id: a.id, name: a.name, art: a.art, rabatt: { ...a.rabatt }, text: rabattText(a.rabatt) };
}

/**
 * Preisermittlung einer Bestellung (Positionen mit geprüften Kennungen).
 * Liefert den unveränderlichen Snapshot, der an der Bestellung gespeichert wird.
 */
export function preisermittlung(positionen, { bestellkarte, aktionen = [], jetzt, zeitzone = ZEITZONE_STANDARD }) {
  const index = kartenIndex(bestellkarte);
  const zeilen = positionen.map((p) => {
    const preis = preisFuer(p.id, { bestellkarte, aktionen, jetzt, index });
    return {
      id: p.id,
      menge: p.menge,
      regulaerCent: preis.regulaerCent,
      preisCent: preis.preisCent,
      rabattCent: preis.rabattCent,
      aktion: preis.aktion ? aktionsNachweis(preis.aktion) : null,
    };
  });
  const zwischensummeCent = zeilen.reduce((s, z) => s + z.regulaerCent * z.menge, 0);
  const endbetragCent = zeilen.reduce((s, z) => s + z.preisCent * z.menge, 0);
  return {
    zeitpunkt: new Date(jetzt).toISOString(),
    zeitzone,
    zwischensummeCent,
    ersparnisCent: zwischensummeCent - endbetragCent,
    endbetragCent,
    positionen: zeilen,
  };
}

/**
 * Was die Seite des Restaurants live bekommt: nur Kennungen mit gerade
 * gültigem Rabatt, fertig berechnet – dazu die Serverzeit und wann sich der
 * Stand das nächste Mal ändert (Start oder Ende einer Aktion).
 */
export function oeffentlichePreise({ bestellkarte, aktionen = [], jetzt, zeitzone = ZEITZONE_STANDARD }) {
  const index = kartenIndex(bestellkarte);
  const preise = {};
  for (const id of Object.keys(index.katalog)) {
    const p = preisFuer(id, { bestellkarte, aktionen, jetzt, index });
    if (!p?.aktion) continue;
    preise[id] = {
      r: p.regulaerCent,
      p: p.preisCent,
      n: p.aktion.name,
      t: rabattText(p.aktion.rabatt),
      ...(p.aktion.ende ? { b: `bis ${zeitText(Date.parse(p.aktion.ende), zeitzone)}` } : {}),
    };
  }
  const t = new Date(jetzt).getTime();
  const wechsel = aktionen
    .filter((a) => a.status === "aktiv")
    .flatMap((a) => [Date.parse(a.start), a.ende ? Date.parse(a.ende) : NaN])
    .filter((ms) => Number.isFinite(ms) && ms > t)
    .sort((a, b) => a - b);
  return {
    jetzt: new Date(jetzt).toISOString(),
    preise,
    ...(wechsel.length ? { naechsteAenderung: new Date(wechsel[0]).toISOString() } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* Prüfen und Anlegen                                                  */
/* ------------------------------------------------------------------ */

export function neueAktionsId() {
  return `ra-${randomBytes(5).toString("hex")}`;
}

/**
 * Prüft eine neue Aktion aus dem Wirt-Dashboard gegen die Karte des Betriebs.
 * Wirft mit einer verständlichen Meldung; liefert die gespeicherte Form.
 */
export function pruefeAktion(eingabe, { bestellkarte, zeitzone = ZEITZONE_STANDARD, jetzt }) {
  if (!bestellkarte?.katalog || !Object.keys(bestellkarte.katalog).length) {
    throw new Error("Für diesen Betrieb ist noch keine Speisekarte hinterlegt – Rabatte brauchen die Preise der Karte.");
  }
  const name = String(eingabe?.name ?? "").replace(/\s+/g, " ").trim();
  if (!name) throw new Error("Bitte der Aktion einen Namen geben.");
  if (name.length > NAME_MAX) throw new Error(`Der Name darf höchstens ${NAME_MAX} Zeichen haben.`);
  const art = eingabe?.art;
  if (!ARTEN[art]) throw new Error("Bitte die Art der Aktion wählen.");

  const typ = eingabe?.rabatt?.typ;
  const roh = String(eingabe?.rabatt?.wert ?? "").replace(",", ".").trim();
  const wert = Number(roh);
  if (!roh || !Number.isFinite(wert)) throw new Error("Bitte einen Rabattwert eingeben.");
  if (wert < 0) throw new Error("Ein Rabatt kann nicht negativ sein.");
  if (wert === 0) throw new Error("Ein Rabatt von 0 ist keine Aktion.");
  let rabatt;
  if (typ === "prozent") {
    if (wert > 100) throw new Error("Mehr als 100 % Rabatt geht nicht.");
    if (Math.round(wert * 100) !== wert * 100) throw new Error("Prozent bitte mit höchstens zwei Nachkommastellen.");
    rabatt = { typ, wert };
  } else if (typ === "betrag") {
    if (art !== "gericht") throw new Error("Ein fester Euro-Betrag geht nur bei Rabatten auf einzelne Gerichte.");
    const cent = inCent(wert);
    if (Math.abs(cent - wert * 100) > 1e-6) throw new Error("Euro-Betrag bitte mit höchstens zwei Nachkommastellen.");
    rabatt = { typ, cent };
  } else {
    throw new Error("Bitte wählen: Prozent oder Euro-Betrag.");
  }

  const index = kartenIndex(bestellkarte);
  const produkte = bestellkarte.produkte ?? [];
  let gerichte = [];
  let ausgenommeneKategorien = [];
  if (art === "gericht") {
    gerichte = [...new Set((Array.isArray(eingabe.gerichte) ? eingabe.gerichte : []).map(String))];
    if (!gerichte.length) throw new Error("Bitte mindestens ein Gericht auswählen.");
    if (gerichte.length > 200) throw new Error("Zu viele Gerichte.");
    for (const gid of gerichte) {
      const p = produkte.find((x) => x.id === gid);
      if (!p) throw new Error(`Das Gericht „${gid}“ steht nicht (mehr) auf Ihrer bestellbaren Karte.`);
      if (p.empfehlbar === false) throw new Error(`„${p.name}“ ist noch nicht freigegeben und kann kein Rabattziel sein.`);
      if (rabatt.typ === "betrag") {
        const ids = p.varianten?.length ? p.varianten.map((v) => v.id) : [p.id];
        const kleinster = Math.min(...ids.map((id) => inCent(index.katalog[id]?.[1] ?? 0)));
        if (rabatt.cent > kleinster) throw new Error(`${euroText(rabatt.cent)} ist mehr als der Preis von „${p.name}“ (${euroText(kleinster)}).`);
      }
    }
  } else {
    const kategorien = new Set(produkte.map((p) => p.kategorie));
    ausgenommeneKategorien = [...new Set((Array.isArray(eingabe.ausgenommeneKategorien) ? eingabe.ausgenommeneKategorien : []).map(String))];
    for (const k of ausgenommeneKategorien) if (!kategorien.has(k)) throw new Error(`Die Kategorie „${k}“ steht nicht auf Ihrer Karte.`);
    if (kategorien.size && ausgenommeneKategorien.length >= kategorien.size) throw new Error("Die Aktion schließt alle Kategorien aus – sie hätte keine Wirkung.");
  }

  const jetztMs = new Date(jetzt).getTime();
  const startMs = eingabe.start ? ausWanduhr(eingabe.start, zeitzone) : jetztMs;
  const endeMs = eingabe.ende ? ausWanduhr(eingabe.ende, zeitzone) : null;
  if (endeMs !== null && endeMs <= startMs) throw new Error("Das Ende muss nach dem Start liegen.");
  if (endeMs !== null && endeMs <= jetztMs) throw new Error("Das Ende liegt in der Vergangenheit.");

  const zeit = new Date(jetztMs).toISOString();
  return {
    id: neueAktionsId(),
    name,
    art,
    rabatt,
    gerichte,
    ausgenommeneKategorien,
    start: new Date(startMs).toISOString(),
    ende: endeMs === null ? null : new Date(endeMs).toISOString(),
    zeitzone,
    status: eingabe.pausiert === true ? "pausiert" : "aktiv",
    erstellt: zeit,
    geaendert: zeit,
  };
}
