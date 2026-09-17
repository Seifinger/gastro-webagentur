import { test } from "node:test";
import assert from "node:assert/strict";
import { toLead, dedupeLeads } from "../src/leadFilter.js";

test("toLead markiert fehlende Website korrekt", () => {
  const place = {
    id: "abc123",
    displayName: { text: "Gasthaus Huber" },
    formattedAddress: "Hauptstraße 1, 84453 Mühldorf am Inn",
    rating: 4.5,
    userRatingCount: 120,
  };

  const lead = toLead(place, "Mühldorf am Inn");

  assert.equal(lead.name, "Gasthaus Huber");
  assert.equal(lead.hatWebsite, false);
  assert.equal(lead.website, "");
  assert.equal(lead.ort, "Mühldorf am Inn");
});

test("toLead erkennt vorhandene Website", () => {
  const place = {
    id: "def456",
    displayName: { text: "Ristorante Bella Vista" },
    websiteUri: "https://bella-vista.example.com",
  };

  const lead = toLead(place, "Altötting");

  assert.equal(lead.hatWebsite, true);
  assert.equal(lead.website, "https://bella-vista.example.com");
});

test("dedupeLeads entfernt Duplikate anhand der placeId", () => {
  const leads = [
    { placeId: "1", hatWebsite: true, name: "Mit Website" },
    { placeId: "2", hatWebsite: false, name: "Ohne Website" },
    { placeId: "1", hatWebsite: true, name: "Mit Website (Duplikat)" },
  ];

  const result = dedupeLeads(leads);

  assert.equal(result.length, 2);
  assert.equal(result[0].name, "Mit Website");
  assert.equal(result[1].name, "Ohne Website");
});
