// CSS des Editorial-Archetyps – als String-Export, genau wie SIGNATUR_CSS und
// MOTION_CSS. Kein Bundler, kein Build-Schritt: Der Generator hängt diesen
// Block hinter PAGE_STYLES in das <style>-Element der Seite.
//
// Wichtig: Dieser Block wird NUR eingesetzt, wenn ein Preset ihn anfordert
// (layout.gridStyle "asymmetric" bzw. typography.scale != "standard"). Die drei
// bestehenden Archetypen bekommen ihn nicht zu sehen und bleiben damit Byte
// für Byte das, was sie vorher waren.

/**
 * Schriftgrößen-Stufen, gewählt über preset.typography.scale.
 *
 * "standard" gibt bewusst einen leeren String aus – die bisherige Skala steht
 * schon in PAGE_STYLES, ein zweiter Block mit denselben Werten wäre nur Ballast.
 *
 * "gross" ist die Magazin-Skala: Die Überschriften wachsen mit dem Viewport
 * (clamp), das Gewicht steigt, die Laufweite zieht sich zusammen. Die Wirkung
 * kommt aus Größe, Gewicht und Laufweite – nicht aus neuen Schriften. Es
 * bleiben die sechs Stacks aus fontLibrary.js.
 */
export const TYPOGRAFIE_CSS = {
  standard: "",
  gross: `
/* --- Magazin-Skala ------------------------------------------------------ */
.hero-editorial h1 { font-size: clamp(48px, 9vw, 128px); font-weight: 800; letter-spacing: -0.035em; line-height: 0.96; }
.section-head h2 { font-size: clamp(34px, 6vw, 78px); font-weight: 800; line-height: 1.02; }
.section-head .eyebrow { font-size: 13px; letter-spacing: .26em; }
.section-head p { font-size: clamp(17px, 1.6vw, 21px); }
.hl-name { font-size: clamp(21px, 2.2vw, 30px); }
.kat > summary { font-size: clamp(21px, 2.6vw, 34px); }
`,
};

/**
 * Das Magazin-Layout selbst: Vollbild-Hero, versetztes Raster für Highlights
 * und eine Karte, die wie ein gesetztes Menü wirkt statt wie eine Liste.
 *
 * Bewusst nicht jede Sektion neu erfunden – Reservierung, Kontakt und Fußzeile
 * funktionieren unverändert und wären neu gebaut nur anders, nicht besser.
 */
