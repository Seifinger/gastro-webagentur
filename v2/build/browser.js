// Gemeinsamer Headless-Browser für Referenzanalyse (Stage 1), Judge (Stage 5)
// und Vergleichs-Screenshots (Stage 8).
//
// playwright-core bringt keinen Browser mit. Gesucht wird in dieser
// Reihenfolge: CHROMIUM_PATH, die vorinstallierte Cloud-Umgebung
// (/opt/pw-browsers/chromium), danach die üblichen Systempfade. Fehlt alles,
// liefert starteBrowser() null – Judge und Analyse fallen dann auf ihre
// statische Auswertung zurück, statt abzustürzen.
//
// Hinter einem TLS-terminierenden Firmen-/Agent-Proxy (V2_PROXY_CA oder die
// Cloud-Sandbox unter /root/.ccr) wird genau dieses eine CA per SPKI-Pin
// vertraut. Die Zertifikatsprüfung bleibt für alles andere voll aktiv.

import { existsSync, readFileSync } from "node:fs";
import { createHash, X509Certificate } from "node:crypto";

const KANDIDATEN = [
  process.env.CHROMIUM_PATH,
  "/opt/pw-browsers/chromium",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

export function chromiumPfad() {
  return KANDIDATEN.find((p) => existsSync(p)) ?? null;
}

function proxyCaSpki() {
  const pfad = process.env.V2_PROXY_CA || "/root/.ccr/agent-proxy-ca.crt";
  if (!existsSync(pfad)) return null;
  try {
    const zert = new X509Certificate(readFileSync(pfad));
    const der = zert.publicKey.export({ type: "spki", format: "der" });
    return createHash("sha256").update(der).digest("base64");
  } catch {
    return null;
  }
}

/**
 * Startet Chromium oder gibt null zurück, wenn keiner verfügbar ist.
 * @returns {Promise<import("playwright-core").Browser|null>}
 */
export async function starteBrowser() {
  let chromium;
  try {
    ({ chromium } = await import("playwright-core"));
  } catch {
    return null;
  }
  const executablePath = chromiumPfad();
  const args = ["--font-render-hinting=none", "--disable-gpu"];
  const spki = proxyCaSpki();
  if (spki) args.push(`--ignore-certificate-errors-spki-list=${spki}`);
  try {
    return await chromium.launch({ ...(executablePath ? { executablePath } : {}), args });
  } catch {
    return null;
  }
}

/** Führt fn mit einem Browser aus und schließt ihn danach sicher. */
export async function mitBrowser(fn) {
  const browser = await starteBrowser();
  try {
    return await fn(browser);
  } finally {
    await browser?.close().catch(() => {});
  }
}
