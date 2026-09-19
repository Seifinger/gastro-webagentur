import { escapeHtml, optionList, timeSlots } from "../htmlHelpers.js";
import { haken } from "../signaturIcons.js";

export const RESERVATION_SLOTS = [
  ...timeSlots(11 * 60 + 30, 14 * 60, 30),
  ...timeSlots(17 * 60, 21 * 60 + 30, 30),
];

export const PICKUP_SLOTS = [
  ...timeSlots(11 * 60 + 30, 14 * 60, 15),
  ...timeSlots(17 * 60, 21 * 60 + 30, 15),
];

/**
 * Die Reservierungs-Sektion mit Vorteils-Liste und Formular.
 *
 * @param {object} ctx
 * @param {string} ctx.widgetVariant - preset.reservation.widgetVariant (nur als data-Attribut).
 * @param {string|null} [ctx.handschrift] - preset.layout.handschrift. Mit
 *   Handschrift tragen die Pluspunkte den gezeichneten Haken statt des ✓.
 */
export function renderReservation({ widgetVariant, handschrift }) {
  const k = handschrift === "traditionell" ? haken() : "✓";
  return `
<section class="section reserve-section" id="reservierung" data-reservation-variant="${escapeHtml(widgetVariant)}">
  <div class="wrap">
    <div class="reserve-grid">
      <div>
        <div class="eyebrow">Reservierung</div>
        <h2 style="font-size:clamp(28px,4.4vw,42px);margin-bottom:16px">Tisch reservieren</h2>
        <p style="color:var(--ink-soft);font-size:18px">Wählen Sie Datum, Uhrzeit und Personenzahl – wir halten Ihren Tisch bereit.</p>
        <ul class="reserve-pluspunkte">
          <li><span class="k">${k}</span><span>Rund um die Uhr buchbar, auch außerhalb der Öffnungszeiten</span></li>
          <li><span class="k">${k}</span><span>Sofortige Bestätigung, ganz ohne Anruf</span></li>
          <li><span class="k">${k}</span><span>Sonderwünsche wie Kinderstuhl oder Allergien direkt mitteilen</span></li>
        </ul>
      </div>

      <form class="panel" id="reservation-form" novalidate>
        <div class="field-grid">
          <div class="field">
            <label for="res-datum">Datum</label>
            <input type="date" id="res-datum" name="datum" required>
            <span class="error">Bitte wählen Sie ein Datum.</span>
          </div>
          <div class="field">
            <label for="res-uhrzeit">Uhrzeit</label>
            <select id="res-uhrzeit" name="uhrzeit" required>
              <option value="">Bitte wählen</option>
              ${optionList(RESERVATION_SLOTS)}
            </select>
            <span class="error">Bitte wählen Sie eine Uhrzeit.</span>
          </div>
          <div class="field">
            <label for="res-personen">Personen</label>
            <select id="res-personen" name="personen" required>
              <option value="">Bitte wählen</option>
              ${optionList(["1 Person", "2 Personen", "3 Personen", "4 Personen", "5 Personen", "6 Personen", "7 Personen", "8 Personen", "Mehr als 8 Personen"])}
            </select>
            <span class="error">Bitte wählen Sie die Personenzahl.</span>
          </div>
          <div class="field">
            <label for="res-name">Name</label>
            <input type="text" id="res-name" name="name" autocomplete="name" required>
            <span class="error">Bitte geben Sie Ihren Namen an.</span>
          </div>
          <div class="field">
            <label for="res-telefon">Telefon</label>
            <input type="tel" id="res-telefon" name="telefon" autocomplete="tel" required>
            <span class="error">Bitte geben Sie eine Telefonnummer an.</span>
          </div>
          <div class="field">
            <label for="res-email">E-Mail <span class="hint">(optional)</span></label>
            <input type="email" id="res-email" name="email" autocomplete="email">
          </div>
          <div class="field field-wide">
            <label for="res-wunsch">Anmerkungen <span class="hint">(optional)</span></label>
            <textarea id="res-wunsch" name="wunsch" placeholder="Kinderstuhl, Allergien, Tisch am Fenster ..."></textarea>
          </div>
        </div>
        <button class="btn btn-primary btn-block" type="submit" style="margin-top:24px">Reservierung anfragen</button>
      </form>
    </div>
  </div>
</section>`;
}
