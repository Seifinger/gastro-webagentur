import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildLandingPage,
  slugify,
  themeForLead,
  imageSpecsForLead,
} from "../src/landingPageGenerator.js";
import { menuForCuisine, highlightCandidates, MENUS } from "../src/menuCatalog.js";

const lead = {
  name: "Gasthof Zur Post",
  adresse: "Stadtplatz 1, 84453 Mühldorf am Inn",
  telefon: "08631 12345",
  ort: "Mühldorf am Inn",
  placeId: "ChIJtestplaceid",
  rating: 4.6,
  anzahlBewertungen: 1234,
  score: 100,
};

const testMenu = {
  label: "Testküche",
  tagline: "Test",
  geschichte: "Wir kochen seit 1950.",
  kategorien: [
    {
      name: "Hauptgerichte",
      gerichte: [
        { name: "Testgericht", beschreibung: "Lecker", preis: 16.9, bild: "photo-1599921841143-819065a55cc6" },
      ],
    },
  ],
};

test("slugify macht Umlaute und Sonderzeichen URL-tauglich", () => {
  assert.equal(slugify("Gasthof Zur Post"), "gasthof-zur-post");
  assert.equal(slugify("Café Müller & Söhne"), "cafe-mueller-soehne");
  assert.equal(slugify("Weißbräu"), "weissbraeu");
  assert.equal(slugify("!!!"), "restaurant");
});

test("buildLandingPage übernimmt die Stammdaten des Leads", () => {
  const html = buildLandingPage(lead);

  assert.match(html, /<title>Gasthof Zur Post – Mühldorf am Inn<\/title>/);
  assert.ok(html.includes("Stadtplatz 1, 84453 Mühldorf am Inn"));
  assert.ok(html.includes('href="tel:0863112345"'));
  assert.ok(html.includes("1.234 Google-Bewertungen"));
});

test("buildLandingPage enthält Reservierung und Abholbestellung", () => {
  const html = buildLandingPage(lead);

  assert.ok(html.includes('id="reservation-form"'));
  assert.ok(html.includes('name="datum"'));
  assert.ok(html.includes('name="personen"'));

  assert.ok(html.includes('id="order-form"'));
  assert.ok(html.includes('name="abholzeit"'));
  assert.ok(html.includes('id="cart-fab"'));
});

test("buildLandingPage zeigt nur einen Auszug der Karte, nicht das ganze Menü", () => {
  const menu = MENUS.italienisch;
  const html = buildLandingPage({ ...lead, name: "Ristorante Test" }, { menu });

  const gezeigt = menu.kategorien
    .flatMap((k) => k.gerichte)
    .filter((g) => html.includes(`data-name="${g.name}"`));

  assert.ok(gezeigt.length <= 6, `es werden ${gezeigt.length} Gerichte gezeigt`);
  assert.ok(gezeigt.length < highlightCandidates(menu).length + 1);
  assert.ok(html.includes("Das ist nur ein Auszug"));
});

test("buildLandingPage bindet Bilder aus dem Asset-Ordner ein", () => {
  const html = buildLandingPage(lead, { menu: testMenu, assetsPath: "../assets" });

  assert.ok(html.includes("../assets/photo-1599921841143-819065a55cc6-gericht.jpg"));
  assert.match(html, /\.\.\/assets\/photo-[\w-]+-hero\.jpg/);
  assert.match(html, /\.\.\/assets\/photo-[\w-]+-ambiente\.jpg/);
});

test("buildLandingPage zeigt Preise im deutschen Format", () => {
  const html = buildLandingPage(lead, { menu: testMenu });

  assert.ok(html.includes("16,90 €"));
});

test("buildLandingPage kommt mit einer Karte ganz ohne Bilder zurecht", () => {
  const ohneBilder = {
    ...testMenu,
    kategorien: [{ name: "Test", gerichte: [{ name: "Ohne Bild", beschreibung: "x", preis: 5 }] }],
  };

  const html = buildLandingPage(lead, { menu: ohneBilder });

  assert.ok(html.includes("Gasthof Zur Post"));
  assert.ok(!html.includes("data-add="));
});

