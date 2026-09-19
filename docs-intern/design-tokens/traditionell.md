# Archetyp `traditionell`

> Leitplanke. Werte aus `src/stimmungen.js` und `src/landingPageGenerator.js`,
> nicht abgeschrieben, sondern erzeugt. Gemeinsame Regeln: `README.md`.

Das Haus, das es schon gab, bevor jemand eine Website wollte. Heller Grund,
Serifen-Anzeigeschrift, ein warmer Akzent. Layout unverändert gegenüber dem
ersten Generator (`ARCHETYP_PRESET.traditionell`, `src/designPresets.js:161`):
Hero mit Signatur, Bestellung als Hauptaktion, Sektionsreihenfolge
`highlights → karte → ambiente → stimmen → reservierung → kontakt`.

## Farben

Vier helle Grundgerüste plus ein dunkles (japanisch/`izakaya` sitzt als
einzige traditionelle Stimmung auf Nachtholz):

| Grundgerüst | bg | surface | soft | ink | inkSoft | line |
|---|---|---|---|---|---|---|
| PAPIER | `#fdfaf5` | `#ffffff` | `#f6eee3` | `#2a211a` | `#6f6154` | `#e9dfd1` |
| LEINEN | `#fbfaf7` | `#ffffff` | `#f2f1ea` | `#23241f` | `#63665c` | `#e4e3db` |
| KALK | `#fbfcfd` | `#ffffff` | `#eef3f7` | `#1c2733` | `#5d6b7a` | `#dde5ec` |
| SAND | `#fdfbf7` | `#ffffff` | `#f6f0e3` | `#2d2519` | `#726550` | `#eae0cf` |
| NACHTHOLZ | `#141013` | `#1d1719` | `#191315` | `#f6f1ec` | `#b0a099` | `#332a2c` |

Je Küche:

| Küche | Stimmung | bg | surface | soft | ink | inkSoft | line | accent | accentDark | onAccent | gold | tint |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bayerisch | `wirtshaus` | `#fbfaf7` | `#ffffff` | `#f2f1ea` | `#23241f` | `#63665c` | `#e4e3db` | `#3f5d3a` | `#2d452a` | `#ffffff` | `#b8862f` | `#1e2a1c` |
| italienisch | `trattoria` | `#fdfaf5` | `#ffffff` | `#f6eee3` | `#2a211a` | `#6f6154` | `#e9dfd1` | `#b4451f` | `#8d3416` | `#ffffff` | `#c1872c` | `#2e2018` |
| griechisch | `taverne-am-hafen` | `#fbfcfd` | `#ffffff` | `#eef3f7` | `#1c2733` | `#5d6b7a` | `#dde5ec` | `#1f6f9c` | `#155273` | `#ffffff` | `#cfa53a` | `#12293a` |
| türkisch | `basar` | `#fdfbf7` | `#ffffff` | `#f6f0e3` | `#2d2519` | `#726550` | `#eae0cf` | `#c0392b` | `#96291d` | `#ffffff` | `#d6a233` | `#2c1713` |
| syrisch | `damaszener-hof` | `#fbfcfd` | `#ffffff` | `#eef3f7` | `#1c2733` | `#5d6b7a` | `#dde5ec` | `#3c8369` | `#2d6751` | `#ffffff` | `#c9a227` | `#16302a` |
| chinesisch | `rote-laterne` | `#fdfaf5` | `#ffffff` | `#f6eee3` | `#2a211a` | `#6f6154` | `#e9dfd1` | `#b31e1e` | `#8a1515` | `#ffffff` | `#c9a227` | `#2a1212` |
| thailändisch | `orchidee` | `#fbfcfd` | `#ffffff` | `#eef3f7` | `#1c2733` | `#5d6b7a` | `#dde5ec` | `#b13a7a` | `#8b2a5e` | `#ffffff` | `#c9a227` | `#2c1424` |
| vietnamesisch | `indochine` | `#fdfbf7` | `#ffffff` | `#f6f0e3` | `#2d2519` | `#726550` | `#eae0cf` | `#8a5a2b` | `#6a431e` | `#ffffff` | `#c0994a` | `#2a1d12` |
| japanisch | `izakaya` | `#141013` | `#1d1719` | `#191315` | `#f6f1ec` | `#b0a099` | `#332a2c` | `#c8352f` | `#9e2723` | `#ffffff` | `#d9a441` | `#120d0e` |
| indisch | `gewuerzmarkt` | `#fdfbf7` | `#ffffff` | `#f6f0e3` | `#2d2519` | `#726550` | `#eae0cf` | `#c87f1e` | `#b06d16` | `#1a1005` | `#d8a33c` | `#2c1e0d` |
| asiatisch (pan) | `marktstand` | `#fdfbf7` | `#ffffff` | `#f6f0e3` | `#2d2519` | `#726550` | `#eae0cf` | `#c1571d` | `#9c4414` | `#ffffff` | `#d8a33c` | `#2c1a0d` |
| café | `wiener-kaffeehaus` | `#fdfaf5` | `#ffffff` | `#f6eee3` | `#2a211a` | `#6f6154` | `#e9dfd1` | `#2f5d4a` | `#214436` | `#ffffff` | `#b8923c` | `#1c2b24` |

