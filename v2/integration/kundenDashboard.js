// Kundenmodus der vorhandenen Bearbeiten-Ansicht (public/bearbeiten.html).
// Kein zweiter Editor: dieselbe Seite, dieselbe Anmeldung, dasselbe
// Upload-Verfahren (multipart wie /intern/lead/:slug/bild). Alle Routen –
// auch die lesenden und die Vorschau – liegen unter /intern/ und hängen
// damit an Token bzw. Anmeldung des Dashboards.
//
//   GET  /intern/kunden                              Liste der Kundenprojekte
//   POST /intern/kunden/anlegen                      { ausDemo: slug } | { ausBeispiel: kueche }
//   GET  /intern/kunde/:id                           Ansicht (Felder, Medien, Karte, Status)
//   POST /intern/kunde/:id/aktion                    { revision, aktion, ... } – alle Inhaltsänderungen
//   POST /intern/kunde/:id/medium                    multipart: rolle, revision, datei
//   GET  /intern/kunde/:id/datei/:datei              Mediendatei (Vorschau im Editor)
//   POST /intern/kunde/:id/bauen                     nur diese Kundenfassung lokal bauen
//   GET  /intern/kunde/:id/vorschau/…                gebaute Seite (Desktop/Mobil-Vorschau)
//   POST /intern/kunde/:id/freigeben                 { revision, von, notiz }
//   GET  /v2/kunden-panel.js                         Oberfläche (kundenPanel.browser.js)

import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  KUNDEN_ID,
  FELDER,
  BEREICHE,
  MEDIEN_ROLLEN,
  GESPERRTE_PLAETZE,
  LIMITS,
  alleProjekte,
  ladeProjekt,
  legeProjektAn,
  aendereProjekt,
  setzeFeld,
  bestaetigeFeld,
  setzeFarbschema,
  setzeOeffnungszeiten,
  bestaetigeOeffnungszeiten,
  setzeBestellung,
  aendereGericht,
  bestaetigeGericht,
  neuesGericht,
  entferneGericht,
  verschiebeGericht,
  neueKategorie,
  aendereKategorie,
  entferneKategorie,
  legeMediumVor,
  mediumAktion,
  mediumPfad,
  stufen,
  gibFrei,
  veroeffentlichungsPlan,
  KonfliktFehler,
  KUNDEN_DIR,
} from "../../src/kundenProjekt.js";
import { demoEinstellungen, farbschemataFuer } from "../../src/demoEinstellungen.js";
import { loadLeadEdits } from "../../src/leadEdits.js";
import { karteDesBetriebs } from "./demoBau.js";
import { menuForCuisine } from "../../src/menuCatalog.js";
import { DEMO_LEADS } from "../../src/demoLeads.js";
import { themeForLead } from "../../src/landingPageGenerator.js";
import { AUSDRUECKE, STANDARD_JE_KUECHE, ausdruckFuerSlug, stimmungFuerSlug } from "../build/ausdruck.js";
import { texteFuer } from "../build/texte.js";
import { ladeDesignsystem } from "../build/designsystemGenerator.js";
import { betriebExistiert, ladeBetrieb } from "../../src/betriebStore.js";
import { gueltigeFassung } from "../../src/rechtstexte.js";
import { parseMultipart, leseBinaerKoerper } from "../../src/bildUpload.js";
import { baueKundenfassung, KUNDEN_AUSGABE, vorschauVorhanden, bestellkatalog } from "./kundenBau.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PANEL = path.join(__dirname, "kundenPanel.browser.js");

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".webm": "video/webm", ".woff2": "font/woff2" };

/* ---------- Anlegen ---------- */

/** Kundenfassung aus einer Lead-Demo: Design übernehmen, Demo unverändert lassen. */
export function projektAusDemo(slug, { basis = KUNDEN_DIR } = {}) {
  const e = demoEinstellungen(slug);
  if (!e) throw new Error("Zu diesem Entwurf gibt es keinen Lead.");
  const edits = loadLeadEdits(slug);
  return legeProjektAn(
    {
      herkunft: { art: "lead-demo", slug, placeId: e.placeId },
      kueche: e.kueche,
      farbschema: e.farbschema.id,
      vorlage: e.vorlage.ausdruck,
      name: e.name.wert,
      adresse: e.adresse.wert,
      telefon: e.telefon.wert,
      slogan: e.slogan.wert,
      menu: karteDesBetriebs(edits, e.kueche) ?? menuForCuisine(e.kueche),
      quelleAngaben: "aus der Lead-Demo übernommen (Google Places bzw. Dashboard) – beim Kunden bestätigen",
    },
    { basis },
  );
}

