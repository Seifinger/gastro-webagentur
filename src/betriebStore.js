import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, randomInt } from "node:crypto";
import {
  berechneAbholzeiten,
  pruefeAbholwunsch,
  zeitpunktFuerUhrzeit,
  ASAP_VORLAUF_MINUTEN,
  RASTER_MINUTEN,
  STANDARD_OEFFNUNGSZEITEN,
  ZEITZONE_STANDARD,
} from "./abholzeiten.js";
import {
  ereignisAusAenderung,
  gastToken,
  tokenHash,
  istTokenFormat,
  linkAbgelaufen,
  neuesGeheimnis,
  pruefeEmail,
  referenzVon,
} from "./gastStatus.js";
import {
  DOKUMENT_ARTEN,
  entwurfAusVorlage,
  freigabeHindernisse,
  gueltigeFassung,
  inhaltHash,
  istArt,
  pruefeBestaetigungen,
  pruefeNoShowParameter,
} from "./rechtstexte.js";
import { QUELLEN as SEITENAUFRUF_QUELLEN } from "./seitenaufrufe.js";

// Datenhaltung eines Betriebs: Tischplan, Reservierungen, Bestellungen.
// Eine JSON-Datei je Betrieb – das reicht für ein Haus mit ein paar Dutzend
// Reservierungen am Tag und bleibt ohne Datenbank nachvollziehbar.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const betriebeDir = path.join(__dirname, "..", "data", "betrieb");

// Wie lange ein Tisch als belegt gilt. Zwei Stunden sind in der Gastronomie
// der übliche Ansatz für einen Durchgang.
export const BELEGDAUER_MINUTEN = 120;

export const RESERVIERUNG_STATUS = ["neu", "bestaetigt", "abgesagt"];
export const BESTELLUNG_STATUS = ["neu", "bestaetigt", "abgeholt", "abgelehnt", "storniert"];

export const NO_SHOW_STORNOFENSTER_MINUTEN_DEFAULT = 30;

/**
 * Die Uhr des Betriebs. Im Betrieb schlicht new Date(); Tests stellen sie
 * fest (dasselbe Hook-Muster wie pushSendenHook/telegramSendenHook), damit
 * Abholzeiten nicht von der Tageszeit des Testlaufs abhängen.
 */
export const uhrHook = { jetzt: () => new Date() };
export const NO_SHOW_WARN_SCHWELLE_DEFAULT = 2;

function datei(slug) {
  return path.join(betriebeDir, `${slug}.json`);
}

function leererBetrieb() {
  return {
    tische: [],
    reservierungen: [],
    bestellungen: [],
    zusaetzlicheWartezeitMinuten: 0,
    pushSubscriptions: [],
    telegramChatId: "",
    wartezeitLernenAktiv: false,
    noShowSchutzAktiv: false,
    noShowGebuehrBetrag: 0,
    noShowStornofensterMinuten: NO_SHOW_STORNOFENSTER_MINUTEN_DEFAULT,
    noShowWarnSchwelle: NO_SHOW_WARN_SCHWELLE_DEFAULT,
    bankverbindung: "",
    // Für Statusseite und Gast-E-Mails: wie das Haus heißt und unter welcher
    // Nummer Gäste nachfragen können (siehe setzeGastKontakt).
    anzeigeName: "",
    telefon: "",
    // Protokoll der Gast-Ereignisse samt Versandstand (siehe
    // vermerkeGastMeldungen und kundenBenachrichtigung.js).
    gastMeldungen: [],
    // Demo-/Präsentationsbetrieb: keine Status-Links, keine Gast-E-Mails.
    demoBetrieb: false,
    // Rechtstexte des Restaurants, versioniert (siehe rechtstexte.js).
    rechtsdokumente: [],
    // No-Show für Reservierungen: vorbereitet, standardmäßig aus, nur mit
    // freigegebener Regel einschaltbar (setzeReservierungsNoShow).
    reservierungNoShowAktiv: false,
    // Manuell bestätigte Punkte der Launch-Prüfliste (wer, wann, Vermerk).
    launchVermerke: {},
  };
}

export function ladeBetrieb(slug) {
  try {
    const daten = JSON.parse(readFileSync(datei(slug), "utf-8"));
    return { ...leererBetrieb(), ...daten };
  } catch {
    return leererBetrieb();
  }
}

export function speichereBetrieb(slug, daten) {
  // Gast-Ereignisse entstehen aus dem Unterschied zwischen dem, was auf der
  // Platte steht, und dem, was gleich darauf steht – also nur aus einer
  // tatsächlich gespeicherten Änderung, egal über welchen Weg (v1-Dashboard,
  // v2-Küchenstatus, Telegram-Knopf). Dieselbe Schreiboperation hält Änderung
  // und Ereignis fest; es gibt keinen Zwischenstand, in dem das eine ohne
  // das andere existiert.
  vermerkeGastMeldungen(betriebExistiert(slug) ? ladeBetrieb(slug) : null, daten);
  mkdirSync(betriebeDir, { recursive: true });
  writeFileSync(datei(slug), `${JSON.stringify(daten, null, 2)}\n`, "utf-8");
  return daten;
}

function aendere(slug, fn) {
  const daten = ladeBetrieb(slug);
  const ergebnis = fn(daten);
  speichereBetrieb(slug, daten);
  return ergebnis;
}

export function betriebExistiert(slug) {
  return existsSync(datei(slug));
}

/* ---------- Tischplan ---------- */

export function legeTischAn(slug, { name, plaetze }) {
  const sauber = String(name ?? "").trim();
  const anzahl = Number(plaetze);

  if (!sauber) throw new Error("Der Tisch braucht eine Bezeichnung.");
  if (!Number.isInteger(anzahl) || anzahl < 1 || anzahl > 40) {
    throw new Error("Die Platzzahl muss zwischen 1 und 40 liegen.");
  }

  return aendere(slug, (daten) => {
    if (daten.tische.some((t) => t.name.toLowerCase() === sauber.toLowerCase())) {
      throw new Error(`Es gibt bereits einen Tisch "${sauber}".`);
    }
    const tisch = { id: randomUUID(), name: sauber, plaetze: anzahl };
    daten.tische.push(tisch);
    return tisch;
  });
}

export function entferneTisch(slug, tischId) {
  return aendere(slug, (daten) => {
    daten.tische = daten.tische.filter((t) => t.id !== tischId);
    // Zuweisungen auf einen gelöschten Tisch lösen, statt sie ins Leere
    // zeigen zu lassen.
    for (const r of daten.reservierungen) {
      if (r.tischId === tischId) r.tischId = null;
    }
    return true;
  });
}

export function gesamtPlaetze(daten) {
  return daten.tische.reduce((summe, t) => summe + t.plaetze, 0);
}

/* ---------- Kapazität ---------- */

