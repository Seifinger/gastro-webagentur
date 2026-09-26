// Ein FIKTIVER, vollständig freigegebener Testkunde für den Pilot-Probelauf
// (Browser-E2E, erster Test auf dem statischen Host) – nie ein echter Betrieb.
//
//   npm run pilot:testkunde -- --betrieb pilot-probe --api https://<wirt-app>.fly.dev [--noindex]
//
// Grundlage ist die fiktive italienische Beispielseite (src/demoLeads.js).
// Alle Angaben sind synthetisch: Name mit „Probelauf“, Musteradresse,
// Telefonnummer ohne Anschluss (000 …), Allergenangaben als Testwert.
// Ergebnis: Kundenprojekt (data/kunden/…, gitignoriert), freigegeben, und das
// Veröffentlichungspaket unter v2/output/pakete/<k-id>/.

import { projektAusBeispiel, fuehreAktionAus } from "./kundenDashboard.js";
import { aendereProjekt, legeMediumVor, gibFrei, ladeProjekt, KUNDEN_DIR } from "../../src/kundenProjekt.js";
import { baueKundenfassung, KUNDEN_AUSGABE } from "./kundenBau.js";
import { erstellePaket, PAKETE_DIR } from "./kundenPaket.js";
import { png } from "../../test/hilfen/bilder.js";

export const TESTKUNDE = {
  name: "Trattoria Probelauf",
  adresse: "Musterstraße 1, 12345 Musterstadt",
  telefon: "000 0000000",
  email: "",
  kicker: "Trattoria · Musterstadt (Testbetrieb)",
  einladung: "Probelauf der Bestellstrecke – keine echte Gaststätte.",
  geschichte: "Dieser Betrieb existiert nicht. Er dient nur dem technischen Probelauf.",
  zeiten: [{ tage: "Mo–So", zeiten: "11:00–23:00" }],
};

/**
 * Legt den Testkunden an, bestätigt alle Inhalte, baut und gibt frei.
 * @returns {Promise<string>} Kunden-ID
 */
export async function legePilotTestkundenAn({ betrieb, apiUrl, basis = KUNDEN_DIR, zielDir = KUNDEN_AUSGABE, kueche = "italienisch", von = "Probelauf (Agentur)" }) {
  const p = projektAusBeispiel(kueche, { basis });
  const id = p.id;
  const aktion = (e) => fuehreAktionAus(id, { revision: ladeProjekt(id, basis).revision, ...e }, { von, basis });
  const t = TESTKUNDE;
  for (const [feld, wert] of [["name", t.name], ["adresse", t.adresse], ["telefon", t.telefon], ["einladung", t.einladung], ["text.ambiente.text", t.geschichte], ["text.kicker", t.kicker], ["betriebSlug", betrieb], ["apiUrl", apiUrl]]) {
    aktion({ aktion: "feld", feld, wert });
  }
  for (const feld of ["name", "adresse", "telefon", "einladung", "text.ambiente.text", "text.kicker"]) aktion({ aktion: "feldBestaetigen", feld });
  for (const [rolle, bild] of [["hero", png(1600, 900, [150, 70, 40])], ["heroMobil", png(900, 1600, [120, 60, 40])]]) {
    aendereProjekt(id, undefined, (x, i) => legeMediumVor(x, rolle, bild, { ...i, basis }), { von, basis });
    aktion({ aktion: "medium", rolle, medienAktion: "uebernehmen" });
    aktion({ aktion: "medium", rolle, medienAktion: "bestaetigen" });
  }
  for (const k of ladeProjekt(id, basis).speisekarte.kategorien) {
    for (const g of k.gerichte) {
      aktion({ aktion: "gericht", id: g.id, daten: { allergene: "Testwert – keine echte Angabe" } });
      aktion({ aktion: "gerichtBestaetigen", id: g.id });
    }
  }
  aktion({ aktion: "oeffnungszeiten", zeilen: t.zeiten });
  aktion({ aktion: "oeffnungszeitenBestaetigen" });
  await baueKundenfassung(id, { basis, zielDir });
  aendereProjekt(id, undefined, (x, info) => gibFrei(x, { von: "Probelauf (fiktiv)" }, { jetzt: info.jetzt, basis }), { von, basis });
  return id;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const argv = process.argv.slice(2);
  const wert = (n) => {
    const i = argv.indexOf(`--${n}`);
    return i === -1 ? undefined : argv[i + 1];
  };
  try {
    const betrieb = wert("betrieb") ?? "pilot-probe";
    const apiUrl = wert("api");
    if (!apiUrl) throw new Error("Bitte --api <öffentliche Adresse der Wirt-App> angeben.");
    const id = await legePilotTestkundenAn({ betrieb, apiUrl });
    const r = await erstellePaket(id, { noindex: argv.includes("--noindex") });
    console.log(`Fiktiver Testkunde ${id} (${TESTKUNDE.name}) freigegeben.`);
    console.log(`Paket: ${r.paketDir}\n  site/ → statischer Host · wirt-uebergabe.json → Wirt-App „${betrieb}“`);
    console.log(`(Pakete liegen unter ${PAKETE_DIR}.)`);
  } catch (fehler) {
    console.error(`⛔ ${fehler.message}`);
    process.exitCode = 1;
  }
}