/** Fiktiver Testkunde aus einer Beispielseite (für Tests und Probeläufe). */
export function projektAusBeispiel(kueche, { basis = KUNDEN_DIR } = {}) {
  const lead = DEMO_LEADS.find((l) => l.kueche === kueche);
  if (!lead) throw new Error(`Keine Beispielseite für „${kueche}“.`);
  const slug = `beispiel-${kueche}`;
  const farbschema = stimmungFuerSlug(slug) ?? themeForLead(lead, kueche).stimmung;
  return legeProjektAn(
    {
      herkunft: { art: "beispiel", slug, fiktiv: true },
      kueche,
      farbschema,
      vorlage: ausdruckFuerSlug(slug) ?? STANDARD_JE_KUECHE[kueche] ?? "gesellig",
      name: lead.name,
      adresse: lead.adresse,
      telefon: lead.telefon ?? "",
      menu: menuForCuisine(kueche),
      quelleAngaben: "fiktive Beispielseite (Testkunde)",
    },
    { basis },
  );
}

/* ---------- Ansicht ---------- */

function rechtslage(projekt) {
  const slug = projekt.felder.betriebSlug?.wert;
  if (!slug || !betriebExistiert(slug)) return { rechtstexte: {} };
  const daten = ladeBetrieb(slug);
  return { rechtstexte: { impressum: gueltigeFassung(daten.rechtsdokumente, "impressum"), datenschutz: gueltigeFassung(daten.rechtsdokumente, "datenschutz") } };
}

function feldStatus(projekt, f) {
  if (!f.wert) return "fehlt";
  const frei = projekt.freigabe && stufen(projekt).freigegeben.erreicht && f.status === "bestaetigt";
  return frei ? "freigegeben" : f.status;
}

/** Texte, die ohne eigenen Wert aus der Vorlage kommen – als „aktueller Wert“ mit Herkunft. */
function vorlagenTexte(projekt) {
  try {
    const ds = ladeDesignsystem(projekt.design.kueche, projekt.design.farbschema);
    const menu = menuForCuisine(projekt.design.kueche);
    const t = texteFuer({ ds, menu, lead: { name: projekt.felder.name.wert, adresse: projekt.felder.adresse.wert } });
    const hole = (pfad) => pfad.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), t);
    return {
      slogan: t.slogan,
      einladung: t.einladungText,
      ...Object.fromEntries(FELDER.filter((f) => f.id.startsWith("text.")).map((f) => [f.id, hole(f.id.slice(5)) ?? ""])),
    };
  } catch {
    return {};
  }
}

export function kundenAnsicht(id, { basis = KUNDEN_DIR } = {}) {
  const projekt = ladeProjekt(id, basis);
  const kontext = rechtslage(projekt);
  const s = stufen(projekt, kontext);
  const vorlage = vorlagenTexte(projekt);
  const dateiUrl = (m) => (m ? `/intern/kunde/${id}/datei/${encodeURIComponent(m.datei)}` : "");
  const medien = Object.entries(projekt.medien).map(([rolle, m]) => {
    const def = MEDIEN_ROLLEN[rolle] ?? { bereich: "speisekarte", label: rolle, art: "bild" };
    return {
      rolle,
      bereich: def.bereich,
      label: def.label,
      art: def.art,
      platz: def.platz ?? "",
      minBreite: def.minBreite ?? null,
      aktuell: m.aktuell ? { ...m.aktuell, url: dateiUrl(m.aktuell) } : null,
      vorschlag: m.vorschlag ? { ...m.vorschlag, url: dateiUrl(m.vorschlag) } : null,
      vorher: m.vorher ? { ...m.vorher, url: dateiUrl(m.vorher) } : null,
      alt: m.alt,
      fokus: m.fokus,
      status: m.aktuell ? (s.freigegeben.erreicht && m.status === "bestaetigt" ? "freigegeben" : m.status) : "fehlt",
      quelle: m.aktuell ? `Upload (${m.quelle || m.aktuell.von || "Dashboard"})` : "–",
    };
  });
  return {
    id,
    revision: projekt.revision,
    herkunft: projekt.herkunft,
    design: {
      ...projekt.design,
      vorlageLabel: AUSDRUECKE[projekt.design.vorlage]?.label ?? projekt.design.vorlage,
      farbschemata: farbschemataFuer(projekt.design.kueche),
    },
    bereiche: BEREICHE,
    felder: FELDER.map((f) => {
      const w = projekt.felder[f.id] ?? { wert: "", status: "fehlt" };
      return {
        id: f.id,
        bereich: f.bereich,
        label: f.label,
        max: f.max,
        mehrzeilig: Boolean(f.mehrzeilig),
        pflicht: Boolean(f.pflicht),
        platz: f.platz,
        wert: w.wert,
        vorlagenwert: vorlage[f.id] ?? "",
        quelle: w.wert ? w.quelle : vorlage[f.id] ? "Vorlagentext (Konzept) – wird ohne eigenen Wert angezeigt" : "",
        status: feldStatus(projekt, w),
        geaendertAm: w.geaendertAm ?? "",
      };
    }),
    medien,
    gesperrt: GESPERRTE_PLAETZE,
    limits: LIMITS,
    speisekarte: projekt.speisekarte,
    oeffnungszeiten: projekt.oeffnungszeiten,
    bestellung: projekt.bestellung,
    katalogGroesse: Object.keys(bestellkatalog(projekt)).length,
    stufen: s,
    build: projekt.build,
    vorschau: vorschauVorhanden(id) ? `/intern/kunde/${id}/vorschau/` : "",
    plan: veroeffentlichungsPlan(projekt, kontext),
    verlauf: (projekt.verlauf ?? []).slice(-12).reverse(),
  };
}

