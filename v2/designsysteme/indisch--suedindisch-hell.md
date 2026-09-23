# Indisch · Südindisch hell

Archetyp **Hell & modern** · Schema **hell** · Designsystem `indisch--suedindisch-hell` (maschinenlesbar: `indisch--suedindisch-hell.json`)

> Südindisch hell: Bananenblatt, Kalk, Kokos – frisch und hell.

## Referenzen

- **[Kricket](https://www.kricket.co.uk)** (Restaurant) – übernommen: heller Grund; kurze Karte; ein Grün · bewusst nicht: -
- **[Amrit Palace](https://styles.refero.design/style/b753dfda-cbe1-41e4-b341-b98d69c8422f)** (Refero-Style) – übernommen: Pergament-Beige; hauchfeine Serifen-Headlines; Safran nur als Punkt · bewusst nicht: Satoshi

Referenz-Signal: Temperatur **warm**, Helligkeit **gemischt**, Sättigung **kräftig**, Dichte **luftig**, Layout **gemischt**, Bewegung **ruhig**.

## Farben – jede mit einer Aufgabe

| Rolle | Wert | Aufgabe | Verwendung |
|---|---|---|---|
| `grund` | `#fbfaf7` | Seitengrund – trägt rund 60 % der Fläche | body, Sektionen ohne eigene Fläche |
| `flaeche` | `#ffffff` | Erhöhte Fläche – Formulare, Warenkorb, Tafeln | Formular-Panel, Drawer, Menütafel |
| `flaecheTief` | `#f3efe9` | Zweiter Grund für Sektionswechsel – ersetzt Trennlinien | jede zweite Sektion, Passepartout |
| `text` | `#23241f` | Fließtext und Überschriften | body, h1–h3 |
| `textLeise` | `#63665c` | Nebeninformation: Beschreibungen, Hinweise, Zeiten | Gerichtsbeschreibung, Formularhinweis |
| `linie` | `#e7e1d8` | Dekorative Haarlinie – nie alleiniger Träger von Information | Tabellenzeilen, Sektionskanten |
| `linieStark` | `#7b7972` | Begrenzung von Bedienelementen (≥ 3:1) | Eingabefelder, Mengenknöpfe |
| `akzent` | `#46833c` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#396b31` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#ffffff` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#407937` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
| `signal` | `#c8a63c` | Signalton für kleine Marken – nie als Fläche | Sterne, Hausempfehlung-Siegel |
| `signalText` | `#7f6924` | Signalton als lesbare Schrift auf hellen Gründen | Platzhalter-Kennzeichnung, Note |
| `tint` | `#1e2a18` | Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay | Hero-Tafel, Fußzeile |
| `aufTint` | `#fdfdfb` | Schrift auf der Tafel | Hero-Tafel, Fußzeile |
| `aufTintLeise` | `#bfc2bb` | Nebenschrift auf der Tafel | Fußzeilen-Links |
| `signalAufTint` | `#c8a63c` | Signalton auf der Tafel | Sterne im Hero |
| `fehler` | `#b3261e` | Fehlermeldungen in Formularen | Formularfehler, Ablehnung |

Kontraste (vom Build erzwungen):

| Schrift | Grund | Verhältnis | Mindestens |
|---|---|---|---|
| text | grund | 14.97:1 | 4.5:1 |
| text | flaeche | 15.63:1 | 4.5:1 |
| text | flaecheTief | 13.65:1 | 4.5:1 |
| textLeise | grund | 5.61:1 | 4.5:1 |
| textLeise | flaeche | 5.86:1 | 4.5:1 |
| textLeise | flaecheTief | 5.11:1 | 4.5:1 |
| akzentText | grund | 5.02:1 | 4.5:1 |
| akzentText | flaeche | 5.24:1 | 4.5:1 |
| akzentText | flaecheTief | 4.57:1 | 4.5:1 |
| aufAkzent | akzent | 4.59:1 | 4.5:1 |
| aufAkzent | akzentTief | 6.32:1 | 4.5:1 |
| signalText | grund | 5.10:1 | 4.5:1 |
| signalText | flaeche | 5.32:1 | 4.5:1 |
| signalText | flaecheTief | 4.64:1 | 4.5:1 |
| aufTint | tint | 14.73:1 | 4.5:1 |
| aufTintLeise | tint | 8.32:1 | 4.5:1 |
| signalAufTint | tint | 6.41:1 | 4.5:1 |
| fehler | flaeche | 6.54:1 | 4.5:1 |
| fehler | grund | 6.26:1 | 4.5:1 |
| fehler | flaecheTief | 5.71:1 | 4.5:1 |
| linieStark | flaeche | 4.36:1 | 3:1 |
| linieStark | grund | 4.17:1 | 3:1 |
| akzent | grund | 4.40:1 | 3:1 |

Herleitung: Neutrale warm getönt (#fbfaf7 → #fbfaf7), weil die Referenzen mehrheitlich warm sind. Kein Referenz-Akzent in derselben Farbfamilie (#a42900) – Küchen-Akzent bleibt.

## Typografie

- **Anzeige:** Literata 600 – ruhige Buchantiqua – Bananenblatt, Kalk
- **Text:** Figtree 400/600 – freundliche, offene Textgrotesk
- **Rubriken:** Versalien, weit gesperrt (0.14em), klein
- **Skala:** kleine Terz (×1.2), Basis 17px

| Stufe | Desktop | Mobil | Einsatz |
|---|---|---|---|
| klein | 14px | – | Labels, Hinweise, Rubriken |
| basis | 17px | – | Fließtext, Formular |
| gross | 20px | – | Einleitungen, Preise der Hausempfehlung |
| h3 | 24px | – | Gerichtsnamen, Kartenköpfe |
| h2 | 35px | 29px | Sektionstitel |
| h1 | 51px | 39px | Name des Hauses |
| display | 61px | 42px | Typo-Hero |

Ausgeschlossen: Inter, Roboto, system-ui und alle weiteren Schriften aus `VERBOTENE_SCHRIFTEN`.

Herleitung: 0 von 2 ausgewerteten Referenzen führen ebenfalls mit Serife (grotesk, grotesk).

## Spacing (8px-Raster)

Skala: `1`=8px · `2`=16px · `3`=24px · `4`=32px · `5`=40px · `6`=48px · `8`=64px · `10`=80px · `12`=96px · `16`=128px · `halb`=4px

Sektionen 128px (mobil 64px), betonte Sektion 160px, enge Leisten 48px. Rinne 24px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 128px: Referenzen sind mehrheitlich „luftig“. Referenzen nutzen ein 10px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 6px · Karte 20px · Knopf 12px · Bild 20px · Marke rund
- Schatten: linie (`0 0 0 1px #e7e1d8`)
- Bewegung: cubic-bezier(.16,1,.3,1), 360ms, Weg 16px, Versatz 48ms
  - Animiert werden nur transform und opacity.
  - Startzustände hängen an einer Klasse, die erst das Skript setzt – ohne JS ist alles sichtbar.
  - prefers-reduced-motion: reduce schaltet jede Bewegung ab.
  - Genau ein betonter Moment je Seite (siehe layout.betonterMoment).

Herleitung: Kartenradius aus v1-Stimmung (18px) auf 4px gerastert; Pillenform nur für kleine Marken. Helles Haus: flach, Kanten statt Schatten. Kurve cubic-bezier(.16,1,.3,1) aus der v1-Handschrift „hell“.

## Layout-Regeln

- Maximale Breite 1280px, 12 Spalten, Verhältnis 5/7, Textbreite 62ch
- Hero-Varianten (Seed wählt): `typo` – Übergroßer Name über die Breite, darunter ein Bildband im Kinoformat; `karte` – Name und Claim links, rechts eine Tagesempfehlung als Menütafel, Foto als Einschub; `streifen` – Text oben, darunter drei Fotos in ungleichen Breiten; `spalte-bild` – Textspalte auf dem Grund links, Foto randabfallend rechts
- Sektionsfolge: karte → highlights → ambiente → stimmen → reservierung → kontakt
- Highlights als `reihe`, Karte als `liste`, Stimmen als `zeilen`
- Betonter Moment: **highlights** (einzige Sektion mit Extra-Luft und eigener Bewegung)
- Kopfzeile scrollt mit, Hauptaktion Bestellen, mobile Aktionsleiste an
- Flächenwechsel grund ↔ flaecheTief statt Trennlinien

Herleitung: Sektionsfolge, Kopfzeile und Hauptaktion aus designPresets.js (Archetyp „hell“). Referenzen gemischt – asymmetrisches Raster 5/7.

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
- schwere, dunkle Fotos _(Archetyp)_
- Schatten auf Karten _(Archetyp)_
- zentrierte Fließtexte _(Archetyp)_

## Bild-Kanon

- Licht: helles, diffuses Tageslicht, kaum Schatten, neutral (ca. 5000 K)
- Perspektive: Draufsicht oder frontal auf Tischhöhe, viel Luft um das Gericht
- Farbstimmung: hell, luftig; Akzent #46833c darf im Bild vorkommen (Serviette, Keramik), sonst warme Neutrale
- Oberflächen & Requisiten: Messing-Thali, Kupfer-Kadai, Gewürze in Schälchen, Naan auf Baumwolltuch
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, bright diffused daylight, minimal shadows, neutral 5000K, overhead or straight-on at table height, generous negative space around the dish, brass thali, copper kadai, spices in small bowls, naan on cotton cloth, light airy palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: direkt und praktisch – beantwortet zuerst: was, wann, wie schnell
- Anrede: Sie, Satzlänge: kurz bis mittel, 8–18 Wörter
- Wortfeld: Tandoor, Gewürze, Naan, Masala, Linsen

