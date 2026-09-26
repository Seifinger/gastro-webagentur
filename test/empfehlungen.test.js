import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// „Passt gut dazu“: Regeln (src/empfehlungen.js), Einbau in die Seite
// (v2/build/sektionen/passtDazu.js), Einstellungen des Wirts, Markierung an
// der Bestellung und serverseitige Preisprüfung (betriebStore/wirtServer).
// Der Durchlauf im Browser steht in empfehlungen-browser.test.js.

const SLUG = "__test-empfehlungen";
const ANDERER = "__test-empfehlungen-b";
process.env.BETRIEB = SLUG;
delete process.env.V2_COPY_LLM;

const { handler } = await import("../src/wirtServer.js");
const store = await import("../src/betriebStore.js");
const { waehle, rolleAusName, empfehlungsProdukte, pruefeEmpfehlungsRegeln, kurz } = await import("../src/empfehlungen.js");
const { karteAusDaten } = await import("../v2/build/speisekarte.js");
const { baueSite } = await import("../v2/build/siteBuilder.js");
const { menuForCuisine } = await import("../src/menuCatalog.js");
const { DEMO_LEADS } = await import("../src/demoLeads.js");
const { italienischeBetriebskarte } = await import("./hilfen/speisekarten.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATEI = (slug) => path.join(__dirname, "..", "data", "betrieb", `${slug}.json`);

// Donnerstag 24.09.2026, 17:00 Berlin: 18:30 ist eine angebotene Abholzeit.
store.uhrHook.jetzt = () => new Date("2026-09-24T17:00:00+02:00");

beforeEach(() => {
  for (const slug of [SLUG, ANDERER]) store.speichereBetrieb(slug, { tische: [], reservierungen: [], bestellungen: [], pushSubscriptions: [] });
});
after(() => {
  for (const slug of [SLUG, ANDERER]) rmSync(DATEI(slug), { force: true });
});

/* ------------------------------------------------------------------ */
/* Hilfen                                                              */
/* ------------------------------------------------------------------ */

const karteVon = (menu) => karteAusDaten(menu);
const produkteVon = (menu, o) => empfehlungsProdukte(karteVon(menu), o);
const muster = (kueche) => produkteVon(menuForCuisine(kueche));
const idVon = (produkte, name) => {
  const p = produkte.find((x) => x.name === name);
  assert.ok(p, `Produkt „${name}“ fehlt`);
  return p.id;
};
const korb = (...ids) => ids.map((id) => ({ id, menge: 1 }));
const namen = (produkte, liste) => liste.map((v) => produkte.find((p) => p.id === v.id).name);
const rolleVon = (produkte, id) => produkte.find((p) => p.id === id).rolle;

async function mitServer(fn) {
  const server = createServer(handler);
  await new Promise((fertig) => server.listen(0, "127.0.0.1", fertig));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((fertig) => server.close(fertig));
  }
}
const post = (url, daten) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(daten) }).then(async (a) => ({ status: a.status, ...(await a.json()) }));

/** Hinterlegt die Karte wie beim Bau einer Kundenfassung (kundenBau.synchronisiereBetrieb). */
function hinterlegeKarte(slug, menu) {
  const karte = karteVon(menu);
  store.setzeBestellkarte(slug, { katalog: karte.katalog, produkte: empfehlungsProdukte(karte), version: "t1", quelle: "test" });
  return karte;
}

const bestellung = (positionen) => ({ positionen, abholzeit: "18:30", abholArt: "geplant", abholZeitpunkt: "2026-09-24T18:30:00+02:00", name: "Gast", telefon: "030 1" });

/* ------------------------------------------------------------------ */
/* Rollen                                                              */
/* ------------------------------------------------------------------ */

