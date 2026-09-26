// Website-Aufrufe der Kundenseite – nur mit echter Messquelle.
//
// Stand heute gibt es keine: Kundenseiten werden noch nirgends produktiv
// ausgeliefert (GitHub Pages trägt nur fiktive Beispielseiten), und der
// Resonanz-Collector misst Entwürfe für die Agentur, nicht Besuche einer
// Kundenseite. Das Dashboard zeigt deshalb „Website-Aufrufe: noch nicht
// messbar“ – nie 0, nie eine Schätzung.
//
// Vorbereitet ist eine austauschbare Quelle:
//   • "keine"          – Standard, Status "nicht-messbar"
//   • "host-aggregat"  – der Server, der die Kundenseite ausliefert, ruft
//                        pro Anfrage zaehleAbruf() auf. Gespeichert werden
//                        ausschließlich Zähler je Tag und Seitentyp
//                        (data/seitenaufrufe/<betrieb>.json). Keine IP,
//                        kein User-Agent, kein Referer, keine Kennung, kein
//                        Cookie, kein localStorage, kein Skript im Browser.
// Gezählt wird erst ab dem Aktivierungszeitpunkt; davor gibt es keine Daten.
//
// Vor dem Einschalten zu klären (docs-intern/STATISTIK-UND-RECHTSTEXTE.md):
// Host und Hostingort, Hinweis in der Datenschutzerklärung, ggf. AVV mit
// dem Host. Dieses Modul greift nicht auf das Endgerät zu (TDDDG § 25) –
// es wertet nur Anfragen aus, die der Server ohnehin beantwortet.

import path from "node:path";
import { datenPfad, ladeJson, speichereJson } from "./datenPfad.js";
import { tagIn } from "./statistik.js";

export const SEITENAUFRUFE_DIR = datenPfad("seitenaufrufe");

export const QUELLEN = ["keine", "host-aggregat"];
export const SEITENTYPEN = ["start", "speisekarte", "rechtliches", "sonstige"];

function datei(slug) {
  return path.join(SEITENAUFRUFE_DIR, `${slug}.json`);
}

function lade(slug) {
  return ladeJson(datei(slug), () => ({ tage: {} }));
}

function speichere(slug, stand) {
  speichereJson(datei(slug), stand);
}

/** Welche Quelle ein Betrieb nutzt. Ohne Eintrag: keine. */
export function messquelle(daten) {
  const m = daten?.seitenaufrufMessung;
  if (!m || !QUELLEN.includes(m.quelle) || m.quelle === "keine" || !m.aktivSeit) return { quelle: "keine" };
  return { quelle: m.quelle, aktivSeit: m.aktivSeit };
}

// Bots, Vorschau-Abrufe und Werkzeuge. Der User-Agent wird nur für diese
// Entscheidung gelesen und nirgends gespeichert. Die Liste fängt die
// ehrlichen Crawler – wer sich verstellt, zählt mit; das steht so im
// Dashboard-Hinweis.
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|curl|wget|python|node-fetch|axios|headless|lighthouse|pingdom|uptime|monitor|statuscake|go-http-client|java\//i;

/**
 * Entscheidet, ob eine Anfrage als Seitenaufruf zählt, und welcher
 * Seitentyp. Gibt null zurück für alles andere: Nicht-GET, Fehler,
 * statische Dateien, Health-Checks, Bots, Vorab-Ladungen, Vorschauen der
 * Agentur (?vorschau, ?intern, Kopf X-Agentur-Vorschau).
 */
