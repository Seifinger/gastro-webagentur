// v2 im Agentur-Dashboard (src/dashboardServer.js) – Stage 7b.
//
// dashboardServer.js ruft nur drei Funktionen auf:
//   v2Handler(req, res, pathname)  – eigene Routen (/api/v2/…, /intern/v2/…, /v2/…)
//   ergaenzeLeadsV2(leads)         – Engine und v2-Status je Lead für /api/leads
//   v2HtmlInjektion(html, seite)   – bindet Stil und Skript in dashboard.html /
//                                    bearbeiten.html ein, ohne die Dateien zu ändern
//
// Engine-Wahl: global (Standard "v2" seit AP11, änderbar im Dashboard oder
// per ENGINE_STANDARD=v1) und je Lead übersteuerbar. Gespeichert in
// data/v2-engine.json. Fehlt die Datei (neuer Checkout, anderer Rechner),
// gilt v2 – kein stiller Rückfall auf die alte Optik (Plan A.4.1).
//
// Ausdruck je Lead (AP11): gespeichert im versionierten v2/ausdruck-wahl.json;
// ohne Wahl gilt die Standard-Zuordnung der Küche (ausdruck.js).

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readAllLeads } from "../../src/csvImport.js";
import { ladeManifest, placeIdFuerSlug } from "../../src/entwurfsManifest.js";
import { ladeZuordnungen, kuecheFuerLead } from "../../src/cuisineOverrides.js";
import { stimmungFuerLead } from "../../src/stimmungsWahl.js";
import { loadLeadEdits } from "../../src/leadEdits.js";
import { themeForLead } from "../build/v1Funktionen.js";
import { ladeDesignsystem, HERO_VARIANTEN } from "../build/designsystemGenerator.js";
import { OUTPUT_DIR, FONTS_DIR } from "../build/siteBuilder.js";
import { schriftCss } from "../build/schriften.js";
import { loeseMedien, medienUebersicht } from "../assets-pipeline/mediaGenerator.js";
import { creativeHandler } from "./creativeDashboard.js";
import { AUSDRUECKE, AUSDRUCK_AUS } from "../build/ausdruck.js";
import { demoEinstellungen, speichereDemoEinstellungen } from "../../src/demoEinstellungen.js";
import { baueDemo, bauParameter } from "./demoBau.js";
import { demoHandler } from "./demoDashboard.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..", "..");
export const ENGINE_DATEI = path.join(REPO, "data", "v2-engine.json");
// Tests setzen V2_ENGINE_DATEI auf eine Wegwerfdatei – die echte Wahl bleibt unberührt.
const engineDatei = () => process.env.V2_ENGINE_DATEI || ENGINE_DATEI;
export const LEADS_DIR = path.join(OUTPUT_DIR, "leads");
const DESIGNSYSTEM_DIR = path.join(REPO, "v2", "designsysteme");
const ENGINES = ["v1", "v2"];

/* ------------------------------------------------------------------ */
/* Engine-Wahl                                                         */
/* ------------------------------------------------------------------ */

export function ladeEngineWahl(datei = engineDatei()) {
  let gespeichert = {};
  try {
    gespeichert = JSON.parse(readFileSync(datei, "utf-8"));
  } catch {
    gespeichert = {};
  }
  const standard = ENGINES.includes(process.env.ENGINE_STANDARD) ? process.env.ENGINE_STANDARD : gespeichert.standard ?? "v2";
  return { standard, leads: gespeichert.leads ?? {} };
}

export function speichereEngineWahl({ standard, placeId, engine }, datei = engineDatei()) {
  const wahl = ladeEngineWahl(datei);
  const neu = { standard: wahl.standard, leads: { ...wahl.leads } };
  if (standard !== undefined) {
    if (!ENGINES.includes(standard)) throw new Error('Engine muss "v1" oder "v2" sein.');
    neu.standard = standard;
  }
  if (placeId) {
    if (engine && !ENGINES.includes(engine)) throw new Error('Engine muss "v1", "v2" oder leer sein.');
    if (engine) neu.leads[placeId] = engine;
    else delete neu.leads[placeId];
  }
  mkdirSync(path.dirname(datei), { recursive: true });
  writeFileSync(datei, `${JSON.stringify(neu, null, 2)}\n`);
  return neu;
}

