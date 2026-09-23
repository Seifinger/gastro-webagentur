// Kopfzeile, Hero (sechs Aufbauten) und die Leiste darunter.
//
// Keiner der Aufbauten setzt Text auf ein Foto mit Verlaufsschleier: Text
// steht entweder auf dem Grund der Seite oder auf einer deckenden Tafel.

import { escapeHtml, formatCount, formatPrice, stern, haken, plus } from "../v1Funktionen.js";

const e = escapeHtml;

/** Ein Bild samt Herkunfts-Kennzeichnung (Stage 4: eigenes Foto / KI / Platzhalter). */
export function bild(medium, { klasse = "", alt = "", lazy = true, zeigeBadge = true } = {}) {
  if (!medium?.src) return "";
  const badge = zeigeBadge && medium.badge ? `<span class="herkunft herkunft--${e(medium.herkunft)}">${e(medium.badge)}</span>` : "";
  if (medium.typ === "video") {
    // Stumme Endlosschleife; das Poster ist das Titelbild, damit vor dem
    // ersten Frame und bei abgeschalteter Bewegung nie ein leerer Kasten steht.
    return `<video${klasse ? ` class="${klasse}"` : ""} src="${e(medium.src)}"${medium.poster ? ` poster="${e(medium.poster)}"` : ""} autoplay muted loop playsinline preload="metadata" aria-label="${e(alt)}" data-herkunft="${e(medium.herkunft ?? "")}"></video>${badge}`;
  }
  return `<img${klasse ? ` class="${klasse}"` : ""} src="${e(medium.src)}" alt="${e(alt || medium.alt || "")}"${lazy ? ' loading="lazy"' : ""} data-herkunft="${e(medium.herkunft ?? "")}">${badge}`;
}

export function renderKopfzeile({ texte, ds }) {
  const fest = ds.layout.kopfzeileFest;
  return `<header class="kopfzeile${fest ? " kopfzeile--fest" : ""}" id="topbar">
  <div class="rahmen kopfzeile-innen">
    <a class="marke-name" href="#">${e(texte.name)}</a>
    <nav class="kopf-nav" aria-label="Hauptnavigation">
      <a href="#highlights">${e(texte.nav.highlights)}</a>
      <a href="#karte">${e(texte.nav.karte)}</a>
      <a href="#reservierung">${e(texte.nav.reservierung)}</a>
      <a href="#kontakt">${e(texte.nav.kontakt)}</a>
    </nav>
    <a class="btn btn-primary kopf-aktion" href="#reservierung">${e(texte.ctaReservieren)}</a>
  </div>
</header>`;
}

function sterne(anzahl) {
  return Array.from({ length: 5 }, (_, i) => stern(i < anzahl)).join("");
}

export function bewertung(lead, texte, { aufTint = false } = {}) {
  if (!lead.rating) return "";
  const note = String(lead.rating).replace(".", ",");
  const anzahl = lead.anzahlBewertungen ? ` · ${formatCount(lead.anzahlBewertungen)} ${texte.stimmen.bewertungen}` : "";
  return `<p class="bewertung${aufTint ? " bewertung--tint" : ""}"><span class="sterne" aria-hidden="true">${sterne(Math.round(Number(lead.rating)))}</span><span><strong>${note}</strong> von 5 ${texte.stimmen.aufGoogle}${anzahl}</span></p>`;
}

function aktionen(ds, texte, { aufTint = false } = {}) {
  const bestellen = (k) => `<a class="btn ${k}" href="#karte">${e(texte.ctaBestellen)}</a>`;
  const reservieren = (k) => `<a class="btn ${k}" href="#reservierung">${e(texte.ctaReservieren)}</a>`;
  const zweit = aufTint ? "btn-ghost btn-ghost--tint" : "btn-ghost";
  return ds.layout.primaerAktion === "reservation"
    ? `${reservieren("btn-primary")}${bestellen(zweit)}`
    : `${bestellen("btn-primary")}${reservieren(zweit)}`;
}

/** Titelmedium: Video, wenn eins hinterlegt ist (Poster = Titelbild), sonst das Titelbild. */
function heroMedium(ctx) {
  const { hero, heroVideo } = ctx.medien;
  const m = heroVideo ? { ...heroVideo, poster: hero?.src } : hero;
  return bild(m, { alt: ctx.texte.name, lazy: false });
}

function textblock({ ds, texte, lead, aufTint = false, klasse = "hero-text" }) {
  return `<div class="${klasse}">
    <p class="rubrik">${e(texte.kicker)}</p>
    <h1>${e(texte.headline)}</h1>
    <p class="hero-claim">${e(texte.claim)}</p>
    ${bewertung(lead, texte, { aufTint })}
    <div class="hero-aktionen">${aktionen(ds, texte, { aufTint })}</div>
  </div>`;
}

