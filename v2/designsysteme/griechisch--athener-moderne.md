# Griechisch · Athener Moderne

Archetyp **Abend** · Schema **dunkel** · Designsystem `griechisch--athener-moderne` (maschinenlesbar: `griechisch--athener-moderne.json`)

> Athener Moderne: Galerie bei Nacht, Gold als einzige Farbe.

## Referenzen

- **[Delta (Athen)](https://www.deltarestaurant.gr)** (Restaurant) – übernommen: fast schwarzer Grund; sehr wenig Text; große Bildflächen · bewusst nicht: Videohintergrund ohne Pause
- **[Estiatorio Milos](https://www.estiatoriomilos.com)** (Restaurant) – übernommen: Versal-Kapitälchen für Rubriken; Gold/Messing als Detail · bewusst nicht: Standort-Auswahl als Einstieg
- **[Michael Wandelmaier](https://styles.refero.design/style/5b405eec-67ba-4dd0-8dab-ace000151a78)** (Refero-Style) – übernommen: Schwarz + Weiß + ein Akzent; eine feine Serife · bewusst nicht: Bonbon-Pillen

Referenz-Signal: Temperatur **warm**, Helligkeit **hell**, Sättigung **fast unbunt**, Dichte **dicht**, Layout **symmetrisch**, Bewegung **ruhig**.

## Farben – jede mit einer Aufgabe

| Rolle | Wert | Aufgabe | Verwendung |
|---|---|---|---|
| `grund` | `#13110e` | Seitengrund – trägt rund 60 % der Fläche | body, Sektionen ohne eigene Fläche |
| `flaeche` | `#17181c` | Erhöhte Fläche – Formulare, Warenkorb, Tafeln | Formular-Panel, Drawer, Menütafel |
| `flaecheTief` | `#1b1712` | Zweiter Grund für Sektionswechsel – ersetzt Trennlinien | jede zweite Sektion, Passepartout |
| `text` | `#f4f4f6` | Fließtext und Überschriften | body, h1–h3 |
| `textLeise` | `#a0a0ac` | Nebeninformation: Beschreibungen, Hinweise, Zeiten | Gerichtsbeschreibung, Formularhinweis |
| `linie` | `#373026` | Dekorative Haarlinie – nie alleiniger Träger von Information | Tabellenzeilen, Sektionskanten |
| `linieStark` | `#9f9c98` | Begrenzung von Bedienelementen (≥ 3:1) | Eingabefelder, Mengenknöpfe |
| `akzent` | `#bd9d44` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#c9af66` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#141013` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#bd9d44` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
| `signal` | `#c9a227` | Signalton für kleine Marken – nie als Fläche | Sterne, Hausempfehlung-Siegel |
| `signalText` | `#c9a227` | Signalton als lesbare Schrift auf hellen Gründen | Platzhalter-Kennzeichnung, Note |
| `tint` | `#08090b` | Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay | Hero-Tafel, Fußzeile |
| `aufTint` | `#f4f4f6` | Schrift auf der Tafel | Hero-Tafel, Fußzeile |
| `aufTintLeise` | `#b2b2b4` | Nebenschrift auf der Tafel | Fußzeilen-Links |
| `signalAufTint` | `#c9a227` | Signalton auf der Tafel | Sterne im Hero |
| `fehler` | `#ff8a80` | Fehlermeldungen in Formularen | Formularfehler, Ablehnung |

Kontraste (vom Build erzwungen):

| Schrift | Grund | Verhältnis | Mindestens |
|---|---|---|---|
| text | grund | 17.16:1 | 4.5:1 |
| text | flaeche | 16.15:1 | 4.5:1 |
| text | flaecheTief | 16.23:1 | 4.5:1 |
| textLeise | grund | 7.29:1 | 4.5:1 |
| textLeise | flaeche | 6.86:1 | 4.5:1 |
| textLeise | flaecheTief | 6.89:1 | 4.5:1 |
| akzentText | grund | 7.24:1 | 4.5:1 |
| akzentText | flaeche | 6.82:1 | 4.5:1 |
| akzentText | flaecheTief | 6.85:1 | 4.5:1 |
| aufAkzent | akzent | 7.25:1 | 4.5:1 |
| aufAkzent | akzentTief | 8.81:1 | 4.5:1 |
| signalText | grund | 7.79:1 | 4.5:1 |
| signalText | flaeche | 7.33:1 | 4.5:1 |
| signalText | flaecheTief | 7.37:1 | 4.5:1 |
| aufTint | tint | 18.13:1 | 4.5:1 |
| aufTintLeise | tint | 9.41:1 | 4.5:1 |
| signalAufTint | tint | 8.23:1 | 4.5:1 |
| fehler | flaeche | 7.77:1 | 4.5:1 |
| fehler | grund | 8.26:1 | 4.5:1 |
| fehler | flaecheTief | 7.81:1 | 4.5:1 |
| linieStark | flaeche | 6.49:1 | 3:1 |
| linieStark | grund | 6.90:1 | 3:1 |
| akzent | grund | 7.24:1 | 3:1 |

Herleitung: Neutrale warm getönt (#0f1012 → #13110e), weil die Referenzen mehrheitlich warm sind. Akzent gedämpft (#c9a227 → #b99a37, Sättigung ×0.8), Referenzen sind fast unbunt. Akzent 20 % Richtung Referenz-Akzent #cba977 gezogen (#b99a37 → #bd9d44).

## Typografie

- **Anzeige:** Tenor Sans 400, Versalien – humanistische Versalgrotesk – Galerieschild bei Nacht
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

Herleitung: 1 von 3 ausgewerteten Referenzen führen ebenfalls mit Grotesk (grotesk, serif, serif).

## Spacing (8px-Raster)

Skala: `1`=8px · `2`=16px · `3`=24px · `4`=32px · `5`=40px · `6`=48px · `8`=64px · `10`=80px · `12`=96px · `16`=128px · `halb`=4px

Sektionen 80px (mobil 48px), betonte Sektion 112px, enge Leisten 48px. Rinne 32px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 80px: Referenzen sind mehrheitlich „dicht“. Referenzen nutzen ein 4px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 2px · Karte 4px · Knopf 2px · Bild 0px · Marke rund
- Schatten: linie (`0 0 0 1px #373026`)
- Bewegung: cubic-bezier(.5,0,.1,1), 720ms, Weg 16px, Versatz 120ms
  - Animiert werden nur transform und opacity.
  - Startzustände hängen an einer Klasse, die erst das Skript setzt – ohne JS ist alles sichtbar.
  - prefers-reduced-motion: reduce schaltet jede Bewegung ab.
  - Genau ein betonter Moment je Seite (siehe layout.betonterMoment).

Herleitung: Kartenradius aus v1-Stimmung (4px) auf 4px gerastert, im Abendhaus auf höchstens 8px begrenzt; Pillenform nur für kleine Marken. Dunkler Grund: Schatten wären unsichtbar – Kanten statt Schatten. Kurve cubic-bezier(.5,0,.1,1) aus der v1-Handschrift „abend“.

## Layout-Regeln

- Maximale Breite 1120px, 12 Spalten, Verhältnis 6/6, Textbreite 62ch
- Hero-Varianten (Seed wählt): `tafel` – Vollbild-Foto, darauf eine deckende Tafel unten links – kein Verlaufsschleier; `typo` – Übergroßer Name über die Breite, darunter ein Bildband im Kinoformat; `spalte-bild` – Textspalte auf dem Grund links, Foto randabfallend rechts; `passepartout` – Foto im Passepartout, Textblock überlappt die Rahmenkante versetzt
- Sektionsfolge: ambiente → karte → highlights → stimmen → reservierung → kontakt
- Highlights als `leseliste`, Karte als `spalten`, Stimmen als `zitat`
- Betonter Moment: **reservierung** (einzige Sektion mit Extra-Luft und eigener Bewegung)
- Kopfzeile fest, Hauptaktion Reservieren, mobile Aktionsleiste an
- Flächenwechsel grund ↔ flaecheTief statt Trennlinien

Herleitung: Sektionsfolge, Kopfzeile und Hauptaktion aus designPresets.js (Archetyp „abend“). Referenzen eher symmetrisch – versetzte Hero-Aufbauten nachrangig.

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
- Mäanderbordüren _(Küche)_
- Säulen und Tempel-Silhouetten _(Küche)_
- Flaggenblau als Vollfläche _(Küche)_
- helle Vollflächen-Sektionen _(Archetyp)_
- mehr als ein Akzentton _(Archetyp)_
- schnelle Bewegungen unter 300ms _(Archetyp)_

## Bild-Kanon

- Licht: Pendel- oder Kerzenlicht, tiefe Schatten, warm (ca. 2700 K), Hintergrund fällt ins Dunkle
- Perspektive: nah, geringe Schärfentiefe, ein Gericht oder ein Glas als einziges Licht im Bild
- Farbstimmung: dunkel, satt; Akzent #c9a227 darf im Bild vorkommen (Serviette, Keramik), sonst warme Neutrale
- Oberflächen & Requisiten: Kalkwand, blau gestrichenes Holz, Olivenzweig, Emaillegeschirr, Zitronen
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, low pendant or candle light, deep shadows, warm 2700K, background falling into darkness, close-up, shallow depth of field, a single dish or glass as the only lit object, whitewashed wall, blue painted wood, olive branch, enamel plates, lemons, dark moody palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: ruhig und knapp – wenige Worte, eher Einladung als Werbung
- Anrede: Sie, Satzlänge: kurz, 6–14 Wörter
- Wortfeld: Holzkohle, Oregano, Zitrone, Meze, Hafen, Tagesfang

