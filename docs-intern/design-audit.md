# Slop-Audit der vier Archetypen

Stand vor den Änderungen dieses Auftrags (Basis: `7a6761e`).

Geprüft wurden vier gebaute Entwürfe, je einer pro Archetyp und bewusst mit
unterschiedlicher Küche, damit auffällt, was vom Archetyp und was von der Küche
kommt:

| Archetyp | Küche | Stimmung |
|---|---|---|
| traditionell | bayerisch | `wirtshaus` |
| abend | japanisch | `omakase` |
| hell | griechisch | `olivenhain` |
| editorial | italienisch | `trattoria-editorial` |

Gebaut über `buildLandingPage()` mit echten Bildern, angesehen im Browser
(1440×900 und 390×844). Reproduzierbar über den Byte-Diff-Schnappschuss
`node scripts/archetypSnapshot.mjs <ordner>`.

---

## 1. Läuft irgendwo Inter/Roboto/Open Sans als einzige Schrift ohne bewusste Paarung mit einer Display-Schrift?

**Teilweise ja.** Eine Paarung ist überall angelegt – `src/stimmungen.js:19` setzt
Inter als Fließtext, jede Stimmung nennt daneben eine eigene Anzeigeschrift.
In 10 von 48 Stimmungen ist diese Anzeigeschrift aber Montserrat, also wieder
ein neutraler Grotesk. Inter (neo-grotesk) neben Montserrat (geometrisch) liest
sich auf einer Restaurantseite wie *eine* Schrift in zwei Gewichten; eine
Paarung ist es nur auf dem Papier.

Am stärksten trifft es den hellen Archetyp – 5 von 12 Küchen:

- `src/stimmungen.js:158-164` – bayerisch/`biergarten`, Display = Montserrat
- `src/stimmungen.js:302-308` – thailaendisch/`andamanen`, Montserrat
- `src/stimmungen.js:326-332` – vietnamesisch/`strassenkueche`, Montserrat
- `src/stimmungen.js:398-404` – asiatisch/`fusion-minimal`, Montserrat
- `src/stimmungen.js:422-428` – cafe/`third-wave`, Montserrat

Im Abend-Archetyp dreimal (`griechisch/athener-moderne` 199-205,
`chinesisch/shanghai-nacht` 271-277, `asiatisch/neon` 391-397), in
traditionell/editorial je einmal (`japanisch/izakaya` 336-342).

Nicht beanstandet: Oswald (`tuerkisch/basar`, `indisch/gewuerzmarkt`,
`asiatisch/marktstand`, `syrisch/gewuerzbasar`, `thailaendisch/streetfood-nacht`).
Eine schmal laufende Versalschrift neben Inter ist eine echte Paarung – anderer
Duktus, andere Laufweite, andere Aufgabe.

## 2. Gibt es einen Lila/Blau-Verlauf im Hero oder auf Buttons?

**Nein – der klassische KI-Verlauf fehlt.** Kein Knopf trägt einen Verlauf
(`.btn-primary` ist eine Fläche, `src/landingPageGenerator.js:293`), und kein
Verlauf mischt zwei Farbtöne. Lila kommt nur als Akzentfläche vor
(`indisch/maharadscha` `#974381`, `src/stimmungen.js:370`), nicht als Verlauf.

**Aber:** Über dem Hero liegen gleich zwei Verläufe übereinander, und einer
davon ist der generische schwarze Schleier, den jede Vorlage hat:

- `src/landingPageGenerator.js:311` – `.hero-overlay`, 3 Stopps aus `--tint`
- `src/landingPageGenerator.js:313` – ab 900px ein zweiter, vierstufig, 95°
- `src/landingPageGenerator.js:266-267` – `.topbar::before`,
  `rgba(0,0,0,.55) → transparent`, also ein zweiter Schleier über dem ersten
- `src/landingPageGenerator.js:388-389` – `.foto-text`, wieder
  `transparent → rgba(0,0,0,.82)`
- `src/heroSignature.js:107-109` – `.sig-tafel .schild`, noch einmal dasselbe
- `src/styles/editorial.css.js:50` – Editorial-Hero, eigener Verlauf

Vierstufige Verläufe sind Lesbarkeitsarbeit, keine Gestaltung. Für die
Tokendateien heißt das: der Tint-Verlauf bleibt, aber die schwarzen Schleier
(266-267, 388-389) sind Muster, die überall gleich aussehen.

## 3. Stehen Inhalte in abgerundeten, dropshadow-Karten, die eigentlich keine Abgrenzung brauchen?

**Ja, und zwar in derselben Rezeptur viermal auf einer Seite.**
`Fläche --surface + 1px --line + var(--radius)`:

- `src/landingPageGenerator.js:334` – `.hl-card` (Highlights)
- `src/landingPageGenerator.js:364` – `.kat` (jede Kategorie der Speisekarte)
- `src/landingPageGenerator.js:406-407` – `.stimme` (Gästestimmen)
- `src/landingPageGenerator.js:419` – `.panel` (Reservierungsformular)
- `src/landingPageGenerator.js:386` – `.foto-slot`, dieselbe Rundung

