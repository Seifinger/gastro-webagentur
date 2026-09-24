// Demo-Einstellungen je Lead – ein Blick auf die vorhandenen Speicher, keine
// neue Datenhaltung (v2/DEMO-UMBAU.md, Teil 1):
//
//   Lead-ID ............ placeId (Google Place ID, darf dauerhaft bleiben)
//   Slug/URL ........... data/landingpages/entwuerfe.json (Manifest, einmal vergeben)
//   Küche .............. data/kuechen.json (cuisineOverrides.js)
//   Farbschema ......... data/stimmungen.json (stimmungsWahl.js) – genau drei je Küche
//   Vorlage ............ Standard der Küche (v2/build/ausdruck.js), Abweichung in lead-edits.demo.vorlage
//   Slogan ............. lead-edits.texte.slogan
//   Name, Adresse, Tel.  lead-edits.demo.name / .adresse / .telefon { wert, quelle, bestaetigtAm }
//   Status/Build/Online  Manifest-Eintrag (demoStatus)
//   Verlauf ............ lead-edits.verlauf (leadEdits.js)
//
// Name und Adresse aus Google bleiben im CSV (30-Tage-Frist, leadFreshness.js).
// Erst eine Bestätigung im Dashboard macht sie zu eigenen Angaben, die auf eine
// öffentliche Demo dürfen – und die ein neuer Google-Abruf nie überschreibt.

import { readAllLeads } from "./csvImport.js";
import { ladeManifest, placeIdFuerSlug, schreibeManifest } from "./entwurfsManifest.js";
import { ladeZuordnungen, kuecheFuerLead, speichereZuordnung, istKueche } from "./cuisineOverrides.js";
import { ladeStimmungsWahl, stimmungFuerLead, speichereStimmung } from "./stimmungsWahl.js";
import { stimmungenFuer } from "./stimmungen.js";
import { loadLeadEdits, saveLeadEdits } from "./leadEdits.js";
import { themeForLead } from "./landingPageGenerator.js";
import { AUSDRUECKE, STANDARD_JE_KUECHE } from "../v2/build/ausdruck.js";
import { sloganFuer } from "../v2/build/texte.js";

/** Die drei Farbschemata einer Küche: die Stimmungen traditionell, abend, hell. */
export const FARBSCHEMA_ARCHETYPEN = ["traditionell", "abend", "hell"];

export const SLOGAN_MAX_ZEICHEN = 60;

export function farbschemataFuer(kueche) {
  return stimmungenFuer(kueche)
    .filter((s) => FARBSCHEMA_ARCHETYPEN.includes(s.archetyp))
    .map(({ id, label, archetyp }) => ({ id, label, archetyp }));
}

/** Vorlage = Küche + Ausdruck; Standard der Küche, sofern nicht abweichend gewählt. */
export function vorlageFuer(kueche, abweichung = "") {
  const standard = STANDARD_JE_KUECHE[kueche] ?? "gesellig";
  const ausdruck = abweichung && AUSDRUECKE[abweichung] ? abweichung : standard;
  const profil = AUSDRUECKE[ausdruck];
  return {
    id: `${kueche}/${ausdruck}`,
    kueche,
    ausdruck,
    label: profil.label,
    prinzip: profil.prinzip,
    quelle: ausdruck === standard ? "standard" : "gewaehlt",
    standard,
  };
}

/** Link zum Google-Maps-Profil über die Place ID – statt Note und Rezensionen auf der Demo. */
export function googleMapsUrl(lead) {
  if (!lead?.placeId || !/^[A-Za-z0-9_-]+$/.test(lead.placeId)) return "";
  const q = encodeURIComponent(lead.name || "Restaurant");
  return `https://www.google.com/maps/search/?api=1&query=${q}&query_place_id=${lead.placeId}`;
}

function angabe(eigen, google) {
  if (eigen?.wert) return { wert: eigen.wert, quelle: "manuell bestätigt", bestaetigtAm: eigen.bestaetigtAm ?? "", notiz: eigen.notiz ?? "", bestaetigt: true };
  return { wert: google || "", quelle: google ? "Google Places (unbestätigt, Cache max. 30 Tage)" : "", bestaetigtAm: "", notiz: "", bestaetigt: false };
}

