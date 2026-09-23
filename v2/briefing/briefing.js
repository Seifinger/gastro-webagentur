// Restaurant-Briefing (Art-Direction-Runde, Phase B).
//
// Das Briefing ist die eigentliche Eingabe einer Kundenseite. Küche ×
// Stimmung (Designsystem) liefert nur den Startpunkt; was auf der Seite
// steht und wie sie gebaut ist, entscheidet dieses Dokument.
//
// Jedes Feld trägt einen STATUS, der bis auf die Seite durchschlägt:
//
//   bestaetigt   – vom Kunden bestätigt (Gespräch, Mail, Freigabe)
//   uebernommen  – aus vorhandenen Daten übernommen (Google Places, Lead,
//                  Dashboard-Overrides, Wirt-Dashboard)
//   vorschlag    – redaktioneller Vorschlag der Agentur, nicht bestätigt
//   unbekannt    – liegt nicht vor
//
// Regel (siehe istTatsache / istZeigbar): Nur „bestaetigt“ und
// „uebernommen“ dürfen als Tatsache auf der Seite stehen. „vorschlag“ darf
// nur mit sichtbarer Entwurfsmarke erscheinen, „unbekannt“ nie.
//
// Beispielbetriebe (fiktiv: true) sind frei erfundene Lokale für Piloten
// und Demos. Ihre „bestätigten“ Angaben sind innerhalb der Fiktion
// festgelegt (quelle: "Beispielbetrieb (fiktiv)"); die Seite trägt dann
// immer den Hinweis „Beispielseite – dieses Lokal ist frei erfunden“.

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BRIEFING_DIR = path.join(__dirname, "..", "briefings");

export const STATUS = {
  bestaetigt: "vom Kunden bestätigt",
  uebernommen: "aus vorhandenen Daten übernommen",
  vorschlag: "redaktioneller Vorschlag",
  unbekannt: "unbekannt",
};

export const HAUPTAKTIONEN = ["reservieren", "bestellen", "anrufen", "informieren"];

/**
 * Die Felder des Briefings, gruppiert. `typ` steuert Prüfung und Anzeige;
 * `frage` ist der Satz, mit dem die Agentur beim Kunden nachfragt.
 */
export const FELDER = {
  "betrieb.name": { typ: "text", frage: "Wie heißt das Lokal genau (Schreibweise wie auf dem Schild)?" },
  "betrieb.ort": { typ: "text", frage: "In welchem Ort liegt das Lokal?" },
  "betrieb.adresse": { typ: "text", frage: "Adresse?" },
  "betrieb.telefon": { typ: "text", frage: "Unter welcher Nummer nehmen Sie Reservierungen an?" },
  "betrieb.kueche": { typ: "text", frage: "Welche Küche kochen Sie?" },
  "betrieb.oeffnungszeiten": { typ: "liste", frage: "Wann haben Sie geöffnet (auch Ruhetage, Küchenschluss)?" },
  "konzept.kurz": { typ: "text", frage: "Was ist das Lokal in einem Satz – so, wie Stammgäste es beschreiben würden?" },
  "konzept.geschichte": { typ: "text", frage: "Seit wann gibt es das Haus, wer steht in der Küche, was ist die Geschichte?" },
  "konzept.usp": { typ: "text", frage: "Was machen Sie, das die anderen im Ort nicht machen?" },
  "konzept.belege": { typ: "liste", frage: "Woran sieht oder schmeckt der Gast das (Beleg für den USP)?" },
  "gaeste.zielgruppen": { typ: "liste", frage: "Wer kommt zu Ihnen?" },
  "gaeste.anlaesse": { typ: "liste", frage: "Zu welchen Anlässen?" },
  "positionierung.preis": { typ: "text", frage: "Wie würden Sie Ihre Preise einordnen (günstig, mittel, gehoben)?" },
  "positionierung.atmosphaere": { typ: "text", frage: "Wie soll es sich anfühlen, wenn man hereinkommt?" },
  "karte.signaturgerichte": { typ: "liste", frage: "Welche zwei, drei Gerichte muss man bei Ihnen gegessen haben?" },
  "karte.speisekarte": { typ: "karte", frage: "Bitte die aktuelle Speisekarte mit Preisen (Foto oder PDF reicht)." },
  "karte.besonderheiten": { typ: "liste", frage: "Gibt es eine Tageskarte, Mittagstisch, saisonale Karte?" },
  "aktion.haupt": { typ: "aktion", frage: "Was sollen Gäste auf der Website vor allem tun: reservieren, bestellen, anrufen oder sich informieren?" },
  "aktion.hinweise": { typ: "liste", frage: "Gibt es Regeln (Walk-in, Gruppen ab x Personen, keine Reservierung am Wochenende …)?" },
  "marke.logo": { typ: "datei", frage: "Gibt es ein Logo (Datei)?" },
  "marke.farben": { typ: "liste", frage: "Gibt es feste Hausfarben?" },
  "marke.schriften": { typ: "liste", frage: "Gibt es feste Schriften (Schild, Karte)?" },
  "medien.fotos": { typ: "medien", frage: "Eigene Fotos/Videos – wer hat sie gemacht, dürfen wir sie verwenden?" },
  "stil.wuensche": { typ: "liste", frage: "Wie soll die Seite wirken?" },
  "stil.noGos": { typ: "liste", frage: "Was soll auf keinen Fall passieren?" },
  "stil.referenzen": { typ: "liste", frage: "Gibt es Websites, die Ihnen gefallen?" },
  "belege.googleBewertung": { typ: "bewertung", frage: "Dürfen wir Ihre Google-Bewertung zeigen?" },
  "belege.stimmen": { typ: "liste", frage: "Dürfen wir einzelne Gästestimmen zitieren (mit Quelle)?" },
  "belege.auszeichnungen": { typ: "liste", frage: "Gibt es Auszeichnungen oder Presse?" },
  "freigabe.veroeffentlichung": { typ: "text", frage: "Ist die Seite als offizieller Auftritt beauftragt und freigegeben?" },
};

