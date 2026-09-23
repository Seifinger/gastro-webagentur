// Briefing und Creative Direction im Agentur-Dashboard (Phase B/C).
//
// Routen (eingehängt in dashboardV2.v2Handler):
//   GET  /v2/creative                 – Übersicht aller Briefings
//   GET  /v2/creative/<slug>          – Briefing (mit Status je Feld),
//                                       Creative Direction, Bildplan, Editor
//   GET  /api/v2/creative/<slug>      – beides als JSON
//   POST /intern/v2/creative/<slug>   – speichern ({ briefing?, cd? }),
//                                       danach Seite neu bauen
//   GET  /v2/piloten/<slug>/…         – gebaute Seite zur Vorschau
//
// /intern/ ist im Dashboard-Server per DASHBOARD_TOKEN geschützt. Eine
// gespeicherte Creative Direction wird als „bearbeitet“ markiert und von
// keinem automatischen Lauf überschrieben.

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { alleBriefings, ladeBriefing, speichereBriefing, pruefeBriefing, FELDER, feldAn, STATUS, statusZaehlung, offenePunkte } from "../briefing/briefing.js";
import { ladeCreativeDirection, speichereCreativeDirection, pruefeCreativeDirection, erzeugeCreativeDirection, belegPruefung } from "../creative/creativeDirection.js";
import { erstelleBildplan, bildplanMarkdown } from "../assets-pipeline/bildplan.js";
import { ladeDesignsystem } from "../build/designsystemGenerator.js";
import { PILOT_DIR, schreibeKomponierteSite } from "../build/komposition/builder.js";

const DETAIL = /^\/v2\/creative\/([a-z0-9-]+)$/;
const API = /^\/api\/v2\/creative\/([a-z0-9-]+)$/;
const SPEICHERN = /^\/intern\/v2\/creative\/([a-z0-9-]+)$/;

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function sende(res, status, daten, typ = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": typ });
  res.end(typeof daten === "string" || Buffer.isBuffer(daten) ? daten : JSON.stringify(daten));
}

function liesJson(req, grenze = 200_000) {
  return new Promise((resolve, reject) => {
    let roh = "";
    req.on("data", (t) => {
      roh += t;
      if (roh.length > grenze) reject(new Error("Anfrage zu groß"));
    });
    req.on("end", () => {
      try {
        resolve(roh ? JSON.parse(roh) : {});
      } catch {
        reject(new Error("Kein gültiges JSON"));
      }
    });
    req.on("error", reject);
  });
}

function cdFuer(briefing) {
  return ladeCreativeDirection(briefing.slug) ?? erzeugeCreativeDirection(briefing, ladeDesignsystem(briefing.kueche, briefing.stimmung));
}

const STIL = `
body { font: 16px/1.5 Georgia, serif; margin: 0; background: #faf8f4; color: #222; }
main { max-width: 72rem; margin: 0 auto; padding: 24px 16px 64px; }
h1 { font-size: 32px; margin: 8px 0 16px; } h2 { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 16px; }
table { width: 100%; border-collapse: collapse; font: 14px/1.4 system-ui, sans-serif; }
td, th { text-align: left; vertical-align: top; padding: 6px 8px; border-bottom: 1px solid #e3ded4; }
.s { display: inline-block; padding: 0 8px; border-radius: 4px; font: 600 12px/20px system-ui, sans-serif; white-space: nowrap; }
.s-bestaetigt { background: #dcefdc; color: #1d4d1d; } .s-uebernommen { background: #dde8f5; color: #1c3a5e; }
.s-vorschlag { background: #fbecc9; color: #6b4a00; } .s-unbekannt { background: #eee; color: #555; }
textarea { width: 100%; min-height: 320px; font: 13px/1.4 ui-monospace, monospace; }
button { font: 600 15px system-ui, sans-serif; padding: 8px 16px; cursor: pointer; }
.meldung { font: 14px system-ui, sans-serif; margin-left: 8px; } a { color: #7a2e12; }
.raster { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; } @media (max-width: 800px) { .raster { grid-template-columns: 1fr; } }
`;

function statusMarke(status) {
  return `<span class="s s-${status}" title="${esc(STATUS[status])}">${esc(STATUS[status])}</span>`;
}

function wert(w) {
  if (w == null) return "–";
  if (Array.isArray(w)) return w.map((x) => esc(typeof x === "object" ? x.motiv ?? x.tage ?? x.name ?? JSON.stringify(x) : x)).join("<br>");
  if (typeof w === "object") return esc(Object.entries(w).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" · "));
  return esc(w);
}

