import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildLandingPage,
  slugify,
  themeForLead,
  imageSpecsForLead,
  ortsbezug,
  strasseAusAdresse,
  escapeHtml,
} from "../src/landingPageGenerator.js";
import { menuForCuisine, highlightCandidates, MENUS } from "../src/menuCatalog.js";

const lead = {
  name: "Gasthof Zur Post",
  adresse: "Stadtpl. 1, 84453 Mühldorf am Inn, Germany",
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
  konzept: "Testkonzept",
  geschichte: "Wir kochen seit 1950.",
  usps: ["Abholung in 20 Minuten", "Frisch gekocht"],
  kategorien: [
    {
      name: "Hauptgerichte",
      gerichte: [
        { name: "Testgericht", beschreibung: "Lecker", preis: 16.9, bild: "photo-1599921841143-819065a55cc6" },
      ],
    },
  ],
};

function datenAttribute(html, attribut) {
  return [...html.matchAll(new RegExp(`${attribut}="([^"]*)"`, "g"))].map((m) => m[1]);
}

test("slugify macht Umlaute und Sonderzeichen URL-tauglich", () => {
  assert.equal(slugify("Gasthof Zur Post"), "gasthof-zur-post");
  assert.equal(slugify("Café Müller & Söhne"), "cafe-mueller-soehne");
  assert.equal(slugify("Weißbräu"), "weissbraeu");
  assert.equal(slugify("!!!"), "restaurant");
});

test("strasseAusAdresse schreibt die üblichen Abkürzungen aus", () => {
  assert.equal(strasseAusAdresse("Stadtpl. 15, 84453 Mühldorf am Inn, Germany"), "Stadtplatz");
  assert.equal(strasseAusAdresse("Münchener Str. 114, 84453 Mühldorf, Germany"), "Münchener Straße");
  assert.equal(strasseAusAdresse("Bahnhofstr. 4, 84453 Mühldorf, Germany"), "Bahnhofstraße");
  assert.equal(strasseAusAdresse("Ludwigstraße 38, 84524 Neuötting, Germany"), "Ludwigstraße");
  assert.equal(strasseAusAdresse(""), "");
});

test("ortsbezug wählt die passende Präposition", () => {
  assert.equal(ortsbezug("Stadtpl. 1, 84453 Mühldorf, Germany", "Mühldorf"), "direkt am Stadtplatz in Mühldorf");
  assert.equal(ortsbezug("Ludwigstraße 38, 84524 Neuötting, Germany", "Altötting"), "in der Ludwigstraße in Altötting");
  assert.equal(ortsbezug("", "Tüßling"), "mitten in Tüßling");
  assert.equal(ortsbezug("", ""), "");
});

test("buildLandingPage übernimmt die Stammdaten des Leads", () => {
  const html = buildLandingPage(lead);

  assert.ok(html.includes("Gasthof Zur Post"));
  assert.ok(html.includes("Stadtpl. 1, 84453 Mühldorf am Inn, Germany"));
  assert.ok(html.includes('href="tel:0863112345"'));
});

test("buildLandingPage nennt Konzept und Ort schon im Titel", () => {
  const html = buildLandingPage(lead, { menu: testMenu });

  assert.match(html, /<title>Gasthof Zur Post – Testkonzept in Mühldorf am Inn<\/title>/);
});

test("buildLandingPage zeigt den Social Proof direkt unter der Überschrift", () => {
  const html = buildLandingPage(lead);
  const h1Ende = html.indexOf("</h1>");
  const ratingStart = html.indexOf('class="rating"');
  const subStart = html.indexOf('class="hero-sub"');

  assert.ok(ratingStart > h1Ende, "Bewertung steht nicht nach der Überschrift");
  assert.ok(ratingStart < subStart, "Bewertung steht nicht vor dem Fließtext");
  assert.ok(html.includes("4,6/5</strong> auf Google (1.234 Bewertungen)"));
});

test("buildLandingPage baut eine hyper-lokale Schlagzeile aus der Adresse", () => {
  const html = buildLandingPage(lead, { menu: MENUS.italienisch });

  assert.ok(html.includes("direkt am Stadtplatz in Mühldorf am Inn"));
});

