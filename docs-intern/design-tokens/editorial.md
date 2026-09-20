# Archetyp `editorial`

> Leitplanke. Werte aus `src/stimmungen.js`, `src/styles/editorial.css.js` und
> `src/landingPageGenerator.js`. Gemeinsame Regeln: `README.md`.

Das Magazin. Nicht die Bestellung führt, sondern das Bild: Vollbild-Hero mit
zeilenweise auftretender Überschrift, Kennziffern in der rechten Randspalte,
danach die Highlights im versetzten Raster
(`ARCHETYP_PRESET.editorial`, `src/designPresets.js:188-196`).

Diese Welt **erfindet keine eigenen Farben**: Sie übernimmt die der
traditionellen Stimmung derselben Küche und stellt nur die Form härter –
`radius: 0px`, `letter-spacing: -0.03em` (`src/stimmungen.js:462-473`).

## Farben

Identisch zu `traditionell.md`, hier noch einmal vollständig, weil die
Stimmungs-Kennungen andere sind:

| Küche | Stimmung | bg | surface | soft | ink | inkSoft | line | accent | accentDark | onAccent | gold | tint |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bayerisch | `wirtshaus-editorial` | `#fbfaf7` | `#ffffff` | `#f2f1ea` | `#23241f` | `#63665c` | `#e4e3db` | `#3f5d3a` | `#2d452a` | `#ffffff` | `#b8862f` | `#1e2a1c` |
| italienisch | `trattoria-editorial` | `#fdfaf5` | `#ffffff` | `#f6eee3` | `#2a211a` | `#6f6154` | `#e9dfd1` | `#b4451f` | `#8d3416` | `#ffffff` | `#c1872c` | `#2e2018` |
| griechisch | `taverne-am-hafen-editorial` | `#fbfcfd` | `#ffffff` | `#eef3f7` | `#1c2733` | `#5d6b7a` | `#dde5ec` | `#1f6f9c` | `#155273` | `#ffffff` | `#cfa53a` | `#12293a` |
| türkisch | `basar-editorial` | `#fdfbf7` | `#ffffff` | `#f6f0e3` | `#2d2519` | `#726550` | `#eae0cf` | `#c0392b` | `#96291d` | `#ffffff` | `#d6a233` | `#2c1713` |
| syrisch | `damaszener-hof-editorial` | `#fbfcfd` | `#ffffff` | `#eef3f7` | `#1c2733` | `#5d6b7a` | `#dde5ec` | `#3c8369` | `#2d6751` | `#ffffff` | `#c9a227` | `#16302a` |
| chinesisch | `rote-laterne-editorial` | `#fdfaf5` | `#ffffff` | `#f6eee3` | `#2a211a` | `#6f6154` | `#e9dfd1` | `#b31e1e` | `#8a1515` | `#ffffff` | `#c9a227` | `#2a1212` |
| thailändisch | `orchidee-editorial` | `#fbfcfd` | `#ffffff` | `#eef3f7` | `#1c2733` | `#5d6b7a` | `#dde5ec` | `#b13a7a` | `#8b2a5e` | `#ffffff` | `#c9a227` | `#2c1424` |
| vietnamesisch | `indochine-editorial` | `#fdfbf7` | `#ffffff` | `#f6f0e3` | `#2d2519` | `#726550` | `#eae0cf` | `#8a5a2b` | `#6a431e` | `#ffffff` | `#c0994a` | `#2a1d12` |
| japanisch | `izakaya-editorial` | `#141013` | `#1d1719` | `#191315` | `#f6f1ec` | `#b0a099` | `#332a2c` | `#c8352f` | `#9e2723` | `#ffffff` | `#d9a441` | `#120d0e` |
| indisch | `gewuerzmarkt-editorial` | `#fdfbf7` | `#ffffff` | `#f6f0e3` | `#2d2519` | `#726550` | `#eae0cf` | `#c87f1e` | `#b06d16` | `#1a1005` | `#d8a33c` | `#2c1e0d` |
| asiatisch (pan) | `marktstand-editorial` | `#fdfbf7` | `#ffffff` | `#f6f0e3` | `#2d2519` | `#726550` | `#eae0cf` | `#c1571d` | `#9c4414` | `#ffffff` | `#d8a33c` | `#2c1a0d` |
| café | `wiener-kaffeehaus-editorial` | `#fdfaf5` | `#ffffff` | `#f6eee3` | `#2a211a` | `#6f6154` | `#e9dfd1` | `#2f5d4a` | `#214436` | `#ffffff` | `#b8923c` | `#1c2b24` |

