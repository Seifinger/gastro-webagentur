# Art-Direction-Audit der v2-Seiten (Phase A)

Stand 22.09.2026, geprüft auf dem Stand von `claude/gastro-v2-pipeline-01hf58` (Stage 8,
501/501 Tests grün). Grundlage sind **echte, vollständige Screenshots** der ausgelieferten
Seiten aus `v2/output/sites/`, gerendert mit derselben Screenshot-Routine wie der Judge
(`v2/build/screenshot.js`, Chromium, reduzierte Bewegung, Lazy-Bilder vorgeladen):

| Seite | Desktop 1440 px | Mobil 390 px |
|---|---|---|
| Italienisch / Trattoria („Trattoria Da Nonna Lucia“) | [`art-direction/vorher/italienisch--trattoria--desktop.jpg`](art-direction/vorher/italienisch--trattoria--desktop.jpg) | [`…--mobil.jpg`](art-direction/vorher/italienisch--trattoria--mobil.jpg) |
| Japanisch / Izakaya („Izakaya Kurenai“) | [`japanisch--izakaya--desktop.jpg`](art-direction/vorher/japanisch--izakaya--desktop.jpg) | [`…--mobil.jpg`](art-direction/vorher/japanisch--izakaya--mobil.jpg) |
| Bayerisch / Wirtshaus („Gasthaus Zur Alten Linde“) | [`bayerisch--wirtshaus--desktop.jpg`](art-direction/vorher/bayerisch--wirtshaus--desktop.jpg) | [`…--mobil.jpg`](art-direction/vorher/bayerisch--wirtshaus--mobil.jpg) |
| Café / Third Wave („Rösterei Kornfeld“) | [`cafe--third-wave--desktop.jpg`](art-direction/vorher/cafe--third-wave--desktop.jpg) | [`…--mobil.jpg`](art-direction/vorher/cafe--third-wave--mobil.jpg) |
| Café / Wiener Kaffeehaus (Gegenprobe gleicher Küche) | [`cafe--wiener-kaffeehaus--desktop.jpg`](art-direction/vorher/cafe--wiener-kaffeehaus--desktop.jpg) | [`…--mobil.jpg`](art-direction/vorher/cafe--wiener-kaffeehaus--mobil.jpg) |

Zahlen stammen aus einer Auswertung aller 36 `index.html` + `bericht.json` + Designsystem-JSONs
(Skript im Abschnitt „Messmethode“ am Ende).

**Kurzfassung.** v2 hat die *Oberfläche* sauber gemacht (Schriften, Farbrollen, Kontraste,
8-px-Raster, keine Text-auf-Foto-Verläufe). Die *Dramaturgie* ist aber ein Template:
Drei Archetypen erzeugen drei Seitenbaupläne, und innerhalb eines Archetyps unterscheidet
sich eine Trattoria von einer Izakaya nur durch Tokens, den Katalogtext und das
Stockfoto. Der Judge vergibt 10,0/10, weil er genau diese Oberfläche misst – er kann
nicht sehen, dass die Seiten nichts über das jeweilige Haus erzählen.

---

## 1. Welche Seiten sind trotz unterschiedlicher Tokens strukturell gleich?

**Alle 36 v2-Seiten folgen genau drei Bauplänen – einem je Archetyp.** Die Felder
`layout.sektionsReihenfolge`, `highlights`, `karte`, `stimmen`, `betonterMoment`,
`primaerAktion` und der Satz erlaubter Hero-Varianten sind in allen 12 Designsystemen
eines Archetyps **identisch**:

| Archetyp | Sektionsfolge | Highlights / Karte / Stimmen | Hauptaktion | Seiten |
|---|---|---|---|---|
| traditionell | highlights → karte → ambiente → stimmen → reservierung → kontakt | treppe / tafel / blatt | Abholung | 12 (u. a. Trattoria, Izakaya, Wirtshaus, Wiener Kaffeehaus) |
| hell | karte → highlights → ambiente → stimmen → reservierung → kontakt | reihe / liste / zeilen | Abholung | 12 (u. a. Third Wave, Costiera, Biergarten) |
| abend | ambiente → karte → highlights → stimmen → reservierung → kontakt | leseliste / spalten / zitat | Reservierung | 12 |

Belege im Screenshot:

- **Trattoria und Izakaya** (beide „traditionell“) sind Sektion für Sektion deckungsgleich:
  Hero → Leiste mit Google-Note + drei Häkchen → „Was unsere Gäste am liebsten bestellen“
  mit großem Gericht links und zwei kleinen Karten rechts → Nummernleiste „1 Aussuchen /
  2 Abholzeit wählen / 3 Abholen“ → „Unsere ganze Karte“ mit Kategorie-Titel links und
  Preisliste rechts → „Das Haus“ mit Text links und drei Fotos rechts → Gästestimmen mit
  großer „4,3“ → Reservierungsformular rechts → Anfahrt + Öffnungszeiten. Legt man die
  beiden Desktop-Screenshots übereinander, liegen alle Sektionsgrenzen innerhalb von ±10 %.
  Nur Farbe (Papier vs. Tusche-Schwarz) und Display-Schrift (EB Garamond vs. Antonio) unterscheiden sie.
