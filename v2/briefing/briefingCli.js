// npm run v2:briefing -- zeigen --slug <slug>
// npm run v2:briefing -- ableiten --slug <slug> --kueche <k> --stimmung <s> --name "…" [--ort … --adresse … --telefon …]
// npm run v2:briefing -- aus-chat --slug <slug> --kueche <k> --stimmung <s> --name "…" --text "…" [--dateien a.jpg,b.jpg] [--speichern]
//
// „aus-chat“ ist der Weg für Medien und Stilwünsche aus einem Chat: Text und
// Dateien rein, Briefing-Entwurf + Slot-Zuordnung + Rückfragen raus.

import { fileURLToPath } from "node:url";
import { ladeBriefing, briefingMarkdown, leiteBriefingAb, speichereBriefing } from "./briefing.js";
import { briefingAusChat } from "./chatIntake.js";
import { menuForCuisine } from "../build/v1Funktionen.js";

const arg = (n) => {
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

function leadAusArgs(slug) {
  return { slug, name: arg("name"), ort: arg("ort") ?? "", adresse: arg("adresse") ?? "", telefon: arg("telefon") ?? "", placeId: arg("place-id") ?? null };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const befehl = process.argv[2];
  const slug = arg("slug");
  if (befehl === "zeigen") {
    const b = ladeBriefing(slug);
    console.log(b ? briefingMarkdown(b) : `Kein Briefing für ${slug}.`);
  } else if (befehl === "ableiten") {
    const kueche = arg("kueche");
    const b = leiteBriefingAb({ lead: leadAusArgs(slug), kueche, stimmung: arg("stimmung"), menu: menuForCuisine(kueche) });
    speichereBriefing(b);
    console.log(briefingMarkdown(b));
  } else if (befehl === "aus-chat") {
    const kueche = arg("kueche");
    const dateien = (arg("dateien") ?? "").split(",").filter(Boolean).map((pfad) => ({ pfad }));
    const { briefing, zuordnung, rueckfragen } = briefingAusChat({ text: arg("text") ?? "", dateien, lead: leadAusArgs(slug), kueche, stimmung: arg("stimmung"), menu: menuForCuisine(kueche) });
    console.log("Slot-Zuordnung:");
    for (const z of zuordnung) console.log(`  ${z.datei} → ${z.slot ?? "?"}${z.gericht ? ` (${z.gericht})` : ""} – ${z.grund}`);
    console.log(rueckfragen.length ? "\nRückfragen:" : "\nKeine Rückfragen.");
    for (const r of rueckfragen) console.log(`  [${r.grund}] ${r.frage}`);
    if (process.argv.includes("--speichern")) {
      speichereBriefing(briefing);
      console.log(`\nGespeichert: v2/briefings/${slug}.json`);
    } else console.log(`\n${briefingMarkdown(briefing)}`);
  } else {
    console.log("Befehle: zeigen | ableiten | aus-chat (siehe Kopf von v2/briefing/briefingCli.js)");
  }
}
