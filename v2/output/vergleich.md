# Vorher/Nachher: v1 ↔ v2

Erzeugt mit `npm run v2:vergleich`. Links v1 (`src/landingPageGenerator.js`), rechts v2
(`v2/output/sites/`), gleicher synthetischer Test-Lead, gleiche Küche und Stimmung. Aufnahme:
erster Bildschirm, Desktop 1440×900 und Mobil 390×844 (verkleinert), Bewegung aus.

Die Noten stammen vom Design-Judge (`v2/judge/designJudge.js`), angewandt auf **beide**
Seiten mit denselben Regeln. Farben und Schriften von v1 werden gegen die **eigene** v1-Palette
gemessen, nicht gegen die v2-Palette. Raster, Kontrast, Touch-Ziele und verbotene Muster
gelten für beide gleich. Für v1 ist das streng, weil v1 nie gegen diese Regeln gebaut wurde.
Die Noten zeigen, *welche* Regeln v2 zusätzlich einhält, und sind kein Geschmacksurteil über v1.
Grenze der Messung: Kontrast wird gegen den ersten deckenden Hintergrund gemessen. Heller
Text auf einem Foto (v1-Hero, v1-Navigation über dem Foto) zählt deshalb als Kontrastfehler,
auch wenn ein dunkler Schleier ihn im Bild lesbar macht. v2 setzt keinen Text auf Fotos.

## Überblick

| | v1 | v2 |
|---|---|---|
| Mittlere Judge-Note | 6.0 | 10.0 |
| Judge bestanden | 0 / 36 | 36 / 36 |

