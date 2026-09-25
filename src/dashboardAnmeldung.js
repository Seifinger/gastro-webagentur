// Anmeldung für den Online-Betrieb des Dashboards (v2/DEMO-UMBAU.md, Teil 6).
//
// Aktiv, sobald DASHBOARD_PASSWORT_HASH gesetzt ist (Umgebungsvariable des
// Hosts, nie im Repo). Dann gilt für JEDE Route – Seiten, Lead-Daten,
// Vorschauen, Schreibaktionen –, dass eine gültige Sitzung nötig ist. Ohne
// die Variable bleibt der bisherige lokale Betrieb (DASHBOARD_TOKEN nur für
// schreibende Routen) unverändert.
//
//   Passwort   nur als scrypt-Hash (npm run dashboard:passwort erzeugt ihn)
//   Sitzung    zufällige ID im Speicher des Servers, Cookie HttpOnly,
//              SameSite=Strict, Secure (hinter HTTPS), 12 Stunden
//   CSRF       SameSite=Strict + Origin-/Referer-Prüfung für jede
//              schreibende Anfrage
//   Anmelden   höchstens 10 Fehlversuche je Adresse in 15 Minuten (Adresse
//              hinter einem Proxy nur mit VERTRAUTER_PROXY, anfrageSchutz.js)

import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { Bremse, clientAdresse } from "./anfrageSchutz.js";

export const SITZUNG_COOKIE = "dash_sitzung";
export const SITZUNG_DAUER_MS = 12 * 60 * 60 * 1000;
const VERSUCHE_MAX = 10;
const SCRYPT = { N: 16384, r: 8, p: 1 };

const sitzungen = new Map();
const fehlversuche = new Bremse({ fensterMs: 15 * 60 * 1000 });

export function anmeldungAktiv() {
  return Boolean(process.env.DASHBOARD_PASSWORT_HASH);
}

/** scrypt$N$r$p$salz$hash (Base64) – so steht es in DASHBOARD_PASSWORT_HASH. */
export function erzeugePasswortHash(passwort, salz = randomBytes(16)) {
  if (String(passwort).length < 12) throw new Error("Das Passwort muss mindestens 12 Zeichen haben.");
  const hash = scryptSync(String(passwort), salz, 32, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salz.toString("base64")}$${hash.toString("base64")}`;
}

export function pruefePasswort(passwort, gespeichert = process.env.DASHBOARD_PASSWORT_HASH || "") {
  const teile = gespeichert.split("$");
  if (teile.length !== 6 || teile[0] !== "scrypt") return false;
  const [, N, r, p, salz, hash] = teile;
  const erwartet = Buffer.from(hash, "base64");
  let ist;
  try {
    ist = scryptSync(String(passwort ?? ""), Buffer.from(salz, "base64"), erwartet.length, { N: Number(N), r: Number(r), p: Number(p) });
  } catch {
    return false;
  }
  return ist.length === erwartet.length && timingSafeEqual(ist, erwartet);
}

function cookieWert(req, name) {
  const treffer = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`).exec(req.headers.cookie ?? "");
  return treffer ? decodeURIComponent(treffer[1]) : null;
}

function istHttps(req) {
  if (process.env.DASHBOARD_COOKIE_SECURE === "0") return false;
  return req.socket?.encrypted || String(req.headers["x-forwarded-proto"] ?? "").split(",")[0].trim() === "https" || process.env.DASHBOARD_COOKIE_SECURE === "1";
}

export function gueltigeSitzung(req, jetzt = Date.now()) {
  const id = cookieWert(req, SITZUNG_COOKIE);
  const s = id ? sitzungen.get(id) : null;
  if (!s) return false;
  if (s.ablauf < jetzt) {
    sitzungen.delete(id);
    return false;
  }
  return true;
}

// Hinter Fly steht die echte Adresse in Fly-Client-IP – aber nur mit
// VERTRAUTER_PROXY=fly (fly.toml). Eine selbst geschriebene
// X-Forwarded-For-Zeile darf die Sperre nicht zurücksetzen.
function adresse(req) {
  return clientAdresse(req);
}

function zuVieleVersuche(req) {
  return fehlversuche.anzahl(adresse(req)) >= VERSUCHE_MAX;
}

/** Schreibende Anfragen nur von der eigenen Seite (gegen CSRF zusätzlich zu SameSite=Strict). */
export function gleicheHerkunft(req) {
  const quelle = req.headers.origin || req.headers.referer;
  if (!quelle) return false;
  try {
    return new URL(quelle).host === req.headers.host;
  } catch {
    return false;
  }
}

