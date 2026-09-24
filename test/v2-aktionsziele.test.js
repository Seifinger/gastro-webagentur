import { test } from "node:test";
import assert from "node:assert/strict";
import { aktionsziele } from "../v2/build/aktionsziele.js";
import { baueSite } from "../v2/build/siteBuilder.js";
import { seitenSkript } from "../v2/build/v1Funktionen.js";
import { testLeadFuer } from "../v2/build/testLeads.js";

const lead = { name: "Gasthof Test", telefon: "08631 12345", adresse: "Stadtplatz 1, 84453 Mühldorf am Inn" };

test("aktionsziele: live nur mit apiUrl, sonst ehrliche Vorschau", () => {
  assert.equal(aktionsziele({ lead, apiUrl: "http://localhost:3200" }).modus, "live");
  const v = aktionsziele({ lead });
  assert.equal(v.modus, "vorschau");
  assert.equal(v.reservieren.art, "vorschau");
  assert.equal(v.anrufen.href, "tel:0863112345");
  assert.match(v.route.href, /^https:\/\/www\.google\.com\/maps\/search\//);
});

test("aktionsziele: kein Anrufen/Route ohne Daten, keine Filmnummer auf erfundenen Seiten", () => {
  assert.equal(aktionsziele({ lead: { name: "X" } }).anrufen, null);
  assert.equal(aktionsziele({ lead: { name: "X" } }).route, null);
  assert.equal(aktionsziele({ lead, fiktiv: true }).anrufen, null);
});

test("PAGE_SCRIPT: Demo-Zweig täuscht keinen Erfolg vor, Live-Zweig unverändert", () => {
  const s = seitenSkript();
  assert.ok(!s.includes("\"Tisch reserviert\""), "alter Erfolgs-Titel im Demo-Zweig");
  assert.ok(!s.includes("\"Bestellung aufgenommen\""));
  assert.ok(!s.includes("Ihre Reservierung liegt uns vor"));
  assert.ok(s.includes("Vorschau \\u2013 nichts gesendet"));
  assert.ok(s.includes("Vorschau \\u2013 nichts bestellt"));
  assert.ok(s.includes("Anfrage eingegangen"));
  assert.ok(s.includes("Bestellung eingegangen"));
});

test("v2-Seite: Vorschau-Hinweis an beiden Formularen nur ohne Betriebsserver", () => {
  const l = testLeadFuer("bayerisch", "wirtshaus");
  const bau = (optionen) => baueSite({ lead: { ...l, telefon: "08631 12345" }, kueche: l.kueche, stimmung: l.stimmung, optionen: { fontCss: "", ...optionen } }).html;
  const vorschau = bau({});
  assert.equal((vorschau.match(/class="hint vorschau-hinweis"/g) || []).length, 2);
  assert.match(vorschau, /"telefon":"08631 12345"/);
  const live = bau({ apiUrl: "http://localhost:3200" });
  assert.ok(!live.includes('class="hint vorschau-hinweis"'));
  const fiktiv = bau({ fiktiv: true });
  assert.ok(!/"telefon":/.test(fiktiv), "erfundene Seiten schicken niemanden zu einer Filmnummer");
});
