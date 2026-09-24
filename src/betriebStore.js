import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import {
  berechneAbholzeiten,
  pruefeAbholwunsch,
  zeitpunktFuerUhrzeit,
  ASAP_VORLAUF_MINUTEN,
  RASTER_MINUTEN,
  STANDARD_OEFFNUNGSZEITEN,
  ZEITZONE_STANDARD,
} from "./abholzeiten.js";

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
 * Der exakte Zustimmungstext für eine gegebene Konfiguration – identisch
 * auf der Bestellseite (landingPageGenerator.js, dort clientseitig
 * nachgebaut) und hier serverseitig als Beweistext gespeichert.
 */
export function noShowZustimmungstext({ noShowStornofensterMinuten, noShowGebuehrBetrag }) {
  const betrag = Number(noShowGebuehrBetrag || 0).toFixed(2).replace(".", ",");
  return (
    `Ich stimme zu: Bei Nichtabholung ohne Stornierung bis ${noShowStornofensterMinuten} Minuten vor der ` +
    `Abholzeit wird eine Ausfallpauschale von ${betrag} € in Rechnung gestellt.`
  );
}

/**
 * Setzt die No-Show-Schutz-Einstellungen eines Betriebs. Default aus
 * (noShowSchutzAktiv: false), damit bestehende Betriebe sich nicht
 * plötzlich anders verhalten.
 */
export function setzeNoShowSchutz(slug, { aktiv, gebuehrBetrag, stornofensterMinuten, warnSchwelle } = {}) {
  const betrag = Number(gebuehrBetrag);
  const fenster = Number(stornofensterMinuten);
  const schwelle = Number(warnSchwelle);

  if (!Number.isFinite(betrag) || betrag < 0) {
    throw new Error("Die Ausfallpauschale muss ein Betrag ab 0 € sein.");
  }
  if (!Number.isInteger(fenster) || fenster < 0 || fenster > 1440) {
    throw new Error("Das Stornofenster muss zwischen 0 und 1440 Minuten liegen.");
  }
  if (!Number.isInteger(schwelle) || schwelle < 1) {
    throw new Error("Die Warn-Schwelle muss mindestens 1 sein.");
  }

  return aendere(slug, (daten) => {
    daten.noShowSchutzAktiv = Boolean(aktiv);
    daten.noShowGebuehrBetrag = betrag;
    daten.noShowStornofensterMinuten = fenster;
    daten.noShowWarnSchwelle = schwelle;
    return {
      noShowSchutzAktiv: daten.noShowSchutzAktiv,
      noShowGebuehrBetrag: daten.noShowGebuehrBetrag,
      noShowStornofensterMinuten: daten.noShowStornofensterMinuten,
      noShowWarnSchwelle: daten.noShowWarnSchwelle,
    };
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
  return aendere(slug, (daten) => {
    const { personen, warnung } = pruefeReservierung(daten, eingabe, { quelle });

    const reservierung = {
      id: randomUUID(),
      datum: eingabe.datum,
      uhrzeit: eingabe.uhrzeit,
      personen,
      name: String(eingabe.name).trim(),
      telefon: String(eingabe.telefon ?? "").trim(),
      email: String(eingabe.email ?? "").trim(),
      wunsch: String(eingabe.wunsch ?? "").trim(),
      tischId: null,
      quelle,
      // Was der Wirt selbst einträgt, steht ohnehin schon fest.
      status: quelle === "manuell" ? "bestaetigt" : "neu",
      eingegangen: new Date().toISOString(),
    };

    daten.reservierungen.push(reservierung);
    // Die Warnung hängt nicht an der Reservierung – sie gilt der Lage im
    // Raum, nicht dieser einen Gruppe, und löst sich mit jeder Absage auf.
    return { ...reservierung, warnung };
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

  const sauber = positionen.map((p) => ({
    name: String(p.name ?? "").trim(),
    menge: Math.max(1, Math.min(99, Number(p.menge) || 1)),
    preis: Number(p.preis) || 0,
  }));

  return aendere(slug, (daten) => {
    const abholung = pruefeAbholwunsch({
      jetzt,
      ...abholEinstellungen(daten),
      art: eingabe.abholArt,
      zeitpunkt: eingabe.abholZeitpunkt,
      abholzeit: eingabe.abholArt ? "" : eingabe.abholzeit,
    });
    if (!abholung.ok) throw new Error(abholung.fehler);

    // Ist die Funktion aktiv, ist die Zustimmung Pflicht – ohne Häkchen keine
    // Bestellung. Der Text wird serverseitig aus der aktuellen Konfiguration
    // gebaut, nicht vom Client übernommen: Beweistext und tatsächlich
    // geltende Bedingungen dürfen nie auseinanderlaufen.
    let noShowZustimmung = null;
    let noShowGebuehrBetragVereinbart = null;
    if (daten.noShowSchutzAktiv) {
      if (eingabe.noShowZustimmung !== true) {
        throw new Error("Bitte stimmen Sie der Ausfallpauschale zu, um fortzufahren.");
      }
      noShowZustimmung = {
        text: noShowZustimmungstext(daten),
        zeitpunkt: jetzt.toISOString(),
      };
      noShowGebuehrBetragVereinbart = daten.noShowGebuehrBetrag;
    }

    const bestellung = {
      id: randomUUID(),
      nummer: `AB-${String(Math.floor(1000 + Math.random() * 9000))}`,
      positionen: sauber,
      gesamt: sauber.reduce((summe, p) => summe + p.preis * p.menge, 0),
      // Wunsch des Gastes; was tatsächlich gilt, bestätigt der Wirt. Die
      // Uhrzeit kommt aus dem geprüften Zeitpunkt, nicht aus dem Text des Browsers.
      abholzeit: abholung.uhrzeit,
      abholArt: abholung.art,
      abholZeitpunkt: abholung.iso,
      bestaetigteAbholzeit: "",
      name: String(eingabe.name).trim(),
      telefon: String(eingabe.telefon ?? "").trim(),
      email: String(eingabe.email ?? "").trim(),
      hinweis: String(eingabe.hinweis ?? "").trim(),
      status: "neu",
      eingegangen: jetzt.toISOString(),
      // Beweis für eine spätere Forderung: exakter Text, Zeitpunkt, dazu
      // Name/Kontakt – die stehen ohnehin schon oben auf der Bestellung.
      noShowZustimmung,
      noShowGebuehrBetragVereinbart,
      storniertAm: "",
      noShowBestaetigtAm: "",
      noShowBetrag: null,
    };

    daten.bestellungen.push(bestellung);
    return bestellung;
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
export function bestaetigeBestellung(slug, id, abholzeit) {
  const zeit = String(abholzeit ?? "").trim();
  if (!zeit) throw new Error("Bitte eine Abholzeit bestätigen.");

  return aendere(slug, (daten) => {
    const b = daten.bestellungen.find((x) => x.id === id);
    if (!b) throw new Error("Bestellung nicht gefunden.");
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
