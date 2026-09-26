// Verschlüsselte Sicherung der Wirt-App an einen ZWEITEN Ort – und die
// Wiederherstellung daraus.
//
// Ablauf „erstellen“:
//   1. Alle Laufzeitdaten der Wirt-App (datenPfad.js → WIRT_DATEN) als tar.gz
//   2. Manifest: jede Datei mit SHA-256, Zählung je Betrieb
//   3. AES-256-GCM mit BACKUP_SCHLUESSEL (32 Byte, base64) – verschlüsselt,
//      BEVOR etwas den Host verlässt; das Ziel sieht nur Chiffretext
//   4. Ablage über einen Speicher-Adapter (BACKUP_ZIEL):
//        datei:/pfad          lokaler/anderer Datenträger (Tests, Notfall)
//        s3                   S3-kompatibel (Cloudflare R2, Backblaze B2, AWS …)
//                             mit BACKUP_S3_ENDPOINT, BACKUP_S3_BUCKET,
//                             BACKUP_S3_REGION (R2: auto), BACKUP_S3_ZUGANG,
//                             BACKUP_S3_GEHEIM, optional BACKUP_S3_PRAEFIX
//   5. Aufräumen: älter als BACKUP_BEHALTEN_TAGE (Standard 30) löschen, aber
//      immer mindestens die neuesten BACKUP_MINDESTENS (Standard 7) behalten
//   6. Stand (ohne Geheimnisse) nach <daten>/sicherung/stand.json
//
// „wiederherstellen“ entschlüsselt (GCM prüft Echtheit), entpackt in einen
// NEUEN Ordner und vergleicht jede Datei mit dem Manifest. Live-Daten werden
// nie direkt überschrieben – siehe vorbereiteWiederherstellung().

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DATEN_DIR, WIRT_DATEN, schreibeAtomar } from "./datenPfad.js";

const MAGIC = Buffer.from("GASTROBK1\n");
export const DATEI_ENDUNG = ".gbk";

/* ------------------------------------------------------------------ */
/* Schlüssel und Verschlüsselung                                       */
/* ------------------------------------------------------------------ */

export function schluesselAus(text = process.env.BACKUP_SCHLUESSEL) {
  const roh = Buffer.from(String(text ?? "").trim(), "base64");
  if (roh.length !== 32) throw new Error("BACKUP_SCHLUESSEL fehlt oder ist nicht 32 Byte (base64). Erzeugen: openssl rand -base64 32");
  return roh;
}

export function verschluessele(klartext, schluessel) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", schluessel, iv);
  c.setAAD(MAGIC);
  const inhalt = Buffer.concat([c.update(klartext), c.final()]);
  return Buffer.concat([MAGIC, iv, inhalt, c.getAuthTag()]);
}

