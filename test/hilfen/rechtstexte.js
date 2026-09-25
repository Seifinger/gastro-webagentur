// Test-Helfer: legt für einen Betrieb eine vollständig ausgefüllte,
// freigegebene Fassung an – so, wie es ein Betrieb nach seiner Prüfung tun
// würde (Entwurf → Text ohne Platzhalter → Freigabe mit Vermerk).

import { legeRechtsdokumentEntwurfAn, bearbeiteRechtsdokument, gibRechtsdokumentFrei } from "../../src/betriebStore.js";
import { euro, noShowZustimmungstext } from "../../src/rechtstexte.js";

export function gibFreigabeTextFrei(slug, art, { inhalt, zustimmungstext, parameter, gueltigAb } = {}) {
  const entwurf = legeRechtsdokumentEntwurfAn(slug, art, { parameter });
  bearbeiteRechtsdokument(slug, entwurf.id, {
    inhalt: inhalt ?? `## ${entwurf.titel}\nFreigegebener Testtext für ${art} des Testbetriebs, ausreichend lang für die Prüfung.`,
    zustimmungstext: zustimmungstext ?? (entwurf.zustimmungstext || undefined),
  });
  return gibRechtsdokumentFrei(slug, entwurf.id, { freigegebenVon: "Testwirt", pruefvermerk: "Test – keine echte Prüfung", geprueftBestaetigt: true, gueltigAb });
}

/** Freigegebene No-Show-Regel für Abholbestellungen. */
export function gibNoShowRegelFrei(slug, { betrag = 10, stornofensterMinuten = 30, art = "noshow-bestellung", nachweisweg } = {}) {
  const parameter = { betrag, stornofensterMinuten, ...(nachweisweg ? { nachweisweg } : {}) };
  return gibFreigabeTextFrei(slug, art, {
    parameter,
    inhalt: `## Regel\nPauschal ${euro(betrag)} bei Nichtabholung ohne Stornierung. Ihnen bleibt der Nachweis, dass kein oder ein wesentlich geringerer Schaden entstanden ist.`,
    zustimmungstext: noShowZustimmungstext(art, parameter),
  });
}
