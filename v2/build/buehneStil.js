// Stil und Bewegung des ersten Bildschirms für Seiten mit Ausdruck (AP3).
// Wird nur auf Seiten mit Ausdruck ausgeliefert (siteBuilder.js) – alle
// übrigen Seiten bleiben Byte für Byte gleich.
//
// Motion-Regeln wie überall in v2: Nichts springt (nur transform/opacity bzw.
// die Deckkraft einer Fläche), nichts versteckt Inhalt (Grundzustand ohne
// Skript ist vollständig und lesbar), abschaltbar (prefers-reduced-motion:
// kein Video, kein Rückzug, keine Übergänge). Alle Werte kommen aus den
// Variablen des Designsystems und des Ausdrucks (tokens.js, ausdruck.js).

export const BUEHNE_CSS = `
.nur-vorleser { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
section[id] { scroll-margin-top: var(--kopf-ist, var(--kopf-hoehe)); }

/* Kopfzeile: fest über allem; Fläche als Pseudo-Element, damit der Wechsel nur Deckkraft ist. */
.kopf { position: fixed; top: 0; left: 0; right: 0; z-index: 40; color: var(--text); }
.kopf::before { content: ""; position: absolute; inset: 0; background: var(--grund); border-bottom: 1px solid var(--linie); }
.kopf[data-zustand="ueber-buehne"] { color: var(--auf-tint); }
.kopf[data-zustand="ueber-buehne"]::before { opacity: 0; }
.kopf .entwurf-hinweis { position: relative; }
.kopf-innen { position: relative; display: flex; align-items: center; gap: var(--s-2); min-height: var(--kopf-hoehe-mobil); padding-inline: var(--rand); }
.kopf-marke { margin-right: auto; font-family: var(--f-display); font-weight: var(--f-display-gewicht); text-transform: var(--f-display-transform);
  letter-spacing: var(--f-display-sperrung); font-size: var(--t-basis); line-height: 1.15; text-decoration: none; color: inherit; }
.kopf-nav { display: none; gap: var(--s-3); }
.kopf-nav a { color: inherit; text-decoration: none; font-size: var(--t-basis); }
.kopf-nav a:hover { text-decoration: underline; }
.kopf-aktionen { display: flex; gap: var(--s-1); }
.kopf-aktionen .btn { min-height: var(--s-5); padding: var(--s-halb) var(--s-2); font-size: var(--t-klein); }
.kopf-zweit { display: none; }
.kopf[data-zustand="ueber-buehne"] .kopf-aktionen .btn-ghost { color: var(--auf-tint); border-color: var(--auf-tint-leise); }
.kopf[data-zustand="ueber-buehne"] .kopf-innen :focus-visible { outline-color: var(--auf-tint); }
.kopf-menue-knopf { display: inline-flex; align-items: center; justify-content: center; width: var(--s-6); height: var(--s-6); color: inherit; }
.kopf-menue-linien, .kopf-menue-linien::before, .kopf-menue-linien::after { display: block; width: var(--s-3); height: 2px; background: currentColor; }
.kopf-menue-linien { position: relative; }
.kopf-menue-linien::before, .kopf-menue-linien::after { content: ""; position: absolute; left: 0; }
.kopf-menue-linien::before { top: -8px; }
.kopf-menue-linien::after { top: 8px; }
@media (min-width: 768px) {
  .kopf-innen { min-height: var(--kopf-hoehe); gap: var(--s-3); }
  .kopf-marke { font-size: var(--t-h3); line-height: 1.1; }
  .kopf-zweit { display: inline-flex; }
}
@media (min-width: 1024px) {
  .kopf-nav { display: flex; }
  .kopf-menue-knopf, .kopf-menue { display: none; }
}

/* Mobiles Menü: volle Fläche. Ohne Skript öffnet es über :target. */
.kopf-menue { position: fixed; inset: 0; z-index: 80; display: flex; flex-direction: column; align-items: flex-start; gap: var(--s-3);
  padding: var(--s-10) var(--rand) var(--s-4); background: var(--grund); color: var(--text); overflow-y: auto;
  opacity: 0; visibility: hidden; }
.kopf-menue:target, .kopf-menue.offen { opacity: 1; visibility: visible; }
.kopf-menue a:not(.btn) { color: inherit; text-decoration: none; font-family: var(--f-display); font-weight: var(--f-display-gewicht); font-size: var(--t-h2); }
.kopf-menue .btn { width: 100%; }
.kopf-menue-zu { position: absolute; top: var(--s-1); right: var(--rand); display: inline-flex; align-items: center; justify-content: center;
  width: var(--s-6); height: var(--s-6); }
.menue-offen { overflow: hidden; }

/* Bühne: Medium, einfarbiger Schleier mit Kontrastnachweis (ausdruck.js), Slogan. */
.buehne { position: relative; height: var(--hero-hoehe-mobil); overflow: hidden; background: var(--tint); color: var(--auf-tint); isolation: isolate; }
.buehne-medium { position: absolute; inset: 0; z-index: -1; }
.buehne-medium picture { position: absolute; inset: 0; }
.buehne-poster, .buehne-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.buehne-poster, .buehne-video { object-position: var(--fokus, 50% 50%); }
@media (max-width: 767px) { .buehne-poster, .buehne-video { object-position: var(--fokus-mobil, var(--fokus, 50% 50%)); } }
.buehne-video { opacity: 0; object-position: var(--fokus-video, var(--fokus, 50% 50%)); }
.buehne-video.laeuft { opacity: 1; }
.buehne-schleier { position: absolute; inset: 0; background: var(--schleier); }
.buehne-text { position: absolute; left: 0; right: 0; top: 28%; bottom: 38%; display: flex; align-items: center; justify-content: center;
  padding-inline: var(--rand); text-align: center; }
.buehne-slogan { max-width: 16ch; font-family: var(--f-display); font-weight: var(--f-display-gewicht); text-transform: var(--f-display-transform);
  letter-spacing: var(--f-display-sperrung); font-size: var(--t-display); line-height: 1.05; text-wrap: balance; }
/* Scroll-Hinweis am linken Rand (Achse der Wortmarke), damit er nie über dem Motiv liegt. */
.buehne-pfeil { position: absolute; left: var(--rand); bottom: var(--s-3); width: 1px; height: var(--s-8); background: var(--auf-tint-leise); }
.buehne-herkunft { position: absolute; right: var(--s-2); bottom: var(--s-2); padding: var(--s-halb) var(--s-1); background: var(--tint);
  color: var(--auf-tint-leise); font-size: var(--t-klein); }
.buehne-ende { height: 0; }
/* kino: Raum und Licht zuerst – der Slogan tritt eine Stufe leiser auf. */
.ausdruck-kino .buehne-slogan { font-size: var(--t-h1); max-width: 20ch; }

/* Kopfzeile "flaeche" (handwerk, editorial): sitzt im Fluss, liegt nie über dem Bild. */
.kopf[data-ueber="flaeche"] { position: sticky; }

/* Slogan unter dem Medium (handwerk): kurze Bühne, darunter der Satz auf dem Grund. */
.buehne[data-slogan="unter-medium"] { height: auto; overflow: visible; background: var(--grund); color: var(--text); }
.buehne[data-slogan="unter-medium"] .buehne-medium { position: relative; z-index: 0; height: var(--hero-hoehe-mobil); overflow: hidden; }
.buehne[data-slogan="unter-medium"] .buehne-schleier, .buehne[data-slogan="unter-medium"] .buehne-pfeil { display: none; }
.buehne[data-slogan="unter-medium"] .buehne-text { position: static; justify-content: flex-start; max-width: var(--max-breite); margin-inline: auto;
  padding: var(--s-5) var(--rand) 0; text-align: left; }
.buehne[data-slogan="unter-medium"] .buehne-slogan { max-width: 22ch; }
@media (min-width: 768px) { .buehne[data-slogan="unter-medium"] .buehne-medium { height: var(--hero-hoehe); } }

/* Titelblatt (editorial): Satz auf dem Grund, Bild im Rahmen. */
.titelblatt { padding-block: var(--sektion) 0; }
.titelblatt-raster { display: grid; gap: var(--s-5); }
.titelblatt-slogan { font-family: var(--f-display); font-weight: var(--f-display-gewicht); text-transform: var(--f-display-transform);
  letter-spacing: var(--f-display-sperrung); font-size: var(--t-display); line-height: 1.05; max-width: 14ch; text-wrap: balance; }
.titelblatt-bild { position: relative; aspect-ratio: 4 / 5; max-height: 72svh; overflow: hidden; border-radius: var(--r-bild); background: var(--flaeche-tief); }
.titelblatt-bild picture { position: absolute; inset: 0; }
.titelblatt-bild .buehne-poster, .titelblatt-bild .buehne-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
@media (min-width: 768px) {
  .titelblatt-bild { aspect-ratio: 16 / 9; max-height: 68svh; }
  .titelblatt-text { display: grid; grid-template-columns: 5fr 7fr; column-gap: var(--rinne); align-items: end; }
  .titelblatt-text .rubrik { grid-column: 1; grid-row: 1; align-self: end; margin-bottom: var(--s-1); }
  .titelblatt-slogan { grid-column: 2; grid-row: 1; }
}
@media (min-width: 768px) { .buehne { height: var(--hero-hoehe); } }

/* Einladung: Name und Haus links, Besuch rechts (Details in abfolge.js). */
.einladung { padding-block: var(--sektion-betont) var(--sektion); }
.einladung-innen { display: grid; gap: var(--s-4); }
.einladung-haus { display: grid; gap: var(--s-2); }
.einladung-name { font-size: var(--t-h1); }
.einladung-text { max-width: 44ch; color: var(--text-leise); font-size: var(--t-gross); }
.einladung .bewertung { margin-top: 0; }
.einladung-aktionen { display: flex; flex-wrap: wrap; gap: var(--s-2); margin-top: var(--s-1); }

/* Aktionsleiste unten erst nach der Bühne – die Knöpfe stehen oben schon. */
.buehne-sichtbar .mobilebar { opacity: 0; transform: translateY(100%); pointer-events: none; }

@media (prefers-reduced-motion: no-preference) {
  .kopf::before { transition: opacity var(--m-mittel) var(--m-kurve); }
  .kopf, .kopf .btn { transition: color var(--m-mittel) var(--m-kurve), border-color var(--m-mittel) var(--m-kurve); }
  .kopf-menue { transition: opacity var(--m-mittel) var(--m-kurve), visibility 0s linear var(--m-mittel); }
  .kopf-menue.offen, .kopf-menue:target { transition: opacity var(--m-mittel) var(--m-kurve), visibility 0s; }
  .buehne-video { transition: opacity var(--m-lang) var(--m-kurve); }
  .mobilebar { transition: opacity var(--m-mittel) var(--m-kurve), transform var(--m-mittel) var(--m-kurve); }
  @supports (animation-timeline: scroll()) {
    .buehne[data-rueckzug] .buehne-text { animation: buehne-rueckzug linear both; animation-timeline: scroll(root block); animation-range: 0 calc(var(--hero-hoehe-mobil) * .3); }
  }
}
@media (prefers-reduced-motion: no-preference) and (min-width: 768px) {
  @supports (animation-timeline: scroll()) {
    .buehne[data-rueckzug] .buehne-text { animation-range: 0 calc(var(--hero-hoehe) * .3); }
  }
}
/* Der Slogan bleibt hinter der Seite zurück (bewegt sich halb so schnell) und ist
   verblasst, bevor er die Kopfzeile erreicht. */
@keyframes buehne-rueckzug { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(calc(var(--hero-hoehe-mobil) * .15)); } }
@media (min-width: 768px) {
  @keyframes buehne-rueckzug { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(calc(var(--hero-hoehe) * .15)); } }
}
`;

