// Wirt-Server mit v2-Anbindung – eine dünne Hülle um src/wirtServer.js.
//
// Alle Endpunkte von v1 (Reservierung, Bestellung, Tischplan, No-Show,
// Push, Wartezeit …) laufen unverändert durch den v1-Handler. Die Hülle
// ergänzt nur:
//
//   1. das Wirt-Dashboard im Designsystem des Betriebs (Farben, Schriften,
//      Radien, Abstände aus v2/designsysteme/<kueche>--<stimmung>.json),
//      eingespielt über public/wirt.html, ohne die Datei zu ändern
//   2. Telegram-Meldung nach jeder erfolgreichen öffentlichen Anfrage
//      (Reservierung, Bestellung, Stornierung – nur in den Telegram-Zeiten,
//      sonst zum Nachmelden vorgemerkt, telegramPlaner.js) sowie Chat-Modus,
//      Verknüpfung per Code je Kanal, Testnachricht und Trennen für den
//      Reiter „Telegram“ in public/wirt.html
//   3. den Küchenstatus (Neu → In Zubereitung → Bereit) als API
//
//   npm run v2:wirt -- --betrieb <slug> [--kueche k --stimmung s] [--telegram] [--port 3200]

import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ladeDesignsystem } from "../build/designsystemGenerator.js";
import { schriftCss } from "../build/schriften.js";
import { FONTS_DIR } from "../build/siteBuilder.js";
import {
  ladeBetriebV2,
  setzeBetriebsDesign,
  erzeugeVerknuepfungscode,
  telegramStatus,
  setzeTagesuebersicht,
  trenneKanal,
  uebernimmBisherigenChat,
  setzeKuechenStatus,
  KANAL_NAME,
} from "./wirtAdapter.js";
import { benachrichtige, telegramKonfiguriert, starteDienst } from "./telegramBot.js";
import { api, testNachricht } from "./telegramNachrichten.js";
import { ladeBetrieb } from "../../src/betriebStore.js";
import { zielFuer, telegramEinstellungen, botName, botToken, GRUND_TEXT } from "../../src/telegramRegeln.js";
import { stelleGastMeldungenZu } from "../../src/kundenBenachrichtigung.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WIRT_HTML = path.join(__dirname, "..", "..", "public", "wirt.html");

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

/**
 * Bildet das Designsystem des Betriebs auf die Variablen von wirt.html ab.
 * wirt.html arbeitet mit --bg/--card/--surface-2/--line/--text/--muted/
 * --accent/--accent-dark/--danger – dieselben Rollen wie im Designsystem,
 * nur anders benannt. Die Kontraste sind im Designsystem geprüft
 * (textLeise auf flaeche, aufAkzent auf akzent …), also halten sie hier auch.
 */
export function wirtThemeCss(ds, { fontsPfad = "/v2/assets/fonts", fontsDir = FONTS_DIR } = {}) {
  const r = ds.farben.rollen;
  const t = ds.typografie;
  const familien = [t.display.familie, t.text.familie];
  return `${schriftCss(familien, fontsDir, fontsPfad)}
:root {
  --bg: ${r.grund.hex}; --card: ${r.flaeche.hex}; --surface-2: ${r.flaecheTief.hex};
  --line: ${r.linie.hex}; --text: ${r.text.hex}; --muted: ${r.textLeise.hex};
  --accent: ${r.akzent.hex}; --accent-dark: ${r.akzentTief.hex}; --auf-akzent: ${r.aufAkzent.hex};
  --danger: ${r.fehler.hex};
  --radius: ${ds.radius.karte}px; --radius-sm: ${ds.radius.knopf}px; --radius-lg: ${ds.radius.karte + 8}px;
  --shadow-soft: ${ds.schatten.karte}; --shadow-card: ${ds.schatten.karte};
  --transition-fast: ${ds.motion.dauerMs.kurz}ms ease; --transition-base: ${ds.motion.dauerMs.mittel}ms ${ds.motion.kurve};
  --f-display: ${t.display.stapel}; --f-text: ${t.text.stapel};
}
body { font-family: var(--f-text); font-size: ${ds.typografie.skala.basisPx}px; }
h1, h2, h3 { font-family: var(--f-display); font-weight: ${t.display.gewicht}; text-transform: ${t.display.versalien ? "uppercase" : "none"}; letter-spacing: ${t.display.sperrung}; }
h1 { font-size: ${Math.round(ds.typografie.skala.stufen.h3.px)}px; }
input, select, textarea { border-color: ${r.linieStark.hex}; }
.knopf { color: var(--auf-akzent); border-radius: var(--radius-sm); }
.knopf.stumm { border-color: ${r.linieStark.hex}; }
label { color: var(--muted); }
.pill { border-color: ${r.linieStark.hex}; }
.v2-hinweis { font-size: .85rem; color: var(--muted); }
.v2-code { font-family: ${t.display.stapel}; font-size: 1.6rem; letter-spacing: .2em; color: var(--text); }`;
}

