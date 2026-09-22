import { escapeHtml } from "../htmlHelpers.js";
import { formatCount } from "../htmlHelpers.js";
import {
  heroSignatur,
  heroDishPhoto,
  heroAmbiencePhoto,
  heroReservationHero,
} from "../heroSignature.js";
import { haken, stern } from "../signaturIcons.js";

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

/** Eine Reihe aus fünf Sternen, `rounded` davon gefüllt – ersetzt ★/☆. */
function sternenreihe(rounded) {
  return Array.from({ length: 5 }, (_, i) => stern(i < rounded)).join("");
}

export function renderRating(lead) {
  if (!lead.rating) return "";
  const rounded = Math.round(Number(lead.rating));
  const count = lead.anzahlBewertungen
    ? ` (${formatCount(lead.anzahlBewertungen)} Bewertungen)`
    : "";
  return `
    <div class="rating">
      <span class="stars" aria-hidden="true">${sternenreihe(rounded)}</span>
      <span><strong>${String(lead.rating).replace(".", ",")}/5</strong> auf Google${count}</span>
    </div>`;
}

/**
 * Zerlegt eine Überschrift in Zeilen – serverseitig, nicht im Browser.
 *
 * Warum nicht zur Laufzeit: Wo eine Zeile umbricht, hängt an Schriftgröße und
 * Fensterbreite. Ein Skript, das den Text im Browser zerlegt, muss dafür erst
 * die Schrift abwarten, und bis dahin springt die Überschrift sichtbar. Hier
 * steht der Umbruch stattdessen fest im Markup: Die Zeilen sind Blöcke, der
 * Browser muss nichts messen, und ohne Skript steht die Überschrift ganz normal
 * da – nur eben zeilenweise gesetzt.
 *
 * Die Wörter werden gleichmäßig auf höchstens `maxZeilen` Zeilen verteilt,
 * damit aus einem langen Lokalnamen keine Treppe mit acht Stufen wird.
 */
export function zeilenAufteilen(text, maxZeilen = 3) {
  const woerter = String(text ?? "").trim().split(/\s+/).filter(Boolean);
  if (woerter.length === 0) return [];
  const anzahl = Math.min(maxZeilen, woerter.length);
  const proZeile = Math.ceil(woerter.length / anzahl);
  const zeilen = [];
  for (let i = 0; i < woerter.length; i += proZeile) {
    zeilen.push(woerter.slice(i, i + proZeile).join(" "));
  }
  return zeilen;
}

/**
 * Die Überschrift als gestaffelt auftretende Zeilen. Der Takt steht als
 * CSS-Variable am Element – dieselbe Mechanik wie bei den bestehenden
 * Auftritten, nur je Zeile statt je Karte (siehe MOTION_EXTRA_CSS).
 */
export function renderZeilenUeberschrift(text, { tag = "h1", maxZeilen = 3 } = {}) {
  const zeilen = zeilenAufteilen(text, maxZeilen);
  const inhalt = zeilen
    .map((zeile, i) => `<span class="zeile" style="--takt:${i}">${escapeHtml(zeile)}</span>`)
    .join("");
  return `<${tag} class="zeilen auftritt-zeile">${inhalt}</${tag}>`;
}

/**
 * Das Titelmedium des Heros. Mit hinterlegtem Video (hero.type "video_loop")
 * läuft eine stumme Endlosschleife, sonst bleibt es beim Bild.
 *
 * Das Bild ist dabei nie weg: Es ist das `poster` des Videos – also das, was
 * vor dem ersten Frame und bei abgestellter Bewegung zu sehen ist – und steht
 * zusätzlich als `<img>` daneben, das die Regeln in MOTION_EXTRA_CSS bei
 * prefers-reduced-motion einblenden. Ein Hero ohne Bild kann so nicht
 * entstehen.
 */
export function renderHeroMedia({ heroImageSrc, heroVideoSrc, name }) {
  if (!heroVideoSrc) {
    return `<div class="hero-media">
    <img src="${escapeHtml(heroImageSrc)}" alt="${escapeHtml(name)}">
  </div>`;
  }

  return `<div class="hero-media">
    <video class="hero-video" src="${escapeHtml(heroVideoSrc)}" poster="${escapeHtml(heroImageSrc)}"
           autoplay muted loop playsinline preload="metadata" aria-label="${escapeHtml(name)}"></video>
    <img class="hero-video-fallback" src="${escapeHtml(heroImageSrc)}" alt="${escapeHtml(name)}">
  </div>`;
}

/**
 * Der Editorial-Hero: Vollbild, die Überschrift zeilenweise groß gesetzt, die
 * Kennziffern (Konzept, Bewertung) als Randspalte rechts. Layout dazu in
 * styles/editorial.css.js.
 */