/** Ein Feld mit Status. */
export function feld(wert, status = wert == null ? "unbekannt" : "vorschlag", quelle = "", notiz = "") {
  if (!STATUS[status]) throw new Error(`Unbekannter Status „${status}“`);
  const f = { wert: status === "unbekannt" ? null : wert, status };
  if (quelle) f.quelle = quelle;
  if (notiz) f.notiz = notiz;
  return f;
}

export const unbekannt = (notiz = "") => feld(null, "unbekannt", "", notiz);

function hole(obj, pfad) {
  return pfad.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function setze(obj, pfad, wert) {
  const teile = pfad.split(".");
  let ziel = obj;
  for (const t of teile.slice(0, -1)) ziel = ziel[t] ??= {};
  ziel[teile[teile.length - 1]] = wert;
}

/** Das Feld unter `pfad` (immer ein Feld-Objekt, nie undefined). */
export function feldAn(briefing, pfad) {
  const f = hole(briefing?.felder, pfad);
  return f && typeof f === "object" && "status" in f ? f : unbekannt();
}

const leer = (w) => w == null || w === "" || (Array.isArray(w) && w.length === 0);

/** Darf als Tatsache auf der Seite stehen? */
export function istTatsache(f) {
  return (f?.status === "bestaetigt" || f?.status === "uebernommen") && !leer(f.wert);
}

/** Darf überhaupt erscheinen (Tatsache oder markierter Vorschlag)? */
export function istZeigbar(f) {
  return istTatsache(f) || (f?.status === "vorschlag" && !leer(f.wert));
}

/** Wert nur, wenn er Tatsache ist – sonst null. */
export function tatsache(briefing, pfad) {
  const f = feldAn(briefing, pfad);
  return istTatsache(f) ? f.wert : null;
}

/** Wert samt Hinweis, ob er als Entwurf markiert werden muss. */
export function zeigbar(briefing, pfad) {
  const f = feldAn(briefing, pfad);
  if (!istZeigbar(f)) return null;
  return { wert: f.wert, entwurf: f.status === "vorschlag", status: f.status };
}

/** Alle Felder, die offen sind (unbekannt oder nur Vorschlag) – mit Rückfrage. */
export function offenePunkte(briefing) {
  return Object.entries(FELDER)
    .map(([pfad, def]) => ({ pfad, ...def, feld: feldAn(briefing, pfad) }))
    .filter(({ feld: f }) => !istTatsache(f))
    .map(({ pfad, frage, feld: f }) => ({ pfad, status: f.status, frage, vorschlag: f.status === "vorschlag" ? f.wert : undefined }));
}

export function statusZaehlung(briefing) {
  const z = { bestaetigt: 0, uebernommen: 0, vorschlag: 0, unbekannt: 0 };
  for (const pfad of Object.keys(FELDER)) z[feldAn(briefing, pfad).status] += 1;
  return z;
}

/** Ist die Seite als offizieller Auftritt freigegeben? Nur dann entfällt die Entwurfsleiste. */
export function istFreigegeben(briefing) {
  return !briefing.fiktiv && feldAn(briefing, "freigabe.veroeffentlichung").status === "bestaetigt";
}

/**
 * Prüft Aufbau und Status aller Felder. Liefert eine Liste von Fehlern
 * (leer = gültig). Unbekannte Feldpfade sind ein Fehler, damit sich keine
 * Tippfehler als „unbekannt“ tarnen.
 */
export function pruefeBriefing(briefing) {
  const fehler = [];
  if (!briefing?.slug) fehler.push("slug fehlt");
  if (!briefing?.kueche) fehler.push("kueche fehlt");
  const bekannt = new Set(Object.keys(FELDER));
  const laufe = (obj, praefix) => {
    for (const [k, v] of Object.entries(obj ?? {})) {
      const pfad = praefix ? `${praefix}.${k}` : k;
      if (v && typeof v === "object" && "status" in v) {
        if (!bekannt.has(pfad)) fehler.push(`unbekanntes Feld ${pfad}`);
        if (!STATUS[v.status]) fehler.push(`${pfad}: unbekannter Status ${v.status}`);
        if (v.status === "unbekannt" && !leer(v.wert)) fehler.push(`${pfad}: „unbekannt“ darf keinen Wert tragen`);
        if ((v.status === "bestaetigt" || v.status === "uebernommen") && leer(v.wert)) fehler.push(`${pfad}: ${v.status} ohne Wert`);
      } else if (v && typeof v === "object") laufe(v, pfad);
    }
  };
  laufe(briefing?.felder, "");
  const aktion = feldAn(briefing, "aktion.haupt");
  if (!leer(aktion.wert) && !HAUPTAKTIONEN.includes(aktion.wert)) fehler.push(`aktion.haupt muss eins von ${HAUPTAKTIONEN.join("/")} sein`);
  for (const m of feldAn(briefing, "medien.fotos").wert ?? []) {
    if (!m.datei && !m.stock) fehler.push(`medien.fotos: Eintrag ohne datei/stock (${m.motiv ?? "?"})`);
    if (m.herkunft === "eigen" && !m.freigabe) fehler.push(`medien.fotos: eigenes Foto ${m.datei} ohne Nutzungsfreigabe`);
  }
  return fehler;
}

/**
 * Erstes Briefing aus vorhandenen Daten – ohne etwas zu erfinden.
 *
 * Übernommen wird, was der Lead (Google Places / CSV) und die
 * Dashboard-Overrides wirklich enthalten. Speisekarte und Texte aus dem
 * Küchenkatalog sind höchstens „vorschlag“, alles andere „unbekannt“.
 *
 * @param {object} p
 * @param {object} p.lead
 * @param {string} p.kueche
 * @param {string} [p.stimmung]
 * @param {object} [p.menu] - Katalogkarte (menuForCuisine)
 * @param {object} [p.edits] - leadEdits.js-Eintrag (Texte/Bilder aus dem Dashboard)
 */
export function leiteBriefingAb({ lead, kueche, stimmung = null, menu = null, edits = null }) {
  const q = "Google Places / Lead-Liste";
  const f = {};
  const s = (pfad, wert) => setze(f, pfad, wert);
  const echt = (w) => !leer(w);

  s("betrieb.name", echt(lead.name) ? feld(lead.name, "uebernommen", q) : unbekannt());
  s("betrieb.ort", echt(lead.ort) ? feld(lead.ort, "uebernommen", q) : unbekannt());
  s("betrieb.adresse", echt(lead.adresse) ? feld(lead.adresse, "uebernommen", q) : unbekannt());
  s("betrieb.telefon", echt(lead.telefon) ? feld(lead.telefon, "uebernommen", q) : unbekannt());
  s("betrieb.kueche", feld(menu?.label ?? kueche, "uebernommen", "Küchen-Zuordnung im Dashboard"));
  s("betrieb.oeffnungszeiten", unbekannt("Google-Öffnungszeiten werden nicht abgefragt"));
  for (const p of ["konzept.kurz", "konzept.geschichte", "konzept.usp", "konzept.belege", "gaeste.zielgruppen", "gaeste.anlaesse", "positionierung.preis", "positionierung.atmosphaere", "karte.signaturgerichte", "karte.besonderheiten", "aktion.hinweise", "marke.logo", "marke.farben", "marke.schriften", "stil.wuensche", "stil.noGos", "stil.referenzen", "belege.stimmen", "belege.auszeichnungen", "freigabe.veroeffentlichung"]) s(p, unbekannt());
  if (edits?.texte?.schlagzeile) s("konzept.kurz", feld(edits.texte.schlagzeile, "vorschlag", "Dashboard-Text (Agentur)"));
  s("karte.speisekarte", menu ? feld({ katalog: kueche }, "vorschlag", "Musterkarte aus dem Küchenkatalog", "Gerichte und Preise sind nicht die des Hauses") : unbekannt());
  s("aktion.haupt", feld("reservieren", "vorschlag", "Agentur-Standard"));
  s("belege.googleBewertung", lead.rating ? feld({ note: Number(lead.rating), anzahl: Number(lead.anzahlBewertungen) || null }, "uebernommen", q) : unbekannt());

  const fotos = [];
  for (const [rolle, pfad] of Object.entries(edits?.bilder ?? {})) {
    if (typeof pfad === "string" && pfad) fotos.push({ datei: pfad, rolle, herkunft: "eigen", freigabe: null, motiv: null, quelle: "Dashboard-Upload" });
  }
  s("medien.fotos", fotos.length ? feld(fotos, "uebernommen", "Dashboard-Upload", "Nutzungsfreigabe und Motiv noch klären") : unbekannt());

  return {
    version: 1,
    slug: lead.slug ?? null,
    placeId: lead.placeId ?? null,
    kueche,
    stimmung,
    fiktiv: Boolean(lead.fiktiv),
    erstellt: "abgeleitet",
    felder: f,
  };
}

/* ------------------------------------------------------------------ */
/* Speichern / Laden                                                   */
/* ------------------------------------------------------------------ */

export function briefingPfad(slug, dir = BRIEFING_DIR) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(String(slug))) throw new Error(`Ungültiger Slug „${slug}“`);
  return path.join(dir, `${slug}.json`);
}