// Das Wirt-Dashboard (public/wirt.html) hat einen Reiter „Telegram“. Die
// Chat-Verknüpfung per Code, der Modus und die Testnachricht brauchen den Bot
// und gibt es deshalb nur hier; die Hülle meldet das der Seite.
const V2_MARKER = '<script>window.wirtV2 = { telegram: true };</script>';

export function themeWirtHtml(html, ds) {
  const style = ds ? `<style id="v2-betriebs-theme">\n${wirtThemeCss(ds)}\n</style>\n` : "";
  return html.replace("</head>", `${style}${V2_MARKER}\n</head>`);
}

/* ------------------------------------------------------------------ */
/* Handler                                                             */
/* ------------------------------------------------------------------ */

function json(res, status, daten) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(daten));
}

function koerper(req) {
  return new Promise((resolve, reject) => {
    let roh = "";
    req.on("data", (t) => {
      roh += t;
      if (roh.length > 20_000) reject(new Error("Anfrage zu groß"));
    });
    req.on("end", () => {
      try {
        resolve(roh ? JSON.parse(roh) : {});
      } catch {
        reject(new Error("Ungültige Daten"));
      }
    });
    req.on("error", reject);
  });
}

/** Schneidet mit, was der v1-Handler antwortet – für den Telegram-Push danach. */
function mitschneiden(res) {
  const teile = [];
  let status = 200;
  const writeHead = res.writeHead.bind(res);
  const end = res.end.bind(res);
  res.writeHead = (s, ...rest) => {
    status = s;
    return writeHead(s, ...rest);
  };
  res.end = (chunk, ...rest) => {
    if (chunk) teile.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    return end(chunk, ...rest);
  };
  return () => {
    try {
      return { status, daten: JSON.parse(Buffer.concat(teile).toString("utf-8")) };
    } catch {
      return { status, daten: null };
    }
  };
}

const STORNO = /^\/oeffentlich\/bestellung\/([^/]+)\/stornieren$/;

function kanalAus(eingabe) {
  const kanal = eingabe?.kanal ?? "alle";
  if (!["alle", "reservierung", "bestellung"].includes(kanal)) throw new Error("Unbekannter Kanal.");
  return kanal;
}

/**
 * Baut den Handler. `slug` muss dem Betrieb entsprechen, den der v1-Handler
 * bedient (v1 liest ihn einmalig aus --betrieb/BETRIEB).
 */
