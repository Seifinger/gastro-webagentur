import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { timingSafeEqual } from "node:crypto";
import path from "node:path";
import QRCode from "qrcode";
import { readAllLeads } from "./csvImport.js";
import {
  landingPagesDir,
  docsDir,
  siteBaseUrl,
  absenderName,
  dashboardHost,
  resonanzUrl,
} from "./config.js";
import {
  ladeZuordnungen,
  speichereZuordnung,
  kuecheFuerLead,
} from "./cuisineOverrides.js";
import { kuechenAuswahl } from "./menuCatalog.js";
import { anschreiben } from "./outreach.js";
import { ageInDays, isStale, isAgingSoon } from "./leadFreshness.js";
import {
  FOTO_SLOTS,
  platzhalterBilder,
  themeForLead,
  ortsbezug,
  buildLandingPage,
} from "./landingPageGenerator.js";
import { assetFileName } from "./imageLibrary.js";
import { menuForCuisine, gerichtId } from "./menuCatalog.js";
import { loadLeadEdits, saveLeadEdits } from "./leadEdits.js";
import {
  BILD_ROLLEN,
  MAX_BYTES,
  bildMasse,
  leseBinaerKoerper,
  parseMultipart,
  speichereLeadBild,
  uploadsDir,
} from "./bildUpload.js";
import { erzeugeTextVorschlag, letzterVorschlag, vergissVorschlag } from "./promptEdits.js";
import { veroeffentlicheEntwurf } from "./veroeffentlichung.js";
import { resonanzUebersicht } from "./resonanzStore.js";
import { ladeStimmungsWahl, speichereStimmung, stimmungFuerLead } from "./stimmungsWahl.js";
import { stimmungsAuswahl, stimmungenFuer } from "./stimmungen.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const dashboardHtmlPath = path.join(publicDir, "dashboard.html");
const bearbeitenHtmlPath = path.join(publicDir, "bearbeiten.html");
const manifestPath = path.join(landingPagesDir, "entwuerfe.json");

const ENTWURF_PREFIX = "/entwuerfe/";
const UPLOAD_PREFIX = "/uploads/";

// Der Upload-Endpoint trägt ein "/intern/", weil er – anders als die
// Entwürfe – nur für den Betreiber gedacht ist.
const BILD_UPLOAD = /^\/intern\/lead\/([^/]+)\/bild$/;
const LEAD_BILDER = /^\/api\/lead\/([^/]+)\/bilder$/;
const PROMPT_VORSCHLAG = /^\/intern\/lead\/([^/]+)\/prompt$/;
const PROMPT_VORSCHAU = /^\/intern\/lead\/([^/]+)\/prompt\/vorschau$/;
const PROMPT_UEBERNEHMEN = /^\/intern\/lead\/([^/]+)\/prompt\/uebernehmen$/;
const PROMPT_VERWERFEN = /^\/intern\/lead\/([^/]+)\/prompt\/verwerfen$/;
const VEROEFFENTLICHEN = /^\/intern\/lead\/([^/]+)\/veroeffentlichen$/;

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
        slug: slug ?? "",
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
        // Hat der Wirt den Entwurf angesehen? Der Collector schreibt nach
        // data/resonanz/, hier wird bei jeder Anfrage frisch gelesen – beide
        // Prozesse teilen sich nur die Platte (siehe resonanzServer.js).
        resonanz: slug ? resonanzUebersicht(slug) : null,
      };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/**
 * Löst einen URL-Pfad innerhalb eines Ordners auf. Gibt null zurück, wenn er
 * aus dem Ordner herausführt – sonst könnte über "../" jede Datei auf der
 * Platte abgerufen werden.
 */
function dateiImOrdner(ordner, relativ) {
  const target = path.resolve(ordner, decodeURIComponent(relativ));
  const erlaubt = path.resolve(ordner);

  if (target !== erlaubt && !target.startsWith(erlaubt + path.sep)) return null;
  return existsSync(target) ? target : null;
}

