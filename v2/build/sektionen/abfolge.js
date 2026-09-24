// Abschnitte, die es nur auf Seiten mit Ausdruck gibt (Gestaltungs-Umbau, AP6).
//
// Die Reihenfolge kommt aus dem Profil (ausdruck.js, `abfolge`), nicht mehr
// aus dem Archetyp. Bestehende Abschnitte (Karte, Reservierung, Kontakt)
// werden wiederverwendet, damit Bestell- und Formularverträge unverändert
// bleiben; neu sind nur die Formen, die eine Seite nach einem Haus aussehen
// lassen statt nach einer Vorlage:
//
//   tisch  – drei Gerichte als Collage ungleicher Größen (kein Kartenraster)
//   haus   – Raum-Band: ein breites Bild, darauf versetzt ein schmaler Text
//
// Die Einladung (buehne.js) steht direkt unter der Bühne.

import { escapeHtml, formatPrice, plus } from "../v1Funktionen.js";
import { bild } from "./kopf.js";

const e = escapeHtml;

function vorbestellen(g, texte) {
  return `<button class="btn btn-ghost btn-klein" type="button" data-add="${e(g.id)}" data-name="${e(g.name)}" data-preis="${g.preis}">${plus()} ${e(texte.highlights.vorbestellen)}</button>`;
}

/** Heute auf dem Tisch: ein großes und zwei versetzte kleinere Gerichte. */
export function renderTisch({ texte, highlights, medien, fiktiv }) {
  const t = texte.tisch;
  const gerichte = highlights.slice(0, 3);
  const teller = (g, i) => `<article class="teller teller--${i + 1} auftritt">
      <figure class="teller-bild">${bild(medien.gericht(g), { alt: g.name })}</figure>
      <div class="teller-text">
        <h3>${e(g.name)}</h3>
        <p class="teller-desc">${e(g.beschreibung)}</p>
        <div class="teller-fuss"><span class="preis">${formatPrice(g.preis)}</span>${vorbestellen(g, texte)}</div>
      </div>
    </article>`;
  return `<section class="sektion tisch" id="highlights" data-atmosphaere="an">
  <div class="rahmen">
    <header class="tisch-kopf">
      <p class="rubrik">${e(t.rubrik)}</p>
      <h2>${e(t.titel)}</h2>
      <p class="intro">${e(t.intro)}${fiktiv ? "" : ` <span class="marke-klein marke-klein--signal">${e(texte.platzhalter)}</span>`}</p>
    </header>
    <div class="tisch-collage">${gerichte.map(teller).join("")}</div>
  </div>
</section>`;
}

/** Das Haus als Raum-Band. Ohne Bild bleibt nur der Text – nichts wird aufgefüllt. */
export function renderHausBand({ texte, medien, fiktiv }) {
  const a = texte.ambiente;
  // Ein Bild, das "unser Haus" zeigt, muss das Haus sein: eigenes Foto oder KI
  // mit Kennzeichnung; Stock nur auf erfundenen Beispielseiten; der gezeichnete
  // SVG-Platzhalter nie (er würde als leere Fläche gestreckt).
  const m = medien.haus;
  const haus = m?.src && m.quelle !== "platzhalter:svg" && (fiktiv || m.herkunft !== "platzhalter") ? m : null;
  const hinweis = fiktiv ? "" : ` <span class="marke-klein marke-klein--signal">${e(texte.platzhalter)}</span>`;
  return `<section class="haus-band${haus ? "" : " haus-band--ohne-bild"}" id="ambiente" data-atmosphaere="an">
  ${haus ? `<figure class="haus-band-bild">${bild(haus, { alt: a.slots[0].titel })}</figure>` : ""}
  <div class="rahmen">
    <div class="haus-band-text auftritt">
      <p class="rubrik">${e(a.rubrik)}</p>
      <h2>${e(a.titel)}</h2>
      <p class="intro">${e(a.text)}${hinweis}</p>
    </div>
  </div>
</section>`;
}

