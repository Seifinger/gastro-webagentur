import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { starte, freierPort, telegramAttrappe, warteBis, starteWirtApp } from "./hilfen/prozesse.js";

// Betrieb A kann keine Daten von Betrieb B abrufen oder ändern – geprüft an
// einer ECHT gestarteten Wirt-App für A. Im Pilot hat jede Wirt-App ohnehin
// ihr eigenes Volume; hier liegen absichtlich beide Betriebe im selben
// Datenordner, damit auch ein versehentlich mitkopierter Betrieb nicht
// erreichbar wird. Nur synthetische Daten.

const DATEN = mkdtempSync(path.join(tmpdir(), "trennung-"));
process.env.GASTRO_DATEN_DIR = DATEN;
process.env.GAST_STATUS_GEHEIMNIS = randomBytes(36).toString("base64");
const A = "pilot-a";
const B = "pilot-b";
process.env.BETRIEB = A;

const store = await import("../src/betriebStore.js");
const { verpackeUebergabe } = await import("../src/wirtUebergabe.js");

after(() => rmSync(DATEN, { recursive: true, force: true }));

test("Wirt-App für A: keine Vorgänge, Status-Links, Übergaben oder Telegram-Knöpfe von B", { timeout: 60_000 }, async () => {
  const morgen = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  for (const [slug, name, chat] of [[A, "Gast Alpha", "111"], [B, "Gast Beta", "222"]]) {
    store.speichereBetrieb(slug, { tische: [], reservierungen: [], bestellungen: [], anzeigeName: `Haus ${slug}`, telegramChatId: chat });
    store.legeTischAn(slug, { name: "Tisch 1", plaetze: 4 });
    store.legeReservierungAn(slug, { datum: morgen, uhrzeit: "19:00", personen: 2, name, telefon: "000 000", email: "" });
  }
  const resB = store.ladeBetrieb(B).reservierungen[0];
  const resA = store.ladeBetrieb(A).reservierungen[0];
  const tokenA = store.gastTokenFuer(A, "reservierung", resA);
  const tokenB = store.gastTokenFuer(B, "reservierung", resB);

  const token = `777000:${randomBytes(8).toString("hex")}`;
  const tg = telegramAttrappe(token);
  const telegram = await starte(tg.handler);
  const port = await freierPort();
  const WIRT = `http://127.0.0.1:${port}`;
  const passwort = `trennung-${randomBytes(8).toString("hex")}`;
  const log = [];
  const app = await starteWirtApp({
    BETRIEB: A,
    WIRT_PASSWORT: passwort,
    WIRT_OEFFENTLICHE_URL: WIRT,
    GAST_STATUS_GEHEIMNIS: process.env.GAST_STATUS_GEHEIMNIS,
    GASTRO_DATEN_DIR: DATEN,
    WIRT_PORT: String(port),
    DASHBOARD_HOST: "127.0.0.1",
    TELEGRAM_BOT_TOKEN: token,
    TELEGRAM_API_BASIS: telegram.url,
  }, log);
  const auth = { Authorization: `Basic ${Buffer.from(`wirt:${passwort}`).toString("base64")}` };
  const post = (pfad, daten, kopf = {}) => fetch(`${WIRT}${pfad}`, { method: "POST", headers: { "Content-Type": "application/json", ...kopf }, body: JSON.stringify(daten) });
  try {
    // Dashboard-Daten: nur A.
    const stand = await (await fetch(`${WIRT}/api/betrieb`, { headers: auth })).json();
    assert.deepEqual(stand.reservierungen.map((r) => r.name), ["Gast Alpha"]);
    // Wirt-Aktion mit der ID eines Vorgangs von B: nichts zu finden, B bleibt unverändert.
    const fremd = await post("/api/reservierung/status", { id: resB.id, status: "abgesagt" }, auth);
    assert.notEqual(fremd.status, 200);
    assert.equal(store.ladeBetrieb(B).reservierungen[0].status, "neu");
    // Status-Link von B gilt bei A nicht, der von A schon.
    assert.equal((await post("/oeffentlich/status", { token: tokenB })).status, 404);
    assert.equal((await post("/oeffentlich/status", { token: tokenA })).status, 200);
    // Übergabe-Paket für B wird von A abgelehnt.
    const paket = verpackeUebergabe({
      betrieb: B,
      kunde: "k-test",
      inhaltHash: "0".repeat(64),
      freigabe: { zeitpunkt: new Date().toISOString(), von: "Test" },
      bestellkarte: { katalog: { "g-1": ["Probe", 5] }, produkte: [] },
      oeffnungszeiten: [{ tage: "Mo–So", zeiten: "11:00–22:00" }],
      gastKontakt: { anzeigeName: "Haus B", telefon: "000" },
    });
    const uebergabe = await post("/intern/uebergabe", paket, auth);
    assert.equal(uebergabe.status, 400);
    assert.match((await uebergabe.json()).fehler, /für den Betrieb „pilot-b“ bestimmt/);
    // Telegram: Der Chat von B drückt einen Knopf für B – die App von A bedient B nicht.
    tg.schicke({ callback_query: { id: "b-knopf", data: `r:ok:${resB.id}`, message: { chat: { id: 222 }, message_id: 5 } } });
    const quittung = await warteBis(() => tg.gesendet.find((n) => n.methode === "answerCallbackQuery" && n.callback_query_id === "b-knopf"), { was: "Quittung" });
    assert.match(quittung.text, /mit keinem Betrieb verbunden/);
    assert.equal(store.ladeBetrieb(B).reservierungen[0].status, "neu");
    // Der Chat von A bestätigt seine eigene Reservierung.
    tg.schicke({ callback_query: { id: "a-knopf", data: `r:ok:${resA.id}`, message: { chat: { id: 111 }, message_id: 6 } } });
    assert.equal((await warteBis(() => tg.gesendet.find((n) => n.callback_query_id === "a-knopf"), { was: "Quittung A" })).text, "Erledigt");
    assert.equal(store.ladeBetrieb(A).reservierungen[0].status, "bestaetigt");
  } finally {
    assert.equal(await app.stop(), 0);
    telegram.server.close();
  }
  assert.ok(!log.join("").includes(passwort), "kein Passwort im Protokoll");
});
