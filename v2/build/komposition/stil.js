// CSS der komponierten Seiten – ergänzt STIL (stil.js).
//
// Gleiche Regel wie dort: kein Farbwert, kein freier Abstand. Alles kommt
// aus den Designsystem-Variablen; der Anti-Slop-Lint prüft das. Was hier
// steht, sind die Formen der Hero-Typen, Signaturen und Abschnitte, die die
// Creative Direction auswählt – nicht eine feste Seitenfolge.

export const KOMPOSITION_STIL = `
/* Bilder aus dem Bildplan: eigener Ausschnitt je Viewport, Fokuspunkt */
.bp { display: block; aspect-ratio: var(--ar-d); overflow: hidden; background: var(--flaeche-tief); }
.bp img { width: 100%; height: 100%; object-fit: cover; object-position: var(--fx) var(--fy); }
@media (max-width: 767px) { .bp { aspect-ratio: var(--ar-m); } }

.k-entwurf { display: inline-block; vertical-align: middle; font-family: var(--f-text); font-size: var(--t-klein); font-weight: var(--f-text-stark);
  letter-spacing: .02em; line-height: 1.3; padding: 0 var(--s-1); border: 1px dashed var(--signal-text); color: var(--signal-text); border-radius: var(--r-klein); }
.k-kopf { max-width: var(--text-breite); margin-bottom: var(--s-6); }
.k-kopf .intro { margin-top: var(--s-2); }
.abschnitt-text h2, .k-text-titel h2 { font-family: var(--f-text); font-weight: var(--f-text-stark); text-transform: none; letter-spacing: 0; }

/* Kopfzeile: mobile Navigation ohne Skript */
.k-menue { display: none; position: relative; }
.k-menue summary { list-style: none; cursor: pointer; min-height: var(--s-5); display: inline-flex; align-items: center; padding: var(--s-halb) var(--s-2);
  border: 1px solid var(--linie-stark); border-radius: var(--r-knopf); font-weight: var(--f-text-stark); }
.k-menue summary::-webkit-details-marker { display: none; }
.k-menue[open] summary { border-color: var(--akzent-text); color: var(--akzent-text); }
.k-menue-liste { position: absolute; right: 0; top: calc(100% + var(--s-1)); z-index: 45; display: flex; flex-direction: column; gap: var(--s-halb);
  min-width: 16rem; padding: var(--s-2); background: var(--flaeche); border: 1px solid var(--linie); border-radius: var(--r-karte); box-shadow: var(--schatten-schwebend); }
.k-menue-liste a:not(.btn) { display: flex; align-items: center; min-height: var(--s-6); padding-inline: var(--s-1); text-decoration: none; }
.k-menue-liste .btn { margin-top: var(--s-1); }
@media (max-width: 1023px) { .k-menue { display: block; } }

/* Aktionsleiste mobil: erst sichtbar, wenn die Hero-Knöpfe aus dem Blick sind */
.k-leiste { transition: transform var(--m-mittel) var(--m-kurve); }
.k-leiste-bereit .k-leiste { transform: translateY(100%); }
.k-leiste-bereit .k-leiste.k-leiste--da { transform: none; }
.k-leiste:has(> :only-child) { grid-template-columns: 1fr; }
@media (prefers-reduced-motion: reduce) { .k-leiste { transition: none; } }

/* Hero: Titelblatt einer gedruckten Karte */
.k-hero--karte { padding-block: var(--s-6) var(--s-10); }
.k-titelblatt { display: grid; grid-template-columns: 7fr 5fr; gap: var(--s-8); align-items: center; padding: var(--s-8);
  background: var(--flaeche); border: 1px solid var(--linie-stark); outline: 1px solid var(--linie); outline-offset: calc(var(--s-1) * -1); }
.k-titel-text h1 { font-size: var(--t-display); line-height: .95; }
.k-titel-foto { position: relative; transform: rotate(1deg); box-shadow: var(--schatten-karte); }
.k-titel-foto .bp { --ar-d: 4 / 5; }
.k-titel-foto .herkunft, .k-tages-foto .herkunft, .k-werkbank-foto .herkunft, .k-wand-foto .herkunft, .k-noren-bild .herkunft { top: var(--s-2); bottom: auto; }

/* Signatur Tageskarte: eingesteckter Zettel */
.k-sig--tageskarte { padding-top: 0; }
.k-tageskarte { display: grid; grid-template-columns: 5fr 7fr; align-items: center; }
.k-tages-foto { position: relative; grid-column: 1; grid-row: 1; }
.k-zettel { grid-column: 1 / -1; grid-row: 1; justify-self: end; width: min(100%, 40rem); position: relative; z-index: 1;
  background: var(--grund); border: 1px solid var(--linie-stark); padding: var(--s-6); box-shadow: var(--schatten-schwebend); transform: rotate(-1.5deg); }
.k-zettel h2 { font-style: italic; }
.k-zettel-liste { list-style: none; margin: var(--s-4) 0 0; padding: 0; }
.k-zettel-liste li { display: grid; grid-template-columns: var(--s-5) 1fr auto auto; gap: var(--s-2); align-items: baseline; padding-block: var(--s-2); border-top: 1px solid var(--linie); }
.k-nr { font-family: var(--f-display); font-style: italic; font-size: var(--t-h3); color: var(--akzent-text); line-height: 1; }
.k-zettel-gericht { display: flex; flex-direction: column; }
.k-zettel-gericht strong { font-family: var(--f-display); font-weight: var(--f-display-gewicht); font-size: var(--t-gross); }
.k-zettel-gericht span { color: var(--text-leise); }
.k-zettel-fuss { margin-top: var(--s-3); font-size: var(--t-klein); color: var(--text-leise); }
@media (prefers-reduced-motion: no-preference) {
  .bewegt .k-zettel.auftritt { transform: rotate(0deg) translateY(var(--m-weg)); }
  .bewegt .k-zettel.auftritt.da { transform: rotate(-1.5deg); }
}

/* Hero: Noren – Vorhang vor dem Tresenfoto */
.k-hero--noren { position: relative; background: var(--grund); }
.k-noren-bild { position: relative; }
.k-noren-bild .bp { max-height: 72vh; width: 100%; }
.k-noren { position: absolute; left: 50%; top: 0; width: min(100% - var(--s-4), 56rem); transform: translateX(-50%); height: 34%; display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-1); pointer-events: none; }
.k-noren span { background: var(--akzent); border-radius: 0 0 var(--r-klein) var(--r-klein); }
.k-noren-kopf { position: absolute; left: 0; right: 0; top: 0; height: 34%; display: grid; place-items: center; pointer-events: none; }
.k-noren-bild .herkunft { top: auto; bottom: var(--s-2); }
.k-noren-kopf h1 { color: var(--auf-akzent); font-size: var(--t-display); line-height: .9; text-align: center; }
.k-noren-fuss { background: var(--flaeche); border-bottom: 1px solid var(--linie); }
.k-noren-zeile { display: grid; grid-template-columns: 3fr 2fr 4fr auto; gap: var(--s-4); align-items: center; padding-block: var(--s-4); }
.k-noren-zeile .rubrik, .k-noren-zeile .hero-claim, .k-noren-zeile .hero-aktionen { margin: 0; }
.k-noren-ab { font-family: var(--f-display); font-size: var(--t-h2); line-height: 1; text-transform: var(--f-display-transform); color: var(--akzent-text); }

/* Signatur Zettelwand */
.k-sig--zettelwand { background: var(--flaeche-tief); }
.k-sig--zettelwand h2, .k-karte--kompakt h2, .k-ambiente h2 { font-family: var(--f-text); font-weight: var(--f-text-stark); text-transform: none; letter-spacing: 0; }
.k-wand { display: grid; grid-template-columns: 8fr 4fr; gap: var(--s-6); align-items: start; }
.k-zettelreihe { list-style: none; margin: 0; padding: var(--s-3) 0 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-2); border-top: 2px solid var(--linie-stark); }
.k-zettelchen { position: relative; display: flex; flex-direction: column; gap: var(--s-1); min-height: calc(var(--s-16) * 2); padding: var(--s-2);
  background: var(--text); color: var(--grund); border-top: var(--s-1) solid var(--akzent); }
.k-zettelchen:nth-child(3n+2) { transform: translateY(var(--s-2)); }
.k-zettelchen:nth-child(3n) { transform: translateY(var(--s-1)); }
.k-zettelchen h3 { font-family: var(--f-text); font-weight: var(--f-text-stark); font-size: var(--t-basis); text-transform: none; letter-spacing: 0; line-height: 1.25; }
.k-zettelchen p { font-size: var(--t-klein); opacity: .85; }
.k-zettelchen-fuss { margin-top: auto; display: flex; align-items: end; justify-content: space-between; gap: var(--s-1); }
.k-zettel-preis { font-family: var(--f-display); font-size: var(--t-h3); line-height: 1; text-transform: var(--f-display-transform); white-space: nowrap; }
.k-zettelchen .mini-add { color: var(--grund); border-color: var(--grund); }
.k-zettelchen .mini-add:hover { background: var(--grund); color: var(--text); }
.k-wand-foto { position: relative; }

/* Hero: Aushang (typografisch) */
.k-hero--aushang { background: var(--flaeche-tief); border-bottom: 1px solid var(--linie); }
.k-aushang { display: flex; flex-direction: column; align-items: center; text-align: center; padding-block: var(--s-12) var(--s-10); }
.k-blatt { width: var(--s-8); height: var(--s-8); color: var(--akzent-text); margin-bottom: var(--s-3); }
.k-schild { font-size: var(--t-display); line-height: 1; max-width: 14ch; padding-block: var(--s-3); border-block: 2px solid var(--text); margin-top: var(--s-2); }
.k-aushang-adresse { margin-top: var(--s-4); font-size: var(--t-gross); }
.k-aushang-tel { margin-top: var(--s-1); font-family: var(--f-display); font-size: var(--t-h3); }
.k-aushang-tel a { text-decoration: none; }
.k-hero--aushang .hero-aktionen { justify-content: center; }

/* Hero: Werkbank (Café) */
.k-hero--werkbank { padding-block: var(--s-8) var(--s-10); }
.k-werkbank { display: grid; grid-template-columns: 7fr 5fr; gap: var(--s-8); align-items: end; }
.k-werkbank h1 { font-size: var(--t-display); line-height: .95; }
.k-werkbank-foto { position: relative; }
.k-werkbank-foto .bp { --ar-d: 4 / 5; }
.k-status { margin-top: var(--s-3); font-family: var(--f-label); font-size: var(--t-gross); padding-left: var(--s-2); border-left: var(--s-halb) solid var(--akzent); }

/* Signatur Wochenplan */
.k-sig--wochenplan { background: var(--flaeche-tief); }
.k-plan-liste { list-style: none; margin: 0; padding: 0; font-family: var(--f-label); border-top: 2px solid var(--text); }
.k-plan-liste li { display: grid; grid-template-columns: 4fr 4fr 4fr; gap: var(--s-2); align-items: center; min-height: var(--s-8); padding-inline: var(--s-2); border-bottom: 1px solid var(--linie-stark); }
.k-plan-tag { font-weight: 700; }
.k-plan-marke { display: inline-block; padding: 0 var(--s-1); background: var(--akzent); color: var(--auf-akzent); font-family: var(--f-text); font-weight: var(--f-text-stark); font-size: var(--t-klein); }
.k-plan-liste li.k-heute { background: var(--flaeche); box-shadow: inset var(--s-halb) 0 0 var(--akzent); }
.k-plan-liste li.k-heute .k-plan-tag::after { content: " · heute"; font-weight: 400; color: var(--text-leise); }

/* Hero: Bild voll (eigene starke Fotos) */
.k-bild-voll .bp { max-height: 80vh; width: 100%; }
.k-bild-text { padding-block: var(--s-6) var(--s-8); }

/* Karte – vier Darstellungen */
.k-karte-spalten { columns: 2; column-gap: var(--s-10); }
.k-kategorie { break-inside: avoid; margin-bottom: var(--s-6); }
.k-kategorie h3 { font-size: var(--t-h3); margin-bottom: var(--s-2); }
.k-kategorie ul { list-style: none; margin: 0; padding: 0; }
.k-zeile { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; column-gap: var(--s-2); align-items: baseline; padding-block: var(--s-1); border-bottom: 1px solid var(--linie); }
.k-zeile-name { font-weight: var(--f-text-stark); min-width: 0; overflow-wrap: anywhere; }
.k-zeile .preis { font-family: var(--f-text); }
.k-zeile .mini-add { align-self: center; grid-row: 1 / span 2; grid-column: 3; }
.k-zeile-desc { grid-column: 1 / 3; color: var(--text-leise); }
.k-kat-hinweis { margin: calc(var(--s-1) * -1) 0 var(--s-1); font-size: var(--t-klein); color: var(--text-leise); }
.k-karte--druckkarte .k-kategorie h3 { font-style: italic; text-align: center; padding-bottom: var(--s-1); border-bottom: 1px solid var(--linie-stark); }
.k-karte--druckkarte .k-kopf { margin-inline: auto; text-align: center; }
.k-karte--druckkarte .k-kopf .rubrik { justify-content: center; }
.k-karte--kompakt .k-karte-spalten { columns: 3; column-gap: var(--s-6); }
.k-karte--kompakt .k-kategorie h3 { font-family: var(--f-text); font-weight: var(--f-text-stark); font-size: var(--t-gross); text-transform: none; letter-spacing: 0; }
.k-karte--kompakt .k-zeile-desc { font-size: var(--t-klein); }
.k-karte--muster .k-karte-spalten { columns: 3; column-gap: var(--s-6); }
.k-muster-hinweis { max-width: var(--text-breite); margin-bottom: var(--s-4); padding: var(--s-2); border: 1px dashed var(--signal-text); color: var(--text); }
.k-karte--tresen .k-karte-spalten { columns: 3; column-gap: var(--s-6); }
.k-karte--tresen .k-kategorie:first-child { column-span: all; margin-bottom: var(--s-8); }
.k-karte--tresen .k-kategorie:first-child ul { display: grid; grid-template-columns: repeat(3, 1fr); column-gap: var(--s-6); }
.k-gewicht--klein { padding-block: var(--sektion-eng); }
.k-gewicht--klein h2 { font-size: var(--t-h3); }

/* Haus, Regeln, Abholung, Offene Punkte */
.k-haus-raster { max-width: calc(var(--text-breite) + var(--s-16)); }
.k-haus-zitat { font-family: var(--f-display); font-size: var(--t-h2); line-height: 1.15; margin-bottom: var(--s-4); }
.k-haus-text { font-size: var(--t-gross); color: var(--text-leise); max-width: var(--text-breite); }
.k-regeln { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-4); }
.k-regeln li { font-family: var(--f-display); font-size: var(--t-h3); line-height: 1.2; padding-top: var(--s-2); border-top: 2px solid var(--akzent); text-transform: none; }
.k-titel-text h2, .k-titel-text .k-regeln li { font-family: var(--f-text); font-weight: var(--f-text-stark); text-transform: none; letter-spacing: 0; }
.k-abholung-zeile { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: var(--s-3); }
.k-aufklapper > summary { list-style: none; cursor: pointer; }
.k-aufklapper > summary::-webkit-details-marker { display: none; }
.k-aufklapper[open] > summary { margin-bottom: var(--s-3); }
.k-offen { background: var(--flaeche-tief); }
.k-offen-liste { margin: 0; padding-left: var(--s-3); display: grid; gap: var(--s-1); max-width: var(--text-breite); }
.k-unbekannt { color: var(--text-leise); }
.k-kontakt-raster { display: grid; grid-template-columns: 7fr 5fr; gap: var(--s-8); align-items: start; }
.k-kontakt-raster > * { min-width: 0; }

@media (max-width: 1023px) {
  .k-titelblatt, .k-werkbank, .k-wand, .k-kontakt-raster { grid-template-columns: minmax(0, 1fr); }
  .k-titelblatt { padding: var(--s-4); gap: var(--s-4); }
  .k-titel-foto { order: -1; transform: none; }
  .k-werkbank-foto { order: -1; }
  .k-noren-zeile { grid-template-columns: 1fr; gap: var(--s-2); }
  .k-karte-spalten, .k-karte--kompakt .k-karte-spalten, .k-karte--muster .k-karte-spalten, .k-karte--tresen .k-karte-spalten { columns: 1; }
  .k-karte--tresen .k-kategorie:first-child ul { grid-template-columns: 1fr; }
  .k-zettelreihe { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 767px) {
  .k-tageskarte { grid-template-columns: 1fr; }
  .k-tages-foto { grid-row: 1; }
  .k-zettel { grid-row: 2; margin-top: calc(var(--s-6) * -1); width: calc(100% - var(--s-2)); padding: var(--s-4) var(--s-3); }
  .k-zettel-liste li { grid-template-columns: var(--s-3) 1fr auto; }
  .k-zettel-liste .mini-add { grid-column: 3; justify-self: end; }
  .k-noren { height: 30%; }
  .k-noren-kopf { height: 30%; }
  .k-noren-bild .bp { max-height: none; }
  .k-zettelreihe { grid-template-columns: repeat(2, 1fr); }
  .k-zettelchen:nth-child(3n+2), .k-zettelchen:nth-child(3n) { transform: none; }
  .k-regeln { grid-template-columns: 1fr; }
  .k-plan-liste li { grid-template-columns: 5fr 7fr; padding-block: var(--s-1); }
  .k-plan-notiz { grid-column: 1 / -1; }
  .k-plan-notiz:empty { display: none; }
  .k-schild { font-size: var(--t-h1); }
}
`;
