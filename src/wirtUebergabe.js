// Übergabe freigegebener Kundendaten: Agentur-Dashboard → Wirt-App.
//
// Die beiden laufen getrennt (eigene Apps, eigene Volumes) und teilen KEINE
// Dateien. Was die Wirt-App aus der Kundenfassung braucht, geht als ein
// geprüftes Paket hinüber:
//
//   Agentur:  npm run kunde -- paket --kunde k-…   (nur freigegebener, aktueller Stand)
//             → v2/output/pakete/<k-id>/wirt-uebergabe.json
//   Wirt-App: POST /intern/uebergabe (Wirt-Passwort) oder
//             node scripts/wirtUebergabe.mjs <datei> auf dem Host
//
// Inhalt: Bestellkarte (Katalog + Produkte mit Rollen/Kategorien), Öffnungszeiten,
// Name und Rückfragenummer des Hauses, Designrichtung. Keine Gastdaten, keine
// Medien, keine Agentur-Notizen. Die Prüfsumme erkennt beschädigte oder
// unvollständige Pakete; Schutz gegen Fremde bietet die Anmeldung der Route.

import { createHash } from "node:crypto";
import { ladeBetrieb, speichereBetrieb, setzeBestellkarte, setzeGastKontakt, uhrHook } from "./betriebStore.js";
import { wochenplanAus } from "./abholzeiten.js";

export const UEBERGABE_ART = "gastro-wirt-uebergabe";
export const UEBERGABE_VERSION = 1;

function kanonisch(wert) {
  if (Array.isArray(wert)) return `[${wert.map(kanonisch).join(",")}]`;
  if (wert && typeof wert === "object") return `{${Object.keys(wert).sort().map((k) => `${JSON.stringify(k)}:${kanonisch(wert[k])}`).join(",")}}`;
  return JSON.stringify(wert);
}

/** SHA-256 über den Inhalt ohne das Feld pruefsumme (Schlüssel sortiert). */
export function uebergabePruefsumme(paket) {
  const { pruefsumme, ...rest } = paket;
  return createHash("sha256").update(kanonisch(rest)).digest("hex");
}

/** Baut ein Paket aus bereits geprüften Einzelteilen (Agentur-Seite). */
export function verpackeUebergabe({ betrieb, kunde, inhaltHash, freigabe, bestellkarte, oeffnungszeiten, gastKontakt, design, jetzt = new Date() }) {
  const paket = {
    art: UEBERGABE_ART,
    version: UEBERGABE_VERSION,
    betrieb,
    kunde,
    inhaltHash,
    freigabe: { zeitpunkt: freigabe.zeitpunkt, von: freigabe.von },
    erstellt: new Date(jetzt).toISOString(),
    bestellkarte,
    oeffnungszeiten,
    gastKontakt,
    ...(design ? { design } : {}),
  };
  return { ...paket, pruefsumme: uebergabePruefsumme(paket) };
}

/**
 * Übernimmt ein Paket in den Betrieb dieser Wirt-App. Lehnt ab, wenn es für
 * einen anderen Betrieb bestimmt, beschädigt oder unvollständig ist. Bestehende
 * Reservierungen, Bestellungen und Einstellungen bleiben unberührt.
 */
export function uebernimmUebergabe(slug, paket, jetzt = uhrHook.jetzt()) {
  if (!paket || paket.art !== UEBERGABE_ART) throw new Error("Das ist kein Übergabe-Paket.");
  if (paket.version !== UEBERGABE_VERSION) throw new Error(`Paket-Version ${paket.version} wird nicht unterstützt.`);
  if (paket.pruefsumme !== uebergabePruefsumme(paket)) throw new Error("Prüfsumme stimmt nicht – das Paket ist beschädigt oder verändert.");
  if (paket.betrieb !== slug) throw new Error(`Das Paket ist für den Betrieb „${paket.betrieb}“ bestimmt, nicht für „${slug}“.`);
  if (!paket.freigabe?.zeitpunkt || !paket.freigabe?.von) throw new Error("Das Paket enthält keine Freigabe des Kunden.");
  if (!paket.bestellkarte?.katalog || !Object.keys(paket.bestellkarte.katalog).length) throw new Error("Das Paket enthält keine Bestellkarte.");
  const zeilen = Array.isArray(paket.oeffnungszeiten) ? paket.oeffnungszeiten : [];
  if (!zeilen.length || !wochenplanAus(zeilen)) throw new Error("Die Öffnungszeiten im Paket sind unvollständig oder nicht lesbar.");

  // Beschädigte Betriebsdatei: ladeBetrieb wirft – nichts wird überschrieben.
  ladeBetrieb(slug);
  setzeBestellkarte(slug, { ...paket.bestellkarte, version: paket.inhaltHash.slice(0, 16), quelle: `kunde:${paket.kunde}` });
  if (paket.gastKontakt?.anzeigeName || paket.gastKontakt?.telefon) setzeGastKontakt(slug, paket.gastKontakt);
  const daten = ladeBetrieb(slug);
  speichereBetrieb(slug, {
    ...daten,
    oeffnungszeiten: zeilen.map((z) => ({ tage: String(z.tage), zeiten: String(z.zeiten) })),
    ...(paket.design ? { v2Design: paket.design } : {}),
    uebergabe: { kunde: paket.kunde, inhaltHash: paket.inhaltHash, freigabe: paket.freigabe, pruefsumme: paket.pruefsumme, uebernommen: new Date(jetzt).toISOString() },
  });
  return { betrieb: slug, kunde: paket.kunde, gerichte: Object.keys(paket.bestellkarte.katalog).length, pruefsumme: paket.pruefsumme };
}
