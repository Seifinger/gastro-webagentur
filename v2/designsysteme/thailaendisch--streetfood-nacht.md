# Thailändisch · Streetfood Nacht

Archetyp **Abend** · Schema **dunkel** · Designsystem `thailaendisch--streetfood-nacht` (maschinenlesbar: `thailaendisch--streetfood-nacht.json`)

> Streetfood Nacht: Grill, Neon, Kurkuma – schmale Versalien, Orange als Licht.

## Referenzen

- **[Smoking Goat](https://www.smokinggoatbar.com)** (Restaurant) – übernommen: dunkler Grund; kurze, laute Headlines · bewusst nicht: Merch-Links
- **[Night + Market](https://www.nightmarketsong.com)** (Restaurant) – übernommen: Plakat-Hierarchie; warmes Orange · bewusst nicht: knallbunte Mehrfarbigkeit
- **[Wise Design](https://styles.refero.design/style/c5326639-873a-4257-ad1a-7da9111e9286)** (Refero-Style) – übernommen: Marktstand-Signalfarbe; laute Headline, ruhiger Rest · bewusst nicht: Limettengrün

Referenz-Signal: Temperatur **warm**, Helligkeit **gemischt**, Sättigung **kräftig**, Dichte **dicht**, Layout **symmetrisch**, Bewegung **statisch**.

## Farben – jede mit einer Aufgabe

| Rolle | Wert | Aufgabe | Verwendung |
|---|---|---|---|
| `grund` | `#13110e` | Seitengrund – trägt rund 60 % der Fläche | body, Sektionen ohne eigene Fläche |
| `flaeche` | `#17181c` | Erhöhte Fläche – Formulare, Warenkorb, Tafeln | Formular-Panel, Drawer, Menütafel |
| `flaecheTief` | `#1b1712` | Zweiter Grund für Sektionswechsel – ersetzt Trennlinien | jede zweite Sektion, Passepartout |
| `text` | `#f4f4f6` | Fließtext und Überschriften | body, h1–h3 |
| `textLeise` | `#a0a0ac` | Nebeninformation: Beschreibungen, Hinweise, Zeiten | Gerichtsbeschreibung, Formularhinweis |
| `linie` | `#373026` | Dekorative Haarlinie – nie alleiniger Träger von Information | Tabellenzeilen, Sektionskanten |
| `linieStark` | `#9f9c98` | Begrenzung von Bedienelementen (≥ 3:1) | Eingabefelder, Mengenknöpfe |
| `akzent` | `#f58628` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#f79c4f` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#141013` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#f58628` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
| `signal` | `#e3a13a` | Signalton für kleine Marken – nie als Fläche | Sterne, Hausempfehlung-Siegel |
| `signalText` | `#e3a13a` | Signalton als lesbare Schrift auf hellen Gründen | Platzhalter-Kennzeichnung, Note |
| `tint` | `#0b0a0a` | Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay | Hero-Tafel, Fußzeile |
| `aufTint` | `#f4f4f6` | Schrift auf der Tafel | Hero-Tafel, Fußzeile |
| `aufTintLeise` | `#b3b2b4` | Nebenschrift auf der Tafel | Fußzeilen-Links |
| `signalAufTint` | `#e3a13a` | Signalton auf der Tafel | Sterne im Hero |
| `fehler` | `#ff8a80` | Fehlermeldungen in Formularen | Formularfehler, Ablehnung |

Kontraste (vom Build erzwungen):

| Schrift | Grund | Verhältnis | Mindestens |
|---|---|---|---|
| text | grund | 17.16:1 | 4.5:1 |
| text | flaeche | 16.15:1 | 4.5:1 |
| text | flaecheTief | 16.23:1 | 4.5:1 |
| textLeise | grund | 7.29:1 | 4.5:1 |
| textLeise | flaeche | 6.86:1 | 4.5:1 |
| textLeise | flaecheTief | 6.89:1 | 4.5:1 |
| akzentText | grund | 7.47:1 | 4.5:1 |
| akzentText | flaeche | 7.03:1 | 4.5:1 |
| akzentText | flaecheTief | 7.07:1 | 4.5:1 |
| aufAkzent | akzent | 7.48:1 | 4.5:1 |
| aufAkzent | akzentTief | 8.82:1 | 4.5:1 |
| signalText | grund | 8.46:1 | 4.5:1 |
| signalText | flaeche | 7.96:1 | 4.5:1 |
| signalText | flaecheTief | 8.00:1 | 4.5:1 |
| aufTint | tint | 18.00:1 | 4.5:1 |
| aufTintLeise | tint | 9.36:1 | 4.5:1 |
| signalAufTint | tint | 8.87:1 | 4.5:1 |
| fehler | flaeche | 7.77:1 | 4.5:1 |
| fehler | grund | 8.26:1 | 4.5:1 |
| fehler | flaecheTief | 7.81:1 | 4.5:1 |
| linieStark | flaeche | 6.49:1 | 3:1 |
| linieStark | grund | 6.90:1 | 3:1 |
| akzent | grund | 7.47:1 | 3:1 |

Herleitung: Neutrale warm getönt (#0f1012 → #13110e), weil die Referenzen mehrheitlich warm sind. Akzent 20 % Richtung Referenz-Akzent #ffea4b gezogen (#f36d1f → #f58628).

## Typografie

- **Anzeige:** Big Shoulders Display 800, Versalien – Chicago-Schildergrotesk – Grill, Nachtmarkt
- **Text:** Libre Franklin 400/600 – Franklin Gothic – Diner, Markt, Zeitung
- **Rubriken:** Versalien, weit gesperrt (0.14em), klein
- **Skala:** Quarte (×1.333), Basis 17px

| Stufe | Desktop | Mobil | Einsatz |
|---|---|---|---|
| klein | 14px | – | Labels, Hinweise, Rubriken |
| basis | 17px | – | Fließtext, Formular |
| gross | 23px | – | Einleitungen, Preise der Hausempfehlung |
| h3 | 30px | – | Gerichtsnamen, Kartenköpfe |
| h2 | 54px | 40px | Sektionstitel |
| h1 | 110px | 62px | Name des Hauses |
| display | 153px | 72px | Typo-Hero |

Ausgeschlossen: Inter, Roboto, system-ui und alle weiteren Schriften aus `VERBOTENE_SCHRIFTEN`.

Herleitung: 3 von 3 ausgewerteten Referenzen führen ebenfalls mit schmaler Grotesk (grotesk, grotesk, grotesk).

## Spacing (8px-Raster)

Skala: `1`=8px · `2`=16px · `3`=24px · `4`=32px · `5`=40px · `6`=48px · `8`=64px · `10`=80px · `12`=96px · `16`=128px · `halb`=4px

Sektionen 80px (mobil 48px), betonte Sektion 112px, enge Leisten 48px. Rinne 32px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 80px: Referenzen sind mehrheitlich „dicht“. Referenzen nutzen ein 4px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 2px · Karte 4px · Knopf 2px · Bild 0px · Marke rund
- Schatten: linie (`0 0 0 1px #373026`)
- Bewegung: cubic-bezier(.5,0,.1,1), 792ms, Weg 8px, Versatz 120ms
  - Animiert werden nur transform und opacity.
  - Startzustände hängen an einer Klasse, die erst das Skript setzt – ohne JS ist alles sichtbar.
  - prefers-reduced-motion: reduce schaltet jede Bewegung ab.
  - Genau ein betonter Moment je Seite (siehe layout.betonterMoment).

Herleitung: Kartenradius aus v1-Stimmung (4px) auf 4px gerastert, im Abendhaus auf höchstens 8px begrenzt; Pillenform nur für kleine Marken. Dunkler Grund: Schatten wären unsichtbar – Kanten statt Schatten. Kurve cubic-bezier(.5,0,.1,1) aus der v1-Handschrift „abend“. Referenzen sind nahezu statisch – Auftrittsweg auf 8px verkürzt.

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
- Buddha-Figuren als Dekoration _(Küche)_
- Tempeldach-Silhouetten _(Küche)_
- Orchideen-Clipart _(Küche)_
- helle Vollflächen-Sektionen _(Archetyp)_
- mehr als ein Akzentton _(Archetyp)_
- schnelle Bewegungen unter 300ms _(Archetyp)_

## Bild-Kanon

- Licht: Pendel- oder Kerzenlicht, tiefe Schatten, warm (ca. 2700 K), Hintergrund fällt ins Dunkle
- Perspektive: nah, geringe Schärfentiefe, ein Gericht oder ein Glas als einziges Licht im Bild
- Farbstimmung: dunkel, satt; Akzent #f36d1f darf im Bild vorkommen (Serviette, Keramik), sonst warme Neutrale
- Oberflächen & Requisiten: Bananenblatt, Messingschalen, Limetten, Thai-Basilikum, Emailleteller
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, low pendant or candle light, deep shadows, warm 2700K, background falling into darkness, close-up, shallow depth of field, a single dish or glass as the only lit object, banana leaf, brass bowls, limes, thai basil, enamel plate, dark moody palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: ruhig und knapp – wenige Worte, eher Einladung als Werbung
- Anrede: Sie, Satzlänge: kurz, 6–14 Wörter
- Wortfeld: Currypaste, Mörser, Limette, Zitronengras, Schärfegrad