export async function erzeugeHandlerV2({ slug, v1TelegramErsetzen = true } = {}) {
  process.env.BETRIEB ??= slug;
  const { handler: v1, istOeffentlicheRoute, pruefeWirtZugang } = await import("../../src/wirtServer.js");
  if (v1TelegramErsetzen && telegramKonfiguriert()) {
    // Der v1-Rückkanal schickt nur „Neue Bestellung …“ als Text. Der v2-Bot
    // schickt dasselbe mit Knöpfen – beide zusammen wären doppelt.
    const { telegramSendenHook } = await import("../../src/telegramNotify.js");
    telegramSendenHook.aktuell = async () => {};
  }
  const betrieb = process.env.BETRIEB;

  const handler = async (req, res) => {
    const { pathname } = new URL(req.url, "http://localhost");

    // Dieselbe Prüfung wie in v1 (WIRT_PASSWORT, Fehlversuche, Herkunft) –
    // auch für die Routen, die diese Hülle selbst beantwortet. Schriften sind
    // unkritisch.
    if (!istOeffentlicheRoute(pathname, req.method) && !pathname.startsWith("/v2/assets/fonts/") && !pruefeWirtZugang(req, res)) return;

    if (pathname === "/" || pathname === "/index.html") {
      const { v2Design } = ladeBetriebV2(betrieb);
      let ds = null;
      try {
        if (v2Design) ds = ladeDesignsystem(v2Design.kueche, v2Design.stimmung);
      } catch {
        ds = null;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(themeWirtHtml(readFileSync(WIRT_HTML, "utf-8"), ds));
      return;
    }

    if (pathname.startsWith("/v2/assets/fonts/")) {
      const datei = path.join(FONTS_DIR, path.basename(pathname));
      if (existsSync(datei) && statSync(datei).isFile()) {
        res.writeHead(200, { "Content-Type": "font/woff2", "Cache-Control": "max-age=604800" });
        res.end(readFileSync(datei));
      } else {
        res.writeHead(404);
        res.end();
      }
      return;
    }

    if (pathname === "/v2/api/telegram") return json(res, 200, telegramStatus(betrieb));
    if (pathname === "/v2/api/design") return json(res, 200, { design: ladeBetriebV2(betrieb).v2Design });

    if (pathname.startsWith("/v2/intern/") && req.method === "POST") {
      try {
        const e = await koerper(req);
        if (pathname === "/v2/intern/telegram/code") {
          const code = erzeugeVerknuepfungscode(betrieb, new Date(), { kanal: kanalAus(e) });
          const name = botName(code.bot);
          return json(res, 200, { ok: true, ...code, botName: name, botLink: name ? `https://t.me/${name}?start=${code.code}` : "", botEingerichtet: Boolean(botToken(code.bot)) });
        }
        if (pathname === "/v2/intern/telegram/trennen") {
          trenneKanal(betrieb, kanalAus(e));
          return json(res, 200, { ok: true, ...telegramStatus(betrieb) });
        }
        if (pathname === "/v2/intern/telegram/uebernehmen") {
          uebernimmBisherigenChat(betrieb, kanalAus(e));
          return json(res, 200, { ok: true, ...telegramStatus(betrieb) });
        }
        if (pathname === "/v2/intern/telegram/test") {
          // Vom Wirt ausgelöst: gilt als Antwort, nicht als Benachrichtigung –
          // deshalb auch außerhalb der Telegram-Zeiten, nie im Demo-Betrieb.
          const kanal = kanalAus(e);
          const daten = ladeBetrieb(betrieb);
          if (daten.demoBetrieb) return json(res, 400, { ok: false, fehler: GRUND_TEXT.demo });
          const einstellungen = telegramEinstellungen(daten);
          const art = kanal === "alle" ? "reservierung" : kanal;
          const ziel = zielFuer(daten, art, einstellungen);
          if (!ziel || (kanal === "alle" && einstellungen.modus !== "ein-chat")) return json(res, 400, { ok: false, fehler: "Für diesen Kanal ist im gewählten Modus kein Chat verbunden." });
          if (!botToken(ziel.bot)) return json(res, 400, { ok: false, fehler: GRUND_TEXT["kein-token"] });
          try {
            await api("sendMessage", { chat_id: ziel.chatId, ...testNachricht(daten, betrieb, KANAL_NAME[ziel.kanal]) }, ziel.bot);
          } catch (fehler) {
            return json(res, 502, { ok: false, fehler: `Telegram hat die Testnachricht nicht angenommen: ${String(fehler.message).slice(0, 160)}` });
          }
          return json(res, 200, { ok: true, gesendetAn: KANAL_NAME[ziel.kanal] });
        }
        if (pathname === "/v2/intern/telegram/tagesuebersicht") return json(res, 200, { ok: true, ...setzeTagesuebersicht(betrieb, e) });
        if (pathname === "/v2/intern/design") return json(res, 200, { ok: true, design: setzeBetriebsDesign(betrieb, e) });
        if (pathname === "/v2/intern/bestellung/kuechenstatus") {
          const bestellung = setzeKuechenStatus(betrieb, e.id, e.status);
          // Dieselbe Zustellung wie im v1-Dashboard: Die Meldung ist beim
          // Speichern entstanden, hier wird sie nur verschickt.
          await stelleGastMeldungenZu(betrieb);
          return json(res, 200, { ok: true, bestellung });
        }
      } catch (fehler) {
        return json(res, 400, { ok: false, fehler: fehler.message });
      }
      return json(res, 404, { ok: false, fehler: "Unbekannt" });
    }

    // Alles andere: v1, unverändert. Öffentliche Anfragen werden
    // mitgeschnitten, damit nach einem Erfolg Telegram informiert wird.
    const oeffentlich = req.method === "POST" && pathname.startsWith("/oeffentlich/");
    const antwort = oeffentlich ? mitschneiden(res) : null;
    await v1(req, res);
    if (!antwort) return;
    const { status, daten } = antwort();
    if (status !== 200 || !daten?.ok) return;
    if (pathname === "/oeffentlich/reservierung") await benachrichtige(betrieb, { art: "reservierung", id: daten.reservierung.id });
    else if (pathname === "/oeffentlich/bestellung") await benachrichtige(betrieb, { art: "bestellung", id: daten.bestellung.id });
    else {
      const storno = STORNO.exec(pathname);
      if (storno) await benachrichtige(betrieb, { art: "storno", id: decodeURIComponent(storno[1]) });
    }
  };
  // Ein Fehler in einer Anfrage beendet nie den Prozess (wie in v1).
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (fehler) {
      console.error(`Fehler bei ${req.method} ${String(req.url).slice(0, 200)}: ${fehler.message}`);
      if (!res.headersSent) json(res, 400, { ok: false, fehler: "Ungültige Anfrage." });
      else res.end();
    }
  };
}