export function engineFuerLead(placeId, wahl = ladeEngineWahl()) {
  return wahl.leads[placeId] ?? wahl.standard;
}

/* ------------------------------------------------------------------ */
/* Lead-Daten                                                          */
/* ------------------------------------------------------------------ */

function leadKontext(slug) {
  const placeId = placeIdFuerSlug(ladeManifest(), slug);
  const lead = placeId ? readAllLeads().find((l) => l.placeId === placeId) : null;
  if (!lead) return null;
  const kueche = kuecheFuerLead(lead, ladeZuordnungen());
  const gestaltung = themeForLead(lead, kueche, stimmungFuerLead(lead, kueche) ?? undefined);
  return { lead, kueche, gestaltung, slug };
}

function v2Bericht(slug) {
  const datei = path.join(LEADS_DIR, slug, "bericht.json");
  return existsSync(datei) ? JSON.parse(readFileSync(datei, "utf-8")) : null;
}

function badgeZaehlung(medien) {
  const z = { eigen: 0, ki: 0, platzhalter: 0 };
  for (const m of Object.values(medien ?? {})) if (m?.herkunft && z[m.herkunft] !== undefined) z[m.herkunft] += 1;
  return z;
}

/** Ergänzt die Leads für /api/leads um Engine und v2-Status. */
export function ergaenzeLeadsV2(leads) {
  const wahl = ladeEngineWahl();
  return leads.map((lead) => {
    const engine = engineFuerLead(lead.placeId, wahl);
    const bericht = lead.slug ? v2Bericht(lead.slug) : null;
    const v2 = {
      gebaut: Boolean(bericht),
      entwurf: bericht ? `/v2/leads/${encodeURIComponent(lead.slug)}/` : "",
      designsystem: bericht?.designsystem ?? null,
      heroVariante: bericht?.heroVariante ?? null,
      badges: bericht ? badgeZaehlung(bericht.medien) : null,
    };
    return {
      ...lead,
      engine,
      engineManuell: Boolean(wahl.leads[lead.placeId]),
      v2,
      // Mit Engine v2 und gebautem Entwurf zeigt „ansehen“ die v2-Seite.
      entwurf: engine === "v2" && v2.gebaut ? v2.entwurf : lead.entwurf,
    };
  });
}

/** Ausdruck eines Leads mit Herkunft und Auswahl fürs Dashboard. */
function ausdruckInfo(slug) {
  const v = demoEinstellungen(slug)?.vorlage;
  const stand = v ? { ausdruck: v.ausdruck, quelle: v.quelle, vorschlag: v.standard } : { ausdruck: null, quelle: "keiner", vorschlag: null };
  return {
    ...stand,
    optionen: Object.values(AUSDRUECKE).map((a) => ({ id: a.id, label: a.label, prinzip: a.prinzip, passtZu: a.passtZu })),
  };
}

