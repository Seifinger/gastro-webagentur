import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

// Datenhaltung eines Betriebs: Tischplan, Reservierungen, Bestellungen.
// Eine JSON-Datei je Betrieb – das reicht für ein Haus mit ein paar Dutzend
// Reservierungen am Tag und bleibt ohne Datenbank nachvollziehbar.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const betriebeDir = path.join(__dirname, "..", "data", "betrieb");

// Wie lange ein Tisch als belegt gilt. Zwei Stunden sind in der Gastronomie
// der übliche Ansatz für einen Durchgang.
export const BELEGDAUER_MINUTEN = 120;

export const RESERVIERUNG_STATUS = ["neu", "bestaetigt", "abgesagt"];
export const BESTELLUNG_STATUS = ["neu", "bestaetigt", "abgeholt", "abgelehnt"];

function datei(slug) {
  return path.join(betriebeDir, `${slug}.json`);
}

function leererBetrieb() {
  return { tische: [], reservierungen: [], bestellungen: [] };
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

/* ---------- Reservierungen ---------- */

function pruefeReservierung(daten, eingabe, { ignoriereId } = {}) {
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

  return personen;
}

export function legeReservierungAn(slug, eingabe, quelle = "online") {
  return aendere(slug, (daten) => {
    const personen = pruefeReservierung(daten, eingabe);

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
    return reservierung;
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

export function legeBestellungAn(slug, eingabe) {
  const positionen = Array.isArray(eingabe.positionen) ? eingabe.positionen : [];

  if (positionen.length === 0) throw new Error("Die Bestellung ist leer.");
  if (!String(eingabe.name ?? "").trim()) throw new Error("Bitte einen Namen angeben.");
  if (!String(eingabe.abholzeit ?? "").trim()) throw new Error("Bitte eine Abholzeit angeben.");

  const sauber = positionen.map((p) => ({
    name: String(p.name ?? "").trim(),
    menge: Math.max(1, Math.min(99, Number(p.menge) || 1)),
    preis: Number(p.preis) || 0,
  }));

  return aendere(slug, (daten) => {
    const bestellung = {
      id: randomUUID(),
      nummer: `AB-${String(Math.floor(1000 + Math.random() * 9000))}`,
      positionen: sauber,
      gesamt: sauber.reduce((summe, p) => summe + p.preis * p.menge, 0),
      // Wunsch des Gastes; was tatsächlich gilt, bestätigt der Wirt.
      abholzeit: String(eingabe.abholzeit).trim(),
      bestaetigteAbholzeit: "",
      name: String(eingabe.name).trim(),
      telefon: String(eingabe.telefon ?? "").trim(),
      hinweis: String(eingabe.hinweis ?? "").trim(),
      status: "neu",
      eingegangen: new Date().toISOString(),
    };

    daten.bestellungen.push(bestellung);
    return bestellung;
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
    return b;
  });
}
