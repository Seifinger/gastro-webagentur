// Der vollständige v2-Zyklus für eine Seite:
//
//   Referenz → Designsystem → Medien → Copy → Build ⇄ Judge (≤ 3 Runden) → Protokoll
//
// Keine Seite entsteht in einem Schuss: Selbst wenn der erste Build alle
// Gates besteht, entscheidet erst der Judge im Browser, ob sie fertig ist.
// Fällt sie durch, gehen höchstens fünf Korrekturen zurück an den Builder.
// Nach drei Runden wird automatisch abgeschlossen – mit Protokoll statt
// Warten auf einen Menschen.

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ladeKatalog, ladeAnalyse, analysiereReferenz, ANALYSE_DIR, analyseDateiName } from "./referenzAnalyse.js";
import { erzeugeDesignsystem, schreibeDesignsystem } from "./designsystemGenerator.js";
import { stelleSchriftenBereit } from "./schriften.js";
import { schreibeSite, wendeKorrekturenAn, OUTPUT_DIR, FONTS_DIR, siteSlug } from "./siteBuilder.js";
import { themeForLead } from "./v1Funktionen.js";
import { stimmungenFuer as stimmungenFuerKueche } from "../../src/stimmungen.js";
import { loeseMedien, erzeugeMedien, waehleProvider } from "../assets-pipeline/mediaGenerator.js";
import { beurteile, korrekturListe } from "../judge/designJudge.js";
import { starteBrowser } from "./browser.js";
import { verfeinereTexte, humanisiereTexte } from "./copyRefiner.js";
import { texteFuer } from "./texte.js";
import { menuForCuisine } from "./v1Funktionen.js";

export const MAX_RUNDEN = 3;
export const JUDGE_DIR = path.join(OUTPUT_DIR, "judge");
export const PROTOKOLL_PFAD = path.join(OUTPUT_DIR, "judge-protokoll.json");
const LOG_PFAD = path.join(OUTPUT_DIR, "..", "ENTSCHEIDUNGSLOG.md");

/** Stufe 1: fehlende Referenzanalysen nachholen (nur mit Netz). */
async function sichereReferenzen(kueche, stimmung, { browser, offline }) {
  const k = ladeKatalog().kombinationen.find((x) => x.kueche === kueche && x.stimmung === stimmung);
  const fehlend = (k?.referenzen ?? []).filter((r) => !ladeAnalyse(r.url));
  if (offline || fehlend.length === 0) return { neu: 0, gesamt: k?.referenzen.length ?? 0 };
  mkdirSync(ANALYSE_DIR, { recursive: true });
  for (const r of fehlend) {
    const a = await analysiereReferenz(r.url, { browser });
    writeFileSync(path.join(ANALYSE_DIR, analyseDateiName(r.url)), `${JSON.stringify(a, null, 2)}\n`);
  }
  return { neu: fehlend.length, gesamt: k.referenzen.length };
}

/**
 * Baut eine Seite im vollen Zyklus.
 *
 * @param {object} p
 * @param {object} p.lead
 * @param {string} p.kueche
 * @param {string} [p.stimmung]
 * @param {boolean} [p.judge=true]
 * @param {object} [p.optionen] - an baueSite durchgereicht (apiUrl, fiktiv, editUebersteuerung …)
 * @param {string} [p.zielDir] - wohin die Seite geschrieben wird
 * @param {string} [p.slug]
 * @param {object} [p.browser] - wiederverwendeter Browser (Sammelläufe)
 * @param {boolean} [p.medienErzeugen] - fehlende Medien über den Provider erzeugen
 */
