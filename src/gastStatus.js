// Was der Gast über seine Reservierung oder Bestellung erfährt – und wann.
//
// Reine Funktionen ohne Datei- oder Netzwerkzugriff: betriebStore.js leitet
// damit beim Speichern die Gast-Ereignisse ab, kundenBenachrichtigung.js baut
// daraus die E-Mails, wirtServer.js die öffentliche Statusansicht und die
// Hinweise im Wirt-Dashboard. Eine Quelle für alle drei – sonst sagt die
// E-Mail „bestätigt“, während die Statusseite noch „eingegangen“ zeigt.
//
// Grundsatz: Ein Ereignis entsteht nur aus einer tatsächlich gespeicherten
// Änderung (Vergleich vorher/nachher in speichereBetrieb). Ein zweiter Klick
// auf „Bestätigen“ ändert nichts und erzeugt deshalb auch keine zweite Mail –
// egal, ob er aus dem v1-Dashboard, dem v2-Küchenstatus oder Telegram kommt.

import { createHash, createHmac, randomBytes } from "node:crypto";

/* ---------- Status aus Sicht des Gastes ---------- */

export const PHASEN = ["eingegangen", "bestaetigt", "bereit", "abgeholt", "abgelehnt", "storniert"];

/**
 * Bezeichnungen für Gast (Statusseite, E-Mail). „Eingegangen“ und
 * „Bestätigt“ sind bewusst weit auseinander formuliert: Eine Anfrage ist
 * noch keine Zusage.
 */
const TITEL = {
  reservierung: {
    eingegangen: "Anfrage eingegangen – noch nicht bestätigt",
    bestaetigt: "Ihr Tisch ist bestätigt",
    abgelehnt: "Reservierung abgelehnt",
    storniert: "Reservierung storniert",
  },
  bestellung: {
    eingegangen: "Bestellung eingegangen – noch nicht bestätigt",
    bestaetigt: "Bestätigt – wird zubereitet",
    bereit: "Bereit zur Abholung",
    abgeholt: "Abgeholt",
    abgelehnt: "Bestellung abgelehnt",
    storniert: "Bestellung storniert",
  },
};

const ERKLAERUNG = {
  reservierung: {
    eingegangen: "Ihre Anfrage ist beim Restaurant eingegangen und wartet noch auf Bestätigung. Ihr Tisch ist erst reserviert, wenn das Restaurant bestätigt.",
    bestaetigt: "Das Restaurant hat Ihre Reservierung bestätigt.",
    abgelehnt: "Das Restaurant kann Ihre Reservierung leider nicht annehmen.",
    storniert: "Diese Reservierung wurde storniert.",
  },
  bestellung: {
    eingegangen: "Ihre Bestellung ist beim Restaurant eingegangen und wartet noch auf Bestätigung. Die Abholzeit ist erst verbindlich, wenn das Restaurant bestätigt.",
    bestaetigt: "Das Restaurant hat Ihre Bestellung angenommen und bereitet sie zu.",
    bereit: "Ihr Essen ist fertig und kann abgeholt werden.",
    abgeholt: "Diese Bestellung wurde abgeholt. Guten Appetit!",
    abgelehnt: "Das Restaurant kann Ihre Bestellung leider nicht annehmen.",
    storniert: "Diese Bestellung wurde storniert.",
  },
};

/** Die Phase einer Reservierung/Bestellung, wie der Gast sie sieht. */
export function gastPhase(art, eintrag) {
  if (art === "reservierung") {
    return { neu: "eingegangen", bestaetigt: "bestaetigt", abgesagt: "abgelehnt" }[eintrag.status] ?? "eingegangen";
  }
  if (eintrag.status === "storniert") return "storniert";
  if (eintrag.status === "abgelehnt") return "abgelehnt";
  if (eintrag.status === "abgeholt") return "abgeholt";
  if (eintrag.status === "neu") return "eingegangen";
  // v2-Küchenstatus (wirtAdapter.js) kennt zusätzlich "bereit".
  return eintrag.kuechenStatus === "bereit" ? "bereit" : "bestaetigt";
}