export function entschluessele(paket, schluessel) {
  if (!paket.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("Keine Gastro-Sicherung (Kennung fehlt).");
  const iv = paket.subarray(MAGIC.length, MAGIC.length + 12);
  const tag = paket.subarray(paket.length - 16);
  const d = createDecipheriv("aes-256-gcm", schluessel, iv);
  d.setAAD(MAGIC);
  d.setAuthTag(tag);
  try {
    return Buffer.concat([d.update(paket.subarray(MAGIC.length + 12, paket.length - 16)), d.final()]);
  } catch {
    throw new Error("Entschlüsseln fehlgeschlagen – falscher Schlüssel oder beschädigte Sicherung.");
  }
}

/* ------------------------------------------------------------------ */
/* Speicher-Adapter                                                    */
/* ------------------------------------------------------------------ */

/** Ordner als Ziel (anderer Datenträger, Tests). */
export function dateiZiel(ordner) {
  return {
    art: "datei",
    beschreibung: `Ordner ${ordner}`,
    async ablegen(name, inhalt) {
      mkdirSync(ordner, { recursive: true, mode: 0o700 });
      schreibeAtomar(path.join(ordner, name), inhalt);
    },
    async holen(name) {
      return readFileSync(path.join(ordner, name));
    },
    async liste() {
      if (!existsSync(ordner)) return [];
      return readdirSync(ordner).filter((n) => n.endsWith(DATEI_ENDUNG)).map((n) => ({ name: n, bytes: statSync(path.join(ordner, n)).size }));
    },
    async loeschen(name) {
      rmSync(path.join(ordner, name), { force: true });
    },
  };
}

const sha = (daten) => createHash("sha256").update(daten).digest("hex");
const hmac = (schluessel, daten) => createHmac("sha256", schluessel).update(daten).digest();
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/**
 * AWS Signature Version 4 für eine S3-Anfrage (Kopf-Variante). Rein und ohne
 * Netz – geprüft gegen die Beispielwerte der AWS-S3-Dokumentation.
 * @returns {{ kopf: object, qs: string, signatur: string }}
 */
export function signiereS3Anfrage({ methode, host, pfad, query = {}, body = Buffer.alloc(0), zeit, region, zugang, geheim, weitereKoepfe = {}, dienst = "s3" }) {
  const amzDatum = new Date(zeit).toISOString().replace(/[:-]|\.\d{3}/g, "");
  const tag = amzDatum.slice(0, 8);
  const qs = Object.keys(query).sort().map((k) => `${enc(k)}=${enc(query[k])}`).join("&");
  const nutzlastHash = sha(body);
  const kopf = { host, ...Object.fromEntries(Object.entries(weitereKoepfe).map(([k, v]) => [k.toLowerCase(), String(v).trim()])), "x-amz-content-sha256": nutzlastHash, "x-amz-date": amzDatum };
  const namen = Object.keys(kopf).sort();
  const kanonisch = [methode, pfad, qs, namen.map((n) => `${n}:${kopf[n]}\n`).join(""), namen.join(";"), nutzlastHash].join("\n");
  const bereich = `${tag}/${region}/${dienst}/aws4_request`;
  const zuSignieren = ["AWS4-HMAC-SHA256", amzDatum, bereich, sha(kanonisch)].join("\n");
  const k = hmac(hmac(hmac(hmac(`AWS4${geheim}`, tag), region), dienst), "aws4_request");
  const signatur = createHmac("sha256", k).update(zuSignieren).digest("hex");
  const { host: _host, ...ohneHost } = kopf;
  return { kopf: { ...ohneHost, Authorization: `AWS4-HMAC-SHA256 Credential=${zugang}/${bereich}, SignedHeaders=${namen.join(";")}, Signature=${signatur}` }, qs, signatur };
}

/**
 * S3-kompatibles Ziel mit AWS Signature V4 (path-style). Getestet gegen ein
 * lokales S3-kompatibles Testziel; Cloudflare R2: endpoint
 * https://<account-id>.r2.cloudflarestorage.com, region "auto".
 */
export function s3Ziel({ endpoint, bucket, region = "auto", zugang, geheim, praefix = "", fetchFn = (...a) => fetch(...a), jetzt = () => new Date() }) {
  if (!endpoint || !bucket || !zugang || !geheim) throw new Error("S3-Ziel unvollständig: BACKUP_S3_ENDPOINT, BACKUP_S3_BUCKET, BACKUP_S3_ZUGANG, BACKUP_S3_GEHEIM.");
  const basis = new URL(endpoint);
  const pre = praefix ? `${praefix.replace(/^\/+|\/+$/g, "")}/` : "";

  async function anfrage(methode, schluessel, { query = {}, body = Buffer.alloc(0) } = {}) {
    const pfad = `${basis.pathname.replace(/\/+$/, "")}/${enc(bucket)}${schluessel ? `/${schluessel.split("/").map(enc).join("/")}` : ""}`;
    const { kopf, qs } = signiereS3Anfrage({ methode, host: basis.host, pfad, query, body, zeit: jetzt(), region, zugang, geheim });
    const antwort = await fetchFn(`${basis.origin}${pfad}${qs ? `?${qs}` : ""}`, {
      method: methode,
      headers: kopf,
      ...(methode === "PUT" ? { body } : {}),
      signal: AbortSignal.timeout(60_000),
    });
    if (!antwort.ok) {
      const text = (await antwort.text()).replace(/\s+/g, " ").slice(0, 200);
      throw new Error(`S3 ${methode} ${antwort.status}: ${text}`);
    }
    return antwort;
  }

  return {
    art: "s3",
    beschreibung: `S3 ${basis.host}/${bucket}/${pre}`,
    async ablegen(name, inhalt) {
      await anfrage("PUT", `${pre}${name}`, { body: inhalt });
    },
    async holen(name) {
      return Buffer.from(await (await anfrage("GET", `${pre}${name}`)).arrayBuffer());
    },
    async liste() {
      const xml = await (await anfrage("GET", "", { query: { "list-type": "2", prefix: pre } })).text();
      return [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)]
        .map((m) => ({ key: /<Key>([^<]+)<\/Key>/.exec(m[1])?.[1] ?? "", bytes: Number(/<Size>(\d+)<\/Size>/.exec(m[1])?.[1] ?? 0) }))
        .filter((o) => o.key.endsWith(DATEI_ENDUNG))
        .map((o) => ({ name: o.key.slice(pre.length), bytes: o.bytes }));
    },
    async loeschen(name) {
      await anfrage("DELETE", `${pre}${name}`);
    },
  };
}

