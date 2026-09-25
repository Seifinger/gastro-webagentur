// Echte, einfarbige PNG-Dateien beliebiger Größe für Upload-Tests – ohne
// Bildbibliothek (zlib reicht für PNG).

import { deflateSync } from "node:zlib";

const CRC_TABELLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(puffer) {
  let c = 0xffffffff;
  for (const b of puffer) c = CRC_TABELLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function block(typ, daten) {
  const laenge = Buffer.alloc(4);
  laenge.writeUInt32BE(daten.length);
  const kopfUndDaten = Buffer.concat([Buffer.from(typ, "latin1"), daten]);
  const pruef = Buffer.alloc(4);
  pruef.writeUInt32BE(crc32(kopfUndDaten));
  return Buffer.concat([laenge, kopfUndDaten, pruef]);
}

export function png(breite, hoehe, [r, g, b] = [180, 80, 40]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breite, 0);
  ihdr.writeUInt32BE(hoehe, 4);
  ihdr[8] = 8; // Bittiefe
  ihdr[9] = 2; // RGB
  const zeile = Buffer.alloc(1 + breite * 3);
  for (let x = 0; x < breite; x += 1) zeile.set([r, g, b], 1 + x * 3);
  const roh = Buffer.concat(Array.from({ length: hoehe }, () => zeile));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    block("IHDR", ihdr),
    block("IDAT", deflateSync(roh)),
    block("IEND", Buffer.alloc(0)),
  ]);
}

/** Beginnt wie eine WebM-Datei (EBML-Kopf) – genug für die Byte-Prüfung des Servers. */
export function webmKopf() {
  return Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(64, 1)]);
}