test("buildLandingPage hat eine feste Aktionsleiste fürs Handy", () => {
  const html = buildLandingPage(lead);

  assert.ok(html.includes('id="mobilebar"'));
  assert.ok(html.includes('id="bar-order"'));
  assert.match(html, /id="bar-order"[^>]*>Bestellen</);
  assert.match(html, /href="#reservierung"[^>]*>Reservieren</);
});

test("buildLandingPage zeigt die USP-Badges der Küche", () => {
  const html = buildLandingPage(lead, { menu: testMenu });

  assert.ok(html.includes("Abholung in 20 Minuten"));
  assert.ok(html.includes("Frisch gekocht"));
});

test("buildLandingPage enthält die vollständige Karte als Akkordeon", () => {
  const menu = MENUS.italienisch;
  const html = buildLandingPage({ ...lead, name: "Ristorante Test" }, { menu });

  for (const kategorie of menu.kategorien) {
    assert.ok(html.includes(`>${escapeHtml(kategorie.name)} `), `Kategorie ${kategorie.name} fehlt`);
    for (const gericht of kategorie.gerichte) {
      assert.ok(html.includes(escapeHtml(gericht.name)), `Gericht ${gericht.name} fehlt`);
    }
  }

  assert.ok(html.includes("<details class=\"kat\" open>"), "erste Kategorie ist nicht aufgeklappt");
});

test("Highlights und Karte teilen sich die Kennung je Gericht", () => {
  // Sonst landet dasselbe Gericht zweimal getrennt im Warenkorb.
  const menu = MENUS.italienisch;
  const html = buildLandingPage(lead, { menu });

  const ids = datenAttribute(html, "data-add");
  const anzahlGerichte = menu.kategorien.reduce((n, k) => n + k.gerichte.length, 0);

  assert.equal(new Set(ids).size, anzahlGerichte);
  assert.ok(ids.length > anzahlGerichte, "Highlights tauchen nicht zusätzlich auf");
  assert.ok(ids.every((id) => /^\d+-\d+$/.test(id)));
});

test("buildLandingPage zeigt die Highlights als bebilderten Auszug", () => {
  const menu = MENUS.italienisch;
  const html = buildLandingPage(lead, { menu });
  const bebildert = (html.match(/class="hl-card"/g) ?? []).length;

  assert.ok(bebildert >= 3 && bebildert <= 6, `${bebildert} Highlight-Kacheln`);
  assert.ok(bebildert < highlightCandidates(menu).length + 1);
});

test("buildLandingPage bietet drei beschriftete Bildplätze für eigene Fotos", () => {
  const html = buildLandingPage(lead);

  assert.equal((html.match(/class="foto-slot"/g) ?? []).length, 3);
  assert.ok(html.includes("Unser Haus"));
  assert.ok(html.includes("Ihr Team"));
  assert.ok(html.includes("Unser Bestseller"));
  assert.equal((html.match(/class="foto-badge">Platzhalter</g) ?? []).length, 3);
});

test("buildLandingPage bindet Bilder aus dem Asset-Ordner ein", () => {
  const html = buildLandingPage(lead, { menu: testMenu, assetsPath: "../assets" });

  assert.ok(html.includes("../assets/photo-1599921841143-819065a55cc6-gericht.jpg"));
  assert.match(html, /\.\.\/assets\/photo-[\w-]+-hero\.jpg/);
  assert.match(html, /\.\.\/assets\/photo-[\w-]+-ambiente\.jpg/);
});

test("buildLandingPage nutzt eine übergebene Bildquelle statt lokaler Dateien", () => {
  const html = buildLandingPage(lead, {
    menu: testMenu,
    bildUrl: (id, role) => `https://cdn.beispiel.de/${id}/${role}`,
  });

  assert.ok(html.includes("https://cdn.beispiel.de/photo-1599921841143-819065a55cc6/gericht"));
  assert.ok(!html.includes("../assets/photo-"));
});

