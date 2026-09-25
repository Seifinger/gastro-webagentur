// Entfernt Metadaten aus hochgeladenen Bildern, bevor sie gespeichert und
// später auf einer Kundenseite veröffentlicht werden (Audit 25.09.2026).
//
// Fotos vom Telefon tragen oft den Aufnahmeort (GPS), Kamera-Seriennummer,
// Aufnahmezeit, Namen und Bearbeitungsverläufe. Nichts davon gehört auf eine
// öffentliche Restaurantseite. Ohne Bildbibliothek, rein auf Byte-Ebene:
//
//   JPEG  APP1 (Exif, XMP), APP3–APP13, APP15, COM und angehängte
//         Zusatzbilder (MPF) fallen weg. Behalten: JFIF (APP0), ICC-Farbprofil
//         (APP2), Adobe (APP14, nötig für die Farben) und die Ausrichtung als
//         minimaler Exif-Block – sonst stünden Hochkant-Fotos quer.
//   PNG   tEXt, zTXt, iTXt, eXIf, tIME fallen weg.
//   WebP  EXIF- und XMP-Blöcke fallen weg (Kennbits in VP8X werden gelöscht).
//
// Videos werden nicht umgeschrieben (Container-Offsets). Ein MP4 mit
// Standortangabe wird stattdessen mit klarer Meldung abgelehnt.

const MARKE_SOS = 0xda;
const MARKE_EOI = 0xd9;

function ausrichtungAusExif(nutzlast) {
  // nutzlast = "Exif\0\0" + TIFF
  if (nutzlast.length < 14 || nutzlast.toString("latin1", 0, 6) !== "Exif\0\0") return 1;
  const tiff = nutzlast.subarray(6);
  const le = tiff.toString("latin1", 0, 2) === "II";
  if (!le && tiff.toString("latin1", 0, 2) !== "MM") return 1;
  const u16 = (o) => (le ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o));
  const u32 = (o) => (le ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o));
  try {
    const ifd = u32(4);
    const anzahl = u16(ifd);
    for (let i = 0; i < anzahl; i += 1) {
      const eintrag = ifd + 2 + i * 12;
      if (u16(eintrag) === 0x0112) {
        const wert = u16(eintrag + 8);
        return wert >= 1 && wert <= 8 ? wert : 1;
      }
    }
  } catch {
    return 1;
  }
  return 1;
}

function minimalesExif(ausrichtung) {
  const b = Buffer.alloc(2 + 2 + 6 + 26);
  b.writeUInt16BE(0xffe1, 0);
  b.writeUInt16BE(b.length - 2, 2);
  b.write("Exif\0\0", 4, "latin1");
  const t = 10;
  b.write("MM", t, "latin1");
  b.writeUInt16BE(42, t + 2);
  b.writeUInt32BE(8, t + 4); // IFD0 direkt nach dem Kopf
  b.writeUInt16BE(1, t + 8); // ein Eintrag
  b.writeUInt16BE(0x0112, t + 10); // Orientation
  b.writeUInt16BE(3, t + 12); // SHORT
  b.writeUInt32BE(1, t + 14);
  b.writeUInt16BE(ausrichtung, t + 18);
  b.writeUInt32BE(0, t + 22); // kein weiteres IFD
  return b;
}

function behalteJpegSegment(marke, nutzlast) {
  if (marke === 0xe0 || marke === 0xee) return true; // JFIF, Adobe
  if (marke === 0xe2) return nutzlast.toString("latin1", 0, 12) === "ICC_PROFILE\0";
  if (marke >= 0xe1 && marke <= 0xef) return false; // Exif/XMP, IPTC, Hersteller
  if (marke === 0xfe) return false; // Kommentar
  return true; // Tabellen, Rahmen, Scan
}

/** Liefert das bereinigte Bild – oder null, wenn die Struktur nicht sicher lesbar ist. */
export function bereinigeJpeg(puffer) {
  if (puffer.length < 4 || puffer[0] !== 0xff || puffer[1] !== 0xd8) return null;
  const teile = [puffer.subarray(0, 2)];
  let ausrichtung = 1;
  let exifEingefuegt = false;
  let i = 2;
  while (i + 2 <= puffer.length) {
    if (puffer[i] !== 0xff) return null; // unerwartete Struktur
    const marke = puffer[i + 1];
    if (marke === 0xff) {
      i += 1; // Füllbyte
      continue;
    }
    if (marke === MARKE_EOI) {
      teile.push(puffer.subarray(i, i + 2));
      return Buffer.concat(teile); // alles danach (z. B. MPF-Zusatzbilder) fällt weg
    }
    if (i + 4 > puffer.length) return null;
    const laenge = puffer.readUInt16BE(i + 2);
    const ende = i + 2 + laenge;
    if (laenge < 2 || ende > puffer.length) return null;
    const nutzlast = puffer.subarray(i + 4, ende);
    if (marke === 0xe1 && nutzlast.toString("latin1", 0, 6) === "Exif\0\0") ausrichtung = ausrichtungAusExif(nutzlast);
    // Die Ausrichtung kommt vor den ersten Rahmen-/Tabellen-Segmenten, direkt nach JFIF.
    if (!exifEingefuegt && !(marke === 0xe0 || marke === 0xe1)) {
      if (ausrichtung !== 1) teile.push(minimalesExif(ausrichtung));
      exifEingefuegt = true;
    }
    if (behalteJpegSegment(marke, nutzlast)) teile.push(puffer.subarray(i, ende));
    i = ende;
    if (marke === MARKE_SOS) {
      // Bilddaten bis zur nächsten echten Marke (nicht FF00, nicht RSTn).
      let j = i;
      while (j + 1 < puffer.length && !(puffer[j] === 0xff && puffer[j + 1] !== 0x00 && !(puffer[j + 1] >= 0xd0 && puffer[j + 1] <= 0xd7))) j += 1;
      teile.push(puffer.subarray(i, j));
      i = j;
    }
  }
  return null; // kein EOI gefunden
}

