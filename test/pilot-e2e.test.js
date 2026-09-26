import { test, after } from "node:test";
import assert from "node:assert/strict";
import { starte, freierPort, resendAttrappe, telegramAttrappe, warteBis, starteWirtApp, cli, IMAGE } from "./hilfen/prozesse.js";
import { chmodSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";

// Pilot-Probelauf Ende zu Ende mit ECHT laufenden Prozessen (Chromium; ohne
// wird übersprungen):
//
//   Wirt-App     scripts/wirtStart.mjs als eigener Prozess, eigenes
//                Datenverzeichnis (wie das Fly-Volume), Passwort, Origin-Liste,
//                Telegram-Abruf und E-Mail-Versand im selben Prozess
//   Kundenseite  Veröffentlichungspaket des FIKTIVEN Testkunden („Trattoria
//                Probelauf“), ausgeliefert von einem statischen Server, der die
//                _headers des Pakets (CSP usw.) wie Cloudflare Pages anwendet
//   Resend       lokaler Test-Empfänger (RESEND_API_BASIS) – nichts geht raus
//   Telegram     lokaler Test-Bot-Server (TELEGRAM_API_BASIS) – nichts geht raus
//
// Keine echten Gast- oder Kundendaten: Namen, Nummern (000 …) und Adressen
// (…@example.com) sind synthetisch. Die Uhr der Wirt-App steht über
// test/hilfen/uhrVorlauf.mjs auf demselben Startzeitpunkt wie der Browser.

const SLUG = "pilot-e2e";
const PASSWORT = `probe-${randomBytes(9).toString("hex")}`;
const STATUS_GEHEIMNIS = randomBytes(36).toString("base64");
const BACKUP_SCHLUESSEL = randomBytes(32).toString("base64");
const RESEND_KEY = `re_lokal_${randomBytes(8).toString("hex")}`;
const TG_TOKEN = `424242:${randomBytes(12).toString("hex")}`;
const GEHEIMNISSE = [PASSWORT, STATUS_GEHEIMNIS, BACKUP_SCHLUESSEL, RESEND_KEY, TG_TOKEN];
const GAST_MAIL = "gast-probe@example.com";
const TG_CHAT = -4242;

const aufraeumen = [];
const temp = (name) => {
  const d = mkdtempSync(path.join(tmpdir(), name));
  aufraeumen.push(d);
  return d;
};
after(() => {
  for (const d of aufraeumen) rmSync(d, { recursive: true, force: true });
});

// Heute 15:00 UTC = 17:00 (Sommerzeit) bzw. 16:00 (Winterzeit) in Berlin –
// immer innerhalb der Öffnungszeiten 11–23 Uhr des Testkunden.
const START = new Date(`${new Date().toISOString().slice(0, 10)}T15:00:00Z`);
const berlin = (d, opt) => new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", ...opt }).format(d);
const HEUTE = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(START);
const minuten = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const START_MIN = minuten(berlin(START, { hour: "2-digit", minute: "2-digit" }));
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const TYPEN = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml" };

/** Statischer Host wie Cloudflare Pages: Dateien aus site/ und die Köpfe aus _headers. */
function statischerHost(site) {
  const koepfe = {};
  for (const zeile of readFileSync(path.join(site, "_headers"), "utf-8").split("\n")) {
    const m = /^\s+([A-Za-z-]+):\s*(.+)$/.exec(zeile);
    if (m) koepfe[m[1]] = m[2].trim();
  }
  return (req, res) => {
    const rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const pfad = path.join(site, rel);
    const datei = existsSync(pfad) && statSync(pfad).isDirectory() ? path.join(pfad, "index.html") : pfad;
    if (!datei.startsWith(site) || !existsSync(datei) || path.basename(datei) === "_headers") {
      res.writeHead(404, koepfe);
      res.end();
      return;
    }
    res.writeHead(200, { ...koepfe, "Content-Type": TYPEN[path.extname(datei)] ?? "application/octet-stream" });
    res.end(readFileSync(datei));
  };
}

const text = (loc) => loc.evaluate((el) => el.innerText.replace(/\s+/g, " ").trim());

test("Pilot-Probelauf: Paket → statischer Host → Bestellung/Reservierung → Dashboard, Mail, Telegram → Neustart → Sicherung und Wiederherstellung", { timeout: 300_000 }, async (t) => {
  const { starteBrowser } = await import("../v2/build/browser.js");
  const browser = await starteBrowser();
  if (!browser) {
    t.skip("kein Chromium verfügbar");
    return;
  }
  const log = [];
  const mails = [];
  const tg = telegramAttrappe(TG_TOKEN);
  const resend = await starte(resendAttrappe(mails));
  const telegram = await starte(tg.handler);
  const wirtPort = await freierPort();
  const WIRT = `http://127.0.0.1:${wirtPort}`;
  const kunden = temp("pilot-kunden-");
  const volume = temp("pilot-volume-");
  const backupZiel = temp("pilot-backup-");
  const restore = temp("pilot-restore-");
  // Im Container läuft die App als Benutzer "node": Sicherungsziel und
  // Wiederherstellungsordner müssen für ihn beschreibbar sein.
  if (IMAGE) for (const d of [backupZiel, restore]) chmodSync(d, 0o777);
  const ORT = IMAGE ? { daten: "/data", backup: "/backup", restore: "/restore" } : { daten: volume, backup: backupZiel, restore };
  const MOUNTS = [[volume, "/data"], [backupZiel, "/backup"], [restore, "/restore"]];
  let host = null;
  let wirtApp = null;
  let zweite = null;
  try {
    /* ---------- 1. Fiktiver Testkunde → freigegebenes Paket ---------- */
    const { legePilotTestkundenAn } = await import("../v2/integration/pilotTestkunde.js");
    const { erstellePaket } = await import("../v2/integration/kundenPaket.js");
    const id = await legePilotTestkundenAn({ betrieb: SLUG, apiUrl: WIRT, basis: kunden, zielDir: path.join(kunden, "bau") });
    const paket = await erstellePaket(id, { basis: kunden, zielDir: path.join(kunden, "pakete") });
    assert.deepEqual(paket.protokoll.fehler, []);
    host = await starte(statischerHost(paket.siteDir));
    const SEITE = host.url;

    const env = {
      BETRIEB: SLUG,
      WIRT_PASSWORT: PASSWORT,
      WIRT_OEFFENTLICHE_URL: WIRT,
      GAST_STATUS_GEHEIMNIS: STATUS_GEHEIMNIS,
      GASTRO_DATEN_DIR: ORT.daten,
      WIRT_PORT: String(wirtPort),
      DASHBOARD_HOST: "127.0.0.1",
      WIRT_ERLAUBTE_ORIGINS: SEITE,
      RESEND_API_KEY: RESEND_KEY,
      RESEND_API_BASIS: resend.url,
      GAST_EMAIL_ABSENDER: "Trattoria Probelauf <bestellung@example.com>",
      TELEGRAM_BOT_TOKEN: TG_TOKEN,
      TELEGRAM_BOT_NAME: "ProbelaufTestBot",
      TELEGRAM_API_BASIS: telegram.url,
      BACKUP_ZIEL: `datei:${ORT.backup}`,
      BACKUP_SCHLUESSEL,
      E2E_UHR_START: START.toISOString(),
      GIT_COMMIT: "e2e-probe",
    };
    wirtApp = await starteWirtApp(env, log, { mounts: MOUNTS });
    const auth = `Basic ${Buffer.from(`wirt:${PASSWORT}`).toString("base64")}`;
    const wirtApi = async (pfad, daten, kopf = {}) => {
      const a = await fetch(`${WIRT}${pfad}`, daten === undefined ? { headers: { Authorization: auth, ...kopf } } : { method: "POST", headers: { "Content-Type": "application/json", Authorization: auth, ...kopf }, body: JSON.stringify(daten) });
      return { status: a.status, daten: await a.json().catch(() => null) };
    };

    /* ---------- 2. Zugangsschutz der laufenden App ---------- */
    const gesund = await (await fetch(`${WIRT}/gesund`)).json();
    assert.equal(gesund.ok, true);
    assert.equal(gesund.version, "e2e-probe");
    assert.equal((await fetch(`${WIRT}/api/betrieb`)).status, 401, "Dashboard-Daten nur mit Anmeldung");
    assert.equal((await fetch(`${WIRT}/`)).status, 401, "Dashboard nur mit Anmeldung");
    assert.equal((await fetch(`${WIRT}/api/betrieb`, { headers: { Authorization: `Basic ${Buffer.from("wirt:falsch-falsch-falsch").toString("base64")}` } })).status, 401);
    assert.equal((await wirtApi("/api/tisch", { name: "Fremd", plaetze: 2 }, { Origin: "https://boese.example" })).status, 403, "Wirt-Aktion von fremder Seite");

    /* ---------- 3. Übergabe Agentur → Wirt-App (nur geprüftes Paket) ---------- */
    const uebergabe = JSON.parse(readFileSync(path.join(paket.paketDir, "wirt-uebergabe.json"), "utf-8"));
    const manipuliert = structuredClone(uebergabe);
    const [ersteId] = Object.keys(manipuliert.bestellkarte.katalog);
    manipuliert.bestellkarte.katalog[ersteId][1] = 0.01;
    const abgelehnt = await wirtApi("/intern/uebergabe", manipuliert);
    assert.equal(abgelehnt.status, 400);
    assert.match(abgelehnt.daten.fehler, /Prüfsumme/);
    const fremd = await wirtApi("/intern/uebergabe", { ...uebergabe, betrieb: "anderer-betrieb" });
    assert.equal(fremd.status, 400, "Paket für anderen Betrieb (Prüfsumme bzw. Betrieb passt nicht)");
    const ok = await wirtApi("/intern/uebergabe", uebergabe);
    assert.equal(ok.status, 200, JSON.stringify(ok.daten));
    assert.equal(ok.daten.gerichte, 13);
    const idVon = (name) => Object.entries(uebergabe.bestellkarte.katalog).find(([, g]) => g[0] === name)[0];
    const TAGLIATELLE = idVon("Tagliatelle al Ragù");
    const TIRAMISU = idVon("Tiramisù");

    // Wirt richtet ein: Tisch, Abholrabatt 10 %, 15 Minuten Zusatz-Wartezeit (Küche voll).
    assert.equal((await wirtApi("/api/tisch", { name: "Tisch 1", plaetze: 4 })).status, 200);
    const ende = new Date(START.getTime() + 3 * 86400000).toISOString().slice(0, 16);
    const rabatt = await wirtApi("/intern/rabattaktionen", { name: "Probewoche", art: "abholung", rabatt: { typ: "prozent", wert: 10 }, ende });
    assert.equal(rabatt.status, 200, JSON.stringify(rabatt.daten));
    assert.equal((await wirtApi("/intern/wartezeit", { minuten: 15 })).daten.zusaetzlicheWartezeitMinuten, 15);

    /* ---------- 4. Wirt verbindet Telegram im Dashboard (Browser) ---------- */
    const dashKontext = await browser.newContext({ httpCredentials: { username: "wirt", password: PASSWORT }, locale: "de-DE", timezoneId: "Europe/Berlin", viewport: { width: 1280, height: 1000 } });
    await dashKontext.clock.install({ time: START });
    const dash = await dashKontext.newPage();
    const dashFehler = [];
    dash.on("pageerror", (e) => dashFehler.push(e.message));
    await dash.goto(`${WIRT}/`, { waitUntil: "load" });
    await dash.locator('nav button[data-tab="telegram"]').click();
    await dash.locator('[data-tg-code="alle"]').click();
    const code = /\/start (\S+)/.exec(await text(dash.locator(".tg-code")))[1];
    tg.schicke({ message: { message_id: 1, chat: { id: TG_CHAT, type: "group" }, text: `/start@ProbelaufTestBot ${code}` } });
    await warteBis(() => tg.gesendet.find((n) => String(n.chat_id) === String(TG_CHAT) && /^Verbunden mit „Trattoria Probelauf“/.test(n.text)), { was: "Telegram verbunden" });

    /* ---------- 5. Gast auf der statischen Seite (CSP aktiv) ---------- */
    const gastKontext = await browser.newContext({ locale: "de-DE", timezoneId: "Europe/Berlin", reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
    await gastKontext.clock.install({ time: START });
    const gast = await gastKontext.newPage();
    const gastFehler = [];
    gast.on("pageerror", (e) => gastFehler.push(e.message));
    gast.on("console", (m) => {
      if (m.type() === "error" && /Content Security Policy|Refused to/.test(m.text())) gastFehler.push(m.text());
    });
    const startseite = await gast.goto(`${SEITE}/`, { waitUntil: "networkidle" });
    assert.match(startseite.headers()["content-security-policy"], new RegExp(`connect-src ${WIRT.replace(/[.]/g, "\\.")}`), "CSP aus _headers aktiv");
    assert.match(await gast.title(), /Trattoria Probelauf/);
    assert.equal(await gast.locator("text=Platzhalter").count(), 0);
    assert.ok(await gast.evaluate(() => [...document.fonts].some((f) => f.status === "loaded")), "lokale Schriften geladen");

    // Handy: eigenes Hochformat-Bild, kein seitliches Scrollen.
    const handy = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce", locale: "de-DE" });
    const ht = await handy.newPage();
    const bilder = [];
    ht.on("requestfinished", (r) => bilder.push(new URL(r.url()).pathname));
    await ht.goto(`${SEITE}/`, { waitUntil: "networkidle" });
    assert.ok(bilder.includes("/medien/heroMobil.png"), bilder.filter((b) => b.startsWith("/medien/")).join());
    assert.ok(await ht.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "kein seitlicher Überlauf");
    await handy.close();

    // Rechtstexte kommen live von der Wirt-App (dort freigegeben), nicht aus dem Paket.
    const rechtslinks = await gast.locator('a[href*="/rechtstexte/"]').evaluateAll((els) => [...new Set(els.map((a) => a.href))]);
    assert.ok(rechtslinks.length >= 2, rechtslinks.join());
    for (const link of rechtslinks) {
      assert.ok(link.startsWith(`${WIRT}/rechtstexte/`), link);
      assert.equal((await fetch(link)).status, 200, link);
    }

    await gast.goto(`${SEITE}/speisekarte/`, { waitUntil: "networkidle" });
    await gast.locator(`[data-preis-fuer="${TIRAMISU}"].preis--aktion, #gericht-${TIRAMISU} .preis--aktion`).first().waitFor();
    assert.match(await text(gast.locator(`#gericht-${TIRAMISU} .preis`).first()), /^6,75 € statt 7,50 €$/, "Rabatt live vom Server");

    await gast.locator(`main [data-add="${TAGLIATELLE}"]`).click();
    await gast.locator("#cart-fab").click();
    await gast.locator("#drawer.open").waitFor();
    await gast.locator("#passt-dazu").waitFor({ state: "visible" });
    assert.ok((await gast.locator("#passt-dazu [data-passt-slot]:visible").count()) >= 1, "„Passt gut dazu“ zeigt Vorschläge");
    const vorschlag = gast.locator("#passt-dazu [data-passt-slot]:visible").first();
    const vorschlagName = (await vorschlag.locator("[data-passt=name]").textContent()).trim();
    await vorschlag.getByRole("button").first().click();
    await gast.locator("#passt-dazu-status").filter({ hasText: "liegt jetzt im Warenkorb" }).waitFor();
    assert.match((await gast.locator(".cart-line-name").allTextContents()).join("|"), new RegExp(vorschlagName.replace(/[()]/g, ".")));

    // Abholzeiten: Öffnungszeiten aus der Übergabe + 15 Minuten Zusatz-Wartezeit.
    await gast.waitForFunction(() => document.querySelectorAll("#ord-abholzeit option").length > 2);
    const zeiten = (await gast.locator("#ord-abholzeit option").allTextContents()).map((z) => /(\d\d:\d\d)/.exec(z)?.[1]).filter(Boolean);
    assert.ok(zeiten.length > 3, zeiten.join());
    assert.ok(minuten(zeiten[0]) >= START_MIN + 20 + 15, `früheste Abholzeit ${zeiten[0]} berücksichtigt die Wartezeit (Start ${hhmm(START_MIN)})`);
    assert.ok(minuten(zeiten.at(-1)) <= minuten("23:00"), "nicht nach Ladenschluss");
    const wunsch = zeiten[2];
    await gast.locator("#ord-abholzeit").selectOption({ index: [...(await gast.locator("#ord-abholzeit option").allTextContents())].findIndex((z) => z.includes(wunsch)) });
    await gast.locator("#ord-name").fill("Probe Gast");
    await gast.locator("#ord-telefon").fill("000 0000001");
    await gast.locator("#ord-email").fill(GAST_MAIL);
    const anfrage = gast.waitForRequest((r) => r.url() === `${WIRT}/oeffentlich/bestellung` && r.method() === "POST");
    await gast.locator("#order-submit").click();
    const bestellKoerper = JSON.parse((await anfrage).postData());
    await gast.locator("#confirm-title").filter({ hasText: "Bestellung eingegangen" }).waitFor({ timeout: 8000 });
    const statusLink = await gast.locator("#confirm-status").getAttribute("href");
    assert.ok(statusLink.startsWith(`${WIRT}/status#`), statusLink);
    await gast.locator("#confirm-close").click();

    let stand = (await wirtApi("/api/betrieb")).daten;
    assert.equal(stand.bestellungen.length, 1);
    const bestellung = stand.bestellungen[0];
    assert.equal(bestellung.name, "Probe Gast");
    assert.equal(bestellung.abholzeit.includes(wunsch), true, `${bestellung.abholzeit} ~ ${wunsch}`);
    assert.ok(bestellung.positionen.every((p) => p.aktion?.name === "Probewoche"), "Rabatt serverseitig angewandt");

    // Eingangsmail (lokaler Test-Empfänger) und Telegram-Meldung mit Knöpfen.
    await warteBis(() => mails.some((m) => m.to?.[0] === GAST_MAIL), { was: "Eingangsmail" });
    assert.equal(mails[0].auth, `Bearer ${RESEND_KEY}`);
    assert.equal(mails[0].from, "Trattoria Probelauf <bestellung@example.com>");
    assert.match(mails[0].subject, /^Bestellung eingegangen/);
    assert.ok(mails[0].text.includes(statusLink), "Mail verlinkt die Statusseite");
    const tgBestellung = await warteBis(() => tg.gesendet.find((n) => String(n.chat_id) === String(TG_CHAT) && n.reply_markup?.inline_keyboard?.flat().some((k) => k.callback_data === `b:zub:${bestellung.id}`)), { was: `Telegram-Meldung zur Bestellung\n${JSON.stringify(tg.gesendet, null, 1)}\n${log.join("")}` });
    assert.match(tgBestellung.text, /Bestellung/);
    assert.ok(!tgBestellung.text.includes("000 0000001"), "keine Telefonnummer im Telegram-Chat");

    /* ---------- 6. Wirt bestätigt im Dashboard mit späterer Zeit, meldet dann Verzögerung ---------- */
    await dash.reload({ waitUntil: "load" });
    await dash.locator('nav button[data-tab="bestellungen"]').click().catch(() => {});
    const karte = dash.locator(".karte", { hasText: bestellung.nummer });
    await karte.waitFor();
    const zugesagt = hhmm(minuten(wunsch) + 15);
    await karte.locator(".abhol-zeit").fill(zugesagt);
    await karte.locator(`[data-bestaetigen="${bestellung.id}"]`).click();
    await karte.locator(".marke.bestaetigt").waitFor();
    const spaeter = hhmm(minuten(zugesagt) + 20);
    await karte.locator(".verzoegerung-zeit").fill(spaeter);
    await karte.locator(".verzoegerung-grund").fill("Ofen voll (Probelauf)");
    await karte.locator(`[data-verzoegerung="${bestellung.id}"]`).click();
    await warteBis(() => mails.filter((m) => m.to?.[0] === GAST_MAIL).length >= 3, { was: "Mails zu Bestätigung und Verzögerung" });

    // Gast öffnet den Status-Link (Seite der Wirt-App) und sieht den neuen Stand.
    const status = await gastKontext.newPage();
    await status.goto(statusLink);
    await status.waitForFunction((z) => document.getElementById("angaben")?.textContent.includes(z), spaeter, { timeout: 8000 }).catch(async (e) => {
      throw new Error(`${e.message}\nerwartet ${spaeter}\n${await status.locator("body").innerText()}\n${JSON.stringify(mails.map((m) => [m.subject, m.text]), null, 1)}`);
    });
    assert.match(await status.locator("#titel").textContent(), /Bestätigt/);
    assert.match(await status.locator("#geaendert").textContent(), /Ofen voll \(Probelauf\)/);
    assert.ok(!(await status.content()).includes("Probe Gast"), "kein Name auf der Statusseite");

    /* ---------- 7. Reservierung auf der Seite → Bestätigung per Telegram-Knopf ---------- */
    await gast.goto(`${SEITE}/#reservierung`, { waitUntil: "networkidle" });
    await gast.locator("#res-datum").fill(HEUTE);
    await gast.locator("#res-datum").dispatchEvent("change");
    await gast.locator("#res-uhrzeit").selectOption("20:00");
    await gast.locator("#res-personen").selectOption({ index: 1 });
    await gast.locator("#res-name").fill("Probe Gast");
    await gast.locator("#res-telefon").fill("000 0000001");
    await gast.locator("#res-email").fill(GAST_MAIL);
    await gast.locator("#reservation-form button[type=submit]").click();
    await gast.locator("#confirm-title").filter({ hasText: "Anfrage eingegangen" }).waitFor({ timeout: 8000 });
    const resLink = await gast.locator("#confirm-status").getAttribute("href");
    stand = (await wirtApi("/api/betrieb")).daten;
    const reservierung = stand.reservierungen.find((r) => r.name === "Probe Gast");
    assert.ok(reservierung, "Reservierung gespeichert");
    const tgRes = await warteBis(() => tg.gesendet.find((n) => String(n.chat_id) === String(TG_CHAT) && n.reply_markup?.inline_keyboard?.flat().some((k) => k.callback_data === `r:ok:${reservierung.id}`)), { was: "Telegram-Meldung zur Reservierung" });
    // Falscher Chat drückt einen Knopf: verweigert, nichts ändert sich.
    tg.schicke({ callback_query: { id: "fremd", data: `r:ok:${reservierung.id}`, message: { chat: { id: 999 }, message_id: tgRes.message_id } } });
    await warteBis(() => tg.gesendet.find((n) => n.methode === "answerCallbackQuery" && n.callback_query_id === "fremd"), { was: "Quittung fremder Chat" });
    assert.equal((await wirtApi("/api/betrieb")).daten.reservierungen.find((r) => r.id === reservierung.id).status, "neu");
    tg.schicke({ callback_query: { id: "knopf-1", data: `r:ok:${reservierung.id}`, message: { chat: { id: TG_CHAT }, message_id: tgRes.message_id } } });
    const quittung = await warteBis(() => tg.gesendet.find((n) => n.methode === "answerCallbackQuery" && n.callback_query_id === "knopf-1"), { was: "Quittung Knopf" });
    assert.equal(quittung.text, "Erledigt");
    assert.equal((await wirtApi("/api/betrieb")).daten.reservierungen.find((r) => r.id === reservierung.id).status, "bestaetigt");
    await warteBis(() => mails.some((m) => m.to?.[0] === GAST_MAIL && /^Reservierung bestätigt/.test(m.subject)), { was: "Mail Reservierung bestätigt" });
    await status.goto(resLink);
    await status.waitForFunction(() => /bestätigt/i.test(document.getElementById("titel")?.textContent ?? ""));

    /* ---------- 8. Manipulationsversuche gegen die laufende App ---------- */
    const oeffentlich = (pfad, daten, kopf = {}) => fetch(`${WIRT}${pfad}`, { method: "POST", headers: { "Content-Type": "application/json", ...kopf }, body: JSON.stringify(daten) });
    // Andere Website schickt eine Bestellung: abgewiesen, keine CORS-Freigabe.
    const fremdeSeite = await oeffentlich("/oeffentlich/bestellung", bestellKoerper, { Origin: "https://boese.example" });
    assert.equal(fremdeSeite.status, 403);
    assert.equal(fremdeSeite.headers.get("access-control-allow-origin"), null);
    // Eigene Seite bekommt ihre Origin zurück.
    const preise = await fetch(`${WIRT}/oeffentlich/preise`, { method: "POST", headers: { Origin: SEITE, "Content-Type": "application/json" }, body: "{}" });
    assert.equal(preise.headers.get("access-control-allow-origin"), SEITE);
    // Gefälschter Preis: der Server rechnet selbst und nimmt nichts zu 1 Cent an.
    const gefaelscht = structuredClone(bestellKoerper);
    for (const p of gefaelscht.positionen) p.preis = 0.01;
    gefaelscht.erwarteterBetragCent = 2;
    const falschpreis = await (await oeffentlich("/oeffentlich/bestellung", gefaelscht, { Origin: SEITE })).json();
    assert.equal(falschpreis.ok, false);
    assert.match(falschpreis.fehler, /Preis für „Tagliatelle al Ragù“ hat sich geändert \(jetzt 14,90 €\)/);
    const nachher = (await wirtApi("/api/betrieb")).daten.bestellungen;
    assert.equal(nachher.length, 1, "keine Bestellung zum gefälschten Preis");
    // Unbekanntes Gericht.
    const unbekannt = structuredClone(bestellKoerper);
    unbekannt.positionen[0].id = "g-gibtesnicht";
    assert.equal((await oeffentlich("/oeffentlich/bestellung", unbekannt, { Origin: SEITE })).status, 400);
    // Veränderter Status-Link.
    const token = statusLink.split("#")[1];
    const falsch = await oeffentlich("/oeffentlich/status", { token: `${token.slice(0, -2)}xx` }, { Origin: SEITE });
    assert.equal(falsch.status, 404);
    // Übergabe ohne Anmeldung.
    assert.equal((await oeffentlich("/intern/uebergabe", uebergabe)).status, 401);

    /* ---------- 9. Neustart: alles bleibt (Volume) ---------- */
    const vorNeustart = (await wirtApi("/api/betrieb")).daten;
    assert.equal(await wirtApp.stop(), 0, "sauberes Beenden auf SIGTERM");
    wirtApp = await starteWirtApp(env, log, { mounts: MOUNTS });
    const nachNeustart = (await wirtApi("/api/betrieb")).daten;
    const kern = (d) => ({
      res: d.reservierungen.map((r) => [r.id, r.status, r.datum, r.uhrzeit]),
      best: d.bestellungen.map((b) => [b.id, b.status, b.gesamt, b.bestaetigteAbholzeit]),
      tische: d.tische.map((x) => x.name),
    });
    assert.deepEqual(kern(nachNeustart), kern(vorNeustart));
    await status.goto(statusLink);
    await status.waitForFunction((z) => document.getElementById("angaben")?.textContent.includes(z), spaeter);
    await gast.goto(`${SEITE}/speisekarte/`, { waitUntil: "networkidle" });
    await gast.locator(`#gericht-${TIRAMISU} .preis--aktion`).first().waitFor();

    // Keine Secrets in dem, was Browser zu sehen bekommen (Dashboard, APIs, Seite).
    const sichtbar = [];
    for (const pfad of ["/", "/api/betrieb", "/v2/api/telegram", "/api/telegram/benachrichtigung", "/api/rabattaktionen", "/gesund", "/status", "/sw.js"]) {
      sichtbar.push(await (await fetch(`${WIRT}${pfad}`, { headers: { Authorization: auth } })).text());
    }
    for (const datei of readdirSync(paket.siteDir, { recursive: true })) {
      const voll = path.join(paket.siteDir, datei);
      if (statSync(voll).isFile()) sichtbar.push(readFileSync(voll, "latin1"));
    }
    for (const g of GEHEIMNISSE) assert.ok(!sichtbar.some((x) => x.includes(g)), "Secret in Antwort oder Seite");

    /* ---------- 10. Verschlüsselte Sicherung, Probe, echte Wiederherstellung ---------- */
    const erstellt = await cli(wirtApp, "wirtSicherung.mjs", ["erstellen"], log);
    assert.equal(erstellt.code, 0, erstellt.aus);
    assert.match(erstellt.aus, new RegExp(`${SLUG}: 1 Reservierungen, \\d+ Bestellungen, 1 Rabattaktionen`));
    // Im Container als root aufgerufen (wie fly ssh console) – die Dateien gehören trotzdem der App.
    if (IMAGE) assert.equal(statSync(path.join(volume, "sicherung", "stand.json")).uid, statSync(path.join(volume, "betrieb", `${SLUG}.json`)).uid);
    const [datei] = readdirSync(backupZiel);
    assert.match(datei, /^gastro-wirt-pilot-e2e-.*\.gbk$/);
    const roh = readFileSync(path.join(backupZiel, datei));
    for (const klartext of ["Probe Gast", GAST_MAIL, "000 0000001", "Tagliatelle"]) assert.ok(!roh.includes(klartext), `Sicherung enthält „${klartext}“ nicht im Klartext`);
    const probe = await cli(wirtApp, "wirtSicherung.mjs", ["probe"], log);
    assert.equal(probe.code, 0, probe.aus);
    const hergestellt = await cli(wirtApp, "wirtSicherung.mjs", ["wiederherstellen", "--ziel", `${ORT.restore}/volume`], log);
    assert.equal(hergestellt.code, 0, hergestellt.aus);
    // Falscher Schlüssel: keine Wiederherstellung.
    const falscherSchluessel = await cli(wirtApp, "wirtSicherung.mjs", ["wiederherstellen", "--ziel", `${ORT.restore}/falsch`], log, { BACKUP_SCHLUESSEL: randomBytes(32).toString("base64") });
    assert.match(falscherSchluessel.aus, /Entschlüsseln fehlgeschlagen/);
    assert.ok(!existsSync(path.join(restore, "falsch", "betrieb")), "nichts halb wiederhergestellt");
    assert.notEqual(falscherSchluessel.code, 0);

    // Zweite, unabhängige Wirt-App auf den wiederhergestellten Daten.
    const port2 = await freierPort();
    const WIRT2 = `http://127.0.0.1:${port2}`;
    zweite = await starteWirtApp({ ...env, GASTRO_DATEN_DIR: ORT.daten, WIRT_PORT: String(port2), WIRT_OEFFENTLICHE_URL: WIRT2, TELEGRAM_BOT_TOKEN: "", BACKUP_ZIEL: "" }, log, {
      mounts: [[path.join(restore, "volume"), "/data"]],
    });
    const holen = async (basis, pfad) => (await fetch(`${basis}${pfad}`, { headers: { Authorization: auth } })).json();
    const live = await holen(WIRT, "/api/betrieb");
    const zurueck = await holen(WIRT2, "/api/betrieb");
    assert.deepEqual(kern(zurueck), kern(live), "Reservierungen, Bestellungen, Status, Tische");
    assert.deepEqual((await holen(WIRT2, "/api/rabattaktionen")).aktionen.map((a) => [a.id, a.name, a.status]), (await holen(WIRT, "/api/rabattaktionen")).aktionen.map((a) => [a.id, a.name, a.status]));
    const tgZurueck = await holen(WIRT2, "/v2/api/telegram");
    assert.equal(tgZurueck.kanaele.gemeinsam.verbunden, true, "Telegram-Verknüpfung wiederhergestellt");
    assert.deepEqual(tgZurueck.kanaele, (await holen(WIRT, "/v2/api/telegram")).kanaele);
    assert.deepEqual((await holen(WIRT2, "/api/telegram/benachrichtigung")).einstellungen, (await holen(WIRT, "/api/telegram/benachrichtigung")).einstellungen);
    assert.deepEqual(zurueck.zusaetzlicheWartezeitMinuten ?? null, live.zusaetzlicheWartezeitMinuten ?? null);
    // Der Status-Link des Gastes gilt auch auf den wiederhergestellten Daten.
    const s2 = await (await fetch(`${WIRT2}/oeffentlich/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })).json();
    assert.equal(s2.ok, true);
    assert.equal(await zweite.stop(), 0);
    zweite = null;

    assert.deepEqual(gastFehler, [], "keine Skript- oder CSP-Fehler auf der Kundenseite");
    assert.deepEqual(dashFehler, []);
    await gastKontext.close();
    await dashKontext.close();
  } finally {
    await browser.close();
    if (zweite) await zweite.stop();
    if (wirtApp) await wirtApp.stop();
    for (const s of [resend, telegram, host]) s?.server.close();
  }
  // Keine Secrets in Protokollen (Wirt-App, Sicherung) – nur Namen.
  const alles = log.join("");
  for (const g of GEHEIMNISSE) assert.ok(!alles.includes(g), "Secret im Protokoll");
  if (IMAGE) assert.match(alles, /Wirt-App für „pilot-e2e“ auf [\d.]+:\d+ · Daten \/data/, "lief wirklich im Container");
});
