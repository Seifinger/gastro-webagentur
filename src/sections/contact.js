import { escapeHtml } from "../htmlHelpers.js";
import { KONTAKT_IKONEN } from "../signaturIcons.js";

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
function renderFotoSlots({ hausBild, teamBild, bestsellerBild }, bildUrl, eigeneBilder = {}, handschrift = null) {
  const quellen = [
    eigeneBilder.haus ?? bildUrl(hausBild, "ambiente"),
    eigeneBilder.team ?? bildUrl(teamBild, "ambiente"),
    eigeneBilder.bestseller ??
      (bestsellerBild ? bildUrl(bestsellerBild, "gericht") : bildUrl(hausBild, "ambiente")),
  ];

  // Das Abzeichen auf dem Foto ist eine Pille über einem Bild – dasselbe
  // Muster wie in jeder Vorlage. Mit Handschrift steht dasselbe Wort in der
  // Bildunterschrift, wo es ohnehin hingehört.
  const gezeichnet = Boolean(handschrift);

  return FOTO_SLOTS.map(
    ({ titel, hinweis }, index) => `
      <figure class="foto-slot" style="margin:0">
        <img src="${escapeHtml(quellen[index])}" alt="" loading="lazy">
        ${gezeichnet ? "" : '<span class="foto-badge">Platzhalter</span>\n        '}<figcaption class="foto-text">
          <strong>${escapeHtml(titel)}</strong>
          <span>${gezeichnet ? "Platzhalter · " : ""}${escapeHtml(hinweis)}</span>
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
export function renderAmbiente({ konzeptLabel, ort, geschichte, hausBild, teamBild, bestsellerBild, bildUrl, eigeneBilder, handschrift, fiktiv }) {
  // Die Hausgeschichte kommt aus dem Küchenkatalog und behauptet etwas über
  // dieses Haus („Seit Generationen kochen wir, was hier wächst ..."). Bei
  // einem echten Lokal, das den Entwurf nicht beauftragt hat, wird sie
  // gekennzeichnet – genau wie Fotos und Öffnungszeiten.
  const hinweis = fiktiv ? "" : '<span class="placeholder-badge">Platzhalter</span>';
  return `
<section class="section" id="ambiente">
  <div class="wrap">
    <div class="section-head${handschrift ? "" : " mitte"}">
      <div class="eyebrow">Bei uns</div>
      <h2>${escapeHtml(konzeptLabel)}${ort ? ` in ${escapeHtml(ort)}` : ""}</h2>
      <p>${escapeHtml(geschichte)}${hinweis}</p>
    </div>
    <div class="foto-grid">${renderFotoSlots(
      { hausBild, teamBild, bestsellerBild },
      bildUrl,
      eigeneBilder,
      handschrift,
    )}</div>
  </div>
</section>`;
}

/**
 * Kontakt-Sektion: Adresse/Telefon/Abholhinweis plus Öffnungszeiten.
 *
 * Mit Handschrift trägt die Überschrift die Straße dieses Hauses statt des
 * Satzes „So finden Sie uns", der für jedes Lokal derselbe wäre. Die Straße
 * steht ohnehin in den Daten; sie hier zu setzen, macht aus einem generischen
 * Sektionstitel die Adresse genau dieses Lokals. Ohne brauchbare Straße (die
 * Google-Adresse ist nicht immer eine) bleibt es beim bisherigen Satz.
 *
 * @param {object} ctx
 * @param {string} ctx.kontaktZeilen - fertiges <li>-Markup.
 * @param {string} ctx.hoursRows - fertiges .hours-row-Markup.
 * @param {string} [ctx.strasse] - aus strasseAusAdresse().
 * @param {string} [ctx.ort]
 * @param {string|null} [ctx.handschrift]
 */
export function renderContact({ kontaktZeilen, hoursRows, strasse, ort, handschrift }) {
  const ueberschrift =
    handschrift === "traditionell" && strasse
      ? `<h2 class="kontakt-adresse"><span class="kontakt-strasse">${escapeHtml(strasse)}</span>${
          ort ? `<span class="kontakt-ort">${escapeHtml(ort)}</span>` : ""
        }</h2>`
      : "<h2>So finden Sie uns</h2>";

  return `
<section class="section" id="kontakt">
  <div class="wrap">
    <div class="section-head">
      <div class="eyebrow">Kontakt</div>
      ${ueberschrift}
    </div>
    <div class="contact-grid">
      <ul class="contact-list">${kontaktZeilen}</ul>
      <div>
        <h3${handschrift === "abend" ? ' class="hours-head"' : ' style="font-size:20px;margin-bottom:12px"'}>Öffnungszeiten<span class="placeholder-badge">Platzhalter</span></h3>
        ${hoursRows}
      </div>
    </div>
  </div>
</section>`;
}

/**
 * Baut das <li>-Markup der Kontaktliste (Adresse, Telefon, Abholhinweis).
 *
 * Mit Handschrift stehen dort die gezeichneten Zeichen aus signaturIcons.js
 * statt der Emoji 📍 📞 🥡. Emoji sind Systemschriften: Sie sehen auf jedem
 * Gerät anders aus und tragen fremde Farben in die Palette.
 *
 * @param {string|null} [ctx.handschrift] - preset.layout.handschrift.
 */
export function renderKontaktZeilen({ adresse, mapsUrl, telefon, telHref, handschrift }) {
  // Gezeichnete Zeichen gehören zu jeder Handschrift, nicht zu einer
  // bestimmten: Sie sind der Satz der Agentur, nicht der eines Archetyps.
  const gezeichnet = Boolean(handschrift);
  const zeichen = {
    ort: gezeichnet ? KONTAKT_IKONEN.ort : "📍",
    telefon: gezeichnet ? KONTAKT_IKONEN.telefon : "📞",
    abholung: gezeichnet ? KONTAKT_IKONEN.abholung : "🥡",
  };

  return [
    adresse
      ? `<li><span class="k">${zeichen.ort}</span><span>${escapeHtml(adresse)}${
          mapsUrl
            ? `<br><a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener">Route planen</a>`
            : ""
        }</span></li>`
      : "",
    telefon
      ? `<li><span class="k">${zeichen.telefon}</span><span><a href="tel:${escapeHtml(telHref)}">${escapeHtml(telefon)}</a><br><span class="hint">Telefonisch erreichbar während der Öffnungszeiten</span></span></li>`
      : "",
    `<li><span class="k">${zeichen.abholung}</span><span>Abholung vorbestellen – Ihr Essen steht pünktlich bereit</span></li>`,
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
