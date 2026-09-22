import { test } from "node:test";
import assert from "node:assert/strict";
import { v1Html, vergleichMarkdown, v1Massstab } from "../v2/build/vergleich.js";
import { themeForLead } from "../src/landingPageGenerator.js";
import { testLeadFuer } from "../v2/build/testLeads.js";
import { ladeDesignsystem } from "../v2/build/designsystemGenerator.js";

// Stage 8: Vergleich v1 ↔ v2. Die Screenshots selbst brauchen Chromium und
// laufen über npm run v2:vergleich; hier geht es um die Teile, die ohne
// Browser prüfbar sind.

test("Vergleich: v1 wird mit derselben Küche und Stimmung gerendert wie v2", () => {
  const lead = testLeadFuer("griechisch", "taverne-am-hafen");
  assert.ok(lead, "synthetischer Test-Lead vorhanden");
  const html = v1Html(lead);
  assert.match(html, /<!DOCTYPE html>/i);
  assert.ok(html.includes(lead.name));
  assert.match(html, /images\.unsplash\.com/, "Bilder direkt von Unsplash wie veröffentlicht");
  assert.doesNotMatch(html, /v2-hero/, "kein v2-Markup in der v1-Fassung");
});

test("Vergleich: Markdown zeigt Überblick, Noten v1→v2 und Bildpaare je Kombination", () => {
  const ds = ladeDesignsystem("griechisch", "taverne-am-hafen");
  const urteil = (mittel, bestanden) => ({
    mittel,
    bestanden,
    kriterien: Object.fromEntries(["farbdisziplin", "typografie", "rhythmus", "bildintegration", "verboteneMuster"].map((k) => [k, { note: Math.round(mittel), befunde: bestanden ? [] : [`${k} daneben`] }])),
  });
  const md = vergleichMarkdown([
    { lead: { slug: "griechisch--taverne-am-hafen" }, ds, bericht: { heroVariante: "tafel" }, urteile: { v1: urteil(4.2, false), v2: urteil(9.8, true) } },
  ]);
  assert.match(md, /\| Judge bestanden \| 0 \/ 1 \| 1 \/ 1 \|/);
  assert.match(md, /4\.2 ✗→9\.8/);
  assert.match(md, /!\[v1 Desktop\]\(vergleich\/griechisch--taverne-am-hafen--v1-desktop\.jpg\)/);
  assert.match(md, /!\[v2 Mobil\]\(vergleich\/griechisch--taverne-am-hafen--v2-mobil\.jpg\)/);
  assert.match(md, /Judge-Befunde v1:\n {2}- farbdisziplin daneben/);
  assert.doesNotMatch(md, /Judge-Befunde v2/);
});

test("Vergleich: v1 wird an der eigenen Palette und den eigenen Schriften gemessen, Raster wie v2", () => {
  const lead = testLeadFuer("bayerisch", "wirtshaus");
  const ds = ladeDesignsystem("bayerisch", "wirtshaus");
  const { theme } = themeForLead(lead, lead.kueche, lead.stimmung);
  const m = v1Massstab(ds, theme);
  assert.equal(m.farben.rollen.akzent.hex, theme.accent);
  assert.ok(Object.values(m.farben.rollen).some((r) => r.hex === theme.goldAufTint), "alle v1-Farben zählen als Palette");
  assert.equal(m.typografie.text.familie, "Inter");
  assert.deepEqual(m.spacing, ds.spacing, "Raster-Regel gilt für beide gleich");
  assert.notEqual(ds.farben.rollen.akzent.maxFlaechenAnteil, undefined);
});