/* ---------- Aktionen ---------- */

const AKTIONEN = {
  feld: (p, e, i) => setzeFeld(p, e.feld, e.wert, i),
  feldBestaetigen: (p, e, i) => bestaetigeFeld(p, e.feld, e.bestaetigt !== false, { ...i, notiz: e.notiz }),
  farbschema: (p, e) => setzeFarbschema(p, e.farbschema, farbschemataFuer(p.design.kueche).map((f) => f.id)),
  oeffnungszeiten: (p, e, i) => setzeOeffnungszeiten(p, { zeilen: e.zeilen, ausnahmen: e.ausnahmen ?? [] }, i),
  oeffnungszeitenBestaetigen: (p, e, i) => bestaetigeOeffnungszeiten(p, e.bestaetigt !== false, i),
  bestellung: (p, e) => setzeBestellung(p, e.aktiv),
  gericht: (p, e, i) => aendereGericht(p, e.id, e.daten ?? {}, i),
  gerichtBestaetigen: (p, e) => bestaetigeGericht(p, e.id, e.bestaetigt !== false),
  gerichtNeu: (p, e, i) => neuesGericht(p, e.kategorie, e.daten ?? {}, i),
  gerichtEntfernen: (p, e) => entferneGericht(p, e.id),
  gerichtVerschieben: (p, e) => verschiebeGericht(p, e.id, e.richtung),
  kategorieNeu: (p, e) => neueKategorie(p, e.name),
  kategorie: (p, e) => aendereKategorie(p, e.id, e),
  kategorieEntfernen: (p, e) => entferneKategorie(p, e.id),
  medium: (p, e, i) => mediumAktion(p, e.rolle, e.medienAktion, { ...i, alt: e.alt, fokus: e.fokus }),
};

function beschreibe(e) {
  if (e.aktion === "feld") return `Feld ${e.feld} geändert`;
  if (e.aktion === "gericht") return `Gericht ${e.id} geändert`;
  if (e.aktion === "medium") return `Medium ${e.rolle}: ${e.medienAktion}`;
  return e.aktion;
}

/** Eine Inhaltsänderung – für Dashboard und CLI dieselbe Funktion. */
export function fuehreAktionAus(id, eingabe, { von = "Dashboard", basis = KUNDEN_DIR } = {}) {
  const fn = AKTIONEN[eingabe?.aktion];
  if (!fn) throw new Error("Unbekannte Aktion.");
  return aendereProjekt(id, eingabe.revision, (p, info) => fn(p, eingabe, info), { von, was: beschreibe(eingabe), basis });
}

/* ---------- HTTP ---------- */

function sende(res, status, daten, typ = "application/json; charset=utf-8", extra = {}) {
  res.writeHead(status, { "Content-Type": typ, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra });
  res.end(typeof daten === "string" || Buffer.isBuffer(daten) ? daten : JSON.stringify(daten));
}

