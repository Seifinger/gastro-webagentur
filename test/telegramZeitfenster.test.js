import { test } from "node:test";
import assert from "node:assert/strict";
import { benachrichtigungsFenster, fensterUebersicht, jetztErlaubt, ausnahmenAus } from "../src/telegramZeitfenster.js";
import { TELEGRAM_EINSTELLUNGEN_STANDARD, telegramEinstellungen, pruefeTelegramEinstellungen } from "../src/telegramRegeln.js";

// Telegram-Zeitfenster: Öffnungsintervall ± Vorlauf/Nachlauf, in der Zeitzone
// des Betriebs, mit vollen Zeitpunkten (nicht bloß Uhrzeit-Strings).
// Donnerstag, 24.09.2026 (Sommerzeit, UTC+2).

const STANDARD = { ...TELEGRAM_EINSTELLUNGEN_STANDARD };
const berlin = (tag, hhmm) => new Date(`${tag}T${hhmm}:00+02:00`);
const betrieb = (zeiten, extra = {}) => ({ oeffnungszeiten: [{ tage: "Montag – Sonntag", zeiten }], ...extra });
const erlaubt = (daten, jetzt, einstellungen = STANDARD) => jetztErlaubt(daten, einstellungen, jetzt);
const heute = (daten, jetzt, einstellungen = STANDARD) => fensterUebersicht(benachrichtigungsFenster(daten, einstellungen, { jetzt }));

test("1. Geöffnet 17:30–22:00 → Telegram standardmäßig 17:00–22:30", () => {
  const d = betrieb("17:30 – 22:00");
  const tag = "2026-09-24";
  assert.equal(erlaubt(d, berlin(tag, "16:59")), false);
  assert.equal(erlaubt(d, berlin(tag, "17:00")), true);
  assert.equal(erlaubt(d, berlin(tag, "22:29")), true);
  assert.equal(erlaubt(d, berlin(tag, "22:30")), false, "Ende gehört nicht mehr dazu");
  const u = heute(d, berlin(tag, "12:00"));
  assert.equal(u.heuteText, "Heute kommen Telegram-Nachrichten von 17:00 bis 22:30.");
  assert.equal(u.jetztText, "Jetzt: pausiert. Nächste Telegram-Nachrichten ab heute 17:00 Uhr.");
  assert.equal(heute(d, berlin(tag, "18:00")).jetztText, "Jetzt: Benachrichtigungen aktiv bis heute 22:30 Uhr.");
});

test("2. Zwei Öffnungsintervalle → zwei Fenster, stille Lücke dazwischen", () => {
  const d = betrieb("11:00 – 14:00 & 17:30 – 22:00");
  const tag = "2026-09-24";
  for (const [uhr, soll] of [["10:29", false], ["10:30", true], ["14:29", true], ["14:30", false], ["15:45", false], ["16:59", false], ["17:00", true], ["22:29", true]]) {
    assert.equal(erlaubt(d, berlin(tag, uhr)), soll, uhr);
  }
  assert.equal(heute(d, berlin(tag, "09:00")).heuteText, "Heute kommen Telegram-Nachrichten von 10:30 bis 14:30 und von 17:00 bis 22:30.");
});

test("2b. Überlappende Fenster werden zusammengeführt", () => {
  // Lücke 14:00–14:30 ist kürzer als Nachlauf + Vorlauf → ein durchgehendes Fenster
  const d = betrieb("11:00 – 14:00 & 14:30 – 22:00");
  const r = benachrichtigungsFenster(d, STANDARD, { jetzt: berlin("2026-09-24", "09:00") });
  const heuteFenster = r.fenster.filter((f) => f.tag === "2026-09-24");
  assert.equal(heuteFenster.length, 1);
  assert.equal(heute(d, berlin("2026-09-24", "09:00")).heuteText, "Heute kommen Telegram-Nachrichten von 10:30 bis 22:30.");
  assert.equal(erlaubt(d, berlin("2026-09-24", "14:15")), true);
});

test("3. Betrieb über Mitternacht: Fenster läuft nach Mitternacht weiter", () => {
  const d = { oeffnungszeiten: [{ tage: "Freitag", zeiten: "18:00 – 02:00" }] };
  // Freitag, 25.09.2026
  assert.equal(erlaubt(d, berlin("2026-09-25", "17:29")), false);
  assert.equal(erlaubt(d, berlin("2026-09-25", "17:30")), true);
  assert.equal(erlaubt(d, berlin("2026-09-26", "00:15")), true, "nach Mitternacht (Samstag)");
  assert.equal(erlaubt(d, berlin("2026-09-26", "02:29")), true);
  assert.equal(erlaubt(d, berlin("2026-09-26", "02:30")), false);
  const u = heute(d, berlin("2026-09-25", "12:00"));
  assert.equal(u.heuteText, "Heute kommen Telegram-Nachrichten von 17:30 bis 02:30 (Folgetag).");
  // Samstag selbst hat keine eigene Öffnung
  assert.equal(heute(d, berlin("2026-09-26", "12:00")).heuteText, "Heute kommen keine Telegram-Nachrichten (geschlossen).");
});

