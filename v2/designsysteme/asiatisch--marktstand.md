# Asiatisch (gemischt) · Marktstand

Archetyp **Traditionell** · Schema **hell** · Designsystem `asiatisch--marktstand` (maschinenlesbar: `asiatisch--marktstand.json`)

> Marktstand: Nudelbar, Kraftpapier, gebranntes Orange – schnell und ehrlich.

## Referenzen

- **[Momofuku](https://www.momofuku.com)** (Restaurant) – übernommen: Pfirsich/Orange als Signal; kräftige Rubriken · bewusst nicht: Shop im Vordergrund
- **[Little Amps](https://styles.refero.design/style/ca522706-03ed-48cb-acb3-1bb2a22f2eda)** (Refero-Style) – übernommen: gebranntes Orange; Mono für Preise und Zeiten · bewusst nicht: Staubblau
- **[Lamanna](https://styles.refero.design/style/057d7c66-76b7-4272-849c-4058543e6799)** (Refero-Style) – übernommen: breite, laute Display-Rubriken · bewusst nicht: Mehrfarbigkeit

Referenz-Signal: Temperatur **warm**, Helligkeit **gemischt**, Sättigung **kräftig**, Dichte **ausgewogen**, Layout **symmetrisch**, Bewegung **ruhig**.

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
| `akzent` | `#c85116` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#a44212` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#ffffff` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#ba4b14` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
| `signal` | `#d8a33c` | Signalton für kleine Marken – nie als Fläche | Sterne, Hausempfehlung-Siegel |
| `signalText` | `#8d661c` | Signalton als lesbare Schrift auf hellen Gründen | Platzhalter-Kennzeichnung, Note |
| `tint` | `#2c1a0d` | Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay | Hero-Tafel, Fußzeile |
| `aufTint` | `#fefdfb` | Schrift auf der Tafel | Hero-Tafel, Fußzeile |
| `aufTintLeise` | `#c3bdb8` | Nebenschrift auf der Tafel | Fußzeilen-Links |
| `signalAufTint` | `#d8a33c` | Signalton auf der Tafel | Sterne im Hero |
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
| akzentText | grund | 4.95:1 | 4.5:1 |
| akzentText | flaeche | 5.12:1 | 4.5:1 |
| akzentText | flaecheTief | 4.51:1 | 4.5:1 |
| aufAkzent | akzent | 4.52:1 | 4.5:1 |
| aufAkzent | akzentTief | 6.24:1 | 4.5:1 |
| signalText | grund | 5.02:1 | 4.5:1 |
| signalText | flaeche | 5.19:1 | 4.5:1 |
| signalText | flaecheTief | 4.57:1 | 4.5:1 |
| aufTint | tint | 16.39:1 | 4.5:1 |
| aufTintLeise | tint | 8.96:1 | 4.5:1 |
| signalAufTint | tint | 7.32:1 | 4.5:1 |
| fehler | flaeche | 6.54:1 | 4.5:1 |
| fehler | grund | 6.32:1 | 4.5:1 |
| fehler | flaecheTief | 5.76:1 | 4.5:1 |
| linieStark | flaeche | 4.29:1 | 3:1 |
| linieStark | grund | 4.15:1 | 3:1 |
| akzent | grund | 4.37:1 | 3:1 |

Herleitung: Neutrale warm getönt (#fdfbf7 → #fdfbf7), weil die Referenzen mehrheitlich warm sind. Akzent 20 % Richtung Referenz-Akzent #ff4100 gezogen (#c1571d → #cd5317). Akzent für lesbare Knopfschrift und 3:1 gegen den Grund verschoben (#cd5317 → #c85116).

## Typografie

- **Anzeige:** Archivo Black 400 – breite, schwere Grotesk – Nudelbar-Schild
- **Text:** Work Sans 400/600 – Grotesk mit Plakat-Wurzeln
- **Etiketten:** Courier Prime – Preise, Zeiten, Rubriken
- **Rubriken:** Schreibmaschine – Etikett, Zeit, Preis
- **Skala:** große Terz (×1.25), Basis 17px

| Stufe | Desktop | Mobil | Einsatz |
|---|---|---|---|
| klein | 14px | – | Labels, Hinweise, Rubriken |
| basis | 17px | – | Fließtext, Formular |
| gross | 21px | – | Einleitungen, Preise der Hausempfehlung |
| h3 | 27px | – | Gerichtsnamen, Kartenköpfe |
| h2 | 42px | 33px | Sektionstitel |
| h1 | 65px | 46px | Name des Hauses |
| display | 81px | 52px | Typo-Hero |

Ausgeschlossen: Inter, Roboto, system-ui und alle weiteren Schriften aus `VERBOTENE_SCHRIFTEN`.

Herleitung: 3 von 3 ausgewerteten Referenzen führen ebenfalls mit Grotesk (grotesk, grotesk, schmal).

## Spacing (8px-Raster)

Skala: `1`=8px · `2`=16px · `3`=24px · `4`=32px · `5`=40px · `6`=48px · `8`=64px · `10`=80px · `12`=96px · `16`=128px · `halb`=4px

Sektionen 96px (mobil 64px), betonte Sektion 128px, enge Leisten 48px. Rinne 32px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 96px: Referenzen sind mehrheitlich „ausgewogen“. Referenzen nutzen ein 8px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 4px · Karte 12px · Knopf 8px · Bild 12px · Marke rund
- Schatten: papier (`0 1px 0 #eae0cf, 0 16px 32px -24px rgba(44,26,13,.35)`)
- Bewegung: cubic-bezier(.2,.72,.3,1), 520ms, Weg 24px, Versatz 80ms
  - Animiert werden nur transform und opacity.
  - Startzustände hängen an einer Klasse, die erst das Skript setzt – ohne JS ist alles sichtbar.
  - prefers-reduced-motion: reduce schaltet jede Bewegung ab.
  - Genau ein betonter Moment je Seite (siehe layout.betonterMoment).

Herleitung: Kartenradius aus v1-Stimmung (10px) auf 4px gerastert; Pillenform nur für kleine Marken. Traditionell: ein Papierschatten – Kante plus weicher Fall, nie auf jeder Karte. Kurve cubic-bezier(.2,.72,.3,1) aus der v1-Handschrift „traditionell“.

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
- Mischung aus Pagode, Drache und Kirschblüte _(Küche)_
- Essstäbchen als Aufzählungszeichen _(Küche)_
- Neonfarben _(Archetyp)_
- Glanz-Knöpfe _(Archetyp)_

## Bild-Kanon

- Licht: weiches Seitenlicht vom Fenster, später Vormittag, warm (ca. 3800 K), Schatten sichtbar aber offen
- Perspektive: 45°-Tischperspektive, Anschnitt am Tellerrand, Hände des Personals dürfen im Bild sein
- Farbstimmung: hell, luftig; Akzent #c1571d darf im Bild vorkommen (Serviette, Keramik), sonst warme Neutrale
- Oberflächen & Requisiten: Kraftpapier, Wok, Emailleschüssel, Essstäbchen
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, soft window side light, late morning, warm 3800K, open soft shadows, 45-degree table angle, cropped at the plate edge, staff hands allowed in frame, kraft paper, wok, enamel bowl, chopsticks, light airy palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: bodenständig und konkret – sagt, was es gibt und wie es gemacht wird, ohne zu schwärmen
- Anrede: Sie, Satzlänge: kurz bis mittel, 8–18 Wörter
- Wortfeld: Wok, Nudeln, Brühe, Schärfe, Abholung

