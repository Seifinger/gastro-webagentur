// Bildplan je Seite (Art-Direction-Runde, Phase E).
//
// Für jeden Bildplatz, den die Creative Direction verlangt (cd.bilder.slots),
// entsteht ein Eintrag mit Motiv, Rolle, Zuschnitt desktop/mobil,
// Fokuspunkt, Overlay, Alt-Text und Herkunft – und einer Liste der
// abgelehnten Kandidaten samt Grund. Abgelehnte Medien landen im
// Qualitätsbericht statt auf der Seite.
//
// Vorrang: eigene Medien mit Nutzungsfreigabe > KI-Bilder mit Freigabe
// (intern gekennzeichnet) > gesichtete Stockfotos, die GENAU das zeigen,
// was der Platz behauptet > kein Bild. Ein Platz, der eine Tatsache über
// das Haus behauptet („Unser Haus“, „Team“, „Röstmaschine“), nimmt nie
// ein Stockfoto.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { feldAn } from "../briefing/briefing.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const STOCK_KATALOG_PFAD = path.join(__dirname, "..", "medien", "stockKatalog.json");

let katalogCache = null;
export function stockKatalog() {
  katalogCache ??= JSON.parse(readFileSync(STOCK_KATALOG_PFAD, "utf-8"));
  return katalogCache;
}

/** Plätze, die eine Tatsache über den Betrieb zeigen – nur eigenes Material. */
export const HAUS_PLAETZE = new Set(["haus", "team", "raum", "roestmaschine"]);

export const ZUSCHNITTE = {
  hero: { desktop: [16, 9], mobil: [4, 5] },
  gericht: { desktop: [4, 3], mobil: [1, 1] },
  ambiente: { desktop: [3, 2], mobil: [4, 5] },
};

const zuschnittFuer = (slot) => ZUSCHNITTE[slot.art ?? (slot.slot === "hero" ? "hero" : slot.gericht ? "gericht" : "ambiente")];

/** Unsplash/imgix-Adresse mit echtem Zuschnitt um den Fokuspunkt. */
export function stockUrl(id, { breite, verhaeltnis, fokus = [50, 50] }) {
  const hoehe = Math.round((breite * verhaeltnis[1]) / verhaeltnis[0]);
  return `https://images.unsplash.com/${id}?w=${breite}&h=${hoehe}&fit=crop&crop=focalpoint&fp-x=${(fokus[0] / 100).toFixed(2)}&fp-y=${(fokus[1] / 100).toFixed(2)}&q=70&fm=jpg&auto=format`;
}

/** Warum taugt ein Stockfoto für diesen Platz nicht? null = taugt. */
export function stockEignung(id, slot, kueche, katalog = stockKatalog()) {
  const e = katalog[id];
  if (!e) return "nicht gesichtet – steht nicht im Stock-Katalog";
  if (HAUS_PLAETZE.has(slot.slot)) return `Stockfoto zeigt einen fremden Ort („${e.zeigt}“) – für „${slot.motiv}“ nur eigene Fotos`;
  if (e.probleme?.length) return e.probleme.join("; ");
  if (slot.gericht && !(e.gerichte ?? []).includes(slot.gericht)) return `zeigt „${e.zeigt}“, nicht ${slot.gericht}`;
  if (!slot.gericht && e.kueche?.length && !e.kueche.includes(kueche)) return `passt nicht zur Küche (${e.kueche.join(", ")})`;
  return null;
}

function eigeneKandidaten(briefing, slotName) {
  const fotos = feldAn(briefing, "medien.fotos").wert ?? [];
  return fotos.filter((m) => m.datei && (m.herkunft === "eigen" || m.herkunft === "ki") && m.rolle === slotName);
}

function waehle(slot, kandidatenIds, briefing, abgelehnt, katalog) {
  for (const m of eigeneKandidaten(briefing, slot.slot)) {
    if (!m.freigabe) {
      abgelehnt.push({ quelle: m.datei, herkunft: m.herkunft, grund: "Nutzungsfreigabe ungeklärt – Rückfrage nötig" });
      continue;
    }
    if (m.eignung === false) {
      abgelehnt.push({ quelle: m.datei, herkunft: m.herkunft, grund: m.eignungGrund ?? "als ungeeignet markiert" });
      continue;
    }
    return { herkunft: m.herkunft, datei: m.datei, zeigt: m.motiv ?? slot.motiv, fokus: m.fokus ?? [50, 50], kennzeichnung: m.herkunft === "ki" ? "KI-generiert" : "eigenes Foto" };
  }
  for (const id of kandidatenIds ?? []) {
    const grund = stockEignung(id, slot, briefing.kueche, katalog);
    if (grund) {
      abgelehnt.push({ quelle: `stock:${id}`, herkunft: "stock", zeigt: katalog[id]?.zeigt, grund });
      continue;
    }
    return { herkunft: "stock", id, zeigt: katalog[id].zeigt, fokus: katalog[id].fokus ?? [50, 50], kennzeichnung: "Beispielfoto" };
  }
  return null;
}

/**
 * @returns {{ plaetze: object[], abgelehnt: object[], fehlend: object[] }}
 */
