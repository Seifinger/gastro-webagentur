import http from "node:http";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  watch,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dashboardHost } from "./config.js";
import { DEMO_LEADS } from "./demoLeads.js";
import { themeForLead } from "./landingPageGenerator.js";
import { menuForCuisine } from "./menuCatalog.js";
import { stimmungFuerLead, ladeStimmungsWahl } from "./stimmungsWahl.js";
import { leadFuerSlug, ladeSchriften, schreibeSeiten } from "./buildSite.js";
import { baueUndSchreibeEinzelnenEntwurf } from "./publishSite.js";
import { uploadsDir } from "./bildUpload.js";
import { loadLeadEdits } from "./leadEdits.js";

// Lokale Live-Vorschau eines einzelnen Entwurfs.
//
// Ganz bewusst ohne neue Abhängigkeit: ein kleiner http-Server, fs.watch und
// ein SSE-Schnipsel reichen völlig. Und ebenso bewusst schreibt der Server
// ausschließlich in ein gitignoriertes .preview/-Verzeichnis – niemals nach
// docs/. Eine bereits veröffentlichte Kundenseite kann von der Vorschau
// damit unter keinen Umständen berührt werden, und es wird auch kein
// einziger Git-Befehl ausgelöst (anders als in veroeffentlichung.js).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

export const previewDir = path.join(repoRoot, ".preview");

const DEBOUNCE_MS = 200;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ico": "image/x-icon",
};

/**
 * Der Schnipsel, der die Seite bei einem neuen Build neu lädt. Er wird erst
 * nach dem Bauen in die Datei unter .preview/ eingesetzt – der Generator
 * selbst bleibt unverändert, sodass eine für docs/ gebaute Seite ihn
 * technisch gar nicht enthalten kann.
 */
export function reloadSnippet() {
  return `
<script data-vorschau="reload">
(function () {
  var quelle = new EventSource("/__vorschau/ereignisse");
  quelle.addEventListener("neuaufbau", function () { location.reload(); });
  quelle.onerror = function () { /* Server weg: EventSource versucht es selbst erneut. */ };
})();
</script>
`;
}

export function injiziereReload(html) {
  const snippet = reloadSnippet();
  if (html.includes('data-vorschau="reload"')) return html;
  const idx = html.lastIndexOf("</body>");
  if (idx === -1) return html + snippet;
  return html.slice(0, idx) + snippet + html.slice(idx);
}

function demoLeadFuerSlug(slug) {
  const lead = DEMO_LEADS.find((eintrag) => `beispiel-${eintrag.kueche}` === slug);
  return lead ?? null;
}

/**
 * Baut genau einen Entwurf nach .preview/<slug>/. Für echte Leads läuft das
 * über die bestehende baueUndSchreibeEinzelnenEntwurf() aus publishSite.js
 * (sie nimmt den Zielordner bereits als Parameter entgegen) – es wird also
 * keine Seitenerzeugung dupliziert. Für die Demo-Lokale, die nicht im
 * Lead-Manifest stehen, greift derselbe schreibeSeiten()-Unterbau wie beim
 * vollständigen Lauf.
 */
export async function baueVorschau(slug, { zielordner = previewDir } = {}) {
  mkdirSync(zielordner, { recursive: true });

  if (leadFuerSlug(slug)) {
    await baueUndSchreibeEinzelnenEntwurf(slug, { zielordner, resonanz: "" });
  } else {
    const demo = demoLeadFuerSlug(slug);
    if (!demo) {
      throw new Error(
        `Kein Lead für Slug "${slug}" gefunden (weder in data/landingpages/entwuerfe.json noch unter den Demo-Lokalen).`,
      );
    }
    const fontCss = await ladeSchriften(path.join(zielordner, "assets", "fonts"));
    schreibeSeiten(
      [
        {
          lead: demo,
          cuisine: demo.kueche,
          gestaltung: themeForLead(
            demo,
            demo.kueche,
            stimmungFuerLead(demo, demo.kueche, ladeStimmungsWahl()),
          ),
          slug,
          menu: menuForCuisine(demo.kueche),
          // Auch beim Demo-Lokal sollen die eigenen Texte/Fotos sichtbar
          // werden – sonst ließe sich an ihm nichts sinnvoll feinjustieren.
          editUebersteuerung: loadLeadEdits(slug),
        },
      ],
      zielordner,
      { fontCss, fiktiv: true, resonanzUrl: "" },
    );
  }

  const datei = path.join(zielordner, slug, "index.html");
  const html = readFileSync(datei, "utf-8");
  writeFileSync(datei, injiziereReload(html), "utf-8");
  return datei;
}

