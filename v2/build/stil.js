// Komponenten-CSS der v2-Seiten.
//
// Regel: Hier steht kein einziger Farbwert und kein freier Abstand. Farben,
// Schriften, Größen, Abstände, Radien, Schatten und Bewegung kommen
// ausschließlich über die Variablen aus tokens.js – also aus dem
// Designsystem-Dokument. Der Anti-Slop-Lint prüft das (hartkodierte-farbe,
// raster-bruch).
//
// Was hier steht, ist Struktur: Raster, Reihenfolge, Seitenverhältnisse.
// Unterschiede zwischen den Archetypen hängen an Körperklassen (a-abend …),
// die siteBuilder.js aus dem Designsystem setzt.

export const STIL = `
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
body {
  margin: 0; background: var(--grund); color: var(--text);
  font-family: var(--f-text); font-size: var(--t-basis); line-height: var(--f-text-zh);
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
}
h1, h2, h3 {
  font-family: var(--f-display); font-weight: var(--f-display-gewicht);
  text-transform: var(--f-display-transform); letter-spacing: var(--f-display-sperrung);
  line-height: var(--f-display-zh); margin: 0; text-wrap: balance;
  hyphens: auto; -webkit-hyphens: auto; overflow-wrap: break-word;
}
h2 { font-size: var(--t-h2); }
h3 { font-size: var(--t-h3); }
p { margin: 0; text-wrap: pretty; }
img { display: block; max-width: 100%; }
a { color: inherit; text-underline-offset: .18em; }
figure { margin: 0; }
button { font: inherit; }
:focus-visible { outline: 2px solid var(--akzent-text); outline-offset: 2px; }
.auf-tint :focus-visible { outline-color: var(--auf-tint); }

.rahmen { width: 100%; max-width: var(--max-breite); margin-inline: auto; padding-inline: var(--rand); }
.sektion { padding-block: var(--sektion); }
.sektion--tief { background: var(--flaeche-tief); }
.sektion--betont { padding-block: var(--sektion-betont); }
section[id] { scroll-margin-top: var(--s-10); }

/* Rubriken – drei Stile, gewählt im Designsystem (typografie.rubrik) */
.rubrik { display: flex; align-items: center; gap: var(--s-1); margin: 0 0 var(--s-2); color: var(--akzent-text);
  font-family: var(--f-text); font-size: var(--t-klein); font-weight: var(--f-text-stark); }
.rubrik-versal .rubrik { text-transform: uppercase; letter-spacing: .14em; }
.rubrik-etikett .rubrik { font-family: var(--f-display); font-weight: var(--f-display-gewicht); font-size: var(--t-gross); text-transform: none; letter-spacing: 0; }
.rubrik-mono .rubrik { font-family: var(--f-label); font-weight: 400; letter-spacing: .02em; }
.auf-tint .rubrik { color: var(--signal-auf-tint); }

.sektion-kopf { max-width: var(--text-breite); margin-bottom: var(--s-8); }
.sektion-kopf .intro, .intro { margin-top: var(--s-3); font-size: var(--t-gross); color: var(--text-leise); }
.sektion-kopf--seitlich { max-width: none; display: grid; grid-template-columns: 3fr 9fr; gap: var(--rinne); align-items: start; }
.sektion-kopf--seitlich .rubrik { padding-top: var(--s-1); }
.sektion-kopf--seitlich > div { max-width: var(--text-breite); }

/* Kleine Marken: das einzige, was rund sein darf */
.marke-klein { display: inline-block; vertical-align: middle; font-family: var(--f-text); font-size: var(--t-klein); font-weight: var(--f-text-stark);
  line-height: 1.3; color: var(--text-leise); border: 1px solid var(--linie-stark); border-radius: var(--r-marke); padding: 0 var(--s-1); }
.marke-klein--signal { color: var(--signal-text); border-color: var(--signal-text); }
.marke { width: 1.6em; height: 1.6em; flex: none; vertical-align: -.4em; margin-right: var(--s-1); }
.ikon { width: 1.25em; height: 1.25em; flex: none; }
.ikon-stern { width: 1em; height: 1em; }
.ikon-plus { width: 1em; height: 1em; }

/* Knöpfe */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--s-1); min-height: var(--s-6);
  padding: var(--s-1) var(--s-3); border-radius: var(--r-knopf); border: 1px solid transparent;
  font-family: var(--f-text); font-size: var(--t-basis); font-weight: var(--f-text-stark); line-height: 1.2; text-decoration: none; cursor: pointer;
  transition: background-color var(--m-kurz) ease, color var(--m-kurz) ease, border-color var(--m-kurz) ease; }
.btn-primary { background: var(--akzent); color: var(--auf-akzent); }
.btn-primary:hover { background: var(--akzent-tief); }
.btn-ghost { background: transparent; color: var(--text); border-color: var(--linie-stark); }
.btn-ghost:hover { color: var(--akzent-text); border-color: var(--akzent-text); }
.btn-ghost--tint { color: var(--auf-tint); border-color: var(--auf-tint-leise); }
.btn-ghost--tint:hover { color: var(--auf-tint); border-color: var(--auf-tint); }
.btn-klein { min-height: var(--s-5); padding: var(--s-halb) var(--s-2); font-size: var(--t-klein); }
.btn-block { width: 100%; }
.btn[disabled] { opacity: .5; cursor: not-allowed; }
.mini-add { display: inline-flex; align-items: center; justify-content: center; width: var(--s-5); height: var(--s-5); flex: none;
  border: 1px solid var(--linie-stark); border-radius: var(--r-knopf); background: transparent; color: var(--akzent-text); cursor: pointer;
  transition: background-color var(--m-kurz) ease, color var(--m-kurz) ease, border-color var(--m-kurz) ease; }
.mini-add:hover { background: var(--akzent); color: var(--auf-akzent); border-color: var(--akzent); }

/* Herkunft eines Bildes (eigenes Foto / KI-generiert / Platzhalter) */
figure { position: relative; }
.herkunft { position: absolute; left: var(--s-2); bottom: var(--s-2); font-size: var(--t-klein); font-weight: var(--f-text-stark);
  line-height: 1.3; padding: 0 var(--s-1); border-radius: var(--r-klein); background: var(--tint); color: var(--auf-tint); }
.herkunft--eigen { display: none; }

/* Kopfzeile */
.entwurf-hinweis { background: var(--tint); color: var(--auf-tint); font-size: var(--t-klein); text-align: center; padding: var(--s-1) var(--s-2); }
.kopfzeile { position: relative; z-index: 40; background: var(--grund); border-bottom: 1px solid var(--linie); }
.kopfzeile--fest { position: sticky; top: 0; }
.kopfzeile-innen { display: flex; align-items: center; gap: var(--s-4); min-height: var(--s-10); }
.marke-name { margin-right: auto; font-family: var(--f-display); font-weight: var(--f-display-gewicht); text-transform: var(--f-display-transform);
  letter-spacing: var(--f-display-sperrung); font-size: var(--t-gross); text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kopf-nav { display: none; gap: var(--s-4); }
.kopf-nav a { text-decoration: none; color: var(--text-leise); }
.kopf-nav a:hover { color: var(--text); }
.kopf-aktion { display: none; }
@media (min-width: 1024px) { .kopf-nav { display: flex; } }
@media (min-width: 768px) { .kopf-aktion { display: inline-flex; } }

/* Hero – gemeinsame Teile */
.hero { position: relative; }
.hero-bild { overflow: hidden; background: var(--flaeche-tief); border-radius: var(--r-bild); }
.hero-bild img, .hero-bild video { display: block; width: 100%; height: 100%; object-fit: cover; }
.hero h1 { font-size: var(--t-h1); }
.hero-claim { margin-top: var(--s-3); font-size: var(--t-gross); color: var(--text-leise); max-width: 44ch; }
.hero-aktionen { display: flex; flex-wrap: wrap; gap: var(--s-2); margin-top: var(--s-5); }
.bewertung { display: flex; align-items: center; flex-wrap: wrap; gap: var(--s-1); margin-top: var(--s-3); font-size: var(--t-klein); color: var(--text-leise); }
.bewertung strong { color: var(--text); }
.sterne { display: inline-flex; gap: var(--s-halb); color: var(--signal); }
.bewertung--tint { color: var(--auf-tint-leise); }
.bewertung--tint strong { color: var(--auf-tint); }
.bewertung--tint .sterne { color: var(--signal-auf-tint); }

/* spalte-bild: Textspalte links auf dem Grund, Bild randabfallend rechts */
.hero--spalte-bild { display: grid; grid-template-columns: 5fr 7fr; min-height: 80vh; }
.hero--spalte-bild .hero-text { align-self: end; padding: var(--s-12) var(--s-8) var(--s-10) max(var(--rand), calc((100vw - var(--max-breite)) / 2 + var(--rand))); }
.hero--spalte-bild .hero-bild { border-radius: 0; }

/* tafel: Vollbild, deckende Tafel unten links */
.hero--tafel { min-height: 88vh; display: grid; align-items: end; }
.hero--tafel > .hero-bild { position: absolute; inset: 0; border-radius: 0; }
.hero-tafel-rahmen { position: relative; padding-block: var(--s-8); }
.hero-tafel { max-width: 36rem; background: var(--tint); color: var(--auf-tint); padding: var(--s-6); border-radius: var(--r-karte); }
.hero-tafel h1 { color: var(--auf-tint); }
.hero-tafel .hero-claim { color: var(--auf-tint-leise); }

/* karte: Name links, Tagesempfehlung als Menütafel rechts */
.hero-karte-raster { display: grid; grid-template-columns: 7fr 5fr; gap: var(--s-10); align-items: center; padding-block: var(--s-12); }
.hero-menue { background: var(--flaeche); border: 1px solid var(--linie); border-radius: var(--r-karte); padding: var(--s-5); box-shadow: var(--schatten-karte); }
.hero-menue ol { list-style: none; margin: 0; padding: 0; }
.hero-menue li { display: flex; align-items: baseline; gap: var(--s-2); padding-block: var(--s-2); border-bottom: 1px solid var(--linie); }
.hero-einschub { margin-top: var(--s-4); aspect-ratio: 16 / 9; }
.menue-punkte { flex: 1; min-width: var(--s-2); border-bottom: 1px dotted var(--linie-stark); transform: translateY(-.3em); }
.menue-preis, .preis { font-family: var(--f-label); font-weight: var(--f-text-stark); white-space: nowrap; font-variant-numeric: tabular-nums; }

/* typo: übergroßer Name, darunter ein Bildband */
.hero-kopf { padding-block: var(--s-12) var(--s-6); }
.hero-name { font-size: var(--t-display); line-height: .95; max-width: 16ch; }
.hero--typo .hero-name { font-size: var(--t-display); }
.hero-zeile { display: grid; grid-template-columns: 5fr 4fr 3fr; gap: var(--s-4); align-items: end; margin-top: var(--s-6); padding-top: var(--s-3); border-top: 1px solid var(--linie); }
.hero-zeile .hero-claim, .hero-zeile .bewertung, .hero-zeile .hero-aktionen { margin-top: 0; }
.hero-zeile .hero-aktionen { justify-content: flex-end; }
.hero-band { aspect-ratio: 21 / 9; border-radius: 0; }

/* passepartout: Bild im Rahmen, Text überlappt versetzt */
.hero--passepartout { background: var(--flaeche-tief); padding-block: var(--s-8) var(--s-12); }
.hero-passepartout-raster { display: grid; grid-template-columns: repeat(12, 1fr); align-items: end; }
.hero-rahmen { grid-column: 1 / 9; grid-row: 1; aspect-ratio: 4 / 3; }
.hero-text--versetzt { grid-column: 7 / 13; grid-row: 1; position: relative; background: var(--grund); padding: var(--s-6); margin-bottom: calc(var(--s-8) * -1); border-radius: var(--r-karte); }

/* streifen: Text oben, drei ungleiche Bilder */
.hero--streifen { padding-block: var(--s-10) var(--s-6); }
.hero-text--breit { display: grid; grid-template-columns: 7fr 5fr; column-gap: var(--s-6); align-items: end; margin-bottom: var(--s-6); }
.hero-text--breit .rubrik, .hero-text--breit h1 { grid-column: 1; }
.hero-text--breit .hero-claim, .hero-text--breit .bewertung, .hero-text--breit .hero-aktionen { grid-column: 2; }
.hero-streifen { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: var(--s-2); height: 48vh; }

/* Leiste unter dem Hero */
.leiste { border-block: 1px solid var(--linie); background: var(--grund); }
.leiste-liste { list-style: none; margin-block: 0; display: flex; flex-wrap: wrap; gap: var(--s-2) var(--s-4); padding-block: var(--s-3); font-size: var(--t-klein); color: var(--text-leise); }
.leiste-liste li { display: inline-flex; align-items: center; gap: var(--s-1); }
.leiste-liste .ikon { color: var(--akzent-text); }
.leiste-note { color: var(--text); }
.leiste-note .ikon-stern { color: var(--signal); }
.leiste-hinweis { margin-left: auto; }

/* Highlights */
.gericht { display: flex; flex-direction: column; background: var(--flaeche); border-radius: var(--r-karte); overflow: hidden; box-shadow: var(--schatten-karte); }
.gericht-bild { aspect-ratio: 4 / 3; overflow: hidden; background: var(--flaeche-tief); }
.gericht-bild img { width: 100%; height: 100%; object-fit: cover; }
.gericht-text { display: flex; flex-direction: column; gap: var(--s-1); padding: var(--s-3); flex: 1; }
.gericht-kat { font-size: var(--t-klein); color: var(--text-leise); }
.gericht-desc { color: var(--text-leise); }
.gericht-fuss { display: flex; align-items: center; flex-wrap: wrap; gap: var(--s-2); margin-top: auto; padding-top: var(--s-2); }
.gericht-fuss .preis { margin-right: auto; font-size: var(--t-gross); }
.siegel { display: flex; align-items: center; font-size: var(--t-klein); font-weight: var(--f-text-stark); color: var(--signal-text); }
.rang { font-family: var(--f-label); font-size: var(--t-klein); color: var(--akzent-text); }

.treppe { display: grid; grid-template-columns: 7fr 5fr; gap: var(--rinne); align-items: start; }
.gericht--haupt h3 { font-size: var(--t-h2); }
.gericht--haupt .gericht-bild { aspect-ratio: 5 / 4; }
.treppe-rest { display: grid; gap: var(--rinne); padding-top: var(--s-12); }
.gericht--neben { flex-direction: row; }
.gericht--neben .gericht-bild { width: 40%; aspect-ratio: auto; }

.leseliste { display: grid; grid-template-columns: 5fr 7fr; gap: var(--s-8); align-items: start; }
.leseliste-zeilen { list-style: none; margin: 0; padding: 0; }
.leseliste-zeilen li { padding-block: var(--s-3); border-bottom: 1px solid var(--linie); }
.leseliste-zeilen li:first-child { border-top: 1px solid var(--linie); }
.zeile-kopf { display: flex; align-items: baseline; gap: var(--s-2); min-width: 0; }
.zeile-kopf .karten-name, .zeile-kopf h3 { min-width: 0; overflow-wrap: anywhere; }
.tafel-kategorie > *, .karte-liste > *, .karte-spalten > *, .leseliste > *, .treppe > *, .haus-raster > *, .stimmen > *, .reservierung-raster > *, .kontakt-raster > * { min-width: 0; }
.zeile-kopf h3 { font-size: var(--t-gross); }

.reihe { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s-2); }
.gericht--breit { grid-column: span 2; }
.gericht--reihe .gericht-text { padding: var(--s-2); }
.reihe--4 .gericht--breit { grid-column: span 1; }
.reihe--4 { grid-template-columns: 3fr 2fr 4fr 3fr; }

.ablauf { list-style: none; margin: var(--s-8) 0 0; padding: var(--s-3) 0 0; display: flex; flex-wrap: wrap; gap: var(--s-2) var(--s-6); border-top: 1px solid var(--linie); color: var(--text-leise); }
.ablauf li { display: flex; gap: var(--s-1); align-items: baseline; }
.ablauf strong { color: var(--text); font-weight: var(--f-text-stark); }
.ablauf-n { font-family: var(--f-label); color: var(--akzent-text); }

/* Speisekarte */
.karten-liste { list-style: none; margin: 0; padding: 0; }
.karten-zeile { padding-block: var(--s-2); border-bottom: 1px solid var(--linie); }
.karten-name { font-weight: var(--f-text-stark); }
.karten-zeile .gericht-desc { margin-top: var(--s-halb); padding-right: var(--s-6); }
.karte-tafel { display: grid; gap: var(--s-8); }
.tafel-kategorie { display: grid; grid-template-columns: 4fr 8fr; gap: var(--rinne); align-items: start; }
.tafel-name { position: sticky; top: var(--s-12); font-size: var(--t-h3); }
.karte-spalten { columns: 2; column-gap: var(--s-8); }
.karten-kategorie { break-inside: avoid; margin-bottom: var(--s-6); }
.karten-kategorie h3 { font-size: var(--t-h3); margin-bottom: var(--s-2); }
.karten-kategorie .anzahl { font-family: var(--f-text); font-size: var(--t-klein); font-weight: 400; color: var(--text-leise); text-transform: none; letter-spacing: 0; }
.karten-sprung { display: flex; flex-wrap: wrap; gap: var(--s-1); margin-bottom: var(--s-6); }
.karten-sprung a { text-decoration: none; padding: var(--s-halb) var(--s-2); border: 1px solid var(--linie-stark); border-radius: var(--r-knopf); font-size: var(--t-klein); }
.karten-sprung a:hover { border-color: var(--akzent-text); color: var(--akzent-text); }
.karte-liste { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--s-4) var(--s-8); }

/* Haus */
.haus-raster { display: grid; grid-template-columns: 4fr 8fr; gap: var(--s-8); align-items: start; }
.haus-text { position: sticky; top: var(--s-12); }
.haus-fotos { display: grid; grid-template-columns: 3fr 2fr; grid-template-rows: auto auto; gap: var(--s-2); }
.haus-foto { display: flex; flex-direction: column; gap: var(--s-1); }
.haus-foto img { width: 100%; object-fit: cover; border-radius: var(--r-bild); background: var(--flaeche-tief); }
.haus-foto--hoch { grid-row: span 2; }
.haus-foto--hoch img { aspect-ratio: 3 / 4; }
.haus-foto--quer img, .haus-foto--klein img { aspect-ratio: 4 / 3; }
.haus-foto figcaption { font-size: var(--t-klein); color: var(--text-leise); }
.haus-foto figcaption strong { display: block; color: var(--text); font-family: var(--f-display); font-weight: var(--f-display-gewicht); font-size: var(--t-basis); }
.haus-foto .herkunft { top: var(--s-2); bottom: auto; }
.haus-foto--hoch img { height: 100%; }

/* Stimmen */
.stimmen { display: grid; grid-template-columns: 4fr 8fr; gap: var(--s-8); align-items: start; }
.stimmen-note { display: flex; flex-direction: column; gap: var(--s-1); margin-top: var(--s-4); color: var(--text-leise); font-size: var(--t-klein); }
.note-zahl { font-family: var(--f-display); font-size: var(--t-h1); line-height: 1; color: var(--text); }
.stimmen-liste { list-style: none; margin: 0; padding: 0; }
.stimme { padding-block: var(--s-4); border-bottom: 1px solid var(--linie); }
.stimme blockquote { margin: 0; font-size: var(--t-gross); }
.stimme--gross blockquote { font-family: var(--f-display); font-size: var(--t-h3); line-height: 1.3; }
.stimme-quelle { margin-top: var(--s-1); font-size: var(--t-klein); color: var(--text-leise); }
.stimme-titel { font-family: var(--f-display); font-size: var(--t-gross); }
.stimme--platzhalter { color: var(--text-leise); }
.stimmen--zeilen { grid-template-columns: 1fr; }

/* Reservierung */
.reservierung-raster { display: grid; grid-template-columns: 5fr 7fr; gap: var(--s-8); align-items: start; }
.pluspunkte { list-style: none; margin: var(--s-4) 0 0; padding: 0; }
.pluspunkte li { display: flex; gap: var(--s-2); padding-block: var(--s-1); color: var(--text-leise); }
.pluspunkte .ikon { color: var(--akzent-text); }
.formular { background: var(--flaeche); border: 1px solid var(--linie); border-radius: var(--r-karte); padding: var(--s-5); }
.reservierung--betont .formular { box-shadow: var(--schatten-schwebend); }
.formular-absenden { margin-top: var(--s-3); }
.field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-3) var(--s-2); }
.field-grid--eins { grid-template-columns: 1fr; }
.field { display: flex; flex-direction: column; gap: var(--s-1); }
.field-wide { grid-column: 1 / -1; }
label { font-size: var(--t-klein); font-weight: var(--f-text-stark); color: var(--text); }
.hint { font-size: var(--t-klein); font-weight: 400; color: var(--text-leise); }
input, select, textarea { width: 100%; font-family: var(--f-text); font-size: var(--t-basis); color: var(--text); background: var(--grund);
  border: 1px solid var(--linie-stark); border-radius: var(--r-knopf); padding: var(--s-1) var(--s-2); min-height: var(--s-6);
  transition: border-color var(--m-kurz) ease; }
input:focus, select:focus, textarea:focus { outline: 2px solid var(--akzent-text); outline-offset: 0; border-color: var(--akzent-text); }
textarea { min-height: var(--s-12); resize: vertical; }
.error { display: none; font-size: var(--t-klein); color: var(--fehler); }
.field.invalid .error { display: block; }
.field.invalid input, .field.invalid select { border-color: var(--fehler); }
#ord-noshow-feld { margin-top: var(--s-2); }
.noshow-label { display: flex; gap: var(--s-1); align-items: flex-start; font-weight: 400; }
.noshow-label input { width: auto; min-height: 0; margin-top: var(--s-halb); }

/* Kontakt */
.kontakt-raster { display: grid; grid-template-columns: 7fr 5fr; gap: var(--s-8); align-items: start; }
.kontakt-titel { font-size: var(--t-h2); }
.kontakt-ort { display: block; font-family: var(--f-text); font-size: var(--t-gross); font-weight: 400; color: var(--text-leise); text-transform: none; letter-spacing: 0; margin-top: var(--s-1); }
.kontakt-liste { list-style: none; margin: var(--s-4) 0 0; padding: 0; }
.kontakt-liste li { display: flex; gap: var(--s-2); padding-block: var(--s-2); border-bottom: 1px solid var(--linie); }
.kontakt-liste .k { color: var(--akzent-text); }
.kontakt-liste a { color: var(--akzent-text); }
.zeiten h3 { font-size: var(--t-gross); margin-bottom: var(--s-2); }
.zeiten-zeile { display: flex; justify-content: space-between; gap: var(--s-3); padding-block: var(--s-1); border-bottom: 1px solid var(--linie); }
.zeiten-zeile span:first-child { color: var(--text-leise); }

/* Fußzeile */
.fuss { background: var(--tint); color: var(--auf-tint-leise); padding-block: var(--s-10) var(--s-6); font-size: var(--t-klein); }
.fuss-raster { display: grid; grid-template-columns: 5fr 3fr 4fr; gap: var(--s-4); }
.fuss strong { display: flex; align-items: center; color: var(--auf-tint); font-family: var(--f-display); font-weight: var(--f-display-gewicht); font-size: var(--t-gross); }
.fuss-haus p { margin-top: var(--s-1); }
.fuss-nav, .fuss-kontakt { display: flex; flex-direction: column; gap: var(--s-1); }
.fuss a { color: var(--auf-tint-leise); text-decoration: none; }
.fuss a:hover { color: var(--auf-tint); }
.fuss-hinweis { grid-column: 1 / -1; margin-top: var(--s-4); padding-top: var(--s-3); border-top: 1px solid var(--auf-tint-leise); max-width: 90ch; }

/* Bestellweg: Warenkorb-Knopf, Aktionsleiste, Drawer, Bestätigung */
.cart-fab { position: fixed; right: var(--s-3); bottom: var(--s-3); z-index: 50; display: none; align-items: center; gap: var(--s-2);
  padding: var(--s-2) var(--s-3); border: 0; border-radius: var(--r-knopf); background: var(--akzent); color: var(--auf-akzent);
  font-family: var(--f-text); font-weight: var(--f-text-stark); cursor: pointer; box-shadow: var(--schatten-schwebend); }
.cart-fab.visible { display: inline-flex; }
.cart-count { font-variant-numeric: tabular-nums; }
.mobilebar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 55; display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-1);
  padding: var(--s-1) var(--s-2); background: var(--flaeche); border-top: 1px solid var(--linie); }
@media (min-width: 1024px) { .mobilebar { display: none; } }
@media (max-width: 1023px) { .cart-fab, .cart-fab.visible { display: none; } body { padding-bottom: var(--s-8); } }
.overlay { position: fixed; inset: 0; z-index: 60; background: var(--tint); opacity: 0; pointer-events: none; transition: opacity var(--m-mittel) ease; }
.overlay.open { opacity: .6; pointer-events: auto; }
.drawer { position: fixed; top: 0; right: 0; bottom: 0; z-index: 70; width: min(30rem, 100%); background: var(--grund); display: flex; flex-direction: column;
  transform: translateX(100%); transition: transform var(--m-mittel) var(--m-kurve); }
.drawer.open { transform: none; }
.drawer-head { display: flex; align-items: center; justify-content: space-between; padding: var(--s-3); border-bottom: 1px solid var(--linie); }
.drawer-head h3 { font-size: var(--t-h3); }
.icon-btn { border: 0; background: transparent; color: var(--text-leise); font-size: var(--t-h3); line-height: 1; cursor: pointer; padding: var(--s-halb) var(--s-1); }
.drawer-body { flex: 1; overflow-y: auto; padding: var(--s-3); }
.drawer-foot { margin: var(--s-3) calc(var(--s-3) * -1) calc(var(--s-3) * -1); padding: var(--s-3); background: var(--flaeche); border-top: 1px solid var(--linie); }
.drawer-hinweis { margin-top: var(--s-1); text-align: center; }
.totals { display: flex; justify-content: space-between; margin-bottom: var(--s-2); font-family: var(--f-display); font-size: var(--t-h3); }
.cart-line { display: flex; align-items: center; gap: var(--s-2); padding-block: var(--s-2); border-bottom: 1px solid var(--linie); }
.cart-line-body { flex: 1; min-width: 0; }
.cart-line-name { font-weight: var(--f-text-stark); }
.cart-line-price { font-size: var(--t-klein); color: var(--text-leise); }
.qty { display: flex; align-items: center; gap: var(--s-halb); }
.qty button { width: var(--s-4); height: var(--s-4); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--flaeche); color: var(--akzent-text); cursor: pointer; }
.qty span { min-width: var(--s-3); text-align: center; font-weight: var(--f-text-stark); }
.cart-empty { text-align: center; color: var(--text-leise); padding: var(--s-5) var(--s-1); }
.confirm-box { position: fixed; z-index: 80; left: 50%; top: 50%; width: min(30rem, calc(100% - var(--s-4))); max-height: 86vh; overflow-y: auto;
  transform: translate(-50%, -46%); opacity: 0; pointer-events: none; background: var(--flaeche); border: 1px solid var(--linie);
  border-radius: var(--r-karte); padding: var(--s-5) var(--s-4); text-align: center; transition: opacity var(--m-mittel) ease, transform var(--m-mittel) var(--m-kurve); }
.confirm-box.open { opacity: 1; pointer-events: auto; transform: translate(-50%, -50%); }
.confirm-icon { display: grid; place-items: center; width: var(--s-8); height: var(--s-8); margin: 0 auto var(--s-2); border-radius: var(--r-marke); background: var(--akzent); color: var(--auf-akzent); }
.confirm-icon svg { width: var(--s-4); height: var(--s-4); }
.confirm-icon .ci-fehler { display: none; }
.confirm-box.hat-fehler .confirm-icon { background: var(--fehler); color: var(--flaeche); }
.confirm-box.hat-fehler .ci-ok { display: none; }
.confirm-box.hat-fehler .ci-fehler { display: grid; }
.confirm-box.hat-fehler .confirm-summary { display: none; }
.confirm-box h3 { font-size: var(--t-h3); margin-bottom: var(--s-1); }
.confirm-summary { margin: var(--s-3) 0; padding: var(--s-2); text-align: left; background: var(--flaeche-tief); border-radius: var(--r-klein); }
.confirm-summary div { display: flex; justify-content: space-between; gap: var(--s-2); }
.confirm-summary .label { color: var(--text-leise); }
#confirm-close { margin-top: var(--s-2); }
.demo-note { margin-top: var(--s-2); font-size: var(--t-klein); color: var(--text-leise); }

/* Abend: die Reservierung ist der eine starke Moment */
.a-abend .reservierung--betont { background: var(--flaeche); border-block: 1px solid var(--linie); }
.a-abend .reservierung--betont h2 { font-size: var(--t-h1); }

/* Mobil */
@media (max-width: 1023px) {
  .hero--spalte-bild, .hero-karte-raster, .treppe, .leseliste, .haus-raster, .stimmen, .reservierung-raster, .kontakt-raster, .tafel-kategorie { grid-template-columns: minmax(0, 1fr); }
  .hero--spalte-bild .hero-bild { order: -1; aspect-ratio: 4 / 3; }
  .hero--spalte-bild .hero-text { padding: var(--s-5) var(--rand) var(--s-8); }
  .hero-zeile, .hero-text--breit { grid-template-columns: 1fr; row-gap: var(--s-2); }
  .hero-text--breit .hero-claim, .hero-text--breit .bewertung, .hero-text--breit .hero-aktionen { grid-column: 1; }
  .hero-zeile .hero-aktionen { justify-content: flex-start; }
  .hero-passepartout-raster { display: block; }
  .hero-text--versetzt { margin: calc(var(--s-5) * -1) var(--s-2) 0; }
  .treppe-rest { padding-top: 0; }
  .haus-text, .tafel-name { position: static; }
  .reihe, .reihe--4 { grid-template-columns: 1fr 1fr; }
  .gericht--breit { grid-column: span 2; }
  .reihe--4 .gericht--breit { grid-column: span 2; }
  .karte-spalten { columns: 1; }
  .karte-liste { grid-template-columns: 1fr; }
  .sektion-kopf--seitlich { grid-template-columns: 1fr; gap: 0; }
  .fuss-raster { grid-template-columns: 1fr; }
}
@media (max-width: 767px) {
  .hero--tafel { min-height: 0; display: block; }
  .hero--tafel > .hero-bild { position: relative; aspect-ratio: 4 / 5; }
  .hero-tafel-rahmen { padding: 0; }
  .hero-tafel { max-width: none; border-radius: 0; }
  .hero-streifen { grid-template-columns: 1fr 1fr; height: auto; }
  .hero-streifen .s-gross { grid-column: 1 / -1; aspect-ratio: 4 / 3; }
  .hero-streifen .s-mittel, .hero-streifen .s-klein { aspect-ratio: 1; }
  .gericht--neben { flex-direction: column; }
  .gericht--neben .gericht-bild { width: 100%; aspect-ratio: 4 / 3; }
  .field-grid { grid-template-columns: 1fr; }
  .haus-fotos { grid-template-columns: 1fr 1fr; }
  .haus-foto--hoch { grid-column: 1 / -1; grid-row: auto; }
  .haus-foto--hoch img { aspect-ratio: 4 / 3; }
  .leiste-hinweis { margin-left: 0; }
}
`;
