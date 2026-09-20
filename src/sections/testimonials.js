import { escapeHtml, formatCount } from "../htmlHelpers.js";
import {
  stimmenFuer,
  PLATZHALTER_ERKLAERUNG,
  PLATZHALTER_ERKLAERUNG_OHNE_PLAETZE,
} from "../testimonials.js";

/**
 * Gästestimmen. Bei echten Häusern bewusst Platzhalter: Google-Rezensionen
 * dürfen nicht gespeichert werden, und fremde Bewertungen auf einer
 * unbeauftragten Seite wären ohnehin nicht in Ordnung.
 */
export function renderStimmen(cuisine, lead, fiktiv, socialLayout = "grid-3", handschrift = null) {
  const { stimmen, slots, platzhalter } = stimmenFuer(cuisine, { fiktiv });

  // Leere Plätze statt erfundener Zitate: ohne Sterne und ohne Namen ist
  // nichts behauptet, der Aufbau ist trotzdem zu sehen.
  // Die fünf grauen Sterne des Platzhalters stehen mit 1.14:1 auf ihrem Grund
  // und behaupten nichts, was der Titel nicht schon sagt. Mit Handschrift
  // fallen sie weg; ohne sie bleibt alles wie bisher.
  const leereSterne = handschrift
    ? ""
    : '<span class="sterne leer" aria-hidden="true">★★★★★</span>\n        ';

  const karten = platzhalter
    ? slots
        .map(
          (titel) => `
      <div class="stimme ist-platzhalter">
        ${leereSterne}<p class="slot-titel">${escapeHtml(titel)}</p>
        <footer><span>wird aus Ihren Google-Bewertungen übernommen</span></footer>
      </div>`,
        )
        .join("")
    : stimmen
        .map(
          ({ text, autor, wann }) => `
      <blockquote class="stimme">
        <span class="sterne" aria-hidden="true">★★★★★</span>
        <p>${escapeHtml(text)}</p>
        <footer><strong>${escapeHtml(autor)}</strong><span>${escapeHtml(wann)}</span></footer>
      </blockquote>`,
        )
        .join("");

  const note = lead.rating
    ? `<div class="stimmen-note">
         <span class="note">${String(lead.rating).replace(".", ",")}</span>
         <span class="sterne" aria-hidden="true">${"★".repeat(Math.round(Number(lead.rating)))}</span>
         <span>von 5 auf Google${
           lead.anzahlBewertungen ? `, aus ${formatCount(lead.anzahlBewertungen)} Bewertungen` : ""
         }</span>
       </div>`
    : "";

  // "grid-3" ist das bisherige Verhalten und bekommt keine Zusatzklasse –
  // nur abweichende Layouts (bisher: "list") erhalten einen Modifier.
  const gridClass = socialLayout && socialLayout !== "grid-3" ? ` stimmen-grid--${socialLayout}` : "";
  const erklaerung = platzhalter
    ? `<p class="stimmen-erklaerung">${escapeHtml(PLATZHALTER_ERKLAERUNG)}</p>`
    : "";

  // Das Stimmenblatt des traditionellen Archetyps: die Note groß in einer
  // schmalen linken Spalte, die Zitate rechts untereinander. Ohne Note (ein
  // Lokal ohne Google-Bewertung) gäbe es links nichts zu sehen – dann bleibt
  // es beim einspaltigen Aufbau.
  const blatt = Boolean(handschrift) && note;
  if (blatt) {
    // Bei echten Häusern gibt es keine Zitate, nur die Zusage. Dann stehen
    // rechts nicht drei leere Plätze, sondern der Satz, der erklärt, was
    // dorthin kommt – und die Note trägt die Sektion allein.
    const rechts = platzhalter
      ? `<p class="stimmen-erklaerung">${escapeHtml(PLATZHALTER_ERKLAERUNG_OHNE_PLAETZE)}</p>`
      : `<div class="stimmen-grid${gridClass}">${karten}</div>`;

    return `
  <section class="section stimmen-section" id="stimmen">
    <div class="wrap">
      <div class="section-head">
        <div class="eyebrow">Gästestimmen</div>
        <h2>${platzhalter ? "Was Ihre Gäste sagen" : "Was unsere Gäste sagen"}</h2>
      </div>
      <div class="stimmen-blatt${platzhalter ? " stimmen-blatt--zusage" : ""}">
        <div class="stimmen-note-spalte">${note}</div>
        <div class="stimmen-zitate">
          ${rechts}
        </div>
      </div>
    </div>
  </section>`;
  }

  return `
  <section class="section stimmen-section" id="stimmen">
    <div class="wrap">
      <div class="section-head${handschrift ? "" : " mitte"}">
        <div class="eyebrow">Gästestimmen</div>
        <h2>Was unsere Gäste sagen</h2>
      </div>
      ${note}
      <div class="stimmen-grid${gridClass}">${karten}</div>
      ${erklaerung}
    </div>
  </section>`;
}
