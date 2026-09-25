import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { docsDir, resonanzHost, resonanzPort } from "./config.js";
import { vermerkeAufruf } from "./resonanzStore.js";
import { Bremse, clientAdresse } from "./anfrageSchutz.js";

// Nimmt die Signale der veröffentlichten Entwürfe entgegen. Aufbau wie
// wirtServer.js, weil das Problem dasselbe ist: ein öffentlicher Endpunkt,
// den jeder aufrufen kann, der die Seite offen hat.
//
// Dieser Server muss aus dem Internet erreichbar sein – die Entwürfe liegen
// auf GitHub Pages, das Dashboard dagegen auf 127.0.0.1. Beide teilen sich
// nur das Verzeichnis data/resonanz/; das Dashboard liest bei jeder Anfrage
// frisch von der Platte.
//
// Ein Token kommt hier bewusst nicht in Frage: Es stünde im Quelltext jeder
// ausgelieferten Seite und wäre damit keins. Der Schutz besteht stattdessen
// aus Rate-Bremse, Größendeckel und der Prüfung, dass der gemeldete Entwurf
// überhaupt existiert.

const BREMSE_MAX = 20;
const zugriffe = new Bremse({ fensterMs: 60_000 });

/**
 * Die Adresse dient nur der Bremse und bleibt im Arbeitsspeicher – auf der
 * Platte landet sie nie. Hinter einem Proxy zählt sie nur mit
 * VERTRAUTER_PROXY (anfrageSchutz.js).
 */
function zuSchnell(adresse) {
  return zugriffe.zaehle(adresse) > BREMSE_MAX;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(res, status, daten) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...CORS });
  res.end(JSON.stringify(daten));
}

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

/**
 * Nur Entwürfe, die tatsächlich veröffentlicht sind, dürfen Einträge anlegen.
 * Sonst schreibt der erste Neugierige beliebig viele Dateien in data/.
 */
function entwurfExistiert(slug) {
  return existsSync(path.join(docsDir, slug, "index.html"));
}

/** Wie im Wirt-Server: Ein Fehler in einer Anfrage beendet nie den Prozess. */
export async function handler(req, res) {
  try {
    await routen(req, res);
  } catch (fehler) {
    console.error(`Fehler bei ${req.method} ${String(req.url).slice(0, 200)}: ${fehler.message}`);
    if (!res.headersSent) json(res, 400, { ok: false, fehler: "Ungültige Anfrage." });
    else res.end();
  }
}

async function routen(req, res) {
  const { pathname } = new URL(req.url, "http://localhost");

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  if (pathname === "/resonanz" && req.method === "POST") {
    if (zuSchnell(clientAdresse(req))) {
      json(res, 429, { ok: false, fehler: "Zu viele Anfragen." });
      return;
    }

    try {
      const daten = await koerper(req);
      const slug = String(daten.slug ?? "").trim();

      if (!entwurfExistiert(slug)) {
        json(res, 400, { ok: false, fehler: "Unbekannter Entwurf." });
        return;
      }

      vermerkeAufruf(slug, {
        besuch: daten.besuch,
        sekunden: daten.sekunden,
        reservierungGesehen: daten.reservierungGesehen,
      });
      json(res, 200, { ok: true });
    } catch (fehler) {
      json(res, 400, { ok: false, fehler: fehler.message });
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Nicht gefunden");
}

// Nur beim direkten Start (npm run resonanz) wird auch gelauscht. Der Test
// importiert denselben Handler und hängt ihn an einen eigenen Port.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createServer(handler);

  server.on("error", (fehler) => {
    if (fehler.code === "EADDRINUSE") {
      console.log(`\n⚠️  Port ${resonanzPort} ist schon belegt – dort läuft bereits etwas.`);
      console.log(`   Anderen Port wählen:  RESONANZ_PORT=${resonanzPort + 1} npm run resonanz\n`);
      process.exitCode = 1;
      return;
    }
    throw fehler;
  });

  server.listen(resonanzPort, resonanzHost, () => {
    console.log(`\n📈 Resonanz-Collector: http://${resonanzHost}:${resonanzPort}/resonanz`);
    if (resonanzHost === "127.0.0.1") {
      console.log("    Nur lokal erreichbar. Für veröffentlichte Entwürfe gehört");
      console.log("    ein Reverse Proxy mit TLS davor (RESONANZ_HOST setzen).\n");
    } else {
      console.log("");
    }
  });
}
