import { escapeHtml } from "../htmlHelpers.js";

/**
 * Seitenfuß mit Name/Adresse/Telefon und dem Entwurfs-Hinweis.
 *
 * @param {object} ctx
 * @param {string} ctx.name
 * @param {string} [ctx.adresse]
 * @param {string} [ctx.telefon]
 */
export function renderFooter({ name, adresse, telefon }) {
  return `<footer>
  <div class="wrap">
    <strong>${escapeHtml(name)}</strong>${adresse ? ` · ${escapeHtml(adresse)}` : ""}${telefon ? ` · ${escapeHtml(telefon)}` : ""}
    <div class="footer-note">
      Unverbindlicher Gestaltungsentwurf. Gerichte, Preise und Öffnungszeiten sind Platzhalter,
      die Fotos stammen aus einer Stockbild-Datenbank (Unsplash). Vor einer Veröffentlichung werden
      beide durch die echten Angaben und Aufnahmen des Hauses ersetzt.
    </div>
  </div>
</footer>`;
}
