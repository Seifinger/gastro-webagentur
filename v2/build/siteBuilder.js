// v2-Build-Engine – Nachfolger von src/landingPageGenerator.js.
//
// Liest ausschließlich aus dem Designsystem-Dokument der Kombination (plus
// den Inhalten: Lead, Speisekarte, Medien, Texte). Kein Farbwert, keine
// Schrift, kein Abstand ist hier hartkodiert.
//
// Harte Gates – jeder Verstoß bricht den Build mit BuildAbbruch ab:
//   1. WCAG-AA für jede Kontrastpaarung des Designsystems
//   2. mindestens drei strukturell verschiedene Hero-Aufbauten je Stimmung,
//      die Auswahl hängt deterministisch am Seed des Leads
//   3. Funktionsvertrag: jede ID/jedes Feld, an dem das v1-Skript hängt
//   4. Anti-Slop-Lint (antiSlopLint.js)
//   5. Copy: kein verbleibender Fehler-Treffer des Copy-Refiners
//
// Die funktionale Schicht (Warenkorb, Reservierung, No-Show, API-Aufrufe an
// wirtServer.js) ist das v1-Skript, unverändert (v1Funktionen.js).

import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ladeDesignsystem, HERO_VARIANTEN, SPACING_SKALA } from "./designsystemGenerator.js";
import { cssVariablen, pruefeKontraste } from "./tokens.js";
import { STIL } from "./stil.js";
import { BEWEGUNG_CSS, BEWEGUNG_SKRIPT } from "./bewegung.js";
import { lint } from "./antiSlopLint.js";
import { texteFuer } from "./texte.js";
import { verfeinereTexte } from "./copyRefiner.js";
import { schriftCss } from "./schriften.js";
import {
  seitenSkript,
  pruefeFunktionsVertrag,
  themeForLead,
  slugify,
  DEFAULT_OPENING_HOURS,
  menuForCuisine,
  highlightCandidates,
  escapeHtml,
  jsonForScript,
  remoteImageUrl,
} from "./v1Funktionen.js";
import { renderKopfzeile, renderHero, renderLeiste, HERO_AUFBAUTEN } from "./sektionen/kopf.js";
import { renderHighlights, renderKarte, renderAmbiente, renderStimmen } from "./sektionen/inhalt.js";
import { aktionsziele } from "./aktionsziele.js";
import { ausdruckFuer, ausdruckVariablen, buehnenSchleier } from "./ausdruck.js";
import { renderKopfAusdruck, renderBuehne, renderEinladung } from "./sektionen/buehne.js";
import { BUEHNE_CSS, BUEHNE_SKRIPT } from "./buehneStil.js";
import { renderTisch, renderHausBand, ABFOLGE_CSS } from "./sektionen/abfolge.js";
import { renderAtmosphaere, ATMOSPHAERE_CSS, ATMOSPHAERE_SKRIPT } from "./atmosphaere.js";
import { renderReservierung, renderKontakt, renderBestellweg, renderFuss, renderEntwurfsleiste } from "./sektionen/service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const OUTPUT_DIR = path.join(__dirname, "..", "output");
export const SITES_DIR = path.join(OUTPUT_DIR, "sites");
export const FONTS_DIR = path.join(OUTPUT_DIR, "assets", "fonts");
export const ENGINE_KENNUNG = "v2";

export class BuildAbbruch extends Error {
  constructor(gate, details) {
    super(`Build abgebrochen (${gate}): ${Array.isArray(details) ? details.map((d) => (typeof d === "string" ? d : d.meldung ?? JSON.stringify(d))).join("; ") : details}`);
    this.name = "BuildAbbruch";
    this.gate = gate;
    this.details = details;
  }
}

/* ------------------------------------------------------------------ */
/* Gates                                                               */
/* ------------------------------------------------------------------ */

