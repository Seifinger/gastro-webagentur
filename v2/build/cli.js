// npm run v2:build -- --kueche <k> --stimmung <s> [--judge] [--medien] [--offline] [--api <url>]
// npm run v2:build -- --demo beispiel-<küche> [--ausdruck <kino|gesellig|handwerk|editorial>] [--stimmung <id>] [--ziel <ordner>]
//     Beispielseite aus src/demoLeads.js (wie auf der Startseite unter docs/), optional mit
//     Ausdruck (Gestaltungs-Umbau). Ohne --ziel: v2/output/sites/. docs/ wird nie beschrieben.
// npm run v2:build:all            (alle 36 Kombinationen, voller Zyklus mit Judge)
//
// Ohne --lead-Angabe wird der synthetische Test-Lead der Kombination gebaut
// (v2/build/testLeads.js). Ausgabe: v2/output/sites/<kueche>--<stimmung>/.

import { fileURLToPath } from "node:url";
import { baueImZyklus, schreibeJudgeProtokoll } from "./zyklus.js";
import { testLeads, testLeadFuer } from "./testLeads.js";
import { starteBrowser } from "./browser.js";
import { ausdruckFuer } from "./ausdruck.js";
import { DEMO_LEADS } from "../../src/demoLeads.js";
import { themeForLead } from "./v1Funktionen.js";
import path from "node:path";

function flag(argv, name) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const wert = argv[i + 1];
  return wert === undefined || wert.startsWith("--") ? true : wert;
}

export async function cli(argv) {
  const alle = Boolean(flag(argv, "alle"));
  const judge = alle || Boolean(flag(argv, "judge"));
  const offline = Boolean(flag(argv, "offline"));
  const apiUrl = flag(argv, "api");
  const medienErzeugen = Boolean(flag(argv, "medien"));

  const ausdruck = flag(argv, "ausdruck");
  try {
    ausdruckFuer(ausdruck === true ? "" : ausdruck);
  } catch (e) {
    console.log(e.message);
    process.exitCode = 1;
    return;
  }
  const ziel = flag(argv, "ziel");
  const zielDir = typeof ziel === "string" ? path.resolve(ziel) : undefined;
  const demo = flag(argv, "demo");

  let auftraege;
  if (alle) auftraege = testLeads();
  else if (typeof demo === "string") {
    const lead = DEMO_LEADS.find((l) => `beispiel-${l.kueche}` === demo);
    if (!lead) {
      console.log(`Unbekannte Beispielseite "${demo}". Möglich: ${DEMO_LEADS.map((l) => `beispiel-${l.kueche}`).join(", ")}`);
      process.exitCode = 1;
      return;
    }
    // Stimmung wie bei der Veröffentlichung (Seed des Demo-Leads).
    const gewuenscht = flag(argv, "stimmung");
    const { stimmung } = themeForLead(lead, lead.kueche, typeof gewuenscht === "string" ? gewuenscht : undefined);
    auftraege = [{ ...lead, fiktiv: true, stimmung, slug: demo, veroeffentlicht: true }];
  } else {
    const kueche = flag(argv, "kueche");
    const stimmung = flag(argv, "stimmung");
    if (!kueche || !stimmung) {
      console.log("Bitte --kueche und --stimmung angeben (oder --alle).");
      process.exitCode = 1;
      return;
    }
    const lead = testLeadFuer(kueche, stimmung);
    if (!lead) {
      console.log(`Unbekannte Kombination ${kueche}/${stimmung}.`);
      process.exitCode = 1;
      return;
    }
    auftraege = [lead];
  }

  const browser = judge ? await starteBrowser() : null;
  if (judge && !browser) console.log("⚠️  Kein Chromium gefunden – Judge nicht möglich. CHROMIUM_PATH setzen.");
  const protokolle = [];
  let abbrueche = 0;
  try {
    for (const lead of auftraege) {
      console.log(`▶ ${lead.slug}`);
      try {
        const { protokoll, ordner } = await baueImZyklus({
          lead,
          kueche: lead.kueche,
          stimmung: lead.stimmung,
          judge: judge && Boolean(browser),
          browser,
          slug: lead.slug,
          ...(zielDir ? { zielDir } : {}),
          medienErzeugen,
          offline,
          optionen: {
            fiktiv: lead.fiktiv,
            ...(lead.veroeffentlicht ? { veroeffentlicht: true } : {}),
            ...(apiUrl ? { apiUrl } : {}),
            ...(typeof ausdruck === "string" ? { ausdruck } : {}),
          },
          log: (z) => console.log(z),
        });
        protokolle.push(protokoll);
        console.log(`  → ${protokoll.ergebnis} · ${ordner}`);
      } catch (e) {
        abbrueche += 1;
        console.log(`  ✗ ${e.gate ? `Gate ${e.gate}: ` : ""}${e.message}`);
      }
    }
  } finally {
    await browser?.close().catch(() => {});
  }
  if (protokolle.length && judge) schreibeJudgeProtokoll(protokolle);
  const bestanden = protokolle.filter((p) => p.ergebnis === "bestanden").length;
  console.log(`\n${protokolle.length} gebaut, ${bestanden} vom Judge bestanden, ${abbrueche} Build-Abbrüche.`);
  if (abbrueche) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) cli(process.argv.slice(2));
