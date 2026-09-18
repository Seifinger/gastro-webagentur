import { escapeHtml } from "../htmlHelpers.js";

/**
 * Kopfzeile: liegt transparent über dem Hero und wird beim Scrollen fest
 * (siehe .topbar/.topbar.scrolled in landingPageGenerator.js PAGE_STYLES).
 * header.sticky: false im Design-Preset -> Kopfzeile scrollt mit statt fest
 * zu bleiben (Klasse "topbar-static").
 *
 * @param {object} ctx
 * @param {string} ctx.name - Angezeigter Restaurantname.
 * @param {boolean} [ctx.sticky] - preset.header.sticky.
 */
export function renderHeader({ name, sticky }) {
  return `<header class="${sticky === false ? "topbar topbar-static" : "topbar"}" id="topbar">
  <div class="wrap topbar-inner">
    <div class="brand">${escapeHtml(name)}</div>
    <nav class="topnav">
      <a href="#highlights">Highlights</a>
      <a href="#karte">Speisekarte</a>
      <a href="#reservierung">Reservierung</a>
      <a href="#kontakt">Kontakt</a>
    </nav>
    <a class="btn btn-primary" href="#reservierung">Tisch reservieren</a>
  </div>
</header>`;
}