export function pruefeHeroVarianten(ds) {
  const varianten = ds.layout.heroVarianten ?? [];
  const unbekannt = varianten.filter((v) => !HERO_VARIANTEN[v] || !HERO_AUFBAUTEN.includes(v));
  if (unbekannt.length) return [`unbekannte Hero-Varianten: ${unbekannt.join(", ")}`];
  const strukturen = new Set(varianten.map((v) => HERO_VARIANTEN[v].struktur));
  return strukturen.size >= 3 ? [] : [`nur ${strukturen.size} strukturell verschiedene Hero-Aufbauten (${varianten.join(", ")}) – mindestens 3 verlangt`];
}

/** Seed-deterministisch: derselbe Lead bekommt immer denselben Aufbau. */
export function waehleHeroVariante(ds, seed, erzwungen = null) {
  if (erzwungen && ds.layout.heroVarianten.includes(erzwungen)) return erzwungen;
  return ds.layout.heroVarianten[(seed >>> 7) % ds.layout.heroVarianten.length];
}

/* ------------------------------------------------------------------ */
/* Korrekturen aus dem Judge                                           */
/* ------------------------------------------------------------------ */

const snap8 = (n) => Math.max(8, Math.round(n / 8) * 8);

/**
 * Wendet die Korrekturliste des Judge (höchstens fünf Punkte) auf eine
 * Kopie des Designsystems an. Das Dokument auf der Platte bleibt
 * unverändert; was geändert wurde, steht im Protokoll des Builds.
 */
export function wendeKorrekturenAn(dsOriginal, korrekturen = []) {
  const ds = structuredClone(dsOriginal);
  ds.darstellung = { ...(ds.darstellung ?? {}) };
  const protokoll = [];
  for (const k of korrekturen.slice(0, 5)) {
    switch (k.art) {
      case "hero-variante": {
        if (ds.layout.heroVarianten.includes(k.wert)) {
          ds.darstellung.heroVariante = k.wert;
          protokoll.push(`Hero-Aufbau auf „${k.wert}“ gesetzt`);
        }
        break;
      }
      case "typo-skala": {
        const faktor = Math.min(1.3, Math.max(0.8, Number(k.faktor) || 1));
        for (const name of ["h2", "h1", "display"]) {
          const s = ds.typografie.skala.stufen[name];
          s.px = Math.round(s.px * faktor);
          if (s.mobil) s.mobil = Math.round(s.mobil * Math.sqrt(faktor));
          s.fluessig = `clamp(${(s.mobil / 16).toFixed(3)}rem, ${((s.px / 1280) * 100).toFixed(2)}vw, ${(s.px / 16).toFixed(3)}rem)`;
        }
        protokoll.push(`Überschriften-Skala ×${faktor}`);
        break;
      }
      case "sektionsabstand": {
        const delta = k.wert === "enger" ? -16 : 16;
        ds.spacing.sektion.desktop = snap8(ds.spacing.sektion.desktop + delta * 2);
        ds.spacing.sektion.mobil = snap8(ds.spacing.sektion.mobil + delta);
        ds.spacing.sektionBetont.desktop = snap8(ds.spacing.sektion.desktop + 32);
        protokoll.push(`Sektionsabstand ${k.wert} (${ds.spacing.sektion.desktop}px)`);
        break;
      }
      case "akzent-reduzieren":
        ds.darstellung.akzentSparsam = true;
        protokoll.push("Akzent auf Handlungen beschränkt (Rubriken, Icons neutral)");
        break;
      case "rhythmus":
        ds.darstellung.rhythmus = true;
        protokoll.push("Sektionsrhythmus: Leisten-Sektionen enger, betonte Sektion luftiger");
        break;
      case "bilder-ruhiger":
        ds.darstellung.bilderRuhig = true;
        protokoll.push("Bildkennzeichnungen im Hero ausgeblendet, Bildausschnitte zentriert");
        break;
      default:
        protokoll.push(`unbekannte Korrektur „${k.art}“ ignoriert`);
    }
  }
  return { ds, protokoll };
}

