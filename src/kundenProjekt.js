// Kundenprojekte: die eigene Fassung einer echten Kundenwebsite.
//
// Aus einer Lead-Demo (oder, für Tests, einer fiktiven Beispielseite) wird
// eine KUNDENFASSUNG angelegt: Designrichtung (Küche, Farbschema, Vorlage)
// wird übernommen, Inhalte werden getrennt davon gepflegt. Die Lead-Demo
// bleibt unverändert.
//
// Speicher – eine Quelle für Dashboard UND Claude-Code-Chat:
//   data/kunden/<kunden-id>/projekt.json   Inhalte, Status, Verlauf
//   data/kunden/<kunden-id>/medien/        hochgeladene Medien (zufällige Dateinamen)
// data/kunden/ ist gitignoriert, liegt nie unter docs/ und wird nur über
// das geschützte Dashboard (/intern/…) ausgeliefert.
//
// Jede Änderung läuft über aendereProjekt(): lesen → prüfen → schreiben mit
// Revisionszähler. Wer mit einer veralteten Revision speichert (z. B. das
// Dashboard, während im Chat etwas geändert wurde), bekommt einen Konflikt
// statt still fremde Änderungen zu überschreiben.
//
// Layout, Sektionen, Typografie, Motion, Grid und Tokens sind hier bewusst
// NICHT enthalten – nur Inhalte, die in vorhandene Plätze der Vorlage fließen.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, renameSync, rmSync } from "node:fs";
import { entferneBildMetadaten, mp4HatStandort } from "./bildMetadaten.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomBytes } from "node:crypto";
import { bildMasse } from "./bildUpload.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const KUNDEN_DIR = path.join(__dirname, "..", "data", "kunden");

export const KUNDEN_ID = /^k-[a-z0-9]{10}$/;
const GERICHT_ID = /^g-[a-z0-9]{8}$/;
const KATEGORIE_ID = /^c-[a-z0-9]{8}$/;
export const MAX_VERLAUF = 60;

export class KonfliktFehler extends Error {
  constructor(aktuelleRevision) {
    super("Das Projekt wurde inzwischen an anderer Stelle geändert (z. B. im Chat). Bitte neu laden – nichts wurde überschrieben.");
    this.konflikt = true;
    this.revision = aktuelleRevision;
  }
}

function zufall(n) {
  const zeichen = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(randomBytes(n), (b) => zeichen[b % zeichen.length]).join("");
}

export function neueKundenId() {
  return `k-${zufall(10)}`;
}
const neueGerichtId = () => `g-${zufall(8)}`;
const neueKategorieId = () => `c-${zufall(8)}`;

/** Ordner eines Projekts – nur für gültige IDs, nie aus freien Pfaden. */
export function projektOrdner(id, basis = KUNDEN_DIR) {
  if (!KUNDEN_ID.test(String(id ?? ""))) throw new Error("Ungültige Kunden-ID.");
  return path.join(basis, id);
}

function projektDatei(id, basis) {
  return path.join(projektOrdner(id, basis), "projekt.json");
}

export function medienOrdner(id, basis = KUNDEN_DIR) {
  return path.join(projektOrdner(id, basis), "medien");
}

export function projektExistiert(id, basis = KUNDEN_DIR) {
  return KUNDEN_ID.test(String(id ?? "")) && existsSync(projektDatei(id, basis));
}

export function ladeProjekt(id, basis = KUNDEN_DIR) {
  if (!projektExistiert(id, basis)) throw new Error("Kundenprojekt nicht gefunden.");
  return JSON.parse(readFileSync(projektDatei(id, basis), "utf-8"));
}

function schreibe(projekt, basis) {
  const datei = projektDatei(projekt.id, basis);
  mkdirSync(path.dirname(datei), { recursive: true });
  // Erst in eine Nachbardatei, dann umbenennen: Ein Absturz mitten im
  // Schreiben hinterlässt nie eine halbe projekt.json.
  const tmp = `${datei}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(projekt, null, 2)}\n`, "utf-8");
  renameSync(tmp, datei);
}

export function alleProjekte(basis = KUNDEN_DIR) {
  if (!existsSync(basis)) return [];
  return readdirSync(basis)
    .filter((d) => KUNDEN_ID.test(d) && existsSync(path.join(basis, d, "projekt.json")))
    .map((d) => {
      const p = ladeProjekt(d, basis);
      return { id: p.id, name: p.felder.name?.wert ?? "", herkunft: p.herkunft, geaendert: p.geaendert, revision: p.revision };
    })
    .sort((a, b) => String(b.geaendert).localeCompare(String(a.geaendert)));
}

/**
 * Die einzige Stelle, an der ein Projekt geschrieben wird.
 * @param {string} id
 * @param {number|undefined} basisRevision - Revision, auf der die Änderung
 *   beruht. undefined = ohne Prüfung (nur für CLI-Einzelbefehle, die selbst frisch laden).
 * @param {(p: object) => any} fn
 * @param {{ von?: string, was?: string }} [info]
 */
export function aendereProjekt(id, basisRevision, fn, { von = "Dashboard", was = "Änderung", basis = KUNDEN_DIR, jetzt = new Date() } = {}) {
  const projekt = ladeProjekt(id, basis);
  if (basisRevision !== undefined && basisRevision !== null && Number(basisRevision) !== projekt.revision) {
    throw new KonfliktFehler(projekt.revision);
  }
  const vorher = JSON.stringify(projekt.felder) + JSON.stringify(projekt.medien) + JSON.stringify(projekt.speisekarte) + JSON.stringify(projekt.oeffnungszeiten);
  const ergebnis = fn(projekt, { von, jetzt: jetzt.toISOString() });
  const nachher = JSON.stringify(projekt.felder) + JSON.stringify(projekt.medien) + JSON.stringify(projekt.speisekarte) + JSON.stringify(projekt.oeffnungszeiten);
  if (vorher === nachher && !projekt._statusGeaendert) return { projekt, ergebnis, unveraendert: true };
  delete projekt._statusGeaendert;
  projekt.revision += 1;
  projekt.geaendert = jetzt.toISOString();
  projekt.verlauf = [...(projekt.verlauf ?? []), { revision: projekt.revision, zeitpunkt: jetzt.toISOString(), von, was: String(was).slice(0, 200) }].slice(-MAX_VERLAUF);
  schreibe(projekt, basis);
  return { projekt, ergebnis };
}

