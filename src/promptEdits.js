import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config();

// Textvorschläge per Freitext-Prompt für genau einen Entwurf. Der Ablauf ist
// bewusst zweistufig: ein Vorschlag wird erzeugt und geprüft, aber erst mit
// einem zweiten, ausdrücklichen Schritt (siehe dashboardServer.js,
// /prompt/uebernehmen) über saveLeadEdits() aus leadEdits.js gespeichert.
// Solange dieser zweite Schritt nicht kommt, ändert sich am Entwurf nichts.

export const MODELL = "claude-opus-5";

// Die drei einzigen Felder, die ein Vorschlag setzen darf – identisch zu
// texte.* in leadEdits.js. Alles andere (Preise, Bilder, HTML, Struktur der
// Seite) ist für das Sprachmodell unerreichbar, weil es schlicht nicht Teil
// des Schemas ist.
export const ERLAUBTE_FELDER = ["headline", "schlagzeile", "highlightBeschreibungen"];

const HTML_TAG_REGEX = /<\s*[a-z!/][^>]*>/i;
const URL_REGEX = /(https?:\/\/|www\.)\S+/i;
const GERICHT_ID_REGEX = /^\d+-\d+$/;

function enthaeltVerbotenenInhalt(text) {
  return HTML_TAG_REGEX.test(text) || URL_REGEX.test(text);
}

/**
 * Das Sprachmodell hält sich nicht immer an "kein Markdown" – manche
 * Antworten stecken das JSON trotzdem in einen ```json-Codeblock. Der wird
 * hier abgestreift, bevor geparst wird.
 */
