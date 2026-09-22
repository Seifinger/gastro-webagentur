// Copy-Refiner (Stage 6): prüft und bereinigt jeden sichtbaren Text einer
// v2-Seite gegen typische KI-Formulierungen. Begründung jeder Regel:
// v2/COPY-PRINZIPIEN.md.
//
// Zwei Stufen:
//   - "fehler": wird automatisch umgeschrieben (streichen/ersetzen). Bleibt
//     danach ein Treffer übrig, bricht der Build ab (Gate "copy").
//   - "hinweis": wird nur gemeldet (Build-Bericht, Dashboard).
//
// Optional davor: ein Sprachmodell formuliert betroffene Texte um
// (humanisiereTexte, asynchron, mit Cache). Dessen Ausgabe läuft danach noch
// einmal durch alle Regeln.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { textBlaetter, setzeText } from "./texte.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const COPY_CACHE_DIR = path.join(__dirname, "..", "output", "copy");

const ENDUNG = "(?:e|en|em|er|es)?";
const wort = (w) => new RegExp(`\\b${w}${ENDUNG}\\b\\s?`, "gi");

const SUPERLATIV_ADJEKTIVE = ["unvergesslich", "einzigartig", "exquisit", "erlesen", "himmlisch", "sensationell", "traumhaft", "zauberhaft", "unwiderstehlich", "atemberaubend", "perfekt", "ultimativ", "außergewöhnlich", "fantastisch", "authentisch"];
const ALLGEMEINE_ADJEKTIVE = ["bodenständig", "ehrlich", "frisch", "authentisch", "liebevoll", "hausgemacht", "regional", "saisonal", "lecker", "köstlich", "traditionell", "modern", "gemütlich", "familiär", "herzlich", "echt", "kreativ", "hochwertig"];

/**
 * Jede Regel: id, schwere, muster (RegExp mit g-Flag) und ersatz – ein Text oder
 * eine Funktion (kontext, treffer, ...gruppen).
 * Die Reihenfolge zählt: erst ganze Sätze, dann Wendungen, dann Wörter,
 * zuletzt Typografie und Aufräumen.
 */
