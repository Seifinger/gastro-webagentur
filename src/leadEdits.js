import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Eigene Bilder und Texte je Lead. Der generische Entwurf bleibt, wie er ist –
// was ein Kunde später einpflegt, liegt in einer eigenen Datei je Entwurf und
// übersteuert beim Erzeugen der Seite nur die Stellen, die wirklich gesetzt
// sind. Eine Datei je Lead: das bleibt ohne Datenbank nachvollziehbar und
// lässt sich notfalls mit einem Texteditor korrigieren.
//
// Aufbau einer Datei:
// {
//   "bilder": { "hero": "pfad", "haus": "pfad", "team": "pfad", "bestseller": "pfad" },
//   "texte": { "headline": "...", "schlagzeile": "...", "highlightBeschreibungen": { "<gerichtId>": "..." } },
//   "verlauf": [ { "zeitpunkt": "ISO-Datum", "vorher": { ... } } ]
// }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const leadEditsDir = path.join(__dirname, "..", "data", "lead-edits");

// Wie viele frühere Fassungen aufgehoben werden. Genug, um einen misslungenen
// Text zurückzuholen, wenig genug, dass die Datei nicht endlos wächst.
export const MAX_VERLAUF = 10;

function datei(slug) {
  return path.join(leadEditsDir, `${slug}.json`);
}

/**
 * Die Übersteuerungen eines Entwurfs. Ohne Datei (der Normalfall: 56 von 56
 * Entwürfen) kommt ein leeres Objekt zurück, mit dem die Seite exakt wie
 * bisher entsteht.
 */
export function loadLeadEdits(slug) {
  try {
    return JSON.parse(readFileSync(datei(slug), "utf-8"));
  } catch {
    return {};
  }
}

/**
 * Schreibt die Übersteuerungen und hebt den vorherigen Stand im "verlauf" der
 * gleichen Datei auf. Der Verlauf des alten Standes wird dabei nicht
 * mitgesichert – sonst verdoppelte sich die Datei mit jedem Speichern.
 */
export function saveLeadEdits(slug, edits) {
  const { verlauf: bisherigerVerlauf = [], ...vorherigerStand } = loadLeadEdits(slug);
  const { verlauf: _verworfen, ...neuerStand } = edits ?? {};

  // Beim allerersten Speichern gibt es keinen Vorgänger, den zu sichern lohnt.
  const verlauf = existsSync(datei(slug))
    ? [...bisherigerVerlauf, { zeitpunkt: new Date().toISOString(), vorher: vorherigerStand }].slice(
        -MAX_VERLAUF,
      )
    : bisherigerVerlauf;

  const daten = { ...neuerStand, verlauf };

  mkdirSync(leadEditsDir, { recursive: true });
  writeFileSync(datei(slug), `${JSON.stringify(daten, null, 2)}\n`, "utf-8");
  return daten;
}
