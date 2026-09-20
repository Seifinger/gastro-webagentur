# Archetyp `abend`

> Leitplanke. Werte aus `src/stimmungen.js` und `src/landingPageGenerator.js`,
> nicht abgeschrieben, sondern erzeugt. Gemeinsame Regeln: `README.md`.

Das Haus, für das man einen Abend plant. Dunkler Grund, die Reservierung ist
die Hauptaktion, das Ambiente steht vor der Karte
(`ARCHETYP_PRESET.abend`, `src/designPresets.js:167-171`):
`ambiente → karte → highlights → stimmen → reservierung → kontakt`,
Gästestimmen gestapelt statt im Dreierraster.

## Farben

Drei dunkle Grundgerüste. café/`konditorei` ist die eine Ausnahme: ein
Abendhaus auf Papier – eine Konditorei ist abends hell.

| Grundgerüst | bg | surface | soft | ink | inkSoft | line |
|---|---|---|---|---|---|---|
| TUSCHE | `#0f1012` | `#17181c` | `#141519` | `#f4f4f6` | `#a0a0ac` | `#2a2b33` |
| NACHTHOLZ | `#141013` | `#1d1719` | `#191315` | `#f6f1ec` | `#b0a099` | `#332a2c` |
| NACHTBLAU | `#0d1218` | `#151c24` | `#111820` | `#eef3f8` | `#94a4b4` | `#243040` |
| PAPIER (nur café) | `#fdfaf5` | `#ffffff` | `#f6eee3` | `#2a211a` | `#6f6154` | `#e9dfd1` |

Je Küche:

| Küche | Stimmung | bg | surface | soft | ink | inkSoft | line | accent | accentDark | onAccent | gold | tint |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bayerisch | `kellerstube` | `#141013` | `#1d1719` | `#191315` | `#f6f1ec` | `#b0a099` | `#332a2c` | `#a8583a` | `#85422b` | `#ffffff` | `#c99a4e` | `#0e0a0b` |
| italienisch | `osteria-notte` | `#141013` | `#1d1719` | `#191315` | `#f6f1ec` | `#b0a099` | `#332a2c` | `#ab3946` | `#8c2f39` | `#ffffff` | `#c39b3f` | `#120c0e` |
| griechisch | `athener-moderne` | `#0f1012` | `#17181c` | `#141519` | `#f4f4f6` | `#a0a0ac` | `#2a2b33` | `#c9a227` | `#a3811b` | `#1a1406` | `#c9a227` | `#08090b` |
| türkisch | `bosporus-nacht` | `#0d1218` | `#151c24` | `#111820` | `#eef3f8` | `#94a4b4` | `#243040` | `#2b8181` | `#1f6767` | `#ffffff` | `#c9a227` | `#0a1016` |
| syrisch | `gewuerzbasar` | `#141013` | `#1d1719` | `#191315` | `#f6f1ec` | `#b0a099` | `#332a2c` | `#c8791f` | `#b66b17` | `#1a0f05` | `#d8a33c` | `#140d08` |
| chinesisch | `shanghai-nacht` | `#0f1012` | `#17181c` | `#141519` | `#f4f4f6` | `#a0a0ac` | `#2a2b33` | `#dd353a` | `#c02a2f` | `#ffffff` | `#d9a441` | `#08090b` |
| thailändisch | `streetfood-nacht` | `#0f1012` | `#17181c` | `#141519` | `#f4f4f6` | `#a0a0ac` | `#2a2b33` | `#f36d1f` | `#d05712` | `#1a0d05` | `#e3a13a` | `#0b0a0a` |
| vietnamesisch | `hanoi-nacht` | `#141013` | `#1d1719` | `#191315` | `#f6f1ec` | `#b0a099` | `#332a2c` | `#d08a1f` | `#b07015` | `#1a1205` | `#e0ab45` | `#140f0a` |
| japanisch | `omakase` | `#0f1012` | `#17181c` | `#141519` | `#f4f4f6` | `#a0a0ac` | `#2a2b33` | `#b99a4e` | `#94793a` | `#12100a` | `#b99a4e` | `#07080a` |
| indisch | `maharadscha` | `#0d1218` | `#151c24` | `#111820` | `#eef3f8` | `#94a4b4` | `#243040` | `#974381` | `#6c2e5c` | `#ffffff` | `#c9a227` | `#0c0a12` |
| asiatisch (pan) | `neon` | `#0f1012` | `#17181c` | `#141519` | `#f4f4f6` | `#a0a0ac` | `#2a2b33` | `#dd353a` | `#c02a2f` | `#ffffff` | `#d9a441` | `#08090b` |
| café | `konditorei` | `#fdfaf5` | `#ffffff` | `#f6eee3` | `#2a211a` | `#6f6154` | `#e9dfd1` | `#b8557a` | `#91405e` | `#ffffff` | `#c9a227` | `#2e1a22` |