export function detailSeite(slug) {
  const briefing = ladeBriefing(slug);
  if (!briefing) return null;
  const cd = cdFuer(briefing);
  const z = statusZaehlung(briefing);
  const bildplan = erstelleBildplan({ briefing, cd });
  const belege = belegPruefung(cd, briefing);
  const vorschau = existsSync(path.join(PILOT_DIR, slug, "index.html")) ? `<a href="/v2/piloten/${esc(slug)}/" target="_blank" rel="noopener">Gebaute Seite ansehen</a>` : "noch nicht gebaut";
  const zeilen = Object.keys(FELDER)
    .map((p) => {
      const f = feldAn(briefing, p);
      return `<tr><td><code>${esc(p)}</code></td><td>${statusMarke(f.status)}</td><td>${wert(f.wert)}</td><td>${esc([f.quelle, f.notiz].filter(Boolean).join(" – "))}</td></tr>`;
    })
    .join("");
  const folge = cd.seitenfolge.map((a) => `<li><strong>${esc(a.id)}${a.signatur ? `: ${esc(a.signatur)}` : ""}</strong> (${esc(a.gewicht)}) – ${esc(a.warum)}</li>`).join("");
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Briefing & Creative Direction – ${esc(slug)}</title><style>${STIL}</style></head><body><main>
<p><a href="/v2/creative">← alle Briefings</a> · ${vorschau}</p>
<h1>${esc(feldAn(briefing, "betrieb.name").wert ?? slug)}</h1>
<p>${briefing.fiktiv ? "<strong>Beispielbetrieb (frei erfunden).</strong> " : ""}${z.bestaetigt} bestätigt · ${z.uebernommen} übernommen · ${z.vorschlag} Vorschlag · ${z.unbekannt} unbekannt · Creative Direction: ${cd.bearbeitet ? "von der Art-Direction bearbeitet" : "regelbasierter Entwurf (noch nicht gespeichert)"}</p>
<h2>Creative Direction</h2>
<p><strong>Leitidee:</strong> ${esc(cd.leitidee)}</p>
<p><strong>Wirkung:</strong> ${esc(cd.wirkung)}</p>
<p><strong>Metapher:</strong> ${esc(cd.metapher)}</p>
<p><strong>Hero:</strong> ${esc(cd.hero.typ)} – ${esc(cd.hero.warum)}</p>
<ol>${folge}</ol>
<p><strong>Signature-Details:</strong> ${cd.signaturen.map((s) => `${esc(s.titel)} ${belege.signaturen.find((b) => b.typ === s.typ)?.getragen ? "(vom Briefing getragen)" : "<em>(nicht belegt – fällt beim Bau weg)</em>"}`).join("; ")}</p>
<p><strong>Verzicht:</strong> ${cd.verzicht.map(esc).join(" · ")}</p>
<h2>Briefing</h2>
<table><thead><tr><th>Feld</th><th>Status</th><th>Wert</th><th>Quelle / Notiz</th></tr></thead><tbody>${zeilen}</tbody></table>
<h2>Offene Punkte</h2><ul>${offenePunkte(briefing).map((o) => `<li>${statusMarke(o.status)} ${esc(o.frage)}</li>`).join("")}</ul>
<h2>Bildplan</h2><pre style="white-space:pre-wrap;font:13px/1.4 ui-monospace,monospace">${esc(bildplanMarkdown(bildplan))}</pre>
<h2>Bearbeiten</h2>
<p>Status je Feld: <code>bestaetigt</code>, <code>uebernommen</code>, <code>vorschlag</code>, <code>unbekannt</code>. Unbekanntes erscheint nie auf der Seite, Vorschläge nur mit Entwurfsmarke.</p>
<div class="raster"><label>Briefing (JSON)<textarea id="b">${esc(JSON.stringify(briefing, null, 2))}</textarea></label><label>Creative Direction (JSON)<textarea id="c">${esc(JSON.stringify(cd, null, 2))}</textarea></label></div>
<p><button id="speichern" type="button">Speichern und Seite neu bauen</button><span class="meldung" id="meldung" role="status"></span></p>
<script>
function token() { var t = localStorage.getItem("dashboardToken"); if (t === null) { t = (prompt("Dashboard-Token (leer lassen, falls keiner gesetzt ist):") || "").trim(); localStorage.setItem("dashboardToken", t); } return t; }
document.getElementById("speichern").addEventListener("click", function () {
  var m = document.getElementById("meldung"), b, c;
  try { b = JSON.parse(document.getElementById("b").value); c = JSON.parse(document.getElementById("c").value); } catch (e) { m.textContent = "Kein gültiges JSON: " + e.message; return; }
  m.textContent = "Speichere …";
  fetch(location.pathname.replace("/v2/creative/", "/intern/v2/creative/"), { method: "POST", headers: { "Content-Type": "application/json", "X-Dashboard-Token": token() }, body: JSON.stringify({ briefing: b, cd: c }) })
    .then(function (r) { if (r.status === 401) localStorage.removeItem("dashboardToken"); return r.json(); })
    .then(function (j) { m.textContent = j.ok ? "Gespeichert und neu gebaut." : "Nicht gespeichert: " + j.fehler; if (j.ok) setTimeout(function () { location.reload(); }, 600); })
    .catch(function (e) { m.textContent = "Fehler: " + e.message; });
});
</script>
</main></body></html>`;
}

export function uebersichtSeite() {
  const liste = alleBriefings()
    .map((b) => {
      const z = statusZaehlung(b);
      const cd = ladeCreativeDirection(b.slug);
      return `<tr><td><a href="/v2/creative/${esc(b.slug)}">${esc(feldAn(b, "betrieb.name").wert ?? b.slug)}</a></td><td>${esc(b.kueche)} / ${esc(b.stimmung ?? "")}</td><td>${z.bestaetigt + z.uebernommen} belegt · ${z.vorschlag} Vorschlag · ${z.unbekannt} unbekannt</td><td>${cd ? esc(cd.leitidee) : "<em>noch keine Creative Direction</em>"}</td></tr>`;
    })
    .join("");
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Briefings & Creative Direction</title><style>${STIL}</style></head><body><main><p><a href="/">← Dashboard</a></p><h1>Briefings & Creative Direction</h1><table><thead><tr><th>Restaurant</th><th>Startpunkt</th><th>Briefing</th><th>Leitidee</th></tr></thead><tbody>${liste}</tbody></table></main></body></html>`;
}