export function erstelleBildplan({ briefing, cd, katalog = stockKatalog() }) {
  const plaetze = [];
  const abgelehntAlle = [];
  const fehlend = [];
  for (const slot of cd?.bilder?.slots ?? []) {
    const abgelehnt = [];
    const gewaehlt = waehle(slot, slot.kandidaten, briefing, abgelehnt, katalog);
    const zuschnitt = { desktop: slot.zuschnitt?.desktop ?? zuschnittFuer(slot).desktop, mobil: slot.zuschnitt?.mobil ?? zuschnittFuer(slot).mobil };
    let mobil = null;
    if (slot.mobil) {
      mobil = waehle({ ...slot, ...slot.mobil, slot: slot.slot }, slot.mobil.kandidaten, briefing, abgelehnt, katalog);
    }
    abgelehntAlle.push(...abgelehnt.map((a) => ({ slot: slot.slot, ...a })));
    if (!gewaehlt) fehlend.push({ slot: slot.slot, motiv: slot.motiv, grund: abgelehnt.length ? "alle Kandidaten ungeeignet" : "kein Kandidat" });
    plaetze.push({
      slot: slot.slot,
      motiv: slot.motiv,
      rolle: slot.gericht ? `zeigt das Kartengericht „${slot.gericht}“` : slot.slot === "hero" ? "Eingang der Seite" : "Stimmung",
      gewaehlt,
      mobil: mobil ? { ...mobil, grund: slot.mobil.motiv } : null,
      zuschnitt,
      fokus: gewaehlt?.fokus ?? [50, 50],
      overlay: "keins – Text steht nie auf dem Foto",
      alt: gewaehlt ? (slot.gericht ? `${slot.gericht}${gewaehlt.herkunft === "stock" ? " (Beispielfoto)" : ""}` : gewaehlt.zeigt) : null,
      altMobil: mobil ? mobil.zeigt : null,
      abgelehnt,
    });
  }
  return { plaetze, abgelehnt: abgelehntAlle, fehlend };
}

/** Bildplatz nach Name. */
export function platz(bildplan, name) {
  return bildplan.plaetze.find((p) => p.slot === name && p.gewaehlt) ?? null;
}

/**
 * <picture> mit eigenem Mobil-Ausschnitt oder -Motiv. Breite/Höhe stehen
 * im Markup (kein Layoutsprung), das Hero-Bild lädt priorisiert.
 */
export function bildMarkup(p, { breiteDesktop = 1600, breiteMobil = 800, prioritaet = false, klasse = "", bildUrlFuer = null } = {}) {
  if (!p?.gewaehlt) return "";
  const url = (medium, verhaeltnis, breite) =>
    bildUrlFuer ? bildUrlFuer(medium, verhaeltnis, breite) : medium.herkunft === "stock" ? stockUrl(medium.id, { breite, verhaeltnis, fokus: medium.fokus }) : medium.datei;
  const d = p.zuschnitt.desktop;
  const m = p.zuschnitt.mobil;
  const mobilMedium = p.mobil ?? p.gewaehlt;
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const hoehe = Math.round((breiteDesktop * d[1]) / d[0]);
  const stil = `--fx:${p.fokus[0]}%;--fy:${p.fokus[1]}%;--ar-d:${d[0]} / ${d[1]};--ar-m:${m[0]} / ${m[1]}`;
  return `<picture class="bp${klasse ? ` ${klasse}` : ""}" style="${stil}" data-herkunft="${esc(p.gewaehlt.herkunft)}">
    <source media="(max-width: 767px)" srcset="${esc(url(mobilMedium, m, breiteMobil))}">
    <img src="${esc(url(p.gewaehlt, d, breiteDesktop))}" srcset="${esc(url(p.gewaehlt, d, Math.round(breiteDesktop / 2)))} ${Math.round(breiteDesktop / 2)}w, ${esc(url(p.gewaehlt, d, breiteDesktop))} ${breiteDesktop}w" sizes="(max-width: 767px) 100vw, 60vw" width="${breiteDesktop}" height="${hoehe}" alt="${esc(p.alt)}"${prioritaet ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">
  </picture>`;
}

export function bildplanMarkdown(bildplan) {
  const z = ["| Platz | Motiv | Gewählt | Herkunft | Zuschnitt D / M | Fokus | Mobil anders | Alt-Text |", "|---|---|---|---|---|---|---|---|"];
  for (const p of bildplan.plaetze) {
    z.push(`| ${p.slot} | ${p.motiv} | ${p.gewaehlt ? p.gewaehlt.zeigt : "**kein geeignetes Bild**"} | ${p.gewaehlt?.kennzeichnung ?? "–"} | ${p.zuschnitt.desktop.join(":")} / ${p.zuschnitt.mobil.join(":")} | ${p.fokus.join(" %, ")} % | ${p.mobil ? p.mobil.zeigt : "gleiches Motiv, eigener Ausschnitt"} | ${p.alt ?? "–"} |`);
  }
  z.push("", "**Abgelehnte Medien**", "");
  if (!bildplan.abgelehnt.length) z.push("- keine");
  for (const a of bildplan.abgelehnt) z.push(`- ${a.slot}: \`${a.quelle}\`${a.zeigt ? ` („${a.zeigt}“)` : ""} – ${a.grund}`);
  return z.join("\n");
}
