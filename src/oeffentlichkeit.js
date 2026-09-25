// Was darf öffentlich werden? (v2/DEMO-UMBAU.md, "Öffentlich vs. lokal", Stand 25.09.2026)
//
// docs/ ist die Quelle von GitHub Pages: alles darin ist ohne Anmeldung für
// jeden abrufbar. robots.txt und noindex verhindern höchstens das Indexieren,
// nicht den Zugriff. Deshalb gilt:
//
//   Typ A  fiktive Portfolio-Beispiele (beispiel-<küche>)  → dürfen nach docs/
//   Typ B  Konzept-Demos für echte Leads                    → nie nach docs/;
//          nur lokal (v2/output/leads/) bzw. im Dashboard, zum Zeigen über die
//          Präsentation im WLAN (src/praesentation.js)
//   Typ C  echte Kundenwebsite nach Beauftragung            → eigener, späterer
//          Workflow; bis dahin ebenfalls nicht über docs/
//
// Jeder Weg, der nach docs/ schreibt, prüft hier – zusätzlich prüft
// baueImZyklus() (die gemeinsame unterste Ebene) jeden Bau.

import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { docsDir } from "./config.js";
import { DEMO_LEADS } from "./demoLeads.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ABGESCHALTET_PFAD = path.join(__dirname, "..", "v2", "abgeschaltete-demos.json");

export const MELDUNG_NICHT_OEFFENTLICH =
  "Konzept-Demos für echte Betriebe werden nicht mehr veröffentlicht: docs/ ist GitHub Pages und dort ohne Zugriffsschutz für jeden abrufbar. " +
  "Die Demo lokal bauen („Konzept-Demo lokal bauen“) und vor Ort über „Präsentation im WLAN“ zeigen.";

/** Die zwölf fiktiven Beispielseiten (Typ A). */
export function istFiktivesBeispiel(slug) {
  return DEMO_LEADS.some((l) => `beispiel-${l.kueche}` === slug);
}

/** Liegt der Pfad in docs/ (oder ist docs/ selbst)? */
export function liegtInDocs(pfad, docs = docsDir) {
  const rel = path.relative(path.resolve(docs), path.resolve(pfad));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * Wirft, wenn eine Seite, die kein fiktives Beispiel ist, in docs/ landen
 * würde. `fiktiv` (vom Bau) reicht nicht: Auch der Slug muss ein Beispiel sein.
 */
export function pruefeOeffentlicheAusgabe(zielDir, slug, { docs = docsDir } = {}) {
  if (liegtInDocs(zielDir, docs) && !istFiktivesBeispiel(slug)) {
    throw new Error(`${MELDUNG_NICHT_OEFFENTLICH} (Ziel war ${path.join(path.relative(process.cwd(), zielDir) || ".", slug ?? "")})`);
  }
}

/* ---------- Abgeschaltete Alt-Demos ---------- */

// Die Liste steht im öffentlichen Repo – deshalb nur als SHA-256 des Slugs,
// nicht als Name. Das Dashboard kann damit je Lead sagen, ob unter seiner
// früheren Adresse einmal eine öffentliche Demo stand und seit wann sie
// abgeschaltet ist, ohne die Liste der angeschriebenen Betriebe zu verraten.
export function slugHash(slug) {
  return createHash("sha256").update(String(slug)).digest("hex");
}

export function ladeAbgeschaltete(pfad = ABGESCHALTET_PFAD) {
  try {
    return JSON.parse(readFileSync(pfad, "utf-8"));
  } catch {
    return { abgeschaltetAm: "", slugHashes: [] };
  }
}

/**
 * Status der früheren öffentlichen Adresse eines Leads:
 *   "online"        – unter docs/<slug>/ liegt (noch) eine Seite
 *   "abgeschaltet"  – stand öffentlich, wurde entfernt (Adresse zeigt den neutralen Hinweis)
 *   "nie"           – es gab keine öffentliche Demo
 */
export function alteOeffentlicheDemo(slug, { docs = docsDir, liste = ladeAbgeschaltete() } = {}) {
  if (!slug) return { status: "nie" };
  if (existsSync(path.join(docs, slug, "index.html"))) return { status: "online" };
  if (liste.slugHashes?.includes(slugHash(slug))) return { status: "abgeschaltet", seit: liste.abgeschaltetAm };
  return { status: "nie" };
}
