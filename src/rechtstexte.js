// Rechtstexte je Restaurant: Impressum, Datenschutzerklärung, Bestell- und
// Reservierungsbedingungen, No-Show-Regeln – versioniert, mit Freigabe.
//
// Reine Funktionen (Vorlagen, Prüfungen, Auswahl der gültigen Fassung). Das
// Speichern steht in betriebStore.js, die Auslieferung in wirtServer.js.
//
// Wichtig: Diese Vorlagen sind ENTWÜRFE. Sie sind nicht rechtlich geprüft.
// Die Freigabe hier bedeutet nur, dass eine benannte Person die Fassung für
// diesen Betrieb freigegeben und eine Prüfung vermerkt hat – sie macht einen
// Text nicht wirksam. Eine Checkbox macht eine inhaltlich unwirksame Klausel
// ebenfalls nicht wirksam.
//
// Unveränderlichkeit: Eine freigegebene Fassung wird nie mehr geändert oder
// gelöscht. Änderungen ergeben eine neue Version. Jeder Nachweis am Vorgang
// trägt Dokument-ID, Version und SHA-256 des Inhalts – so bleibt auch nach
// späteren Änderungen belegbar, welcher Wortlaut bestätigt wurde.

import { createHash } from "node:crypto";

export const DOKUMENT_ARTEN = {
  impressum: { titel: "Impressum", pfad: "impressum" },
  datenschutz: { titel: "Datenschutzerklärung", pfad: "datenschutz" },
  bestellbedingungen: { titel: "Bestellbedingungen für Abholbestellungen", pfad: "bestellbedingungen", vorgang: "bestellung", bestaetigung: "bedingungen" },
  reservierungsbedingungen: { titel: "Reservierungsbedingungen", pfad: "reservierungsbedingungen", vorgang: "reservierung", bestaetigung: "bedingungen" },
  "noshow-bestellung": { titel: "No-Show-Regel für Abholbestellungen", pfad: "noshow-bestellung", vorgang: "bestellung", bestaetigung: "noShow" },
  "noshow-reservierung": { titel: "No-Show-Regel für Reservierungen", pfad: "noshow-reservierung", vorgang: "reservierung", bestaetigung: "noShow" },
};

export const ENTWURF_MARKE = "ENTWURF – NICHT RECHTLICH GEPRÜFT";
const PLATZHALTER = /\[\[[^\]]+\]\]/g;

export function istArt(art) {
  return Object.hasOwn(DOKUMENT_ARTEN, art);
}

export function euro(betrag) {
  return `${Number(betrag).toFixed(2).replace(".", ",")} €`;
}

/** Fingerabdruck einer Fassung: Art, Version, Inhalt, Zustimmungstext, Parameter. */
export function inhaltHash(dok) {
  const kanonisch = JSON.stringify({
    art: dok.art,
    version: dok.version,
    inhalt: dok.inhalt,
    zustimmungstext: dok.zustimmungstext ?? "",
    parameter: dok.parameter ?? null,
  });
  return createHash("sha256").update(kanonisch).digest("hex");
}

export function platzhalterIn(text) {
  return [...new Set(String(text ?? "").match(PLATZHALTER) ?? [])];
}

/* ---------- Parameter der No-Show-Regeln ---------- */

/**
 * Prüft Betrag und Frist einer No-Show-Regel. Kein Standardwert: Ohne
 * Angabe des Betriebs gibt es keinen Betrag – die Vorlage behält dann ihre
 * Platzhalter und lässt sich nicht freigeben.
 */
export function pruefeNoShowParameter(art, parameter = {}) {
  const betrag = parameter.betrag === "" || parameter.betrag === undefined || parameter.betrag === null ? null : Number(parameter.betrag);
  const fenster = parameter.stornofensterMinuten === "" || parameter.stornofensterMinuten === undefined || parameter.stornofensterMinuten === null ? null : Number(parameter.stornofensterMinuten);
  if (betrag !== null && (!Number.isFinite(betrag) || betrag <= 0 || betrag > 500)) throw new Error("Der Betrag muss größer als 0 € sein (höchstens 500 €).");
  if (fenster !== null && (!Number.isInteger(fenster) || fenster < 0 || fenster > 10_080)) throw new Error("Die Stornofrist muss in ganzen Minuten zwischen 0 und 10080 angegeben werden.");
  const ergebnis = { betrag, stornofensterMinuten: fenster };
  if (art === "noshow-reservierung") {
    ergebnis.berechnung = parameter.berechnung === "pauschal" ? "pauschal" : "pro-person";
    ergebnis.nachweisweg = String(parameter.nachweisweg ?? "").trim().slice(0, 500);
  }
  return ergebnis;
}

