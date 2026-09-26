import { createServer } from "node:http";
import { timingSafeEqual, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { dashboardHost } from "./config.js";
import {
  ladeBetrieb,
  legeTischAn,
  entferneTisch,
  legeReservierungAn,
  setzeReservierungStatus,
  weiseTischZu,
  legeBestellungAn,
  bestaetigeBestellung,
  setzeBestellungStatus,
  freiePlaetze,
  gesamtPlaetze,
  tischKonflikte,
  tischVerteilung,
  setzeWartezeit,
  fuegePushSubscriptionHinzu,
  setzeTelegramChatId,
  setzeWartezeitLernenAktiv,
  setzeNoShowSchutz,
  setzeBankverbindung,
  storniereBestellung,
  bestaetigeNoShow,
  abholEinstellungen,
  uhrHook,
  verschiebeReservierung,
  findeUeberGastToken,
  widerrufeGastZugang,
  setzeGastKontakt,
  betriebsKontakt,
  setzeDemoBetrieb,
  legeRechtsdokumentEntwurfAn,
  bearbeiteRechtsdokument,
  kopiereRechtsdokument,
  gibRechtsdokumentFrei,
  zieheRechtsdokumentZurueck,
  loescheRechtsdokumentEntwurf,
  rechtsdokumentFassung,
  setzeReservierungsNoShow,
  setzeLaunchVermerk,
  setzeEmpfehlungen,
  empfehlungsEinstellungen,
  empfehlungsProdukteDesBetriebs,
  oeffentlicheEmpfehlungen,
  empfehlungsStatistik,
  erkannteProduktRolle,
} from "./betriebStore.js";
import { waehle as waehleEmpfehlungen, pruefeEmpfehlungsRegeln, ROLLEN_ANZEIGE } from "./empfehlungen.js";
import {
  DOKUMENT_ARTEN,
  gueltigeFassung,
  oeffentlicheRechtslage,
  noShowBestellungAktiv,
  noShowReservierungAktiv,
  launchPruefung,
  rechtstextSeite,
  freigabeHindernisse,
} from "./rechtstexte.js";
import { zeitraum, auswertung, heuteAnstehend, anfragenJe100Aufrufe, ZEITZONE_STANDARD } from "./statistik.js";
import { seitenaufrufe } from "./seitenaufrufe.js";
import { benachrichtigeBetrieb, oeffentlicherVapidSchluessel } from "./pushNotify.js";
import { benachrichtigeUeberTelegram } from "./telegramNotify.js";
import { darfJetztMelden, rueckkanalText, telegramStand, telegramHinweis, setzeTelegramEinstellungen } from "./telegramRegeln.js";
import {
  versendeRechnung,
  stelleGastMeldungenZu,
  versucheGastMeldungErneut,
  gastEmailEinrichtung,
} from "./kundenBenachrichtigung.js";
import { statusFuerGast, wirtGastHinweis, gastPhase, titelFuer } from "./gastStatus.js";
import { beobachteAbholung, lernUebersicht } from "./wartezeitLernStore.js";
import { vermerkeNoShow, warnhinweisNoetig } from "./zuverlaessigkeitStore.js";
import { erzeugeNoShowRechnung } from "./rechnungGenerator.js";
import { Bremse, clientAdresse, direktLokal, fremdeHerkunft } from "./anfrageSchutz.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seite = path.join(__dirname, "..", "public", "wirt.html");
const serviceWorker = path.join(__dirname, "..", "public", "sw.js");
const statusSeite = path.join(__dirname, "..", "public", "status.html");

const VERZOEGERUNG = /^\/intern\/bestellung\/([^/]+)\/verzoegerung$/;
const STORNIEREN = /^\/oeffentlich\/bestellung\/([^/]+)\/stornieren$/;
const NO_SHOW = /^\/intern\/bestellung\/([^/]+)\/no-show$/;
const RECHTSTEXT = /^\/rechtstexte\/([a-z-]+)(?:\/(v\d+))?(\.txt)?$/;

function parseFlag(argv, name, standard) {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : standard;
}

const argv = process.argv.slice(2);
const slug = parseFlag(argv, "--betrieb", process.env.BETRIEB || "mein-lokal");
// Bewusst nicht PORT: das gehört dem persönlichen Dashboard auf 3000.
const port = Number(parseFlag(argv, "--port", process.env.WIRT_PORT || 3200));
// Präsentation/Probelauf: keine Status-Links, keine Gast-E-Mails. Die Wahl
// wird am Betrieb gespeichert und gilt bis --kein-demo.
if (argv.includes("--demo")) setzeDemoBetrieb(slug, true);
if (argv.includes("--kein-demo")) setzeDemoBetrieb(slug, false);

/**
 * Die öffentlichen Endpunkte nimmt jeder Gast an, der die Seite offen hat.
 * Eine einfache Bremse je Adresse verhindert, dass jemand die Datei mit
 * tausenden Reservierungen vollschreibt. Die Adresse kommt aus
 * clientAdresse() – hinter einem Proxy nur mit VERTRAUTER_PROXY, sonst
 * teilen sich alle Gäste die Adresse des Proxys (anfrageSchutz.js).
 */
const BREMSE_MAX = 20;
const zugriffe = new Bremse({ fensterMs: 60_000 });

// Lesende Abrufe (Abholzeiten, Rechtstexte, Verfügbarkeit …) macht jede
// Seite beim Laden – mehrere Gäste im selben WLAN teilen sich eine Adresse.
// Sie bekommen deshalb eine großzügige eigene Grenze; streng bleibt die
// Bremse für alles, was etwas anlegt oder ändert.
const BREMSE_MAX_LESEN = 240;
const lesezugriffe = new Bremse({ fensterMs: 60_000 });

function zuSchnell(adresse, { lesend = false } = {}) {
  return lesend ? lesezugriffe.zaehle(adresse) > BREMSE_MAX_LESEN : zugriffe.zaehle(adresse) > BREMSE_MAX;
}

const LESENDE_PFADE = new Set(["/oeffentlich/abholzeiten", "/oeffentlich/rechtstexte", "/oeffentlich/no-show-einstellungen", "/oeffentlich/verfuegbarkeit", "/oeffentlich/empfehlungen"]);

// Falsche Status-Links: eigene, strengere Bremse gegen Durchprobieren.
const FEHLVERSUCHE_MAX = 10;
const fehlversuche = new Bremse({ fensterMs: 10 * 60_000 });

function zuVieleFehlversuche(adresse, neu = false) {
  return (neu ? fehlversuche.zaehle(adresse) : fehlversuche.anzahl(adresse)) >= FEHLVERSUCHE_MAX;
}

// Falsches WIRT_PASSWORT: höchstens 10 Versuche je Adresse in 15 Minuten.
const ANMELDEVERSUCHE_MAX = 10;
const anmeldeFehler = new Bremse({ fensterMs: 15 * 60_000 });

/** Für Tests: alle Bremsen leeren (sie gelten je Adresse, im Test immer 127.0.0.1). */
export function setzeBremsenZurueck() {
  zugriffe.leeren();
  lesezugriffe.leeren();
  fehlversuche.leeren();
  anmeldeFehler.leeren();
}

// Statusseite und -antwort: nie zwischenspeichern, nie als Referrer
// weitergeben, nie in Suchmaschinen.
const PRIVAT = {
  "Cache-Control": "no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
};

function json(res, status, daten, extra = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...extra,
  });
  res.end(JSON.stringify(daten));
}

