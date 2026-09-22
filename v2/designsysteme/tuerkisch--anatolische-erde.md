# Türkisch · Anatolische Erde

Archetyp **Hell & modern** · Schema **hell** · Designsystem `tuerkisch--anatolische-erde` (maschinenlesbar: `tuerkisch--anatolische-erde.json`)

> Anatolische Erde: Ton, Terrakotta, Leinen – hell und erdig.

## Referenzen

- **[Oklava](https://www.oklava.co.uk)** (Restaurant) – übernommen: Terrakotta-Akzent; warme helle Flächen · bewusst nicht: Instagram-Wand
- **[Fallen Grape](https://styles.refero.design/style/17ce9ad2-f22d-4e48-92de-e28fb8551cc5)** (Refero-Style) – übernommen: Cream + Walnuss + Terrakotta; Etiketten-Typografie · bewusst nicht: Arial Narrow

Referenz-Signal: Temperatur **kühl**, Helligkeit **dunkel**, Sättigung **gedeckt**, Dichte **ausgewogen**, Layout **symmetrisch**, Bewegung **lebendig**.

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
| `akzent` | `#a3663d` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#865432` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#ffffff` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#985f39` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
| `signal` | `#c08a33` | Signalton für kleine Marken – nie als Fläche | Sterne, Hausempfehlung-Siegel |
| `signalText` | `#8c6425` | Signalton als lesbare Schrift auf hellen Gründen | Platzhalter-Kennzeichnung, Note |
| `tint` | `#2b1d12` | Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay | Hero-Tafel, Fußzeile |
| `aufTint` | `#fefdfb` | Schrift auf der Tafel | Hero-Tafel, Fußzeile |
| `aufTintLeise` | `#c3beba` | Nebenschrift auf der Tafel | Fußzeilen-Links |
| `signalAufTint` | `#c08a33` | Signalton auf der Tafel | Sterne im Hero |
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
| akzentText | grund | 5.04:1 | 4.5:1 |
| akzentText | flaeche | 5.21:1 | 4.5:1 |
| akzentText | flaecheTief | 4.59:1 | 4.5:1 |
| aufAkzent | akzent | 4.64:1 | 4.5:1 |
| aufAkzent | akzentTief | 6.31:1 | 4.5:1 |
| signalText | grund | 5.12:1 | 4.5:1 |
| signalText | flaeche | 5.30:1 | 4.5:1 |
| signalText | flaecheTief | 4.66:1 | 4.5:1 |
| aufTint | tint | 16.05:1 | 4.5:1 |
| aufTintLeise | tint | 8.85:1 | 4.5:1 |
| signalAufTint | tint | 5.38:1 | 4.5:1 |
| fehler | flaeche | 6.54:1 | 4.5:1 |
| fehler | grund | 6.32:1 | 4.5:1 |
| fehler | flaecheTief | 5.76:1 | 4.5:1 |
| linieStark | flaeche | 4.29:1 | 3:1 |
| linieStark | grund | 4.15:1 | 3:1 |
| akzent | grund | 4.49:1 | 3:1 |

Herleitung: Neutrale kühl getönt (#fdfbf7 → #fdfbf7), weil die Referenzen mehrheitlich kühl sind. Akzent gedämpft (#a85c2e → #a25e34, Sättigung ×0.9), Referenzen sind gedeckt. Akzent 20 % Richtung Referenz-Akzent #e3a36e gezogen (#a25e34 → #af6c40). Akzent für lesbare Knopfschrift und 3:1 gegen den Grund verschoben (#af6c40 → #a3663d).

## Typografie

- **Anzeige:** Alegreya 700 – kalligrafische Buchschrift – Erde, Ton, Handwerk
- **Text:** Alegreya Sans 400/500 – humanistische Textgrotesk mit Schreibduktus
- **Rubriken:** Versalien, weit gesperrt (0.14em), klein
- **Skala:** kleine Terz (×1.2), Basis 18px

| Stufe | Desktop | Mobil | Einsatz |
|---|---|---|---|
| klein | 15px | – | Labels, Hinweise, Rubriken |
| basis | 18px | – | Fließtext, Formular |
| gross | 22px | – | Einleitungen, Preise der Hausempfehlung |
| h3 | 26px | – | Gerichtsnamen, Kartenköpfe |
| h2 | 37px | 31px | Sektionstitel |
| h1 | 54px | 41px | Name des Hauses |
| display | 64px | 45px | Typo-Hero |

Ausgeschlossen: Inter, Roboto, system-ui und alle weiteren Schriften aus `VERBOTENE_SCHRIFTEN`.

Herleitung: 1 von 2 ausgewerteten Referenzen führen ebenfalls mit Serife (grotesk, serif).

## Spacing (8px-Raster)

Skala: `1`=8px · `2`=16px · `3`=24px · `4`=32px · `5`=40px · `6`=48px · `8`=64px · `10`=80px · `12`=96px · `16`=128px · `halb`=4px

Sektionen 96px (mobil 64px), betonte Sektion 128px, enge Leisten 48px. Rinne 24px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 96px: Referenzen sind mehrheitlich „ausgewogen“. Referenzen nutzen ein 4px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 6px · Karte 16px · Knopf 12px · Bild 16px · Marke rund
- Schatten: linie (`0 0 0 1px #eae0cf`)
- Bewegung: cubic-bezier(.16,1,.3,1), 306ms, Weg 16px, Versatz 48ms
  - Animiert werden nur transform und opacity.
  - Startzustände hängen an einer Klasse, die erst das Skript setzt – ohne JS ist alles sichtbar.
  - prefers-reduced-motion: reduce schaltet jede Bewegung ab.
  - Genau ein betonter Moment je Seite (siehe layout.betonterMoment).

Herleitung: Kartenradius aus v1-Stimmung (16px) auf 4px gerastert; Pillenform nur für kleine Marken. Helles Haus: flach, Kanten statt Schatten. Kurve cubic-bezier(.16,1,.3,1) aus der v1-Handschrift „hell“. Referenzen bewegen sich lebendig – Auftritte 15 % kürzer.

## Layout-Regeln

- Maximale Breite 1280px, 12 Spalten, Verhältnis 6/6, Textbreite 62ch
- Hero-Varianten (Seed wählt): `typo` – Übergroßer Name über die Breite, darunter ein Bildband im Kinoformat; `karte` – Name und Claim links, rechts eine Tagesempfehlung als Menütafel, Foto als Einschub; `spalte-bild` – Textspalte auf dem Grund links, Foto randabfallend rechts; `streifen` – Text oben, darunter drei Fotos in ungleichen Breiten
- Sektionsfolge: karte → highlights → ambiente → stimmen → reservierung → kontakt
- Highlights als `reihe`, Karte als `liste`, Stimmen als `zeilen`
- Betonter Moment: **highlights** (einzige Sektion mit Extra-Luft und eigener Bewegung)
- Kopfzeile scrollt mit, Hauptaktion Bestellen, mobile Aktionsleiste an
- Flächenwechsel grund ↔ flaecheTief statt Trennlinien

Herleitung: Sektionsfolge, Kopfzeile und Hauptaktion aus designPresets.js (Archetyp „hell“). Referenzen eher symmetrisch – versetzte Hero-Aufbauten nachrangig.

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
- Halbmond-Ornamente _(Küche)_
- Bauchtanz-/Basar-Kitsch _(Küche)_
- Gold-Arabesken als Rahmen _(Küche)_
- schwere, dunkle Fotos _(Archetyp)_
- Schatten auf Karten _(Archetyp)_
- zentrierte Fließtexte _(Archetyp)_

## Bild-Kanon

- Licht: helles, diffuses Tageslicht, kaum Schatten, neutral (ca. 5000 K)
- Perspektive: Draufsicht oder frontal auf Tischhöhe, viel Luft um das Gericht
- Farbstimmung: hell, luftig; Akzent #a85c2e darf im Bild vorkommen (Serviette, Keramik), sonst kühle Neutrale
- Oberflächen & Requisiten: Kupfertablett, Tulpenglas mit Tee, Fladenbrot, Sumach, Keramik in Iznik-Blau
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, bright diffused daylight, minimal shadows, neutral 5000K, overhead or straight-on at table height, generous negative space around the dish, copper tray, tulip glass of tea, flatbread, sumac, Iznik-blue ceramics, light airy palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: direkt und praktisch – beantwortet zuerst: was, wann, wie schnell
- Anrede: Sie, Satzlänge: kurz bis mittel, 8–18 Wörter
- Wortfeld: Holzkohlegrill, Fladenbrot, Sumach, Çay, Spieß, Joghurt

