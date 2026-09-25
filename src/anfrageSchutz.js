// Gemeinsame Schutzbausteine für alle Server (Wirt, Dashboard, Resonanz).
//
//   clientAdresse   echte Adresse des Aufrufers – Weiterleitungs-Köpfe
//                   (X-Forwarded-For, Fly-Client-IP) zählen nur, wenn
//                   VERTRAUTER_PROXY gesetzt ist UND die Verbindung wirklich
//                   von einem lokalen/privaten Proxy kommt. Sonst könnte jeder
//                   Aufrufer sich per Kopfzeile eine neue Adresse geben.
//   direktLokal     Anfrage kommt ohne Proxy direkt von diesem Rechner – nur
//                   dann darf ein Server ohne Passwort interne Daten zeigen.
//   fremdeHerkunft  Browser-Anfrage, die von einer anderen Seite ausgelöst
//                   wurde (CSRF). Nur was der Browser selbst mitschickt.
//   Bremse          gleitendes Fenster je Schlüssel; räumt alte Einträge auf,
//                   damit viele verschiedene Adressen den Speicher nicht füllen.
//
// VERTRAUTER_PROXY:
//   (leer)  kein Proxy – die Adresse der Verbindung zählt (Standard)
//   fly     Fly.io: Fly-Client-IP (setzt der Fly-Proxy selbst)
//   1 … 5   Anzahl der eigenen Proxys, die X-Forwarded-For ergänzen
//           (1 = z. B. Caddy/nginx auf demselben Rechner)

import net from "node:net";

const PROXY_KOEPFE = [
  "x-forwarded-for",
  "forwarded",
  "x-real-ip",
  "x-forwarded-host",
  "fly-client-ip",
  "cf-connecting-ip",
  "true-client-ip",
];

/** "::ffff:127.0.0.1" → "127.0.0.1" (IPv4 über einen IPv6-Socket). */
export function normalisiereAdresse(adresse) {
  const a = String(adresse ?? "").trim();
  return a.toLowerCase().startsWith("::ffff:") && net.isIPv4(a.slice(7)) ? a.slice(7) : a;
}

export function istLoopback(adresse) {
  const a = normalisiereAdresse(adresse);
  return a === "::1" || (net.isIPv4(a) && a.startsWith("127."));
}

/** Loopback oder privates Netz (RFC 1918, IPv6 ULA/Link-Local) – dort sitzt ein eigener Proxy. */
export function istPrivat(adresse) {
  const a = normalisiereAdresse(adresse);
  if (istLoopback(a)) return true;
  if (net.isIPv4(a)) {
    const [x, y] = a.split(".").map(Number);
    return x === 10 || (x === 172 && y >= 16 && y <= 31) || (x === 192 && y === 168);
  }
  if (net.isIPv6(a)) return /^f[cd]/i.test(a) || /^fe[89ab]/i.test(a);
  return false;
}

let warnungVerschickt = false;

export function vertrauterProxy(env = process.env) {
  const wert = String(env.VERTRAUTER_PROXY ?? "").trim().toLowerCase();
  if (!wert || wert === "0") return null;
  if (wert === "fly") return { art: "fly" };
  const stufen = Number(wert);
  if (Number.isInteger(stufen) && stufen >= 1 && stufen <= 5) return { art: "xff", stufen };
  if (!warnungVerschickt) {
    warnungVerschickt = true;
    console.warn(`⚠️  VERTRAUTER_PROXY="${wert}" ist unbekannt (erlaubt: fly oder 1–5) – Weiterleitungs-Köpfe werden ignoriert.`);
  }
  return null;
}