## Schrift, Rundung, kräftiger Akzent

| Küche | Anzeigeschrift | transform | tracking | radius | accentBold | accent : bg | accentBold : bg |
|---|---|---|---|---|---|---|---|
| bayerisch | Merriweather | none | -0.01em | `10px` | `#d2582a` | 3.70:1 | 4.64:1 |
| italienisch | DM Serif Display | none | 0 | `8px` | `#dc4657` | 3.06:1 | 4.54:1 |
| griechisch | Montserrat | uppercase | 0.02em | `4px` | `#dfad11` | 7.87:1 | 9.18:1 |
| türkisch | DM Serif Display | none | 0 | `6px` | `#1c9090` | 4.08:1 | 4.87:1 |
| syrisch | Oswald | uppercase | 0.03em | `8px` | `#dd7a0a` | 5.58:1 | 6.16:1 |
| chinesisch | Montserrat | uppercase | 0.01em | `6px` | `#f22026` | 4.21:1 | 4.54:1 |
| thailändisch | Oswald | uppercase | 0.04em | `4px` | `#ff6a13` | 6.36:1 | 6.64:1 |
| vietnamesisch | DM Serif Display | none | 0 | `8px` | `#e68e09` | 6.59:1 | 7.40:1 |
| japanisch | DM Serif Display | none | 0.01em | `2px` | `#cfa338` | 7.07:1 | 8.11:1 |
| indisch | DM Serif Display | none | 0 | `8px` | `#cd4aab` | 3.08:1 | 4.62:1 |
| asiatisch (pan) | Montserrat | uppercase | 0.01em | `6px` | `#f22026` | 4.21:1 | 4.54:1 |
| café | DM Serif Display | none | 0 | `20px` | `#cd3b72` | 4.37:1 | 4.52:1 |

Die Rundungen sind hier am kleinsten (`2px` bei japanisch/`omakase`, `4px` bei
griechisch und thailändisch). Das ist Absicht und keine Nachlässigkeit: Ein
Abendhaus hat gerade Kanten. Die `20px` bei café/`konditorei` sind die bewusste
Gegenausnahme.

**Achtung, Fundstelle aus dem Audit:** Montserrat neben Inter bei
griechisch/`athener-moderne`, chinesisch/`shanghai-nacht` und asiatisch/`neon` –
zwei Grotesk-Schriften, faktisch keine Paarung.

Auf dunklem Grund sind sieben der zwölf Akzente als Textfarbe unter 4.5:1:
italienisch `3.06:1`, indisch `3.08:1`, bayerisch `3.70:1`, türkisch `4.08:1`,
chinesisch und asiatisch je `4.21:1`, café `4.37:1`. Wo `accent` Text trägt,
gilt `accentBold` (alle sieben Werte dort ≥ 4.5:1).

## Spacing-Raster

Identisch zum Archetyp `traditionell` (dieselbe `PAGE_STYLES`-Basis, siehe
`traditionell.md`). Abweichend ist allein die Sektionsreihenfolge und die
gestapelte Stimmen-Spalte (`.stimmen-grid--list`, `max-width: 640px`,
`landingPageGenerator.js:404`).

## Der eine starke Moment

**Die Reservierung.** Nicht der Hero: Ein Abendhaus verspricht keinen Betrieb,
sondern einen Abend, und der beginnt mit einem Tisch.

Woran man ihn erkennt:

| | |
|---|---|
| Die einzige gefüllte Akzentfläche unterhalb des Heros | der Knopf im Formular |
| Die einzige Sektion mit zusätzlicher Luft | `padding: 124px 0` statt 88px |
| Die einzige Stelle, an der etwas in Bewegung kommt | der Auftritt des Formulars, 0.9 s |
| Die einzige helle Fläche | `--surface` unter dem Formular |
| Das einzige eigene Zeichen einer Sektion | das gezeichnete Gedeck |

Dafür geben andere Stellen etwas ab: Die USP-Leiste verliert ihre Akzentfläche
und wird eine ruhige Linie auf `--soft`, die Ziffern des Abholwegs werden
Kontur statt Fläche.

**Und alles steht still – auch die Signatur der Küche.** Sie bleibt als
Zeichnung stehen, sie läuft nur nicht mehr:

| Was | Vorher | Jetzt |
|---|---|---|
| Hero-Fahrt | 26 s Zoom auf 106 % | steht |
| Hero-Parallaxe | zwei Scroll-Timeline-Animationen | steht |
| Küchen-Signatur | Sushi-Band, Drehspieß, Drehteller, Laternen … | steht (dieselben Regeln wie `prefers-reduced-motion`) |
| Foto-Plätze, Karten-Hover, Eyebrow-Linie, Schrittkette | animiert | stehen |
| Auftritt beim Scrollen | Versatz + Staffelung | nur Aufblenden |