export function klassifiziereAbruf({ methode = "GET", pfad = "/", status = 200, kopf = {} } = {}) {
  if (methode !== "GET" || status !== 200) return null;
  const url = new URL(pfad, "http://x");
  const p = url.pathname;
  if (/\.[a-z0-9]{1,6}$/i.test(p) && !/\.html?$/i.test(p)) return null; // Bilder, Skripte, Schriften …
  if (/^\/(gesund|health|healthz|status|api|intern|oeffentlich|v2\/)/.test(p)) return null;
  if (url.searchParams.has("vorschau") || url.searchParams.has("intern")) return null;
  const h = Object.fromEntries(Object.entries(kopf).map(([k, v]) => [k.toLowerCase(), String(v ?? "")]));
  if (h["x-agentur-vorschau"]) return null;
  if (/prefetch|prerender/i.test(h["sec-purpose"] ?? h.purpose ?? "")) return null;
  if (!h["user-agent"] || BOT.test(h["user-agent"])) return null;
  if (/^\/(rechtstexte|impressum|datenschutz)/.test(p)) return "rechtliches";
  if (/^\/(speisekarte|karte)(\/|\.html?)?$/.test(p) || /\/speisekarte(\/index\.html?)?$/.test(p)) return "speisekarte";
  if (p === "/" || /^\/(index\.html?)?$/.test(p)) return "start";
  return "sonstige";
}

/**
 * Zählt einen Abruf – nur bei aktiver Messquelle und nur, was
 * klassifiziereAbruf() als Seitenaufruf erkennt. Nichts von der Anfrage
 * selbst wird gespeichert, nur der Zähler des Tages erhöht.
 */
export function zaehleAbruf(slug, daten, abruf, jetzt = new Date()) {
  const quelle = messquelle(daten);
  if (quelle.quelle !== "host-aggregat") return false;
  if (jetzt.getTime() < new Date(quelle.aktivSeit).getTime()) return false;
  const typ = klassifiziereAbruf(abruf);
  if (!typ) return false;
  const tag = tagIn(daten.zeitzone || "Europe/Berlin", jetzt);
  const stand = lade(slug);
  stand.tage[tag] ??= {};
  stand.tage[tag][typ] = (stand.tage[tag][typ] ?? 0) + 1;
  speichere(slug, stand);
  return true;
}

/**
 * Seitenaufrufe eines Zeitraums für das Dashboard.
 *   { status: "nicht-messbar", text }                 – keine Quelle
 *   { status: "aktiv", summe, jeTyp, jeTag, aktivSeit, vollstaendig, abTag }
 * "vollstaendig" ist false, wenn die Messung erst innerhalb des Zeitraums
 * begann – dann gilt die Zahl nur ab abTag.
 */
export function seitenaufrufe(slug, daten, z) {
  const quelle = messquelle(daten);
  if (quelle.quelle === "keine") {
    return {
      status: "nicht-messbar",
      text: "Website-Aufrufe: noch nicht messbar.",
      grund: "Für diesen Betrieb ist keine Messquelle eingerichtet. Gezählt wird erst, wenn die Kundenseite über einen Host mit aggregierter Zählung ausgeliefert wird.",
    };
  }
  const zeitzone = z.zeitzone || daten.zeitzone || "Europe/Berlin";
  const aktivTag = tagIn(zeitzone, quelle.aktivSeit);
  if (z.bisTag < aktivTag) {
    return { status: "nicht-messbar", text: "Website-Aufrufe: in diesem Zeitraum noch nicht gemessen.", grund: `Die Messung läuft erst seit ${aktivTag}.` };
  }
  const stand = lade(slug);
  const abTag = aktivTag > z.vonTag ? aktivTag : z.vonTag;
  const jeTyp = Object.fromEntries(SEITENTYPEN.map((t) => [t, 0]));
  const jeTag = [];
  for (const [tag, zaehler] of Object.entries(stand.tage ?? {}).sort()) {
    if (tag < abTag || tag > z.bisTag) continue;
    let summe = 0;
    for (const [typ, n] of Object.entries(zaehler)) {
      if (!(typ in jeTyp)) continue;
      jeTyp[typ] += n;
      summe += n;
    }
    jeTag.push({ tag, seitenaufrufe: summe });
  }
  return {
    status: "aktiv",
    quelle: quelle.quelle,
    bezeichnung: "Seitenaufrufe (Seitenabrufe, keine Personen)",
    aktivSeit: quelle.aktivSeit,
    abTag,
    vollstaendig: abTag === z.vonTag,
    summe: Object.values(jeTyp).reduce((a, b) => a + b, 0),
    jeTyp,
    jeTag,
    hinweis: "Bots mit ehrlicher Kennung, statische Dateien, Vorschauen und Health-Checks sind nicht enthalten. Mehrere Abrufe derselben Person zählen mehrfach.",
  };
}