function resolveEntwurfFile(pathname) {
  const target = dateiImOrdner(landingPagesDir, pathname.slice(ENTWURF_PREFIX.length));
  if (!target) return null;

  const datei = statSync(target).isDirectory() ? path.join(target, "index.html") : target;
  if (!existsSync(datei)) return null;

  const type = MIME_TYPES[path.extname(datei).toLowerCase()];
  return type ? { datei, type } : null;
}

/**
 * Beschriftung der vier Bildplätze. Haus, Team und Bestseller kommen wörtlich
 * aus FOTO_SLOTS in landingPageGenerator.js, damit Bearbeitungsansicht und
 * Entwurf dasselbe versprechen.
 */
function bildPlaetze() {
  const [haus, team, bestseller] = FOTO_SLOTS;
  return [
    {
      rolle: "hero",
      titel: "Titelbild",
      hinweis: "Das große Bild ganz oben, hinter Name und Bewertung",
      platzhalter: "Hero-Bild aus imageLibrary.js",
    },
    { rolle: "haus", ...haus, platzhalter: "1. Bildplatz in renderFotoSlots()" },
    { rolle: "team", ...team, platzhalter: "2. Bildplatz in renderFotoSlots()" },
    { rolle: "bestseller", ...bestseller, platzhalter: "3. Bildplatz in renderFotoSlots()" },
  ];
}

/**
 * Löst einen Entwurfs-Slug über die Manifest-Zuordnung auf den zugehörigen
 * Lead und dessen Küche auf. Grundlage für die Bild- und die Text-Ansicht der
 * Bearbeitungsseite.
 */
function findeLeadFuerSlug(slug) {
  const manifest = readManifest();
  const placeId = Object.keys(manifest).find((id) => manifest[id] === slug);
  const lead = placeId ? readAllLeads().find((l) => l.placeId === placeId) : null;
  if (!lead) return null;

  return { lead, kueche: kuecheFuerLead(lead, ladeZuordnungen()) };
}

/**
 * Was auf der Seite dieses Entwurfs gerade an den vier Bildplätzen steht:
 * entweder ein eigenes Foto aus den lead-edits oder der Stock-Platzhalter.
 */
function leadBilder(slug) {
  const gefunden = findeLeadFuerSlug(slug);
  if (!gefunden) return null;
  const { lead, kueche } = gefunden;

  const platzhalter = platzhalterBilder(lead, kueche);
  const eigene = loadLeadEdits(slug).bilder ?? {};

  const plaetze = bildPlaetze().map((platz) => {
    const stock = platzhalter[platz.rolle];
    const stockDatei = assetFileName(stock.id, stock.role);
    // Ohne "npm run pages" liegt das Stockfoto noch nicht auf der Platte –
    // dann gibt es schlicht keine Vorschau statt eines kaputten Bildes.
    const stockUrl = existsSync(path.join(landingPagesDir, "assets", stockDatei))
      ? `${ENTWURF_PREFIX}assets/${stockDatei}`
      : null;

    return {
      ...platz,
      eigen: Boolean(eigene[platz.rolle]),
      aktuell: eigene[platz.rolle] ?? stockUrl,
    };
  });

  return { slug, name: lead.name, entwurf: `${ENTWURF_PREFIX}${slug}/`, plaetze };
}

/**
 * Alles, was ein Textvorschlag über den aktuellen Entwurf wissen muss: die
 * schon aktiven Texte (Google-Standard oder frühere eigene Übersteuerung) und
 * jedes Gericht der Karte mit seiner Gericht-ID – so kann das Sprachmodell
 * highlightBeschreibungen nur mit IDs füllen, die es auf dieser Karte wirklich
 * gibt (siehe erlaubteGerichtIds, geprüft in promptEdits.js).
 */