const SICHERHEITS_KOPF = {
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "Cache-Control": "no-store",
};

function anmeldeSeite(fehler = "") {
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Anmelden – Dashboard</title>
<style>body{font-family:system-ui,sans-serif;background:#f4f1ec;display:grid;place-items:center;min-height:100vh;margin:0}
form{background:#fff;padding:32px;border-radius:8px;max-width:340px;width:100%;box-shadow:0 1px 3px rgba(0,0,0,.1)}
label{display:block;font-weight:600;margin:0 0 6px}input{width:100%;box-sizing:border-box;padding:10px;font:inherit;margin:0 0 16px}
button{width:100%;padding:10px;font:inherit;font-weight:600;background:#2a211a;color:#fff;border:0;border-radius:4px;cursor:pointer}
.fehler{color:#8a2416;margin:0 0 12px}</style></head>
<body><form method="post" action="/anmelden"><h1>Dashboard</h1>${fehler ? `<p class="fehler">${fehler}</p>` : ""}
<label for="passwort">Passwort</label><input type="password" id="passwort" name="passwort" autocomplete="current-password" required autofocus>
<button type="submit">Anmelden</button></form></body></html>`;
}

function leseForm(req) {
  return new Promise((resolve, reject) => {
    let roh = "";
    req.on("data", (t) => {
      roh += t;
      if (roh.length > 4000) reject(new Error("zu groß"));
    });
    req.on("end", () => resolve(new URLSearchParams(roh)));
    req.on("error", reject);
  });
}

/**
 * Vorgeschaltet vor jeden Dashboard-Handler. Liefert true, wenn die Anfrage
 * hier beantwortet wurde (Anmeldung, Abmeldung, Ablehnung).
 */
export async function anmeldungPruefen(req, res, pathname) {
  if (!anmeldungAktiv()) return false;
  for (const [k, v] of Object.entries(SICHERHEITS_KOPF)) res.setHeader(k, v);

  if (pathname === "/gesund") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok");
    return true;
  }

  if (pathname === "/anmelden") {
    if (req.method === "POST") {
      if (!gleicheHerkunft(req)) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Anmeldung nur über die Anmeldeseite.");
        return true;
      }
      if (zuVieleVersuche(req)) {
        res.writeHead(429, { "Content-Type": "text/html; charset=utf-8" });
        res.end(anmeldeSeite("Zu viele Fehlversuche. Bitte 15 Minuten warten."));
        return true;
      }
      const form = await leseForm(req).catch(() => new URLSearchParams());
      if (!pruefePasswort(form.get("passwort"))) {
        fehlversuche.zaehle(adresse(req));
        res.writeHead(401, { "Content-Type": "text/html; charset=utf-8" });
        res.end(anmeldeSeite("Passwort falsch."));
        return true;
      }
      const id = randomBytes(32).toString("base64url");
      sitzungen.set(id, { ablauf: Date.now() + SITZUNG_DAUER_MS });
      const secure = istHttps(req) ? "; Secure" : "";
      res.writeHead(303, { Location: "/", "Set-Cookie": `${SITZUNG_COOKIE}=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SITZUNG_DAUER_MS / 1000}${secure}` });
      res.end();
      return true;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(anmeldeSeite());
    return true;
  }

  if (pathname === "/abmelden" && req.method === "POST") {
    const id = cookieWert(req, SITZUNG_COOKIE);
    if (id && gleicheHerkunft(req)) sitzungen.delete(id);
    res.writeHead(303, { Location: "/anmelden", "Set-Cookie": `${SITZUNG_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0` });
    res.end();
    return true;
  }

  if (!gueltigeSitzung(req)) {
    const willSeite = req.method === "GET" && (req.headers.accept ?? "").includes("text/html");
    if (willSeite) {
      res.writeHead(303, { Location: "/anmelden" });
      res.end();
    } else {
      res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, fehler: "Nicht angemeldet." }));
    }
    return true;
  }

  if (!["GET", "HEAD"].includes(req.method) && !gleicheHerkunft(req)) {
    res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, fehler: "Anfrage von fremder Herkunft abgelehnt." }));
    return true;
  }
  return false;
}

export function _zuruecksetzenFuerTests() {
  sitzungen.clear();
  fehlversuche.leeren();
}
