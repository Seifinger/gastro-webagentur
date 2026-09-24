// Reservierung, Kontakt, Bestellweg (Warenkorb, Drawer, Bestätigung) und
// Fußzeile.
//
// Die Formulare tragen exakt die IDs und Feldnamen, an denen das
// v1-Skript hängt (siehe v1Funktionen.js, PFLICHT_IDS/PFLICHT_FELDER). Die
// Klassen "field", "field-wide", "error", "cart-*", "confirm-box", "drawer",
// "overlay", "open", "visible" und "hat-fehler" setzt oder liest das Skript
// selbst – sie sind Teil des Vertrags, nicht frei wählbar.

import {
  escapeHtml,
  optionList,
  RESERVATION_SLOTS,
  abholzeitAttribute,
  haken,
  checkCircle,
  warnung,
  kuechenMarke,
  KONTAKT_IKONEN,
  gedeck,
} from "../v1Funktionen.js";

const e = escapeHtml;

const PERSONEN = ["1 Person", "2 Personen", "3 Personen", "4 Personen", "5 Personen", "6 Personen", "7 Personen", "8 Personen", "Mehr als 8 Personen"];

function feld({ id, name, label, typ = "text", pflicht = false, fehler = "", optional = "", breit = false, auto = "", platzhalter = "", optionen = null, extra = "" }) {
  const attr = `id="${id}" name="${name}"${pflicht ? " required" : ""}${auto ? ` autocomplete="${auto}"` : ""}${extra}`;
  let eingabe;
  if (optionen) eingabe = `<select ${attr}>${optionen}</select>`;
  else if (typ === "textarea") eingabe = `<textarea ${attr}${platzhalter ? ` placeholder="${e(platzhalter)}"` : ""}></textarea>`;
  else eingabe = `<input type="${typ}" ${attr}>`;
  return `<div class="field${breit ? " field-wide" : ""}">
            <label for="${id}">${e(label)}${optional ? ` <span class="hint">${e(optional)}</span>` : ""}</label>
            ${eingabe}
            ${fehler ? `<span class="error">${e(fehler)}</span>` : ""}
          </div>`;
}

/** Vor dem Absenden: im Vorschau-Modus sagen, dass nichts verschickt wird. */
function vorschauHinweis(aktionen, texte) {
  return aktionen?.modus === "live" ? "" : `<p class="hint vorschau-hinweis">${e(texte.bestellung.vorschauHinweis)}</p>`;
}

export function renderReservierung({ ds, texte, betont, tief, aktionen, ausdruck }) {
  const t = texte.reservierung;
  const f = t.felder;
  const zeichen = ds.archetyp === "abend" ? `${gedeck()} ` : "";
  return `<section class="sektion reservierung${betont ? " sektion--betont reservierung--betont" : ""}${tief ? " sektion--tief" : ""}" id="reservierung">
  <div class="rahmen reservierung-raster">
    <div class="reservierung-text auftritt">
      <p class="rubrik">${zeichen}${e(t.rubrik)}</p>
      <h2>${e(t.titel)}</h2>
      <p class="intro">${e(t.intro)}</p>
      ${ausdruck ? (aktionen?.anrufen ? `<p class="reservierung-telefon">${e(texte.besuch.lieberAnrufen)} <a href="${e(aktionen.anrufen.href)}">${e(aktionen.anrufen.text)}</a></p>` : "") : `<ul class="pluspunkte">${t.punkte.map((p) => `<li>${haken()}<span>${e(p)}</span></li>`).join("")}</ul>`}
    </div>
    <form class="formular auftritt" id="reservation-form" novalidate>
      <div class="field-grid">
          ${feld({ id: "res-datum", name: "datum", label: f.datum, typ: "date", pflicht: true, fehler: t.fehler.datum })}
          ${feld({ id: "res-uhrzeit", name: "uhrzeit", label: f.uhrzeit, pflicht: true, fehler: t.fehler.uhrzeit, optionen: `<option value="">${e(f.bitteWaehlen)}</option>${optionList(RESERVATION_SLOTS)}` })}
          ${feld({ id: "res-personen", name: "personen", label: f.personen, pflicht: true, fehler: t.fehler.personen, optionen: `<option value="">${e(f.bitteWaehlen)}</option>${optionList(PERSONEN)}` })}
          ${feld({ id: "res-name", name: "name", label: f.name, pflicht: true, fehler: t.fehler.name, auto: "name" })}
          ${feld({ id: "res-telefon", name: "telefon", label: f.telefon, typ: "tel", pflicht: true, fehler: t.fehler.telefon, auto: "tel" })}
          ${feld({ id: "res-email", name: "email", label: f.email, typ: "email", optional: f.optional, auto: "email" })}
          ${feld({ id: "res-wunsch", name: "wunsch", label: f.wunsch, typ: "textarea", optional: f.optional, breit: true, platzhalter: f.wunschPlatzhalter })}
      </div>
      <button class="btn btn-primary btn-block formular-absenden" type="submit">${e(t.absenden)}</button>
      ${vorschauHinweis(aktionen, texte)}
    </form>
  </div>
</section>`;
}

