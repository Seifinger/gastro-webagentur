# Vietnamesisch · Hanoi Nacht

Archetyp **Abend** · Schema **dunkel** · Designsystem `vietnamesisch--hanoi-nacht` (maschinenlesbar: `vietnamesisch--hanoi-nacht.json`)

> Hanoi Nacht: Laternenlicht, Bernstein, Rauch – dunkel und warm.

## Referenzen

- **[Madame Ngo](https://www.madame-ngo.de)** (Restaurant) – übernommen: dunkle, warme Töne; Brasserie-Eleganz · bewusst nicht: Standard-Theme-Elemente
- **[Assembly Coffee London](https://styles.refero.design/style/8288950a-2731-44fd-85ef-211aecd8091d)** (Refero-Style) – übernommen: Beinahe-Schwarz; warm beleuchtete Fotos; kursive Serife für Labels · bewusst nicht: Shop-Kacheln

Referenz-Signal: Temperatur **neutral**, Helligkeit **hell**, Sättigung **fast unbunt**, Dichte **ausgewogen**, Layout **gemischt**, Bewegung **lebendig**.

## Farben – jede mit einer Aufgabe

| Rolle | Wert | Aufgabe | Verwendung |
|---|---|---|---|
| `grund` | `#141013` | Seitengrund – trägt rund 60 % der Fläche | body, Sektionen ohne eigene Fläche |
| `flaeche` | `#1d1719` | Erhöhte Fläche – Formulare, Warenkorb, Tafeln | Formular-Panel, Drawer, Menütafel |
| `flaecheTief` | `#191315` | Zweiter Grund für Sektionswechsel – ersetzt Trennlinien | jede zweite Sektion, Passepartout |
| `text` | `#f6f1ec` | Fließtext und Überschriften | body, h1–h3 |
| `textLeise` | `#b0a099` | Nebeninformation: Beschreibungen, Hinweise, Zeiten | Gerichtsbeschreibung, Formularhinweis |
| `linie` | `#332a2c` | Dekorative Haarlinie – nie alleiniger Träger von Information | Tabellenzeilen, Sektionskanten |
| `linieStark` | `#9e9796` | Begrenzung von Bedienelementen (≥ 3:1) | Eingabefelder, Mengenknöpfe |
| `akzent` | `#be8631` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#ca9c56` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#141013` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#be8631` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
| `signal` | `#e0ab45` | Signalton für kleine Marken – nie als Fläche | Sterne, Hausempfehlung-Siegel |
| `signalText` | `#e0ab45` | Signalton als lesbare Schrift auf hellen Gründen | Platzhalter-Kennzeichnung, Note |
| `tint` | `#140f0a` | Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay | Hero-Tafel, Fußzeile |
| `aufTint` | `#f6f1ec` | Schrift auf der Tafel | Hero-Tafel, Fußzeile |
| `aufTintLeise` | `#b7b2ad` | Nebenschrift auf der Tafel | Fußzeilen-Links |
| `signalAufTint` | `#e0ab45` | Signalton auf der Tafel | Sterne im Hero |
| `fehler` | `#ff8a80` | Fehlermeldungen in Formularen | Formularfehler, Ablehnung |

Kontraste (vom Build erzwungen):

| Schrift | Grund | Verhältnis | Mindestens |
|---|---|---|---|
| text | grund | 16.81:1 | 4.5:1 |
| text | flaeche | 15.74:1 | 4.5:1 |
| text | flaecheTief | 16.34:1 | 4.5:1 |
| textLeise | grund | 7.49:1 | 4.5:1 |
| textLeise | flaeche | 7.01:1 | 4.5:1 |
| textLeise | flaecheTief | 7.28:1 | 4.5:1 |
| akzentText | grund | 5.97:1 | 4.5:1 |
| akzentText | flaeche | 5.59:1 | 4.5:1 |
| akzentText | flaecheTief | 5.80:1 | 4.5:1 |
| aufAkzent | akzent | 5.97:1 | 4.5:1 |
| aufAkzent | akzentTief | 7.55:1 | 4.5:1 |
| signalText | grund | 9.05:1 | 4.5:1 |
| signalText | flaeche | 8.48:1 | 4.5:1 |
| signalText | flaecheTief | 8.80:1 | 4.5:1 |
| aufTint | tint | 16.97:1 | 4.5:1 |
| aufTintLeise | tint | 9.06:1 | 4.5:1 |
| signalAufTint | tint | 9.14:1 | 4.5:1 |
| fehler | flaeche | 7.74:1 | 4.5:1 |
| fehler | grund | 8.26:1 | 4.5:1 |
| fehler | flaecheTief | 8.03:1 | 4.5:1 |
| linieStark | flaeche | 6.16:1 | 3:1 |
| linieStark | grund | 6.58:1 | 3:1 |
| akzent | grund | 5.97:1 | 3:1 |

Herleitung: Akzent gedämpft (#d08a1f → #be8631, Sättigung ×0.8), Referenzen sind fast unbunt. Kein Referenz-Akzent in derselben Farbfamilie (#009004) – Küchen-Akzent bleibt.

## Typografie

- **Anzeige:** DM Serif Display 400 – hoher Kontrast, abendlich – Laternenlicht (aus v1 übernommen)
- **Text:** Instrument Sans 400/600 – präzise, schmal laufende Grotesk
- **Rubriken:** kursive Anzeigeschrift in Textgröße – wie ein handgeschriebenes Etikett
- **Skala:** Quarte (×1.333), Basis 17px

| Stufe | Desktop | Mobil | Einsatz |
|---|---|---|---|
| klein | 14px | – | Labels, Hinweise, Rubriken |
| basis | 17px | – | Fließtext, Formular |
| gross | 23px | – | Einleitungen, Preise der Hausempfehlung |
| h3 | 30px | – | Gerichtsnamen, Kartenköpfe |
| h2 | 54px | 40px | Sektionstitel |
| h1 | 95px | 62px | Name des Hauses |
| display | 127px | 72px | Typo-Hero |

Ausgeschlossen: Inter, Roboto, system-ui und alle weiteren Schriften aus `VERBOTENE_SCHRIFTEN`.

Herleitung: 2 von 2 ausgewerteten Referenzen führen ebenfalls mit Serife (serif, serif).

## Spacing (8px-Raster)

Skala: `1`=8px · `2`=16px · `3`=24px · `4`=32px · `5`=40px · `6`=48px · `8`=64px · `10`=80px · `12`=96px · `16`=128px · `halb`=4px

Sektionen 96px (mobil 64px), betonte Sektion 128px, enge Leisten 48px. Rinne 32px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 96px: Referenzen sind mehrheitlich „ausgewogen“. Referenzen nutzen ein 4px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 2px · Karte 8px · Knopf 2px · Bild 0px · Marke rund
- Schatten: linie (`0 0 0 1px #332a2c`)
- Bewegung: cubic-bezier(.5,0,.1,1), 612ms, Weg 16px, Versatz 120ms
  - Animiert werden nur transform und opacity.
  - Startzustände hängen an einer Klasse, die erst das Skript setzt – ohne JS ist alles sichtbar.
  - prefers-reduced-motion: reduce schaltet jede Bewegung ab.
  - Genau ein betonter Moment je Seite (siehe layout.betonterMoment).

Herleitung: Kartenradius aus v1-Stimmung (8px) auf 4px gerastert, im Abendhaus auf höchstens 8px begrenzt; Pillenform nur für kleine Marken. Dunkler Grund: Schatten wären unsichtbar – Kanten statt Schatten. Kurve cubic-bezier(.5,0,.1,1) aus der v1-Handschrift „abend“. Referenzen bewegen sich lebendig – Auftritte 15 % kürzer.

## Layout-Regeln

- Maximale Breite 1120px, 12 Spalten, Verhältnis 5/7, Textbreite 62ch
- Hero-Varianten (Seed wählt): `tafel` – Vollbild-Foto, darauf eine deckende Tafel unten links – kein Verlaufsschleier; `passepartout` – Foto im Passepartout, Textblock überlappt die Rahmenkante versetzt; `typo` – Übergroßer Name über die Breite, darunter ein Bildband im Kinoformat; `spalte-bild` – Textspalte auf dem Grund links, Foto randabfallend rechts
- Sektionsfolge: ambiente → karte → highlights → stimmen → reservierung → kontakt
- Highlights als `leseliste`, Karte als `spalten`, Stimmen als `zitat`
- Betonter Moment: **reservierung** (einzige Sektion mit Extra-Luft und eigener Bewegung)
- Kopfzeile fest, Hauptaktion Reservieren, mobile Aktionsleiste an
- Flächenwechsel grund ↔ flaecheTief statt Trennlinien

Herleitung: Sektionsfolge, Kopfzeile und Hauptaktion aus designPresets.js (Archetyp „abend“). Referenzen gemischt – asymmetrisches Raster 5/7.

## Verbotene Muster

- Drei gleich gebaute Karten (Bild/Icon + Überschrift + Text) nebeneinander _(lint)_
- Verläufe über mehrere Farbtöne (Lila→Blau, Sonnenuntergang); erlaubt ist nur ein Ton in verschiedenen Deckkräften _(lint)_
- Inter, Roboto, system-ui und die übrigen Standardschriften generierter Seiten _(lint)_
- Fließtext unter 16px _(lint)_
- Abstände außerhalb des 8px-Rasters (4px nur als Halbschritt) _(lint)_
- Zentrierter Text direkt auf abgedunkeltem Foto mit Verlaufsschleier _(lint)_
- Milchglas-Flächen (backdrop-filter: blur) _(lint)_
- Emoji als Symbole statt gezeichneter Zeichen _(lint)_
- Leuchtende text-shadow/box-shadow in Akzentfarbe (Neon-Glow) _(lint)_
- Pillenform (radius 999) auf Knöpfen und Karten – nur kleine Marken dürfen rund sein _(lint)_
- Akzentfarbe auf mehr als 8 % der sichtbaren Fläche _(judge)_
- Farben, die nicht aus der Palette stammen _(judge)_
- Jede Sektion gleich hoch, gleich zentriert, gleich gepolstert _(judge)_
- „Willkommen bei“, „Tauchen Sie ein“, „kulinarische Reise“ und verwandte Formeln _(copy)_
- Reishut-Clipart _(Küche)_
- Flaggen-Sterne _(Küche)_
- Bambus-Rahmen _(Küche)_
- helle Vollflächen-Sektionen _(Archetyp)_
- mehr als ein Akzentton _(Archetyp)_
- schnelle Bewegungen unter 300ms _(Archetyp)_

## Bild-Kanon

- Licht: Pendel- oder Kerzenlicht, tiefe Schatten, warm (ca. 2700 K), Hintergrund fällt ins Dunkle
- Perspektive: nah, geringe Schärfentiefe, ein Gericht oder ein Glas als einziges Licht im Bild
- Farbstimmung: dunkel, satt; Akzent #d08a1f darf im Bild vorkommen (Serviette, Keramik), sonst warme Neutrale
- Oberflächen & Requisiten: Emailleschüsseln, Kräuterbündel, Fischsauce-Kännchen, Stäbchen aus Holz
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, low pendant or candle light, deep shadows, warm 2700K, background falling into darkness, close-up, shallow depth of field, a single dish or glass as the only lit object, enamel bowls, bunches of fresh herbs, small fish sauce jug, wooden chopsticks, dark moody palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: ruhig und knapp – wenige Worte, eher Einladung als Werbung
- Anrede: Sie, Satzlänge: kurz, 6–14 Wörter
- Wortfeld: Brühe, Kräuter, Reisnudeln, Bánh Mì, Fischsauce

