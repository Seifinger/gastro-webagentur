import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";

// Kuratierte Stockfotos (Unsplash). Die Bilder werden beim Generieren einmalig
// heruntergeladen und lokal abgelegt, damit die Entwürfe auch ohne Internet
// funktionieren – etwa beim Termin direkt im Lokal.

export const IMAGE_ROLES = {
  hero: { w: 1800, h: 1000 },
  gericht: { w: 800, h: 600 },
  ambiente: { w: 900, h: 700 },
};

// Je Küche sechs Titelmotive: bei über 70 Leads bekommen sonst mehrere
// Nachbarlokale dasselbe Bild.
export const HERO_IMAGES = {
  bayerisch: [
    "photo-1528605248644-14dd04022da1",
    "photo-1558030006-450675393462",
    "photo-1552566626-52f8b828add9",
    "photo-1432139555190-58524dae6a55",
    "photo-1599921841143-819065a55cc6",
    "photo-1414235077428-338989a2e8c0",
  ],
  italienisch: [
    "photo-1574071318508-1cdbab80d002",
    "photo-1481931098730-318b6f776db0",
    "photo-1513104890138-7c749659a591",
    "photo-1551892374-ecf8754cf8b0",
    "photo-1565299624946-b28f40a0ae38",
    "photo-1517248135467-4c7edcad34c4",
  ],
  asiatisch: [
    "photo-1569718212165-3a8278d5f624",
    "photo-1504674900247-0877df9cc836",
    "photo-1553621042-f6e147245754",
    "photo-1559314809-0d155014e29e",
    "photo-1512058564366-18510be2db19",
    "photo-1590846406792-0adc7f938f1d",
  ],
  griechisch: [
    "photo-1540189549336-e6e99c3679fe",
    "photo-1599487488170-d11ec9c172f0",
    "photo-1559339352-11d035aa65de",
    "photo-1529006557810-274b9b2fc783",
    "photo-1544025162-d76694265947",
    "photo-1592861956120-e524fc739696",
  ],
  tuerkisch: [
    "photo-1599487488170-d11ec9c172f0",
    "photo-1529006557810-274b9b2fc783",
    "photo-1561651823-34feb02250e4",
    "photo-1544025162-d76694265947",
    "photo-1466978913421-dad2ebd01d17",
    "photo-1554118811-1e0d58224f24",
  ],
  cafe: [
    "photo-1495474472287-4d71bcdd2085",
    "photo-1554118811-1e0d58224f24",
    "photo-1567620905732-2d1ec7ab7445",
    "photo-1509440159596-0249088772ff",
    "photo-1546069901-ba9599a7e63c",
    "photo-1544510808-91bcbee1df55",
  ],
};

// Fünf Motive je Küche; die Collage zeigt drei davon in wechselnder Reihenfolge.
export const AMBIENTE_IMAGES = {
  bayerisch: [
    "photo-1552566626-52f8b828add9",
    "photo-1414235077428-338989a2e8c0",
    "photo-1428515613728-6b4607e44363",
    "photo-1528605248644-14dd04022da1",
    "photo-1592861956120-e524fc739696",
  ],
  italienisch: [
    "photo-1517248135467-4c7edcad34c4",
    "photo-1414235077428-338989a2e8c0",
    "photo-1555396273-367ea4eb4db5",
    "photo-1428515613728-6b4607e44363",
    "photo-1592861956120-e524fc739696",
  ],
  asiatisch: [
    "photo-1590846406792-0adc7f938f1d",
    "photo-1517248135467-4c7edcad34c4",
    "photo-1428515613728-6b4607e44363",
    "photo-1555396273-367ea4eb4db5",
    "photo-1414235077428-338989a2e8c0",
  ],
  griechisch: [
    "photo-1559339352-11d035aa65de",
    "photo-1414235077428-338989a2e8c0",
    "photo-1592861956120-e524fc739696",
    "photo-1528605248644-14dd04022da1",
    "photo-1466978913421-dad2ebd01d17",
  ],
  tuerkisch: [
    "photo-1554118811-1e0d58224f24",
    "photo-1466978913421-dad2ebd01d17",
    "photo-1592861956120-e524fc739696",
    "photo-1428515613728-6b4607e44363",
    "photo-1559339352-11d035aa65de",
  ],
  cafe: [
    "photo-1554118811-1e0d58224f24",
    "photo-1509440159596-0249088772ff",
    "photo-1592861956120-e524fc739696",
    "photo-1414235077428-338989a2e8c0",
    "photo-1495474472287-4d71bcdd2085",
  ],
};

export function assetFileName(id, role) {
  return `${id}-${role}.jpg`;
}

function assetUrl(id, role) {
  const { w, h } = IMAGE_ROLES[role];
  return `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&crop=entropy&q=72&fm=jpg`;
}

/**
 * Lädt alle noch fehlenden Bilder in den Asset-Ordner. Bereits vorhandene
 * Dateien werden übersprungen, ein erneuter Lauf kostet also nichts.
 */
export async function ensureAssets(specs, targetDir) {
  mkdirSync(targetDir, { recursive: true });

  const missing = specs.filter(
    ({ id, role }) => !existsSync(path.join(targetDir, assetFileName(id, role))),
  );
  if (missing.length === 0) return { geladen: 0, fehlgeschlagen: [] };

  const fehlgeschlagen = [];
  let geladen = 0;

  for (const { id, role } of missing) {
    try {
      const response = await fetch(assetUrl(id, role));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      writeFileSync(path.join(targetDir, assetFileName(id, role)), buffer);
      geladen += 1;
    } catch (error) {
      fehlgeschlagen.push(`${id} (${role}): ${error.message}`);
    }
  }

  return { geladen, fehlgeschlagen };
}
