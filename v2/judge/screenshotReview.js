// Screenshot-Review (Art-Direction-Runde, Phase G + H).
//
// Ergänzt den Judge-Loop (designJudge.js) um das, was er nicht sieht:
// mehrere Viewports, kritische Zustände und messbare Fehler in den
// wichtigsten Nutzerwegen. Getrennt wird streng:
//
//   automatisch – messbar, mit Schwelle: fehlende Assets, Textüberläufe,
//                 abgeschnittene Bedienelemente, Kontrast, Tastaturfokus,
//                 Layoutsprünge, Fehler in Reservierung/Bestellung/Navigation
//   labor       – LCP, CLS und ein INP-Näherungswert aus EINEM
//                 Headless-Lauf. Das sind Laborwerte, keine Felddaten
//                 (CrUX/RUM) – sie belegen kein „bestanden“ für echte Nutzer.
//
// Subjektive Kritik (Bildwirkung, Charakter, Rhythmus, Originalität) wird
// nicht berechnet; sie steht begründet in review.md der jeweiligen Seite.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 820, height: 1180 },
  mobil: { width: 390, height: 844 },
};

/** Orientierungswerte „gut“ (web.dev). */
export const CWV_GUT = { lcpMs: 2500, inpMs: 200, cls: 0.1 };

async function kontext(browser, vp, { reduziert = true } = {}) {
  return browser.newContext({ viewport: VIEWPORTS[vp], locale: "de-DE", timezoneId: "Europe/Berlin", reducedMotion: reduziert ? "reduce" : "no-preference", deviceScaleFactor: 1 });
}

async function durchscrollen(seite) {
  await seite.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += Math.round(innerHeight * 0.8)) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    scrollTo(0, 0);
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 8000); }))));
    if (document.fonts?.ready) await document.fonts.ready;
  });
  // Aktionsleiste und andere Beobachter-Reaktionen nach dem Zurückscrollen abwarten.
  await seite.waitForTimeout(500);
}

/** Messbare Prüfungen im Browser. Läuft im Seitenkontext. */
function pruefungenImBrowser() {
  const vw = innerWidth;
  const befunde = [];
  const sichtbar = (el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0 && r.width > 0 && r.height > 0 && !el.closest("[hidden], details:not([open]) > :not(summary), .drawer:not(.open), .confirm-box:not(.open), .overlay, .mobilebar");
  };
  const lum = (c) => {
    const m = c.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1];
    const [r, g, b] = m.slice(0, 3).map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return { l: 0.2126 * r + 0.7152 * g + 0.0722 * b, a: m[3] ?? 1 };
  };
  const hintergrund = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.backgroundImage !== "none" || e.tagName === "PICTURE" || e.tagName === "IMG") return null;
      const bg = s.backgroundColor;
      if (bg && !/rgba\(.*,\s*0\)$/.test(bg) && bg !== "transparent") return bg;
    }
    return "rgb(255,255,255)";
  };

  if (document.documentElement.scrollWidth > vw + 1) befunde.push({ art: "horizontaler-ueberlauf", detail: `${document.documentElement.scrollWidth}px > ${vw}px` });

  for (const img of document.images) if (img.complete && !img.naturalWidth) befunde.push({ art: "bild-fehlt", detail: img.currentSrc || img.src });

  const texte = [...document.querySelectorAll("h1, h2, h3, p, li, a, button, label, summary, span.preis")].filter(sichtbar);
  for (const el of texte) {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) befunde.push({ art: "text-ueberlauf", detail: `${el.tagName.toLowerCase()}.${el.className} „${el.textContent.trim().slice(0, 40)}“ (${Math.round(r.left)}–${Math.round(r.right)}px)` });
    else if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== "visible" && el.clientWidth > 0) befunde.push({ art: "text-abgeschnitten", detail: `${el.tagName.toLowerCase()}.${el.className} „${el.textContent.trim().slice(0, 40)}“` });
  }

  const bedien = [...document.querySelectorAll("a[href], button, input, select, textarea, summary")].filter(sichtbar);
  for (const el of bedien) {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) befunde.push({ art: "bedienelement-abgeschnitten", detail: `${el.tagName.toLowerCase()} „${(el.textContent || el.name || "").trim().slice(0, 30)}“` });
    const inline = el.tagName === "A" && getComputedStyle(el).display === "inline" && el.closest("p, li, span");
    if (!inline && vw < 800 && (r.height < 40 || r.width < 40) && el.type !== "checkbox") befunde.push({ art: "touch-ziel-klein", schwere: "warnung", detail: `${el.tagName.toLowerCase()} „${(el.textContent || el.name || "").trim().slice(0, 30)}“ ${Math.round(r.width)}×${Math.round(r.height)}` });
  }

  for (const el of texte) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const bg = hintergrund(el);
    if (!bg) continue;
    const s = getComputedStyle(el);
    const v = lum(s.color);
    const h = lum(bg);
    if (v.a < 1 || Number(s.opacity) < 1) continue;
    const ratio = (Math.max(v.l, h.l) + 0.05) / (Math.min(v.l, h.l) + 0.05);
    const px = parseFloat(s.fontSize);
    const gross = px >= 24 || (px >= 18.66 && Number(s.fontWeight) >= 700);
    const mindest = gross ? 3 : 4.5;
    if (ratio < mindest) befunde.push({ art: "kontrast", detail: `${el.tagName.toLowerCase()}.${el.className} „${el.textContent.trim().slice(0, 30)}“ ${ratio.toFixed(2)}:1 < ${mindest}:1` });
  }
  return befunde;
}