test("Rollen kommen aus Kategorien und Gruppen, nicht aus Gerichtsnamen; Gemischtes bleibt offen", () => {
  assert.equal(rolleAusName("Antipasti"), "vorspeise");
  assert.equal(rolleAusName("Pizza aus dem Holzofen"), "hauptgericht");
  assert.equal(rolleAusName("Nachspeisen"), "dessert");
  assert.equal(rolleAusName("Heißgetränke"), "getraenk");
  assert.equal(rolleAusName("Blattsalate"), "salat");
  assert.equal(rolleAusName("Suppen & Salate"), "vorspeise", "zwei Rollen desselben Platzes");
  assert.equal(rolleAusName("Pasta & Dolci"), null, "Hauptgericht und Dessert gemischt");
  assert.equal(rolleAusName("Eisbein"), null, "„Eis“ nur als ganzes Wort");
  assert.equal(rolleAusName("Biergarten-Brotzeit"), null, "„Bier“ nur als ganzes Wort");
  assert.equal(rolleAusName("Tortellini"), null);
  // Gemischte Musterkategorie: die Rolle steht am Gericht (optionales Feld empfehlungsrolle).
  const p = muster("italienisch");
  assert.equal(rolleVon(p, idVon(p, "Tiramisù")), "dessert");
  assert.equal(rolleVon(p, idVon(p, "Tagliatelle al Ragù")), "hauptgericht");
  // Gruppen einer Kategorie tragen ihre Rolle mit.
  const b = produkteVon(italienischeBetriebskarte());
  assert.equal(rolleVon(b, idVon(b, "Chinotto")), "getraenk");
  assert.equal(rolleVon(b, idVon(b, "Saltimbocca")), "hauptgericht");
});

/* ------------------------------------------------------------------ */
/* Standardregeln                                                      */
/* ------------------------------------------------------------------ */

test("Pizza Margherita im Warenkorb → keine Pizza Salami, kein zweites Hauptgericht", () => {
  const p = muster("italienisch");
  const vorschlaege = waehle({ produkte: p, warenkorb: korb(idVon(p, "Margherita")) });
  assert.ok(vorschlaege.length > 0 && vorschlaege.length <= 2);
  assert.ok(!namen(p, vorschlaege).includes("Salame Piccante"));
  for (const v of vorschlaege) assert.notEqual(rolleVon(p, v.id), "hauptgericht");
});

test("Pizza → passende Vorspeise, Dessert oder Getränk", () => {
  const p = produkteVon(italienischeBetriebskarte());
  const nurPizza = waehle({ produkte: p, warenkorb: korb("margherita--26-cm") });
  assert.deepEqual(namen(p, nurPizza), ["Bruschetta", "Tiramisù"]);
  assert.deepEqual(nurPizza.map((v) => v.grund), ["standard", "standard"]);
  // Vorspeise liegt schon drin → Dessert und Getränk.
  const mitVorspeise = waehle({ produkte: p, warenkorb: korb("margherita--26-cm", "bruschetta") });
  assert.deepEqual(namen(p, mitVorspeise), ["Tiramisù", "Acqua Frizzante 0,75 l"]);
  assert.deepEqual(mitVorspeise.map((v) => rolleVon(p, v.id)), ["dessert", "getraenk"]);
});

test("Pasta → keine zweite Pasta (und keine Pizza) als Standardergänzung", () => {
  for (const [menu, pasta] of [[menuForCuisine("italienisch"), "Tagliatelle al Ragù"], [italienischeBetriebskarte(), "Tagliatelle al Ragù"]]) {
    const p = produkteVon(menu);
    const vorschlaege = waehle({ produkte: p, warenkorb: korb(idVon(p, pasta)) });
    assert.ok(vorschlaege.length > 0);
    for (const v of vorschlaege) assert.ok(["vorspeise", "salat", "beilage", "dessert", "getraenk"].includes(rolleVon(p, v.id)), namen(p, [v]).join());
  }
});

test("Dessert schon im Warenkorb → kein weiteres Dessert", () => {
  const p = produkteVon(italienischeBetriebskarte());
  const vorschlaege = waehle({ produkte: p, warenkorb: korb("diavola", "tiramisu") });
  assert.ok(vorschlaege.every((v) => rolleVon(p, v.id) !== "dessert"));
  assert.deepEqual(namen(p, vorschlaege), ["Bruschetta", "Acqua Frizzante 0,75 l"]);
  // Alles Passende liegt drin → keine Empfehlung.
  assert.deepEqual(waehle({ produkte: p, warenkorb: korb("diavola", "tiramisu", "bruschetta", "chinotto") }), []);
  // Nur ein Getränk im Warenkorb → nichts (kein Hauptgericht, das Getränk ist erledigt).
  assert.deepEqual(waehle({ produkte: p, warenkorb: korb("chinotto") }), []);
});

