import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { verfeinereText, verfeinereTexte, humanisiereTexte, pruefeText, REGELN } from "../v2/build/copyRefiner.js";
import { texteFuer, textBlaetter } from "../v2/build/texte.js";
import { baueSite, BuildAbbruch } from "../v2/build/siteBuilder.js";
import { ladeDesignsystem } from "../v2/build/designsystemGenerator.js";
import { testLeads, testLeadFuer } from "../v2/build/testLeads.js";
import { menuForCuisine } from "../src/menuCatalog.js";

const tmp = mkdtempSync(path.join(tmpdir(), "__test-v2-copy-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

const faelle = [
  ["Willkommen bei Luigi! Holzofenpizza seit 1998.", "Holzofenpizza seit 1998."],
  ["Tauchen Sie ein in die Welt Italiens. Pasta täglich frisch.", "Pasta täglich frisch."],
  ["Entdecken Sie unsere Karte.", "Unsere Karte."],
  ["Eine kulinarische Reise durch Kalabrien.", "Eine Karte durch Kalabrien."],
  ["Mit viel Liebe zubereitet.", "Von Hand zubereitet."],
  ["Ein einzigartiges Erlebnis.", "Ein Erlebnis."],
  ["Authentische italienische Küche.", "Italienische Küche."],
  ["Hier gibt es nicht nur Pizza, sondern auch Pasta.", "Hier gibt es Pizza und Pasta."],
  ["Bodenständig, ehrlich und frisch aus der Region – mitten in Tüßling.", "Frisch aus der Region – mitten in Tüßling."],
  ["Frische Pasta, Holzofenpizza und echtes Dolce Vita – am Stadtplatz.", "Frische Pasta und Holzofenpizza – am Stadtplatz."],
  ["Pasta — frisch.", "Pasta – frisch."],
  ["Absolut lecker.", "Lecker."],
];

for (const [vorher, nachher] of faelle) {
  test(`Refiner: „${vorher}“`, () => {
    const r = verfeinereText(vorher);
    assert.equal(r.text, nachher);
    assert.deepEqual(pruefeText(r.text), []);
  });
}

test("Hinweise blockieren nicht, werden aber gemeldet", () => {
  const r = verfeinereText("Die beste Pizza der Stadt. Egal ob mittags oder abends.");
  assert.deepEqual(r.hinweise.sort(), ["egal-ob", "superlativ-beste"]);
  assert.equal(r.ersetzungen.length, 0);
});

test("Klischee-Tagline wird durch den ersten konkreten Punkt des Hauses ersetzt", () => {
  assert.equal(verfeinereText("Mediterrane Gastfreundschaft, wie am Meer – am Hafen.", { konkret: "Vom Holzkohlegrill" }).text, "Vom Holzkohlegrill – am Hafen.");
});

test("alle 36 Test-Seiten: keine verbleibenden Verstöße, höchstens ein Ausrufezeichen", () => {
  for (const lead of testLeads()) {
    const ds = ladeDesignsystem(lead.kueche, lead.stimmung);
    const { texte, bericht } = verfeinereTexte(texteFuer({ ds, menu: menuForCuisine(lead.kueche), lead }), ds);
    assert.deepEqual(bericht.verbleibend, [], lead.slug);
    const ausrufe = textBlaetter(texte).map(([, t]) => t).join(" ").split("!").length - 1;
    assert.ok(ausrufe <= 1, `${lead.slug}: ${ausrufe} Ausrufezeichen`);
  }
});

test("die v1-Katalogtexte mit Floskeln werden auf der Seite bereinigt", () => {
  const lead = testLeadFuer("italienisch", "trattoria");
  const { html, bericht } = baueSite({ lead, kueche: "italienisch", stimmung: "trattoria", optionen: { fiktiv: true, fontCss: "" } });
  assert.ok(!html.includes("Dolce Vita"));
  assert.ok(bericht.copy.ersetzungen.some((e) => e.regeln.includes("klischee-dolce-vita")));
});

test("Copy-Gate: ein nicht bereinigbarer Text stoppt den Build", () => {
  const lead = testLeadFuer("italienisch", "trattoria");
  const kaputt = (texte) => ({ texte, bericht: { verbleibend: [{ pfad: "claim", regeln: ["willkommen"], text: "Willkommen" }] } });
  assert.throws(() => baueSite({ lead, kueche: "italienisch", stimmung: "trattoria", optionen: { fiktiv: true, fontCss: "", texteVerfeinern: kaputt } }), (e) => e instanceof BuildAbbruch && e.gate === "copy");
});

test("eigene Texte aus dem Prompt-Editor (leadEdits) laufen ebenfalls durch den Refiner", () => {
  const lead = testLeadFuer("bayerisch", "wirtshaus");
  const { html } = baueSite({ lead, kueche: "bayerisch", stimmung: "wirtshaus", optionen: { fiktiv: true, fontCss: "", editUebersteuerung: { texte: { schlagzeile: "Willkommen im Wirtshaus! Tauchen Sie ein in unsere unvergessliche Küche. Schweinsbraten mit Kruste." } } } });
  assert.match(html, /<p class="hero-claim">Schweinsbraten mit Kruste\.<\/p>/);
});

test("Sprachmodell-Durchgang: nur auffällige Texte, Ergebnis gecacht und danach noch einmal geprüft", async () => {
  const ds = ladeDesignsystem("italienisch", "trattoria");
  const lead = testLeadFuer("italienisch", "trattoria");
  const texte = texteFuer({ ds, menu: menuForCuisine("italienisch"), lead });
  const aufrufe = [];
  const modell = {
    name: "fake",
    verfuegbar: () => true,
    umschreiben: async ({ stuecke }) => {
      aufrufe.push(stuecke.map((s) => s.id));
      // Das Modell liefert selbst eine Floskel – die Regeln müssen sie trotzdem fangen.
      return stuecke.map((s) => ({ id: s.id, text: "Entdecken Sie unsere Pasta aus dem Holzofen." }));
    },
  };
  const cache = await humanisiereTexte({ slug: "__test-v2-copy", texte, ds, modell, cacheDir: tmp });
  assert.ok(existsSync(path.join(tmp, "__test-v2-copy.json")));
  assert.ok(aufrufe[0].includes("claim") && !aufrufe[0].includes("reservierung.titel"), "nur auffällige Texte gehen an das Modell");
  const { texte: fertig, bericht } = verfeinereTexte(texte, ds, { llmCache: cache });
  assert.equal(fertig.claim, "Unsere Pasta aus dem Holzofen.");
  assert.equal(bericht.llm.length, aufrufe[0].length);
  await humanisiereTexte({ slug: "__test-v2-copy", texte, ds, modell, cacheDir: tmp });
  assert.equal(aufrufe.length, 1, "zweiter Lauf kommt aus dem Cache");
});

test("ohne Schlüssel bleibt es bei den Regeln", async () => {
  const ds = ladeDesignsystem("cafe", "konditorei");
  const cache = await humanisiereTexte({ slug: "__test-v2-copy-aus", texte: { claim: "Willkommen!" }, ds, modell: { verfuegbar: () => false }, cacheDir: tmp });
  assert.deepEqual(cache, {});
});

test("jede Fehler-Regel hat einen Ersatz", () => {
  for (const r of REGELN.filter((x) => x.schwere === "fehler")) assert.ok(r.ersatz !== undefined, r.id);
});