async function tastatur(seite, schritte = 18) {
  const ohneFokus = [];
  let erreicht = 0;
  for (let i = 0; i < schritte; i += 1) {
    await seite.keyboard.press("Tab");
    const info = await seite.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const sichtbarerRing = (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none";
      return { name: `${el.tagName.toLowerCase()} „${(el.textContent || el.name || "").trim().slice(0, 30)}“`, ring: sichtbarerRing, sichtbar: r.width > 0 && r.height > 0 };
    });
    if (!info) continue;
    erreicht += 1;
    if (!info.ring || !info.sichtbar) ohneFokus.push(info.name);
  }
  return { erreicht, ohneFokus };
}

/** Labormessung: LCP, CLS, INP-Näherung (Klick auf den ersten Vormerken-Knopf). */
async function labor(browser, url, vp) {
  const k = await kontext(browser, vp, { reduziert: false });
  const s = await k.newPage();
  // Mobil gedrosselt wie Lighthouse „Slow 4G“ (150 ms RTT, 1,6 Mbit/s) und 4× langsamere CPU.
  if (vp === "mobil") {
    const cdp = await k.newCDPSession(s);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  await s.addInitScript(() => {
    window.__m = { lcp: 0, cls: 0, inp: 0 };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.inp = Math.max(window.__m.inp, e.duration); }).observe({ type: "event", buffered: true, durationThreshold: 16 });
  });
  await s.goto(url, { waitUntil: "load", timeout: 60_000 });
  await s.waitForTimeout(800);
  await durchscrollen(s);
  const knopf = s.locator("[data-add]").first();
  if (await knopf.count()) {
    await knopf.scrollIntoViewIfNeeded();
    await knopf.click();
    await s.waitForTimeout(400);
  }
  const m = await s.evaluate(() => window.__m);
  await k.close();
  return { lcpMs: Math.round(m.lcp), cls: Number(m.cls.toFixed(3)), inpNaeherungMs: Math.round(m.inp) };
}