function zuMinuten(uhrzeit) {
  const [h, m] = String(uhrzeit ?? "").split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

/**
 * Überschneiden sich zwei Sitzungen? Beide belegen BELEGDAUER_MINUTEN.
 */
export function ueberschneidetSich(uhrzeitA, uhrzeitB) {
  const a = zuMinuten(uhrzeitA);
  const b = zuMinuten(uhrzeitB);
  if (a === null || b === null) return false;
  return Math.abs(a - b) < BELEGDAUER_MINUTEN;
}

/**
 * Wie viele Plätze sind zu einem Zeitpunkt noch frei? Abgesagte
 * Reservierungen zählen nicht mit.
 */
export function freiePlaetze(daten, datum, uhrzeit, { ignoriereId } = {}) {
  const belegt = daten.reservierungen
    .filter((r) => r.id !== ignoriereId)
    .filter((r) => r.status !== "abgesagt")
    .filter((r) => r.datum === datum && ueberschneidetSich(r.uhrzeit, uhrzeit))
    .reduce((summe, r) => summe + Number(r.personen || 0), 0);

  return gesamtPlaetze(daten) - belegt;
}


/**
 * Passen diese Gruppen gleichzeitig an diese Tische? Eine Gruppe bekommt
 * genau einen Tisch, Tische werden hier nicht zusammengestellt.
 *
 * Gibt die Gruppengrößen zurück, für die kein Tisch übrig bleibt – eine
 * leere Liste heißt also: geht auf.
 *
 * Das Verfahren ist absichtlich einfach und trotzdem exakt: größte Gruppe
 * zuerst, und die bekommt den kleinsten Tisch, auf dem sie noch Platz hat.
 * Weil ein Tisch, der eine große Gruppe fasst, jede kleinere erst recht
 * fasst, lässt sich damit nichts besser verteilen – Raten oder Durchprobieren
 * wäre hier nur teurer, nicht klüger.
 */
export function unverteilbareGruppen(tische, gruppen) {
  const frei = tische.map((t) => Number(t.plaetze)).sort((a, b) => a - b);
  const offen = [];

  for (const gruppe of [...gruppen].sort((a, b) => b - a)) {
    const index = frei.findIndex((plaetze) => plaetze >= gruppe);
    if (index === -1) offen.push(gruppe);
    else frei.splice(index, 1);
  }

  return offen;
}

/**
 * Die Gruppengrößen, die zu einem Zeitpunkt gleichzeitig im Haus sind.
 */
function gruppenZurZeit(daten, datum, uhrzeit, { ignoriereId } = {}) {
  return daten.reservierungen
    .filter((r) => r.id !== ignoriereId)
    .filter((r) => r.status !== "abgesagt")
    .filter((r) => r.datum === datum && ueberschneidetSich(r.uhrzeit, uhrzeit))
    .map((r) => Number(r.personen || 0));
}

/**
 * Prüft die Tischverteilung zu einem Zeitpunkt – inklusive einer noch nicht
 * gespeicherten Reservierung (zusatz).
 *
 * Genau hier liegt der Fall, den die reine Platzsumme durchgehen lässt: bei
 * einem Vierer- und einem Zweiertisch sind sechs Plätze frei, zwei Dreier-
 * gruppen passen trotzdem nicht hinein. Auf dem Papier geht es auf, im Raum
 * steht die zweite Gruppe.
 */
export function tischVerteilung(daten, datum, uhrzeit, { ignoriereId, zusatz } = {}) {
  const gruppen = gruppenZurZeit(daten, datum, uhrzeit, { ignoriereId });
  if (zusatz) gruppen.push(Number(zusatz));

  const offen = unverteilbareGruppen(daten.tische, gruppen);
  if (offen.length === 0) return null;

  const groesster = Math.max(...daten.tische.map((t) => Number(t.plaetze)), 0);
  const liste = offen.join(" und ");

  return {
    offen,
    // Für den Wirt: nennt das Problem und den einzigen Ausweg, den er hat.
    wirtText:
      `Die Plätze reichen zwar, aber nicht die Tische: für ${offen.length === 1 ? "eine Gruppe" : `${offen.length} Gruppen`} ` +
      `(${liste} Personen) bleibt um ${uhrzeit} kein passender Tisch frei. ` +
      (Math.max(...offen) > groesster
        ? `Der größte Tisch im Haus hat ${groesster} Plätze.`
        : "Das geht nur, wenn Sie Tische zusammenstellen."),
    // Für den Gast: sagt ab, ohne den Tischplan auszuplaudern.
    gastText: `Für ${zusatz} Personen haben wir um ${uhrzeit} leider keinen passenden Tisch mehr frei.`,
  };
}

/**
 * Alle Zeitpunkte, an denen die Tischverteilung nicht aufgeht. Das Dashboard
 * zeigt das als stehenden Hinweis – ein Problem, das nur einmal im
 * Speichern-Dialog aufblitzt, ist am nächsten Tag vergessen.
 */
export function tischKonflikte(daten) {
  const gesehen = new Set();
  const konflikte = [];

  for (const r of daten.reservierungen) {
    if (r.status === "abgesagt") continue;
    const schluessel = `${r.datum} ${r.uhrzeit}`;
    if (gesehen.has(schluessel)) continue;
    gesehen.add(schluessel);

    const problem = tischVerteilung(daten, r.datum, r.uhrzeit);
    if (problem) konflikte.push({ datum: r.datum, uhrzeit: r.uhrzeit, ...problem });
  }

  return konflikte.sort((a, b) => `${a.datum}${a.uhrzeit}`.localeCompare(`${b.datum}${b.uhrzeit}`));
}

/* ---------- Abholzeiten ---------- */

// Die Rechnung selbst steht in abholzeiten.js – für Browser und Server
// dieselbe. Hier nur die Werte, die der Betrieb dazu beisteuert.
export const ABHOL_VORLAUF_MINUTEN = ASAP_VORLAUF_MINUTEN;
export const ABHOL_SCHRITT_MINUTEN = RASTER_MINUTEN;

/**
 * Womit für diesen Betrieb gerechnet wird: eigene Öffnungszeiten (Feld
 * "oeffnungszeiten", dieselben Zeilen { tage, zeiten } wie auf der Seite)
 * oder die Standardzeiten der Seite, Zeitzone des Restaurants und die
 * Zusatz-Wartezeit des Wirts (additiv auf den Grundvorlauf).
 */
export function abholEinstellungen(daten, { extraMinuten = 0 } = {}) {
  return {
    oeffnungszeiten: Array.isArray(daten.oeffnungszeiten) && daten.oeffnungszeiten.length ? daten.oeffnungszeiten : STANDARD_OEFFNUNGSZEITEN,
    zeitzone: daten.zeitzone || ZEITZONE_STANDARD,
    zusatzMinuten: (Number(daten.zusaetzlicheWartezeitMinuten) || 0) + (Number(extraMinuten) || 0),
  };
}

export const WARTEZEIT_MAX_MINUTEN = 180;

/**
 * Setzt die Zusatz-Wartezeit, die der Wirt bei Rückstand in der Küche selbst
 * hochsetzt. Wirkt additiv auf neu berechnete Abholzeiten (20 + Zusatz für
 * "so schnell wie möglich", 25 + Zusatz für geplante Zeiten, abholzeiten.js)
 * – bereits bestätigte Bestellungen behalten ihre einmal zugesagte Zeit.
 */
export function setzeWartezeit(slug, minuten) {
  const wert = Number(minuten);
  if (!Number.isInteger(wert) || wert < 0 || wert > WARTEZEIT_MAX_MINUTEN) {
    throw new Error(`Die Zusatz-Wartezeit muss zwischen 0 und ${WARTEZEIT_MAX_MINUTEN} Minuten liegen.`);
  }

  return aendere(slug, (daten) => {
    daten.zusaetzlicheWartezeitMinuten = wert;
    return wert;
  });
}

/**
 * Schaltet das lernende Wartezeit-System für einen Betrieb ein oder aus.
 * Default aus, damit bestehende Betriebe sich nicht plötzlich anders
 * verhalten – siehe wartezeitLernStore.js für die gelernten Werte selbst.
 */
export function setzeWartezeitLernenAktiv(slug, aktiv) {
  return aendere(slug, (daten) => {
    daten.wartezeitLernenAktiv = Boolean(aktiv);
    return daten.wartezeitLernenAktiv;
  });
}

/* ---------- No-Show-Schutz ---------- */

/**
 * Setzt die No-Show-Schutz-Einstellungen für Abholbestellungen. Default aus.
 *
 * Einschalten geht nur mit einer gültigen, freigegebenen No-Show-Regel
 * (Dokumentart "noshow-bestellung"): Betrag und Stornofrist kommen aus
 * dieser Fassung – abweichende Werte werden abgelehnt, damit Formular,
 * Nachweis und Rechnung nie etwas anderes sagen als der freigegebene Text.
 */
export function setzeNoShowSchutz(slug, { aktiv, gebuehrBetrag, stornofensterMinuten, warnSchwelle } = {}) {
  const betrag = gebuehrBetrag === undefined ? undefined : Number(gebuehrBetrag);
  const fenster = stornofensterMinuten === undefined ? undefined : Number(stornofensterMinuten);
  const schwelle = Number(warnSchwelle ?? NO_SHOW_WARN_SCHWELLE_DEFAULT);

  if (betrag !== undefined && (!Number.isFinite(betrag) || betrag < 0)) {
    throw new Error("Die Ausfallpauschale muss ein Betrag ab 0 € sein.");
  }
  if (fenster !== undefined && (!Number.isInteger(fenster) || fenster < 0 || fenster > 10_080)) {
    throw new Error("Das Stornofenster muss zwischen 0 und 10080 Minuten liegen.");
  }
  if (!Number.isInteger(schwelle) || schwelle < 1) {
    throw new Error("Die Warn-Schwelle muss mindestens 1 sein.");
  }

  return aendere(slug, (daten) => {
    if (aktiv) {
      const regel = gueltigeFassung(daten.rechtsdokumente, "noshow-bestellung", uhrHook.jetzt());
      if (!regel) {
        throw new Error("Der No-Show-Schutz lässt sich erst einschalten, wenn eine No-Show-Regel für Abholbestellungen freigegeben ist (Reiter „Rechtstexte“).");
      }
      if (betrag !== undefined && betrag !== regel.parameter.betrag) {
        throw new Error(`Der Betrag weicht von der freigegebenen No-Show-Regel ${regel.version} ab (${regel.parameter.betrag} €). Für einen anderen Betrag eine neue Fassung freigeben.`);
      }
      if (fenster !== undefined && fenster !== regel.parameter.stornofensterMinuten) {
        throw new Error(`Die Stornofrist weicht von der freigegebenen No-Show-Regel ${regel.version} ab (${regel.parameter.stornofensterMinuten} Minuten).`);
      }
      daten.noShowGebuehrBetrag = regel.parameter.betrag;
      daten.noShowStornofensterMinuten = regel.parameter.stornofensterMinuten;
    }
    daten.noShowSchutzAktiv = Boolean(aktiv);
    daten.noShowWarnSchwelle = schwelle;
    return {
      noShowSchutzAktiv: daten.noShowSchutzAktiv,
      noShowGebuehrBetrag: daten.noShowGebuehrBetrag,
      noShowStornofensterMinuten: daten.noShowStornofensterMinuten,
      noShowWarnSchwelle: daten.noShowWarnSchwelle,
    };
  });
}

/**
 * No-Show-Regel für Reservierungen – technisch vorbereitet, standardmäßig
 * aus. Einschalten nur mit gültiger freigegebener Regel "noshow-reservierung"
 * (Betrag, Frist, Nachweisweg, Freigabevermerk). Es gibt KEINE Abrechnung:
 * Das System hält nur die Bestätigung des Gastes fest.
 */
export function setzeReservierungsNoShow(slug, aktiv) {
  return aendere(slug, (daten) => {
    if (aktiv) {
      const regel = gueltigeFassung(daten.rechtsdokumente, "noshow-reservierung", uhrHook.jetzt());
      if (!regel) throw new Error("Die No-Show-Regel für Reservierungen lässt sich erst einschalten, wenn eine Fassung freigegeben ist.");
      if (!String(regel.parameter?.nachweisweg ?? "").trim()) throw new Error("Für die freigegebene Regel fehlt der Nachweisweg.");
    }
    daten.reservierungNoShowAktiv = Boolean(aktiv);
    return daten.reservierungNoShowAktiv;
  });
}

export function setzeBankverbindung(slug, text) {
  const sauber = String(text ?? "").trim();
  return aendere(slug, (daten) => {
    daten.bankverbindung = sauber;
    return sauber;
  });
}

/**
 * Die geplanten Abholzeiten ("HH:MM"), die jetzt angeboten würden – nach
 * denselben Regeln wie das Bestellformular (abholzeiten.js): ab jetzt bzw.
 * Öffnung plus 25 Minuten plus Zusatz-Wartezeit, im 5-Minuten-Raster, nur
 * innerhalb der Öffnungszeiten. extraMinuten kommt additiv dazu (gelernter
 * Zuschlag, wartezeitLernStore.js). Reine Berechnung ohne Bezug zu
 * bestehenden Bestellungen – eine bestätigte Abholzeit läuft nie nachträglich mit.
 */
export function verfuegbareAbholzeiten(daten, jetzt = uhrHook.jetzt(), { extraMinuten = 0 } = {}) {
  return berechneAbholzeiten({ jetzt, ...abholEinstellungen(daten, { extraMinuten }) }).slots.map((s) => s.uhrzeit);
}

/* ---------- Reservierungen ---------- */

function pruefeReservierung(daten, eingabe, { ignoriereId, quelle } = {}) {
  const personen = Number(eingabe.personen);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(eingabe.datum ?? ""))) {
    throw new Error("Bitte ein Datum im Format JJJJ-MM-TT angeben.");
  }
  if (zuMinuten(eingabe.uhrzeit) === null) {
    throw new Error("Bitte eine Uhrzeit im Format HH:MM angeben.");
  }
  if (!Number.isInteger(personen) || personen < 1 || personen > 40) {
    throw new Error("Die Personenzahl muss zwischen 1 und 40 liegen.");
  }
  if (!String(eingabe.name ?? "").trim()) {
    throw new Error("Bitte einen Namen angeben.");
  }

  if (daten.tische.length === 0) {
    throw new Error("Es ist noch kein Tisch angelegt – der Tischplan fehlt.");
  }

  const frei = freiePlaetze(daten, eingabe.datum, eingabe.uhrzeit, { ignoriereId });
  if (personen > frei) {
    throw new Error(
      `Zu dieser Zeit sind nur noch ${Math.max(0, frei)} Plätze frei (angefragt: ${personen}).`,
    );
  }

  // Die Platzsumme kann aufgehen und die Tischverteilung trotzdem nicht.
  const verteilung = tischVerteilung(daten, eingabe.datum, eingabe.uhrzeit, {
    ignoriereId,
    zusatz: personen,
  });

  if (verteilung && quelle !== "manuell") {
    // Online wird abgelehnt: bestätigen, was im Raum nicht steht, ist die
    // Zusage, die der Wirt am Abend zurücknehmen muss.
    throw new Error(verteilung.gastText);
  }

  // Der Wirt am Telefon kennt seinen Raum und kann Tische zusammenstellen.
  // Ihn zu blockieren wäre anmaßend – gewarnt werden muss er trotzdem.
  return { personen, warnung: verteilung ? verteilung.wirtText : "" };
}