// Die Landingpage liegt auf einer anderen Adresse als dieser Server, deshalb
// müssen die öffentlichen Endpunkte den Zugriff ausdrücklich erlauben.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function koerper(req) {
  return new Promise((resolve, reject) => {
    let roh = "";
    req.on("data", (teil) => {
      roh += teil;
      if (roh.length > 20_000) reject(new Error("Anfrage zu groß"));
    });
    req.on("end", () => {
      try {
        resolve(roh ? JSON.parse(roh) : {});
      } catch {
        reject(new Error("Ungültige Daten"));
      }
    });
    req.on("error", reject);
  });
}

function gastHinweisFuer(art, id) {
  const daten = ladeBetrieb(slug);
  const eintrag = (art === "reservierung" ? daten.reservierungen : daten.bestellungen).find((e) => e.id === id);
  return eintrag ? wirtGastHinweis(art, eintrag, daten.gastMeldungen ?? []) : null;
}

/**
 * Telegram-Rückkanal (v1, reiner Text): nur in den Telegram-Zeiten des
 * Betriebs, nur an den konfigurierten gemeinsamen Chat und ohne Gastdaten
 * (src/telegramRegeln.js). Nachmelden und Erinnerungen macht der v2-Bot.
 */
async function telegramRueckkanal(art, eintrag) {
  const daten = ladeBetrieb(slug);
  const erlaubt = darfJetztMelden(daten, art, uhrHook.jetzt());
  if (!erlaubt.ok || erlaubt.ziel.bot !== "standard") return;
  await benachrichtigeUeberTelegram(erlaubt.ziel.chatId, rueckkanalText(art, eintrag, daten, slug));
}

function uebersicht() {
  const daten = ladeBetrieb(slug);
  const heute = new Date().toISOString().slice(0, 10);

  // Kein automatischer Filter, nur ein Hinweis fürs Dashboard – die
  // Entscheidung, eine Bestellung trotzdem anzunehmen, bleibt beim Wirt.
  const meldungen = daten.gastMeldungen ?? [];
  const bestellungenMitHinweis = daten.bestellungen.map((b) => ({
    ...b,
    unzuverlaessig: b.telefon
      ? warnhinweisNoetig(slug, b.telefon, daten.noShowWarnSchwelle ?? 2)
      : false,
    gast: wirtGastHinweis("bestellung", b, meldungen),
  }));
  const reservierungenMitHinweis = daten.reservierungen.map((r) => ({ ...r, gast: wirtGastHinweis("reservierung", r, meldungen) }));

  return {
    betrieb: slug,
    tische: daten.tische,
    plaetzeGesamt: gesamtPlaetze(daten),
    reservierungen: reservierungenMitHinweis.sort(
      (a, b) => `${a.datum}${a.uhrzeit}`.localeCompare(`${b.datum}${b.uhrzeit}`),
    ),
    bestellungen: bestellungenMitHinweis.sort((a, b) => b.eingegangen.localeCompare(a.eingegangen)),
    offeneReservierungen: daten.reservierungen.filter((r) => r.status === "neu").length,
    offeneBestellungen: daten.bestellungen.filter((b) => b.status === "neu").length,
    // Zeitpunkte, an denen die Plätze zwar reichen, die Tische aber nicht.
    tischKonflikte: tischKonflikte(daten),
    zusaetzlicheWartezeitMinuten: daten.zusaetzlicheWartezeitMinuten ?? 0,
    telegramChatId: daten.telegramChatId ?? "",
    // Ein Satz, wenn Telegram eingerichtet ist, aber gerade nicht melden kann.
    telegramHinweis: telegramHinweis(daten, uhrHook.jetzt()),
    wartezeitLernenAktiv: Boolean(daten.wartezeitLernenAktiv),
    noShowSchutzAktiv: Boolean(daten.noShowSchutzAktiv),
    noShowGebuehrBetrag: daten.noShowGebuehrBetrag ?? 0,
    noShowStornofensterMinuten: daten.noShowStornofensterMinuten ?? 30,
    noShowWarnSchwelle: daten.noShowWarnSchwelle ?? 2,
    bankverbindung: daten.bankverbindung ?? "",
    gastKontakt: { anzeigeName: daten.anzeigeName ?? "", telefon: daten.telefon ?? "" },
    // Wirkt der No-Show-Schutz wirklich? Nur mit gültiger freigegebener Regel.
    noShowRegel: noShowBestellungAktiv(daten, uhrHook.jetzt())?.version ?? "",
    noShowFreigegebeneRegel: gueltigeFassung(daten.rechtsdokumente, "noshow-bestellung", uhrHook.jetzt())?.version ?? "",
    reservierungNoShowAktiv: Boolean(noShowReservierungAktiv(daten, uhrHook.jetzt())),
    gastEmail: gastEmailEinrichtung(),
    demoBetrieb: Boolean(daten.demoBetrieb),
    heute,
    zeitzone: daten.zeitzone || ZEITZONE_STANDARD,
    jetztIso: new Date().toISOString(),
  };
}

