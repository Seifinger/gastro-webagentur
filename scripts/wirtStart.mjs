// Startbefehl der Wirt-App für GENAU EINEN Pilotbetrieb (Container/Fly.io).
//
//   node scripts/wirtStart.mjs
//
// 1. Startprüfung: Pflicht-Secrets und -Einstellungen, Datenverzeichnis
//    (Volume) vorhanden und beschreibbar, Betriebsdatei lesbar. Fehlt etwas,
//    startet die App NICHT (Exit 1) – lieber kein Dienst als ein offener
//    oder einer, der auf einen flüchtigen Container-Speicher schreibt.
// 2. Eine vorbereitete Wiederherstellung wird eingesetzt (wirtSicherung.mjs vorbereiten).
// 3. Wirt-Server (v2-Hülle um src/wirtServer.js) auf WIRT_PORT (Standard 8080),
//    Telegram-Bot im selben Prozess (falls TELEGRAM_BOT_TOKEN), tägliche
//    verschlüsselte Sicherung (falls BACKUP_ZIEL).
// 4. SIGTERM/SIGINT: keine neuen Anfragen, laufende beenden, Telegram und
//    Sperren freigeben, dann Exit 0 (spätestens nach 10 Sekunden).
//
// Umgebung (Namen; Werte nur als Secrets beim Host):
//   Pflicht:  BETRIEB, WIRT_PASSWORT (≥ 12), WIRT_OEFFENTLICHE_URL (https),
//             GAST_STATUS_GEHEIMNIS (≥ 32), GASTRO_DATEN_DIR, VERTRAUTER_PROXY (hinter Fly: fly)
//   Empfohlen: WIRT_ERLAUBTE_ORIGINS, BACKUP_ZIEL + BACKUP_SCHLUESSEL (+ BACKUP_S3_*)
//   Optional: RESEND_API_KEY, GAST_EMAIL_ABSENDER, TELEGRAM_BOT_TOKEN (+ _NAME),
//             VAPID_*, BACKUP_UHRZEIT (03:30), BACKUP_BEHALTEN_TAGE, BACKUP_MINDESTENS

import { createServer } from "node:http";
import { accessSync, constants, existsSync, rmSync, statSync } from "node:fs";
import path from "node:path";

const env = process.env;
const fehler = [];
const hinweise = [];
const lokal = (url) => /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(url);

