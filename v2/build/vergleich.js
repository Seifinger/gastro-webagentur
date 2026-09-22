// Vorher/Nachher-Vergleich v1 ↔ v2 für alle 36 Küche×Stimmung (Stage 8)
//
//   npm run v2:vergleich
//
// v1 wird so gerendert, wie es veröffentlicht würde: buildLandingPage() mit
// derselben Küche/Stimmung und demselben synthetischen Test-Lead, Bilder
// direkt von Unsplash, Schriften aus docs/assets/fonts. v2 ist die gebaute
// Seite aus v2/output/sites/. Beide werden mit denselben Einstellungen
// fotografiert (erster Bildschirm Desktop und Mobil, Bewegung aus) und
// zusätzlich mit denselben Judge-Regeln gemessen – v1 gegen die eigene
// Palette und die eigenen Schriften (v1Massstab). --ohne-bilder misst nur. Ergebnis:
// v2/output/vergleich.md + v2/output/vergleich/*.jpg

import { writeFileSync, mkdirSync, readFileSync, existsSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildLandingPage, themeForLead } from "../../src/landingPageGenerator.js";
import { fontFaceCss } from "../../src/fontLibrary.js";
import { remoteImageUrl } from "../../src/imageLibrary.js";
import { testLeads } from "./testLeads.js";
import { ladeDesignsystem } from "./designsystemGenerator.js";
import { SITES_DIR, OUTPUT_DIR } from "./siteBuilder.js";
import { starteBrowser } from "./browser.js";
import { oeffneSeite } from "./screenshot.js";
import { beurteile } from "../judge/designJudge.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..", "..");
export const VERGLEICH_DIR = path.join(OUTPUT_DIR, "vergleich");
export const VERGLEICH_MD = path.join(OUTPUT_DIR, "vergleich.md");

// Klein genug fürs Repository, groß genug zum Beurteilen von Aufbau,
// Typografie und Farbe: Desktop 1440×900 → 864×540, Mobil 390×844 → 234×506.
const AUFNAHMEN = {
  desktop: { viewport: { width: 1440, height: 900 }, skala: 0.6 },
  mobil: { viewport: { width: 390, height: 844 }, skala: 0.6 },
};

export function v1Html(lead) {
  const gestaltung = themeForLead(lead, lead.kueche, lead.stimmung);
  const fonts = path.join(REPO, "docs", "assets", "fonts");
  return buildLandingPage(lead, {
    gestaltung,
    bildUrl: remoteImageUrl,
    fontCss: fontFaceCss(fonts, pathToFileURL(fonts).href),
    fiktiv: true,
  });
}

/**
 * Das Designsystem, gegen das v1 gemessen wird: Raster und Regeln wie v2,
 * aber Farben und Schriften aus dem v1-Theme derselben Stimmung. Sonst
 * zählte jede v1-Farbe als „fremd“, nur weil v2 eine andere Palette hat.
 */
export function v1Massstab(ds, theme) {
  const rollen = Object.fromEntries(Object.entries(theme).filter(([, v]) => /^#[0-9a-f]{6}$/i.test(String(v))).map(([k, v]) => [k, { hex: v }]));
  rollen.akzent = { hex: theme.accent, maxFlaechenAnteil: ds.farben.rollen.akzent.maxFlaechenAnteil };
  const erste = (stapel) => String(stapel).split(",")[0].replace(/['"]/g, "").trim();
  return {
    ...ds,
    farben: { ...ds.farben, rollen },
    typografie: { ...ds.typografie, display: { ...ds.typografie.display, familie: erste(theme.display) }, text: { ...ds.typografie.text, familie: erste(theme.body) } },
  };
}

async function aufnahme(browser, url, ziel, art) {
  const { viewport, skala } = AUFNAHMEN[art];
  // Erst laden und durchscrollen wie der Judge (lazy Bilder, Schriften) …
  const { kontext: k1, seite: s1 } = await oeffneSeite(browser, url, { ansicht: art });
  await k1.close();
  void s1;
  // … dann verkleinert aus dem Cache fotografieren.
  const kontext = await browser.newContext({ viewport, deviceScaleFactor: skala, reducedMotion: "reduce" });
  try {
    const seite = await kontext.newPage();
    await seite.goto(url, { waitUntil: "load", timeout: 60_000 });
    await seite.evaluate(async () => {
      await Promise.all([...document.images].filter((i) => i.getBoundingClientRect().top < innerHeight).map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 8000); }))));
      if (document.fonts?.ready) await document.fonts.ready;
    });
    await seite.waitForTimeout(150);
    await seite.screenshot({ path: ziel, type: "jpeg", quality: 60 });
  } finally {
    await kontext.close();
  }
}