function fensterText(minuten) {
  if (minuten === null || minuten === undefined) return "[[STORNOFRIST]]";
  if (minuten % 1440 === 0 && minuten >= 1440) return `${minuten / 1440} ${minuten === 1440 ? "Tag" : "Tage"}`;
  if (minuten % 60 === 0 && minuten >= 60) return `${minuten / 60} ${minuten === 60 ? "Stunde" : "Stunden"}`;
  return `${minuten} Minuten`;
}

/** Der Satz, den der Gast bei einer No-Show-Regel gesondert bestätigt. */
export function noShowZustimmungstext(art, p) {
  const betrag = p.betrag ? euro(p.betrag) : "[[BETRAG]]";
  const frist = fensterText(p.stornofensterMinuten);
  if (art === "noshow-reservierung") {
    const wie = p.berechnung === "pauschal" ? `eine Pauschale von ${betrag}` : `eine Pauschale von ${betrag} je reservierter Person`;
    return (
      `Ich habe die No-Show-Regel gelesen: Erscheine ich nicht und sage die bestätigte Reservierung nicht spätestens ${frist} vorher ab, ` +
      `kann das Restaurant ${wie} verlangen. Mir bleibt der Nachweis, dass kein oder ein wesentlich geringerer Schaden entstanden ist.`
    );
  }
  return (
    `Ich habe die No-Show-Regel gelesen: Hole ich die bestätigte Bestellung nicht ab und storniere sie nicht spätestens ${frist} vor der Abholzeit, ` +
    `kann das Restaurant eine Pauschale von ${betrag} verlangen. Mir bleibt der Nachweis, dass kein oder ein wesentlich geringerer Schaden entstanden ist.`
  );
}

/* ---------- Vorlagen (Entwürfe) ---------- */

const KOPF = `${ENTWURF_MARKE}
Diese Vorlage ist ein technischer Entwurf der Webagentur, keine Rechtsberatung. Alle [[…]]-Stellen muss der Betrieb ausfüllen. Vor der Freigabe prüfen lassen und diese beiden Zeilen entfernen.`;

