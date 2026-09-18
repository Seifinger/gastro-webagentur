import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STALE_AFTER_DAYS,
  WARN_AFTER_DAYS,
  ageInDays,
  isStale,
  isAgingSoon,
  markStaleLeads,
  removeStaleLeads,
  leadsNeedingRefetch,
  regionsNeedingRefetch,
} from "../src/leadFreshness.js";

const JETZT = new Date("2026-09-18T12:00:00Z");

function vorTagen(tage) {
  return new Date(JETZT.getTime() - tage * 24 * 60 * 60 * 1000).toISOString();
}

test("ageInDays berechnet das Alter in Tagen aus fetchedAt", () => {
  const lead = { fetchedAt: vorTagen(10) };

  assert.equal(Math.round(ageInDays(lead, JETZT)), 10);
});

test("ageInDays liefert Infinity, wenn fetchedAt fehlt", () => {
  assert.equal(ageInDays({}, JETZT), Infinity);
});

test("ageInDays liefert Infinity bei kaputtem Zeitstempel", () => {
  assert.equal(ageInDays({ fetchedAt: "nicht-lesbar" }, JETZT), Infinity);
});

test("isStale ist false innerhalb der 30-Tage-Frist", () => {
  const lead = { fetchedAt: vorTagen(29) };

  assert.equal(isStale(lead, { now: JETZT }), false);
});

test("isStale ist true jenseits von STALE_AFTER_DAYS", () => {
  const lead = { fetchedAt: vorTagen(STALE_AFTER_DAYS + 1) };

  assert.equal(isStale(lead, { now: JETZT }), true);
});

test("isStale behandelt fehlenden Zeitstempel als überfällig", () => {
  assert.equal(isStale({}, { now: JETZT }), true);
});

test("isAgingSoon warnt ab WARN_AFTER_DAYS, aber nicht früher", () => {
  const nochFrisch = { fetchedAt: vorTagen(WARN_AFTER_DAYS - 1) };
  const baldFaellig = { fetchedAt: vorTagen(WARN_AFTER_DAYS) };

  assert.equal(isAgingSoon(nochFrisch, { now: JETZT }), false);
  assert.equal(isAgingSoon(baldFaellig, { now: JETZT }), true);
});

test("markStaleLeads reichert Leads an, ohne die Originale zu verändern", () => {
  const leads = [
    { name: "Frisch", fetchedAt: vorTagen(5) },
    { name: "Alt", fetchedAt: vorTagen(40) },
  ];

  const result = markStaleLeads(leads, { now: JETZT });

  assert.equal(result[0].stale, false);
  assert.equal(result[1].stale, true);
  assert.equal(Math.round(result[1].alterTage), 40);
  assert.equal(leads[0].stale, undefined, "Original darf nicht verändert werden");
});

test("removeStaleLeads entfernt nur überfällige Leads", () => {
  const leads = [
    { name: "Frisch", fetchedAt: vorTagen(5) },
    { name: "Alt", fetchedAt: vorTagen(40) },
    { name: "OhneZeitstempel" },
  ];

  const result = removeStaleLeads(leads, { now: JETZT });

  assert.deepEqual(result.map((l) => l.name), ["Frisch"]);
});

test("leadsNeedingRefetch liefert genau die überfälligen Leads", () => {
  const leads = [
    { name: "Frisch", fetchedAt: vorTagen(5) },
    { name: "Alt", fetchedAt: vorTagen(40) },
  ];

  const result = leadsNeedingRefetch(leads, { now: JETZT });

  assert.deepEqual(result.map((l) => l.name), ["Alt"]);
});

test("regionsNeedingRefetch liefert eindeutige, sortierte Orte überfälliger Leads", () => {
  const leads = [
    { name: "A", ort: "Altötting", fetchedAt: vorTagen(40) },
    { name: "B", ort: "Mühldorf am Inn", fetchedAt: vorTagen(45) },
    { name: "C", ort: "Altötting", fetchedAt: vorTagen(50) },
    { name: "D", ort: "Tüßling", fetchedAt: vorTagen(1) },
  ];

  const result = regionsNeedingRefetch(leads, { now: JETZT });

  assert.deepEqual(result, ["Altötting", "Mühldorf am Inn"]);
});

test("ein individuelles maxAgeDays überschreibt STALE_AFTER_DAYS", () => {
  const lead = { fetchedAt: vorTagen(15) };

  assert.equal(isStale(lead, { now: JETZT, maxAgeDays: 10 }), true);
  assert.equal(isStale(lead, { now: JETZT, maxAgeDays: 20 }), false);
});
