import test from "node:test";
import assert from "node:assert/strict";
import { buildLandingPage, themeForLead } from "../src/landingPageGenerator.js";
import { menuForCuisine } from "../src/menuCatalog.js";
import { stimmungenFuer } from "../src/stimmungen.js";

const lead = {
  name: "Gasthof Beispiel",
  ort: "Mühldorf am Inn",
  adresse: "Marktplatz 1, 84453 Mühldorf am Inn",
  telefon: "08631 123456",
  placeId: "test-remotion",
  rating: 4.7,
  anzahlBewertungen: 428,
};

function seite(cuisine, archetyp, extra = {}) {
  const stimmung = stimmungenFuer(cuisine).find((s) => s.archetyp === archetyp).id;
  const gestaltung = themeForLead(lead, cuisine, stimmung);
  return buildLandingPage(lead, { menu: menuForCuisine(cuisine), gestaltung, ...extra });
}

// Der Remotion-Player ist Opt-in über eine Generator-Option, kein
// Preset-Feld (siehe landingPageGenerator.js, remotionSignature). Ohne die
// Option bleibt jede Seite Zeichen für Zeichen die bisherige – das ist der
// eigentliche Regressionsschutz, denn genau das hält den Byte-Diff der 48
// veröffentlichten Seiten unberührt.
test("ohne die Option bleibt die Seite Zeichen für Zeichen dieselbe", () => {
  const ohne = seite("bayerisch", "traditionell");
  const mitLeererOption = seite("bayerisch", "traditionell", { remotionSignature: false });
  assert.equal(ohne, mitLeererOption);
  assert.ok(!ohne.includes("remotion-mount"));
  assert.ok(!ohne.includes("signature-player.js"));
});

test("mit der Option steckt die Bühne genau dort, wo die Marke ohnehin schon steht: im Siegel der Hausempfehlung", () => {
  const mit = seite("japanisch", "abend", { remotionSignature: true });
  assert.ok(mit.includes("signature-player.js"));
  // Kein eigener Platz auf der Seite (keine fest positionierte Ecke) –
  // dieselbe Marke, am selben Ort, nur in eine Bühne gehüllt. Die Farbe
  // kommt nicht aus einem eigens mitgegebenen Attribut, sondern aus
  // currentColor, das .hl-siegel bereits auf --accent-bold setzt (siehe
  // mount.jsx) – deshalb hier ausdrücklich KEIN data-accent.
  const siegelMatch = mit.match(/<span class="hl-siegel">(.*?)<\/span> Hausempfehlung<\/span>/s);
  assert.ok(siegelMatch, "kein Siegel gefunden");
  assert.ok(siegelMatch[0].includes('<span class="remotion-mount"'));
  assert.ok(!siegelMatch[0].includes("data-accent"));
  assert.ok(siegelMatch[0].includes("<svg"));
  assert.ok(!mit.includes(".remotion-mount {"), "keine eigene, freischwebende CSS-Regel mehr für die Bühne");
});

test("die Option greift nur, wo eine Handschrift und eine gezeichnete Marke existieren", () => {
  // editorial hat (Stand dieser Sitzung) keine Handschrift (layout.handschrift
  // ist null) – die Option darf dort still verpuffen, nicht crashen.
  const editorial = seite("italienisch", "editorial", { remotionSignature: true });
  assert.ok(!editorial.includes("remotion-mount"));
});

test("das Bootstrap-Skript zeigt auf den echten Assets-Pfad der Seite", () => {
  const mit = seite("bayerisch", "traditionell", { remotionSignature: true, assetsPath: "./bilder" });
  assert.ok(mit.includes('import("./bilder/motion/signature-player.js")'));
});
