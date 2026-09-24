// Abschnitte, die es nur auf Seiten mit Ausdruck gibt (Gestaltungs-Umbau, AP6).
//
// Die Reihenfolge kommt aus dem Profil (ausdruck.js, `abfolge`), nicht mehr
// aus dem Archetyp. Bestehende Abschnitte (Karte, Reservierung, Kontakt)
// werden wiederverwendet, damit Bestell- und Formularverträge unverändert
// bleiben; neu sind nur die Formen, die eine Seite nach einem Haus aussehen
// lassen statt nach einer Vorlage:
//
//   tisch  – drei Gerichte als Collage ungleicher Größen (kein Kartenraster)
//   haus   – Raum-Band: ein breites Bild, darauf versetzt ein schmaler Text
//
// Die Einladung (buehne.js) steht direkt unter der Bühne.

import { escapeHtml, formatPrice, plus } from "../v1Funktionen.js";
import { bild } from "./kopf.js";

const e = escapeHtml;

function vorbestellen(g, texte) {
  return `<button class="btn btn-ghost btn-klein" type="button" data-add="${e(g.id)}" data-name="${e(g.name)}" data-preis="${g.preis}">${plus()} ${e(texte.highlights.vorbestellen)}</button>`;
}

/** Heute auf dem Tisch: ein großes und zwei versetzte kleinere Gerichte. */
export function renderTisch({ texte, highlights, medien, fiktiv }) {
  const t = texte.tisch;
  const gerichte = highlights.slice(0, 3);
  const teller = (g, i) => `<article class="teller teller--${i + 1} auftritt">
      <figure class="teller-bild">${bild(medien.gericht(g), { alt: g.name })}</figure>
      <div class="teller-text">
        <h3>${e(g.name)}</h3>
        <p class="teller-desc">${e(g.beschreibung)}</p>
        <div class="teller-fuss"><span class="preis">${formatPrice(g.preis)}</span>${vorbestellen(g, texte)}</div>
      </div>
    </article>`;
  return `<section class="sektion tisch" id="highlights" data-atmosphaere="an">
  <div class="rahmen">
    <header class="tisch-kopf">
      <p class="rubrik">${e(t.rubrik)}</p>
      <h2>${e(t.titel)}</h2>
      <p class="intro">${e(t.intro)}${fiktiv ? "" : ` <span class="marke-klein marke-klein--signal">${e(texte.platzhalter)}</span>`}</p>
    </header>
    <div class="tisch-collage">${gerichte.map(teller).join("")}</div>
  </div>
</section>`;
}

/** Das Haus als Raum-Band. Ohne Bild bleibt nur der Text – nichts wird aufgefüllt. */
export function renderHausBand({ texte, medien, fiktiv }) {
  const a = texte.ambiente;
  // Ein Bild, das "unser Haus" zeigt, muss das Haus sein: eigenes Foto oder KI
  // mit Kennzeichnung; Stock nur auf erfundenen Beispielseiten; der gezeichnete
  // SVG-Platzhalter nie (er würde als leere Fläche gestreckt).
  const m = medien.haus;
  const haus = m?.src && m.quelle !== "platzhalter:svg" && (fiktiv || m.herkunft !== "platzhalter") ? m : null;
  const hinweis = fiktiv ? "" : ` <span class="marke-klein marke-klein--signal">${e(texte.platzhalter)}</span>`;
  return `<section class="haus-band${haus ? "" : " haus-band--ohne-bild"}" id="ambiente" data-atmosphaere="an">
  ${haus ? `<figure class="haus-band-bild">${bild(haus, { alt: a.slots[0].titel })}</figure>` : ""}
  <div class="rahmen">
    <div class="haus-band-text auftritt">
      <p class="rubrik">${e(a.rubrik)}</p>
      <h2>${e(a.titel)}</h2>
      <p class="intro">${e(a.text)}${hinweis}</p>
    </div>
  </div>
</section>`;
}

export const ABFOLGE_CSS = `
/* Einladung zweispaltig: links das Haus, rechts der Besuch (nur echte Angaben). */
.einladung-innen { justify-items: start; text-align: left; }
.einladung .bewertung { justify-content: flex-start; }
.einladung-aktionen { justify-content: flex-start; }
.einladung-besuch { display: grid; gap: var(--s-2); width: 100%; padding-top: var(--s-3); border-top: 1px solid var(--linie); }
.einladung-besuch h2 { font-size: var(--t-h3); }
.einladung-adresse { font-style: normal; color: var(--text-leise); }
.einladung-adresse a { color: var(--akzent-text); }
@media (min-width: 1024px) {
  .einladung-innen { grid-template-columns: 7fr 4fr; column-gap: calc(var(--rinne) * 2); align-items: end; }
  .einladung-haus { display: grid; gap: var(--s-2); }
  .einladung-besuch { padding-top: 0; padding-left: var(--s-4); border-top: 0; border-left: 1px solid var(--linie); }
}

/* Tisch: Collage statt Kartenraster – ungleiche Größen, versetzte Kanten. */
.tisch-kopf { max-width: var(--text-breite); margin-bottom: var(--s-6); }
.tisch-collage { display: grid; gap: var(--s-6); }
.teller { display: grid; gap: var(--s-2); }
.teller-bild { position: relative; overflow: hidden; border-radius: var(--r-bild); background: var(--flaeche-tief); aspect-ratio: 4 / 5; }
.teller-bild img { width: 100%; height: 100%; object-fit: cover; }
.teller--2 .teller-bild { aspect-ratio: 4 / 3; }
.teller--3 .teller-bild { aspect-ratio: 1 / 1; }
.teller h3 { font-size: var(--t-h3); }
.teller--1 h3 { font-size: var(--t-h2); }
.teller-desc { color: var(--text-leise); max-width: 46ch; }
.teller-fuss { display: flex; align-items: center; gap: var(--s-2); flex-wrap: wrap; }
.teller-fuss .preis { margin-right: auto; font-family: var(--f-display); font-size: var(--t-gross); font-variant-numeric: tabular-nums; }
@media (max-width: 767px) {
  .teller--2 { width: 88%; margin-left: auto; }
  .teller--3 { width: 72%; }
}
@media (min-width: 768px) {
  .tisch-collage { grid-template-columns: repeat(12, 1fr); column-gap: var(--rinne); row-gap: var(--s-8); align-items: start; }
  .teller--1 { grid-column: 1 / span 7; grid-row: 1 / span 2; }
  .teller--2 { grid-column: 8 / span 5; }
  .teller--3 { grid-column: 9 / span 4; }
}

/* Haus als Raum-Band: breites Bild, der Text schiebt sich versetzt darüber. */
.haus-band { position: relative; padding-bottom: var(--sektion); }
.haus-band-bild { position: relative; height: 56svh; overflow: hidden; background: var(--flaeche-tief); }
.haus-band-bild img { width: 100%; height: 100%; object-fit: cover; }
.haus-band-text { position: relative; max-width: 40rem; margin-top: calc(var(--s-12) * -1); padding: var(--s-5) var(--s-4); background: var(--grund); }
.haus-band--ohne-bild { padding-top: var(--sektion); }
.haus-band--ohne-bild .haus-band-text { margin-top: 0; padding-inline: 0; }
@media (min-width: 1024px) { .haus-band-text { margin-left: calc(100% / 12); } }
`;