export function parseRohAntwort(rohText) {
  const bereinigt = String(rohText ?? "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "");

  try {
    return JSON.parse(bereinigt);
  } catch {
    return undefined;
  }
}

/**
 * Prüft eine rohe Modellantwort strikt gegen das feste Schema. Nur die drei
 * erlaubten Felder, alle Werte müssen Strings sein (keine verschachtelten
 * Objekte außer bei highlightBeschreibungen), kein HTML und keine URL im
 * Text. Bei jedem Verstoß: { ok: false, fehler }, keine Teilübernahme.
 *
 * erlaubteGerichtIds (ein Set) grenzt highlightBeschreibungen zusätzlich auf
 * Gerichte ein, die auf dieser Karte wirklich existieren – sonst könnte ein
 * frei erfundenes Feld in den lead-edits landen, das nirgends greift.
 */
export function validiereVorschlag(rohText, { erlaubteGerichtIds } = {}) {
  const daten = parseRohAntwort(rohText);

  if (daten === undefined) {
    return { ok: false, fehler: "Die Antwort des Sprachmodells war kein gültiges JSON." };
  }
  if (daten === null || typeof daten !== "object" || Array.isArray(daten)) {
    return { ok: false, fehler: "Die Antwort muss ein einzelnes JSON-Objekt sein." };
  }

  const unbekannteFelder = Object.keys(daten).filter((feld) => !ERLAUBTE_FELDER.includes(feld));
  if (unbekannteFelder.length > 0) {
    return { ok: false, fehler: `Nicht erlaubte Felder in der Antwort: ${unbekannteFelder.join(", ")}.` };
  }

  const vorschlag = {};

  for (const feld of ["headline", "schlagzeile"]) {
    if (!(feld in daten)) continue;
    const wert = daten[feld];

    if (typeof wert !== "string" || !wert.trim()) {
      return { ok: false, fehler: `"${feld}" muss ein nicht-leerer Text sein.` };
    }
    if (enthaeltVerbotenenInhalt(wert)) {
      return { ok: false, fehler: `"${feld}" enthält HTML oder eine URL – das ist nicht erlaubt.` };
    }
    vorschlag[feld] = wert.trim();
  }

  if ("highlightBeschreibungen" in daten) {
    const beschreibungen = daten.highlightBeschreibungen;
    if (typeof beschreibungen !== "object" || beschreibungen === null || Array.isArray(beschreibungen)) {
      return { ok: false, fehler: '"highlightBeschreibungen" muss ein Objekt aus Gericht-ID zu Text sein.' };
    }

    const bereinigt = {};
    for (const [id, wert] of Object.entries(beschreibungen)) {
      if (!GERICHT_ID_REGEX.test(id)) {
        return { ok: false, fehler: `"${id}" ist keine gültige Gericht-ID.` };
      }
      if (erlaubteGerichtIds && !erlaubteGerichtIds.has(id)) {
        return { ok: false, fehler: `Gericht-ID "${id}" gibt es auf dieser Karte nicht.` };
      }
      if (typeof wert !== "string" || !wert.trim()) {
        return { ok: false, fehler: `Die Beschreibung zu "${id}" muss ein nicht-leerer Text sein.` };
      }
      if (enthaeltVerbotenenInhalt(wert)) {
        return { ok: false, fehler: `Die Beschreibung zu "${id}" enthält HTML oder eine URL – das ist nicht erlaubt.` };
      }
      bereinigt[id] = wert.trim();
    }
    vorschlag.highlightBeschreibungen = bereinigt;
  }

  if (Object.keys(vorschlag).length === 0) {
    return { ok: false, fehler: "Der Vorschlag enthält keine Änderung." };
  }

  return { ok: true, vorschlag };
}

export function systemPromptFuerVorschlag() {
  return [
    "Du hilfst einem Gastronomen, die Texte auf seiner eigenen Restaurant-Landingpage anzupassen.",
    "Du bekommst die aktuellen Texte, die Speisekarte und einen Wunsch des Betreibers.",
    "",
    "Antworte AUSSCHLIESSLICH mit einem einzigen JSON-Objekt – keine Erklärung, kein Markdown-Codeblock, kein Text davor oder danach.",
    "Erlaubte Felder im JSON-Objekt, alle optional:",
    '- "headline": string, der Titel im Hero der Seite.',
    '- "schlagzeile": string, der Untertitel im Hero der Seite.',
    '- "highlightBeschreibungen": Objekt, das eine oder mehrere der oben genannten Gericht-IDs auf einen neuen Beschreibungstext abbildet.',
    "Verwende NUR diese drei Felder, keine weiteren. Setze nur, worum der Betreiber gebeten hat – lass alles andere weg.",
    "Kein HTML, keine URLs, keine Links, keine Skripte oder Code in den Texten.",
    "Keine Preise oder Zahlen zu Preisen – Preise zu ändern ist nicht deine Aufgabe und nicht möglich.",
    "Antworte auf Deutsch, im bestehenden Ton der Seite: bodenständig, einladend, ohne Übertreibung.",
  ].join("\n");
}

export function benutzerNachrichtFuerVorschlag(kontext, wunsch) {
  const gerichtZeilen = kontext.gerichte
    .map((g) => `- ${g.id}: "${g.name}" – aktuell: "${g.beschreibung}"`)
    .join("\n");

  return [
    `Restaurant: ${kontext.name}`,
    `Aktuelle Headline: "${kontext.aktuelleHeadline}"`,
    `Aktuelle Schlagzeile: "${kontext.aktuelleSchlagzeile}"`,
    "Gerichte auf der Karte (Gericht-ID: Name – aktuelle Beschreibung):",
    gerichtZeilen,
    "",
    `Wunsch des Betreibers: ${wunsch}`,
  ].join("\n");
}

let cachedClient;
function anthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "Kein ANTHROPIC_API_KEY gesetzt. Bitte in .env eintragen (siehe .env.example) und den Dashboard-Server neu starten.",
    );
  }
  cachedClient ??= new Anthropic();
  return cachedClient;
}

/**
 * Der einzige Punkt, an dem wirklich ein API-Aufruf passiert. Kurz gehalten
 * (Extraktionsaufgabe, kein langes Nachdenken nötig) und ohne Streaming, weil
 * die Antwort nur wenige hundert Token groß ist.
 */
