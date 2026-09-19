import { escapeHtml, formatPrice, joinClasses } from "../htmlHelpers.js";
import { kuechenMarke } from "../signaturIcons.js";

/**
 * Eine Highlight-Karte. `treppe` ist die Handschrift-Variante des
 * traditionellen Archetyps: Die Kategorie steht dann nicht mehr als Abzeichen
 * auf dem Foto, sondern als Zeile über dem Namen – ein Abzeichen auf dem Bild
 * braucht einen Schleier, damit es lesbar bleibt, und genau solche Schleier
 * stehen in jeder Vorlage.
 */
function karte(gericht, { bildUrl, showBadges, beschreibungFuer, medienKlasse, treppe, siegel }) {
  const veg = showBadges && gericht.vegetarisch ? '<span class="veg">vegetarisch</span>' : "";
  const kat = `<span class="hl-kat">${escapeHtml(gericht.kategorie)}</span>`;
  return `
      <article class="hl-card">
        <div class="${medienKlasse}">
          <img src="${escapeHtml(bildUrl(gericht.bild, "gericht"))}" alt="${escapeHtml(gericht.name)}" loading="lazy">
          ${treppe ? "" : kat}
        </div>
        <div class="hl-body">
          ${siegel ? `${siegel}\n          ` : ""}${treppe ? `${kat}\n          ` : ""}<h3 class="hl-name">${escapeHtml(gericht.name)}</h3>
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
}

function renderHighlightCards(highlights, bildUrl, showBadges, beschreibungFuer, magazin, treppe, cuisine) {
  // Im Magazin-Raster bekommt das Bild zusätzlich das Hover-Primitiv aus
  // motion.js (.bild-zoom): ruhiger Zoom nur auf Geräten mit echtem Zeiger,
  // abgeschaltet bei prefers-reduced-motion.
  const medienKlasse = joinClasses("hl-media", magazin && "bild-zoom");

  // In der Treppe ist die erste Karte die Hausempfehlung und bekommt als
  // einzige das Siegel mit der Küchenmarke.
  const marke = treppe ? kuechenMarke(cuisine) : "";
  const siegelMarkup = marke
    ? `<span class="hl-siegel">${marke} Hausempfehlung</span>`
    : treppe
      ? '<span class="hl-siegel">Hausempfehlung</span>'
      : "";

  return highlights
    .map((gericht, i) =>
      karte(gericht, {
        bildUrl,
        showBadges,
        beschreibungFuer,
        medienKlasse,
        treppe,
        siegel: treppe && i === 0 ? siegelMarkup : "",
      }),
    )
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
 * @param {string} [ctx.gridStyle] - preset.layout.gridStyle. "asymmetric"
 *   schaltet auf das versetzte Magazin-Raster um; alles andere (und ein
 *   fehlender Wert) bleibt beim bisherigen gleichmäßigen Raster.
 * @param {string|null} [ctx.handschrift] - preset.layout.handschrift.
 *   "traditionell" schaltet auf die Treppe um: eine große Karte
 *   (Hausempfehlung), danach mittlere, danach kleine.
 * @param {string} [ctx.cuisine] - für die gezeichnete Küchenmarke im Siegel.
 */
export function renderHighlights({ highlights, bildUrl, showBadges, beschreibungFuer, spalten, gridStyle, handschrift, cuisine }) {
  const magazin = gridStyle === "asymmetric";
  if (magazin) {
    return `
<section class="section" id="highlights">
  <div class="wrap">
    <div class="section-head">
      <div class="eyebrow">Unsere Highlights</div>
      <h2>Das bestellen unsere Gäste am liebsten</h2>
      <p>Alles frisch zubereitet. Zum Abholen einfach vorbestellen und zur Wunschzeit mitnehmen.</p>
    </div>

    <div class="hl-grid--magazin">${renderHighlightCards(highlights, bildUrl, showBadges, beschreibungFuer, true)}</div>

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

  const treppe = handschrift === "traditionell";
  // Die Treppe stuft nach Anzahl ab: 3 Karten werden 1 groß + 2 halbe,
  // 4 werden 1 groß + 3 Drittel, 6 werden 1 groß + 2 halbe + 3 Drittel.
  // Ohne die Anzahl im Markup ließe sich das in CSS nicht sauber trennen.
  const rasterKlasse = treppe
    ? `hl-grid hl-treppe hl-treppe--${highlights.length}`
    : `hl-grid ${spalten}`;
  const marke = treppe ? kuechenMarke(cuisine) : "";
  const eyebrow = marke
    ? `<div class="eyebrow"><span class="kopf-marke">${marke} Unsere Highlights</span></div>`
    : `<div class="eyebrow">Unsere Highlights</div>`;

  return `
<section class="section" id="highlights">
  <div class="wrap">
    <div class="section-head${treppe ? "" : " mitte"}">
      ${eyebrow}
      <h2>Das bestellen unsere Gäste am liebsten</h2>
      <p>Alles frisch zubereitet. Zum Abholen einfach vorbestellen und zur Wunschzeit mitnehmen.</p>
    </div>

    <div class="${rasterKlasse}">${renderHighlightCards(highlights, bildUrl, showBadges, beschreibungFuer, false, treppe, cuisine)}</div>

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
