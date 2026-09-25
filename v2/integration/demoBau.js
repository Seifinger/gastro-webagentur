// Der eine Weg, auf dem Demos für echte Leads entstehen (v2/DEMO-UMBAU.md,
// Teil 3): Einstellungen (src/demoEinstellungen.js) → neue Vorlage
// (siteBuilder mit Ausdruck) im Konzept-Modus. Dashboard-Vorschau,
// Einzelveröffentlichung und Migration rufen alle baueDemo() auf – v1 und die
// v2-Seite ohne Ausdruck sind für Leads kein Erzeugungsweg mehr.

import { demoEinstellungen } from "../../src/demoEinstellungen.js";
import { loadLeadEdits } from "../../src/leadEdits.js";
import { menuForCuisine } from "../../src/menuCatalog.js";

/**
 * Die Karte des Betriebs, sofern im Dashboard/als Datei hinterlegt
 * (lead-edits.speisekarte = { kategorien: [...] }, Format siehe
 * v2/build/speisekarte.js). Ohne sie bleibt es bei der gekennzeichneten
 * Musterkarte der Küche.
 */
export function karteDesBetriebs(edits, kueche) {
  const k = edits?.speisekarte;
  if (!k || !Array.isArray(k.kategorien) || k.kategorien.length === 0) return null;
  return { ...menuForCuisine(kueche), kategorien: k.kategorien, quelle: "betrieb" };
}

/**
 * Welche Angaben über den Betrieb auf die Demo dürfen: nur bestätigte Werte
 * (Teil 4). Der Name ist für die Vorschau auch unbestätigt nötig – das
 * Veröffentlichen verlangt ihn bestätigt (veroeffentlichungsHindernisse).
 */
export function leadFuerBau(e) {
  return {
    placeId: e.placeId,
    name: e.name.wert,
    ort: e.lead.ort ?? "",
    adresse: e.adresse.bestaetigt ? e.adresse.wert : "",
    telefon: e.telefon.bestaetigt ? e.telefon.wert : "",
  };
}

export function bauParameter(e, { apiUrl = "", buildId = "", kontaktEmail = "" } = {}) {
  const edits = loadLeadEdits(e.slug);
  const menu = karteDesBetriebs(edits, e.kueche);
  return {
    lead: leadFuerBau(e),
    kueche: e.kueche,
    stimmung: e.farbschema.id,
    optionen: {
      ausdruck: e.vorlage.ausdruck,
      konzept: true,
      fiktiv: false,
      veroeffentlicht: true,
      apiUrl,
      kontaktEmail,
      editUebersteuerung: edits,
      ...(menu ? { menu } : {}),
      // Bestellung über die Website abgeschaltet: Speisekarte ohne Warenkorb.
      ...(edits.bestellung?.aktiv === false ? { bestellung: false } : {}),
      googleMapsUrl: e.googleMapsUrl,
      ...(buildId ? { buildId } : {}),
    },
  };
}

/** Gründe, aus denen eine Demo noch nicht öffentlich werden darf. */
export function veroeffentlichungsHindernisse(e) {
  const gruende = [];
  if (!e.name.bestaetigt) gruende.push("Der Name ist noch nicht bestätigt (Quelle prüfen, dann im Dashboard bestätigen).");
  return gruende;
}

/**
 * Baut die Demo eines Leads in zielDir/slug.
 * @returns {Promise<{ einstellungen: object, protokoll: object, ordner: string }>}
 */
export async function baueDemo(slug, { zielDir, apiUrl = "", buildId = "", kontaktEmail = "", judge = false, offline = false, fontsDir, fontsPfad } = {}) {
  const e = demoEinstellungen(slug);
  if (!e) throw new Error("Zu diesem Entwurf gibt es keinen Lead.");
  const { baueImZyklus } = await import("../build/zyklus.js");
  const p = bauParameter(e, { apiUrl, buildId, kontaktEmail });
  const { protokoll, ordner } = await baueImZyklus({ ...p, judge, zielDir, slug, offline, ...(fontsDir ? { fontsDir } : {}), ...(fontsPfad ? { fontsPfad } : {}) });
  return { einstellungen: e, protokoll, ordner };
}