## Schrift, Rundung, kräftiger Akzent

Fließtext ist überall Inter 400/600/700. Die zweite Familie ist die
Anzeigeschrift für `h1`, `h2`, `h3`, `.brand`, `.kat > summary`, `.hl-preis`
und `.totals`.

| Küche | Anzeigeschrift | transform | tracking | radius | accentBold | accent : bg | accentBold : bg |
|---|---|---|---|---|---|---|---|
| bayerisch | Merriweather | none | -0.01em | `12px` | `#356b2c` | 7.09:1 | 6.11:1 |
| italienisch | Playfair Display | none | -0.01em | `16px` | `#c73c0c` | 5.29:1 | 4.94:1 |
| griechisch | Playfair Display | none | -0.01em | `14px` | `#0e74ad` | 5.36:1 | 4.96:1 |
| türkisch | Oswald | uppercase | 0.03em | `10px` | `#d52816` | 5.26:1 | 4.90:1 |
| syrisch | Playfair Display | none | -0.01em | `14px` | `#25805f` | 4.40:1 | 4.72:1 |
| chinesisch | Playfair Display | none | -0.01em | `12px` | `#c60b0b` | 6.46:1 | 5.84:1 |
| thailändisch | Playfair Display | none | -0.01em | `16px` | `#c6257c` | 5.44:1 | 5.17:1 |
| vietnamesisch | Playfair Display | none | -0.01em | `14px` | `#9a5a1b` | 5.68:1 | 5.27:1 |
| japanisch | Montserrat | uppercase | 0.02em | `6px` | `#e83a32` | 3.60:1 | 4.57:1 |
| indisch | Oswald | uppercase | 0.03em | `12px` | `#a76207` | 3.12:1 | 4.62:1 |
| asiatisch (pan) | Oswald | uppercase | 0.03em | `10px` | `#c64c08` | 4.37:1 | 4.58:1 |
| café | Playfair Display | none | -0.01em | `14px` | `#226a4c` | 7.24:1 | 6.24:1 |

**Achtung, Fundstelle aus dem Audit:** japanisch/`izakaya` paart Montserrat mit
Inter – zwei Grotesk-Schriften, also faktisch keine Paarung
(`docs-intern/design-audit.md`, Punkt 1). Oswald (türkisch, indisch,
asiatisch) ist dagegen eine echte Paarung: schmal, Versalien, andere Aufgabe.

Ebenfalls aus dem Audit: `accent` trägt als Textfarbe (`.eyebrow`, `.veg`,
`.add-btn`, `.contact-list a`) in vier Stimmungen weniger als 4.5:1 gegen den
Grund – indisch/`gewuerzmarkt` `3.12:1`, japanisch/`izakaya` `3.60:1`,
asiatisch/`marktstand` `4.37:1`, syrisch/`damaszener-hof` `4.40:1`. Wo
`accent` Text ist, gilt deshalb `accentBold` (alle vier Werte dort ≥ 4.5:1).