/** Ziel aus der Umgebung (BACKUP_ZIEL). null = keine externe Sicherung eingerichtet. */
export function zielAusUmgebung(env = process.env) {
  const ziel = String(env.BACKUP_ZIEL ?? "").trim();
  if (!ziel) return null;
  if (ziel.startsWith("datei:")) return dateiZiel(path.resolve(ziel.slice(6)));
  if (ziel === "s3") {
    return s3Ziel({ endpoint: env.BACKUP_S3_ENDPOINT, bucket: env.BACKUP_S3_BUCKET, region: env.BACKUP_S3_REGION || "auto", zugang: env.BACKUP_S3_ZUGANG, geheim: env.BACKUP_S3_GEHEIM, praefix: env.BACKUP_S3_PRAEFIX || "" });
  }
  throw new Error(`Unbekanntes BACKUP_ZIEL „${ziel}“ (erlaubt: datei:<ordner>, s3).`);
}

/* ------------------------------------------------------------------ */
/* Packen, Manifest, Zählung                                           */
/* ------------------------------------------------------------------ */

function alleDateien(ordner) {
  if (!existsSync(ordner)) return [];
  return readdirSync(ordner, { withFileTypes: true }).flatMap((e) => {
    const voll = path.join(ordner, e.name);
    return e.isDirectory() ? alleDateien(voll) : [voll];
  });
}

/** Was im Datenverzeichnis zur Sicherung gehört (ohne Temp-Dateien, Sperren, Sicherungsstand). */
function zuSichern(datenDir) {
  return WIRT_DATEN.flatMap((teil) => alleDateien(path.join(datenDir, teil)))
    .map((d) => path.relative(datenDir, d))
    .filter((rel) => !/\.tmp$/.test(rel) && !rel.includes(`${path.sep}.telegram-sperren${path.sep}`) && !rel.includes(".beschaedigt-"))
    .sort();
}

/** Kennzahlen je Betrieb – für den Vergleich nach der Wiederherstellung. */
export function zaehleBetriebe(datenDir) {
  const ordner = path.join(datenDir, "betrieb");
  const ergebnis = {};
  if (!existsSync(ordner)) return ergebnis;
  for (const name of readdirSync(ordner).filter((n) => n.endsWith(".json"))) {
    const d = JSON.parse(readFileSync(path.join(ordner, name), "utf-8"));
    ergebnis[name.replace(/\.json$/, "")] = {
      reservierungen: d.reservierungen?.length ?? 0,
      bestellungen: d.bestellungen?.length ?? 0,
      tische: d.tische?.length ?? 0,
      rabattaktionen: d.rabattaktionen?.length ?? 0,
      rechtsdokumente: d.rechtsdokumente?.length ?? 0,
      gastMeldungen: d.gastMeldungen?.length ?? 0,
    };
  }
  return ergebnis;
}

export function sicherungsName(betrieb, jetzt) {
  return `gastro-wirt-${betrieb || "alle"}-${new Date(jetzt).toISOString().replace(/[:.]/g, "-")}${DATEI_ENDUNG}`;
}

/** Klartext der Sicherung: 4 Byte Länge + Manifest (JSON) + tar.gz. */
export function packe(datenDir = DATEN_DIR, { jetzt = new Date() } = {}) {
  const dateien = zuSichern(datenDir);
  if (!dateien.length) throw new Error(`Keine Laufzeitdaten unter ${datenDir} – nichts zu sichern.`);
  // Jede JSON-Datei muss lesbar sein, sonst wäre die Sicherung wertlos.
  for (const rel of dateien.filter((d) => d.endsWith(".json"))) {
    try {
      JSON.parse(readFileSync(path.join(datenDir, rel), "utf-8"));
    } catch {
      throw new Error(`${rel} ist beschädigt – Sicherung abgebrochen, damit keine gute ältere Sicherung verdrängt wird.`);
    }
  }
  const manifest = {
    art: "gastro-wirt-sicherung",
    version: 1,
    erstellt: new Date(jetzt).toISOString(),
    dateien: dateien.map((rel) => ({ pfad: rel.split(path.sep).join("/"), sha256: sha(readFileSync(path.join(datenDir, rel))), bytes: statSync(path.join(datenDir, rel)).size })),
    betriebe: zaehleBetriebe(datenDir),
  };
  const tar = execFileSync("tar", ["-czf", "-", "-C", datenDir, ...dateien], { maxBuffer: 1024 * 1024 * 1024 });
  const m = Buffer.from(JSON.stringify(manifest));
  const laenge = Buffer.alloc(4);
  laenge.writeUInt32BE(m.length);
  return { klartext: Buffer.concat([laenge, m, tar]), manifest };
}

