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
} from "./betriebStore.js";
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
 * tausenden Reservierungen vollschreibt.
 */
const BREMSE_FENSTER_MS = 60_000;
const BREMSE_MAX = 20;
const zugriffe = new Map();

function zuSchnell(adresse) {
  const jetzt = Date.now();
  const liste = (zugriffe.get(adresse) ?? []).filter((t) => jetzt - t < BREMSE_FENSTER_MS);
  liste.push(jetzt);
  zugriffe.set(adresse, liste);
  return liste.length > BREMSE_MAX;
}

// Falsche Status-Links: eigene, strengere Bremse gegen Durchprobieren.
const FEHLVERSUCHE_FENSTER_MS = 10 * 60_000;
const FEHLVERSUCHE_MAX = 10;
const fehlversuche = new Map();

function zuVieleFehlversuche(adresse, neu = false) {
  const jetzt = Date.now();
  const liste = (fehlversuche.get(adresse) ?? []).filter((t) => jetzt - t < FEHLVERSUCHE_FENSTER_MS);
  if (neu) liste.push(jetzt);
  fehlversuche.set(adresse, liste);
  return liste.length >= FEHLVERSUCHE_MAX;
}

/** Für Tests: beide Bremsen leeren (sie gelten je Adresse, im Test immer 127.0.0.1). */
export function setzeBremsenZurueck() {
  zugriffe.clear();
  fehlversuche.clear();
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
    jetztIso: new Date().toISOString(),
  };
}

/**
 * Optionaler Schutz für Dashboard und Wirt-Aktionen: Ist WIRT_PASSWORT
 * gesetzt, verlangt alles außer den öffentlichen Gast-Routen (/oeffentlich/,
 * /status) eine Anmeldung per HTTP-Basic (Benutzername beliebig). Sobald
 * der Server öffentlich erreichbar ist – und das muss er für Status-Links –,
 * gehört das Passwort gesetzt; sonst sind Gastdaten unter /api/betrieb offen.
 */
export function wirtZugangErlaubt(req) {
  const passwort = String(process.env.WIRT_PASSWORT ?? "");
  if (!passwort) return true;
  const kopf = String(req.headers.authorization ?? "");
  if (!kopf.startsWith("Basic ")) return false;
  const roh = Buffer.from(kopf.slice(6), "base64").toString("utf-8");
  const angegeben = roh.slice(roh.indexOf(":") + 1);
  const a = createHash("sha256").update(angegeben).digest();
  const b = createHash("sha256").update(passwort).digest();
  return timingSafeEqual(a, b);
}

export function istOeffentlicheRoute(pathname, method) {
  return method === "OPTIONS" || pathname.startsWith("/oeffentlich/") || pathname === "/status" || pathname === "/sw.js" || pathname.startsWith("/rechtstexte/");
}

export function verweigereZugang(res) {
  res.writeHead(401, { "WWW-Authenticate": 'Basic realm="Wirt-Dashboard", charset="UTF-8"', "Content-Type": "text/plain; charset=utf-8" });
  res.end("Anmeldung erforderlich");
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
// belegen – siehe dashboardServer.js für dasselbe Muster.
export const handler = async (req, res) => {
  const { pathname, searchParams } = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (!istOeffentlicheRoute(pathname, req.method) && !wirtZugangErlaubt(req)) {
    verweigereZugang(res);
    return;
  }

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
    const adresse = req.socket.remoteAddress ?? "unbekannt";
    if (zuSchnell(adresse)) {
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
        if (!push.versucht) {
          await benachrichtigeUeberTelegram(ladeBetrieb(slug).telegramChatId, text);
        }
        await stelleGastMeldungenZu(slug);
        json(res, 200, { ok: true, reservierung: { id: r.id, datum: r.datum, uhrzeit: r.uhrzeit, ...gastAntwort("reservierung", r) } }, { ...CORS, ...PRIVAT });
        return;
      }

      if (pathname === "/oeffentlich/bestellung") {
        const b = legeBestellungAn(slug, daten);
        const text = `Neue Bestellung ${b.nummer} · Abholung gewünscht um ${b.abholzeit}, ${b.name}`;
        const push = await benachrichtigeBetrieb(slug, { titel: "Neue Bestellung", text });
        if (!push.versucht) {
          await benachrichtigeUeberTelegram(ladeBetrieb(slug).telegramChatId, text);
        }
        await stelleGastMeldungenZu(slug);
        json(res, 200, { ok: true, bestellung: { id: b.id, ...gastAntwort("bestellung", b) } }, { ...CORS, ...PRIVAT });
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
        wirtPasswortGesetzt: Boolean(process.env.WIRT_PASSWORT),
        oeffentlicheUrl: process.env.WIRT_OEFFENTLICHE_URL ?? "",
        emailEingerichtet: gastEmailEinrichtung().eingerichtet,
        jetzt,
      }),
    }, PRIVAT);
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
    // Launch-Blocker: Ist der Server von außen erreichbar, muss das
    // Dashboard geschützt sein – sonst liegen Gastdaten und Nachweise offen.
    if (!process.env.WIRT_PASSWORT && !["127.0.0.1", "localhost", "::1"].includes(dashboardHost)) {
      console.log("\n⛔ WIRT_PASSWORT ist nicht gesetzt, der Server lauscht aber auf " + dashboardHost + ".");
      console.log("   Dashboard, Statistik und Nachweise sind damit für jeden im Netz lesbar. Vor dem Livegang setzen!");
    }
    console.log(`\n🍽️  Wirt-Dashboard für "${slug}": http://${dashboardHost}:${port}`);
    console.log(`    Reservierungen der Seite gehen an: http://${dashboardHost}:${port}/oeffentlich/\n`);
  });
}
