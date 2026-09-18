import { escapeHtml, formatPrice } from "../htmlHelpers.js";

function renderHighlightCards(highlights, bildUrl, showBadges, beschreibungFuer) {
  return highlights
    .map((gericht) => {
      const veg = showBadges && gericht.vegetarisch ? '<span class="veg">vegetarisch</span>' : "";
      return `
      <article class="hl-card">
        <div class="hl-media">
          <img src="${escapeHtml(bildUrl(gericht.bild, "gericht"))}" alt="${escapeHtml(gericht.name)}" loading="lazy">
          <span class="hl-kat">${escapeHtml(gericht.kategorie)}</span>
        </div>
        <div class="hl-body">
          <h3 class="hl-name">${escapeHtml(gericht.name)}</h3>
          <p class="hl-desc">${escapeHtml(beschreibungFuer(gericht.id, gericht.beschreibung))}</p>
          <div class="hl-foot">
            <span class="hl-preis">${formatPrice(gericht.preis)}</span>
            ${veg}
            <button class="add-btn" type="button" data-add="${gericht.id}" data-name="${escapeHtml(gericht.name)}" data-preis="${gericht.preis}">
              <span aria-hidden="true">+</span> Vorbestellen
            </button>
          </div>
        </div>
      </article>`;
    })
    .join("");
}

/**
 * Die Highlight-Sektion: bebilderte Auswahl aus der Karte plus der
 * dreistufige Abhol-Ablauf.
 *
 * @param {object} ctx
 * @param {Array} ctx.highlights
 * @param {Function} ctx.bildUrl
 * @param {boolean} ctx.showBadges - preset.menu.showBadges.
 * @param {Function} ctx.beschreibungFuer
 * @param {string} ctx.spalten - "spalten-3" oder "".
 */
export function renderHighlights({ highlights, bildUrl, showBadges, beschreibungFuer, spalten }) {
  return `
<section class="section" id="highlights">
  <div class="wrap">
    <div class="section-head mitte">
      <div class="eyebrow">Unsere Highlights</div>
      <h2>Das bestellen unsere Gäste am liebsten</h2>
      <p>Alles frisch zubereitet. Zum Abholen einfach vorbestellen und zur Wunschzeit mitnehmen.</p>
    </div>

    <div class="hl-grid ${spalten}">${renderHighlightCards(highlights, bildUrl, showBadges, beschreibungFuer)}</div>

    <div class="steps">
      <div class="step">
        <div class="step-n">1</div>
        <div><h3>Aussuchen</h3><p>Gerichte antippen und in den Warenkorb legen.</p></div>
      </div>
      <div class="step">
        <div class="step-n">2</div>
        <div><h3>Abholzeit wählen</h3><p>Sie bestimmen, wann Ihr Essen fertig sein soll.</p></div>
      </div>
      <div class="step">
        <div class="step-n">3</div>
        <div><h3>Abholen &amp; zahlen</h3><p>Kein Warten, keine Vorkasse – bezahlt wird bei uns.</p></div>
      </div>
    </div>
  </div>
</section>`;
}