function datumAus(iso, zeitzone) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const teile = new Intl.DateTimeFormat("en-CA", { timeZone: zeitzone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return teile; // JJJJ-MM-TT
}

/**
 * Was der Gast sehen darf: Phase, Datum, (bestätigte) Uhrzeit, ob sie von
 * seinem Wunsch abweicht. Keine Namen, Telefonnummern, E-Mail-Adressen.
 */
export function gastSicht(art, eintrag, { zeitzone = "Europe/Berlin" } = {}) {
  const phase = gastPhase(art, eintrag);
  if (art === "reservierung") {
    const wunsch = eintrag.urspruenglich ?? null;
    return {
      phase,
      datum: eintrag.datum,
      uhrzeit: eintrag.uhrzeit,
      personen: eintrag.personen,
      zeitGeaendert: Boolean(wunsch && (wunsch.datum !== eintrag.datum || wunsch.uhrzeit !== eintrag.uhrzeit)),
      wunsch: wunsch ? { datum: wunsch.datum, uhrzeit: wunsch.uhrzeit } : null,
      grund: eintrag.aenderungsGrund || "",
    };
  }
  const bestaetigt = eintrag.bestaetigteAbholzeit || "";
  return {
    phase,
    datum: datumAus(eintrag.abholZeitpunkt || eintrag.eingegangen, zeitzone),
    uhrzeit: bestaetigt || eintrag.abholzeit,
    zeitBestaetigt: Boolean(bestaetigt) && phase !== "eingegangen",
    zeitGeaendert: Boolean(bestaetigt) && bestaetigt !== eintrag.abholzeit,
    wunsch: bestaetigt && bestaetigt !== eintrag.abholzeit ? { uhrzeit: eintrag.abholzeit } : null,
    grund: eintrag.aenderungsGrund || "",
  };
}

export function referenzVon(art, eintrag) {
  if (eintrag.nummer) return eintrag.nummer;
  return `${art === "reservierung" ? "RES" : "AB"}-${String(eintrag.id ?? "").slice(0, 6).toUpperCase()}`;
}

export function titelFuer(art, phase) {
  return TITEL[art]?.[phase] ?? phase;
}

/* ---------- Ereignisse ---------- */

// Ereignistypen: eingegangen, bestaetigt, abgelehnt, zeit-geaendert,
// bereit, storniert. "abgeholt" braucht keine Nachricht an den Gast.
export const EREIGNIS_TYPEN = ["eingegangen", "bestaetigt", "abgelehnt", "zeit-geaendert", "bereit", "storniert"];

/** Ereignisse, nach denen der Wirt anrufen muss, wenn keine Nachricht rausging. */
export const ANRUF_RELEVANT = new Set(["abgelehnt", "zeit-geaendert"]);

/**
 * Welches Gast-Ereignis folgt aus dieser gespeicherten Änderung? Höchstens
 * eines – ein Wechsel neu → bestätigt mit anderer Uhrzeit ist eine einzige
 * Nachricht („bestätigt für 19:15 statt 18:30“), nicht zwei.
 *
 * Nur Einträge mit Gastzugang (online eingegangen, kein Demo-Betrieb) lösen
 * überhaupt etwas aus; vom Wirt selbst eingetragene Reservierungen nicht.
 */
export function ereignisAusAenderung(art, vorher, nachher, optionen = {}) {
  if (!nachher?.gastZugang) return null;
  const neu = gastSicht(art, nachher, optionen);
  if (!vorher) return neu.phase === "eingegangen" ? { typ: "eingegangen", sicht: neu } : null;

  const alt = gastSicht(art, vorher, optionen);
  if (neu.phase !== alt.phase) {
    if (neu.phase === "abgeholt") return null;
    // Küche nimmt „bereit“ zurück (v2-Küchenstatus): für den Gast keine
    // neue Nachricht – eine zweite „bestätigt“-Mail wäre nur verwirrend.
    if (alt.phase === "bereit" && neu.phase === "bestaetigt") return null;
    const zeitAnders = neu.zeitGeaendert && (alt.phase === "eingegangen" || alt.uhrzeit !== neu.uhrzeit || alt.datum !== neu.datum);
    return { typ: neu.phase, sicht: neu, zeitGeaendert: neu.phase === "bestaetigt" && zeitAnders };
  }
  if (["abgelehnt", "storniert", "abgeholt"].includes(neu.phase)) return null;
  if (neu.uhrzeit !== alt.uhrzeit || neu.datum !== alt.datum) {
    // Solange nichts bestätigt ist, bleibt es eine Anfrage – eine geänderte
    // Wunschzeit ohne Bestätigung gibt es in keinem Wirt-Vorgang.
    return { typ: "zeit-geaendert", sicht: neu, zeitGeaendert: true, vorherUhrzeit: alt.uhrzeit, vorherDatum: alt.datum };
  }
  return null;
}

/** Braucht dieses Ereignis einen Anruf, wenn keine Nachricht übergeben wurde? */
export function anrufRelevant(meldung) {
  return ANRUF_RELEVANT.has(meldung.typ) || (meldung.typ === "bestaetigt" && meldung.zeitGeaendert);
}

/* ---------- Versandzustände (für Wirt-Dashboard) ---------- */

export const VERSAND_ZUSTAENDE = {
  "keine-adresse": "Keine E-Mail angegeben – kein automatischer Versand",
  "nicht-eingerichtet": "E-Mail nicht eingerichtet – nichts versendet",
  ausstehend: "E-Mail angenommen, Versand steht noch aus",
  "wird-gesendet": "E-Mail wird gerade an den Versanddienst übergeben",
  uebergeben: "E-Mail an den Versanddienst übergeben (Zustellung nicht bestätigt)",
  fehlgeschlagen: "E-Mail-Versand gescheitert",
  ueberholt: "Nicht versendet – durch eine neuere Meldung ersetzt",
  demo: "Demo-Betrieb – nichts versendet",
};

/* ---------- Status-Link ---------- */

/**
 * Der Zugriffsschlüssel für den Status-Link: HMAC über Betrieb, Art, ID und
 * eine Version. Er steht nirgends im Klartext – im Betriebsspeicher liegt
 * nur sein SHA-256 (zum Nachschlagen). So lässt er sich für jede E-Mail neu
 * herleiten, ohne gespeichert zu werden, und durch Hochzählen der Version
 * widerrufen. Ohne das Geheimnis ist er nicht zu erraten (256 Bit).
 */
export function gastToken(geheimnis, { slug, art, id, version = 1 }) {
  return createHmac("sha256", geheimnis).update(`gast-status:${slug}:${art}:${id}:${version}`).digest("base64url");
}

export function tokenHash(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

export function istTokenFormat(token) {
  return /^[A-Za-z0-9_-]{43}$/.test(String(token ?? ""));
}

export function neuesGeheimnis() {
  return randomBytes(32).toString("base64url");
}

/** Wie lange ein Status-Link nach dem Termin noch funktioniert. */
export const LINK_GUELTIG_TAGE_NACH_TERMIN = 30;

export function linkAbgelaufen(art, eintrag, jetzt = new Date()) {
  const termin =
    art === "reservierung"
      ? new Date(`${eintrag.datum}T23:59:59Z`)
      : new Date(eintrag.abholZeitpunkt || eintrag.eingegangen);
  if (Number.isNaN(termin.getTime())) return false;
  return jetzt.getTime() > termin.getTime() + LINK_GUELTIG_TAGE_NACH_TERMIN * 86_400_000;
}

/* ---------- E-Mail-Adresse ---------- */

/**
 * Prüft eine optional angegebene E-Mail-Adresse. Leer ist erlaubt (die
 * Adresse ist freiwillig). Zeilenumbrüche werden nie durchgelassen – sie
 * wären in Mail-Kopfzeilen ein Einfallstor.
 */
export function pruefeEmail(roh) {
  const email = String(roh ?? "").trim();
  if (!email) return "";
  if (
    email.length > 254 ||
    /[\s<>,;"'\\]/.test(email) ||
    !/^[^@]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(email)
  ) {
    throw new Error("Bitte eine gültige E-Mail-Adresse angeben – oder das Feld leer lassen.");
  }
  return email;
}

/* ---------- Texte: Statusseite und E-Mail ---------- */

export function datumDeutsch(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso ?? ""))) return "";
  const [j, m, t] = iso.split("-");
  const wochentag = new Intl.DateTimeFormat("de-DE", { weekday: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
  return `${wochentag}, ${t}.${m}.${j}`;
}

function zeitZeile(art, sicht) {
  const datum = datumDeutsch(sicht.datum);
  if (art === "reservierung") {
    const label = sicht.phase === "eingegangen" ? "Angefragt für" : "Termin";
    return `${label}: ${datum}, ${sicht.uhrzeit} Uhr${sicht.personen ? ` · ${sicht.personen} ${sicht.personen === 1 ? "Person" : "Personen"}` : ""}`;
  }
  const label = sicht.zeitBestaetigt ? "Bestätigte Abholzeit" : "Gewünschte Abholzeit (noch nicht bestätigt)";
  return `${label}: ${datum ? `${datum}, ` : ""}${sicht.uhrzeit} Uhr`;
}

function zeitpunktText(iso, zeitzone = "Europe/Berlin") {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${new Intl.DateTimeFormat("de-DE", { timeZone: zeitzone || "Europe/Berlin", dateStyle: "medium", timeStyle: "short" }).format(d)} Uhr`;
}

/**
 * Der öffentliche Stand für die Statusseite. Enthält ausschließlich, was
 * der Gast zum Einordnen braucht – keine personenbezogenen Daten.
 */
export function statusFuerGast(art, eintrag, { betrieb, letzteAenderung, zeitzone }) {
  const sicht = gastSicht(art, eintrag, { zeitzone });
  return {
    art,
    referenz: referenzVon(art, eintrag),
    phase: sicht.phase,
    titel: titelFuer(art, sicht.phase),
    erklaerung: ERKLAERUNG[art][sicht.phase] ?? "",
    datum: sicht.datum,
    datumText: datumDeutsch(sicht.datum),
    uhrzeit: sicht.uhrzeit,
    zeitText: zeitZeile(art, sicht),
    zeitBestaetigt: art === "reservierung" ? sicht.phase === "bestaetigt" : sicht.zeitBestaetigt,
    zeitGeaendert: sicht.zeitGeaendert && sicht.phase !== "eingegangen",
    wunsch: sicht.zeitGeaendert ? sicht.wunsch : null,
    grund: sicht.zeitGeaendert ? sicht.grund : "",
    personen: art === "reservierung" ? sicht.personen : undefined,
    letzteAenderung,
    // In der Zeit des Restaurants – der Gast soll dieselbe Uhrzeit lesen,
    // die auch in der E-Mail und am Tresen gilt.
    letzteAenderungText: zeitpunktText(letzteAenderung, zeitzone),
    betrieb: { name: betrieb.name, telefon: betrieb.telefon },
  };
}

const BETREFF = {
  eingegangen: { reservierung: "Anfrage eingegangen – noch nicht bestätigt", bestellung: "Bestellung eingegangen – noch nicht bestätigt" },
  bestaetigt: { reservierung: "Reservierung bestätigt", bestellung: "Bestellung bestätigt" },
  abgelehnt: { reservierung: "Reservierung abgelehnt", bestellung: "Bestellung abgelehnt" },
  "zeit-geaendert": { reservierung: "Termin geändert", bestellung: "Neue Abholzeit" },
  bereit: { bestellung: "Bereit zur Abholung" },
  storniert: { reservierung: "Reservierung storniert", bestellung: "Bestellung storniert" },
};

/**
 * Betreff und Text einer transaktionalen Gast-E-Mail. Betrieb, Art der
 * Anfrage, Referenz, konkreter Status, Datum/Uhrzeit, Link zur
 * Statusansicht. Kein Name, keine Telefonnummer des Gastes, keine Werbung.
 */
export function gastEmail(meldung, { betrieb, statusUrl }) {
  const art = meldung.art;
  const s = meldung.sicht;
  const artText = art === "reservierung" ? "Tischreservierung" : "Abholbestellung";
  const betreff = `${BETREFF[meldung.typ]?.[art] ?? titelFuer(art, s.phase)} · ${meldung.referenz} · ${betrieb.name}`;

  const kern = {
    eingegangen: ERKLAERUNG[art].eingegangen,
    bestaetigt: meldung.zeitGeaendert
      ? art === "reservierung"
        ? `Das Restaurant hat Ihre Reservierung bestätigt – mit geändertem Termin: ${datumDeutsch(s.datum)}, ${s.uhrzeit} Uhr (angefragt war ${s.wunsch ? `${datumDeutsch(s.wunsch.datum)}, ${s.wunsch.uhrzeit} Uhr` : "ein anderer Termin"}).`
        : `Das Restaurant hat Ihre Bestellung angenommen – mit geänderter Abholzeit: ${s.uhrzeit} Uhr statt ${s.wunsch?.uhrzeit ?? "der gewünschten Zeit"}.`
      : ERKLAERUNG[art].bestaetigt,
    abgelehnt: ERKLAERUNG[art].abgelehnt,
    "zeit-geaendert":
      art === "reservierung"
        ? `Der Termin Ihrer Reservierung hat sich geändert. Neu: ${datumDeutsch(s.datum)}, ${s.uhrzeit} Uhr.`
        : `Die Abholzeit Ihrer Bestellung hat sich geändert. Neue Abholzeit: ${s.uhrzeit} Uhr${meldung.vorherUhrzeit ? ` (bisher ${meldung.vorherUhrzeit} Uhr)` : ""}.`,
    bereit: ERKLAERUNG.bestellung.bereit,
    storniert: ERKLAERUNG[art].storniert,
  }[meldung.typ];

  const zeilen = [
    "Guten Tag,",
    "",
    `${kern}${s.grund && (meldung.typ === "zeit-geaendert" || meldung.zeitGeaendert) ? ` Grund: ${s.grund}` : ""}`,
    "",
    `Betrieb: ${betrieb.name}`,
    `Art: ${artText}`,
    `Referenz: ${meldung.referenz}`,
    `Status: ${titelFuer(art, s.phase)}`,
    zeitZeile(art, s),
    "",
    `Aktuellen Stand jederzeit ansehen: ${statusUrl}`,
    betrieb.telefon ? `Rückfragen: ${betrieb.telefon}` : "",
    "",
    "Sie erhalten diese Nachricht nur, weil Sie bei dieser Anfrage Ihre E-Mail-Adresse für Bestätigung und Änderungen angegeben haben. Es gibt keinen Newsletter und keine Werbung.",
  ].filter((z, i, alle) => z !== "" || alle[i - 1] !== "");

  // Kurzfassung (z. B. für einen optionalen SMS-Anbieter): dieselbe Aussage
  // ohne Beiwerk.
  const kurz = `${kern}${s.grund && (meldung.typ === "zeit-geaendert" || meldung.zeitGeaendert) ? ` (${s.grund})` : ""} Status: ${statusUrl}`;

  return { betreff, text: zeilen.join("\n"), kurz };
}

/* ---------- Hinweis fürs Wirt-Dashboard ---------- */

const TYP_TEXT = {
  eingegangen: "Eingangsbestätigung",
  bestaetigt: "Bestätigung",
  abgelehnt: "Ablehnung",
  "zeit-geaendert": "Zeitänderung",
  bereit: "Bereit zur Abholung",
  storniert: "Stornierung",
};

/**
 * Was das Wirt-Dashboard zu einem Eintrag über die Gastbenachrichtigung
 * zeigt. „Informiert“ wird nie behauptet: Das Beste, was ein Versanddienst
 * zurückmeldet, ist „übergeben“. Nach Ablehnung oder geänderter Zeit ohne
 * übergebene Nachricht steht unmissverständlich der Anruf-Hinweis da.
 */
export function wirtGastHinweis(art, eintrag, meldungen = []) {
  const eigene = meldungen.filter((m) => m.bezugId === eintrag.id);
  const letzte = eigene.at(-1) ?? null;
  const telefon = String(eintrag.telefon ?? "").trim();
  const anrufText = telefon
    ? `Gast nicht automatisch informiert – bitte unter ${telefon} anrufen.`
    : "Gast nicht automatisch informiert – und keine Telefonnummer hinterlegt.";

  let anrufNoetig = false;
  if (letzte) {
    anrufNoetig = anrufRelevant(letzte) && !["uebergeben", "ausstehend", "wird-gesendet"].includes(letzte.versand?.zustand);
  } else if (eintrag.quelle !== "manuell") {
    // Einträge von vor der Gastbenachrichtigung: Es gab nie einen Kanal.
    const sicht = gastSicht(art, eintrag);
    anrufNoetig = sicht.phase === "abgelehnt" || (sicht.zeitGeaendert && sicht.phase !== "eingegangen");
  }

  return {
    statusLink: !eintrag.gastZugang ? "keiner" : eintrag.gastZugang.widerrufenAm ? "widerrufen" : "aktiv",
    emailAngegeben: Boolean(String(eintrag.email ?? "").trim()),
    letzteMeldung: letzte
      ? {
          id: letzte.id,
          typ: letzte.typ,
          typText: letzte.typ === "bestaetigt" && letzte.zeitGeaendert ? "Bestätigung mit geänderter Zeit" : TYP_TEXT[letzte.typ] ?? letzte.typ,
          erstellt: letzte.erstellt,
          kanal: letzte.versand?.kanal ?? "",
          zustand: letzte.versand?.zustand ?? "",
          zustandText: VERSAND_ZUSTAENDE[letzte.versand?.zustand] ?? "",
          fehler: letzte.versand?.fehler ?? "",
          erneutMoeglich: ["fehlgeschlagen", "nicht-eingerichtet"].includes(letzte.versand?.zustand),
        }
      : null,
    anrufNoetig,
    anrufText: anrufNoetig ? anrufText : "",
  };
}