export const REGELN = [
  { id: "willkommen", schwere: "fehler", muster: /(?:^|(?<=[.!?]\s))(?:Herzlich )?Willkommen (?:bei|im|in der|in|zu|zur|zum)\b[^.!?]*[.!?]\s*/gi, ersatz: "" },
  { id: "eintauchen", schwere: "fehler", muster: /(?:^|(?<=[.!?]\s))Tauchen Sie ein\b[^.!?]*[.!?]\s*/gi, ersatz: "" },
  { id: "verwoehnen", schwere: "fehler", muster: /(?:^|(?<=[.!?]\s))Lassen Sie sich\b[^.!?]*(?:verwöhnen|verzaubern|überraschen|begeistern|inspirieren)[^.!?]*[.!?]\s*/gi, ersatz: "" },
  {
    id: "entdecken-erleben",
    schwere: "fehler",
    muster: /\b(?:Entdecken|Erleben|Genießen|Erkunden|Probieren) Sie (unsere|unser|unseren|unserem|die|das|den|eine|einen)\b/g,
    ersatz: (_k, _t, artikel) => artikel.charAt(0).toUpperCase() + artikel.slice(1),
  },
  { id: "kulinarische-reise", schwere: "fehler", muster: /\bkulinarische(?:n)? Reise\b/gi, ersatz: "Karte" },
  { id: "kulinarisches-erlebnis", schwere: "fehler", muster: /\bkulinarische(?:s|n)? Erlebnis(?:se)?\b/gi, ersatz: "Essen" },
  { id: "geschmackserlebnis", schwere: "fehler", muster: /\bGeschmackserlebnis\b/g, ersatz: "Aroma" },
  { id: "gaumenschmaus", schwere: "fehler", muster: /\bGaumenschmaus\b/g, ersatz: "Teller" },
  { id: "geschmacksexplosion", schwere: "fehler", muster: /\bGeschmacksexplosion\b/g, ersatz: "Würze" },
  { id: "herzstueck", schwere: "fehler", muster: /\bHerzstück\b/g, ersatz: "Zentrum" },
  { id: "oase", schwere: "fehler", muster: /\bOase (?:der|für) \w+\b/g, ersatz: "ruhiger Ort" },
  { id: "mit-liebe", schwere: "fehler", muster: /\bmit (?:viel )?Liebe (zubereitet|gemacht|gekocht|gebacken)\b/gi, ersatz: (_k, _t, verb) => `von Hand ${verb}` },
  { id: "nicht-nur-sondern", schwere: "fehler", muster: /\bnicht nur ([^,.;!?]+), sondern auch ([^,.;!?]+)/g, ersatz: (_k, _t, a, b) => `${a} und ${b}` },
  {
    id: "adjektiv-kette",
    schwere: "fehler",
    muster: new RegExp(`\\b(${ALLGEMEINE_ADJEKTIVE.join("|")})${ENDUNG}, (${ALLGEMEINE_ADJEKTIVE.join("|")})${ENDUNG} und (${ALLGEMEINE_ADJEKTIVE.join("|")}${ENDUNG})\\b`, "gi"),
    ersatz: (_k, treffer, _a, _b, c) => (/^[A-ZÄÖÜ]/.test(treffer) ? c.charAt(0).toUpperCase() + c.slice(1) : c),
  },
  { id: "klischee-dolce-vita", schwere: "fehler", muster: /(?:,| und)? (?:echtes |echte |echter |ein bisschen |etwas )?Dolce Vita\b/g, ersatz: "", aufzaehlungReparieren: true },
  { id: "klischee-wie-am-meer", schwere: "fehler", muster: /,? wie am Meer\b/g, ersatz: "" },
  { id: "klischee-gastfreundschaft", schwere: "fehler", muster: /\bMediterrane Gastfreundschaft\b/g, ersatz: (kontext) => kontext.konkret ?? "Vom Grill" },
  { id: "klischee-gemuetlich", schwere: "fehler", muster: / und gemütliche Stunden\b/g, ersatz: "" },
  ...SUPERLATIV_ADJEKTIVE.map((a) => ({ id: `superlativ-${a}`, schwere: "fehler", muster: wort(a), ersatz: "" })),
  { id: "fuellwort", schwere: "fehler", muster: /\b(?:absolut|wirklich|ganz besonders|wahrhaft) (?=\w)/gi, ersatz: "" },
  { id: "geviertstrich", schwere: "fehler", muster: /\s*—\s*/g, ersatz: " – " },
  { id: "superlativ-beste", schwere: "hinweis", muster: /\b(?:der|die|das|den) beste(?:n)? \w+ (?:der Stadt|im Ort|weit und breit|der Region)\b/gi },
  { id: "egal-ob", schwere: "hinweis", muster: /\bEgal,? ob\b/gi },
  { id: "ihr-partner", schwere: "hinweis", muster: /\bIhr(?:e)? (?:Partner|Restaurant|Adresse) (?:für|wenn)\b/g },
  { id: "duzen", schwere: "hinweis", muster: /\b(?:du|dein|deine|dich|dir|komm)\b/g },
  { id: "englisch", schwere: "hinweis", muster: /\b(?:Food ?Lover|Vibes?|Experience|Must-have|Foodies?)\b/gi },
];

