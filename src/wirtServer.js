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
} from "./betriebStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seite = path.join(__dirname, "..", "public", "wirt.html");

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

  return {
    betrieb: slug,
    tische: daten.tische,
    plaetzeGesamt: gesamtPlaetze(daten),
    reservierungen: daten.reservierungen.sort(
      (a, b) => `${a.datum}${a.uhrzeit}`.localeCompare(`${b.datum}${b.uhrzeit}`),
    ),
    bestellungen: daten.bestellungen.sort((a, b) => b.eingegangen.localeCompare(a.eingegangen)),
    offeneReservierungen: daten.reservierungen.filter((r) => r.status === "neu").length,
    offeneBestellungen: daten.bestellungen.filter((b) => b.status === "neu").length,
    // Zeitpunkte, an denen die Plätze zwar reichen, die Tische aber nicht.
    tischKonflikte: tischKonflikte(daten),
    heute,
  };
}

const server = createServer(async (req, res) => {
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
        json(res, 200, { ok: true, reservierung: { id: r.id, datum: r.datum, uhrzeit: r.uhrzeit } }, CORS);
        return;
      }

      if (pathname === "/oeffentlich/bestellung") {
        const b = legeBestellungAn(slug, daten);
        json(res, 200, { ok: true, bestellung: { id: b.id, nummer: b.nummer } }, CORS);
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
        json(res, 200, { ok: true, bestellung: setzeBestellungStatus(slug, eingabe.id, eingabe.status) });
        return;
      }
    } catch (fehler) {
      json(res, 400, { ok: false, fehler: fehler.message });
      return;
    }
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Nicht gefunden");
});


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
