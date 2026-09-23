// Designsystem des Agentur-Dashboards (Stage 7b) → v2/designsysteme/dashboard.json + .md
//
// Das Werkzeug, mit dem die Agentur arbeitet, soll selbst nicht wie ein
// generisches SaaS-Admin aussehen. Richtung: redaktionelles Arbeitsblatt –
// Serifenziffern für Kennzahlen über einer dichten, ruhigen Tabelle, warmes
// Papier statt Blaugrau, eine Tinte als Akzent. Referenzen aus Refero:
// Hex („literary serif headline over dense data notebook“) und Midday
// („Editorial broadsheet on parchment“), dazu Monocle für die Tabellendisziplin.

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contrastRatio } from "../../src/colorMath.js";
import { schriftStapel, passendesGewicht } from "./schriften.js";
import { sichereKontrast, SPACING_SKALA, DESIGNSYSTEM_DIR } from "./designsystemGenerator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function erzeugeDashboardDesignsystem() {
  const grund = "#f5f3ee";
  const flaeche = "#fffefb";
  const flaecheTief = "#ece8df";
  const text = "#1e1d1a";
  const pruefeAuf = [grund, flaeche, flaecheTief];
  const farbe = (hex, aufgabe) => ({ hex, aufgabe });
  const rollen = {
    grund: farbe(grund, "Seitengrund des Werkzeugs – warmes Papier"),
    flaeche: farbe(flaeche, "Kennzahl-Kacheln, Tabelle, Seitenleiste"),
    flaecheTief: farbe(flaecheTief, "Tabellenkopf, Zeilen-Hover, Eingabefelder"),
    text: farbe(text, "Text und Kennzahlen"),
    textLeise: farbe(sichereKontrast("#6b675e", pruefeAuf), "Spaltenköpfe, Metadaten"),
    linie: farbe("#dcd6ca", "Zeilen- und Kachelkanten"),
    linieStark: farbe(sichereKontrast("#a39c8e", [flaeche, grund], 3), "Eingabefelder, Knöpfe (≥ 3:1)"),
    akzent: farbe("#1f4b43", "Tinte: Primäraktion, aktive Sortierung, Fokus"),
    akzentTief: farbe("#163a33", "Hover der Primäraktion"),
    aufAkzent: farbe("#ffffff", "Schrift auf Tinte"),
    akzentText: farbe(sichereKontrast("#1f4b43", pruefeAuf), "Links"),
    sehrHoch: farbe(sichereKontrast("#a8321f", pruefeAuf), "Priorität sehr hoch"),
    hoch: farbe(sichereKontrast("#a85a12", pruefeAuf), "Priorität hoch"),
    mittel: farbe(sichereKontrast("#8a6d12", pruefeAuf), "Priorität mittel"),
    niedrig: farbe(sichereKontrast("#3f6b2c", pruefeAuf), "Priorität niedrig"),
    pruefen: farbe(sichereKontrast("#6b675e", pruefeAuf), "Priorität zu prüfen"),
    eigen: farbe(sichereKontrast("#2f6b3a", pruefeAuf), "Badge: eigenes Foto"),
    ki: farbe(sichereKontrast("#5b3f8c", pruefeAuf), "Badge: KI-generiert"),
    platzhalter: farbe(sichereKontrast("#8a6d12", pruefeAuf), "Badge: Platzhalter"),
    fehler: farbe(sichereKontrast("#b3261e", pruefeAuf), "Fehlermeldungen"),
  };
  const textRollen = ["text", "textLeise", "akzentText", "sehrHoch", "hoch", "mittel", "niedrig", "pruefen", "eigen", "ki", "platzhalter", "fehler"];
  const kontrastPaare = [
    ...textRollen.flatMap((v) => ["grund", "flaeche", "flaecheTief"].map((h) => ({ vordergrund: v, hintergrund: h, mindest: 4.5, art: "text" }))),
    { vordergrund: "aufAkzent", hintergrund: "akzent", mindest: 4.5, art: "text" },
    { vordergrund: "aufAkzent", hintergrund: "akzentTief", mindest: 4.5, art: "text" },
    { vordergrund: "linieStark", hintergrund: "flaeche", mindest: 3, art: "ui" },
  ];
  for (const p of kontrastPaare) {
    const k = contrastRatio(rollen[p.vordergrund].hex, rollen[p.hintergrund].hex);
    if (k < p.mindest) throw new Error(`Dashboard: ${p.vordergrund} auf ${p.hintergrund} ${k.toFixed(2)}:1`);
  }
  return {
    version: 1,
    id: "dashboard",
    label: "Agentur-Dashboard",
    richtung: "Redaktionelles Arbeitsblatt: Serifenziffern über einer dichten, ruhigen Tabelle; warmes Papier, eine Tinte als Akzent, Bedeutungsfarben nur für Priorität und Bildherkunft.",
    referenzen: [
      { name: "Hex", url: "https://styles.refero.design/style/3e32db74-a61d-4e72-93b8-1fb949af2c00", typ: "refero", uebernehmen: ["Serifen-Headline über dichten Daten", "cremiger Grund"] },
      { name: "Midday", url: "https://styles.refero.design/style/3f2b79c1-d980-4380-a903-29856975fc37", typ: "refero", uebernehmen: ["Broadsheet-Ruhe", "gesperrte Spaltenköpfe"] },
      { name: "Monocle", url: "https://styles.refero.design/style/9165ecb1-f068-4093-8783-1f3c98898b8a", typ: "refero", uebernehmen: ["Spalten-Disziplin", "eine Farbe mit Bedeutung"] },
    ],
    farben: { schema: "hell", rollen },
    kontrastPaare,
    typografie: {
      display: { familie: "Newsreader", stapel: schriftStapel("Newsreader"), gewicht: passendesGewicht("Newsreader", 500) },
      text: { familie: "Instrument Sans", stapel: schriftStapel("Instrument Sans"), gewicht: 400, gewichtStark: 600 },
      skala: { basisPx: 15, tabelle: 14, klein: 13, kennzahl: 44, h1: 30 },
    },
    spacing: { raster: 8, skala: SPACING_SKALA },
    radius: { klein: 4, karte: 8, knopf: 6, marke: 999 },
    schatten: { stil: "linie", karte: "0 0 0 1px #dcd6ca" },
    motion: { kurz: 120, mittel: 200, kurve: "cubic-bezier(.2,.72,.3,1)" },
    verboteneMuster: ["Blaugrauer SaaS-Standard mit Signalblau", "farbige KPI-Zahlen in vier Farben", "Schatten unter jeder Kachel", "Emoji als Spaltenicons"],
  };
}

