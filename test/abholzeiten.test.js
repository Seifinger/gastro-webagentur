import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  berechneAbholzeiten,
  pruefeAbholwunsch,
  wochenplanAus,
  zeitpunktFuerUhrzeit,
  abholzeitSkript,
  STANDARD_OEFFNUNGSZEITEN,
} from "../src/abholzeiten.js";
import { DEFAULT_OPENING_HOURS } from "../src/landingPageGenerator.js";

// Alle Zeiten als Berliner Wanduhr mit ausgeschriebenem Versatz: +02:00 im
// Sommer, +01:00 im Winter. Der 24.09.2026 ist ein Donnerstag.
const berlin = (wand) => new Date(wand);
const taeglich = (zeiten) => [{ tage: "Montag – Sonntag", zeiten }];

function rechne(jetzt, zeiten, extra = {}) {
  return berechneAbholzeiten({ jetzt: berlin(jetzt), oeffnungszeiten: taeglich(zeiten), ...extra });
}
const uhrzeiten = (r) => r.slots.map((s) => s.uhrzeit);

/* ---------- Die vier Beispiele aus dem Auftrag ---------- */

test("A) 16:43, Öffnung 17:30 → ASAP 17:50, erste geplante Zeit 17:55, nichts vor 17:50", () => {
  const r = rechne("2026-09-24T16:43:00+02:00", "17:30 – 22:00");
  assert.equal(r.asap.uhrzeit, "17:50");
  assert.equal(r.asap.iso, "2026-09-24T15:50:00.000Z");
  assert.equal(r.slots[0].uhrzeit, "17:55");
  assert.equal(r.slots[1].uhrzeit, "18:00");
  assert.ok(r.slots.every((s) => s.zeitpunkt > r.asap.zeitpunkt), "keine Zeit vor 17:50");
  assert.equal(r.geoeffnet, false);
});

test("B) 17:43, geöffnet → ASAP 18:03, geplante Zeiten 18:10, 18:15, 18:20 …", () => {
  const r = rechne("2026-09-24T17:43:00+02:00", "17:00 – 22:00");
  assert.equal(r.asap.uhrzeit, "18:03");
  assert.deepEqual(uhrzeiten(r).slice(0, 3), ["18:10", "18:15", "18:20"]);
  assert.equal(r.geoeffnet, true);
});

test("C) 17:43, Schließung 18:00 → kein ASAP 18:03, keine Zeit, Hinweis auf die nächste Öffnung", () => {
  const r = rechne("2026-09-24T17:43:00+02:00", "11:00 – 18:00");
  assert.equal(r.asap, null);
  assert.deepEqual(r.slots, []);
  assert.equal(r.naechsteOeffnung.text, "morgen, 11:00 Uhr");
});

test("D) 17:43, geöffnet, Zusatz-Wartezeit 10 (additiv) → ASAP 18:13, erste geplante Zeit 18:20", () => {
  const r = rechne("2026-09-24T17:43:00+02:00", "17:00 – 22:00", { zusatzMinuten: 10 });
  assert.equal(r.asap.uhrzeit, "18:13");
  assert.equal(r.slots[0].uhrzeit, "18:20");
});

/* ---------- Raster ---------- */

test("genau auf einer 5-Minuten-Grenze: 17:45 → ASAP 18:05, erste Zeit 18:10 (nicht aufgerundet darüber)", () => {
  const r = rechne("2026-09-24T17:45:00+02:00", "17:00 – 22:00");
  assert.equal(r.asap.uhrzeit, "18:05");
  assert.equal(r.slots[0].uhrzeit, "18:10");
});

test("zwischen den Grenzen: 17:46 → ASAP 18:06, erste Zeit 18:15", () => {
  const r = rechne("2026-09-24T17:46:00+02:00", "17:00 – 22:00");
  assert.equal(r.asap.uhrzeit, "18:06");
  assert.equal(r.slots[0].uhrzeit, "18:15");
});

test("Sekunden zählen: 17:43:30 → ASAP 18:04 (aufgerundet, nie zu früh versprochen)", () => {
  const r = rechne("2026-09-24T17:43:30+02:00", "17:00 – 22:00");
  assert.equal(r.asap.uhrzeit, "18:04");
  assert.equal(r.slots[0].uhrzeit, "18:10");
});

