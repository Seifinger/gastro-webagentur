# Syrisch · Damaszener Hof

Archetyp **Traditionell** · Schema **hell** · Designsystem `syrisch--damaszener-hof` (maschinenlesbar: `syrisch--damaszener-hof.json`)

> Damaszener Hof: Innenhof, Brunnen, Fliesengrün – kühl und festlich.

## Referenzen

- **[Malakeh](https://www.malakeh.de)** (Restaurant) – übernommen: Hausgeschichte weit vorn; warme Gastfreundschaft in der Sprache · bewusst nicht: Stockfotos
- **[Lawrence Berlin](https://lawrence.berlin/en/arabic-restaurant/)** (Restaurant) – übernommen: Mezze-Karte klar gegliedert; gedeckte, edle Töne · bewusst nicht: Event-Buchung im Vordergrund
- **[OLIPOP](https://styles.refero.design/style/c6ec55c7-0bd9-47c5-a4d2-669b7790c9cc)** (Refero-Style) – übernommen: Waldpetrol + Cream; Menü-Karten-Anmutung · bewusst nicht: Soda-Bildsprache

Referenz-Signal: Temperatur **warm**, Helligkeit **hell**, Sättigung **kräftig**, Dichte **ausgewogen**, Layout **versetzt/asymmetrisch**, Bewegung **ruhig**.

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
| `akzent` | `#3c8369` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#316b56` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#ffffff` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#377961` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
| `signal` | `#c9a227` | Signalton für kleine Marken – nie als Fläche | Sterne, Hausempfehlung-Siegel |
| `signalText` | `#856b1a` | Signalton als lesbare Schrift auf hellen Gründen | Platzhalter-Kennzeichnung, Note |
| `tint` | `#16302a` | Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay | Hero-Tafel, Fußzeile |
| `aufTint` | `#fdfefe` | Schrift auf der Tafel | Hero-Tafel, Fußzeile |
| `aufTintLeise` | `#bcc4c3` | Nebenschrift auf der Tafel | Fußzeilen-Links |
| `signalAufTint` | `#c9a227` | Signalton auf der Tafel | Sterne im Hero |
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
| akzentText | grund | 5.02:1 | 4.5:1 |
| akzentText | flaeche | 5.16:1 | 4.5:1 |
| akzentText | flaecheTief | 4.62:1 | 4.5:1 |
| aufAkzent | akzent | 4.52:1 | 4.5:1 |
| aufAkzent | akzentTief | 6.24:1 | 4.5:1 |
| signalText | grund | 4.97:1 | 4.5:1 |
| signalText | flaeche | 5.10:1 | 4.5:1 |
| signalText | flaecheTief | 4.57:1 | 4.5:1 |
| aufTint | tint | 13.95:1 | 4.5:1 |
| aufTintLeise | tint | 7.93:1 | 4.5:1 |
| signalAufTint | tint | 5.82:1 | 4.5:1 |
| fehler | flaeche | 6.54:1 | 4.5:1 |
| fehler | grund | 6.36:1 | 4.5:1 |
| fehler | flaecheTief | 5.85:1 | 4.5:1 |
| linieStark | flaeche | 4.14:1 | 3:1 |
| linieStark | grund | 4.03:1 | 3:1 |
| akzent | grund | 4.40:1 | 3:1 |

Herleitung: Neutrale warm getönt (#fbfcfd → #fbfcfd), weil die Referenzen mehrheitlich warm sind. Kein Referenz-Akzent in derselben Farbfamilie (#8e0027, #61a229) – Küchen-Akzent bleibt.

## Typografie

- **Anzeige:** Amiri 700 – Naskh-inspirierte Buchantiqua – Damaszener Hof
- **Text:** Karla 400/600 – eigenwillige Grotesk mit engen Kurven
- **Rubriken:** Versalien, weit gesperrt (0.14em), klein
- **Skala:** große Terz (×1.25), Basis 18px

| Stufe | Desktop | Mobil | Einsatz |
|---|---|---|---|
| klein | 14px | – | Labels, Hinweise, Rubriken |
| basis | 18px | – | Fließtext, Formular |
| gross | 23px | – | Einleitungen, Preise der Hausempfehlung |
| h3 | 28px | – | Gerichtsnamen, Kartenköpfe |
| h2 | 44px | 35px | Sektionstitel |
| h1 | 69px | 49px | Name des Hauses |
| display | 86px | 55px | Typo-Hero |

Ausgeschlossen: Inter, Roboto, system-ui und alle weiteren Schriften aus `VERBOTENE_SCHRIFTEN`.

Herleitung: 0 von 3 ausgewerteten Referenzen führen ebenfalls mit Serife (grotesk, grotesk, grotesk).

## Spacing (8px-Raster)

Skala: `1`=8px · `2`=16px · `3`=24px · `4`=32px · `5`=40px · `6`=48px · `8`=64px · `10`=80px · `12`=96px · `16`=128px · `halb`=4px

Sektionen 96px (mobil 64px), betonte Sektion 128px, enge Leisten 48px. Rinne 32px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 96px: Referenzen sind mehrheitlich „ausgewogen“. Referenzen nutzen ein 4px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 6px · Karte 16px · Knopf 8px · Bild 16px · Marke rund
- Schatten: papier (`0 1px 0 #ece6dd, 0 16px 32px -24px rgba(22,48,42,.35)`)
- Bewegung: cubic-bezier(.2,.72,.3,1), 520ms, Weg 24px, Versatz 80ms
  - Animiert werden nur transform und opacity.
  - Startzustände hängen an einer Klasse, die erst das Skript setzt – ohne JS ist alles sichtbar.
  - prefers-reduced-motion: reduce schaltet jede Bewegung ab.
  - Genau ein betonter Moment je Seite (siehe layout.betonterMoment).

Herleitung: Kartenradius aus v1-Stimmung (14px) auf 4px gerastert; Pillenform nur für kleine Marken. Traditionell: ein Papierschatten – Kante plus weicher Fall, nie auf jeder Karte. Kurve cubic-bezier(.2,.72,.3,1) aus der v1-Handschrift „traditionell“.

## Layout-Regeln

- Maximale Breite 1200px, 12 Spalten, Verhältnis 5/7, Textbreite 62ch
- Hero-Varianten (Seed wählt): `spalte-bild` – Textspalte auf dem Grund links, Foto randabfallend rechts; `karte` – Name und Claim links, rechts eine Tagesempfehlung als Menütafel, Foto als Einschub; `passepartout` – Foto im Passepartout, Textblock überlappt die Rahmenkante versetzt; `tafel` – Vollbild-Foto, darauf eine deckende Tafel unten links – kein Verlaufsschleier
- Sektionsfolge: highlights → karte → ambiente → stimmen → reservierung → kontakt
- Highlights als `treppe`, Karte als `tafel`, Stimmen als `blatt`
- Betonter Moment: **hero** (einzige Sektion mit Extra-Luft und eigener Bewegung)
- Kopfzeile fest, Hauptaktion Bestellen, mobile Aktionsleiste an
- Flächenwechsel grund ↔ flaecheTief statt Trennlinien

Herleitung: Sektionsfolge, Kopfzeile und Hauptaktion aus designPresets.js (Archetyp „traditionell“). Referenzen versetzt/asymmetrisch – asymmetrisches Raster 5/7.

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
- Neonfarben _(Archetyp)_
- Glanz-Knöpfe _(Archetyp)_

## Bild-Kanon

- Licht: weiches Seitenlicht vom Fenster, später Vormittag, warm (ca. 3800 K), Schatten sichtbar aber offen
- Perspektive: 45°-Tischperspektive, Anschnitt am Tellerrand, Hände des Personals dürfen im Bild sein
- Farbstimmung: hell, luftig; Akzent #3c8369 darf im Bild vorkommen (Serviette, Keramik), sonst warme Neutrale
- Oberflächen & Requisiten: Messingtablett, Mezze-Schälchen, Granatapfel, Fliesenmuster unscharf im Hintergrund
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, soft window side light, late morning, warm 3800K, open soft shadows, 45-degree table angle, cropped at the plate edge, staff hands allowed in frame, brass tray, small mezze bowls, pomegranate, blurred tile pattern in background, light airy palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: bodenständig und konkret – sagt, was es gibt und wie es gemacht wird, ohne zu schwärmen
- Anrede: Sie, Satzlänge: kurz bis mittel, 8–18 Wörter
- Wortfeld: Mezze, Tahini, Granatapfel, Fladenbrot, Za'atar, Tee