export const EDITORIAL_CSS = `
/* === Editorial ========================================================== */

/* --- Hero: Vollbild, Text unten links, Kennziffern rechts ---------------- */
.hero-editorial { position: relative; color: #fff; background: var(--tint); overflow: hidden;
                  min-height: 100vh; min-height: 100svh; display: flex; align-items: flex-end; }
.hero-editorial .hero-media { position: absolute; inset: 0; }
.hero-editorial .hero-media img { width: 100%; height: 100%; object-fit: cover; }
.hero-editorial .hero-overlay { position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(var(--tint-rgb), .34) 0%, rgba(var(--tint-rgb), .18) 38%, rgba(var(--tint-rgb), .93) 100%); }

/* Das asymmetrische Raster: Der Text sitzt in den linken sieben von zwölf
   Spalten, die Kennziffern rechts außen. Unter 900px wird daraus wieder eine
   Spalte – ein verschobenes Raster auf dem Handy ist nur eng. */
.hero-editorial .hero-inner { position: relative; z-index: 2; width: 100%; max-width: 1280px;
                              margin: 0 auto; padding: 120px 20px 112px;
                              display: grid; gap: 28px; grid-template-columns: 1fr; }
@media (min-width: 900px) {
  .hero-editorial .hero-inner { grid-template-columns: repeat(12, 1fr); align-items: end;
                                padding: 160px 32px 104px; gap: 0 24px; }
  .hero-editorial .hero-text { grid-column: 1 / span 7; }
  .hero-editorial .hero-marginal { grid-column: 9 / span 4; padding-bottom: 12px; }
}
.hero-editorial .hero-kicker { text-transform: uppercase; letter-spacing: .3em; font-size: 12px;
                               font-weight: 700; color: var(--gold); margin-bottom: 22px; }
.hero-editorial h1 { margin: 0; }
/* Die Überschrift steht zeilenweise im Markup (siehe sections/hero.js) –
   jede Zeile ein eigenes Element, damit sie nacheinander auftreten können. */
.hero-editorial .zeile { display: block; }
.hero-editorial .hero-sub { margin-top: 26px; font-size: clamp(17px, 1.7vw, 21px);
                            color: rgba(255,255,255,.9); max-width: 44ch; }
.hero-editorial .hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 34px; }
@media (max-width: 899px) { .hero-editorial .hero-actions { display: none; } }

/* Die Kennziffern rechts: Bewertung und Konzept als gesetzte Randspalte,
   nicht als Fließtext. */
.hero-marginal { border-top: 1px solid rgba(255,255,255,.34); padding-top: 18px;
                 display: flex; flex-direction: column; gap: 14px; }
.hero-marginal .marginal-zeile { display: flex; justify-content: space-between; gap: 18px;
                                 font-size: 14px; color: rgba(255,255,255,.82); }
.hero-marginal .marginal-zeile strong { color: #fff; font-family: var(--display); font-size: 17px; font-weight: 700; }
.hero-marginal .sterne { color: var(--gold); letter-spacing: 2px; }

/* --- Highlights im versetzten Raster ------------------------------------ */
/* Zwölf Spalten, die Karten greifen unterschiedlich weit hinein und sitzen
   auf verschiedenen Höhen. Dadurch entsteht die Magazin-Anmutung, ohne dass
   eine Karte etwas anderes enthielte als vorher. */
.hl-grid--magazin { display: grid; gap: 28px; grid-template-columns: 1fr; }
@media (min-width: 760px) {
  .hl-grid--magazin { grid-template-columns: repeat(12, 1fr); gap: 40px 28px; }
  .hl-grid--magazin > .hl-card { grid-column: span 6; }
  /* Jede dritte Karte läuft breit und bricht die Reihe auf. */
  .hl-grid--magazin > .hl-card:nth-child(3n + 1) { grid-column: span 7; }
  .hl-grid--magazin > .hl-card:nth-child(3n + 2) { grid-column: span 5; }
  .hl-grid--magazin > .hl-card:nth-child(3n + 2) { margin-top: 56px; }
  .hl-grid--magazin > .hl-card:nth-child(3n) { grid-column: 3 / span 8; }
}
/* Die Karte selbst verliert Rahmen und Kasten-Charakter: Im Magazin steht das
   Bild, darunter der Text – keine Kachel. */
.hl-grid--magazin > .hl-card { background: transparent; border: 0; border-radius: 0; }
.hl-grid--magazin > .hl-card:hover { transform: none; }
.hl-grid--magazin .hl-media { aspect-ratio: 3 / 4; border-radius: 0; }
.hl-grid--magazin > .hl-card:nth-child(3n) .hl-media { aspect-ratio: 16 / 9; }
.hl-grid--magazin .hl-body { padding: 20px 0 0; }
.hl-grid--magazin .hl-kat { background: none; color: var(--accent-bold); left: 0; top: auto; bottom: -34px;
                            padding: 0; border-radius: 0; letter-spacing: .22em; }
.hl-grid--magazin .hl-preis { font-size: 22px; color: var(--accent-bold); }

/* --- Karte: gesetztes Menü statt Liste ---------------------------------- */
.gitter-asymmetrisch .karte-section { background: var(--bg); }
.gitter-asymmetrisch .kat { border: 0; border-top: 2px solid var(--ink); border-radius: 0;
                            background: transparent; margin-bottom: 0; }
.gitter-asymmetrisch .kat > summary { padding: 26px 0; }
.gitter-asymmetrisch .kat-body { padding: 0 0 22px; }
@media (min-width: 860px) {
  /* Zwei Spalten innerhalb einer Kategorie – so liest sich eine lange Karte
     wie eine Menütafel und nicht wie ein Formular. */
  .gitter-asymmetrisch .kat-body { columns: 2; column-gap: 54px; }
  .gitter-asymmetrisch .gericht { break-inside: avoid; }
}
.gitter-asymmetrisch .gericht { border-top: 0; border-bottom: 1px solid var(--line); }

/* --- Sektionsköpfe: links, nicht mittig --------------------------------- */
.gitter-asymmetrisch .section-head.mitte { margin-left: 0; text-align: left; max-width: 18ch; }
@media (min-width: 900px) { .gitter-asymmetrisch .section-head { max-width: 22ch; } }
.gitter-asymmetrisch .section-head p { max-width: 52ch; }
.gitter-asymmetrisch .section { padding: 112px 0; }
.gitter-asymmetrisch .wrap { max-width: 1280px; }
.gitter-asymmetrisch .eyebrow { color: var(--accent-bold); }
`;