## Spacing-Raster

Es ist kein 8-Punkt-Raster, sondern ein gewachsenes Set fester Werte. Genau
diese Werte sind erlaubt; neue Zwischengrößen sind es nicht.

| Rolle | Wert | Fundstelle |
|---|---|---|
| Seitenbreite | `max-width: 1140px`, `padding: 0 20px` | `landingPageGenerator.js:236` |
| Sektionsabstand | `padding: 84px 0` | `:237` |
| Sprungziel-Abstand | `scroll-margin-top: 80px` | `:240` |
| Sektionskopf | `max-width: 680px`, `margin-bottom: 44px` | `:241` |
| Eyebrow | `12px` / `.18em` / `margin-bottom: 14px` | `:243` |
| `h2` | `clamp(28px, 4.4vw, 42px)`, `margin-bottom: 16px` | `:244` |
| Fließtext | `17px` / `1.65`, Vorspann `18px` | `:223`, `:245` |
| `h1` im Hero | `clamp(34px, 8.4vw, 70px)` | `:318` |
| Hero-Innenraum | `100px 20px 116px`, ab 900px `140px 20px 120px` | `:315-316` |
| Raster-Abstände | Highlights `24px`, Fotos/Stimmen `20px`, Schritte `22px` | `:331`, `:384`, `:401`, `:354` |
| Knopf | `padding: 14px 26px`, `border-radius: 999px` | `:288` |
| Formularfeld | `padding: 13px 15px`, `radius: calc(var(--radius) / 2)` | `:427` |
| Ecken | `--radius` je Stimmung, siehe Tabelle oben | `:1036` |

## Der eine starke Moment

**Die Hero-Signatur der Küche.** Sie steht schon in `src/heroSignature.js` und
gehört diesem Haus: die Tafel mit der Tagesempfehlung und der überlaufende
Bierkrug (bayerisch), die gegenläufig drehende Pizza (italienisch), der
schaukelnde Olivenzweig (griechisch), der eingegossene Minztee (syrisch).

Damit sie ein Moment sein kann, ist alles andere ruhiggestellt
(`src/styles/handschrift.css.js`):

| Was | Vorher | Jetzt |
|---|---|---|
| Hero-Fahrt | 26 s Zoom auf 106 % | steht |
| Hero-Parallaxe | zwei Scroll-Timeline-Animationen | steht |
| Foto-Plätze | Zoom von 110 % auf 100 % beim Scrollen | steht |
| Highlight-Karte | hebt sich beim Überfahren um 4px, Bild zoomt | steht |
| Eyebrow-Linie | zieht sich über 0.7 s auf | steht fertig da |
| Schrittkette | Faden zieht sich über 0.8 s | steht fertig da |
| Auftritt beim Scrollen | 22–30px Versatz, Skalierung, 85–90 ms Staffelung | nur Aufblenden, ohne Versatz, ohne Staffelung |

Die Regel dahinter, und sie gilt für jede künftige Ergänzung:

> Bewegung gibt es an genau zwei Stellen – bei der einen Signatur (Atmosphäre)
> und als Antwort auf eine Handlung des Gastes (Akkordeon, Knopfdruck). Nichts
> bewegt sich, nur weil es erscheint.

**Die Kurve:** `cubic-bezier(.2,.72,.3,1)`, 0.52 s, keine Verzögerung.
Schneller Anfang, langes Auslaufen – wie ein Teller, der aufgesetzt wird. Sie
gilt nur für diesen Archetyp. Eine zweite Kurve braucht eine Begründung an
dieser Stelle.

**Neue Animationen: keine.** Die Handschrift enthält kein einziges
`@keyframes` (geprüft in `test/handschrift.test.js`). Sie nimmt zurück.

## Die vier Asymmetrien

Je eine Stelle pro Sektion, jeweils aus dem Inhalt begründet:

| Sektion | Vorher | Jetzt | Grund |
|---|---|---|---|
| Highlights | 2–3 gleich große Karten, Kopf mittig | **Treppe**: eine große Karte über die volle Breite (Bild links, Text rechts), dann mittlere, dann kleine | Ein Haus hat ein Gericht, für das man kommt. Die Karte mit dem Siegel „Hausempfehlung" ist dieses Gericht. |
| Karte | Kästen untereinander, Kopf mittig | **Menütafel**: Kategoriename in vier von zwölf Spalten links, Gerichte in acht rechts; der Name bleibt beim Lesen stehen (`position: sticky`) | Ein Kategoriename ist zwei Wörter lang, eine Kategorie zehn Zeilen. Gleich breite Spalten behaupten das Gegenteil. |
| Stimmen | drei gleich große Karten, bei echten Häusern drei **leere** Kästen | **Blatt**: die Google-Note groß in vier von zwölf Spalten links, die Zitate rechts als Zeilen | Die Note ist die Tatsache, die Zitate sind ihre Belege. Und ein leerer Kasten verspricht Inhalt, eine Linie nicht. |
| Kontakt | `1fr 1fr` | **7fr / 5fr**, die Adresse in 20px statt 17px | Adresse und Telefon sind die Handlung, die Öffnungszeiten sind Nachschlagewerk. |

Die Mittelachse ist überall aufgehoben: `section-head.mitte` wirkt in diesem
Archetyp nicht mehr (`handschrift.css.js`), weil kein Inhalt dieser Seite
symmetrisch gewichtet ist.

## Die gezeichneten Zeichen

`src/signaturIcons.js`. Drei Kontaktsymbole (Wegweiser, Hörer, Papiertüte) und
ein Haken ersetzen 📍 📞 🥡 ✓. Dazu eine **Küchenmarke** je Küche, aus
derselben Motivfamilie wie die Hero-Signatur:

| Küche | Marke | Küche | Marke |
|---|---|---|---|
| bayerisch | Hopfendolde | thailändisch | Orchideenblüte |
| italienisch | Basilikumzweig | vietnamesisch | Sternanis |
| griechisch | Olivenzweig mit Olive | japanisch | Ensō |
| türkisch | Drehspieß | indisch | Mörser und Stößel |
| syrisch | Minzzweig | asiatisch | dampfende Schale |
| chinesisch | Laterne | café | Kaffeebohne |

Sie steht an **drei** Stellen derselben Seite: am Kopf der Highlights, auf dem
Siegel der Hausempfehlung und in der Fußzeile.

Alle Zeichen sind Kontur in `currentColor`, ohne eigene Farbe – ihr Kontrast
ist damit der ihres Textes und muss nicht getrennt geprüft werden.

## Verbotene Muster

Zusätzlich zu den sieben gemeinsamen Regeln aus `README.md`:

- **Kein linearer Verlauf auf dem Hero-Hintergrund außer dem einen
  Tint-Schleier**, der den Text lesbar hält (`landingPageGenerator.js:311`).
  Ein zweiter Schleier darüber (`.topbar::before`, `:266`) ist genau das
  Muster, das jede Vorlage hat.
- **Keine Karte in der Speisekarte.** Eine Karte ist eine Liste, keine Sammlung
  von Kästen. `.kat` bekommt in diesem Archetyp keine Fläche und keinen Rahmen.
- **Keine leere Karte.** Die Platzhalter in den Gästestimmen dürfen keine
  Kästen mit `min-height` sein, die nichts enthalten.
- **Kein zweiter bewegter Moment neben der Hero-Signatur.** Siehe unten.
- **Kein mittig gesetzter Sektionskopf.** Der Inhalt dieser Seite ist nirgends
  symmetrisch gewichtet; eine Mittelachse behauptet etwas Falsches.
- **Keine generischen Symbolschriften.** Emoji als Symbol (📍 📞 🥡 ✓) sehen auf
  jedem Gerät anders aus und gehören niemandem. Es gilt der gezeichnete Satz
  aus `src/signaturIcons.js`.