/** Alles, was die Bearbeiten-Ansicht über den v2-Stand eines Leads wissen muss. */
export function leadDetailV2(slug) {
  const k = leadKontext(slug);
  if (!k) return null;
  const { lead } = k;
  // Dasselbe Farbschema wie Demo und Vorschau (demoEinstellungen), nicht der Seed.
  const e = demoEinstellungen(slug);
  const gestaltung = themeForLead(lead, e.kueche, e.farbschema.id);
  const ds = ladeDesignsystem(gestaltung.cuisine, gestaltung.stimmung);
  const bericht = v2Bericht(slug);
  const medien = loeseMedien({ slug, gestaltung, ds, leadEdits: loadLeadEdits(slug), konzeptVon: `beispiel-${e.kueche}` });
  return {
    slug,
    name: lead.name,
    engine: engineFuerLead(lead.placeId),
    ausdruck: ausdruckInfo(slug),
    v2Entwurf: bericht ? `/v2/leads/${encodeURIComponent(slug)}/` : "",
    designsystem: {
      id: ds.id,
      label: `${ds.kuecheLabel} · ${ds.label}`,
      archetyp: ds.archetypLabel,
      richtung: ds.richtung,
      farben: Object.fromEntries(Object.entries(ds.farben.rollen).map(([r, f]) => [r, { hex: f.hex, aufgabe: f.aufgabe }])),
      schriften: { anzeige: ds.typografie.display.familie, text: ds.typografie.text.familie },
      heroVarianten: ds.layout.heroVarianten.map((h) => ({ id: h, beschreibung: HERO_VARIANTEN[h].beschreibung })),
      heroGewaehlt: bericht?.heroVariante ?? null,
      bildKanon: ds.bildKanon,
      dokument: `/v2/designsysteme/${ds.id}.md`,
    },
    // Kennzeichnung je Bildplatz: eigenes Foto / KI-generiert / Platzhalter
    medien: medienUebersicht(medien),
    judge: existsSync(path.join(LEADS_DIR, slug, "zyklus.json")) ? JSON.parse(readFileSync(path.join(LEADS_DIR, slug, "zyklus.json"), "utf-8")) : null,
    copy: bericht?.copy ? { ersetzungen: bericht.copy.ersetzungen?.length ?? 0, hinweise: bericht.copy.hinweise ?? [] } : null,
  };
}

/**
 * Baut die Vorschau-Demo eines echten Leads aus der neuen Vorlage
 * (demoBau.js, Konzept-Modus) nach v2/output/leads/<slug>/ – derselbe Weg wie
 * beim Veröffentlichen, nur in den lokalen Vorschau-Ordner.
 */
export async function baueLeadV2(slug, { judge = false, apiUrl = process.env.V2_API_URL ?? "" } = {}) {
  const { protokoll } = await baueDemo(slug, { zielDir: LEADS_DIR, judge, apiUrl });
  return protokoll;
}

/**
 * Vorschau der Textvorschläge über dieselbe Vorlage wie die spätere Demo
 * (Plan A.4.2): Konzept-Modus, gewähltes Farbschema und Vorlage, darüber der
 * noch nicht gespeicherte Vorschlag.
 */
export async function textVorschauV2(slug, texte) {
  const e = demoEinstellungen(slug);
  if (!e) return null;
  const { baueSite } = await import("../build/siteBuilder.js");
  const p = bauParameter(e);
  const edits = p.optionen.editUebersteuerung;
  const { html } = baueSite({
    ...p,
    optionen: { ...p.optionen, editUebersteuerung: { ...edits, texte: { ...edits.texte, ...texte } }, fontsPfad: "/v2/assets/fonts" },
  });
  return html;
}

/* ------------------------------------------------------------------ */
/* Stil und Skript für dashboard.html / bearbeiten.html                */
/* ------------------------------------------------------------------ */

