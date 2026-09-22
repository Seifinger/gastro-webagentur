// Baut src/motion/mount.jsx (React + @remotion/player + die eigene
// Komposition) zu EINER selbstständigen ESM-Datei. Das ist der einzige
// Build-Schritt im ganzen Projekt: Der Seiten-Generator selbst bleibt
// Zero-Build/Template-Literal wie bisher (siehe landingPageGenerator.js) –
// nur dieses eine Bewegungs-Asset wird vorab gebündelt, genau wie Schriften
// (fontLibrary.js) und Bilder (imageLibrary.js) vorab lokal abgelegt werden,
// statt zur Laufzeit von einem CDN zu kommen.
//
// Aufruf: node scripts/buildRemotionPlayer.mjs
// npm-Skript: npm run build:motion
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const EINGANG = path.join(REPO, "src/motion/mount.jsx");
const ZIEL_ORDNER = path.join(REPO, "docs/assets/motion");
const ZIEL_DATEI = path.join(ZIEL_ORDNER, "signature-player.js");

mkdirSync(ZIEL_ORDNER, { recursive: true });

const ergebnis = await build({
  entryPoints: [EINGANG],
  outfile: ZIEL_DATEI,
  bundle: true,
  format: "esm",
  target: "es2020",
  minify: true,
  sourcemap: false,
  jsx: "automatic",
  jsxImportSource: "react",
  // Alles in einer Datei, self-hosted, kein CDN, kein Import-Map nötig –
  // dieselbe Haltung wie bei Schriften und Bildern in diesem Projekt.
  metafile: true,
  logLevel: "info",
});

const bytes = ergebnis.metafile.outputs[path.relative(REPO, ZIEL_DATEI)]?.bytes ?? 0;
console.log(`\n${path.relative(REPO, ZIEL_DATEI)}: ${(bytes / 1024).toFixed(1)} kB (unkomprimiert)`);
