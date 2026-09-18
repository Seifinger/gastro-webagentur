import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { baueUndSchreibeEinzelnenEntwurf } from "./publishSite.js";
import { siteBaseUrl } from "./config.js";

// Das Veröffentlichen eines einzelnen Entwurfs aus dem Bearbeiten-Dashboard:
// docs/<slug> neu bauen, dann per Git committen und pushen – ohne die übrigen
// Entwürfe in docs/ anzufassen (das übernimmt schon
// baueUndSchreibeEinzelnenEntwurf() in publishSite.js).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const execFileAsync = promisify(execFile);

/**
 * Führt einen einzelnen Git-Befehl im Repo-Wurzelverzeichnis aus. execFile
 * statt exec (child_process): die Argumente gehen direkt an den Prozess, ohne
 * über eine Shell zu laufen – ein Slug mit Sonderzeichen könnte darüber sonst
 * zusätzliche Befehle einschleusen.
 */
export async function fuehreGitBefehlAus(args) {
  try {
    return await execFileAsync("git", args, { cwd: repoRoot });
  } catch (fehler) {
    // stderr trägt bei git fast immer die eigentliche, lesbare Meldung
    // ("Could not resolve host", ein Merge-Konflikt, ...) – die reine
    // Exit-Code-Meldung von execFile sagt dagegen nur "Command failed".
    const meldung = String(fehler.stderr ?? "").trim() || fehler.message;
    throw new Error(`git ${args[0]} fehlgeschlagen: ${meldung}`);
  }
}

// Austauschbar für Tests, analog zu llmAufrufHook in promptEdits.js – so lässt
// sich die ganze Route prüfen, ohne wirklich zu bauen oder zu committen.
export const baueEntwurfHook = { aktuell: baueUndSchreibeEinzelnenEntwurf };
export const gitAufrufHook = { aktuell: fuehreGitBefehlAus };

/**
 * Baut genau einen Entwurf neu und veröffentlicht ihn: docs/<slug> bauen, per
 * Git committen und pushen. Ohne Änderungen (der Entwurf war schon aktuell)
 * bricht die Funktion vor dem Commit ab, statt einen leeren Commit zu
 * erzeugen. Scheitert der Push (z. B. kein Internetzugang), bleibt der lokale
 * Commit stehen – nichts geht verloren, ein erneuter Versuch reicht.
 */
export async function veroeffentlicheEntwurf(slug) {
  const { ordner } = await baueEntwurfHook.aktuell(slug);
  const relOrdner = path.relative(repoRoot, ordner);

  await gitAufrufHook.aktuell(["add", relOrdner]);

  const { stdout: status } = await gitAufrufHook.aktuell(["status", "--porcelain", "--", relOrdner]);
  if (!status.trim()) {
    return { veraendert: false, url: `${siteBaseUrl}/${slug}/` };
  }

  await gitAufrufHook.aktuell(["commit", "-m", `Entwurf für ${slug} aktualisiert`]);
  await gitAufrufHook.aktuell(["push"]);

  return { veraendert: true, url: `${siteBaseUrl}/${slug}/` };
}