test("alle geplanten Zeiten liegen im 5-Minuten-Raster und 5 Minuten auseinander", () => {
  const r = rechne("2026-09-24T12:07:00+02:00", "11:30 – 22:00");
  for (let i = 0; i < r.slots.length; i += 1) {
    assert.equal(Number(r.slots[i].uhrzeit.slice(3)) % 5, 0);
    if (i > 0) assert.equal(r.slots[i].zeitpunkt - r.slots[i - 1].zeitpunkt, 5 * 60_000);
  }
});

/* ---------- Schließzeit, Mittagspause, Mitternacht ---------- */

test("kurz vor Schließung: 21:30 bei Schluss 22:00 → ASAP 21:50, geplant 21:55 als letzte Zeit", () => {
  const r = rechne("2026-09-24T21:30:00+02:00", "17:00 – 22:00");
  assert.equal(r.asap.uhrzeit, "21:50");
  assert.deepEqual(uhrzeiten(r), ["21:55"]);
});

test("exakt zur Schließung wird nicht mehr angeboten: 21:40 → ASAP wäre 22:00 → keine Zeit", () => {
  const r = rechne("2026-09-24T21:40:00+02:00", "17:00 – 22:00");
  assert.equal(r.asap, null);
  assert.deepEqual(r.slots, []);
  assert.equal(r.naechsteOeffnung.text, "morgen, 17:00 Uhr");
});

test("eine Minute früher geht es noch: 21:39 → ASAP 21:59, keine geplante Zeit mehr", () => {
  const r = rechne("2026-09-24T21:39:00+02:00", "17:00 – 22:00");
  assert.equal(r.asap.uhrzeit, "21:59");
  assert.deepEqual(r.slots, []);
});

test("Mittagspause: um 13:50 (Pause 14:00–17:00) geht es erst abends weiter", () => {
  const r = berechneAbholzeiten({ jetzt: berlin("2026-09-24T13:50:00+02:00"), oeffnungszeiten: STANDARD_OEFFNUNGSZEITEN });
  assert.equal(r.asap.uhrzeit, "17:20");
  assert.equal(r.slots[0].uhrzeit, "17:25");
  assert.ok(!uhrzeiten(r).some((z) => z >= "14:00" && z < "17:00"), "keine Zeit in der Pause");
});

test("Mittagspause: um 13:20 gibt es mittags noch ASAP und geplante Zeiten bis 13:55, danach abends", () => {
  const r = berechneAbholzeiten({ jetzt: berlin("2026-09-24T13:20:00+02:00"), oeffnungszeiten: STANDARD_OEFFNUNGSZEITEN });
  assert.equal(r.asap.uhrzeit, "13:40");
  const z = uhrzeiten(r);
  assert.deepEqual(z.slice(0, 2), ["13:45", "13:50"]);
  assert.equal(z[3], "17:25", "nach 13:55 folgt direkt der Abend");
  assert.equal(z[2], "13:55");
});

test("über Mitternacht: 23:30 bei 18:00–02:00 → ASAP 23:50, Zeiten über 00:00 bis 01:55", () => {
  const r = rechne("2026-09-24T23:30:00+02:00", "18:00 – 02:00");
  assert.equal(r.asap.uhrzeit, "23:50");
  const z = uhrzeiten(r);
  assert.deepEqual(z.slice(0, 3), ["23:55", "00:00", "00:05"]);
  assert.equal(z.at(-1), "01:55");
  assert.equal(r.slots.at(-1).datum, "2026-09-25", "nach Mitternacht mit richtigem Datum");
});

test("über Mitternacht: um 01:00 läuft das Intervall von gestern noch", () => {
  const r = rechne("2026-09-25T01:00:00+02:00", "18:00 – 02:00");
  assert.equal(r.asap.uhrzeit, "01:20");
  assert.equal(r.slots[0].uhrzeit, "01:25");
  assert.equal(r.geoeffnet, true);
});

test("Tageswechsel: nach Schluss um 22:30 keine Zeit, nächste Öffnung morgen – nichts für morgen vorbestellbar", () => {
  const r = berechneAbholzeiten({ jetzt: berlin("2026-09-24T22:30:00+02:00"), oeffnungszeiten: STANDARD_OEFFNUNGSZEITEN });
  assert.equal(r.asap, null);
  assert.deepEqual(r.slots, []);
  assert.equal(r.naechsteOeffnung.text, "morgen, 11:30 Uhr");
});

