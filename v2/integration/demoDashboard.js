// Demo-Steuerung im Lead-Dashboard (v2/DEMO-UMBAU.md, Teil 2).
//
//   GET  /api/v2/demo/:slug                      Einstellungen, Vorschau-Daten, Status
//   POST /intern/v2/demo/:slug/speichern         Küche, Vorlage, Farbschema, Slogan, Bestätigungen
//   POST /intern/v2/demo/:slug/vorschau          Konzept-Demo lokal bauen (v2/output/leads/<slug>/)
//   POST /intern/v2/demo/:slug/praesentation     Präsentation im WLAN starten/beenden ({ aktion, minuten })
//   POST /intern/v2/demo/:slug/veroeffentlichen  abgeschaltet (410) – Lead-Demos sind nicht öffentlich
//   GET  /v2/demo-panel.js                       Oberfläche (demoPanel.browser.js)
//
// Schreibende Routen liegen unter /intern/ und hängen damit an der Anmeldung
// des Dashboards (dashboardServer.js).

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { demoEinstellungen, speichereDemoEinstellungen } from "../../src/demoEinstellungen.js";
import { kuechenAuswahl } from "../../src/menuCatalog.js";
import { laeuftGerade } from "../../src/veroeffentlichung.js";
import { MELDUNG_NICHT_OEFFENTLICH } from "../../src/oeffentlichkeit.js";
import { loadLeadEdits } from "../../src/leadEdits.js";
import { themeForLead } from "../../src/landingPageGenerator.js";
import { ladeDesignsystem } from "../build/designsystemGenerator.js";
import { AUSDRUECKE } from "../build/ausdruck.js";
import { loeseMedien, medienUebersicht, medienStatus } from "../assets-pipeline/mediaGenerator.js";
import { alteOeffentlicheDemo } from "../../src/oeffentlichkeit.js";
import { praesentationStatus, startePraesentation, beendePraesentation, STANDARD_DAUER_MIN } from "../../src/praesentation.js";
import { veroeffentlichungsHindernisse, bauParameter, baueDemo } from "./demoBau.js";
import { OUTPUT_DIR } from "../build/siteBuilder.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PANEL = path.join(__dirname, "demoPanel.browser.js");
const LEADS_DIR = path.join(OUTPUT_DIR, "leads");

const LESEN = /^\/api\/v2\/demo\/([^/]+)$/;
const AKTION = /^\/intern\/v2\/demo\/([^/]+)\/(speichern|vorschau|praesentation|veroeffentlichen)$/;

const vorschauLaeuft = new Set();

function farbenFuer(kueche, id) {
  try {
    const r = ladeDesignsystem(kueche, id).farben.rollen;
    return { grund: r.grund.hex, text: r.text.hex, akzent: r.akzent.hex, tint: r.tint.hex };
  } catch {
    return null;
  }
}

/** Alles, was das Panel anzeigt – öffentlich verwendete Angaben klar getrennt. */
export function demoAnsicht(slug) {
  const e = demoEinstellungen(slug);
  if (!e) return null;
  const p = bauParameter(e);
  const gestaltung = themeForLead(p.lead, e.kueche, e.farbschema.id);
  let medien = [];
  let status = { zeilen: [], fehlend: [] };
  try {
    const ds = ladeDesignsystem(e.kueche, e.farbschema.id);
    const geloest = loeseMedien({ slug, gestaltung, ds, leadEdits: loadLeadEdits(slug), offline: true, konzeptVon: `beispiel-${e.kueche}` });
    medien = medienUebersicht(geloest);
    status = medienStatus(geloest);
  } catch {
    medien = [];
  }
  const vorschau = existsSync(path.join(LEADS_DIR, slug, "index.html")) ? `/v2/leads/${encodeURIComponent(slug)}/` : "";
  // Was die zuletzt gebaute lokale Demo wirklich enthält (Bericht des Baus).
  let gebaut = null;
  try {
    const b = JSON.parse(readFileSync(path.join(LEADS_DIR, slug, "bericht.json"), "utf-8"));
    gebaut = { ausdruck: b.ausdruck ?? "", designsystem: b.designsystem, heroVariante: b.heroVariante, medienStatus: b.medienStatus ?? null };
  } catch {
    gebaut = null;
  }
  const p2 = praesentationStatus();
  return {
    slug,
    placeId: e.placeId,
    kueche: e.kueche,
    kuecheManuell: e.kuecheManuell,
    kuechen: kuechenAuswahl(),
    vorlage: e.vorlage,
    vorlagen: Object.values(AUSDRUECKE).map((a) => ({ id: a.id, label: a.label, passtZu: a.passtZu })),
    farbschema: e.farbschema,
    farbschemata: e.farbschemata.map((f) => ({ ...f, farben: farbenFuer(e.kueche, f.id) })),
    slogan: e.slogan,
    name: e.name,
    adresse: e.adresse,
    telefon: e.telefon,
    // Was tatsächlich auf der öffentlichen Demo steht (Teil 4).
    oeffentlich: { name: p.lead.name, adresse: p.lead.adresse, telefon: p.lead.telefon, googleMapsUrl: e.googleMapsUrl, googleNote: false },
    // Nur im geschützten Dashboard: die zwischengespeicherte Google-Note.
    google: { rating: e.lead.rating ?? "", anzahl: e.lead.anzahlBewertungen ?? "", abgerufen: e.lead.fetchedAt ?? "" },
    medien,
    medienStatus: status,
    gebaut,
    // Frühere öffentliche Adresse (GitHub Pages): online / abgeschaltet / nie.
    altDemo: alteOeffentlicheDemo(slug),
    praesentation: p2.aktiv && p2.slug === slug ? p2 : { aktiv: false, andere: p2.aktiv ? p2.slug : "" },
    praesentationDauer: STANDARD_DAUER_MIN,
    status: e.status,
    laeuft: laeuftGerade(slug) || vorschauLaeuft.has(slug),
    hindernisse: veroeffentlichungsHindernisse(e),
    vorschau,
  };
}

