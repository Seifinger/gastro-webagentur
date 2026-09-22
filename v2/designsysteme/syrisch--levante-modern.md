# Syrisch · Levante Modern

Archetyp **Hell & modern** · Schema **hell** · Designsystem `syrisch--levante-modern` (maschinenlesbar: `syrisch--levante-modern.json`)

> Levante modern: Ottolenghi-Helligkeit, Knochenweiß, Tinte, ein Braun.

## Referenzen

- **[Ottolenghi](https://ottolenghi.co.uk)** (Restaurant) – übernommen: heller, warmer Grund; große Food-Fotografie; ruhige Serife · bewusst nicht: Shop-Mega-Menü
- **[Honey & Co](https://www.honeyandco.co.uk)** (Restaurant) – übernommen: Kochbuch-Ton; warme Details · bewusst nicht: kleinteilige Kacheln
- **[D.S. & DURGA](https://styles.refero.design/style/391bd401-06d7-4444-8243-8573e96eab24)** (Refero-Style) – übernommen: Knochenweiß + schwarze Tinte; übergroße Schrift als einziger Schmuck · bewusst nicht: Sofia Pro

Referenz-Signal: Temperatur **warm**, Helligkeit **hell**, Sättigung **fast unbunt**, Dichte **luftig**, Layout **versetzt/asymmetrisch**, Bewegung **ruhig**.

## Farben – jede mit einer Aufgabe

| Rolle | Wert | Aufgabe | Verwendung |
|---|---|---|---|
| `grund` | `#fdfbf7` | Seitengrund – trägt rund 60 % der Fläche | body, Sektionen ohne eigene Fläche |
| `flaeche` | `#ffffff` | Erhöhte Fläche – Formulare, Warenkorb, Tafeln | Formular-Panel, Drawer, Menütafel |
| `flaecheTief` | `#f6f0e3` | Zweiter Grund für Sektionswechsel – ersetzt Trennlinien | jede zweite Sektion, Passepartout |
| `text` | `#2d2519` | Fließtext und Überschriften | body, h1–h3 |
| `textLeise` | `#726550` | Nebeninformation: Beschreibungen, Hinweise, Zeiten | Gerichtsbeschreibung, Formularhinweis |
| `linie` | `#eae0cf` | Dekorative Haarlinie – nie alleiniger Träger von Information | Tabellenzeilen, Sektionskanten |
| `linieStark` | `#82796b` | Begrenzung von Bedienelementen (≥ 3:1) | Eingabefelder, Mengenknöpfe |
| `akzent` | `#836947` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#6b563a` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#ffffff` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#836947` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
| `signal` | `#c0994a` | Signalton für kleine Marken – nie als Fläche | Sterne, Hausempfehlung-Siegel |
| `signalText` | `#85682e` | Signalton als lesbare Schrift auf hellen Gründen | Platzhalter-Kennzeichnung, Note |
| `tint` | `#2a2016` | Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay | Hero-Tafel, Fußzeile |
| `aufTint` | `#fefdfb` | Schrift auf der Tafel | Hero-Tafel, Fußzeile |
| `aufTintLeise` | `#c3bfbb` | Nebenschrift auf der Tafel | Fußzeilen-Links |
| `signalAufTint` | `#c0994a` | Signalton auf der Tafel | Sterne im Hero |
| `fehler` | `#b3261e` | Fehlermeldungen in Formularen | Formularfehler, Ablehnung |

Kontraste (vom Build erzwungen):

| Schrift | Grund | Verhältnis | Mindestens |
|---|---|---|---|
| text | grund | 14.62:1 | 4.5:1 |
| text | flaeche | 15.11:1 | 4.5:1 |
| text | flaecheTief | 13.30:1 | 4.5:1 |
| textLeise | grund | 5.50:1 | 4.5:1 |
| textLeise | flaeche | 5.69:1 | 4.5:1 |
| textLeise | flaecheTief | 5.01:1 | 4.5:1 |
| akzentText | grund | 4.98:1 | 4.5:1 |
| akzentText | flaeche | 5.15:1 | 4.5:1 |
| akzentText | flaecheTief | 4.54:1 | 4.5:1 |
| aufAkzent | akzent | 5.15:1 | 4.5:1 |
| aufAkzent | akzentTief | 6.96:1 | 4.5:1 |
| signalText | grund | 5.06:1 | 4.5:1 |
| signalText | flaeche | 5.23:1 | 4.5:1 |
| signalText | flaecheTief | 4.60:1 | 4.5:1 |
| aufTint | tint | 15.69:1 | 4.5:1 |
| aufTintLeise | tint | 8.73:1 | 4.5:1 |
| signalAufTint | tint | 6.00:1 | 4.5:1 |
| fehler | flaeche | 6.54:1 | 4.5:1 |
| fehler | grund | 6.32:1 | 4.5:1 |
| fehler | flaecheTief | 5.76:1 | 4.5:1 |
| linieStark | flaeche | 4.29:1 | 3:1 |
| linieStark | grund | 4.15:1 | 3:1 |
| akzent | grund | 4.98:1 | 3:1 |

Herleitung: Neutrale warm getönt (#fdfbf7 → #fdfbf7), weil die Referenzen mehrheitlich warm sind. Akzent gedämpft (#8a6a3f → #836947, Sättigung ×0.8), Referenzen sind fast unbunt. Kein Referenz-Akzent in derselben Farbfamilie (#cd001a) – Küchen-Akzent bleibt.

## Typografie

- **Anzeige:** Libre Caslon Display 400 – Caslon in Anzeigegröße – helle Levante, Kochbuch
- **Text:** Figtree 400/600 – freundliche, offene Textgrotesk
- **Rubriken:** Anzeigeschrift aufrecht in Einleitungsgröße – wie ein Etikett (keine künstliche Kursive)
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

Herleitung: 1 von 3 ausgewerteten Referenzen führen ebenfalls mit Serife (grotesk, serif, grotesk).

## Spacing (8px-Raster)

Skala: `1`=8px · `2`=16px · `3`=24px · `4`=32px · `5`=40px · `6`=48px · `8`=64px · `10`=80px · `12`=96px · `16`=128px · `halb`=4px

Sektionen 128px (mobil 64px), betonte Sektion 160px, enge Leisten 48px. Rinne 24px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 128px: Referenzen sind mehrheitlich „luftig“. Referenzen nutzen ein 4px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 6px · Karte 20px · Knopf 12px · Bild 20px · Marke rund
- Schatten: linie (`0 0 0 1px #eae0cf`)
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

Herleitung: Sektionsfolge, Kopfzeile und Hauptaktion aus designPresets.js (Archetyp „hell“). Referenzen versetzt/asymmetrisch – asymmetrisches Raster 5/7.

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
- schwere, dunkle Fotos _(Archetyp)_
- Schatten auf Karten _(Archetyp)_
- zentrierte Fließtexte _(Archetyp)_

## Bild-Kanon

- Licht: helles, diffuses Tageslicht, kaum Schatten, neutral (ca. 5000 K)
- Perspektive: Draufsicht oder frontal auf Tischhöhe, viel Luft um das Gericht
- Farbstimmung: hell, luftig; Akzent #8a6a3f darf im Bild vorkommen (Serviette, Keramik), sonst warme Neutrale
- Oberflächen & Requisiten: Messingtablett, Mezze-Schälchen, Granatapfel, Fliesenmuster unscharf im Hintergrund
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, bright diffused daylight, minimal shadows, neutral 5000K, overhead or straight-on at table height, generous negative space around the dish, brass tray, small mezze bowls, pomegranate, blurred tile pattern in background, light airy palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: direkt und praktisch – beantwortet zuerst: was, wann, wie schnell
- Anrede: Sie, Satzlänge: kurz bis mittel, 8–18 Wörter
- Wortfeld: Mezze, Tahini, Granatapfel, Fladenbrot, Za'atar, Tee

