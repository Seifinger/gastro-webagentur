// Kennzahlen für das Wirt-Dashboard – nur aus Daten, die tatsächlich
// gespeichert sind. Reine Funktionen: wirtServer.js lädt den Betrieb und
// reicht ihn herein, Tests rechnen mit festen Daten und fester Uhr.
//
// Zwei Sichten, bewusst getrennt:
//   • auswertung(): zählt nach dem Zeitpunkt, zu dem eine Anfrage oder
//     Bestellung EINGEGANGEN ist (Feld "eingegangen").
//   • heuteAnstehend(): was heute stattfindet – nach Besuchs- bzw. Abholtag.
// Jeder Vorgang zählt genau einmal, mit seinem aktuellen Status. Ein
// Statuswechsel verschiebt ihn zwischen den Status-Spalten, erzeugt aber
// keinen zweiten Vorgang.

export const ZEITZONE_STANDARD = "Europe/Berlin";

/* ---------- Zeitrechnung in der Zeitzone des Betriebs ---------- */

function teileIn(zeitzone, datum) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: zeitzone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const t = Object.fromEntries(f.formatToParts(datum).map((p) => [p.type, p.value]));
  return { j: Number(t.year), m: Number(t.month), t: Number(t.day), h: Number(t.hour), min: Number(t.minute), s: Number(t.second) };
}

function versatzMs(zeitzone, datum) {
  const p = teileIn(zeitzone, datum);
  return Date.UTC(p.j, p.m - 1, p.t, p.h, p.min, p.s) - Math.floor(datum.getTime() / 1000) * 1000;
}

/** Mitternacht (00:00 Ortszeit) eines Kalendertags als absoluter Zeitpunkt. */
export function mitternacht(j, m, t, zeitzone = ZEITZONE_STANDARD) {
  const naiv = Date.UTC(j, m - 1, t);
  let ms = naiv - versatzMs(zeitzone, new Date(naiv));
  // Zweiter Durchgang: am Tag einer Zeitumstellung gilt der Versatz des
  // Ergebnisses, nicht der des naiven Werts.
  ms = naiv - versatzMs(zeitzone, new Date(ms));
  return new Date(ms);
}

/** Kalendertag "JJJJ-MM-TT" eines Zeitpunkts in der Zeitzone des Betriebs. */
export function tagIn(zeitzone, datum) {
  const p = teileIn(zeitzone, new Date(datum));
  return `${p.j}-${String(p.m).padStart(2, "0")}-${String(p.t).padStart(2, "0")}`;
}

function tagPlus(j, m, t, tage) {
  const d = new Date(Date.UTC(j, m - 1, t + tage));
  return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
}

export const ZEITRAEUME = ["heute", "woche", "monat", "quartal", "jahr", "frei"];

const ZEITRAUM_LABEL = { heute: "Heute", woche: "Diese Woche", monat: "Dieser Monat", quartal: "Dieses Quartal", jahr: "Dieses Jahr", frei: "Eigener Zeitraum" };

/**
 * Anfang (einschließlich) und Ende (ausschließlich) eines Zeitraums in der
 * Zeitzone des Betriebs. Die Woche beginnt am Montag. "frei" nimmt die
 * Kalendertage von/bis (beide einschließlich).
 */
