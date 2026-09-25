// Speisekarte auf zwei Seiten (Stand 25.09.2026), nur für Seiten mit Ausdruck.
//
//   Startseite       – renderAuswahl: eine kleine Auswahl (id="karte", damit
//                      alte Anker und Links auf #karte weiter tragen), die
//                      Kategorien der Karte und der Link "Gesamte Speisekarte
//                      ansehen". Das Plus öffnet das Gericht auf der
//                      Speisekarten-Seite, es legt nichts in den Warenkorb.
//   Speisekarte      – renderKarteSeite: alle freigegebenen Gerichte je
//                      Kategorie, Kategorien-Navigation (Handy: waagrecht
//                      scrollbar unter der Kopfzeile; Desktop: ruhige
//                      Seitenleiste), Hinzufügen je Gericht bzw. je Variante.
//
// Beide lesen dieselbe aufbereitete Karte (../speisekarte.js). Warenkorb,
// Abholzeiten und Checkout sind die bestehenden (PAGE_SCRIPT, renderBestellweg).
//
// Bilder: auf der Speisekarte je Kategorie höchstens eines – und nur ein
// zulässiges (eigenes Foto, KI mit Kennzeichnung, Konzeptbild; Stock nur auf
// erfundenen Beispielseiten). Eine Karte ist zum Lesen da, keine Kachelwand.

import { escapeHtml, formatPrice, plus } from "../v1Funktionen.js";
import { bild } from "./kopf.js";
import { gerichtLink } from "../speisekarte.js";

const e = escapeHtml;

/** Darf dieses Medium auf der Speisekarte neben einem Gericht stehen? */
export function bildZulaessig(medium, { fiktiv = false } = {}) {
  if (!medium?.src || medium.typ === "video") return false;
  if (["eigen", "ki", "konzept"].includes(medium.herkunft)) return true;
  return fiktiv && medium.herkunft === "platzhalter" && String(medium.quelle ?? "").startsWith("stock:");
}