/**
 * Schutz für Dashboard und Wirt-Aktionen: Ist WIRT_PASSWORT gesetzt,
 * verlangt alles außer den öffentlichen Gast-Routen (/oeffentlich/, /status,
 * /rechtstexte/) eine Anmeldung per HTTP-Basic (Benutzername beliebig).
 */
export const WIRT_PASSWORT_MIN = 12;

export function wirtZugangErlaubt(req) {
  const passwort = String(process.env.WIRT_PASSWORT ?? "");
  if (!passwort) return direktLokal(req) && !oeffentlicherBetrieb();
  const kopf = String(req.headers.authorization ?? "");
  if (!kopf.startsWith("Basic ")) return false;
  const roh = Buffer.from(kopf.slice(6), "base64").toString("utf-8");
  const angegeben = roh.slice(roh.indexOf(":") + 1);
  const a = createHash("sha256").update(angegeben).digest();
  const b = createHash("sha256").update(passwort).digest();
  return timingSafeEqual(a, b);
}

/**
 * Öffentlicher Betrieb: eine öffentliche Adresse ist eingetragen oder der
 * Prozess läuft als Produktion. Dann gibt es ohne Passwort gar keinen
 * internen Zugang – auch nicht von 127.0.0.1, denn davor kann ein Proxy
 * sitzen, der keine Weiterleitungs-Köpfe setzt.
 */
function oeffentlicherBetrieb() {
  return Boolean(process.env.WIRT_OEFFENTLICHE_URL) || process.env.NODE_ENV === "production";
}

export function istOeffentlicheRoute(pathname, method) {
  return method === "OPTIONS" || pathname.startsWith("/oeffentlich/") || pathname === "/status" || pathname === "/sw.js" || pathname.startsWith("/rechtstexte/");
}

export function verweigereZugang(res) {
  res.writeHead(401, { "WWW-Authenticate": 'Basic realm="Wirt-Dashboard", charset="UTF-8"', "Content-Type": "text/plain; charset=utf-8" });
  res.end("Anmeldung erforderlich");
}

// Dashboard und seine Daten: nie in fremde Seiten einbetten (Klick-Fallen),
// nie zwischenspeichern (Gastdaten auf geteilten Geräten).
const INTERN_KOEPFE = {
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "Cache-Control": "no-store",
};

function erlaubteHosts() {
  try {
    return [new URL(process.env.WIRT_OEFFENTLICHE_URL ?? "").host];
  } catch {
    return [];
  }
}

/**
 * Prüft jede nicht öffentliche Anfrage (v1 und die v2-Hülle): Zugang,
 * Fehlversuche, Herkunft. Beantwortet eine Ablehnung selbst und liefert dann
 * false.
 */
export function pruefeWirtZugang(req, res) {
  for (const [k, v] of Object.entries(INTERN_KOEPFE)) res.setHeader(k, v);

  if (!process.env.WIRT_PASSWORT) {
    if (!wirtZugangErlaubt(req)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`Das Wirt-Dashboard ist ohne WIRT_PASSWORT nur direkt auf diesem Rechner (http://localhost) erreichbar. Für den Betrieb im Netz WIRT_PASSWORT setzen (mindestens ${WIRT_PASSWORT_MIN} Zeichen).`);
      return false;
    }
  } else {
    const adresse = clientAdresse(req);
    if (anmeldeFehler.anzahl(adresse) >= ANMELDEVERSUCHE_MAX) {
      res.writeHead(429, { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "900" });
      res.end("Zu viele falsche Anmeldungen. Bitte 15 Minuten warten.");
      return false;
    }
    if (!wirtZugangErlaubt(req)) {
      // Ohne Kopf fragt der Browser erst nach dem Passwort – das ist kein Fehlversuch.
      if (req.headers.authorization) anmeldeFehler.zaehle(adresse);
      verweigereZugang(res);
      return false;
    }
  }

  // Der Browser schickt die Basic-Anmeldung auch mit, wenn eine fremde Seite
  // ein Formular hierher abschickt. Schreibende Wirt-Aktionen deshalb nur
  // von der eigenen Seite.
  if (!["GET", "HEAD"].includes(req.method) && fremdeHerkunft(req, erlaubteHosts())) {
    res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, fehler: "Anfrage von fremder Seite abgelehnt." }));
    return false;
  }
  return true;
}

/**
 * Was der Gast direkt nach dem Absenden zurückbekommt: Referenz, Status
 * „eingegangen“ und – falls vorhanden – der Token für seinen Status-Link.
 * Den Link baut die Seite aus ihrer apiUrl zusammen (…/status#TOKEN); der
 * Token steht damit nur im Fragment und erreicht keine Server-Logs.
 */
function gastAntwort(art, eintrag) {
  // Was mit der Eingangsmail tatsächlich passiert ist – die Seite sagt dem
  // Gast nur „schicken wir“, wenn sie dem Versanddienst übergeben wurde.
  const eingang = (ladeBetrieb(slug).gastMeldungen ?? []).filter((m) => m.bezugId === eintrag.id).at(-1);
  const zustand = eingang?.versand?.zustand ?? "";
  return {
    emailVersand: zustand === "uebergeben" && eingang.versand.kanal === "email" ? "aktiv" : zustand === "fehlgeschlagen" ? "fehlgeschlagen" : zustand === "nicht-eingerichtet" ? "nicht-eingerichtet" : "",
    nummer: eintrag.nummer,
    status: gastPhase(art, eintrag),
    statusText: titelFuer(art, gastPhase(art, eintrag)),
    statusToken: eintrag.gastToken || "",
    rueckfrageTelefon: betriebsKontakt(slug).telefon,
  };
}

