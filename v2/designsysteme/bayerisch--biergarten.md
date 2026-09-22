# Bayerisch · Biergarten

Archetyp **Hell & modern** · Schema **hell** · Designsystem `bayerisch--biergarten` (maschinenlesbar: `bayerisch--biergarten.json`)

> Biergarten ist Tageslicht unter Kastanien: viel Luft, Grün, nichts Schweres.

## Referenzen

- **[Königlicher Hirschgarten](https://www.hirschgarten.de/en/)** (Restaurant) – übernommen: heller, kühler Grund; Grün als Akzent; Öffnungszeiten weit oben · bewusst nicht: Wetter-Widgets
- **[Seehaus im Englischen Garten](https://www.kuffler.de/de/seehaus)** (Restaurant) – übernommen: große, helle Bildflächen; wenig Text pro Abschnitt · bewusst nicht: Konzern-Kopfzeile
- **[sweetgreen](https://styles.refero.design/style/d91841cf-c717-43ef-97a2-400778fa6e1a)** (Refero-Style) – übernommen: tiefes Grün + heller Grund; freundliche, runde Flächen · bewusst nicht: Neon-Limette (zu digital)

Referenz-Signal: Temperatur **warm**, Helligkeit **hell**, Sättigung **gedeckt**, Dichte **luftig**, Layout **gemischt**, Bewegung **ruhig**.

## Farben – jede mit einer Aufgabe

| Rolle | Wert | Aufgabe | Verwendung |
|---|---|---|---|
| `grund` | `#fbfcfd` | Seitengrund – trägt rund 60 % der Fläche | body, Sektionen ohne eigene Fläche |
| `flaeche` | `#ffffff` | Erhöhte Fläche – Formulare, Warenkorb, Tafeln | Formular-Panel, Drawer, Menütafel |
| `flaecheTief` | `#eef3f7` | Zweiter Grund für Sektionswechsel – ersetzt Trennlinien | jede zweite Sektion, Passepartout |
| `text` | `#1c2733` | Fließtext und Überschriften | body, h1–h3 |
| `textLeise` | `#5d6b7a` | Nebeninformation: Beschreibungen, Hinweise, Zeiten | Gerichtsbeschreibung, Formularhinweis |
| `linie` | `#ece6dd` | Dekorative Haarlinie – nie alleiniger Träger von Information | Tabellenzeilen, Sektionskanten |
| `linieStark` | `#7a7d80` | Begrenzung von Bedienelementen (≥ 3:1) | Eingabefelder, Mengenknöpfe |
| `akzent` | `#749841` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#759a41` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#1c2733` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#597432` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
| `signal` | `#c8a63c` | Signalton für kleine Marken – nie als Fläche | Sterne, Hausempfehlung-Siegel |
| `signalText` | `#836c25` | Signalton als lesbare Schrift auf hellen Gründen | Platzhalter-Kennzeichnung, Note |
| `tint` | `#1e2a18` | Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay | Hero-Tafel, Fußzeile |
| `aufTint` | `#fdfefe` | Schrift auf der Tafel | Hero-Tafel, Fußzeile |
| `aufTintLeise` | `#bfc3be` | Nebenschrift auf der Tafel | Fußzeilen-Links |
| `signalAufTint` | `#c8a63c` | Signalton auf der Tafel | Sterne im Hero |
| `fehler` | `#b3261e` | Fehlermeldungen in Formularen | Formularfehler, Ablehnung |

Kontraste (vom Build erzwungen):

| Schrift | Grund | Verhältnis | Mindestens |
|---|---|---|---|
| text | grund | 14.74:1 | 4.5:1 |
| text | flaeche | 15.14:1 | 4.5:1 |
| text | flaecheTief | 13.55:1 | 4.5:1 |
| textLeise | grund | 5.31:1 | 4.5:1 |
| textLeise | flaeche | 5.46:1 | 4.5:1 |
| textLeise | flaecheTief | 4.88:1 | 4.5:1 |
| akzentText | grund | 5.15:1 | 4.5:1 |
| akzentText | flaeche | 5.29:1 | 4.5:1 |
| akzentText | flaecheTief | 4.74:1 | 4.5:1 |
| aufAkzent | akzent | 4.55:1 | 4.5:1 |
| aufAkzent | akzentTief | 4.65:1 | 4.5:1 |
| signalText | grund | 4.94:1 | 4.5:1 |
| signalText | flaeche | 5.08:1 | 4.5:1 |
| signalText | flaecheTief | 4.54:1 | 4.5:1 |
| aufTint | tint | 14.85:1 | 4.5:1 |
| aufTintLeise | tint | 8.41:1 | 4.5:1 |
| signalAufTint | tint | 6.41:1 | 4.5:1 |
| fehler | flaeche | 6.54:1 | 4.5:1 |
| fehler | grund | 6.36:1 | 4.5:1 |
| fehler | flaecheTief | 5.85:1 | 4.5:1 |
| linieStark | flaeche | 4.14:1 | 3:1 |
| linieStark | grund | 4.03:1 | 3:1 |
| akzent | grund | 3.24:1 | 3:1 |

Herleitung: Neutrale warm getönt (#fbfcfd → #fbfcfd), weil die Referenzen mehrheitlich warm sind. Akzent gedämpft (#568238 → #577e3c, Sättigung ×0.9), Referenzen sind gedeckt. Akzent 20 % Richtung Referenz-Akzent #e6ff55 gezogen (#577e3c → #749841).

## Typografie

- **Anzeige:** Fraunces 600 – weiche Old-Style-Serife mit Charakter – Tageslicht, Kastanien
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

Herleitung: 0 von 3 ausgewerteten Referenzen führen ebenfalls mit Serife (grotesk, schmal, grotesk).

## Spacing (8px-Raster)

Skala: `1`=8px · `2`=16px · `3`=24px · `4`=32px · `5`=40px · `6`=48px · `8`=64px · `10`=80px · `12`=96px · `16`=128px · `halb`=4px

Sektionen 128px (mobil 64px), betonte Sektion 160px, enge Leisten 48px. Rinne 24px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 128px: Referenzen sind mehrheitlich „luftig“. Referenzen nutzen ein 10px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 6px · Karte 20px · Knopf 12px · Bild 20px · Marke rund
- Schatten: linie (`0 0 0 1px #ece6dd`)
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
- Rautenmuster und blau-weißes Karo _(Küche)_
- Lederhosen-/Dirndl-Clipart _(Küche)_
- Frakturschrift als Dekoration _(Küche)_
- schwere, dunkle Fotos _(Archetyp)_
- Schatten auf Karten _(Archetyp)_
- zentrierte Fließtexte _(Archetyp)_

## Bild-Kanon

- Licht: helles, diffuses Tageslicht, kaum Schatten, neutral (ca. 5000 K)
- Perspektive: Draufsicht oder frontal auf Tischhöhe, viel Luft um das Gericht
- Farbstimmung: hell, luftig; Akzent #568238 darf im Bild vorkommen (Serviette, Keramik), sonst warme Neutrale
- Oberflächen & Requisiten: Eichenholztisch, Steinkrug, Brezen, Leinenserviette, Zinnteller
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, bright diffused daylight, minimal shadows, neutral 5000K, overhead or straight-on at table height, generous negative space around the dish, oak table, stoneware mug, pretzels, linen napkin, pewter plate, light airy palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: direkt und praktisch – beantwortet zuerst: was, wann, wie schnell
- Anrede: Sie, Satzlänge: kurz bis mittel, 8–18 Wörter
- Wortfeld: Kruste, Knödel, Brotzeit, Wirtsstube, Fass, Stammtisch, Kastanien