Am wenigsten gerechtfertigt sind `.kat` und `.stimme`: Eine Speisekarte
braucht keine Kästen, sie braucht Zeilen (der Editorial-Archetyp macht das in
`src/styles/editorial.css.js:111-121` bereits richtig vor). Und bei echten
Leads stehen in den Gästestimmen drei *leere* Karten nebeneinander
(`src/landingPageGenerator.js:412`, `.stimme.ist-platzhalter`, `min-height: 172px`)
– ein Kasten, der nichts abgrenzt, weil nichts darin steht.

Dropshadows unter Inhalt gibt es nicht; die vorhandenen Schatten liegen auf
Hero-Elementen über einem Foto (`src/heroSignature.js:34,103,154,205`) und am
Warenkorb-Knopf (`src/landingPageGenerator.js:445`). Das ist Tiefe über Bild,
kein Kartenschatten – bleibt.

## 4. Ist die Sektion immer zentriert/dreispaltig-symmetrisch, ohne dass der Inhalt das rechtfertigt?

**Ja – das ist der deutlichste Befund.** Vier der sechs Sektionsköpfe sind
mittig gesetzt, und das Dreier-Raster kommt auf einer Seite dreimal vor:

- `src/sections/highlights.js:82` – `section-head mitte`
- `src/sections/menu.js:51` – `section-head mitte`
- `src/sections/contact.js:53` – `section-head mitte` (Ambiente)
- `src/sections/testimonials.js:53` – `section-head mitte`
- `src/landingPageGenerator.js:333` – `.hl-grid.spalten-3`, `repeat(3, 1fr)`
- `src/landingPageGenerator.js:355` – `.steps`, `repeat(3, 1fr)`
- `src/landingPageGenerator.js:385` – `.foto-grid`, `repeat(3, 1fr)`
- `src/landingPageGenerator.js:402` – `.stimmen-grid`, `repeat(3, 1fr)`
- `src/landingPageGenerator.js:327` – `.usp-list`, `justify-content: center`
- `src/landingPageGenerator.js:397` – `.stimmen-note`, mittig
- `src/landingPageGenerator.js:415-416` – `.stimmen-erklaerung`, mittig

Nichts davon folgt aus dem Inhalt: Die sechs Highlights sind nicht gleich
wichtig (eines ist der Bestseller, vgl. `platzhalterBilder()`
`src/landingPageGenerator.js:203`), die drei Bildplätze sind es auch nicht
(Haus, Team, Bestseller, `src/sections/contact.js:4-8`), und die Kontaktseite
hat zwei sehr ungleiche Hälften (Adresse vs. Öffnungszeiten,
`src/sections/contact.js:82-88`), die trotzdem als `1fr 1fr` stehen
(`src/landingPageGenerator.js:499`).

Ausgenommen: der Editorial-Archetyp, der die Sektionsköpfe bereits nach links
zieht (`src/styles/editorial.css.js:124`) und das Magazin-Raster fährt
(`:88-97`). Er ist der Beleg, dass der Unterbau Asymmetrie kann – sie wird nur
in den anderen drei nicht genutzt.

## 5. Läuft überall dieselbe Easing-Kurve für jede Animation?

**Ja.** Es gibt faktisch zwei Kurven, und sie sind über alle Sektionen und alle
vier Archetypen dieselben:

- `cubic-bezier(.22,.61,.36,1)` in `src/motion.js:29,30,37,72,89,162,163,172,181`
  – also für Sektionsauftritt, Karten, Eyebrow-Linie, Akkordeon, Zeilenauftritt,
  Bild-Zoom und Unterstrich gleichermaßen
- das Browser-Default `ease` in `src/motion.js:37,83,91,106,107` und in
  `src/landingPageGenerator.js:265,266,271,290,335,338,350,380,459,462,484`

Dazu einmal `ease-in-out` für die Hero-Fahrt (`src/motion.js:44`) und `linear`
für die beiden Scroll-Timeline-Animationen (`:57,61,98`).

Die Folge ist nicht "es ruckelt", sondern: Jede Bewegung hat dasselbe Gewicht.
Ein Sektionskopf tritt so auf wie eine Karte, ein Akkordeon klappt so auf wie
ein Hover-Unterstrich. Nichts ist wichtiger als etwas anderes – genau das, was
Schritt 3 dieses Auftrags aufheben soll.

Dazu passend die Verteilung der Bewegung: `src/motion.js:286-297` setzt
**neun** Gruppen gleichzeitig in Bewegung (`.section-head`, `.hl-card`,
`.foto-slot`, `.stimme`, `.step`, `.reserve-grid > *`, `.contact-grid > *`,
`.kat` und die beiden Signaturen). Praktisch bewegt sich damit alles, was auf
der Seite steht.

---

## Was daraus folgt

1. Ein starker Moment pro Archetyp statt neun bewegter Gruppen → Schritt 3.
2. Je eine begründete Asymmetrie in Highlights, Karte, Stimmen, Kontakt →
   Schritt 4.
3. Die Kartenrezeptur dort auflösen, wo sie nichts abgrenzt (`.kat`,
   `.stimme.ist-platzhalter`).
4. Eigene Zeichnung statt Emoji: `src/sections/contact.js:99-108` setzt
   📍 📞 🥡 als Kontakt-Symbole, `src/sections/hero.js:205` ein ✓ in der
   USP-Leiste. Das sind Systemschriften-Symbole, die auf jedem Gerät anders
   aussehen → Schritt 5.