test("Ausverkauftes, Deaktiviertes, Preisloses und vom Server nicht Geführtes erscheint nie", () => {
  const menu = italienischeBetriebskarte();
  const dessert = menu.kategorien.find((k) => k.name === "Desserts");
  dessert.gerichte.push({ name: "Panna Cotta", preis: 6.5 }, { name: "Cannoli", preis: 5.5, aktiv: false }, { name: "Affogato", preis: "", beschreibung: "ohne Preis" });
  dessert.gerichte[0].ausverkauft = true; // Tiramisù
  const p = produkteVon(menu);
  assert.ok(!p.some((x) => ["Tiramisù", "Cannoli", "Tartufo", "Pizza des Monats", "Grappa"].includes(x.name)), "nur Bestellbares");
  const v = waehle({ produkte: p, warenkorb: korb("diavola") });
  assert.deepEqual(namen(p, v), ["Bruschetta", "Panna Cotta"]);
  // Ohne gültigen Preis (leeres Feld = 0 €) nie – auch nicht über eine Kombination oder Bevorzugung.
  const ohnePreis = waehle({ produkte: p, warenkorb: korb("diavola"), regeln: { kombinationen: [{ zu: "diavola", produkte: ["affogato"] }], priorisiert: ["affogato"] } });
  assert.ok(!namen(p, ohnePreis).includes("Affogato"));
  // Der Betriebsserver führt Panna Cotta nicht (oder zu anderem Preis) → nicht vorschlagen.
  const katalog = karteVon(menu).katalog;
  const ohne = { ...katalog };
  delete ohne["panna-cotta"];
  assert.ok(!namen(p, waehle({ produkte: p, warenkorb: korb("diavola"), bestellbar: ohne })).includes("Panna Cotta"));
  const teurer = { ...katalog, "panna-cotta": ["Panna Cotta", 7] };
  assert.ok(!namen(p, waehle({ produkte: p, warenkorb: korb("diavola"), bestellbar: teurer })).includes("Panna Cotta"));
});

test("höchstens zwei Empfehlungen, deterministisch", () => {
  const p = produkteVon(italienischeBetriebskarte());
  const regeln = {
    kombinationen: [{ zu: "kat:Pizza", produkte: ["bruschetta", "tiramisu", "chinotto"] }, { zu: "rolle:hauptgericht", produkte: ["vitello-tonnato", "acqua-frizzante-0-75-l"] }],
    priorisiert: ["montepulciano-0-2-l"],
  };
  const eingabe = { produkte: p, warenkorb: korb("diavola"), regeln };
  const erst = waehle(eingabe);
  assert.equal(erst.length, 2);
  for (let i = 0; i < 5; i += 1) assert.deepEqual(waehle(eingabe), erst, "gleicher Warenkorb, gleiche Vorschläge");
  // Je Platz höchstens einer: Vorspeise und Dessert, nicht zwei Vorspeisen.
  assert.deepEqual(namen(p, erst), ["Bruschetta", "Tiramisù"]);
  for (const kueche of ["italienisch", "japanisch", "indisch", "cafe", "bayerisch", "vietnamesisch"]) {
    const m = muster(kueche);
    for (const g of m) assert.ok(waehle({ produkte: m, warenkorb: korb(g.id) }).length <= 2, `${kueche}: ${g.name}`);
  }
});

