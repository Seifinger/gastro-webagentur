# Türkisch · Basar

Archetyp **Traditionell** · Schema **hell** · Designsystem `tuerkisch--basar` (maschinenlesbar: `tuerkisch--basar.json`)

> Basar: Schildermalerei, schmale Versalien, Rot auf Sand – laut, aber gesetzt.

## Referenzen

- **[Karaköy Lokantası](https://www.karakoylokantasi.com)** (Restaurant) – übernommen: Karte als Tafel; Sandtöne · bewusst nicht: Mehrsprachen-Switcher als Hauptelement
- **[VALIENTE BRANDS](https://styles.refero.design/style/f63bf016-5b53-4ddf-9f8c-da43f75a9e2b)** (Refero-Style) – übernommen: ein einziges lautes Rot; warmer Tongrund; monolithische Grotesk · bewusst nicht: Pfirsich-Vollfläche
- **[Roberta's Pizza](https://styles.refero.design/style/3e497155-bd96-4134-a4a5-855bd885a25c)** (Refero-Style) – übernommen: Plakat-Hierarchie; Rot als Signal · bewusst nicht: Karo-Muster

Referenz-Signal: Temperatur **warm**, Helligkeit **gemischt**, Sättigung **fast unbunt**, Dichte **ausgewogen**, Layout **gemischt**, Bewegung **lebendig**.

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
| `akzent` | `#c13c2e` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#9e3126` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#ffffff` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#c13c2e` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
| `signal` | `#d6a233` | Signalton für kleine Marken – nie als Fläche | Sterne, Hausempfehlung-Siegel |
| `signalText` | `#88651b` | Signalton als lesbare Schrift auf hellen Gründen | Platzhalter-Kennzeichnung, Note |
| `tint` | `#2c1713` | Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay | Hero-Tafel, Fußzeile |
| `aufTint` | `#fefdfb` | Schrift auf der Tafel | Hero-Tafel, Fußzeile |
| `aufTintLeise` | `#c3bdba` | Nebenschrift auf der Tafel | Fußzeilen-Links |
| `signalAufTint` | `#d6a233` | Signalton auf der Tafel | Sterne im Hero |
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
| akzentText | grund | 5.14:1 | 4.5:1 |
| akzentText | flaeche | 5.31:1 | 4.5:1 |
| akzentText | flaecheTief | 4.68:1 | 4.5:1 |
| aufAkzent | akzent | 5.31:1 | 4.5:1 |
| aufAkzent | akzentTief | 7.19:1 | 4.5:1 |
| signalText | grund | 5.18:1 | 4.5:1 |
| signalText | flaeche | 5.35:1 | 4.5:1 |
| signalText | flaecheTief | 4.71:1 | 4.5:1 |
| aufTint | tint | 16.67:1 | 4.5:1 |
| aufTintLeise | tint | 9.13:1 | 4.5:1 |
| signalAufTint | tint | 7.32:1 | 4.5:1 |
| fehler | flaeche | 6.54:1 | 4.5:1 |
| fehler | grund | 6.32:1 | 4.5:1 |
| fehler | flaecheTief | 5.76:1 | 4.5:1 |
| linieStark | flaeche | 4.29:1 | 3:1 |
| linieStark | grund | 4.15:1 | 3:1 |
| akzent | grund | 5.14:1 | 3:1 |

Herleitung: Neutrale warm getönt (#fdfbf7 → #fdfbf7), weil die Referenzen mehrheitlich warm sind. Akzent gedämpft (#c0392b → #b1453a, Sättigung ×0.8), Referenzen sind fast unbunt. Akzent 20 % Richtung Referenz-Akzent #ff1a00 gezogen (#b1453a → #c13c2e).

## Typografie

- **Anzeige:** Barlow Condensed 700, Versalien – schmale Schildergrotesk – Marktstand, Basar
- **Text:** Work Sans 400/600 – Grotesk mit Plakat-Wurzeln
- **Rubriken:** Versalien, weit gesperrt (0.14em), klein
- **Skala:** große Terz (×1.25), Basis 17px

| Stufe | Desktop | Mobil | Einsatz |
|---|---|---|---|
| klein | 14px | – | Labels, Hinweise, Rubriken |
| basis | 17px | – | Fließtext, Formular |
| gross | 21px | – | Einleitungen, Preise der Hausempfehlung |
| h3 | 27px | – | Gerichtsnamen, Kartenköpfe |
| h2 | 42px | 33px | Sektionstitel |
| h1 | 75px | 46px | Name des Hauses |
| display | 97px | 52px | Typo-Hero |

Ausgeschlossen: Inter, Roboto, system-ui und alle weiteren Schriften aus `VERBOTENE_SCHRIFTEN`.

Herleitung: 3 von 3 ausgewerteten Referenzen führen ebenfalls mit schmaler Grotesk (grotesk, grotesk, grotesk).

## Spacing (8px-Raster)

Skala: `1`=8px · `2`=16px · `3`=24px · `4`=32px · `5`=40px · `6`=48px · `8`=64px · `10`=80px · `12`=96px · `16`=128px · `halb`=4px

Sektionen 96px (mobil 64px), betonte Sektion 128px, enge Leisten 48px. Rinne 32px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 96px: Referenzen sind mehrheitlich „ausgewogen“. Referenzen nutzen ein 4px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 4px · Karte 12px · Knopf 8px · Bild 12px · Marke rund
- Schatten: papier (`0 1px 0 #eae0cf, 0 16px 32px -24px rgba(44,23,19,.35)`)
- Bewegung: cubic-bezier(.2,.72,.3,1), 442ms, Weg 24px, Versatz 80ms
  - Animiert werden nur transform und opacity.
  - Startzustände hängen an einer Klasse, die erst das Skript setzt – ohne JS ist alles sichtbar.
  - prefers-reduced-motion: reduce schaltet jede Bewegung ab.
  - Genau ein betonter Moment je Seite (siehe layout.betonterMoment).

Herleitung: Kartenradius aus v1-Stimmung (10px) auf 4px gerastert; Pillenform nur für kleine Marken. Traditionell: ein Papierschatten – Kante plus weicher Fall, nie auf jeder Karte. Kurve cubic-bezier(.2,.72,.3,1) aus der v1-Handschrift „traditionell“. Referenzen bewegen sich lebendig – Auftritte 15 % kürzer.

## Layout-Regeln

- Maximale Breite 1200px, 12 Spalten, Verhältnis 5/7, Textbreite 62ch
- Hero-Varianten (Seed wählt): `spalte-bild` – Textspalte auf dem Grund links, Foto randabfallend rechts; `karte` – Name und Claim links, rechts eine Tagesempfehlung als Menütafel, Foto als Einschub; `passepartout` – Foto im Passepartout, Textblock überlappt die Rahmenkante versetzt; `tafel` – Vollbild-Foto, darauf eine deckende Tafel unten links – kein Verlaufsschleier
- Sektionsfolge: highlights → karte → ambiente → stimmen → reservierung → kontakt
- Highlights als `treppe`, Karte als `tafel`, Stimmen als `blatt`
- Betonter Moment: **hero** (einzige Sektion mit Extra-Luft und eigener Bewegung)
- Kopfzeile fest, Hauptaktion Bestellen, mobile Aktionsleiste an
- Flächenwechsel grund ↔ flaecheTief statt Trennlinien

Herleitung: Sektionsfolge, Kopfzeile und Hauptaktion aus designPresets.js (Archetyp „traditionell“). Referenzen gemischt – asymmetrisches Raster 5/7.

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
- Neonfarben _(Archetyp)_
- Glanz-Knöpfe _(Archetyp)_

## Bild-Kanon

- Licht: weiches Seitenlicht vom Fenster, später Vormittag, warm (ca. 3800 K), Schatten sichtbar aber offen
- Perspektive: 45°-Tischperspektive, Anschnitt am Tellerrand, Hände des Personals dürfen im Bild sein
- Farbstimmung: hell, luftig; Akzent #c0392b darf im Bild vorkommen (Serviette, Keramik), sonst warme Neutrale
- Oberflächen & Requisiten: Kupfertablett, Tulpenglas mit Tee, Fladenbrot, Sumach, Keramik in Iznik-Blau
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, soft window side light, late morning, warm 3800K, open soft shadows, 45-degree table angle, cropped at the plate edge, staff hands allowed in frame, copper tray, tulip glass of tea, flatbread, sumac, Iznik-blue ceramics, light airy palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: bodenständig und konkret – sagt, was es gibt und wie es gemacht wird, ohne zu schwärmen
- Anrede: Sie, Satzlänge: kurz bis mittel, 8–18 Wörter
- Wortfeld: Holzkohlegrill, Fladenbrot, Sumach, Çay, Spieß, Joghurt

