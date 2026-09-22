# Vietnamesisch · Straßenküche

Archetyp **Hell & modern** · Schema **hell** · Designsystem `vietnamesisch--strassenkueche` (maschinenlesbar: `vietnamesisch--strassenkueche.json`)

> Straßenküche: Plastikhocker, Kräutergrün, Tageslicht – schnell und frisch.

## Referenzen

- **[Cây Tre](https://www.caytre.co.uk)** (Restaurant) – übernommen: helle Flächen; Kräutergrün · bewusst nicht: Gutschein-Banner
- **[Touchy Coffee](https://styles.refero.design/style/6da76890-6e04-452a-834d-ff019e232c2b)** (Refero-Style) – übernommen: handgemachte Anmutung; Mono-Labels für Preise/Zeiten · bewusst nicht: Pillen-Knöpfe in Extremform

Referenz-Signal: Temperatur **kühl**, Helligkeit **hell**, Sättigung **fast unbunt**, Dichte **ausgewogen**, Layout **versetzt/asymmetrisch**, Bewegung **lebendig**.

## Farben – jede mit einer Aufgabe

| Rolle | Wert | Aufgabe | Verwendung |
|---|---|---|---|
| `grund` | `#fbfaf7` | Seitengrund – trägt rund 60 % der Fläche | body, Sektionen ohne eigene Fläche |
| `flaeche` | `#ffffff` | Erhöhte Fläche – Formulare, Warenkorb, Tafeln | Formular-Panel, Drawer, Menütafel |
| `flaecheTief` | `#e9eef3` | Zweiter Grund für Sektionswechsel – ersetzt Trennlinien | jede zweite Sektion, Passepartout |
| `text` | `#23241f` | Fließtext und Überschriften | body, h1–h3 |
| `textLeise` | `#63665c` | Nebeninformation: Beschreibungen, Hinweise, Zeiten | Gerichtsbeschreibung, Formularhinweis |
| `linie` | `#d8dfe7` | Dekorative Haarlinie – nie alleiniger Träger von Information | Tabellenzeilen, Sektionskanten |
| `linieStark` | `#747879` | Begrenzung von Bedienelementen (≥ 3:1) | Eingabefelder, Mengenknöpfe |
| `akzent` | `#448240` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#386b34` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#ffffff` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#3f783b` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
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
| text | flaecheTief | 13.39:1 | 4.5:1 |
| textLeise | grund | 5.61:1 | 4.5:1 |
| textLeise | flaeche | 5.86:1 | 4.5:1 |
| textLeise | flaecheTief | 5.02:1 | 4.5:1 |
| akzentText | grund | 5.08:1 | 4.5:1 |
| akzentText | flaeche | 5.30:1 | 4.5:1 |
| akzentText | flaecheTief | 4.54:1 | 4.5:1 |
| aufAkzent | akzent | 4.65:1 | 4.5:1 |
| aufAkzent | akzentTief | 6.32:1 | 4.5:1 |
| signalText | grund | 5.10:1 | 4.5:1 |
| signalText | flaeche | 5.32:1 | 4.5:1 |
| signalText | flaecheTief | 4.56:1 | 4.5:1 |
| aufTint | tint | 14.73:1 | 4.5:1 |
| aufTintLeise | tint | 8.32:1 | 4.5:1 |
| signalAufTint | tint | 6.41:1 | 4.5:1 |
| fehler | flaeche | 6.54:1 | 4.5:1 |
| fehler | grund | 6.26:1 | 4.5:1 |
| fehler | flaecheTief | 5.60:1 | 4.5:1 |
| linieStark | flaeche | 4.46:1 | 3:1 |
| linieStark | grund | 4.28:1 | 3:1 |
| akzent | grund | 4.46:1 | 3:1 |

Herleitung: Neutrale kühl getönt (#fbfaf7 → #fbfaf7), weil die Referenzen mehrheitlich kühl sind. Akzent gedämpft (#48833a → #4d7c41, Sättigung ×0.8), Referenzen sind fast unbunt. Akzent 20 % Richtung Referenz-Akzent #28a745 gezogen (#4d7c41 → #468542). Akzent für lesbare Knopfschrift und 3:1 gegen den Grund verschoben (#468542 → #448240).

## Typografie

- **Anzeige:** Chivo 800 – grobe Grotesk mit Druckerei-Kanten – Straßenküche
- **Text:** Karla 400/600 – eigenwillige Grotesk mit engen Kurven
- **Etiketten:** Courier Prime – Preise, Zeiten, Rubriken
- **Rubriken:** Schreibmaschine – Etikett, Zeit, Preis
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

Herleitung: 1 von 2 ausgewerteten Referenzen führen ebenfalls mit Grotesk (grotesk, skript).

## Spacing (8px-Raster)

Skala: `1`=8px · `2`=16px · `3`=24px · `4`=32px · `5`=40px · `6`=48px · `8`=64px · `10`=80px · `12`=96px · `16`=128px · `halb`=4px

Sektionen 96px (mobil 64px), betonte Sektion 128px, enge Leisten 48px. Rinne 24px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 96px: Referenzen sind mehrheitlich „ausgewogen“. Referenzen nutzen ein 4px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 6px · Karte 20px · Knopf 12px · Bild 20px · Marke rund
- Schatten: linie (`0 0 0 1px #d8dfe7`)
- Bewegung: cubic-bezier(.16,1,.3,1), 306ms, Weg 16px, Versatz 48ms
  - Animiert werden nur transform und opacity.
  - Startzustände hängen an einer Klasse, die erst das Skript setzt – ohne JS ist alles sichtbar.
  - prefers-reduced-motion: reduce schaltet jede Bewegung ab.
  - Genau ein betonter Moment je Seite (siehe layout.betonterMoment).

Herleitung: Kartenradius aus v1-Stimmung (18px) auf 4px gerastert; Pillenform nur für kleine Marken. Helles Haus: flach, Kanten statt Schatten. Kurve cubic-bezier(.16,1,.3,1) aus der v1-Handschrift „hell“. Referenzen bewegen sich lebendig – Auftritte 15 % kürzer.

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
- Reishut-Clipart _(Küche)_
- Flaggen-Sterne _(Küche)_
- Bambus-Rahmen _(Küche)_
- schwere, dunkle Fotos _(Archetyp)_
- Schatten auf Karten _(Archetyp)_
- zentrierte Fließtexte _(Archetyp)_

## Bild-Kanon

- Licht: helles, diffuses Tageslicht, kaum Schatten, neutral (ca. 5000 K)
- Perspektive: Draufsicht oder frontal auf Tischhöhe, viel Luft um das Gericht
- Farbstimmung: hell, luftig; Akzent #48833a darf im Bild vorkommen (Serviette, Keramik), sonst kühle Neutrale
- Oberflächen & Requisiten: Emailleschüsseln, Kräuterbündel, Fischsauce-Kännchen, Stäbchen aus Holz
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, bright diffused daylight, minimal shadows, neutral 5000K, overhead or straight-on at table height, generous negative space around the dish, enamel bowls, bunches of fresh herbs, small fish sauce jug, wooden chopsticks, light airy palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: direkt und praktisch – beantwortet zuerst: was, wann, wie schnell
- Anrede: Sie, Satzlänge: kurz bis mittel, 8–18 Wörter
- Wortfeld: Brühe, Kräuter, Reisnudeln, Bánh Mì, Fischsauce