test("anders strukturierte Küchen: Japanisch, Indisch (Rollen am Gericht), Café", () => {
  const jp = muster("japanisch");
  const sushi = jp.find((x) => x.kategorie === "Sushi");
  const vJp = waehle({ produkte: jp, warenkorb: korb(sushi.id) });
  assert.ok(vJp.length >= 1);
  assert.ok(vJp.every((v) => rolleVon(jp, v.id) !== "hauptgericht"), "kein zweites Sushi, kein Ramen");
  assert.equal(rolleVon(jp, vJp[0].id), "vorspeise");

  const ind = muster("indisch");
  const biryani = idVon(ind, "Chicken Biryani");
  const vInd = waehle({ produkte: ind, warenkorb: korb(biryani) });
  assert.deepEqual(vInd.map((v) => rolleVon(ind, v.id)), ["vorspeise", "getraenk"]);
  assert.deepEqual(namen(ind, vInd).slice(1), ["Mango-Lassi"]);
  // Mit Vorspeise: Naan (Beilage) zählt zum selben Platz – der ist dann erledigt.
  const vorspeise = ind.find((x) => x.rolle === "vorspeise").id;
  assert.deepEqual(namen(ind, waehle({ produkte: ind, warenkorb: korb(biryani, vorspeise) })), ["Mango-Lassi"]);

  const cafe = muster("cafe");
  const fruehstueck = cafe.find((x) => x.kategorie === "Frühstück");
  assert.deepEqual(waehle({ produkte: cafe, warenkorb: korb(fruehstueck.id) }).map((v) => rolleVon(cafe, v.id)), ["dessert", "getraenk"]);
});

test("keine Ernährungs-Vermutung: nur Reihenfolge bei durchweg vegetarisch gekennzeichneten Speisen", () => {
  const menu = italienischeBetriebskarte();
  // Vitello Tonnato vor Bruschetta: Ohne Kennzeichnung im Korb bleibt die Reihenfolge der Karte.
  menu.kategorien[0].gerichte.reverse();
  const p = produkteVon(menu);
  assert.equal(namen(p, waehle({ produkte: p, warenkorb: korb("diavola") }))[0], "Vitello Tonnato");
  // Nur vegetarisch gekennzeichnete Speisen im Korb → vegetarisch Gekennzeichnetes zuerst …
  assert.equal(namen(p, waehle({ produkte: p, warenkorb: korb("margherita--26-cm") }))[0], "Bruschetta");
  // … ausgeschlossen wird aber nichts: Gibt es nur Nicht-Gekennzeichnetes, bleibt es möglich.
  const nurFleisch = produkteVon({ ...menu, kategorien: menu.kategorien.map((k) => (k.name === "Vorspeisen" ? { ...k, gerichte: k.gerichte.filter((g) => !g.vegetarisch) } : k)) });
  assert.equal(namen(nurFleisch, waehle({ produkte: nurFleisch, warenkorb: korb("margherita--26-cm") }))[0], "Vitello Tonnato");
});

/* ------------------------------------------------------------------ */
/* Regeln des Wirts                                                    */
/* ------------------------------------------------------------------ */

test("Wirt schaltet ab → keine Empfehlung; Standardregeln aus → nur eigene Regeln", () => {
  const p = produkteVon(italienischeBetriebskarte());
  assert.deepEqual(waehle({ produkte: p, warenkorb: korb("diavola"), regeln: { aktiv: false } }), []);
  assert.deepEqual(waehle({ produkte: p, warenkorb: korb("diavola"), regeln: { standard: false } }), []);
  const nurKombi = waehle({ produkte: p, warenkorb: korb("diavola"), regeln: { standard: false, kombinationen: [{ zu: "diavola", produkte: ["chinotto"] }] } });
  assert.deepEqual(namen(p, nurKombi), ["Chinotto"]);
});

test("Wirt priorisiert ein zulässiges Produkt → Vorrang vor dem Standardvorschlag", () => {
  const p = muster("italienisch");
  const ohne = waehle({ produkte: p, warenkorb: korb(idVon(p, "Margherita")) });
  assert.ok(namen(p, ohne).includes("Panna cotta mit Feigen"), "Standard: erstes Dessert der Karte");
  const mit = waehle({ produkte: p, warenkorb: korb(idVon(p, "Margherita")), regeln: { priorisiert: [idVon(p, "Tiramisù")] } });
  assert.equal(namen(p, mit)[0], "Tiramisù");
  assert.equal(mit[0].grund, "bevorzugt");
  assert.ok(!namen(p, mit).includes("Panna cotta mit Feigen"), "ein Dessert je Warenkorb");
  // Ausgeschlossen schlägt alles.
  const aus = waehle({ produkte: p, warenkorb: korb(idVon(p, "Margherita")), regeln: { ausgeschlossen: [idVon(p, "Panna cotta mit Feigen"), idVon(p, "Tiramisù")] } });
  assert.ok(aus.every((v) => rolleVon(p, v.id) !== "dessert"));
});