/** Anfahrt (AP8): die Adresse als Schild, Wege dorthin, Öffnungszeiten als Tafel. */
export function renderAnfahrt({ texte, lead, aktionen, oeffnungszeiten, fiktiv }) {
  const t = texte.kontakt;
  const [strasse, ...rest] = String(lead.adresse ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const adresse = strasse
    ? `<h2 class="anfahrt-adresse">${e(strasse)}${rest.length ? `<span>${e(rest.join(", "))}</span>` : ""}</h2>`
    : `<h2 class="anfahrt-adresse">${e(t.titel)}</h2>`;
  const wege = [
    aktionen?.route ? `<a class="btn btn-primary" href="${e(aktionen.route.href)}" target="_blank" rel="noopener">${e(t.route)}</a>` : "",
    aktionen?.anrufen ? `<a class="btn btn-ghost" href="${e(aktionen.anrufen.href)}">${e(aktionen.anrufen.text)}</a>` : "",
  ].join("");
  // Mehrere Zeitfenster untereinander statt umbrechend nebeneinander.
  const zeiten = oeffnungszeiten
    .map((z) => `<div><span class="tage">${e(z.tage)}</span><span class="fenster">${String(z.zeiten).split(" & ").map((f) => `<span>${e(f)}</span>`).join("")}</span></div>`)
    .join("");
  return `<section class="sektion anfahrt" id="kontakt">
  <div class="rahmen anfahrt-raster">
    <div class="anfahrt-ort">
      <p class="rubrik">${e(t.rubrik)}</p>
      ${adresse}
      ${wege ? `<p class="anfahrt-wege">${wege}</p>` : ""}
      <p class="anfahrt-hinweis">${e(t.abholung)}</p>
    </div>
    <div class="anfahrt-zeiten auftritt">
      <h3>${e(t.oeffnungszeiten)}${fiktiv ? "" : ` <span class="marke-klein marke-klein--signal">${e(texte.platzhalter)}</span>`}</h3>
      ${zeiten}
    </div>
  </div>
</section>`;
}

/** Fußzeile (AP8): Wortmarke statt Linkfriedhof, nur echte Kontaktwege. */
export function renderFussAusdruck({ texte, lead, aktionen }) {
  return `<footer class="fuss-haus auf-tint">
  <div class="rahmen fuss-haus-raster">
    <p class="fuss-marke">${e(texte.name)}</p>
    <div class="fuss-spalten">
      <address>${lead.adresse ? e(lead.adresse) : ""}${aktionen?.route ? `<br><a href="${e(aktionen.route.href)}" target="_blank" rel="noopener">${e(texte.kontakt.route)}</a>` : ""}</address>
      <div>${aktionen?.anrufen ? `<a href="${e(aktionen.anrufen.href)}">${e(aktionen.anrufen.text)}</a>` : ""}</div>
      <nav aria-label="${e(texte.fuss.navigation)}">
        <a href="#karte">${e(texte.nav.karte)}</a>
        <a href="#reservierung">${e(texte.nav.reservierung)}</a>
        <a href="#kontakt">${e(texte.nav.kontakt)}</a>
      </nav>
    </div>
    <p class="fuss-hinweis">${e(texte.fuss.hinweis)}</p>
  </div>
</footer>`;
}

/** Karte + Bestellen mobil (AP7): aktive Kategorie markieren, Aktionsleiste beim Tippen ausblenden. */
export const ABFOLGE_SKRIPT = `
(function () {
  var leiste = document.querySelector(".karten-sprung--fest");
  if (leiste && "IntersectionObserver" in window) {
    var links = {};
    Array.prototype.forEach.call(leiste.querySelectorAll("a"), function (a) { links[a.getAttribute("href").slice(1)] = a; });
    var markiere = function (id) {
      Object.keys(links).forEach(function (k) { if (k === id) links[k].setAttribute("aria-current", "true"); else links[k].removeAttribute("aria-current"); });
      var a = links[id];
      if (a && leiste.scrollWidth > leiste.clientWidth) leiste.scrollLeft = a.offsetLeft - leiste.clientWidth / 2 + a.offsetWidth / 2;
    };
    var beobachter = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) { if (e.isIntersecting) markiere(e.target.id); });
    }, { rootMargin: "-35% 0px -60% 0px" });
    Object.keys(links).forEach(function (id) { var el = document.getElementById(id); if (el) beobachter.observe(el); });
  }
  document.addEventListener("focusin", function (e) {
    if (e.target.matches && e.target.matches("input, select, textarea") && !e.target.closest("#drawer")) document.body.classList.add("tippt");
  });
  document.addEventListener("focusout", function () { document.body.classList.remove("tippt"); });
})();
`;

export const ABFOLGE_CSS = `
/* Einladung zweispaltig: links das Haus, rechts der Besuch (nur echte Angaben). */
.einladung-innen { justify-items: start; text-align: left; }
.einladung .bewertung { justify-content: flex-start; }
.einladung-aktionen { justify-content: flex-start; }
.einladung-besuch { display: grid; gap: var(--s-2); width: 100%; padding-top: var(--s-3); border-top: 1px solid var(--linie); }
.einladung-besuch h2 { font-size: var(--t-h3); }
.einladung-adresse { font-style: normal; color: var(--text-leise); }
.einladung-adresse a { color: var(--akzent-text); }
@media (min-width: 1024px) {
  .einladung-innen { grid-template-columns: 7fr 4fr; column-gap: calc(var(--rinne) * 2); align-items: end; }
  .einladung-haus { display: grid; gap: var(--s-2); }
  .einladung-besuch { padding-top: 0; padding-left: var(--s-4); border-top: 0; border-left: 1px solid var(--linie); }
}

/* Tisch: Collage statt Kartenraster – ungleiche Größen, versetzte Kanten. */
.tisch-kopf { max-width: var(--text-breite); margin-bottom: var(--s-6); }
.tisch-collage { display: grid; gap: var(--s-6); }
.teller { display: grid; gap: var(--s-2); }
.teller-bild { position: relative; overflow: hidden; border-radius: var(--r-bild); background: var(--flaeche-tief); aspect-ratio: 4 / 5; }
.teller-bild img { width: 100%; height: 100%; object-fit: cover; }
.teller--2 .teller-bild { aspect-ratio: 4 / 3; }
.teller--3 .teller-bild { aspect-ratio: 1 / 1; }
.teller h3 { font-size: var(--t-h3); }
.teller--1 h3 { font-size: var(--t-h2); }
.teller-desc { color: var(--text-leise); max-width: 46ch; }
.teller-fuss { display: flex; align-items: center; gap: var(--s-2); flex-wrap: wrap; }
.teller-fuss .preis { margin-right: auto; font-family: var(--f-display); font-size: var(--t-gross); font-variant-numeric: tabular-nums; }
@media (max-width: 767px) {
  .teller--2 { width: 88%; margin-left: auto; }
  .teller--3 { width: 72%; }
}
@media (min-width: 768px) {
  .tisch-collage { grid-template-columns: repeat(12, 1fr); column-gap: var(--rinne); row-gap: var(--s-8); align-items: start; }
  .teller--1 { grid-column: 1 / span 7; grid-row: 1 / span 2; }
  .teller--2 { grid-column: 8 / span 5; }
  .teller--3 { grid-column: 9 / span 4; }
}

/* Haus als Raum-Band: breites Bild, der Text schiebt sich versetzt darüber. */
.haus-band { position: relative; padding-bottom: var(--sektion); }
.haus-band-bild { position: relative; height: 56svh; overflow: hidden; background: var(--flaeche-tief); }
.haus-band-bild img { width: 100%; height: 100%; object-fit: cover; }
.haus-band-text { position: relative; max-width: 40rem; margin-top: calc(var(--s-12) * -1); padding: var(--s-5) var(--s-4); background: var(--grund); }
.haus-band--ohne-bild { padding-top: var(--sektion); }
.haus-band--ohne-bild .haus-band-text { margin-top: 0; padding-inline: 0; }
@media (min-width: 1024px) { .haus-band-text { margin-left: calc(100% / 12); } }

/* Karte (AP7): Sprungleiste läuft auf dem Handy unter der Kopfzeile mit. */
.karten-sprung--fest { position: sticky; top: var(--kopf-ist, var(--kopf-hoehe-mobil)); z-index: 30; flex-wrap: nowrap; overflow-x: auto;
  margin: 0 calc(var(--rand) * -1) var(--s-6); padding: var(--s-1) var(--rand); background: var(--flaeche-tief); scrollbar-width: none; }
.karten-sprung--fest a { display: inline-flex; align-items: center; min-height: var(--s-5); white-space: nowrap; color: var(--text); }
.karten-sprung--fest a[aria-current="true"] { background: var(--akzent); border-color: var(--akzent); color: var(--auf-akzent); }
section[id^="karte-"] { scroll-margin-top: calc(var(--kopf-ist, var(--kopf-hoehe)) + var(--s-8)); }
.tafel-name { top: calc(var(--kopf-ist, var(--kopf-hoehe)) + var(--s-3)); }
.mini-add { position: relative; }
.mini-add::after { content: ""; position: absolute; inset: -4px; }
.tippt .mobilebar { opacity: 0; transform: translateY(100%); pointer-events: none; }
@media (min-width: 1024px) {
  .karten-sprung--fest { position: static; margin-inline: 0; padding-inline: 0; background: transparent; }
}

/* Reservierung (AP8): der direkte Weg, wenn es eine echte Nummer gibt. */
.reservierung-telefon { margin-top: var(--s-3); color: var(--text-leise); }
.reservierung-telefon a { color: var(--akzent-text); font-weight: var(--f-text-stark); }

/* Anfahrt (AP8) */
.anfahrt-raster { display: grid; gap: var(--s-8); }
.anfahrt-adresse { font-size: var(--t-h1); }
.anfahrt-adresse span { display: block; margin-top: var(--s-1); color: var(--text-leise); font-size: var(--t-h3); }
.anfahrt-wege { display: flex; flex-wrap: wrap; gap: var(--s-2); margin-top: var(--s-4); }
.anfahrt-hinweis { margin-top: var(--s-3); color: var(--text-leise); }
.anfahrt-zeiten { padding: var(--s-4); background: var(--flaeche); border: 1px solid var(--linie); border-radius: var(--r-karte); }
.anfahrt-zeiten h3 { margin-bottom: var(--s-2); font-size: var(--t-h3); }
.anfahrt-zeiten > div { display: flex; justify-content: space-between; align-items: baseline; gap: var(--s-2); padding-block: var(--s-1); border-bottom: 1px solid var(--linie); font-variant-numeric: tabular-nums; }
.anfahrt-zeiten .fenster { display: flex; flex-direction: column; align-items: flex-end; white-space: nowrap; }
@media (min-width: 1024px) { .anfahrt-raster { grid-template-columns: 7fr 5fr; align-items: end; } }

/* Fußzeile (AP8) */
.fuss-haus { padding-block: var(--sektion) var(--s-6); background: var(--tint); color: var(--auf-tint); }
.fuss-haus-raster { display: grid; gap: var(--s-4); }
.fuss-marke { font-family: var(--f-display); font-weight: var(--f-display-gewicht); text-transform: var(--f-display-transform); font-size: var(--t-h1); line-height: 1.05; }
.fuss-spalten { display: grid; gap: var(--s-3); color: var(--auf-tint-leise); }
.fuss-spalten address { font-style: normal; }
.fuss-haus a { color: var(--auf-tint); }
.fuss-haus nav { display: flex; flex-direction: column; gap: var(--s-1); }
.fuss-haus .fuss-hinweis { max-width: 72ch; padding-top: var(--s-3); border-top: 1px solid var(--auf-tint-leise); color: var(--auf-tint-leise); font-size: var(--t-klein); }
@media (min-width: 768px) { .fuss-spalten { grid-template-columns: repeat(3, 1fr); } }
`;
