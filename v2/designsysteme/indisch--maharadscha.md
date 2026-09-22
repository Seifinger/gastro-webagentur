# Indisch · Maharadscha

Archetyp **Abend** · Schema **dunkel** · Designsystem `indisch--maharadscha` (maschinenlesbar: `indisch--maharadscha.json`)

> Maharadscha: Samt, Pflaume, Messing – festlicher Abend.

## Referenzen

- **[Tamasha](https://www.tamasha.co.uk)** (Restaurant) – übernommen: Pflaume/Samt; Gold als Detail · bewusst nicht: Ornamentrahmen
- **[Slab](https://styles.refero.design/style/f240ed7d-d466-478e-bbce-6c93420dfd1c)** (Refero-Style) – übernommen: tiefes Pflaumenrot; Serifen-Lesestimmung · bewusst nicht: Whitney als Text

Referenz-Signal: Temperatur **neutral**, Helligkeit **hell**, Sättigung **fast unbunt**, Dichte **luftig**, Layout **gemischt**, Bewegung **ruhig**.

## Farben – jede mit einer Aufgabe

| Rolle | Wert | Aufgabe | Verwendung |
|---|---|---|---|
| `grund` | `#0d1218` | Seitengrund – trägt rund 60 % der Fläche | body, Sektionen ohne eigene Fläche |
| `flaeche` | `#151c24` | Erhöhte Fläche – Formulare, Warenkorb, Tafeln | Formular-Panel, Drawer, Menütafel |
| `flaecheTief` | `#111820` | Zweiter Grund für Sektionswechsel – ersetzt Trennlinien | jede zweite Sektion, Passepartout |
| `text` | `#eef3f8` | Fließtext und Überschriften | body, h1–h3 |
| `textLeise` | `#94a4b4` | Nebeninformation: Beschreibungen, Hinweise, Zeiten | Gerichtsbeschreibung, Formularhinweis |
| `linie` | `#243040` | Dekorative Haarlinie – nie alleiniger Träger von Information | Tabellenzeilen, Sektionskanten |
| `linieStark` | `#939ba5` | Begrenzung von Bedienelementen (≥ 3:1) | Eingabefelder, Mengenknöpfe |
| `akzent` | `#9b4678` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#a85d89` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#ffffff` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#bb6899` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
| `signal` | `#c9a227` | Signalton für kleine Marken – nie als Fläche | Sterne, Hausempfehlung-Siegel |
| `signalText` | `#c9a227` | Signalton als lesbare Schrift auf hellen Gründen | Platzhalter-Kennzeichnung, Note |
| `tint` | `#0c0a12` | Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay | Hero-Tafel, Fußzeile |
| `aufTint` | `#eef3f8` | Schrift auf der Tafel | Hero-Tafel, Fußzeile |
| `aufTintLeise` | `#afb2b8` | Nebenschrift auf der Tafel | Fußzeilen-Links |
| `signalAufTint` | `#c9a227` | Signalton auf der Tafel | Sterne im Hero |
| `fehler` | `#ff8a80` | Fehlermeldungen in Formularen | Formularfehler, Ablehnung |

Kontraste (vom Build erzwungen):

| Schrift | Grund | Verhältnis | Mindestens |
|---|---|---|---|
| text | grund | 16.84:1 | 4.5:1 |
| text | flaeche | 15.38:1 | 4.5:1 |
| text | flaecheTief | 16.00:1 | 4.5:1 |
| textLeise | grund | 7.37:1 | 4.5:1 |
| textLeise | flaeche | 6.73:1 | 4.5:1 |
| textLeise | flaecheTief | 7.00:1 | 4.5:1 |
| akzentText | grund | 4.97:1 | 4.5:1 |
| akzentText | flaeche | 4.54:1 | 4.5:1 |
| akzentText | flaecheTief | 4.72:1 | 4.5:1 |
| aufAkzent | akzent | 5.93:1 | 4.5:1 |
| aufAkzent | akzentTief | 4.57:1 | 4.5:1 |
| signalText | grund | 7.77:1 | 4.5:1 |
| signalText | flaeche | 7.10:1 | 4.5:1 |
| signalText | flaecheTief | 7.39:1 | 4.5:1 |
| aufTint | tint | 17.62:1 | 4.5:1 |
| aufTintLeise | tint | 9.26:1 | 4.5:1 |
| signalAufTint | tint | 8.13:1 | 4.5:1 |
| fehler | flaeche | 7.52:1 | 4.5:1 |
| fehler | grund | 8.24:1 | 4.5:1 |
| fehler | flaecheTief | 7.83:1 | 4.5:1 |
| linieStark | flaeche | 6.11:1 | 3:1 |
| linieStark | grund | 6.69:1 | 3:1 |
| akzent | grund | 3.17:1 | 3:1 |

Herleitung: Akzent gedämpft (#974381 → #8f4b7d, Sättigung ×0.8), Referenzen sind fast unbunt. Akzent 20 % Richtung Referenz-Akzent #cc3366 gezogen (#8f4b7d → #9b4678).

## Typografie

- **Anzeige:** Rozha One 400 – Devanagari-inspirierte Kontrastantiqua – Samt, Messing
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

Sektionen 128px (mobil 64px), betonte Sektion 160px, enge Leisten 48px. Rinne 32px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 128px: Referenzen sind mehrheitlich „luftig“. Referenzen nutzen ein 10px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 2px · Karte 8px · Knopf 2px · Bild 0px · Marke rund
- Schatten: linie (`0 0 0 1px #243040`)
- Bewegung: cubic-bezier(.5,0,.1,1), 720ms, Weg 16px, Versatz 120ms
  - Animiert werden nur transform und opacity.
  - Startzustände hängen an einer Klasse, die erst das Skript setzt – ohne JS ist alles sichtbar.
  - prefers-reduced-motion: reduce schaltet jede Bewegung ab.
  - Genau ein betonter Moment je Seite (siehe layout.betonterMoment).

Herleitung: Kartenradius aus v1-Stimmung (8px) auf 4px gerastert, im Abendhaus auf höchstens 8px begrenzt; Pillenform nur für kleine Marken. Dunkler Grund: Schatten wären unsichtbar – Kanten statt Schatten. Kurve cubic-bezier(.5,0,.1,1) aus der v1-Handschrift „abend“.

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
- Mandala-Muster _(Küche)_
- Taj-Mahal-Silhouetten _(Küche)_
- Henna-Ornamente als Rahmen _(Küche)_
- helle Vollflächen-Sektionen _(Archetyp)_
- mehr als ein Akzentton _(Archetyp)_
- schnelle Bewegungen unter 300ms _(Archetyp)_

## Bild-Kanon

- Licht: Pendel- oder Kerzenlicht, tiefe Schatten, warm (ca. 2700 K), Hintergrund fällt ins Dunkle
- Perspektive: nah, geringe Schärfentiefe, ein Gericht oder ein Glas als einziges Licht im Bild
- Farbstimmung: dunkel, satt; Akzent #974381 darf im Bild vorkommen (Serviette, Keramik), sonst warme Neutrale
- Oberflächen & Requisiten: Messing-Thali, Kupfer-Kadai, Gewürze in Schälchen, Naan auf Baumwolltuch
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, low pendant or candle light, deep shadows, warm 2700K, background falling into darkness, close-up, shallow depth of field, a single dish or glass as the only lit object, brass thali, copper kadai, spices in small bowls, naan on cotton cloth, dark moody palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: ruhig und knapp – wenige Worte, eher Einladung als Werbung
- Anrede: Sie, Satzlänge: kurz, 6–14 Wörter
- Wortfeld: Tandoor, Gewürze, Naan, Masala, Linsen