function aufraeumen(text, reparieren) {
  let t = text
    .replace(/ {2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/^[\s,;:–-]+/, "")
    .replace(/,\s*([.!?])/g, "$1")
    .trim();
  if (reparieren) {
    // „Frische Pasta, Holzofenpizza“ (nach Streichen von „und echtes Dolce Vita“)
    // wird wieder zu einer sauberen Aufzählung.
    t = t.replace(/^([^,–.]+), ([^,–.]+?)(\s–|$)/, "$1 und $2$3");
  }
  if (t && /^[a-zäöü]/.test(t)) t = t.charAt(0).toUpperCase() + t.slice(1);
  return t;
}

/** Wendet alle Fehler-Regeln auf einen Text an und liefert Änderungen + Hinweise. */
export function verfeinereText(text, kontext = {}) {
  let aktuell = text;
  const ersetzungen = [];
  const hinweise = [];
  let reparieren = false;
  for (const regel of REGELN) {
    regel.muster.lastIndex = 0;
    if (!regel.muster.test(aktuell)) continue;
    regel.muster.lastIndex = 0;
    if (regel.schwere === "hinweis") {
      hinweise.push(regel.id);
      continue;
    }
    const vorher = aktuell;
    aktuell = aktuell.replace(regel.muster, (...args) => (typeof regel.ersatz === "function" ? regel.ersatz(kontext, ...args.slice(0, -2)) : regel.ersatz));
    if (regel.aufzaehlungReparieren) reparieren = true;
    if (aktuell !== vorher) ersetzungen.push(regel.id);
  }
  const bereinigt = ersetzungen.length ? aufraeumen(aktuell, reparieren) : aktuell;
  return { text: bereinigt, ersetzungen, hinweise };
}

/** Findet verbleibende Fehler-Treffer (nach der Umschreibung). */
export function pruefeText(text) {
  return REGELN.filter((r) => r.schwere === "fehler").filter((r) => {
    r.muster.lastIndex = 0;
    const treffer = r.muster.test(text);
    r.muster.lastIndex = 0;
    return treffer;
  }).map((r) => r.id);
}

const hash = (text) => createHash("sha256").update(text).digest("hex").slice(0, 16);

/**
 * Verfeinert alle Texte einer Seite. Wird von siteBuilder.js aufgerufen
 * (Option texteVerfeinern); liefert { texte, bericht }.
 *
 * @param {object} texte - aus texteFuer()
 * @param {object} [ds] - Designsystem (für den Sprachkanon im Bericht)
 * @param {object} [optionen]
 * @param {Record<string,string>} [optionen.llmCache] - Hash des Originals → umgeschriebener Text
 */
export function verfeinereTexte(texte, ds = null, { llmCache = {} } = {}) {
  const kopie = structuredClone(texte);
  const kontext = { konkret: kopie.usps?.[0] };
  const bericht = { ersetzungen: [], hinweise: [], verbleibend: [], llm: [], ausrufezeichen: 0, kanon: ds?.sprache?.ton ?? null };
  let ausrufeGesehen = 0;

  for (const [pfad, original] of textBlaetter(kopie)) {
    let text = original;
    const llm = llmCache[hash(original)];
    if (llm && llm !== original) {
      text = llm;
      bericht.llm.push({ pfad: pfad.join("."), vorher: original, nachher: llm });
    }
    const ergebnis = verfeinereText(text, kontext);
    text = ergebnis.text;
    // Höchstens ein Ausrufezeichen je Seite.
    text = text.replace(/!/g, () => {
      ausrufeGesehen += 1;
      return ausrufeGesehen > 1 ? "." : "!";
    });
    if (ergebnis.ersetzungen.length) bericht.ersetzungen.push({ pfad: pfad.join("."), regeln: ergebnis.ersetzungen, vorher: original, nachher: text });
    for (const h of ergebnis.hinweise) bericht.hinweise.push({ pfad: pfad.join("."), regel: h, text });
    const rest = pruefeText(text);
    if (rest.length || (!text.trim() && original.trim())) bericht.verbleibend.push({ pfad: pfad.join("."), regeln: rest.length ? rest : ["leer"], text: original });
    if (text !== original) setzeText(kopie, pfad, text);
  }
  bericht.ausrufezeichen = Math.min(ausrufeGesehen, 1);
  return { texte: kopie, bericht };
}

/* ------------------------------------------------------------------ */
/* Optionaler Sprachmodell-Durchgang                                    */
/* ------------------------------------------------------------------ */

const SYSTEM = `Du überarbeitest kurze deutsche Texte für die Website eines Restaurants.
Ziel: Sie sollen klingen, als hätte der Wirt sie selbst geschrieben – konkret, ruhig, ohne Werbesprache.
Regeln:
- Keine neuen Fakten erfinden (keine Jahreszahlen, Auszeichnungen, Herkünfte, Zutaten, die nicht im Text stehen).
- Anrede „Sie“. Kurze Sätze. Höchstens ein Ausrufezeichen insgesamt.
- Verboten: Willkommen-Formeln, „Tauchen Sie ein“, „Entdecken/Erleben/Genießen Sie“, „Lassen Sie sich verwöhnen“, „kulinarische Reise“, „Geschmackserlebnis“, „Gaumenschmaus“, „unvergesslich“, „einzigartig“, „authentisch“, „mit Liebe“, „nicht nur … sondern auch“, Ketten aus drei Adjektiven, der Geviertstrich „—“.
- Länge ungefähr beibehalten (±20 %).
Antworte ausschließlich mit JSON: {"texte":[{"id":"…","text":"…"}]}`;

let anthropicClient = null;

/**
 * Anthropic-Anbindung über das offizielle SDK (wie promptEdits.js in v1).
 * Modell per V2_COPY_MODELL änderbar; Standard claude-opus-5 mit niedrigem
 * Aufwand (kurze Umformulierungen brauchen kein langes Nachdenken).
 */
export const anthropicSprachmodell = {
  name: "anthropic",
  verfuegbar: () => Boolean(process.env.ANTHROPIC_API_KEY) && process.env.V2_COPY_LLM === "1",
  async umschreiben({ stuecke, kanon }) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    anthropicClient ??= new Anthropic();
    const antwort = await anthropicClient.beta.messages.create({
      model: process.env.V2_COPY_MODELL || "claude-opus-5",
      max_tokens: 4096,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Ton des Hauses: ${kanon?.ton ?? "bodenständig"}. Wortfeld: ${(kanon?.wortfeld ?? []).join(", ")}.\n\nTexte:\n${JSON.stringify({ texte: stuecke })}`,
        },
      ],
    });
    if (antwort.stop_reason === "refusal") return [];
    const block = antwort.content.find((b) => b.type === "text");
    if (!block) return [];
    const json = block.text.slice(block.text.indexOf("{"), block.text.lastIndexOf("}") + 1);
    try {
      return JSON.parse(json).texte ?? [];
    } catch {
      return [];
    }
  },
};

export const SPRACHMODELLE = { anthropic: anthropicSprachmodell };

/**
 * Lässt die Texte, bei denen der Refiner etwas gefunden hat, vom
 * Sprachmodell umformulieren und legt das Ergebnis im Cache ab.
 * Liefert den Cache (Hash des Originals → neuer Text) für verfeinereTexte().
 */
export async function humanisiereTexte({ slug, texte, ds, modell = anthropicSprachmodell, cacheDir = COPY_CACHE_DIR }) {
  const datei = path.join(cacheDir, `${slug}.json`);
  const cache = existsSync(datei) ? JSON.parse(readFileSync(datei, "utf-8")) : {};
  if (!modell?.verfuegbar()) return cache;
  const kandidaten = textBlaetter(texte).filter(([, text]) => {
    const r = verfeinereText(text);
    return (r.ersetzungen.length || r.hinweise.length) && !cache[hash(text)];
  });
  if (kandidaten.length === 0) return cache;
  const stuecke = kandidaten.map(([pfad, text]) => ({ id: pfad.join("."), text }));
  try {
    const ergebnis = await modell.umschreiben({ stuecke, kanon: ds?.sprache });
    for (const { id, text } of ergebnis) {
      const original = stuecke.find((s) => s.id === id)?.text;
      if (original && typeof text === "string" && text.trim()) cache[hash(original)] = text.trim();
    }
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(datei, `${JSON.stringify(cache, null, 2)}\n`);
  } catch {
    // Das Sprachmodell ist optional – ohne Antwort bleibt es bei den Regeln.
  }
  return cache;
}
