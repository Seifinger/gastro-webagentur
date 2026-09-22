# Café · Third Wave

Archetyp **Hell & modern** · Schema **hell** · Designsystem `cafe--third-wave` (maschinenlesbar: `cafe--third-wave.json`)

> Third Wave: Rösterei, Beton, Salbei – nüchtern, präzise, hell.

## Referenzen

- **[The Barn](https://www.thebarn.de)** (Restaurant) – übernommen: fast monochrom; Produkt als Held · bewusst nicht: Shop als Startseite
- **[Five Elephant](https://www.fiveelephant.com)** (Restaurant) – übernommen: ruhige, helle Flächen · bewusst nicht: -
- **[Escape Coffee Company](https://styles.refero.design/style/b5532c58-620a-4d69-8861-35b2b6443956)** (Refero-Style) – übernommen: warmes Off-White; große Display-Typo; rohe Fotos statt Deko · bewusst nicht: TWK Lausanne

Referenz-Signal: Temperatur **kühl**, Helligkeit **dunkel**, Sättigung **fast unbunt**, Dichte **ausgewogen**, Layout **versetzt/asymmetrisch**, Bewegung **lebendig**.

## Farben – jede mit einer Aufgabe

| Rolle | Wert | Aufgabe | Verwendung |
|---|---|---|---|
| `grund` | `#fbfcfd` | Seitengrund – trägt rund 60 % der Fläche | body, Sektionen ohne eigene Fläche |
| `flaeche` | `#ffffff` | Erhöhte Fläche – Formulare, Warenkorb, Tafeln | Formular-Panel, Drawer, Menütafel |
| `flaecheTief` | `#eef3f7` | Zweiter Grund für Sektionswechsel – ersetzt Trennlinien | jede zweite Sektion, Passepartout |
| `text` | `#1c2733` | Fließtext und Überschriften | body, h1–h3 |
| `textLeise` | `#5d6b7a` | Nebeninformation: Beschreibungen, Hinweise, Zeiten | Gerichtsbeschreibung, Formularhinweis |
| `linie` | `#dde4ec` | Dekorative Haarlinie – nie alleiniger Träger von Information | Tabellenzeilen, Sektionskanten |
| `linieStark` | `#737c86` | Begrenzung von Bedienelementen (≥ 3:1) | Eingabefelder, Mengenknöpfe |
| `akzent` | `#5d695c` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#4c564b` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#ffffff` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#5d695c` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
| `signal` | `#a8905c` | Signalton für kleine Marken – nie als Fläche | Sterne, Hausempfehlung-Siegel |
| `signalText` | `#7e6c43` | Signalton als lesbare Schrift auf hellen Gründen | Platzhalter-Kennzeichnung, Note |
| `tint` | `#242a23` | Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay | Hero-Tafel, Fußzeile |
| `aufTint` | `#fdfefe` | Schrift auf der Tafel | Hero-Tafel, Fußzeile |
| `aufTintLeise` | `#c0c3c1` | Nebenschrift auf der Tafel | Fußzeilen-Links |
| `signalAufTint` | `#a8905c` | Signalton auf der Tafel | Sterne im Hero |
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
| akzentText | grund | 5.62:1 | 4.5:1 |
| akzentText | flaeche | 5.77:1 | 4.5:1 |
| akzentText | flaecheTief | 5.16:1 | 4.5:1 |
| aufAkzent | akzent | 5.77:1 | 4.5:1 |
| aufAkzent | akzentTief | 7.66:1 | 4.5:1 |
| signalText | grund | 4.97:1 | 4.5:1 |
| signalText | flaeche | 5.11:1 | 4.5:1 |
| signalText | flaecheTief | 4.57:1 | 4.5:1 |
| aufTint | tint | 14.53:1 | 4.5:1 |
| aufTintLeise | tint | 8.26:1 | 4.5:1 |
| signalAufTint | tint | 4.76:1 | 4.5:1 |
| fehler | flaeche | 6.54:1 | 4.5:1 |
| fehler | grund | 6.36:1 | 4.5:1 |
| fehler | flaecheTief | 5.85:1 | 4.5:1 |
| linieStark | flaeche | 4.24:1 | 3:1 |
| linieStark | grund | 4.12:1 | 3:1 |
| akzent | grund | 5.62:1 | 3:1 |

Herleitung: Neutrale kühl getönt (#fbfcfd → #fbfcfd), weil die Referenzen mehrheitlich kühl sind. Akzent gedämpft (#5c6b5a → #5d695c, Sättigung ×0.8), Referenzen sind fast unbunt. Kein Referenz-Akzent in derselben Farbfamilie (#a67c52) – Küchen-Akzent bleibt.

## Typografie

- **Anzeige:** Schibsted Grotesk 800 – Zeitungsgrotesk – Rösterei, Beton
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

Herleitung: 3 von 3 ausgewerteten Referenzen führen ebenfalls mit Grotesk (grotesk, grotesk, grotesk).

## Spacing (8px-Raster)

Skala: `1`=8px · `2`=16px · `3`=24px · `4`=32px · `5`=40px · `6`=48px · `8`=64px · `10`=80px · `12`=96px · `16`=128px · `halb`=4px

Sektionen 96px (mobil 64px), betonte Sektion 128px, enge Leisten 48px. Rinne 24px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 96px: Referenzen sind mehrheitlich „ausgewogen“. Referenzen nutzen ein 10px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 2px · Karte 4px · Knopf 4px · Bild 4px · Marke rund
- Schatten: linie (`0 0 0 1px #dde4ec`)
- Bewegung: cubic-bezier(.16,1,.3,1), 306ms, Weg 16px, Versatz 48ms
  - Animiert werden nur transform und opacity.
  - Startzustände hängen an einer Klasse, die erst das Skript setzt – ohne JS ist alles sichtbar.
  - prefers-reduced-motion: reduce schaltet jede Bewegung ab.
  - Genau ein betonter Moment je Seite (siehe layout.betonterMoment).

Herleitung: Kartenradius aus v1-Stimmung (4px) auf 4px gerastert; Pillenform nur für kleine Marken. Helles Haus: flach, Kanten statt Schatten. Kurve cubic-bezier(.16,1,.3,1) aus der v1-Handschrift „hell“. Referenzen bewegen sich lebendig – Auftritte 15 % kürzer.

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
- Kaffeebohnen-Clipart _(Küche)_
- Latte-Art-Stockfoto als Hero _(Küche)_
- Kreidetafel-Schriften _(Küche)_
- schwere, dunkle Fotos _(Archetyp)_
- Schatten auf Karten _(Archetyp)_
- zentrierte Fließtexte _(Archetyp)_

## Bild-Kanon

- Licht: helles, diffuses Tageslicht, kaum Schatten, neutral (ca. 5000 K)
- Perspektive: Draufsicht oder frontal auf Tischhöhe, viel Luft um das Gericht
- Farbstimmung: hell, luftig; Akzent #5c6b5a darf im Bild vorkommen (Serviette, Keramik), sonst kühle Neutrale
- Oberflächen & Requisiten: Marmortisch, Porzellantasse mit Untertasse, Zeitung, Kuchengabel
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, bright diffused daylight, minimal shadows, neutral 5000K, overhead or straight-on at table height, generous negative space around the dish, marble cafe table, porcelain cup and saucer, newspaper, cake fork, light airy palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: direkt und praktisch – beantwortet zuerst: was, wann, wie schnell
- Anrede: Sie, Satzlänge: kurz bis mittel, 8–18 Wörter
- Wortfeld: Röstung, Kuchen, Frühstück, Tasse, Zeitung

