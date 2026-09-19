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
