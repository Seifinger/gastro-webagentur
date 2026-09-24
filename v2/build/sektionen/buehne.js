// Erster Bildschirm für Seiten mit Ausdruck (Gestaltungs-Umbau, AP3):
// Kopfzeile mit zwei Zuständen, Bühne (Video oder Bild, immer mit Poster),
// Slogan, der beim Scrollen zurücktritt, und die Einladung darunter.
//
// Verträge, die bleiben: id="topbar" (PAGE_SCRIPT), Anker #karte,
// #reservierung, #kontakt. Ohne JavaScript ist alles sichtbar und bedienbar:
// Die Kopfzeile steht dann fest auf Fläche, das Menü öffnet über :target.

import { escapeHtml } from "../v1Funktionen.js";
import { bewertung } from "./kopf.js";

const e = escapeHtml;

/** Aktionen in der Rangfolge des Ausdrucks – nur solche mit Ziel (aktionsziele.js). */
function aktionsListe({ ausdruck, aktionen, texte }) {
  const liste = [];
  if (aktionen?.reservieren) liste.push({ id: "reservieren", href: aktionen.reservieren.href, text: texte.ctaReservieren, kurz: texte.bestellung.reservieren });
  if (aktionen?.bestellen) liste.push({ id: "bestellen", href: aktionen.bestellen.href, text: texte.ctaBestellen, kurz: texte.bestellung.bestellen });
  return liste.sort((a, b) => (a.id === ausdruck.hauptaktion ? -1 : b.id === ausdruck.hauptaktion ? 1 : 0));
}

export function renderKopfAusdruck(ctx) {
  const { texte } = ctx;
  const [erste, zweite] = aktionsListe(ctx);
  const links = [
    ["#karte", texte.nav.karte],
    ["#highlights", texte.nav.highlights],
    ["#reservierung", texte.nav.reservierung],
    ["#kontakt", texte.nav.kontakt],
  ];
  const nav = links.map(([href, text]) => `<a href="${href}">${e(text)}</a>`).join("");
  const aktion = (a, klasse) => (a ? `<a class="btn ${klasse}" href="${e(a.href)}" data-aktion="${a.id}">${e(a.kurz)}</a>` : "");
  // Grundzustand im Markup ist "fest" (Fläche): Ohne Skript bleibt die Schrift
  // auf jedem Untergrund lesbar. Das Skript schaltet über der Bühne auf transparent.
  // data-ueber: "transparent" (über der Bühne durchsichtig) oder "flaeche" (immer fest) – aus dem Profil.
  return `<header class="kopf" id="topbar" data-zustand="fest" data-ueber="${e(ctx.ausdruck?.kopfzeile?.ueberHero ?? "transparent")}">
  ${ctx.hinweis ?? ""}
  <div class="kopf-innen">
    <a class="kopf-marke" href="#">${e(texte.name)}</a>
    <nav class="kopf-nav" aria-label="Hauptnavigation">${nav}</nav>
    <div class="kopf-aktionen">${aktion(zweite, "btn-ghost kopf-zweit")}${aktion(erste, "btn-primary kopf-erst")}</div>
    <a class="kopf-menue-knopf" href="#kopf-menue" aria-controls="kopf-menue" aria-expanded="false"><span class="kopf-menue-linien" aria-hidden="true"></span><span class="nur-vorleser">Menü</span></a>
  </div>
  <nav class="kopf-menue" id="kopf-menue" aria-label="Menü">
    <a class="kopf-menue-zu" href="#" aria-label="Menü schließen">×</a>
    ${nav}
    ${aktion(erste, "btn-primary")}${aktion(zweite, "btn-ghost")}
  </nav>
</header>`;
}

/**
 * Neutraler Bühnen-Platzhalter (16:9), solange weder eigenes Medium noch
 * Stockfoto da ist (offline, gesperrtes Netz): Grundton der Stimmung, ein
 * warmer Lichtschein, senkrechte Täfelung. Erkennbar kein Foto – die Bühne
 * trägt zusätzlich die Kennzeichnung "Platzhalter".
 */