test("manuell gewähltes Produkt wird ausverkauft → sicherer Fallback", () => {
  const regeln = { kombinationen: [{ zu: "kat:Pizza", produkte: ["tiramisu", "panna-cotta"] }] };
  const menu = italienischeBetriebskarte();
  menu.kategorien.find((k) => k.name === "Desserts").gerichte.push({ name: "Panna Cotta", preis: 6.5 }, { name: "Cantucci", preis: 4.5 });
  let p = produkteVon(menu);
  assert.deepEqual(namen(p, waehle({ produkte: p, warenkorb: korb("diavola"), regeln })).slice(0, 1), ["Tiramisù"]);
  menu.kategorien.find((k) => k.name === "Desserts").gerichte[0].ausverkauft = true;
  p = produkteVon(menu);
  const zweite = waehle({ produkte: p, warenkorb: korb("diavola"), regeln });
  assert.equal(namen(p, zweite)[0], "Panna Cotta", "nächstes Produkt der Kombination");
  assert.equal(zweite[0].grund, "kombination");
  menu.kategorien.find((k) => k.name === "Desserts").gerichte[1].ausverkauft = true;
  p = produkteVon(menu);
  const dritte = waehle({ produkte: p, warenkorb: korb("diavola"), regeln });
  assert.ok(namen(p, dritte).includes("Cantucci"), "dann die Standardregel");
  assert.ok(dritte.every((v) => v.grund === "standard"));
  // Auch der Betriebsserver kann ein Produkt nicht mehr führen (Karte dort aktueller).
  const katalog = karteVon(menu).katalog;
  delete katalog.cantucci;
  assert.ok(!namen(p, waehle({ produkte: p, warenkorb: korb("diavola"), regeln, bestellbar: katalog })).includes("Cantucci"));
});

test("Wirt-Einstellungen: keine fremden oder erfundenen Produkte, kein Hauptgericht zu Hauptgericht", () => {
  const p = produkteVon(italienischeBetriebskarte());
  assert.throws(() => pruefeEmpfehlungsRegeln({ priorisiert: ["gibt-es-nicht"] }, p), /steht nicht auf Ihrer Karte/);
  assert.throws(() => pruefeEmpfehlungsRegeln({ kombinationen: [{ zu: "kat:Pizza", produkte: ["diavola"] }] }, p), /Hauptgericht/);
  assert.throws(() => pruefeEmpfehlungsRegeln({ kombinationen: [{ zu: "kat:Gibt es nicht", produkte: ["tiramisu"] }] }, p), /Kategorie/);
  assert.throws(() => pruefeEmpfehlungsRegeln({ rollen: { tiramisu: "nachtisch" } }, p), /Rolle/);
  const ok = pruefeEmpfehlungsRegeln({ aktiv: true, kombinationen: [{ zu: "kat:Pizza", produkte: ["tiramisu", "tiramisu"] }], priorisiert: ["chinotto"], ausgeschlossen: ["chinotto"] }, p);
  assert.deepEqual(ok.kombinationen, [{ zu: "kat:Pizza", produkte: ["tiramisu"] }]);
  assert.deepEqual(ok.priorisiert, [], "ausgeschlossen gewinnt");
});

/* ------------------------------------------------------------------ */
/* Seite                                                               */
/* ------------------------------------------------------------------ */

const LEAD = { ...DEMO_LEADS.find((l) => l.kueche === "italienisch"), placeId: "empfehlungen-test" };
const pageData = (html) => JSON.parse(html.match(/window\.PAGE_DATA = (.*?);<\/script>/)[1]);