export function dashboardCss(ds = JSON.parse(readFileSync(path.join(DESIGNSYSTEM_DIR, "dashboard.json"), "utf-8"))) {
  const r = Object.fromEntries(Object.entries(ds.farben.rollen).map(([k, v]) => [k, v.hex]));
  const t = ds.typografie;
  return `${schriftCss([t.display.familie, t.text.familie], FONTS_DIR, "/v2/assets/fonts")}
/* v2: Token-Set aus v2/designsysteme/dashboard.json */
:root {
  --bg: ${r.grund}; --card: ${r.flaeche}; --border: ${r.linie}; --text: ${r.text}; --muted: ${r.textLeise};
  --accent: ${r.akzent}; --sehr-hoch: ${r.sehrHoch}; --hoch: ${r.hoch}; --mittel: ${r.mittel}; --niedrig: ${r.niedrig}; --pruefen: ${r.pruefen};
  --radius-sm: ${ds.radius.klein}px; --radius-md: ${ds.radius.karte}px; --radius-lg: ${ds.radius.karte}px; --radius-pill: ${ds.radius.marke}px;
  --shadow-soft: none; --shadow-card: none;
  --transition-fast: ${ds.motion.kurz}ms ease; --transition-base: ${ds.motion.mittel}ms ${ds.motion.kurve};
  --v2-tief: ${r.flaecheTief}; --v2-linie-stark: ${r.linieStark}; --v2-auf-akzent: ${r.aufAkzent}; --v2-akzent-tief: ${r.akzentTief};
  --v2-eigen: ${r.eigen}; --v2-ki: ${r.ki}; --v2-platzhalter: ${r.platzhalter};
  --v2-display: ${t.display.stapel}; --v2-text: ${t.text.stapel};
}
body { font-family: var(--v2-text); font-size: ${t.skala.basisPx}px; }
input, select, textarea, button { font-family: inherit; }
h1 { font-family: var(--v2-display); font-weight: ${t.display.gewicht}; font-size: ${t.skala.h1}px; letter-spacing: -.01em; }
.stat { box-shadow: none; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px 24px; }
.stat .value { font-family: var(--v2-display); font-weight: ${t.display.gewicht}; font-size: ${t.skala.kennzahl}px; font-variant-numeric: tabular-nums lining-nums; color: var(--text) !important; }
.stat .label, .stat .lbl { text-transform: uppercase; letter-spacing: .08em; font-size: ${t.skala.klein}px; color: var(--muted); }
table { font-size: ${t.skala.tabelle}px; border-collapse: collapse; }
thead th { background: var(--v2-tief); color: var(--muted); font-size: ${t.skala.klein}px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid var(--v2-linie-stark); }
tbody td { border-bottom: 1px solid var(--border); font-variant-numeric: tabular-nums; }
tbody tr:hover td { background: var(--v2-tief); }
a { color: var(--accent); }
.v2-engine-leiste { display: flex; align-items: center; gap: 8px; margin: 0 0 16px; font-size: ${t.skala.klein}px; color: var(--muted); }
.v2-segment { display: inline-flex; border: 1px solid var(--v2-linie-stark); border-radius: ${ds.radius.knopf}px; overflow: hidden; }
.v2-segment button { font: inherit; border: 0; padding: 4px 16px; background: transparent; color: var(--text); cursor: pointer; }
.v2-segment button.aktiv { background: var(--accent); color: var(--v2-auf-akzent); }
.v2-zelle { display: flex; flex-direction: column; gap: 4px; min-width: 150px; }
.v2-zelle select { font: inherit; }
.v2-zelle button { font: inherit; font-size: ${t.skala.klein}px; border: 1px solid var(--v2-linie-stark); background: var(--card); border-radius: ${ds.radius.knopf}px; padding: 4px 8px; cursor: pointer; }
.v2-badges { display: flex; gap: 4px; flex-wrap: wrap; }
.v2-badge { font-size: 12px; font-weight: 600; border: 1px solid currentColor; border-radius: ${ds.radius.marke}px; padding: 0 8px; }
.v2-badge.eigen { color: var(--v2-eigen); } .v2-badge.ki { color: var(--v2-ki); } .v2-badge.platzhalter { color: var(--v2-platzhalter); }
.v2-panel { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 24px; margin: 0 20px 24px; }
.v2-panel h2 { font-family: var(--v2-display); font-weight: ${t.display.gewicht}; margin: 0 0 8px; }
.v2-farben { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; margin: 16px 0; }
.v2-farbe { display: flex; gap: 8px; align-items: center; font-size: 12px; }
.v2-farbe i { width: 32px; height: 32px; border-radius: 4px; border: 1px solid var(--border); flex: none; }
`;
}