export function buehnenPlatzhalter(ds) {
  const r = ds.farben.rollen;
  const leisten = Array.from({ length: 23 }, (_, i) => `<rect x="${i * 70}" y="0" width="1" height="900" fill="${r.aufTint.hex}" opacity=".05"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="l" cx="72%" cy="58%" r="55%"><stop offset="0" stop-color="${r.signal.hex}" stop-opacity=".42"/><stop offset="1" stop-color="${r.signal.hex}" stop-opacity="0"/></radialGradient></defs><rect width="1600" height="900" fill="${r.tint.hex}"/>${leisten}<rect width="1600" height="900" fill="url(#l)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function posterBild(medium, mobil, alt) {
  const quelle = mobil?.src && mobil.typ !== "video" ? `<source media="(max-width: 767px)" srcset="${e(mobil.src)}">` : "";
  return `<picture>${quelle}<img class="buehne-poster" src="${e(medium.src)}" alt="${e(alt)}" fetchpriority="high" decoding="async"></picture>`;
}

/**
 * Video über dem Poster – erst per Skript geladen (preload="none", data-src).
 * Wiedergabe "einmal": keine Schleife, bleibt auf dem letzten Bild stehen.
 * Hochformat-Poster ohne Hochformat-Video: nur auf breiten Bildschirmen.
 */
function videoFuer(medien) {
  const video = medien.heroVideo;
  const videoMobil = medien.heroVideoMobil;
  if (!video?.src) return "";
  const einmal = video.wiedergabe === "einmal";
  const nurBreit = !videoMobil?.src && Boolean(medien.heroMobil?.src);
  return `<video class="buehne-video" muted${einmal ? "" : " loop"} playsinline preload="none" aria-hidden="true" data-src="${e(video.src)}"${video.webm?.src ? ` data-src-webm="${e(video.webm.src)}"` : ""}${videoMobil?.src ? ` data-src-mobil="${e(videoMobil.src)}"` : ""}${einmal ? " data-einmal" : ""}${nurBreit ? " data-nur-breit" : ""}></video>`;
}

function fokusStil(medien, hero) {
  return [hero?.fokus ? `--fokus: ${hero.fokus}` : "", medien.heroMobil?.fokus ? `--fokus-mobil: ${medien.heroMobil.fokus}` : "", medien.heroVideo?.fokus ? `--fokus-video: ${medien.heroVideo.fokus}` : ""].filter(Boolean).join("; ");
}

export function renderBuehne(ctx) {
  const { medien, texte } = ctx;
  const hero = medien.hero?.quelle === "platzhalter:svg" ? { ...medien.hero, src: buehnenPlatzhalter(ctx.ds) } : medien.hero;
  const video = medien.heroVideo;
  const videoMobil = medien.heroVideoMobil;
  // Das Poster ist immer ein echtes <img>: sichtbar vor dem ersten Frame, bei
  // reduzierter Bewegung, bei langsamem Netz, ohne Video und ohne Skript.
  const poster = hero?.src ? posterBild(hero, medien.heroMobil, texte.buehne.alt) : "";
  const videoTag = videoFuer(medien);
  const kennzeichnung = hero && hero.herkunft !== "eigen" ? `<span class="buehne-herkunft">${e(hero.kennzeichnung ?? texte.platzhalter)}</span>` : "";
  // Bildausschnitt je Medium (eigene.json → fokus), getrennt für Quer- und Hochformat.
  const fokus = fokusStil(medien, hero);
  // Slogan über dem Medium (kino, gesellig) oder darunter auf dem Grund (handwerk); Rückzug nur, wo das Profil ihn will.
  const profil = ctx.ausdruck?.hero ?? { slogan: "ueber-medium", sloganRueckzug: true };
  return `<section class="buehne" data-hero="buehne" data-slogan="${e(profil.slogan)}"${profil.sloganRueckzug ? " data-rueckzug" : ""} aria-label="${e(texte.buehne.bereich)}"${fokus ? ` style="${e(fokus)}"` : ""}>
  <div class="buehne-medium">${poster}${videoTag}<div class="buehne-schleier"></div>${kennzeichnung}</div>
  <div class="buehne-text"><p class="buehne-slogan">${e(texte.slogan)}</p></div>
  <span class="buehne-pfeil" aria-hidden="true"></span>
</section>
<div class="buehne-ende" id="buehne-ende" aria-hidden="true"></div>`;
}

/**
 * Titelblatt (editorial): ruhige Typografie auf dem Grund, darunter das Medium
 * breit im Rahmen (kein Vollbild, kein Schleier). Auf dem Handy das
 * Hochformat-Poster im Rahmen; ein Video läuft im Rahmen wie auf der Bühne.
 */
export function renderTitelblatt(ctx) {
  const { medien, texte } = ctx;
  const hero = medien.hero?.quelle === "platzhalter:svg" ? { ...medien.hero, src: buehnenPlatzhalter(ctx.ds) } : medien.hero;
  const fokus = fokusStil(medien, hero);
  const kennzeichnung = hero && hero.herkunft !== "eigen" ? `<span class="buehne-herkunft">${e(hero.kennzeichnung ?? texte.platzhalter)}</span>` : "";
  return `<section class="titelblatt" data-hero="titelblatt" aria-label="${e(texte.buehne.bereich)}">
  <div class="rahmen titelblatt-raster">
    <div class="titelblatt-text">
      <p class="rubrik">${e(texte.kicker)}</p>
      <p class="titelblatt-slogan">${e(texte.slogan)}</p>
    </div>
    <figure class="titelblatt-bild"${fokus ? ` style="${e(fokus)}"` : ""}>${hero?.src ? posterBild(hero, medien.heroMobil, texte.buehne.alt) : ""}${videoFuer(medien)}${kennzeichnung}</figure>
  </div>
</section>
<div class="buehne-ende" id="buehne-ende" aria-hidden="true"></div>`;
}

/** Erster Bildschirm je Ausdruck: Bühne oder Titelblatt. */
export function renderErsterBildschirm(ctx) {
  return ctx.ausdruck?.hero?.typ === "titelblatt" ? renderTitelblatt(ctx) : renderBuehne(ctx);
}

export function renderEinladung(ctx) {
  const { texte, lead, aktionen } = ctx;
  const [erste, zweite] = aktionsListe(ctx);
  const knopf = (a, klasse) => (a ? `<a class="btn ${klasse}" href="${e(a.href)}">${e(a.text)}</a>` : "");
  // Rechts nur, was für dieses Haus stimmt: Adresse, Weg dorthin, Google-Note.
  const adresse = lead.adresse
    ? `<address class="einladung-adresse">${e(lead.adresse)}${aktionen?.route ? `<br><a href="${e(aktionen.route.href)}" target="_blank" rel="noopener">${e(texte.kontakt.route)}</a>` : ""}</address>`
    : "";
  return `<section class="einladung" id="willkommen" data-atmosphaere="an">
  <div class="rahmen einladung-innen">
    <div class="einladung-haus">
      <p class="rubrik">${e(texte.kicker)}</p>
      <h1 class="einladung-name">${e(texte.headline)}</h1>
      <p class="einladung-text">${e(texte.einladungText)}</p>
    </div>
    <aside class="einladung-besuch" aria-label="${e(texte.besuch.titel)}">
      <h2>${e(texte.besuch.titel)}</h2>
      ${adresse}
      ${bewertung(lead, texte)}
      <div class="einladung-aktionen">${knopf(erste, "btn-primary")}${knopf(zweite, "btn-ghost")}</div>
    </aside>
  </div>
</section>`;
}
