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

// Host, auf dem dashboardServer.js und wirtServer.js lauschen. Default ist
// 127.0.0.1, damit die Server ohne explizite Konfiguration nicht versehentlich
// im lokalen Netzwerk erreichbar sind – über DASHBOARD_HOST in der .env
// bewusst änderbar (z. B. auf 0.0.0.0).
export const dashboardHost = process.env.DASHBOARD_HOST || "127.0.0.1";

// Öffentliche Adresse des Resonanz-Collectors (resonanzServer.js), die in die
// Entwürfe eingebaut wird. Sie muss vom Gerät des Wirts aus erreichbar sein –
// die Entwürfe liegen auf GitHub Pages, nicht neben dem Server.
//
// Leer lassen schaltet die Resonanzmessung ab: Dann wird gar kein Beacon in
// die Seite eingebaut und die Entwürfe verhalten sich exakt wie vorher.
export const resonanzUrl = (process.env.RESONANZ_URL || "").replace(/\/+$/, "");

export const resonanzPort = Number(process.env.RESONANZ_PORT || 3300);

// Wie dashboardHost per Default 127.0.0.1. Für den echten Betrieb gehört der
// Collector hinter einen Reverse Proxy mit TLS, der auf diesen Port zeigt.
export const resonanzHost = process.env.RESONANZ_HOST || dashboardHost;