/** Kritische Zustände – jeweils mit Screenshot und Prüfergebnis. */
async function zustaende(browser, url, vp, ziel, name) {
  const k = await kontext(browser, vp);
  const s = await k.newPage();
  await s.goto(url, { waitUntil: "load", timeout: 60_000 });
  await durchscrollen(s);
  const liste = [];
  const foto = async (id, ok, detail = "") => {
    const datei = path.join(ziel, `${name}--${vp}--${id}.jpg`);
    await s.screenshot({ path: datei, type: "jpeg", quality: 60 });
    liste.push({ zustand: id, ok, detail, screenshot: path.basename(datei) });
  };
  const probiere = async (id, fn) => {
    try {
      await fn();
    } catch (e) {
      liste.push({ zustand: id, ok: false, detail: `Fehler: ${e.message.split("\n")[0]}` });
    }
  };

  if (vp !== "desktop") {
    await probiere("mobile-navigation", async () => {
      const menue = s.locator(".k-menue summary, .kopf-menue").first();
      if (!(await menue.count()) || !(await menue.isVisible())) return foto("mobile-navigation", false, "kein Menü-Knopf sichtbar");
      await menue.click();
      const n = await s.locator(".k-menue-liste a:visible").count();
      await foto("mobile-navigation", n >= 2, `${n} Einträge sichtbar`);
      await menue.click();
    });
  }

  await probiere("formularfehler", async () => {
    const auf = s.locator("#reservierung details.k-aufklapper:not([open]) > summary");
    if (await auf.count()) await auf.click();
    const form = s.locator("#reservation-form");
    await form.scrollIntoViewIfNeeded();
    await form.locator('button[type="submit"]').click();
    const fehler = await form.locator(".field.invalid").count();
    const sichtbar = await form.locator(".field.invalid .error").first().isVisible().catch(() => false);
    await form.scrollIntoViewIfNeeded();
    await foto("formularfehler", fehler > 0 && sichtbar, `${fehler} Felder als fehlerhaft markiert`);
  });

  await probiere("reservierung-bestaetigt", async () => {
    const form = s.locator("#reservation-form");
    const morgen = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    await form.locator('[name="datum"]').fill(morgen);
    await form.locator('[name="uhrzeit"]').selectOption({ index: 3 });
    await form.locator('[name="personen"]').selectOption({ index: 4 });
    await form.locator('[name="name"]').fill("Test Gast");
    await form.locator('[name="telefon"]').fill("030 555 0101");
    await form.locator('button[type="submit"]').click();
    await s.locator("#confirm.open").waitFor({ timeout: 5000 });
    await foto("reservierung-bestaetigt", true, await s.locator("#confirm-title").textContent());
    await s.locator("#confirm-close").click();
    await s.waitForTimeout(250);
  });

  await probiere("warenkorb", async () => {
    const knopf = s.locator("[data-add]:visible").first();
    await knopf.scrollIntoViewIfNeeded();
    await knopf.click();
    // Das v1-Skript öffnet den Warenkorb beim ersten Vormerken selbst.
    const offen = await s.locator("#drawer.open").waitFor({ timeout: 1500 }).then(() => true, () => false);
    if (!offen) {
      const oeffner = vp === "desktop" ? s.locator("#cart-fab") : s.locator("#bar-order:visible");
      if (await oeffner.count()) await oeffner.first().click();
      else await s.evaluate(() => document.getElementById("cart-fab").click());
      await s.locator("#drawer.open").waitFor({ timeout: 4000 });
    }
    // Menge im Warenkorb erhöhen – zweiter Klick auf dieselbe Position.
    await s.locator("#cart-lines .qty button").last().click().catch(() => {});
    await s.waitForTimeout(300);
    const zeilen = await s.locator("#cart-lines .cart-line").count();
    await foto("warenkorb", zeilen >= 1, `${zeilen} Positionen im Warenkorb`);
  });

  await probiere("bestellung-bestaetigt", async () => {
    const f = s.locator("#order-form");
    await f.locator('[name="abholzeit"]').selectOption({ index: 1 });
    await f.locator('[name="name"]').fill("Test Gast");
    await f.locator('[name="telefon"]').fill("030 555 0102");
    const noshow = s.locator("#ord-noshow");
    if (await noshow.isVisible().catch(() => false)) await noshow.check();
    await s.locator("#order-submit").click();
    await s.locator("#confirm.open").waitFor({ timeout: 5000 });
    await s.waitForTimeout(250);
    await foto("bestellung-bestaetigt", true, await s.locator("#confirm-title").textContent());
  });

  await k.close();
  return liste;
}

/**
 * Prüft eine Seite vollständig.
 * @returns {Promise<object>} Bericht (auch als review.json gespeichert)
 */
