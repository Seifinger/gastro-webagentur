import { escapeHtml } from "../htmlHelpers.js";
import { formatCount } from "../htmlHelpers.js";
import {
  heroSignatur,
  heroDishPhoto,
  heroAmbiencePhoto,
  heroReservationHero,
} from "../heroSignature.js";

/**
 * Wählt das Hero-Element passend zu preset.hero.type. "signature" (Standard)
 * und jeder unbekannte Wert fallen auf die bisherige, küchenspezifische
 * Animation zurück – ein Tippfehler im Preset darf den Hero nie leeren.
 */
export function renderHeroFeature(type, ctx) {
  if (type === "dish_photo") return heroDishPhoto(ctx);
  if (type === "ambience_photo") return heroAmbiencePhoto(ctx);
  if (type === "reservation_hero") return heroReservationHero(ctx);
  return heroSignatur(ctx.cuisine, ctx);
}

/**
 * Die beiden Hero-CTAs ("Zur Abholung bestellen" / "Tisch reservieren").
 * Bei primaryAction "order" (Standard) exakt die bisherige Reihenfolge und
 * Optik; bei "reservation" tauschen Reihenfolge und Betonung (nicht Ziel
 * oder Text).
 */
export function heroActionButtons(primaryAction) {
  const bestellen = (cls) => `<a class="btn ${cls}" href="#karte">Zur Abholung bestellen</a>`;
  const reservieren = (cls) => `<a class="btn ${cls}" href="#reservierung">Tisch reservieren</a>`;
  if (primaryAction === "reservation") {
    return `${reservieren("btn-light")}${bestellen("btn-outline-light")}`;
  }
  return `${bestellen("btn-light")}${reservieren("btn-outline-light")}`;
}

export function renderRating(lead) {
  if (!lead.rating) return "";
  const rounded = Math.round(Number(lead.rating));
  const stars = "★".repeat(rounded) + "☆".repeat(Math.max(0, 5 - rounded));
  const count = lead.anzahlBewertungen
    ? ` (${formatCount(lead.anzahlBewertungen)} Bewertungen)`
    : "";
  return `
    <div class="rating">
      <span class="stars" aria-hidden="true">${stars}</span>
      <span><strong>${String(lead.rating).replace(".", ",")}/5</strong> auf Google${count}</span>
    </div>`;
}

/**
 * Der komplette Hero: Titelbild, Overlay, küchenspezifisches Feature
 * (renderHeroFeature) und der Textblock mit Konzept, Titel, Bewertung,
 * Schlagzeile und den beiden Haupt-CTAs.
 *
 * @param {object} ctx
 * @param {object} ctx.lead
 * @param {object} ctx.preset - designPresets-Eintrag (preset.hero.type/.primaryAction).
 * @param {string} ctx.name
 * @param {string} ctx.ort
 * @param {string} ctx.heroImageSrc - fertige Bild-URL für das Titelbild.
 * @param {string} ctx.konzeptLabel - menu.konzept ?? menu.label.
 * @param {string} ctx.heroHeadline
 * @param {string} ctx.heroSchlagzeile
 * @param {string} ctx.cuisine
 * @param {Array} ctx.highlights
 * @param {string} ctx.hausBild
 * @param {Function} ctx.bildUrl
 */
export function renderHero(ctx) {
  const { lead, preset, name, ort, heroImageSrc, konzeptLabel, heroHeadline, heroSchlagzeile, cuisine, highlights, hausBild, bildUrl } = ctx;

  return `<section class="hero">
  <div class="hero-media">
    <img src="${escapeHtml(heroImageSrc)}" alt="${escapeHtml(name)}">
  </div>
  <div class="hero-overlay"></div>
  ${renderHeroFeature(preset.hero.type, {
    cuisine,
    highlights,
    hausBild,
    bildUrl,
    escape: escapeHtml,
  })}
  <div class="hero-inner">
    <div class="hero-kicker">${escapeHtml(konzeptLabel)}${ort ? ` · in ${escapeHtml(ort)}` : ""}</div>
    <h1>${escapeHtml(heroHeadline)}</h1>
    ${renderRating(lead)}
    <p class="hero-sub">${escapeHtml(heroSchlagzeile)}</p>
    <div class="hero-actions">${heroActionButtons(preset.hero.primaryAction)}</div>
  </div>
</section>`;
}

/** USP-Leiste direkt unter dem Hero. */
export function renderUspStrip(usps) {
  const uspBadges = (usps ?? [])
    .map((usp) => `<span><span aria-hidden="true">✓</span> ${escapeHtml(usp)}</span>`)
    .join("");
  return `<section class="usp-strip">
  <div class="wrap"><div class="usp-list">${uspBadges}</div></div>
</section>`;
}