function leadTextKontext(slug) {
  const gefunden = findeLeadFuerSlug(slug);
  if (!gefunden) return null;
  const { lead, kueche } = gefunden;

  const menu = menuForCuisine(kueche);
  const eigeneTexte = loadLeadEdits(slug).texte ?? {};
  const eigeneBeschreibungen = eigeneTexte.highlightBeschreibungen ?? {};

  const lage = ortsbezug(lead.adresse, lead.ort);
  const schlagzeileStandard = lage ? `${menu.tagline} – ${lage}.` : `${menu.tagline}.`;

  const gerichte = menu.kategorien.flatMap((kategorie, katIndex) =>
    kategorie.gerichte.map((gericht, gerichtIndex) => {
      const id = gerichtId(katIndex, gerichtIndex);
      return { id, name: gericht.name, beschreibung: eigeneBeschreibungen[id] ?? gericht.beschreibung };
    }),
  );

  return {
    lead,
    kueche,
    menu,
    name: lead.name || "Ihr Restaurant",
    aktuelleHeadline: eigeneTexte.headline ?? (lead.name || "Ihr Restaurant"),
    aktuelleSchlagzeile: eigeneTexte.schlagzeile ?? schlagzeileStandard,
    gerichte,
    erlaubteGerichtIds: new Set(gerichte.map((g) => g.id)),
  };
}

function sendeJson(res, status, daten) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(daten));
}

/* ---------- Zugriffsschutz für die schreibenden/kostenpflichtigen Routen ---------- */

// Alles unter /intern/ (Bild-Upload, Prompt-Vorschläge samt Vorschau,
// Veröffentlichen) sowie die Kuechen-Override-Route – das sind die einzigen
// Aktionen, die etwas schreiben, Geld kosten (Anthropic-API) oder committen
// und pushen. Reine Anzeige-Routen wie /api/leads bleiben ungeschützt.
function brauchtToken(pathname, method) {
  if (pathname.startsWith("/intern/")) return true;
  if (pathname === "/api/kueche" && method === "POST") return true;
  return false;
}

function tokenAusAnfrage(req) {
  const headerToken = req.headers["x-dashboard-token"];
  if (headerToken) return Array.isArray(headerToken) ? headerToken[0] : headerToken;

  // Fürs iframe mit der Textvorschau (PROMPT_VORSCHAU): das lädt per
  // GET-Navigation, ohne eigenen Header setzen zu können – das Cookie geht
  // bei einer Navigation zur selben Origin trotzdem mit.
  const treffer = /(?:^|;\s*)dashboard_token=([^;]+)/.exec(req.headers.cookie ?? "");
  return treffer ? decodeURIComponent(treffer[1]) : null;
}

/**
 * Liest DASHBOARD_TOKEN bei jeder Anfrage frisch aus process.env statt es
 * einmalig beim Start zu cachen – genau wie ANTHROPIC_API_KEY in
 * promptEdits.js. Nur so können Tests den Token je Testfall setzen, ohne das
 * Modul neu zu laden.
 */
