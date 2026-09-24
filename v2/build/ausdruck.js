// Ausdruck – die neue Gestaltungsebene des Umbaus (v2/GESTALTUNGS-UMBAU-PLAN.md, B.2).
//
// Drei Achsen statt zwei:
//   Stimmung (src/stimmungen.js → Designsystem): Farben, Schriften, hell/dunkel
//   Ausdruck (diese Datei):                       Komposition, Hero, Kopfzeile,
//                                                  Bewegung, Atmosphäre, Rangfolge der Aktionen
//   Haus (Lead, Dashboard, Briefing):             Slogan, Motiv, was belegt ist
//
// Der Ausdruck ist opt-in: Ohne ihn baut siteBuilder.js Byte für Byte wie
// vorher (test/v2-unveraendert.test.js). Er hängt am Haus, nicht an der
// Stimmung – deshalb ist er eine Build-Option (später je Lead im Dashboard)
// und kein Feld der 36 Designsystem-Dokumente.
//
// Die Profile sind Daten. Welche davon die Seite schon umsetzt, wächst mit den
// Arbeitspaketen (AP3 erster Bildschirm, AP5 Atmosphäre, AP6 Komposition).
// Referenz-Prinzipien, keine Vorlagen: übernommen wird die Haltung, nie Layout,
// Farben, Texte oder Medien der Referenzseiten.

import { contrastRatio, mixColors } from "../../src/colorMath.js";

export const AUSDRUECKE = {
  kino: {
    id: "kino",
    label: "Kino",
    prinzip: "Raum und Licht zuerst, ein Grundton, wenige Worte (Referenz-Prinzip: Zuma).",
    passtZu: "Abendlokal mit echtem Raumerlebnis – nur auf ausdrückliche Wahl, nie automatisch.",
    hero: { typ: "buehne", hoehe: { desktop: 0.85, mobil: 0.82 }, slogan: "ueber-medium", sloganRueckzug: true },
    kopfzeile: { ueberHero: "transparent", nachHero: "flaeche" },
    hauptaktion: "reservieren",
    abfolge: ["einladung", "raum", "karte", "reservierung", "kontakt"],
    bewegung: { profil: "langsam", atmosphaere: "deutlich" },
    verzicht: ["Collagen", "Preise im Hero", "Häkchen-Leiste"],
  },
  gesellig: {
    id: "gesellig",
    label: "Gesellig",
    prinzip: "Wärme, Tisch, Leute, Persönlichkeit (Referenz-Prinzip: Big Mamma, Brindisa).",
    passtZu: "Wirtshaus, Trattoria, Taverne, Familienbetrieb.",
    hero: { typ: "buehne", hoehe: { desktop: 0.75, mobil: 0.78 }, slogan: "ueber-medium", sloganRueckzug: true },
    kopfzeile: { ueberHero: "transparent", nachHero: "flaeche" },
    hauptaktion: "reservieren",
    abfolge: ["einladung", "tisch", "karte", "haus", "reservierung", "kontakt"],
    bewegung: { profil: "mittel", atmosphaere: "sparsam" },
    verzicht: ["Häkchen-Leiste", "erfundene Gästestimmen", "drei gleiche Karten"],
  },
  handwerk: {
    id: "handwerk",
    label: "Handwerk",
    prinzip: "Essen, Öffnungszeiten, Anfahrt – sofort und ehrlich (Referenz-Prinzip: Black Bear Burger).",
    passtZu: "Döner, Imbiss, Pizzeria mit Abholung, Streetfood, Burger.",
    hero: { typ: "buehne", hoehe: { desktop: 0.6, mobil: 0.62 }, slogan: "unter-medium", sloganRueckzug: false },
    kopfzeile: { ueberHero: "flaeche", nachHero: "flaeche" },
    hauptaktion: "bestellen",
    abfolge: ["karte", "kontakt", "haus", "reservierung"],
    bewegung: { profil: "kurz", atmosphaere: "keine" },
    verzicht: ["Slogan-Theater", "Dunkel-Luxus", "lange Einleitungen"],
  },
  editorial: {
    id: "editorial",
    label: "Editorial",
    prinzip: "Zutaten, Herkunft, ruhiger Satz (Referenz-Prinzip: Brindisa).",
    passtZu: "Café, Sushi-Bar, Weinlokal, Feinkost.",
    hero: { typ: "titelblatt", hoehe: { desktop: 0.7, mobil: 0.7 }, slogan: "auf-grund", sloganRueckzug: false },
    kopfzeile: { ueberHero: "flaeche", nachHero: "flaeche" },
    hauptaktion: "reservieren",
    abfolge: ["einladung", "herkunft", "karte", "kontakt", "reservierung"],
    bewegung: { profil: "ruhig", atmosphaere: "linie" },
    verzicht: ["Vollbild-Videos", "Schleier über Bildern"],
  },
};

