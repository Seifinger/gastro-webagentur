# Japanisch · Omakase

Archetyp **Abend** · Schema **dunkel** · Designsystem `japanisch--omakase` (maschinenlesbar: `japanisch--omakase.json`)

> Omakase: Tresen aus Hinoki, Champagnerlicht, absolute Ruhe.

## Referenzen

- **[Sushi Nakazawa](https://www.sushinakazawa.com)** (Restaurant) – übernommen: sehr wenig Inhalt; Reservierung als einzige Aktion · bewusst nicht: Presse-Zitate-Wand
- **[Masa](https://www.masanyc.com)** (Restaurant) – übernommen: Leere als Luxus; feine Serife · bewusst nicht: fehlende Informationen
- **[Atoms](https://styles.refero.design/style/4433dfe7-315a-4459-bfd7-f59ccdc09bad)** (Refero-Style) – übernommen: Obsidian-Grund; Champagner als einziger Akzent · bewusst nicht: Switzer/system-ui

Referenz-Signal: Temperatur **neutral**, Helligkeit **dunkel**, Sättigung **fast unbunt**, Dichte **ausgewogen**, Layout **symmetrisch**, Bewegung **ruhig**.

## Farben – jede mit einer Aufgabe

| Rolle | Wert | Aufgabe | Verwendung |
|---|---|---|---|
| `grund` | `#0f1012` | Seitengrund – trägt rund 60 % der Fläche | body, Sektionen ohne eigene Fläche |
| `flaeche` | `#17181c` | Erhöhte Fläche – Formulare, Warenkorb, Tafeln | Formular-Panel, Drawer, Menütafel |
| `flaecheTief` | `#141519` | Zweiter Grund für Sektionswechsel – ersetzt Trennlinien | jede zweite Sektion, Passepartout |
| `text` | `#f4f4f6` | Fließtext und Überschriften | body, h1–h3 |
| `textLeise` | `#a0a0ac` | Nebeninformation: Beschreibungen, Hinweise, Zeiten | Gerichtsbeschreibung, Formularhinweis |
| `linie` | `#2a2b33` | Dekorative Haarlinie – nie alleiniger Träger von Information | Tabellenzeilen, Sektionskanten |
| `linieStark` | `#999a9e` | Begrenzung von Bedienelementen (≥ 3:1) | Eingabefelder, Mengenknöpfe |
| `akzent` | `#b39b62` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#c1ad7e` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#141013` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#b39b62` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
| `signal` | `#b99a4e` | Signalton für kleine Marken – nie als Fläche | Sterne, Hausempfehlung-Siegel |
| `signalText` | `#b99a4e` | Signalton als lesbare Schrift auf hellen Gründen | Platzhalter-Kennzeichnung, Note |
| `tint` | `#07080a` | Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay | Hero-Tafel, Fußzeile |
| `aufTint` | `#f4f4f6` | Schrift auf der Tafel | Hero-Tafel, Fußzeile |
| `aufTintLeise` | `#b2b2b4` | Nebenschrift auf der Tafel | Fußzeilen-Links |
| `signalAufTint` | `#b99a4e` | Signalton auf der Tafel | Sterne im Hero |
| `fehler` | `#ff8a80` | Fehlermeldungen in Formularen | Formularfehler, Ablehnung |

Kontraste (vom Build erzwungen):

| Schrift | Grund | Verhältnis | Mindestens |
|---|---|---|---|
| text | grund | 17.33:1 | 4.5:1 |
| text | flaeche | 16.15:1 | 4.5:1 |
| text | flaecheTief | 16.61:1 | 4.5:1 |
| textLeise | grund | 7.36:1 | 4.5:1 |
| textLeise | flaeche | 6.86:1 | 4.5:1 |
| textLeise | flaecheTief | 7.05:1 | 4.5:1 |
| akzentText | grund | 7.05:1 | 4.5:1 |
| akzentText | flaeche | 6.57:1 | 4.5:1 |
| akzentText | flaecheTief | 6.76:1 | 4.5:1 |
| aufAkzent | akzent | 6.99:1 | 4.5:1 |
| aufAkzent | akzentTief | 8.57:1 | 4.5:1 |
| signalText | grund | 7.07:1 | 4.5:1 |
| signalText | flaeche | 6.58:1 | 4.5:1 |
| signalText | flaecheTief | 6.77:1 | 4.5:1 |
| aufTint | tint | 18.24:1 | 4.5:1 |
| aufTintLeise | tint | 9.46:1 | 4.5:1 |
| signalAufTint | tint | 7.44:1 | 4.5:1 |
| fehler | flaeche | 7.77:1 | 4.5:1 |
| fehler | grund | 8.34:1 | 4.5:1 |
| fehler | flaecheTief | 7.99:1 | 4.5:1 |
| linieStark | flaeche | 6.31:1 | 3:1 |
| linieStark | grund | 6.77:1 | 3:1 |
| akzent | grund | 7.05:1 | 3:1 |

Herleitung: Akzent gedämpft (#b99a4e → #ae9659, Sättigung ×0.8), Referenzen sind fast unbunt. Akzent 20 % Richtung Referenz-Akzent #c8ad86 gezogen (#ae9659 → #b39b62).

## Typografie

- **Anzeige:** Shippori Mincho 600 – Mincho-Antiqua – Hinoki-Tresen, Omakase
- **Text:** Zen Kaku Gothic New 400/500 – japanische Gothic mit ruhigen Lateinformen
- **Rubriken:** Versalien, weit gesperrt (0.14em), klein
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

Herleitung: 0 von 3 ausgewerteten Referenzen führen ebenfalls mit Serife (grotesk, grotesk, grotesk).

## Spacing (8px-Raster)

Skala: `1`=8px · `2`=16px · `3`=24px · `4`=32px · `5`=40px · `6`=48px · `8`=64px · `10`=80px · `12`=96px · `16`=128px · `halb`=4px

Sektionen 96px (mobil 64px), betonte Sektion 128px, enge Leisten 48px. Rinne 32px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 96px: Referenzen sind mehrheitlich „ausgewogen“. Referenzen nutzen ein 4px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 2px · Karte 4px · Knopf 2px · Bild 0px · Marke rund
- Schatten: linie (`0 0 0 1px #2a2b33`)
- Bewegung: cubic-bezier(.5,0,.1,1), 720ms, Weg 16px, Versatz 120ms
  - Animiert werden nur transform und opacity.
  - Startzustände hängen an einer Klasse, die erst das Skript setzt – ohne JS ist alles sichtbar.
  - prefers-reduced-motion: reduce schaltet jede Bewegung ab.
  - Genau ein betonter Moment je Seite (siehe layout.betonterMoment).

Herleitung: Kartenradius aus v1-Stimmung (2px) auf 4px gerastert, im Abendhaus auf höchstens 8px begrenzt; Pillenform nur für kleine Marken. Dunkler Grund: Schatten wären unsichtbar – Kanten statt Schatten. Kurve cubic-bezier(.5,0,.1,1) aus der v1-Handschrift „abend“.

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
- Kirschblüten-Clipart _(Küche)_
- Pinselschrift-Imitationen _(Küche)_
- Wellen-Holzschnitt als Hintergrund _(Küche)_
- helle Vollflächen-Sektionen _(Archetyp)_
- mehr als ein Akzentton _(Archetyp)_
- schnelle Bewegungen unter 300ms _(Archetyp)_

## Bild-Kanon

- Licht: Pendel- oder Kerzenlicht, tiefe Schatten, warm (ca. 2700 K), Hintergrund fällt ins Dunkle
- Perspektive: nah, geringe Schärfentiefe, ein Gericht oder ein Glas als einziges Licht im Bild
- Farbstimmung: dunkel, satt; Akzent #b99a4e darf im Bild vorkommen (Serviette, Keramik), sonst warme Neutrale
- Oberflächen & Requisiten: Hinoki-Holz, Keramik mit Kannyu-Glasur, Stäbchenbänkchen, Noren-Vorhang unscharf
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, low pendant or candle light, deep shadows, warm 2700K, background falling into darkness, close-up, shallow depth of field, a single dish or glass as the only lit object, hinoki wood counter, kannyu-glaze ceramics, chopstick rest, blurred noren curtain, dark moody palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: ruhig und knapp – wenige Worte, eher Einladung als Werbung
- Anrede: Sie, Satzlänge: kurz, 6–14 Wörter
- Wortfeld: Reis, Brühe, Schnitt, Tresen, Saison