// Als eigene Funktion exportiert, damit Tests einen Server auf einem
// zufälligen Port starten können, statt den festen Port aus argv/env zu
// belegen – siehe dashboardServer.js für dasselbe Muster. Ein Fehler in einer
// einzelnen Anfrage darf den Server nie beenden – sonst reicht eine kaputte
// Adresse (z. B. "//["), und keine Reservierung kommt mehr an, bis jemand
// neu startet.
export const handler = async (req, res) => {
  try {
    await routen(req, res);
  } catch (fehler) {
    console.error(`Fehler bei ${req.method} ${String(req.url).slice(0, 200)}: ${fehler.message}`);
    // Beschädigte Betriebsdatei: ehrlich „gerade nicht möglich“, nie still leer.
    const beschaedigt = fehler.code === "BETRIEBSDATEN_BESCHAEDIGT";
    if (!res.headersSent) json(res, beschaedigt ? 503 : 400, { ok: false, fehler: beschaedigt ? fehler.message : "Ungültige Anfrage." }, beschaedigt ? CORS : {});
    else res.end();
  }
};

const routen = async (req, res) => {
  // Fester Basiswert: Pfad und Parameter hängen nicht vom Host-Kopf ab.
  const { pathname, searchParams } = new URL(req.url, "http://localhost");

  if (!istOeffentlicheRoute(pathname, req.method) && !pruefeWirtZugang(req, res)) return;

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  if (pathname === "/" || pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(readFileSync(seite, "utf-8"));
    return;
  }

  // Ohne Auslieferung von der Wurzel aus reicht der Geltungsbereich des
  // Service Workers nicht bis zu den Push-Registrierungen von wirt.html.
  // Die persönliche Statusseite. Der Token steht im Fragment (#…) und wird
  // vom Skript der Seite per POST an /oeffentlich/status geschickt.
  if (pathname === "/status" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      ...PRIVAT,
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    });
    res.end(readFileSync(statusSeite, "utf-8"));
    return;
  }

  // Rechtstexte des Restaurants: nur freigegebene Fassungen, nie Entwürfe.
  const rechtstext = req.method === "GET" ? RECHTSTEXT.exec(pathname) : null;
  if (rechtstext) {
    const [, pfad, version, txt] = rechtstext;
    const art = Object.keys(DOKUMENT_ARTEN).find((a) => DOKUMENT_ARTEN[a].pfad === pfad);
    const daten = ladeBetrieb(slug);
    const aktuell = art ? gueltigeFassung(daten.rechtsdokumente, art, uhrHook.jetzt()) : null;
    const dok = art ? (version ? rechtsdokumentFassung(daten, art, version) : aktuell) : null;
    const kopf = { "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
    if (!art || (version && !dok)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", ...kopf });
      res.end("Nicht gefunden");
      return;
    }
    if (txt) {
      if (!dok) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", ...kopf });
        res.end("Noch keine freigegebene Fassung");
        return;
      }
      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${pfad}-${dok.version}.txt"`,
        ...kopf,
      });
      res.end(`${dok.titel}\n${betriebsKontakt(slug, daten).name} · Fassung ${dok.version} · gültig ab ${dok.gueltigAb}\n\n${dok.inhalt}${dok.zustimmungstext ? `\n\nBestätigungstext: ${dok.zustimmungstext}` : ""}\n\nSHA-256: ${dok.inhaltHash}\n`);
      return;
    }
    res.writeHead(dok || !version ? 200 : 404, { "Content-Type": "text/html; charset=utf-8", ...kopf, "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" });
    res.end(rechtstextSeite({
      art,
      dok,
      betriebName: betriebsKontakt(slug, daten).name,
      aktuell: !dok || dok === aktuell,
      txtPfad: dok ? `/rechtstexte/${pfad}/${dok.version}.txt` : "",
    }));
    return;
  }

  if (pathname === "/sw.js") {
    res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
    res.end(readFileSync(serviceWorker, "utf-8"));
    return;
  }

  /* ----- Öffentlich: was von der Landingpage hereinkommt ----- */

  if (pathname.startsWith("/oeffentlich/") && req.method === "POST") {
    const adresse = clientAdresse(req);
    if (zuSchnell(adresse, { lesend: LESENDE_PFADE.has(pathname) })) {
      json(res, 429, { ok: false, fehler: "Zu viele Anfragen. Bitte kurz warten." }, CORS);
      return;
    }

    try {
      const daten = await koerper(req);

      if (pathname === "/oeffentlich/status") {
        if (zuVieleFehlversuche(adresse)) {
          json(res, 429, { ok: false, fehler: "Zu viele ungültige Aufrufe. Bitte später erneut versuchen." }, { ...CORS, ...PRIVAT });
          return;
        }
        const treffer = findeUeberGastToken(slug, String(daten.token ?? ""));
        if (!treffer) {
          zuVieleFehlversuche(adresse, true);
          json(res, 404, { ok: false, fehler: "Dieser Status-Link ist ungültig oder abgelaufen." }, { ...CORS, ...PRIVAT });
          return;
        }
        const { art, eintrag, daten: stand } = treffer;
        const letzte = (stand.gastMeldungen ?? []).filter((m) => m.bezugId === eintrag.id).at(-1);
        const status = statusFuerGast(art, eintrag, {
          betrieb: betriebsKontakt(slug, stand),
          letzteAenderung: letzte?.erstellt ?? eintrag.eingegangen,
          zeitzone: stand.zeitzone,
        });
        json(res, 200, { ok: true, status }, { ...CORS, ...PRIVAT });
        return;
      }

      if (pathname === "/oeffentlich/reservierung") {
        const r = legeReservierungAn(slug, daten, "online");
        // Von Hand eingetragene Reservierungen (quelle "manuell") lösen
        // bewusst keinen Push/Telegram aus – der Wirt kennt die eigene
        // Eingabe schon.
        const text = `Neue Reservierung: ${r.personen} Personen am ${r.datum} um ${r.uhrzeit}, ${r.name}`;
        const push = await benachrichtigeBetrieb(slug, { titel: "Neue Reservierung", text });
        // Telegram ist der Fallback-Kanal: er greift nur, wenn kein Gerät für
        // Web Push registriert ist (siehe pushNotify.js – "versucht": 0 heißt
        // entweder kein VAPID-Schlüssel hinterlegt oder keine Subscription).
        if (!push.versucht) await telegramRueckkanal("reservierung", r);
        await stelleGastMeldungenZu(slug);
        json(res, 200, { ok: true, reservierung: { id: r.id, datum: r.datum, uhrzeit: r.uhrzeit, ...gastAntwort("reservierung", r) } }, { ...CORS, ...PRIVAT });
        return;
      }

      if (pathname === "/oeffentlich/bestellung") {
        const b = legeBestellungAn(slug, daten);
        const text = `Neue Bestellung ${b.nummer} · Abholung gewünscht um ${b.abholzeit}, ${b.name}`;
        const push = await benachrichtigeBetrieb(slug, { titel: "Neue Bestellung", text });
        if (!push.versucht) await telegramRueckkanal("bestellung", b);
        await stelleGastMeldungenZu(slug);
        json(res, 200, { ok: true, bestellung: { id: b.id, gesamt: b.gesamt, ...gastAntwort("bestellung", b) } }, { ...CORS, ...PRIVAT });
        return;
      }

      // Womit das Bestellformular die Abholzeiten rechnet: dieselben
      // Öffnungszeiten, Zeitzone und Zusatz-Wartezeit, mit denen die
      // Bestellung hier gleich geprüft wird – dazu die Serverzeit, damit eine
      // falsch gehende Uhr im Gerät des Gastes nichts verschiebt.
      if (pathname === "/oeffentlich/abholzeiten") {
        json(res, 200, { ok: true, ...abholEinstellungen(ladeBetrieb(slug)), jetzt: uhrHook.jetzt().toISOString() }, CORS);
        return;
      }

      if (pathname === "/oeffentlich/no-show-einstellungen") {
        // Ältere Seiten fragen hier. Aktiv nur mit gültiger freigegebener Regel.
        const regel = noShowBestellungAktiv(ladeBetrieb(slug), uhrHook.jetzt());
        json(
          res,
          200,
          regel
            ? { ok: true, aktiv: true, version: regel.version, text: regel.zustimmungstext, gebuehrBetrag: regel.parameter.betrag, stornofensterMinuten: regel.parameter.stornofensterMinuten }
            : { ok: true, aktiv: false },
          CORS,
        );
        return;
      }

      // Was die Formulare vor dem Absenden anzeigen und bestätigen lassen:
      // nur freigegebene, gültige Fassungen dieses Restaurants.
      if (pathname === "/oeffentlich/rechtstexte") {
        json(res, 200, { ok: true, ...oeffentlicheRechtslage(ladeBetrieb(slug), uhrHook.jetzt()) }, CORS);
        return;
      }

      // „Passt gut dazu“: Einstellungen des Wirts und Katalog für die Seite.
      if (pathname === "/oeffentlich/empfehlungen") {
        json(res, 200, { ok: true, ...oeffentlicheEmpfehlungen(ladeBetrieb(slug)) }, CORS);
        return;
      }

      const stornierenTreffer = STORNIEREN.exec(pathname);
      if (stornierenTreffer) {
        const id = decodeURIComponent(stornierenTreffer[1]);
        const { kostenfrei, minutenBisAbholung } = storniereBestellung(slug, id);
        await stelleGastMeldungenZu(slug);
        json(
          res,
          200,
          {
            ok: true,
            kostenfrei,
            minutenBisAbholung,
            hinweis: kostenfrei
              ? "Ihre Bestellung wurde kostenfrei storniert."
              : "Ihre Bestellung wurde storniert. Da das Stornofenster bereits verstrichen ist, kann eine Ausfallpauschale anfallen.",
          },
          CORS,
        );
        return;
      }

      if (pathname === "/oeffentlich/verfuegbarkeit") {
        const stand = ladeBetrieb(slug);
        const personen = Number(daten.personen) || 0;
        // Ein Tisch muss nicht nur rechnerisch, sondern tatsächlich frei sein.
        const passt =
          personen > 0
            ? !tischVerteilung(stand, daten.datum, daten.uhrzeit, { zusatz: personen })
            : true;

        json(
          res,
          200,
          {
            ok: true,
            frei: Math.max(0, freiePlaetze(stand, daten.datum, daten.uhrzeit)),
            tischFrei: passt,
          },
          CORS,
        );
        return;
      }
    } catch (fehler) {
      json(res, 400, { ok: false, fehler: fehler.message }, CORS);
      return;
    }
    // Unbekannter öffentlicher Pfad: Der Körper ist schon gelesen – nicht
    // weiterreichen (das bliebe hängen), sondern ehrlich 404.
    json(res, 404, { ok: false, fehler: "Nicht gefunden" }, CORS);
    return;
  }

  /* ----- Dashboard des Wirts ----- */

  if (pathname === "/api/betrieb") {
    json(res, 200, uebersicht());
    return;
  }

  // Der öffentliche VAPID-Schlüssel ist unkritisch (er identifiziert nur den
  // Absender, nicht den Betrieb) – wirt.html braucht ihn vorm Registrieren.
  if (pathname === "/api/push/public-key") {
    json(res, 200, { publicKey: oeffentlicherVapidSchluessel() });
    return;
  }

  // read-only Übersicht der gelernten Zuschläge, unabhängig davon, ob das
  // Lernsystem gerade aktiv ist – der Wirt soll auch nach dem Abschalten
  // sehen können, was bereits gelernt wurde.
  if (pathname === "/api/wartezeit-lernen") {
    json(res, 200, { eintraege: lernUebersicht(slug) });
    return;
  }

  if (pathname === "/api/statistik") {
    try {
      const daten = ladeBetrieb(slug);
      const zeitzone = daten.zeitzone || ZEITZONE_STANDARD;
      const jetzt = uhrHook.jetzt();
      const z = zeitraum(searchParams.get("zeitraum") || "monat", jetzt, zeitzone, { von: searchParams.get("von"), bis: searchParams.get("bis") });
      const ergebnis = auswertung(daten, z);
      const aufrufe = seitenaufrufe(slug, daten, z);
      json(res, 200, { ok: true, betrieb: slug, ...ergebnis, heute: heuteAnstehend(daten, jetzt, zeitzone), seitenaufrufe: aufrufe, verhaeltnis: anfragenJe100Aufrufe(ergebnis, aufrufe) }, PRIVAT);
    } catch (fehler) {
      json(res, 400, { ok: false, fehler: fehler.message }, PRIVAT);
    }
    return;
  }

  if (pathname === "/api/rechtstexte") {
    const daten = ladeBetrieb(slug);
    const jetzt = uhrHook.jetzt();
    json(res, 200, {
      ok: true,
      arten: Object.entries(DOKUMENT_ARTEN).map(([art, a]) => ({ art, titel: a.titel, pfad: a.pfad, gueltig: gueltigeFassung(daten.rechtsdokumente, art, jetzt)?.version ?? "" })),
      dokumente: (daten.rechtsdokumente ?? []).map((d) => ({ ...d, hindernisse: d.status === "entwurf" ? freigabeHindernisse(d, { freigegebenVon: "x", pruefvermerk: "x", geprueftBestaetigt: true }) : [] })),
      noShowBestellung: { eingeschaltet: Boolean(daten.noShowSchutzAktiv), wirksam: noShowBestellungAktiv(daten, jetzt)?.version ?? "" },
      noShowReservierung: { eingeschaltet: Boolean(daten.reservierungNoShowAktiv), wirksam: noShowReservierungAktiv(daten, jetzt)?.version ?? "" },
      launch: launchPruefung(daten, {
        wirtPasswortGesetzt: String(process.env.WIRT_PASSWORT ?? "").length >= WIRT_PASSWORT_MIN,
        oeffentlicheUrl: process.env.WIRT_OEFFENTLICHE_URL ?? "",
        emailEingerichtet: gastEmailEinrichtung().eingerichtet,
        jetzt,
      }),
    }, PRIVAT);
    return;
  }

  // Reiter „Empfehlungen“: Einstellungen, Produkte der Karte, Wirkung (aggregiert).
  if (pathname === "/api/empfehlungen") {
    const daten = ladeBetrieb(slug);
    const vor30Tagen = new Date(uhrHook.jetzt().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    json(res, 200, {
      ok: true,
      regeln: empfehlungsEinstellungen(daten),
      produkte: empfehlungsProdukteDesBetriebs(daten).map((p) => ({ ...p, erkannteRolle: erkannteProduktRolle(p) })),
      rollen: ROLLEN_ANZEIGE,
      karte: daten.bestellkarte ? { version: daten.bestellkarte.version, gesetzt: daten.bestellkarte.gesetzt, quelle: daten.bestellkarte.quelle } : null,
      statistik: { gesamt: empfehlungsStatistik(daten), tage30: empfehlungsStatistik(daten, { seit: vor30Tagen }) },
      geaendertAm: daten.empfehlungen?.geaendertAm ?? "",
    }, PRIVAT);
    return;
  }

  // Reiter „Telegram“: Einstellungen, berechnete Zeiten, Warnungen, Probleme.
  if (pathname === "/api/telegram/benachrichtigung") {
    json(res, 200, { ok: true, ...telegramStand(ladeBetrieb(slug), { jetzt: uhrHook.jetzt() }) }, PRIVAT);
    return;
  }

  if (pathname === "/api/frei") {
    const daten = ladeBetrieb(slug);
    json(res, 200, {
      frei: Math.max(0, freiePlaetze(daten, searchParams.get("datum"), searchParams.get("uhrzeit"))),
    });
    return;
  }

  if (req.method === "POST") {
    try {
      const eingabe = await koerper(req);

      if (pathname === "/api/tisch") {
        json(res, 200, { ok: true, tisch: legeTischAn(slug, eingabe) });
        return;
      }
      if (pathname === "/api/tisch/loeschen") {
        entferneTisch(slug, eingabe.id);
        json(res, 200, { ok: true });
        return;
      }
      if (pathname === "/api/reservierung") {
        json(res, 200, { ok: true, reservierung: legeReservierungAn(slug, eingabe, "manuell") });
        return;
      }
      if (pathname === "/api/reservierung/status") {
        const reservierung = setzeReservierungStatus(slug, eingabe.id, eingabe.status);
        await stelleGastMeldungenZu(slug);
        json(res, 200, { ok: true, reservierung, gast: gastHinweisFuer("reservierung", reservierung.id) });
        return;
      }
      if (pathname === "/api/reservierung/verschieben") {
        const reservierung = verschiebeReservierung(slug, eingabe.id, { datum: eingabe.datum, uhrzeit: eingabe.uhrzeit, grund: eingabe.grund });
        await stelleGastMeldungenZu(slug);
        json(res, 200, { ok: true, reservierung, gast: gastHinweisFuer("reservierung", reservierung.id) });
        return;
      }
      if (pathname === "/api/reservierung/tisch") {
        json(res, 200, { ok: true, reservierung: weiseTischZu(slug, eingabe.id, eingabe.tischId) });
        return;
      }
      if (pathname === "/api/bestellung/bestaetigen") {
        const bestellung = bestaetigeBestellung(slug, eingabe.id, eingabe.abholzeit);
        await stelleGastMeldungenZu(slug);
        json(res, 200, { ok: true, bestellung, gast: gastHinweisFuer("bestellung", bestellung.id) });
        return;
      }
      if (pathname === "/api/bestellung/status") {
        const bestellung = setzeBestellungStatus(slug, eingabe.id, eingabe.status);

        // Nur beim Wechsel auf "abgeholt" gibt es einen Ist-Wert zum Lernen –
        // und nur, wenn der Betrieb das Lernsystem eingeschaltet hat (Default
        // aus, siehe wartezeitLernenAktiv in betriebStore.js).
        if (eingabe.status === "abgeholt") {
          const betrieb = ladeBetrieb(slug);
          if (betrieb.wartezeitLernenAktiv && bestellung.tatsaechlichFertigUm) {
            beobachteAbholung(slug, betrieb, bestellung, new Date(bestellung.tatsaechlichFertigUm));
          }
        }

        await stelleGastMeldungenZu(slug);
        json(res, 200, { ok: true, bestellung, gast: gastHinweisFuer("bestellung", bestellung.id) });
        return;
      }

      /* ----- Intern: „Passt gut dazu“ ----- */

      if (pathname === "/intern/empfehlungen") {
        json(res, 200, { ok: true, regeln: setzeEmpfehlungen(slug, eingabe) });
        return;
      }

      // Vorschau: dieselbe Auswahl, die der Gast sehen würde – auch mit noch
      // nicht gespeicherten Einstellungen aus dem Formular.
      if (pathname === "/api/empfehlungen/vorschau") {
        const daten = ladeBetrieb(slug);
        const produkte = empfehlungsProdukteDesBetriebs(daten);
        const regeln = eingabe.regeln ? pruefeEmpfehlungsRegeln(eingabe.regeln, produkte) : empfehlungsEinstellungen(daten);
        const korb = (Array.isArray(eingabe.warenkorb) ? eingabe.warenkorb : []).slice(0, 30).map((id) => ({ id: String(id), menge: 1 }));
        const nachId = Object.fromEntries(produkte.map((p) => [p.id, p]));
        const vorschlaege = waehleEmpfehlungen({ produkte, warenkorb: korb, regeln, bestellbar: daten.bestellkarte?.katalog ?? null }).map((v) => ({
          ...v,
          name: nachId[v.id].name,
          preis: nachId[v.id].preis,
          varianten: nachId[v.id].varianten.filter((x) => v.varianten.includes(x.id)),
        }));
        json(res, 200, { ok: true, vorschlaege });
        return;
      }

      /* ----- Intern: Gastbenachrichtigung ----- */

      if (pathname === "/intern/gast-kontakt") {
        json(res, 200, { ok: true, ...setzeGastKontakt(slug, eingabe) });
        return;
      }

      if (pathname === "/intern/gastmeldung/erneut") {
        const meldung = await versucheGastMeldungErneut(slug, String(eingabe.id ?? ""));
        json(res, 200, { ok: true, meldung: { id: meldung.id, typ: meldung.typ, versand: meldung.versand } });
        return;
      }

      if (pathname === "/intern/gastlink/widerrufen") {
        const art = eingabe.art === "reservierung" ? "reservierung" : "bestellung";
        widerrufeGastZugang(slug, art, String(eingabe.id ?? ""));
        json(res, 200, { ok: true, gast: gastHinweisFuer(art, String(eingabe.id ?? "")) });
        return;
      }

      /* ----- Intern: Rechtstexte und Prüfliste ----- */

      if (pathname === "/intern/rechtstexte/entwurf") {
        json(res, 200, { ok: true, dokument: legeRechtsdokumentEntwurfAn(slug, eingabe.art, { parameter: eingabe.parameter }) });
        return;
      }
      if (pathname === "/intern/rechtstexte/bearbeiten") {
        json(res, 200, { ok: true, dokument: bearbeiteRechtsdokument(slug, eingabe.id, eingabe) });
        return;
      }
      if (pathname === "/intern/rechtstexte/kopieren") {
        json(res, 200, { ok: true, dokument: kopiereRechtsdokument(slug, eingabe.id) });
        return;
      }
      if (pathname === "/intern/rechtstexte/freigeben") {
        json(res, 200, { ok: true, dokument: gibRechtsdokumentFrei(slug, eingabe.id, eingabe) });
        return;
      }
      if (pathname === "/intern/rechtstexte/zurueckziehen") {
        json(res, 200, { ok: true, dokument: zieheRechtsdokumentZurueck(slug, eingabe.id) });
        return;
      }
      if (pathname === "/intern/rechtstexte/loeschen") {
        loescheRechtsdokumentEntwurf(slug, eingabe.id);
        json(res, 200, { ok: true });
        return;
      }
      if (pathname === "/intern/reservierung-no-show") {
        json(res, 200, { ok: true, aktiv: setzeReservierungsNoShow(slug, eingabe.aktiv === true) });
        return;
      }
      if (pathname === "/intern/launch-vermerk") {
        json(res, 200, { ok: true, vermerke: setzeLaunchVermerk(slug, eingabe.punkt, eingabe) });
        return;
      }

      /* ----- Intern: Einstellungen des Wirt-Dashboards ----- */

      if (pathname === "/intern/wartezeit") {
        const wert = setzeWartezeit(slug, eingabe.minuten);
        json(res, 200, { ok: true, zusaetzlicheWartezeitMinuten: wert });
        return;
      }

      if (pathname === "/intern/push/subscribe") {
        const gespeichert = fuegePushSubscriptionHinzu(slug, eingabe);
        json(res, 200, { ok: true, ...gespeichert });
        return;
      }

      if (pathname === "/intern/no-show-schutz") {
        const ergebnis = setzeNoShowSchutz(slug, {
          aktiv: eingabe.aktiv,
          gebuehrBetrag: eingabe.gebuehrBetrag,
          stornofensterMinuten: eingabe.stornofensterMinuten,
          warnSchwelle: eingabe.warnSchwelle,
        });
        json(res, 200, { ok: true, ...ergebnis });
        return;
      }

      if (pathname === "/intern/bankverbindung") {
        const bankverbindung = setzeBankverbindung(slug, eingabe.bankverbindung);
        json(res, 200, { ok: true, bankverbindung });
        return;
      }

      const noShowTreffer = NO_SHOW.exec(pathname);
      if (noShowTreffer) {
        const id = decodeURIComponent(noShowTreffer[1]);
        const bestellung = bestaetigeNoShow(slug, id, eingabe.betrag);

        // Zuverlässigkeits-Store: zählt für künftige Bestellungen derselben
        // Nummer mit, unabhängig davon, ob der Rechnungsversand klappt.
        if (bestellung.telefon) vermerkeNoShow(slug, bestellung.telefon);

        const betrieb = ladeBetrieb(slug);
        const rechnungPdf = await erzeugeNoShowRechnung({
          betrieb: slug,
          bestellung,
          betrag: bestellung.noShowBetrag,
          bankverbindung: betrieb.bankverbindung,
        });

        const email = await versendeRechnung({
          email: bestellung.email,
          betreff: `Rechnung: Ausfallpauschale zu Bestellung ${bestellung.nummer}`,
          text:
            `Hallo ${bestellung.name},\n\nzu Ihrer Bestellung ${bestellung.nummer} stellen wir die vereinbarte ` +
            `Ausfallpauschale in Höhe von ${Number(bestellung.noShowBetrag).toFixed(2)} € in Rechnung. ` +
            "Die Rechnung finden Sie im Anhang.",
          anhaenge: [{ dateiname: "rechnung.pdf", inhalt: rechnungPdf, contentType: "application/pdf" }],
        });

        json(res, 200, { ok: true, bestellung, rechnungVersendet: email.versendet });
        return;
      }

      if (pathname === "/intern/wartezeit-lernen/aktiv") {
        const aktiv = setzeWartezeitLernenAktiv(slug, eingabe.aktiv);
        json(res, 200, { ok: true, wartezeitLernenAktiv: aktiv });
        return;
      }

      if (pathname === "/intern/telegram/benachrichtigung") {
        setzeTelegramEinstellungen(slug, eingabe, uhrHook.jetzt());
        json(res, 200, { ok: true, ...telegramStand(ladeBetrieb(slug), { jetzt: uhrHook.jetzt() }) });
        return;
      }

      if (pathname === "/intern/telegram/chat-id") {
        const chatId = setzeTelegramChatId(slug, eingabe.chatId);
        json(res, 200, { ok: true, telegramChatId: chatId });
        return;
      }

      const verzoegerungTreffer = VERZOEGERUNG.exec(pathname);
      if (verzoegerungTreffer) {
        const id = decodeURIComponent(verzoegerungTreffer[1]);
        // Erst speichern (daraus entsteht genau eine Gastmeldung), dann
        // zustellen. Scheitert die Zustellung, bleibt die neue Zeit trotzdem
        // gespeichert – und die Statusseite zeigt sie sofort.
        const bestellung = bestaetigeBestellung(slug, id, eingabe.neueZeit, { grund: eingabe.grund ?? "" });
        await stelleGastMeldungenZu(slug);
        const gast = gastHinweisFuer("bestellung", id);
        const zustand = gast.letzteMeldung?.zustand ?? "";
        // "kanal" bleibt als knappe Antwort fürs Dashboard: nur "email"/"sms",
        // wenn die Nachricht dem Anbieter wirklich übergeben wurde.
        const kanal = zustand === "uebergeben" ? gast.letzteMeldung.kanal : "keiner";

        json(res, 200, { ok: true, bestellung, kanal, gast });
        return;
      }
    } catch (fehler) {
      json(res, 400, { ok: false, fehler: fehler.message });
      return;
    }
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Nicht gefunden");
};

// Nur beim direkten Start (npm run wirt) wird auch gelauscht. Der Test
// importiert denselben Handler und hängt ihn an einen eigenen Port, statt
// dem laufenden Wirt-Dashboard den Platz wegzunehmen (siehe dashboardServer.js).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createServer(handler);

  // Ein belegter Port ist der häufigste Stolperstein beim Start. Die Meldung
  // von Node ("EADDRINUSE") sagt nicht, was zu tun ist – diese hier schon.
  server.on("error", (fehler) => {
    if (fehler.code === "EADDRINUSE") {
      console.log(`\n⚠️  Port ${port} ist schon belegt – dort läuft bereits etwas.`);
      console.log(`   Anderen Port wählen:  npm run wirt -- --port ${port + 1}\n`);
      process.exitCode = 1;
      return;
    }
    throw fehler;
  });

  server.listen(port, dashboardHost, () => {
    // Ohne Passwort bleibt das Dashboard gesperrt, sobald es nicht direkt
    // auf diesem Rechner aufgerufen wird (pruefeWirtZugang).
    const passwort = String(process.env.WIRT_PASSWORT ?? "");
    if (!passwort) {
      console.log("\nℹ️  WIRT_PASSWORT ist nicht gesetzt: Dashboard und Wirt-Aktionen nur direkt über http://localhost.");
      if (oeffentlicherBetrieb() || !["127.0.0.1", "localhost", "::1"].includes(dashboardHost)) {
        console.log("⛔ Öffentlicher Betrieb ohne WIRT_PASSWORT: Das Dashboard ist gesperrt, bis es gesetzt ist. Gastseiten funktionieren weiter.");
      }
    } else if (passwort.length < WIRT_PASSWORT_MIN) {
      console.log(`\n⚠️  WIRT_PASSWORT ist kürzer als ${WIRT_PASSWORT_MIN} Zeichen – bitte ein längeres wählen (Launch-Prüfung zeigt es als offen).`);
    }
    console.log(`\n🍽️  Wirt-Dashboard für "${slug}": http://${dashboardHost}:${port}`);
    console.log(`    Reservierungen der Seite gehen an: http://${dashboardHost}:${port}/oeffentlich/\n`);
  });
}
