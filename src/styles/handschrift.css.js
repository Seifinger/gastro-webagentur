// Die Handschrift eines Archetyps – als String-Export, genau wie SIGNATUR_CSS,
// MOTION_CSS und EDITORIAL_CSS. Kein Bundler, kein Build-Schritt.
//
// Was hier drinsteht, ist die Antwort auf docs-intern/design-audit.md:
//
// - Schritt 3: EIN starker Moment je Archetyp, alles andere bewusst ruhig.
//   Vorher setzte motion.js neun Gruppen gleichzeitig in Bewegung, mit
//   überall derselben Kurve – nichts war dadurch wichtiger als etwas anderes.
// - Schritt 4: je eine begründete Asymmetrie in Highlights, Karte, Stimmen
//   und Kontakt statt viermal Mittelachse und dreimal Dreierraster.
// - Schritt 5: die gezeichneten Zeichen aus signaturIcons.js statt Emoji.
//
// Zwei Regeln, ohne die der Block nicht funktionieren darf:
//
// 1. **Jeder** Selektor beginnt mit `.hs-<archetyp>`. Der Block hängt zwar nur
//    in Seiten dieses Archetyps, aber die Bindung an die Körperklasse ist der
//    Beweis, dass er die übrigen drei nicht berühren kann – auch nicht, wenn
//    jemand ihn später versehentlich woanders einhängt.
// 2. Bewegt werden weiterhin nur `transform` und `opacity` (Regel aus
//    motion.js), und wer `prefers-reduced-motion` gesetzt hat, bekommt nichts.
//    Der Block nimmt Bewegung fast nur zurück; was er hinzufügt, steht unter
//    derselben Media Query wie alles andere.

import { ikonenCss } from "../signaturIcons.js";

/* ========================================================================= *
 * traditionell
 * ------------------------------------------------------------------------- *
 * Der eine starke Moment: die Hero-Signatur der Küche (heroSignature.js) –
 * der Bierkrug, der überläuft, die Tafel mit der Tagesempfehlung, der
 * Olivenzweig. Sie gehört dem Haus und keiner Vorlage.
 *
 * Damit man sie sieht, steht der Rest still: Die Hero-Fahrt (26 s Zoom) ist
 * abgeschaltet, die Parallaxe auch, die Karten heben sich beim Überfahren
 * nicht mehr an, und der Auftritt beim Scrollen ist nur noch ein Aufblenden
 * ohne Versatz und ohne Staffelung. Bewegung gibt es danach nur noch als
 * Antwort auf eine Handlung des Gastes (Akkordeon, Knopf) – nicht als
 * Stimmung.
 *
 * Die Kurve: cubic-bezier(.2,.72,.3,1). Schneller Anfang, langes Auslaufen –
 * wie ein Teller, der aufgesetzt wird. Sie gilt nur hier; die anderen
 * Archetypen bekommen ihre eigene (siehe docs-intern/design-tokens/).
 * ========================================================================= */