export function renderKontakt({ texte, lead, oeffnungszeiten, tief }) {
  const t = texte.kontakt;
  const adresse = lead.adresse || "";
  const telefon = lead.telefon || "";
  const telHref = telefon.replace(/[^\d+]/g, "");
  const maps = adresse ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}` : "";
  const zeilen = [
    adresse ? `<li><span class="k">${KONTAKT_IKONEN.ort}</span><span>${e(adresse)}${maps ? `<br><a href="${e(maps)}" target="_blank" rel="noopener">${e(t.route)}</a>` : ""}</span></li>` : "",
    telefon ? `<li><span class="k">${KONTAKT_IKONEN.telefon}</span><span><a href="tel:${e(telHref)}">${e(telefon)}</a><br><span class="hint">${e(t.telefonHinweis)}</span></span></li>` : "",
    `<li><span class="k">${KONTAKT_IKONEN.abholung}</span><span>${e(t.abholung)}</span></li>`,
  ].join("");
  const zeiten = oeffnungszeiten.map((z) => `<div class="zeiten-zeile"><span>${e(z.tage)}</span><span>${e(z.zeiten)}</span></div>`).join("");
  return `<section class="sektion${tief ? " sektion--tief" : ""}" id="kontakt">
  <div class="rahmen kontakt-raster">
    <div>
      <p class="rubrik">${e(t.rubrik)}</p>
      <h2 class="kontakt-titel">${e(t.titel)}${t.untertitel ? `<span class="kontakt-ort">${e(t.untertitel)}</span>` : ""}</h2>
      <ul class="kontakt-liste">${zeilen}</ul>
    </div>
    <div class="zeiten auftritt">
      <h3>${e(t.oeffnungszeiten)} <span class="marke-klein marke-klein--signal">${e(texte.platzhalter)}</span></h3>
      ${zeiten}
    </div>
  </div>
</section>`;
}

/**
 * Die Abholzeiten baut das Skript (PAGE_SCRIPT mit window.Abholzeiten,
 * src/abholzeiten.js) aus der aktuellen Uhrzeit – im Markup steht nur, mit
 * welchen Öffnungszeiten gerechnet wird. Fest eingebaute Zeiten wären beim
 * ersten Aufruf schon veraltet.
 */
export function renderBestellweg({ ds, texte, aktionen, oeffnungszeiten, abholHinweis = "" }) {
  const b = texte.bestellung;
  const bestellen = (k) => `<button class="btn ${k}" id="bar-order" type="button">${e(b.bestellen)}</button>`;
  const reservieren = (k) => `<a class="btn ${k}" href="#reservierung">${e(b.reservieren)}</a>`;
  const leiste = ds.layout.mobileAktionsleiste
    ? `<div class="mobilebar" id="mobilebar">${ds.layout.primaerAktion === "reservation" ? reservieren("btn-primary") + bestellen("btn-ghost") : bestellen("btn-primary") + reservieren("btn-ghost")}</div>`
    : "";
  return `<button class="cart-fab" id="cart-fab" type="button">
  <span>${e(b.warenkorb)}</span>
  <span class="cart-count" id="fab-count">0</span>
  <span id="fab-total">0,00 €</span>
