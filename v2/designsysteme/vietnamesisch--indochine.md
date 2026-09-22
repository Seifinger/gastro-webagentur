# Vietnamesisch · Indochine

Archetyp **Traditionell** · Schema **hell** · Designsystem `vietnamesisch--indochine` (maschinenlesbar: `vietnamesisch--indochine.json`)

> Indochine: Kolonialhaus, Rattan, Bambus – Braun, Papier, Kontrast-Serife.

## Referenzen

- **[Indochine NYC](https://www.indochinenyc.com)** (Restaurant) – übernommen: Bananenblatt-Grün/Braun; Serifen-Eleganz · bewusst nicht: Tapetenmuster als Hintergrund
- **[The Slanted Door](https://www.slanteddoor.com)** (Restaurant) – übernommen: ruhige Hierarchie; Speisekarte im Mittelpunkt · bewusst nicht: kleine Grau-Typo
- **[Aspelin Reitan](https://styles.refero.design/style/3a331157-f5a5-4640-ada8-8a3ad262ee6a)** (Refero-Style) – übernommen: Cream + Tabakbraun; Archiv-Ruhe · bewusst nicht: ModernEra

Referenz-Signal: Temperatur **warm**, Helligkeit **gemischt**, Sättigung **fast unbunt**, Dichte **luftig**, Layout **gemischt**, Bewegung **ruhig**.

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
| `akzent` | `#775330` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#624427` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#ffffff` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#775330` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
| `signal` | `#c0994a` | Signalton für kleine Marken – nie als Fläche | Sterne, Hausempfehlung-Siegel |
| `signalText` | `#85682e` | Signalton als lesbare Schrift auf hellen Gründen | Platzhalter-Kennzeichnung, Note |
| `tint` | `#2a1d12` | Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay | Hero-Tafel, Fußzeile |
| `aufTint` | `#fefdfb` | Schrift auf der Tafel | Hero-Tafel, Fußzeile |
| `aufTintLeise` | `#c3beba` | Nebenschrift auf der Tafel | Fußzeilen-Links |
| `signalAufTint` | `#c0994a` | Signalton auf der Tafel | Sterne im Hero |
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
| akzentText | grund | 6.63:1 | 4.5:1 |
| akzentText | flaeche | 6.85:1 | 4.5:1 |
| akzentText | flaecheTief | 6.03:1 | 4.5:1 |
| aufAkzent | akzent | 6.85:1 | 4.5:1 |
| aufAkzent | akzentTief | 8.84:1 | 4.5:1 |
| signalText | grund | 5.06:1 | 4.5:1 |
| signalText | flaeche | 5.23:1 | 4.5:1 |
| signalText | flaecheTief | 4.60:1 | 4.5:1 |
| aufTint | tint | 16.10:1 | 4.5:1 |
| aufTintLeise | tint | 8.88:1 | 4.5:1 |
| signalAufTint | tint | 6.16:1 | 4.5:1 |
| fehler | flaeche | 6.54:1 | 4.5:1 |
| fehler | grund | 6.32:1 | 4.5:1 |
| fehler | flaecheTief | 5.76:1 | 4.5:1 |
| linieStark | flaeche | 4.29:1 | 3:1 |
| linieStark | grund | 4.15:1 | 3:1 |
| akzent | grund | 6.63:1 | 3:1 |

Herleitung: Neutrale warm getönt (#fdfbf7 → #fdfbf7), weil die Referenzen mehrheitlich warm sind. Akzent gedämpft (#8a5a2b → #815a34, Sättigung ×0.8), Referenzen sind fast unbunt. Akzent 20 % Richtung Referenz-Akzent #4f3622 gezogen (#815a34 → #775330).

## Typografie

- **Anzeige:** Cormorant Garamond 700 – feine, luftige Garamond – Olivenhain, Kolonialhaus
- **Text:** Source Serif 4 400/600 – lesestarke Textantiqua
- **Rubriken:** kursive Anzeigeschrift in Textgröße – wie ein handgeschriebenes Etikett
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

Herleitung: 0 von 3 ausgewerteten Referenzen führen ebenfalls mit Serife (schmal, grotesk, grotesk). Skala auf Quarte angehoben: Referenzen sind luftig, große Headlines tragen.

## Spacing (8px-Raster)

Skala: `1`=8px · `2`=16px · `3`=24px · `4`=32px · `5`=40px · `6`=48px · `8`=64px · `10`=80px · `12`=96px · `16`=128px · `halb`=4px

Sektionen 128px (mobil 64px), betonte Sektion 160px, enge Leisten 48px. Rinne 32px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 128px: Referenzen sind mehrheitlich „luftig“. Referenzen nutzen ein 10px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 6px · Karte 16px · Knopf 8px · Bild 16px · Marke rund
- Schatten: papier (`0 1px 0 #eae0cf, 0 16px 32px -24px rgba(42,29,18,.35)`)
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
- Reishut-Clipart _(Küche)_
- Flaggen-Sterne _(Küche)_
- Bambus-Rahmen _(Küche)_
- Neonfarben _(Archetyp)_
- Glanz-Knöpfe _(Archetyp)_

## Bild-Kanon

- Licht: weiches Seitenlicht vom Fenster, später Vormittag, warm (ca. 3800 K), Schatten sichtbar aber offen
- Perspektive: 45°-Tischperspektive, Anschnitt am Tellerrand, Hände des Personals dürfen im Bild sein
- Farbstimmung: hell, luftig; Akzent #8a5a2b darf im Bild vorkommen (Serviette, Keramik), sonst warme Neutrale
- Oberflächen & Requisiten: Emailleschüsseln, Kräuterbündel, Fischsauce-Kännchen, Stäbchen aus Holz
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, soft window side light, late morning, warm 3800K, open soft shadows, 45-degree table angle, cropped at the plate edge, staff hands allowed in frame, enamel bowls, bunches of fresh herbs, small fish sauce jug, wooden chopsticks, light airy palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: bodenständig und konkret – sagt, was es gibt und wie es gemacht wird, ohne zu schwärmen
- Anrede: Sie, Satzlänge: kurz bis mittel, 8–18 Wörter
- Wortfeld: Brühe, Kräuter, Reisnudeln, Bánh Mì, Fischsauce