function flag(argv, name, standard) {
  const i = argv.indexOf(name);
  if (i === -1) return standard;
  const wert = argv[i + 1];
  return wert === undefined || wert.startsWith("--") ? true : wert;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { config } = await import("dotenv");
  config();
  const argv = process.argv.slice(2);
  const slug = flag(argv, "--betrieb", process.env.BETRIEB || "mein-lokal");
  process.env.BETRIEB = slug;
  const port = Number(flag(argv, "--port", process.env.WIRT_PORT || 3200));
  const kueche = flag(argv, "--kueche");
  const stimmung = flag(argv, "--stimmung");
  if (kueche && stimmung) setzeBetriebsDesign(slug, { kueche, stimmung });
  const handler = await erzeugeHandlerV2({ slug });
  const { dashboardHost } = await import("../../src/config.js");
  const server = createServer(handler);
  server.on("error", (e) => {
    if (e.code === "EADDRINUSE") {
      console.log(`\n⚠️  Port ${port} ist belegt. Anderen wählen: npm run v2:wirt -- --port ${port + 1}\n`);
      process.exitCode = 1;
      return;
    }
    throw e;
  });
  server.listen(port, dashboardHost, () => {
    const d = ladeBetriebV2(slug).v2Design;
    console.log(`\n🍽️  Wirt-Dashboard (v2) für "${slug}": http://${dashboardHost}:${port}`);
    console.log(`    Design: ${d ? `${d.kueche}/${d.stimmung}` : "Standard (v1) – mit --kueche/--stimmung setzen"}`);
    if (flag(argv, "--telegram", false)) {
      try {
        starteDienst();
        console.log("    Telegram-Bot läuft im selben Prozess.");
      } catch (e) {
        console.log(`    ⚠️  Telegram: ${e.message}`);
      }
    }
  });
}
