// Aus einer Chat-Nachricht ein erstes Briefing (Phase E, Punkt 6).
//
// Eingabe: freier Text (wie im Chat geschrieben) + Mediendateien.
// Ausgabe: Briefing-Entwurf, Slot-Zuordnung je Datei und Rückfragen – aber
// NUR für wirklich mehrdeutige oder rechtlich ungeklärte Fälle.
//
// Regelbasiert und reproduzierbar, kein Sprachmodell: Was aus dem Text
// folgt, wird als „vorschlag“ eingetragen (Quelle: Chat), außer der Text
// sagt ausdrücklich, dass es vom Kunden kommt („laut Wirt“, „Kunde sagt“,
// „bestätigt“) – dann „bestaetigt“. Fotos gelten erst mit ausdrücklicher
// Nutzungsaussage als freigegeben.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { leiteBriefingAb, feld } from "./briefing.js";

const AKTIONEN = [
  ["reservieren", /reservier|tisch\s+buch/i],
  ["bestellen", /bestell|abhol|liefer|to\s*go|mitnehm/i],
  ["anrufen", /anruf|telefonisch|am telefon/i],
  ["informieren", /öffnungszeit|informier|nur info/i],
];

const SLOT_WOERTER = [
  ["logo", /logo/i],
  ["haus", /fassade|aussen|außen|eingang|haus|schild/i],
  ["team", /team|koch|köchin|wirt|chef|kueche|küche|personal/i],
  ["raum", /innen|gastraum|stube|raum|tresen|theke|bar|terrasse|garten/i],
  ["hero", /hero|titel|aufmacher|stimmung/i],
];

const normal = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Bildgröße aus dem Dateikopf (PNG/JPEG), ohne Abhängigkeit. */
export function bildGroesse(puffer) {
  if (puffer.length > 24 && puffer.toString("ascii", 1, 4) === "PNG") return { breite: puffer.readUInt32BE(16), hoehe: puffer.readUInt32BE(20) };
  if (puffer[0] === 0xff && puffer[1] === 0xd8) {
    let i = 2;
    while (i < puffer.length - 9) {
      if (puffer[i] !== 0xff) return null;
      const marke = puffer[i + 1];
      const laenge = puffer.readUInt16BE(i + 2);
      if (marke >= 0xc0 && marke <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marke)) return { breite: puffer.readUInt16BE(i + 7), hoehe: puffer.readUInt16BE(i + 5) };
      i += 2 + laenge;
    }
  }
  return null;
}

function saetze(text) {
  return text.split(/(?<=[.!?\n])\s+/).map((s) => s.trim()).filter(Boolean);
}

/** Stammt die Aussage ausdrücklich vom Kunden? */
const vomKunden = (satz) => /laut (wirt|kunde|inhaber)|(kunde|wirt|inhaber|chef)(in)? (sagt|will|möchte|wünscht)|hat bestätigt|bestätigt/i.test(satz);

/**
 * @param {object} p
 * @param {string} p.text
 * @param {{pfad: string, breite?: number, hoehe?: number}[]} [p.dateien]
 * @param {object} p.lead
 * @param {string} p.kueche
 * @param {string} [p.stimmung]
 * @param {object} [p.menu] - Katalogkarte, um Gerichte in Dateinamen zu erkennen
 */