const DARSTELLUNG_CSS = {
  akzentSparsam: `.akzent-sparsam .rubrik, .akzent-sparsam .leiste-liste .ikon, .akzent-sparsam .ablauf-n, .akzent-sparsam .rang { color: var(--text-leise); }
.akzent-sparsam .mini-add { color: var(--text); }`,
  rhythmus: `.rhythmus #stimmen { padding-block: var(--sektion-eng); }
.rhythmus #kontakt { padding-block: var(--sektion-eng) var(--sektion); }`,
  bilderRuhig: `.bilder-ruhig .hero .herkunft { display: none; }
.bilder-ruhig img { object-position: center; }`,
};

/* ------------------------------------------------------------------ */
/* Medien (Standard ohne Medien-Pipeline: Stockfotos als Platzhalter)  */
/* ------------------------------------------------------------------ */

export function standardMedien(gestaltung, { bildUrl = remoteImageUrl, fiktiv = false, texte } = {}) {
  const platzhalter = (id, role, zeigeBadge) => ({
    src: bildUrl(id, role),
    herkunft: "platzhalter",
    kennzeichnung: texte?.platzhalter ?? "Platzhalter",
    badge: zeigeBadge && !fiktiv ? texte?.platzhalter ?? "Platzhalter" : null,
    quelle: `stock:${id}`,
  });
  return {
    hero: platzhalter(gestaltung.heroImage, "hero", false),
    haus: platzhalter(gestaltung.hausBild, "ambiente", true),
    team: platzhalter(gestaltung.teamBild, "ambiente", true),
    bestseller: null,
    gericht: (g) => (g?.bild ? platzhalter(g.bild, "gericht", false) : null),
  };
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

function highlightAnzahl(art, verfuegbar) {
  const wunsch = { treppe: 3, leseliste: 4, reihe: 4 }[art] ?? 4;
  return Math.min(wunsch, verfuegbar);
}

function favicon(ds) {
  const r = ds.farben.rollen;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='${ds.radius.knopf * 2}' fill='${r.akzent.hex}'/><circle cx='32' cy='32' r='12' fill='${r.aufAkzent.hex}'/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Baut eine v2-Seite.
 *
 * @param {object} p
 * @param {object} p.lead - wie in v1 (name, ort, adresse, telefon, rating, anzahlBewertungen, placeId).
 * @param {string} p.kueche
 * @param {string} [p.stimmung] - Stimmungs-ID; ohne Angabe entscheidet der Seed (wie in v1).
 * @param {object} [p.optionen]
 * @returns {{ html: string, bericht: object }}
 */
export function baueSite({ lead, kueche, stimmung, optionen = {} }) {
  const gestaltung = themeForLead(lead, kueche, stimmung);
  const dsDatei = optionen.designsystem ?? ladeDesignsystem(gestaltung.cuisine, gestaltung.stimmung);
  const { ds, protokoll: korrekturProtokoll } = wendeKorrekturenAn(dsDatei, optionen.korrekturen);
  // Opt-in (Gestaltungs-Umbau): ohne Ausdruck bleibt die Ausgabe Byte für Byte wie bisher.
  const ausdruck = ausdruckFuer(optionen.ausdruck);

  // Gate 1: Kontraste
  const kontrastFehler = pruefeKontraste(ds);
  if (kontrastFehler.length) {
    throw new BuildAbbruch("wcag-aa", kontrastFehler.map((k) => `${k.vordergrund} auf ${k.hintergrund}: ${k.verhaeltnis}:1 < ${k.mindest}:1`));
  }
  // Gate 2: Hero-Varianten
  const heroFehler = pruefeHeroVarianten(ds);
  if (heroFehler.length) throw new BuildAbbruch("hero-varianten", heroFehler);
  const heroVariante = ausdruck ? ausdruck.hero.typ : waehleHeroVariante(ds, gestaltung.seed, ds.darstellung.heroVariante);
  // Gate (nur mit Ausdruck): Der Schleier der Bühne muss die Schrift auch über
  // einem rein weißen Bild tragen (ausdruck.js, buehnenSchleier).
  if (ausdruck && !buehnenSchleier(ds).ok) {
    throw new BuildAbbruch("buehne-kontrast", [`Kein Schleier erreicht den Kontrast für Kopfzeile/Slogan auf ${ds.farben.rollen.tint.hex}`]);
  }

  const menu = optionen.menu ?? menuForCuisine(gestaltung.cuisine);
  const fiktiv = Boolean(optionen.fiktiv);
  const eigeneTexte = optionen.editUebersteuerung?.texte ?? {};
  const eigeneBeschreibungen = eigeneTexte.highlightBeschreibungen ?? {};

  // Gate 5: Copy. Jeder sichtbare Text läuft durch den Copy-Refiner, bevor
  // er auf die Seite kommt (COPY-PRINZIPIEN.md). Was er nicht automatisch
  // bereinigen kann, stoppt den Build.
  const verfeinern = optionen.texteVerfeinern ?? verfeinereTexte;
  const { texte, bericht: copyBericht } = verfeinern(texteFuer({ ds, menu, lead, eigeneTexte }), ds);
  if (copyBericht?.verbleibend?.length) {
    throw new BuildAbbruch("copy", copyBericht.verbleibend.map((v) => `${v.pfad}: ${v.regeln.join(", ")} („${v.text.slice(0, 60)}“)`));
  }

  const kandidaten = highlightCandidates(menu).map((g) => ({ ...g, beschreibung: verfeinern({ beschreibung: eigeneBeschreibungen[g.id] ?? g.beschreibung }, ds).texte.beschreibung }));
  const start = gestaltung.seed % Math.max(1, kandidaten.length);
  const anzahl = highlightAnzahl(ds.layout.highlights, kandidaten.length);
  const highlights = Array.from({ length: anzahl }, (_, i) => kandidaten[(start + i) % kandidaten.length]);

  const medien = optionen.medien ?? standardMedien(gestaltung, { bildUrl: optionen.bildUrl, fiktiv, texte });
  if (!medien.bestseller) medien.bestseller = medien.gericht(highlights[0]) ?? medien.haus;

  // Welche Medien diese Seite wirklich benutzt – für den Bericht (Dashboard-
  // Badges) und damit schreibeSite() lokale Dateien mitkopieren kann.
  const genutzt = [
    ...["hero", "heroVideo", "haus", "team", "bestseller"].map((rolle) => [rolle, medien[rolle]]),
    ...highlights.map((g) => [`gericht:${g.id}`, medien.gericht(g)]),
  ].filter(([, m]) => m);

  const betont = ds.layout.betonterMoment;
  const apiUrl = String(optionen.apiUrl ?? "").replace(/\/+$/, "");
  const aktionen = aktionsziele({ lead, apiUrl, fiktiv });
  const ctx = { ds, texte, lead, medien, highlights, cuisine: gestaltung.cuisine, fiktiv, aktionen, ausdruck };

  const sektionen = {
    highlights: (tief) => renderHighlights({ ...ctx, betont: betont === "highlights", tief }),
    karte: (tief) => renderKarte({ ...ctx, menu: { ...menu, kategorien: menu.kategorien.map((k, ki) => ({ ...k, gerichte: k.gerichte.map((g, gi) => ({ ...g, beschreibung: eigeneBeschreibungen[`${ki}-${gi}`] ?? g.beschreibung })) })) }, tief }),
    ambiente: (tief) => renderAmbiente({ ...ctx, tief }),
    stimmen: (tief) => renderStimmen({ ...ctx, tief }),
    reservierung: (tief) => renderReservierung({ ...ctx, betont: betont === "reservierung", tief }),
    kontakt: (tief) => renderKontakt({ ...ctx, oeffnungszeiten: optionen.oeffnungszeiten ?? DEFAULT_OPENING_HOURS, tief }),
  };
  const reihenfolge = [...ds.layout.sektionsReihenfolge.filter((id) => sektionen[id]), ...Object.keys(sektionen).filter((id) => !ds.layout.sektionsReihenfolge.includes(id))];
  // Sektionswechsel über Flächen statt Linien: jede zweite auf flaecheTief.
  // Mit Ausdruck: Abfolge und Flächen aus dem Profil (ausdruck.js), die Einladung
  // steht schon unter der Bühne. "raum" (kino) und "herkunft" (editorial) nutzen
  // bis zu ihren eigenen Formen das Raum-Band.
  const ausdruckSektionen = {
    tisch: () => renderTisch(ctx),
    karte: () => sektionen.karte(true),
    haus: () => renderHausBand(ctx),
    raum: () => renderHausBand(ctx),
    herkunft: () => renderHausBand(ctx),
    reservierung: () => sektionen.reservierung(true),
    kontakt: () => sektionen.kontakt(false),
  };
  const hauptteil = ausdruck
    ? ausdruck.abfolge.filter((id) => ausdruckSektionen[id]).map((id) => ausdruckSektionen[id]()).join("\n\n")
    : reihenfolge.map((id, i) => sektionen[id](i % 2 === 1)).join("\n\n");

  // telefon nur mit echter Nummer: Die Vorschau-Bestätigung nennt sie als echten Weg zum Lokal.
  const pageData = jsonForScript({ name: texte.name, kontaktEmail: optionen.kontaktEmail ?? "", apiUrl, ...(aktionen.anrufen ? { telefon: aktionen.anrufen.text } : {}) });

  const familien = [ds.typografie.display.familie, ds.typografie.text.familie, ds.typografie.label?.familie].filter(Boolean);
  const fontCss = optionen.fontCss ?? schriftCss(familien, optionen.fontsDir ?? FONTS_DIR, optionen.fontsPfad ?? "../../assets/fonts");

  const darstellungsKlassen = [
    ds.darstellung.akzentSparsam ? "akzent-sparsam" : "",
    ds.darstellung.rhythmus ? "rhythmus" : "",
    ds.darstellung.bilderRuhig ? "bilder-ruhig" : "",
  ].filter(Boolean);
  const darstellungsCss = Object.entries(DARSTELLUNG_CSS)
    .filter(([schluessel]) => ds.darstellung[schluessel])
    .map(([, css]) => css)
    .join("\n");

  const bodyKlassen = [
    `a-${ds.archetyp}`,
    `schema-${ds.farben.schema}`,
    `rubrik-${ds.typografie.rubrik.stil}`,
    `moment-${betont}`,
    ausdruck ? `ausdruck-${ausdruck.id}` : "",
    optionen.veroeffentlicht ? "veroeffentlicht" : "",
    ...darstellungsKlassen,
  ].filter(Boolean).join(" ");

  const ort = lead.ort || "";
  const titel = `${texte.name}${ort ? ` – ${menu.konzept ?? menu.label} in ${ort}` : ""}`;
  const beschreibung = `${texte.name}${ort ? ` in ${ort}` : ""}: ${menu.konzept ?? menu.label}. ${texte.claim} Tisch reservieren oder zur Abholung vorbestellen.`;

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(titel)}</title>
<meta name="description" content="${escapeHtml(beschreibung)}">
<meta name="engine" content="${ENGINE_KENNUNG}">
<meta name="v2-designsystem" content="${escapeHtml(ds.id)}">
<meta name="v2-hero" content="${heroVariante}">
${ausdruck ? `<meta name="v2-ausdruck" content="${ausdruck.id}">\n` : ""}<meta name="theme-color" content="${ds.farben.rollen.grund.hex}">
${optionen.veroeffentlicht ? '<meta name="robots" content="noindex, nofollow">\n' : ""}<link rel="icon" href="${favicon(ds)}">
<style>
${fontCss}
${cssVariablen(ds)}
${STIL}
${BEWEGUNG_CSS}
${darstellungsCss}${ausdruck ? `\n${ausdruckVariablen(ausdruck, ds)}\n${BUEHNE_CSS}\n${ABFOLGE_CSS}\n${ATMOSPHAERE_CSS}` : ""}
</style>
</head>
<body class="${bodyKlassen}">
${ausdruck ? "" : optionen.veroeffentlicht ? renderEntwurfsleiste({ texte, fiktiv }) : ""}
${ausdruck ? renderKopfAusdruck({ ...ctx, hinweis: optionen.veroeffentlicht ? renderEntwurfsleiste({ texte, fiktiv }) : "" }) : renderKopfzeile(ctx)}${ausdruck ? `\n${renderAtmosphaere(ctx)}` : ""}
<main>
${ausdruck ? `${renderBuehne(ctx)}\n${renderEinladung(ctx)}` : renderHero(heroVariante, ctx)}
${ausdruck ? "" : renderLeiste(ctx)}
${hauptteil}
</main>
${renderBestellweg(ausdruck ? { ...ctx, ds: { ...ds, layout: { ...ds.layout, primaerAktion: ausdruck.hauptaktion === "reservieren" ? "reservation" : "order" } } } : ctx)}
${renderFuss(ctx)}
<script>window.PAGE_DATA = ${pageData};</script>
<script>${seitenSkript()}</script>
<script>${BEWEGUNG_SKRIPT}</script>
${ausdruck ? `<script>${BUEHNE_SKRIPT}</script>\n<script>${ATMOSPHAERE_SKRIPT}</script>\n` : ""}</body>
</html>
`;

  // Gate 3: Funktionsvertrag des v1-Skripts
  const fehlend = pruefeFunktionsVertrag(html);
  if (fehlend.length) throw new BuildAbbruch("funktionsvertrag", fehlend.map((f) => `fehlt: ${f}`));

  // Gate 4: Anti-Slop-Lint
  const lintErgebnis = lint(html);
  if (!lintErgebnis.ok) throw new BuildAbbruch("anti-slop-lint", lintErgebnis.fehler);

  return {
    html,
    dateien: genutzt.filter(([, m]) => m.datei).map(([, m]) => ({ datei: m.datei, src: m.src })),
    bericht: {
      engine: ENGINE_KENNUNG,
      designsystem: ds.id,
      kueche: gestaltung.cuisine,
      stimmung: gestaltung.stimmung,
      archetyp: ds.archetyp,
      seed: gestaltung.seed,
      heroVariante,
      heroVarianten: ds.layout.heroVarianten,
      ...(ausdruck ? { ausdruck: ausdruck.id } : {}),
      highlights: highlights.map((h) => h.id),
      kontrast: { geprueft: ds.kontrastPaare.length, fehler: 0 },
      lint: { fehler: 0, warnungen: lintErgebnis.warnungen },
      korrekturen: korrekturProtokoll,
      medien: Object.fromEntries(genutzt.map(([rolle, m]) => [rolle, { herkunft: m.herkunft, kennzeichnung: m.kennzeichnung, quelle: m.quelle, typ: m.typ ?? "bild" }])),
      copy: copyBericht,
      raster: SPACING_SKALA,
    },
  };
}

export function siteSlug(lead, kueche, stimmung) {
  return lead.slug ?? slugify(`${lead.name}-${kueche}-${stimmung ?? ""}`);
}

/** Baut und schreibt nach v2/output/sites/<slug>/index.html (+ bericht.json). */
export function schreibeSite(parameter, { zielDir = SITES_DIR, slug } = {}) {
  const ergebnis = baueSite(parameter);
  const ordner = path.join(zielDir, slug ?? siteSlug(parameter.lead, ergebnis.bericht.kueche, ergebnis.bericht.stimmung));
  mkdirSync(ordner, { recursive: true });
  for (const { datei, src } of ergebnis.dateien ?? []) {
    if (!existsSync(datei)) continue;
    mkdirSync(path.dirname(path.join(ordner, src)), { recursive: true });
    copyFileSync(datei, path.join(ordner, src));
  }
  writeFileSync(path.join(ordner, "index.html"), ergebnis.html, "utf-8");
  writeFileSync(path.join(ordner, "bericht.json"), `${JSON.stringify(ergebnis.bericht, null, 2)}\n`, "utf-8");
  return { ...ergebnis, ordner };
}
