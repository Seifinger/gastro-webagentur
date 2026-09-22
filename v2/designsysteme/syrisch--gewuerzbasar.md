# Syrisch · Gewürzbasar

Archetyp **Abend** · Schema **dunkel** · Designsystem `syrisch--gewuerzbasar` (maschinenlesbar: `syrisch--gewuerzbasar.json`)

> Gewürzbasar: Nacht, Glut, Kurkuma – schmale Versalien, ein warmer Akzent.

## Referenzen

- **[963 Berlin](https://www.963berlin.com)** (Restaurant) – übernommen: dunkler Auftritt; moderne Levante-Bildsprache · bewusst nicht: Video-Autoplay
- **[Bubala](https://www.bubala.co.uk)** (Restaurant) – übernommen: warmer Akzent; selbstbewusste Headlines · bewusst nicht: Newsletter-Popup
- **[Chantlings](https://styles.refero.design/style/5090ce54-9097-4d29-a741-2847dbacc419)** (Refero-Style) – übernommen: Schwarzgrund; ein Bernstein/Orange als einziges Licht · bewusst nicht: Illustrationsstil

Referenz-Signal: Temperatur **warm**, Helligkeit **gemischt**, Sättigung **gedeckt**, Dichte **dicht**, Layout **gemischt**, Bewegung **lebendig**.

## Farben – jede mit einer Aufgabe

| Rolle | Wert | Aufgabe | Verwendung |
|---|---|---|---|
| `grund` | `#15130f` | Seitengrund – trägt rund 60 % der Fläche | body, Sektionen ohne eigene Fläche |
| `flaeche` | `#1d1719` | Erhöhte Fläche – Formulare, Warenkorb, Tafeln | Formular-Panel, Drawer, Menütafel |
| `flaecheTief` | `#1b1711` | Zweiter Grund für Sektionswechsel – ersetzt Trennlinien | jede zweite Sektion, Passepartout |
| `text` | `#f6f1ec` | Fließtext und Überschriften | body, h1–h3 |
| `textLeise` | `#b0a099` | Nebeninformation: Beschreibungen, Hinweise, Zeiten | Gerichtsbeschreibung, Formularhinweis |
| `linie` | `#373026` | Dekorative Haarlinie – nie alleiniger Träger von Information | Tabellenzeilen, Sektionskanten |
| `linieStark` | `#a09a93` | Begrenzung von Bedienelementen (≥ 3:1) | Eingabefelder, Mengenknöpfe |
| `akzent` | `#cd8226` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#d6994d` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#141013` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#cd8226` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
| `signal` | `#d8a33c` | Signalton für kleine Marken – nie als Fläche | Sterne, Hausempfehlung-Siegel |
| `signalText` | `#d8a33c` | Signalton als lesbare Schrift auf hellen Gründen | Platzhalter-Kennzeichnung, Note |
| `tint` | `#140d08` | Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay | Hero-Tafel, Fußzeile |
| `aufTint` | `#f6f1ec` | Schrift auf der Tafel | Hero-Tafel, Fußzeile |
| `aufTintLeise` | `#b7b1ac` | Nebenschrift auf der Tafel | Fußzeilen-Links |
| `signalAufTint` | `#d8a33c` | Signalton auf der Tafel | Sterne im Hero |
| `fehler` | `#ff8a80` | Fehlermeldungen in Formularen | Formularfehler, Ablehnung |

Kontraste (vom Build erzwungen):

| Schrift | Grund | Verhältnis | Mindestens |
|---|---|---|---|
| text | grund | 16.53:1 | 4.5:1 |
| text | flaeche | 15.74:1 | 4.5:1 |
| text | flaecheTief | 15.89:1 | 4.5:1 |
| textLeise | grund | 7.36:1 | 4.5:1 |
| textLeise | flaeche | 7.01:1 | 4.5:1 |
| textLeise | flaecheTief | 7.08:1 | 4.5:1 |
| akzentText | grund | 6.02:1 | 4.5:1 |
| akzentText | flaeche | 5.73:1 | 4.5:1 |
| akzentText | flaecheTief | 5.79:1 | 4.5:1 |
| aufAkzent | akzent | 6.12:1 | 4.5:1 |
| aufAkzent | akzentTief | 7.66:1 | 4.5:1 |
| signalText | grund | 8.15:1 | 4.5:1 |
| signalText | flaeche | 7.76:1 | 4.5:1 |
| signalText | flaecheTief | 7.84:1 | 4.5:1 |
| aufTint | tint | 17.15:1 | 4.5:1 |
| aufTintLeise | tint | 9.07:1 | 4.5:1 |
| signalAufTint | tint | 8.46:1 | 4.5:1 |
| fehler | flaeche | 7.74:1 | 4.5:1 |
| fehler | grund | 8.13:1 | 4.5:1 |
| fehler | flaecheTief | 7.81:1 | 4.5:1 |
| linieStark | flaeche | 6.34:1 | 3:1 |
| linieStark | grund | 6.66:1 | 3:1 |
| akzent | grund | 6.02:1 | 3:1 |

Herleitung: Neutrale warm getönt (#141013 → #15130f), weil die Referenzen mehrheitlich warm sind. Akzent gedämpft (#c8791f → #c07827, Sättigung ×0.9), Referenzen sind gedeckt. Akzent 20 % Richtung Referenz-Akzent #ffaa20 gezogen (#c07827 → #cd8226).

## Typografie

- **Anzeige:** Reem Kufi 600, Versalien – kufisch geprägte Geometrie – Gewürzbasar-Schild
- **Text:** Instrument Sans 400/600 – präzise, schmal laufende Grotesk
- **Rubriken:** Versalien, weit gesperrt (0.14em), klein
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

Herleitung: 3 von 3 ausgewerteten Referenzen führen ebenfalls mit Grotesk (grotesk, grotesk, grotesk).

## Spacing (8px-Raster)

Skala: `1`=8px · `2`=16px · `3`=24px · `4`=32px · `5`=40px · `6`=48px · `8`=64px · `10`=80px · `12`=96px · `16`=128px · `halb`=4px

Sektionen 80px (mobil 48px), betonte Sektion 112px, enge Leisten 48px. Rinne 32px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 80px: Referenzen sind mehrheitlich „dicht“. Referenzen nutzen ein 4px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 2px · Karte 8px · Knopf 2px · Bild 0px · Marke rund
- Schatten: linie (`0 0 0 1px #373026`)
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
- Wüsten- und Kamelmotive _(Küche)_
- Laternen-Clipart _(Küche)_
- Goldene Arabesken-Rahmen _(Küche)_
- helle Vollflächen-Sektionen _(Archetyp)_
- mehr als ein Akzentton _(Archetyp)_
- schnelle Bewegungen unter 300ms _(Archetyp)_

## Bild-Kanon

- Licht: Pendel- oder Kerzenlicht, tiefe Schatten, warm (ca. 2700 K), Hintergrund fällt ins Dunkle
- Perspektive: nah, geringe Schärfentiefe, ein Gericht oder ein Glas als einziges Licht im Bild
- Farbstimmung: dunkel, satt; Akzent #c8791f darf im Bild vorkommen (Serviette, Keramik), sonst warme Neutrale
- Oberflächen & Requisiten: Messingtablett, Mezze-Schälchen, Granatapfel, Fliesenmuster unscharf im Hintergrund
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, low pendant or candle light, deep shadows, warm 2700K, background falling into darkness, close-up, shallow depth of field, a single dish or glass as the only lit object, brass tray, small mezze bowls, pomegranate, blurred tile pattern in background, dark moody palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: ruhig und knapp – wenige Worte, eher Einladung als Werbung
- Anrede: Sie, Satzlänge: kurz, 6–14 Wörter
- Wortfeld: Mezze, Tahini, Granatapfel, Fladenbrot, Za'atar, Tee