const DASHBOARD_SKRIPT = `
(function () {
  var wahl = { standard: "v1" };
  function post(url, daten) {
    return geschuetzterFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(daten || {}) })
      .then(function (r) { return r.json(); });
  }
  function leiste() {
    var ziel = document.querySelector(".stats");
    if (!ziel || document.getElementById("v2-engine")) return;
    var div = document.createElement("div");
    div.className = "v2-engine-leiste";
    div.id = "v2-engine";
    div.style.padding = "0 20px";
    div.innerHTML = 'Standard-Engine <span class="v2-segment"><button data-e="v1">v1</button><button data-e="v2">v2</button></span><span id="v2-engine-hinweis"></span>';
    ziel.parentNode.insertBefore(div, ziel);
    div.addEventListener("click", function (e) {
      var e2 = e.target.getAttribute("data-e");
      if (!e2) return;
      post("/intern/v2/engine", { standard: e2 }).then(function () { return ladeLeads(); }).then(zeichneLeiste);
    });
  }
  function zeichneLeiste() {
    return fetch("/api/v2/status").then(function (r) { return r.json(); }).then(function (s) {
      wahl = s;
      Array.prototype.forEach.call(document.querySelectorAll("#v2-engine button"), function (b) {
        b.className = b.getAttribute("data-e") === s.standard ? "aktiv" : "";
      });
      document.getElementById("v2-engine-hinweis").textContent = s.v2Leads + " Lead(s) mit v2-Entwurf";
    });
  }
  function zelle(l) {
    var v2 = l.v2 || {};
    var b = v2.badges;
    var badges = b ? '<span class="v2-badges">' +
      (b.eigen ? '<span class="v2-badge eigen">' + b.eigen + ' eigen</span>' : "") +
      (b.ki ? '<span class="v2-badge ki">' + b.ki + ' KI</span>' : "") +
      (b.platzhalter ? '<span class="v2-badge platzhalter">' + b.platzhalter + ' Platzhalter</span>' : "") + "</span>" : "";
    return '<div class="v2-zelle">' +
      '<select data-v2-engine="' + esc(l.placeId) + '">' +
        '<option value=""' + (l.engineManuell ? "" : " selected") + '>Standard (' + esc(wahl.standard) + ')</option>' +
        '<option value="v1"' + (l.engineManuell && l.engine === "v1" ? " selected" : "") + '>v1</option>' +
        '<option value="v2"' + (l.engineManuell && l.engine === "v2" ? " selected" : "") + '>v2</option>' +
      '</select>' +
      (l.slug ? '<button type="button" data-v2-bauen="' + esc(l.slug) + '">' + (v2.gebaut ? "v2 neu bauen" : "v2 bauen") + '</button>' : "") +
      (v2.gebaut ? '<a href="' + esc(v2.entwurf) + '" target="_blank" rel="noopener">v2 ansehen</a>' : "") +
      badges + '</div>';
  }
  var original = applyFiltersAndRender;
  applyFiltersAndRender = function () {
    original();
    var kopf = document.querySelector("#table thead tr");
    if (kopf && !kopf.querySelector(".v2-kopf")) {
      var th = document.createElement("th");
      th.className = "nosort v2-kopf";
      th.textContent = "Engine";
      var entwurf = kopf.querySelector('th[data-key="entwurf"]');
      entwurf.parentNode.insertBefore(th, entwurf.nextSibling);
    }
    Array.prototype.forEach.call(document.querySelectorAll("#tbody tr"), function (tr) {
      var sel = tr.querySelector("select.kueche");
      var lead = sel && allLeads.find(function (x) { return x.placeId === sel.getAttribute("data-placeid"); });
      var td = document.createElement("td");
      td.innerHTML = lead ? zelle(lead) : "-";
      tr.insertBefore(td, tr.children[6]);
    });
  };
  document.addEventListener("change", function (e) {
    var placeId = e.target.getAttribute && e.target.getAttribute("data-v2-engine");
    if (!placeId) return;
    post("/intern/v2/engine", { placeId: placeId, engine: e.target.value }).then(function () { return ladeLeads(); });
  });
  document.addEventListener("click", function (e) {
    var slug = e.target.getAttribute && e.target.getAttribute("data-v2-bauen");
    if (!slug) return;
    e.target.disabled = true;
    e.target.textContent = "baut …";
    post("/intern/v2/lead/" + encodeURIComponent(slug) + "/bauen", { judge: true }).then(function (r) {
      e.target.disabled = false;
      if (r.ok === false) { alert(r.fehler); return; }
      return ladeLeads();
    });
  });
  leiste();
  zeichneLeiste();
})();
`;