test("buildLandingPage maskiert HTML aus den Lead-Daten", () => {
  const html = buildLandingPage({
    ...lead,
    name: '<script>alert("xss")</script>',
    adresse: '"><img src=x onerror=alert(1)>',
  });

  assert.ok(!html.includes("<script>alert"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("buildLandingPage bricht das Skript-Tag nicht mit Lead-Daten auf", () => {
  const html = buildLandingPage({ ...lead, name: "Wirt </script><script>alert(1)</script>" });

  assert.ok(html.includes("window.PAGE_DATA"));
  assert.ok(!html.includes("</script><script>alert(1)"));
});

test("buildLandingPage kommt ohne optionale Felder aus", () => {
  const html = buildLandingPage({ name: "Neues Lokal" });

  assert.ok(html.includes("Neues Lokal"));
  assert.ok(!html.includes("Google-Bewertungen"));
  assert.ok(!html.includes('href="tel:"'));
});

test("buildLandingPage blendet den E-Mail-Versand nur mit Kontaktadresse ein", () => {
  const ohne = buildLandingPage(lead);
  const mit = buildLandingPage(lead, { kontaktEmail: "info@beispiel.de" });

  assert.ok(!ohne.includes("info@beispiel.de"));
  assert.ok(mit.includes("info@beispiel.de"));
});

test("themeForLead liefert für denselben Lead immer dasselbe Design", () => {
  const a = themeForLead(lead);
  const b = themeForLead({ ...lead });

  assert.deepEqual(a, b);
});

test("themeForLead wählt nie ein leeres Bild oder Layout", () => {
  // Sicherung gegen vorzeichenbehaftete Shifts: bei großen Hash-Werten
  // ergaben sich sonst negative Indizes und damit undefined.
  for (let i = 0; i < 400; i += 1) {
    const theme = themeForLead({ name: `Testlokal ${i}`, placeId: `place-${i * 7919}` });

    assert.ok(theme.heroImage, `heroImage fehlt bei ${i}`);
    assert.ok(theme.palette, `palette fehlt bei ${i}`);
    assert.ok(theme.fontStack, `fontStack fehlt bei ${i}`);
    assert.ok(theme.heroLayout, `heroLayout fehlt bei ${i}`);
    assert.equal(theme.ambienteImages.length, 3);
    assert.ok(theme.ambienteImages.every(Boolean), `ambienteImages unvollständig bei ${i}`);
  }
});

test("themeForLead erzeugt über viele Leads spürbar verschiedene Designs", () => {
  const kombinationen = new Set();
  for (let i = 0; i < 200; i += 1) {
    const theme = themeForLead({ name: `Lokal ${i}`, placeId: `id-${i * 104729}` });
    kombinationen.add(`${theme.paletteName}|${theme.heroLayout}|${theme.heroImage}`);
  }

  assert.ok(kombinationen.size >= 8, `nur ${kombinationen.size} verschiedene Designs`);
});

test("themeForLead akzeptiert eine vorgegebene Küche", () => {
  const theme = themeForLead({ name: "Klabwong", placeId: "abc" }, "asiatisch");

  assert.equal(theme.cuisine, "asiatisch");
});

test("imageSpecsForLead listet jedes Bild genau einmal", () => {
  const specs = imageSpecsForLead(lead);
  const keys = specs.map(({ id, role }) => `${id}-${role}`);

  assert.ok(specs.length > 0);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(specs.every(({ id, role }) => id && role));
});

test("imageSpecsForLead deckt die Bilder der vorgegebenen Küche ab", () => {
  const specs = imageSpecsForLead(lead, "italienisch");
  const ids = new Set(specs.map((s) => s.id));

  for (const gericht of highlightCandidates(menuForCuisine("italienisch"))) {
    assert.ok(ids.has(gericht.bild), `Bild für ${gericht.name} fehlt`);
  }
});