export function legeReservierungAn(slug, eingabe, quelle = "online") {
  // Die Quelle bestimmt ausschließlich der Server über den aufgerufenen Weg
  // (wirtServer.js) – nie ein Wert aus dem Formular.
  if (!["online", "manuell"].includes(quelle)) throw new Error(`Unbekannte Quelle "${quelle}".`);
  const email = pruefeEmail(eingabe.email);

  return aendere(slug, (daten) => {
    const { personen, warnung } = pruefeReservierung(daten, eingabe, { quelle });
    const jetzt = uhrHook.jetzt();
    // Bedingungen und No-Show-Regel bestätigt nur der Gast online; was der
    // Wirt nach einem Telefonat einträgt, braucht und bekommt keine
    // Online-Bestätigung.
    const rechtliches = quelle === "online" ? pruefeBestaetigungen(daten, "reservierung", eingabe, jetzt) : { nachweise: [], noShow: null };

    const reservierung = {
      id: randomUUID(),
      nummer: `RES-${randomInt(1000, 10000)}`,
      datum: eingabe.datum,
      uhrzeit: eingabe.uhrzeit,
      personen,
      name: String(eingabe.name).trim(),
      telefon: String(eingabe.telefon ?? "").trim(),
      email,
      wunsch: String(eingabe.wunsch ?? "").trim(),
      tischId: null,
      quelle,
      // Was der Wirt selbst einträgt, steht ohnehin schon fest.
      status: quelle === "manuell" ? "bestaetigt" : "neu",
      eingegangen: jetzt.toISOString(),
      // Nachweise: welche Fassung wann bestätigt wurde (Version + Hash).
      bestaetigungen: rechtliches.nachweise,
      noShowZustimmung: rechtliches.noShow
        ? { text: rechtliches.noShow.zustimmungstext, zeitpunkt: jetzt.toISOString(), version: rechtliches.noShow.version, dokumentId: rechtliches.noShow.id, inhaltHash: rechtliches.noShow.inhaltHash }
        : null,
    };

    // Was der Wirt selbst einträgt, weiß der Gast schon am Telefon – nur
    // Online-Anfragen bekommen einen Status-Link.
    const gastToken = quelle === "online" ? richteGastZugangEin(slug, daten, "reservierung", reservierung) : "";

    daten.reservierungen.push(reservierung);
    // Die Warnung hängt nicht an der Reservierung – sie gilt der Lage im
    // Raum, nicht dieser einen Gruppe, und löst sich mit jeder Absage auf.
    return { ...reservierung, warnung, gastToken };
  });
}

