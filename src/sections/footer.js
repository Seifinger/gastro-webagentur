import { escapeHtml } from "../htmlHelpers.js";
import { kuechenMarke } from "../signaturIcons.js";

/**
 * Seitenfuß mit Name/Adresse/Telefon und dem Entwurfs-Hinweis.
 *
 * Mit Handschrift steht die gezeichnete Küchenmarke vor dem Namen – dieselbe,
 * die am Kopf der Highlights und auf dem Siegel der Hausempfehlung steht. Drei
 * Stellen auf einer Seite: daran erkennt man sie wieder.
 *
 * @param {object} ctx
 * @param {string} ctx.name
 * @param {string} [ctx.adresse]
 * @param {string} [ctx.telefon]
 * @param {string} [ctx.cuisine]
 * @param {string|null} [ctx.handschrift] - preset.layout.handschrift.
 */
export function renderFooter({ name, adresse, telefon, cuisine, handschrift }) {
  const marke = handschrift === "traditionell" ? kuechenMarke(cuisine) : "";
  return `<footer>
  <div class="wrap">
    <strong>${marke}${escapeHtml(name)}</strong>${adresse ? ` · ${escapeHtml(adresse)}` : ""}${telefon ? ` · ${escapeHtml(telefon)}` : ""}
    <div class="footer-note">
      Unverbindlicher Gestaltungsentwurf. Gerichte, Preise und Öffnungszeiten sind Platzhalter,
      die Fotos stammen aus einer Stockbild-Datenbank (Unsplash). Vor einer Veröffentlichung werden
      beide durch die echten Angaben und Aufnahmen des Hauses ersetzt.
    </div>
  </div>
</footer>`;
}
