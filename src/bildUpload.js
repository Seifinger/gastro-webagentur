import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLeadEdits, saveLeadEdits } from "./leadEdits.js";

// Eigene Fotos des Betreibers für einen Entwurf. Sie landen unter
// public/uploads/<slug>/<rolle>.jpg und werden über leadEdits.js in
// bilder.<rolle> eingetragen – von dort holt sie der Generator.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = path.join(__dirname, "..", "public", "uploads");

// Die vier Plätze einer Seite: das Titelbild und die drei Bildplätze aus
// renderFotoSlots() in landingPageGenerator.js.
export const BILD_ROLLEN = ["hero", "haus", "team", "bestseller"];

export const ERLAUBTE_TYPEN = ["image/jpeg", "image/png", "image/webp"];
export const MAX_BYTES = 8 * 1024 * 1024;

// Breiter braucht es keine Seite: das Hero-Bild wird mit 1800 px ausgeliefert
// (siehe IMAGE_ROLES in imageLibrary.js). Die Bearbeitungsansicht verkleinert
// schon im Browser auf dieses Maß; hier wird die Grenze durchgesetzt.
export const MAX_BREITE = 1800;

const SOF_MARKER = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

/**
 * JPEG legt die Maße in ein SOF-Segment, das hinter beliebig vielen
 * Metadaten-Segmenten stehen kann – deshalb hangeln wir uns Segment für
 * Segment vor, statt an einer festen Stelle nachzusehen.
 */
function jpegMasse(puffer) {
  let pos = 2;
  while (pos + 9 < puffer.length) {
    if (puffer[pos] !== 0xff) {
      pos += 1;
      continue;
    }

    const marker = puffer[pos + 1];
    // Füllbytes und die Marker ohne Längenfeld haben kein Segment.
    if (marker === 0xff) {
      pos += 1;
      continue;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      pos += 2;
      continue;
    }

    if (SOF_MARKER.has(marker)) {
      return {
        typ: "image/jpeg",
        hoehe: puffer.readUInt16BE(pos + 5),
        breite: puffer.readUInt16BE(pos + 7),
      };
    }
    // Ab dem Bildbeginn stehen komprimierte Daten, in denen 0xFF kein Marker
    // mehr ist – weitersuchen würde nur Zufallstreffer liefern.
    if (marker === 0xda) break;

    pos += 2 + puffer.readUInt16BE(pos + 2);
  }
  return null;
}

function webpMasse(puffer) {
  const art = puffer.toString("latin1", 12, 16);

  if (art === "VP8 " && puffer.length >= 30) {
    return {
      typ: "image/webp",
      breite: puffer.readUInt16LE(26) & 0x3fff,
      hoehe: puffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (art === "VP8L" && puffer.length >= 25) {
    const bits = puffer.readUInt32LE(21);
    return {
      typ: "image/webp",
      breite: (bits & 0x3fff) + 1,
      hoehe: ((bits >>> 14) & 0x3fff) + 1,
    };
  }
  if (art === "VP8X" && puffer.length >= 30) {
    return {
      typ: "image/webp",
      breite: puffer.readUIntLE(24, 3) + 1,
      hoehe: puffer.readUIntLE(27, 3) + 1,
    };
  }
  return null;
}

/**
 * Typ und Maße aus dem Dateikopf – ohne das Bild zu dekodieren. Beides stammt
 * damit aus der Datei selbst und nicht aus dem Content-Type, den der Absender
 * behauptet. Kein erkennbarer Kopf: null.
 */
export function bildMasse(puffer) {
  if (puffer.length >= 24 && puffer.readUInt32BE(0) === 0x89504e47) {
    // PNG: auf die Signatur folgt der IHDR-Block mit Breite und Höhe.
    return { typ: "image/png", breite: puffer.readUInt32BE(16), hoehe: puffer.readUInt32BE(20) };
  }
  if (puffer.length >= 4 && puffer[0] === 0xff && puffer[1] === 0xd8) {
    return jpegMasse(puffer);
  }
  if (
    puffer.length >= 30 &&
    puffer.toString("latin1", 0, 4) === "RIFF" &&
    puffer.toString("latin1", 8, 12) === "WEBP"
  ) {
    return webpMasse(puffer);
  }
  return null;
}

function teileAn(puffer, trenner) {
  const stuecke = [];
  let start = 0;

  for (;;) {
    const index = puffer.indexOf(trenner, start);
    if (index === -1) break;
    stuecke.push(puffer.subarray(start, index));
    start = index + trenner.length;
  }

  stuecke.push(puffer.subarray(start));
  return stuecke;
}

/**
 * Zerlegt einen multipart/form-data-Körper in Felder und Dateien. Bewusst
 * von Hand statt mit einer Bibliothek: es geht um zwei Felder auf einem
 * Server, der ohnehin ohne Framework auskommt.
 *
 * Gearbeitet wird durchgehend auf Buffern – über einen String gedreht käme
 * das Bild beschädigt heraus, weil Bildbytes keine gültige UTF-8-Folge sind.
 */
export function parseMultipart(koerper, contentType) {
  const treffer = /boundary=(?:"([^"]+)"|([^\s;]+))/i.exec(String(contentType ?? ""));
  if (!treffer) throw new Error("Der Upload kam ohne multipart-Grenze an.");

  const trenner = Buffer.from(`\r\n--${treffer[1] ?? treffer[2]}`);
  // Der erste Abschnitt steht ohne führendes CRLF im Körper. Eines davor
  // gesetzt, sieht jeder Abschnitt gleich aus und ein Trenner genügt.
  const stuecke = teileAn(Buffer.concat([Buffer.from("\r\n"), koerper]), trenner);

  const felder = {};
  const dateien = {};

  for (const stueck of stuecke.slice(1)) {
    // "--" hinter der Grenze schließt den Körper ab.
    if (stueck.length >= 2 && stueck[0] === 0x2d && stueck[1] === 0x2d) break;

    const leerzeile = stueck.indexOf("\r\n\r\n");
    if (leerzeile === -1) continue;

    // Der Abschnitt beginnt mit dem CRLF hinter der Grenzzeile, der Kopf erst
    // danach.
    const kopf = stueck.toString("utf-8", 2, leerzeile);
    const inhalt = stueck.subarray(leerzeile + 4);

    const name = /name="([^"]*)"/i.exec(kopf)?.[1];
    if (!name) continue;

    const dateiname = /filename="([^"]*)"/i.exec(kopf)?.[1];
    if (dateiname === undefined) {
      felder[name] = inhalt.toString("utf-8");
    } else {
      dateien[name] = {
        dateiname,
        typ: (/content-type:\s*([^\s;]+)/i.exec(kopf)?.[1] ?? "").toLowerCase(),
        inhalt,
      };
    }
  }

  return { felder, dateien };
}