/** Relative Medienpfade gelten von der Startseite aus; die Speisekarte liegt eine Ebene tiefer. */
export function mediumVonUnterseite(medium, praefix = "../") {
  if (!medium?.src || /^(?:[a-z]+:|\/|#)/i.test(medium.src)) return medium;
  return { ...medium, src: `${praefix}${medium.src}` };
}

function veg(g, texte) {
  return g.vegetarisch ? ` <span class="marke-klein">${e(texte.karte.vegetarisch)}</span>` : "";
}

function preisText(g) {
  return g.varianten.length > 1 ? `ab ${formatPrice(g.preis)}` : formatPrice(g.preis);
}

/* ------------------------------------------------------------------ */
/* Startseite: kleine Auswahl                                          */
/* ------------------------------------------------------------------ */

export function renderAuswahl({ ds, texte, karte, auswahl, aktionen }) {
  const t = texte.speisekarte;
  const zeile = (g) => `<li class="karten-zeile">
          <div class="zeile-kopf"><span class="karten-name">${e(g.name)}</span>${veg(g, texte)}<span class="menue-punkte" aria-hidden="true"></span><span class="preis">${preisText(g)}</span><a class="mini-add" href="${e(gerichtLink(g))}" aria-label="${e(g.name)} ${e(t.zumGericht)}">${plus()}</a></div>
          ${g.beschreibung ? `<p class="gericht-desc">${e(g.beschreibung)}</p>` : ""}
        </li>`;
  const kategorien = karte.kategorien
    .map((k) => `<li><a href="${e(aktionen.karte.href)}#${e(k.anker)}">${e(k.name)}</a><span class="anzahl">${k.anzahl}</span></li>`)
    .join("");
  return `<section class="sektion sektion--tief auswahl" id="karte">
  <div class="rahmen">
    <header class="sektion-kopf${ds.archetyp === "abend" ? " sektion-kopf--seitlich" : ""}">
      <p class="rubrik">${e(t.auswahlRubrik)}</p>
      <div>
        <h2>${e(t.auswahlTitel)}</h2>
        <p class="intro">${e(t.auswahlIntro)}</p>
      </div>
    </header>
    <div class="auswahl-raster">
      <ul class="karten-liste auswahl-liste">${auswahl.map(zeile).join("")}</ul>
      <nav class="auswahl-karte" aria-label="${e(t.kategorien)}">
        <p class="rubrik">${e(t.aufDerKarte)}</p>
        <ul class="auswahl-kategorien">${kategorien}</ul>
        <a class="btn btn-primary auswahl-ganz" href="${e(aktionen.karte.href)}">${e(t.ganzeKarte)}</a>
      </nav>
    </div>
  </div>
</section>`;
}

/* ------------------------------------------------------------------ */
/* Speisekarten-Seite                                                  */
/* ------------------------------------------------------------------ */

function hinzufuegen(id, name, preis, label, texte, { klein = false } = {}) {
  const attr = `type="button" data-add="${e(id)}" data-name="${e(name)}" data-preis="${preis}" aria-label="${e(label)} – ${e(texte.speisekarte.hinzufuegen)}"`;
  return klein
    ? `<button class="mini-add" ${attr}>${plus()}</button>`
    : `<button class="btn btn-ghost btn-klein karte-add" ${attr}>${plus()} ${e(texte.speisekarte.hinzufuegen)}</button>`;
}

function gerichtZeile(g, { texte, bestellbar }) {
  const t = texte.speisekarte;
  const mitVarianten = g.varianten.length > 0;
  const marken = [
    g.vegetarisch ? `<span class="marke-klein">${e(texte.karte.vegetarisch)}</span>` : "",
    g.ausverkauft ? `<span class="marke-klein marke-klein--signal">${e(t.ausverkauft)}</span>` : "",
  ].filter(Boolean).join(" ");
  const extras = g.extras.length
    ? `<p class="karte-extras"><span>${e(t.extras)}:</span> ${g.extras.map((x) => `${e(x.name)}${x.preis !== undefined ? ` (+ ${formatPrice(x.preis)})` : ""}`).join(" · ")}</p>`
    : "";
  const varianten = mitVarianten
    ? `<ul class="karte-varianten">${g.varianten
        .map((v) => `<li${v.ausverkauft ? ' class="aus"' : ""}><span class="karte-variante-name">${e(v.name)}</span><span class="menue-punkte" aria-hidden="true"></span><span class="preis">${formatPrice(v.preis)}</span>${bestellbar && !g.ausverkauft && !v.ausverkauft ? hinzufuegen(v.id, `${g.name} (${v.name})`, v.preis, `${g.name}, ${v.name}`, texte, { klein: true }) : ""}</li>`)
        .join("")}</ul>`
    : "";
  const aktion = !mitVarianten && bestellbar && !g.ausverkauft ? hinzufuegen(g.schluessel, g.name, g.preis, g.name, texte) : "";
  return `<li class="karte-gericht${g.ausverkauft ? " karte-gericht--aus" : ""}" id="${e(g.anker)}">
          <div class="karte-gericht-kopf"><h3>${e(g.name)}</h3>${mitVarianten ? "" : `<span class="menue-punkte" aria-hidden="true"></span><span class="preis">${formatPrice(g.preis)}</span>`}</div>
          ${g.beschreibung ? `<p class="gericht-desc">${e(g.beschreibung)}</p>` : ""}
          ${marken ? `<p class="karte-marken">${marken}</p>` : ""}${extras}${varianten}${aktion ? `\n          <div class="karte-gericht-aktion">${aktion}</div>` : ""}
        </li>`;
}

function kategorie(k, { texte, bestellbar, kategorieBild }) {
  const liste = (gerichte) => `<ul class="karte-gerichte">${gerichte.map((g) => gerichtZeile(g, { texte, bestellbar })).join("")}</ul>`;
  const foto = kategorieBild(k);
  return `<section class="karte-kategorie${foto ? " karte-kategorie--bild" : ""}" id="${e(k.anker)}" aria-labelledby="${e(k.anker)}-titel">
      <header class="karte-kategorie-kopf">
        <h2 id="${e(k.anker)}-titel">${e(k.name)}</h2>
        ${k.beschreibung ? `<p class="karte-kategorie-text">${e(k.beschreibung)}</p>` : ""}
        ${foto ? `<figure class="karte-kategorie-bild">${bild(foto.medium, { alt: foto.gericht.name })}<figcaption>${e(foto.gericht.name)}</figcaption></figure>` : ""}
      </header>
      ${k.gerichte.length ? liste(k.gerichte) : ""}${k.gruppen.map((gr) => `
      <div class="karte-gruppe">
        ${gr.name ? `<h3 class="karte-gruppe-name">${e(gr.name)}</h3>` : ""}
        ${liste(gr.gerichte)}
      </div>`).join("")}
    </section>`;
}

/**
 * Hauptteil der Speisekarten-Seite. `bestellbar` ist false, wenn der Betrieb
 * nicht über die Website bestellen lässt – dann gibt es keine Hinzufügen-Knöpfe.
 */
/** Je Kategorie das erste Gericht mit zulässigem Bild: { [anker]: { gericht, medium } }. */
export function kategorieBilder(karte, medien, { fiktiv = false } = {}) {
  const bilder = {};
  for (const k of karte.kategorien) {
    for (const g of [...k.gerichte, ...k.gruppen.flatMap((gr) => gr.gerichte)]) {
      const m = medien.gericht({ ...g, id: g.index });
      if (bildZulaessig(m, { fiktiv })) {
        bilder[k.anker] = { gericht: g, medium: m };
        break;
      }
    }
  }
  return bilder;
}

export function renderKarteSeite({ texte, karte, bilder = {}, aktionen, bestellbar, probe }) {
  const t = texte.speisekarte;
  const kategorieBild = (k) => (bilder[k.anker] ? { ...bilder[k.anker], medium: mediumVonUnterseite(bilder[k.anker].medium) } : null);
  const sprung = karte.kategorien
    .map((k) => `<a href="#${e(k.anker)}">${e(k.name)}<span class="anzahl">${k.anzahl}</span></a>`)
    .join("");
  const wege = [
    aktionen?.reservieren ? `<a href="${e(aktionen.start.href)}#reservierung">${e(t.tischHinweis)} ${e(texte.ctaReservieren)}</a>` : "",
    aktionen?.anrufen ? `<a href="${e(aktionen.anrufen.href)}">${e(texte.besuch.lieberAnrufen)} ${e(aktionen.anrufen.text)}</a>` : "",
  ].filter(Boolean).join("");
  return `<div class="karte-seite">
  <header class="rahmen karte-seite-kopf">
    <p class="rubrik"><a href="${e(aktionen.start.href)}">${e(t.zurueck)}</a><span aria-hidden="true">/</span>${e(t.rubrik)}</p>
    <h1>${e(t.titel)}</h1>
    <p class="intro">${e(bestellbar ? t.intro : t.introOhneBestellung)}</p>
    ${probe && bestellbar ? `<p class="karte-probe">${e(t.probeHinweis)}</p>` : ""}
    ${bestellbar ? `<noscript><p class="karte-probe">${e(t.ohneSkript)}</p></noscript>` : ""}
    ${wege ? `<p class="karte-wege">${wege}</p>` : ""}
  </header>
  <div class="rahmen karte-seite-raster" id="karte">
    <nav class="karten-sprung karten-sprung--fest karten-sprung--seite" aria-label="${e(t.kategorien)}">${sprung}</nav>
    <div class="karte-seite-inhalt">
    ${karte.kategorien.map((k) => kategorie(k, { texte, bestellbar, kategorieBild })).join("\n    ")}
    <p class="karte-fuss">${e(texte.karte.fussnote)}</p>
    </div>
  </div>
</div>`;
}

/** Nur auf der Speisekarten-Seite: tatsächliche Kopfhöhe für Sprungziele, Status-Meldung ausblenden. */
export const KARTE_SEITE_SKRIPT = `
(function () {
  var kopf = document.getElementById("topbar");
  if (kopf) {
    var merke = function () { document.documentElement.style.setProperty("--kopf-ist", kopf.offsetHeight + "px"); };
    merke();
    window.addEventListener("resize", merke);
  }
  var status = document.getElementById("cart-status");
  if (status && "MutationObserver" in window) {
    var uhr = null;
    new MutationObserver(function () {
      if (!status.textContent) return;
      status.classList.add("sichtbar");
      clearTimeout(uhr);
      uhr = setTimeout(function () { status.classList.remove("sichtbar"); }, 3200);
    }).observe(status, { childList: true, characterData: true, subtree: true });
  }
})();
`;

export const KARTE_CSS = `
/* Startseite: kleine Auswahl + Weg zur ganzen Karte */
.auswahl-raster { display: grid; gap: var(--s-6); }
.auswahl-liste .karten-zeile .gericht-desc { max-width: 52ch; }
.auswahl-karte { display: grid; align-content: start; gap: var(--s-2); padding: var(--s-4); background: var(--grund); border: 1px solid var(--linie); border-radius: var(--r-karte); }
.auswahl-kategorien { list-style: none; margin: 0 0 var(--s-2); padding: 0; }
.auswahl-kategorien li { display: flex; justify-content: space-between; align-items: baseline; gap: var(--s-2); border-bottom: 1px solid var(--linie); }
.auswahl-kategorien a { display: block; padding-block: var(--s-1); color: var(--text); text-decoration: none; font-weight: var(--f-text-stark); }
.auswahl-kategorien a:hover { color: var(--akzent-text); text-decoration: underline; }
.auswahl-karte .anzahl, .karten-sprung--seite .anzahl { color: var(--text-leise); font-size: var(--t-klein); font-variant-numeric: tabular-nums; }
.auswahl-ganz { width: 100%; }
@media (min-width: 1024px) { .auswahl-raster { grid-template-columns: 8fr 4fr; column-gap: calc(var(--rinne) * 2); align-items: start; } }

.kopf-nav a[aria-current="page"] { text-decoration: underline; text-underline-offset: .3em; }
/* Speisekarten-Seite: ruhiger als die Startseite, Kopfzeile im Fluss */
.seite-karte .kopf { position: sticky; }
.karte-seite { padding-bottom: var(--sektion); }
.karte-seite-kopf { padding-block: var(--s-6) var(--s-4); }
.karte-seite-kopf .rubrik a { color: inherit; }
.karte-seite-kopf .rubrik span { color: var(--text-leise); }
.karte-seite-kopf h1 { font-size: var(--t-h1); }
.karte-seite-kopf .intro { max-width: var(--text-breite); }
.karte-probe { max-width: var(--text-breite); margin-top: var(--s-3); padding: var(--s-2) var(--s-3); border-left: 4px solid var(--signal-text); background: var(--flaeche); color: var(--text); }
.karte-wege { display: flex; flex-wrap: wrap; gap: var(--s-1) var(--s-4); margin-top: var(--s-3); }
.karte-wege a { display: inline-flex; align-items: center; min-height: var(--s-6); color: var(--akzent-text); font-weight: var(--f-text-stark); }

.karten-sprung--seite a { gap: var(--s-1); min-height: var(--s-6); }
.karten-sprung--seite a[aria-current="true"] .anzahl { color: inherit; }
[id^="kat-"], [id^="gericht-"] { scroll-margin-top: calc(var(--kopf-ist, var(--kopf-hoehe)) + var(--s-8)); }

.karte-kategorie { padding-block: var(--s-6); border-top: 1px solid var(--linie-stark); }
.karte-kategorie:first-child { border-top: 0; padding-top: 0; }
.karte-kategorie-kopf { display: grid; gap: var(--s-1); margin-bottom: var(--s-2); }
.karte-kategorie-kopf h2 { font-size: var(--t-h2); }
.karte-kategorie-text { max-width: var(--text-breite); color: var(--text-leise); }
.karte-kategorie-bild { margin-top: var(--s-2); max-width: 28rem; }
.karte-kategorie-bild img { width: 100%; aspect-ratio: 3 / 2; object-fit: cover; border-radius: var(--r-bild); background: var(--flaeche-tief); }
.karte-kategorie-bild figcaption { margin-top: var(--s-1); color: var(--text-leise); font-size: var(--t-klein); }
.karte-gruppe { margin-top: var(--s-4); }
.karte-gruppe-name { font-size: var(--t-h3); margin-bottom: var(--s-1); }

.karte-gerichte { list-style: none; margin: 0; padding: 0; display: grid; }
.karte-gericht { display: grid; gap: var(--s-1); padding-block: var(--s-3); border-bottom: 1px solid var(--linie); min-width: 0; }
.karte-gericht-kopf { display: flex; align-items: baseline; gap: var(--s-1); }
.karte-gericht-kopf h3 { min-width: 0; font-family: var(--f-text); font-size: var(--t-gross); font-weight: var(--f-text-stark); text-transform: none; letter-spacing: 0; overflow-wrap: anywhere; }
.karte-gericht-kopf .preis { font-size: var(--t-gross); }
.karte-gericht .gericht-desc { max-width: 60ch; color: var(--text-leise); overflow-wrap: anywhere; }
.karte-marken { display: flex; flex-wrap: wrap; gap: var(--s-1); }
.karte-extras { color: var(--text-leise); font-size: var(--t-klein); }
.karte-extras span { font-weight: var(--f-text-stark); color: var(--text); }
.karte-varianten { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-halb); }
.karte-varianten li { display: flex; align-items: center; gap: var(--s-1); min-height: var(--s-6); }
.karte-varianten li.aus { color: var(--text-leise); text-decoration: line-through; }
.karte-gericht-aktion { display: flex; }
.karte-add { min-height: var(--s-6); }
.karte-gericht--aus h3, .karte-gericht--aus .preis { color: var(--text-leise); }
/* Sprung von der Startseite (Plus): das Gericht ist markiert – auch ohne Skript (:target). */
.karte-gericht:target { margin-inline: calc(var(--s-2) * -1); padding-inline: var(--s-2); background: var(--flaeche); box-shadow: inset 4px 0 0 var(--akzent); border-radius: var(--r-klein); }
.karte-fuss { margin-top: var(--s-6); color: var(--text-leise); font-size: var(--t-klein); max-width: var(--text-breite); }

/* Status nach dem Hinzufügen: kurz sichtbar, für Vorleser als Live-Region */
.cart-status { position: fixed; left: var(--rand); right: var(--rand); bottom: calc(var(--s-10) + var(--s-6)); z-index: 60; margin: 0 auto; max-width: 28rem;
  padding: var(--s-1) var(--s-2); background: var(--tint); color: var(--auf-tint); border-radius: var(--r-karte); text-align: center;
  opacity: 0; transform: translateY(var(--s-1)); pointer-events: none; transition: opacity var(--m-kurz) ease, transform var(--m-kurz) ease; }
.cart-status.sichtbar { opacity: 1; transform: none; }
.cart-hinweis { margin: 0 0 var(--s-2); padding: var(--s-1) var(--s-2); background: var(--flaeche); border-left: 4px solid var(--signal-text); font-size: var(--t-klein); }
.cart-fab.gerade { animation: fab-gerade var(--m-mittel) var(--m-kurve); }
@keyframes fab-gerade { 50% { transform: scale(1.06); } }
@media (prefers-reduced-motion: reduce) {
  .cart-status { transition: none; transform: none; }
  .cart-fab.gerade { animation: none; }
}

@media (min-width: 1024px) {
  .karte-seite-kopf { padding-block: var(--s-10) var(--s-6); }
  .karte-seite-raster { display: grid; grid-template-columns: 3fr 9fr; column-gap: calc(var(--rinne) * 2); align-items: start; }
  .karten-sprung--seite { position: sticky; top: calc(var(--kopf-ist, var(--kopf-hoehe)) + var(--s-3)); flex-direction: column; flex-wrap: nowrap; gap: 0;
    margin: 0; padding: 0; overflow: visible; }
  .karten-sprung--seite a { justify-content: space-between; padding: var(--s-1) var(--s-2); border: 0; border-left: 2px solid var(--linie-stark); border-radius: 0; font-size: var(--t-basis); }
  .karten-sprung--seite a[aria-current="true"] { background: transparent; color: var(--akzent-text); border-left-color: var(--akzent); }
  .karte-kategorie--bild .karte-kategorie-kopf { grid-template-columns: minmax(0, 1fr) minmax(0, 20rem); column-gap: var(--rinne); align-items: end; }
  .karte-kategorie--bild .karte-kategorie-bild { grid-column: 2; grid-row: 1 / span 2; margin-top: 0; }
}
@media (min-width: 1280px) {
  .karte-gerichte { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: calc(var(--rinne) * 2); }
}
`;
