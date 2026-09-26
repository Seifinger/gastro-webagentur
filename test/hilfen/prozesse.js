// Lokale Gegenstellen für Tests mit ECHT laufender Wirt-App (Kindprozess):
// Test-Empfänger für Resend und Telegram – nichts verlässt den Rechner.

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function starte(h) {
  const server = createServer(h);
  return new Promise((fertig) => server.listen(0, "127.0.0.1", () => fertig({ server, url: `http://127.0.0.1:${server.address().port}`, port: server.address().port })));
}

export async function freierPort() {
  const s = await starte((q, a) => a.end());
  const { port } = s;
  await new Promise((r) => s.server.close(r));
  return port;
}

/** Test-Empfänger statt Resend: nimmt Mails an, verschickt nichts. */
export function resendAttrappe(mails) {
  return async (req, res) => {
    let body = "";
    for await (const c of req) body += c;
    mails.push({ pfad: req.url, auth: req.headers.authorization, ...JSON.parse(body || "{}") });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ id: `lokal-${mails.length}` }));
  };
}

/** Test-Bot-Server statt api.telegram.org: Long Polling, gesendete Nachrichten, Knopf-Quittungen. */
export function telegramAttrappe(token) {
  const gesendet = [];
  const warteschlange = [];
  let naechsteId = 1;
  let messageId = 100;
  const handler = async (req, res) => {
    let body = "";
    for await (const c of req) body += c;
    const daten = JSON.parse(body || "{}");
    const m = /^\/bot([^/]+)\/(\w+)$/.exec(new URL(req.url, "http://x").pathname);
    const antwort = (result) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, result }));
    };
    if (!m || m[1] !== token) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error_code: 401, description: "Unauthorized" }));
      return;
    }
    if (m[2] === "getUpdates") {
      for (let i = 0; i < 20 && !warteschlange.length; i += 1) await new Promise((r) => setTimeout(r, 50));
      antwort(warteschlange.splice(0));
      return;
    }
    messageId += 1;
    gesendet.push({ methode: m[2], ...daten, message_id: messageId });
    antwort(m[2] === "answerCallbackQuery" ? true : { message_id: messageId, chat: { id: daten.chat_id } });
  };
  return {
    handler,
    gesendet,
    schicke: (update) => warteschlange.push({ update_id: naechsteId++, ...update }),
  };
}

export async function warteBis(fn, { ms = 15_000, was = "Bedingung" } = {}) {
  const ende = Date.now() + ms;
  for (;;) {
    const r = await fn();
    if (r) return r;
    if (Date.now() > ende) throw new Error(`Zeitüberschreitung: ${was}`);
    await new Promise((x) => setTimeout(x, 100));
  }
}

// Optional gegen das gebaute Image statt gegen den Node-Prozess des Checkouts:
//   PILOT_E2E_IMAGE=gastro-wirt:<commit> node --test test/pilot-e2e.test.js
// (Image aus deploy/wirt/lokal-test.sh bzw. docker build -f deploy/wirt/Dockerfile .)
export const IMAGE = process.env.PILOT_E2E_IMAGE ?? "";
const UHR = path.join(REPO, "test", "hilfen", "uhrVorlauf.mjs");

/**
 * Startet die Wirt-App als eigenen Prozess – wie im Container
 * (node scripts/wirtStart.mjs) oder, mit PILOT_E2E_IMAGE, als Container
 * mit eingehängten Ordnern (Volume, Sicherungsziel).
 */
export async function starteWirtApp(env, log, { mounts = [] } = {}) {
  const name = `pilot-e2e-${env.WIRT_PORT}-${Date.now()}`;
  const kind = IMAGE
    ? spawn("docker", [
        "run", "--rm", "--init", "--name", name, "--network", "host",
        ...mounts.flatMap(([host, ziel]) => ["-v", `${host}:${ziel}`]),
        "-v", `${UHR}:/app/test/hilfen/uhrVorlauf.mjs:ro`,
        ...Object.entries({ ...env, NODE_OPTIONS: "--import=/app/test/hilfen/uhrVorlauf.mjs" }).flatMap(([k, v]) => ["-e", `${k}=${v}`]),
        IMAGE,
      ], { stdio: ["ignore", "pipe", "pipe"] })
    : spawn(process.execPath, ["--import", UHR, path.join(REPO, "scripts", "wirtStart.mjs")], {
        cwd: REPO,
        env: { PATH: process.env.PATH, ...env },
        stdio: ["ignore", "pipe", "pipe"],
      });
  kind.stdout.on("data", (d) => log.push(String(d)));
  kind.stderr.on("data", (d) => log.push(String(d)));
  const basis = env.WIRT_OEFFENTLICHE_URL;
  await warteBis(async () => {
    if (kind.exitCode !== null) throw new Error(`Wirt-App beendet (Exit ${kind.exitCode}):\n${log.join("")}`);
    try {
      return (await fetch(`${basis}/gesund`)).ok;
    } catch {
      return false;
    }
  }, { ms: IMAGE ? 40_000 : 15_000, was: "Wirt-App bereit" });
  return {
    env,
    name,
    stop: async () => {
      if (kind.exitCode !== null) return kind.exitCode;
      const ende = new Promise((r) => kind.once("exit", (code) => r(code)));
      kind.kill("SIGTERM");
      return ende;
    },
  };
}

/** CLI-Aufruf im Umfeld der laufenden App (auf Fly: fly ssh console -C "wirt-befehl …"). */
export function cli(app, skript, args, log, extra = {}) {
  return new Promise((fertig) => {
    const kind = IMAGE
      ? // Wie fly ssh console: als root, über den Wartungsbefehl des Images.
        spawn("docker", ["exec", ...Object.entries(extra).flatMap(([k, v]) => ["-e", `${k}=${v}`]), app.name, "wirt-befehl", { "wirtSicherung.mjs": "sicherung", "wirtUebergabe.mjs": "uebergabe" }[skript], ...args])
      : spawn(process.execPath, [path.join(REPO, "scripts", skript), ...args], { cwd: REPO, env: { PATH: process.env.PATH, ...app.env, ...extra } });
    let aus = "";
    kind.stdout.on("data", (d) => (aus += d));
    kind.stderr.on("data", (d) => (aus += d));
    kind.on("exit", (code) => {
      log.push(aus);
      fertig({ code, aus });
    });
  });
}
