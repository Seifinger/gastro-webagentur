import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import QRCode from "qrcode";
import { readAllLeads } from "./csvImport.js";
import { landingPagesDir, docsDir, siteBaseUrl, absenderName } from "./config.js";
import {
  ladeZuordnungen,
  speichereZuordnung,
  kuecheFuerLead,
} from "./cuisineOverrides.js";
import { kuechenAuswahl } from "./menuCatalog.js";
import { anschreiben } from "./outreach.js";
import { ageInDays, isStale, isAgingSoon } from "./leadFreshness.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dashboardHtmlPath = path.join(__dirname, "..", "public", "dashboard.html");
const manifestPath = path.join(landingPagesDir, "entwuerfe.json");

const ENTWURF_PREFIX = "/entwuerfe/";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

// Jeder Server hat seine eigene Variable. Ein gemeinsames PORT hieße, dass
// das Wirt-Dashboard auf 3000 landet, sobald man es einmal gesetzt hat – und
// dann streiten sich zwei Server um denselben Platz.
function parsePort(argv) {
  const flagIndex = argv.indexOf("--port");
  if (flagIndex !== -1) return Number(argv[flagIndex + 1]);
  return Number(process.env.DASHBOARD_PORT) || 3000;
}

const port = parsePort(process.argv.slice(2));

/**
 * Liest die Zuordnung Lead -> Entwurfsordner bei jedem Aufruf neu, damit ein
 * frisches "npm run pages" ohne Serverneustart sichtbar wird.
 */
function readManifest() {
  try {
    return JSON.parse(readFileSync(manifestPath, "utf-8"));
  } catch {
    return {};
  }
}

function leadsMitZusatz() {
  const manifest = readManifest();
  const zuordnungen = ladeZuordnungen();

  return readAllLeads()
    .map((lead) => {
      const slug = manifest[lead.placeId];
      const demoUrl = slug ? `${siteBaseUrl}/${slug}/` : "";
      // Ein Entwurf ist erst dann per QR-Code erreichbar, wenn er auch im
      // veröffentlichten Ordner liegt. Sonst schickt der QR den Wirt auf
      // eine 404-Seite – vor seinen Augen, mitten im Gespräch.
      const veroeffentlicht =
        Boolean(slug) && existsSync(path.join(docsDir, slug, "index.html"));
      const alter = ageInDays(lead);

      return {
        ...lead,
        kueche: kuecheFuerLead(lead, zuordnungen),
        kuecheManuell: Boolean(zuordnungen[lead.placeId]),
        entwurf: slug ? `${ENTWURF_PREFIX}${slug}/` : "",
        demoUrl,
        veroeffentlicht,
        anschreiben: anschreiben(lead, demoUrl, absenderName),
        // Google erlaubt laut Nutzungsbedingungen nur ein zeitlich begrenztes
        // Zwischenspeichern von Place-Daten – der Wirt bekommt einen
        // Frühwarn-Hinweis, bevor die Frist abläuft (siehe leadFreshness.js).
        alterTage: Number.isFinite(alter) ? Math.floor(alter) : null,
        staleWarnung: isAgingSoon(lead),
        abgelaufen: isStale(lead),
      };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/**
 * Löst einen /entwuerfe/-Pfad auf eine Datei im Entwurfsordner auf.
 * Gibt null zurück, wenn der Pfad aus dem Ordner herausführt – sonst könnte
 * über "../" jede Datei auf der Platte abgerufen werden.
 */
function resolveEntwurfFile(pathname) {
  const relative = decodeURIComponent(pathname.slice(ENTWURF_PREFIX.length));
  const target = path.resolve(landingPagesDir, relative);

  const erlaubt = path.resolve(landingPagesDir);
  if (target !== erlaubt && !target.startsWith(erlaubt + path.sep)) return null;
  if (!existsSync(target)) return null;

  const datei = statSync(target).isDirectory() ? path.join(target, "index.html") : target;
  if (!existsSync(datei)) return null;

  const type = MIME_TYPES[path.extname(datei).toLowerCase()];
  return type ? { datei, type } : null;
}

function sendeJson(res, status, daten) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(daten));
}

function leseKoerper(req) {
  return new Promise((resolve, reject) => {
    let roh = "";
    req.on("data", (teil) => {
      roh += teil;
      // Das Dashboard schickt nur winzige Nachrichten; alles andere brechen
      // wir ab, statt Speicher vollaufen zu lassen.
      if (roh.length > 10_000) reject(new Error("Anfrage zu groß"));
    });
    req.on("end", () => resolve(roh));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const { pathname, searchParams } = new URL(
    req.url,
    `http://${req.headers.host ?? "localhost"}`,
  );

  if (pathname === "/" || pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(readFileSync(dashboardHtmlPath, "utf-8"));
    return;
  }

  if (pathname === "/api/leads") {
    sendeJson(res, 200, { kuechen: kuechenAuswahl(), leads: leadsMitZusatz() });
    return;
  }

  if (pathname === "/api/kueche" && req.method === "POST") {
    try {
      const { placeId, kueche } = JSON.parse(await leseKoerper(req));
      speichereZuordnung(placeId, kueche ?? "");
      sendeJson(res, 200, { ok: true });
    } catch (error) {
      sendeJson(res, 400, { ok: false, fehler: error.message });
    }
    return;
  }

  if (pathname === "/api/qr") {
    const ziel = searchParams.get("url");
    if (!ziel || !ziel.startsWith(siteBaseUrl)) {
      sendeJson(res, 400, { fehler: "Unerwartete Adresse" });
      return;
    }

    const svg = await QRCode.toString(ziel, {
      type: "svg",
      margin: 1,
      width: 280,
      errorCorrectionLevel: "M",
    });
    res.writeHead(200, { "Content-Type": "image/svg+xml; charset=utf-8" });
    res.end(svg);
    return;
  }

  if (pathname.startsWith(ENTWURF_PREFIX)) {
    const treffer = resolveEntwurfFile(pathname);
    if (!treffer) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Entwurf nicht gefunden. Erst 'npm run pages' ausführen.");
      return;
    }

    res.writeHead(200, { "Content-Type": treffer.type });
    res.end(readFileSync(treffer.datei));
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Nicht gefunden");
});


// Ein belegter Port ist der häufigste Stolperstein beim Start. Die Meldung
// von Node ("EADDRINUSE") sagt nicht, was zu tun ist – diese hier schon.
server.on("error", (fehler) => {
  if (fehler.code === "EADDRINUSE") {
    console.log(`\n⚠️  Port ${port} ist schon belegt – dort läuft bereits etwas.`);
    console.log(`   Anderen Port wählen:  npm run dashboard -- --port ${port + 1}\n`);
    process.exitCode = 1;
    return;
  }
  throw fehler;
});

server.listen(port, () => {
  console.log(`\n📊 Dashboard läuft: http://localhost:${port}\n`);
});