- **Wirtshaus** ist derselbe Plan; der Seed hat nur die Hero-Variante „passepartout“ statt
  „tafel“ gezogen. Dass ein bayerisches Wirtshaus und eine japanische Izakaya
  dieselbe Informationsreihenfolge und Gewichtung haben, hat keinen inhaltlichen Grund.
- Die Hero-Wahl ist eine **Seed-Lotterie** (`waehleHeroVariante`: `(seed >>> 7) % 4`).
  Verteilung über 36 Seiten: spalte-bild 11, tafel 7, streifen 7, typo 5, passepartout 4,
  karte 2. Die Variante sagt nichts über das Haus aus, nur über den Hash der placeId.
- **Gegenprobe Café:** Wiener Kaffeehaus (traditionell) und Third Wave (hell) unterscheiden
  sich strukturell – aber nur, weil sie verschiedenen Archetypen angehören, nicht weil ein
  Kaffeehaus anders erzählt werden müsste als eine Rösterei.

**Tauschtest** (Erfolgskriterium des Auftrags): Tauscht man Name, Speisekarte und Fotos
von Trattoria und Izakaya, bleiben beide Seiten gleich plausibel – das Designsystem hängt
an Küche × Stimmung, nicht am Betrieb. Zwei verschiedene Trattorien bekommen in v2
**dieselbe Seite** bis auf Name, Adresse und Seed-Hero. Der Test ist damit per
Konstruktion nicht bestehbar.

## 2. Wo wirken Bilder beliebig oder falsch zugeschnitten?

- **Ein Teamfoto für alle 36 Seiten.** Das Motiv „Koch von hinten an der Pass“
  (`photo-1428515613728`) steht auf **allen 36** Seiten im Slot „Unser Team“ – bei der
  Izakaya genauso wie beim Wiener Kaffeehaus.
- **Ein Innenraum für mehrere Häuser.** Das Industrie-Restaurant mit Lüftungsrohren und
  roten Lederbänken (`photo-1517248135467`) ist „Unser Haus“ sowohl beim bayerischen
  Wirtshaus als auch bei der Rösterei (Screenshots Wirtshaus Desktop, Abschnitt „Das Haus“;
  Third Wave Desktop, gleicher Abschnitt). Ein weiteres Innenraumfoto steht auf 7 Seiten.
- **Bildunterschrift widerspricht dem Bild.** Unter jedem Haus-Foto steht „Außenansicht –
  so erkennen Gäste Sie von der Straße“; gezeigt wird ausnahmslos ein Innenraum. Unter dem
  Teamfoto steht „Hände bei der Arbeit statt Gruppenfoto“ – das ist die **Foto-Anweisung
  an den Wirt**, die als Bildunterschrift beim Gast landet.
- **Gerichtsfoto zeigt ein anderes Gericht.** Trattoria: „Quattro Stagioni – Schinken,
  Champignons, Artischocken, Oliven“ zeigt eine Pizza mit Hähnchen, Ananas, BBQ-Soße und
  Koriander; „Tartufo – Trüffelcreme, Parmesan, Rucola“ zeigt Spinat und Feta. Wirtshaus:
  Hausempfehlung „Grillrippchen“ mit BBQ-Soße, Wedges und Tomatenscheiben wirkt wie ein
  US-Diner. Dasselbe Pizzafoto ist zugleich „Hausempfehlung“ und „Unser Bestseller“.
- **Hero passt nicht zur Behauptung.** Trattoria-Kicker „Holzofenpizza & frische Pasta“,
  Hero zeigt Spaghetti mit Schinken und einen **Rioja**-Korken. Wirtshaus-Hero: junge
  Leute mit Baseballkappen an einem Holztisch vor einem Bretterzaun – kein Wirtshaus,
  kein Stadtplatz. Rösterei: drei Hero-Bilder (Feigen-Dessert, Pancake-Turm,
  Industrie-Restaurant), **keines zeigt Kaffee**, obwohl das Haus „Rösterei“ heißt.
- **Mobile Zuschnitte.** Mobil schneidet der Hero „passepartout“ (Wirtshaus) die Gäste
  auf Kinnhöhe ab und legt die Texttafel über die untere Bildhälfte; Gesichter und Tisch
  verschwinden. Es gibt keinen eigenen mobilen Ausschnitt oder Fokuspunkt – `object-position`
  ist überall `center`.

## 3. Wo wiederholen sich dieselben Abschnittsfolgen und Überschriften?

