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
import { menuForCuisine, highlightCandidates, gerichtId, MENUS } from "../src/menuCatalog.js";
import { loadLeadEdits } from "../src/leadEdits.js";
import { assetFileName } from "../src/imageLibrary.js";
import { STIMMEN } from "../src/testimonials.js";
import { SIGNATUR_CSS } from "../src/heroSignature.js";

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

test("Entwürfe echter Lokale bekommen niemals erfundene Bewertungen", () => {
  // Google untersagt das Speichern von Rezensionstexten, und ein erfundenes
  // Zitat unter dem echten Namen eines Hauses wäre als Bewertung lesbar.
  const html = buildLandingPage(lead);

  for (const kueche of Object.keys(STIMMEN)) {
    for (const stimme of STIMMEN[kueche]) {
      assert.ok(!html.includes(stimme.text), `Zitat aus "${kueche}" steht im Entwurf`);
      assert.ok(!html.includes(stimme.autor), `Name "${stimme.autor}" steht im Entwurf`);
    }
  }

  assert.ok(html.includes('class="stimme ist-platzhalter"'), "keine Platzhalter-Plätze");
  assert.ok(html.includes("Ihre erste Bewertung"));
});

test("erfundene Beispiel-Lokale bekommen erfundene Stimmen", () => {
  const html = buildLandingPage(lead, { fiktiv: true, veroeffentlicht: true });
  const erwartet = STIMMEN.bayerisch;

  assert.ok(html.includes(escapeHtml(erwartet[0].text)));
  assert.ok(html.includes(erwartet[0].autor));
  assert.ok(!html.includes('class="stimme ist-platzhalter"'));
});

test("die echte Google-Note steht auch in den Gästestimmen", () => {
  const html = buildLandingPage(lead);

  assert.ok(html.includes('id="stimmen"'));
  assert.ok(html.includes("von 5 auf Google, aus 1.234 Bewertungen"));
});