export function entpacke(klartext, zielDir) {
  const laenge = klartext.readUInt32BE(0);
  const manifest = JSON.parse(klartext.subarray(4, 4 + laenge).toString("utf-8"));
  if (manifest.art !== "gastro-wirt-sicherung") throw new Error("Unbekanntes Sicherungsformat.");
  mkdirSync(zielDir, { recursive: true, mode: 0o700 });
  if (readdirSync(zielDir).length) throw new Error(`Zielordner ${zielDir} ist nicht leer – Wiederherstellung überschreibt nichts.`);
  execFileSync("tar", ["-xzf", "-", "-C", zielDir], { input: klartext.subarray(4 + laenge), maxBuffer: 1024 * 1024 * 1024 });
  const fehler = [];
  for (const d of manifest.dateien) {
    const datei = path.join(zielDir, ...d.pfad.split("/"));
    if (!existsSync(datei)) fehler.push(`${d.pfad} fehlt`);
    else if (sha(readFileSync(datei)) !== d.sha256) fehler.push(`${d.pfad} weicht ab`);
  }
  const vorhanden = alleDateien(zielDir).map((d) => path.relative(zielDir, d).split(path.sep).join("/"));
  for (const extra of vorhanden.filter((p) => !manifest.dateien.some((d) => d.pfad === p))) fehler.push(`${extra} steht nicht im Manifest`);
  const zaehlung = zaehleBetriebe(zielDir);
  if (JSON.stringify(zaehlung) !== JSON.stringify(manifest.betriebe)) fehler.push("Zählung der Betriebe weicht vom Manifest ab");
  if (fehler.length) throw new Error(`Wiederherstellung unvollständig: ${fehler.slice(0, 5).join("; ")}`);
  return { manifest, zaehlung };
}

/* ------------------------------------------------------------------ */
/* Erstellen, Aufräumen, Wiederherstellen                              */
/* ------------------------------------------------------------------ */

const STAND_DATEI = (datenDir) => path.join(datenDir, "sicherung", "stand.json");

export function sicherungsStand(datenDir = DATEN_DIR) {
  try {
    return JSON.parse(readFileSync(STAND_DATEI(datenDir), "utf-8"));
  } catch {
    return null;
  }
}

function merkeStand(datenDir, eintrag) {
  const bisher = sicherungsStand(datenDir) ?? {};
  schreibeAtomar(STAND_DATEI(datenDir), `${JSON.stringify({ ...bisher, ...eintrag }, null, 2)}\n`);
}

/** Alte Sicherungen entfernen: älter als `tage`, aber immer die neuesten `mindestens` behalten. */
export async function raeumeAuf(ziel, { tage = 30, mindestens = 7, jetzt = new Date() } = {}) {
  const liste = (await ziel.liste()).sort((a, b) => b.name.localeCompare(a.name));
  const grenze = new Date(jetzt).getTime() - tage * 86400000;
  const zeitVon = (name) => Date.parse((/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/.exec(name)?.[1] ?? "").replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, "T$1:$2:$3.$4Z"));
  const weg = liste.slice(mindestens).filter((o) => zeitVon(o.name) < grenze);
  for (const o of weg) await ziel.loeschen(o.name);
  return weg.map((o) => o.name);
}

/**
 * Erstellt eine verschlüsselte Sicherung und legt sie am Ziel ab. Liest sie
 * danach zur Kontrolle zurück und entschlüsselt sie (GCM) – erst dann gilt sie
 * als erfolgreich. Meldet Fehler laut und hält sie in stand.json fest.
 */
export async function erstelleExterneSicherung({ datenDir = DATEN_DIR, ziel = zielAusUmgebung(), schluessel = schluesselAus(), betrieb = process.env.BETRIEB, jetzt = new Date(), tage = Number(process.env.BACKUP_BEHALTEN_TAGE) || 30, mindestens = Number(process.env.BACKUP_MINDESTENS) || 7 } = {}) {
  const versuch = new Date(jetzt).toISOString();
  try {
    if (!ziel) throw new Error("BACKUP_ZIEL ist nicht gesetzt – keine externe Sicherung eingerichtet.");
    const { klartext, manifest } = packe(datenDir, { jetzt });
    const verschluesselt = verschluessele(klartext, schluessel);
    const name = sicherungsName(betrieb, jetzt);
    await ziel.ablegen(name, verschluesselt);
    const zurueck = await ziel.holen(name);
    if (!zurueck.equals(verschluesselt)) throw new Error("Gelesene Sicherung weicht von der geschriebenen ab.");
    entschluessele(zurueck, schluessel);
    const entfernt = await raeumeAuf(ziel, { tage, mindestens, jetzt });
    const ergebnis = { name, bytes: verschluesselt.length, dateien: manifest.dateien.length, betriebe: manifest.betriebe, entfernt, ziel: ziel.beschreibung };
    merkeStand(datenDir, { letzterVersuch: versuch, letzterErfolg: versuch, letzteSicherung: name, bytes: ergebnis.bytes, ziel: ziel.beschreibung, fehler: "" });
    return ergebnis;
  } catch (fehler) {
    merkeStand(datenDir, { letzterVersuch: versuch, fehler: String(fehler.message).slice(0, 300) });
    throw fehler;
  }
}

