import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreLead, sortByPriority, priorityLabel, WEIGHTS } from "../src/scoring.js";

test("scoreLead gibt Leads ohne Website immer Score 100", () => {
  const lead = { hatWebsite: false, name: "Gasthaus Huber" };

  const result = scoreLead(lead, null);

  assert.equal(result.score, 100);
  assert.equal(result.priorität, "Sehr hoch (keine Website)");
});

test("scoreLead markiert nicht erreichbare Websites separat, ohne Score-Bonus", () => {
  const lead = { hatWebsite: true, website: "https://kaputt.example.com" };

  const result = scoreLead(lead, { reachable: false });

  assert.equal(result.score, 0);
  assert.equal(result.websiteErreichbar, false);
  assert.equal(result.priorität, "Zu prüfen (Website nicht erreichbar)");
});

test("scoreLead addiert Minuspunkte für jedes fehlende Merkmal", () => {
  const lead = { hatWebsite: true, website: "https://beispiel.example.com" };
  const analysis = {
    reachable: true,
    https: true,
    hasOrdering: false,
    hasReservation: false,
    mobileFriendly: false,
    outdated: false,
  };

  const result = scoreLead(lead, analysis);

  const erwartet =
    WEIGHTS.keineBestellfunktion + WEIGHTS.keineReservierungsfunktion + WEIGHTS.nichtMobilfreundlich;
  assert.equal(result.score, erwartet);
  assert.equal(result.hatBestellfunktion, false);
});

test("scoreLead gibt einer guten Website einen niedrigen Score", () => {
  const lead = { hatWebsite: true, website: "https://gut.example.com" };
  const analysis = {
    reachable: true,
    https: true,
    hasOrdering: true,
    hasReservation: true,
    mobileFriendly: true,
    outdated: false,
  };

  const result = scoreLead(lead, analysis);

  assert.equal(result.score, 0);
  assert.equal(priorityLabel(result.score), "Niedrig");
});

test("sortByPriority sortiert nach Score, bei Gleichstand 'keine Website' zuerst", () => {
  const leads = [
    { name: "Mittel", score: 50, hatWebsite: true },
    { name: "KeineWebsite", score: 100, hatWebsite: false },
    { name: "SchlechteWebsite", score: 100, hatWebsite: true },
  ];

  const result = sortByPriority(leads);

  assert.deepEqual(
    result.map((l) => l.name),
    ["KeineWebsite", "SchlechteWebsite", "Mittel"],
  );
});
