import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const regionsPath = path.join(__dirname, "..", "data", "regions.json");

export const apiKey = process.env.GOOGLE_PLACES_API_KEY;

export function loadRegions() {
  return JSON.parse(readFileSync(regionsPath, "utf-8"));
}

export const outputDir = path.join(__dirname, "..", "data", "output");

export const landingPagesDir = path.join(__dirname, "..", "data", "landingpages");

// Von GitHub Pages ausgeliefert. Der Ordner wird bei jedem Lauf komplett neu
// erzeugt, damit abgewählte Entwürfe auch wirklich offline gehen.
export const docsDir = path.join(__dirname, "..", "docs");

// Basis der veröffentlichten Entwürfe – gebraucht für QR-Codes und die
// Anschreiben im Dashboard. Über SITE_BASE_URL in der .env überschreibbar,
// falls du später eine eigene Domain nutzt.
export const siteBaseUrl = (
  process.env.SITE_BASE_URL || "https://seifinger.github.io/gastro-webagentur"
).replace(/\/+$/, "");

// Grußformel der Anschreiben-Entwürfe im Dashboard.
export const absenderName = process.env.ABSENDER_NAME || "";
