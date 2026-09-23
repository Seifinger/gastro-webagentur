// npm run v2:pilot                      – alle Briefings mit Creative Direction bauen
// npm run v2:pilot -- --slug <slug>     – eine Seite
// Ausgabe: v2/output/piloten/<slug>/ (index.html, bericht.json) und die
// lesbaren Dokumente unter v2/art-direction/piloten/<slug>/.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { alleBriefings, ladeBriefing, briefingMarkdown } from "../briefing/briefing.js";
import { ladeCreativeDirection, cdMarkdown, erzeugeCreativeDirection } from "../creative/creativeDirection.js";
import { bildplanMarkdown } from "../assets-pipeline/bildplan.js";
import { ladeDesignsystem } from "./designsystemGenerator.js";
import { schreibeKomponierteSite } from "./komposition/builder.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DOKU_DIR = path.join(__dirname, "..", "art-direction", "piloten");

export function bauePilot(slug, { apiUrl, zielDir, dokuDir = DOKU_DIR } = {}) {
  const briefing = ladeBriefing(slug);
  if (!briefing) throw new Error(`Kein Briefing für ${slug}`);
  const cd = ladeCreativeDirection(slug) ?? erzeugeCreativeDirection(briefing, ladeDesignsystem(briefing.kueche, briefing.stimmung));
  const ergebnis = schreibeKomponierteSite({ briefing, cd, optionen: apiUrl ? { apiUrl } : {} }, zielDir ? { zielDir } : {});
  if (dokuDir) {
    const d = path.join(dokuDir, slug);
    mkdirSync(d, { recursive: true });
    writeFileSync(path.join(d, "briefing.md"), briefingMarkdown(briefing));
    writeFileSync(path.join(d, "creative-direction.md"), cdMarkdown(cd));
    const b = ergebnis.bericht;
    writeFileSync(path.join(d, "bildplan.md"), `# Bildplan: ${slug}\n\n${bildplanMarkdown(b.bildplan)}\n\n## Beleg-Prüfung der Creative Direction\n\n${b.belege.verworfen.length ? b.belege.verworfen.map((v) => `- verworfen: ${v}`).join("\n") : "- alle Signaturen und Abschnitte vom Briefing getragen"}\n`);
  }
  return ergebnis;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf("--slug");
  const a = process.argv.indexOf("--api");
  const slugs = i > -1 ? [process.argv[i + 1]] : alleBriefings().map((b) => b.slug).filter((s) => ladeCreativeDirection(s));
  for (const slug of slugs) {
    try {
      const { ordner, bericht } = bauePilot(slug, { apiUrl: a > -1 ? process.argv[a + 1] : undefined });
      console.log(`✓ ${slug}: Hero ${bericht.hero} · ${bericht.abschnitte.join(" → ")}\n  ${ordner}`);
    } catch (e) {
      console.log(`✗ ${slug}: ${e.message}`);
      process.exitCode = 1;
    }
  }
}
