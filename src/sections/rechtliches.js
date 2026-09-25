// Rechtliche Hinweise direkt über dem Absenden-Knopf – für v1 und v2 gleich.
//
// Nur mit angebundenem Betriebsserver (apiUrl): Die Links zeigen auf die
// Rechtstexte DIESES Restaurants auf seinem Server (/rechtstexte/…), nicht
// auf die Agentur. Ohne Server (Entwurf, Konzept-Demo, Beispielseite) wird
// nichts verschickt – dann gibt es auch nichts zu bestätigen.
//
// Datenschutz: ein Hinweis mit Link, KEINE Pflicht-Einwilligung – die für
// die Anfrage nötige Verarbeitung beruht auf Art. 6 Abs. 1 lit. b DSGVO.
// Bedingungen und No-Show-Regel: je ein eigenes, nicht vorangekreuztes Feld,
// das das Seiten-Skript nur einblendet, wenn der Betrieb dafür eine
// freigegebene Fassung hat (/oeffentlich/rechtstexte).

import { escapeHtml } from "../htmlHelpers.js";

export const ZAHLUNGSPFLICHTIG_BESTELLEN = "Zahlungspflichtig bestellen";
// Ohne Betriebsserver wird nichts bestellt – dann darf der Knopf auch keine
// Zahlungspflicht ankündigen.
export const PROBEBESTELLUNG_ABSENDEN = "Probebestellung absenden";

export const VORGANG_HINWEIS = {
  bestellung: `Mit „${ZAHLUNGSPFLICHTIG_BESTELLEN}“ geben Sie eine verbindliche Bestellung ab. Bezahlt wird bei Abholung. Angenommen ist sie, sobald das Restaurant sie bestätigt.`,
  reservierung: "Sie senden eine Reservierungsanfrage. Reserviert ist der Tisch erst, wenn das Restaurant bestätigt.",
};

export const DATENSCHUTZ_HINWEIS = {
  bestellung: "Ihre Angaben verwenden wir nur, um diese Bestellung abzuwickeln.",
  reservierung: "Ihre Angaben verwenden wir nur, um diese Anfrage zu bearbeiten.",
};

/**
 * @param {"bestellung"|"reservierung"} vorgang
 * @param {string} apiUrl - Betriebsserver; leer = kein Block
 */
export function rechtlichesHtml(vorgang, apiUrl) {
  const basis = String(apiUrl ?? "").replace(/\/+$/, "");
  if (!basis) return "";
  const p = vorgang === "bestellung" ? "ord" : "res";
  const e = escapeHtml;
  const noShow =
    vorgang === "reservierung"
      ? `
  <div class="field rechtliches-noshow" id="res-noshow-feld" hidden>
    <p class="rechtliches-titel">No-Show-Regel</p>
    <label class="rechtliches-check"><input type="checkbox" id="res-noshow" name="noShowBestaetigt"><span id="res-noshow-text"></span></label>
    <p class="hint" id="res-noshow-details"></p>
    <span class="error">Bitte bestätigen Sie die No-Show-Regel, um die Anfrage zu senden.</span>
  </div>`
      : "";
  return `<div class="rechtliches" id="${p}-rechtliches" data-vorgang="${vorgang}">
  <p class="hint rechtliches-vorgang">${e(VORGANG_HINWEIS[vorgang])}</p>
  <p class="hint rechtliches-datenschutz">${e(DATENSCHUTZ_HINWEIS[vorgang])} Mehr dazu in der <a href="${e(basis)}/rechtstexte/datenschutz" target="_blank" rel="noopener">Datenschutzerklärung</a>.</p>
  <div class="field rechtliches-bedingungen" id="${p}-bedingungen-feld" hidden>
    <label class="rechtliches-check"><input type="checkbox" id="${p}-bedingungen" name="bedingungenBestaetigt"><span id="${p}-bedingungen-text"></span></label>
    <span class="error">Bitte bestätigen Sie die Bedingungen, um fortzufahren.</span>
  </div>${noShow}
</div>`;
}

/** Impressum und Datenschutz des Restaurants für den Footer. */
export function rechtsLinks(apiUrl) {
  const basis = String(apiUrl ?? "").replace(/\/+$/, "");
  if (!basis) return null;
  return { impressum: `${basis}/rechtstexte/impressum`, datenschutz: `${basis}/rechtstexte/datenschutz` };
}

// Abstände im 8px-Raster (4px als Halbschritt) – so verlangt es der
// Anti-Slop-Lint der v2-Seiten.
export const RECHTLICHES_CSS = `
.rechtliches { margin-top: 16px; display: grid; gap: 8px; }
.rechtliches .hint { margin: 0; }
.rechtliches a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
.rechtliches-check { display: flex; align-items: flex-start; gap: 8px; font-weight: 400; text-transform: none; letter-spacing: normal; }
.rechtliches-check input { margin-top: 4px; flex: none; width: 16px; height: 16px; }
.rechtliches-noshow { border-top: 1px dashed currentColor; padding-top: 8px; margin-top: 8px; }
.rechtliches-titel { font-weight: 700; margin: 0 0 4px; }
.rechtliches [hidden] { display: none !important; }
`;
