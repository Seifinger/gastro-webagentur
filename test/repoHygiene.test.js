import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Das Repository ist öffentlich (GitHub Pages). Befund aus dem Audit vom
// 25.09.2026: Ein echter Google-Schlüssel stand einmal in einer versionierten
// .env. Dieser Test hält fest, dass so etwas nicht wieder hineinrutscht –
// Treffer werden nur mit Datei und Muster gemeldet, nie mit dem Wert.

const wurzel = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const git = (...args) => execFileSync("git", args, { cwd: wurzel, encoding: "utf-8" });

let versioniert = null;
try {
  versioniert = git("ls-files", "-z").split("\0").filter(Boolean);
} catch {
  versioniert = null; // kein Git-Klon (z. B. entpacktes Archiv)
}

const MUSTER = {
  "Google API": /AIza[0-9A-Za-z_-]{35}/,
  Anthropic: /sk-ant-[A-Za-z0-9_-]{20,}/,
  "Resend": /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/,
  "Telegram-Bot": /\b[0-9]{8,10}:AA[A-Za-z0-9_-]{33}\b/,
  "GitHub-Token": /\b(?:gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,})/,
  "Privater Schlüssel": /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  "AWS": /\bAKIA[0-9A-Z]{16}\b/,
  "Passwort-Hash (scrypt)": /scrypt\$\d+\$\d+\$\d+\$[A-Za-z0-9+/=]{16,}\$[A-Za-z0-9+/=]{32,}/,
};

const BINAER = /\.(jpe?g|png|webp|gif|ico|mp4|webm|woff2?|ttf|otf|pdf|zip)$/i;

test("keine Zugangsschlüssel in versionierten Dateien", { skip: !versioniert && "kein Git-Klon" }, () => {
  const treffer = [];
  for (const datei of versioniert) {
    if (BINAER.test(datei) || datei === "package-lock.json") continue;
    let inhalt;
    try {
      inhalt = readFileSync(path.join(wurzel, datei), "utf-8");
    } catch {
      continue;
    }
    for (const [name, muster] of Object.entries(MUSTER)) {
      if (muster.test(inhalt)) treffer.push(`${datei}: ${name}`);
    }
  }
  assert.deepEqual(treffer, [], "Schlüssel gehören in Umgebungsvariablen des Hosts, nie ins Repo");
});

test(".env und andere lokale Umgebungsdateien sind nie versioniert", { skip: !versioniert && "kein Git-Klon" }, () => {
  const envDateien = versioniert.filter((d) => /(^|\/)\.env(\.|$)/.test(d) && !d.endsWith(".env.example"));
  assert.deepEqual(envDateien, []);
});

test("Laufzeitdaten mit Gast-, Kunden- oder Lead-Bezug sind gitignoriert", { skip: !versioniert && "kein Git-Klon" }, () => {
  const pfade = [
    ".env",
    ".env.local",
    "data/betrieb/beispiel.json",
    "data/betrieb/.gast-status-geheimnis",
    "data/zuverlaessigkeit/beispiel.json",
    "data/wartezeitLernen/beispiel.json",
    "data/kunden/k-abcdefghij/projekt.json",
    "data/lead-edits/beispiel.json",
    "data/resonanz/beispiel.json",
    "data/seitenaufrufe/beispiel.json",
    "data/output/leads.csv",
    "data/landingpages/entwuerfe.json",
    "data/sicherung/liste.json",
    "data/stimmungen.json",
    "public/uploads/beispiel/hero.jpg",
    "v2/output/leads/beispiel/index.html",
    "v2/output/kunden/k-abcdefghij/index.html",
    "v2/output/berichte/beispiel.json",
    "v2/output/copy/beispiel.json",
    "v2/briefings/echter-betrieb.json",
  ];
  const nichtIgnoriert = pfade.filter((p) => {
    try {
      git("check-ignore", "-q", "--no-index", p);
      return false;
    } catch {
      return true;
    }
  });
  assert.deepEqual(nichtIgnoriert, []);
});