function vorlage(art, { name, parameter }) {
  const haus = name || "[[NAME DES RESTAURANTS]]";
  const p = parameter ?? {};
  switch (art) {
    case "impressum":
      return `${KOPF}

## Angaben gemäß § 5 DDG
${haus}
[[RECHTSFORM, z. B. Einzelunternehmen / GmbH]]
Inhaber bzw. vertretungsberechtigt: [[VOR- UND NACHNAME]]
[[STRASSE HAUSNUMMER]]
[[PLZ ORT]]

## Kontakt
Telefon: [[TELEFON]]
E-Mail: [[E-MAIL]]

## Register und Steuern
[[Handelsregister, Registergericht, Registernummer – nur falls eingetragen]]
[[Umsatzsteuer-Identifikationsnummer nach § 27a UStG – nur falls vorhanden]]

## Verantwortlich für den Inhalt
[[Nur falls journalistisch-redaktionelle Inhalte: Name und Anschrift nach § 18 Abs. 2 MStV]]

## Verbraucherstreitbeilegung
[[Angabe nach § 36 VSBG, ob der Betrieb an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilnimmt – Pflicht u. a., wenn AGB verwendet werden und mehr als 10 Personen beschäftigt sind; sonst freiwillig.]]`;

    case "datenschutz":
      return `${KOPF}

## Verantwortlicher
${haus}, [[ANSCHRIFT]], [[E-MAIL]], [[TELEFON]].
[[Datenschutzbeauftragter – nur falls benannt]]

## Reservierungen und Abholbestellungen
Wenn Sie über diese Website einen Tisch anfragen oder Essen zur Abholung bestellen, verarbeiten wir die Angaben aus dem Formular: Name, Telefonnummer, Datum/Uhrzeit bzw. Abholzeit, Personenzahl, bestellte Speisen, Ihre Anmerkungen und – nur wenn Sie sie angeben – Ihre E-Mail-Adresse. Zweck ist die Bearbeitung und Durchführung Ihrer Anfrage bzw. Bestellung (Art. 6 Abs. 1 lit. b DSGVO). Ohne Name, Telefonnummer und Zeitangabe können wir die Anfrage nicht bearbeiten.
Die E-Mail-Adresse nutzen wir ausschließlich für Nachrichten zu dieser Anfrage (Eingang, Bestätigung, Ablehnung, geänderte Zeiten). Kein Newsletter, keine Werbung.

## Persönlicher Status-Link
Nach dem Absenden erhalten Sie einen Link, über den Sie den Stand Ihrer Anfrage abrufen können. Er enthält einen zufälligen Schlüssel, zeigt keine persönlichen Daten und läuft 30 Tage nach dem Termin ab.

## Bestätigung von Bedingungen und No-Show-Regeln
Bestätigen Sie beim Absenden Bedingungen oder eine No-Show-Regel, speichern wir, welche Fassung Sie wann bestätigt haben, zur Vertragsdurchführung und zum Nachweis (Art. 6 Abs. 1 lit. b und f DSGVO). Eine vollständige IP-Adresse speichern wir dafür nicht.

## Empfänger und Dienstleister
- Hosting des Reservierungs- und Bestellservers: [[ANBIETER, SITZ, SERVERSTANDORT]] (Auftragsverarbeitung, Art. 28 DSGVO).
- Technische Betreuung der Website: [[NAME DER WEBAGENTUR]] (Auftragsverarbeitung, Art. 28 DSGVO) – [[prüfen]].
- E-Mail-Versand: [[z. B. Resend, Inc., USA – Auftragsverarbeitung, Drittlandübermittlung und Garantien prüfen]] – nur, wenn Sie eine E-Mail-Adresse angeben.
- Benachrichtigung des Restaurants: [[Web-Push-Dienst des Browsers und/oder Telegram – die Benachrichtigung enthält Name und Telefonnummer; Anbieter, Drittland und Rechtsgrundlage prüfen oder Inhalt kürzen]].
- [[Bilder, Karten, Schriften: nur falls von Dritten geladen – derzeit laden veröffentlichte Beispielseiten Fotos von Unsplash; für die Kundenseite selbst hosten oder hier nennen]].

## Warenkorb im Browser
Der Warenkorb wird im Speicher Ihres Browsers (localStorage) abgelegt, damit er beim Neuladen nicht verloren geht. Das ist für den von Ihnen gewünschten Bestellvorgang erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG). Es gibt keine Analyse- oder Werbe-Cookies.

## Seitenaufrufe
[[Nur falls die aggregierte Zählung beim Host aktiviert wird: Beschreibung – je Tag und Seitentyp gezählt, keine IP-Adresse, keine Kennung, Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO. Sonst Abschnitt streichen.]]

## Server-Protokolle
[[Welche Protokolle der Host speichert (z. B. IP-Adresse, Zeit), wie lange, Rechtsgrundlage]]

## Speicherdauer
[[z. B. Reservierungen und Bestellungen X Monate nach dem Termin löschen; Bestätigungsnachweise so lange, wie Ansprüche daraus bestehen können; steuerliche Aufbewahrungspflichten für Rechnungen]]

## Ihre Rechte
Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20), Widerspruch gegen Verarbeitungen nach Art. 6 Abs. 1 lit. f (Art. 21 DSGVO) sowie Beschwerde bei einer Aufsichtsbehörde, z. B. [[ZUSTÄNDIGE LANDESDATENSCHUTZBEHÖRDE]].

Stand: [[DATUM]]`;

    case "bestellbedingungen":
      return `${KOPF}

## Geltungsbereich und Vertragspartner
Diese Bedingungen gelten für Abholbestellungen über die Website von ${haus}, [[ANSCHRIFT]].

## Vertragsschluss
Die Speisekarte auf der Website ist kein bindendes Angebot. Mit „Zahlungspflichtig bestellen“ geben Sie eine verbindliche Bestellung ab. Der Vertrag kommt zustande, wenn wir die Bestellung bestätigen (Statusseite bzw. E-Mail); bis dahin lautet der Status „Bestellung eingegangen – noch nicht bestätigt“. [[Prüfen: Annahmefrist, z. B. „Bestätigen wir nicht innerhalb von X Minuten, sind Sie nicht mehr gebunden“]].

## Preise und Zahlung
Alle Preise in Euro inklusive gesetzlicher Umsatzsteuer. Bezahlt wird bei Abholung [[bar / mit Karte]]. Eine Online-Zahlung findet nicht statt.

## Abholung
Die Abholzeit ist verbindlich, sobald wir sie bestätigt haben. Ändert sich die Zeit, informieren wir Sie über die Statusseite, per E-Mail (falls angegeben) oder telefonisch.

## Allergene und Zusatzstoffe
[[Wo die Allergen- und Zusatzstoffinformationen vor der Bestellung abrufbar sind – derzeit enthält die Speisekarte der Website KEINE Allergenangaben]].

## Widerrufsrecht
[[Prüfen: Für schnell verderbliche Speisen besteht nach § 312g Abs. 2 Nr. 2 BGB in der Regel kein Widerrufsrecht; Formulierung und Belehrung fachlich prüfen lassen]].

## Stornierung
Sie können eine Bestellung über [[Telefon / Status-Link]] stornieren. [[Falls eine No-Show-Regel gilt: Verweis darauf – die Regel wird beim Bestellen gesondert angezeigt und bestätigt.]]

## Streitbeilegung
[[Angabe nach § 36 VSBG]]

Stand: [[DATUM]]`;

    case "reservierungsbedingungen":
      return `${KOPF}

## Anfrage und Bestätigung
Über die Website senden Sie eine Reservierungsanfrage an ${haus}. Verbindlich ist die Reservierung erst, wenn wir sie bestätigen (Statusseite bzw. E-Mail). Bis dahin lautet der Status „Anfrage eingegangen – noch nicht bestätigt“.

## Verspätung
Wir halten den Tisch [[X]] Minuten über die vereinbarte Zeit hinaus frei. [[Prüfen]]

## Absage
Bitte sagen Sie ab, wenn Sie nicht kommen können: [[Telefon / E-Mail]].

## Gruppen
[[Besondere Regeln für größere Gruppen, z. B. Vorbestellung des Menüs]]

## Gebühren
Für Reservierungen fällt keine Gebühr an, solange keine gesonderte, freigegebene No-Show-Regel gilt, die Ihnen vor dem Absenden angezeigt und von Ihnen gesondert bestätigt wurde.

Stand: [[DATUM]]`;

    case "noshow-bestellung":
    case "noshow-reservierung": {
      const bestellung = art === "noshow-bestellung";
      const betrag = p.betrag ? euro(p.betrag) : "[[BETRAG]]";
      const frist = fensterText(p.stornofensterMinuten);
      return `${KOPF}

## Wann die Regel gilt
${bestellung
  ? `Wenn Sie eine vom Restaurant bestätigte Abholbestellung nicht abholen und nicht spätestens ${frist} vor der bestätigten Abholzeit stornieren.`
  : `Wenn Sie zu einer vom Restaurant bestätigten Reservierung nicht erscheinen und sie nicht spätestens ${frist} vor dem Termin absagen.`}

## Höhe
${bestellung ? `Pauschal ${betrag}.` : p.berechnung === "pauschal" ? `Pauschal ${betrag} je Reservierung.` : `${betrag} je reservierter Person.`}
[[Begründung des Betriebs, warum dieser Betrag den typischerweise zu erwartenden Schaden nicht übersteigt (z. B. Wareneinsatz, nicht mehr verkäufliche Speisen, freigehaltener Tisch) – nur für die interne Prüfung, vor Freigabe aus dem Text entfernen]]

## Nachweis eines geringeren Schadens
Ihnen bleibt ausdrücklich der Nachweis gestattet, dass dem Restaurant kein oder ein wesentlich geringerer Schaden als die Pauschale entstanden ist.

## Stornierung
Kostenfrei bis ${frist} vorher über [[Status-Link / Telefon]].

## Abrechnung
Es wird nichts automatisch abgebucht. Das Restaurant prüft jeden Fall einzeln und stellt eine Pauschale gegebenenfalls in Rechnung.${bestellung ? "" : `
Nachweis der Absprache: [[wie belegt wird, dass die Reservierung bestätigt war und der Gast nicht erschienen ist]]`}

Stand: [[DATUM]]`;
    }
    default:
      throw new Error(`Unbekannte Dokumentart "${art}".`);
  }
}