export function clientAdresse(req, env = process.env) {
  const direkt = normalisiereAdresse(req.socket?.remoteAddress ?? "");
  const proxy = vertrauterProxy(env);
  if (!proxy || !istPrivat(direkt)) return direkt || "unbekannt";
  if (proxy.art === "fly") {
    const ip = normalisiereAdresse(req.headers["fly-client-ip"]);
    return net.isIP(ip) ? ip : direkt;
  }
  // Jeder eigene Proxy hängt die Adresse, von der er angesprochen wurde, hinten
  // an. Was weiter vorne steht, kann der Aufrufer selbst geschrieben haben.
  const kette = String(req.headers["x-forwarded-for"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ip = normalisiereAdresse(kette[kette.length - proxy.stufen]);
  return net.isIP(ip) ? ip : direkt;
}

export function hatProxyKoepfe(req) {
  return PROXY_KOEPFE.some((k) => req.headers[k] !== undefined);
}

/** Host-Kopf zeigt auf diesen Rechner (schützt zusätzlich gegen DNS-Rebinding). */
export function istLokalerHost(host) {
  const h = String(host ?? "").trim().toLowerCase();
  const name = h.startsWith("[") ? h.slice(1, h.indexOf("]")) : h.split(":")[0];
  return name === "localhost" || istLoopback(name);
}

export function direktLokal(req) {
  return istLoopback(req.socket?.remoteAddress ?? "") && !hatProxyKoepfe(req) && istLokalerHost(req.headers.host);
}

/**
 * Wurde die Anfrage im Browser von einer fremden Seite ausgelöst? Moderne
 * Browser sagen das über Sec-Fetch-Site; ältere nur über Origin. Anfragen
 * ohne beides (curl, Tests, Server) gelten nicht als fremd – sie tragen auch
 * keine Anmeldedaten, die der Browser von allein mitschickt.
 */
export function fremdeHerkunft(req, erlaubteHosts = []) {
  const site = String(req.headers["sec-fetch-site"] ?? "").toLowerCase();
  if (site) return site === "cross-site" || site === "same-site";
  const origin = req.headers.origin;
  if (origin === undefined) return false;
  let host;
  try {
    host = new URL(origin).host;
  } catch {
    return true; // auch "null" (Sandbox, file://)
  }
  const erlaubt = [req.headers.host, req.headers["x-forwarded-host"], ...erlaubteHosts]
    .map((h) => String(h ?? "").split(",")[0].trim().toLowerCase())
    .filter(Boolean);
  return !erlaubt.includes(host.toLowerCase());
}

/** Gleitendes Zeitfenster je Schlüssel, mit Obergrenze für die Zahl der Schlüssel. */
export class Bremse {
  constructor({ fensterMs, maxSchluessel = 10_000 }) {
    this.fensterMs = fensterMs;
    this.maxSchluessel = maxSchluessel;
    this.karte = new Map();
  }

  #aktuell(schluessel, jetzt) {
    return (this.karte.get(schluessel) ?? []).filter((t) => jetzt - t < this.fensterMs);
  }

  /** Zählt einen Treffer und gibt die Zahl im Fenster zurück (inklusive diesem). */
  zaehle(schluessel, jetzt = Date.now()) {
    const liste = this.#aktuell(schluessel, jetzt);
    liste.push(jetzt);
    this.karte.delete(schluessel);
    this.karte.set(schluessel, liste);
    this.#aufraeumen(jetzt);
    return liste.length;
  }

  /** Zahl der Treffer im Fenster, ohne zu zählen. */
  anzahl(schluessel, jetzt = Date.now()) {
    const liste = this.#aktuell(schluessel, jetzt);
    if (liste.length) this.karte.set(schluessel, liste);
    else this.karte.delete(schluessel);
    return liste.length;
  }

  get groesse() {
    return this.karte.size;
  }

  leeren() {
    this.karte.clear();
  }

  #aufraeumen(jetzt) {
    if (this.karte.size <= this.maxSchluessel) return;
    for (const [k, liste] of this.karte) {
      if (!liste.length || jetzt - liste[liste.length - 1] >= this.fensterMs) this.karte.delete(k);
    }
    // Immer noch zu viele (sehr viele aktive Adressen): die am längsten
    // ruhenden zuerst vergessen – Map hält die Reihenfolge der letzten Treffer.
    for (const k of this.karte.keys()) {
      if (this.karte.size <= this.maxSchluessel) break;
      this.karte.delete(k);
    }
  }
}
