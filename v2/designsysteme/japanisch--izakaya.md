# Japanisch · Izakaya

Archetyp **Traditionell** · Schema **dunkel** · Designsystem `japanisch--izakaya` (maschinenlesbar: `japanisch--izakaya.json`)

> Izakaya: dunkles Holz, rote Laterne, Tresen – schmal, laut, warm.

## Referenzen

- **[Bar Goto](https://www.bargoto.com)** (Restaurant) – übernommen: dunkler Grund; Rot als Laterne · bewusst nicht: Altersabfrage
- **[Kanada-Ya](https://www.kanada-ya.com)** (Restaurant) – übernommen: kräftige Rubriken; Gericht als Held · bewusst nicht: App-Download-Banner
- **[Impossible Foods](https://styles.refero.design/style/04961c7d-8ca6-4e87-ba88-6ad7ffa3b245)** (Refero-Style) – übernommen: Rot auf fast Schwarz; schmale, große Display-Schrift · bewusst nicht: Punk-Anmutung

Referenz-Signal: Temperatur **warm**, Helligkeit **dunkel**, Sättigung **fast unbunt**, Dichte **ausgewogen**, Layout **symmetrisch**, Bewegung **lebendig**.

## Farben – jede mit einer Aufgabe

| Rolle | Wert | Aufgabe | Verwendung |
|---|---|---|---|
| `grund` | `#15130f` | Seitengrund – trägt rund 60 % der Fläche | body, Sektionen ohne eigene Fläche |
| `flaeche` | `#1d1719` | Erhöhte Fläche – Formulare, Warenkorb, Tafeln | Formular-Panel, Drawer, Menütafel |
| `flaecheTief` | `#1b1711` | Zweiter Grund für Sektionswechsel – ersetzt Trennlinien | jede zweite Sektion, Passepartout |
| `text` | `#f6f1ec` | Fließtext und Überschriften | body, h1–h3 |
| `textLeise` | `#b0a099` | Nebeninformation: Beschreibungen, Hinweise, Zeiten | Gerichtsbeschreibung, Formularhinweis |
| `linie` | `#373026` | Dekorative Haarlinie – nie alleiniger Träger von Information | Tabellenzeilen, Sektionskanten |
| `linieStark` | `#a09a93` | Begrenzung von Bedienelementen (≥ 3:1) | Eingabefelder, Mengenknöpfe |
| `akzent` | `#c13732` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#c74c47` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#ffffff` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#d45c57` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
| `signal` | `#d9a441` | Signalton für kleine Marken – nie als Fläche | Sterne, Hausempfehlung-Siegel |
| `signalText` | `#d9a441` | Signalton als lesbare Schrift auf hellen Gründen | Platzhalter-Kennzeichnung, Note |
| `tint` | `#120d0e` | Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay | Hero-Tafel, Fußzeile |
| `aufTint` | `#f6f1ec` | Schrift auf der Tafel | Hero-Tafel, Fußzeile |
| `aufTintLeise` | `#b6b1ae` | Nebenschrift auf der Tafel | Fußzeilen-Links |
| `signalAufTint` | `#d9a441` | Signalton auf der Tafel | Sterne im Hero |
| `fehler` | `#ff8a80` | Fehlermeldungen in Formularen | Formularfehler, Ablehnung |

Kontraste (vom Build erzwungen):

| Schrift | Grund | Verhältnis | Mindestens |
|---|---|---|---|
| text | grund | 16.53:1 | 4.5:1 |
| text | flaeche | 15.74:1 | 4.5:1 |
| text | flaecheTief | 15.89:1 | 4.5:1 |
| textLeise | grund | 7.36:1 | 4.5:1 |
| textLeise | flaeche | 7.01:1 | 4.5:1 |
| textLeise | flaecheTief | 7.08:1 | 4.5:1 |
| akzentText | grund | 4.83:1 | 4.5:1 |
| akzentText | flaeche | 4.60:1 | 4.5:1 |
| akzentText | flaecheTief | 4.64:1 | 4.5:1 |
| aufAkzent | akzent | 5.44:1 | 4.5:1 |
| aufAkzent | akzentTief | 4.61:1 | 4.5:1 |
| signalText | grund | 8.25:1 | 4.5:1 |
| signalText | flaeche | 7.85:1 | 4.5:1 |
| signalText | flaecheTief | 7.93:1 | 4.5:1 |
| aufTint | tint | 17.17:1 | 4.5:1 |
| aufTintLeise | tint | 9.08:1 | 4.5:1 |
| signalAufTint | tint | 8.57:1 | 4.5:1 |
| fehler | flaeche | 7.74:1 | 4.5:1 |
| fehler | grund | 8.13:1 | 4.5:1 |
| fehler | flaecheTief | 7.81:1 | 4.5:1 |
| linieStark | flaeche | 6.34:1 | 3:1 |
| linieStark | grund | 6.66:1 | 3:1 |
| akzent | grund | 3.41:1 | 3:1 |

Herleitung: Neutrale warm getönt (#141013 → #15130f), weil die Referenzen mehrheitlich warm sind. Akzent gedämpft (#c8352f → #b9433e, Sättigung ×0.8), Referenzen sind fast unbunt. Akzent 20 % Richtung Referenz-Akzent #e10600 gezogen (#b9433e → #c13732).

## Typografie

- **Anzeige:** Antonio 700, Versalien – schmale Laternenschrift – Izakaya-Tresen
- **Text:** Zen Kaku Gothic New 400/500 – japanische Gothic mit ruhigen Lateinformen
- **Rubriken:** Versalien, weit gesperrt (0.14em), klein
- **Skala:** große Terz (×1.25), Basis 18px

| Stufe | Desktop | Mobil | Einsatz |
|---|---|---|---|
| klein | 14px | – | Labels, Hinweise, Rubriken |
| basis | 18px | – | Fließtext, Formular |
| gross | 23px | – | Einleitungen, Preise der Hausempfehlung |
| h3 | 28px | – | Gerichtsnamen, Kartenköpfe |
| h2 | 44px | 35px | Sektionstitel |
| h1 | 79px | 49px | Name des Hauses |
| display | 103px | 55px | Typo-Hero |

Ausgeschlossen: Inter, Roboto, system-ui und alle weiteren Schriften aus `VERBOTENE_SCHRIFTEN`.

Herleitung: 3 von 3 ausgewerteten Referenzen führen ebenfalls mit schmaler Grotesk (schmal, schmal, grotesk).

## Spacing (8px-Raster)

Skala: `1`=8px · `2`=16px · `3`=24px · `4`=32px · `5`=40px · `6`=48px · `8`=64px · `10`=80px · `12`=96px · `16`=128px · `halb`=4px

Sektionen 96px (mobil 64px), betonte Sektion 128px, enge Leisten 48px. Rinne 32px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 96px: Referenzen sind mehrheitlich „ausgewogen“. Referenzen nutzen ein 5px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 2px · Karte 8px · Knopf 8px · Bild 8px · Marke rund
- Schatten: linie (`0 0 0 1px #373026`)
- Bewegung: cubic-bezier(.2,.72,.3,1), 442ms, Weg 24px, Versatz 80ms
  - Animiert werden nur transform und opacity.
  - Startzustände hängen an einer Klasse, die erst das Skript setzt – ohne JS ist alles sichtbar.
  - prefers-reduced-motion: reduce schaltet jede Bewegung ab.
  - Genau ein betonter Moment je Seite (siehe layout.betonterMoment).

Herleitung: Kartenradius aus v1-Stimmung (6px) auf 4px gerastert; Pillenform nur für kleine Marken. Dunkler Grund: Schatten wären unsichtbar – Kanten statt Schatten. Kurve cubic-bezier(.2,.72,.3,1) aus der v1-Handschrift „traditionell“. Referenzen bewegen sich lebendig – Auftritte 15 % kürzer.

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
- Kirschblüten-Clipart _(Küche)_
- Pinselschrift-Imitationen _(Küche)_
- Wellen-Holzschnitt als Hintergrund _(Küche)_
- Neonfarben _(Archetyp)_
- Glanz-Knöpfe _(Archetyp)_

## Bild-Kanon

- Licht: weiches Seitenlicht vom Fenster, später Vormittag, warm (ca. 3800 K), Schatten sichtbar aber offen
- Perspektive: 45°-Tischperspektive, Anschnitt am Tellerrand, Hände des Personals dürfen im Bild sein
- Farbstimmung: dunkel, satt; Akzent #c8352f darf im Bild vorkommen (Serviette, Keramik), sonst warme Neutrale
- Oberflächen & Requisiten: Hinoki-Holz, Keramik mit Kannyu-Glasur, Stäbchenbänkchen, Noren-Vorhang unscharf
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, soft window side light, late morning, warm 3800K, open soft shadows, 45-degree table angle, cropped at the plate edge, staff hands allowed in frame, hinoki wood counter, kannyu-glaze ceramics, chopstick rest, blurred noren curtain, dark moody palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: bodenständig und konkret – sagt, was es gibt und wie es gemacht wird, ohne zu schwärmen
- Anrede: Sie, Satzlänge: kurz bis mittel, 8–18 Wörter
- Wortfeld: Reis, Brühe, Schnitt, Tresen, Saison

