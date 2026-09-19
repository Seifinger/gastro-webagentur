import { createServer } from "node:http";
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
} from "./betriebStore.js";
import { benachrichtigeBetrieb, oeffentlicherVapidSchluessel } from "./pushNotify.js";
import { benachrichtigeUeberTelegram } from "./telegramNotify.js";
import { informiereUeberVerzoegerung, versendeRechnung } from "./kundenBenachrichtigung.js";
import { beobachteAbholung, lernUebersicht } from "./wartezeitLernStore.js";
import { vermerkeNoShow, warnhinweisNoetig } from "./zuverlaessigkeitStore.js";
import { erzeugeNoShowRechnung } from "./rechnungGenerator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seite = path.join(__dirname, "..", "public", "wirt.html");
const serviceWorker = path.join(__dirname, "..", "public", "sw.js");

const VERZOEGERUNG = /^\/intern\/bestellung\/([^/]+)\/verzoegerung$/;
const STORNIEREN = /^\/oeffentlich\/bestellung\/([^/]+)\/stornieren$/;
const NO_SHOW = /^\/intern\/bestellung\/([^/]+)\/no-show$/;

function parseFlag(argv, name, standard) {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : standard;
}

const argv = process.argv.slice(2);
const slug = parseFlag(argv, "--betrieb", process.env.BETRIEB || "mein-lokal");
// Bewusst nicht PORT: das gehört dem persönlichen Dashboard auf 3000.
const port = Number(parseFlag(argv, "--port", process.env.WIRT_PORT || 3200));

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

function uebersicht() {
  const daten = ladeBetrieb(slug);
  const heute = new Date().toISOString().slice(0, 10);

  // Kein automatischer Filter, nur ein Hinweis fürs Dashboard – die
  // Entscheidung, eine Bestellung trotzdem anzunehmen, bleibt beim Wirt.
  const bestellungenMitHinweis = daten.bestellungen.map((b) => ({
    ...b,
    unzuverlaessig: b.telefon
      ? warnhinweisNoetig(slug, b.telefon, daten.noShowWarnSchwelle ?? 2)
      : false,
  }));

  return {
    betrieb: slug,
    tische: daten.tische,
    plaetzeGesamt: gesamtPlaetze(daten),
    reservierungen: daten.reservierungen.sort(
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
    heute,
    jetztIso: new Date().toISOString(),
  };
}

// Als eigene Funktion exportiert, damit Tests einen Server auf einem
// zufälligen Port starten können, statt den festen Port aus argv/env zu
// belegen – siehe dashboardServer.js für dasselbe Muster.
export const handler = async (req, res) => {
  const { pathname, searchParams } = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

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
        json(res, 200, { ok: true, reservierung: { id: r.id, datum: r.datum, uhrzeit: r.uhrzeit } }, CORS);
        return;
      }

      if (pathname === "/oeffentlich/bestellung") {
        const b = legeBestellungAn(slug, daten);
        const text = `Neue Bestellung ${b.nummer} · Abholung gewünscht um ${b.abholzeit}, ${b.name}`;
        const push = await benachrichtigeBetrieb(slug, { titel: "Neue Bestellung", text });
        if (!push.versucht) {
          await benachrichtigeUeberTelegram(ladeBetrieb(slug).telegramChatId, text);
        }
        json(res, 200, { ok: true, bestellung: { id: b.id, nummer: b.nummer } }, CORS);
        return;
      }

      if (pathname === "/oeffentlich/no-show-einstellungen") {
        const stand = ladeBetrieb(slug);
        json(
          res,
          200,
          {
            ok: true,
            aktiv: Boolean(stand.noShowSchutzAktiv),
            gebuehrBetrag: stand.noShowGebuehrBetrag ?? 0,
            stornofensterMinuten: stand.noShowStornofensterMinuten ?? 30,
          },
          CORS,
        );
        return;
      }

      const stornierenTreffer = STORNIEREN.exec(pathname);
      if (stornierenTreffer) {
        const id = decodeURIComponent(stornierenTreffer[1]);
        const { kostenfrei, minutenBisAbholung } = storniereBestellung(slug, id);
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
        json(res, 200, { ok: true, reservierung: setzeReservierungStatus(slug, eingabe.id, eingabe.status) });
        return;
      }
      if (pathname === "/api/reservierung/tisch") {
        json(res, 200, { ok: true, reservierung: weiseTischZu(slug, eingabe.id, eingabe.tischId) });
        return;
      }
      if (pathname === "/api/bestellung/bestaetigen") {
        json(res, 200, { ok: true, bestellung: bestaetigeBestellung(slug, eingabe.id, eingabe.abholzeit) });
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

        json(res, 200, { ok: true, bestellung });
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
        const grund = String(eingabe.grund ?? "").trim();
        const bestellung = bestaetigeBestellung(slug, id, eingabe.neueZeit);

        const nachricht = grund
          ? `Ihre Bestellung ${bestellung.nummer}: neue Abholzeit ${bestellung.bestaetigteAbholzeit} (${grund}).`
          : `Ihre Bestellung ${bestellung.nummer}: neue Abholzeit ${bestellung.bestaetigteAbholzeit}.`;

        const { kanal } = await informiereUeberVerzoegerung({
          telefon: bestellung.telefon,
          email: bestellung.email,
          nachricht,
        });

        json(res, 200, { ok: true, bestellung, kanal });
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
    console.log(`\n🍽️  Wirt-Dashboard für "${slug}": http://${dashboardHost}:${port}`);
    console.log(`    Reservierungen der Seite gehen an: http://${dashboardHost}:${port}/oeffentlich/\n`);
  });
}