Wörtlich identische H2 über alle 36 Seiten:

| H2 | Seiten |
|---|---|
| „Was Gäste über uns schreiben“ | 24 |
| „Tisch reservieren“ | 24 |
| „So finden Sie uns“ | 24 |
| „Unsere ganze Karte“ | 24 |
| „Was unsere Gäste am liebsten bestellen“ | 12 |
| „Das geht hier am häufigsten raus“ / „Die Karte“ | je 12 |
| „Was wir heute empfehlen“ / „Ihr Tisch für heute Abend“ / „Was Gäste sagen“ | je 12 |

Dazu auf jeder Seite: die Nummernleiste „Aussuchen / Abholzeit wählen / Abholen“, die
Reservierungs-Pluspunkte „Rund um die Uhr buchbar …“, „Bestätigung ohne Anruf“, „Kinderstuhl
oder Allergien gleich mit angeben“, die Kontaktzeile „Abholung vorbestellen – Ihr Essen
steht pünktlich bereit“. Die **Google-Note erscheint dreimal** (Hero, Leiste, Gäste-Sektion).

## 4. Wo ist Typografie austauschbar?

- Die Schriftpaare sind je Stimmung verschieden (EB Garamond/Karla, Antonio/Zen Kaku
  Gothic, Vollkorn/Alegreya Sans, Schibsted Grotesk/Karla/Courier Prime) – das ist echt
  gewonnen. Aber jede Schrift erfüllt dieselben **fünf Rollen an denselben Stellen**
  (Rubrik, H1, H2, Gerichtname, Preis). Keine Seite hat eine typografische Idee, die nur
  dort Sinn ergibt – etwa eine Karte, die wie die Tafel des Hauses gesetzt ist.
- Die Izakaya setzt Antonio in Versalien für alles, auch für „UNSERE GANZE KARTE“ und
  „GYOZA (5 STÜCK)“. Das ist Lautstärke, kein Charakter – echte Izakaya-Karten leben von
  kurzen, dicht gehängten Zettelchen, nicht von Plakat-Headlines.
- Rösterei: Die Courier-Prime-Label-Schrift ist die einzige Andeutung von „Handwerk“ und
  wird für Preise („11,50 €“ mit Leerzeichen-Laufweite) eingesetzt, wo sie die Lesbarkeit senkt.
- Karten-Layout „tafel“: Kategorie-Titel links, Liste rechts, **die linke Spalte bleibt auf
  ~60 % der Kartenhöhe leer** (Trattoria Desktop, Pizza/Pasta-Abschnitt).

## 5. Wo sehen Formulare und Warenkorb wie Fremdkörper aus?

- Das Reservierungsformular ist auf allen Seiten derselbe weiße Kasten mit 7 Feldern in
  2 Spalten, rechts neben identischen drei Häkchen. Es nimmt die Farbwelt auf, aber nicht
  die Idee des Hauses – bei der Rösterei (die man kaum reserviert) hat es dasselbe Gewicht
  wie bei der Trattoria.
- Das Datumsfeld zeigt das **US-Format „09/22/2026“** (Browser-Locale, `lang="de"` wirkt
  beim nativen Datepicker nicht) – im deutschen Auftritt ein sichtbarer Bruch.
- **Mobile Aktionsleiste verdeckt den Hero.** Bei 390 × 844 liegt die feste Leiste
  „Bestellen / Reservieren“ im ersten Bildschirm genau über dem zweiten Hero-Knopf
  (Izakaya) bzw. über dem Claim (Wirtshaus) – dieselben zwei Aktionen stehen doppelt
  übereinander.
- Der Warenkorb-Knopf und die Drei-Schritt-Leiste „Aussuchen / Abholzeit / Abholen“
  erscheinen auch dort, wo Abholung gar nicht das Anliegen des Hauses ist.

## 6. Welche Texte behaupten einen USP, ohne ihn zu belegen?

Bei den (fiktiven) Test-Leads ist der Platzhalter-Hinweis ausgeblendet; die Texte stehen
also als Tatsachen da. Bei echten Leads kommt dieselbe Copy mit einem kleinen
„Platzhalter“-Badge – der Satz selbst bleibt eine Behauptung:

- Leiste: „Teig ruht 48 Stunden“, „Heiß aus dem Steinofen“ (Trattoria), „Fleisch vom
  Metzger im Ort“ (Wirtshaus), „Fisch täglich frisch“ (Izakaya), „Kaffee aus regionaler
  Rösterei“ (Rösterei – widerspricht dem eigenen Namen).
- Haus-Text: „Seit Generationen kochen wir …“ (Wirtshaus), „Rezepte aus Kalabrien“
  (Trattoria), „Unser Reis wird jeden Mittag frisch gewürzt und ist nach vier Stunden
  verbraucht“ (Izakaya) – aus dem Küchenkatalog, gilt für jedes Haus dieser Küche.
