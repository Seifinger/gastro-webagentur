// Kundenfassungen aus dem Claude-Code-Chat bearbeiten – über DIESELBEN
// Funktionen und DENSELBEN Speicher wie die Bearbeiten-Ansicht im Dashboard
// (data/kunden/<id>/projekt.json, v2/integration/kundenDashboard.js).
// Jeder Befehl lädt frisch, ändert genau das Genannte und schreibt mit neuer
// Revision – Dashboard-Änderungen werden nie überschrieben.
//
//   npm run kunde -- liste
//   npm run kunde -- anzeigen  --kunde k-…
//   npm run kunde -- anlegen   --aus-demo <lead-slug> | --aus-beispiel <küche>
//   npm run kunde -- feld      --kunde k-… --feld slogan --wert "…"      (Felder: npm run kunde -- felder)
//   npm run kunde -- bestaetigen --kunde k-… --feld slogan
//   npm run kunde -- medium    --kunde k-… --rolle hero --datei pfad/bild.jpg [--uebernehmen]
//   npm run kunde -- gericht   --kunde k-… --gericht g-… [--name …] [--preis 12,50] [--beschreibung …] [--allergene …]
//   npm run kunde -- zeiten    --kunde k-… --zeile "Mo–Fr | 11:30–14:00 & 17:00–22:00" [--zeile …] [--ausnahme "24.12. | geschlossen"]
//   npm run kunde -- bauen     --kunde k-…
//   npm run kunde -- paket     --kunde k-… [--noindex]   (nur freigegeben: statische Seite + Übergabe an die Wirt-App)
//
// Veröffentlicht wird dabei nichts.

import { readFileSync } from "node:fs";
import { FELDER, alleProjekte, aendereProjekt, legeMediumVor, mediumAktion } from "../src/kundenProjekt.js";
import { fuehreAktionAus, kundenAnsicht, projektAusDemo, projektAusBeispiel } from "../v2/integration/kundenDashboard.js";
import { baueKundenfassung } from "../v2/integration/kundenBau.js";
import { erstellePaket } from "../v2/integration/kundenPaket.js";

const VON = "Chat (Claude Code)";
const [befehl, ...rest] = process.argv.slice(2);

function werte(name) {
  const liste = [];
  for (let i = 0; i < rest.length; i += 1) if (rest[i] === `--${name}`) liste.push(rest[i + 1] ?? "");
  return liste;
}
const wert = (name) => werte(name)[0];
const hat = (name) => rest.includes(`--${name}`);

function kunde() {
  const id = wert("kunde");
  if (!id) throw new Error("Bitte --kunde k-… angeben (npm run kunde -- liste).");
  return id;
}

function kurz(id) {
  const a = kundenAnsicht(id);
  const s = a.stufen;
  console.log(`${a.id} · Revision ${a.revision} · ${a.design.kueche}/${a.design.vorlageLabel}/${a.design.farbschema}`);
  console.log(`Stufen: gebaut=${s.lokalGebaut.erreicht} freigegeben=${s.freigegeben.erreicht} deployment-ready=${s.deploymentReady.erreicht} live=${s.live.erreicht}`);
  for (const f of a.felder) console.log(`  ${f.id.padEnd(30)} ${f.status.padEnd(12)} ${f.wert ? JSON.stringify(f.wert.slice(0, 60)) : "(Vorlage)"}`);
  for (const m of a.medien) console.log(`  medium ${m.rolle.padEnd(24)} ${m.status.padEnd(12)} ${m.aktuell ? m.aktuell.datei : "–"}${m.vorschlag ? " (Vorschlag offen)" : ""}`);
  for (const k of a.speisekarte.kategorien) {
    console.log(`  [${k.id}] ${k.name}`);
    for (const g of k.gerichte) console.log(`     ${g.id} ${g.name} – ${g.preis} € (${g.status}${g.herkunft === "muster" ? ", Muster" : ""})`);
  }
  if (s.bereitschaft.inhalt.length) console.log(`Offen: ${s.bereitschaft.inhalt.length} Punkt(e), z. B. ${s.bereitschaft.inhalt[0]}`);
}

