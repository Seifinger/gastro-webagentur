// Creative Direction je Restaurant (Art-Direction-Runde, Phase C).
//
// Getrennt vom Küchen-Designsystem: Das Designsystem (Küche × Stimmung)
// liefert Tokens – Farben, Schriften, Raster. Die Creative Direction sagt,
// was DIESE Seite für DIESES Haus tun soll, und woraus das folgt:
//
//   1. leitidee        – ein Satz
//   2. wirkung         – was Gäste empfinden sollen
//   3. metapher        – visuelle Metapher / Gestaltungsprinzip
//   4. bilder          – Auswahl, Zuschnitt, Farbklima, Bild/Text-Balance
//   5. typografie      – Rollen der Schriften und Begründung
//   6. seitenfolge     – Dramaturgie: welche Information wann, und warum
//   7. signaturen      – 1–2 Details, die nur zu diesem Betrieb passen
//   8. verzicht        – bewusst weggelassene Effekte
//
// Jede Signatur und jeder Abschnitt mit inhaltlicher Behauptung nennt in
// `braucht` die Briefing-Felder, die ihn tragen. Fehlt ein Beleg, fällt das
// Element beim Bau weg (belegPruefung) – das macht den Tauschtest prüfbar:
// Die Creative Direction der Trattoria mit dem Briefing der Izakaya verliert
// ihre Tageskarte, weil die Izakaya keine hat.
//
// erzeugeCreativeDirection() leitet einen ENTWURF regelbasiert und
// reproduzierbar aus dem Briefing ab (kein Zufall, kein Hash). Die
// Art-Direction der Agentur überarbeitet ihn im Dashboard; gespeicherte
// Fassungen mit bearbeitet: true werden nie automatisch überschrieben.

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { feldAn, istTatsache, istZeigbar, tatsache } from "../briefing/briefing.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CD_DIR = path.join(__dirname, "..", "creative-direction");
// Tests setzen V2_CD_DIR auf ein Wegwerfverzeichnis.
const cdDir = () => process.env.V2_CD_DIR || CD_DIR;

/** Abschnitte, die die Komposition kennt. */
export const ABSCHNITTE = {
  signatur: "Signature-Detail (Typ in `signatur`)",
  empfehlungen: "Signaturgerichte mit Bild",
  karte: "Speisekarte",
  haus: "Konzept und Geschichte des Hauses",
  ambiente: "Raum und Stimmung (Bild)",
  reservierung: "Tischreservierung",
  abholung: "Vorbestellen zur Abholung",
  zeiten: "Öffnungszeiten prominent",
  kontakt: "Anfahrt, Telefon, Zeiten",
  offen: "Offene Punkte des Entwurfs (nur solange nicht freigegeben)",
};

/** Hero-Typen der Komposition. */
export const HERO_TYPEN = {
  "karte-titel": "Die Seite beginnt wie eine gedruckte Karte: Name als Titel, ein Gericht als eingelegtes Foto",
  noren: "Vollbild-Foto hinter einem geteilten Vorhang (Noren) – der Eingang einer Izakaya",
  aushang: "Rein typografisch wie ein Aushang am Haus – für dünne Bildlage",
  werkbank: "Sachlicher Kopf mit Tagesstatus und einem Arbeitsfoto",
  "bild-voll": "Großes eigenes Foto, Text daneben auf dem Grund",
};

/** Signature-Details: was sie brauchen, damit sie wahr sind. */
export const SIGNATUREN = {
  tageskarte: { titel: "Tageskarte als eingelegter Zettel", braucht: ["karte.besonderheiten", "karte.signaturgerichte"], erkennung: /tageskarte/i },
  zettelwand: { titel: "Kleine Teller als Zettel an der Wand", braucht: ["karte.besonderheiten", "karte.speisekarte"], erkennung: /zettel/i },
  wochenplan: { titel: "Wochenplan mit Rösttag", braucht: ["betrieb.oeffnungszeiten", "konzept.belege"], erkennung: /röst/i },
  hausschild: { titel: "Der Name als Hausschild", braucht: ["betrieb.name", "betrieb.adresse"], erkennung: null },
};

const text = (w) => (Array.isArray(w) ? w.join(" ") : typeof w === "object" && w ? JSON.stringify(w) : String(w ?? ""));