export function setzeReservierungStatus(slug, id, status) {
  if (!RESERVIERUNG_STATUS.includes(status)) throw new Error(`Unbekannter Status "${status}".`);

  return aendere(slug, (daten) => {
    const r = daten.reservierungen.find((x) => x.id === id);
    if (!r) throw new Error("Reservierung nicht gefunden.");
    r.status = status;
    return r;
  });
}

export function weiseTischZu(slug, id, tischId) {
  return aendere(slug, (daten) => {
    const r = daten.reservierungen.find((x) => x.id === id);
    if (!r) throw new Error("Reservierung nicht gefunden.");

    if (!tischId) {
      r.tischId = null;
      return r;
    }

    const tisch = daten.tische.find((t) => t.id === tischId);
    if (!tisch) throw new Error("Tisch nicht gefunden.");
    if (tisch.plaetze < r.personen) {
      throw new Error(`${tisch.name} hat nur ${tisch.plaetze} Plätze, gebraucht werden ${r.personen}.`);
    }

    const belegt = daten.reservierungen.find(
      (x) =>
        x.id !== id &&
        x.tischId === tischId &&
        x.status !== "abgesagt" &&
        x.datum === r.datum &&
        ueberschneidetSich(x.uhrzeit, r.uhrzeit),
    );
    if (belegt) {
      throw new Error(`${tisch.name} ist um ${belegt.uhrzeit} bereits an ${belegt.name} vergeben.`);
    }

    r.tischId = tischId;
    return r;
  });
}

/* ---------- Bestellungen ---------- */

/**
 * Legt eine Abholbestellung an. Die Abholzeit wird dabei erneut geprüft –
 * mit derselben Rechnung wie im Formular, mit den aktuellen Öffnungszeiten
 * und der aktuellen Zusatz-Wartezeit. Veraltete oder manipulierte Zeiten
 * werden mit klarer Meldung abgelehnt, nie still verschoben.
 *
 * eingabe.abholArt ("asap" | "geplant") und eingabe.abholZeitpunkt (ISO)
 * schickt das Formular; ältere Seiten schicken nur abholzeit "HH:MM" – das
 * gilt dann als geplante Zeit und wird genauso geprüft.
 */
export function legeBestellungAn(slug, eingabe, jetzt = uhrHook.jetzt()) {
  const positionen = Array.isArray(eingabe.positionen) ? eingabe.positionen : [];

  if (positionen.length === 0) throw new Error("Die Bestellung ist leer.");
  if (!String(eingabe.name ?? "").trim()) throw new Error("Bitte einen Namen angeben.");
  if (!String(eingabe.abholzeit ?? "").trim() && !eingabe.abholZeitpunkt) throw new Error("Bitte eine Abholzeit angeben.");
  const email = pruefeEmail(eingabe.email);

  const sauber = positionen.map((p) => ({
    name: String(p.name ?? "").trim(),
    menge: Math.max(1, Math.min(99, Number(p.menge) || 1)),
    preis: Number(p.preis) || 0,
  }));

  return aendere(slug, (daten) => {
    // Mit hinterlegter Bestellkarte (Kundenfassung, setzeBestellkarte) gilt
    // nur, was der Server kennt: Name und Preis kommen aus der Karte, nie aus
    // dem Browser. Ein abweichender Preis wird abgelehnt statt still anders
    // berechnet – so zahlt niemand etwas anderes, als er gesehen hat.
    const positionenGeprueft = pruefePositionenGegenKarte(daten.bestellkarte, positionen, sauber);
    const abholung = pruefeAbholwunsch({
      jetzt,
      ...abholEinstellungen(daten),
      art: eingabe.abholArt,
      zeitpunkt: eingabe.abholZeitpunkt,
      abholzeit: eingabe.abholArt ? "" : eingabe.abholzeit,
    });
    if (!abholung.ok) throw new Error(abholung.fehler);

    // Bedingungen und No-Show-Regel: Pflicht nur, wenn der Betrieb dafür
    // eine freigegebene, gültige Fassung hat – und dann für GENAU diese
    // Version (rechtstexte.js). Als Beweis dient die freigegebene Fassung,
    // nicht ein vom Browser geschickter Text.
    const rechtliches = pruefeBestaetigungen(daten, "bestellung", eingabe, jetzt);
    const noShowZustimmung = rechtliches.noShow
      ? {
          text: rechtliches.noShow.zustimmungstext,
          zeitpunkt: jetzt.toISOString(),
          version: rechtliches.noShow.version,
          dokumentId: rechtliches.noShow.id,
          inhaltHash: rechtliches.noShow.inhaltHash,
        }
      : null;
    const noShowGebuehrBetragVereinbart = rechtliches.noShow ? rechtliches.noShow.parameter.betrag : null;

    const bestellung = {
      id: randomUUID(),
      nummer: `AB-${randomInt(1000, 10000)}`,
      // Einziger Weg zu einer Bestellung ist das Website-Formular
      // (/oeffentlich/bestellung). Ältere Datensätze ohne dieses Feld
      // gelten in der Statistik als "unbekannt".
      quelle: "online",
      positionen: positionenGeprueft,
      gesamt: Math.round(positionenGeprueft.reduce((summe, p) => summe + p.preis * p.menge, 0) * 100) / 100,
      ...(daten.bestellkarte ? { bestellkarteVersion: daten.bestellkarte.version } : {}),
      // Wunsch des Gastes; was tatsächlich gilt, bestätigt der Wirt. Die
      // Uhrzeit kommt aus dem geprüften Zeitpunkt, nicht aus dem Text des Browsers.
      abholzeit: abholung.uhrzeit,
      abholArt: abholung.art,
      abholZeitpunkt: abholung.iso,
      bestaetigteAbholzeit: "",
      name: String(eingabe.name).trim(),
      telefon: String(eingabe.telefon ?? "").trim(),
      email,
      hinweis: String(eingabe.hinweis ?? "").trim(),
      status: "neu",
      eingegangen: jetzt.toISOString(),
      // Beweis für eine spätere Forderung: exakter Text, Zeitpunkt, dazu
      // Name/Kontakt – die stehen ohnehin schon oben auf der Bestellung.
      noShowZustimmung,
      noShowGebuehrBetragVereinbart,
      bestaetigungen: rechtliches.nachweise,
      storniertAm: "",
      noShowBestaetigtAm: "",
      noShowBetrag: null,
    };

    const gastToken = richteGastZugangEin(slug, daten, "bestellung", bestellung);
    daten.bestellungen.push(bestellung);
    return { ...bestellung, gastToken };
  });
}