test("die veröffentlichte Fassung weist sich als Entwurf aus", () => {
  const html = buildLandingPage(lead, { veroeffentlicht: true });

  assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'));
  assert.ok(html.includes('<body class="veroeffentlicht">'));
  assert.ok(html.includes('class="entwurf-hinweis"'));
  assert.ok(html.includes("nicht</strong> die offizielle Website von Gasthof Zur Post"));
});

test("die lokale Fassung trägt keinen Entwurfs-Hinweis und kein noindex", () => {
  const html = buildLandingPage(lead);

  assert.ok(!html.includes("noindex"));
  assert.ok(!html.includes('class="entwurf-hinweis"'));
  assert.ok(html.includes("<body>"));
});

test("buildLandingPage bindet übergebene Schriften ein", () => {
  const fontCss = "@font-face{font-family:'Inter';src:url('../assets/fonts/inter-400-latin.woff2') format('woff2');}";
  const html = buildLandingPage(lead, { fontCss });

  assert.ok(html.includes(fontCss));
});

test("buildLandingPage zeigt Preise im deutschen Format", () => {
  const html = buildLandingPage(lead, { menu: testMenu });

  assert.ok(html.includes("16,90 €"));
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
  assert.ok(!html.includes("auf Google"));
  assert.ok(!html.includes('href="tel:"'));
});

test("buildLandingPage blendet den E-Mail-Versand nur mit Kontaktadresse ein", () => {
  const ohne = buildLandingPage(lead);
  const mit = buildLandingPage(lead, { kontaktEmail: "info@beispiel.de" });

  assert.ok(!ohne.includes("info@beispiel.de"));
  assert.ok(mit.includes("info@beispiel.de"));
});

test("themeForLead wählt das Theme passend zur Küche", () => {
  assert.equal(themeForLead({ name: "Pizzeria Tropea" }).themeName, "trattoria");
  assert.equal(themeForLead({ name: "Gasthof Huber" }).themeName, "wirtshaus");
  assert.equal(themeForLead({ name: "Sushi Bar" }).themeName, "neoasian");
  assert.equal(themeForLead({ name: "Döner Palast" }).themeName, "neoasian");
});

test("das Neo-Asian-Theme ist dunkel, die anderen hell", () => {
  assert.equal(themeForLead({ name: "Sushi Bar" }).theme.dark, true);
  assert.equal(themeForLead({ name: "Pizzeria Roma" }).theme.dark, false);
  assert.equal(themeForLead({ name: "Gasthof Huber" }).theme.dark, false);
});

test("themeForLead liefert für denselben Lead immer dasselbe Design", () => {
  assert.deepEqual(themeForLead(lead), themeForLead({ ...lead }));
});

test("themeForLead wählt nie ein leeres Bild oder Farbwert", () => {
  // Sicherung gegen vorzeichenbehaftete Shifts: bei großen Hash-Werten
  // ergaben sich sonst negative Indizes und damit undefined.
  for (let i = 0; i < 400; i += 1) {
    const g = themeForLead({ name: `Testlokal ${i}`, placeId: `place-${i * 7919}` });

    assert.ok(g.heroImage, `heroImage fehlt bei ${i}`);
    assert.ok(g.theme.accent, `accent fehlt bei ${i}`);
    assert.ok(g.theme.onAccent, `onAccent fehlt bei ${i}`);
    assert.ok(g.theme.display, `display fehlt bei ${i}`);
    assert.ok(g.hausBild, `hausBild fehlt bei ${i}`);
    assert.ok(g.teamBild, `teamBild fehlt bei ${i}`);
  }
});

test("themeForLead erzeugt innerhalb einer Küche verschiedene Varianten", () => {
  const varianten = new Set();
  for (let i = 0; i < 120; i += 1) {
    const g = themeForLead({ name: `Pizzeria ${i}`, placeId: `id-${i * 104729}` });
    varianten.add(`${g.theme.varianteName}|${g.heroImage}`);
  }

  assert.ok(varianten.size >= 8, `nur ${varianten.size} Varianten`);
});

test("themeForLead akzeptiert eine vorgegebene Küche", () => {
  const g = themeForLead({ name: "Klabwong", placeId: "abc" }, "asiatisch");

  assert.equal(g.cuisine, "asiatisch");
  assert.equal(g.themeName, "neoasian");
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