const HERO = {
  "spalte-bild": (ctx) => `<section class="hero hero--spalte-bild" data-hero="spalte-bild">
  ${textblock(ctx)}
  <figure class="hero-bild">${heroMedium(ctx)}</figure>
</section>`,

  tafel: (ctx) => `<section class="hero hero--tafel" data-hero="tafel">
  <figure class="hero-bild">${heroMedium(ctx)}</figure>
  <div class="rahmen hero-tafel-rahmen">${textblock({ ...ctx, aufTint: true, klasse: "hero-text hero-tafel auf-tint" })}</div>
</section>`,

  karte: (ctx) => {
    const zeilen = ctx.highlights
      .slice(0, 3)
      .map(
        (g) => `<li><span class="menue-name">${e(g.name)}</span><span class="menue-punkte" aria-hidden="true"></span><span class="menue-preis">${formatPrice(g.preis)}</span><button class="mini-add" type="button" data-add="${e(g.id)}" data-name="${e(g.name)}" data-preis="${g.preis}" aria-label="${e(g.name)} vorbestellen">${plus()}</button></li>`,
      )
      .join("");
    return `<section class="hero hero--karte" data-hero="karte">
  <div class="rahmen hero-karte-raster">
    ${textblock(ctx)}
    <aside class="hero-menue" aria-label="${e(ctx.texte.heuteEmpfohlen)}">
      <p class="rubrik">${e(ctx.texte.heuteEmpfohlen)}</p>
      <ol>${zeilen}</ol>
      <figure class="hero-einschub">${heroMedium(ctx)}</figure>
    </aside>
  </div>
</section>`;
  },

  typo: (ctx) => `<section class="hero hero--typo" data-hero="typo">
  <div class="rahmen hero-kopf">
    <p class="rubrik">${e(ctx.texte.kicker)}</p>
    <h1 class="hero-name">${e(ctx.texte.headline)}</h1>
    <div class="hero-zeile">
      <p class="hero-claim">${e(ctx.texte.claim)}</p>
      ${bewertung(ctx.lead, ctx.texte) || "<span></span>"}
      <div class="hero-aktionen">${aktionen(ctx.ds, ctx.texte)}</div>
    </div>
  </div>
  <figure class="hero-bild hero-band">${heroMedium(ctx)}</figure>
</section>`,

  passepartout: (ctx) => `<section class="hero hero--passepartout" data-hero="passepartout">
  <div class="rahmen hero-passepartout-raster">
    <figure class="hero-bild hero-rahmen">${heroMedium(ctx)}</figure>
    ${textblock({ ...ctx, klasse: "hero-text hero-text--versetzt" })}
  </div>
</section>`,

  streifen: (ctx) => `<section class="hero hero--streifen" data-hero="streifen">
  <div class="rahmen">
    ${textblock({ ...ctx, klasse: "hero-text hero-text--breit" })}
    <div class="hero-streifen">
      <figure class="hero-bild s-gross">${heroMedium(ctx)}</figure>
      <figure class="hero-bild s-mittel">${bild(ctx.medien.gericht(ctx.highlights[0]), { alt: ctx.highlights[0]?.name ?? "" })}</figure>
      <figure class="hero-bild s-klein">${bild(ctx.medien.haus, { alt: ctx.texte.ambiente.slots[0].titel })}</figure>
    </div>
  </div>
</section>`,
};

export const HERO_AUFBAUTEN = Object.keys(HERO);

export function renderHero(variante, ctx) {
  const render = HERO[variante];
  if (!render) throw new Error(`Unbekannte Hero-Variante "${variante}"`);
  return render(ctx);
}

/**
 * Die Leiste unter dem Hero: Google-Note (das Einzige, was nur für dieses
 * Haus stimmt) plus die Punkte aus dem Küchenkatalog – letztere bei echten
 * Häusern als Platzhalter gekennzeichnet, wie in v1.
 */
export function renderLeiste({ lead, texte, fiktiv }) {
  const note = lead.rating
    ? `<li class="leiste-note">${stern()}<span><strong>${String(lead.rating).replace(".", ",")}</strong> ${texte.stimmen.aufGoogle}</span></li>`
    : "";
  const punkte = texte.usps.map((u) => `<li>${haken()}<span>${e(u)}</span></li>`).join("");
  const hinweis = fiktiv ? "" : `<li class="leiste-hinweis"><span class="marke-klein">${e(texte.platzhalter)}</span></li>`;
  return `<section class="leiste" aria-label="Auf einen Blick">
  <ul class="rahmen leiste-liste">${note}${punkte}${hinweis}</ul>
</section>`;
}
