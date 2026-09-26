// Bau einer Kundenfassung – derselbe Weg wie die Lead-Demo (baueImZyklus,
// gleiche Vorlage mit Ausdruck), nur mit den Inhalten des Kundenprojekts
// (src/kundenProjekt.js) statt Konzeptmaterial:
//
//   • Designrichtung (Küche, Farbschema, Vorlage) aus dem Projekt – das
//     Layout selbst ist nicht einstellbar
//   • Texte als gezielte Übersteuerung vorhandener Textplätze
//   • Medien ausschließlich aus dem Projekt (loeseKundenMedien)
//   • Speisekarte aus dem Projekt mit stabilen Gericht-IDs – dieselbe Karte
//     für Startseite, Speisekarten-Seite, Warenkorb und Server
//
// Ziel: v2/output/kunden/<kunden-id>/ (gitignoriert, nie docs/), Anzeige nur
// über das geschützte Dashboard. Veröffentlicht wird dabei nichts.

import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import {
  ladeProjekt,
  aendereProjekt,
  karteFuerBau,
  inhaltHash,
  vermerkeBuild,
  mediumPfad,
  KUNDEN_DIR,
} from "../../src/kundenProjekt.js";
import { betriebExistiert, setzeBestellkarte, ladeBetrieb, speichereBetrieb, setzeGastKontakt } from "../../src/betriebStore.js";
import { karteAusDaten } from "../build/speisekarte.js";
import { empfehlungsProdukte } from "../../src/empfehlungen.js";
import { menuForCuisine } from "../../src/menuCatalog.js";
import { OUTPUT_DIR } from "../build/siteBuilder.js";

export const KUNDEN_AUSGABE = path.join(OUTPUT_DIR, "kunden");

// Textplätze der Vorlage, die das Projekt übersteuern darf (FELDER "text.*").
function textPfade(projekt) {
  const pfade = {};
  for (const [id, f] of Object.entries(projekt.felder)) {
    if (!id.startsWith("text.")) continue;
    // Leerer Fußzeilensatz = keiner (statt des Entwurfshinweises der Demo).
    if (f.wert || id === "text.fuss.hinweis") pfade[id.slice(5)] = f.wert;
  }
  return pfade;
}

function ortAus(adresse) {
  const m = /\b\d{5}\s+([^,]+)$/.exec(String(adresse ?? "").trim());
  return m ? m[1].trim() : "";
}

/** Die Medien, die der Bau nutzt: nur übernommene („aktuell“), nie Vorschläge. */
export function kundenMedien(projekt, basis = KUNDEN_DIR) {
  const medien = {};
  for (const [rolle, m] of Object.entries(projekt.medien)) {
    if (!m.aktuell) continue;
    const datei = mediumPfad(projekt.id, m.aktuell.datei, basis);
    if (!datei) continue;
    medien[rolle] = { datei, typ: m.aktuell.typ.startsWith("video/") ? "video" : "bild", alt: m.alt || "", fokus: m.fokus || "" };
  }
  return { medien };
}

/** Alle Parameter für baueImZyklus – aus dem Projekt, sonst nichts. */
export function kundenBauParameter(projekt, { basis = KUNDEN_DIR, fontsPfad = "/v2/assets/fonts" } = {}) {
  const f = (id) => projekt.felder[id]?.wert ?? "";
  const menu = { ...menuForCuisine(projekt.design.kueche), ...karteFuerBau(projekt), quelle: "kunde" };
  return {
    lead: { placeId: projekt.id, name: f("name"), ort: ortAus(f("adresse")), adresse: f("adresse"), telefon: f("telefon") },
    kueche: projekt.design.kueche,
    stimmung: projekt.design.farbschema,
    optionen: {
      ausdruck: projekt.design.vorlage,
      konzept: false,
      fiktiv: false,
      kundenfassung: true,
      veroeffentlicht: false,
      apiUrl: f("apiUrl"),
      kontaktEmail: f("email"),
      editUebersteuerung: {
        texte: {
          ...(f("slogan") ? { slogan: f("slogan") } : {}),
          ...(f("einladung") ? { schlagzeile: f("einladung") } : {}),
          pfade: textPfade(projekt),
        },
      },
      menu,
      ...(projekt.bestellung.aktiv ? {} : { bestellung: false }),
      ...(projekt.oeffnungszeiten.wert.length ? { oeffnungszeiten: projekt.oeffnungszeiten.wert, oeffnungsAusnahmen: projekt.oeffnungszeiten.ausnahmen } : {}),
      kundenMedien: kundenMedien(projekt, basis),
      fontsPfad,
    },
  };
}