export function briefingAusChat({ text = "", dateien = [], lead, kueche, stimmung = null, menu = null }) {
  const briefing = leiteBriefingAb({ lead, kueche, stimmung, menu });
  briefing.erstellt = "chat";
  const f = briefing.felder;
  const rueckfragen = [];
  const s = saetze(text);
  const status = (satz) => (vomKunden(satz) ? "bestaetigt" : "vorschlag");
  const quelle = "Chat mit der Agentur";

  // Hauptaktion
  const gefunden = AKTIONEN.map(([a, re]) => ({ a, satz: s.find((x) => re.test(x)) })).filter((x) => x.satz);
  // Betonung („vor allem“, „hauptsächlich“ …): gewählt wird die Aktion, die
  // direkt nach der Betonung steht – auch wenn der Satz eine zweite nennt.
  const BETONUNG = /vor allem|haupts[äa]chlich|in erster linie|am wichtigsten|wichtigste/i;
  const abstand = (x) => {
    const b = BETONUNG.exec(x.satz);
    if (!b) return Infinity;
    const re = AKTIONEN.find(([a]) => a === x.a)[1];
    const rest = x.satz.slice(b.index);
    const m = re.exec(rest);
    return m ? m.index : Infinity;
  };
  const betont = gefunden.filter((x) => abstand(x) < Infinity).sort((x, y) => abstand(x) - abstand(y));
  const wahl = betont[0] ?? (gefunden.length === 1 ? gefunden[0] : null);
  if (wahl) f.aktion.haupt = feld(wahl.a, status(wahl.satz), quelle, wahl.satz);
  else if (gefunden.length > 1) rueckfragen.push({ feld: "aktion.haupt", frage: `Was ist die Hauptaktion: ${gefunden.map((x) => x.a).join(" oder ")}?`, grund: "mehrdeutig" });

  // Stil, No-Gos, Farben, Referenzen
  const noGos = s.filter((x) => /(bitte )?kein(e|en)? |auf keinen fall|no-?go|nicht (so|wie)/i.test(x) && !/reservier|bestell/i.test(x));
  const wuensche = s.filter((x) => /(soll|wirken|stil|gefühl|atmosphäre|look|so wie|ähnlich wie)/i.test(x) && !noGos.includes(x) && !/foto|bild/i.test(x));
  if (noGos.length) f.stil.noGos = feld(noGos, noGos.some(vomKunden) ? "bestaetigt" : "vorschlag", quelle);
  if (wuensche.length) f.stil.wuensche = feld(wuensche, wuensche.some(vomKunden) ? "bestaetigt" : "vorschlag", quelle);
  const farben = [...text.matchAll(/#[0-9a-f]{6}\b/gi)].map((m) => m[0].toLowerCase());
  if (farben.length) f.marke.farben = feld(farben, "vorschlag", quelle, "Hausfarben laut Chat – mit Logo/Schild abgleichen");
  const urls = [...text.matchAll(/https?:\/\/[^\s)]+/g)].map((m) => m[0]);
  if (urls.length) f.stil.referenzen = feld(urls, "vorschlag", quelle, "Referenz, keine Kopiervorlage");

  // Fotos: Herkunft und Freigabe nur aus ausdrücklichen Aussagen
  const fotoSaetze = s.filter((x) => /foto|bild|aufnahme|video/i.test(x));
  const fotoText = fotoSaetze.join(" ");
  const ki = /\bki\b|generiert|midjourney|dall|replicate/i.test(fotoText);
  const internet = /internet|google.?bilder|instagram|von (der )?website|heruntergeladen|stock|unsplash/i.test(fotoText);
  const freigabe = /(selbst|selber) (fotografiert|gemacht)|nutzungsrecht|dürfen (wir|sie|ihr) (sie |die fotos )?(verwenden|nutzen)|freigegeben|rechte (liegen|hat)/i.test(fotoText);
  const herkunft = ki ? "ki" : internet ? "unklar" : "eigen";
  if (dateien.length && internet) rueckfragen.push({ feld: "medien.fotos", frage: "Die Fotos stammen laut Chat aus dem Internet/Social Media. Wer hat sie gemacht, und liegen die Nutzungsrechte beim Betrieb?", grund: "rechtlich ungeklärt" });
  else if (dateien.length && !freigabe) rueckfragen.push({ feld: "medien.fotos", frage: "Dürfen wir die geschickten Fotos auf der Website verwenden (wer hat sie gemacht)?", grund: "rechtlich ungeklärt" });

  const gerichte = (menu?.kategorien ?? []).flatMap((k) => k.gerichte.map((g) => g.name));
  const zuordnung = [];
  for (const d of dateien) {
    const name = normal(path.basename(d.pfad, path.extname(d.pfad)));
    let groesse = d.breite ? { breite: d.breite, hoehe: d.hoehe } : null;
    if (!groesse && existsSync(d.pfad)) groesse = bildGroesse(readFileSync(d.pfad).subarray(0, 65536));
    const quer = groesse ? groesse.breite / groesse.hoehe >= 1.3 : null;
    const treffer = SLOT_WOERTER.filter(([, re]) => re.test(name)).map(([slot]) => slot);
    const gericht = gerichte.find((g) => normal(g).split(" ").filter((w) => w.length > 3).some((w) => name.includes(w)));
    if (gericht) treffer.push("gericht");
    let slot = treffer.length === 1 ? treffer[0] : null;
    let grund = slot ? `Dateiname „${path.basename(d.pfad)}“` : "";
    if (!slot && treffer.length === 0 && quer) {
      slot = "hero";
      grund = "Querformat ohne Hinweis im Namen – Kandidat für den Aufmacher";
    }
    if (!slot) rueckfragen.push({ feld: "medien.fotos", frage: `Was zeigt „${path.basename(d.pfad)}“ (${treffer.length ? `passt zu ${treffer.join(" und ")}` : "kein Hinweis im Namen"})?`, grund: "mehrdeutig" });
    if (groesse && Math.max(groesse.breite, groesse.hoehe) < 1200) rueckfragen.push({ feld: "medien.fotos", frage: `„${path.basename(d.pfad)}“ ist nur ${groesse.breite}×${groesse.hoehe} px – gibt es eine größere Fassung?`, grund: "Qualität" });
    zuordnung.push({ datei: d.pfad, slot, gericht: slot === "gericht" ? gericht : null, groesse, grund });
  }
  if (dateien.length) {
    const fotos = zuordnung.map((z) => ({
      datei: z.datei,
      rolle: z.slot === "raum" ? "ambiente" : z.slot,
      gericht: z.gericht ?? undefined,
      herkunft,
      freigabe: freigabe && herkunft !== "unklar" ? "laut Chat" : null,
      motiv: z.gericht ?? path.basename(z.datei),
      quelle: "Chat",
    }));
    f.medien.fotos = feld(fotos, "uebernommen", quelle, freigabe ? "" : "Nutzungsfreigabe offen");
  }
  return { briefing, zuordnung, rueckfragen };
}