test("die Gästestimmen stehen vor der Reservierung", () => {
  const html = buildLandingPage(lead);

  assert.ok(html.indexOf('id="stimmen"') < html.indexOf('id="reservierung"'));
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

// --- Design-Preset-Modell (designPresets.js) --------------------------------
// Ohne eigenes Preset darf sich am bisherigen Verhalten nichts ändern; die
// folgenden Tests sichern das ab und prüfen zusätzlich, dass sich einzelne
// Preset-Felder gezielt und ohne Seiteneffekte umschalten lassen.

test("buildLandingPage ohne Preset-Angabe entspricht exakt dem bisherigen Verhalten", () => {
  const html = buildLandingPage(lead, { menu: MENUS.italienisch });

  assert.ok(html.includes('<header class="topbar" id="topbar">'));
  assert.match(
    html,
    /<div class="hero-actions"><a class="btn btn-light" href="#karte">Zur Abholung bestellen<\/a><a class="btn btn-outline-light" href="#reservierung">Tisch reservieren<\/a><\/div>/,
  );
  assert.match(
    html,
    /<div class="mobilebar" id="mobilebar"><button class="btn btn-primary" id="bar-order" type="button">Bestellen<\/button><a class="btn btn-ghost" href="#reservierung">Reservieren<\/a><\/div>/,
  );
  assert.ok(!html.includes('class="topbar topbar-static"'));
  assert.ok(!html.includes('class="stimmen-grid stimmen-grid--'));
});

test("ein leeres options.preset ändert nichts gegenüber gar keinem Preset", () => {
  const ohnePreset = buildLandingPage(lead, { menu: MENUS.italienisch });
  const leeresPreset = buildLandingPage(lead, { menu: MENUS.italienisch, preset: {} });

  assert.equal(ohnePreset, leeresPreset);
});

test("hero.type 'dish_photo' zeigt ein einzelnes Gerichtsfoto statt der Küchen-Signatur", () => {
  const html = buildLandingPage(lead, {
    menu: MENUS.italienisch,
    preset: { hero: { type: "dish_photo" } },
  });

  assert.ok(html.includes('class="sig sig-dish"'));
  assert.ok(!html.includes('class="sig sig-pizza"'));
});

test("hero.type 'ambience_photo' zeigt das Haus-Bild im Hero", () => {
  const html = buildLandingPage(lead, {
    menu: MENUS.italienisch,
    preset: { hero: { type: "ambience_photo" } },
  });

  assert.ok(html.includes('class="sig sig-ambience"'));
});

test("hero.type 'reservation_hero' zeigt den Reservierungs-Teaser", () => {
  const html = buildLandingPage(lead, {
    menu: MENUS.italienisch,
    preset: { hero: { type: "reservation_hero" } },
  });

  assert.ok(html.includes('class="sig sig-reservation"'));
  assert.ok(html.includes("Tisch sichern"));
});

test("ein unbekannter hero.type fällt auf die Küchen-Signatur zurück", () => {
  const html = buildLandingPage(
    { ...lead, name: "Ristorante Test" },
    { menu: MENUS.italienisch, preset: { hero: { type: "irgendwas-erfundenes" } } },
  );

  assert.ok(html.includes('class="sig sig-pizza"'));
});

// --- Küchenspezifische Hero-Signaturen (heroSignature.js) -------------------

test("Thailändisch bekommt die aufblühende Orchidee als eigene Signatur", () => {
  const html = buildLandingPage(lead, {
    menu: MENUS.thailaendisch,
    gestaltung: themeForLead(lead, "thailaendisch"),
  });

  assert.ok(html.includes('class="sig sig-orchid"'));
  assert.ok(!html.includes('class="sig sig-diashow"'));
});

test("Indisch bekommt das aufplatzende Gewürzwölkchen als eigene Signatur", () => {
  const html = buildLandingPage(lead, {
    menu: MENUS.indisch,
    gestaltung: themeForLead(lead, "indisch"),
  });

  assert.ok(html.includes('class="sig sig-spice"'));
  assert.ok(!html.includes('class="sig sig-tafel"'));
});

test("Asiatisch (gemischt) bekommt pulsierende Laternen statt des Sushi-Bands", () => {
  const html = buildLandingPage(lead, {
    menu: MENUS.asiatisch,
    gestaltung: themeForLead(lead, "asiatisch"),
  });

  assert.ok(html.includes('class="sig sig-lanterns"'));
  assert.ok(!html.includes('class="sig sig-band"'));
});

test("Japanisch behält das Sushi-Band als Signatur", () => {
  const html = buildLandingPage(lead, {
    menu: MENUS.japanisch,
    gestaltung: themeForLead(lead, "japanisch"),
  });

  assert.ok(html.includes('class="sig sig-band"'));
});

test("Bayerisch bekommt den überlaufenden Bierkrug zusätzlich zur Tagestafel", () => {
  const html = buildLandingPage(lead, {
    menu: MENUS.bayerisch,
    gestaltung: themeForLead(lead, "bayerisch"),
  });

  assert.ok(html.includes('class="sig sig-tafel"'), "Tagestafel muss weiter existieren");
  assert.ok(html.includes('class="sig sig-beer"'), "Bierkrug-Detail fehlt");
});

test("?bewegung=aus schaltet dieselben Signatur-Animationen ab wie prefers-reduced-motion", () => {
  // Kein echter Browser im Testlauf, deshalb Prüfung auf Quelltextebene:
  // derselbe Regelblock muss unter der Media Query UND unter der Klasse
  // .bewegung-aus stehen (per CSS-Nesting, nicht als zweite Abschrift).
  // Manuell mit dem mitgelieferten Chromium verifiziert: mit ?bewegung=aus
  // wechselt z.B. getComputedStyle(...).animationName für ".sig-tafel .karte"
  // und ".sig-beer .schaum" von ihrem jeweiligen Animationsnamen auf "none".
  const mediaIndex = SIGNATUR_CSS.indexOf("@media (prefers-reduced-motion: reduce)");
  const klasseIndex = SIGNATUR_CSS.indexOf(".bewegung-aus {");
  assert.ok(mediaIndex > -1 && klasseIndex > mediaIndex, ".bewegung-aus-Block fehlt oder steht vor der Media Query");

  const geteilteRegeln = [
    ".sig-tafel .karte, .sig-diashow img, .sig-tasse .dampf i,",
    ".sig-lanterns .laterne { animation: none; }",
    ".sig-beer .schaum, .sig-beer .tropfen { animation: none; }",
  ];
  const mediaBlock = SIGNATUR_CSS.slice(mediaIndex, klasseIndex);
  const klasseBlock = SIGNATUR_CSS.slice(klasseIndex);
  for (const regel of geteilteRegeln) {
    assert.ok(mediaBlock.includes(regel), `Media-Block ohne: ${regel}`);
    assert.ok(klasseBlock.includes(regel), `.bewegung-aus-Block ohne: ${regel}`);
  }
});

test("hero.primaryAction 'reservation' betont Reservieren, ohne Texte oder Ziele zu ändern", () => {
  const html = buildLandingPage(lead, {
    menu: MENUS.italienisch,
    preset: { hero: { primaryAction: "reservation" } },
  });

  assert.match(html, /id="bar-order"[^>]*>Bestellen</, "Bestellen-Knopf muss weiter existieren");
  assert.match(html, /href="#reservierung"[^>]*>Reservieren</);
  // Reservieren steht jetzt zuerst und ist der betonte (primary) Knopf.
  const reservierenIndex = html.indexOf('id="mobilebar"');
  const mobilebarAusschnitt = html.slice(reservierenIndex, reservierenIndex + 400);
  assert.match(mobilebarAusschnitt, /btn-primary"[^>]*href="#reservierung"/);
  assert.match(mobilebarAusschnitt, /id="bar-order"[^>]*class="btn btn-ghost"|class="btn btn-ghost"[^>]*id="bar-order"/);
});

test("header.sticky false schaltet die feste Kopfzeile ab", () => {
  const html = buildLandingPage(lead, {
    menu: MENUS.italienisch,
    preset: { header: { sticky: false } },
  });

  assert.ok(html.includes('<header class="topbar topbar-static" id="topbar">'));
});

test("mobile.stickyActionBar false entfernt die mobile Aktionsleiste", () => {
  const html = buildLandingPage(lead, {
    menu: MENUS.italienisch,
    preset: { mobile: { stickyActionBar: false } },
  });

  assert.ok(!html.includes('id="mobilebar"'));
  // Der Bestell-Knopf im Skript wird trotzdem sicher (null-geprüft) angesprochen.
  assert.ok(html.includes('var barOrder = byId("bar-order")'));
});

test("layout.sectionOrder bestimmt die Reihenfolge der Hauptsektionen", () => {
  const html = buildLandingPage(lead, {
    menu: MENUS.italienisch,
    preset: { layout: { sectionOrder: ["reservierung", "kontakt", "karte", "highlights", "ambiente", "stimmen"] } },
  });

  const reihenfolge = ["reservierung", "kontakt", "karte", "highlights", "ambiente", "stimmen"].map((id) =>
    html.indexOf(`id="${id}"`),
  );

  for (let i = 1; i < reihenfolge.length; i += 1) {
    assert.ok(reihenfolge[i - 1] < reihenfolge[i], `Reihenfolge an Position ${i} stimmt nicht`);
  }
});

test("eine unvollständige sectionOrder verliert keine Sektion", () => {
  const html = buildLandingPage(lead, {
    menu: MENUS.italienisch,
    preset: { layout: { sectionOrder: ["kontakt"] } },
  });

  for (const id of ["highlights", "karte", "ambiente", "stimmen", "reservierung", "kontakt"]) {
    assert.ok(html.includes(`id="${id}"`), `Sektion "${id}" fehlt`);
  }
  // Die explizit genannte Sektion steht vorne, der Rest folgt in bisheriger Reihenfolge.
  assert.ok(html.indexOf('id="kontakt"') < html.indexOf('id="highlights"'));
});

test("menu.showBadges false blendet das 'vegetarisch'-Abzeichen aus", () => {
  const mitBadges = buildLandingPage(lead, { menu: MENUS.italienisch });
  const ohneBadges = buildLandingPage(lead, {
    menu: MENUS.italienisch,
    preset: { menu: { showBadges: false } },
  });

  assert.ok(mitBadges.includes('class="veg"'));
  assert.ok(!ohneBadges.includes('class="veg"'));
});

test("menu.layout landet als data-Attribut auf der Speisekarten-Sektion", () => {
  const html = buildLandingPage(lead, {
    menu: MENUS.italienisch,
    preset: { menu: { layout: "grid" } },
  });

  assert.ok(html.includes('data-menu-layout="grid"'));
  // Nicht implementierte Layouts fallen weiterhin auf das Akkordeon zurück.
  assert.ok(html.includes('<details class="kat" open>'));
});

test("reservation.widgetVariant landet als data-Attribut auf der Reservierungs-Sektion", () => {
  const html = buildLandingPage(lead, {
    menu: MENUS.italienisch,
    preset: { reservation: { widgetVariant: "modal" } },
  });

  assert.ok(html.includes('data-reservation-variant="modal"'));
  assert.ok(html.includes('id="reservation-form"'));
});

test("social.layout 'list' fügt die stimmen-grid--list-Klasse hinzu", () => {
  const html = buildLandingPage(lead, {
    menu: MENUS.italienisch,
    preset: { social: { layout: "list" } },
  });

  assert.ok(html.includes('class="stimmen-grid stimmen-grid--list"'));
});

test("getPresetVariant über die Küche liefert dieselbe alternative Variante wie ein eigenes Preset", () => {
  const html = buildLandingPage(
    { ...lead, name: "Ristorante Test" },
    { menu: MENUS.italienisch, designVariant: "photo-hero" },
  );

  assert.ok(html.includes('class="sig sig-dish"'));
});

test("das 'minimal'-Preset von bayerisch wirkt vollständig (mehrere Felder gleichzeitig)", () => {
  const html = buildLandingPage({ name: "Gasthof Huber" }, { designVariant: "minimal" });

  assert.ok(html.includes('<header class="topbar topbar-static" id="topbar">'));
  assert.ok(!html.includes('id="mobilebar"'));
  assert.ok(!html.includes('class="veg"'));
  assert.ok(html.indexOf('id="karte"') < html.indexOf('id="highlights"'));
});

// --- Übersteuerungen je Lead (leadEdits.js) ---------------------------------

const editMenu = {
  label: "Testküche",
  tagline: "Test",
  konzept: "Testkonzept",
  geschichte: "Wir kochen seit 1950.",
  usps: ["Frisch gekocht"],
  kategorien: [
    {
      name: "Hauptgerichte",
      gerichte: [
        { name: "Erstes Gericht", beschreibung: "Ursprünglich eins", preis: 16.9, bild: "photo-1599921841143-819065a55cc6" },
        { name: "Zweites Gericht", beschreibung: "Ursprünglich zwei", preis: 12.5, bild: "photo-1558030006-450675393462" },
      ],
    },
  ],
};

test("ohne lead-edits-Datei entsteht exakt der bisherige Entwurf", () => {
  const bisher = buildLandingPage(lead, { menu: MENUS.italienisch });

  // Der Normalfall: für diesen Slug liegt keine Datei, loadLeadEdits gibt {}.
  assert.equal(
    buildLandingPage(lead, {
      menu: MENUS.italienisch,
      editUebersteuerung: loadLeadEdits("gibt-es-garantiert-nicht-0000000"),
    }),
    bisher,
  );
  assert.equal(
    buildLandingPage(lead, { menu: MENUS.italienisch, editUebersteuerung: undefined }),
    bisher,
  );
  assert.equal(
    buildLandingPage(lead, {
      menu: MENUS.italienisch,
      editUebersteuerung: { bilder: {}, texte: { highlightBeschreibungen: {} } },
    }),
    bisher,
  );
});

test("bilder.hero wird unverändert als Hero-Bild eingesetzt", () => {
  const stockHero = themeForLead(lead).heroImage;
  const html = buildLandingPage(lead, {
    menu: MENUS.italienisch,
    editUebersteuerung: { bilder: { hero: "../eigene/wirtshaus-abends.jpg" } },
  });

  assert.match(
    html,
    /<div class="hero-media">\s*<img src="\.\.\/eigene\/wirtshaus-abends\.jpg" alt="Gasthof Zur Post">/,
  );
  assert.ok(!html.includes(assetFileName(stockHero, "hero")));
});

test("gesetzte Bildplätze gewinnen, fehlende bleiben beim Stockfoto", () => {
  const gestaltung = themeForLead(lead);
  const html = buildLandingPage(lead, {
    menu: MENUS.italienisch,
    editUebersteuerung: { bilder: { haus: "../eigene/haus.jpg" } },
  });

  assert.ok(html.includes('<img src="../eigene/haus.jpg" alt="" loading="lazy">'));
  // Team und Bestseller sind nicht gesetzt – dort bleibt der bisherige
  // Fallback aus imageLibrary.js stehen.
  assert.ok(html.includes(assetFileName(gestaltung.teamBild, "ambiente")));
  assert.ok(!html.includes(assetFileName(gestaltung.hausBild, "ambiente")));
});

test("texte.headline und texte.schlagzeile ersetzen nur die Hero-Texte", () => {
  const html = buildLandingPage(lead, {
    menu: MENUS.italienisch,
    editUebersteuerung: {
      texte: { headline: "Bei Franz & Fanny", schlagzeile: "Seit 1904 am Stadtplatz." },
    },
  });

  assert.ok(html.includes("<h1>Bei Franz &amp; Fanny</h1>"));
  assert.ok(html.includes('<p class="hero-sub">Seit 1904 am Stadtplatz.</p>'));
  // Kopfzeile und Fußzeile tragen weiter den Namen aus Google.
  assert.ok(html.includes('<div class="brand">Gasthof Zur Post</div>'));
  assert.ok(html.includes("<strong>Gasthof Zur Post</strong>"));
});

test("highlightBeschreibungen ersetzt gezielt eine einzelne Gericht-ID", () => {
  const html = buildLandingPage(lead, {
    menu: editMenu,
    editUebersteuerung: {
      texte: { highlightBeschreibungen: { [gerichtId(0, 0)]: "Vom Wirt selbst getextet" } },
    },
  });

  // Das Gericht steht in den Highlights und in der Karte – beide Stellen
  // übernehmen den neuen Text.
  assert.equal(html.split("Vom Wirt selbst getextet").length - 1, 2);
  assert.ok(!html.includes("Ursprünglich eins"));
  assert.equal(html.split("Ursprünglich zwei").length - 1, 2);
});

test("eine unbekannte Gericht-ID ändert keine Beschreibung", () => {
  const html = buildLandingPage(lead, {
    menu: editMenu,
    editUebersteuerung: { texte: { highlightBeschreibungen: { "9-9": "Ins Leere getextet" } } },
  });

  assert.equal(html, buildLandingPage(lead, { menu: editMenu }));
});