export function zeitraum(art, jetzt = new Date(), zeitzone = ZEITZONE_STANDARD, { von, bis } = {}) {
  const heute = teileIn(zeitzone, jetzt);
  let start;
  let ende;
  if (art === "heute") {
    start = [heute.j, heute.m, heute.t];
    ende = tagPlus(...start, 1);
  } else if (art === "woche") {
    const wochentag = new Date(Date.UTC(heute.j, heute.m - 1, heute.t)).getUTCDay(); // 0 = Sonntag
    start = tagPlus(heute.j, heute.m, heute.t, -((wochentag + 6) % 7));
    ende = tagPlus(...start, 7);
  } else if (art === "monat") {
    start = [heute.j, heute.m, 1];
    ende = heute.m === 12 ? [heute.j + 1, 1, 1] : [heute.j, heute.m + 1, 1];
  } else if (art === "quartal") {
    const q = Math.floor((heute.m - 1) / 3);
    start = [heute.j, q * 3 + 1, 1];
    ende = q === 3 ? [heute.j + 1, 1, 1] : [heute.j, q * 3 + 4, 1];
  } else if (art === "jahr") {
    start = [heute.j, 1, 1];
    ende = [heute.j + 1, 1, 1];
  } else if (art === "frei") {
    const muster = /^(\d{4})-(\d{2})-(\d{2})$/;
    const a = muster.exec(String(von ?? ""));
    const b = muster.exec(String(bis ?? ""));
    if (!a || !b) throw new Error("Für einen eigenen Zeitraum bitte Von und Bis als JJJJ-MM-TT angeben.");
    start = [Number(a[1]), Number(a[2]), Number(a[3])];
    ende = tagPlus(Number(b[1]), Number(b[2]), Number(b[3]), 1);
    if (Date.UTC(ende[0], ende[1] - 1, ende[2]) <= Date.UTC(start[0], start[1] - 1, start[2])) {
      throw new Error("Das Ende des Zeitraums liegt vor dem Anfang.");
    }
    if ((Date.UTC(ende[0], ende[1] - 1, ende[2]) - Date.UTC(start[0], start[1] - 1, start[2])) / 86_400_000 > 3 * 366) {
      throw new Error("Der Zeitraum darf höchstens drei Jahre umfassen.");
    }
  } else {
    throw new Error(`Unbekannter Zeitraum "${art}".`);
  }
  const vonTag = start.map((z, i) => (i ? String(z).padStart(2, "0") : String(z))).join("-");
  const letzterTag = tagPlus(...ende, -1).map((z, i) => (i ? String(z).padStart(2, "0") : String(z))).join("-");
  return {
    art,
    label: ZEITRAUM_LABEL[art],
    zeitzone,
    von: mitternacht(...start, zeitzone),
    bis: mitternacht(...ende, zeitzone),
    vonTag,
    bisTag: letzterTag,
  };
}

/* ---------- Quellen ---------- */

/**
 * Herkunft einer Reservierung. Gesetzt wird "quelle" ausschließlich vom
 * Server: /oeffentlich/reservierung → "online", /api/reservierung (Wirt)
 * → "manuell". Ein Wert aus dem Browser kommt nie in dieses Feld. Alles
 * andere – fehlend oder unbekannt – bleibt "unbekannt".
 */
export function reservierungsQuelle(r) {
  return r.quelle === "online" || r.quelle === "manuell" ? r.quelle : "unbekannt";
}

/**
 * Herkunft einer Bestellung. Seit der Statistik trägt jede neue Bestellung
 * quelle: "online" (einziger Weg: /oeffentlich/bestellung). Ältere
 * Datensätze ohne Feld werden NICHT rückwirkend als online gezählt – belegt
 * ist ihre Herkunft nicht.
 */
export function bestellungsQuelle(b) {
  return b.quelle === "online" ? "online" : "unbekannt";
}

/** Status-Spalte einer Bestellung (v2-Küchenstatus "bereit" eingeschlossen). */
export function bestellStatus(b) {
  if (["neu", "abgeholt", "abgelehnt", "storniert"].includes(b.status)) return b.status;
  if (b.status === "bestaetigt") return b.kuechenStatus === "bereit" ? "bereit" : "bestaetigt";
  return "unbekannt";
}

/* ---------- Auswertung ---------- */

function imZeitraum(iso, z) {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t >= z.von.getTime() && t < z.bis.getTime();
}

const rund2 = (x) => Math.round(x * 100) / 100;

// Welche Status in den Summen stecken – steht so auch im Dashboard.
export const BESTELLWERT_STATUS = ["bestaetigt", "bereit", "abgeholt"];

export const BESTELLWERT_ERKLAERUNG =
  "Summe der Bestellbeträge angenommener Bestellungen (bestätigt/in Zubereitung, bereit, abgeholt), nach Abzug von Rabattaktionen. " +
  "Kein bezahlter Umsatz: bezahlt wird vor Ort, eine Online-Zahlung gibt es nicht. Neue, abgelehnte und stornierte Bestellungen sind nicht enthalten.";

