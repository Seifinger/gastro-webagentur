// Tauschprobe (Erfolgskriterium der Art-Direction-Runde).
//
// Frage: Bleibt eine Seite plausibel, wenn man Name, Speisekarte und Fotos
// eines anderen Restaurants einsetzt? Dazu wird die Gestaltung von A
// (Designsystem + Creative Direction) mit den Inhalten von B (Briefing:
// Name, Karte, Fotos, Belege) gebaut. Gemessen wird, was von A's Konzept
// dabei nicht mehr getragen wird:
//
//   - Signature-Details ohne Beleg in B's Briefing (fallen weg)
//   - Bildplätze, für die keines von B's Fotos passt (bleiben leer)
//   - Abschnitte, deren Beleg fehlt
//
// Das ersetzt kein Urteil über Plausibilität, macht aber prüfbar, dass die
// Gestaltung aus dem Betrieb abgeleitet ist: Je mehr beim Tausch bricht,
// desto weniger ist sie austauschbar.
//
//   node v2/build/tauschprobe.js

import { fileURLToPath } from "node:url";
import { ladeBriefing, feldAn } from "../briefing/briefing.js";
import { ladeCreativeDirection } from "../creative/creativeDirection.js";
import { ladeDesignsystem } from "./designsystemGenerator.js";
import { baueKomponierteSite } from "./komposition/builder.js";
import { menuForCuisine } from "./v1Funktionen.js";

export const PILOTEN = ["pilot-trattoria-nonna-lucia", "pilot-izakaya-kurenai", "pilot-gasthaus-alte-linde", "pilot-roesterei-kornfeld"];

/** Gestaltung von a, Inhalte von b. */
export function tausche(a, b) {
  const briefingA = ladeBriefing(a);
  const briefingB = ladeBriefing(b);
  const cdA = structuredClone(ladeCreativeDirection(a));
  const fotosB = (feldAn(briefingB, "medien.fotos").wert ?? []).map((m) => m.stock).filter(Boolean);
  // B's Fotos in A's Bildplätze – die Motivwünsche (Gericht, Rolle) bleiben A's.
  for (const slot of cdA.bilder?.slots ?? []) {
    slot.kandidaten = fotosB;
    if (slot.mobil) slot.mobil.kandidaten = fotosB;
  }
  const { html, bericht } = baueKomponierteSite({
    briefing: briefingB,
    cd: { ...cdA, slug: briefingB.slug },
    optionen: { designsystem: ladeDesignsystem(briefingA.kueche, briefingA.stimmung), menu: menuForCuisine(briefingB.kueche) },
  });
  const original = baueKomponierteSite({ briefing: briefingA, cd: ladeCreativeDirection(a) }).bericht;
  const sigVorher = original.abschnitte.filter((x) => x.startsWith("signatur:")).length;
  const sigNachher = bericht.abschnitte.filter((x) => x.startsWith("signatur:")).length;
  const bilderVorher = original.bildplan.plaetze.filter((p) => p.gewaehlt).length;
  const bilderNachher = bericht.bildplan.plaetze.filter((p) => p.gewaehlt).length;
  return {
    gestaltung: a,
    inhalt: b,
    html,
    signaturen: { vorher: sigVorher, nachher: sigNachher },
    bilder: { vorher: bilderVorher, nachher: bilderNachher },
    verworfen: bericht.belege.verworfen,
    abgelehnteFotos: bericht.bildplan.abgelehnt.map((x) => `${x.slot}: ${x.zeigt ?? x.quelle} – ${x.grund}`),
    bruch: sigVorher - sigNachher + (bilderVorher - bilderNachher),
  };
}

export function tauschMatrix(piloten = PILOTEN) {
  const ergebnisse = [];
  for (const a of piloten) for (const b of piloten) if (a !== b) ergebnisse.push(tausche(a, b));
  return ergebnisse;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const r of tauschMatrix()) {
    console.log(`${r.gestaltung.replace("pilot-", "")} ⟵ ${r.inhalt.replace("pilot-", "")}: Signaturen ${r.signaturen.vorher}→${r.signaturen.nachher}, Bilder ${r.bilder.vorher}→${r.bilder.nachher}`);
    for (const v of r.verworfen) console.log(`   · ${v}`);
  }
}
