# Café · Wiener Kaffeehaus

Archetyp **Traditionell** · Schema **hell** · Designsystem `cafe--wiener-kaffeehaus` (maschinenlesbar: `cafe--wiener-kaffeehaus.json`)

> Wiener Kaffeehaus: Marmor, Zeitung, Thonet – Broadsheet statt Barock.

## Referenzen

- **[Café Central](https://www.cafecentral.wien)** (Restaurant) – übernommen: Zeitungs-Hierarchie; tiefes Grün · bewusst nicht: Barock-Ornamente
- **[Demel](https://www.demel.com)** (Restaurant) – übernommen: Serifen-Tradition; Cream-Grund · bewusst nicht: Shop-Mechanik
- **[Monocle](https://styles.refero.design/style/9165ecb1-f068-4093-8783-1f3c98898b8a)** (Refero-Style) – übernommen: Plantin-artige Serife; Spalten-Disziplin · bewusst nicht: Gelb als Signal

Referenz-Signal: Temperatur **warm**, Helligkeit **hell**, Sättigung **gedeckt**, Dichte **ausgewogen**, Layout **symmetrisch**, Bewegung **ruhig**.

## Farben – jede mit einer Aufgabe

| Rolle | Wert | Aufgabe | Verwendung |
|---|---|---|---|
| `grund` | `#fdfaf5` | Seitengrund – trägt rund 60 % der Fläche | body, Sektionen ohne eigene Fläche |
| `flaeche` | `#ffffff` | Erhöhte Fläche – Formulare, Warenkorb, Tafeln | Formular-Panel, Drawer, Menütafel |
| `flaecheTief` | `#f6eee3` | Zweiter Grund für Sektionswechsel – ersetzt Trennlinien | jede zweite Sektion, Passepartout |
| `text` | `#2a211a` | Fließtext und Überschriften | body, h1–h3 |
| `textLeise` | `#6f6154` | Nebeninformation: Beschreibungen, Hinweise, Zeiten | Gerichtsbeschreibung, Formularhinweis |
| `linie` | `#e9dfd1` | Dekorative Haarlinie – nie alleiniger Träger von Information | Tabellenzeilen, Sektionskanten |
| `linieStark` | `#80776c` | Begrenzung von Bedienelementen (≥ 3:1) | Eingabefelder, Mengenknöpfe |
| `akzent` | `#315b4a` | Handlung – ausschließlich Knöpfe und aktive Zustände (max. 8 % Fläche) | Primärknopf, Fokusring, aktive Rubrik |
| `akzentTief` | `#284b3d` | Hover/gedrückt des Primärknopfs | Primärknopf :hover |
| `aufAkzent` | `#ffffff` | Schrift auf Akzentfläche | Primärknopf-Beschriftung |
| `akzentText` | `#315b4a` | Akzent als Schrift – Links, Rubriken, Preise | Links, Rubrik, Plus-Knopf |
| `signal` | `#b8923c` | Signalton für kleine Marken – nie als Fläche | Sterne, Hausempfehlung-Siegel |
| `signalText` | `#82672a` | Signalton als lesbare Schrift auf hellen Gründen | Platzhalter-Kennzeichnung, Note |
| `tint` | `#1c2b24` | Dunkle Tafel – Hero-Tafel, Fußzeile, Overlay | Hero-Tafel, Fußzeile |
| `aufTint` | `#fefdfa` | Schrift auf der Tafel | Hero-Tafel, Fußzeile |
| `aufTintLeise` | `#bfc2be` | Nebenschrift auf der Tafel | Fußzeilen-Links |
| `signalAufTint` | `#b8923c` | Signalton auf der Tafel | Sterne im Hero |
| `fehler` | `#b3261e` | Fehlermeldungen in Formularen | Formularfehler, Ablehnung |

Kontraste (vom Build erzwungen):

| Schrift | Grund | Verhältnis | Mindestens |
|---|---|---|---|
| text | grund | 15.15:1 | 4.5:1 |
| text | flaeche | 15.78:1 | 4.5:1 |
| text | flaecheTief | 13.72:1 | 4.5:1 |
| textLeise | grund | 5.74:1 | 4.5:1 |
| textLeise | flaeche | 5.98:1 | 4.5:1 |
| textLeise | flaecheTief | 5.20:1 | 4.5:1 |
| akzentText | grund | 7.40:1 | 4.5:1 |
| akzentText | flaeche | 7.70:1 | 4.5:1 |
| akzentText | flaecheTief | 6.70:1 | 4.5:1 |
| aufAkzent | akzent | 7.70:1 | 4.5:1 |
| aufAkzent | akzentTief | 9.70:1 | 4.5:1 |
| signalText | grund | 5.14:1 | 4.5:1 |
| signalText | flaeche | 5.35:1 | 4.5:1 |
| signalText | flaecheTief | 4.65:1 | 4.5:1 |
| aufTint | tint | 14.53:1 | 4.5:1 |
| aufTintLeise | tint | 8.22:1 | 4.5:1 |
| signalAufTint | tint | 5.08:1 | 4.5:1 |
| fehler | flaeche | 6.54:1 | 4.5:1 |
| fehler | grund | 6.28:1 | 4.5:1 |
| fehler | flaecheTief | 5.68:1 | 4.5:1 |
| linieStark | flaeche | 4.40:1 | 3:1 |
| linieStark | grund | 4.23:1 | 3:1 |
| akzent | grund | 7.40:1 | 3:1 |

Herleitung: Neutrale warm getönt (#fdfaf5 → #fdfaf5), weil die Referenzen mehrheitlich warm sind. Akzent gedämpft (#2f5d4a → #315b4a, Sättigung ×0.9), Referenzen sind gedeckt. Kein Referenz-Akzent in derselben Farbfamilie (#7f1541, #aa8c50, #ffc500) – Küchen-Akzent bleibt.

## Typografie

- **Anzeige:** Old Standard TT 700 – Zeitungsantiqua des 19. Jahrhunderts – Kaffeehaus-Zeitung
- **Text:** Libre Franklin 400/600 – Franklin Gothic – Diner, Markt, Zeitung
- **Rubriken:** Versalien, weit gesperrt (0.14em), klein
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

Herleitung: 1 von 3 ausgewerteten Referenzen führen ebenfalls mit Serife (grotesk, grotesk, serif).

## Spacing (8px-Raster)

Skala: `1`=8px · `2`=16px · `3`=24px · `4`=32px · `5`=40px · `6`=48px · `8`=64px · `10`=80px · `12`=96px · `16`=128px · `halb`=4px

Sektionen 96px (mobil 64px), betonte Sektion 128px, enge Leisten 48px. Rinne 32px, Seitenrand 48/24px.

Herleitung: Sektionsabstand 96px: Referenzen sind mehrheitlich „ausgewogen“. Referenzen nutzen ein 10px-Grundmaß – v2 setzt einheitlich 8px (4px nur als Halbschritt).

## Radius, Schatten, Bewegung

- Radius: klein 6px · Karte 16px · Knopf 8px · Bild 16px · Marke rund
- Schatten: papier (`0 1px 0 #e9dfd1, 0 16px 32px -24px rgba(28,43,36,.35)`)
- Bewegung: cubic-bezier(.2,.72,.3,1), 520ms, Weg 24px, Versatz 80ms
  - Animiert werden nur transform und opacity.
  - Startzustände hängen an einer Klasse, die erst das Skript setzt – ohne JS ist alles sichtbar.
  - prefers-reduced-motion: reduce schaltet jede Bewegung ab.
  - Genau ein betonter Moment je Seite (siehe layout.betonterMoment).

Herleitung: Kartenradius aus v1-Stimmung (14px) auf 4px gerastert; Pillenform nur für kleine Marken. Traditionell: ein Papierschatten – Kante plus weicher Fall, nie auf jeder Karte. Kurve cubic-bezier(.2,.72,.3,1) aus der v1-Handschrift „traditionell“.

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
- Kaffeebohnen-Clipart _(Küche)_
- Latte-Art-Stockfoto als Hero _(Küche)_
- Kreidetafel-Schriften _(Küche)_
- Neonfarben _(Archetyp)_
- Glanz-Knöpfe _(Archetyp)_

## Bild-Kanon

- Licht: weiches Seitenlicht vom Fenster, später Vormittag, warm (ca. 3800 K), Schatten sichtbar aber offen
- Perspektive: 45°-Tischperspektive, Anschnitt am Tellerrand, Hände des Personals dürfen im Bild sein
- Farbstimmung: hell, luftig; Akzent #2f5d4a darf im Bild vorkommen (Serviette, Keramik), sonst warme Neutrale
- Oberflächen & Requisiten: Marmortisch, Porzellantasse mit Untertasse, Zeitung, Kuchengabel
- Nie: Menschen, die in die Kamera lächeln, Hochglanz-Überschärfe und plastische Haut, Schrift, Logos oder Wasserzeichen im Bild, Gerichte mit unmöglich vielen Zutaten, aufgesetzte Dampfschwaden, Bokeh-Lichtkreise als Deko
- Prompt-Basis: `editorial restaurant photography, soft window side light, late morning, warm 3800K, open soft shadows, 45-degree table angle, cropped at the plate edge, staff hands allowed in frame, marble cafe table, porcelain cup and saucer, newspaper, cake fork, light airy palette, natural imperfections, real restaurant setting, 35mm film look, no text, no people facing camera`

## Sprache

- Ton: bodenständig und konkret – sagt, was es gibt und wie es gemacht wird, ohne zu schwärmen
- Anrede: Sie, Satzlänge: kurz bis mittel, 8–18 Wörter
- Wortfeld: Röstung, Kuchen, Frühstück, Tasse, Zeitung