function standardZustimmung(art, name, parameter) {
  const haus = name || "[[NAME DES RESTAURANTS]]";
  if (art === "bestellbedingungen") return `Ich habe die Bestellbedingungen von ${haus} gelesen und akzeptiere sie.`;
  if (art === "reservierungsbedingungen") return `Ich habe die Reservierungsbedingungen von ${haus} gelesen und akzeptiere sie.`;
  if (art === "noshow-bestellung" || art === "noshow-reservierung") return noShowZustimmungstext(art, parameter ?? {});
  return "";
}

/** Ein neuer Entwurf aus der Vorlage – mit Platzhaltern, ohne erfundene Angaben. */
export function entwurfAusVorlage(art, { name = "", parameter } = {}) {
  if (!istArt(art)) throw new Error(`Unbekannte Dokumentart "${art}".`);
  const p = art.startsWith("noshow-") ? pruefeNoShowParameter(art, parameter) : null;
  return {
    art,
    titel: DOKUMENT_ARTEN[art].titel,
    inhalt: vorlage(art, { name, parameter: p }),
    zustimmungstext: standardZustimmung(art, name, p),
    parameter: p,
  };
}

/* ---------- Freigabe ---------- */

/**
 * Was einer Freigabe entgegensteht. Leere Liste = freigabefähig. Prüft nur
 * Formales (Platzhalter, Entwurfsmarke, Angaben zur Freigabe, Parameter) –
 * nicht, ob der Text rechtlich trägt.
 */