function lies(req, max = 200_000) {
  return new Promise((resolve, reject) => {
    let roh = "";
    req.on("data", (t) => {
      roh += t;
      if (roh.length > max) reject(new Error("Anfrage zu groß"));
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

function sicherInnerhalb(basis, relativ) {
  let rel;
  try {
    rel = decodeURIComponent(relativ || "index.html");
  } catch {
    return null;
  }
  const ziel = path.resolve(basis, rel || "index.html");
  if (ziel !== basis && !ziel.startsWith(basis + path.sep)) return null;
  if (!existsSync(ziel)) return null;
  if (statSync(ziel).isDirectory()) return existsSync(path.join(ziel, "index.html")) ? path.join(ziel, "index.html") : null;
  return ziel;
}

const KUNDE = /^\/intern\/kunde\/(k-[a-z0-9]{10})(?:\/(aktion|medium|bauen|freigeben|datei|vorschau)(\/.*)?)?$/;

function fehlerAntwort(res, fehler, id) {
  const status = fehler instanceof KonfliktFehler ? 409 : 400;
  let ansicht = null;
  try {
    ansicht = id ? kundenAnsicht(id) : null;
  } catch {
    ansicht = null;
  }
  sende(res, status, { ok: false, fehler: fehler.message, konflikt: Boolean(fehler.konflikt), kunde: ansicht });
}

/** Liefert true, wenn die Anfrage eine Kunden-Route war. */
export async function kundenHandler(req, res, pathname) {
  if (pathname === "/v2/kunden-panel.js") {
    sende(res, 200, readFileSync(PANEL, "utf-8"), "text/javascript; charset=utf-8");
    return true;
  }
  if (pathname === "/intern/kunden" && req.method === "GET") {
    sende(res, 200, { ok: true, kunden: alleProjekte() });
    return true;
  }
  if (pathname === "/intern/kunden/anlegen" && req.method === "POST") {
    try {
      const e = await lies(req);
      const p = e.ausDemo ? projektAusDemo(String(e.ausDemo)) : e.ausBeispiel ? projektAusBeispiel(String(e.ausBeispiel)) : null;
      if (!p) throw new Error("Bitte angeben, aus welcher Demo die Kundenfassung entsteht.");
      sende(res, 200, { ok: true, id: p.id, url: `/bearbeiten.html?kunde=${p.id}` });
    } catch (fehler) {
      fehlerAntwort(res, fehler);
    }
    return true;
  }
  const t = KUNDE.exec(pathname);
  if (!t) return false;
  const [, id, teil, rest] = t;
  if (!KUNDEN_ID.test(id)) return false;

  try {
    if (!teil && req.method === "GET") {
      sende(res, 200, { ok: true, kunde: kundenAnsicht(id) });
      return true;
    }
    if (teil === "datei" && req.method === "GET") {
      const datei = mediumPfad(id, decodeURIComponent(String(rest ?? "").slice(1)));
      if (!datei) return sende(res, 404, "Nicht gefunden", "text/plain; charset=utf-8"), true;
      sende(res, 200, readFileSync(datei), MIME[path.extname(datei)] ?? "application/octet-stream");
      return true;
    }
    if (teil === "vorschau" && req.method === "GET") {
      // Ohne abschließenden Schrägstrich lösen relative Pfade der Seite falsch auf.
      if (!rest) return res.writeHead(302, { Location: `/intern/kunde/${id}/vorschau/` }), res.end(), true;
      const basis = path.join(KUNDEN_AUSGABE, id);
      const datei = sicherInnerhalb(basis, rest.slice(1));
      if (!datei) return sende(res, 404, "Noch nicht gebaut", "text/plain; charset=utf-8"), true;
      sende(res, 200, readFileSync(datei), MIME[path.extname(datei).toLowerCase()] ?? "application/octet-stream", { "X-Robots-Tag": "noindex, nofollow" });
      return true;
    }
    if (req.method !== "POST") return false;

    if (teil === "aktion") {
      const e = await lies(req);
      fuehreAktionAus(id, e, { von: "Dashboard" });
      sende(res, 200, { ok: true, kunde: kundenAnsicht(id) });
      return true;
    }
    if (teil === "medium") {
      const koerper = await leseBinaerKoerper(req, LIMITS.videoBytes + 256 * 1024);
      const { felder, dateien } = parseMultipart(koerper, req.headers["content-type"]);
      if (!dateien.datei?.inhalt) throw new Error("Keine Datei empfangen.");
      aendereProjekt(id, felder.revision, (p, info) => legeMediumVor(p, String(felder.rolle ?? ""), dateien.datei.inhalt, info), { von: "Dashboard", was: `Upload ${felder.rolle}` });
      sende(res, 200, { ok: true, kunde: kundenAnsicht(id) });
      return true;
    }
    if (teil === "bauen") {
      const ergebnis = await baueKundenfassung(id);
      sende(res, 200, { ok: true, sync: ergebnis.sync, kunde: kundenAnsicht(id) });
      return true;
    }
    if (teil === "freigeben") {
      const e = await lies(req);
      const projekt = ladeProjekt(id);
      const kontext = rechtslage(projekt);
      aendereProjekt(id, e.revision, (p, info) => gibFrei(p, { von: e.von, notiz: e.notiz }, { jetzt: info.jetzt, kontext }), { von: "Dashboard", was: "Inhalte freigegeben" });
      sende(res, 200, { ok: true, kunde: kundenAnsicht(id) });
      return true;
    }
  } catch (fehler) {
    fehlerAntwort(res, fehler, id);
    return true;
  }
  return false;
}