export async function baueImZyklus({ lead, kueche, stimmung, judge = true, optionen = {}, zielDir, slug, browser = null, medienErzeugen = false, offline = false, fontsDir = FONTS_DIR, fontsPfad, log = () => {}, beurteileFn = beurteile, judgeDir = JUDGE_DIR }) {
  const gestaltung = themeForLead(lead, kueche, stimmung);
  const id = `${gestaltung.cuisine}--${gestaltung.stimmung}`;
  const siteId = slug ?? siteSlug(lead, gestaltung.cuisine, gestaltung.stimmung);
  const stufen = [];
  const eigenerBrowser = judge && !browser && beurteileFn === beurteile;
  if (eigenerBrowser) browser = await starteBrowser();

  try {
    // 1. Referenz
    const ref = await sichereReferenzen(gestaltung.cuisine, gestaltung.stimmung, { browser, offline });
    stufen.push({ stufe: "referenz", ...ref });

    // 2. Designsystem (immer frisch aus Referenzen + Stimmung)
    const stimmungObj = stimmungenFuerKueche(gestaltung.cuisine).find((s) => s.id === gestaltung.stimmung);
    const ds = erzeugeDesignsystem(gestaltung.cuisine, stimmungObj);
    schreibeDesignsystem(ds);
    stufen.push({ stufe: "designsystem", id: ds.id });

    const familien = [
      { familie: ds.typografie.display.familie, gewicht: ds.typografie.display.gewicht },
      { familie: ds.typografie.text.familie, gewicht: 400 },
      { familie: ds.typografie.text.familie, gewicht: ds.typografie.text.gewichtStark },
      ...(ds.typografie.label ? [{ familie: ds.typografie.label.familie, gewicht: 400 }] : []),
    ];
    if (!offline) await stelleSchriftenBereit(familien, fontsDir);

    // 3. Medien
    if (medienErzeugen) {
      const m = await erzeugeMedien({ slug: siteId, ds, seed: gestaltung.seed, provider: waehleProvider() });
      stufen.push({ stufe: "medien-erzeugt", ...m });
    }
    const medien = optionen.medien ?? loeseMedien({ slug: siteId, gestaltung, fiktiv: Boolean(optionen.fiktiv ?? lead.fiktiv), ds, offline });

    // 4. Copy: optional ein Sprachmodell-Durchgang für auffällige Texte (mit
    //    Cache), danach immer die Regeln – im Build selbst.
    const llmCache = await humanisiereTexte({
      slug: siteId,
      texte: texteFuer({ ds, menu: optionen.menu ?? menuForCuisine(gestaltung.cuisine), lead, eigeneTexte: optionen.editUebersteuerung?.texte ?? {} }),
      ds,
    });
    const texteVerfeinern = optionen.texteVerfeinern ?? ((t, d) => verfeinereTexte(t, d, { llmCache }));
    stufen.push({ stufe: "copy", sprachmodell: Object.keys(llmCache).length > 0 });

    // 5. Build ⇄ Judge
    const runden = [];
    let korrekturen = [];
    let letzte = null;
    for (let runde = 1; runde <= (judge ? MAX_RUNDEN : 1); runde += 1) {
      const ergebnis = schreibeSite(
        {
          lead,
          kueche: gestaltung.cuisine,
          stimmung: gestaltung.stimmung,
          optionen: { fiktiv: lead.fiktiv, ...optionen, designsystem: ds, medien, korrekturen, texteVerfeinern, fontsDir, ...(fontsPfad ? { fontsPfad } : {}) },
        },
        { zielDir, slug: siteId },
      );
      letzte = ergebnis;
      if (!judge) {
        runden.push({ runde, bestanden: null, korrekturen });
        break;
      }
      const { ds: wirksam } = wendeKorrekturenAn(ds, korrekturen);
      mkdirSync(judgeDir, { recursive: true });
      const urteil = await beurteileFn({
        browser,
        url: pathToFileURL(path.join(ergebnis.ordner, "index.html")).href,
        html: ergebnis.html,
        ds: wirksam,
        screenshot: path.join(judgeDir, `${siteId}-runde${runde}.jpg`),
      });
      const naechste = urteil.bestanden ? [] : korrekturListe(urteil, ds, korrekturen);
      runden.push({
        runde,
        bestanden: urteil.bestanden,
        mittel: urteil.mittel,
        noten: Object.fromEntries(Object.entries(urteil.kriterien).map(([k, v]) => [k, v.note])),
        befunde: Object.fromEntries(Object.entries(urteil.kriterien).map(([k, v]) => [k, v.befunde])),
        angewandteKorrekturen: korrekturen.map((k) => k.art),
        naechsteKorrekturen: naechste,
      });
      log(`  Runde ${runde}: ${urteil.bestanden ? "bestanden" : "durchgefallen"} (Mittel ${urteil.mittel})`);
      if (urteil.bestanden) break;
      const automatisch = naechste.filter((k) => k.art !== "manuell");
      if (automatisch.length === 0) break; // nichts mehr automatisch zu verbessern
      korrekturen = [...korrekturen, ...automatisch].slice(-5);
    }

    const schluss = runden[runden.length - 1];
    const protokoll = {
      site: siteId,
      designsystem: id,
      heroVariante: letzte.bericht.heroVariante,
      runden,
      ergebnis: !judge ? "ohne-judge" : schluss.bestanden ? "bestanden" : "abgeschlossen-mit-befunden",
      stufen,
      copy: letzte.bericht.copy ? { ersetzungen: letzte.bericht.copy.ersetzungen?.length ?? 0, verbleibend: letzte.bericht.copy.verbleibend?.length ?? 0 } : null,
      medien: letzte.bericht.medien,
      zeitpunkt: new Date().toISOString(),
    };
    writeFileSync(path.join(letzte.ordner, "zyklus.json"), `${JSON.stringify(protokoll, null, 2)}\n`);
    return { ...letzte, protokoll };
  } finally {
    if (eigenerBrowser) await browser?.close().catch(() => {});
  }
}