test("Ruhetag: die nächste Öffnung nennt den Wochentag", () => {
  const zeiten = [{ tage: "Mittwoch – Sonntag", zeiten: "17:00 – 22:00" }];
  // Sonntag 27.09., 22:10 → Montag und Dienstag zu → Mittwoch
  const r = berechneAbholzeiten({ jetzt: berlin("2026-09-27T22:10:00+02:00"), oeffnungszeiten: zeiten });
  assert.equal(r.naechsteOeffnung.text, "Mittwoch, 17:00 Uhr");
});

/* ---------- Zusatz-Wartezeit des Wirts ---------- */

test("die Zusatz-Wartezeit wirkt additiv auf ASAP und geplante Zeiten und nie über die Schließzeit hinaus", () => {
  const ohne = rechne("2026-09-24T17:00:00+02:00", "17:00 – 22:00");
  const mit = rechne("2026-09-24T17:00:00+02:00", "17:00 – 22:00", { zusatzMinuten: 30 });
  assert.equal(ohne.asap.uhrzeit, "17:20");
  assert.equal(mit.asap.uhrzeit, "17:50");
  assert.equal(ohne.slots[0].uhrzeit, "17:25");
  assert.equal(mit.slots[0].uhrzeit, "17:55");
  const spaet = rechne("2026-09-24T21:15:00+02:00", "17:00 – 22:00", { zusatzMinuten: 30 });
  assert.equal(spaet.asap, null, "21:15 + 50 Min. liegt nach 22:00");
});

test("die Zusatz-Wartezeit wirkt auch vor Öffnung: Start ist die Öffnung", () => {
  const r = rechne("2026-09-24T16:43:00+02:00", "17:30 – 22:00", { zusatzMinuten: 15 });
  assert.equal(r.asap.uhrzeit, "18:05");
  assert.equal(r.slots[0].uhrzeit, "18:10");
});

/* ---------- Zeitzone und Sommerzeit ---------- */

test("gerechnet wird in der Zeitzone des Restaurants, nicht in UTC", () => {
  // 15:43 UTC = 17:43 in Berlin (Sommerzeit)
  const r = berechneAbholzeiten({ jetzt: new Date("2026-09-24T15:43:00Z"), oeffnungszeiten: taeglich("17:00 – 22:00") });
  assert.equal(r.asap.uhrzeit, "18:03");
  // Derselbe Zeitpunkt in London ist 16:43 – dort vor Öffnung.
  const london = berechneAbholzeiten({ jetzt: new Date("2026-09-24T15:43:00Z"), oeffnungszeiten: taeglich("17:30 – 22:00"), zeitzone: "Europe/London" });
  assert.equal(london.asap.uhrzeit, "17:50");
  assert.equal(london.asap.iso, "2026-09-24T16:50:00.000Z");
});

test("die Zeitzone des Rechners/Browsers spielt keine Rolle", () => {
  const modul = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "abholzeiten.js");
  const skript = `import(${JSON.stringify("file://" + modul)}).then((m) => { const r = m.berechneAbholzeiten({ jetzt: new Date("2026-09-24T15:43:00Z"), oeffnungszeiten: [{ tage: "Montag – Sonntag", zeiten: "17:00 – 22:00" }] }); console.log(r.asap.uhrzeit + " " + r.slots[0].uhrzeit); })`;
  for (const tz of ["America/New_York", "Asia/Tokyo", "UTC"]) {
    const aus = execFileSync(process.execPath, ["--input-type=module", "-e", skript], { env: { ...process.env, TZ: tz } }).toString().trim();
    assert.equal(aus, "18:03 18:10", `unter TZ=${tz}`);
  }
});

test("Winterzeit: im Januar gilt +01:00", () => {
  const r = rechne("2026-01-15T17:43:00+01:00", "17:00 – 22:00");
  assert.equal(r.asap.uhrzeit, "18:03");
  assert.equal(r.asap.iso, "2026-01-15T17:03:00.000Z");
});