export const AUSDRUCK_IDS = Object.keys(AUSDRUECKE);

/**
 * Standard je Küche (Plan B.3) – noch NICHT aktiv. Wird erst beim Rollout
 * (AP11) als Vorschlag im Dashboard genutzt. `kino` steht bewusst nirgends:
 * Dunkel-Luxus per Automatik wäre genau der falsche Premium-Charakter.
 */
export const STANDARD_JE_KUECHE = {
  bayerisch: "gesellig",
  italienisch: "gesellig",
  griechisch: "gesellig",
  syrisch: "gesellig",
  chinesisch: "gesellig",
  indisch: "gesellig",
  tuerkisch: "handwerk",
  vietnamesisch: "handwerk",
  asiatisch: "handwerk",
  thailaendisch: "handwerk",
  japanisch: "editorial",
  cafe: "editorial",
};

/** Liefert das Profil oder null (kein Ausdruck = bisherige Seite). Unbekannte IDs sind ein Fehler. */
export function ausdruckFuer(id) {
  if (id === undefined || id === null || id === "") return null;
  const profil = AUSDRUECKE[id];
  if (!profil) throw new Error(`Unbekannter Ausdruck "${id}". Möglich: ${AUSDRUCK_IDS.join(", ")}`);
  return profil;
}

/**
 * Schleier über dem Bühnen-Medium – mit Kontrastnachweis für den schlimmsten Fall.
 *
 * Ein Foto kann unter dem Text beliebig hell sein. Geprüft wird deshalb nicht
 * gegen das Bild, sondern gegen reines Weiß unter dem Schleier: Die Deckkraft
 * wird so lange erhöht, bis die Schrift auf (Tint × Deckkraft über Weiß)
 * besteht. Kopfzeilen-Links sind normale Schrift (4,5:1), der Slogan ist
 * große Schrift (3:1). Ein Ton, kein Farbverlauf zwischen Farben.
 */
export const SCHLEIER_ZIELE = { kopf: 4.5, slogan: 3 };

function mindestDeckkraft(tint, schrift, ziel) {
  for (let a = 0; a <= 1.0001; a += 0.01) {
    const deckkraft = Math.round(a * 100) / 100;
    if (contrastRatio(schrift, mixColors(tint, "#ffffff", deckkraft)) >= ziel) return deckkraft;
  }
  return null;
}

export function buehnenSchleier(ds) {
  const r = ds.farben.rollen;
  const kopf = mindestDeckkraft(r.tint.hex, r.aufTint.hex, SCHLEIER_ZIELE.kopf);
  const slogan = mindestDeckkraft(r.tint.hex, r.aufTint.hex, SCHLEIER_ZIELE.slogan);
  if (kopf === null || slogan === null) return { ok: false, kopf, slogan };
  const kontrast = (a) => Math.round(contrastRatio(r.aufTint.hex, mixColors(r.tint.hex, "#ffffff", a)) * 100) / 100;
  // Oben (Kopfzeile, 0–14 %) und in der Slogan-Zone (28–62 %) mindestens die
  // nachgewiesene Deckkraft; unten, wo kein Text steht, lichter.
  const unten = Math.min(slogan, 0.24);
  const verlauf = `linear-gradient(180deg, rgba(var(--tint-rgb), ${kopf}) 0%, rgba(var(--tint-rgb), ${kopf}) 14%, rgba(var(--tint-rgb), ${slogan}) 28%, rgba(var(--tint-rgb), ${slogan}) 62%, rgba(var(--tint-rgb), ${unten}) 100%)`;
  return { ok: true, kopf, slogan, unten, verlauf, kontrast: { kopf: kontrast(kopf), slogan: kontrast(slogan) } };
}

/** CSS-Variablen des Ausdrucks – nur auf Seiten mit Ausdruck. */
export function ausdruckVariablen(profil, ds = null) {
  if (!profil) return "";
  const h = profil.hero.hoehe;
  const schleier = ds ? buehnenSchleier(ds) : null;
  return `:root {
  --hero-hoehe: ${Math.round(h.desktop * 100)}svh;
  --hero-hoehe-mobil: ${Math.round(h.mobil * 100)}svh;
  --kopf-hoehe: 72px;
  --kopf-hoehe-mobil: 56px;${schleier?.ok ? `\n  --schleier: ${schleier.verlauf};` : ""}
}`;
}