try {
  if (befehl === "liste") {
    for (const k of alleProjekte()) console.log(`${k.id}  ${k.name}  (aus ${k.herkunft?.slug}, Rev. ${k.revision}, ${k.geaendert})`);
  } else if (befehl === "felder") {
    for (const f of FELDER) console.log(`${f.id.padEnd(30)} ${f.label} (max. ${f.max})`);
  } else if (befehl === "anzeigen") {
    kurz(kunde());
  } else if (befehl === "anlegen") {
    const p = wert("aus-demo") ? projektAusDemo(wert("aus-demo")) : wert("aus-beispiel") ? projektAusBeispiel(wert("aus-beispiel")) : null;
    if (!p) throw new Error("--aus-demo <slug> oder --aus-beispiel <küche> angeben.");
    console.log(`Angelegt: ${p.id} – im Dashboard: /bearbeiten.html?kunde=${p.id}`);
  } else if (befehl === "feld") {
    fuehreAktionAus(kunde(), { aktion: "feld", feld: wert("feld"), wert: wert("wert") ?? "" }, { von: VON });
    kurz(kunde());
  } else if (befehl === "bestaetigen") {
    fuehreAktionAus(kunde(), { aktion: "feldBestaetigen", feld: wert("feld"), bestaetigt: !hat("zuruecknehmen") }, { von: VON });
  } else if (befehl === "medium") {
    const id = kunde();
    const rolle = wert("rolle");
    const puffer = readFileSync(wert("datei"));
    aendereProjekt(id, undefined, (p, info) => legeMediumVor(p, rolle, puffer, info), { von: VON, was: `Upload ${rolle}` });
    if (hat("uebernehmen")) aendereProjekt(id, undefined, (p, info) => mediumAktion(p, rolle, "uebernehmen", info), { von: VON, was: `Medium ${rolle}: uebernehmen` });
    console.log(`${rolle}: ${hat("uebernehmen") ? "übernommen" : "als Vorschlag abgelegt – im Dashboard übernehmen oder mit --uebernehmen"}.`);
  } else if (befehl === "gericht") {
    const daten = {};
    for (const k of ["name", "preis", "beschreibung", "allergene"]) if (wert(k) !== undefined) daten[k] = wert(k);
    fuehreAktionAus(kunde(), { aktion: "gericht", id: wert("gericht"), daten }, { von: VON });
    console.log("Gericht gespeichert (Entwurf).");
  } else if (befehl === "zeiten") {
    const zeile = (t) => {
      const [tage, ...z] = t.split("|");
      return { tage: tage.trim(), zeiten: z.join("|").trim() };
    };
    fuehreAktionAus(kunde(), { aktion: "oeffnungszeiten", zeilen: werte("zeile").map(zeile), ausnahmen: werte("ausnahme").map(zeile) }, { von: VON });
    console.log("Öffnungszeiten gespeichert (Entwurf).");
  } else if (befehl === "bauen") {
    const r = await baueKundenfassung(kunde());
    console.log(`Lokal gebaut: ${r.ordner}${r.sync?.synchronisiert ? ` · Karte an Wirt-Betrieb ${r.sync.betrieb}` : ""}`);
  } else if (befehl === "paket") {
    const r = await erstellePaket(kunde(), { noindex: hat("noindex") });
    console.log(`Paket: ${r.paketDir}`);
    console.log(`  site/                 → auf den statischen Host (${r.protokoll.dateien.length} Dateien, Wirt-Adresse ${r.protokoll.apiUrl})`);
    console.log(`  wirt-uebergabe.json   → an die Wirt-App „${r.uebergabe.betrieb}“ (docs-intern/PILOT-BETRIEB.md)`);
    console.log("  intern/               → nicht hochladen");
  } else {
    console.log(readFileSync(new URL(import.meta.url), "utf-8").split("\n").filter((z) => z.startsWith("//")).join("\n"));
    process.exitCode = befehl ? 1 : 0;
  }
} catch (fehler) {
  console.error(`Fehler: ${fehler.message}`);
  process.exitCode = 1;
}