const note = (u) => `${u.mittel.toFixed(1)}${u.bestanden ? "" : " ✗"}`;

export async function erzeugeVergleich({ log = console.log, nur = null, bilder = true } = {}) {
  const browser = await starteBrowser();
  if (!browser) throw new Error("Kein Chromium gefunden – Vergleich braucht Screenshots (CHROMIUM_PATH setzen).");
  mkdirSync(VERGLEICH_DIR, { recursive: true });
  const tmp = mkdtempSync(path.join(tmpdir(), "v2-vergleich-"));
  const zeilen = [];
  try {
    for (const lead of testLeads()) {
      if (nur && lead.slug !== nur) continue;
      const v2Datei = path.join(SITES_DIR, lead.slug, "index.html");
      if (!existsSync(v2Datei)) {
        log(`– ${lead.slug}: keine v2-Seite (erst npm run v2:build:all)`);
        continue;
      }
      const ds = ladeDesignsystem(lead.kueche, lead.stimmung);
      const v1Pfad = path.join(tmp, `${lead.slug}.html`);
      const v1 = v1Html(lead);
      writeFileSync(v1Pfad, v1);
      const urls = { v1: pathToFileURL(v1Pfad).href, v2: pathToFileURL(v2Datei).href };
      for (const engine of bilder ? ["v1", "v2"] : []) {
        for (const art of ["desktop", "mobil"]) {
          await aufnahme(browser, urls[engine], path.join(VERGLEICH_DIR, `${lead.slug}--${engine}-${art}.jpg`), art);
        }
      }
      const urteile = {
        v1: await beurteile({ browser, url: urls.v1, html: v1, ds: v1Massstab(ds, themeForLead(lead, lead.kueche, lead.stimmung).theme) }),
        v2: await beurteile({ browser, url: urls.v2, html: readFileSync(v2Datei, "utf-8"), ds }),
      };
      const bericht = JSON.parse(readFileSync(path.join(SITES_DIR, lead.slug, "bericht.json"), "utf-8"));
      zeilen.push({ lead, ds, urteile, bericht });
      log(`✓ ${lead.slug}: v1 ${note(urteile.v1)} · v2 ${note(urteile.v2)}`);
    }
  } finally {
    await browser.close();
    rmSync(tmp, { recursive: true, force: true });
  }
  if (!nur) writeFileSync(VERGLEICH_MD, vergleichMarkdown(zeilen));
  return zeilen;
}

const KRITERIEN = [
  ["farbdisziplin", "Farbe"],
  ["typografie", "Typo"],
  ["rhythmus", "Rhythmus"],
  ["bildintegration", "Bild"],
  ["verboteneMuster", "Muster"],
];

