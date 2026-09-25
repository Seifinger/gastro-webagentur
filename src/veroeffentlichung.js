import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { baueUndSchreibeEinzelnenEntwurf } from "./publishSite.js";
import { randomBytes } from "node:crypto";
import { siteBaseUrl, docsDir } from "./config.js";
import { pruefeOeffentlicheAusgabe } from "./oeffentlichkeit.js";
import { ladeManifest, placeIdFuerSlug } from "./entwurfsManifest.js";
import { setzeDemoStatus } from "./demoEinstellungen.js";

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

// Alle Git-Schritte laufen nacheinander – zwei gleichzeitige Veröffentlichungen
// würden sich sonst Index und Commit gegenseitig verderben.
let gitKette = Promise.resolve();
function gitSeriell(fn) {
  const lauf = gitKette.then(fn, fn);
  gitKette = lauf.catch(() => {});
  return lauf;
}

export function neueBuildId(jetzt = new Date()) {
  return `${jetzt.getTime().toString(36)}-${randomBytes(3).toString("hex")}`;
}

/**
 * Baut genau einen Entwurf neu und veröffentlicht ihn: docs/<slug> bauen
 * (publishSite.baueUndSchreibeEinzelnenEntwurf: neue Vorlage, Temp-Ordner,
 * Tausch erst nach vollständigem Bau), dann committen, mit dem Remote
 * abgleichen und pushen. Ohne Änderungen bricht die Funktion vor dem Commit
 * ab. Scheitert der Push, bleibt der lokale Commit stehen, und die
 * öffentliche Fassung ist unverändert – ein erneuter Versuch reicht.
 */
export async function veroeffentlicheEntwurf(slug, { buildId = neueBuildId() } = {}) {
  // Konzept-Demos echter Betriebe werden nicht veröffentlicht (src/oeffentlichkeit.js).
  // Der Ablauf bleibt für einen späteren, eigenen Kunden-Workflow (Typ C) stehen.
  pruefeOeffentlicheAusgabe(docsDir, slug);
  const { ordner } = await baueEntwurfHook.aktuell(slug, { buildId });
  const relOrdner = path.relative(repoRoot, ordner);

  return gitSeriell(async () => {
    await gitAufrufHook.aktuell(["add", relOrdner]);

    const { stdout: status } = await gitAufrufHook.aktuell(["status", "--porcelain", "--", relOrdner]);
    if (!status.trim()) {
      return { veraendert: false, url: `${siteBaseUrl}/${slug}/`, buildId };
    }

    await gitAufrufHook.aktuell(["commit", "-m", `Entwurf für ${slug} aktualisiert`]);
    await gitAufrufHook.aktuell(["pull", "--rebase", "--autostash"]);
    await gitAufrufHook.aktuell(["push"]);
    return { veraendert: true, url: `${siteBaseUrl}/${slug}/`, buildId };
  });
}

/* ---------- Nachweis: ist die neue Fassung wirklich online? ---------- */

// Austauschbar für Tests: holt den HTML-Text einer öffentlichen URL.
export const abrufHook = {
  aktuell: async (url) => {
    const antwort = await fetch(url, { headers: { "Cache-Control": "no-cache" }, redirect: "follow" });
    return { status: antwort.status, text: antwort.ok ? await antwort.text() : "" };
  },
};

export const PRUEF_TAKT_MS = 15_000;
// GitHub Pages braucht nach einem Push meist 1–3 Minuten (Actions-Lauf
// "pages build and deployment"); das CDN hält Seiten bis zu 10 Minuten.
// Die Prüf-URL trägt deshalb die Build-ID als Parameter (am CDN-Cache vorbei).
export const PRUEF_GRENZE_MS = 15 * 60_000;

/**
 * Wartet, bis unter url die Seite mit genau dieser Build-ID ausgeliefert
 * wird. Liefert true bei Erfolg, false nach Ablauf der Frist.
 */
export async function pruefeOeffentlich(url, buildId, { taktMs = PRUEF_TAKT_MS, grenzeMs = PRUEF_GRENZE_MS, warte = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const ende = Date.now() + grenzeMs;
  const marke = `<meta name="demo-build" content="${buildId}">`;
  for (;;) {
    try {
      const { status, text } = await abrufHook.aktuell(`${url}?pruefung=${encodeURIComponent(buildId)}`);
      if (status === 200 && text.includes(marke)) return true;
    } catch {
      // Netzfehler: beim nächsten Takt erneut versuchen.
    }
    if (Date.now() + taktMs > ende) return false;
    await warte(taktMs);
  }
}

/* ---------- Ablauf mit Status (Dashboard: "Speichern und veröffentlichen") ---------- */

const laufend = new Map();

export function laeuftGerade(slug) {
  return laufend.has(slug);
}

/**
 * Startet Bau, Veröffentlichung und Online-Nachweis im Hintergrund und hält
 * jeden Schritt im Manifest fest (demoStatus): baut → wird-veroeffentlicht →
 * online bzw. fehler. Erfolg wird erst gemeldet, wenn die öffentliche URL
 * nachweislich die neue Build-ID liefert. Je Demo läuft höchstens ein Vorgang.
 *
 * @returns {{ gestartet: true, buildId: string, fertig: Promise<object> }}
 */
export function starteVeroeffentlichung(slug, { pruefOptionen = {} } = {}) {
  pruefeOeffentlicheAusgabe(docsDir, slug);
  if (laufend.has(slug)) throw new Error("Für diese Demo läuft bereits ein Bau oder eine Veröffentlichung.");
  const placeId = placeIdFuerSlug(ladeManifest(), slug);
  if (!placeId) throw new Error(`Kein Lead für Slug "${slug}" gefunden.`);
  const buildId = neueBuildId();
  const status = (patch) => setzeDemoStatus(placeId, { ...patch, buildId, zeitpunkt: new Date().toISOString() });

  status({ zustand: "baut" });
  const fertig = (async () => {
    let schritt = "bauen";
    try {
      const ergebnis = await veroeffentlicheEntwurf(slug, { buildId });
      schritt = "online-pruefen";
      status({ zustand: "wird-veroeffentlicht", url: ergebnis.url, letzterBuild: { buildId, zeitpunkt: new Date().toISOString() } });
      const online = await pruefeOeffentlich(ergebnis.url, buildId, pruefOptionen);
      if (!online) {
        const grenze = Math.round((pruefOptionen.grenzeMs ?? PRUEF_GRENZE_MS) / 60_000);
        return status({ zustand: "fehler", schritt, fehler: `Gepusht, aber nach ${grenze} Minuten liefert ${ergebnis.url} die neue Fassung noch nicht aus. GitHub Pages (Actions → "pages build and deployment") prüfen und erneut prüfen lassen.`, url: ergebnis.url });
      }
      return status({ zustand: "online", online: { url: ergebnis.url, buildId, zeitpunkt: new Date().toISOString() } });
    } catch (fehler) {
      return status({ zustand: "fehler", schritt, fehler: fehler.message });
    } finally {
      laufend.delete(slug);
    }
  })();
  laufend.set(slug, fertig);
  return { gestartet: true, buildId, fertig };
}
