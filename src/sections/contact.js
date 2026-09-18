import { escapeHtml } from "../htmlHelpers.js";

// Die drei Bildplätze, die der Wirt später mit eigenen Handyfotos füllt.
export const FOTO_SLOTS = [
  { titel: "Unser Haus", hinweis: "Außenansicht – damit Gäste Sie von der Straße aus erkennen" },
  { titel: "Ihr Team", hinweis: "Ein Gesicht hinter der Theke schafft mehr Vertrauen als jedes Stockfoto" },
  { titel: "Unser Bestseller", hinweis: "Das meistbestellte Gericht, ehrlich fotografiert" },
];

/**
 * Die drei Bildplätze: Haus, Team und Bestseller. Jeder zeigt ein Motiv, das
 * zur Beschriftung passt, damit der Wirt sofort sieht, welches eigene Foto
 * dort hingehört.
 */
function renderFotoSlots({ hausBild, teamBild, bestsellerBild }, bildUrl, eigeneBilder = {}) {
  const quellen = [
    eigeneBilder.haus ?? bildUrl(hausBild, "ambiente"),
    eigeneBilder.team ?? bildUrl(teamBild, "ambiente"),
    eigeneBilder.bestseller ??
      (bestsellerBild ? bildUrl(bestsellerBild, "gericht") : bildUrl(hausBild, "ambiente")),
  ];

  return FOTO_SLOTS.map(
    ({ titel, hinweis }, index) => `
      <figure class="foto-slot" style="margin:0">
        <img src="${escapeHtml(quellen[index])}" alt="" loading="lazy">
        <span class="foto-badge">Platzhalter</span>
        <figcaption class="foto-text">
          <strong>${escapeHtml(titel)}</strong>
          <span>${escapeHtml(hinweis)}</span>
        </figcaption>
      </figure>`,
  ).join("");
}

/**
 * "Bei uns"-Sektion: Konzepttext plus die drei Bildplätze.
 *
 * @param {object} ctx
 * @param {string} ctx.konzeptLabel - menu.konzept ?? menu.label.
 * @param {string} ctx.ort
 * @param {string} ctx.geschichte - menu.geschichte.
 * @param {string} ctx.hausBild
 * @param {string} ctx.teamBild
 * @param {string} [ctx.bestsellerBild]
 * @param {Function} ctx.bildUrl
 * @param {object} [ctx.eigeneBilder]
 */
export function renderAmbiente({ konzeptLabel, ort, geschichte, hausBild, teamBild, bestsellerBild, bildUrl, eigeneBilder }) {
  return `
<section class="section" id="ambiente">
  <div class="wrap">
    <div class="section-head mitte">
      <div class="eyebrow">Bei uns</div>
      <h2>${escapeHtml(konzeptLabel)}${ort ? ` in ${escapeHtml(ort)}` : ""}</h2>
      <p>${escapeHtml(geschichte)}</p>
    </div>
    <div class="foto-grid">${renderFotoSlots(
      { hausBild, teamBild, bestsellerBild },
      bildUrl,
      eigeneBilder,
    )}</div>
  </div>
</section>`;
}

/**
 * Kontakt-Sektion: Adresse/Telefon/Abholhinweis plus Öffnungszeiten.
 *
 * @param {object} ctx
 * @param {string} ctx.kontaktZeilen - fertiges <li>-Markup.
 * @param {string} ctx.hoursRows - fertiges .hours-row-Markup.
 */
export function renderContact({ kontaktZeilen, hoursRows }) {
  return `
<section class="section" id="kontakt">
  <div class="wrap">
    <div class="section-head">
      <div class="eyebrow">Kontakt</div>
      <h2>So finden Sie uns</h2>
    </div>
    <div class="contact-grid">
      <ul class="contact-list">${kontaktZeilen}</ul>
      <div>
        <h3 style="font-size:20px;margin-bottom:12px">Öffnungszeiten<span class="placeholder-badge">Platzhalter</span></h3>
        ${hoursRows}
      </div>
    </div>
  </div>
</section>`;
}

/**
 * Baut das <li>-Markup der Kontaktliste (Adresse, Telefon, Abholhinweis).
 */
export function renderKontaktZeilen({ adresse, mapsUrl, telefon, telHref }) {
  return [
    adresse
      ? `<li><span class="k">📍</span><span>${escapeHtml(adresse)}${
          mapsUrl
            ? `<br><a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener">Route planen</a>`
            : ""
        }</span></li>`
      : "",
    telefon
      ? `<li><span class="k">📞</span><span><a href="tel:${escapeHtml(telHref)}">${escapeHtml(telefon)}</a><br><span class="hint">Telefonisch erreichbar während der Öffnungszeiten</span></span></li>`
      : "",
    `<li><span class="k">🥡</span><span>Abholung vorbestellen – Ihr Essen steht pünktlich bereit</span></li>`,
  ]
    .filter(Boolean)
    .join("");
}

/** Baut das .hours-row-Markup der Öffnungszeiten. */
export function renderOeffnungszeiten(openingHours) {
  return openingHours
    .map(
      (row) =>
        `<div class="hours-row"><span>${escapeHtml(row.tage)}</span><span>${escapeHtml(row.zeiten)}</span></div>`,
    )
    .join("");
}
