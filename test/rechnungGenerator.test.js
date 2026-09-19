import { test } from "node:test";
import assert from "node:assert/strict";
import { erzeugeNoShowRechnung } from "../src/rechnungGenerator.js";

function beispielBestellung() {
  return {
    nummer: "AB-7421",
    name: "Max Mustermann",
    telefon: "0170 1234567",
    email: "max@beispiel.de",
    positionen: [
      { name: "Pizza Margherita", menge: 2, preis: 8.5 },
      { name: "Cola", menge: 1, preis: 2.5 },
    ],
    gesamt: 19.5,
    noShowZustimmung: {
      text: "Ich stimme zu: Bei Nichtabholung ohne Stornierung bis 30 Minuten vor der Abholzeit wird eine Ausfallpauschale von 10,00 EUR in Rechnung gestellt.",
      zeitpunkt: "2026-09-20T17:00:00.000Z",
    },
  };
}

/**
 * pdfkit schreibt Text als hex-kodierte Glyphen mit Kerning-Werten dazwischen
 * (z. B. "<4d6178> -25 <4d757374657265726d616e6e>" für "Max Mustermann") –
 * ein einfacher Substring-Test auf den Rohbytes würde nie treffen. Diese
 * Funktion dekodiert jede Text-Zeile (ein BT/ET-Block) zurück zu Klartext,
 * ohne einen vollständigen PDF-Parser zu brauchen.
 */
function extrahierePdfText(pdfBuffer) {
  const raw = pdfBuffer.toString("latin1");
  const zeilen = [];
  for (const block of raw.matchAll(/BT([\s\S]*?)ET/g)) {
    let zeile = "";
    for (const hexMatch of block[1].matchAll(/<([0-9a-fA-F]+)>/g)) {
      const hex = hexMatch[1];
      for (let i = 0; i < hex.length; i += 2) {
        zeile += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
      }
    }
    if (zeile) zeilen.push(zeile);
  }
  return zeilen.join("\n");
}

test("die Rechnung ist ein gültiges PDF", async () => {
  const pdf = await erzeugeNoShowRechnung({
    betrieb: "Testbetrieb",
    bestellung: beispielBestellung(),
    betrag: 10,
    bankverbindung: "Testbetrieb GmbH, IBAN DE00 1234 5678",
  });

  assert.ok(Buffer.isBuffer(pdf));
  assert.equal(pdf.subarray(0, 5).toString("latin1"), "%PDF-");
  assert.ok(pdf.length > 500, "eine leere/kaputte Rechnung wäre winzig");
});

test("die Rechnung enthält alle Pflichtangaben", async () => {
  const bestellung = beispielBestellung();
  const pdf = await erzeugeNoShowRechnung({
    betrieb: "Testbetrieb",
    bestellung,
    betrag: 10,
    bankverbindung: "Testbetrieb GmbH, IBAN DE00 1234 5678",
  });
  const text = extrahierePdfText(pdf);

  // Kundendaten
  assert.match(text, /Max Mustermann/);
  assert.match(text, /0170 1234567/);
  assert.match(text, /max@beispiel.de/);

  // Bestelldetails
  assert.match(text, /AB-7421/);
  assert.match(text, /Pizza Margherita/);
  assert.match(text, /Cola/);

  // Zustimmungstext samt Zeitstempel
  assert.match(text, /30 Minuten vor der Abholzeit/);
  assert.match(text, /Ausfallpauschale von 10,00 EUR/);
  assert.match(text, /Zugestimmt am/);

  // Betrag und Bankverbindung
  assert.match(text, /Ausfallpauschale: 10,00/);
  assert.match(text, /Testbetrieb GmbH/);
  assert.match(text, /DE00 1234 5678/);
});

test("ohne hinterlegte Bankverbindung steht trotzdem ein Hinweis in der Rechnung", async () => {
  const pdf = await erzeugeNoShowRechnung({
    betrieb: "Testbetrieb",
    bestellung: beispielBestellung(),
    betrag: 7.5,
    bankverbindung: "",
  });
  const text = extrahierePdfText(pdf);
  assert.match(text, /keine Bankverbindung hinterlegt/);
});