export async function rufeLlmAuf({ system, nachricht }) {
  const antwort = await anthropicClient().messages.create({
    model: MODELL,
    max_tokens: 2048,
    output_config: { effort: "low" },
    system,
    messages: [{ role: "user", content: nachricht }],
  });

  const textBlock = antwort.content.find((block) => block.type === "text");
  if (!textBlock) throw new Error("Das Sprachmodell hat keinen Text geliefert.");
  return textBlock.text;
}

// Austauschbar für Tests: zeigt per Default auf den echten API-Aufruf. Tests
// ersetzen .aktuell durch eine gemockte Funktion, statt wirklich zu
// telefonieren – siehe test/promptEdits.test.js.
export const llmAufrufHook = { aktuell: rufeLlmAuf };

/* ---------- Rate-Limit: max. 10 Anfragen je Entwurf und Stunde ---------- */

export const MAX_PROMPTS_PRO_STUNDE = 10;
const STUNDE_MS = 60 * 60 * 1000;
const anfragenProLead = new Map();

export function pruefeRateLimit(slug) {
  const jetzt = Date.now();
  const bisherige = (anfragenProLead.get(slug) ?? []).filter((t) => jetzt - t < STUNDE_MS);

  if (bisherige.length >= MAX_PROMPTS_PRO_STUNDE) {
    const wartenMinuten = Math.max(1, Math.ceil((STUNDE_MS - (jetzt - bisherige[0])) / 60000));
    throw new Error(
      `Zu viele Vorschläge für diesen Entwurf (maximal ${MAX_PROMPTS_PRO_STUNDE} pro Stunde). ` +
        `Bitte in etwa ${wartenMinuten} Minute(n) erneut versuchen.`,
    );
  }

  bisherige.push(jetzt);
  anfragenProLead.set(slug, bisherige);
}

/* ---------- Ausstehende, noch nicht gespeicherte Vorschläge ---------- */

const ausstehendeVorschlaege = new Map();

export function merkeVorschlag(slug, vorschlag) {
  ausstehendeVorschlaege.set(slug, { vorschlag, erstelltAm: new Date().toISOString() });
}

export function letzterVorschlag(slug) {
  return ausstehendeVorschlaege.get(slug) ?? null;
}

export function vergissVorschlag(slug) {
  ausstehendeVorschlaege.delete(slug);
}

// Nur für Tests: der In-Memory-Zustand ist ein Modul-Singleton und würde
// sonst zwischen Testfällen (und -dateien) durchsickern.
export function _zustandZuruecksetzenFuerTests() {
  ausstehendeVorschlaege.clear();
  anfragenProLead.clear();
}

/**
 * Erzeugt einen Textvorschlag: ruft das Sprachmodell auf, validiert die
 * Antwort strikt und merkt sie – ohne sie zu speichern – für den nächsten
 * Schritt (/prompt/uebernehmen in dashboardServer.js). Wirft bei jedem
 * Fehler (Ratenlimit, kein API-Key, ungültige Antwort) mit einer Meldung,
 * die sich direkt in der Oberfläche anzeigen lässt.
 */
export async function erzeugeTextVorschlag(slug, wunsch, kontext) {
  if (!String(wunsch ?? "").trim()) {
    throw new Error("Bitte einen Wunsch beschreiben.");
  }

  pruefeRateLimit(slug);

  const rohText = await llmAufrufHook.aktuell({
    system: systemPromptFuerVorschlag(),
    nachricht: benutzerNachrichtFuerVorschlag(kontext, wunsch),
  });

  const ergebnis = validiereVorschlag(rohText, { erlaubteGerichtIds: kontext.erlaubteGerichtIds });
  if (!ergebnis.ok) throw new Error(ergebnis.fehler);

  merkeVorschlag(slug, ergebnis.vorschlag);
  return ergebnis.vorschlag;
}
