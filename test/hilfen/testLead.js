// Testumgebung für Demo-Tests: legt einen Lead (CSV unter data/output),
// den Manifest-Eintrag und leere Einstellungen an und stellt danach alles
// wieder her. Vorhandene Dateien (Manifest, Küchen-, Stimmungswahl) werden
// gesichert und zurückgeschrieben – echte Daten gehen nie verloren.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const PFADE = {
  output: path.join(REPO, "data", "output"),
  manifest: path.join(REPO, "data", "landingpages", "entwuerfe.json"),
  kuechen: path.join(REPO, "data", "kuechen.json"),
  stimmungen: path.join(REPO, "data", "stimmungen.json"),
  leadEdits: path.join(REPO, "data", "lead-edits"),
};

const HEADER =
  "name,adresse,telefon,website,hatWebsite,score,priorität,websiteErreichbar,hatBestellfunktion,hatReservierungsfunktion,mobilFreundlich,wirktVeraltet,rating,anzahlBewertungen,placeId,ort,fetchedAt";

function csvWert(wert) {
  const text = String(wert ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * @param {object} leads - [{ slug, placeId, name, adresse, ort, rating, anzahlBewertungen, telefon }]
 * @returns {{ aufraeumen: () => void }}
 */
export function richteTestLeadsEin(leads, kennung = "__test-demo") {
  const sicherung = {};
  for (const k of ["manifest", "kuechen", "stimmungen"]) {
    sicherung[k] = existsSync(PFADE[k]) ? readFileSync(PFADE[k]) : null;
  }
  mkdirSync(PFADE.output, { recursive: true });
  mkdirSync(path.dirname(PFADE.manifest), { recursive: true });
  const csv = path.join(PFADE.output, `${kennung}.csv`);
  const zeilen = leads.map((l) =>
    [l.name, l.adresse ?? "", l.telefon ?? "", "", "false", "80", "Hoch", "", "", "", "", "", l.rating ?? "", l.anzahlBewertungen ?? "", l.placeId, l.ort ?? "", new Date().toISOString()]
      .map(csvWert)
      .join(","),
  );
  writeFileSync(csv, [HEADER, ...zeilen].join("\n"));
  const manifest = sicherung.manifest ? JSON.parse(sicherung.manifest) : {};
  for (const l of leads) manifest[l.placeId] = { slug: l.slug };
  writeFileSync(PFADE.manifest, JSON.stringify(manifest, null, 2));
  for (const l of leads) rmSync(path.join(PFADE.leadEdits, `${l.slug}.json`), { force: true });

  return {
    aufraeumen() {
      rmSync(csv, { force: true });
      for (const l of leads) rmSync(path.join(PFADE.leadEdits, `${l.slug}.json`), { force: true });
      for (const k of ["manifest", "kuechen", "stimmungen"]) {
        if (sicherung[k]) writeFileSync(PFADE[k], sicherung[k]);
        else rmSync(PFADE[k], { force: true });
      }
    },
  };
}
