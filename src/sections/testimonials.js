import { escapeHtml, formatCount } from "../htmlHelpers.js";
import { stimmenFuer, PLATZHALTER_ERKLAERUNG } from "../testimonials.js";

/**
 * Gästestimmen. Bei echten Häusern bewusst Platzhalter: Google-Rezensionen
 * dürfen nicht gespeichert werden, und fremde Bewertungen auf einer
 * unbeauftragten Seite wären ohnehin nicht in Ordnung.
 */
export function renderStimmen(cuisine, lead, fiktiv, socialLayout = "grid-3") {
  const { stimmen, slots, platzhalter } = stimmenFuer(cuisine, { fiktiv });

  // Leere Plätze statt erfundener Zitate: ohne Sterne und ohne Namen ist
  // nichts behauptet, der Aufbau ist trotzdem zu sehen.
  const karten = platzhalter
    ? slots
        .map(
          (titel) => `
      <div class="stimme ist-platzhalter">
        <span class="sterne leer" aria-hidden="true">★★★★★</span>
        <p class="slot-titel">${escapeHtml(titel)}</p>
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

  return `
  <section class="section stimmen-section" id="stimmen">
    <div class="wrap">
      <div class="section-head mitte">
        <div class="eyebrow">Gästestimmen</div>
        <h2>Was unsere Gäste sagen</h2>
      </div>
      ${note}
      <div class="stimmen-grid${gridClass}">${karten}</div>
      ${platzhalter ? `<p class="stimmen-erklaerung">${escapeHtml(PLATZHALTER_ERKLAERUNG)}</p>` : ""}
    </div>
  </section>`;
}
