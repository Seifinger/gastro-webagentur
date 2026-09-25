// Präsentation im WLAN: eine lokal gebaute Konzept-Demo auf einem fremden
// Handy zeigen, ohne sie ins Internet zu stellen (src/oeffentlichkeit.js, Typ B).
//
// Was das ist – und was nicht:
//   - Ein eigener kleiner Server auf deinem Rechner, erreichbar nur im selben
//     WLAN bzw. Hotspot (Adresse wie http://192.168.1.23:3010/…).
//   - Er liefert genau EINE Demo aus (v2/output/leads/<slug>/) unter einem
//     zufälligen Pfad; alles andere (Dashboard, Lead-Daten, andere Demos)
//     ist über ihn nicht erreichbar.
//   - Er endet automatisch (Standard: 2 Stunden) und lässt sich jederzeit
//     beenden; danach ist der Link tot.
//   - Kein Passwort, keine Verschlüsselung (http im lokalen Netz): Wer im
//     selben Netz den Link kennt, kann die Demo während der Laufzeit öffnen.
//     Für eine Vorführung vor Ort genügt das; "privat im Internet" ist es nicht.
//
// Das Dashboard selbst bleibt auf 127.0.0.1 (config.dashboardHost).

import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const LEADS_DIR = path.join(__dirname, "..", "v2", "output", "leads");
export const ASSETS_DIR = path.join(__dirname, "..", "v2", "output", "assets");
export const STANDARD_DAUER_MIN = 120;

const TYPEN = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".woff2": "font/woff2",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};
// Was aus dem Demo-Ordner ausgeliefert wird: Seiten und Medien, keine Berichte.
const ERLAUBT = new Set(Object.keys(TYPEN));

/** Erste private IPv4-Adresse dieses Rechners (WLAN/LAN). Überschreibbar: PRAESENTATION_HOST. */
export function lanAdresse(schnittstellen = networkInterfaces(), env = process.env) {
  if (env.PRAESENTATION_HOST) return env.PRAESENTATION_HOST;
  const privat = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;
  for (const liste of Object.values(schnittstellen)) {
    for (const a of liste ?? []) {
      if ((a.family === "IPv4" || a.family === 4) && !a.internal && privat.test(a.address)) return a.address;
    }
  }
  return "";
}

let aktiv = null; // { slug, token, bis, server, port, url, uhr }

export function praesentationStatus() {
  if (!aktiv) return { aktiv: false };
  return { aktiv: true, slug: aktiv.slug, url: aktiv.url, bis: new Date(aktiv.bis).toISOString(), port: aktiv.port };
}

function nichtDa(res) {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" });
  res.end("Diese Präsentation ist beendet oder die Adresse ist falsch.");
}

/** Liefert eine Datei nur, wenn sie wirklich unter `wurzel` liegt und erlaubt ist. */
function liefere(res, wurzel, rel, { head = false, range = "" } = {}) {
  const ziel = path.resolve(wurzel, `.${path.posix.normalize(`/${rel}`)}`);
  if (!ziel.startsWith(path.resolve(wurzel) + path.sep) && ziel !== path.resolve(wurzel)) return nichtDa(res);
  const datei = existsSync(ziel) && statSync(ziel).isDirectory() ? path.join(ziel, "index.html") : ziel;
  if (!existsSync(datei) || !ERLAUBT.has(path.extname(datei).toLowerCase())) return nichtDa(res);
  const inhalt = readFileSync(datei);
  const kopf = { "Content-Type": TYPEN[path.extname(datei).toLowerCase()], "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer", "Accept-Ranges": "bytes" };
  // Videos auf iOS brauchen Range-Anfragen.
  const bereich = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (bereich) {
    const start = bereich[1] ? Number(bereich[1]) : Math.max(0, inhalt.length - Number(bereich[2]));
    const ende = bereich[1] && bereich[2] ? Math.min(Number(bereich[2]), inhalt.length - 1) : inhalt.length - 1;
    res.writeHead(206, { ...kopf, "Content-Range": `bytes ${start}-${ende}/${inhalt.length}`, "Content-Length": ende - start + 1 });
    return res.end(head ? undefined : inhalt.subarray(start, ende + 1));
  }
  res.writeHead(200, { ...kopf, "Content-Length": inhalt.length });
  res.end(head ? undefined : inhalt);
}