test("Sommerzeit-Beginn (29.03.2026): die Stunde 02:00–03:00 gibt es nicht, es wird keine erfunden", () => {
  // Samstag 28.03., 23:50 (Winterzeit), geöffnet 18:00–04:00
  const r = rechne("2026-03-28T23:50:00+01:00", "18:00 – 04:00");
  const z = uhrzeiten(r);
  assert.ok(z.includes("01:55"));
  assert.equal(z[z.indexOf("01:55") + 1], "03:00", "nach 01:55 folgt 03:00");
  assert.ok(!z.some((x) => x.startsWith("02:")), "keine Zeit zwischen 02:00 und 03:00");
  assert.equal(z.at(-1), "03:55");
  // Die Öffnung am Sonntag liegt in Sommerzeit: 11:30 = 09:30 UTC.
  const sonntag = rechne("2026-03-29T10:00:00+02:00", "11:30 – 22:00");
  assert.equal(sonntag.asap.iso, "2026-03-29T09:50:00.000Z");
});

test("Sommerzeit-Ende (25.10.2026): die Stunde 02:00–03:00 kommt zweimal, alle Zeiten bleiben echte 5 Minuten auseinander", () => {
  const r = rechne("2026-10-24T23:50:00+02:00", "18:00 – 04:00");
  const z = uhrzeiten(r);
  assert.equal(z.filter((x) => x === "02:30").length, 2, "02:30 Sommerzeit und 02:30 Winterzeit");
  assert.equal(z.at(-1), "03:55");
  for (let i = 1; i < r.slots.length; i += 1) assert.equal(r.slots[i].zeitpunkt - r.slots[i - 1].zeitpunkt, 5 * 60_000);
  // 00:15 CEST bis 03:55 CET = 4 h 40 min → 57 Zeiten
  assert.equal(r.slots.length, 57);
});

/* ---------- Lange offene Seite ---------- */

test("eine Zeit, die beim Laden angeboten wurde, verschwindet, wenn die Seite lange offen bleibt", () => {
  const geladen = rechne("2026-09-24T17:43:00+02:00", "17:00 – 22:00");
  const gewaehlt = geladen.slots[0];
  assert.equal(gewaehlt.uhrzeit, "18:10");
  const spaeter = rechne("2026-09-24T17:47:00+02:00", "17:00 – 22:00");
  assert.ok(!spaeter.slots.some((s) => s.zeitpunkt === gewaehlt.zeitpunkt), "18:10 ist nicht mehr dabei");
  assert.equal(spaeter.slots[0].uhrzeit, "18:15");
  const pruefung = pruefeAbholwunsch({ jetzt: berlin("2026-09-24T17:50:00+02:00"), oeffnungszeiten: taeglich("17:00 – 22:00"), art: "geplant", zeitpunkt: gewaehlt.iso });
  assert.equal(pruefung.ok, false);
  assert.match(pruefung.fehler, /18:10 Uhr ist nicht mehr möglich\. Frühestens möglich: 18:15 Uhr/);
});

/* ---------- Prüfung beim Absenden (Server) ---------- */

const oz = taeglich("17:00 – 22:00");
const pruefe = (jetzt, eingabe, extra = {}) => pruefeAbholwunsch({ jetzt: berlin(jetzt), oeffnungszeiten: oz, ...eingabe, ...extra });

test("gültige geplante Zeit und gültiges ASAP werden angenommen", () => {
  const r = rechne("2026-09-24T17:43:00+02:00", "17:00 – 22:00");
  const geplant = pruefe("2026-09-24T17:43:20+02:00", { art: "geplant", zeitpunkt: r.slots[2].iso });
  assert.equal(geplant.ok, true);
  assert.equal(geplant.uhrzeit, "18:20");
  const asap = pruefe("2026-09-24T17:43:20+02:00", { art: "asap", zeitpunkt: r.asap.iso });
  assert.equal(asap.ok, true);
  assert.equal(asap.uhrzeit, "18:03");
});

