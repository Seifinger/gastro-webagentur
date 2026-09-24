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
//   - Robustheit: Slow 4G + 4× CPU (LCP, Poster, Video) und "ohne Video"
// Mobil zusätzlich: geöffnetes Menü.
// Dazu je Frame: Zustand der Kopfzeile, Deckkraft des Slogans, horizontale
// Scrollleiste. Ausgabe: v2/art-direction/ausdruck/<slug>/runde-<n>/.
//
// Bewusst ohne Schätzung von Kurven oder Dauern: gemessen wird, was im Frame
// steht, nicht wie es dorthin kam.

import { mkdirSync, writeFileSync, createReadStream, existsSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

/**
 * Robustheit (AP4): langsames Netz und "ohne Video".
 * - Slow 4G (1,6 Mbit/s, 150 ms RTT) + 4× CPU, Desktop: LCP (Labor), was die
 *   Bühne nach 4 s zeigt, ob ein Video läuft.
 * - Ohne Video: Anfragen auf *.mp4/*.webm werden blockiert – das Poster muss
 *   stehen bleiben, ohne Skriptfehler.
 * Laborwerte eines Laufs, keine Felddaten.
 */
/** Wartet, bis alle geladenen Bilder dekodiert sind – sonst fotografiert man leere Flächen. */
async function bilderDekodiert(seite) {
  await seite.evaluate(() => Promise.all([...document.images].map((i) => (i.complete && i.naturalWidth ? i.decode().catch(() => {}) : null))));
}

export async function robustheit(browser, url, ziel) {
  const ergebnis = {};
  // Langsames Netz
  let kontext = await browser.newContext({ viewport: ANSICHTEN.desktop, deviceScaleFactor: 1 });
  let seite = await kontext.newPage();
  const cdp = await kontext.newCDPSession(seite);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, connectionType: "cellular4g" });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await seite.addInitScript(() => {
    window.__lcp = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = Math.round(e.startTime); }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  await seite.goto(url, { waitUntil: "load", timeout: 120_000 });
  await seite.waitForTimeout(4000);
  ergebnis.langsam = await seite.evaluate(() => {
    const poster = document.querySelector(".buehne-poster");
    const video = document.querySelector(".buehne-video");
    return { lcpMs: window.__lcp, posterGeladen: Boolean(poster && poster.naturalWidth), videoLaeuft: Boolean(video && video.classList.contains("laeuft")) };
  });
  await seite.screenshot({ path: path.join(ziel, "desktop--langsam.jpg"), type: "jpeg", quality: 70 });
  await kontext.close();

  // Ohne Video
  kontext = await browser.newContext({ viewport: ANSICHTEN.desktop, deviceScaleFactor: 1 });
  seite = await kontext.newPage();
  const fehler = [];
  seite.on("pageerror", (f) => fehler.push(f.message));
  await seite.route(/\.(mp4|webm)(\?|$)/, (r) => r.abort());
  await seite.goto(url, { waitUntil: "load" });
    await bilderDekodiert(seite);
  await seite.waitForTimeout(2500);
  ergebnis.ohneVideo = {
    ...(await seite.evaluate(() => {
      const poster = document.querySelector(".buehne-poster");
      const video = document.querySelector(".buehne-video");
      return { posterGeladen: Boolean(poster && poster.naturalWidth), videoSichtbar: Boolean(video && video.classList.contains("laeuft")) };
    })),
    skriptfehler: fehler,
  };
  await seite.screenshot({ path: path.join(ziel, "desktop--ohne-video.jpg"), type: "jpeg", quality: 70 });
  await kontext.close();
  return ergebnis;
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
    await bilderDekodiert(seite);
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
    await bilderDekodiert(seite);
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
    await bilderDekodiert(seite);
    await seite.screenshot({ path: path.join(ziel, `${ansicht}--ohne-js.jpg`), type: "jpeg", quality: 70 });
    eintrag.ohneJs = await zustand(seite);
    await kontext.close();
  }
  bericht.robustheit = await robustheit(browser, url, ziel);
  writeFileSync(path.join(ziel, "sequenz.json"), `${JSON.stringify(bericht, null, 2)}\n`);
  return bericht;
}

const TYPEN = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2", ".mp4": "video/mp4", ".webm": "video/webm", ".json": "application/json" };

/**
 * Kleiner Webserver über dem Repository: Nur über HTTP greifen Netzdrosselung
 * und echtes Laden (file:// umgeht beides). Unterstützt Range-Anfragen für Video.
 */
export function starteServer(wurzel) {
  const server = http.createServer((req, res) => {
    const pfad = path.join(wurzel, decodeURIComponent(new URL(req.url, "http://x").pathname));
    const datei = existsSync(pfad) && statSync(pfad).isDirectory() ? path.join(pfad, "index.html") : pfad;
    if (!datei.startsWith(wurzel) || !existsSync(datei)) { res.writeHead(404); res.end(); return; }
    const groesse = statSync(datei).size;
    const typ = TYPEN[path.extname(datei).toLowerCase()] ?? "application/octet-stream";
    const bereich = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "");
    if (bereich) {
      const start = Number(bereich[1] || 0);
      const ende = bereich[2] ? Number(bereich[2]) : groesse - 1;
      res.writeHead(206, { "Content-Type": typ, "Content-Range": `bytes ${start}-${ende}/${groesse}`, "Accept-Ranges": "bytes", "Content-Length": ende - start + 1 });
      createReadStream(datei, { start, end: ende }).pipe(res);
      return;
    }
    res.writeHead(200, { "Content-Type": typ, "Content-Length": groesse, "Accept-Ranges": "bytes" });
    createReadStream(datei).pipe(res);
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
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
    const wurzel = path.join(V2, "..");
    const server = await starteServer(wurzel);
    const url = `http://127.0.0.1:${server.address().port}/${path.relative(wurzel, datei).split(path.sep).join("/")}`;
    const b = await scrollSequenz(browser, url, ziel).finally(() => server.close());
    const { robustheit: rob, ...ansichten } = b;
    console.log(`robust: langsam LCP ${rob.langsam.lcpMs} ms, Poster ${rob.langsam.posterGeladen ? "da" : "FEHLT"}, Video ${rob.langsam.videoLaeuft ? "läuft" : "aus"} · ohne Video: Poster ${rob.ohneVideo.posterGeladen ? "da" : "FEHLT"}, Skriptfehler ${rob.ohneVideo.skriptfehler.length}`);
    for (const [ansicht, e] of Object.entries(ansichten)) {
      console.log(`${ansicht}: ${e.sequenz.map((s) => `${Math.round(s.anteil * 100)}% Kopf=${s.kopf} Slogan=${s.sloganDeckkraft}`).join(" · ")}`);
      if (e.menue) console.log(`  Menü: ${JSON.stringify(e.menue)}`);
      console.log(`  reduziert: Slogan=${e.reduziertNachScroll.sloganDeckkraft} nach Scroll · ohne JS: Kopf=${e.ohneJs.kopf} · Skriptfehler: ${e.skriptfehler.length}`);
    }
    console.log(`→ ${path.relative(process.cwd(), ziel)}`);
  } finally {
    await browser.close();
  }
}