export function freigabeHindernisse(dok, { freigegebenVon, pruefvermerk, geprueftBestaetigt } = {}) {
  const h = [];
  if (dok.status !== "entwurf") h.push("Nur Entwürfe können freigegeben werden.");
  if (String(dok.inhalt ?? "").includes(ENTWURF_MARKE)) h.push("Der Entwurfsvermerk steht noch im Text.");
  const offen = [...platzhalterIn(dok.inhalt), ...platzhalterIn(dok.zustimmungstext)];
  if (offen.length) h.push(`Offene Platzhalter: ${[...new Set(offen)].slice(0, 8).join(", ")}${offen.length > 8 ? " …" : ""}`);
  if (String(dok.inhalt ?? "").trim().length < 40) h.push("Der Text ist zu kurz.");
  if (!String(freigegebenVon ?? "").trim()) h.push("Bitte angeben, wer die Fassung für den Betrieb freigibt.");
  if (!String(pruefvermerk ?? "").trim()) h.push("Bitte vermerken, wer den Text fachlich/rechtlich geprüft hat (oder dass bewusst darauf verzichtet wurde).");
  if (geprueftBestaetigt !== true) h.push("Die Freigabe muss ausdrücklich bestätigt werden.");
  const art = DOKUMENT_ARTEN[dok.art];
  if (art?.bestaetigung && !String(dok.zustimmungstext ?? "").trim()) h.push("Es fehlt der Bestätigungstext für das Formular.");
  if (dok.art?.startsWith("noshow-")) {
    const p = dok.parameter ?? {};
    if (!(p.betrag > 0)) h.push("Für die No-Show-Regel fehlt der Betrag.");
    if (!Number.isInteger(p.stornofensterMinuten)) h.push("Für die No-Show-Regel fehlt die Stornofrist.");
    if (p.betrag > 0 && !String(dok.zustimmungstext).includes(euro(p.betrag))) h.push("Der Bestätigungstext nennt nicht den Betrag der Regel.");
    if (p.betrag > 0 && !String(dok.inhalt).includes(euro(p.betrag))) h.push("Der Regeltext nennt nicht den Betrag der Regel.");
    if (!/Nachweis/i.test(dok.inhalt) || !/geringer/i.test(dok.inhalt)) h.push("Der Regeltext muss den Nachweis eines fehlenden oder wesentlich geringeren Schadens ausdrücklich zulassen.");
    if (dok.art === "noshow-reservierung" && !String(p.nachweisweg ?? "").trim()) h.push("Für die Reservierungs-No-Show-Regel fehlt der dokumentierte Nachweisweg.");
  }
  return h;
}