test("Seite: Modul im Warenkorb nach den Positionen und vor dem Absenden, zunächst ausgeblendet", () => {
  const { html, seiten } = baueSite({ lead: LEAD, kueche: "italienisch", optionen: { fiktiv: true, fontCss: "", ausdruck: "gesellig" } });
  for (const seite of [html, seiten["speisekarte/index.html"]]) {
    const lines = seite.indexOf('id="cart-lines"');
    const modul = seite.indexOf('id="passt-dazu"');
    const formular = seite.indexOf('id="order-form"');
    assert.ok(lines < modul && modul < formular, "zwischen Positionen und Bestellformular");
    assert.match(seite, /<div class="passt-dazu" id="passt-dazu" role="group" aria-labelledby="passt-dazu-titel" hidden>/);
    assert.equal((seite.match(/<li class="passt-dazu-produkt" data-passt-slot hidden>/g) || []).length, 2, "genau zwei Plätze");
    assert.match(seite, /<h4 class="passt-dazu-titel" id="passt-dazu-titel">Passt gut dazu<\/h4>/);
    assert.match(seite, /window\.Empfehlungen = /);
    // Nichts vorausgewählt, keine Menge, kein Checkbox-Häkchen.
    assert.ok(!/passt-dazu[\s\S]{0,4000}(checked|selected)/.test(seite.slice(seite.indexOf('id="passt-dazu"'), seite.indexOf('id="order-form"'))));
  }
  const pd = pageData(html).passtDazu;
  assert.equal(pd.muster, true, "Beispielseite: Musterprodukte gekennzeichnet");
  assert.equal(pd.live, false);
  assert.match(html, /<span class="marke-klein" data-passt="muster">Muster<\/span>/);
});

test("Seiten ohne Speisekarte (ohne Ausdruck) und ohne Bestellweg bleiben ohne Modul", () => {
  const ohneAusdruck = baueSite({ lead: LEAD, kueche: "italienisch", optionen: { fiktiv: true, fontCss: "" } }).html;
  assert.ok(!ohneAusdruck.includes("passt-dazu") && !ohneAusdruck.includes("window.Empfehlungen"));
  const ohneBestellung = baueSite({ lead: LEAD, kueche: "italienisch", optionen: { fiktiv: true, fontCss: "", ausdruck: "gesellig", bestellung: false } });
  assert.ok(!ohneBestellung.html.includes("passt-dazu"));
  assert.equal(ohneBestellung.bericht.speisekarte.passtDazu, "aus");
});

test("Konzept-Demo: Muster, nie live – auch wenn ein Betriebsserver bekannt ist", () => {
  const { html } = baueSite({ lead: LEAD, kueche: "italienisch", optionen: { fontCss: "", ausdruck: "gesellig", konzept: true, apiUrl: "http://127.0.0.1:9" } });
  const pd = pageData(html);
  assert.equal(pd.apiUrl, "");
  assert.equal(pd.passtDazu.live, false);
  assert.equal(pd.passtDazu.muster, true);
});

test("Kundenseite: nur bestätigte Produkte und Bilder, Kunde A sieht keine Produkte von Kunde B", () => {
  const a = italienischeBetriebskarte();
  const b = { ...menuForCuisine("japanisch"), quelle: "kunde" };
  // Kundenfassung A: nur Tiramisù und Bruschetta bestätigt, Tiramisù mit bestätigtem Bild.
  for (const k of a.kategorien) for (const g of [...(k.gerichte ?? []), ...(k.gruppen ?? []).flatMap((x) => x.gerichte)]) g.bestaetigt = ["Tiramisù", "Bruschetta", "Diavola"].includes(g.name);
  const medien = {
    gericht: (g) => (g?.name === "Tiramisù" || g?.name === "Bruschetta" ? { src: `medien/${g.schluessel}.jpg`, herkunft: "eigen" } : null),
  };
  a.kategorien.find((k) => k.name === "Desserts").gerichte[0].bildBestaetigt = true;
  const bauA = baueSite({ lead: { ...LEAD, placeId: "k-a" }, kueche: "italienisch", optionen: { fontCss: "", ausdruck: "gesellig", kundenfassung: true, apiUrl: "https://a.example", menu: a, medien: { ...medienBasis(), ...medien } } });
  const bauB = baueSite({ lead: { ...LEAD, placeId: "k-b", name: "Haus B" }, kueche: "japanisch", optionen: { fontCss: "", ausdruck: "gesellig", kundenfassung: true, apiUrl: "https://b.example", menu: b, medien: medienBasis() } });
  const pa = pageData(bauA.html).passtDazu;
  const pb = pageData(bauB.html).passtDazu;
  assert.equal(pa.muster, false, "keine Muster-Kennzeichnung auf echten Kundenseiten");
  assert.equal(pa.live, true);
  const empfehlbar = pa.produkte.filter((p) => p.empfehlbar !== false).map((p) => p.name);
  assert.deepEqual(empfehlbar.sort(), ["Bruschetta", "Diavola", "Tiramisù"]);
  assert.deepEqual(pa.produkte.filter((p) => p.bild).map((p) => p.name), ["Tiramisù"], "nur bestätigte Bilder");
  // Unbestätigtes zählt im Warenkorb mit, wird aber nie vorgeschlagen.
  const v = waehle({ produkte: pa.produkte, warenkorb: korb("saltimbocca") });
  assert.deepEqual(namen(pa.produkte, v), ["Bruschetta", "Tiramisù"]);
  assert.ok(!pb.produkte.some((p) => pa.produkte.some((q) => q.name === p.name)), "keine gemeinsamen Produkte");
  assert.ok(!bauB.html.includes("Tiramisù"));
});

