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
export function renderFooter({ name, adresse, telefon, cuisine, handschrift, rechtsLinks = null }) {
  const marke = handschrift ? kuechenMarke(cuisine) : "";
  const telHref = String(telefon ?? "").replace(/[^\d+]/g, "");
  return `<footer>
  <div class="wrap footer-grid">
    <div class="footer-col">
      <strong>${marke}${escapeHtml(name)}</strong>
      ${adresse ? `<p>${escapeHtml(adresse)}</p>` : ""}
    </div>
    <nav class="footer-col footer-nav" aria-label="Seitennavigation">
      <a href="#karte">Speisekarte</a>
      <a href="#reservierung">Reservierung</a>
      <a href="#kontakt">Kontakt</a>${rechtsLinks ? `
      <a href="${escapeHtml(rechtsLinks.impressum)}" target="_blank" rel="noopener">Impressum</a>
      <a href="${escapeHtml(rechtsLinks.datenschutz)}" target="_blank" rel="noopener">Datenschutz</a>` : ""}
    </nav>
    <div class="footer-col footer-kontakt">
      ${telefon ? `<a href="tel:${escapeHtml(telHref)}">${escapeHtml(telefon)}</a>` : ""}
    </div>
    <div class="footer-note">
      Unverbindlicher Gestaltungsentwurf. Alles, was auf dieser Seite als Platzhalter gekennzeichnet
      ist – Gerichte, Preise, Öffnungszeiten und die Angaben zu Zubereitung, Herkunft und Geschichte
      des Hauses –, ist ein Vorschlag und noch nicht vom Haus bestätigt. Die Fotos stammen aus einer
      Stockbild-Datenbank (Unsplash). Vor einer Veröffentlichung werden Angaben und Aufnahmen durch
      die echten des Hauses ersetzt.
    </div>
  </div>
</footer>`;
}
