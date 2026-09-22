# Thailändisch · Andamanen

Archetyp **Hell & modern** · Schema **hell** · Designsystem `thailaendisch--andamanen` (maschinenlesbar: `thailaendisch--andamanen.json`)

> Andamanen: Wasser, Petrol, Sonne – hell, küstig, feine Serife.

## Referenzen

- **[Kiln Soho](https://www.kilnsoho.com)** (Restaurant) – übernommen: heller Grund; wenige, klare Wege · bewusst nicht: Wartelisten-Hinweis
- **[Speedboat Bar](https://www.speedboatbar.co.uk)** (Restaurant) – übernommen: Retro-Fliesen-Akzente; freundliche Sprache · bewusst nicht: Pool-Table-Bildwelt
- **[Sing-sing](https://styles.refero.design/style/12b20c12-27f8-4938-89ba-569404d36fe8)** (Refero-Style) – übernommen: Seeglas/Petrol als Tinte; warmer Papiergrund · bewusst nicht: Safran als Vollfläche

Referenz-Signal: Temperatur **neutral**, Helligkeit **hell**, Sättigung **fast unbunt**, Dichte **dicht**, Layout **symmetrisch**, Bewegung **statisch**.

## Farben – jede mit einer Aufgabe

| Rolle | Wert | Aufgabe | Verwendung |
|---|---|---|---|
| `grund` | `#fbfcfd` | Seitengrund – trägt rund 60 % der Fläche | body, Sektionen ohne eigene Fläche |
| `flaeche` | `#ffffff` | Erhöhte Fläche – Formulare, Warenkorb, Tafeln | Formular-Panel, Drawer, Menütafel |
| `flaecheTief` | `#eef3f7` | Zweiter Grund für Sektionswechsel – ersetzt Trennlinien | jede zweite Sektion, Passepartout |
| `text` | `#1c2733` | Fließtext und Überschriften | body, h1–h3 |
| `textLeise` | `#5d6b7a` | Nebeninformation: Beschreibungen, Hinweise, Zeiten | Gerichtsbeschreibung, Formularhinweis |
| `linie` | `#dde5ec` | Dekorative Haarlinie – nie alleiniger Träger von Information | Tabellenzeilen, Sektionskanten |
| `linieStark` | `#737d86` | Begrenzung von Bedienelementen (≥ 3:1) | Eingabefelder, Mengenknöpfe |
| `akzent` | `#247975` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#1e6360` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#ffffff` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#247975` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
| `signal` | `#d9a92c` | Signalton für kleine Marken – nie als Fläche | Sterne, Hausempfehlung-Siegel |
| `signalText` | `#876818` | Signalton als lesbare Schrift auf hellen Gründen | Platzhalter-Kennzeichnung, Note |
| `tint` | `#0f3230` | Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay | Hero-Tafel, Fußzeile |
| `aufTint` | `#fdfefe` | Schrift auf der Tafel | Hero-Tafel, Fußzeile |
| `aufTintLeise` | `#bac5c4` | Nebenschrift auf der Tafel | Fußzeilen-Links |
| `signalAufTint` | `#d9a92c` | Signalton auf der Tafel | Sterne im Hero |
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
| akzentText | grund | 5.03:1 | 4.5:1 |
| akzentText | flaeche | 5.16:1 | 4.5:1 |
| akzentText | flaecheTief | 4.62:1 | 4.5:1 |
| aufAkzent | akzent | 5.16:1 | 4.5:1 |
| aufAkzent | akzentTief | 6.98:1 | 4.5:1 |
| signalText | grund | 5.08:1 | 4.5:1 |
| signalText | flaeche | 5.22:1 | 4.5:1 |
| signalText | flaecheTief | 4.67:1 | 4.5:1 |
| aufTint | tint | 13.68:1 | 4.5:1 |
| aufTintLeise | tint | 7.81:1 | 4.5:1 |
| signalAufTint | tint | 6.36:1 | 4.5:1 |
| fehler | flaeche | 6.54:1 | 4.5:1 |
| fehler | grund | 6.36:1 | 4.5:1 |
| fehler | flaecheTief | 5.85:1 | 4.5:1 |
| linieStark | flaeche | 4.19:1 | 3:1 |
| linieStark | grund | 4.08:1 | 3:1 |
| akzent | grund | 5.03:1 | 3:1 |

Herleitung: Akzent gedämpft (#1a837f → #247975, Sättigung ×0.8), Referenzen sind fast unbunt. Kein Referenz-Akzent in derselben Farbfamilie (#001e96, #fcd579) – Küchen-Akzent bleibt.

## Typografie

- **Anzeige:** Newsreader 500 – Zeitungsantiqua mit optischen Größen – Küste, Leselicht
- **Text:** Figtree 400/600 – freundliche, offene Textgrotesk
- **Etiketten:** Courier Prime – Preise, Zeiten, Rubriken
- **Rubriken:** Schreibmaschine – Etikett, Zeit, Preis
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

Herleitung: 2 von 3 ausgewerteten Referenzen führen ebenfalls mit Serife (grotesk, serif, serif).

## Spacing (8px-Raster)

Skala: `1`=8px · `2`=16px · `3`=24px · `4`=32px · `5`=40px · `6`=48px · `8`=64px · `10`=80px · `12`=96px · `16`=128px · `halb`=4px

Sektionen 80px (mobil 48px), betonte Sektion 112px, enge Leisten 48px. Rinne 24px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 80px: Referenzen sind mehrheitlich „dicht“. Referenzen nutzen ein 4px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 6px · Karte 20px · Knopf 12px · Bild 20px · Marke rund
- Schatten: linie (`0 0 0 1px #dde5ec`)
- Bewegung: cubic-bezier(.16,1,.3,1), 396ms, Weg 8px, Versatz 48ms
  - Animiert werden nur transform und opacity.
  - Startzustände hängen an einer Klasse, die erst das Skript setzt – ohne JS ist alles sichtbar.
  - prefers-reduced-motion: reduce schaltet jede Bewegung ab.
  - Genau ein betonter Moment je Seite (siehe layout.betonterMoment).

Herleitung: Kartenradius aus v1-Stimmung (20px) auf 4px gerastert; Pillenform nur für kleine Marken. Helles Haus: flach, Kanten statt Schatten. Kurve cubic-bezier(.16,1,.3,1) aus der v1-Handschrift „hell“. Referenzen sind nahezu statisch – Auftrittsweg auf 8px verkürzt.

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
- Buddha-Figuren als Dekoration _(Küche)_
- Tempeldach-Silhouetten _(Küche)_
- Orchideen-Clipart _(Küche)_
- schwere, dunkle Fotos _(Archetyp)_
- Schatten auf Karten _(Archetyp)_
- zentrierte Fließtexte _(Archetyp)_

## Bild-Kanon

- Licht: helles, diffuses Tageslicht, kaum Schatten, neutral (ca. 5000 K)
- Perspektive: Draufsicht oder frontal auf Tischhöhe, viel Luft um das Gericht
- Farbstimmung: hell, luftig; Akzent #1a837f darf im Bild vorkommen (Serviette, Keramik), sonst warme Neutrale
- Oberflächen & Requisiten: Bananenblatt, Messingschalen, Limetten, Thai-Basilikum, Emailleteller
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, bright diffused daylight, minimal shadows, neutral 5000K, overhead or straight-on at table height, generous negative space around the dish, banana leaf, brass bowls, limes, thai basil, enamel plate, light airy palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: direkt und praktisch – beantwortet zuerst: was, wann, wie schnell
- Anrede: Sie, Satzlänge: kurz bis mittel, 8–18 Wörter
- Wortfeld: Currypaste, Mörser, Limette, Zitronengras, Schärfegrad