/* ---------- Gültige Fassungen ---------- */

/** Die aktuell gültige freigegebene Fassung einer Art (oder null). */
export function gueltigeFassung(dokumente, art, jetzt = new Date()) {
  const t = jetzt.getTime();
  return (
    (dokumente ?? [])
      .filter((d) => d.art === art && d.status === "freigegeben" && new Date(d.gueltigAb).getTime() <= t)
      .sort((a, b) => new Date(b.gueltigAb) - new Date(a.gueltigAb) || b.versionNr - a.versionNr)[0] ?? null
  );
}

/** Ist die No-Show-Regel für Bestellungen wirksam eingeschaltet? */
export function noShowBestellungAktiv(daten, jetzt = new Date()) {
  const dok = gueltigeFassung(daten.rechtsdokumente, "noshow-bestellung", jetzt);
  return daten.noShowSchutzAktiv && dok ? dok : null;
}

export function noShowReservierungAktiv(daten, jetzt = new Date()) {
  const dok = gueltigeFassung(daten.rechtsdokumente, "noshow-reservierung", jetzt);
  return daten.reservierungNoShowAktiv === true && dok ? dok : null;
}

/**
 * Was ein Vorgang beim Absenden bestätigen muss: Bedingungen (falls der
 * Betrieb freigegebene Bedingungen verwendet) und – getrennt – die
 * No-Show-Regel (falls wirksam eingeschaltet).
 */
export function erforderlicheBestaetigungen(daten, vorgang, jetzt = new Date()) {
  const bedingungen = gueltigeFassung(daten.rechtsdokumente, vorgang === "bestellung" ? "bestellbedingungen" : "reservierungsbedingungen", jetzt);
  const noShow = vorgang === "bestellung" ? noShowBestellungAktiv(daten, jetzt) : noShowReservierungAktiv(daten, jetzt);
  return { bedingungen, noShow };
}

function oeffentlich(dok, basis = "") {
  if (!dok) return null;
  return {
    art: dok.art,
    titel: dok.titel,
    version: dok.version,
    gueltigAb: dok.gueltigAb,
    zustimmungstext: dok.zustimmungstext || "",
    pfad: `${basis}/rechtstexte/${DOKUMENT_ARTEN[dok.art].pfad}/${dok.version}`,
    parameter: dok.art.startsWith("noshow-") ? { betrag: dok.parameter.betrag, stornofensterMinuten: dok.parameter.stornofensterMinuten, berechnung: dok.parameter.berechnung } : undefined,
  };
}

/** Öffentliche Lage für die Formulare – nur freigegebene Fassungen. */
export function oeffentlicheRechtslage(daten, jetzt = new Date()) {
  const bestellung = erforderlicheBestaetigungen(daten, "bestellung", jetzt);
  const reservierung = erforderlicheBestaetigungen(daten, "reservierung", jetzt);
  return {
    impressum: oeffentlich(gueltigeFassung(daten.rechtsdokumente, "impressum", jetzt)),
    datenschutz: oeffentlich(gueltigeFassung(daten.rechtsdokumente, "datenschutz", jetzt)),
    bestellung: { bedingungen: oeffentlich(bestellung.bedingungen), noShow: oeffentlich(bestellung.noShow) },
    reservierung: { bedingungen: oeffentlich(reservierung.bedingungen), noShow: oeffentlich(reservierung.noShow) },
  };
}

function nachweis(dok, zeitpunkt, extra = {}) {
  return { art: dok.art, dokumentId: dok.id, version: dok.version, inhaltHash: dok.inhaltHash, zeitpunkt, status: "bestaetigt", ...extra };
}

/**
 * Prüft beim Absenden, ob die erforderlichen Bestätigungen für GENAU die
 * gültigen Fassungen vorliegen. Wirft mit einer Meldung für den Gast, sonst
 * die Nachweise für den Vorgang.
 *
 * eingabe.bestaetigungen = { bedingungen: "<version>", noShow: "<version>" }
 * (für Bestellungen zusätzlich die ältere Form noShowZustimmung: true +
 * noShowVersion).
 */