export function praesentationsHandler({ leadsDir = LEADS_DIR, assetsDir = ASSETS_DIR } = {}) {
  return (req, res) => {
    if (!aktiv || Date.now() > aktiv.bis || !["GET", "HEAD"].includes(req.method)) return nichtDa(res);
    const pfad = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const optionen = { head: req.method === "HEAD", range: req.headers.range ?? "" };
    // Schriften der Demo (../../assets/fonts relativ zu /<token>/index.html).
    if (pfad.startsWith("/assets/fonts/")) return liefere(res, path.join(assetsDir, "fonts"), pfad.slice("/assets/fonts/".length), optionen);
    const praefix = `/${aktiv.token}/`;
    if (pfad === `/${aktiv.token}`) {
      res.writeHead(302, { Location: praefix });
      return res.end();
    }
    if (!pfad.startsWith(praefix)) return nichtDa(res);
    return liefere(res, path.join(leadsDir, aktiv.slug), pfad.slice(praefix.length), optionen);
  };
}

/**
 * Startet die Präsentation für genau einen Lead (eine laufende wird beendet).
 * Voraussetzung: Die Konzept-Demo ist lokal gebaut (v2/output/leads/<slug>/).
 */
export async function startePraesentation(slug, { dauerMin = STANDARD_DAUER_MIN, port = process.env.PRAESENTATION_PORT !== undefined ? Number(process.env.PRAESENTATION_PORT) : 3010, host = lanAdresse(), leadsDir = LEADS_DIR, assetsDir = ASSETS_DIR, binden = "0.0.0.0" } = {}) {
  if (!/^[a-z0-9-]+$/.test(String(slug))) throw new Error("Ungültiger Slug.");
  if (!existsSync(path.join(leadsDir, slug, "index.html"))) throw new Error("Zu diesem Lead ist noch keine Konzept-Demo lokal gebaut („Konzept-Demo lokal bauen“).");
  if (!host) throw new Error("Keine WLAN-Adresse gefunden. Ist der Rechner mit einem WLAN oder Hotspot verbunden? (Sonst PRAESENTATION_HOST setzen.)");
  await beendePraesentation();
  const server = createServer(praesentationsHandler({ leadsDir, assetsDir }));
  await new Promise((fertig, fehler) => {
    server.once("error", fehler);
    server.listen(port, binden, fertig);
  });
  const echterPort = server.address().port;
  const token = randomBytes(12).toString("base64url");
  const bis = Date.now() + Math.max(1, Number(dauerMin)) * 60_000;
  const uhr = setTimeout(() => { beendePraesentation(); }, bis - Date.now());
  uhr.unref?.();
  aktiv = { slug, token, bis, server, port: echterPort, url: `http://${host}:${echterPort}/${token}/`, uhr };
  return praesentationStatus();
}

export async function beendePraesentation() {
  if (!aktiv) return { aktiv: false };
  const { server, uhr } = aktiv;
  aktiv = null;
  clearTimeout(uhr);
  server.closeAllConnections?.();
  await new Promise((fertig) => server.close(() => fertig()));
  return { aktiv: false };
}

/** Darf der Dashboard-QR-Code auf diese Adresse zeigen? Nur die laufende Präsentation. */
export function istPraesentationsUrl(url) {
  return Boolean(aktiv) && typeof url === "string" && url.startsWith(aktiv.url);
}

// Direkt aufrufbar: npm run praesentation -- <slug> [minuten]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [slug, minuten] = process.argv.slice(2);
  if (!slug) {
    console.log("Aufruf: npm run praesentation -- <slug> [minuten]   (die Demo vorher lokal bauen)");
    process.exitCode = 1;
  } else {
    startePraesentation(slug, { dauerMin: minuten ? Number(minuten) : STANDARD_DAUER_MIN })
      .then(async (s) => {
        const QRCode = (await import("qrcode")).default;
        console.log(await QRCode.toString(s.url, { type: "terminal", small: true }));
        console.log(`Präsentation läuft: ${s.url}\nNur im selben WLAN/Hotspot erreichbar, endet ${new Date(s.bis).toLocaleTimeString("de-DE")} (Strg+C beendet sofort).`);
      })
      .catch((fehler) => {
        console.error(fehler.message);
        process.exitCode = 1;
      });
  }
}
