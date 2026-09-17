import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readAllLeads } from "./csvImport.js";
import { landingPagesDir } from "./config.js";

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
  ".ico": "image/x-icon",
};

function parsePort(argv) {
  const flagIndex = argv.indexOf("--port");
  if (flagIndex !== -1) return Number(argv[flagIndex + 1]);
  return Number(process.env.PORT) || 3000;
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

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (pathname === "/" || pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(readFileSync(dashboardHtmlPath, "utf-8"));
    return;
  }

  if (pathname === "/api/leads") {
    const manifest = readManifest();
    const leads = readAllLeads()
      .map((lead) => ({
        ...lead,
        entwurf: manifest[lead.placeId] ? `${ENTWURF_PREFIX}${manifest[lead.placeId]}/` : "",
      }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(leads));
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

server.listen(port, () => {
  console.log(`\n📊 Dashboard läuft: http://localhost:${port}\n`);
});
