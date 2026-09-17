import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLandingPage, slugify } from "../src/landingPageGenerator.js";

const lead = {
  name: "Gasthof Zur Post",
  adresse: "Stadtplatz 1, 84453 Mühldorf am Inn",
  telefon: "08631 12345",
  ort: "Mühldorf am Inn",
  rating: 4.6,
  anzahlBewertungen: 1234,
  score: 100,
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

test("buildLandingPage zeigt Preise im deutschen Format", () => {
  const html = buildLandingPage(lead, {
    menu: {
      label: "Testküche",
      tagline: "Test",
      kategorien: [
        { name: "Hauptgerichte", gerichte: [{ name: "Testgericht", beschreibung: "Lecker", preis: 16.9 }] },
      ],
    },
  });

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
  assert.ok(!html.includes("Google-Bewertungen"));
  assert.ok(!html.includes('href="tel:"'));
});

test("buildLandingPage blendet den E-Mail-Versand nur mit Kontaktadresse ein", () => {
  const ohne = buildLandingPage(lead);
  const mit = buildLandingPage(lead, { kontaktEmail: "info@beispiel.de" });

  assert.ok(!ohne.includes("info@beispiel.de"));
  assert.ok(mit.includes("info@beispiel.de"));
});