export async function pruefeSeite(browser, url, { ziel, name }) {
  mkdirSync(ziel, { recursive: true });
  const bericht = { url, name, zeitpunkt: new Date().toISOString(), viewports: {}, zustaende: {}, labor: {}, automatisch: { fehler: [], warnungen: [] } };
  for (const vp of Object.keys(VIEWPORTS)) {
    const k = await kontext(browser, vp);
    const s = await k.newPage();
    const fehlend = [];
    const konsole = [];
    s.on("requestfailed", (r) => fehlend.push(`${r.url().slice(0, 100)} (${r.failure()?.errorText})`));
    s.on("response", (r) => { if (r.status() >= 400) fehlend.push(`${r.url().slice(0, 100)} (HTTP ${r.status()})`); });
    s.on("pageerror", (e) => konsole.push(e.message));
    await s.goto(url, { waitUntil: "load", timeout: 60_000 });
    await durchscrollen(s);
    const datei = path.join(ziel, `${name}--${vp}.jpg`);
    await s.screenshot({ path: datei, fullPage: true, type: "jpeg", quality: 55 });
    const befunde = await s.evaluate(pruefungenImBrowser);
    const fokus = await tastatur(s);
    await k.close();
    bericht.viewports[vp] = { screenshot: path.basename(datei), befunde, fehlendeAssets: fehlend, skriptFehler: konsole, tastatur: fokus };
    for (const b of befunde) (b.schwere === "warnung" ? bericht.automatisch.warnungen : bericht.automatisch.fehler).push({ viewport: vp, ...b });
    for (const f of fehlend) bericht.automatisch.fehler.push({ viewport: vp, art: "asset-fehlt", detail: f });
    for (const f of konsole) bericht.automatisch.fehler.push({ viewport: vp, art: "skriptfehler", detail: f });
    for (const f of fokus.ohneFokus) bericht.automatisch.fehler.push({ viewport: vp, art: "fokus-unsichtbar", detail: f });
    if (fokus.erreicht === 0) bericht.automatisch.fehler.push({ viewport: vp, art: "tastatur", detail: "kein Element per Tab erreichbar" });
  }
  for (const vp of ["desktop", "mobil"]) {
    bericht.zustaende[vp] = await zustaende(browser, url, vp, ziel, name);
    for (const z of bericht.zustaende[vp]) if (!z.ok) bericht.automatisch.fehler.push({ viewport: vp, art: `zustand-${z.zustand}`, detail: z.detail });
    bericht.labor[vp] = await labor(browser, url, vp);
    const l = bericht.labor[vp];
    if (l.cls > CWV_GUT.cls) bericht.automatisch.fehler.push({ viewport: vp, art: "layoutsprung", detail: `CLS ${l.cls} > ${CWV_GUT.cls}` });
  }
  bericht.zusammenfassung = {
    fehler: bericht.automatisch.fehler.length,
    warnungen: bericht.automatisch.warnungen.length,
    laborHinweis: "Laborwerte aus einem Headless-Lauf (Desktop ungedrosselt, Mobil mit Slow-4G- und 4×-CPU-Drosselung) über einen Proxy, Bilder von images.unsplash.com, Schriften lokal. Keine Felddaten – über echte Nutzer sagen sie nichts aus.",
  };
  writeFileSync(path.join(ziel, "review.json"), `${JSON.stringify(bericht, null, 2)}\n`);
  return bericht;
}

export function reviewMarkdownAutomatisch(b) {
  const z = [`### Automatische Prüfung (${b.zeitpunkt.slice(0, 16).replace("T", " ")})`, "", `**${b.zusammenfassung.fehler} Fehler, ${b.zusammenfassung.warnungen} Warnungen.**`, ""];
  if (b.automatisch.fehler.length) z.push(...b.automatisch.fehler.map((f) => `- ✗ ${f.viewport} · ${f.art}: ${f.detail}`), "");
  if (b.automatisch.warnungen.length) z.push("<details><summary>Warnungen</summary>", "", ...b.automatisch.warnungen.map((f) => `- ${f.viewport} · ${f.art}: ${f.detail}`), "", "</details>", "");
  z.push("| Zustand | Desktop | Mobil |", "|---|---|---|");
  const ids = [...new Set([...(b.zustaende.desktop ?? []), ...(b.zustaende.mobil ?? [])].map((x) => x.zustand))];
  for (const id of ids) {
    const zelle = (vp) => {
      const x = b.zustaende[vp]?.find((y) => y.zustand === id);
      return x ? `${x.ok ? "✓" : "✗"} ${x.detail ?? ""}${x.screenshot ? ` ([Bild](${x.screenshot}))` : ""}` : "–";
    };
    z.push(`| ${id} | ${zelle("desktop")} | ${zelle("mobil")} |`);
  }
  z.push("", "| Labor (kein Feld!) | LCP | CLS | INP-Näherung |", "|---|---|---|---|");
  for (const [vp, l] of Object.entries(b.labor)) z.push(`| ${vp} | ${l.lcpMs} ms ${l.lcpMs <= CWV_GUT.lcpMs ? "(≤ 2,5 s)" : "(> 2,5 s)"} | ${l.cls} | ${l.inpNaeherungMs} ms |`);
  z.push("", `_${b.zusammenfassung.laborHinweis}_`);
  return z.join("\n");
}