export function leadFuerDemo(slug, { manifest = ladeManifest(), leads = null } = {}) {
  const placeId = placeIdFuerSlug(manifest, slug);
  if (!placeId) return null;
  const lead = (leads ?? readAllLeads()).find((l) => l.placeId === placeId);
  return lead ? { placeId, lead, manifestEintrag: manifest[placeId] } : null;
}

/**
 * Alles, was Dashboard und Bau über eine Demo wissen müssen.
 * @returns {object|null} null, wenn es zum Slug keinen Lead gibt.
 */
export function demoEinstellungen(slug, optionen = {}) {
  const gefunden = leadFuerDemo(slug, optionen);
  if (!gefunden) return null;
  const { placeId, lead, manifestEintrag } = gefunden;
  const zuordnungen = ladeZuordnungen();
  const kueche = kuecheFuerLead(lead, zuordnungen);
  const edits = loadLeadEdits(slug);
  const demo = edits.demo ?? {};

  const farbschemata = farbschemataFuer(kueche);
  const gewaehlt = stimmungFuerLead(lead, kueche, ladeStimmungsWahl());
  const gueltigGewaehlt = farbschemata.some((f) => f.id === gewaehlt) ? gewaehlt : null;
  // Ohne Wahl: die Stimmung, die der Seed ergibt – aber nur eine der drei.
  const seed = themeForLead(lead, kueche).stimmung;
  const farbschemaId = gueltigGewaehlt ?? (farbschemata.some((f) => f.id === seed) ? seed : farbschemata[0].id);

  const sloganEigen = String(edits.texte?.slogan ?? "").trim();
  return {
    slug,
    placeId,
    lead,
    kueche,
    kuecheManuell: Boolean(zuordnungen[placeId]),
    vorlage: vorlageFuer(kueche, demo.vorlage),
    farbschemata,
    farbschema: { ...farbschemata.find((f) => f.id === farbschemaId), manuell: Boolean(gueltigGewaehlt) },
    slogan: { wert: sloganEigen, manuell: Boolean(sloganEigen), standard: sloganFuer(kueche, lead.ort || "") },
    name: angabe(demo.name, lead.name),
    adresse: angabe(demo.adresse, lead.adresse),
    telefon: angabe(demo.telefon, lead.telefon),
    googleMapsUrl: googleMapsUrl(lead),
    status: manifestEintrag?.demoStatus ?? { zustand: "neu" },
    veroeffentlichtAm: manifestEintrag?.veroeffentlichtAm ?? "",
  };
}

function pruefeText(wert, feld, max) {
  const text = String(wert ?? "").replace(/\s+/g, " ").trim();
  if (text.length > max) throw new Error(`${feld} darf höchstens ${max} Zeichen haben.`);
  if (/[<>]/.test(text)) throw new Error(`${feld} darf keine spitzen Klammern enthalten.`);
  return text;
}

/**
 * Speichert, was im Dashboard geändert wurde – jedes Feld nur, wenn es
 * mitgeschickt wird. Ungültige Werte werfen, bevor irgendetwas geschrieben ist.
 *
 * @param {string} slug
 * @param {object} aenderung
 * @param {string} [aenderung.kueche]      "" = automatische Erkennung
 * @param {string} [aenderung.farbschema]  eine der drei Stimmungen der Küche, "" = Standard
 * @param {string} [aenderung.vorlage]     Ausdruck-ID, "" = Standard der Küche
 * @param {string} [aenderung.slogan]      "" = Vorlagenstandard
 * @param {{wert: string, notiz?: string}|null} [aenderung.name]    null = Bestätigung zurücknehmen
 * @param {{wert: string, notiz?: string}|null} [aenderung.adresse]
 * @param {{wert: string, notiz?: string}|null} [aenderung.telefon]
 */