function medienBasis() {
  return { hero: { src: "medien/hero.jpg", herkunft: "eigen" }, haus: { src: "medien/haus.jpg", herkunft: "eigen" }, team: null, gericht: () => null };
}

/* ------------------------------------------------------------------ */
/* Server: Einstellungen, Markierung, Preisprüfung, Trennung           */
/* ------------------------------------------------------------------ */

test("Einstellungen je Betrieb: speichern, nach Neustart erhalten, öffentlich nur Regeln und Katalog", async () => {
  hinterlegeKarte(SLUG, italienischeBetriebskarte());
  hinterlegeKarte(ANDERER, menuForCuisine("japanisch"));
  await mitServer(async (url) => {
    const stand = await (await fetch(`${url}/api/empfehlungen`)).json();
    assert.equal(stand.regeln.aktiv, true, "ohne Einstellungen: an");
    assert.equal(stand.regeln.standard, true);
    assert.ok(stand.produkte.some((p) => p.id === "tiramisu" && p.erkannteRolle === "dessert"));
    assert.ok(!stand.produkte.some((p) => p.kategorie === "Sushi"), "nur die eigene Karte");

    const gespeichert = await post(`${url}/intern/empfehlungen`, { aktiv: true, standard: true, priorisiert: ["chinotto"], ausgeschlossen: ["vitello-tonnato"], rollen: { saltimbocca: "hauptgericht" }, kombinationen: [{ zu: "kat:Pizza", produkte: ["tiramisu"] }] });
    assert.equal(gespeichert.ok, true);
    // „Neustart“: Stand kommt aus der Datei des Betriebs.
    const roh = JSON.parse(readFileSync(DATEI(SLUG), "utf-8"));
    assert.deepEqual(roh.empfehlungen.priorisiert, ["chinotto"]);
    assert.equal(JSON.parse(readFileSync(DATEI(ANDERER), "utf-8")).empfehlungen, undefined, "strikt je Betrieb");

    // Ein Produkt eines anderen Betriebs lässt sich nicht einstellen.
    const sushiId = store.ladeBetrieb(ANDERER).bestellkarte.produkte.find((p) => p.kategorie === "Sushi").id;
    const fremd = await post(`${url}/intern/empfehlungen`, { priorisiert: [sushiId] });
    assert.equal(fremd.ok, false);
    assert.match(fremd.fehler, /steht nicht auf Ihrer Karte/);

    const oeffentlich = await post(`${url}/oeffentlich/empfehlungen`, {});
    assert.equal(oeffentlich.ok, true);
    assert.deepEqual(Object.keys(oeffentlich).filter((k) => k !== "status").sort(), ["katalog", "ok", "regeln"]);
    assert.deepEqual(oeffentlich.regeln.priorisiert, ["chinotto"]);
    assert.ok(oeffentlich.katalog.tiramisu && !Object.keys(oeffentlich.katalog).some((id) => id.includes("sushi")));

    // Abschalten: die Seite bekommt nur noch „aus“.
    await post(`${url}/intern/empfehlungen`, { aktiv: false });
    assert.deepEqual((await post(`${url}/oeffentlich/empfehlungen`, {})).regeln, { aktiv: false });

    // Vorschau im Dashboard mit ungespeicherten Regeln.
    const vorschau = await post(`${url}/api/empfehlungen/vorschau`, { warenkorb: ["diavola"], regeln: { priorisiert: ["chinotto"] } });
    assert.deepEqual(vorschau.vorschlaege.map((v) => [v.name, v.grund]), [["Chinotto", "bevorzugt"], ["Bruschetta", "standard"]]);
  });
});