function sende(res, status, daten, typ = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": typ, "Cache-Control": "no-store" });
  res.end(typeof daten === "string" ? daten : JSON.stringify(daten));
}

function lies(req) {
  return new Promise((resolve, reject) => {
    let roh = "";
    req.on("data", (t) => {
      roh += t;
      if (roh.length > 10_000) reject(new Error("Anfrage zu groß"));
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

const FELDER = ["kueche", "vorlage", "farbschema", "slogan", "name", "adresse", "telefon"];

/** Liefert true, wenn die Anfrage eine Demo-Route war. */
export async function demoHandler(req, res, pathname) {
  if (pathname === "/v2/demo-panel.js") {
    sende(res, 200, readFileSync(PANEL, "utf-8"), "text/javascript; charset=utf-8");
    return true;
  }
  const lesen = LESEN.exec(pathname);
  if (lesen && req.method === "GET") {
    const ansicht = demoAnsicht(decodeURIComponent(lesen[1]));
    sende(res, ansicht ? 200 : 404, ansicht ?? { ok: false, fehler: "Zu diesem Entwurf gibt es keinen Lead." });
    return true;
  }
  const aktion = AKTION.exec(pathname);
  if (!aktion || req.method !== "POST") return false;
  const slug = decodeURIComponent(aktion[1]);
  try {
    const eingabe = await lies(req);
    const aenderung = Object.fromEntries(FELDER.filter((f) => f in eingabe).map((f) => [f, eingabe[f]]));
    if (aktion[2] === "speichern") {
      speichereDemoEinstellungen(slug, aenderung);
      sende(res, 200, { ok: true, demo: demoAnsicht(slug) });
    } else if (aktion[2] === "praesentation") {
      if (eingabe.aktion === "stop") await beendePraesentation();
      else await startePraesentation(slug, { dauerMin: Number(eingabe.minuten) || STANDARD_DAUER_MIN });
      sende(res, 200, { ok: true, demo: demoAnsicht(slug) });
    } else if (aktion[2] === "vorschau") {
      if (vorschauLaeuft.has(slug) || laeuftGerade(slug)) throw new Error("Für diese Demo läuft bereits ein Bau.");
      if (Object.keys(aenderung).length) speichereDemoEinstellungen(slug, aenderung);
      vorschauLaeuft.add(slug);
      try {
        await baueDemo(slug, { zielDir: LEADS_DIR });
      } finally {
        vorschauLaeuft.delete(slug);
      }
      sende(res, 200, { ok: true, demo: demoAnsicht(slug) });
    } else {
      // Veröffentlichen gibt es für Lead-Demos nicht mehr (src/oeffentlichkeit.js).
      if (Object.keys(aenderung).length) speichereDemoEinstellungen(slug, aenderung);
      sende(res, 410, { ok: false, fehler: MELDUNG_NICHT_OEFFENTLICH, demo: demoAnsicht(slug) });
    }
  } catch (fehler) {
    sende(res, 400, { ok: false, fehler: fehler.message, demo: demoAnsicht(slug) });
  }
  return true;
}
