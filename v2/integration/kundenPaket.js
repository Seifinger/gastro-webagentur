// Veröffentlichungspaket einer FREIGEGEBENEN Kundenfassung – für einen
// statischen Host (z. B. Cloudflare Pages) und die getrennte Wirt-App.
//
//   npm run kunde -- paket --kunde k-… [--noindex]
//
// Ergebnis unter v2/output/pakete/<k-id>/ (gitignoriert, nie docs/):
//   site/                  genau das, was auf den statischen Host kommt:
//                          index.html, speisekarte/, medien/, assets/fonts/, _headers
//   wirt-uebergabe.json    Karte, Öffnungszeiten, Kontakt für die Wirt-App
//                          (POST /intern/uebergabe bzw. scripts/wirtUebergabe.mjs)
//   intern/                Baubericht und Prüfprotokoll – NICHT hochladen
//
// Hochgeladen wird hier nichts. Die Seite nennt die öffentliche Adresse der
// Wirt-App (Feld apiUrl) und fragt dort live Abholzeiten, Preise, Rechtstexte
// ab; die Wirt-App muss die Domain der Seite in WIRT_ERLAUBTE_ORIGINS führen.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { ladeProjekt, stufen, inhaltHash, KUNDEN_DIR } from "../../src/kundenProjekt.js";
import { verpackeUebergabe } from "../../src/wirtUebergabe.js";
import { kundenBauParameter, bestellkatalog, bestellProdukte } from "./kundenBau.js";
import { OUTPUT_DIR, FONTS_DIR } from "../build/siteBuilder.js";

export const PAKETE_DIR = path.join(OUTPUT_DIR, "pakete");

function alleDateien(ordner) {
  return readdirSync(ordner, { withFileTypes: true }).flatMap((e) => {
    const voll = path.join(ordner, e.name);
    return e.isDirectory() ? alleDateien(voll) : [voll];
  });
}

function sha256(datei) {
  return createHash("sha256").update(readFileSync(datei)).digest("hex");
}