function verlaufRaster(z) {
  const tage = Math.round((z.bis.getTime() - z.von.getTime()) / 86_400_000);
  if (tage <= 31) return "tag";
  if (tage <= 100) return "woche";
  return "monat";
}

function schluesselFuer(raster, tag) {
  if (raster === "tag") return tag;
  if (raster === "monat") return tag.slice(0, 7);
  const [j, m, t] = tag.split("-").map(Number);
  const wochentag = new Date(Date.UTC(j, m - 1, t)).getUTCDay();
  return tagPlus(j, m, t, -((wochentag + 6) % 7)).map((z, i) => (i ? String(z).padStart(2, "0") : String(z))).join("-");
}

function leererVerlauf(raster, z) {
  const schluessel = [];
  let [j, m, t] = z.vonTag.split("-").map(Number);
  for (;;) {
    const tag = [j, m, t].map((x, i) => (i ? String(x).padStart(2, "0") : String(x))).join("-");
    if (tag > z.bisTag) break;
    const k = schluesselFuer(raster, tag);
    if (!schluessel.includes(k)) schluessel.push(k);
    [j, m, t] = tagPlus(j, m, t, 1);
  }
  return schluessel.map((k) => ({ ab: k, reservierungenOnline: 0, reservierungenManuell: 0, bestellungenOnline: 0 }));
}

/**
 * Die Geschäftskennzahlen eines Zeitraums, gezählt nach Eingang.
 */
export function auswertung(daten, z) {
  const zeitzone = z.zeitzone;
  const reservierungen = (daten.reservierungen ?? []).filter((r) => imZeitraum(r.eingegangen, z));
  const bestellungen = (daten.bestellungen ?? []).filter((b) => imZeitraum(b.eingegangen, z));

  const online = reservierungen.filter((r) => reservierungsQuelle(r) === "online");
  const manuell = reservierungen.filter((r) => reservierungsQuelle(r) === "manuell");
  const unbekannt = reservierungen.filter((r) => reservierungsQuelle(r) === "unbekannt");
  const personen = (liste) => liste.reduce((s, r) => s + (Number.isInteger(r.personen) ? r.personen : 0), 0);

  const status = { neu: 0, bestaetigt: 0, bereit: 0, abgeholt: 0, abgelehnt: 0, storniert: 0, unbekannt: 0 };
  for (const b of bestellungen) status[bestellStatus(b)] += 1;
  const angenommen = bestellungen.filter((b) => BESTELLWERT_STATUS.includes(bestellStatus(b)));
  const summe = angenommen.reduce((s, b) => s + (Number(b.gesamt) || 0), 0);
  // Rabattaktionen: gesamt ist der vereinbarte Betrag nach Rabatt. Der Wert
  // vor Rabatt kommt aus dem gespeicherten Preisnachweis der Bestellung.
  const vorRabatt = angenommen.reduce((s, b) => s + (b.preisermittlung ? b.preisermittlung.zwischensummeCent / 100 : Number(b.gesamt) || 0), 0);
  const abgeholt = bestellungen.filter((b) => bestellStatus(b) === "abgeholt");

  const raster = verlaufRaster(z);
  const verlauf = leererVerlauf(raster, z);
  const eintrag = (iso) => verlauf.find((v) => v.ab === schluesselFuer(raster, tagIn(zeitzone, iso)));
  for (const r of online) eintrag(r.eingegangen) && (eintrag(r.eingegangen).reservierungenOnline += 1);
  for (const r of manuell) eintrag(r.eingegangen) && (eintrag(r.eingegangen).reservierungenManuell += 1);
  for (const b of bestellungen.filter((x) => bestellungsQuelle(x) === "online")) eintrag(b.eingegangen) && (eintrag(b.eingegangen).bestellungenOnline += 1);

  return {
    zeitraum: { art: z.art, label: z.label, vonTag: z.vonTag, bisTag: z.bisTag, zeitzone },
    gezaehltNach: "Eingang der Anfrage bzw. Bestellung",
    reservierungen: {
      online: {
        anzahl: online.length,
        offen: online.filter((r) => r.status === "neu").length,
        bestaetigt: online.filter((r) => r.status === "bestaetigt").length,
        abgelehnt: online.filter((r) => r.status === "abgesagt").length,
        personen: personen(online),
      },
      manuell: { anzahl: manuell.length, personen: personen(manuell) },
      unbekannt: { anzahl: unbekannt.length },
      // Personen werden nur gezählt, wo sie als ganze Zahl gespeichert sind.
      personenHinweis: "Personen laut Anfrage bzw. Eintrag; abgelehnte Anfragen sind in den Personen der Online-Anfragen enthalten.",
    },
    bestellungen: {
      online: bestellungen.filter((b) => bestellungsQuelle(b) === "online").length,
      unbekannteQuelle: bestellungen.filter((b) => bestellungsQuelle(b) === "unbekannt").length,
      gesamt: bestellungen.length,
      status,
      bestellwert: {
        bezeichnung: "Bestellwert",
        summe: rund2(summe),
        durchschnitt: angenommen.length ? rund2(summe / angenommen.length) : null,
        anzahl: angenommen.length,
        enthalteneStatus: BESTELLWERT_STATUS,
        erklaerung: BESTELLWERT_ERKLAERUNG,
        davonAbgeholt: rund2(abgeholt.reduce((s, b) => s + (Number(b.gesamt) || 0), 0)),
        // Nur zur Einordnung – nicht der vereinbarte Bestellwert.
        vorRabatt: rund2(vorRabatt),
        rabatt: rund2(vorRabatt - summe),
      },
    },
    verlauf: { raster, punkte: verlauf },
  };
}