/** Prüft die Umgebung. Exportiert für Tests. */
export function startpruefung(e = env) {
  const f = [];
  const h = [];
  if (!/^[a-z0-9_][a-z0-9_-]{1,58}$/.test(e.BETRIEB ?? "")) f.push("BETRIEB fehlt oder ist kein gültiges Kürzel (a–z, 0–9, -).");
  if (String(e.WIRT_PASSWORT ?? "").length < 12) f.push("WIRT_PASSWORT fehlt oder ist kürzer als 12 Zeichen.");
  const url = String(e.WIRT_OEFFENTLICHE_URL ?? "");
  if (!/^https:\/\//.test(url) && !lokal(url)) f.push("WIRT_OEFFENTLICHE_URL muss die öffentliche https://-Adresse der Wirt-App sein.");
  if (lokal(url)) h.push("WIRT_OEFFENTLICHE_URL ist eine lokale Adresse – nur für lokale Tests.");
  if (String(e.GAST_STATUS_GEHEIMNIS ?? "").trim().length < 32) f.push("GAST_STATUS_GEHEIMNIS fehlt oder ist kürzer als 32 Zeichen (openssl rand -base64 48).");
  const daten = e.GASTRO_DATEN_DIR;
  if (!daten) f.push("GASTRO_DATEN_DIR fehlt (Pfad des persistenten Volumes, z. B. /data).");
  else if (!existsSync(daten) || !statSync(daten).isDirectory()) f.push(`GASTRO_DATEN_DIR ${daten} existiert nicht – ist das Volume eingehängt?`);
  else {
    try {
      accessSync(daten, constants.W_OK);
    } catch {
      f.push(`GASTRO_DATEN_DIR ${daten} ist nicht beschreibbar.`);
    }
  }
  if (!e.VERTRAUTER_PROXY && !lokal(url)) f.push("VERTRAUTER_PROXY fehlt (auf Fly.io: fly) – sonst teilen sich alle Gäste eine Anfragebremse.");
  if (!e.WIRT_ERLAUBTE_ORIGINS) h.push("WIRT_ERLAUBTE_ORIGINS fehlt – Gastanfragen werden von jeder Website angenommen.");
  if (!e.BACKUP_ZIEL) h.push("BACKUP_ZIEL fehlt – keine externe Sicherung.");
  else if (!e.BACKUP_SCHLUESSEL) f.push("BACKUP_ZIEL ist gesetzt, aber BACKUP_SCHLUESSEL fehlt.");
  if (!e.RESEND_API_KEY || !e.GAST_EMAIL_ABSENDER) h.push("E-Mail an Gäste nicht eingerichtet (RESEND_API_KEY, GAST_EMAIL_ABSENDER) – Gäste sehen den Stand nur über den Status-Link.");
  if (!e.TELEGRAM_BOT_TOKEN) h.push("TELEGRAM_BOT_TOKEN fehlt – keine Telegram-Meldungen.");
  if (e.RESEND_API_BASIS || e.TELEGRAM_API_BASIS) h.push("RESEND_API_BASIS/TELEGRAM_API_BASIS gesetzt – Mails bzw. Telegram gehen an einen Test-Empfänger, nicht an echte Dienste.");
  return { fehler: f, hinweise: h };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const pruefung = startpruefung();
  fehler.push(...pruefung.fehler);
  hinweise.push(...pruefung.hinweise);
  for (const h of hinweise) console.log(`ℹ️  ${h}`);
  if (fehler.length) {
    for (const f of fehler) console.error(`⛔ ${f}`);
    console.error("Wirt-App startet nicht. Secrets/Umgebung prüfen (docs-intern/PILOT-BETRIEB.md).");
    process.exit(1);
  }
  env.NODE_ENV = env.NODE_ENV || "production";
  env.DASHBOARD_HOST = env.DASHBOARD_HOST || "0.0.0.0";
  const port = Number(env.WIRT_PORT || 8080);
  const slug = env.BETRIEB;

  const { DATEN_DIR } = await import("../src/datenPfad.js");
  const sicherung = await import("../src/sicherungExtern.js");
  const eingesetzt = sicherung.setzeVorbereiteteWiederherstellungEin(DATEN_DIR);
  if (eingesetzt) console.log(`♻️  Wiederherstellung eingesetzt; bisherige Daten liegen unter ${eingesetzt.alt}.`);

  // Genau eine Maschine hängt am Volume: Sperren eines abgestürzten Vorgängers sind verwaist.
  rmSync(path.join(DATEN_DIR, "betrieb", ".telegram-sperren"), { recursive: true, force: true });

  const { ladeBetrieb } = await import("../src/betriebStore.js");
  try {
    ladeBetrieb(slug);
  } catch (e) {
    console.error(`⛔ ${e.message} (Betriebsdatei beschädigt – aus der Sicherung wiederherstellen, nicht leer starten).`);
    process.exit(1);
  }

  const { signaleSelbstBehandeln } = await import("../v2/integration/telegramSperren.js");
  signaleSelbstBehandeln();
  const { erzeugeHandlerV2 } = await import("../v2/integration/wirtServerV2.js");
  const handler = await erzeugeHandlerV2({ slug });
  const server = createServer(handler);
  server.keepAliveTimeout = 65_000;
  server.listen(port, env.DASHBOARD_HOST, () => {
    console.log(`🍽️  Wirt-App für „${slug}“ auf ${env.DASHBOARD_HOST}:${port} · Daten ${DATEN_DIR} · Version ${env.GIT_COMMIT || "unbekannt"}`);
  });

  let stopTelegram = null;
  if (env.TELEGRAM_BOT_TOKEN) {
    try {
      const { starteDienst } = await import("../v2/integration/telegramBot.js");
      // Nur dieser eine Betrieb – auch wenn auf dem Volume weitere Dateien lägen.
      stopTelegram = starteDienst({ betriebe: () => [slug] });
      console.log(`🤖 Telegram-Bot läuft im selben Prozess (${stopTelegram.abrufe.join(", ") || "kein Abruf"}).`);
    } catch (e) {
      console.error(`⚠️  Telegram nicht gestartet: ${e.message}`);
    }
  }

  // Tägliche Sicherung (BACKUP_UHRZEIT, Zeitzone Europe/Berlin). Ein Fehler wird
  // protokolliert, in sicherung/stand.json vermerkt und im Dashboard angezeigt.
  let uhr = null;
  const plane = () => {
    const termin = sicherung.naechsterTermin(env.BACKUP_UHRZEIT || "03:30");
    uhr = setTimeout(async () => {
      try {
        const r = await sicherung.erstelleExterneSicherung();
        console.log(`💾 Sicherung ${r.name} (${Math.round(r.bytes / 1024)} KB) → ${r.ziel}`);
      } catch (e) {
        console.error(`⛔ Sicherung fehlgeschlagen: ${e.message}`);
      }
      plane();
    }, Math.max(1000, termin.getTime() - Date.now()));
    uhr.unref();
  };
  if (env.BACKUP_ZIEL) {
    plane();
    console.log(`💾 Externe Sicherung täglich um ${env.BACKUP_UHRZEIT || "03:30"} Uhr (Europe/Berlin).`);
  }

  let beendet = false;
  const beenden = (signal) => {
    if (beendet) return;
    beendet = true;
    console.log(`Beende Wirt-App (${signal}) …`);
    clearTimeout(uhr);
    try {
      stopTelegram?.();
    } catch {
      // Sperren werden beim Exit ohnehin entfernt.
    }
    server.close(() => process.exit(0));
    server.closeIdleConnections?.();
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.on("SIGTERM", () => beenden("SIGTERM"));
  process.on("SIGINT", () => beenden("SIGINT"));
}