Der Unterschied zur traditionellen Welt liegt darin, **wo** die Farbe steht:
Das Magazin arbeitet mit `--accent-bold` für große Flächen und Schrift
(`landingPageGenerator.js:1041`), die anderen drei Archetypen mit `--accent`.

## Schrift, Rundung, kräftiger Akzent

| Küche | Anzeigeschrift | transform | tracking | radius | accentBold | accent : bg | accentBold : bg |
|---|---|---|---|---|---|---|---|
| bayerisch | Merriweather | none | -0.03em | `0px` | `#356b2c` | 7.09:1 | 6.11:1 |
| italienisch | Playfair Display | none | -0.03em | `0px` | `#c73c0c` | 5.29:1 | 4.94:1 |
| griechisch | Playfair Display | none | -0.03em | `0px` | `#0e74ad` | 5.36:1 | 4.96:1 |
| türkisch | Oswald | uppercase | -0.03em | `0px` | `#d52816` | 5.26:1 | 4.90:1 |
| syrisch | Playfair Display | none | -0.03em | `0px` | `#25805f` | 4.40:1 | 4.72:1 |
| chinesisch | Playfair Display | none | -0.03em | `0px` | `#c60b0b` | 6.46:1 | 5.84:1 |
| thailändisch | Playfair Display | none | -0.03em | `0px` | `#c6257c` | 5.44:1 | 5.17:1 |
| vietnamesisch | Playfair Display | none | -0.03em | `0px` | `#9a5a1b` | 5.68:1 | 5.27:1 |
| japanisch | Montserrat | uppercase | -0.03em | `0px` | `#e83a32` | 3.60:1 | 4.57:1 |
| indisch | Oswald | uppercase | -0.03em | `0px` | `#a76207` | 3.12:1 | 4.62:1 |
| asiatisch (pan) | Oswald | uppercase | -0.03em | `0px` | `#c64c08` | 4.37:1 | 4.58:1 |
| café | Playfair Display | none | -0.03em | `0px` | `#226a4c` | 7.24:1 | 6.24:1 |

Die Wirkung kommt hier aus Größe, Gewicht und Laufweite – nicht aus neuen
Schriften (`src/styles/editorial.css.js:21-32`):

| Rolle | Wert |
|---|---|
| `h1` im Hero | `clamp(48px, 9vw, 128px)`, `800`, `-0.035em`, `line-height: 0.96` |
| `h2` | `clamp(34px, 6vw, 78px)`, `800`, `line-height: 1.02` |
| Eyebrow | `13px`, `letter-spacing: .26em` |
| Vorspann | `clamp(17px, 1.6vw, 21px)` |
| Gerichtsname | `clamp(21px, 2.2vw, 30px)` |
| Kategorie | `clamp(21px, 2.6vw, 34px)` |

## Spacing-Raster

Weiter als die übrigen drei:

| Rolle | Wert | Fundstelle |
|---|---|---|
| Seitenbreite | `max-width: 1280px` | `editorial.css.js:128` |
| Sektionsabstand | `padding: 112px 0` | `:127` |
| Hero-Innenraum | `120px 20px 112px`, ab 900px `160px 32px 104px` | `:56-60` |
| Hero-Raster | 12 Spalten, Text `1 / span 7`, Rand `9 / span 4` | `:59-62` |
| Highlight-Raster | 12 Spalten, `gap: 40px 28px` | `:90` |
| Kartenbreiten | `span 7` / `span 5` (+`56px` Versatz) / `3 / span 8` | `:93-96` |
| Sektionskopf | `max-width: 18ch` (mittig-Klasse), `22ch` ab 900px | `:124-125` |
| Ecken | `0px` – ausnahmslos | `src/stimmungen.js:468` |

## Verbotene Muster

Zusätzlich zu den sieben gemeinsamen Regeln aus `README.md`:

- **Keine runde Ecke.** `--radius` ist `0px`. Auch `999px` an Knöpfen und
  Abzeichen ist in diesem Archetyp eine Fremdform.
- **Kein Rahmen um eine Highlight-Karte.** Im Magazin steht das Bild, darunter
  der Text (`editorial.css.js:100`). Eine Kachel wäre ein Rückschritt.
- **Kein mittig gesetzter Sektionskopf** – hier bereits umgesetzt
  (`editorial.css.js:124`), gilt weiter.
- **Keine zweite große Schrift.** Die Magazin-Wirkung kommt aus der Skala oben,
  nicht aus einer zusätzlichen Familie.
- **Kein gleichmäßiges Raster in den Highlights.** Der Versatz ist der Kern
  dieses Archetyps; ein `repeat(3, 1fr)` nimmt ihm den Sinn.
- **Keine generischen Symbolschriften** (siehe `traditionell.md`).