- „Was unsere Gäste am liebsten bestellen“ / „Das geht hier am häufigsten raus“ – es gibt
  keine Bestelldaten; die Auswahl ist `seed % Kandidaten`.
- „Rund um die Uhr buchbar“, „Bestätigung ohne Anruf“ – gilt nur, wenn der Wirt-Server
  angebunden ist; im Demo-Modus nicht.
- Izakaya-Claim „Ruhig zubereitet, klar im Geschmack“ – eine Izakaya ist eine laute
  Kneipe. Der Satz ist die Tagline der ganzen Küche „japanisch“.
- Gästestimmen mit Vornamen und Zeitangabe („Marco L. · vor 1 Woche“) sind Katalogtexte.
  Bei fiktiven Seiten zulässig, aber auch dort nicht als solche erkennbar.

## 7. Welche Animation unterstützt die Geschichte, welche ist Dekoration?

- `moment-hero` (Titelbild „setzt sich“ mit scale 1.04 → 1): Dekoration. Gleiche Bewegung
  für Pasta, Ramen und Biertisch; erzählt nichts.
- `.auftritt` (Einblenden mit 8 px Weg, gestaffelt): neutral, stört nicht, aber
  unterscheidet sich zwischen den Häusern nur in Dauer/Kurve-Tokens.
- `moment-reservierung` (Formular hebt sich zuletzt): unterstützt die Hauptaktion der
  Abend-Häuser – die einzige Bewegung mit Bezug zum Ziel der Seite.
- `moment-highlights` (Reihe tritt schneller auf): Dekoration.
- Positiv: Alle drei Motion-Regeln (nichts springt, nichts versteckt Inhalt ohne JS,
  abschaltbar) sind eingehalten; das bleibt.

## 8. Weitere Befunde aus den Screenshots

- **Keine mobile Navigation.** `.kopf-nav` ist unter 1024 px `display: none`, einen
  Menü-Knopf gibt es nicht. Auf Tablet und Handy bleibt nur der Name in der Kopfzeile.
  (Technischer Mangel, nicht Geschmack.)
- Der Judge-Loop bestätigt 36/36 mit Mittel 10,0. Er misst Farbdisziplin, Typo-Hierarchie,
  Rhythmus, Bildintegration und verbotene Muster – alles Oberflächeneigenschaften. Kein
  Kriterium fragt, ob Bild und Gericht übereinstimmen, ob ein USP belegt ist oder ob die
  Seite zu **diesem** Haus gehört. Die 10,0 ist deshalb kein Qualitätsbeleg für Art Direction.
- Der Judge fotografiert nur den ersten Bildschirm und die ganze Seite im Ruhezustand –
  keine offene Karte, keinen Formularfehler, keinen Warenkorb, keine Bestätigung.

## 9. Was gut ist und bleiben muss

- Funktionsschicht: v1-Skript byte-gleich, Funktionsvertrag als Gate, E2E bis Telegram.
- Designsystem-Dokumente mit Herkunft je Wert, WCAG-Gate, Schriften lokal, Copy-Gate.
- Kein Text auf Foto mit Verlaufsschleier; Flächenwechsel statt Linien.
- Medien-Vorrang eigen > KI > Stock > SVG mit Kennzeichnung.

## Konsequenzen für die nächsten Phasen

1. Ein **Restaurant-Briefing** mit Status je Feld (bestätigt / übernommen / Vorschlag /
   unbekannt) als eigentliche Eingabe – Küche × Stimmung bleibt nur Startpunkt.
2. Eine **Creative Direction je Restaurant**, aus der Sektionsfolge, Gewichtung, Hero und
   Signature-Details *begründet* abgeleitet werden – statt Archetyp-Bauplan + Seed.
3. Ein **Bildplan** je Aufnahme (Motiv, Rolle, Zuschnitt desktop/mobil, Fokus, Alt-Text,
   Eignung). Ungeeignete Stockfotos werden gemeldet statt verwendet; bei dünner Bildlage
   trägt die Typografie.
4. Copy aus dem Briefing: unbelegte USPs, Geschichten und Stimmen fallen weg oder bleiben
   sichtbar als Entwurf markiert.
5. Screenshot-Review mit kritischen Zuständen und getrennten Messwerten/Urteilen.

## Messmethode

```bash
# Screenshots (Desktop 1440, Mobil 390, ganze Seite)
node v2/build/artDirectionScreenshots.js --vorher
# Struktur-Cluster, Bild- und Überschriften-Wiederholungen
node v2/build/artDirectionAudit.js
```

Beide Skripte liegen im Repo; `artDirectionAudit.js` liest nur `v2/designsysteme/*.json` und
`v2/output/sites/*/{index.html,bericht.json}` und schreibt nichts.