test("4. Geschlossener Tag: kein Fenster", () => {
  const d = { oeffnungszeiten: [{ tage: "Dienstag – Sonntag", zeiten: "11:30 – 22:00" }, { tage: "Montag", zeiten: "Ruhetag" }] };
  // Montag, 28.09.2026
  for (const uhr of ["00:30", "11:00", "12:00", "20:00", "23:59"]) assert.equal(erlaubt(d, berlin("2026-09-28", uhr)), false, uhr);
  const u = heute(d, berlin("2026-09-28", "12:00"));
  assert.equal(u.heuteText, "Heute kommen keine Telegram-Nachrichten (geschlossen).");
  assert.equal(u.jetztText, "Jetzt: pausiert. Nächste Telegram-Nachrichten ab morgen 11:00 Uhr.");
});

test("5. Abweichende Öffnungszeit: Ausnahmen ersetzen den Wochenplan für diesen Tag", () => {
  const d = {
    oeffnungszeiten: [{ tage: "Dienstag – Sonntag", zeiten: "17:30 – 22:00" }, { tage: "Montag", zeiten: "Ruhetag" }],
    oeffnungsAusnahmen: [
      { tage: "28.09.2026", zeiten: "12:00 – 15:00" }, // Sonderöffnung an einem Ruhetag
      { tage: "24.12.", zeiten: "11:00 – 14:00" }, // jedes Jahr kürzer
      { tage: "25.12. – 26.12.", zeiten: "geschlossen" },
      { tage: "Silvester", zeiten: "bis spät" }, // nicht auswertbar
    ],
  };
  assert.equal(erlaubt(d, berlin("2026-09-28", "11:30")), true, "Sonderöffnung am Montag");
  assert.equal(erlaubt(d, berlin("2026-09-28", "17:00")), false);
  const heiligabend = (uhr) => new Date(`2026-12-24T${uhr}:00+01:00`);
  assert.equal(erlaubt(d, heiligabend("10:30")), true);
  assert.equal(erlaubt(d, heiligabend("17:30")), false, "Wochenplan gilt an diesem Tag nicht");
  assert.equal(erlaubt(d, new Date("2026-12-25T18:00:00+01:00")), false);
  assert.equal(erlaubt(d, new Date("2026-12-27T18:00:00+01:00")), true, "danach wieder normal");
  const r = benachrichtigungsFenster(d, STANDARD, { jetzt: berlin("2026-09-28", "09:00") });
  assert.deepEqual(r.ausnahmen.unlesbar, ["Silvester | bis spät"]);
  assert.ok(r.warnungen.some((w) => /Silvester/.test(w) && /nicht auswertbar/.test(w)));
  assert.ok(r.warnungen.some((w) => /Bestellformular kennt sie nicht/.test(w)), "ehrlicher Hinweis: Abholzeiten kennen keine Ausnahmen");
  assert.equal(heute(d, berlin("2026-09-28", "09:00")).tage[0].ausnahme, true);
});

test("5b. Ausnahmen: Bereiche über den Jahreswechsel, Jahreszahlen, halbe Zeilen werden nicht angewendet", () => {
  const a = ausnahmenAus([
    { tage: "23.12. – 02.01.", zeiten: "Betriebsurlaub" },
    { tage: "27.07.2026 bis 10.08.2026", zeiten: "geschlossen" },
    { tage: "Weihnachten 25. & 26.12.", zeiten: "zu" },
    { tage: "31.02.", zeiten: "zu" },
  ]);
  assert.ok(a.tage.has("12-31") && a.tage.has("01-02") && !a.tage.has("01-03"));
  assert.ok(a.tage.has("2026-08-10") && !a.tage.has("2027-08-10"));
  assert.equal(a.unlesbar.length, 2);
});

test("6. Wirt setzt Vorlauf und Nachlauf auf eigene Werte", () => {
  const d = betrieb("17:30 – 22:00");
  const e = { ...STANDARD, vorlaufMinuten: 60, nachlaufMinuten: 0 };
  assert.equal(erlaubt(d, berlin("2026-09-24", "16:30"), e), true);
  assert.equal(erlaubt(d, berlin("2026-09-24", "16:29"), e), false);
  assert.equal(erlaubt(d, berlin("2026-09-24", "22:00"), e), false);
  assert.equal(heute(d, berlin("2026-09-24", "12:00"), e).heuteText, "Heute kommen Telegram-Nachrichten von 16:30 bis 22:00.");
  // Validierung auf dem Server
  assert.deepEqual(pruefeTelegramEinstellungen({ vorlaufMinuten: "45", nachlaufMinuten: 15 }, STANDARD).vorlaufMinuten, 45);
  assert.throws(() => pruefeTelegramEinstellungen({ vorlaufMinuten: 181 }, STANDARD), /zwischen 0 und 180/);
  assert.throws(() => pruefeTelegramEinstellungen({ nachlaufMinuten: -5 }, STANDARD), /zwischen 0 und 180/);
  assert.throws(() => pruefeTelegramEinstellungen({ fristBestellungMinuten: 0 }, STANDARD), /zwischen 1 und 60/);
  assert.throws(() => pruefeTelegramEinstellungen({ fristReservierungMinuten: 2.5 }, STANDARD), /ganze Zahl/);
  assert.throws(() => pruefeTelegramEinstellungen({ zeitfenster: "immer" }, STANDARD));
  assert.throws(() => pruefeTelegramEinstellungen({ aktiv: "ja" }, STANDARD));
});

