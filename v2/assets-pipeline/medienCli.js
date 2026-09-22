// Kommandozeile der Medien-Pipeline.
//
//   npm run v2:medien -- eintragen --slug italienisch--trattoria --rolle hero --datei ~/foto.jpg [--herkunft eigen|ki] [--quelle "vom Wirt, 22.09."]
//   npm run v2:medien -- erzeugen --kueche italienisch --stimmung trattoria [--provider platzhalter|replicate] [--video] [--neu]
//   npm run v2:medien -- zeigen --slug italienisch--trattoria
//
// "eintragen" ist der Weg für Fotos und Videos, die im Chat geliefert werden:
// Sie haben danach bei jedem Build Vorrang vor allem Generierten.

import { fileURLToPath } from "node:url";
import { registriereEigenesMedium, erzeugeMedien, waehleProvider, loeseMedien, medienUebersicht, ladeEigeneMedien } from "./mediaGenerator.js";
import { ladeDesignsystem } from "../build/designsystemGenerator.js";
import { themeForLead, highlightCandidates, menuForCuisine } from "../build/v1Funktionen.js";
import { testLeadFuer } from "../build/testLeads.js";

function flag(argv, name, standard = undefined) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return standard;
  const wert = argv[i + 1];
  return wert === undefined || wert.startsWith("--") ? true : wert;
}

export async function cli(argv) {
  const befehl = argv[0];
  if (befehl === "eintragen") {
    const eintrag = registriereEigenesMedium({
      slug: flag(argv, "slug"),
      rolle: flag(argv, "rolle"),
      datei: flag(argv, "datei"),
      herkunft: flag(argv, "herkunft", "eigen"),
      quelle: flag(argv, "quelle", "im Chat bereitgestellt"),
    });
    console.log(`Eingetragen: ${eintrag.datei} (${eintrag.herkunft}) – hat ab jetzt Vorrang.`);
    return;
  }
  if (befehl === "erzeugen") {
    const kueche = flag(argv, "kueche");
    const stimmung = flag(argv, "stimmung");
    const lead = testLeadFuer(kueche, stimmung) ?? { name: `${kueche} ${stimmung}`, placeId: `${kueche}-${stimmung}` };
    const slug = flag(argv, "slug", lead.slug ?? `${kueche}--${stimmung}`);
    const ds = ladeDesignsystem(kueche, stimmung);
    const gestaltung = themeForLead(lead, kueche, stimmung);
    const highlights = highlightCandidates(menuForCuisine(kueche)).slice(0, 4);
    const provider = waehleProvider(flag(argv, "provider"));
    const ergebnis = await erzeugeMedien({ slug, ds, seed: gestaltung.seed, highlights, provider, neu: Boolean(flag(argv, "neu", false)), video: Boolean(flag(argv, "video", false)) });
    console.log(`Provider ${ergebnis.provider}: ${ergebnis.erzeugt.length} erzeugt${ergebnis.fehler.length ? `, ${ergebnis.fehler.length} Fehler:\n  ${ergebnis.fehler.join("\n  ")}` : ""}`);
    return;
  }
  if (befehl === "zeigen") {
    const slug = flag(argv, "slug");
    const [kueche, stimmung] = slug.split("--");
    const lead = testLeadFuer(kueche, stimmung) ?? { name: slug, placeId: slug };
    const medien = loeseMedien({ slug, gestaltung: themeForLead(lead, kueche, stimmung), ds: ladeDesignsystem(kueche, stimmung) });
    for (const z of medienUebersicht(medien)) console.log(`${z.rolle.padEnd(11)} ${String(z.kennzeichnung).padEnd(14)} ${z.quelle ?? ""}`);
    const eigene = ladeEigeneMedien()[slug];
    if (eigene) console.log(`\nEigene Medien: ${Object.keys(eigene).join(", ")}`);
    return;
  }
  console.log("Befehle: eintragen | erzeugen | zeigen (siehe Kopf von v2/assets-pipeline/medienCli.js)");
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
}
