import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";

// Die Themes brauchen echte Schriften. Wir laden sie einmalig von Google Fonts
// und legen sie lokal ab – eingebundene Web-Schriften würden die Entwürfe
// offline unbrauchbar machen. Alle vier Familien stehen unter der SIL Open
// Font License und dürfen selbst gehostet werden.

const FAMILIES = [
  { family: "Inter", weights: [400, 600, 700] },
  { family: "Playfair Display", weights: [700] },
  { family: "Merriweather", weights: [700] },
  { family: "Montserrat", weights: [600, 700] },
];

// Für deutsche Texte reichen diese beiden Zeichensatz-Ausschnitte; die
// kyrillischen und griechischen Varianten sparen wir uns.
const SUBSETS = ["latin", "latin-ext"];

const MANIFEST = "fonts.json";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function familySlug(family) {
  return family.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function cssUrl(family, weights) {
  const name = family.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${name}:wght@${weights.join(";")}&display=swap`;
}

/**
 * Zerlegt das CSS von Google Fonts in die einzelnen @font-face-Blöcke.
 * Vor jedem Block steht ein Kommentar mit dem Zeichensatz-Namen.
 */
function parseFontFaces(css) {
  const blocks = [];
  const regex = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;

  for (const [, subset, body] of css.matchAll(regex)) {
    if (!SUBSETS.includes(subset)) continue;

    const weight = body.match(/font-weight:\s*(\d+)/)?.[1];
    const url = body.match(/src:\s*url\(([^)]+)\)/)?.[1];
    const unicodeRange = body.match(/unicode-range:\s*([^;]+);/)?.[1];
    if (!weight || !url || !unicodeRange) continue;

    blocks.push({ subset, weight: Number(weight), url, unicodeRange: unicodeRange.trim() });
  }

  return blocks;
}

/**
 * Lädt alle Schriftdateien in den Ordner und schreibt ein Manifest, aus dem
 * sich später das @font-face-CSS bauen lässt. Vorhandene Dateien bleiben.
 */
export async function ensureFonts(targetDir) {
  mkdirSync(targetDir, { recursive: true });

  const manifestPath = path.join(targetDir, MANIFEST);
  if (existsSync(manifestPath)) {
    const vorhanden = JSON.parse(readFileSync(manifestPath, "utf-8"));
    const vollstaendig = vorhanden.every((e) => existsSync(path.join(targetDir, e.datei)));
    if (vollstaendig) return { geladen: 0, fehlgeschlagen: [] };
  }

  const manifest = [];
  const fehlgeschlagen = [];
  let geladen = 0;

  for (const { family, weights } of FAMILIES) {
    let faces;
    try {
      const response = await fetch(cssUrl(family, weights), { headers: { "User-Agent": BROWSER_UA } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      faces = parseFontFaces(await response.text());
    } catch (error) {
      fehlgeschlagen.push(`${family}: ${error.message}`);
      continue;
    }

    for (const face of faces) {
      const datei = `${familySlug(family)}-${face.weight}-${face.subset}.woff2`;
      const ziel = path.join(targetDir, datei);

      if (!existsSync(ziel)) {
        try {
          const response = await fetch(face.url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          writeFileSync(ziel, Buffer.from(await response.arrayBuffer()));
          geladen += 1;
        } catch (error) {
          fehlgeschlagen.push(`${family} ${face.weight} ${face.subset}: ${error.message}`);
          continue;
        }
      }

      manifest.push({ family, weight: face.weight, datei, unicodeRange: face.unicodeRange });
    }
  }

  if (manifest.length > 0) {
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  }

  return { geladen, fehlgeschlagen };
}

/**
 * Baut das @font-face-CSS für die lokal abgelegten Schriften. Ohne Manifest
 * kommt ein leerer String zurück – die Seiten greifen dann auf die
 * Systemschriften der Theme-Definition zurück.
 */
export function fontFaceCss(fontsDir, assetsPath = "../assets/fonts") {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path.join(fontsDir, MANIFEST), "utf-8"));
  } catch {
    return "";
  }

  return manifest
    .map(
      ({ family, weight, datei, unicodeRange }) => `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url('${assetsPath}/${datei}') format('woff2');unicode-range:${unicodeRange};}`,
    )
    .join("\n");
}