/** Was eine Neuerzeugung auslösen soll: Quellcode, Lead-Texte, eigene Fotos. */
export function beobachtungsPfade(slug) {
  return [
    path.join(repoRoot, "src"),
    path.join(repoRoot, "data", "lead-edits"),
    path.join(uploadsDir, slug),
    path.join(repoRoot, "data", "landingpages"),
  ].filter((p) => existsSync(p) && statSync(p).isDirectory());
}

function sendeDatei(res, datei) {
  const typ = MIME[path.extname(datei).toLowerCase()] ?? "application/octet-stream";
  const body = readFileSync(datei);
  res.writeHead(200, {
    "Content-Type": typ,
    "Content-Length": body.length,
    // Nichts zwischenspeichern: die Vorschau lebt davon, dass die neueste
    // Fassung ankommt.
    "Cache-Control": "no-store",
  });
  res.end(body);
}

export async function starteVorschauServer(
  slug,
  { port = 4321, host = dashboardHost, zielordner = previewDir, beobachten = true } = {},
) {
  rmSync(path.join(zielordner, slug), { recursive: true, force: true });
  await baueVorschau(slug, { zielordner });

  const clients = new Set();

  function meldeNeuaufbau() {
    for (const res of clients) {
      res.write("event: neuaufbau\ndata: 1\n\n");
    }
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const pfad = decodeURIComponent(url.pathname);

    if (pfad === "/__vorschau/ereignisse") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      });
      res.write("retry: 1000\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }

    if (pfad === "/") {
      res.writeHead(302, { Location: `/${slug}/` });
      res.end();
      return;
    }

    // Kein Ausbruch aus dem Vorschauordner über "../" im Pfad.
    const ziel = path.normalize(path.join(zielordner, pfad));
    if (!ziel.startsWith(zielordner)) {
      res.writeHead(403).end("Verboten");
      return;
    }

    const datei = existsSync(ziel) && statSync(ziel).isDirectory() ? path.join(ziel, "index.html") : ziel;
    if (!existsSync(datei) || statSync(datei).isDirectory()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Nicht gefunden");
      return;
    }

    sendeDatei(res, datei);
  });

  await new Promise((resolve) => server.listen(port, host, resolve));
  const tatsaechlicherPort = server.address().port;

  const watcher = [];
  let timer = null;
  let laeuft = false;
  let nochmal = false;

  async function neuBauen() {
    if (laeuft) {
      nochmal = true;
      return;
    }
    laeuft = true;
    try {
      await baueVorschau(slug, { zielordner });
      console.log(`   ↻ Neu gebaut: ${new Date().toLocaleTimeString("de-DE")}`);
      meldeNeuaufbau();
    } catch (fehler) {
      console.log(`   ⚠️  Neuaufbau fehlgeschlagen: ${fehler.message}`);
    } finally {
      laeuft = false;
      if (nochmal) {
        nochmal = false;
        neuBauen();
      }
    }
  }

  function angestossen() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(neuBauen, DEBOUNCE_MS);
  }

  if (beobachten) {
    for (const pfad of beobachtungsPfade(slug)) {
      try {
        watcher.push(watch(pfad, { recursive: true }, angestossen));
      } catch {
        // Ohne rekursives Beobachten (manche Plattformen) wenigstens flach.
        try {
          watcher.push(watch(pfad, angestossen));
        } catch {
          console.log(`   ⚠️  Konnte ${pfad} nicht beobachten.`);
        }
      }
    }
  }

  return {
    server,
    port: tatsaechlicherPort,
    url: `http://${host === "0.0.0.0" ? "localhost" : host}:${tatsaechlicherPort}/${slug}/`,
    neuBauen,
    async stop() {
      if (timer) clearTimeout(timer);
      for (const w of watcher) w.close();
      for (const res of clients) res.end();
      clients.clear();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

function parseVorschauArgs(argv) {
  const args = { only: null, port: Number(process.env.PREVIEW_PORT || 4321) };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--only") args.only = argv[++i];
    if (argv[i] === "--port") args.port = Number(argv[++i]);
  }
  return args;
}

async function run() {
  const args = parseVorschauArgs(process.argv.slice(2));
  if (!args.only) {
    console.log("\nAufruf: npm run preview -- --only <slug> [--port 4321]\n");
    process.exitCode = 1;
    return;
  }

  try {
    const { url } = await starteVorschauServer(args.only, { port: args.port });
    console.log(`\n👀 Vorschau läuft: ${url}`);
    console.log(`   Gebaut nach: ${path.join(previewDir, args.only)} (gitignoriert, docs/ bleibt unberührt)`);
    console.log("   Änderungen an Lead-Texten, eigenen Fotos oder src/ laden die Seite neu.");
    console.log("   Wenn es passt: npm run publish-site -- --only " + args.only + "\n");
  } catch (fehler) {
    console.log(`\n${fehler.message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
