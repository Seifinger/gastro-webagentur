// Komponierte v2-Seite: Briefing + Creative Direction → Seite (Phase D).
//
// Unterschied zu siteBuilder.baueSite(): Dort legt der Archetyp die
// Sektionsfolge fest und ein Hash wählt eine von drei bis vier
// Hero-Formen. Hier folgt beides aus der Creative Direction des Betriebs –
// reproduzierbar (kein Zufall), begründet (jede Position hat ein „warum“)
// und nur mit belegten Inhalten.
//
// Alle Gates von baueSite() gelten weiter: WCAG-AA, Funktionsvertrag des
// v1-Skripts, Anti-Slop-Lint, Copy-Gate. Dazu kommt das Beleg-Gate:
// Signaturen ohne Beleg im Briefing werden verworfen und protokolliert.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ladeDesignsystem } from "../designsystemGenerator.js";
import { cssVariablen, pruefeKontraste } from "../tokens.js";
import { STIL } from "../stil.js";
import { BEWEGUNG_CSS, BEWEGUNG_SKRIPT } from "../bewegung.js";
import { lint } from "../antiSlopLint.js";
import { verfeinereTexte } from "../copyRefiner.js";
import { schriftCss } from "../schriften.js";
import { seitenSkript, pruefeFunktionsVertrag, menuForCuisine, escapeHtml, jsonForScript } from "../v1Funktionen.js";
import { renderBestellweg } from "../sektionen/service.js";
import { aktionsziele } from "../aktionsziele.js";
import { BuildAbbruch, FONTS_DIR, OUTPUT_DIR } from "../siteBuilder.js";
import { istFreigegeben, pruefeBriefing, statusZaehlung, offenePunkte, tatsache } from "../../briefing/briefing.js";
import { belegPruefung, pruefeCreativeDirection } from "../../creative/creativeDirection.js";
import { erstelleBildplan } from "../../assets-pipeline/bildplan.js";
import { texteKomponiert } from "./texte.js";
import { KOMPOSITION_STIL } from "./stil.js";
import { renderKopf, renderHero, renderAbschnitt, navAnker, mobilLeiste, renderFuss, LEISTE_SKRIPT, WOCHENPLAN_SKRIPT } from "./sektionen.js";

export const PILOT_DIR = path.join(OUTPUT_DIR, "piloten");
export const ENGINE_KENNUNG = "v2-komposition";

function leadAusBriefing(briefing) {
  const l = briefing.lead ?? {};
  return {
    name: tatsache(briefing, "betrieb.name") ?? l.name,
    ort: tatsache(briefing, "betrieb.ort") ?? l.ort,
    adresse: tatsache(briefing, "betrieb.adresse") ?? "",
    telefon: tatsache(briefing, "betrieb.telefon") ?? "",
    placeId: briefing.placeId,
    slug: briefing.slug,
  };
}

/**
 * @param {object} p
 * @param {object} p.briefing
 * @param {object} p.cd - Creative Direction
 * @param {object} [p.optionen] - apiUrl, fontsPfad, designsystem, menu, bildUrlFuer
 * @returns {{ html: string, bericht: object }}
 */