export const BUEHNE_SKRIPT = `
(function () {
  var kopf = document.getElementById("topbar");
  var ende = document.getElementById("buehne-ende");
  var buehne = document.querySelector(".buehne");
  var body = document.body;
  var reduziert = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1. Kopfzeile: transparent, solange die Bühne unter ihr liegt.
  if (kopf && ende && "IntersectionObserver" in window) {
    var transparent = kopf.getAttribute("data-ueber") !== "flaeche";
    var setze = function (ueber) {
      kopf.setAttribute("data-zustand", ueber && transparent ? "ueber-buehne" : "fest");
      body.classList.toggle("buehne-sichtbar", ueber);
    };
    var hoehe = kopf.offsetHeight;
    // Tatsächliche Kopfzeilenhöhe (mit Beispiel-Leiste) für mitlaufende Leisten und Sprungziele.
    var merkeHoehe = function () { document.documentElement.style.setProperty("--kopf-ist", kopf.offsetHeight + "px"); };
    merkeHoehe();
    window.addEventListener("resize", merkeHoehe);
    setze(ende.getBoundingClientRect().top > hoehe);
    new IntersectionObserver(function (eintraege) {
      setze(eintraege[0].boundingClientRect.top > hoehe);
    }, { rootMargin: "-" + hoehe + "px 0px 0px 0px" }).observe(ende);
  }

  // 2. Mobiles Menü: Knopf, Esc, Fokus bleibt im Menü.
  var knopf = document.querySelector(".kopf-menue-knopf");
  var menue = document.getElementById("kopf-menue");
  if (knopf && menue) {
    var oeffne = function () {
      menue.classList.add("offen");
      knopf.setAttribute("aria-expanded", "true");
      body.classList.add("menue-offen");
      var erster = menue.querySelector("a:not(.kopf-menue-zu)");
      if (erster) window.requestAnimationFrame(function () { erster.focus(); });
    };
    var schliesse = function (fokus) {
      menue.classList.remove("offen");
      knopf.setAttribute("aria-expanded", "false");
      body.classList.remove("menue-offen");
      if (fokus) knopf.focus();
    };
    knopf.addEventListener("click", function (ereignis) {
      ereignis.preventDefault();
      if (menue.classList.contains("offen")) schliesse(true); else oeffne();
    });
    menue.addEventListener("click", function (ereignis) {
      var link = ereignis.target.closest("a");
      if (!link) return;
      if (link.classList.contains("kopf-menue-zu")) { ereignis.preventDefault(); schliesse(true); }
      else schliesse(false);
    });
    document.addEventListener("keydown", function (ereignis) {
      if (!menue.classList.contains("offen")) return;
      if (ereignis.key === "Escape") { schliesse(true); return; }
      if (ereignis.key !== "Tab") return;
      var ziele = menue.querySelectorAll("a");
      var erstes = ziele[0], letztes = ziele[ziele.length - 1];
      if (ereignis.shiftKey && document.activeElement === erstes) { ereignis.preventDefault(); letztes.focus(); }
      else if (!ereignis.shiftKey && document.activeElement === letztes) { ereignis.preventDefault(); erstes.focus(); }
    });
  }

  // 3. Slogan-Rückzug ohne CSS-Scroll-Timeline: eine Variable je Frame.
  var text = document.querySelector(".buehne-text");
  var zeitleiste = window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()");
  if (text && buehne && buehne.hasAttribute("data-rueckzug") && !reduziert && !zeitleiste) {
    var geplant = false;
    var rechne = function () {
      geplant = false;
      var weg = buehne.offsetHeight * 0.3;
      var anteil = Math.min(1, Math.max(0, window.scrollY / weg));
      text.style.opacity = String(1 - anteil);
      text.style.transform = "translateY(" + Math.round(weg * 0.5 * anteil) + "px)";
    };
    window.addEventListener("scroll", function () {
      if (!geplant) { geplant = true; window.requestAnimationFrame(rechne); }
    }, { passive: true });
    rechne();
  }

  // 4. Video: erst nach dem Laden, nie bei reduzierter Bewegung, Save-Data
  //    oder langsamem Netz. Das Poster bleibt stehen, bis der erste Frame läuft.
  var video = document.querySelector(".buehne-video");
  var netz = navigator.connection || {};
  var langsam = Boolean(netz.saveData) || /(^|-)2g$|^3g$/.test(netz.effectiveType || "");
  if (video && !reduziert && !langsam) {
    var starte = function () {
      var schmal = window.matchMedia("(max-width: 767px)").matches;
      // Hochformat-Poster ohne Hochformat-Video: auf dem Handy bleibt das Poster.
      if (schmal && video.hasAttribute("data-nur-breit")) return;
      var mobil = schmal && video.getAttribute("data-src-mobil");
      var h264 = video.canPlayType('video/mp4; codecs="avc1.4d401f"');
      var webm = video.getAttribute("data-src-webm");
      var quelle = mobil ? video.getAttribute("data-src-mobil") : !h264 && webm && video.canPlayType('video/webm; codecs="vp9"') ? webm : video.getAttribute("data-src");
      video.addEventListener("playing", function () { video.classList.add("laeuft"); });
      video.addEventListener("error", function () { video.classList.remove("laeuft"); });
      video.src = quelle;
      // "einmal": nach dem Ende bleibt das letzte Bild stehen, kein Neustart beim Zurückscrollen.
      var einmal = video.hasAttribute("data-einmal");
      var spielen = function () { if (einmal && video.ended) return; var p = video.play(); if (p && p.catch) p.catch(function () {}); };
      spielen();
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (eintraege) {
          if (eintraege[0].isIntersecting) spielen(); else video.pause();
        }).observe(video);
      }
    };
    if (document.readyState === "complete") starte(); else window.addEventListener("load", starte);
  }
})();
`;