const TRADITIONELL = `
/* --- Ruhe: nur die Signatur bewegt sich -------------------------------- */
.hs-traditionell .hero-media img { animation: none; }
.hs-traditionell .hero-media, .hs-traditionell .hero-inner { animation: none; }
.hs-traditionell .foto-slot img { animation: none; }
.hs-traditionell .hl-card, .hs-traditionell .hl-media img { transition: none; }
.hs-traditionell .hl-card:hover { transform: none; }
.hs-traditionell .hl-card:hover .hl-media img { transform: none; }
.hs-traditionell .section-head .eyebrow::after,
.hs-traditionell .step:not(:last-child)::after { transform: scaleX(1); transition: none; }
.bewegt .hs-traditionell .section-head.auftritt .eyebrow::after { transform: scaleX(1); }
.bewegt .hs-traditionell .auftritt,
.bewegt .hs-traditionell .auftritt-karte,
.bewegt .hs-traditionell .usp-list span {
  transform: none;
  transition: opacity .52s cubic-bezier(.2,.72,.3,1);
  transition-delay: 0s;
}

/* --- Farbe: Text trägt accentBold, Flächen behalten accent -------------- */
/* Begründung und Messwerte: docs-intern/design-tokens/traditionell.md. */
.hs-traditionell .eyebrow,
.hs-traditionell .veg,
.hs-traditionell .error,
.hs-traditionell .contact-list a,
.hs-traditionell .contact-list .k,
.hs-traditionell .reserve-pluspunkte .k,
.hs-traditionell .stimmen-note .note,
.hs-traditionell .kat > summary::after,
.hs-traditionell .add-btn,
.hs-traditionell .mini-add { color: var(--accent-bold); }
.hs-traditionell .add-btn, .hs-traditionell .mini-add { border-color: var(--accent-bold); }
.hs-traditionell .kat > summary:hover { color: var(--accent-bold); }

/* --- Keine Mittelachse: kein Inhalt hier ist symmetrisch gewichtet ------ */
.hs-traditionell .section-head.mitte { margin-left: 0; margin-right: 0; text-align: left; }
.hs-traditionell .stimmen-erklaerung { margin-left: 0; margin-right: 0; text-align: left; }

/* --- Highlights: die Treppe --------------------------------------------- */
/* Eine große Karte (Hausempfehlung), danach mittlere, danach kleine. Ohne
   Kasten: Bild und Schrift tragen, nicht der Rahmen. */
.hs-traditionell .hl-card { background: transparent; border: 0; border-radius: 0; overflow: visible; }
.hs-traditionell .hl-media { border-radius: var(--radius); }
.hs-traditionell .hl-body { padding: 17px 0 0; gap: 6px; }
.hs-traditionell .hl-kat { position: static; background: none; border-radius: 0; padding: 0;
                           color: var(--accent-bold); letter-spacing: .16em; align-self: start; }
.hs-traditionell .hl-siegel { display: inline-flex; align-items: center; gap: 8px;
                              font-size: 12px; font-weight: 700; letter-spacing: .14em;
                              text-transform: uppercase; color: var(--accent-bold); }
.hs-traditionell .hl-foot { margin-top: 14px; }
@media (min-width: 680px) {
  .hs-traditionell .hl-treppe { grid-template-columns: repeat(6, 1fr); gap: 48px 30px; }
  .hs-traditionell .hl-treppe > .hl-card:first-child {
    grid-column: 1 / -1; display: grid; grid-template-columns: 7fr 5fr;
    gap: 36px; align-items: center;
  }
  .hs-traditionell .hl-treppe > .hl-card:first-child .hl-media { aspect-ratio: 4 / 3; }
  .hs-traditionell .hl-treppe > .hl-card:first-child .hl-body { padding: 0; gap: 10px; }
  .hs-traditionell .hl-treppe > .hl-card:first-child .hl-name { font-size: clamp(25px, 2.7vw, 34px); }
  .hs-traditionell .hl-treppe > .hl-card:first-child .hl-desc { font-size: 17px; }
  .hs-traditionell .hl-treppe > .hl-card:first-child .hl-preis { font-size: 25px; }
  /* Drei Karten: eine große, zwei halbe. */
  .hs-traditionell .hl-treppe--3 > .hl-card:nth-child(n+2) { grid-column: span 3; }
  /* Vier Karten: eine große, drei Drittel. */
  .hs-traditionell .hl-treppe--4 > .hl-card:nth-child(n+2) { grid-column: span 2; }
  /* Sechs Karten: eine große, zwei halbe, drei Drittel. */
  .hs-traditionell .hl-treppe--6 > .hl-card:nth-child(n+2):nth-child(-n+3) { grid-column: span 3; }
  .hs-traditionell .hl-treppe--6 > .hl-card:nth-child(n+4) { grid-column: span 2; }
  .hs-traditionell .hl-treppe > .hl-card:not(:first-child) .hl-media { aspect-ratio: 3 / 2; }
}

/* --- Karte: Menütafel statt Kästen -------------------------------------- */
/* Kategoriename links in einer schmalen Spalte, er bleibt stehen, solange man
   seine Gerichte liest. */
.hs-traditionell .karte-section { background: var(--bg); }
.hs-traditionell .kat { background: transparent; border: 0; border-top: 1px solid var(--line);
                        border-radius: 0; margin-bottom: 0; overflow: visible; }
.hs-traditionell .kat:last-of-type { border-bottom: 1px solid var(--line); }
.hs-traditionell .kat > summary { padding: 24px 0; }
.hs-traditionell .kat-body { padding: 0 0 16px; }
.hs-traditionell .gericht-preis { font-variant-numeric: tabular-nums; }
@media (min-width: 900px) {
  .hs-traditionell .kat { display: grid; grid-template-columns: 4fr 8fr; column-gap: 54px; align-items: start; }
  .hs-traditionell .kat > summary { grid-column: 1; position: sticky; top: 94px; }
  .hs-traditionell .kat-body { grid-column: 2; padding-top: 24px; }
  .hs-traditionell .kat > summary::after { margin-left: 18px; }
  .hs-traditionell .kat-anzahl { margin-left: auto; }
}

/* --- Stimmen: das Blatt ------------------------------------------------- */
/* Die Note groß links, die Zitate rechts als Zeilen. Drei leere Kästen
   nebeneinander waren der schwächste Teil der bisherigen Seite. */
.hs-traditionell .stimmen-blatt { display: grid; gap: 30px; }
.hs-traditionell .stimmen-note { justify-content: flex-start; align-items: baseline;
                                 flex-wrap: wrap; gap: 6px 12px; margin-bottom: 0; }
.hs-traditionell .stimmen-note .note { font-size: clamp(54px, 7vw, 86px); line-height: .9; }
.hs-traditionell .stimmen-grid { grid-template-columns: 1fr; gap: 0; }
.hs-traditionell .stimme { background: transparent; border: 0; border-top: 1px solid var(--line);
                           border-radius: 0; padding: 22px 0; gap: 10px; }
.hs-traditionell .stimme.ist-platzhalter { border-style: solid; min-height: 0; justify-content: flex-start; }
.hs-traditionell .stimme .slot-titel { font-size: 17px; }
.hs-traditionell .stimmen-erklaerung { margin-top: 22px; }
@media (min-width: 880px) {
  .hs-traditionell .stimmen-blatt { grid-template-columns: 4fr 8fr; column-gap: 60px; align-items: start; }
}

/* --- Kontakt: Adresse und Telefon sind die Handlung, die Zeiten sind ----- */
/* Nachschlagewerk. Zwei gleich breite Spalten behaupten das Gegenteil. */
@media (min-width: 860px) {
  .hs-traditionell .contact-grid { grid-template-columns: 7fr 5fr; gap: 64px; }
}
.hs-traditionell .contact-list li { gap: 18px; padding: 18px 0; align-items: flex-start; }
.hs-traditionell .contact-list li:first-child { font-size: 20px; }
.hs-traditionell .contact-list .k { font-size: inherit; display: inline-flex; padding-top: .1em; }
.hs-traditionell .contact-list .k .ikon { width: 1.5em; height: 1.5em; }
.hs-traditionell .hours-row { font-variant-numeric: tabular-nums; }

/* --- Der Krug steht wieder im Bild, und sieht aus wie einer -------------- */
/* .sig-beer überschrieb das position: absolute aus .sig mit relative und
   rutschte dadurch halb aus dem Bild (x = -58 bei 1440px). Aus der gefüllten
   Silhouette wird hier eine Strichzeichnung. Beides bleibt bewusst auf diesen
   Archetyp begrenzt: SIGNATUR_CSS teilen sich alle vier. */
.hs-traditionell .sig-beer { position: absolute; right: 7%; bottom: 5%; }
.hs-traditionell .sig-beer-glas { color: rgba(255, 234, 178, .92);
                                  fill: none; stroke: currentColor; stroke-width: 1.1px;
                                  stroke-linejoin: round; stroke-linecap: round; }
.hs-traditionell .sig-beer .schaum { left: 26%; right: 26%; top: 7%; height: 14%;
                                     background: rgba(253, 243, 214, .92); }
.hs-traditionell .sig-beer .tropfen { background: rgba(253, 243, 214, .92); }

/* --- Gezeichnete Zeichen (signaturIcons.js) ----------------------------- */
.hs-traditionell .usp-list span { gap: 10px; }
.hs-traditionell .reserve-pluspunkte .k { display: inline-flex; padding-top: .2em; }
.hs-traditionell footer strong { display: inline-flex; align-items: center; gap: 10px; }
${ikonenCss("hs-traditionell")}
/* Die Küchenmarke steht an drei Stellen: Kopf der Highlights, Siegel der
   Hausempfehlung, Fußzeile. */
.hs-traditionell .kopf-marke { display: inline-flex; align-items: center; gap: 9px; }

/* --- Wer keine Bewegung will, bekommt keine ----------------------------- */
/* Auch der Auftritt beim Scrollen – zusätzlich zu motion.js, damit die Regel
   nicht davon abhängt, welcher Block zuletzt gewinnt. */
@media (prefers-reduced-motion: reduce) {
  .bewegt .hs-traditionell .auftritt,
  .bewegt .hs-traditionell .auftritt-karte,
  .bewegt .hs-traditionell .usp-list span { opacity: 1; transition: none; }
}
.bewegung-aus .hs-traditionell .auftritt,
.bewegung-aus .hs-traditionell .auftritt-karte,
.bewegung-aus .hs-traditionell .usp-list span { opacity: 1; transition: none; }
`;

const HANDSCHRIFTEN = {
  traditionell: TRADITIONELL,
};

/**
 * Das CSS der Handschrift. Ohne Handschrift (preset.layout.handschrift null,
 * also jedes Preset außer den Archetypen) kommt ein leerer String zurück –
 * die Seite ist dann Zeichen für Zeichen die bisherige.
 */
export function handschriftCss(handschrift) {
  return HANDSCHRIFTEN[handschrift] ?? "";
}

/** Die Körperklasse, an der jeder Selektor des Blocks hängt. */
export function handschriftKlasse(handschrift) {
  return HANDSCHRIFTEN[handschrift] ? `hs-${handschrift}` : "";
}