/**
 * Prüft Warenkorb-Positionen gegen die Bestellkarte des Betriebs. Ohne Karte
 * (Betriebe ohne Kundenfassung) bleibt es beim bisherigen Verhalten.
 */
function pruefePositionenGegenKarte(karte, roh, sauber) {
  if (!karte?.katalog) return sauber;
  return roh.map((p, i) => {
    const id = String(p?.id ?? "");
    const eintrag = karte.katalog[id];
    if (!eintrag) throw new Error(`„${sauber[i].name || "Ein Gericht"}“ ist nicht mehr bestellbar. Bitte den Warenkorb prüfen und die Seite neu laden.`);
    const [name, preis] = eintrag;
    if (Math.round(Number(p.preis) * 100) !== Math.round(preis * 100)) {
      throw new Error(`Der Preis für „${name}“ hat sich geändert (jetzt ${preis.toFixed(2).replace(".", ",")} €). Bitte die Seite neu laden.`);
    }
    return { id, name, menge: sauber[i].menge, preis };
  });
}

/**
 * Hinterlegt die Bestellkarte eines Betriebs: Katalog { id: [name, preis] }
 * – derselbe, den die gebaute Seite im Warenkorb nutzt (v2/build/speisekarte.js).
 * null entfernt sie.
 */
export function setzeBestellkarte(slug, karte) {
  return aendere(slug, (daten) => {
    if (!karte) {
      delete daten.bestellkarte;
      return null;
    }
    const katalog = {};
    for (const [id, eintrag] of Object.entries(karte.katalog ?? {})) {
      if (!Array.isArray(eintrag) || !String(eintrag[0] ?? "").trim() || !(Number(eintrag[1]) >= 0)) throw new Error(`Ungültiger Karteneintrag "${id}".`);
      katalog[id] = [String(eintrag[0]), Math.round(Number(eintrag[1]) * 100) / 100];
    }
    daten.bestellkarte = { katalog, version: String(karte.version ?? ""), quelle: String(karte.quelle ?? ""), gesetzt: uhrHook.jetzt().toISOString() };
    return daten.bestellkarte;
  });
}

/**
 * Der Zeitpunkt, den die Bestellung dem Gast versprochen hat (bestätigt oder,
 * falls noch offen, gewünscht). Neue Bestellungen tragen ihn als
 * abholZeitpunkt; eine bestätigte "HH:MM" wird in der Zeitzone des
 * Restaurants auf das nächstliegende Vorkommen um diesen Zeitpunkt (bzw. den
 * Eingang) gelegt – so stimmt es auch über Mitternacht.
 */
function versprochenerAbholZeitpunkt(bestellung, daten) {
  const zeit = bestellung.bestaetigteAbholzeit || bestellung.abholzeit;
  if (bestellung.abholZeitpunkt && zeit === bestellung.abholzeit) {
    const zeitpunkt = new Date(bestellung.abholZeitpunkt);
    if (!Number.isNaN(zeitpunkt.getTime())) return zeitpunkt;
  }
  const referenz = bestellung.abholZeitpunkt || bestellung.eingegangen;
  if (!zeit || !referenz || Number.isNaN(new Date(referenz).getTime())) return null;
  const ms = zeitpunktFuerUhrzeit(referenz, zeit, abholEinstellungen(daten).zeitzone);
  return ms === null ? null : new Date(ms);
}

/**
 * Kunden-Storno per Link aus der Bestellbestätigung. Innerhalb des
 * Stornofensters kostenfrei, danach nur ein Hinweis auf eine mögliche
 * Gebühr – eine Stornierung selbst löst nie automatisch eine Forderung aus,
 * das entscheidet der Wirt über "Kunde nicht erschienen" (bestaetigeNoShow).
 */
export function storniereBestellung(slug, id, jetzt = uhrHook.jetzt()) {
  return aendere(slug, (daten) => {
    const b = daten.bestellungen.find((x) => x.id === id);
    if (!b) throw new Error("Bestellung nicht gefunden.");
    if (b.storniertAm) throw new Error("Diese Bestellung wurde bereits storniert.");
    if (b.status === "abgeholt") throw new Error("Diese Bestellung wurde bereits abgeholt.");

    const versprochen = versprochenerAbholZeitpunkt(b, daten);
    const minutenBisAbholung = versprochen ? (versprochen.getTime() - jetzt.getTime()) / 60000 : Infinity;
    const kostenfrei = minutenBisAbholung >= Number(daten.noShowStornofensterMinuten ?? 0);

    b.status = "storniert";
    b.storniertAm = jetzt.toISOString();

    return { bestellung: b, kostenfrei, minutenBisAbholung: Math.round(minutenBisAbholung) };
  });
}

/**
 * Der Wirt bestätigt, dass der Gast nicht erschienen ist. Der Betrag ist nur
 * nach unten korrigierbar (nie über den bei der Bestellung vereinbarten
 * Betrag hinaus) – damit kann nie versehentlich mehr verlangt werden, als
 * der Gast zugestimmt hat.
 */
export function bestaetigeNoShow(slug, id, betrag, jetzt = new Date()) {
  const wert = Number(betrag);
  if (!Number.isFinite(wert) || wert < 0) {
    throw new Error("Der Betrag muss eine Zahl ab 0 € sein.");
  }

  return aendere(slug, (daten) => {
    const b = daten.bestellungen.find((x) => x.id === id);
    if (!b) throw new Error("Bestellung nicht gefunden.");
    if (b.storniertAm) throw new Error("Diese Bestellung wurde vom Gast storniert – keine Ausfallpauschale möglich.");
    if (b.noShowBestaetigtAm) throw new Error("Für diese Bestellung wurde bereits eine Ausfallpauschale bestätigt.");
    if (!b.noShowZustimmung) {
      throw new Error("Für diese Bestellung liegt keine Zustimmung zur Ausfallpauschale vor.");
    }
    if (wert > Number(b.noShowGebuehrBetragVereinbart ?? 0)) {
      throw new Error(
        `Der Betrag darf höchstens ${Number(b.noShowGebuehrBetragVereinbart).toFixed(2)} € betragen ` +
          "(der bei der Bestellung vereinbarte Betrag) – nur eine Korrektur nach unten ist möglich.",
      );
    }

    b.noShowBestaetigtAm = jetzt.toISOString();
    b.noShowBetrag = wert;
    return b;
  });
}

/**
 * Der Wirt bestätigt die Abholzeit – entweder die gewünschte oder eine
 * andere. Ohne diesen Schritt weiß der Gast nicht, ob seine Zeit machbar ist.
 */
