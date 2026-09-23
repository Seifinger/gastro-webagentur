# Italienisch · Trattoria

Archetyp **Traditionell** · Schema **hell** · Designsystem `italienisch--trattoria` (maschinenlesbar: `italienisch--trattoria.json`)

> Trattoria: Kochbuchseite, Terrakotta, Papier – nicht rot-weißes Karo.

## Referenzen

- **[Bocca di Lupo](https://www.boccadilupo.com)** (Restaurant) – übernommen: Karte als lange, gut gesetzte Liste; warmer Grund · bewusst nicht: kleine Schrift in der Karte
- **[Padella](https://www.padella.co)** (Restaurant) – übernommen: großflächiges Foto; wenige, klare Wege · bewusst nicht: schwarzer Vollflächen-Grund
- **[Alison Roman](https://styles.refero.design/style/b2ace2c1-d6ee-4d57-915e-901224cded11)** (Refero-Style) – übernommen: Cream-Papier; tiefes Rot-Braun als Tinte; Serifen-Überschriften · bewusst nicht: Systemschrift als Text

Referenz-Signal: Temperatur **warm**, Helligkeit **dunkel**, Sättigung **gedeckt**, Dichte **luftig**, Layout **symmetrisch**, Bewegung **ruhig**.

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
| `akzent` | `#a43d1e` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#863219` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#ffffff` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#a43d1e` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
| `signal` | `#c1872c` | Signalton für kleine Marken – nie als Fläche | Sterne, Hausempfehlung-Siegel |
| `signalText` | `#8f6421` | Signalton als lesbare Schrift auf hellen Gründen | Platzhalter-Kennzeichnung, Note |
| `tint` | `#2e2018` | Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay | Hero-Tafel, Fußzeile |
| `aufTint` | `#fefdfa` | Schrift auf der Tafel | Hero-Tafel, Fußzeile |
| `aufTintLeise` | `#c4bfbb` | Nebenschrift auf der Tafel | Fußzeilen-Links |
| `signalAufTint` | `#c1872c` | Signalton auf der Tafel | Sterne im Hero |
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
| akzentText | grund | 6.18:1 | 4.5:1 |
| akzentText | flaeche | 6.43:1 | 4.5:1 |
| akzentText | flaecheTief | 5.59:1 | 4.5:1 |
| aufAkzent | akzent | 6.43:1 | 4.5:1 |
| aufAkzent | akzentTief | 8.45:1 | 4.5:1 |
| signalText | grund | 5.03:1 | 4.5:1 |
| signalText | flaeche | 5.23:1 | 4.5:1 |
| signalText | flaecheTief | 4.55:1 | 4.5:1 |
| aufTint | tint | 15.45:1 | 4.5:1 |
| aufTintLeise | tint | 8.62:1 | 4.5:1 |
| signalAufTint | tint | 5.07:1 | 4.5:1 |
| fehler | flaeche | 6.54:1 | 4.5:1 |
| fehler | grund | 6.28:1 | 4.5:1 |
| fehler | flaecheTief | 5.68:1 | 4.5:1 |
| linieStark | flaeche | 4.40:1 | 3:1 |
| linieStark | grund | 4.23:1 | 3:1 |
| akzent | grund | 6.18:1 | 3:1 |

Herleitung: Neutrale warm getönt (#fdfaf5 → #fdfaf5), weil die Referenzen mehrheitlich warm sind. Akzent gedämpft (#b4451f → #ad4926, Sättigung ×0.9), Referenzen sind gedeckt. Akzent 20 % Richtung Referenz-Akzent #810c00 gezogen (#ad4926 → #a43d1e).

## Typografie

- **Anzeige:** EB Garamond 600 – Garamond wie im Kochbuch – Trattoria ohne Karo
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

Herleitung: 1 von 3 ausgewerteten Referenzen führen ebenfalls mit Serife (grotesk, schmal, serif). Skala auf Quarte angehoben: Referenzen sind luftig, große Headlines tragen.

## Spacing (8px-Raster)

Skala: `1`=8px · `2`=16px · `3`=24px · `4`=32px · `5`=40px · `6`=48px · `8`=64px · `10`=80px · `12`=96px · `16`=128px · `halb`=4px

Sektionen 128px (mobil 64px), betonte Sektion 160px, enge Leisten 48px. Rinne 32px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 128px: Referenzen sind mehrheitlich „luftig“. Referenzen nutzen ein 4px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 6px · Karte 16px · Knopf 8px · Bild 16px · Marke rund
- Schatten: papier (`0 1px 0 #e9dfd1, 0 16px 32px -24px rgba(46,32,24,.35)`)
- Bewegung: cubic-bezier(.2,.72,.3,1), 520ms, Weg 24px, Versatz 80ms
  - Animiert werden nur transform und opacity.
  - Startzustände hängen an einer Klasse, die erst das Skript setzt – ohne JS ist alles sichtbar.
  - prefers-reduced-motion: reduce schaltet jede Bewegung ab.
  - Genau ein betonter Moment je Seite (siehe layout.betonterMoment).

Herleitung: Kartenradius aus v1-Stimmung (16px) auf 4px gerastert; Pillenform nur für kleine Marken. Traditionell: ein Papierschatten – Kante plus weicher Fall, nie auf jeder Karte. Kurve cubic-bezier(.2,.72,.3,1) aus der v1-Handschrift „traditionell“.

## Layout-Regeln

- Maximale Breite 1200px, 12 Spalten, Verhältnis 6/6, Textbreite 62ch
- Hero-Varianten (Seed wählt): `spalte-bild` – Textspalte auf dem Grund links, Foto randabfallend rechts; `karte` – Name und Claim links, rechts eine Tagesempfehlung als Menütafel, Foto als Einschub; `tafel` – Vollbild-Foto, darauf eine deckende Tafel unten links – kein Verlaufsschleier; `passepartout` – Foto im Passepartout, Textblock überlappt die Rahmenkante versetzt
- Sektionsfolge: highlights → karte → ambiente → stimmen → reservierung → kontakt
- Highlights als `treppe`, Karte als `tafel`, Stimmen als `blatt`
- Betonter Moment: **hero** (einzige Sektion mit Extra-Luft und eigener Bewegung)
- Kopfzeile fest, Hauptaktion Bestellen, mobile Aktionsleiste an
- Flächenwechsel grund ↔ flaecheTief statt Trennlinien

Herleitung: Sektionsfolge, Kopfzeile und Hauptaktion aus designPresets.js (Archetyp „traditionell“). Referenzen eher symmetrisch – versetzte Hero-Aufbauten nachrangig.

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
- Rot-weiß-grüne Flaggenstreifen _(Küche)_
- Karo-Tischdecke als Hintergrund _(Küche)_
- Kolosseum-/Gondel-Motive _(Küche)_
- Neonfarben _(Archetyp)_
- Glanz-Knöpfe _(Archetyp)_

## Bild-Kanon

- Licht: weiches Seitenlicht vom Fenster, später Vormittag, warm (ca. 3800 K), Schatten sichtbar aber offen
- Perspektive: 45°-Tischperspektive, Anschnitt am Tellerrand, Hände des Personals dürfen im Bild sein
- Farbstimmung: hell, luftig; Akzent #b4451f darf im Bild vorkommen (Serviette, Keramik), sonst warme Neutrale
- Oberflächen & Requisiten: Marmorplatte, Olivenöl in Blechkanne, Leinentuch, Mehlstaub, Wasserglas
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, soft window side light, late morning, warm 3800K, open soft shadows, 45-degree table angle, cropped at the plate edge, staff hands allowed in frame, marble slab, olive oil in a tin can, linen cloth, dusting of flour, simple water glass, light airy palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: bodenständig und konkret – sagt, was es gibt und wie es gemacht wird, ohne zu schwärmen
- Anrede: Sie, Satzlänge: kurz bis mittel, 8–18 Wörter
- Wortfeld: Teig, Holzofen, Basilikum, Pecorino, al dente, Tagesgericht