| Kombination | Hero v2 | Farbe v1→v2 | Typo v1→v2 | Rhythmus v1→v2 | Bild v1→v2 | Muster v1→v2 | Mittel v1→v2 |
|---|---|---|---|---|---|---|---|
| [Bayerisch · Wirtshaus](#bayerisch--wirtshaus) | passepartout | 2→10 | 10→10 | 6→10 | 10→10 | 0→10 | 5.6 ✗→10.0 |
| [Bayerisch · Kellerstube](#bayerisch--kellerstube) | passepartout | 8.5→10 | 10→10 | 6→10 | 7.5→10 | 0→10 | 6.4 ✗→10.0 |
| [Bayerisch · Biergarten](#bayerisch--biergarten) | streifen | 2→10 | 10→10 | 8→10 | 9→10 | 0→10 | 5.8 ✗→10.0 |
| [Italienisch · Trattoria](#italienisch--trattoria) | tafel | 3.5→10 | 10→10 | 6→10 | 10→10 | 0→10 | 5.9 ✗→10.0 |
| [Italienisch · Osteria Notte](#italienisch--osteria-notte) | spalte-bild | 10→10 | 10→10 | 6→10 | 4→10 | 0→10 | 6.0 ✗→10.0 |
| [Italienisch · Costiera](#italienisch--costiera) | streifen | 3.5→10 | 10→10 | 8→10 | 9→10 | 0→10 | 6.1 ✗→10.0 |
| [Griechisch · Taverne am Hafen](#griechisch--taverne-am-hafen) | tafel | 3.5→10 | 10→10 | 6→10 | 10→10 | 0→10 | 5.9 ✗→10.0 |
| [Griechisch · Athener Moderne](#griechisch--athener-moderne) | tafel | 8.5→10 | 10→10 | 6→10 | 4.5→10 | 0→10 | 5.8 ✗→10.0 |
| [Griechisch · Olivenhain](#griechisch--olivenhain) | streifen | 3.5→10 | 10→10 | 8→10 | 9→10 | 0→10 | 6.1 ✗→10.0 |
| [Türkisch · Basar](#tuerkisch--basar) | passepartout | 3.5→10 | 10→10 | 6→10 | 10→10 | 0→10 | 5.9 ✗→10.0 |
| [Türkisch · Bosporus bei Nacht](#tuerkisch--bosporus-nacht) | spalte-bild | 10→10 | 10→10 | 6→10 | 4.5→10 | 0→10 | 6.1 ✗→10.0 |
| [Türkisch · Anatolische Erde](#tuerkisch--anatolische-erde) | streifen | 3.5→10 | 10→10 | 4→10 | 9→10 | 0→10 | 5.3 ✗→10.0 |
| [Syrisch · Damaszener Hof](#syrisch--damaszener-hof) | tafel | 3.5→10 | 10→10 | 6→10 | 10→10 | 0→10 | 5.9 ✗→10.0 |
| [Syrisch · Gewürzbasar](#syrisch--gewuerzbasar) | typo | 8.5→10 | 10→10 | 6→10 | 4.5→10 | 0→10 | 5.8 ✗→10.0 |
| [Syrisch · Levante Modern](#syrisch--levante-modern) | typo | 3.5→10 | 10→10 | 8→10 | 9→10 | 0→10 | 6.1 ✗→10.0 |
| [Chinesisch · Rote Laterne](#chinesisch--rote-laterne) | tafel | 3.5→10 | 10→10 | 6→10 | 10→10 | 0→10 | 5.9 ✗→10.0 |
| [Chinesisch · Shanghai Nacht](#chinesisch--shanghai-nacht) | spalte-bild | 10→10 | 10→10 | 6→10 | 7.5→10 | 0→10 | 6.7 ✗→10.0 |
| [Chinesisch · Teehaus](#chinesisch--teehaus) | spalte-bild | 3.5→10 | 10→10 | 8→10 | 9→10 | 0→10 | 6.1 ✗→10.0 |
| [Thailändisch · Orchidee](#thailaendisch--orchidee) | spalte-bild | 3.5→10 | 10→10 | 6→10 | 10→10 | 0→10 | 5.9 ✗→10.0 |
| [Thailändisch · Streetfood Nacht](#thailaendisch--streetfood-nacht) | tafel | 8.5→10 | 10→10 | 6→10 | 4.5→10 | 0→10 | 5.8 ✗→10.0 |
| [Thailändisch · Andamanen](#thailaendisch--andamanen) | typo | 3.5→10 | 10→10 | 8→10 | 9→10 | 0→10 | 6.1 ✗→10.0 |
| [Vietnamesisch · Indochine](#vietnamesisch--indochine) | karte | 3.5→10 | 10→10 | 6→10 | 10→7 | 0→10 | 5.9 ✗→9.4 |
| [Vietnamesisch · Hanoi Nacht](#vietnamesisch--hanoi-nacht) | tafel | 8.5→10 | 10→10 | 6→10 | 4.5→10 | 0→10 | 5.8 ✗→10.0 |
| [Vietnamesisch · Straßenküche](#vietnamesisch--strassenkueche) | typo | 3.5→10 | 10→10 | 8→10 | 9→10 | 0→10 | 6.1 ✗→10.0 |
| [Japanisch · Izakaya](#japanisch--izakaya) | spalte-bild | 10→10 | 10→10 | 6→10 | 10→10 | 0→10 | 7.2 ✗→10.0 |
| [Japanisch · Omakase](#japanisch--omakase) | spalte-bild | 7→10 | 10→10 | 6→10 | 9→10 | 0→10 | 6.4 ✗→10.0 |
| [Japanisch · Washitsu](#japanisch--washitsu) | streifen | 3.5→10 | 10→10 | 8→10 | 9→10 | 0→10 | 6.1 ✗→10.0 |
| [Indisch · Gewürzmarkt](#indisch--gewuerzmarkt) | spalte-bild | 3.5→10 | 10→10 | 6→10 | 10→10 | 0→10 | 5.9 ✗→10.0 |
| [Indisch · Maharadscha](#indisch--maharadscha) | typo | 10→10 | 10→10 | 6→10 | 4.5→10 | 0→10 | 6.1 ✗→10.0 |
| [Indisch · Südindisch hell](#indisch--suedindisch-hell) | streifen | 3.5→10 | 10→10 | 8→10 | 9→10 | 0→10 | 6.1 ✗→10.0 |
| [Asiatisch (gemischt) · Marktstand](#asiatisch--marktstand) | karte | 3.5→10 | 10→10 | 6→10 | 10→7 | 0→10 | 5.9 ✗→9.4 |
| [Asiatisch (gemischt) · Neon](#asiatisch--neon) | spalte-bild | 10→10 | 10→10 | 6→10 | 4→10 | 0→10 | 6.0 ✗→10.0 |
| [Asiatisch (gemischt) · Fusion Minimal](#asiatisch--fusion-minimal) | spalte-bild | 3.5→10 | 10→10 | 8→10 | 9→10 | 0→10 | 6.1 ✗→10.0 |
| [Café · Wiener Kaffeehaus](#cafe--wiener-kaffeehaus) | passepartout | 3.5→10 | 10→10 | 6→10 | 10→10 | 0→10 | 5.9 ✗→10.0 |
| [Café · Konditorei](#cafe--konditorei) | spalte-bild | 5→10 | 10→10 | 6→10 | 6→10 | 0→10 | 5.4 ✗→10.0 |
| [Café · Third Wave](#cafe--third-wave) | streifen | 3.5→10 | 10→10 | 8→10 | 9→10 | 0→10 | 6.1 ✗→10.0 |

## Alle 36 Kombinationen

<a id="bayerisch--wirtshaus"></a>
### Bayerisch · Wirtshaus

v2: Traditionell, Vollkorn / Alegreya Sans, Hero „passepartout“, Akzent `#3f5d3a`. Judge v1 5.6 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/bayerisch--wirtshaus--v1-desktop.jpg) | ![v2 Desktop](vergleich/bayerisch--wirtshaus--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/bayerisch--wirtshaus--v1-mobil.jpg) | ![v2 Mobil](vergleich/bayerisch--wirtshaus--v2-mobil.jpg) |

Judge-Befunde v1:
  - 2 Farbe(n) außerhalb der Palette: rgb(253,243,214), rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.04:1, „Speisekarte“ 1.04:1, „Reservierung“ 1.04:1
  - 3 Sektion(en) mit Abstand außerhalb der Skala
  - 15 Bedienelement(e) auf dem Handy unter 40px Höhe

<a id="bayerisch--kellerstube"></a>
### Bayerisch · Kellerstube

v2: Abend, Young Serif / Alegreya Sans, Hero „passepartout“, Akzent `#9b4d37`. Judge v1 6.4 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/bayerisch--kellerstube--v1-desktop.jpg) | ![v2 Desktop](vergleich/bayerisch--kellerstube--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/bayerisch--kellerstube--v1-mobil.jpg) | ![v2 Mobil](vergleich/bayerisch--kellerstube--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(253,243,214)
  - 5 Sektion(en) mit Abstand außerhalb der Skala
  - 15 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 1 Bild(er) nicht geladen

<a id="bayerisch--biergarten"></a>
### Bayerisch · Biergarten

v2: Hell & modern, Fraunces / Figtree, Hero „streifen“, Akzent `#749841`. Judge v1 5.8 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/bayerisch--biergarten--v1-desktop.jpg) | ![v2 Desktop](vergleich/bayerisch--biergarten--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/bayerisch--biergarten--v1-mobil.jpg) | ![v2 Mobil](vergleich/bayerisch--biergarten--v2-mobil.jpg) |

Judge-Befunde v1:
  - 2 Farbe(n) außerhalb der Palette: rgb(253,243,214), rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.03:1, „Speisekarte“ 1.03:1, „Reservierung“ 1.03:1
  - 15 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 1 Bild(er) hochskaliert (unscharf)

<a id="italienisch--trattoria"></a>
### Italienisch · Trattoria

v2: Traditionell, EB Garamond / Karla, Hero „tafel“, Akzent `#a43d1e`. Judge v1 5.9 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/italienisch--trattoria--v1-desktop.jpg) | ![v2 Desktop](vergleich/italienisch--trattoria--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/italienisch--trattoria--v1-mobil.jpg) | ![v2 Mobil](vergleich/italienisch--trattoria--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.04:1, „Speisekarte“ 1.04:1, „Reservierung“ 1.04:1
  - 3 Sektion(en) mit Abstand außerhalb der Skala
  - 19 Bedienelement(e) auf dem Handy unter 40px Höhe

<a id="italienisch--osteria-notte"></a>
### Italienisch · Osteria Notte

v2: Abend, Bodoni Moda / Instrument Sans, Hero „spalte-bild“, Akzent `#ab3946`. Judge v1 6.0 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/italienisch--osteria-notte--v1-desktop.jpg) | ![v2 Desktop](vergleich/italienisch--osteria-notte--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/italienisch--osteria-notte--v1-mobil.jpg) | ![v2 Mobil](vergleich/italienisch--osteria-notte--v2-mobil.jpg) |

Judge-Befunde v1:
  - 5 Sektion(en) mit Abstand außerhalb der Skala
  - 19 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 5 Bild(er) nicht geladen
  - 1 Bild(er) hochskaliert (unscharf)

<a id="italienisch--costiera"></a>
### Italienisch · Costiera

v2: Hell & modern, Italiana / Figtree, Hero „streifen“, Akzent `#356d8d`. Judge v1 6.1 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/italienisch--costiera--v1-desktop.jpg) | ![v2 Desktop](vergleich/italienisch--costiera--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/italienisch--costiera--v1-mobil.jpg) | ![v2 Mobil](vergleich/italienisch--costiera--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.03:1, „Speisekarte“ 1.03:1, „Reservierung“ 1.03:1
  - 15 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 1 Bild(er) hochskaliert (unscharf)

<a id="griechisch--taverne-am-hafen"></a>
### Griechisch · Taverne am Hafen

v2: Traditionell, Marcellus / Hanken Grotesk, Hero „tafel“, Akzent `#237793`. Judge v1 5.9 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/griechisch--taverne-am-hafen--v1-desktop.jpg) | ![v2 Desktop](vergleich/griechisch--taverne-am-hafen--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/griechisch--taverne-am-hafen--v1-mobil.jpg) | ![v2 Mobil](vergleich/griechisch--taverne-am-hafen--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.03:1, „Speisekarte“ 1.03:1, „Reservierung“ 1.03:1
  - 3 Sektion(en) mit Abstand außerhalb der Skala
  - 13 Bedienelement(e) auf dem Handy unter 40px Höhe

<a id="griechisch--athener-moderne"></a>
### Griechisch · Athener Moderne

v2: Abend, Tenor Sans / Instrument Sans, Hero „tafel“, Akzent `#bd9d44`. Judge v1 5.8 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/griechisch--athener-moderne--v1-desktop.jpg) | ![v2 Desktop](vergleich/griechisch--athener-moderne--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/griechisch--athener-moderne--v1-mobil.jpg) | ![v2 Mobil](vergleich/griechisch--athener-moderne--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(255,255,255)
  - 5 Sektion(en) mit Abstand außerhalb der Skala
  - 13 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 3 Bild(er) nicht geladen

<a id="griechisch--olivenhain"></a>
### Griechisch · Olivenhain

v2: Hell & modern, Cormorant Garamond / Work Sans, Hero „streifen“, Akzent `#799553`. Judge v1 6.1 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/griechisch--olivenhain--v1-desktop.jpg) | ![v2 Desktop](vergleich/griechisch--olivenhain--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/griechisch--olivenhain--v1-mobil.jpg) | ![v2 Mobil](vergleich/griechisch--olivenhain--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.04:1, „Speisekarte“ 1.04:1, „Reservierung“ 1.04:1
  - 13 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 1 Bild(er) hochskaliert (unscharf)

<a id="tuerkisch--basar"></a>
### Türkisch · Basar

v2: Traditionell, Barlow Condensed / Work Sans, Hero „passepartout“, Akzent `#c13c2e`. Judge v1 5.9 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/tuerkisch--basar--v1-desktop.jpg) | ![v2 Desktop](vergleich/tuerkisch--basar--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/tuerkisch--basar--v1-mobil.jpg) | ![v2 Mobil](vergleich/tuerkisch--basar--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.03:1, „Speisekarte“ 1.03:1, „Reservierung“ 1.03:1
  - 3 Sektion(en) mit Abstand außerhalb der Skala
  - 15 Bedienelement(e) auf dem Handy unter 40px Höhe

<a id="tuerkisch--bosporus-nacht"></a>
### Türkisch · Bosporus bei Nacht

v2: Abend, Gloock / Instrument Sans, Hero „spalte-bild“, Akzent `#347878`. Judge v1 6.1 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/tuerkisch--bosporus-nacht--v1-desktop.jpg) | ![v2 Desktop](vergleich/tuerkisch--bosporus-nacht--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/tuerkisch--bosporus-nacht--v1-mobil.jpg) | ![v2 Mobil](vergleich/tuerkisch--bosporus-nacht--v2-mobil.jpg) |

Judge-Befunde v1:
  - 5 Sektion(en) mit Abstand außerhalb der Skala
  - 15 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 3 Bild(er) nicht geladen
  - 1 Bild(er) hochskaliert (unscharf)

<a id="tuerkisch--anatolische-erde"></a>
### Türkisch · Anatolische Erde

v2: Hell & modern, Alegreya / Alegreya Sans, Hero „streifen“, Akzent `#a3663d`. Judge v1 5.3 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/tuerkisch--anatolische-erde--v1-desktop.jpg) | ![v2 Desktop](vergleich/tuerkisch--anatolische-erde--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/tuerkisch--anatolische-erde--v1-mobil.jpg) | ![v2 Mobil](vergleich/tuerkisch--anatolische-erde--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.03:1, „Speisekarte“ 1.03:1, „Reservierung“ 1.03:1
  - Horizontaler Überlauf auf dem Handy
  - 15 Bedienelement(e) auf dem Handy unter 40px Höhe

<a id="syrisch--damaszener-hof"></a>
### Syrisch · Damaszener Hof

v2: Traditionell, Amiri / Karla, Hero „tafel“, Akzent `#3c8369`. Judge v1 5.9 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/syrisch--damaszener-hof--v1-desktop.jpg) | ![v2 Desktop](vergleich/syrisch--damaszener-hof--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/syrisch--damaszener-hof--v1-mobil.jpg) | ![v2 Mobil](vergleich/syrisch--damaszener-hof--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.03:1, „Speisekarte“ 1.03:1, „Reservierung“ 1.03:1
  - 3 Sektion(en) mit Abstand außerhalb der Skala
  - 15 Bedienelement(e) auf dem Handy unter 40px Höhe

<a id="syrisch--gewuerzbasar"></a>
### Syrisch · Gewürzbasar

v2: Abend, Reem Kufi / Instrument Sans, Hero „typo“, Akzent `#cd8226`. Judge v1 5.8 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/syrisch--gewuerzbasar--v1-desktop.jpg) | ![v2 Desktop](vergleich/syrisch--gewuerzbasar--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/syrisch--gewuerzbasar--v1-mobil.jpg) | ![v2 Mobil](vergleich/syrisch--gewuerzbasar--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(255,255,255)
  - 5 Sektion(en) mit Abstand außerhalb der Skala
  - 15 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 3 Bild(er) nicht geladen

<a id="syrisch--levante-modern"></a>
### Syrisch · Levante Modern

v2: Hell & modern, Libre Caslon Display / Figtree, Hero „typo“, Akzent `#836947`. Judge v1 6.1 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/syrisch--levante-modern--v1-desktop.jpg) | ![v2 Desktop](vergleich/syrisch--levante-modern--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/syrisch--levante-modern--v1-mobil.jpg) | ![v2 Mobil](vergleich/syrisch--levante-modern--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.03:1, „Speisekarte“ 1.03:1, „Reservierung“ 1.03:1
  - 15 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 1 Bild(er) hochskaliert (unscharf)

<a id="chinesisch--rote-laterne"></a>
### Chinesisch · Rote Laterne

v2: Traditionell, Noto Serif Display / Libre Franklin, Hero „tafel“, Akzent `#b82626`. Judge v1 5.9 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/chinesisch--rote-laterne--v1-desktop.jpg) | ![v2 Desktop](vergleich/chinesisch--rote-laterne--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/chinesisch--rote-laterne--v1-mobil.jpg) | ![v2 Mobil](vergleich/chinesisch--rote-laterne--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.04:1, „Speisekarte“ 1.04:1, „Reservierung“ 1.04:1
  - 3 Sektion(en) mit Abstand außerhalb der Skala
  - 15 Bedienelement(e) auf dem Handy unter 40px Höhe

<a id="chinesisch--shanghai-nacht"></a>
### Chinesisch · Shanghai Nacht

v2: Abend, Poiret One / Instrument Sans, Hero „spalte-bild“, Akzent `#d53c42`. Judge v1 6.7 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/chinesisch--shanghai-nacht--v1-desktop.jpg) | ![v2 Desktop](vergleich/chinesisch--shanghai-nacht--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/chinesisch--shanghai-nacht--v1-mobil.jpg) | ![v2 Mobil](vergleich/chinesisch--shanghai-nacht--v2-mobil.jpg) |

Judge-Befunde v1:
  - 5 Sektion(en) mit Abstand außerhalb der Skala
  - 15 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 1 Bild(er) nicht geladen
  - 1 Bild(er) hochskaliert (unscharf)

<a id="chinesisch--teehaus"></a>
### Chinesisch · Teehaus

v2: Hell & modern, Gilda Display / Zen Kaku Gothic New, Hero „spalte-bild“, Akzent `#457768`. Judge v1 6.1 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/chinesisch--teehaus--v1-desktop.jpg) | ![v2 Desktop](vergleich/chinesisch--teehaus--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/chinesisch--teehaus--v1-mobil.jpg) | ![v2 Mobil](vergleich/chinesisch--teehaus--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.04:1, „Speisekarte“ 1.04:1, „Reservierung“ 1.04:1
  - 15 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 1 Bild(er) hochskaliert (unscharf)

<a id="thailaendisch--orchidee"></a>
### Thailändisch · Orchidee

v2: Traditionell, Yeseva One / Karla, Hero „spalte-bild“, Akzent `#a83c65`. Judge v1 5.9 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/thailaendisch--orchidee--v1-desktop.jpg) | ![v2 Desktop](vergleich/thailaendisch--orchidee--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/thailaendisch--orchidee--v1-mobil.jpg) | ![v2 Mobil](vergleich/thailaendisch--orchidee--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.03:1, „Speisekarte“ 1.03:1, „Reservierung“ 1.03:1
  - 3 Sektion(en) mit Abstand außerhalb der Skala
  - 15 Bedienelement(e) auf dem Handy unter 40px Höhe

<a id="thailaendisch--streetfood-nacht"></a>
### Thailändisch · Streetfood Nacht

v2: Abend, Big Shoulders Display / Libre Franklin, Hero „tafel“, Akzent `#f58628`. Judge v1 5.8 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/thailaendisch--streetfood-nacht--v1-desktop.jpg) | ![v2 Desktop](vergleich/thailaendisch--streetfood-nacht--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/thailaendisch--streetfood-nacht--v1-mobil.jpg) | ![v2 Mobil](vergleich/thailaendisch--streetfood-nacht--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(255,255,255)
  - 5 Sektion(en) mit Abstand außerhalb der Skala
  - 15 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 3 Bild(er) nicht geladen

<a id="thailaendisch--andamanen"></a>
### Thailändisch · Andamanen

v2: Hell & modern, Newsreader / Figtree, Hero „typo“, Akzent `#247975`. Judge v1 6.1 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/thailaendisch--andamanen--v1-desktop.jpg) | ![v2 Desktop](vergleich/thailaendisch--andamanen--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/thailaendisch--andamanen--v1-mobil.jpg) | ![v2 Mobil](vergleich/thailaendisch--andamanen--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.03:1, „Speisekarte“ 1.03:1, „Reservierung“ 1.03:1
  - 14 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 1 Bild(er) hochskaliert (unscharf)

<a id="vietnamesisch--indochine"></a>
### Vietnamesisch · Indochine

v2: Traditionell, Cormorant Garamond / Source Serif 4, Hero „karte“, Akzent `#775330`. Judge v1 5.9 ✗ → v2 9.4.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/vietnamesisch--indochine--v1-desktop.jpg) | ![v2 Desktop](vergleich/vietnamesisch--indochine--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/vietnamesisch--indochine--v1-mobil.jpg) | ![v2 Mobil](vergleich/vietnamesisch--indochine--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.03:1, „Speisekarte“ 1.03:1, „Reservierung“ 1.03:1
  - 3 Sektion(en) mit Abstand außerhalb der Skala
  - 14 Bedienelement(e) auf dem Handy unter 40px Höhe

Judge-Befunde v2:
  - Titelbild füllt nur 5 % des ersten Bildschirms

<a id="vietnamesisch--hanoi-nacht"></a>
### Vietnamesisch · Hanoi Nacht

v2: Abend, DM Serif Display / Instrument Sans, Hero „tafel“, Akzent `#be8631`. Judge v1 5.8 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/vietnamesisch--hanoi-nacht--v1-desktop.jpg) | ![v2 Desktop](vergleich/vietnamesisch--hanoi-nacht--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/vietnamesisch--hanoi-nacht--v1-mobil.jpg) | ![v2 Mobil](vergleich/vietnamesisch--hanoi-nacht--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(255,255,255)
  - 5 Sektion(en) mit Abstand außerhalb der Skala
  - 14 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 3 Bild(er) nicht geladen

<a id="vietnamesisch--strassenkueche"></a>
### Vietnamesisch · Straßenküche

v2: Hell & modern, Chivo / Karla, Hero „typo“, Akzent `#448240`. Judge v1 6.1 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/vietnamesisch--strassenkueche--v1-desktop.jpg) | ![v2 Desktop](vergleich/vietnamesisch--strassenkueche--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/vietnamesisch--strassenkueche--v1-mobil.jpg) | ![v2 Mobil](vergleich/vietnamesisch--strassenkueche--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.04:1, „Speisekarte“ 1.04:1, „Reservierung“ 1.04:1
  - 14 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 1 Bild(er) hochskaliert (unscharf)

<a id="japanisch--izakaya"></a>
### Japanisch · Izakaya

v2: Traditionell, Antonio / Zen Kaku Gothic New, Hero „spalte-bild“, Akzent `#c13732`. Judge v1 7.2 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/japanisch--izakaya--v1-desktop.jpg) | ![v2 Desktop](vergleich/japanisch--izakaya--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/japanisch--izakaya--v1-mobil.jpg) | ![v2 Mobil](vergleich/japanisch--izakaya--v2-mobil.jpg) |

Judge-Befunde v1:
  - 3 Sektion(en) mit Abstand außerhalb der Skala
  - 14 Bedienelement(e) auf dem Handy unter 40px Höhe
  - generische-schrift: Inter in @font-face
  - generische-schrift: Inter in @font-face

<a id="japanisch--omakase"></a>
### Japanisch · Omakase

v2: Abend, Shippori Mincho / Zen Kaku Gothic New, Hero „spalte-bild“, Akzent `#b39b62`. Judge v1 6.4 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/japanisch--omakase--v1-desktop.jpg) | ![v2 Desktop](vergleich/japanisch--omakase--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/japanisch--omakase--v1-mobil.jpg) | ![v2 Mobil](vergleich/japanisch--omakase--v2-mobil.jpg) |

Judge-Befunde v1:
  - 2 Farbe(n) außerhalb der Palette: rgb(254,254,255), rgb(255,255,255)
  - 5 Sektion(en) mit Abstand außerhalb der Skala
  - 14 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 1 Bild(er) hochskaliert (unscharf)

<a id="japanisch--washitsu"></a>
### Japanisch · Washitsu

v2: Hell & modern, Zen Old Mincho / Zen Kaku Gothic New, Hero „streifen“, Akzent `#696258`. Judge v1 6.1 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/japanisch--washitsu--v1-desktop.jpg) | ![v2 Desktop](vergleich/japanisch--washitsu--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/japanisch--washitsu--v1-mobil.jpg) | ![v2 Mobil](vergleich/japanisch--washitsu--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.04:1, „Speisekarte“ 1.04:1, „Reservierung“ 1.04:1
  - 15 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 1 Bild(er) hochskaliert (unscharf)

<a id="indisch--gewuerzmarkt"></a>
### Indisch · Gewürzmarkt

v2: Traditionell, Fjalla One / Libre Franklin, Hero „spalte-bild“, Akzent `#c48227`. Judge v1 5.9 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/indisch--gewuerzmarkt--v1-desktop.jpg) | ![v2 Desktop](vergleich/indisch--gewuerzmarkt--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/indisch--gewuerzmarkt--v1-mobil.jpg) | ![v2 Mobil](vergleich/indisch--gewuerzmarkt--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.03:1, „Speisekarte“ 1.03:1, „Reservierung“ 1.03:1
  - 3 Sektion(en) mit Abstand außerhalb der Skala
  - 16 Bedienelement(e) auf dem Handy unter 40px Höhe

<a id="indisch--maharadscha"></a>
### Indisch · Maharadscha

v2: Abend, Rozha One / Instrument Sans, Hero „typo“, Akzent `#9b4678`. Judge v1 6.1 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/indisch--maharadscha--v1-desktop.jpg) | ![v2 Desktop](vergleich/indisch--maharadscha--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/indisch--maharadscha--v1-mobil.jpg) | ![v2 Mobil](vergleich/indisch--maharadscha--v2-mobil.jpg) |

Judge-Befunde v1:
  - 5 Sektion(en) mit Abstand außerhalb der Skala
  - 15 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 3 Bild(er) nicht geladen
  - 1 Bild(er) hochskaliert (unscharf)

<a id="indisch--suedindisch-hell"></a>
### Indisch · Südindisch hell

v2: Hell & modern, Literata / Figtree, Hero „streifen“, Akzent `#46833c`. Judge v1 6.1 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/indisch--suedindisch-hell--v1-desktop.jpg) | ![v2 Desktop](vergleich/indisch--suedindisch-hell--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/indisch--suedindisch-hell--v1-mobil.jpg) | ![v2 Mobil](vergleich/indisch--suedindisch-hell--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.04:1, „Speisekarte“ 1.04:1, „Reservierung“ 1.04:1
  - 13 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 1 Bild(er) hochskaliert (unscharf)

<a id="asiatisch--marktstand"></a>
### Asiatisch (gemischt) · Marktstand

v2: Traditionell, Archivo Black / Work Sans, Hero „karte“, Akzent `#c85116`. Judge v1 5.9 ✗ → v2 9.4.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/asiatisch--marktstand--v1-desktop.jpg) | ![v2 Desktop](vergleich/asiatisch--marktstand--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/asiatisch--marktstand--v1-mobil.jpg) | ![v2 Mobil](vergleich/asiatisch--marktstand--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.03:1, „Speisekarte“ 1.03:1, „Reservierung“ 1.03:1
  - 3 Sektion(en) mit Abstand außerhalb der Skala
  - 15 Bedienelement(e) auf dem Handy unter 40px Höhe

Judge-Befunde v2:
  - Titelbild füllt nur 5 % des ersten Bildschirms

<a id="asiatisch--neon"></a>
### Asiatisch (gemischt) · Neon

v2: Abend, Saira Extra Condensed / Instrument Sans, Hero „spalte-bild“, Akzent `#d4383b`. Judge v1 6.0 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/asiatisch--neon--v1-desktop.jpg) | ![v2 Desktop](vergleich/asiatisch--neon--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/asiatisch--neon--v1-mobil.jpg) | ![v2 Mobil](vergleich/asiatisch--neon--v2-mobil.jpg) |

Judge-Befunde v1:
  - 5 Sektion(en) mit Abstand außerhalb der Skala
  - 15 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 5 Bild(er) nicht geladen
  - 1 Bild(er) hochskaliert (unscharf)

<a id="asiatisch--fusion-minimal"></a>
### Asiatisch (gemischt) · Fusion Minimal

v2: Hell & modern, Instrument Serif / Hanken Grotesk, Hero „spalte-bild“, Akzent `#334754`. Judge v1 6.1 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/asiatisch--fusion-minimal--v1-desktop.jpg) | ![v2 Desktop](vergleich/asiatisch--fusion-minimal--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/asiatisch--fusion-minimal--v1-mobil.jpg) | ![v2 Mobil](vergleich/asiatisch--fusion-minimal--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.03:1, „Speisekarte“ 1.03:1, „Reservierung“ 1.03:1
  - 15 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 1 Bild(er) hochskaliert (unscharf)

<a id="cafe--wiener-kaffeehaus"></a>
### Café · Wiener Kaffeehaus

v2: Traditionell, Old Standard TT / Libre Franklin, Hero „passepartout“, Akzent `#315b4a`. Judge v1 5.9 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/cafe--wiener-kaffeehaus--v1-desktop.jpg) | ![v2 Desktop](vergleich/cafe--wiener-kaffeehaus--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/cafe--wiener-kaffeehaus--v1-mobil.jpg) | ![v2 Mobil](vergleich/cafe--wiener-kaffeehaus--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.04:1, „Speisekarte“ 1.04:1, „Reservierung“ 1.04:1
  - 3 Sektion(en) mit Abstand außerhalb der Skala
  - 13 Bedienelement(e) auf dem Handy unter 40px Höhe

<a id="cafe--konditorei"></a>
### Café · Konditorei

v2: Abend, Rufina / Karla, Hero „spalte-bild“, Akzent `#b6476b`. Judge v1 5.4 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/cafe--konditorei--v1-desktop.jpg) | ![v2 Desktop](vergleich/cafe--konditorei--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/cafe--konditorei--v1-mobil.jpg) | ![v2 Mobil](vergleich/cafe--konditorei--v2-mobil.jpg) |

Judge-Befunde v1:
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.04:1, „Speisekarte“ 1.04:1, „Reservierung“ 1.04:1
  - 5 Sektion(en) mit Abstand außerhalb der Skala
  - 13 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 2 Bild(er) nicht geladen

<a id="cafe--third-wave"></a>
### Café · Third Wave

v2: Hell & modern, Schibsted Grotesk / Karla, Hero „streifen“, Akzent `#5d695c`. Judge v1 6.1 ✗ → v2 10.0.

| v1 (vorher) | v2 (nachher) |
|---|---|
| ![v1 Desktop](vergleich/cafe--third-wave--v1-desktop.jpg) | ![v2 Desktop](vergleich/cafe--third-wave--v2-desktop.jpg) |
| ![v1 Mobil](vergleich/cafe--third-wave--v1-mobil.jpg) | ![v2 Mobil](vergleich/cafe--third-wave--v2-mobil.jpg) |

Judge-Befunde v1:
  - 1 Farbe(n) außerhalb der Palette: rgb(26,26,26)
  - 4 Text(e) unter WCAG-AA im gerenderten Ergebnis: „Highlights“ 1.03:1, „Speisekarte“ 1.03:1, „Reservierung“ 1.03:1
  - 15 Bedienelement(e) auf dem Handy unter 40px Höhe
  - 1 Bild(er) hochskaliert (unscharf)

