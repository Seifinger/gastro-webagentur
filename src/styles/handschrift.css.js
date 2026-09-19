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
/* Gold trug Text mit 2.0-3.1:1 auf hellem Grund. Auf heller Fläche der
   dunklere Ton, im Hero (Gold auf Foto unter Schleier) der hellere. */
.hs-traditionell .placeholder-badge,
.hs-traditionell .stimmen-note .sterne,
.hs-traditionell .stimme .sterne { color: var(--gold-dunkel); }
.hs-traditionell .hero-kicker,
.hs-traditionell .rating .stars { color: var(--gold-hell); }

/* --- Schriftskala und Rhythmus ------------------------------------------ */
/* Gemessen standen 19 verschiedene Schriftgrade auf der Seite, mit 13/14/15
   und 17/18/19/20 direkt nebeneinander – Stufen ohne unterscheidbare Aufgabe
   sind keine Skala, sondern Zufall. Hier gelten sieben:
   12 / 14 / 15 / 17 / 20 / 25 / 34, dazu die beiden clamp-Größen für H1 und
   H2. Jede Stufe hat eine Rolle, nachzulesen in
   docs-intern/design-tokens/traditionell.md. */
.hs-traditionell .hl-kat,
.hs-traditionell .veg,
.hs-traditionell .foto-badge,
.hs-traditionell .placeholder-badge { font-size: 12px; }
.hs-traditionell .hint,
.hs-traditionell .error,
.hs-traditionell .footer-note,
.hs-traditionell .foto-text span,
.hs-traditionell .demo-note { font-size: 14px; }
.hs-traditionell .stimme p { font-size: 17px; }
.hs-traditionell .section-head p,
.hs-traditionell .brand,
.hs-traditionell .foto-text strong,
.hs-traditionell .hl-preis { font-size: 20px; }

/* Und der Abstand: Vorher bekam jede der sechs Sektionen dieselben 84px vor
   und nach sich, jede H2 dieselben 42px. Damit sagt die Seite nirgends, wo
   sie Luft holt. Die Highlights sind die laute Sektion (dort steht die
   Empfehlung des Hauses), Stimmen und Kontakt sind die leisen. */
.hs-traditionell .section { padding: 96px 0; }
.hs-traditionell #highlights { padding: 104px 0 96px; }
.hs-traditionell #stimmen,
.hs-traditionell #kontakt { padding: 68px 0; }
.hs-traditionell #highlights .section-head h2 { font-size: clamp(32px, 5.2vw, 52px); }
.hs-traditionell #stimmen .section-head h2,
.hs-traditionell #kontakt .section-head h2 { font-size: clamp(25px, 3.4vw, 34px); }
.hs-traditionell #highlights .section-head { margin-bottom: 52px; }
.hs-traditionell #stimmen .section-head,
.hs-traditionell #kontakt .section-head { margin-bottom: 36px; }

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
  /* Die Note ist 111px hoch, die Zitate daneben rund 490px – ohne das hier
     bleiben drei Viertel der linken Spalte leer. Klebend wird aus der Leere
     Führung: Die Zahl steht neben jedem Zitat, das man gerade liest. */
  .hs-traditionell .stimmen-note-spalte { position: sticky; top: 104px; }
}

/* --- Kontakt: Adresse und Telefon sind die Handlung, die Zeiten sind ----- */
/* Nachschlagewerk. Zwei gleich breite Spalten behaupten das Gegenteil. */
@media (min-width: 860px) {
  .hs-traditionell .contact-grid { grid-template-columns: 7fr 5fr; gap: 64px; }
}
/* Die Überschrift der Kontaktsektion ist die Straße dieses Hauses, nicht
   "So finden Sie uns" – derselbe Satz, den jede Seite trägt. */