const PNG_WEG = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);

export function bereinigePng(puffer) {
  if (puffer.length < 8 || puffer.readUInt32BE(0) !== 0x89504e47) return null;
  const teile = [puffer.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= puffer.length) {
    const laenge = puffer.readUInt32BE(i);
    const typ = puffer.toString("latin1", i + 4, i + 8);
    const ende = i + 12 + laenge;
    if (ende > puffer.length) return null;
    if (!PNG_WEG.has(typ)) teile.push(puffer.subarray(i, ende));
    i = ende;
    if (typ === "IEND") return Buffer.concat(teile);
  }
  return null;
}

export function bereinigeWebp(puffer) {
  if (puffer.length < 12 || puffer.toString("latin1", 0, 4) !== "RIFF" || puffer.toString("latin1", 8, 12) !== "WEBP") return null;
  const teile = [];
  let i = 12;
  while (i + 8 <= puffer.length) {
    const typ = puffer.toString("latin1", i, i + 4);
    const laenge = puffer.readUInt32LE(i + 4);
    const ende = i + 8 + laenge + (laenge % 2);
    if (i + 8 + laenge > puffer.length) return null;
    if (typ !== "EXIF" && typ !== "XMP ") {
      const stueck = Buffer.from(puffer.subarray(i, Math.min(ende, puffer.length)));
      if (typ === "VP8X" && stueck.length > 8) stueck[8] &= ~(0x08 | 0x04); // Kennbits EXIF/XMP
      teile.push(stueck);
    }
    i = ende;
  }
  const inhalt = Buffer.concat(teile);
  const kopf = Buffer.alloc(12);
  kopf.write("RIFF", 0, "latin1");
  kopf.writeUInt32LE(inhalt.length + 4, 4);
  kopf.write("WEBP", 8, "latin1");
  return Buffer.concat([kopf, inhalt]);
}

/** Ausrichtung (1–8) aus dem Exif-Block eines JPEG, 1 ohne Angabe. */
export function jpegAusrichtung(puffer) {
  let i = 2;
  while (i + 4 <= puffer.length && puffer[i] === 0xff && puffer[i + 1] !== MARKE_SOS) {
    const ende = i + 2 + puffer.readUInt16BE(i + 2);
    if (puffer[i + 1] === 0xe1) {
      const w = ausrichtungAusExif(puffer.subarray(i + 4, ende));
      if (w !== 1) return w;
    }
    i = ende;
  }
  return 1;
}

/**
 * Wirft, wenn sich ein Bild nicht sicher bereinigen lässt – Browser zeigen
 * auch leicht beschädigte Dateien an, samt allem, was darin steht.
 */
export function entferneBildMetadaten(puffer, typ) {
  const bereinigen = { "image/jpeg": bereinigeJpeg, "image/png": bereinigePng, "image/webp": bereinigeWebp }[typ];
  if (!bereinigen) return puffer;
  const sauber = bereinigen(puffer);
  if (!sauber) throw new Error("Das Bild ist ungewöhnlich aufgebaut und lässt sich nicht sicher von Metadaten (z. B. Aufnahmeort) befreien. Bitte neu exportieren (z. B. „Als JPEG sichern“) und erneut hochladen.");
  return sauber;
}

/** Sucht im moov-Block eines MP4 nach einer Standortangabe (©xyz, Apple/QuickTime). */
export function mp4HatStandort(puffer) {
  let i = 0;
  while (i + 8 <= puffer.length) {
    let groesse = puffer.readUInt32BE(i);
    const typ = puffer.toString("latin1", i + 4, i + 8);
    let kopf = 8;
    if (groesse === 1 && i + 16 <= puffer.length) {
      groesse = Number(puffer.readBigUInt64BE(i + 8));
      kopf = 16;
    } else if (groesse === 0) {
      groesse = puffer.length - i;
    }
    if (groesse < kopf) return false;
    if (typ === "moov") {
      const moov = puffer.subarray(i + kopf, Math.min(i + groesse, puffer.length));
      return moov.includes(Buffer.from([0xa9, 0x78, 0x79, 0x7a])) || moov.includes(Buffer.from("com.apple.quicktime.location", "latin1"));
    }
    i += groesse;
  }
  return false;
}