export function speichereDemoEinstellungen(slug, aenderung = {}, { jetzt = new Date() } = {}) {
  const vorher = demoEinstellungen(slug);
  if (!vorher) throw new Error("Zu diesem Entwurf gibt es keinen Lead.");
  const { placeId } = vorher;

  // 1. Prüfen
  const kueche = aenderung.kueche === undefined ? vorher.kueche : aenderung.kueche;
  if (aenderung.kueche && !istKueche(aenderung.kueche)) throw new Error(`Unbekannte Küche "${aenderung.kueche}".`);
  const zielKueche = aenderung.kueche === "" ? kuecheFuerLead({ ...vorher.lead }, {}) : kueche;
  if (aenderung.farbschema && !farbschemataFuer(zielKueche).some((f) => f.id === aenderung.farbschema)) {
    throw new Error(`"${aenderung.farbschema}" ist keins der drei Farbschemata für ${zielKueche}.`);
  }
  if (aenderung.vorlage && !AUSDRUECKE[aenderung.vorlage]) throw new Error(`Unbekannte Vorlage "${aenderung.vorlage}".`);
  const slogan = aenderung.slogan === undefined ? undefined : pruefeText(aenderung.slogan, "Der Slogan", SLOGAN_MAX_ZEICHEN);
  const bestaetigung = (feld, wert) => {
    if (wert === undefined) return undefined;
    if (wert === null) return null;
    const text = pruefeText(wert.wert, feld, 160);
    if (!text) throw new Error(`${feld} darf beim Bestätigen nicht leer sein.`);
    return { wert: text, notiz: pruefeText(wert.notiz ?? "", "Die Quellenangabe", 200), bestaetigtAm: jetzt.toISOString() };
  };
  const name = bestaetigung("Der Name", aenderung.name);
  const adresse = bestaetigung("Die Adresse", aenderung.adresse);
  const telefon = bestaetigung("Die Telefonnummer", aenderung.telefon);

  // 2. Schreiben – bestehende Speicher
  if (aenderung.kueche !== undefined && aenderung.kueche !== (vorher.kuecheManuell ? vorher.kueche : "")) {
    speichereZuordnung(placeId, aenderung.kueche);
  }
  if (aenderung.farbschema !== undefined) speichereStimmung(placeId, zielKueche, aenderung.farbschema);

  const edits = loadLeadEdits(slug);
  const neu = { ...edits, texte: { ...(edits.texte ?? {}) }, demo: { ...(edits.demo ?? {}) } };
  if (slogan !== undefined) {
    if (slogan) neu.texte.slogan = slogan;
    else delete neu.texte.slogan;
  }
  if (aenderung.vorlage !== undefined) {
    if (aenderung.vorlage) neu.demo.vorlage = aenderung.vorlage;
    else delete neu.demo.vorlage;
  }
  for (const [feld, wert] of [["name", name], ["adresse", adresse], ["telefon", telefon]]) {
    if (wert === undefined) continue;
    if (wert === null) delete neu.demo[feld];
    else neu.demo[feld] = wert;
  }
  if (!Object.keys(neu.demo).length) delete neu.demo;
  if (!Object.keys(neu.texte).length) delete neu.texte;
  const { verlauf: _v1, ...alt } = edits;
  const { verlauf: _v2, ...kandidat } = neu;
  if (JSON.stringify(alt) !== JSON.stringify(kandidat)) saveLeadEdits(slug, neu);

  setzeDemoStatus(placeId, { zustand: "gespeichert", zeitpunkt: jetzt.toISOString() });
  return demoEinstellungen(slug);
}

/**
 * Status einer Demo im Manifest. `online` (URL, Zeitpunkt, Build-ID der
 * zuletzt nachweislich öffentlichen Fassung) bleibt stehen, bis eine neue
 * Fassung nachweislich online ist – ein Fehler löscht ihn nicht.
 */
export function setzeDemoStatus(placeId, patch, { behalte = ["online", "letzterBuild"] } = {}) {
  const manifest = ladeManifest();
  if (!manifest[placeId]) return null;
  const alt = manifest[placeId].demoStatus ?? {};
  const neu = { ...patch };
  for (const k of behalte) if (alt[k] !== undefined && neu[k] === undefined) neu[k] = alt[k];
  manifest[placeId] = { ...manifest[placeId], demoStatus: neu };
  schreibeManifest(manifest);
  return neu;
}
