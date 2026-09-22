# Bayerisch · Wirtshaus

Archetyp **Traditionell** · Schema **hell** · Designsystem `bayerisch--wirtshaus` (maschinenlesbar: `bayerisch--wirtshaus.json`)

> Wirtshaus heißt hier nicht Folklore-Karo, sondern Holz, Papier, Gewölbe: ruhige Serife, warmer Papiergrund, ein tiefes Grün als einzige Farbe.

## Referenzen

- **[Augustiner Klosterwirt](https://www.augustiner-klosterwirt.de)** (Restaurant) – übernommen: warmer, heller Grund; Serifen-Überschriften in normaler Groß-/Kleinschreibung; Speisekarte als ruhige Liste · bewusst nicht: Bildslider mit Autoplay
- **[Ayingers Wirtshaus](https://www.ayingers.de)** (Restaurant) – übernommen: Grün als Hausfarbe; großzügige Bildflächen des Gastraums · bewusst nicht: Dropdown-Navigation mit vielen Ebenen
- **[Raus](https://styles.refero.design/style/d28732de-1b7a-4d37-b7aa-edfa7caf428b)** (Refero-Style) – übernommen: Cream-Papier + fast schwarze Tinte; ein Grün als Signal; Postkarten-Bildformat · bewusst nicht: Neue Haas als Textschrift (zu technisch)

Referenz-Signal: Temperatur **warm**, Helligkeit **hell**, Sättigung **kräftig**, Dichte **ausgewogen**, Layout **versetzt/asymmetrisch**, Bewegung **ruhig**.

## Farben – jede mit einer Aufgabe

| Rolle | Wert | Aufgabe | Verwendung |
|---|---|---|---|
| `grund` | `#fbfaf7` | Seitengrund – trägt rund 60 % der Fläche | body, Sektionen ohne eigene Fläche |
| `flaeche` | `#ffffff` | Erhöhte Fläche – Formulare, Warenkorb, Tafeln | Formular-Panel, Drawer, Menütafel |
| `flaecheTief` | `#f3efe9` | Zweiter Grund für Sektionswechsel – ersetzt Trennlinien | jede zweite Sektion, Passepartout |
| `text` | `#23241f` | Fließtext und Überschriften | body, h1–h3 |
| `textLeise` | `#63665c` | Nebeninformation: Beschreibungen, Hinweise, Zeiten | Gerichtsbeschreibung, Formularhinweis |
| `linie` | `#e7e1d8` | Dekorative Haarlinie – nie alleiniger Träger von Information | Tabellenzeilen, Sektionskanten |
| `linieStark` | `#7b7972` | Begrenzung von Bedienelementen (≥ 3:1) | Eingabefelder, Mengenknöpfe |
| `akzent` | `#3f5d3a` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#344c30` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#ffffff` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#3f5d3a` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
| `signal` | `#b8862f` | Signalton für kleine Marken – nie als Fläche | Sterne, Hausempfehlung-Siegel |
| `signalText` | `#8b6524` | Signalton als lesbare Schrift auf hellen Gründen | Platzhalter-Kennzeichnung, Note |
| `tint` | `#1e2a1c` | Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay | Hero-Tafel, Fußzeile |
| `aufTint` | `#fdfdfb` | Schrift auf der Tafel | Hero-Tafel, Fußzeile |
| `aufTintLeise` | `#bfc2bd` | Nebenschrift auf der Tafel | Fußzeilen-Links |
| `signalAufTint` | `#b8862f` | Signalton auf der Tafel | Sterne im Hero |
| `fehler` | `#b3261e` | Fehlermeldungen in Formularen | Formularfehler, Ablehnung |

Kontraste (vom Build erzwungen):

| Schrift | Grund | Verhältnis | Mindestens |
|---|---|---|---|
| text | grund | 14.97:1 | 4.5:1 |
| text | flaeche | 15.63:1 | 4.5:1 |
| text | flaecheTief | 13.65:1 | 4.5:1 |
| textLeise | grund | 5.61:1 | 4.5:1 |
| textLeise | flaeche | 5.86:1 | 4.5:1 |
| textLeise | flaecheTief | 5.11:1 | 4.5:1 |
| akzentText | grund | 7.09:1 | 4.5:1 |
| akzentText | flaeche | 7.40:1 | 4.5:1 |
| akzentText | flaecheTief | 6.46:1 | 4.5:1 |
| aufAkzent | akzent | 7.40:1 | 4.5:1 |
| aufAkzent | akzentTief | 9.45:1 | 4.5:1 |
| signalText | grund | 5.05:1 | 4.5:1 |
| signalText | flaeche | 5.27:1 | 4.5:1 |
| signalText | flaecheTief | 4.60:1 | 4.5:1 |
| aufTint | tint | 14.70:1 | 4.5:1 |
| aufTintLeise | tint | 8.31:1 | 4.5:1 |
| signalAufTint | tint | 4.62:1 | 4.5:1 |
| fehler | flaeche | 6.54:1 | 4.5:1 |
| fehler | grund | 6.26:1 | 4.5:1 |
| fehler | flaecheTief | 5.71:1 | 4.5:1 |
| linieStark | flaeche | 4.36:1 | 3:1 |
| linieStark | grund | 4.17:1 | 3:1 |
| akzent | grund | 7.09:1 | 3:1 |

Herleitung: Neutrale warm getönt (#fbfaf7 → #fbfaf7), weil die Referenzen mehrheitlich warm sind. Kein Referenz-Akzent in derselben Farbfamilie (#553525, #ccae54, #006434) – Küchen-Akzent bleibt.

## Typografie

- **Anzeige:** Vollkorn 700 – kräftige Werkserife, deutsches Design (F. Althausen) – Wirtshaus, Brotzeit, Papier
- **Text:** Alegreya Sans 400/500 – humanistische Textgrotesk mit Schreibduktus
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

Herleitung: 2 von 3 ausgewerteten Referenzen führen ebenfalls mit Serife (serif, serif, grotesk).

## Spacing (8px-Raster)

Skala: `1`=8px · `2`=16px · `3`=24px · `4`=32px · `5`=40px · `6`=48px · `8`=64px · `10`=80px · `12`=96px · `16`=128px · `halb`=4px

Sektionen 96px (mobil 64px), betonte Sektion 128px, enge Leisten 48px. Rinne 32px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 96px: Referenzen sind mehrheitlich „ausgewogen“. Referenzen nutzen ein 10px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 4px · Karte 12px · Knopf 8px · Bild 12px · Marke rund
- Schatten: papier (`0 1px 0 #e7e1d8, 0 16px 32px -24px rgba(30,42,28,.35)`)
- Bewegung: cubic-bezier(.2,.72,.3,1), 520ms, Weg 24px, Versatz 80ms
  - Animiert werden nur transform und opacity.
  - Startzustände hängen an einer Klasse, die erst das Skript setzt – ohne JS ist alles sichtbar.
  - prefers-reduced-motion: reduce schaltet jede Bewegung ab.
  - Genau ein betonter Moment je Seite (siehe layout.betonterMoment).

Herleitung: Kartenradius aus v1-Stimmung (12px) auf 4px gerastert; Pillenform nur für kleine Marken. Traditionell: ein Papierschatten – Kante plus weicher Fall, nie auf jeder Karte. Kurve cubic-bezier(.2,.72,.3,1) aus der v1-Handschrift „traditionell“.

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
- Rautenmuster und blau-weißes Karo _(Küche)_
- Lederhosen-/Dirndl-Clipart _(Küche)_
- Frakturschrift als Dekoration _(Küche)_
- Neonfarben _(Archetyp)_
- Glanz-Knöpfe _(Archetyp)_

## Bild-Kanon

- Licht: weiches Seitenlicht vom Fenster, später Vormittag, warm (ca. 3800 K), Schatten sichtbar aber offen
- Perspektive: 45°-Tischperspektive, Anschnitt am Tellerrand, Hände des Personals dürfen im Bild sein
- Farbstimmung: hell, luftig; Akzent #3f5d3a darf im Bild vorkommen (Serviette, Keramik), sonst warme Neutrale
- Oberflächen & Requisiten: Eichenholztisch, Steinkrug, Brezen, Leinenserviette, Zinnteller
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, soft window side light, late morning, warm 3800K, open soft shadows, 45-degree table angle, cropped at the plate edge, staff hands allowed in frame, oak table, stoneware mug, pretzels, linen napkin, pewter plate, light airy palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: bodenständig und konkret – sagt, was es gibt und wie es gemacht wird, ohne zu schwärmen
- Anrede: Sie, Satzlänge: kurz bis mittel, 8–18 Wörter
- Wortfeld: Kruste, Knödel, Brotzeit, Wirtsstube, Fass, Stammtisch, Kastanien