export function bestaetigeBestellung(slug, id, abholzeit, { grund } = {}) {
  const zeit = String(abholzeit ?? "").trim();
  if (!zeit) throw new Error("Bitte eine Abholzeit bestätigen.");

  return aendere(slug, (daten) => {
    const b = daten.bestellungen.find((x) => x.id === id);
    if (!b) throw new Error("Bestellung nicht gefunden.");
    if (b.status === "storniert") throw new Error("Diese Bestellung wurde vom Gast storniert.");
    if (b.status === "abgeholt") throw new Error("Diese Bestellung wurde bereits abgeholt.");
    // Der Grund gehört zur Zeitänderung, die gerade gespeichert wird – eine
    // Bestätigung ohne neue Zeit lässt einen früheren Grund stehen.
    if (grund !== undefined || zeit !== b.bestaetigteAbholzeit) b.aenderungsGrund = String(grund ?? "").trim().slice(0, 200);
    b.bestaetigteAbholzeit = zeit;
    b.status = "bestaetigt";
    return b;
  });
}

export function setzeBestellungStatus(slug, id, status) {
  if (!BESTELLUNG_STATUS.includes(status)) throw new Error(`Unbekannter Status "${status}".`);

  return aendere(slug, (daten) => {
    const b = daten.bestellungen.find((x) => x.id === id);
    if (!b) throw new Error("Bestellung nicht gefunden.");
    b.status = status;
    // Für das lernende Wartezeit-System (wartezeitLernStore.js): der
    // Zeitpunkt, zu dem die Bestellung wirklich fertig war, im Vergleich zur
    // versprochenen Abholzeit. Nur beim ersten Wechsel auf "abgeholt"
    // gesetzt – ein erneuter Aufruf (z. B. Doppelklick) darf ihn nicht
    // nachträglich verschieben.
    if (status === "abgeholt" && !b.tatsaechlichFertigUm) {
      b.tatsaechlichFertigUm = new Date().toISOString();
    }
    return b;
  });
}

/* ---------- Push-Benachrichtigungen ---------- */

/**
 * Merkt sich, auf welchem Gerät des Wirts neue Bestellungen/Reservierungen
 * ankommen sollen (siehe pushNotify.js für den eigentlichen Versand). Nur die
 * Datenhaltung liegt hier – dieselbe Trennung wie überall in diesem Modul,
 * das keine eigenen Netzwerkaufrufe macht.
 */
export function fuegePushSubscriptionHinzu(slug, subscription) {
  const endpoint = String(subscription?.endpoint ?? "").trim();
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Ungültige Push-Subscription.");
  }

  return aendere(slug, (daten) => {
    daten.pushSubscriptions ??= [];
    // Dasselbe Gerät kann sich mehrfach registrieren (Seite neu geladen,
    // Berechtigung erneut erteilt) – der Endpoint bleibt dabei gleich und
    // ersetzt den alten Eintrag statt ihn zu verdoppeln.
    daten.pushSubscriptions = daten.pushSubscriptions.filter((s) => s.endpoint !== endpoint);
    daten.pushSubscriptions.push({ endpoint, keys: { p256dh, auth } });
    return { endpoint };
  });
}

/**
 * Entfernt eine Subscription, die der Push-Dienst als ungültig gemeldet hat
 * (Gerät lange offline, Berechtigung entzogen, Browser-Daten gelöscht) –
 * sonst würde jeder weitere Versand an diesen Eintrag wieder fehlschlagen.
 */
export function entfernePushSubscription(slug, endpoint) {
  return aendere(slug, (daten) => {
    daten.pushSubscriptions = (daten.pushSubscriptions ?? []).filter((s) => s.endpoint !== endpoint);
    return true;
  });
}

/**
 * Die eigene Telegram-Chat-ID des Wirts, als Rückkanal für Geräte ohne
 * funktionierendes Web Push (siehe telegramNotify.js). Eine leere Zeichenkette
 * schaltet den Kanal wieder ab.
 */
export function setzeTelegramChatId(slug, chatId) {
  const sauber = String(chatId ?? "").trim();
  if (sauber && !/^-?\d+$/.test(sauber)) {
    throw new Error("Die Telegram-Chat-ID besteht nur aus Ziffern.");
  }

  return aendere(slug, (daten) => {
    daten.telegramChatId = sauber;
    return sauber;
  });
}

/* ---------- Gastbenachrichtigung: Status-Link und Ereignisse ---------- */

const geheimnisDatei = path.join(betriebeDir, ".gast-status-geheimnis");
let geheimnisCache = null;

/**
 * Das Geheimnis, aus dem die Status-Links hergeleitet werden. Vorrang hat
 * GAST_STATUS_GEHEIMNIS aus der Umgebung (im Hosting als Secret); sonst
 * wird einmalig eines erzeugt und neben den Betriebsdaten abgelegt
 * (data/betrieb/ ist nicht im Git). Wer es austauscht, macht alle bisherigen
 * Status-Links ungültig – so lassen sich im Notfall alle auf einmal sperren.
 */
export function gastGeheimnis() {
  const ausUmgebung = String(process.env.GAST_STATUS_GEHEIMNIS ?? "").trim();
  if (ausUmgebung) {
    if (ausUmgebung.length < 32) throw new Error("GAST_STATUS_GEHEIMNIS muss mindestens 32 Zeichen lang sein.");
    return ausUmgebung;
  }
  if (geheimnisCache) return geheimnisCache;
  try {
    geheimnisCache = readFileSync(geheimnisDatei, "utf-8").trim();
  } catch {
    geheimnisCache = "";
  }
  if (geheimnisCache.length < 32) {
    geheimnisCache = neuesGeheimnis();
    mkdirSync(betriebeDir, { recursive: true });
    writeFileSync(geheimnisDatei, `${geheimnisCache}\n`, { encoding: "utf-8", mode: 0o600 });
  }
  return geheimnisCache;
}

/**
 * Legt am Eintrag den Gastzugang an und gibt den Status-Token zurück. Der
 * Token selbst wird nicht gespeichert – nur sein Hash zum Nachschlagen.
 * Demo-Betriebe bekommen keinen (keine echten Status-Links im Demo-Modus).
 */
function richteGastZugangEin(slug, daten, art, eintrag) {
  if (daten.demoBetrieb) return "";
  const token = gastToken(gastGeheimnis(), { slug, art, id: eintrag.id, version: 1 });
  eintrag.gastZugang = { version: 1, hash: tokenHash(token), erstellt: uhrHook.jetzt().toISOString(), widerrufenAm: "" };
  return token;
}

/** Leitet den (unveränderten) Status-Token eines Eintrags erneut her – für E-Mails. */
export function gastTokenFuer(slug, art, eintrag) {
  if (!eintrag?.gastZugang || eintrag.gastZugang.widerrufenAm) return "";
  return gastToken(gastGeheimnis(), { slug, art, id: eintrag.id, version: eintrag.gastZugang.version });
}

/**
 * Sucht zum Token die passende Reservierung/Bestellung. Gibt null zurück bei
 * unbekanntem, widerrufenem oder abgelaufenem Link – bewusst ohne zu sagen,
 * welcher Fall vorliegt.
 */