/** Speichert Briefing und/oder Creative Direction und baut die Seite neu. */
export function speichereCreative(slug, { briefing, cd } = {}) {
  const b = briefing ?? ladeBriefing(slug);
  if (!b) throw new Error("Kein Briefing vorhanden.");
  if (b.slug !== slug) throw new Error("Slug im Briefing passt nicht zur Adresse.");
  const fehlerB = pruefeBriefing(b);
  if (fehlerB.length) throw new Error(fehlerB.join("; "));
  const c = cd ? { ...cd, slug, bearbeitet: true } : cdFuer(b);
  const fehlerC = pruefeCreativeDirection(c);
  if (fehlerC.length) throw new Error(fehlerC.join("; "));
  // Erst bauen, dann speichern: Ein Stand, der ein Gate bricht, landet nicht auf der Platte.
  const { bericht } = schreibeKomponierteSite({ briefing: b, cd: c }, { zielDir: process.env.V2_PILOT_DIR || PILOT_DIR });
  if (briefing) speichereBriefing(b);
  if (cd) speichereCreativeDirection(c);
  return bericht;
}

export async function creativeHandler(req, res, pathname) {
  if (pathname === "/v2/creative" && req.method === "GET") return sende(res, 200, uebersichtSeite(), "text/html; charset=utf-8"), true;
  let t = DETAIL.exec(pathname);
  if (t && req.method === "GET") {
    const html = detailSeite(t[1]);
    return sende(res, html ? 200 : 404, html ?? "Kein Briefing", "text/html; charset=utf-8"), true;
  }
  t = API.exec(pathname);
  if (t && req.method === "GET") {
    const b = ladeBriefing(t[1]);
    return sende(res, b ? 200 : 404, b ? { briefing: b, cd: cdFuer(b) } : { fehler: "Kein Briefing" }), true;
  }
  t = SPEICHERN.exec(pathname);
  if (t && req.method === "POST") {
    try {
      const bericht = speichereCreative(t[1], await liesJson(req));
      return sende(res, 200, { ok: true, hero: bericht.hero, abschnitte: bericht.abschnitte }), true;
    } catch (e) {
      return sende(res, 400, { ok: false, fehler: e.message, gate: e.gate }), true;
    }
  }
  if (pathname.startsWith("/v2/piloten/")) {
    const basis = process.env.V2_PILOT_DIR || PILOT_DIR;
    const ziel = path.resolve(basis, decodeURIComponent(pathname.slice("/v2/piloten/".length)));
    if (ziel !== basis && !ziel.startsWith(basis + path.sep)) return sende(res, 404, "Nicht gefunden", "text/plain"), true;
    const datei = existsSync(ziel) && statSync(ziel).isDirectory() ? path.join(ziel, "index.html") : ziel;
    if (!existsSync(datei)) return sende(res, 404, "Nicht gefunden", "text/plain"), true;
    return sende(res, 200, readFileSync(datei), datei.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream"), true;
  }
  return false;
}