test("Bestellung: Markierung „empfohlen“ nur an der Position, Preis serverseitig geprüft, Statistik aggregiert", async () => {
  hinterlegeKarte(SLUG, italienischeBetriebskarte());
  await mitServer(async (url) => {
    // Falscher Preis für das empfohlene Produkt → abgelehnt, nichts gespeichert.
    const falsch = await post(`${url}/oeffentlich/bestellung`, bestellung([
      { id: "diavola", name: "Diavola", menge: 1, preis: 11.9 },
      { id: "tiramisu", name: "Tiramisù", menge: 1, preis: 1, empfohlen: true, empfohlenMenge: 1 },
    ]));
    assert.equal(falsch.ok, false);
    assert.match(falsch.fehler, /Preis für „Tiramisù“ hat sich geändert \(jetzt 7,50 €\)/);
    assert.equal(store.ladeBetrieb(SLUG).bestellungen.length, 0);

    const richtig = await post(`${url}/oeffentlich/bestellung`, bestellung([
      { id: "diavola", name: "Diavola", menge: 1, preis: 11.9 },
      { id: "tiramisu", name: "Tiramisù", menge: 2, preis: 7.5, empfohlen: true, empfohlenMenge: 1 },
      { id: "chinotto", name: "Chinotto", menge: 1, preis: 3.9 },
    ]));
    assert.equal(richtig.ok, true);
    const [b] = store.ladeBetrieb(SLUG).bestellungen;
    assert.deepEqual(b.positionen, [
      { id: "diavola", name: "Diavola", menge: 1, preis: 11.9 },
      { id: "tiramisu", name: "Tiramisù", menge: 2, preis: 7.5, empfohlen: true, empfohlenMenge: 1 },
      { id: "chinotto", name: "Chinotto", menge: 1, preis: 3.9 },
    ]);
    assert.equal(b.gesamt, 30.8);

    // Bestellung ganz ohne Empfehlung: wie bisher.
    const ohne = await post(`${url}/oeffentlich/bestellung`, bestellung([{ id: "diavola", name: "Diavola", menge: 1, preis: 11.9 }]));
    assert.equal(ohne.ok, true);
    assert.ok(!("empfohlen" in store.ladeBetrieb(SLUG).bestellungen[1].positionen[0]));

    const s = (await (await fetch(`${url}/api/empfehlungen`)).json()).statistik;
    assert.deepEqual(s.gesamt, { bestellungen: 2, mitEmpfehlung: 1, stueck: 1, wert: 7.5, produkte: [{ name: "Tiramisù", stueck: 1, wert: 7.5 }] });
    assert.equal(s.tage30.mitEmpfehlung, 1);
  });
  // Abgelehnte Bestellungen zählen nicht.
  const [b] = store.ladeBetrieb(SLUG).bestellungen;
  store.setzeBestellungStatus(SLUG, b.id, "abgelehnt");
  assert.equal(store.empfehlungsStatistik(store.ladeBetrieb(SLUG)).mitEmpfehlung, 0);
});

test("Wirt-Dashboard hat den Reiter „Empfehlungen“", () => {
  const html = readFileSync(path.join(__dirname, "..", "public", "wirt.html"), "utf-8");
  assert.match(html, /<button data-tab="empfehlungen">Empfehlungen<\/button>/);
  for (const id of ["em-aktiv", "em-standard", "em-kombinationen", "em-reihe", "em-produkte", "em-speichern", "em-test-ergebnis", "em-wirkung"]) assert.match(html, new RegExp(`id="${id}"`));
});

test("kurze Beschreibung: an der Wortgrenze gekürzt", () => {
  assert.equal(kurz("Kurz."), "Kurz.");
  const lang = kurz("Ein sehr langer Name und eine lange Beschreibung: Knoblauch, Olivenöl, Peperoncino, Petersilie, dazu geröstete Brotbrösel");
  assert.ok(lang.length <= 92 && lang.endsWith(" …"), lang);
});