/* ---------- Feldregister ---------- */

// Jedes Feld fließt in einen vorhandenen Platz der Vorlage ("platz").
export const BEREICHE = {
  marke: "Marke",
  hero: "Hero",
  texte: "Texte",
  bilder: "Bilder",
  speisekarte: "Speisekarte",
  betrieb: "Betrieb",
};

export const FELDER = [
  { id: "name", bereich: "marke", label: "Restaurantname", max: 80, pflicht: true, platz: "Kopfzeile, Seitentitel, Fußzeile" },
  { id: "slogan", bereich: "marke", label: "Slogan", max: 60, platz: "Bühne (Hero)" },
  // Pflicht: sonst stünde dort der Mustersatz der Küche.
  { id: "einladung", bereich: "marke", label: "Kurzer Hero-Text", max: 180, mehrzeilig: true, pflicht: true, platz: "Einladung direkt unter der Bühne" },
  // Die Unterzeile stammt sonst aus dem Küchenkonzept (z. B. „Holzofenpizza & frische Pasta“) – eine Behauptung über das Haus.
  { id: "text.kicker", bereich: "marke", label: "Unterzeile (Küche · Ort)", max: 80, pflicht: true, platz: "Einladung unter der Bühne" },
  { id: "text.tisch.titel", bereich: "texte", label: "Überschrift Empfehlungen", max: 80, platz: "Abschnitt „Auf dem Tisch“" },
  { id: "text.tisch.intro", bereich: "texte", label: "Einleitung Empfehlungen", max: 220, mehrzeilig: true, platz: "Abschnitt „Auf dem Tisch“" },
  { id: "text.ambiente.titel", bereich: "texte", label: "Überschrift „Über uns“", max: 80, platz: "Haus-Band" },
  // Pflicht: sonst stünde dort die Muster-Geschichte der Küche, als wäre sie die des Hauses.
  { id: "text.ambiente.text", bereich: "texte", label: "Geschichte / Über uns", max: 900, mehrzeilig: true, pflicht: true, platz: "Haus-Band" },
  { id: "text.speisekarte.auswahlTitel", bereich: "texte", label: "Überschrift Kartenauswahl (Startseite)", max: 80, platz: "Auswahl aus der Karte" },
  { id: "text.speisekarte.auswahlIntro", bereich: "texte", label: "Einleitung Kartenauswahl", max: 220, mehrzeilig: true, platz: "Auswahl aus der Karte" },
  { id: "text.speisekarte.intro", bereich: "texte", label: "Einleitung Speisekarten-Seite", max: 300, mehrzeilig: true, platz: "Speisekarten-Seite" },
  { id: "text.karte.fussnote", bereich: "texte", label: "Hinweis unter der Karte (Preise, Allergene)", max: 240, mehrzeilig: true, platz: "Speisekarte" },
  { id: "text.ctaReservieren", bereich: "texte", label: "Knopftext Reservieren", max: 28, platz: "Kopfzeile / Bühne", knopf: "reservieren" },
  { id: "text.ctaBestellen", bereich: "texte", label: "Knopftext Bestellen", max: 28, platz: "Kopfzeile / Bühne", knopf: "bestellen" },
  { id: "text.buehne.alt", bereich: "texte", label: "Alt-Text des Hero-Bilds", max: 160, platz: "Bühne (für Screenreader)" },
  { id: "text.fuss.hinweis", bereich: "texte", label: "Satz in der Fußzeile", max: 240, mehrzeilig: true, platz: "Fußzeile" },
  { id: "adresse", bereich: "betrieb", label: "Adresse (Straße Nr., PLZ Ort)", max: 160, pflicht: true, platz: "Anfahrt, Fußzeile" },
  { id: "telefon", bereich: "betrieb", label: "Telefon", max: 40, pflicht: true, muster: /^[+\d][\d\s/()-]{4,}$/, platz: "Anfahrt, Kopfzeile, Bestätigungen" },
  { id: "email", bereich: "betrieb", label: "E-Mail", max: 120, muster: /^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i, platz: "Kontakt-Mail in der Bestätigung" },
  { id: "betriebSlug", bereich: "betrieb", label: "Wirt-Betrieb (Bestell-/Reservierungsserver)", max: 60, muster: /^[a-z0-9_][a-z0-9_-]{1,58}$/, platz: "Verknüpfung zum Wirt-Dashboard" },
  { id: "apiUrl", bereich: "betrieb", label: "Adresse des Bestellservers", max: 200, muster: /^(https:\/\/[^\s<>"]+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)\/?$/, platz: "Formulare der Seite" },
];

export const FELD_STATUS = ["fehlt", "entwurf", "bestaetigt"];

/** Medienplätze der Standardvorlagen (mit Ausdruck). */
export const MEDIEN_ROLLEN = {
  logo: { bereich: "marke", label: "Logo", art: "bild", minBreite: 160, platz: "Kopfzeile (ersetzt die Wortmarke)" },
  favicon: { bereich: "marke", label: "Favicon", art: "bild", minBreite: 48, quadratisch: true, platz: "Browser-Tab" },
  hero: { bereich: "hero", label: "Poster Desktop (quer)", art: "bild", minBreite: 1200, quer: true, pflicht: true, platz: "Bühne" },
  heroMobil: { bereich: "hero", label: "Poster Mobile (hoch)", art: "bild", minBreite: 600, hoch: true, platz: "Bühne auf dem Handy" },
  heroVideo: { bereich: "hero", label: "Video Desktop (quer)", art: "video", platz: "Bühne" },
  heroVideoMobil: { bereich: "hero", label: "Video Mobile (hoch)", art: "video", platz: "Bühne auf dem Handy" },
  haus: { bereich: "bilder", label: "Außenansicht / Gastraum", art: "bild", minBreite: 1000, platz: "Haus-Band („Über uns“)" },
};

// Plätze, die es in den Standardvorlagen NICHT gibt – bewusst gesperrt,
// weil sie neue Sektionen bräuchten.
export const GESPERRTE_PLAETZE = [
  { label: "Galerie", grund: "Die Standardvorlagen haben keine Galerie-Sektion. Eine neue Sektion würde die Seitenstruktur ändern." },
  { label: "Team-Foto", grund: "In den Vorlagen mit Ausdruck gibt es keinen Team-Platz (nur in der alten Vorlage ohne Ausdruck)." },
  { label: "Weitere Restaurantbilder", grund: "Das Haus-Band trägt genau ein Bild. Weitere Bilder erscheinen als Gerichtbilder in der Speisekarte." },
  { label: "Sektionsreihenfolge, Hero-Aufbau, Kopfzeile, Typografie, Motion, Raster, Abstände, Farbtokens", grund: "Teil des Designsystems. Sonderwünsche bitte im Chat an Claude Code." },
];

export const LIMITS = {
  bildBytes: 8 * 1024 * 1024,
  videoBytes: 40 * 1024 * 1024,
};

/* ---------- Prüfungen ---------- */

export function pruefeText(wert, { label, max, mehrzeilig = false, muster } = {}) {
  let text = String(wert ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n");
  text = mehrzeilig ? text.split("\n").map((z) => z.replace(/[ \t]+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim() : text.replace(/\s+/g, " ").trim();
  if (text.length > max) throw new Error(`${label}: höchstens ${max} Zeichen (sind ${text.length}).`);
  // Die Seite maskiert alles – spitze Klammern haben in diesen Texten trotzdem nichts verloren.
  if (/[<>]/.test(text)) throw new Error(`${label}: bitte keine spitzen Klammern (HTML ist nicht erlaubt).`);
  if (text && muster && !muster.test(text)) throw new Error(`${label}: Format ungültig.`);
  return text;
}

export function pruefePreis(wert, label = "Preis") {
  const n = typeof wert === "string" ? Number(wert.replace(",", ".").replace(/[^\d.]/g, "")) : Number(wert);
  if (!Number.isFinite(n) || n <= 0 || n > 999) throw new Error(`${label}: bitte einen Betrag zwischen 0,01 und 999 € angeben.`);
  return Math.round(n * 100) / 100;
}

const TAG = /(mo|di|mi|do|fr|sa|so)(ntag|nstag|ttwoch|nnerstag|eitag|mstag)?\.?/i;
const INTERVALL = /(\d{1,2})[:.](\d{2})\s*(?:uhr\s*)?(?:–|—|-|bis)\s*(\d{1,2})[:.](\d{2})/i;

/** Öffnungszeiten im Format der Seite: [{ tage: "Mo–Fr", zeiten: "11:30–14:00 & 17:00–22:00" }]. */
export function pruefeOeffnungszeiten(zeilen) {
  if (!Array.isArray(zeilen) || zeilen.length === 0 || zeilen.length > 10) throw new Error("Bitte 1 bis 10 Zeilen Öffnungszeiten angeben.");
  return zeilen.map((z, i) => {
    const tage = pruefeText(z?.tage, { label: `Zeile ${i + 1}: Tage`, max: 40 });
    const zeiten = pruefeText(z?.zeiten, { label: `Zeile ${i + 1}: Zeiten`, max: 60 });
    if (!TAG.test(tage)) throw new Error(`Zeile ${i + 1}: Wochentage nicht erkannt (z. B. „Mo–Fr“, „Samstag“).`);
    if (!/ruhetag|geschlossen/i.test(zeiten) && !INTERVALL.test(zeiten)) throw new Error(`Zeile ${i + 1}: Zeiten nicht erkannt (z. B. „11:30–14:00 & 17:00–22:00“ oder „Ruhetag“).`);
    return { tage, zeiten };
  });
}

/** Ausnahmen (Feiertage, Urlaub) – nur Anzeige, gleiche Zeilenform. */
export function pruefeAusnahmen(zeilen) {
  if (!Array.isArray(zeilen) || zeilen.length > 12) throw new Error("Höchstens 12 Ausnahmen.");
  return zeilen
    .map((z, i) => ({
      tage: pruefeText(z?.tage, { label: `Ausnahme ${i + 1}: Datum`, max: 40 }),
      zeiten: pruefeText(z?.zeiten, { label: `Ausnahme ${i + 1}: Zeiten`, max: 60 }),
    }))
    .filter((z) => z.tage && z.zeiten);
}

/* ---------- Anlegen ---------- */

function feld(wert, quelle, jetzt, status) {
  const w = String(wert ?? "").trim();
  return { wert: w, quelle: w ? quelle : "", status: w ? status ?? "entwurf" : "fehlt", geaendertAm: jetzt };
}

/** Karte im Projektformat – jede Kategorie und jedes Gericht mit stabiler ID. */
export function karteAlsProjekt(menu, { herkunft = "muster" } = {}) {
  return {
    kategorien: (menu?.kategorien ?? []).map((k) => ({
      id: neueKategorieId(),
      name: String(k.name ?? ""),
      beschreibung: String(k.beschreibung ?? ""),
      gerichte: [...(k.gerichte ?? []), ...(k.gruppen ?? []).flatMap((g) => g.gerichte ?? [])].map((g) => ({
        id: neueGerichtId(),
        name: String(g.name ?? ""),
        beschreibung: String(g.beschreibung ?? ""),
        preis: Number(g.preis) || 0,
        varianten: (g.varianten ?? []).map((v) => ({ id: `v-${zufall(6)}`, name: String(v.name), preis: Number(v.preis) || 0, verfuegbar: v.verfuegbar !== false })),
        extras: (g.extras ?? []).map((x) => ({ name: String(x.name), ...(Number.isFinite(Number(x.preis)) && x.preis !== undefined ? { preis: Number(x.preis) } : {}) })),
        vegetarisch: Boolean(g.vegetarisch),
        signatur: Boolean(g.signatur),
        verfuegbar: true,
        sichtbar: true,
        allergene: "",
        herkunft,
        status: "entwurf",
      })),
    })),
  };
}

/**
 * Legt eine Kundenfassung an. Übernommen werden die Designrichtung der
 * Demo (Küche, Farbschema, Vorlage) und – ausdrücklich als unbestätigte
 * Entwürfe markiert – Name, Adresse, Telefon und die Musterkarte.
 */
export function legeProjektAn({ herkunft, kueche, farbschema, vorlage, name = "", adresse = "", telefon = "", slogan = "", menu, quelleAngaben }, { basis = KUNDEN_DIR, jetzt = new Date(), id = neueKundenId() } = {}) {
  if (!kueche || !farbschema || !vorlage) throw new Error("Küche, Farbschema und Vorlage werden aus der Demo übernommen und dürfen nicht fehlen.");
  const t = jetzt.toISOString();
  const q = quelleAngaben ?? "aus der Demo übernommen – beim Kunden bestätigen";
  const projekt = {
    schema: 1,
    id,
    revision: 1,
    erstellt: t,
    geaendert: t,
    herkunft: { ...herkunft, uebernommenAm: t },
    design: { kueche, farbschema, vorlage, quelle: `übernommen aus ${herkunft?.art === "beispiel" ? "Beispielseite" : "Lead-Demo"} ${herkunft?.slug ?? ""}`.trim() },
    felder: Object.fromEntries(FELDER.map((f) => [f.id, feld("", "", t)])),
    medien: Object.fromEntries(Object.keys(MEDIEN_ROLLEN).map((r) => [r, { aktuell: null, vorschlag: null, vorher: null, alt: "", fokus: "", status: "fehlt" }])),
    speisekarte: { ...karteAlsProjekt(menu), quelle: "Musterkarte der Küche (Konzept)", status: "entwurf" },
    oeffnungszeiten: { wert: [], ausnahmen: [], quelle: "", status: "fehlt" },
    bestellung: { aktiv: true },
    build: null,
    freigabe: null,
    live: null,
    verlauf: [{ revision: 1, zeitpunkt: t, von: "Dashboard", was: `Kundenfassung angelegt aus ${herkunft?.art ?? "?"} ${herkunft?.slug ?? ""}` }],
  };
  projekt.felder.name = feld(name, q, t);
  projekt.felder.adresse = feld(adresse, q, t);
  projekt.felder.telefon = feld(telefon, q, t);
  if (slogan) projekt.felder.slogan = feld(slogan, "Slogan der Demo", t);
  mkdirSync(medienOrdner(id, basis), { recursive: true });
  schreibe(projekt, basis);
  return projekt;
}

/* ---------- Felder ---------- */

function feldDef(id) {
  const f = FELDER.find((x) => x.id === id);
  if (!f) throw new Error(`Unbekanntes Feld "${id}".`);
  return f;
}

/** Setzt einen Feldwert (leer = entfernen). Neuer Wert ist immer „Entwurf“. */
export function setzeFeld(projekt, feldId, wert, { von, jetzt }) {
  const f = feldDef(feldId);
  const text = pruefeText(wert, f);
  const alt = projekt.felder[feldId] ?? {};
  if (alt.wert === text) return alt;
  projekt.felder[feldId] = { wert: text, quelle: text ? von : "", status: text ? "entwurf" : "fehlt", geaendertAm: jetzt };
  return projekt.felder[feldId];
}

/** „Vom Kunden bestätigt“ setzen oder zurücknehmen – ändert den Wert nicht. */
export function bestaetigeFeld(projekt, feldId, bestaetigt, { jetzt, notiz = "" }) {
  const f = projekt.felder[feldId];
  if (!f) throw new Error(`Unbekanntes Feld "${feldId}".`);
  if (!f.wert) throw new Error("Ein leeres Feld kann nicht bestätigt werden.");
  f.status = bestaetigt ? "bestaetigt" : "entwurf";
  f.bestaetigtAm = bestaetigt ? jetzt : "";
  f.notiz = pruefeText(notiz, { label: "Notiz", max: 200 });
  projekt._statusGeaendert = true;
  return f;
}

export function setzeFarbschema(projekt, farbschema, erlaubt) {
  if (!erlaubt.includes(farbschema)) throw new Error("Nur eines der drei Farbschemata der Küche ist möglich.");
  projekt.design.farbschema = farbschema;
  projekt._statusGeaendert = true;
}

export function setzeOeffnungszeiten(projekt, { zeilen, ausnahmen = [] }, { von, jetzt }) {
  projekt.oeffnungszeiten = { wert: pruefeOeffnungszeiten(zeilen), ausnahmen: pruefeAusnahmen(ausnahmen), quelle: von, status: "entwurf", geaendertAm: jetzt };
}

export function bestaetigeOeffnungszeiten(projekt, bestaetigt, { jetzt }) {
  if (!projekt.oeffnungszeiten.wert.length) throw new Error("Es sind noch keine Öffnungszeiten eingetragen.");
  projekt.oeffnungszeiten.status = bestaetigt ? "bestaetigt" : "entwurf";
  projekt.oeffnungszeiten.bestaetigtAm = bestaetigt ? jetzt : "";
  projekt._statusGeaendert = true;
}

export function setzeBestellung(projekt, aktiv) {
  projekt.bestellung = { aktiv: Boolean(aktiv) };
  projekt._statusGeaendert = true;
}

/* ---------- Speisekarte ---------- */

export function findeGericht(projekt, id) {
  for (const k of projekt.speisekarte.kategorien) {
    const g = k.gerichte.find((x) => x.id === id);
    if (g) return { kategorie: k, gericht: g };
  }
  return null;
}

function findeKategorie(projekt, id) {
  const k = projekt.speisekarte.kategorien.find((x) => x.id === id);
  if (!k) throw new Error("Kategorie nicht gefunden.");
  return k;
}

function pruefeGerichtDaten(daten) {
  const aus = {};
  if (daten.name !== undefined) {
    aus.name = pruefeText(daten.name, { label: "Name des Gerichts", max: 80 });
    if (!aus.name) throw new Error("Das Gericht braucht einen Namen.");
  }
  if (daten.beschreibung !== undefined) aus.beschreibung = pruefeText(daten.beschreibung, { label: "Beschreibung", max: 300, mehrzeilig: false });
  if (daten.preis !== undefined) aus.preis = pruefePreis(daten.preis);
  if (daten.allergene !== undefined) aus.allergene = pruefeText(daten.allergene, { label: "Allergene/Zusatzstoffe", max: 160 });
  for (const b of ["vegetarisch", "verfuegbar", "sichtbar", "signatur"]) if (daten[b] !== undefined) aus[b] = Boolean(daten[b]);
  if (daten.varianten !== undefined) {
    if (!Array.isArray(daten.varianten) || daten.varianten.length > 8) throw new Error("Höchstens 8 Varianten.");
    aus.varianten = daten.varianten.map((v, i) => ({
      id: /^v-[a-z0-9]{6}$/.test(v?.id ?? "") ? v.id : `v-${zufall(6)}`,
      name: pruefeText(v?.name, { label: `Variante ${i + 1}`, max: 40 }) || (() => { throw new Error(`Variante ${i + 1} braucht einen Namen.`); })(),
      preis: pruefePreis(v?.preis, `Preis der Variante ${i + 1}`),
      verfuegbar: v?.verfuegbar !== false,
    }));
  }
  if (daten.extras !== undefined) {
    if (!Array.isArray(daten.extras) || daten.extras.length > 12) throw new Error("Höchstens 12 Extras.");
    aus.extras = daten.extras.map((x, i) => ({
      name: pruefeText(x?.name, { label: `Extra ${i + 1}`, max: 40 }) || (() => { throw new Error(`Extra ${i + 1} braucht einen Namen.`); })(),
      ...(x?.preis !== undefined && x?.preis !== "" ? { preis: pruefePreis(x.preis, `Preis Extra ${i + 1}`) } : {}),
    }));
  }
  return aus;
}

/** Ändert ein Gericht. Die ID bleibt – Links und Warenkörbe zeigen weiter darauf. */
export function aendereGericht(projekt, id, daten, { von }) {
  const t = findeGericht(projekt, id);
  if (!t) throw new Error("Gericht nicht gefunden.");
  const aus = pruefeGerichtDaten(daten);
  const inhaltlich = ["name", "beschreibung", "preis", "varianten", "extras", "allergene"].some((k) => k in aus && JSON.stringify(aus[k]) !== JSON.stringify(t.gericht[k]));
  Object.assign(t.gericht, aus);
  if (inhaltlich) {
    t.gericht.status = "entwurf";
    t.gericht.herkunft = "kunde";
    t.gericht.quelle = von;
  }
  projekt.speisekarte.status = "entwurf";
  return t.gericht;
}

export function bestaetigeGericht(projekt, id, bestaetigt) {
  const t = findeGericht(projekt, id);
  if (!t) throw new Error("Gericht nicht gefunden.");
  t.gericht.status = bestaetigt ? "bestaetigt" : "entwurf";
  projekt._statusGeaendert = true;
  return t.gericht;
}

export function neuesGericht(projekt, kategorieId, daten, { von }) {
  const k = findeKategorie(projekt, kategorieId);
  if (k.gerichte.length >= 60) throw new Error("Höchstens 60 Gerichte je Kategorie.");
  const aus = pruefeGerichtDaten({ verfuegbar: true, sichtbar: true, ...daten });
  if (!aus.name) throw new Error("Das Gericht braucht einen Namen.");
  if (aus.preis === undefined && !aus.varianten?.length) throw new Error("Das Gericht braucht einen Preis.");
  const g = { id: neueGerichtId(), beschreibung: "", varianten: [], extras: [], vegetarisch: false, signatur: false, allergene: "", ...aus, herkunft: "kunde", quelle: von, status: "entwurf" };
  k.gerichte.push(g);
  return g;
}

export function entferneGericht(projekt, id) {
  const t = findeGericht(projekt, id);
  if (!t) throw new Error("Gericht nicht gefunden.");
  t.kategorie.gerichte = t.kategorie.gerichte.filter((g) => g.id !== id);
  // Das Gerichtbild bleibt bis zur Freigabe als "vorher" erhalten.
  const m = projekt.medien[`gericht:${id}`];
  if (m) projekt.medien[`gericht:${id}`] = { ...m, aktuell: null, vorher: m.aktuell ?? m.vorher, verwaist: true };
}

export function verschiebeGericht(projekt, id, richtung) {
  const t = findeGericht(projekt, id);
  if (!t) throw new Error("Gericht nicht gefunden.");
  const liste = t.kategorie.gerichte;
  const i = liste.indexOf(t.gericht);
  const j = i + (richtung === "hoch" ? -1 : 1);
  if (j < 0 || j >= liste.length) return;
  [liste[i], liste[j]] = [liste[j], liste[i]];
  projekt._statusGeaendert = true;
}

export function neueKategorie(projekt, name) {
  const n = pruefeText(name, { label: "Kategorie", max: 60 });
  if (!n) throw new Error("Die Kategorie braucht einen Namen.");
  const k = { id: neueKategorieId(), name: n, beschreibung: "", gerichte: [] };
  projekt.speisekarte.kategorien.push(k);
  return k;
}

export function aendereKategorie(projekt, id, { name, beschreibung }) {
  const k = findeKategorie(projekt, id);
  if (name !== undefined) {
    k.name = pruefeText(name, { label: "Kategorie", max: 60 });
    if (!k.name) throw new Error("Die Kategorie braucht einen Namen.");
  }
  if (beschreibung !== undefined) k.beschreibung = pruefeText(beschreibung, { label: "Beschreibung der Kategorie", max: 200 });
  return k;
}

export function entferneKategorie(projekt, id) {
  const k = findeKategorie(projekt, id);
  if (k.gerichte.length) throw new Error("Nur leere Kategorien lassen sich löschen – erst die Gerichte entfernen oder verschieben.");
  projekt.speisekarte.kategorien = projekt.speisekarte.kategorien.filter((x) => x.id !== id);
}

/** Karte im Format von v2/build/speisekarte.js – dieselbe für Seite, Warenkorb und Server. */
export function karteFuerBau(projekt) {
  return {
    kategorien: projekt.speisekarte.kategorien
      .map((k) => ({
        name: k.name,
        beschreibung: k.beschreibung,
        gerichte: k.gerichte.map((g) => ({
          // Die Projekt-ID ist die öffentliche, stabile Kennung (Anker, Warenkorb, Server).
          id: g.id,
          kundenId: g.id,
          name: g.name,
          beschreibung: g.beschreibung,
          preis: g.preis,
          varianten: g.varianten.map((v) => ({ id: v.id, name: v.name, preis: v.preis, ...(v.verfuegbar === false ? { verfuegbar: false } : {}) })),
          extras: g.extras,
          vegetarisch: g.vegetarisch,
          signatur: g.signatur,
          ...(g.allergene ? { allergene: g.allergene } : {}),
          ...(g.verfuegbar === false ? { ausverkauft: true } : {}),
          ...(g.sichtbar === false ? { aktiv: false } : {}),
          // Nur Gerichte mit eigenem Bild kommen als Bildkachel in Frage.
          ...(projekt.medien[`gericht:${g.id}`]?.aktuell ? { bild: "kunde" } : {}),
        })),
      })),
  };
}

/* ---------- Medien ---------- */

function rolleDef(projekt, rolle) {
  if (MEDIEN_ROLLEN[rolle]) return MEDIEN_ROLLEN[rolle];
  const m = /^gericht:(g-[a-z0-9]{8})$/.exec(rolle);
  if (m && findeGericht(projekt, m[1])) return { bereich: "speisekarte", label: `Bild: ${findeGericht(projekt, m[1]).gericht.name}`, art: "bild", minBreite: 600, platz: "Gerichtkachel und Speisekarte" };
  throw new Error("Unbekannter Medienplatz.");
}

function videoArt(puffer) {
  if (puffer.length > 12 && puffer.toString("latin1", 4, 8) === "ftyp") return { typ: "video/mp4", endung: "mp4" };
  if (puffer.length > 4 && puffer.readUInt32BE(0) === 0x1a45dfa3) return { typ: "video/webm", endung: "webm" };
  return null;
}

/**
 * Prüft eine hochgeladene Datei anhand ihrer Bytes – nicht anhand von Name
 * oder angegebenem Typ – gegen die Anforderungen des Platzes.
 */
export function pruefeMedium(def, puffer) {
  if (!Buffer.isBuffer(puffer) || puffer.length === 0) throw new Error("Die Datei ist leer.");
  if (def.art === "video") {
    const v = videoArt(puffer);
    if (!v) throw new Error("Kein MP4- oder WebM-Video erkannt.");
    if (mp4HatStandort(puffer)) throw new Error("Das Video enthält den Aufnahmeort (GPS). Bitte ohne Standort exportieren (z. B. am iPhone: Teilen → Optionen → „Ort“ aus) und erneut hochladen.");
    if (puffer.length > LIMITS.videoBytes) throw new Error(`Das Video ist größer als ${LIMITS.videoBytes / 1024 / 1024} MB.`);
    return { ...v, bytes: puffer.length };
  }
  const masse = bildMasse(puffer);
  if (!masse) throw new Error("Kein JPEG-, PNG- oder WebP-Bild erkannt (SVG ist aus Sicherheitsgründen nicht erlaubt).");
  if (puffer.length > LIMITS.bildBytes) throw new Error(`Das Bild ist größer als ${LIMITS.bildBytes / 1024 / 1024} MB.`);
  if (masse.breite < (def.minBreite ?? 1)) throw new Error(`Das Bild ist ${masse.breite} px breit – für „${def.label}“ braucht es mindestens ${def.minBreite} px.`);
  if (def.quer && masse.breite <= masse.hoehe) throw new Error("Hier braucht es ein Querformat.");
  if (def.hoch && masse.hoehe <= masse.breite) throw new Error("Hier braucht es ein Hochformat.");
  if (def.quadratisch && Math.abs(masse.breite / masse.hoehe - 1) > 0.2) throw new Error("Das Favicon sollte (fast) quadratisch sein.");
  const endung = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[masse.typ];
  return { typ: masse.typ, endung, breite: masse.breite, hoehe: masse.hoehe, bytes: puffer.length };
}

/**
 * Legt ein Medium als VORSCHLAG ab. Das bisherige bleibt aktiv, bis der
 * Vorschlag übernommen wird. Dateiname und Ort bestimmt allein der Server.
 */
export function legeMediumVor(projekt, rolle, roh, { von, jetzt, basis = KUNDEN_DIR }) {
  const def = rolleDef(projekt, rolle);
  const geprueft = pruefeMedium(def, roh);
  // Aufnahmeort, Kamera, Namen: nichts davon soll später öffentlich werden.
  const puffer = def.art === "video" ? roh : entferneBildMetadaten(roh, geprueft.typ);
  const info = { ...geprueft, bytes: puffer.length };
  const name = `${rolle.replace(":", "-").toLowerCase()}-${zufall(8)}.${info.endung}`;
  const ordner = medienOrdner(projekt.id, basis);
  mkdirSync(ordner, { recursive: true });
  writeFileSync(path.join(ordner, name), puffer);
  const eintrag = projekt.medien[rolle] ?? { aktuell: null, vorschlag: null, vorher: null, alt: "", fokus: "", status: "fehlt" };
  // Ein älterer, nie übernommener Vorschlag wird ersetzt – seine Datei fällt bei der Freigabe weg.
  eintrag.vorschlag = { datei: name, ...info, hochgeladen: jetzt, von, sha256: createHash("sha256").update(puffer).digest("hex") };
  projekt.medien[rolle] = eintrag;
  return eintrag;
}

export function mediumAktion(projekt, rolle, aktion, { von, jetzt, alt, fokus } = {}) {
  rolleDef(projekt, rolle);
  const m = projekt.medien[rolle] ?? { aktuell: null, vorschlag: null, vorher: null, alt: "", fokus: "", status: "fehlt" };
  projekt.medien[rolle] = m;
  if (aktion === "uebernehmen") {
    if (!m.vorschlag) throw new Error("Es gibt keinen neuen Vorschlag.");
    if (m.aktuell) m.vorher = m.aktuell;
    m.aktuell = m.vorschlag;
    m.vorschlag = null;
    m.status = "entwurf";
    m.quelle = von;
  } else if (aktion === "verwerfen") {
    if (!m.vorschlag) throw new Error("Es gibt keinen neuen Vorschlag.");
    m.vorschlag = null;
    projekt._statusGeaendert = true;
  } else if (aktion === "zuruecksetzen") {
    if (!m.vorher) throw new Error("Es gibt kein früheres Medium.");
    [m.aktuell, m.vorher] = [m.vorher, m.aktuell];
    m.status = m.aktuell ? "entwurf" : "fehlt";
  } else if (aktion === "entfernen") {
    if (!m.aktuell) throw new Error("Hier ist kein Medium gesetzt.");
    m.vorher = m.aktuell;
    m.aktuell = null;
    m.status = "fehlt";
  } else if (aktion === "bestaetigen" || aktion === "unbestaetigt") {
    if (!m.aktuell) throw new Error("Ein leerer Platz kann nicht bestätigt werden.");
    m.status = aktion === "bestaetigen" ? "bestaetigt" : "entwurf";
    projekt._statusGeaendert = true;
  } else if (aktion === "beschreiben") {
    if (alt !== undefined) m.alt = pruefeText(alt, { label: "Alt-Text", max: 160 });
    if (fokus !== undefined) {
      const f = String(fokus ?? "").trim();
      if (f && !/^\d{1,3}% \d{1,3}%$/.test(f)) throw new Error("Fokus als „x% y%“ angeben, z. B. „50% 30%“.");
      m.fokus = f;
    }
  } else {
    throw new Error("Unbekannte Aktion.");
  }
  m.geaendertAm = jetzt;
  return m;
}

/** Absoluter Pfad einer Mediendatei des Projekts (für Auslieferung und Bau). */
export function mediumPfad(id, datei, basis = KUNDEN_DIR) {
  if (!/^[a-z0-9-]+\.(jpg|png|webp|mp4|webm)$/.test(String(datei ?? ""))) return null;
  const p = path.join(medienOrdner(id, basis), datei);
  return existsSync(p) ? p : null;
}

/* ---------- Status, Freigabe, Bereitschaft ---------- */

/** Fingerabdruck aller Inhalte – was freigegeben wird, ist genau dieser Stand. */
export function inhaltHash(projekt) {
  const { felder, medien, speisekarte, oeffnungszeiten, bestellung, design } = projekt;
  const medienKern = Object.fromEntries(Object.entries(medien).map(([r, m]) => [r, m.aktuell ? { sha: m.aktuell.sha256, alt: m.alt, fokus: m.fokus } : null]));
  const felderKern = Object.fromEntries(Object.entries(felder).map(([k, f]) => [k, f.wert]));
  return createHash("sha256").update(JSON.stringify({ felderKern, medienKern, speisekarte: speisekarte.kategorien, oeffnungszeiten: [oeffnungszeiten.wert, oeffnungszeiten.ausnahmen], bestellung, design })).digest("hex");
}

/**
 * Was vor der Freigabe (Inhalt) und vor einer späteren Veröffentlichung
 * noch fehlt. Technische Prüfungen – keine rechtliche Bewertung.
 * @param {object} [kontext] - { betrieb: geladene Betriebsdaten, rechtstexte: { impressum, datenschutz } }
 */
export function bereitschaft(projekt, kontext = {}) {
  const inhalt = [];
  const veroeffentlichung = [];
  for (const f of FELDER) {
    const w = projekt.felder[f.id];
    if (f.pflicht && !w?.wert) inhalt.push(`${f.label} fehlt.`);
    else if (f.pflicht && w.status !== "bestaetigt") inhalt.push(`${f.label} ist noch nicht vom Kunden bestätigt.`);
  }
  if (!projekt.medien.hero?.aktuell) inhalt.push("Poster Desktop (Hero) fehlt – die Bühne zeigt sonst eine neutrale Fläche.");
  for (const [rolle, m] of Object.entries(projekt.medien)) {
    if (m.vorschlag) inhalt.push(`${rolleLabel(projekt, rolle)}: neuer Upload noch nicht übernommen oder verworfen.`);
    if (m.aktuell && m.status !== "bestaetigt") inhalt.push(`${rolleLabel(projekt, rolle)}: noch nicht vom Kunden bestätigt.`);
  }
  const gerichte = projekt.speisekarte.kategorien.flatMap((k) => k.gerichte).filter((g) => g.sichtbar !== false);
  if (!gerichte.length) inhalt.push("Die Speisekarte ist leer.");
  const muster = gerichte.filter((g) => g.herkunft === "muster" && g.status !== "bestaetigt");
  if (muster.length) inhalt.push(`${muster.length} Gericht(e) stammen noch aus der Musterkarte und sind nicht bestätigt.`);
  const offen = gerichte.filter((g) => g.status !== "bestaetigt");
  if (offen.length && offen.length !== muster.length) inhalt.push(`${offen.length - muster.length} geänderte(s) Gericht(e) noch nicht vom Kunden bestätigt.`);
  const ohneAllergene = gerichte.filter((g) => !g.allergene);
  if (ohneAllergene.length) inhalt.push(`Allergen-/Zusatzstoffangaben fehlen bei ${ohneAllergene.length} Gericht(en).`);
  if (!projekt.oeffnungszeiten.wert.length) inhalt.push("Öffnungszeiten fehlen.");
  else if (projekt.oeffnungszeiten.status !== "bestaetigt") inhalt.push("Öffnungszeiten sind noch nicht vom Kunden bestätigt.");

  if (projekt.bestellung.aktiv) {
    if (!projekt.felder.betriebSlug?.wert) veroeffentlichung.push("Kein Wirt-Betrieb verknüpft – Bestellungen und Reservierungen hätten kein Ziel.");
    if (!/^https:\/\//.test(projekt.felder.apiUrl?.wert ?? "")) veroeffentlichung.push("Keine öffentliche HTTPS-Adresse des Bestellservers.");
  }
  if (!kontext.rechtstexte?.impressum) veroeffentlichung.push("Impressum des Restaurants ist nicht freigegeben (Wirt-Dashboard → Rechtstexte).");
  if (!kontext.rechtstexte?.datenschutz) veroeffentlichung.push("Datenschutzerklärung des Restaurants ist nicht freigegeben.");
  veroeffentlichung.push("Kundendomain und Hosting sind noch nicht eingerichtet (Veröffentlichen folgt in einem späteren Schritt).");
  return { inhalt, veroeffentlichung };
}

function rolleLabel(projekt, rolle) {
  try {
    return rolleDef(projekt, rolle).label;
  } catch {
    return rolle;
  }
}

/**
 * Die fünf Stufen, die das Dashboard unterscheidet. Jede spätere Stufe
 * gilt nur für genau den Inhaltsstand, auf dem sie beruht.
 */
export function stufen(projekt, kontext = {}) {
  const hash = inhaltHash(projekt);
  const b = bereitschaft(projekt, kontext);
  const gebaut = Boolean(projekt.build?.inhaltHash === hash && !projekt.build.fehler);
  const freigegeben = Boolean(projekt.freigabe?.inhaltHash === hash);
  // Veröffentlichungsziel (Domain/Hosting) ist bewusst noch nicht Teil dieses
  // Schritts – alles andere muss erfüllt sein.
  const technisch = b.veroeffentlichung.filter((x) => !x.startsWith("Kundendomain"));
  return {
    inhaltHash: hash,
    entwurf: { erreicht: true, revision: projekt.revision, zeitpunkt: projekt.geaendert },
    lokalGebaut: { erreicht: gebaut, zeitpunkt: projekt.build?.zeitpunkt ?? "", veraltet: Boolean(projekt.build && !gebaut && !projekt.build.fehler), fehler: projekt.build?.fehler ?? "" },
    freigegeben: { erreicht: freigegeben, zeitpunkt: projekt.freigabe?.zeitpunkt ?? "", von: projekt.freigabe?.von ?? "", veraltet: Boolean(projekt.freigabe && !freigegeben) },
    deploymentReady: { erreicht: freigegeben && gebaut && technisch.length === 0, fehlend: technisch },
    live: { erreicht: Boolean(projekt.live), text: projekt.live ? `veröffentlicht ${projekt.live.zeitpunkt}` : "noch nie veröffentlicht" },
    bereitschaft: b,
  };
}

/** Vermerkt einen lokalen Bau. */
export function vermerkeBuild(projekt, { inhaltHash: hash, zeitpunkt, ordner, fehler = "", bericht = null }) {
  projekt.build = { inhaltHash: hash, revision: projekt.revision + 1, zeitpunkt, ordner, fehler, ...(bericht ? { bericht } : {}) };
  projekt._statusGeaendert = true;
}

/**
 * Freigabe der Inhalte durch den Kunden (vermerkt von der Agentur). Nur für
 * einen Stand, der lokal gebaut wurde und keine inhaltlichen Lücken hat.
 * Danach werden Mediendateien, auf die nichts mehr zeigt, aufgeräumt.
 */
export function gibFrei(projekt, { von, notiz = "" }, { jetzt, kontext = {}, basis = KUNDEN_DIR }) {
  const s = stufen(projekt, kontext);
  if (!s.lokalGebaut.erreicht) throw new Error("Erst den aktuellen Stand lokal bauen und in der Vorschau prüfen.");
  if (s.bereitschaft.inhalt.length) throw new Error(`Noch nicht freigabefähig: ${s.bereitschaft.inhalt.slice(0, 4).join(" ")}${s.bereitschaft.inhalt.length > 4 ? " …" : ""}`);
  const name = pruefeText(von, { label: "Freigegeben von", max: 80 });
  if (!name) throw new Error("Bitte angeben, wer die Freigabe erteilt hat.");
  projekt.freigabe = { inhaltHash: s.inhaltHash, zeitpunkt: jetzt, von: name, notiz: pruefeText(notiz, { label: "Notiz", max: 300 }), buildZeitpunkt: projekt.build.zeitpunkt };
  // Alte Stände sind jetzt nicht mehr nötig.
  for (const m of Object.values(projekt.medien)) m.vorher = null;
  for (const [rolle, m] of Object.entries(projekt.medien)) if (m.verwaist && !m.aktuell) delete projekt.medien[rolle];
  raeumeMedienAuf(projekt, basis);
  projekt._statusGeaendert = true;
  return projekt.freigabe;
}

function raeumeMedienAuf(projekt, basis) {
  const benutzt = new Set(Object.values(projekt.medien).flatMap((m) => [m.aktuell?.datei, m.vorschlag?.datei, m.vorher?.datei]).filter(Boolean));
  const ordner = medienOrdner(projekt.id, basis);
  if (!existsSync(ordner)) return;
  for (const datei of readdirSync(ordner)) if (!benutzt.has(datei)) rmSync(path.join(ordner, datei), { force: true });
}

/**
 * Späterer Einstiegspunkt „Diese freigegebene Kundenfassung veröffentlichen“.
 * Liefert NUR den Plan und die Hindernisse – es gibt noch kein Ziel
 * (Kundendomain, Hosting), deshalb wird nichts ausgeführt.
 */
export function veroeffentlichungsPlan(projekt, kontext = {}) {
  const s = stufen(projekt, kontext);
  return {
    moeglich: false,
    grund: "Veröffentlichen ist noch nicht eingerichtet: Kundendomain und Hosting fehlen.",
    wuerde: [
      "den freigegebenen Inhaltsstand (Prüfsumme) unverändert neu bauen – mit öffentlicher Bestellserver-Adresse und relativen Pfaden",
      "Speisekarte (Preise, Verfügbarkeit) und Öffnungszeiten an den Wirt-Server des Betriebs übergeben",
      "das gebaute Paket auf das Hosting der Kundendomain hochladen und die Erreichbarkeit prüfen",
      "den Zeitpunkt als „live“ vermerken",
    ],
    freigabe: projekt.freigabe ? { zeitpunkt: projekt.freigabe.zeitpunkt, von: projekt.freigabe.von, aktuell: s.freigegeben.erreicht } : null,
    hindernisse: s.bereitschaft.veroeffentlichung,
  };
}