/** Sicherheitsköpfe für Cloudflare Pages (_headers). connect-src nur zur eigenen Wirt-App. */
export function headersDatei({ apiUrl, noindex }) {
  const api = new URL(apiUrl).origin;
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "media-src 'self'",
    "font-src 'self'",
    `connect-src ${api}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  return `/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000
${noindex ? "  X-Robots-Tag: noindex, nofollow\n" : ""}`;
}

/**
 * Prüft das gebaute Paket: Seiten vorhanden, alle lokalen Verweise auflösbar,
 * richtige Wirt-Adresse, keine Demo-/Konzept-Spuren, keine Agentur-Pfade.
 */
export function pruefePaket(siteDir, { apiUrl }) {
  const fehler = [];
  const seiten = ["index.html", "speisekarte/index.html"];
  for (const s of seiten) if (!existsSync(path.join(siteDir, s))) fehler.push(`${s} fehlt`);
  for (const datei of alleDateien(siteDir).filter((d) => d.endsWith(".html"))) {
    const rel = path.relative(siteDir, datei);
    const html = readFileSync(datei, "utf-8");
    const pd = /window\.PAGE_DATA = (\{.*?\});<\/script>/s.exec(html);
    if (!pd) fehler.push(`${rel}: PAGE_DATA fehlt`);
    else if (JSON.parse(pd[1]).apiUrl !== apiUrl.replace(/\/+$/, "")) fehler.push(`${rel}: falsche Wirt-Adresse ${JSON.parse(pd[1]).apiUrl}`);
    // Sichtbarer Inhalt (Body ohne Skripte) und Kopf getrennt: CSS-Klassennamen zählen nicht.
    const body = html.replace(/^[\s\S]*?<body/, "<body").replace(/<script>[\s\S]*?<\/script>/g, "");
    const kopf = html.slice(0, html.indexOf("<style>") === -1 ? html.indexOf("<body") : html.indexOf("<style>"));
    for (const [muster, text, grund] of [
      [/class="entwurf-hinweis|Konzept-Demo|Beispielseite|frei erfunden|Platzhalter/, body, "Demo- oder Konzept-Hinweis"],
      [/name="demo-art"|name="robots" content="noindex/, kopf, "Demo-Kennzeichnung im Kopf"],
      [/\/intern\/|lead-edits|data\/kunden|bearbeiten\.html|v2\/output/, body + kopf, "Agentur-Pfad"],
    ]) if (muster.test(text)) fehler.push(`${rel}: ${grund}`);
    // Alle lokalen Verweise (src, href, url()) müssen im Paket liegen.
    const verweise = [...html.matchAll(/(?:src|href)="([^"#?]+)[^"]*"|url\((['"]?)([^'")]+)\2\)/g)].map((m) => m[1] ?? m[3]);
    for (const v of verweise) {
      if (!v || /^(?:[a-z]+:|\/\/|#|data:)/i.test(v)) continue;
      if (v.startsWith("/")) {
        fehler.push(`${rel}: absoluter Pfad ${v}`);
        continue;
      }
      const ziel = path.join(path.dirname(datei), decodeURI(v));
      const kandidat = existsSync(ziel) && statSync(ziel).isDirectory() ? path.join(ziel, "index.html") : ziel;
      if (!existsSync(kandidat)) fehler.push(`${rel}: Verweis ${v} fehlt im Paket`);
    }
    if (/rechtstexte/.test(html) && !html.includes(`${apiUrl.replace(/\/+$/, "")}/rechtstexte/`)) fehler.push(`${rel}: Rechtstext-Links zeigen nicht auf die Wirt-App`);
  }
  return fehler;
}

/**
 * Baut das Paket. Nur für eine freigegebene Fassung, deren Freigabe zum
 * aktuellen Inhalt passt; die Wirt-Adresse muss HTTPS sein (lokal: 127.0.0.1).
 */
export async function erstellePaket(id, { basis = KUNDEN_DIR, zielDir = PAKETE_DIR, noindex = false, jetzt = new Date() } = {}) {
  const projekt = ladeProjekt(id, basis);
  const s = stufen(projekt);
  if (!s.freigegeben.erreicht) throw new Error(s.freigegeben.veraltet ? "Die Freigabe passt nicht mehr zum aktuellen Inhalt – erst neu bauen und freigeben." : "Die Kundenfassung ist noch nicht freigegeben.");
  const apiUrl = String(projekt.felder.apiUrl?.wert ?? "").replace(/\/+$/, "");
  const slug = projekt.felder.betriebSlug?.wert;
  if (!projekt.bestellung.aktiv) throw new Error("Online-Bestellung ist aus – das Paket ist für den Pilot mit Bestellweg gedacht.");
  if (!slug) throw new Error("Kein Wirt-Betrieb (Kürzel) eingetragen.");
  if (!/^https:\/\//.test(apiUrl) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(apiUrl)) throw new Error("Die Adresse des Bestellservers muss mit https:// beginnen.");

  const paketDir = path.join(zielDir, id);
  rmSync(paketDir, { recursive: true, force: true });
  mkdirSync(path.join(paketDir, "intern"), { recursive: true });
  const p = kundenBauParameter(projekt, { basis, fontsPfad: "assets/fonts" });
  const { baueImZyklus } = await import("../build/zyklus.js");
  await baueImZyklus({ ...p, judge: false, offline: true, zielDir: paketDir, slug: "site" });
  const siteDir = path.join(paketDir, "site");

  // Interne Berichte gehören nicht auf den öffentlichen Host.
  for (const name of ["bericht.json", "zyklus.json"]) {
    if (existsSync(path.join(siteDir, name))) renameSync(path.join(siteDir, name), path.join(paketDir, "intern", name));
  }
  // Schriften: genau die, auf die die Seiten verweisen.
  const schriften = new Set();
  for (const datei of alleDateien(siteDir).filter((d) => d.endsWith(".html"))) {
    for (const m of readFileSync(datei, "utf-8").matchAll(/url\((['"]?)(?:\.\.\/)?assets\/fonts\/([^'")]+)\1\)/g)) schriften.add(m[2]);
  }
  mkdirSync(path.join(siteDir, "assets", "fonts"), { recursive: true });
  for (const f of schriften) {
    const quelle = path.join(FONTS_DIR, f);
    if (!existsSync(quelle)) throw new Error(`Schrift ${f} fehlt lokal (v2/output/assets/fonts) – einmal online bauen.`);
    copyFileSync(quelle, path.join(siteDir, "assets", "fonts", f));
  }
  writeFileSync(path.join(siteDir, "_headers"), headersDatei({ apiUrl, noindex }));

  const fehler = pruefePaket(siteDir, { apiUrl });
  const uebergabe = verpackeUebergabe({
    betrieb: slug,
    kunde: projekt.id,
    inhaltHash: inhaltHash(projekt),
    freigabe: projekt.freigabe,
    bestellkarte: { katalog: bestellkatalog(projekt), produkte: bestellProdukte(projekt) },
    oeffnungszeiten: projekt.oeffnungszeiten.wert,
    gastKontakt: { anzeigeName: projekt.felder.name.wert, telefon: projekt.felder.telefon.wert },
    design: { kueche: projekt.design.kueche, stimmung: projekt.design.farbschema },
    jetzt,
  });
  writeFileSync(path.join(paketDir, "wirt-uebergabe.json"), `${JSON.stringify(uebergabe, null, 2)}\n`);
  let commit = "";
  try {
    commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).trim();
  } catch {
    commit = "";
  }
  const protokoll = {
    kunde: projekt.id,
    betrieb: slug,
    apiUrl,
    inhaltHash: inhaltHash(projekt),
    freigabe: projekt.freigabe,
    commit,
    erstellt: new Date(jetzt).toISOString(),
    noindex,
    dateien: alleDateien(siteDir).map((d) => ({ pfad: path.relative(siteDir, d), bytes: statSync(d).size, sha256: sha256(d) })),
    fehler,
  };
  writeFileSync(path.join(paketDir, "intern", "paket.json"), `${JSON.stringify(protokoll, null, 2)}\n`);
  if (fehler.length) throw new Error(`Paketprüfung fehlgeschlagen: ${fehler.slice(0, 5).join("; ")}`);
  return { paketDir, siteDir, uebergabe, protokoll };
}