/** Neueste (oder genannte) Sicherung holen, entschlüsseln, in einen NEUEN Ordner entpacken und prüfen. */
export async function stelleWiederHer({ ziel = zielAusUmgebung(), schluessel = schluesselAus(), name = null, zielDir }) {
  if (!ziel) throw new Error("BACKUP_ZIEL ist nicht gesetzt.");
  const liste = (await ziel.liste()).sort((a, b) => b.name.localeCompare(a.name));
  const wahl = name ?? liste[0]?.name;
  if (!wahl) throw new Error("Am Ziel liegt keine Sicherung.");
  const klartext = entschluessele(await ziel.holen(wahl), schluessel);
  return { name: wahl, ...entpacke(klartext, zielDir) };
}

/**
 * Bereitet einen Austausch der Live-Daten vor: stellt nach
 * <daten>/wiederherstellung-bereit/ wieder her. Beim nächsten Start der
 * Wirt-App (scripts/wirtStart.mjs) werden die bisherigen Daten nach
 * <daten>/vor-wiederherstellung-<zeit>/ verschoben und die geprüften
 * eingesetzt – nie im laufenden Betrieb.
 */
export async function vorbereiteWiederherstellung({ datenDir = DATEN_DIR, ...rest } = {}) {
  const bereit = path.join(datenDir, "wiederherstellung-bereit");
  rmSync(bereit, { recursive: true, force: true });
  return stelleWiederHer({ ...rest, zielDir: bereit });
}

/** Beim Start: eine vorbereitete Wiederherstellung einsetzen. */
export function setzeVorbereiteteWiederherstellungEin(datenDir = DATEN_DIR, jetzt = new Date()) {
  const bereit = path.join(datenDir, "wiederherstellung-bereit");
  if (!existsSync(bereit)) return null;
  const alt = path.join(datenDir, `vor-wiederherstellung-${new Date(jetzt).toISOString().replace(/[:.]/g, "-")}`);
  mkdirSync(alt, { recursive: true, mode: 0o700 });
  for (const teil of WIRT_DATEN) if (existsSync(path.join(datenDir, teil))) renameSync(path.join(datenDir, teil), path.join(alt, teil));
  for (const teil of WIRT_DATEN) if (existsSync(path.join(bereit, teil))) renameSync(path.join(bereit, teil), path.join(datenDir, teil));
  rmSync(bereit, { recursive: true, force: true });
  return { alt, betriebe: zaehleBetriebe(datenDir) };
}

/** Temp-Ordner für eine Probe-Wiederherstellung. */
export function probeOrdner() {
  return mkdtempSync(path.join(tmpdir(), "gastro-probe-"));
}

/** Nächster Termin HH:MM (Zeitzone des Betriebs) nach `jetzt`. */
export function naechsterTermin(uhrzeit, jetzt = new Date(), zeitzone = "Europe/Berlin") {
  const [h, m] = String(uhrzeit || "03:30").split(":").map(Number);
  const teile = (ms) => Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: zeitzone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" }).formatToParts(new Date(ms)).map((p) => [p.type, Number(p.value)]));
  for (let tag = 0; tag <= 2; tag += 1) {
    const w = teile(jetzt.getTime() + tag * 86400000);
    // Wanduhr → Zeitpunkt (zwei Anläufe wegen Zeitumstellung).
    let ms = Date.UTC(w.year, w.month - 1, w.day, h, m);
    for (let i = 0; i < 2; i += 1) {
      const t = teile(ms);
      ms -= Date.UTC(t.year, t.month - 1, t.day, t.hour % 24, t.minute) - Date.UTC(w.year, w.month - 1, w.day, h, m);
    }
    if (ms > jetzt.getTime()) return new Date(ms);
  }
  return new Date(jetzt.getTime() + 86400000);
}