test("Sekunden zwischen Anzeige und Eingang: bis 2 Minuten Spielraum, danach klare Ablehnung", () => {
  const r = rechne("2026-09-24T17:43:00+02:00", "17:00 – 22:00");
  assert.equal(pruefe("2026-09-24T17:44:59+02:00", { art: "asap", zeitpunkt: r.asap.iso }).ok, true);
  const alt = pruefe("2026-09-24T17:48:00+02:00", { art: "asap", zeitpunkt: r.asap.iso });
  assert.equal(alt.ok, false);
  assert.match(alt.fehler, /18:03 Uhr ist nicht mehr zu schaffen\. Frühestens möglich: 18:08 Uhr/);
  // Die erste geplante Zeit (18:10) gilt bis 17:45 (+2 Min. Spielraum), um 17:48 nicht mehr.
  assert.equal(pruefe("2026-09-24T17:46:30+02:00", { art: "geplant", zeitpunkt: r.slots[0].iso }).ok, true);
  assert.equal(pruefe("2026-09-24T17:48:00+02:00", { art: "geplant", zeitpunkt: r.slots[0].iso }).ok, false);
});

test("manipulierte Zeiten werden abgelehnt", () => {
  const j = "2026-09-24T17:43:00+02:00";
  const fehler = (eingabe) => pruefe(j, eingabe).fehler;
  // vor ASAP, in der Vergangenheit, außerhalb des Rasters, nach Schließung, als ASAP getarnte Spätzeit
  assert.match(fehler({ art: "asap", zeitpunkt: "2026-09-24T15:50:00Z" }), /nicht mehr zu schaffen/);
  assert.match(fehler({ art: "geplant", zeitpunkt: "2026-09-24T14:00:00Z" }), /nicht mehr möglich/);
  assert.match(fehler({ art: "geplant", zeitpunkt: "2026-09-24T16:12:00Z" }), /Um 18:12 Uhr bieten wir keine Abholung an/);
  assert.match(fehler({ art: "geplant", zeitpunkt: "2026-09-24T20:00:00Z" }), /Um 22:00 Uhr bieten wir keine Abholung an/);
  assert.match(fehler({ art: "geplant", zeitpunkt: "2026-09-25T15:30:00Z" }), /bieten wir keine Abholung an/, "morgen ist nicht vorbestellbar");
  assert.match(fehler({ art: "asap", zeitpunkt: "2026-09-24T19:00:00Z" }), /passt nicht zu „so schnell wie möglich“/);
  assert.match(fehler({ art: "geplant", zeitpunkt: "kaputt" }), /aus der Liste/);
  assert.match(fehler({ art: "bald", zeitpunkt: "2026-09-24T16:30:00Z" }), /aus der Liste/);
  assert.match(fehler({}), /aus der Liste/);
});

test("ohne gültige Zeit (nach Schluss) lehnt die Prüfung mit Hinweis auf die nächste Öffnung ab", () => {
  const p = pruefe("2026-09-24T21:45:00+02:00", { art: "asap", zeitpunkt: "2026-09-24T20:05:00Z" });
  assert.equal(p.ok, false);
  assert.equal(p.fehler, "Heute nehmen wir keine Abholbestellungen mehr an. Nächste Öffnung: morgen, 17:00 Uhr.");
});

test("kurz vor Schluss ist nur noch ASAP möglich – eine geplante Zeit bekommt genau diesen Hinweis", () => {
  const p = pruefe("2026-09-24T21:37:00+02:00", { art: "geplant", zeitpunkt: "2026-09-24T19:55:00Z" });
  assert.equal(p.ok, false);
  assert.match(p.fehler, /nur noch „so schnell wie möglich“ möglich \(ca\. 21:57 Uhr\)/);
});

test("die Zusatz-Wartezeit gilt auch bei der Prüfung", () => {
  const r = rechne("2026-09-24T17:43:00+02:00", "17:00 – 22:00");
  const p = pruefe("2026-09-24T17:43:00+02:00", { art: "geplant", zeitpunkt: r.slots[0].iso }, { zusatzMinuten: 10 });
  assert.equal(p.ok, false);
  assert.match(p.fehler, /Frühestens möglich: 18:20 Uhr/);
});

test("ältere Seiten ohne Zeitpunkt: 'HH:MM' wird als geplante Zeit genauso geprüft", () => {
  assert.equal(pruefe("2026-09-24T17:43:00+02:00", { abholzeit: "18:30" }).ok, true);
  assert.equal(pruefe("2026-09-24T17:43:00+02:00", { abholzeit: "18:05" }).ok, false);
  assert.equal(pruefe("2026-09-24T17:43:00+02:00", { abholzeit: "So schnell wie möglich (ca. 20 Min.)" }).ok, false);
});