const BEARBEITEN_SKRIPT = `
(function () {
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var slug = new URLSearchParams(location.search).get("lead");
  if (!slug) return;
  fetch("/api/v2/lead/" + encodeURIComponent(slug)).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d) return;
    var ds = d.designsystem;
    var farben = Object.keys(ds.farben).map(function (k) {
      return '<div class="v2-farbe"><i style="background:' + ds.farben[k].hex + '"></i><span><b>' + k + '</b> ' + ds.farben[k].hex + '<br>' + ds.farben[k].aufgabe + '</span></div>';
    }).join("");
    var medien = d.medien.map(function (m) {
      return m.herkunft ? '<span class="v2-badge ' + m.herkunft + '">' + m.rolle + ': ' + m.kennzeichnung + '</span>' : "";
    }).join(" ");
    var panel = document.createElement("section");
    panel.className = "v2-panel";
    panel.innerHTML = '<h2>v2-Designsystem: ' + ds.label + '</h2>' +
      '<p>' + ds.archetyp + ' · Anzeige ' + ds.schriften.anzeige + ' · Text ' + ds.schriften.text +
      ' · Hero ' + (ds.heroGewaehlt || "–") + ' (möglich: ' + ds.heroVarianten.map(function (h) { return h.id; }).join(", ") + ')</p>' +
      '<p><em>' + ds.richtung + '</em></p>' +
      '<div class="v2-farben">' + farben + '</div>' +
      '<p class="v2-badges">' + medien + '</p>' +
      '<p>Engine für diesen Lead: <b>' + d.engine + '</b>' +
      (d.v2Entwurf ? ' · <a href="' + d.v2Entwurf + '" target="_blank" rel="noopener">v2-Entwurf ansehen</a>' : ' · noch kein v2-Entwurf gebaut') +
      ' · <a href="' + ds.dokument + '" target="_blank" rel="noopener">Designsystem-Dokument</a>' +
      (d.judge ? ' · Judge: ' + d.judge.ergebnis : '') + '</p>' +
      '<p><b>Foto-Anleitung (Bild-Kanon):</b> ' + ds.bildKanon.licht + '; ' + ds.bildKanon.perspektive + '.</p>';
    var raster = document.getElementById("raster");
    raster.parentNode.insertBefore(panel, raster);
    function badges() {
      d.medien.forEach(function (m) {
        var marke = document.querySelector('.platz[data-rolle="' + m.rolle + '"] .marke');
        if (marke && m.herkunft) { marke.textContent = m.kennzeichnung; marke.className = "marke v2-badge " + m.herkunft; }
      });
    }
    badges();
    new MutationObserver(badges).observe(raster, { childList: true });
  });
})();
`;

export function v2HtmlInjektion(html, seite) {
  const skripte = seite === "bearbeiten" ? ["/v2/bearbeiten.js", "/v2/demo-panel.js"] : ["/v2/dashboard.js"];
  return html
    .replace("</head>", '<link rel="stylesheet" href="/v2/dashboard.css">\n</head>')
    .replace("</body>", `${skripte.map((s) => `<script src="${s}"></script>`).join("\n")}\n</body>`);
}

/* ------------------------------------------------------------------ */
/* Routen                                                              */
/* ------------------------------------------------------------------ */