export function pruefeBestaetigungen(daten, vorgang, eingabe, jetzt = new Date()) {
  const noetig = erforderlicheBestaetigungen(daten, vorgang, jetzt);
  const b = eingabe?.bestaetigungen && typeof eingabe.bestaetigungen === "object" ? eingabe.bestaetigungen : {};
  const zeitpunkt = jetzt.toISOString();
  const nachweise = [];
  const name = vorgang === "bestellung" ? "Bestellbedingungen" : "Reservierungsbedingungen";

  if (noetig.bedingungen) {
    const version = b.bedingungen;
    if (!version) throw new Error(`Bitte bestätigen Sie die ${name}, um fortzufahren.`);
    if (version !== noetig.bedingungen.version) {
      throw new Error(`Die ${name} wurden inzwischen aktualisiert (gültig ist Fassung ${noetig.bedingungen.version}). Bitte lesen und erneut bestätigen.`);
    }
    nachweise.push(nachweis(noetig.bedingungen, zeitpunkt));
  }

  let noShow = null;
  if (noetig.noShow) {
    const version = b.noShow ?? (eingabe?.noShowZustimmung === true ? eingabe.noShowVersion : undefined);
    if (!version) throw new Error("Bitte stimmen Sie der Ausfallpauschale zu, um fortzufahren.");
    if (version !== noetig.noShow.version) {
      throw new Error(`Die No-Show-Regel wurde inzwischen geändert (gültig ist Fassung ${noetig.noShow.version}). Bitte lesen und erneut bestätigen.`);
    }
    noShow = noetig.noShow;
    nachweise.push(nachweis(noShow, zeitpunkt, { betrag: noShow.parameter.betrag, ...(noShow.parameter.berechnung ? { berechnung: noShow.parameter.berechnung } : {}) }));
  }
  return { nachweise, noShow };
}

/* ---------- Startklar? ---------- */

/**
 * Prüfliste vor dem Livegang eines Betriebs. Technische Punkte, keine
 * rechtliche Bewertung.
 */
