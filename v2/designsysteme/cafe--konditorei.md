# Café · Konditorei

Archetyp **Abend** · Schema **hell** · Designsystem `cafe--konditorei` (maschinenlesbar: `cafe--konditorei.json`)

> Konditorei: Porzellan, Himbeere, Zuckerguss – festlich, aber nicht niedlich.

## Referenzen

- **[Ladurée](https://www.laduree.com)** (Restaurant) – übernommen: gedecktes Rosé; feine Serife · bewusst nicht: Pastell-Mehrfarbigkeit
- **[Dominique Ansel](https://www.dominiqueansel.com)** (Restaurant) – übernommen: Produkt freigestellt; viel Weißraum · bewusst nicht: Aktionskacheln
- **[Mr. Pops](https://styles.refero.design/style/ab7996ed-e0ed-40a0-81a5-d37f19ef35b0)** (Refero-Style) – übernommen: Kirschrot/Himbeer als Rahmenfarbe; Cream-Karten · bewusst nicht: gestapelte Marquee-Buchstaben

Referenz-Signal: Temperatur **warm**, Helligkeit **hell**, Sättigung **kräftig**, Dichte **dicht**, Layout **gemischt**, Bewegung **ruhig**.

## Farben – jede mit einer Aufgabe

| Rolle | Wert | Aufgabe | Verwendung |
|---|---|---|---|
| `grund` | `#fdfaf5` | Seitengrund – trägt rund 60 % der Fläche | body, Sektionen ohne eigene Fläche |
| `flaeche` | `#ffffff` | Erhöhte Fläche – Formulare, Warenkorb, Tafeln | Formular-Panel, Drawer, Menütafel |
| `flaecheTief` | `#f6eee3` | Zweiter Grund für Sektionswechsel – ersetzt Trennlinien | jede zweite Sektion, Passepartout |
| `text` | `#2a211a` | Fließtext und Überschriften | body, h1–h3 |
| `textLeise` | `#6f6154` | Nebeninformation: Beschreibungen, Hinweise, Zeiten | Gerichtsbeschreibung, Formularhinweis |
| `linie` | `#e9dfd1` | Dekorative Haarlinie – nie alleiniger Träger von Information | Tabellenzeilen, Sektionskanten |
| `linieStark` | `#80776c` | Begrenzung von Bedienelementen (≥ 3:1) | Eingabefelder, Mengenknöpfe |
| `akzent` | `#b6476b` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#953a58` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#ffffff` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#b24669` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
| `signal` | `#c9a227` | Signalton für kleine Marken – nie als Fläche | Sterne, Hausempfehlung-Siegel |
| `signalText` | `#806719` | Signalton als lesbare Schrift auf hellen Gründen | Platzhalter-Kennzeichnung, Note |
| `tint` | `#2e1a22` | Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay | Hero-Tafel, Fußzeile |
| `aufTint` | `#fefdfa` | Schrift auf der Tafel | Hero-Tafel, Fußzeile |
| `aufTintLeise` | `#c4bdbe` | Nebenschrift auf der Tafel | Fußzeilen-Links |
| `signalAufTint` | `#c9a227` | Signalton auf der Tafel | Sterne im Hero |
| `fehler` | `#b3261e` | Fehlermeldungen in Formularen | Formularfehler, Ablehnung |

Kontraste (vom Build erzwungen):

| Schrift | Grund | Verhältnis | Mindestens |
|---|---|---|---|
| text | grund | 15.15:1 | 4.5:1 |
| text | flaeche | 15.78:1 | 4.5:1 |
| text | flaecheTief | 13.72:1 | 4.5:1 |
| textLeise | grund | 5.74:1 | 4.5:1 |
| textLeise | flaeche | 5.98:1 | 4.5:1 |
| textLeise | flaecheTief | 5.20:1 | 4.5:1 |
| akzentText | grund | 5.08:1 | 4.5:1 |
| akzentText | flaeche | 5.29:1 | 4.5:1 |
| akzentText | flaecheTief | 4.60:1 | 4.5:1 |
| aufAkzent | akzent | 5.12:1 | 4.5:1 |
| aufAkzent | akzentTief | 6.94:1 | 4.5:1 |
| signalText | grund | 5.21:1 | 4.5:1 |
| signalText | flaeche | 5.42:1 | 4.5:1 |
| signalText | flaecheTief | 4.72:1 | 4.5:1 |
| aufTint | tint | 16.04:1 | 4.5:1 |
| aufTintLeise | tint | 8.83:1 | 4.5:1 |
| signalAufTint | tint | 6.74:1 | 4.5:1 |
| fehler | flaeche | 6.54:1 | 4.5:1 |
| fehler | grund | 6.28:1 | 4.5:1 |
| fehler | flaecheTief | 5.68:1 | 4.5:1 |
| linieStark | flaeche | 4.40:1 | 3:1 |
| linieStark | grund | 4.23:1 | 3:1 |
| akzent | grund | 4.92:1 | 3:1 |

Herleitung: Neutrale warm getönt (#fdfaf5 → #fdfaf5), weil die Referenzen mehrheitlich warm sind. Akzent 20 % Richtung Referenz-Akzent #b00e2f gezogen (#b8557a → #b6476b).

## Typografie

- **Anzeige:** Rufina 700 – kalligrafische Antiqua – Zuckerguss, Porzellan
- **Text:** Karla 400/600 – eigenwillige Grotesk mit engen Kurven
- **Rubriken:** Anzeigeschrift aufrecht in Einleitungsgröße – wie ein Etikett (keine künstliche Kursive)
- **Skala:** Quarte (×1.333), Basis 18px

| Stufe | Desktop | Mobil | Einsatz |
|---|---|---|---|
| klein | 14px | – | Labels, Hinweise, Rubriken |
| basis | 18px | – | Fließtext, Formular |
| gross | 24px | – | Einleitungen, Preise der Hausempfehlung |
| h3 | 32px | – | Gerichtsnamen, Kartenköpfe |
| h2 | 57px | 43px | Sektionstitel |
| h1 | 101px | 66px | Name des Hauses |
| display | 135px | 76px | Typo-Hero |

Ausgeschlossen: Inter, Roboto, system-ui und alle weiteren Schriften aus `VERBOTENE_SCHRIFTEN`.

Herleitung: 1 von 3 ausgewerteten Referenzen führen ebenfalls mit Serife (serif, grotesk, grotesk).

## Spacing (8px-Raster)

Skala: `1`=8px · `2`=16px · `3`=24px · `4`=32px · `5`=40px · `6`=48px · `8`=64px · `10`=80px · `12`=96px · `16`=128px · `halb`=4px

Sektionen 80px (mobil 48px), betonte Sektion 112px, enge Leisten 48px. Rinne 32px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 80px: Referenzen sind mehrheitlich „dicht“. Referenzen nutzen ein 4px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 2px · Karte 8px · Knopf 2px · Bild 0px · Marke rund
- Schatten: papier (`0 1px 0 #e9dfd1, 0 16px 32px -24px rgba(46,26,34,.35)`)
- Bewegung: cubic-bezier(.5,0,.1,1), 720ms, Weg 16px, Versatz 120ms
  - Animiert werden nur transform und opacity.
  - Startzustände hängen an einer Klasse, die erst das Skript setzt – ohne JS ist alles sichtbar.
  - prefers-reduced-motion: reduce schaltet jede Bewegung ab.
  - Genau ein betonter Moment je Seite (siehe layout.betonterMoment).

Herleitung: Kartenradius aus v1-Stimmung (20px) auf 4px gerastert, im Abendhaus auf höchstens 8px begrenzt; Pillenform nur für kleine Marken. Traditionell: ein Papierschatten – Kante plus weicher Fall, nie auf jeder Karte. Kurve cubic-bezier(.5,0,.1,1) aus der v1-Handschrift „abend“.

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
- Kaffeebohnen-Clipart _(Küche)_
- Latte-Art-Stockfoto als Hero _(Küche)_
- Kreidetafel-Schriften _(Küche)_
- helle Vollflächen-Sektionen _(Archetyp)_
- mehr als ein Akzentton _(Archetyp)_
- schnelle Bewegungen unter 300ms _(Archetyp)_

## Bild-Kanon

- Licht: Pendel- oder Kerzenlicht, tiefe Schatten, warm (ca. 2700 K), Hintergrund fällt ins Dunkle
- Perspektive: nah, geringe Schärfentiefe, ein Gericht oder ein Glas als einziges Licht im Bild
- Farbstimmung: hell, luftig; Akzent #b8557a darf im Bild vorkommen (Serviette, Keramik), sonst warme Neutrale
- Oberflächen & Requisiten: Marmortisch, Porzellantasse mit Untertasse, Zeitung, Kuchengabel
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, low pendant or candle light, deep shadows, warm 2700K, background falling into darkness, close-up, shallow depth of field, a single dish or glass as the only lit object, marble cafe table, porcelain cup and saucer, newspaper, cake fork, light airy palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: ruhig und knapp – wenige Worte, eher Einladung als Werbung
- Anrede: Sie, Satzlänge: kurz, 6–14 Wörter
- Wortfeld: Röstung, Kuchen, Frühstück, Tasse, Zeitung