/* ------------------------------------------------------------------ */
/* Protokoll im Entscheidungslog                                       */
/* ------------------------------------------------------------------ */

const START = "<!-- judge-protokoll:start -->";
const ENDE = "<!-- judge-protokoll:ende -->";

export function schreibeJudgeProtokoll(protokolle, { logPfad = LOG_PFAD, jsonPfad = PROTOKOLL_PFAD } = {}) {
  const alt = existsSync(jsonPfad) ? JSON.parse(readFileSync(jsonPfad, "utf-8")) : {};
  for (const p of protokolle) alt[p.site] = p;
  writeFileSync(jsonPfad, `${JSON.stringify(alt, null, 2)}\n`);

  const zeilen = Object.values(alt)
    .sort((a, b) => a.site.localeCompare(b.site))
    .map((p) => {
      const r = p.runden[p.runden.length - 1];
      const korr = [...new Set(p.runden.flatMap((x) => x.angewandteKorrekturen ?? []))];
      const offen = r.naechsteKorrekturen?.length ? r.naechsteKorrekturen.map((k) => `${k.kriterium}: ${k.grund}`).join(" / ") : "–";
      return `| ${p.site} | ${p.heroVariante} | ${p.runden.length} | ${r.mittel ?? "–"} | ${p.ergebnis} | ${korr.join(", ") || "–"} | ${p.ergebnis === "bestanden" ? "–" : offen.replace(/\|/g, "/")} |`;
    });
  const block = [
    START,
    "",
    "### Judge-Läufe (automatisch gepflegt von v2/build/zyklus.js)",
    "",
    "Jede Zeile ist der letzte Zyklus einer Seite. „abgeschlossen-mit-befunden“ heißt: nach",
    `höchstens ${MAX_RUNDEN} Runden automatisch beendet, die offenen Befunde stehen rechts. Details je Runde:`,
    "`v2/output/judge-protokoll.json`.",
    "",
    "| Seite | Hero | Runden | Mittel | Ergebnis | Angewandte Korrekturen | Offene Befunde |",
    "|---|---|---|---|---|---|---|",
    ...zeilen,
    "",
    ENDE,
  ].join("\n");
  const log = readFileSync(logPfad, "utf-8");
  const neu = log.includes(START) ? log.replace(new RegExp(`${START}[\\s\\S]*?${ENDE}`), block) : `${log.trimEnd()}\n\n## Stage 5 – Judge-Protokoll\n\n${block}\n`;
  writeFileSync(logPfad, neu);
}