Ein Sonderfall: **das Sushi-Band** ist als einzige Signatur kein Gegenstand,
sondern ein Mechanismus. Angehalten läge ein Filmstreifen quer über dem Hero.
Im Abendhaus wird daraus ein gesetztes Viererfeld am rechten Rand – vier
Teller nebeneinander statt eines angehaltenen Laufbands.

**Die Kurve:** `cubic-bezier(.5,0,.1,1)`. Langsam an, langsam aus – ein Abend
hat es nicht eilig. 0.9 s für den einen Moment, 0.5 s für alles andere.

**Neue Animationen: keine.** Der Block enthält kein `@keyframes`.

## Das Raster: Kopf links, Inhalt rechts

Der traditionelle Archetyp stellt in seine linke Randspalte die Kategorie und
die Note. Hier steht dort **der Sektionskopf selbst** – eine Speisekarte und
eine Sammlung von Stimmen brauchen keinen Titel über sich, sondern einen
neben sich.

| Sektion | Vorher | Jetzt | Grund |
|---|---|---|---|
| Karte | Kopf mittig, Kästen untereinander | Kopf in 4 von 12 Spalten links, Karte in 8 rechts, ohne Kästen | Ein Kopf, der über einer langen Liste steht, ist weg, sobald man liest. Daneben bleibt er. |
| Stimmen | Kopf mittig, Spalte zentriert | derselbe Aufbau: Kopf links, Stimmen rechts | dasselbe |
| Highlights | 2–3 gleich große Karten | **Leseliste**: ein Gericht mit Bild links, die übrigen als Zeilen rechts (ohne Bild) | Im Abendhaus liest man eine Karte, man blättert keine Kacheln. |
| Kontakt | `1fr 1fr` | **5fr / 7fr**, die Öffnungszeiten in der breiten Spalte und eine Stufe größer | Umgekehrt zum traditionellen Archetyp: Wer einen Abend plant, will zuerst wissen, ob offen ist. |
| Ambiente | drei gleiche Kacheln | der Raum über die volle Breite, Team und Bestseller darunter | Der Raum führt diesen Archetyp an – er steht auch in der Sektionsreihenfolge vorn. |

Die Mittelachse ist überall aufgehoben, auch in der USP-Leiste.

## Die gezeichneten Zeichen

Derselbe Satz wie beim traditionellen Archetyp (`src/signaturIcons.js`):
Wegweiser, Hörer, Papiertüte und Haken statt 📍 📞 🥡 ✓, dazu die Küchenmarke
am Kopf der Highlights, auf dem Siegel der Hausempfehlung und in der Fußzeile.

Dazu **ein Zeichen, das nur dieser Archetyp hat: das Gedeck** – Teller, Gabel,
Messer von oben, am Kopf der Reservierung. Es ist das Zeichen des einen
Moments, und keine andere Sektion bekommt eins.

Die Bildunterschriften stehen auch hier unter dem Bild, nicht darauf: Der
schwarze Schleier, der weiße Schrift auf einem Foto lesbar halten soll, trug
gemessen nicht (1,99:1 über hellen Bildstellen) und ist ohnehin das Muster,
das jede Vorlage hat.

## Ein Wort zu `--gold-dunkel`

Der Token-Name beschreibt die Absicht, nicht die Richtung: Er ist der Goldton,
der auf den Gründen der Seite Text tragen kann. Auf hellen Gründen wird er
dunkler, auf den dunklen Gründen dieses Archetyps heller. Geprüft wird
gegen `bg`, `surface` und `soft` – siehe `scripts/colorSwatchCheck.mjs`.

## Verbotene Muster

Zusätzlich zu den sieben gemeinsamen Regeln aus `README.md`:

- **Kein Glühen, kein Neon, kein Leuchtkasten.** Auf dunklem Grund ist ein
  `box-shadow` in Akzentfarbe der schnellste Weg in die Beliebigkeit. Tiefe
  entsteht hier über Flächenhelligkeit (`bg` → `surface` → `soft`), nicht über
  Licht.
- **Keine großen hellen Flächen.** `surface` ist die hellste erlaubte Fläche
  unterhalb des Heros; `#ffffff` gibt es nur als Text und als Knopffarbe.
- **Nur eine gefüllte Akzentfläche unterhalb des Heros**, und die gehört der
  Reservierung. Die USP-Leiste (`.usp-strip`, `landingPageGenerator.js:326`)
  ist im Abendhaus keine Akzentfläche.
- **Kein dauerhaft laufendes Hero-Element, das dem Versprechen widerspricht.**
  Ein Sushi-Band, das endlos durchs Bild fährt, ist Betrieb, nicht Abend.
- **Kein mittig gesetzter Sektionskopf.**
- **Keine generischen Symbolschriften** (siehe `traditionell.md`).