export function ladeBriefing(slug, dir = BRIEFING_DIR) {
  const datei = briefingPfad(slug, dir);
  return existsSync(datei) ? JSON.parse(readFileSync(datei, "utf-8")) : null;
}

export function speichereBriefing(briefing, dir = BRIEFING_DIR) {
  const fehler = pruefeBriefing(briefing);
  if (fehler.length) throw new Error(`Briefing ungültig: ${fehler.join("; ")}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(briefingPfad(briefing.slug, dir), `${JSON.stringify(briefing, null, 2)}\n`);
  return briefing;
}

export function alleBriefings(dir = BRIEFING_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf-8")));
}

/* ------------------------------------------------------------------ */
/* Darstellung (Markdown für Repo und Dashboard)                       */
/* ------------------------------------------------------------------ */

const STATUS_MARKE = { bestaetigt: "✔ bestätigt", uebernommen: "↳ übernommen", vorschlag: "✎ Vorschlag", unbekannt: "? unbekannt" };

function wertText(w) {
  if (w == null) return "–";
  if (Array.isArray(w)) return w.map((x) => (typeof x === "object" ? x.motiv ?? x.name ?? x.datei ?? JSON.stringify(x) : String(x))).join("; ");
  if (typeof w === "object") return Object.entries(w).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" · ");
  return String(w);
}

export function briefingMarkdown(briefing) {
  const z = statusZaehlung(briefing);
  const zeilen = [
    `# Restaurant-Briefing: ${feldAn(briefing, "betrieb.name").wert ?? briefing.slug}`,
    "",
    briefing.fiktiv ? "> **Beispielbetrieb – frei erfunden.** „Bestätigt“ heißt hier: innerhalb der Fiktion festgelegt. Die Seite trägt immer den Hinweis „Beispielseite“.\n" : "",
    `Status: ${z.bestaetigt} bestätigt · ${z.uebernommen} übernommen · ${z.vorschlag} Vorschlag · ${z.unbekannt} unbekannt`,
    "",
    "| Feld | Status | Wert | Quelle / Notiz |",
    "|---|---|---|---|",
    ...Object.keys(FELDER).map((pfad) => {
      const f = feldAn(briefing, pfad);
      return `| \`${pfad}\` | ${STATUS_MARKE[f.status]} | ${wertText(f.wert).replace(/\|/g, "/")} | ${[f.quelle, f.notiz].filter(Boolean).join(" – ").replace(/\|/g, "/") || ""} |`;
    }),
    "",
    "## Offene Punkte (Rückfragen an den Betrieb)",
    "",
    ...offenePunkte(briefing).map((o) => `- **${o.pfad}** (${STATUS[o.status]}): ${o.frage}`),
    "",
  ];
  return `${zeilen.join("\n").replace(/\n{3,}/g, "\n\n")}\n`;
}
