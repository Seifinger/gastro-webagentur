# Design-Tokens je Archetyp

Vier Dateien, eine je Archetyp: `traditionell.md`, `abend.md`, `hell.md`,
`editorial.md`. Sie sind keine Beschreibung des Ist-Zustands, sondern die
Leitplanke: **Jede künftige Generierung – auch durch einen Agenten in einer
späteren Sitzung – muss sich an die Werte und die Verbotsliste der jeweiligen
Datei halten.** Wer etwas anderes braucht, ändert zuerst die Datei und
begründet es dort.

## Woher die Werte kommen

| Was | Quelle im Code |
|---|---|
| Farben (`bg`, `accent`, `tint` …) | `src/stimmungen.js`, je Küche und Archetyp |
| kräftigerer Akzent (`accentBold`) | abgeleitet in `src/stimmungen.js:444-449` über `colorMath.boldAccent` |
| Schriftpaarung | `src/stimmungen.js:19-28`, geladen in `src/fontLibrary.js:15-23` |
| Layout je Archetyp | `ARCHETYP_PRESET` in `src/designPresets.js:159-197` |
| Spacing, Typo-Skala | `PAGE_STYLES` in `src/landingPageGenerator.js:215-511` |
| Magazin-Abweichungen | `src/styles/editorial.css.js` |

Die Tabellen in den vier Dateien sind aus `src/stimmungen.js` erzeugt, nicht
abgeschrieben. Ändert sich dort ein Wert, sind die Dateien nachzuziehen.

## Die sieben Schriften

Mehr gibt es nicht, und mehr darf es nicht geben (`src/fontLibrary.js:15-23`);
jeder weitere Schnitt wöge in jedem Entwurf mit, auch wo er nie vorkommt:

| Familie | Schnitte | Rolle |
|---|---|---|
| Inter | 400, 600, 700 | Fließtext **aller** 48 Stimmungen |
| Playfair Display | 700 | Anzeigeschrift, elegant |
| Merriweather | 700 | Anzeigeschrift, rustikal |
| Cormorant Garamond | 600 | Anzeigeschrift, fein |
| DM Serif Display | 400 | Anzeigeschrift, kontrastreich |
| Montserrat | 600, 700 | Anzeigeschrift, geometrisch |
| Oswald | 500 | Anzeigeschrift, schmal |

## Was in allen vier Dateien gilt

Diese Verbote stehen in jeder der vier Dateien noch einmal im Zusammenhang;
hier sind sie gesammelt:

1. **Kein Verlauf zwischen zwei verschiedenen Farbtönen.** Verläufe gibt es nur
   einfarbig (aus `--tint` oder aus Schwarz) und nur dort, wo Text auf einem
   Foto lesbar bleiben muss. Nie auf einem Knopf, nie auf einer Karte, nie auf
   einer Sektionsfläche.
2. **Keine dropshadow-Karte ohne echten Abgrenzungsgrund.** Ein Schatten ist
   zulässig, wenn das Element über einem Foto schwebt (Hero-Signatur,
   Warenkorb-Knopf). Inhalt, der ohnehin auf eigener Fläche steht, bekommt
   keinen.
3. **Keine achte Schriftfamilie**, und je Stimmung nie mehr als die zwei
   genannten.
4. **Keine Farbe außerhalb der Tabelle.** Hart kodierte Hex-Werte sind nur für
   Weiß/Schwarz mit Transparenz über Fotos erlaubt.
5. **Kontrast ≥ 4.5:1** für jeden Text. Geprüft wird nicht die Basispalette,
   sondern die tatsächliche Anwendung: `node scripts/colorSwatchCheck.mjs`.
6. **Eine neue Easing-Kurve braucht einen Satz Begründung** im Abschnitt
   „Der eine starke Moment" der jeweiligen Datei. Ohne Begründung gilt die
   Kurve des Archetyps.
7. **Byte-Diff:** Wer an einem Archetyp arbeitet, ändert die übrigen drei um
   kein Byte. Prüfung:
   `node scripts/archetypSnapshot.mjs /tmp/vorher` vor und
   `node scripts/archetypSnapshot.mjs /tmp/nachher` nach der Änderung, dann
   `diff -rq /tmp/vorher /tmp/nachher`.
