import { escapeHtml, formatPrice } from "../htmlHelpers.js";
import { gerichtId } from "../menuCatalog.js";

/**
 * Die vollständige Karte als aufklappbare Liste – direkt im HTML statt als
 * PDF, damit sie auf dem Handy lesbar ist und Google sie indexieren kann.
 */
function renderMenuAccordion(menu, showBadges, beschreibungFuer) {
  return menu.kategorien
    .map((kategorie, katIndex) => {
      const gerichte = kategorie.gerichte
        .map((gericht, gerichtIndex) => {
          const veg = showBadges && gericht.vegetarisch ? ' <span class="veg">vegetarisch</span>' : "";
          const id = gerichtId(katIndex, gerichtIndex);
          return `
          <div class="gericht">
            <div class="gericht-body">
              <div class="gericht-name">${escapeHtml(gericht.name)}${veg}</div>
              <div class="gericht-desc">${escapeHtml(beschreibungFuer(id, gericht.beschreibung))}</div>
            </div>
            <div class="gericht-seite">
              <span class="gericht-preis">${formatPrice(gericht.preis)}</span>
              <button class="mini-add" type="button" data-add="${id}" data-name="${escapeHtml(gericht.name)}" data-preis="${gericht.preis}" aria-label="${escapeHtml(gericht.name)} vorbestellen">+</button>
            </div>
          </div>`;
        })
        .join("");

      return `
      <details class="kat"${katIndex === 0 ? " open" : ""}>
        <summary>${escapeHtml(kategorie.name)} <span class="kat-anzahl">${kategorie.gerichte.length} Gerichte</span></summary>
        <div class="kat-body">${gerichte}</div>
      </details>`;
    })
    .join("");
}

/**
 * Die Speisekarten-Sektion (Akkordeon).
 *
 * @param {object} ctx
 * @param {object} ctx.menu
 * @param {string} ctx.menuLayout - preset.menu.layout (nur als data-Attribut).
 * @param {boolean} ctx.showBadges - preset.menu.showBadges.
 * @param {Function} ctx.beschreibungFuer
 */
export function renderMenu({ menu, menuLayout, showBadges, beschreibungFuer }) {
  return `
<section class="section karte-section" id="karte" data-menu-layout="${escapeHtml(menuLayout)}">
  <div class="wrap">
    <div class="section-head mitte">
      <div class="eyebrow">Speisekarte</div>
      <h2>Unsere ganze Karte</h2>
      <p>Kategorie antippen zum Aufklappen. Jedes Gericht lässt sich direkt zur Abholung vorbestellen.</p>
    </div>
    ${renderMenuAccordion(menu, showBadges, beschreibungFuer)}
  </div>
</section>`;
}