/** Welche Signaturen trägt dieses Briefing? Reihenfolge = Priorität. */
export function moeglicheSignaturen(briefing) {
  const beleg = `${text(tatsache(briefing, "karte.besonderheiten"))} ${text(tatsache(briefing, "konzept.belege"))} ${text(tatsache(briefing, "betrieb.oeffnungszeiten"))}`;
  const treffer = Object.entries(SIGNATUREN)
    .filter(([, s]) => s.erkennung && s.erkennung.test(beleg))
    .map(([typ]) => typ);
  return treffer;
}

/** Wie viele brauchbare Fotos gibt es? Eigen + freigegeben zählt voll, Stock gar nicht als „stark“. */
export function bildLage(briefing) {
  const fotos = feldAn(briefing, "medien.fotos").wert ?? [];
  const eigen = fotos.filter((m) => (m.herkunft === "eigen" || m.herkunft === "ki") && m.freigabe);
  return { eigen: eigen.length, stock: fotos.filter((m) => m.herkunft === "stock").length, stark: eigen.length >= 3 };
}

function dichte(briefing) {
  const pfade = ["konzept.kurz", "konzept.usp", "konzept.belege", "karte.speisekarte", "betrieb.oeffnungszeiten", "positionierung.atmosphaere"];
  return pfade.filter((p) => istTatsache(feldAn(briefing, p))).length;
}

/**
 * Leitet einen Creative-Direction-ENTWURF aus dem Briefing ab. Rein
 * regelbasiert; identisches Briefing ⇒ identischer Entwurf.
 */
export function erzeugeCreativeDirection(briefing, ds) {
  const aktionFeld = feldAn(briefing, "aktion.haupt");
  const aktion = istZeigbar(aktionFeld) ? aktionFeld.wert : "anrufen";
  const lage = bildLage(briefing);
  const duenn = dichte(briefing) <= 2;
  const signaturen = duenn ? ["hausschild"] : moeglicheSignaturen(briefing).slice(0, 2);
  if (!signaturen.length) signaturen.push("hausschild");

  const hero = lage.stark ? "bild-voll" : signaturen.includes("tageskarte") ? "karte-titel" : signaturen.includes("zettelwand") ? "noren" : signaturen.includes("wochenplan") ? "werkbank" : "aushang";
  const balance = lage.stark ? "bild" : duenn || lage.stock === 0 ? "text" : "ausgewogen";

  const folge = [];
  const nimm = (id, gewicht, warum, extra = {}) => folge.push({ id, gewicht, warum, ...extra });
  const sig = (typ, warum) => nimm("signatur", "gross", warum, { signatur: typ });

  if (duenn) {
    nimm("kontakt", "gross", "Das Einzige, was sicher stimmt: Adresse und Telefon. Es steht direkt unter dem Namen.");
    nimm("karte", "klein", "Die Karte ist nur ein Muster – sie bleibt klein und klar als Entwurf markiert.");
    nimm("reservierung", "klein", "Online-Reservierung ist technisch bereit, aber vom Haus nicht bestätigt – nachrangig.");
    nimm("offen", "normal", "Offene Punkte sichtbar machen, statt sie mit erfundenen Inhalten zu füllen.");
  } else {
    if (aktion === "informieren" && !signaturen.includes("wochenplan")) nimm("zeiten", "gross", "Bei einem Café ist die erste Frage: Ist offen? Die Antwort kommt vor allem anderen.");
    if (signaturen[0]) sig(signaturen[0], "Das Signature-Detail zeigt den USP, statt ihn zu behaupten.");
    if (aktion === "reservieren") nimm("reservierung", "gross", "Hauptaktion laut Briefing – sie kommt, bevor die lange Karte beginnt.");
    nimm("karte", aktion === "bestellen" ? "gross" : "normal", "Die Karte folgt auf den Beleg, damit sie als Beweis gelesen wird, nicht als Pflichtteil.");
    if (istTatsache(feldAn(briefing, "konzept.geschichte")) || istTatsache(feldAn(briefing, "konzept.kurz"))) nimm("haus", "normal", "Wer kocht, warum hier – nur mit bestätigten Angaben.", { braucht: ["konzept.kurz"] });
    if (signaturen[1]) sig(signaturen[1], "Zweites Detail erst, wenn der Gast weiß, wo er ist.");
    if (aktion !== "reservieren") nimm(aktion === "bestellen" ? "abholung" : "reservierung", "klein", "Nebenweg – vorhanden, aber nicht laut.");
    nimm("kontakt", "normal", "Anfahrt zum Schluss, weil der Gast dann entschieden hat.");
  }

  const disp = ds?.typografie?.display?.familie ?? "Display";
  const txt = ds?.typografie?.text?.familie ?? "Text";
  return {
    version: 1,
    slug: briefing.slug,
    designsystem: ds?.id ?? `${briefing.kueche}--${briefing.stimmung}`,
    erzeugt: "regeln",
    bearbeitet: false,
    leitidee: duenn
      ? `Solange wir das Haus nicht kennen, zeigt die Seite nur, was stimmt – gesetzt wie ein Aushang am Haus.`
      : `${text(tatsache(briefing, "konzept.usp")) || text(tatsache(briefing, "konzept.kurz"))}`,
    wirkung: text(tatsache(briefing, "positionierung.atmosphaere")) || "Sachlich und vertrauenswürdig – keine Versprechen, die nicht belegt sind.",
    metapher: duenn ? "Aushang: Name, Adresse, Telefon – mehr steht nicht fest." : SIGNATUREN[signaturen[0]]?.titel ?? "",
    bilder: {
      balance,
      auswahl: lage.stark ? "Eigene Fotos tragen die Seite." : "Nur Fotos, die genau das benannte Gericht zeigen; kein Stockfoto als „Unser Haus“ oder „Team“.",
      zuschnitt: "Gerichte angeschnitten von oben, Fokus auf dem Teller; mobil eigener Ausschnitt statt Mittelschnitt.",
      farbklima: ds?.bildKanon?.farbstimmung ?? "wie Designsystem",
    },
    typografie: {
      rollen: [
        { rolle: "Name und Abschnittstitel", schrift: disp, begruendung: "Anzeigeschrift des Designsystems" },
        { rolle: "Karte, Fließtext, Formular", schrift: txt, begruendung: "Lesbarkeit bei 17–18 px" },
      ],
    },
    hero: { typ: hero, warum: HERO_TYPEN[hero] },
    seitenfolge: folge,
    signaturen: signaturen.map((typ) => ({ typ, titel: SIGNATUREN[typ].titel, braucht: SIGNATUREN[typ].braucht })),
    verzicht: [
      "Keine Gästestimmen ohne freigegebene Quelle",
      "Keine Häkchen-Leiste mit unbelegten USPs",
      ...(feldAn(briefing, "stil.noGos").wert ?? []).map((n) => `No-Go des Hauses: ${n}`),
    ],
    bewegung: { moment: "keiner", warum: "Bewegung nur, wenn sie die Leitidee trägt." },
    ton: { register: aktion === "reservieren" ? "herzlich" : aktion === "informieren" ? "sachlich" : "direkt" },
  };
}