export function vergleichMarkdown(zeilen) {
  const schnitt = (e) => (zeilen.reduce((s, z) => s + z.urteile[e].mittel, 0) / zeilen.length).toFixed(1);
  const bestanden = (e) => zeilen.filter((z) => z.urteile[e].bestanden).length;
  const md = [
    "# Vorher/Nachher: v1 ↔ v2",
    "",
    "Erzeugt mit `npm run v2:vergleich`. Links v1 (`src/landingPageGenerator.js`), rechts v2",
    "(`v2/output/sites/`), gleicher synthetischer Test-Lead, gleiche Küche und Stimmung. Aufnahme:",
    "erster Bildschirm, Desktop 1440×900 und Mobil 390×844 (verkleinert), Bewegung aus.",
    "",
    "Die Noten stammen vom Design-Judge (`v2/judge/designJudge.js`), angewandt auf **beide**",
    "Seiten mit denselben Regeln. Farben und Schriften von v1 werden gegen die **eigene** v1-Palette",
    "gemessen, nicht gegen die v2-Palette. Raster, Kontrast, Touch-Ziele und verbotene Muster",
    "gelten für beide gleich. Für v1 ist das streng, weil v1 nie gegen diese Regeln gebaut wurde.",
    "Die Noten zeigen, *welche* Regeln v2 zusätzlich einhält, und sind kein Geschmacksurteil über v1.",
    "Grenze der Messung: Kontrast wird gegen den ersten deckenden Hintergrund gemessen. Heller",
    "Text auf einem Foto (v1-Hero, v1-Navigation über dem Foto) zählt deshalb als Kontrastfehler,",
    "auch wenn ein dunkler Schleier ihn im Bild lesbar macht. v2 setzt keinen Text auf Fotos.",
    "",
    "## Überblick",
    "",
    `| | v1 | v2 |`,
    `|---|---|---|`,
    `| Mittlere Judge-Note | ${schnitt("v1")} | ${schnitt("v2")} |`,
    `| Judge bestanden | ${bestanden("v1")} / ${zeilen.length} | ${bestanden("v2")} / ${zeilen.length} |`,
    "",
    `| Kombination | Hero v2 | ${KRITERIEN.map(([, l]) => `${l} v1→v2`).join(" | ")} | Mittel v1→v2 |`,
    `|---|---|${KRITERIEN.map(() => "---").join("|")}|---|`,
  ];
  for (const z of zeilen) {
    const k = (e, kr) => z.urteile[e].kriterien[kr].note;
    md.push(`| [${z.ds.kuecheLabel} · ${z.ds.label}](#${z.lead.slug}) | ${z.bericht.heroVariante} | ${KRITERIEN.map(([kr]) => `${k("v1", kr)}→${k("v2", kr)}`).join(" | ")} | ${note(z.urteile.v1)}→${note(z.urteile.v2)} |`);
  }
  md.push("", "## Alle 36 Kombinationen", "");
  for (const z of zeilen) {
    const s = z.lead.slug;
    const bild = (e, a) => `vergleich/${s}--${e}-${a}.jpg`;
    const befunde = (e) =>
      Object.entries(z.urteile[e].kriterien)
        .flatMap(([, v]) => v.befunde ?? [])
        .slice(0, 4)
        .map((b) => `  - ${b}`);
    md.push(
      `<a id="${s}"></a>`,
      `### ${z.ds.kuecheLabel} · ${z.ds.label}`,
      "",
      `v2: ${z.ds.archetypLabel}, ${z.ds.typografie.display.familie} / ${z.ds.typografie.text.familie}, Hero „${z.bericht.heroVariante}“, Akzent \`${z.ds.farben.rollen.akzent.hex}\`. Judge v1 ${note(z.urteile.v1)} → v2 ${note(z.urteile.v2)}.`,
      "",
      "| v1 (vorher) | v2 (nachher) |",
      "|---|---|",
      `| ![v1 Desktop](${bild("v1", "desktop")}) | ![v2 Desktop](${bild("v2", "desktop")}) |`,
      `| ![v1 Mobil](${bild("v1", "mobil")}) | ![v2 Mobil](${bild("v2", "mobil")}) |`,
      "",
    );
    const b1 = befunde("v1");
    const b2 = befunde("v2");
    if (b1.length) md.push("Judge-Befunde v1:", ...b1, "");
    if (b2.length) md.push("Judge-Befunde v2:", ...b2, "");
  }
  return `${md.join("\n")}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf("--nur");
  erzeugeVergleich({ nur: i > -1 ? process.argv[i + 1] : null, bilder: !process.argv.includes("--ohne-bilder") }).catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
}