export function findeUeberGastToken(slug, token, jetzt = uhrHook.jetzt()) {
  if (!istTokenFormat(token)) return null;
  const hash = tokenHash(token);
  const daten = ladeBetrieb(slug);
  for (const [art, liste] of [["reservierung", daten.reservierungen], ["bestellung", daten.bestellungen]]) {
    const eintrag = liste.find((e) => e.gastZugang?.hash === hash);
    if (!eintrag) continue;
    if (eintrag.gastZugang.widerrufenAm) return null;
    // Zweite Sicherung: der Token muss sich auch aus dem Geheimnis ergeben.
    if (gastTokenFuer(slug, art, eintrag) !== token) return null;
    if (linkAbgelaufen(art, eintrag, jetzt)) return null;
    return { art, eintrag, daten };
  }
  return null;
}

function eintragFinden(daten, art, id) {
  const liste = art === "reservierung" ? daten.reservierungen : art === "bestellung" ? daten.bestellungen : null;
  if (!liste) throw new Error(`Unbekannte Art "${art}".`);
  const eintrag = liste.find((e) => e.id === id);
  if (!eintrag) throw new Error(art === "reservierung" ? "Reservierung nicht gefunden." : "Bestellung nicht gefunden.");
  return eintrag;
}

/** Sperrt den Status-Link eines Eintrags dauerhaft (z. B. auf Wunsch des Gastes). */
export function widerrufeGastZugang(slug, art, id) {
  return aendere(slug, (daten) => {
    const eintrag = eintragFinden(daten, art, id);
    if (!eintrag.gastZugang) throw new Error("Für diesen Eintrag gibt es keinen Status-Link.");
    eintrag.gastZugang.widerrufenAm ||= uhrHook.jetzt().toISOString();
    eintrag.gastZugang.hash = "";
    return eintrag;
  });
}

/** Name und Rückfragenummer des Hauses für Statusseite und Gast-E-Mails. */
export function setzeGastKontakt(slug, { anzeigeName, telefon } = {}) {
  const name = String(anzeigeName ?? "").trim().slice(0, 120);
  const nummer = String(telefon ?? "").trim().slice(0, 40);
  if (nummer && !/^[+\d][\d\s/()-]{3,}$/.test(nummer)) throw new Error("Bitte eine gültige Telefonnummer angeben.");
  return aendere(slug, (daten) => {
    daten.anzeigeName = name;
    daten.telefon = nummer;
    return { anzeigeName: name, telefon: nummer };
  });
}

export function betriebsKontakt(slug, daten = ladeBetrieb(slug)) {
  return { name: daten.anzeigeName || slug, telefon: daten.telefon || "" };
}

/**
 * Der Wirt verschiebt eine Reservierung auf einen anderen Termin – der
 * einzige vorgesehene Weg, Datum/Uhrzeit nachträglich zu ändern. Der
 * ursprünglich angefragte Termin bleibt nachvollziehbar gespeichert, die
 * Reservierung gilt mit dem neuen Termin als bestätigt. Kapazität und
 * Tischverteilung werden wie bei einer Eingabe des Wirts geprüft.
 */
export function verschiebeReservierung(slug, id, { datum, uhrzeit, grund } = {}) {
  return aendere(slug, (daten) => {
    const r = eintragFinden(daten, "reservierung", id);
    if (r.status === "abgesagt") throw new Error("Eine abgesagte Reservierung kann nicht verschoben werden.");
    if (r.datum === datum && r.uhrzeit === uhrzeit) throw new Error("Das ist bereits der aktuelle Termin.");
    const { warnung } = pruefeReservierung(daten, { ...r, datum, uhrzeit }, { ignoriereId: id, quelle: "manuell" });
    r.urspruenglich ??= { datum: r.datum, uhrzeit: r.uhrzeit };
    r.datum = datum;
    r.uhrzeit = uhrzeit;
    r.status = "bestaetigt";
    // Der zugewiesene Tisch galt für den alten Termin.
    r.tischId = null;
    r.aenderungsGrund = String(grund ?? "").trim().slice(0, 200);
    r.geaendertAm = uhrHook.jetzt().toISOString();
    return { ...r, warnung };
  });
}

// Ältere Meldungen fallen irgendwann heraus – das Protokoll soll den
// Versandstand zeigen, kein Archiv personenbezogener Vorgänge werden.
const MELDUNGEN_MAX = 500;

/**
 * Vergleicht den gespeicherten mit dem neuen Stand und hängt für jede
 * gast-relevante Änderung eine Meldung an (siehe ereignisAusAenderung).
 * Die Meldung trägt nur, was für Versand und Statusanzeige nötig ist – die
 * E-Mail-Adresse bleibt am Eintrag und wird nicht kopiert.
 */
function vermerkeGastMeldungen(vorherDaten, daten) {
  if (!daten || typeof daten !== "object") return;
  const zeitzone = daten.zeitzone || ZEITZONE_STANDARD;
  const jetzt = uhrHook.jetzt().toISOString();
  for (const [art, schluessel] of [["reservierung", "reservierungen"], ["bestellung", "bestellungen"]]) {
    const vorher = new Map((vorherDaten?.[schluessel] ?? []).map((e) => [e.id, e]));
    for (const eintrag of daten[schluessel] ?? []) {
      const ereignis = ereignisAusAenderung(art, vorher.get(eintrag.id), eintrag, { zeitzone });
      if (!ereignis) continue;
      daten.gastMeldungen ??= [];
      daten.gastMeldungen.push({
        id: randomUUID(),
        art,
        bezugId: eintrag.id,
        referenz: referenzVon(art, eintrag),
        typ: ereignis.typ,
        zeitGeaendert: Boolean(ereignis.zeitGeaendert),
        vorherUhrzeit: ereignis.vorherUhrzeit ?? "",
        sicht: ereignis.sicht,
        erstellt: jetzt,
        versand: {
          kanal: "",
          // Ob wirklich ein Kanal greift (E-Mail eingerichtet? SMS-Anbieter?),
          // entscheidet erst die Zustellung – ohne jede Kontaktangabe nie.
          zustand: daten.demoBetrieb ? "demo" : eintrag.email || eintrag.telefon ? "ausstehend" : "keine-adresse",
          versuche: 0,
          letzterVersuch: "",
          fehler: "",
          anbieterId: "",
        },
      });
    }
  }
  if (daten.gastMeldungen?.length > MELDUNGEN_MAX) daten.gastMeldungen = daten.gastMeldungen.slice(-MELDUNGEN_MAX);
}

/** Ändert den Versandstand einer Meldung (für kundenBenachrichtigung.js). */
export function aendereGastMeldung(slug, meldungId, fn) {
  return aendere(slug, (daten) => {
    const meldung = (daten.gastMeldungen ?? []).find((m) => m.id === meldungId);
    if (!meldung) throw new Error("Meldung nicht gefunden.");
    const bezug = (meldung.art === "reservierung" ? daten.reservierungen : daten.bestellungen).find((e) => e.id === meldung.bezugId);
    return fn(meldung, bezug, daten);
  });
}

/** Schaltet den Demo-Modus eines Betriebs (keine Status-Links, keine Gastmails). */
export function setzeDemoBetrieb(slug, aktiv) {
  return aendere(slug, (daten) => {
    daten.demoBetrieb = Boolean(aktiv);
    return daten.demoBetrieb;
  });
}

/* ---------- Rechtstexte des Restaurants ---------- */

function dokumentFinden(daten, id) {
  const dok = (daten.rechtsdokumente ?? []).find((d) => d.id === id);
  if (!dok) throw new Error("Dokument nicht gefunden.");
  return dok;
}