/** Der Katalog, mit dem Warenkorb und Server rechnen – aus derselben Karte. */
export function bestellkatalog(projekt) {
  return karteAusDaten(karteFuerBau(projekt)).katalog;
}

/**
 * Produkte derselben Karte mit Kategorie und Rolle – damit der Wirt „Passt
 * gut dazu“ im Dashboard steuern kann. Empfohlen wird nur Bestätigtes.
 */
export function bestellProdukte(projekt) {
  return empfehlungsProdukte(karteAusDaten(karteFuerBau(projekt)), { nurBestaetigt: true });
}

/**
 * Übergibt Karte, Öffnungszeiten und Rückfragenummer an den verknüpften
 * Wirt-Betrieb. Nur solange die Kundenfassung noch nie live war – danach
 * gehört das zum Veröffentlichen, damit eine Vorschau nie den Bestellweg
 * einer laufenden Seite verändert.
 */
export function synchronisiereBetrieb(projekt) {
  const slug = projekt.felder.betriebSlug?.wert;
  if (!slug || projekt.live) return { synchronisiert: false, grund: slug ? "Kundenfassung ist live – Übergabe erst beim Veröffentlichen." : "Kein Wirt-Betrieb verknüpft." };
  if (!betriebExistiert(slug)) return { synchronisiert: false, grund: `Wirt-Betrieb „${slug}“ gibt es auf diesem Rechner nicht.` };
  setzeBestellkarte(slug, projekt.bestellung.aktiv ? { katalog: bestellkatalog(projekt), produkte: bestellProdukte(projekt), version: inhaltHash(projekt).slice(0, 16), quelle: `kunde:${projekt.id}` } : null);
  if (projekt.oeffnungszeiten.wert.length) {
    const daten = ladeBetrieb(slug);
    speichereBetrieb(slug, { ...daten, oeffnungszeiten: projekt.oeffnungszeiten.wert });
  }
  setzeGastKontakt(slug, { anzeigeName: projekt.felder.name.wert, telefon: projekt.felder.telefon.wert });
  return { synchronisiert: true, betrieb: slug };
}

const laufend = new Set();

/**
 * Baut NUR diese eine Kundenfassung lokal. Vermerkt Erfolg oder Fehler im
 * Projekt (mit Prüfsumme des gebauten Inhalts).
 */
export async function baueKundenfassung(id, { zielDir = KUNDEN_AUSGABE, basis = KUNDEN_DIR, jetzt = () => new Date(), fontsPfad } = {}) {
  if (laufend.has(id)) throw new Error("Für diese Kundenfassung läuft bereits ein Bau.");
  laufend.add(id);
  try {
    const projekt = ladeProjekt(id, basis);
    const hash = inhaltHash(projekt);
    const p = kundenBauParameter(projekt, { basis, ...(fontsPfad ? { fontsPfad } : {}) });
    const { baueImZyklus } = await import("../build/zyklus.js");
    try {
      const { protokoll, ordner } = await baueImZyklus({ ...p, judge: false, offline: true, zielDir, slug: id });
      const sync = synchronisiereBetrieb(projekt);
      // Ohne Revisionsprüfung: vermerkt wird nur der Bau – mit der Prüfsumme des
      // gebauten Stands. Wurde währenddessen weiter bearbeitet, gilt der Bau als veraltet.
      aendereProjekt(id, undefined, (pr) => vermerkeBuild(pr, { inhaltHash: hash, zeitpunkt: jetzt().toISOString(), ordner: path.relative(path.join(OUTPUT_DIR, ".."), ordner), bericht: { sync } }), { von: "Bau", was: "Lokal gebaut", basis });
      return { ok: true, ordner, protokoll, sync };
    } catch (fehler) {
      const meldung = fehler.gruende ? `${fehler.message}: ${[].concat(fehler.gruende).join("; ")}` : fehler.message;
      aendereProjekt(id, undefined, (pr) => vermerkeBuild(pr, { inhaltHash: hash, zeitpunkt: jetzt().toISOString(), ordner: "", fehler: meldung.slice(0, 500) }), { von: "Bau", was: "Bau fehlgeschlagen", basis });
      throw new Error(`Bau fehlgeschlagen: ${meldung}`);
    }
  } finally {
    laufend.delete(id);
  }
}

export function vorschauVorhanden(id, zielDir = KUNDEN_AUSGABE) {
  return existsSync(path.join(zielDir, id, "index.html"));
}

export function baubericht(id, zielDir = KUNDEN_AUSGABE) {
  try {
    return JSON.parse(readFileSync(path.join(zielDir, id, "bericht.json"), "utf-8"));
  } catch {
    return null;
  }
}