test("ohne Öffnungszeiten wird nichts angeboten und nichts angenommen", () => {
  const r = berechneAbholzeiten({ jetzt: berlin("2026-09-24T17:43:00+02:00") });
  assert.equal(r.ohneOeffnungszeiten, true);
  assert.equal(r.asap, null);
  assert.deepEqual(r.slots, []);
  const p = pruefeAbholwunsch({ jetzt: berlin("2026-09-24T17:43:00+02:00"), art: "geplant", zeitpunkt: "2026-09-24T16:30:00Z" });
  assert.equal(p.ok, false);
});

/* ---------- Öffnungszeiten lesen ---------- */

test("die Standard-Öffnungszeiten der Seite sind dieselben, mit denen gerechnet wird", () => {
  assert.equal(DEFAULT_OPENING_HOURS, STANDARD_OEFFNUNGSZEITEN);
  const plan = wochenplanAus(STANDARD_OEFFNUNGSZEITEN);
  assert.deepEqual(plan[4], [[690, 840], [1020, 1320]], "Donnerstag");
  assert.deepEqual(plan[6], [[690, 840], [1020, 1380]], "Samstag");
  assert.deepEqual(plan[0], [[690, 1260]], "Sonntag");
});

test("Öffnungszeiten: Abkürzungen, Listen, Bereiche über das Wochenende, Ruhetage", () => {
  const plan = wochenplanAus([
    { tage: "Mo, Mi & Fr", zeiten: "11:00 - 15:00" },
    { tage: "Sa – Mo", zeiten: "18:00 bis 01:00 Uhr" },
    { tage: "Dienstag", zeiten: "Ruhetag" },
  ]);
  assert.deepEqual(plan[1], [[660, 900], [1080, 1500]], "Montag: aus beiden Zeilen");
  assert.deepEqual(plan[2], [], "Dienstag zu");
  assert.deepEqual(plan[3], [[660, 900]]);
  assert.deepEqual(plan[0], [[1080, 1500]], "Sonntag liegt im Bereich Sa – Mo");
  assert.equal(wochenplanAus([{ tage: "immer", zeiten: "nach Absprache" }]), null);
});

test("zeitpunktFuerUhrzeit legt 'HH:MM' auf das nächstliegende Vorkommen, auch über Mitternacht", () => {
  assert.equal(new Date(zeitpunktFuerUhrzeit("2026-09-24T23:50:00+02:00", "00:10", "Europe/Berlin")).toISOString(), "2026-09-24T22:10:00.000Z");
  assert.equal(new Date(zeitpunktFuerUhrzeit("2026-09-24T17:00:00+02:00", "18:30", "Europe/Berlin")).toISOString(), "2026-09-24T16:30:00.000Z");
  assert.equal(zeitpunktFuerUhrzeit("2026-09-24T17:00:00+02:00", "25:00", "Europe/Berlin"), null);
});

/* ---------- Browser und Server: dieselbe Rechnung ---------- */

test("das Browser-Skript ist derselbe Kern und rechnet identisch", () => {
  const skript = abholzeitSkript();
  assert.doesNotMatch(skript, /<\/script/i);
  const fenster = {};
  vm.runInNewContext(skript, { window: fenster, Intl, Date, Math, Number, String, Array, JSON, isFinite });
  const faelle = [
    ["2026-09-24T16:43:00+02:00", "17:30 – 22:00", 0],
    ["2026-09-24T17:43:00+02:00", "17:00 – 22:00", 10],
    ["2026-09-24T23:30:00+02:00", "18:00 – 02:00", 0],
    ["2026-10-24T23:50:00+02:00", "18:00 – 04:00", 5],
  ];
  for (const [jetzt, zeiten, zusatzMinuten] of faelle) {
    const e = { jetzt: berlin(jetzt).getTime(), oeffnungszeiten: taeglich(zeiten), zusatzMinuten };
    assert.deepEqual(JSON.parse(JSON.stringify(fenster.Abholzeiten.berechne(e))), JSON.parse(JSON.stringify(berechneAbholzeiten(e))));
  }
});