/** Legt einen Entwurf aus der Vorlage an (mit Platzhaltern, als Entwurf markiert). */
export function legeRechtsdokumentEntwurfAn(slug, art, { parameter } = {}) {
  if (!istArt(art)) throw new Error(`Unbekannte Dokumentart "${art}".`);
  return aendere(slug, (daten) => {
    daten.rechtsdokumente ??= [];
    const vorlage = entwurfAusVorlage(art, { name: daten.anzeigeName, parameter });
    const dok = {
      id: randomUUID(),
      betrieb: slug,
      ...vorlage,
      version: "",
      versionNr: null,
      status: "entwurf",
      erstellt: uhrHook.jetzt().toISOString(),
      geaendert: uhrHook.jetzt().toISOString(),
    };
    daten.rechtsdokumente.push(dok);
    return dok;
  });
}

/** Ändert einen Entwurf. Freigegebene Fassungen sind unveränderlich. */
export function bearbeiteRechtsdokument(slug, id, { inhalt, zustimmungstext, parameter } = {}) {
  return aendere(slug, (daten) => {
    const dok = dokumentFinden(daten, id);
    if (dok.status !== "entwurf") throw new Error("Freigegebene Fassungen lassen sich nicht ändern – bitte eine neue Fassung anlegen.");
    if (inhalt !== undefined) dok.inhalt = String(inhalt).slice(0, 60_000);
    if (zustimmungstext !== undefined) dok.zustimmungstext = String(zustimmungstext).slice(0, 1_000);
    if (parameter !== undefined && dok.art.startsWith("noshow-")) dok.parameter = pruefeNoShowParameter(dok.art, parameter);
    dok.geaendert = uhrHook.jetzt().toISOString();
    return dok;
  });
}

/** Legt eine neue Entwurfsfassung als Kopie einer bestehenden an. */
export function kopiereRechtsdokument(slug, id) {
  return aendere(slug, (daten) => {
    const quelle = dokumentFinden(daten, id);
    const dok = {
      id: randomUUID(),
      betrieb: slug,
      art: quelle.art,
      titel: quelle.titel,
      inhalt: quelle.inhalt,
      zustimmungstext: quelle.zustimmungstext,
      parameter: quelle.parameter ? { ...quelle.parameter } : null,
      version: "",
      versionNr: null,
      status: "entwurf",
      erstelltAus: quelle.version || quelle.id,
      erstellt: uhrHook.jetzt().toISOString(),
      geaendert: uhrHook.jetzt().toISOString(),
    };
    daten.rechtsdokumente.push(dok);
    return dok;
  });
}

/**
 * Gibt einen Entwurf frei: vergibt die nächste Version, hält fest, wer
 * freigibt, den Prüfvermerk, den Zeitpunkt und ab wann die Fassung gilt,
 * und friert den Inhalt (SHA-256) ein. Das ist eine Freigabe durch den
 * Betrieb – keine Aussage über die rechtliche Wirksamkeit.
 */
export function gibRechtsdokumentFrei(slug, id, { freigegebenVon, pruefvermerk, gueltigAb, geprueftBestaetigt } = {}) {
  return aendere(slug, (daten) => {
    const dok = dokumentFinden(daten, id);
    const hindernisse = freigabeHindernisse(dok, { freigegebenVon, pruefvermerk, geprueftBestaetigt });
    if (hindernisse.length) throw new Error(`Freigabe nicht möglich: ${hindernisse.join(" ")}`);
    const jetzt = uhrHook.jetzt();
    const ab = gueltigAb ? new Date(gueltigAb) : jetzt;
    if (Number.isNaN(ab.getTime())) throw new Error("Ungültiges Datum für „gültig ab“.");
    const nr = 1 + Math.max(0, ...daten.rechtsdokumente.filter((d) => d.art === dok.art && d.versionNr).map((d) => d.versionNr));
    dok.versionNr = nr;
    dok.version = `v${nr}`;
    dok.status = "freigegeben";
    dok.freigegebenVon = String(freigegebenVon).trim().slice(0, 120);
    dok.pruefvermerk = String(pruefvermerk).trim().slice(0, 500);
    dok.freigegebenAm = jetzt.toISOString();
    dok.gueltigAb = (ab < jetzt ? jetzt : ab).toISOString();
    dok.inhaltHash = inhaltHash(dok);
    return dok;
  });
}

/**
 * Zieht eine Fassung zurück (gilt ab sofort nicht mehr). Sie bleibt
 * gespeichert und abrufbar – bestehende Nachweise verweisen weiter auf sie.
 */
export function zieheRechtsdokumentZurueck(slug, id) {
  return aendere(slug, (daten) => {
    const dok = dokumentFinden(daten, id);
    if (dok.status !== "freigegeben") throw new Error("Nur freigegebene Fassungen können zurückgezogen werden.");
    dok.status = "zurueckgezogen";
    dok.zurueckgezogenAm = uhrHook.jetzt().toISOString();
    // Ohne gültige Regel wirkt der Schalter nicht mehr – sichtbar aus.
    if (dok.art === "noshow-bestellung" && !gueltigeFassung(daten.rechtsdokumente, "noshow-bestellung", uhrHook.jetzt())) daten.noShowSchutzAktiv = false;
    if (dok.art === "noshow-reservierung" && !gueltigeFassung(daten.rechtsdokumente, "noshow-reservierung", uhrHook.jetzt())) daten.reservierungNoShowAktiv = false;
    return dok;
  });
}

/** Löscht einen Entwurf. Freigegebene oder zurückgezogene Fassungen nie. */
export function loescheRechtsdokumentEntwurf(slug, id) {
  return aendere(slug, (daten) => {
    const dok = dokumentFinden(daten, id);
    if (dok.status !== "entwurf") throw new Error("Nur Entwürfe können gelöscht werden – Fassungen bleiben als Nachweis erhalten.");
    daten.rechtsdokumente = daten.rechtsdokumente.filter((d) => d.id !== id);
    return true;
  });
}

/** Eine bestimmte freigegebene (oder zurückgezogene) Fassung – für Anzeige und Nachweis. */
export function rechtsdokumentFassung(daten, art, version) {
  return (daten.rechtsdokumente ?? []).find((d) => d.art === art && d.version === version && d.status !== "entwurf") ?? null;
}

export const RECHTSDOKUMENT_ARTEN = Object.keys(DOKUMENT_ARTEN);

const LAUNCH_VERMERKE = ["allergene", "avv"];

/** Vermerk für einen Punkt der Launch-Prüfliste, der sich nicht automatisch prüfen lässt. */
export function setzeLaunchVermerk(slug, punkt, { vermerk, von } = {}) {
  if (!LAUNCH_VERMERKE.includes(punkt)) throw new Error("Unbekannter Prüfpunkt.");
  return aendere(slug, (daten) => {
    daten.launchVermerke ??= {};
    const text = String(vermerk ?? "").trim();
    if (!text) delete daten.launchVermerke[punkt];
    else daten.launchVermerke[punkt] = { vermerk: text.slice(0, 500), von: String(von ?? "").trim().slice(0, 120), am: uhrHook.jetzt().toISOString() };
    return daten.launchVermerke;
  });
}

/**
 * Messquelle für Website-Aufrufe (seitenaufrufe.js). Bewusst kein Schalter
 * im Dashboard: Einschalten ist erst sinnvoll, wenn der Host der Kundenseite
 * tatsächlich zählt – sonst stünde dort eine falsche 0.
 */
export function setzeSeitenaufrufMessung(slug, quelle) {
  if (!SEITENAUFRUF_QUELLEN.includes(quelle)) throw new Error(`Unbekannte Messquelle "${quelle}".`);
  return aendere(slug, (daten) => {
    daten.seitenaufrufMessung = quelle === "keine" ? null : { quelle, aktivSeit: daten.seitenaufrufMessung?.aktivSeit ?? uhrHook.jetzt().toISOString() };
    return daten.seitenaufrufMessung;
  });
}