export function dashboardMarkdown(ds) {
  const z = [`# ${ds.label}`, "", `> ${ds.richtung}`, "", "## Referenzen", ""];
  for (const r of ds.referenzen) z.push(`- [${r.name}](${r.url}) – ${r.uebernehmen.join("; ")}`);
  z.push("", "## Farben", "", "| Rolle | Wert | Aufgabe |", "|---|---|---|");
  for (const [rolle, f] of Object.entries(ds.farben.rollen)) z.push(`| \`${rolle}\` | \`${f.hex}\` | ${f.aufgabe} |`);
  z.push("", "## Typografie", "", `Kennzahlen und Titel: ${ds.typografie.display.familie} ${ds.typografie.display.gewicht}; Text und Tabelle: ${ds.typografie.text.familie}.`);
  z.push("", "## Verbotene Muster", "", ...ds.verboteneMuster.map((m) => `- ${m}`), "");
  return z.join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ds = erzeugeDashboardDesignsystem();
  mkdirSync(DESIGNSYSTEM_DIR, { recursive: true });
  writeFileSync(path.join(DESIGNSYSTEM_DIR, "dashboard.json"), `${JSON.stringify(ds, null, 2)}\n`);
  writeFileSync(path.join(DESIGNSYSTEM_DIR, "dashboard.md"), dashboardMarkdown(ds));
  console.log("dashboard.json geschrieben");
}
void __dirname;
