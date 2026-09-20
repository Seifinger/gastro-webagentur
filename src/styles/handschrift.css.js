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
import { SIGNATUR_REDUZIERT_REGELN } from "../heroSignature.js";

/**
 * Die Bildunterschrift steht unter dem Bild, nicht darauf.
 *
 * Sie stand bisher IM Foto, auf einem schwarzen Verlauf von transparent nach
 * 82 %. Der beginnt oben bei null – und genau dort sitzt die Zeile: gemessen
 * über den echten Pixeln kam "Unser Haus" auf 1.99:1 über den hellsten
 * Bildstellen. Ein Schleier, der weiße Schrift auf einem Foto lesbar halten
 * soll, ist ohnehin das Muster, das jede Vorlage hat.
 *
 * Gilt für jede Handschrift; wie die Bilder darüber angeordnet sind,
 * entscheidet der Archetyp.
 *
 * @param {string} klasse - die Körperklasse des Archetyps.
 */
function bildunterschriftCss(klasse) {
  return `
/* --- Ambiente: die Bildunterschrift steht unter dem Bild ---------------- */
.${klasse} .foto-slot { border-radius: 0; background: none; overflow: visible;
                        display: flex; flex-direction: column; }
.${klasse} .foto-slot img { border-radius: var(--radius); }
.${klasse} .foto-text { position: static; padding: 14px 0 0; background: none; color: var(--ink); }
.${klasse} .foto-text strong { font-size: 20px; }
.${klasse} .foto-text span { color: var(--ink-soft); font-size: 14px; margin-top: 3px; }`;
}

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
/* Gold trug Text mit 2.0-3.1:1 auf hellem Grund. Das Abzeichen nutzt den
   dunkleren Ton inzwischen in jeder Seite (PAGE_STYLES); hier kommen die
   Sterne dazu, im Hero der hellere Ton. */
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
  .hs-traditionell .hl-anordnung { grid-template-columns: repeat(6, 1fr); gap: 48px 30px; }
  .hs-traditionell .hl-anordnung > .hl-card:first-child {
    grid-column: 1 / -1; display: grid; grid-template-columns: 7fr 5fr;
    gap: 36px; align-items: center;
  }
  .hs-traditionell .hl-anordnung > .hl-card:first-child .hl-media { aspect-ratio: 4 / 3; }
  .hs-traditionell .hl-anordnung > .hl-card:first-child .hl-body { padding: 0; gap: 10px; }
  .hs-traditionell .hl-anordnung > .hl-card:first-child .hl-name { font-size: clamp(25px, 2.7vw, 34px); }
  .hs-traditionell .hl-anordnung > .hl-card:first-child .hl-desc { font-size: 17px; }
  .hs-traditionell .hl-anordnung > .hl-card:first-child .hl-preis { font-size: 25px; }
  /* Drei Karten: eine große, zwei halbe. */
  .hs-traditionell .hl-anordnung--3 > .hl-card:nth-child(n+2) { grid-column: span 3; }
  /* Vier Karten: eine große, drei Drittel. */
  .hs-traditionell .hl-anordnung--4 > .hl-card:nth-child(n+2) { grid-column: span 2; }
  /* Sechs Karten: eine große, zwei halbe, drei Drittel. */
  .hs-traditionell .hl-anordnung--6 > .hl-card:nth-child(n+2):nth-child(-n+3) { grid-column: span 3; }
  .hs-traditionell .hl-anordnung--6 > .hl-card:nth-child(n+4) { grid-column: span 2; }
  .hs-traditionell .hl-anordnung > .hl-card:not(:first-child) .hl-media { aspect-ratio: 3 / 2; }
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
.hs-traditionell .stimmen-blatt--zusage .stimmen-erklaerung { margin-top: 0; font-size: 17px; max-width: 46ch; }
.hs-traditionell .usp-note { display: inline-flex; align-items: center; gap: 10px; }
.hs-traditionell .usp-note strong { font-family: var(--display); font-size: 19px; font-weight: 700; }
@media (min-width: 880px) {
  .hs-traditionell .stimmen-blatt { grid-template-columns: 4fr 8fr; column-gap: 60px; align-items: start; }
  /* Die Note ist 111px hoch, die Zitate daneben rund 490px – ohne das hier
     bleiben drei Viertel der linken Spalte leer. Klebend wird aus der Leere
     Führung: Die Zahl steht neben jedem Zitat, das man gerade liest.
     Steht rechts nur die Zusage (echtes Haus, noch keine Zitate), ist beides
     gleich hoch und das Kleben hätte nichts zu führen. */
  .hs-traditionell .stimmen-note-spalte { position: sticky; top: 104px; }
  .hs-traditionell .stimmen-blatt--zusage .stimmen-note-spalte { position: static; }
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

${bildunterschriftCss("hs-traditionell")}
/* Das Haus ist wichtiger als Team und Bestseller – es ist das, woran der Gast
   die Tür erkennt. Auf dem Handy bleibt es beim Stapel: Ein verschobenes
   Raster auf 390px ist nur eng. */
@media (min-width: 760px) {
  .hs-traditionell .foto-grid { grid-template-columns: 1.4fr 1fr 1fr; gap: 22px;
                                height: clamp(360px, 34vw, 480px); }
  .hs-traditionell .foto-slot { height: 100%; }
  .hs-traditionell .foto-slot img { flex: 1; min-height: 0; height: auto;
                                    aspect-ratio: auto; object-fit: cover; }
}

/* --- Gezeichnete Zeichen (signaturIcons.js) ----------------------------- */
/* Auch die USP-Leiste verlässt die Mittelachse: Mit der Note sind es vier
   Punkte, die auf zwei Zeilen umbrechen – zentriert sieht die zweite Zeile
   aus wie ein Rest. */
.hs-traditionell .usp-list { justify-content: flex-start; }
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

/* Was eine bayerische Seite zusätzlich braucht: die gezeichnete Tafel und der
   Maßkrug stehen nur dort im Markup. Würden ihre Regeln in jeder
   traditionellen Seite mitfahren, forderte eine italienische Seite eine
   Animation an, deren Keyframes sie gar nicht bekommt – genau dieser Fall
   stand eine Weile still im Hero, ohne dass es auffiel. */
/* ========================================================================= *
 * abend
 * ------------------------------------------------------------------------- *
 * Der eine starke Moment: die Reservierung. Nicht der Hero – das Abendhaus
 * verspricht keinen Betrieb, sondern einen Abend, und der beginnt mit einem
 * Tisch. Die Reservierung ist deshalb die einzige gefüllte Akzentfläche
 * unterhalb des Heros, die einzige Sektion mit zusätzlicher Luft und die
 * einzige Stelle, an der überhaupt etwas in Bewegung kommt.
 *
 * Damit das trägt, steht alles andere still – auch die Signatur der Küche.
 * Ein Sushi-Band, das endlos durchs Bild fährt, ist Betrieb; ein Abendhaus
 * wartet. Die Signatur bleibt als Zeichnung stehen, sie läuft nur nicht mehr.
 *
 * Das Raster des Archetyps: Der Sektionskopf steht in einer schmalen linken
 * Randspalte, der Inhalt daneben. Beim traditionellen Archetyp hält die
 * Randspalte die Kategorie und die Note – hier ist es der Kopf selbst.
 *
 * Die Kurve: cubic-bezier(.5,0,.1,1). Langsam an, langsam aus – ein Abend
 * hat es nicht eilig. 0.9s für den einen Moment, 0.5s für den Rest.
 * ========================================================================= */
const ABEND = `
/* --- Stille: auch die Signatur der Küche wartet ------------------------- */
.hs-abend .hero-media img { animation: none; }
.hs-abend .hero-media, .hs-abend .hero-inner { animation: none; }
.hs-abend .foto-slot img { animation: none; }
.hs-abend .hl-card, .hs-abend .hl-media img { transition: none; }
.hs-abend .hl-card:hover { transform: none; }
.hs-abend .hl-card:hover .hl-media img { transform: none; }
.hs-abend .section-head .eyebrow::after,
.hs-abend .step:not(:last-child)::after { transform: scaleX(1); transition: none; }
.bewegt .hs-abend .section-head.auftritt .eyebrow::after { transform: scaleX(1); }
.bewegt .hs-abend .auftritt,
.bewegt .hs-abend .auftritt-karte,
.bewegt .hs-abend .usp-list span {
  transform: none;
  transition: opacity .5s cubic-bezier(.5,0,.1,1);
  transition-delay: 0s;
}
/* Dieselben Regeln, die prefers-reduced-motion setzt – hier dauerhaft.
   Einmal geschrieben in heroSignature.js, nicht ein zweites Mal abgetippt. */
.hs-abend {
  ${SIGNATUR_REDUZIERT_REGELN}
}
/* Das Sushi-Band ist als einzige Signatur kein Gegenstand, sondern ein
   Mechanismus: Steht es still, liegt ein Filmstreifen quer über dem Hero.
   Im Abendhaus wird daraus ein gesetztes Viererfeld am rechten Rand – vier
   Teller, ruhig nebeneinander, statt eines angehaltenen Laufbands. */
.hs-abend .sig-band { left: auto; right: 4%; top: 14%; height: auto;
                      width: clamp(230px, 26vw, 360px); mask-image: none; opacity: .92; }
.hs-abend .sig-band .band { flex-wrap: wrap; width: 100%; gap: 10px; }
.hs-abend .sig-band img { width: calc(50% - 5px); height: auto; aspect-ratio: 4 / 3; border-radius: 2px; }
.hs-abend .sig-band img:nth-child(n + 5) { display: none; }
@media (max-width: 899px) {
  .hs-abend .sig-band { right: -6%; top: 9%; width: 46vw; opacity: .5; }
}

/* Orchidee und Gewürzwölkchen hängen nicht an einer Animation, sondern an
   einem Übergang, den .bewegt auslöst. Auch der bleibt hier aus. */
.bewegt .hs-abend .sig-orchid .bluete, .bewegt .hs-abend .sig-orchid.da .bluete {
  opacity: 1; transform: none; transition: none;
}
.bewegt .hs-abend .sig-spice .puff, .bewegt .hs-abend .sig-spice.da .puff,
.bewegt .hs-abend .sig-spice .fleck, .bewegt .hs-abend .sig-spice.da .fleck {
  opacity: 1; transform: none; animation: none;
}

/* --- Der eine Moment: die Reservierung ---------------------------------- */
/* Die einzige gefüllte Akzentfläche unterhalb des Heros ist der Knopf in
   diesem Formular. Die USP-Leiste gibt ihre Akzentfläche dafür ab, die
   Ziffern des Abholwegs werden zu Kontur. */
.hs-abend .usp-strip { background: var(--soft); color: var(--ink-soft);
                       border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.hs-abend .usp-list { justify-content: flex-start; font-weight: 500; }
.hs-abend .usp-platzhalter { color: var(--gold-dunkel); }
.hs-abend .step-n { background: transparent; color: var(--accent-bold); border: 1px solid var(--line); }

.hs-abend #reservierung { padding: 124px 0; }
.hs-abend .reserve-section { background: var(--bg); }
.hs-abend #reservierung .section-head h2,
.hs-abend #reservierung h2 { font-size: clamp(30px, 4.6vw, 48px); margin-bottom: 18px; }
.hs-abend .reserve-grid > div:first-child p { color: var(--ink-soft); font-size: 19px; }
/* Die eine helle Fläche der Seite: Hier wird der Tisch gesichert. */
.hs-abend .panel { background: var(--surface); padding: 38px; border-color: var(--line); }
.hs-abend .panel .btn-primary { padding: 16px 26px; font-size: 16px; }
.bewegt .hs-abend .reserve-grid > .auftritt {
  opacity: 0; transform: translateY(20px);
  transition: opacity .9s cubic-bezier(.5,0,.1,1), transform .9s cubic-bezier(.5,0,.1,1);
}
.bewegt .hs-abend .reserve-grid > .auftritt.da { opacity: 1; transform: none; }

/* --- Farbe: Text trägt accentBold, Flächen behalten accent -------------- */
.hs-abend .eyebrow,
.hs-abend .veg,
.hs-abend .error,
.hs-abend .contact-list a,
.hs-abend .contact-list .k,
.hs-abend .reserve-pluspunkte .k,
.hs-abend .stimmen-note .note,
.hs-abend .kat > summary::after,
.hs-abend .add-btn,
.hs-abend .mini-add { color: var(--accent-bold); }
.hs-abend .add-btn, .hs-abend .mini-add { border-color: var(--accent-bold); }
.hs-abend .kat > summary:hover { color: var(--accent-bold); }
.hs-abend .stimmen-note .sterne,
.hs-abend .stimme .sterne { color: var(--gold-dunkel); }

/* --- Keine Mittelachse -------------------------------------------------- */
.hs-abend .section-head.mitte { margin-left: 0; margin-right: 0; text-align: left; }
.hs-abend .stimmen-erklaerung { margin-left: 0; margin-right: 0; text-align: left; }

/* --- Rhythmus ----------------------------------------------------------- */
.hs-abend .section { padding: 88px 0; }
.hs-abend #ambiente { padding: 104px 0 88px; }
.hs-abend #highlights .section-head h2 { font-size: clamp(26px, 3.6vw, 36px); }
.hs-abend .section-head p { font-size: 19px; }
.hs-abend .hint, .hs-abend .error, .hs-abend .footer-note,
.hs-abend .foto-text span, .hs-abend .demo-note { font-size: 14px; }
.hs-abend .hl-kat, .hs-abend .veg, .hs-abend .placeholder-badge { font-size: 12px; }

/* --- Highlights: die Leseliste ------------------------------------------ */
/* Im Abendhaus liest man eine Karte, man blättert keine Kacheln. Ein Gericht
   steht mit Bild, die übrigen als Zeilen daneben – Name, Beschreibung, Preis. */
.hs-abend .hl-card { background: transparent; border: 0; border-radius: 0; overflow: visible; }
.hs-abend .hl-media { border-radius: var(--radius); }
.hs-abend .hl-body { padding: 16px 0 0; gap: 6px; }
.hs-abend .hl-kat { position: static; background: none; border-radius: 0; padding: 0;
                    color: var(--accent-bold); letter-spacing: .16em; align-self: start; }
.hs-abend .hl-siegel { display: inline-flex; align-items: center; gap: 8px;
                       font-size: 12px; font-weight: 700; letter-spacing: .14em;
                       text-transform: uppercase; color: var(--accent-bold); }
@media (min-width: 860px) {
  .hs-abend .hl-anordnung { grid-template-columns: 6fr 6fr; gap: 0 54px; align-items: start; }
  .hs-abend .hl-anordnung > .hl-card:first-child { grid-column: 1; }
  .hs-abend .hl-anordnung--3 > .hl-card:first-child { grid-row: span 2; }
  .hs-abend .hl-anordnung--4 > .hl-card:first-child { grid-row: span 3; }
  .hs-abend .hl-anordnung--6 > .hl-card:first-child { grid-row: span 5; }
  .hs-abend .hl-anordnung > .hl-card:first-child .hl-media { aspect-ratio: 4 / 5; }
  .hs-abend .hl-anordnung > .hl-card:first-child .hl-name { font-size: clamp(22px, 2.3vw, 28px); }
  .hs-abend .hl-anordnung > .hl-card:not(:first-child) {
    grid-column: 2; border-top: 1px solid var(--line); padding-top: 18px;
  }
  .hs-abend .hl-anordnung > .hl-card:not(:first-child) .hl-media { display: none; }
  .hs-abend .hl-anordnung > .hl-card:not(:first-child) .hl-body { padding: 0; }
  .hs-abend .hl-anordnung > .hl-card:not(:first-child) .hl-name { font-size: 19px; }
  .hs-abend .hl-anordnung > .hl-card:last-child { padding-bottom: 18px; border-bottom: 1px solid var(--line); }
}

/* --- Karte und Stimmen: der Kopf steht in der Randspalte ---------------- */
/* Das ist das Raster dieses Archetyps: links der Kopf, rechts der Inhalt.
   Eine Speisekarte und eine Sammlung von Stimmen brauchen keinen Titel über
   sich – sie brauchen einen neben sich. */
.hs-abend .karte-section { background: var(--bg); }
.hs-abend .kat { background: transparent; border: 0; border-top: 1px solid var(--line);
                 border-radius: 0; margin-bottom: 0; overflow: visible; }
.hs-abend .kat:last-of-type { border-bottom: 1px solid var(--line); }
.hs-abend .kat > summary { padding: 22px 0; }
.hs-abend .kat-body { padding: 0 0 14px; }
.hs-abend .gericht-preis { font-variant-numeric: tabular-nums; }
.hs-abend .stimme { background: transparent; border: 0; border-top: 1px solid var(--line);
                    border-radius: 0; padding: 22px 0; gap: 10px; }
.hs-abend .stimme.ist-platzhalter { border-style: solid; min-height: 0; justify-content: flex-start; }
.hs-abend .stimmen-grid { grid-template-columns: 1fr; gap: 0; }
.hs-abend .stimmen-grid--list { max-width: none; margin-left: 0; margin-right: 0; }
.hs-abend .stimmen-note { justify-content: flex-start; margin-bottom: 20px; }
.hs-abend .stimmen-note .note { font-size: 36px; }
.hs-abend .stimmen-blatt { display: block; }
@media (min-width: 960px) {
  .hs-abend #karte .wrap,
  .hs-abend #stimmen .wrap { display: grid; grid-template-columns: 4fr 8fr;
                             column-gap: 54px; align-items: start; }
  .hs-abend #karte .section-head,
  .hs-abend #stimmen .section-head { grid-column: 1; margin-bottom: 0; max-width: none; }
  .hs-abend #karte .kat,
  .hs-abend #stimmen .stimmen-blatt,
  .hs-abend #stimmen .stimmen-note,
  .hs-abend #stimmen .stimmen-grid,
  .hs-abend #stimmen .stimmen-erklaerung { grid-column: 2; }
}

${bildunterschriftCss("hs-abend")}
/* Der Raum führt diesen Archetyp an – er steht über die ganze Breite, Team
   und Bestseller teilen sich die Zeile darunter. */
@media (min-width: 760px) {
  .hs-abend .foto-grid { grid-template-columns: 1fr 1fr; gap: 26px; }
  .hs-abend .foto-slot:first-child { grid-column: 1 / -1; }
  .hs-abend .foto-slot:first-child img { aspect-ratio: 21 / 9; }
}

/* --- Kontakt: die Öffnungszeiten tragen --------------------------------- */
/* Umgekehrt zum traditionellen Archetyp: Wer einen Abend plant, will zuerst
   wissen, ob offen ist – die Adresse findet er danach. */
@media (min-width: 860px) {
  .hs-abend .contact-grid { grid-template-columns: 5fr 7fr; gap: 60px; }
}
.hs-abend .hours-row { font-size: 17px; padding: 15px 0; font-variant-numeric: tabular-nums; }
.hs-abend .contact-list li { gap: 16px; padding: 14px 0; align-items: flex-start; }
.hs-abend .contact-list .k { font-size: inherit; display: inline-flex; padding-top: .1em; }

/* --- Gezeichnete Zeichen ------------------------------------------------ */
.hs-abend .usp-list span { gap: 10px; }
.hs-abend .reserve-pluspunkte .k { display: inline-flex; padding-top: .2em; }
.hs-abend footer strong { display: inline-flex; align-items: center; gap: 10px; }
.hs-abend .kopf-marke { display: inline-flex; align-items: center; gap: 10px; }
${ikonenCss("hs-abend")}

/* --- Wer keine Bewegung will, bekommt keine ----------------------------- */
@media (prefers-reduced-motion: reduce) {
  .bewegt .hs-abend .auftritt,
  .bewegt .hs-abend .auftritt-karte,
  .bewegt .hs-abend .reserve-grid > .auftritt,
  .bewegt .hs-abend .usp-list span { opacity: 1; transform: none; transition: none; }
}
.bewegung-aus .hs-abend .auftritt,
.bewegung-aus .hs-abend .auftritt-karte,
.bewegung-aus .hs-abend .reserve-grid > .auftritt,
.bewegung-aus .hs-abend .usp-list span { opacity: 1; transform: none; transition: none; }
`;

/**
 * Was eine bayerische Seite zusätzlich braucht: Der gezeichnete Maßkrug
 * (heroSignature.js: heroBierkrug) steht nur dort im Markup. Würden seine
 * Regeln in jeder Seite mitfahren, forderte eine italienische Seite eine
 * Animation an, deren Keyframes sie gar nicht bekommt – genau dieser Fall
 * stand eine Weile still im Hero, ohne dass es auffiel.
 *
 * @param {string} klasse - die Körperklasse des Archetyps.
 */
function krugCss(klasse) {
  return `
/* --- Der Maßkrug (heroSignature.js: heroBierkrug) ------------------------ */
/* Die Glaskontur liegt im viewBox 0 0 64 86 bei x 14…50 und beginnt bei
   y = 16. Schaum und Tropfen sitzen deshalb bei 23 % / 23 % und am Rand –
   beim bisherigen Glas standen sie breiter als die Kontur und begannen
   darüber, der Schaum lag wie ein Deckel auf.
   Keine neue Animation: Es laufen dieselben Keyframes wie bisher
   (sig-beer-schaum, sig-beer-tropfen aus SIGNATUR_CSS). */
/* Der Krug steht unter der Tafel, nicht vor ihr: Die Tafel sitzt mittig
   (top 50 %, translateY(-50 %)) und endet bei 1440x900 auf y = 599. */
.${klasse} .sig-krug { position: absolute; right: 6.5%; bottom: 2.5%;
                             width: clamp(86px, 8.6vw, 118px); aspect-ratio: 64 / 86;
                             color: var(--gold-hell);
                             filter: drop-shadow(0 14px 20px rgba(0,0,0,.45)); }
.${klasse} .sig-krug-form { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.${klasse} .sig-krug .noppe { opacity: .55; }
.${klasse} .sig-krug .schaum { position: absolute; left: 23%; right: 23%; top: 3%; height: 14%;
                                     border-radius: 999px 999px 5px 5px; background: #fdf3d6;
                                     transform-origin: 50% 100%;
                                     animation: sig-beer-schaum 8s ease-in-out infinite; }
.${klasse} .sig-krug .tropfen { position: absolute; top: 16%; width: 5px; height: 5px;
                                      border-radius: 50%; background: #fdf3d6; opacity: 0;
                                      animation: sig-beer-tropfen 8s ease-in infinite; }
.${klasse} .sig-krug .tropfen-1 { left: 25%; }
.${klasse} .sig-krug .tropfen-2 { left: 68%; animation-delay: .25s; }
@media (max-width: 899px) {
  .${klasse} .sig-krug { right: 6%; bottom: 4%; width: 46px; }
}
@media (prefers-reduced-motion: reduce) {
  .${klasse} .sig-krug .schaum,
  .${klasse} .sig-krug .tropfen { animation: none; }
}
.bewegung-aus .${klasse} .sig-krug .schaum,
.bewegung-aus .${klasse} .sig-krug .tropfen { animation: none; }

`;
}

/* Der traditionelle Archetyp lässt den Krug überlaufen und hält ihn an,
   sobald der Hero durch ist. motion.js setzt die Klasse .ruht ohnehin schon
   (dafür gibt es den IntersectionObserver); bisher hing daran nur die
   Hero-Fahrt. Eine Animation, die niemand sieht, hält den Compositor
   trotzdem wach. */
const TRADITIONELL_BAYERISCH = `${krugCss("hs-traditionell")}
.hs-traditionell .hero.ruht .sig-tafel .karte,
.hs-traditionell .hero.ruht .sig-krug .schaum,
.hs-traditionell .hero.ruht .sig-krug .tropfen { animation-play-state: paused; }
`;

/* Im Abendhaus steht der Krug einfach da. Er läuft nicht über: Das ist die
   Regel dieses Archetyps, und sie gilt auch für das eine Element, das eine
   andere Küche in Bewegung hielte. */
const ABEND_BAYERISCH = `${krugCss("hs-abend")}
.hs-abend .sig-krug .schaum,
.hs-abend .sig-krug .tropfen { animation: none; }
`;

const HANDSCHRIFTEN = {
  traditionell: TRADITIONELL,
  abend: ABEND,
};

// Was eine Handschrift zusätzlich braucht, wenn eine bestimmte Küche sie
// trägt. Der Schlüssel ist "<archetyp>/<kueche>".
const HANDSCHRIFT_JE_KUECHE = {
  "traditionell/bayerisch": TRADITIONELL_BAYERISCH,
  "abend/bayerisch": ABEND_BAYERISCH,
};

/**
 * Das CSS der Handschrift. Ohne Handschrift (preset.layout.handschrift null,
 * also jedes Preset außer den Archetypen) kommt ein leerer String zurück –
 * die Seite ist dann Zeichen für Zeichen die bisherige.
 *
 * @param {string|null} handschrift
 * @param {string} [cuisine] - für die Teile, die nur eine Küche braucht.
 */
export function handschriftCss(handschrift, cuisine) {
  const basis = HANDSCHRIFTEN[handschrift];
  if (!basis) return "";
  return basis + (HANDSCHRIFT_JE_KUECHE[`${handschrift}/${cuisine}`] ?? "");
}

/** Die Körperklasse, an der jeder Selektor des Blocks hängt. */
export function handschriftKlasse(handschrift) {
  return HANDSCHRIFTEN[handschrift] ? `hs-${handschrift}` : "";
}