/**
 * Prüft, welche Elemente der Creative Direction vom Briefing getragen
 * werden. Signaturen und Abschnitte ohne Beleg werden als „fehlend“
 * gemeldet und beim Bau weggelassen.
 */
export function belegPruefung(cd, briefing) {
  const pruefe = (braucht = []) => braucht.filter((p) => !istZeigbar(feldAn(briefing, p)));
  const signaturen = (cd.signaturen ?? []).map((s) => {
    const def = SIGNATUREN[s.typ];
    const fehlend = pruefe(s.braucht ?? def?.braucht);
    // Zusätzlich muss der Inhalt des Briefings die Signatur wirklich meinen
    // (die Izakaya hat Besonderheiten – aber keine Tageskarte).
    const passt = !def?.erkennung || moeglicheSignaturen(briefing).includes(s.typ);
    return { typ: s.typ, getragen: fehlend.length === 0 && passt, fehlend: passt ? fehlend : [...fehlend, `Briefing nennt kein „${def.titel}“`] };
  });
  const abschnitte = (cd.seitenfolge ?? []).map((a) => ({ id: a.id, signatur: a.signatur, fehlend: pruefe(a.braucht) }));
  return {
    signaturen,
    abschnitte,
    getragen: signaturen.filter((s) => s.getragen).length,
    verworfen: [...signaturen.filter((s) => !s.getragen).map((s) => `Signatur ${s.typ}: ${s.fehlend.join(", ")}`), ...abschnitte.filter((a) => a.fehlend.length).map((a) => `Abschnitt ${a.id}: ${a.fehlend.join(", ")}`)],
  };
}

