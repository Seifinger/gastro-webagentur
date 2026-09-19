# Archetyp `hell`

> Leitplanke. Werte aus `src/stimmungen.js` und `src/landingPageGenerator.js`,
> nicht abgeschrieben, sondern erzeugt. Gemeinsame Regeln: `README.md`.

Das Haus, das unterwegs auf dem Handy überflogen wird. Heller Grund, die Karte
steht vorn, die Kopfzeile scrollt mit statt fest zu bleiben
(`ARCHETYP_PRESET.hell`, `src/designPresets.js:176-179`):
`karte → highlights → ambiente → stimmen → reservierung → kontakt`.
Die feste Aktionsleiste unten bleibt – sie ist auf dem Handy der Bestellweg.

## Farben

Drei helle Grundgerüste, kein dunkles:

| Grundgerüst | bg | surface | soft | ink | inkSoft | line |
|---|---|---|---|---|---|---|
| KALK | `#fbfcfd` | `#ffffff` | `#eef3f7` | `#1c2733` | `#5d6b7a` | `#dde5ec` |
| LEINEN | `#fbfaf7` | `#ffffff` | `#f2f1ea` | `#23241f` | `#63665c` | `#e4e3db` |
| SAND | `#fdfbf7` | `#ffffff` | `#f6f0e3` | `#2d2519` | `#726550` | `#eae0cf` |

Je Küche:

| Küche | Stimmung | bg | surface | soft | ink | inkSoft | line | accent | accentDark | onAccent | gold | tint |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bayerisch | `biergarten` | `#fbfcfd` | `#ffffff` | `#eef3f7` | `#1c2733` | `#5d6b7a` | `#dde5ec` | `#568238` | `#44682c` | `#ffffff` | `#c8a63c` | `#1e2a18` |
| italienisch | `costiera` | `#fbfcfd` | `#ffffff` | `#eef3f7` | `#1c2733` | `#5d6b7a` | `#dde5ec` | `#2e7da6` | `#22617f` | `#ffffff` | `#d9a92c` | `#16303d` |
| griechisch | `olivenhain` | `#fbfaf7` | `#ffffff` | `#f2f1ea` | `#23241f` | `#63665c` | `#e4e3db` | `#6b7d3d` | `#4f5e2c` | `#ffffff` | `#b8923c` | `#242a18` |
| türkisch | `anatolische-erde` | `#fdfbf7` | `#ffffff` | `#f6f0e3` | `#2d2519` | `#726550` | `#eae0cf` | `#a85c2e` | `#834320` | `#ffffff` | `#c08a33` | `#2b1d12` |
| syrisch | `levante-modern` | `#fdfbf7` | `#ffffff` | `#f6f0e3` | `#2d2519` | `#726550` | `#eae0cf` | `#8a6a3f` | `#6a502e` | `#ffffff` | `#c0994a` | `#2a2016` |
| chinesisch | `teehaus` | `#fbfaf7` | `#ffffff` | `#f2f1ea` | `#23241f` | `#63665c` | `#e4e3db` | `#3f7d6a` | `#2d5c4d` | `#ffffff` | `#b8923c` | `#1c2b26` |
| thailändisch | `andamanen` | `#fbfcfd` | `#ffffff` | `#eef3f7` | `#1c2733` | `#5d6b7a` | `#dde5ec` | `#1a837f` | `#15746f` | `#ffffff` | `#d9a92c` | `#0f3230` |
| vietnamesisch | `strassenkueche` | `#fbfaf7` | `#ffffff` | `#f2f1ea` | `#23241f` | `#63665c` | `#e4e3db` | `#48833a` | `#3a6b2e` | `#ffffff` | `#c8a63c` | `#1e2a18` |
| japanisch | `washitsu` | `#fbfaf7` | `#ffffff` | `#f2f1ea` | `#23241f` | `#63665c` | `#e4e3db` | `#6b6256` | `#4e473e` | `#ffffff` | `#a8905c` | `#262320` |
| indisch | `suedindisch-hell` | `#fbfaf7` | `#ffffff` | `#f2f1ea` | `#23241f` | `#63665c` | `#e4e3db` | `#46833c` | `#36672d` | `#ffffff` | `#c8a63c` | `#1e2a18` |
| asiatisch (pan) | `fusion-minimal` | `#fbfcfd` | `#ffffff` | `#eef3f7` | `#1c2733` | `#5d6b7a` | `#dde5ec` | `#2f4858` | `#1f3240` | `#ffffff` | `#a8905c` | `#16222b` |
| café | `third-wave` | `#fbfcfd` | `#ffffff` | `#eef3f7` | `#1c2733` | `#5d6b7a` | `#dde5ec` | `#5c6b5a` | `#434f42` | `#ffffff` | `#a8905c` | `#242a23` |