/**
 * Was heute ansteht – nach Besuchs- bzw. Abholtag, nicht nach Eingang.
 */
export function heuteAnstehend(daten, jetzt = new Date(), zeitzone = ZEITZONE_STANDARD) {
  const heute = tagIn(zeitzone, jetzt);
  const reservierungen = (daten.reservierungen ?? [])
    .filter((r) => r.datum === heute && r.status !== "abgesagt")
    .sort((a, b) => String(a.uhrzeit).localeCompare(String(b.uhrzeit)));
  const bestellungen = (daten.bestellungen ?? []).filter((b) => {
    const tag = b.abholZeitpunkt ? tagIn(zeitzone, b.abholZeitpunkt) : b.eingegangen ? tagIn(zeitzone, b.eingegangen) : "";
    return tag === heute && ["neu", "bestaetigt", "bereit"].includes(bestellStatus(b));
  });
  return {
    tag: heute,
    gruppiertNach: "Besuchs- bzw. Abholtag",
    reservierungen: reservierungen.length,
    offeneAnfragen: reservierungen.filter((r) => r.status === "neu").length,
    personen: reservierungen.reduce((s, r) => s + (Number.isInteger(r.personen) ? r.personen : 0), 0),
    bestellungen: bestellungen.length,
    unbestaetigteBestellungen: bestellungen.filter((b) => b.status === "neu").length,
  };
}

/**
 * Ereignisverhältnis – nur, wenn Seitenaufrufe für denselben Zeitraum
 * tatsächlich gemessen wurden. Keine Personen-Conversion.
 */
export function anfragenJe100Aufrufe(auswertungErgebnis, aufrufe) {
  if (aufrufe?.status !== "aktiv" || !aufrufe.vollstaendig || !(aufrufe.summe > 0)) return null;
  const vorgaenge = auswertungErgebnis.reservierungen.online.anzahl + auswertungErgebnis.bestellungen.online;
  return {
    bezeichnung: "Online-Anfragen und -Bestellungen je 100 Seitenaufrufe",
    erklaerung: "Verhältnis zweier Ereigniszahlen im selben Zeitraum – keine Conversion-Rate von Personen.",
    wert: Math.round((vorgaenge / aufrufe.summe) * 1000) / 10,
  };
}