export function renderHeroEditorial(ctx) {
  const { lead, preset, name, ort, heroImageSrc, heroVideoSrc, konzeptLabel, heroHeadline, heroSchlagzeile } = ctx;

  // Dieselbe Darstellung wie renderRating: gefüllte und leere Sterne, damit
  // aus 4,6 nicht optisch eine glatte Fünf wird.
  const gerundet = Math.round(Number(lead.rating));
  const sterne = sternenreihe(gerundet);
  const bewertung = lead.rating
    ? `<div class="marginal-zeile"><span>Google</span><strong>${String(lead.rating).replace(".", ",")}/5</strong></div>
      <div class="marginal-zeile"><span class="sterne" aria-hidden="true">${sterne}</span><span>${
        lead.anzahlBewertungen ? `${formatCount(lead.anzahlBewertungen)} Bewertungen` : ""
      }</span></div>`
    : "";

  return `<section class="hero hero-editorial">
  ${renderHeroMedia({ heroImageSrc, heroVideoSrc, name })}
  <div class="hero-overlay"></div>
  <div class="hero-vignette"></div>
  <div class="hero-inner">
    <div class="hero-text">
      <div class="hero-kicker">${escapeHtml(konzeptLabel)}${ort ? ` · ${escapeHtml(ort)}` : ""}</div>
      ${renderZeilenUeberschrift(heroHeadline)}
      <p class="hero-sub">${escapeHtml(heroSchlagzeile)}</p>
      <div class="hero-actions">${heroActionButtons(preset.hero.primaryAction)}</div>
    </div>
    <div class="hero-marginal">
      <div class="marginal-zeile"><span>Haus</span><strong>${escapeHtml(konzeptLabel)}</strong></div>
      ${ort ? `<div class="marginal-zeile"><span>Ort</span><strong>${escapeHtml(ort)}</strong></div>` : ""}
      ${bewertung}
    </div>
  </div>
</section>`;
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
  const { lead, preset, name, ort, heroImageSrc, heroVideoSrc, konzeptLabel, heroHeadline, heroSchlagzeile, cuisine, highlights, hausBild, bildUrl, handschrift } = ctx;

  // Der Editorial-Archetyp bringt einen eigenen Hero mit – große Typografie,
  // asymmetrisches Raster. Alles andere läuft weiter durch den bisherigen.
  if (preset.hero.type === "editorial") return renderHeroEditorial(ctx);

  // Ein Video gibt es nur, wenn für diesen Lead wirklich eins hinterlegt ist
  // (hero.type "video_loop" plus Datei). Fehlt eines von beidem, bleibt es beim
  // bisherigen Bild-Hero – Zeichen für Zeichen derselbe wie zuvor.
  const videoQuelle = preset.hero.type === "video_loop" ? heroVideoSrc : "";

  return `<section class="hero">
  ${renderHeroMedia({ heroImageSrc, heroVideoSrc: videoQuelle, name })}
  <div class="hero-overlay"></div>
  <div class="hero-vignette"></div>
  ${renderHeroFeature(preset.hero.type, {
    cuisine,
    highlights,
    hausBild,
    bildUrl,
    escape: escapeHtml,
    handschrift,
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

/**
 * USP-Leiste direkt unter dem Hero.
 *
 * Mit Handschrift trägt sie den gezeichneten Haken aus signaturIcons.js statt
 * des gesetzten ✓ – dasselbe Zeichen wie die Pluspunkte der Reservierung.
 *
 * Und sie beginnt dann mit der Google-Note dieses Hauses. Die drei übrigen
 * Punkte gelten für jedes Lokal derselben Küche (sie stammen aus
 * menuCatalog.js); die Note ist das Einzige an dieser Leiste, das nur für
 * dieses eine Haus stimmt – und sie steht damit an der Stelle, die direkt
 * unter dem Hero als Erstes gelesen wird.
 *
 * Und sie trägt bei Entwürfen echter Häuser den Hinweis „Platzhalter". Die
 * Punkte stammen aus dem Küchenkatalog (menuCatalog.js) und behaupten etwas
 * über Zubereitung, Herkunft und Wartezeit eines Hauses, das diesen Entwurf
 * nicht beauftragt hat – „Fleisch vom Metzger im Ort", „Abholung in 20
 * Minuten". Fotos und Öffnungszeiten sind längst gekennzeichnet; diese Sätze
 * stehen sogar prominenter, direkt unter dem Hero. Erfundene Beispiel-Lokale
 * brauchen den Hinweis nicht: Bei ihnen steht schon oben auf der Seite, dass
 * das Haus frei erfunden ist.
 *
 * @param {Array} usps
 * @param {string|null} [handschrift] - preset.layout.handschrift.
 * @param {object} [lead] - für die Google-Note.
 * @param {boolean} [fiktiv] - erfundenes Beispiel-Lokal.
 */
export function renderUspStrip(usps, handschrift = null, lead = null, fiktiv = false) {
  const gezeichnet = Boolean(handschrift);
  // Der gezeichnete Haken ersetzt das gesetzte ✓ auf jeder Seite, nicht nur
  // dort, wo ein Archetyp eine eigene Handschrift mitbringt.
  const zeichen = haken();
  const note =
    gezeichnet && lead?.rating
      ? `<span class="usp-note">${stern()} <strong>${escapeHtml(
          String(lead.rating).replace(".", ","),
        )}</strong> von 5 auf Google${
          lead.anzahlBewertungen ? `, aus ${formatCount(lead.anzahlBewertungen)} Bewertungen` : ""
        }</span>`
      : "";
  // Der Hinweis steht VOR den Punkten aus dem Küchenkatalog und hinter der
  // Google-Note: Er gehört zu dem, was folgt, und die Note ist keiner –
  // sie ist belegt und nennt ihre Quelle.
  const hinweis = fiktiv ? "" : '<span class="usp-platzhalter">Platzhalter</span>';
  const uspBadges =
    note +
    hinweis +
    (usps ?? [])
      .map((usp) => `<span>${zeichen} ${escapeHtml(usp)}</span>`)
      .join("");
  return `<section class="usp-strip">
  <div class="wrap"><div class="usp-list">${uspBadges}</div></div>
</section>`;
}