test("7. Rund-um-die-Uhr nur auf ausdrücklichen Wunsch – nie Voreinstellung, nie stiller Rückfall", () => {
  assert.equal(TELEGRAM_EINSTELLUNGEN_STANDARD.zeitfenster, "oeffnungszeiten");
  assert.equal(telegramEinstellungen({}).zeitfenster, "oeffnungszeiten");
  assert.equal(telegramEinstellungen({ telegramBenachrichtigung: { zeitfenster: "quatsch" } }).zeitfenster, "oeffnungszeiten");

  // Ohne Öffnungszeiten: keine scheinbare Rechnung, keine Freigabe, deutliche Warnung.
  const ohne = benachrichtigungsFenster({}, STANDARD, { jetzt: berlin("2026-09-24", "20:00") });
  assert.equal(ohne.zustand, "keine-oeffnungszeiten");
  assert.equal(ohne.jetztErlaubt, false);
  assert.equal(ohne.fenster.length, 0);
  assert.match(ohne.warnungen[0], /keine eigenen Öffnungszeiten/);
  const unlesbar = benachrichtigungsFenster({ oeffnungszeiten: [{ tage: "Mo", zeiten: "nach Vereinbarung" }] }, STANDARD, { jetzt: berlin("2026-09-24", "20:00") });
  assert.equal(unlesbar.zustand, "keine-oeffnungszeiten");

  const immer = { ...STANDARD, zeitfenster: "rund-um-die-uhr" };
  for (const uhr of ["03:00", "12:00", "23:59"]) assert.equal(erlaubt({}, berlin("2026-09-28", uhr), immer), true);
  assert.match(heute({}, berlin("2026-09-28", "03:00"), immer).heuteText, /rund um die Uhr/);
});

test("22. Zeitzone und Sommer-/Winterzeit: Fenster stimmen an den Umstellungstagen", () => {
  const samstagsNachts = { oeffnungszeiten: [{ tage: "Samstag", zeiten: "20:00 – 03:00" }] };
  // Herbst: Sonntag 25.10.2026 um 03:00 MESZ → 02:00 MEZ. Fenster Sa 19:30 MESZ bis So 03:30 MEZ = 9 Stunden.
  const herbst = benachrichtigungsFenster(samstagsNachts, STANDARD, { jetzt: new Date("2026-10-24T12:00:00+02:00") }).fenster.find((f) => f.tag === "2026-10-24");
  assert.equal(new Date(herbst.start).toISOString(), "2026-10-24T17:30:00.000Z");
  assert.equal(new Date(herbst.ende).toISOString(), "2026-10-25T02:30:00.000Z");
  assert.equal((herbst.ende - herbst.start) / 3_600_000, 9);
  assert.equal(erlaubt(samstagsNachts, new Date("2026-10-25T03:29:00+01:00")), true);
  assert.equal(erlaubt(samstagsNachts, new Date("2026-10-25T03:30:00+01:00")), false);
  // Frühjahr: Sonntag 29.03.2026 um 02:00 MEZ → 03:00 MESZ. Fenster Sa 19:30 MEZ bis So 03:30 MESZ = 7 Stunden.
  const fruehjahr = benachrichtigungsFenster(samstagsNachts, STANDARD, { jetzt: new Date("2026-03-28T12:00:00+01:00") }).fenster.find((f) => f.tag === "2026-03-28");
  assert.equal((fruehjahr.ende - fruehjahr.start) / 3_600_000, 7);
  assert.equal(erlaubt(samstagsNachts, new Date("2026-03-29T03:20:00+02:00")), true);
  assert.equal(erlaubt(samstagsNachts, new Date("2026-03-29T03:31:00+02:00")), false);
  // Andere Zeitzone des Betriebs: dieselbe Wanduhrzeit, anderer Zeitpunkt.
  const lissabon = { ...betrieb("17:30 – 22:00"), zeitzone: "Europe/Lisbon" };
  assert.equal(erlaubt(lissabon, new Date("2026-09-24T17:00:00+01:00")), true);
  assert.equal(erlaubt(lissabon, new Date("2026-09-24T17:00:00+02:00")), false, "17:00 Berlin = 16:00 Lissabon");
  assert.equal(heute(lissabon, new Date("2026-09-24T12:00:00+01:00")).zeitzone, "Europe/Lisbon");
});

test("Feiertage in den Öffnungszeiten: ehrlicher Hinweis statt stiller Annahme", () => {
  const d = { oeffnungszeiten: [{ tage: "Sonntag & Feiertage", zeiten: "11:30 – 21:00" }] };
  const r = benachrichtigungsFenster(d, STANDARD, { jetzt: berlin("2026-09-24", "12:00") });
  assert.ok(r.warnungen.some((w) => /Feiertage erkennt das System nicht automatisch/.test(w)));
});