.hs-traditionell .kontakt-adresse { display: flex; flex-direction: column; gap: 6px; }
.hs-traditionell .kontakt-adresse .kontakt-ort { font-family: var(--body); font-size: 14px;
                                                 font-weight: 700; letter-spacing: .16em;
                                                 text-transform: uppercase; color: var(--ink-soft); }
.hs-traditionell .contact-list li { gap: 18px; padding: 18px 0; align-items: flex-start; }
.hs-traditionell .contact-list li:first-child { font-size: 20px; }
.hs-traditionell .contact-list .k { font-size: inherit; display: inline-flex; padding-top: .1em; }
.hs-traditionell .contact-list .k .ikon { width: 1.5em; height: 1.5em; }
.hs-traditionell .hours-row { font-variant-numeric: tabular-nums; }

/* --- Der Maßkrug (heroSignature.js: heroBierkrug) ------------------------ */
/* Die Glaskontur liegt im viewBox 0 0 64 86 bei x 14…50 und beginnt bei
   y = 16. Schaum und Tropfen sitzen deshalb bei 23 % / 23 % und am Rand –
   beim bisherigen Glas standen sie breiter als die Kontur und begannen
   darüber, der Schaum lag wie ein Deckel auf.
   Keine neue Animation: Es laufen dieselben Keyframes wie bisher
   (sig-beer-schaum, sig-beer-tropfen aus SIGNATUR_CSS). */
/* Der Krug steht unter der Tafel, nicht vor ihr: Die Tafel sitzt mittig
   (top 50 %, translateY(-50 %)) und endet bei 1440x900 auf y = 599. */
.hs-traditionell .sig-krug { position: absolute; right: 6.5%; bottom: 2.5%;
                             width: clamp(86px, 8.6vw, 118px); aspect-ratio: 64 / 86;
                             color: var(--gold-hell);
                             filter: drop-shadow(0 14px 20px rgba(0,0,0,.45)); }
.hs-traditionell .sig-krug-form { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.hs-traditionell .sig-krug .noppe { opacity: .55; }
.hs-traditionell .sig-krug .schaum { position: absolute; left: 23%; right: 23%; top: 3%; height: 14%;
                                     border-radius: 999px 999px 5px 5px; background: #fdf3d6;
                                     transform-origin: 50% 100%;
                                     animation: sig-beer-schaum 8s ease-in-out infinite; }
.hs-traditionell .sig-krug .tropfen { position: absolute; top: 16%; width: 5px; height: 5px;
                                      border-radius: 50%; background: #fdf3d6; opacity: 0;
                                      animation: sig-beer-tropfen 8s ease-in infinite; }
.hs-traditionell .sig-krug .tropfen-1 { left: 25%; }
.hs-traditionell .sig-krug .tropfen-2 { left: 68%; animation-delay: .25s; }
@media (max-width: 899px) {
  .hs-traditionell .sig-krug { right: 6%; bottom: 4%; width: 46px; }
}
@media (prefers-reduced-motion: reduce) {
  .hs-traditionell .sig-krug .schaum,
  .hs-traditionell .sig-krug .tropfen { animation: none; }
}
.bewegung-aus .hs-traditionell .sig-krug .schaum,
.bewegung-aus .hs-traditionell .sig-krug .tropfen { animation: none; }

/* --- Ambiente: ein Bildband statt dreier gleicher Kacheln --------------- */
/* Das Haus ist wichtiger als Team und Bestseller – es ist das, woran der Gast
   die Tür erkennt. Auf dem Handy bleibt es beim Stapel: Ein verschobenes
   Raster auf 390px ist nur eng. */
@media (min-width: 760px) {
  .hs-traditionell .foto-grid { grid-template-columns: 1.4fr 1fr 1fr; gap: 22px;
                                height: clamp(320px, 32vw, 440px); }
  .hs-traditionell .foto-slot { height: 100%; }
  .hs-traditionell .foto-slot img { height: 100%; aspect-ratio: auto; object-fit: cover; }
}

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
