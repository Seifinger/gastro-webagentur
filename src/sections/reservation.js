import { escapeHtml, optionList, timeSlots } from "../htmlHelpers.js";
import { haken, gedeck } from "../signaturIcons.js";

export const RESERVATION_SLOTS = [
  ...timeSlots(11 * 60 + 30, 14 * 60, 30),
  ...timeSlots(17 * 60, 21 * 60 + 30, 30),
];

// Unter beiden Formularen, sobald ein Betriebsserver angebunden ist: was
// der Status-Link kann und was nicht (er ist keine Push-Nachricht). v1 und
// v2 zeigen denselben Satz.
export const STATUS_LINK_HINWEIS =
  "Nach dem Absenden erhalten Sie einen persönlichen Status-Link. Er zeigt Bestätigung oder Änderungen nur, wenn Sie ihn erneut öffnen – aktiv benachrichtigen wir Sie nur, wenn Sie eine E-Mail-Adresse angeben. Die Adresse nutzen wir ausschließlich für diese Anfrage.";

// Zweck des freiwilligen E-Mail-Felds – direkt am Feld.
export const EMAIL_ZWECK = "Nur für Nachrichten zu dieser Anfrage – kein Newsletter, keine Werbung.";

/**
 * Die Reservierungs-Sektion mit Vorteils-Liste und Formular.
 *
 * @param {object} ctx
 * @param {string} ctx.widgetVariant - preset.reservation.widgetVariant (nur als data-Attribut).
 * @param {string|null} [ctx.handschrift] - preset.layout.handschrift. Mit
 *   Handschrift tragen die Pluspunkte den gezeichneten Haken statt des ✓.
 */
export function renderReservation({ widgetVariant, handschrift, statusHinweis = "", rechtliches = "" }) {
  // Der gezeichnete Haken ersetzt das gesetzte ✓ auf jeder Seite, nicht nur
  // dort, wo ein Archetyp eine eigene Handschrift mitbringt (vgl. hero.js).
  const k = haken();

  // Im Abendhaus ist die Reservierung der eine starke Moment der Seite (siehe
  // docs-intern/design-tokens/abend.md). Sie bekommt deshalb als einzige
  // Sektion ein eigenes gezeichnetes Zeichen – das Gedeck.
  const eyebrow =
    handschrift === "abend"
      ? `<div class="eyebrow"><span class="kopf-marke">${gedeck()} Reservierung</span></div>`
      : '<div class="eyebrow">Reservierung</div>';

  // Ohne Handschrift bleibt die Größe als style-Attribut am Element stehen –
  // so stand sie immer dort. Mit Handschrift entscheidet das CSS des
  // Archetyps, wie groß diese Überschrift im Verhältnis zu den anderen ist.
  const ueberschrift = handschrift
    ? "<h2>Tisch reservieren</h2>"
    : '<h2 style="font-size:clamp(28px,4.4vw,42px);margin-bottom:16px">Tisch reservieren</h2>';

  return `
<section class="section reserve-section" id="reservierung" data-reservation-variant="${escapeHtml(widgetVariant)}">
  <div class="wrap">
    <div class="reserve-grid">
      <div>
        ${eyebrow}
        ${ueberschrift}
        <p${handschrift === "abend" ? ' class="reserve-intro"' : ' style="color:var(--ink-soft);font-size:18px"'}>Wählen Sie Datum, Uhrzeit und Personenzahl – wir halten Ihren Tisch bereit.</p>
        <ul class="reserve-pluspunkte">
          <li><span class="k">${k}</span><span>Rund um die Uhr buchbar, auch außerhalb der Öffnungszeiten</span></li>
          <li><span class="k">${k}</span><span>Bestätigung durch das Restaurant – per E-Mail oder über Ihren Status-Link</span></li>
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
            <label for="res-email">E-Mail-Adresse für Bestätigung und Änderungen <span class="hint">(optional)</span></label>
            <input type="email" id="res-email" name="email" autocomplete="email" inputmode="email" maxlength="254">
            <span class="hint">${EMAIL_ZWECK}</span>
          </div>
          <div class="field field-wide">
            <label for="res-wunsch">Anmerkungen <span class="hint">(optional)</span></label>
            <textarea id="res-wunsch" name="wunsch" placeholder="Kinderstuhl, Allergien, Tisch am Fenster ..."></textarea>
          </div>
        </div>
        ${rechtliches}
        <button class="btn btn-primary btn-block" type="submit" style="margin-top:24px">Reservierung anfragen</button>${
          statusHinweis ? `
        <p class="hint" style="margin-top:10px">${escapeHtml(statusHinweis)}</p>` : ""
        }
      </form>
    </div>
  </div>
</section>`;
}
