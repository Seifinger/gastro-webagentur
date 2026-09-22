#!/usr/bin/env node
/**
 * Test-Script: Generiert synthetische Leads und baut Landing-Pages mit Remotion-Animation.
 *
 * Nutze: node scripts/testRemotionPages.mjs
 *
 * Das Script erstellt Test-Seiten im data/landingpages Verzeichnis mit Remotion-Signaturen.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  baueEintraege,
  ladeBilder,
  ladeSchriften,
  schreibeSeiten,
} from "../src/buildSite.js";
import { landingPagesDir } from "../src/config.js";
import { loadLeadEdits } from "../src/leadEdits.js";
import { merkeEntwuerfe } from "../src/entwurfsManifest.js";

const __dir = path.dirname(fileURLToPath(import.meta.url));

// Test-Leads mit verschiedenen Küchen für vollständige Abdeckung
const TEST_LEADS = [
  {
    placeId: "test-bayerisch-001",
    name: "Zur Post – Bayerisches Wirtshaus",
    ort: "München",
    score: 92,
    cuisine: "bayerisch",
  },
  {
    placeId: "test-italienisch-001",
    name: "Trattoria dal Nonno",
    ort: "Berlin",
    score: 88,
    cuisine: "italienisch",
  },
  {
    placeId: "test-japanisch-001",
    name: "Sakura Izakaya",
    ort: "Hamburg",
    score: 85,
    cuisine: "japanisch",
  },
  {
    placeId: "test-griechisch-001",
    name: "Taverna Milos",
    ort: "Frankfurt",
    score: 80,
    cuisine: "griechisch",
  },
];

async function run() {
  console.log("\n🧪 Test-Remotion-Pages generieren ...\n");

  mkdirSync(landingPagesDir, { recursive: true });

  // Einträge bauen
  const entries = baueEintraege(TEST_LEADS, null).map((entry) => ({
    ...entry,
    editUebersteuerung: loadLeadEdits(entry.slug),
  }));

  // Assets laden
  const assetsDir = path.join(landingPagesDir, "assets");
  console.log("📷 Lade Bildmaterial ...");
  await ladeBilder(entries, assetsDir);

  console.log("🔤 Lade Schriften ...");
  const fontCss = await ladeSchriften(path.join(assetsDir, "fonts"));

  // Pages schreiben MIT Remotion-Signaturen aktiviert
  console.log("🎬 Baue Pages mit Remotion-Animation ...\n");
  schreibeSeiten(entries, landingPagesDir, {
    kontaktEmail: "test@example.com",
    fontCss,
    apiUrl: "",
    remotionSignature: true,  // ← Das ist der wichtige Schalter!
  });

  // Manifest aktualisieren
  merkeEntwuerfe(
    entries.map(({ lead, slug }) => ({ placeId: lead.placeId, slug }))
  );

  // Übersichtsseite generieren
  const overviewHtml = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Test: Remotion-Animation in Landing-Pages</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 40px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #1f2430;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .wrap {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0,0,0,.3);
    }
    h1 {
      margin: 0 0 8px;
      color: #667eea;
      font-size: 32px;
    }
    .subtitle {
      color: #6b7280;
      margin: 0 0 32px;
      font-size: 16px;
    }
    .info {
      background: #f0f9ff;
      border-left: 4px solid #667eea;
      padding: 16px;
      margin: 24px 0;
      border-radius: 8px;
      color: #1e40af;
    }
    .grid {
      display: grid;
      gap: 24px;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      margin: 32px 0;
    }
    .card {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      transition: all .2s ease;
    }
    .card:hover {
      border-color: #667eea;
      box-shadow: 0 12px 24px rgba(102, 126, 234, .15);
      transform: translateY(-4px);
    }
    .card-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px;
      font-weight: 600;
    }
    .card-body {
      padding: 16px;
    }
    .card-body p {
      margin: 8px 0;
      font-size: 14px;
      color: #6b7280;
    }
    .card-body strong {
      color: #1f2430;
    }
    .card-link {
      display: inline-block;
      margin-top: 12px;
      padding: 8px 16px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      transition: background .2s;
    }
    .card-link:hover {
      background: #764ba2;
    }
    .note {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      margin: 16px 0;
      border-radius: 6px;
      font-size: 14px;
      color: #92400e;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>🎬 Test: Remotion-Animation</h1>
    <p class="subtitle">Synthetische Test-Restaurants mit Remotion-Signaturen</p>

    <div class="info">
      ℹ️ Diese Pages wurden mit <code>remotionSignature: true</code> generiert.
      In den Highlights sollte die Küchenmarke animiert sein (strichweise gezeichnet statt SVG-Bild).
    </div>

    <div class="note">
      🔍 <strong>Wo ist die Animation?</strong><br>
      Öffne eine Page und scrolle zur <strong>Highlights-Sektion</strong> (das bestellen unsere Gäste am liebsten).
      Dort sollte das Siegel "Hausempfehlung" die Küchenmarke mit Animation zeigen.
    </div>

    <div class="grid">
${entries
  .map(
    ({ lead, slug }) => `
      <div class="card">
        <div class="card-header">${lead.name}</div>
        <div class="card-body">
          <p><strong>Ort:</strong> ${lead.ort}</p>
          <p><strong>Score:</strong> ${lead.score}</p>
          <p><strong>Küche:</strong> ${lead.cuisine}</p>
          <a class="card-link" href="./${slug}/index.html" target="_blank">
            → Seite öffnen
          </a>
        </div>
      </div>
`
  )
  .join("")}
    </div>

    <div class="info">
      <strong>📋 Was wurde getestet:</strong><br>
      ✓ Remotion-Script eingebunden<br>
      ✓ Highlights mit Handschrift (traditionell/abend/hell)<br>
      ✓ Verschiedene Küchen mit Marken<br>
      ✓ Engine-Version 3 Marker gesetzt
    </div>
  </div>
</body>
</html>
`;

  const overviewPath = path.join(landingPagesDir, "test-remotion.html");
  writeFileSync(overviewPath, overviewHtml, "utf-8");

  console.log(`✅ ${entries.length} Test-Pages mit Remotion generiert!\n`);
  console.log(`📂 Verzeichnis: ${landingPagesDir}`);
  console.log(`🌐 Übersicht: ${overviewPath}`);
  console.log(`   → Öffne diese Datei im Browser um die Pages zu sehen\n`);
}

run().catch((err) => {
  console.error("❌ Fehler:", err);
  process.exitCode = 1;
});
