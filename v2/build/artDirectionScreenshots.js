// Screenshots und Review der Art-Direction-Runde.
//
//   node v2/build/artDirectionScreenshots.js --vorher
//       ganze Seiten (Desktop 1440 / Mobil 390) der bisherigen v2-Seiten
//       → v2/art-direction/vorher/
//   node v2/build/artDirectionScreenshots.js --piloten [--slug s] [--runde n]
//       volles Review (screenshotReview.js) jeder Pilotseite
//       → v2/art-direction/piloten/<slug>/ (+ runde-<n>/ ganze Seiten)

import { copyFileSync, mkdirSync, readdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { starteBrowser } from "./browser.js";
import { oeffneSeite } from "./screenshot.js";
import { pruefeSeite, reviewMarkdownAutomatisch } from "../judge/screenshotReview.js";
import { PILOT_DIR } from "./komposition/builder.js";

const V2 = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
export const VORHER = ["italienisch--trattoria", "japanisch--izakaya", "bayerisch--wirtshaus", "cafe--third-wave", "cafe--wiener-kaffeehaus"];

async function vorher(browser) {
  const ziel = path.join(V2, "art-direction", "vorher");
  mkdirSync(ziel, { recursive: true });
  for (const s of VORHER) {
    for (const ansicht of ["desktop", "mobil"]) {
      const { kontext, seite } = await oeffneSeite(browser, pathToFileURL(path.join(V2, "output", "sites", s, "index.html")).href, { ansicht });
      await seite.screenshot({ path: path.join(ziel, `${s}--${ansicht}.jpg`), fullPage: true, type: "jpeg", quality: 55 });
      await kontext.close();
      console.log(`✓ vorher ${s} ${ansicht}`);
    }
  }
}

async function piloten(browser, { slug, runde }) {
  const slugs = slug ? [slug] : readdirSync(PILOT_DIR).filter((d) => existsSync(path.join(PILOT_DIR, d, "index.html")));
  for (const s of slugs) {
    const ziel = path.join(V2, "art-direction", "piloten", s);
    const b = await pruefeSeite(browser, pathToFileURL(path.join(PILOT_DIR, s, "index.html")).href, { ziel, name: s });
    writeFileSync(path.join(ziel, "automatisch.md"), `${reviewMarkdownAutomatisch(b)}\n`);
    if (runde) {
      const r = path.join(ziel, `runde-${runde}`);
      mkdirSync(r, { recursive: true });
      for (const vp of ["desktop", "mobil"]) copyFileSync(path.join(ziel, `${s}--${vp}.jpg`), path.join(r, `${s}--${vp}.jpg`));
      writeFileSync(path.join(r, "automatisch.md"), `${reviewMarkdownAutomatisch(b)}\n`);
    }
    console.log(`✓ ${s}: ${b.zusammenfassung.fehler} Fehler, ${b.zusammenfassung.warnungen} Warnungen · LCP ${b.labor.desktop.lcpMs}/${b.labor.mobil.lcpMs} ms · CLS ${b.labor.desktop.cls}/${b.labor.mobil.cls}`);
    for (const f of b.automatisch.fehler.slice(0, 12)) console.log(`   ✗ ${f.viewport} ${f.art}: ${f.detail}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? undefined : process.argv[i + 1] ?? true; };
  const browser = await starteBrowser();
  if (!browser) {
    console.log("Kein Chromium gefunden (CHROMIUM_PATH setzen).");
    process.exit(1);
  }
  try {
    if (process.argv.includes("--vorher")) await vorher(browser);
    if (process.argv.includes("--piloten")) await piloten(browser, { slug: arg("slug"), runde: arg("runde") });
  } finally {
    await browser.close();
  }
}