function tokenGueltig(eingegeben) {
  const erwartet = process.env.DASHBOARD_TOKEN || "";
  if (!erwartet) return true; // kein Schutz konfiguriert – siehe Warnung beim Start

  if (!eingegeben) return false;

  const a = Buffer.from(String(eingegeben));
  const b = Buffer.from(erwartet);
  // timingSafeEqual wirft bei unterschiedlicher Länge, statt "ungleich" zu
  // liefern – deshalb die Länge vorher separat prüfen.
  return a.length === b.length && timingSafeEqual(a, b);
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

export const handler = async (req, res) => {
  const { pathname, searchParams } = new URL(
    req.url,
    `http://${req.headers.host ?? "localhost"}`,
  );

  if (brauchtToken(pathname, req.method) && !tokenGueltig(tokenAusAnfrage(req))) {
    sendeJson(res, 401, {
      ok: false,
      fehler: "Ungültiger oder fehlender Dashboard-Token. Bitte im Dashboard neu anmelden.",
    });
    return;
  }

  if (pathname === "/" || pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(readFileSync(dashboardHtmlPath, "utf-8"));
    return;
  }

  if (pathname === "/bearbeiten.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(readFileSync(bearbeitenHtmlPath, "utf-8"));
    return;
  }

  if (pathname.startsWith(UPLOAD_PREFIX)) {
    const datei = dateiImOrdner(uploadsDir, pathname.slice(UPLOAD_PREFIX.length));
    if (!datei || statSync(datei).isDirectory()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Bild nicht gefunden");
      return;
    }

    // Der Typ kommt aus den Bytes, nicht aus der Endung: gespeichert wird
    // immer als .jpg, ein PNG bliebe sonst falsch ausgezeichnet.
    const inhalt = readFileSync(datei);
    res.writeHead(200, { "Content-Type": bildMasse(inhalt)?.typ ?? "image/jpeg" });
    res.end(inhalt);
    return;
  }

  const bilderTreffer = LEAD_BILDER.exec(pathname);
  if (bilderTreffer) {
    const daten = leadBilder(decodeURIComponent(bilderTreffer[1]));
    if (!daten) {
      sendeJson(res, 404, { fehler: "Zu diesem Entwurf gibt es keinen Lead." });
      return;
    }
    sendeJson(res, 200, daten);
    return;
  }

  const uploadTreffer = BILD_UPLOAD.exec(pathname);
  if (uploadTreffer && req.method === "POST") {
    try {
      // Etwas Luft über der Bildgrenze für den multipart-Rahmen; die harte
      // Grenze für das Bild selbst zieht speichereLeadBild.
      const koerper = await leseBinaerKoerper(req, MAX_BYTES + 64 * 1024);
      const { felder, dateien } = parseMultipart(koerper, req.headers["content-type"]);
      const ergebnis = speichereLeadBild(
        decodeURIComponent(uploadTreffer[1]),
        felder.rolle,
        dateien.datei,
      );
      sendeJson(res, 200, { ok: true, ...ergebnis });
    } catch (fehler) {
      sendeJson(res, 400, { ok: false, fehler: fehler.message });
    }
    return;
  }

  const vorschlagTreffer = PROMPT_VORSCHLAG.exec(pathname);
  if (vorschlagTreffer && req.method === "POST") {
    const slug = decodeURIComponent(vorschlagTreffer[1]);
    try {
      const kontext = leadTextKontext(slug);
      if (!kontext) throw new Error("Zu diesem Entwurf gibt es keinen Lead.");

      const { wunsch } = JSON.parse(await leseKoerper(req));
      const vorschlag = await erzeugeTextVorschlag(slug, wunsch, kontext);
      sendeJson(res, 200, {
        ok: true,
        vorschlag,
        vorschauUrl: `/intern/lead/${encodeURIComponent(slug)}/prompt/vorschau`,
      });
    } catch (fehler) {
      sendeJson(res, 400, { ok: false, fehler: fehler.message });
    }
    return;
  }

  const vorschauTreffer = PROMPT_VORSCHAU.exec(pathname);
  if (vorschauTreffer && req.method === "GET") {
    const slug = decodeURIComponent(vorschauTreffer[1]);
    const eintrag = letzterVorschlag(slug);
    const kontext = eintrag ? leadTextKontext(slug) : null;

    if (!eintrag || !kontext) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Kein Vorschlag vorhanden – erst \"Vorschlag generieren\" ausführen.");
      return;
    }

    // Nicht gespeichert: gerendert wird direkt aus dem In-Memory-Vorschlag,
    // über die schon aktiven lead-edits gelegt. Erst /prompt/uebernehmen
    // schreibt etwas auf die Platte.
    const vorhandeneEdits = loadLeadEdits(slug);
    const html = buildLandingPage(kontext.lead, {
      menu: kontext.menu,
      // Mit derselben Stimmung wie der spätere Entwurf – sonst zeigt die
      // Vorschau eine andere Welt als die Seite, die der Wirt bekommt.
      gestaltung: themeForLead(
        kontext.lead,
        kontext.kueche,
        stimmungFuerLead(kontext.lead, kontext.kueche),
      ),
      bildUrl: (id, role) => `${ENTWURF_PREFIX}assets/${assetFileName(id, role)}`,
      editUebersteuerung: {
        bilder: vorhandeneEdits.bilder,
        texte: { ...vorhandeneEdits.texte, ...eintrag.vorschlag },
      },
    });

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  const uebernehmenTreffer = PROMPT_UEBERNEHMEN.exec(pathname);
  if (uebernehmenTreffer && req.method === "POST") {
    const slug = decodeURIComponent(uebernehmenTreffer[1]);
    try {
      const eintrag = letzterVorschlag(slug);
      if (!eintrag) throw new Error("Kein Vorschlag zum Übernehmen vorhanden.");

      const vorhanden = loadLeadEdits(slug);
      const neueTexte = {
        ...vorhanden.texte,
        ...("headline" in eintrag.vorschlag ? { headline: eintrag.vorschlag.headline } : {}),
        ...("schlagzeile" in eintrag.vorschlag ? { schlagzeile: eintrag.vorschlag.schlagzeile } : {}),
        highlightBeschreibungen: {
          ...(vorhanden.texte?.highlightBeschreibungen ?? {}),
          ...(eintrag.vorschlag.highlightBeschreibungen ?? {}),
        },
      };

      saveLeadEdits(slug, { ...vorhanden, texte: neueTexte });
      vergissVorschlag(slug);
      sendeJson(res, 200, { ok: true });
    } catch (fehler) {
      sendeJson(res, 400, { ok: false, fehler: fehler.message });
    }
    return;
  }

  const verwerfenTreffer = PROMPT_VERWERFEN.exec(pathname);
  if (verwerfenTreffer && req.method === "POST") {
    vergissVorschlag(decodeURIComponent(verwerfenTreffer[1]));
    sendeJson(res, 200, { ok: true });
    return;
  }

  const veroeffentlichenTreffer = VEROEFFENTLICHEN.exec(pathname);
  if (veroeffentlichenTreffer && req.method === "POST") {
    const slug = decodeURIComponent(veroeffentlichenTreffer[1]);
    try {
      const ergebnis = await veroeffentlicheEntwurf(slug);
      sendeJson(res, 200, { ok: true, ...ergebnis });
    } catch (fehler) {
      // Merge-Konflikt, kein Internetzugang, unbekannter Slug: alles landet
      // hier – die Route darf dabei nie den Server mitreißen.
      sendeJson(res, 400, { ok: false, fehler: fehler.message });
    }
    return;
  }

  if (pathname === "/api/leads") {
    sendeJson(res, 200, {
      kuechen: kuechenAuswahl(),
      leads: leadsMitZusatz(),
      resonanzAktiv: Boolean(resonanzUrl),
    });
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
};

// Nur beim direkten Start (npm run dashboard) wird auch gelauscht. Der Test
// importiert denselben Handler und hängt ihn an einen eigenen Port, statt
// dem laufenden Dashboard den Platz wegzunehmen.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.env.DASHBOARD_TOKEN) {
    console.log(
      "\n⚠️  Dashboard läuft ohne Zugriffsschutz - nicht für den Einsatz außerhalb von localhost geeignet.\n" +
        "   DASHBOARD_TOKEN in der .env setzen, um die /intern/-Routen abzusichern (siehe .env.example).\n",
    );
  }

  const server = createServer(handler);

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

  server.listen(port, dashboardHost, () => {
    console.log(`\n📊 Dashboard läuft: http://${dashboardHost}:${port}\n`);
  });
}