</button>
${leiste}
<div class="overlay" id="overlay"></div>
<aside class="drawer" id="drawer" aria-label="${e(b.titel)}">
  <div class="drawer-head">
    <h3>${e(b.titel)}</h3>
    <button class="icon-btn" id="drawer-close" type="button" aria-label="${e(b.schliessen)}">×</button>
  </div>
  <div class="drawer-body">
    <div id="cart-lines"></div>
    <form id="order-form" novalidate>
      <div class="field-grid field-grid--eins">
        ${feld({ id: "ord-abholzeit", name: "abholzeit", label: b.abholzeit, pflicht: true, fehler: b.fehlerAbholzeit, optionen: `<option value="">${e(texte.reservierung.felder.bitteWaehlen)}</option>`, extra: abholzeitAttribute({ oeffnungszeiten }, e) })}${abholHinweis ? `\n        <p class="hint abholzeit-beispiel">${e(abholHinweis)}</p>` : ""}
        ${feld({ id: "ord-name", name: "name", label: texte.reservierung.felder.name, pflicht: true, fehler: texte.reservierung.fehler.name, auto: "name" })}
        ${feld({ id: "ord-telefon", name: "telefon", label: texte.reservierung.felder.telefon, typ: "tel", pflicht: true, fehler: texte.reservierung.fehler.telefon, auto: "tel" })}
        ${feld({ id: "ord-hinweis", name: "hinweis", label: b.hinweis, typ: "textarea", optional: texte.reservierung.felder.optional, platzhalter: b.hinweisPlatzhalter })}
      </div>
      <div class="field noshow" id="ord-noshow-feld" style="display:none">
        <label class="noshow-label"><input type="checkbox" id="ord-noshow" name="noShowZustimmung"><span id="ord-noshow-text"></span></label>
        <span class="error">${e(b.noShowFehler)}</span>
      </div>
      <div class="drawer-foot">
        <div class="totals"><span>${e(b.gesamt)}</span><span id="cart-total">0,00 €</span></div>
        <button class="btn btn-primary btn-block" id="order-submit" type="submit">${e(b.absenden)}</button>
        <p class="hint drawer-hinweis">${e(b.bezahlung)}</p>
        ${vorschauHinweis(aktionen, texte)}
      </div>
    </form>
  </div>
</aside>
<div class="confirm-box" id="confirm" role="dialog" aria-modal="true">
  <div class="confirm-icon" id="confirm-icon" aria-hidden="true">
    <span class="ci-ok">${checkCircle()}</span>
    <span class="ci-fehler">${warnung()}</span>
  </div>
  <h3 id="confirm-title"></h3>
  <p id="confirm-text"></p>
  <div class="confirm-summary" id="confirm-summary"></div>
  <a class="btn btn-ghost" id="confirm-mail" style="display:none" href="#">${e(b.mailBestaetigung)}</a>
  <button class="btn btn-primary btn-block" id="confirm-close" type="button">${e(b.schliessen)}</button>
</div>`;
}

export function renderFuss({ texte, lead, cuisine }) {
  const telefon = lead.telefon || "";
  const telHref = telefon.replace(/[^\d+]/g, "");
  return `<footer class="fuss auf-tint">
  <div class="rahmen fuss-raster">
    <div class="fuss-haus">
      <strong>${kuechenMarke(cuisine, "marke")}${e(texte.name)}</strong>
      ${lead.adresse ? `<p>${e(lead.adresse)}</p>` : ""}
    </div>
    <nav class="fuss-nav" aria-label="${e(texte.fuss.navigation)}">
      <a href="#karte">${e(texte.nav.karte)}</a>
      <a href="#reservierung">${e(texte.nav.reservierung)}</a>
      <a href="#kontakt">${e(texte.nav.kontakt)}</a>
    </nav>
    <div class="fuss-kontakt">${telefon ? `<a href="tel:${e(telHref)}">${e(telefon)}</a>` : ""}</div>
    <p class="fuss-hinweis">${e(texte.fuss.hinweis)}</p>
  </div>
</footer>`;
}

export function renderEntwurfsleiste({ texte, fiktiv }) {
  return `<div class="entwurf-hinweis"><span>${e(fiktiv ? texte.entwurfsleisteFiktiv : texte.entwurfsleiste)}</span></div>`;
}