export function baueKomponierteSite({ briefing, cd, optionen = {} }) {
  const bFehler = pruefeBriefing(briefing);
  if (bFehler.length) throw new BuildAbbruch("briefing", bFehler);
  const cdFehler = pruefeCreativeDirection(cd);
  if (cdFehler.length) throw new BuildAbbruch("creative-direction", cdFehler);

  const ds = optionen.designsystem ?? ladeDesignsystem(briefing.kueche, briefing.stimmung);
  const kontrast = pruefeKontraste(ds);
  if (kontrast.length) throw new BuildAbbruch("wcag-aa", kontrast.map((k) => `${k.vordergrund} auf ${k.hintergrund}: ${k.verhaeltnis}:1`));

  // Beleg-Gate: Nur was das Briefing trägt, kommt auf die Seite.
  const belege = belegPruefung(cd, briefing);
  const getragen = new Set(belege.signaturen.filter((s) => s.getragen).map((s) => s.typ));
  const abschnitte = cd.seitenfolge.filter((a) => (a.id === "signatur" ? getragen.has(a.signatur) : !belege.abschnitte.find((b) => b.id === a.id && b.fehlend.length)));
  const heroTyp = cd.hero.typ;

  const menu = optionen.menu ?? menuForCuisine(briefing.kueche);
  const lead = leadAusBriefing(briefing);
  const freigegeben = istFreigegeben(briefing);
  const entwurfsModus = !freigegeben;
  const bildplan = erstelleBildplan({ briefing, cd });

  const roh = texteKomponiert({ briefing, cd, ds, menu, lead });
  const verfeinern = optionen.texteVerfeinern ?? verfeinereTexte;
  const { texte, bericht: copyBericht } = verfeinern(roh, ds);
  if (copyBericht?.verbleibend?.length) throw new BuildAbbruch("copy", copyBericht.verbleibend.map((v) => `${v.pfad}: ${v.regeln.join(", ")}`));

  const k = { briefing, cd, ds, texte, lead, menu, bildplan, fiktiv: briefing.fiktiv, entwurfsModus };
  const hauptteil = abschnitte.map((a) => renderAbschnitt(k, a)).filter(Boolean);
  const anker = navAnker(k, abschnitte.filter((a, i) => hauptteil[i] !== undefined));

  const apiUrl = String(optionen.apiUrl ?? "").replace(/\/+$/, "");
  const pageData = jsonForScript({ name: texte.name, kontaktEmail: optionen.kontaktEmail ?? "", apiUrl });
  const familien = [ds.typografie.display.familie, ds.typografie.text.familie, ds.typografie.label?.familie].filter(Boolean);
  const fontCss = optionen.fontCss ?? schriftCss(familien, optionen.fontsDir ?? FONTS_DIR, optionen.fontsPfad ?? "../../assets/fonts");

  // renderBestellweg liefert Warenkorb, Drawer und Bestätigung des v1-Skripts;
  // die Aktionsleiste ersetzen wir durch die der Creative Direction.
  const bestellweg = renderBestellweg({ ds: { ...ds, layout: { ...ds.layout, mobileAktionsleiste: false } }, texte, aktionen: aktionsziele({ lead, apiUrl, fiktiv: Boolean(briefing.fiktiv) }) });

  const bodyKlassen = [`a-${ds.archetyp}`, `schema-${ds.farben.schema}`, `rubrik-${ds.typografie.rubrik.stil}`, `k-hero-${heroTyp}`, `k-${briefing.slug}`, cd.komposition?.abschnittsSchrift === "text" ? "k-titel-text" : ""].filter(Boolean).join(" ");
  const titel = `${texte.name}${lead.ort ? ` – ${texte.kicker}` : ""}`;
  const beschreibung = `${texte.name}: ${texte.claim}`;
  const heroBild = bildplan.plaetze.find((p) => p.slot === "hero" && p.gewaehlt);

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(titel)}</title>
<meta name="description" content="${escapeHtml(beschreibung)}">
<meta name="engine" content="${ENGINE_KENNUNG}">
<meta name="v2-designsystem" content="${escapeHtml(ds.id)}">
<meta name="v2-creative-direction" content="${escapeHtml(cd.slug)}">
<meta name="v2-hero" content="${heroTyp}">
${freigegeben ? "" : '<meta name="robots" content="noindex, nofollow">\n'}<meta name="theme-color" content="${ds.farben.rollen.grund.hex}">
${heroBild?.gewaehlt?.herkunft === "stock" ? '<link rel="preconnect" href="https://images.unsplash.com">\n' : ""}<style>
${fontCss}
${cssVariablen(ds)}
${STIL}
${BEWEGUNG_CSS}
${KOMPOSITION_STIL}
</style>
</head>
<body class="${bodyKlassen}">
${freigegeben ? "" : `<div class="entwurf-hinweis"><span>${escapeHtml(texte.leiste)}</span></div>`}
${renderKopf(k, anker)}
<main>
${renderHero(k)}
${hauptteil.join("\n")}
</main>
${bestellweg}
${mobilLeiste(k)}
${renderFuss(k, anker)}
<script>window.PAGE_DATA = ${pageData};</script>
<script>${seitenSkript()}</script>
<script>${BEWEGUNG_SKRIPT}</script>
<script>${LEISTE_SKRIPT}${getragen.has("wochenplan") ? WOCHENPLAN_SKRIPT : ""}</script>
</body>
</html>
`;

  const fehlend = pruefeFunktionsVertrag(html);
  if (fehlend.length) throw new BuildAbbruch("funktionsvertrag", fehlend.map((f) => `fehlt: ${f}`));
  if (!/id="bar-order"/.test(html)) throw new BuildAbbruch("funktionsvertrag", ["fehlt: bar-order"]);
  const l = lint(html);
  if (!l.ok) throw new BuildAbbruch("anti-slop-lint", l.fehler);
  // Beispielseiten und Entwürfe dürfen nie wie offizielle Auftritte aussehen.
  if (!freigegeben && !html.includes('class="entwurf-hinweis"')) throw new BuildAbbruch("entwurf", ["Entwurfsleiste fehlt"]);

  return {
    html,
    bericht: {
      engine: ENGINE_KENNUNG,
      slug: briefing.slug,
      designsystem: ds.id,
      creativeDirection: { leitidee: cd.leitidee, bearbeitet: Boolean(cd.bearbeitet) },
      hero: heroTyp,
      abschnitte: abschnitte.map((a) => (a.id === "signatur" ? `signatur:${a.signatur}` : a.id)),
      gewichte: Object.fromEntries(abschnitte.map((a) => [a.id === "signatur" ? a.signatur : a.id, a.gewicht])),
      belege,
      briefing: { status: statusZaehlung(briefing), offen: offenePunkte(briefing).length, fiktiv: Boolean(briefing.fiktiv), freigegeben },
      bildplan,
      lint: { warnungen: l.warnungen },
      copy: copyBericht,
    },
  };
}

export function schreibeKomponierteSite(parameter, { zielDir = PILOT_DIR } = {}) {
  const ergebnis = baueKomponierteSite(parameter);
  const ordner = path.join(zielDir, parameter.briefing.slug);
  mkdirSync(ordner, { recursive: true });
  writeFileSync(path.join(ordner, "index.html"), ergebnis.html);
  writeFileSync(path.join(ordner, "bericht.json"), `${JSON.stringify(ergebnis.bericht, null, 2)}\n`);
  return { ...ergebnis, ordner };
}