## Schrift, Rundung, kräftiger Akzent

| Küche | Anzeigeschrift | transform | tracking | radius | accentBold | accent : bg | accentBold : bg |
|---|---|---|---|---|---|---|---|
| bayerisch | Montserrat | none | 0 | `18px` | `#477f22` | 4.40:1 | 4.73:1 |
| italienisch | Cormorant Garamond | none | 0 | `20px` | `#197aac` | 4.44:1 | 4.62:1 |
| griechisch | Cormorant Garamond | none | 0 | `18px` | `#637a26` | 4.35:1 | 4.63:1 |
| türkisch | Merriweather | none | -0.01em | `16px` | `#bb571b` | 4.80:1 | 4.52:1 |
| syrisch | Cormorant Garamond | none | 0 | `18px` | `#986a2c` | 4.82:1 | 4.58:1 |
| chinesisch | Cormorant Garamond | none | 0 | `18px` | `#297f64` | 4.62:1 | 4.66:1 |
| thailändisch | Montserrat | none | 0 | `20px` | `#0a7e7a` | 4.45:1 | 4.78:1 |
| vietnamesisch | Montserrat | none | 0 | `18px` | `#358023` | 4.39:1 | 4.72:1 |
| japanisch | Cormorant Garamond | none | 0.01em | `2px` | `#7c6445` | 5.74:1 | 5.34:1 |
| indisch | Cormorant Garamond | none | 0 | `18px` | `#338426` | 4.40:1 | 4.50:1 |
| asiatisch (pan) | Montserrat | none | 0 | `4px` | `#234b64` | 9.34:1 | 9.04:1 |
| café | Montserrat | none | 0 | `4px` | `#4e7d48` | 5.52:1 | 4.70:1 |

Die Rundungen sind hier am größten (`16–20px`), mit zwei bewussten Ausnahmen:
japanisch/`washitsu` (`2px`) und asiatisch/`fusion-minimal` sowie
café/`third-wave` (`4px`).

**Achtung, Fundstelle aus dem Audit, und hier trifft sie am härtesten:** Fünf
von zwölf Küchen paaren Montserrat mit Inter – bayerisch/`biergarten`,
thailändisch/`andamanen`, vietnamesisch/`strassenkueche`,
asiatisch/`fusion-minimal`, café/`third-wave`. Das ist die Stelle, an der die
Checkliste aus Schritt 1 „Inter als einzige Schrift ohne bewusste Paarung"
faktisch zutrifft: zwei neutrale Grotesk-Schriften, die sich nur im Gewicht
unterscheiden.

Sechs der zwölf Akzente liegen als Textfarbe auf `bg` **unter** 4.5:1:
griechisch `4.35:1`, vietnamesisch `4.39:1`, bayerisch und indisch je
`4.40:1`, italienisch `4.44:1`, thailändisch `4.45:1`. Auf `surface`
(`#ffffff`) liegen alle darüber (knappster Wert: bayerisch `4.52:1`) – der
Unterschied kommt daher, dass `bg` ein leicht getöntes Weiß ist.

Der Eyebrow (`.eyebrow`, `landingPageGenerator.js:243`) steht auf `bg`. Damit
ist er in diesen sechs Stimmungen unter AA. Wo `accent` Text auf `bg` trägt,
gilt deshalb `accentBold`.

## Spacing-Raster

Identisch zum Archetyp `traditionell` (siehe dort). Der einzige Unterschied im
Aufbau: `header.sticky: false` – die Kopfzeile steht absolut
(`.topbar-static`, `landingPageGenerator.js:277`) und nimmt darum keine 70px
vom ersten Bildschirm.

Weil dieser Archetyp zuerst auf dem Handy gelesen wird, gilt zusätzlich: jede
Entscheidung wird bei **390px** geprüft, nicht bei 1440px. Was auf dem Handy
nicht trägt, kommt nicht auf den Desktop.

## Verbotene Muster

Zusätzlich zu den sieben gemeinsamen Regeln aus `README.md`:

- **Keine dunkle Vollfläche außer Hero und Fußzeile.** Ein heller Archetyp, der
  in der Mitte eine dunkle „Kontrastsektion" bekommt, ist zwei Entwürfe in
  einem.
- **Keine zweite Grotesk als Anzeigeschrift.** Wo heute Montserrat neben Inter
  steht, ist das ein bekannter Mangel und kein Vorbild; neu dazukommen darf es
  nicht.
- **Keine Desktop-Asymmetrie, die auf 390px zur Treppe wird.** Versetzte Raster
  brechen hier auf eine Spalte zusammen – dann muss die eine Spalte die
  Gewichtung tragen, nicht das Raster.
- **Kein mittig gesetzter Sektionskopf.**
- **Keine generischen Symbolschriften** (siehe `traditionell.md`).