const MIME = { ".html": "text/html; charset=utf-8", ".json": "application/json; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".mp4": "video/mp4" };

function sende(res, status, daten, typ = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": typ });
  res.end(typeof daten === "string" || Buffer.isBuffer(daten) ? daten : JSON.stringify(daten));
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

function sicherInnerhalb(basis, relativ) {
  const ziel = path.resolve(basis, decodeURIComponent(relativ));
  if (ziel !== basis && !ziel.startsWith(basis + path.sep)) return null;
  if (!existsSync(ziel)) return null;
  return statSync(ziel).isDirectory() ? (existsSync(path.join(ziel, "index.html")) ? path.join(ziel, "index.html") : null) : ziel;
}

const BAUEN = /^\/intern\/v2\/lead\/([^/]+)\/bauen$/;
const AUSDRUCK = /^\/intern\/v2\/lead\/([^/]+)\/ausdruck$/;
const LEAD_DETAIL = /^\/api\/v2\/lead\/([^/]+)$/;

/** Liefert true, wenn die Anfrage eine v2-Route war (dann ist sie beantwortet). */
export async function v2Handler(req, res, pathname) {
  // Briefing und Creative Direction je Restaurant (Art-Direction-Runde)
  if (await creativeHandler(req, res, pathname)) return true;
  // Demo-Steuerung je Lead (Vorlage, Farbschema, Slogan, Veröffentlichen)
  if (await demoHandler(req, res, pathname)) return true;
  if (pathname === "/v2/dashboard.css") return sende(res, 200, dashboardCss(), "text/css; charset=utf-8"), true;
  if (pathname === "/v2/dashboard.js") return sende(res, 200, DASHBOARD_SKRIPT, "text/javascript; charset=utf-8"), true;
  if (pathname === "/v2/bearbeiten.js") return sende(res, 200, BEARBEITEN_SKRIPT, "text/javascript; charset=utf-8"), true;

  if (pathname === "/api/v2/status") {
    const wahl = ladeEngineWahl();
    const v2Leads = existsSync(LEADS_DIR) ? readdirSync(LEADS_DIR).filter((d) => existsSync(path.join(LEADS_DIR, d, "bericht.json"))).length : 0;
    return sende(res, 200, { ...wahl, v2Leads }), true;
  }
  const detail = LEAD_DETAIL.exec(pathname);
  if (detail) {
    const d = leadDetailV2(decodeURIComponent(detail[1]));
    return sende(res, d ? 200 : 404, d ?? { fehler: "Zu diesem Entwurf gibt es keinen Lead." }), true;
  }
  if (pathname === "/intern/v2/engine" && req.method === "POST") {
    try {
      return sende(res, 200, { ok: true, ...speichereEngineWahl(await lies(req)) }), true;
    } catch (e) {
      return sende(res, 400, { ok: false, fehler: e.message }), true;
    }
  }
  const ausdruck = AUSDRUCK.exec(pathname);
  if (ausdruck && req.method === "POST") {
    try {
      const slug = decodeURIComponent(ausdruck[1]);
      const k = leadKontext(slug);
      if (!k) throw new Error("Zu diesem Entwurf gibt es keinen Lead.");
      const { ausdruck: wert = "" } = await lies(req);
      // Je Lead privat in data/lead-edits (gitignoriert) – nie im öffentlichen
      // v2/ausdruck-wahl.json, das nur die Beispielseiten führt.
      speichereDemoEinstellungen(slug, { vorlage: wert === AUSDRUCK_AUS ? "" : wert });
      return sende(res, 200, { ok: true, ausdruck: ausdruckInfo(slug) }), true;
    } catch (e) {
      return sende(res, 400, { ok: false, fehler: e.message }), true;
    }
  }
  const bauen = BAUEN.exec(pathname);
  if (bauen && req.method === "POST") {
    try {
      const { judge = false } = await lies(req);
      const protokoll = await baueLeadV2(decodeURIComponent(bauen[1]), { judge });
      return sende(res, 200, { ok: true, protokoll }), true;
    } catch (e) {
      return sende(res, 400, { ok: false, fehler: e.message, gate: e.gate }), true;
    }
  }

  // Statische v2-Dateien: gebaute Seiten, Schriften, Designsystem-Dokumente
  const statisch = [
    ["/v2/leads/", LEADS_DIR],
    ["/v2/sites/", path.join(OUTPUT_DIR, "sites")],
    ["/v2/assets/", path.join(OUTPUT_DIR, "assets")],
    ["/v2/designsysteme/", DESIGNSYSTEM_DIR],
  ];
  for (const [praefix, basis] of statisch) {
    if (!pathname.startsWith(praefix)) continue;
    const datei = sicherInnerhalb(basis, pathname.slice(praefix.length));
    if (!datei) return sende(res, 404, "Nicht gefunden", "text/plain; charset=utf-8"), true;
    return sende(res, 200, readFileSync(datei), MIME[path.extname(datei).toLowerCase()] ?? "application/octet-stream"), true;
  }
  return false;
}

export { FONTS_DIR };
