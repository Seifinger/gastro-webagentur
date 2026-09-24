// Atmosphäre-Ebene (Gestaltungs-Umbau, AP5): ein zurückhaltendes, gezeichnetes
// Motiv hinter dem Inhalt, das Abschnitte verbindet.
//
// - Liegt fest hinter allem (z-index -1): Abschnitte ohne eigene Fläche lassen
//   es durchscheinen, Abschnitte mit Fläche (Karte, Reservierung) verdecken es.
//   So erscheint und geht es mit der Seite, ohne je über Text zu liegen.
// - Sichtbar nur, solange ein Abschnitt mit data-atmosphaere="an" im Blick ist.
// - Nur Deckkraft wird animiert; bei reduzierter Bewegung und ohne Skript: aus.
// - Stärke je Ausdruck (ausdruck.js, bewegung.atmosphaere); "keine" = nichts.
//
// Motive: das Haus zuerst (Pilot "Zur Alten Linde": Lindenblatt), sonst die
// vorhandene Küchenmarke aus src/signaturIcons.js.

import { kuechenMarke } from "./v1Funktionen.js";

export const DECKKRAFT = { deutlich: 0.12, sparsam: 0.08, linie: 0.06, keine: 0 };

const LINDENBLATT = `<svg viewBox="0 0 240 260" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
<path d="M110 206 C 70 222, 24 190, 26 138 C 28 88, 74 44, 110 14 C 146 44, 192 88, 194 138 C 196 190, 150 222, 110 206 Z"/>
<path d="M110 206 L110 24"/>
<path d="M110 168 C 90 160, 66 150, 44 128 M110 168 C 130 160, 154 150, 176 128"/>
<path d="M110 128 C 94 118, 78 104, 64 84 M110 128 C 126 118, 142 104, 156 84"/>
<path d="M110 88 C 100 78, 92 66, 86 52 M110 88 C 120 78, 128 66, 134 52"/>
<path d="M110 206 C 112 222, 118 238, 128 252"/>
</svg>`;

/** Motiv als SVG-Markup; das Haus hat Vorrang vor der Küche. */
export function motivFuer({ cuisine, lead }) {
  if (/linde/i.test(lead?.name ?? "")) return LINDENBLATT;
  return kuechenMarke(cuisine, "atmosphaere-marke");
}

export function renderAtmosphaere({ ausdruck, cuisine, lead }) {
  const staerke = DECKKRAFT[ausdruck?.bewegung?.atmosphaere] ?? 0;
  if (!staerke) return "";
  return `<div class="atmosphaere" aria-hidden="true" style="--atmo-deckkraft: ${staerke}">${motivFuer({ cuisine, lead })}</div>`;
}

export const ATMOSPHAERE_CSS = `
.atmosphaere { position: fixed; right: -6vmin; bottom: 6vh; z-index: -1; width: 46vmin; max-width: 520px; color: var(--akzent);
  opacity: 0; pointer-events: none; transform: rotate(-14deg); }
.atmosphaere svg { display: block; width: 100%; height: auto; }
.atmo-an .atmosphaere { opacity: var(--atmo-deckkraft); }
@media (prefers-reduced-motion: no-preference) {
  .atmosphaere { transition: opacity var(--m-lang) var(--m-kurve); }
}
@media (prefers-reduced-motion: reduce) {
  .atmosphaere { display: none; }
}
`;

export const ATMOSPHAERE_SKRIPT = `
(function () {
  var ebene = document.querySelector(".atmosphaere");
  if (!ebene || !("IntersectionObserver" in window)) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var sichtbar = new Set();
  var beobachter = new IntersectionObserver(function (eintraege) {
    eintraege.forEach(function (e) { if (e.isIntersecting) sichtbar.add(e.target); else sichtbar.delete(e.target); });
    document.body.classList.toggle("atmo-an", sichtbar.size > 0);
  }, { rootMargin: "-30% 0px -30% 0px" });
  Array.prototype.forEach.call(document.querySelectorAll('[data-atmosphaere="an"]'), function (el) { beobachter.observe(el); });
})();
`;