/**
 * Liest den Anfragekörper als Buffer und bricht ab, sobald er zu groß wird –
 * sonst könnte ein einziger Upload den Speicher volllaufen lassen.
 */
export function leseBinaerKoerper(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const teile = [];
    let groesse = 0;

    req.on("data", (teil) => {
      groesse += teil.length;
      if (groesse > maxBytes) {
        reject(new Error(`Der Upload ist größer als ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`));
        req.destroy();
        return;
      }
      teile.push(teil);
    });
    req.on("end", () => resolve(Buffer.concat(teile)));
    req.on("error", reject);
  });
}

function megabyte(bytes) {
  return (bytes / 1024 / 1024).toFixed(1).replace(".", ",");
}

/**
 * Prüft ein hochgeladenes Bild, legt es unter public/uploads/<slug>/ ab und
 * trägt den Pfad in bilder.<rolle> der lead-edits ein. Wirft mit einer
 * Meldung, die in der Oberfläche direkt anzeigbar ist.
 */
export function speichereLeadBild(slug, rolle, datei) {
  // Der Slug landet in einem Dateipfad: alles außer Kleinbuchstaben, Ziffern
  // und Bindestrich könnte über "../" aus dem Upload-Ordner herausführen.
  if (!/^[a-z0-9][a-z0-9-]*$/.test(String(slug ?? ""))) {
    throw new Error("Unbekannter Entwurf.");
  }
  if (!BILD_ROLLEN.includes(rolle)) {
    throw new Error(`Unbekannter Bildplatz "${rolle}".`);
  }
  if (!datei || datei.inhalt.length === 0) {
    throw new Error("Es wurde keine Datei mitgeschickt.");
  }
  if (datei.inhalt.length > MAX_BYTES) {
    throw new Error(
      `Das Bild ist ${megabyte(datei.inhalt.length)} MB groß – erlaubt sind ${megabyte(MAX_BYTES)} MB.`,
    );
  }
  if (!ERLAUBTE_TYPEN.includes(datei.typ)) {
    throw new Error(`${datei.typ || "Dieser Dateityp"} geht nicht – erlaubt sind JPEG, PNG und WebP.`);
  }

  const masse = bildMasse(datei.inhalt);
  if (!masse) {
    throw new Error("Die Datei ist kein lesbares JPEG, PNG oder WebP.");
  }
  if (masse.typ !== datei.typ) {
    throw new Error(`Die Datei ist in Wirklichkeit ${masse.typ}, angekündigt war ${datei.typ}.`);
  }
  if (masse.breite > MAX_BREITE) {
    throw new Error(
      `Das Bild ist ${masse.breite} px breit – erlaubt sind ${MAX_BREITE} px. Bitte über die Bearbeitungsansicht hochladen, die verkleinert selbst.`,
    );
  }

  const ordner = path.join(uploadsDir, slug);
  mkdirSync(ordner, { recursive: true });
  writeFileSync(path.join(ordner, `${rolle}.jpg`), datei.inhalt);

  // Absoluter Pfad: die Bearbeitungsansicht und der Entwurf unter
  // /entwuerfe/<slug>/ liegen auf demselben Server, beide erreichen ihn.
  const pfad = `/uploads/${slug}/${rolle}.jpg`;
  const vorhanden = loadLeadEdits(slug);
  saveLeadEdits(slug, {
    ...vorhanden,
    bilder: { ...vorhanden.bilder, [rolle]: pfad },
  });

  return { pfad, breite: masse.breite, hoehe: masse.hoehe };
}