export function pruefeCreativeDirection(cd) {
  const fehler = [];
  for (const k of ["leitidee", "wirkung", "metapher"]) if (!cd?.[k]) fehler.push(`${k} fehlt`);
  if (!HERO_TYPEN[cd?.hero?.typ]) fehler.push(`unbekannter Hero-Typ ${cd?.hero?.typ}`);
  if (!Array.isArray(cd?.seitenfolge) || !cd.seitenfolge.length) fehler.push("seitenfolge fehlt");
  for (const a of cd?.seitenfolge ?? []) {
    if (!ABSCHNITTE[a.id]) fehler.push(`unbekannter Abschnitt ${a.id}`);
    if (a.id === "signatur" && !SIGNATUREN[a.signatur]) fehler.push(`unbekannte Signatur ${a.signatur}`);
    if (!["gross", "normal", "klein"].includes(a.gewicht)) fehler.push(`${a.id}: Gewicht gross/normal/klein`);
    if (!a.warum) fehler.push(`${a.id}: Begründung (warum) fehlt`);
  }
  if ((cd?.signaturen ?? []).length > 2) fehler.push("höchstens zwei Signature-Details");
  if (!Array.isArray(cd?.verzicht) || !cd.verzicht.length) fehler.push("verzicht fehlt");
  return fehler;
}

/* ------------------------------------------------------------------ */
/* Speichern / Laden                                                   */
/* ------------------------------------------------------------------ */

export function cdPfad(slug, dir = cdDir()) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(String(slug))) throw new Error(`Ungültiger Slug „${slug}“`);
  return path.join(dir, `${slug}.json`);
}

export function ladeCreativeDirection(slug, dir = cdDir()) {
  const datei = cdPfad(slug, dir);
  return existsSync(datei) ? JSON.parse(readFileSync(datei, "utf-8")) : null;
}

export function speichereCreativeDirection(cd, dir = cdDir()) {
  const fehler = pruefeCreativeDirection(cd);
  if (fehler.length) throw new Error(`Creative Direction ungültig: ${fehler.join("; ")}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(cdPfad(cd.slug, dir), `${JSON.stringify(cd, null, 2)}\n`);
  writeFileSync(path.join(dir, `${cd.slug}.md`), cdMarkdown(cd));
  return cd;
}

/** Gespeicherte Fassung, sonst ein frischer Entwurf (nicht gespeichert). */
export function creativeDirectionFuer(briefing, ds, dir = cdDir()) {
  return ladeCreativeDirection(briefing.slug, dir) ?? erzeugeCreativeDirection(briefing, ds);
}

export function alleCreativeDirections(dir = cdDir()) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf-8")));
}

export function cdMarkdown(cd) {
  const z = [
    `# Creative Direction: ${cd.titel ?? cd.slug}`,
    "",
    `Designsystem als Startpunkt: \`${cd.designsystem}\` · ${cd.bearbeitet ? "von der Art-Direction bearbeitet" : "regelbasierter Entwurf"}`,
    "",
    `## 1. Leitidee\n\n${cd.leitidee}`,
    `## 2. Wirkung auf Gäste\n\n${cd.wirkung}`,
    `## 3. Visuelle Metapher\n\n${cd.metapher}`,
    `## 4. Bilder\n\n- Bild/Text-Balance: **${cd.bilder?.balance}**\n- Auswahl: ${cd.bilder?.auswahl}\n- Zuschnitt: ${cd.bilder?.zuschnitt}\n- Farbklima: ${cd.bilder?.farbklima}`,
    `## 5. Typografie\n\n${(cd.typografie?.rollen ?? []).map((r) => `- **${r.rolle}:** ${r.schrift} – ${r.begruendung}`).join("\n")}${cd.typografie?.begruendung ? `\n\n${cd.typografie.begruendung}` : ""}`,
    `## 6. Dramaturgie\n\nHero: **${cd.hero?.typ}** – ${cd.hero?.warum}\n\n${(cd.seitenfolge ?? []).map((a, i) => `${i + 1}. **${a.id}${a.signatur ? `: ${a.signatur}` : ""}** (${a.gewicht}) – ${a.warum}`).join("\n")}`,
    `## 7. Signature-Details\n\n${(cd.signaturen ?? []).map((s) => `- **${s.titel}** – ${s.beschreibung ?? ""} _(trägt nur mit: ${(s.braucht ?? []).join(", ")})_`).join("\n")}`,
    `## 8. Bewusster Verzicht\n\n${(cd.verzicht ?? []).map((v) => `- ${v}`).join("\n")}`,
    `## Bewegung\n\n${cd.bewegung?.moment} – ${cd.bewegung?.warum}`,
    "",
  ];
  return z.join("\n\n").replace(/\n{3,}/g, "\n\n");
}