export function launchPruefung(daten, { wirtPasswortGesetzt, oeffentlicheUrl, emailEingerichtet, jetzt = new Date() } = {}) {
  const punkte = [
    { punkt: "Wirt-Dashboard mit Passwort geschützt (WIRT_PASSWORT)", ok: Boolean(wirtPasswortGesetzt), blocker: true },
    { punkt: "Öffentliche HTTPS-Adresse des Wirt-Servers (WIRT_OEFFENTLICHE_URL)", ok: /^https:\/\//.test(oeffentlicheUrl ?? ""), blocker: true },
    { punkt: "Impressum des Restaurants freigegeben", ok: Boolean(gueltigeFassung(daten.rechtsdokumente, "impressum", jetzt)), blocker: true },
    { punkt: "Datenschutzerklärung des Restaurants freigegeben", ok: Boolean(gueltigeFassung(daten.rechtsdokumente, "datenschutz", jetzt)), blocker: true },
    { punkt: "Name und Telefon des Hauses für Statusseite und E-Mails", ok: Boolean(daten.anzeigeName && daten.telefon), blocker: false },
    { punkt: "E-Mail-Versand eingerichtet (optional – sonst nur Status-Link und Anruf)", ok: Boolean(emailEingerichtet), blocker: false },
    { punkt: "Allergeninformationen vor der Bestellung abrufbar (in der Speisekarte nicht enthalten)", ok: Boolean(daten.launchVermerke?.allergene), blocker: true, vermerk: "allergene", stand: daten.launchVermerke?.allergene ?? null },
    { punkt: "Auftragsverarbeitung mit Host/Agentur/Mail-Dienst geklärt (AVV)", ok: Boolean(daten.launchVermerke?.avv), blocker: true, vermerk: "avv", stand: daten.launchVermerke?.avv ?? null },
  ];
  if (daten.noShowSchutzAktiv && !noShowBestellungAktiv(daten, jetzt)) {
    punkte.push({ punkt: "No-Show-Schutz eingeschaltet, aber ohne gültige freigegebene Regel – wirkt nicht", ok: false, blocker: false });
  }
  return { punkte, startklar: punkte.every((p) => p.ok || !p.blocker) };
}

/* ---------- Öffentliche Anzeige ---------- */

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function datumDe(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", dateStyle: "long" }).format(d);
}

/** Absätze und „## “-Überschriften – mehr Auszeichnung brauchen die Texte nicht. */
function textAlsHtml(text) {
  return String(text ?? "")
    .split(/\n{2,}/)
    .map((block) => {
      const zeilen = block.split("\n");
      if (zeilen[0].startsWith("## ")) {
        const rest = zeilen.slice(1).join("\n");
        return `<h2>${esc(zeilen[0].slice(3))}</h2>${rest.trim() ? `<p>${esc(rest).replace(/\n/g, "<br>")}</p>` : ""}`;
      }
      if (zeilen.every((z) => z.startsWith("- "))) return `<ul>${zeilen.map((z) => `<li>${esc(z.slice(2))}</li>`).join("")}</ul>`;
      return `<p>${esc(block).replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");
}

/**
 * Lesbare, druck- und speicherbare Seite einer freigegebenen Fassung. Ohne
 * Fassung: ein ehrlicher Hinweis statt eines Entwurfs.
 */
export function rechtstextSeite({ art, dok, betriebName, aktuell = true, txtPfad = "" }) {
  const titel = DOKUMENT_ARTEN[art]?.titel ?? "Rechtstext";
  const kopf = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(titel)} – ${esc(betriebName)}</title>
<style>
:root{--bg:#faf8f4;--text:#1f1c18;--muted:#6a6358;--line:#e4ded4;--warn:#7a5a12;--warn-bg:#fbf1d9}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#15130f;--text:#f2eee7;--muted:#b3aa9c;--line:#34302a;--warn:#f0cf7d;--warn-bg:#3a2f14}}
body{margin:0;background:var(--bg);color:var(--text);font:17px/1.6 Georgia,"Times New Roman",serif}
main{max-width:720px;margin:0 auto;padding:32px 16px 64px}
h1{font-size:1.7rem;line-height:1.25;margin:0 0 6px}h2{font-size:1.15rem;margin:28px 0 6px}
.meta{color:var(--muted);font-size:.9rem;font-family:system-ui,sans-serif}
.hinweis{background:var(--warn-bg);color:var(--warn);padding:10px 14px;border-radius:8px;font-family:system-ui,sans-serif;font-size:.92rem}
.leiste{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0 8px;font-family:system-ui,sans-serif}
.leiste a,.leiste button{border:1px solid var(--line);background:transparent;color:var(--text);border-radius:8px;padding:8px 14px;font:inherit;font-size:.9rem;cursor:pointer;text-decoration:none}
@media print{.leiste{display:none}}
</style></head><body><main>`;
  if (!dok) {
    return `${kopf}<h1>${esc(titel)}</h1><p class="meta">${esc(betriebName)}</p>
<p class="hinweis">Für dieses Restaurant ist noch keine freigegebene Fassung hinterlegt.</p></main></body></html>`;
  }
  return `${kopf}<h1>${esc(dok.titel || titel)}</h1>
<p class="meta">${esc(betriebName)} · Fassung ${esc(dok.version)} · gültig ab ${esc(datumDe(dok.gueltigAb))}${dok.status === "zurueckgezogen" ? ` · zurückgezogen am ${esc(datumDe(dok.zurueckgezogenAm))}` : ""}</p>
${aktuell ? "" : `<p class="hinweis">Das ist nicht die aktuell gültige Fassung. Sie bleibt abrufbar, weil frühere Anfragen oder Bestellungen auf sie verweisen.</p>`}
<div class="leiste"><button type="button" onclick="window.print()">Drucken oder als PDF speichern</button>${txtPfad ? `<a href="${esc(txtPfad)}" download>Als Textdatei speichern</a>` : ""}</div>
${textAlsHtml(dok.inhalt)}
${dok.zustimmungstext ? `<h2>Bestätigungstext im Formular</h2><p>${esc(dok.zustimmungstext)}</p>` : ""}
<p class="meta">Prüfsumme dieser Fassung (SHA-256): ${esc(dok.inhaltHash)}</p>
</main></body></html>`;
}
