// Visuelle Prüfung des ersten Bildschirms (Gestaltungs-Umbau, AP3/AP4).
//
//   node v2/build/scrollSequenz.js --seite v2/output/piloten-ausdruck/beispiel-bayerisch/index.html --runde 1
//
// Je Ansicht (Desktop 1440×900, Mobil 390×844):
//   - Scroll-Sequenz mit Bewegung: 0 / 25 / 50 / 75 / 100 % der Bühnenhöhe
//     (Slogan-Rückzug, Kopfzeilen-Zustand, Aktionsleiste)
//   - reduzierte Bewegung (erster Bildschirm)
//   - ohne JavaScript (erster Bildschirm)
//   - ganze Seite (reduzierte Bewegung)
// Mobil zusätzlich: geöffnetes Menü.
// Dazu je Frame: Zustand der Kopfzeile, Deckkraft des Slogans, horizontale
// Scrollleiste. Ausgabe: v2/art-direction/ausdruck/<slug>/runde-<n>/.
//
// Bewusst ohne Schätzung von Kurven oder Dauern: gemessen wird, was im Frame
// steht, nicht wie es dorthin kam.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { starteBrowser } from "./browser.js";
import { ANSICHTEN } from "./screenshot.js";

const V2 = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
export const STUFEN = [0, 0.25, 0.5, 0.75, 1];

async function zustand(seite) {
  return seite.evaluate(() => {
    const kopf = document.getElementById("topbar");
    const text = document.querySelector(".buehne-text");
    const leiste = document.getElementById("mobilebar");
    return {
      kopf: kopf?.getAttribute("data-zustand") ?? null,
      sloganDeckkraft: text ? Math.round(Number(getComputedStyle(text).opacity) * 100) / 100 : null,
      aktionsleiste: leiste ? Math.round(Number(getComputedStyle(leiste).opacity) * 100) / 100 : null,
      horizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
      kaputteBilder: [...document.images].filter((i) => i.complete && !i.naturalWidth).length,
    };
  });
}

export async function scrollSequenz(browser, url, ziel) {
  mkdirSync(ziel, { recursive: true });
  const bericht = {};
  for (const [ansicht, viewport] of Object.entries(ANSICHTEN)) {
    const eintrag = (bericht[ansicht] = { sequenz: [] });

    // Mit Bewegung
    let kontext = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: "no-preference" });
    let seite = await kontext.newPage();
    const fehler = [];
    seite.on("pageerror", (f) => fehler.push(f.message));
    await seite.goto(url, { waitUntil: "load" });
    await seite.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; });
    const buehnenHoehe = await seite.evaluate(() => document.querySelector(".buehne")?.offsetHeight ?? window.innerHeight);
    for (const anteil of STUFEN) {
      await seite.evaluate((y) => window.scrollTo(0, y), Math.round(buehnenHoehe * anteil));
      await seite.waitForTimeout(700);
      const datei = `${ansicht}--scroll-${String(Math.round(anteil * 100)).padStart(3, "0")}.jpg`;
      await seite.screenshot({ path: path.join(ziel, datei), type: "jpeg", quality: 70 });
      eintrag.sequenz.push({ anteil, datei, ...(await zustand(seite)) });
    }
    if (ansicht === "mobil") {
      await seite.evaluate(() => window.scrollTo(0, 0));
      await seite.click(".kopf-menue-knopf");
      await seite.waitForTimeout(500);
      await seite.screenshot({ path: path.join(ziel, "mobil--menue.jpg"), type: "jpeg", quality: 70 });
      eintrag.menue = await seite.evaluate(() => ({
        offen: document.getElementById("kopf-menue")?.classList.contains("offen") ?? false,
        fokusImMenue: Boolean(document.activeElement?.closest("#kopf-menue")),
      }));
      await seite.keyboard.press("Escape");
      eintrag.menue.schliesstMitEsc = await seite.evaluate(() => !document.getElementById("kopf-menue")?.classList.contains("offen"));
    }
    eintrag.skriptfehler = fehler;
    await kontext.close();

    // Reduzierte Bewegung
    kontext = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: "reduce" });
    seite = await kontext.newPage();
    await seite.goto(url, { waitUntil: "load" });
    await seite.screenshot({ path: path.join(ziel, `${ansicht}--reduziert.jpg`), type: "jpeg", quality: 70 });
    eintrag.reduziert = await zustand(seite);
    await seite.evaluate(() => window.scrollTo(0, (document.querySelector(".buehne")?.offsetHeight ?? 0) * 0.5));
    await seite.waitForTimeout(300);
    eintrag.reduziertNachScroll = await zustand(seite);
    await seite.screenshot({ path: path.join(ziel, `${ansicht}--ganz.jpg`), fullPage: true, type: "jpeg", quality: 45 });
    await kontext.close();

    // Ohne JavaScript
    kontext = await browser.newContext({ viewport, deviceScaleFactor: 1, javaScriptEnabled: false });
    seite = await kontext.newPage();
    await seite.goto(url, { waitUntil: "load" });
    await seite.screenshot({ path: path.join(ziel, `${ansicht}--ohne-js.jpg`), type: "jpeg", quality: 70 });
    eintrag.ohneJs = await zustand(seite);
    await kontext.close();
  }
  writeFileSync(path.join(ziel, "sequenz.json"), `${JSON.stringify(bericht, null, 2)}\n`);
  return bericht;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? undefined : process.argv[i + 1]; };
  const datei = path.resolve(arg("seite") ?? "");
  const slug = path.basename(path.dirname(datei));
  const ziel = path.join(V2, "art-direction", "ausdruck", slug, `runde-${arg("runde") ?? "1"}`);
  const browser = await starteBrowser();
  if (!browser) {
    console.log("Kein Chromium gefunden (CHROMIUM_PATH setzen).");
    process.exit(1);
  }
  try {
    const b = await scrollSequenz(browser, pathToFileURL(datei).href, ziel);
    for (const [ansicht, e] of Object.entries(b)) {
      console.log(`${ansicht}: ${e.sequenz.map((s) => `${Math.round(s.anteil * 100)}% Kopf=${s.kopf} Slogan=${s.sloganDeckkraft}`).join(" · ")}`);
      if (e.menue) console.log(`  Menü: ${JSON.stringify(e.menue)}`);
      console.log(`  reduziert: Slogan=${e.reduziertNachScroll.sloganDeckkraft} nach Scroll · ohne JS: Kopf=${e.ohneJs.kopf} · Skriptfehler: ${e.skriptfehler.length}`);
    }
    console.log(`→ ${path.relative(process.cwd(), ziel)}`);
  } finally {
    await browser.close();
  }
}
