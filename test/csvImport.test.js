import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLeadsCsv } from "../src/csvImport.js";

const HEADER =
  "name,adresse,telefon,website,hatWebsite,score,priorität,websiteErreichbar,hatBestellfunktion,hatReservierungsfunktion,mobilFreundlich,wirktVeraltet,rating,anzahlBewertungen,placeId,ort";

test("parseLeadsCsv liest einfache Zeile korrekt inkl. Typen", () => {
  const csv = `${HEADER}\nGasthof Post,"Hauptstr. 1, Mühldorf",08631123,https://post.example.com,true,45,Mittel,true,false,true,true,false,4.5,120,abc123,Mühldorf am Inn`;

  const [lead] = parseLeadsCsv(csv);

  assert.equal(lead.name, "Gasthof Post");
  assert.equal(lead.adresse, "Hauptstr. 1, Mühldorf");
  assert.equal(lead.hatWebsite, true);
  assert.equal(lead.score, 45);
  assert.equal(lead.hatBestellfunktion, false);
  assert.equal(lead.rating, 4.5);
  assert.equal(lead.anzahlBewertungen, 120);
});

test("parseLeadsCsv verarbeitet mehrere Zeilen und leere Felder", () => {
  const csv = `${HEADER}\nA,Adr1,,,false,100,Sehr hoch (keine Website),,,,,,,,id1,Ort1\nB,Adr2,,,false,100,Sehr hoch (keine Website),,,,,,,,id2,Ort1`;

  const leads = parseLeadsCsv(csv);

  assert.equal(leads.length, 2);
  assert.equal(leads[0].name, "A");
  assert.equal(leads[1].name, "B");
  assert.equal(leads[0].telefon, "");
});

test("parseLeadsCsv verarbeitet doppelte Anführungszeichen als Escape", () => {
  const csv = `${HEADER}\n"Gasthof ""zum Löwen""",Adr,,,false,100,Sehr hoch (keine Website),,,,,,,,id3,Ort2`;

  const [lead] = parseLeadsCsv(csv);

  assert.equal(lead.name, 'Gasthof "zum Löwen"');
});
