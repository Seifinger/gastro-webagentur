# Design System – gastro-webagentur (Anti-Slop, mit Refero-Referenzen)

## 1. Ziele

- Landingpages und Dashboards sollen wie echte, professionell gestaltete Restaurant-Websites wirken.
- Jede Küche/Stimmung hat eine klare visuelle Identität, keine generische "AI Landingpage".
- Das bestehende Archetypen-/Stimmungs-System aus README.md und designPresets.js bleibt der Kern.
- Design-Tokens werden nicht frei erfunden, sondern gegen echte Referenzen validiert (reale Restaurant-Websites + Refero Styles).

## 2. Bestehende Komponenten (Status-Quo)

Aus README.md:
- 12 Küchen mit drei Stimmungen (traditionell, abendlich, hell & modern).
- Hero mit bewegten Elementen je Küche (Pizza-Drehung, Döner-Spieß, Sushi-Band, Dampf über der Tasse).
- Seitenstruktur: Hero, USP-Leiste, Highlights, ganze Speisekarte, Bildplätze, Reservierung, Kontakt & Anfahrt, mobile Action-Leiste.
- Motion-Regeln: nichts springt, nichts versteckt Inhalt, abschaltbar via prefers-reduced-motion.
- Fonts je Stimmung: Playfair Display, Merriweather, Cormorant Garamond, DM Serif Display, Montserrat, Oswald + Inter als Textschrift, lokal via fontLibrary.js.

Dieses Designsystem wird verfeinert und an externe Best Practices angeglichen.

## 3. Referenzquellen

### 3.1 Refero Styles (https://styles.refero.design/)

- Kuratierte Bibliothek mit über 2.000 realen Produkt-Websites, extrahiert als DESIGN.md-Dateien (Farben, Typografie, Spacing, Komponenten).
- Nutzung:
  - Pro Küche/Stimmung nach passenden Stilrichtungen suchen (z. B. "warm mediterranean minimal", "dark elegant izakaya", "cozy rustic tavern", "clean editorial food brand").
  - Gefundene Tokens als Startpunkt nehmen, NICHT 1:1 kopieren.
  - Ergebnis unten in Abschnitt 5 pro Küche dokumentieren, inkl. Link zur genutzten Referenz.

### 3.2 Reale Restaurant-Websites

- Ergänzend zu Refero: echte deutsche/internationale Restaurant-Websites mit starkem Reservierungs-/Bestellflow analysieren (Hero, Menü, Formulare, Social Proof, Mobile-Verhalten).
- Diese Quelle liefert die "Gastro-spezifische" Domänenkenntnis, die Refero (allgemeine Produktdesigns) nicht abdeckt.

## 4. Globales Designsystem

### Typografie

- Rollen klar trennen:
  - Display (Hero/H1)
  - Heading (Sektionstitel)
  - Body (Menütext, Paragraphen)
  - UI (Buttons, Labels)
- Typo-Skala: `--font-size-xl` (Hero), `--font-size-lg` (Sektionstitel), `--font-size-md` (Menü), `--font-size-sm` (Labels).

### Farb- und Atmosphären-System

- Pro Stimmung/Küche: Primär-/Hintergrundfarbe (Base, Alt), Akzentfarben (Buttons, Badges, Links), Textfarben (Haupttext, Muted, UI).
- Keine generischen AI-Standardpaletten (z. B. beliebige Lila/Rosa-Gradients ohne Bezug).
- Fokus auf kulinarische Atmosphären: Erdtöne, Holz, metallische Highlights, Nachtlicht – validiert gegen Refero-Referenzen und echte Restaurant-Websites.

### Spacing, Radius, Shadow, Transition – globales Token-Set (Stage 2)

Verbindlich für alle Landing-Pages **und** beide Dashboards (Stage 3/4/5).
Wird als `:root`-Ergänzung in `PAGE_STYLES` (`landingPageGenerator.js`) und in
den Dashboard-Stylesheets gesetzt – siehe Stage 3a/4a. Bis dahin sind das
Zielwerte, noch kein Code.

```css
--space-xs: 6px;
--space-sm: 12px;
--space-md: 24px;
--space-lg: 48px;
--space-xl: 84px;

--radius-sm: 6px;
--radius-md: 12px;
--radius-lg: 20px;
--radius-pill: 999px;

--shadow-soft: 0 2px 12px rgba(0,0,0,.07);
--shadow-card: 0 8px 28px rgba(0,0,0,.10);
--shadow-strong: 0 18px 48px rgba(0,0,0,.18);

--transition-fast: .12s ease;
--transition-base: .22s ease;
--transition-slow: .38s cubic-bezier(.22,1,.36,1);
```

**Wichtiger Unterschied zu den bestehenden Handschrift-Kurven:** Die drei
Archetypen (traditionell/abend/hell) haben bereits eigene, bewusst
unterschiedliche Bewegungs-Kurven (siehe Abschnitt 5 unten und
`styles/handschrift.css.js`) – das bleibt so und wird **nicht** durch
`--transition-slow` ersetzt. Die neuen `--transition-*`-Tokens gelten für
Dinge, die bisher gar keine System-Kurve hatten: Hover-States auf Buttons/
Cards außerhalb der Handschrift-Momente, Formular-Fokus, Dashboard-Interaktionen.

Zusätzlich, für Stage 3b (Typografie-Skala, ergänzt die bestehenden
Display-Fonts aus Abschnitt 5, ersetzt sie nicht):

```css
--text-xs: .75rem;
--text-sm: .875rem;
--text-base: 1.0625rem;   /* aktuell 17px, Body-Standard */
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: clamp(1.5rem, 3vw, 2rem);
--text-display: clamp(2.125rem, 7vw, 4.375rem);
```

## 5. Theme-Spezifika pro Küche/Stimmung

### 5.0 Stand der Recherche (Stage 2)

**Refero Styles (https://styles.refero.design/) liefert keine Gastro-Referenzen.**
Die Bibliothek besteht aus 2.000+ Tech-/SaaS-Produktdesigns (Kategorien wie
"Chalk & charcoal", "Trustworthy fintech", "Warm indie SaaS") und hat keine
Restaurant-/Hospitality-Kategorie. Kein MCP-Server für Refero ist in dieser
Umgebung verbunden; ein manueller Abruf der Startseite (WebFetch) bestätigt,
dass eine Stichwortsuche nach "warm mediterranean restaurant minimal" oder
"dark elegant izakaya" ins Leere läuft. Refero wird deshalb **nicht** als
Quelle genutzt – Section 3.1 bleibt als Möglichkeit für spätere, eher
generische Token-Validierung (z. B. Spacing-Rhythmus) stehen, ist aber für
die Küchen-Stimmungen unten nicht die Grundlage.

**Reale Restaurant-Referenzen** wurden stattdessen per Websuche pro Küche
recherchiert. Umfang dieser ersten Fassung: **eine recherchierte Richtung je
Küche** (mit Quellenbelegen), nicht 36 einzeln recherchierte Kombinationen –
das wäre für die drei Stimmungen einer Küche kaum durch unterscheidbare reale
Referenzen zu belegen. Die drei Stimmungen (traditionell/abend/hell) leiten
sich pro Küche aus der recherchierten Richtung ab, indem sie deren Helligkeit/
Formalität variieren – nicht aus 3 separat gegoogelten Websites. Wo das für
Stage 3 zu grob ist, können wir gezielt pro Stimmung nachschärfen.

Format je Küche:
- **Reale Referenz(en):** was recherchiert wurde, mit Quelle
- **Ableitung für unsere 3 Stimmungen:** wie sich traditionell/abend/hell
  daraus unterscheiden (Bezug zu den bereits in `stimmungen.js` vergebenen
  Namen, siehe README-Tabelle)

---

### Bayerisch

**Reale Referenz:** Wirtshaus Maximilian (München) – helles, schlichtes Interieur statt dunklem Holz
**Hero-Signatur (alle 3 Stimmungen gemeinsam):** Tagesempfehlung wechselt durch (sig-tafel), mit Handschrift zusätzlich der gezeichnete, überlaufende Maßkrug

| Stimmung | Archetyp | Display-Font | Hintergrund | Fläche | Text | Akzent | Gold |
|---|---|---|---|---|---|---|---|
| Wirtshaus | traditionell | Merriweather | `#fbfaf7` | `#ffffff` | `#23241f` | `#3f5d3a` | `#b8862f` |
| Kellerstube | abend | Merriweather | `#141013` | `#1d1719` | `#f6f1ec` | `#a8583a` | `#c99a4e` |
| Biergarten | hell | Cormorant Garamond | `#fbfcfd` | `#ffffff` | `#1c2733` | `#568238` | `#c8a63c` |

### Italienisch

**Reale Referenz:** BoccaLupo (Atlanta) – Creme-/Erdtöne, editoriale Serifen-Eleganz
**Hero-Signatur (alle 3 Stimmungen gemeinsam):** zwei Pizzahälften drehen gegenläufig

| Stimmung | Archetyp | Display-Font | Hintergrund | Fläche | Text | Akzent | Gold |
|---|---|---|---|---|---|---|---|
| Trattoria | traditionell | Playfair Display | `#fdfaf5` | `#ffffff` | `#2a211a` | `#b4451f` | `#c1872c` |
| Osteria Notte | abend | DM Serif Display | `#141013` | `#1d1719` | `#f6f1ec` | `#ab3946` | `#c39b3f` |
| Costiera | hell | Cormorant Garamond | `#fbfcfd` | `#ffffff` | `#1c2733` | `#2e7da6` | `#d9a92c` |

### Griechisch

**Reale Referenz:** Akra (Athen) – minimalistischer Raum, Blau-Weiß-Küstenpalette
**Hero-Signatur (alle 3 Stimmungen gemeinsam):** gezeichneter Olivenzweig schaukelt sanft

| Stimmung | Archetyp | Display-Font | Hintergrund | Fläche | Text | Akzent | Gold |
|---|---|---|---|---|---|---|---|
| Taverne am Hafen | traditionell | Playfair Display | `#fbfcfd` | `#ffffff` | `#1c2733` | `#1f6f9c` | `#cfa53a` |
| Athener Moderne | abend | Montserrat ⚠ | `#0f1012` | `#17181c` | `#f4f4f6` | `#c9a227` | `#c9a227` |
| Olivenhain | hell | Cormorant Garamond | `#fbfaf7` | `#ffffff` | `#23241f` | `#6b7d3d` | `#b8923c` |

### Türkisch

**Reale Referenz:** Mikla (Istanbul) – Mid-Century-Eleganz vs. Street-Food-Energie
**Hero-Signatur (alle 3 Stimmungen gemeinsam):** Drehspieß dreht sich endlos

| Stimmung | Archetyp | Display-Font | Hintergrund | Fläche | Text | Akzent | Gold |
|---|---|---|---|---|---|---|---|
| Basar | traditionell | Oswald | `#fdfbf7` | `#ffffff` | `#2d2519` | `#c0392b` | `#d6a233` |
| Bosporus bei Nacht | abend | DM Serif Display | `#0d1218` | `#151c24` | `#eef3f8` | `#2b8181` | `#c9a227` |
| Anatolische Erde | hell | Merriweather | `#fdfbf7` | `#ffffff` | `#2d2519` | `#a85c2e` | `#c08a33` |

### Syrisch

**Reale Referenz:** Ammoora (Baltimore) – "warm with plaster, pattern and light"
**Hero-Signatur (alle 3 Stimmungen gemeinsam):** Minztee wird eingegossen, das Glas "atmet"

| Stimmung | Archetyp | Display-Font | Hintergrund | Fläche | Text | Akzent | Gold |
|---|---|---|---|---|---|---|---|
| Damaszener Hof | traditionell | Playfair Display | `#fbfcfd` | `#ffffff` | `#1c2733` | `#3c8369` | `#c9a227` |
| Gewürzbasar | abend | Oswald | `#141013` | `#1d1719` | `#f6f1ec` | `#c8791f` | `#d8a33c` |
| Levante Modern | hell | Cormorant Garamond | `#fdfbf7` | `#ffffff` | `#2d2519` | `#8a6a3f` | `#c0994a` |

### Chinesisch

**Reale Referenz:** Tinggi-Design-Richtlinie "Neo-Chinese luxury" statt Rot/Gold-Klischee
**Hero-Signatur (alle 3 Stimmungen gemeinsam):** Drehteller mit drei Schalen im Kreis

| Stimmung | Archetyp | Display-Font | Hintergrund | Fläche | Text | Akzent | Gold |
|---|---|---|---|---|---|---|---|
| Rote Laterne | traditionell | Playfair Display | `#fdfaf5` | `#ffffff` | `#2a211a` | `#b31e1e` | `#c9a227` |
| Shanghai Nacht | abend | Montserrat ⚠ | `#0f1012` | `#17181c` | `#f4f4f6` | `#dd353a` | `#d9a441` |
| Teehaus | hell | Cormorant Garamond | `#fbfaf7` | `#ffffff` | `#23241f` | `#3f7d6a` | `#b8923c` |

### Thailändisch

**Reale Referenz:** keine dominante reale Referenz gefunden – Orchid-Signatur bleibt Anker
**Hero-Signatur (alle 3 Stimmungen gemeinsam):** Orchidee blüht auf, sobald der Hero sichtbar wird

| Stimmung | Archetyp | Display-Font | Hintergrund | Fläche | Text | Akzent | Gold |
|---|---|---|---|---|---|---|---|
| Orchidee | traditionell | Playfair Display | `#fbfcfd` | `#ffffff` | `#1c2733` | `#b13a7a` | `#c9a227` |
| Streetfood Nacht | abend | Oswald | `#0f1012` | `#17181c` | `#f4f4f6` | `#f36d1f` | `#e3a13a` |
| Andamanen | hell | Cormorant Garamond | `#fbfcfd` | `#ffffff` | `#1c2733` | `#1a837f` | `#d9a92c` |

### Vietnamesisch

**Reale Referenz:** Behance "Pho Saigon"/"MÚC" – reduziert statt folkloristisch
**Hero-Signatur (alle 3 Stimmungen gemeinsam):** dampfende Phở-Schale, atmet leicht

| Stimmung | Archetyp | Display-Font | Hintergrund | Fläche | Text | Akzent | Gold |
|---|---|---|---|---|---|---|---|
| Indochine | traditionell | Playfair Display | `#fdfbf7` | `#ffffff` | `#2d2519` | `#8a5a2b` | `#c0994a` |
| Hanoi Nacht | abend | DM Serif Display | `#141013` | `#1d1719` | `#f6f1ec` | `#d08a1f` | `#e0ab45` |
| Straßenküche | hell | Cormorant Garamond | `#fbfaf7` | `#ffffff` | `#23241f` | `#48833a` | `#c8a63c` |

### Japanisch

**Reale Referenz:** Fat Cow – dunkel, warme Gold-Akzente / Fiola – restrained elegance
**Hero-Signatur (alle 3 Stimmungen gemeinsam):** Sushi-Band läuft durchs Bild

| Stimmung | Archetyp | Display-Font | Hintergrund | Fläche | Text | Akzent | Gold |
|---|---|---|---|---|---|---|---|
| Izakaya | traditionell | Montserrat ⚠ | `#141013` | `#1d1719` | `#f6f1ec` | `#c8352f` | `#d9a441` |
| Omakase | abend | DM Serif Display | `#0f1012` | `#17181c` | `#f4f4f6` | `#b99a4e` | `#b99a4e` |
| Washitsu | hell | Cormorant Garamond | `#fbfaf7` | `#ffffff` | `#23241f` | `#6b6256` | `#a8905c` |

### Indisch

**Reale Referenz:** Tamasha Modern Indian – Samt, Gold-Bögen, Gewürzmarkt-Farben
**Hero-Signatur (alle 3 Stimmungen gemeinsam):** Gewürzwölkchen platzt auf beim Sichtbarwerden

| Stimmung | Archetyp | Display-Font | Hintergrund | Fläche | Text | Akzent | Gold |
|---|---|---|---|---|---|---|---|
| Gewürzmarkt | traditionell | Oswald | `#fdfbf7` | `#ffffff` | `#2d2519` | `#c87f1e` | `#d8a33c` |
| Maharadscha | abend | DM Serif Display | `#0d1218` | `#151c24` | `#eef3f8` | `#974381` | `#c9a227` |
| Südindisch hell | hell | Cormorant Garamond | `#fbfaf7` | `#ffffff` | `#23241f` | `#46833c` | `#c8a63c` |

### Asiatisch (gemischt)

**Reale Referenz:** keine eigene reale Referenz (Sammelkategorie) – Laternen-Signatur als Anker
**Hero-Signatur (alle 3 Stimmungen gemeinsam):** zwei Laternen pulsieren/schaukeln am Rand

| Stimmung | Archetyp | Display-Font | Hintergrund | Fläche | Text | Akzent | Gold |
|---|---|---|---|---|---|---|---|
| Marktstand | traditionell | Oswald | `#fdfbf7` | `#ffffff` | `#2d2519` | `#c1571d` | `#d8a33c` |
| Neon | abend | Montserrat ⚠ | `#0f1012` | `#17181c` | `#f4f4f6` | `#dd353a` | `#d9a441` |
| Fusion Minimal | hell | Cormorant Garamond | `#fbfcfd` | `#ffffff` | `#1c2733` | `#2f4858` | `#a8905c` |

### Café

**Reale Referenz:** The Barn (Berlin) – europäischer Minimalismus / Intelligentsia – kräftige Typo
**Hero-Signatur (alle 3 Stimmungen gemeinsam):** Dampf steigt über der Tasse auf

| Stimmung | Archetyp | Display-Font | Hintergrund | Fläche | Text | Akzent | Gold |
|---|---|---|---|---|---|---|---|
| Wiener Kaffeehaus | traditionell | Playfair Display | `#fdfaf5` | `#ffffff` | `#2a211a` | `#2f5d4a` | `#b8923c` |
| Konditorei | abend | DM Serif Display | `#fdfaf5` | `#ffffff` | `#2a211a` | `#b8557a` | `#c9a227` |
| Third Wave | hell | Cormorant Garamond | `#fbfcfd` | `#ffffff` | `#1c2733` | `#5c6b5a` | `#a8905c` |

*(Konditorei ist bewusst hell trotz Archetyp "abend" – siehe README: "eine Konditorei abendlich und trotzdem hell". Der Archetyp trägt das Layout/die Handschrift, nicht Helligkeit oder Dunkelheit.)*

### Layout- und Motion-Charakter je Archetyp (gilt für alle 12 Küchen gleich)

**traditionell:** Standard-Reihenfolge (Highlights→Karte→Ambiente→Stimmen→Reservierung→Kontakt). Handschrift: Highlights als Treppe (1 große + gestufte Karten), Menütafel mit sticky Kategorie-Spalte, Stimmenblatt (Note groß + Zitate daneben). Kurve: `cubic-bezier(.2,.72,.3,1)`.

**abend:** Ambiente zuerst, Reservierung als einzige Sektion mit Extra-Luft – der eine starke Moment der Seite. Handschrift: Kopf in schmaler linker Randspalte bei Karte/Stimmen, Highlights als Leseliste (1 Foto + Textzeilen). Kurve: `cubic-bezier(.5,0,.1,1)`.

**hell:** Karte zuerst, keine sticky Kopfzeile. Handschrift: dichte Vierer-Reihe der Highlights (jede 3. Karte breiter) als der eine schnelle Moment, Karte/Stimmen ohne Kästen, Kontakt adressen-zuerst. Kurve: `cubic-bezier(.16,1,.3,1)`.

---

### 5.1 Wiederkehrendes Muster aus der Recherche

1. **Die "hell"-Stimmung war die anfälligste für generische Wirkung – inzwischen behoben.**
   In 5 von 12 Fällen lief dort Montserrat als Display-Schrift neben Inter (siehe
   `docs-intern/design-audit.md`, Punkt 1). Das ist seit dem Commit
   "stimmungen.js: echte Serifen-Paarung statt Montserrat in 5 hell-Stimmungen"
   gefixt – alle "hell"-Zeilen in der Tabelle oben zeigen jetzt Cormorant
   Garamond oder eine andere Serife, keine einzige noch Montserrat.
2. **Vier Montserrat-Stellen bleiben bewusst unverändert** (markiert mit ⚠
   in der Tabelle): Griechisch/Athener Moderne (abend), Chinesisch/Shanghai
   Nacht (abend), Japanisch/Izakaya (traditionell), Asiatisch/Neon (abend).
   Diese Stimmungen sind explizit "urban/modern/Nacht"-Charaktere, bei denen
   eine uppercase geometrische Grotesk als bewusstes Stilmittel lesbar ist
   (Kontrast zur ruhigeren Tagesstimmung derselben Küche) – anders als bei
   "hell", wo Reduktion über Material statt über eine zweite Grotesk-Schrift
   funktioniert (siehe Stage-1-Audit). Für Stage 3 offen: einzeln prüfen, ob
   diese vier ebenfalls eine Serife (z. B. DM Serif Display, dort schon in
   mehreren "abend"-Stimmungen etabliert) besser trüge, oder ob Montserrat
   dort bewusst bleibt.
3. **"Abend" ist konsistent die dunkelste, reduzierteste Stimmung** (Ausnahme
   Café/Konditorei, bewusst hell, siehe Fußnote oben) – das deckt sich mit
   allen recherchierten Fine-Dining-/Nacht-Referenzen (Fat Cow, Mikla,
   Ammoora-Gewürzbasar, Shanghai Nacht) und bestätigt die bestehende
   Architektur-Entscheidung in `ARCHETYP_PRESET.abend`.

## 6. Komponenten-Guidelines

### Hero-Sektion

- Immer: Konzept-Claim, Ort, Google-Bewertung, hyperlokale Zeile, eine klare Primary-CTA.
- Varianten: dish_photo, ambience_photo, reservation_hero, menu_preview, chef_story.
- Keine generischen Stockbilder ohne Bezug zur Küche.

### USP-Leiste & Highlights

- USP-Leiste: 3–4 klar formulierte Badges, keine Textwüsten.
- Highlights: visuell differenzierte Sektion, jeder Highlight direkt bestellbar.
- Konsistente Card-Styles (Radius, Shadow, Typo).

### Menü

- HTML-Menü mit Akkordeon, kein PDF-only.
- Layout-Typ: list für klassische Häuser, grid/card für moderne/bildlastige Küchen.
- Einheitliche Badge-Styles, Farbcode je Typ (vegan, vegetarisch, spicy).

### Bildplätze

- Drei Slots: Exterior, Team, Signature Dish.
- Bildstil pro Stimmung festhalten (z. B. weiches Tageslicht vs. kontrastreiche Nacht).

### Forms (Reservierung, Bestellung)

- Klarer Flow, Fehlermeldungen, Bestätigungszustände.
- Formulare sollen wie echte Produktformulare aussehen, nicht wie Standard-Browserforms.

### Testimonials / Social Proof

- Layout: carousel/grid/featured_quote, abhängig von Küche/Stimmung.
- Kein Speichern echter Google-Reviews (siehe README-Hinweis zu Datenschutz/Google-Richtlinien).

## 7. Motion & Interaktionen

- Scroll-Reveals: gestaffeltes Fade/Slide, testbar mit reduced-motion.
- Hover: klare States für Buttons, Cards, Navigation.
- Hero-Loops: je Küche/Stimmung definierte Animationsparameter (Dauer, Easing, Amplitude).

## 8. Nächste Schritte für Claude

1. ~~Fülle Abschnitt 5 (Theme-Spezifika) für alle Küchen/Stimmungen aus~~ – erledigt (Stage 2): konkrete, aus `stimmungen.js` extrahierte Token-Tabellen für alle 12 Küchen × 3 Stimmungen stehen oben, mit realer Referenz und Hero-Signatur je Küche.
2. ~~Stage 3: das globale Token-Set aus Abschnitt 4 in `PAGE_STYLES` einbauen, Komponenten schärfen~~ – erledigt: `--space-*`/`--radius-*`/`--shadow-*`/`--transition-*`/`--text-*` stehen in jeder Seite im `:root`; Buttons, Karten, Formulare, Speisekarte, Gästestimmen und Fußzeile nutzen sie. Alle Sterne, Haken, Kontakt- und Bestell-Icons sind jetzt gezeichnetes SVG statt Unicode/Emoji (`signaturIcons.js`: `stern()`, `plus()`, `chevron()`, `checkCircle()`, `warnung()`) – nicht mehr nur bei Archetypen mit eigener Handschrift, sondern auf jeder Seite. Menü-Akkordeon hat einen rotierenden Pfeil statt „+"/„–", die Bestätigung einen einfahrenden Kreis mit Häkchen/Warnzeichen statt gesetztem Zeichen. `ENGINE_VERSION` steht deshalb auf 3 (`npm run engine-status` zeigt ältere veröffentlichte Seiten korrekt als aufzufrischen an).
   - Bewusst zurückgestellt (kein Teil dieses Schritts): das rAF-Hero-Parallax und der Karten-Stagger aus 3j (Risiko/Nutzen bei der bestehenden, sorgfältig getunten Motion-Kurven-Architektur ungünstig), separate Vegan-/Allergen-Badges (die Küchenkatalog-Daten kennen bisher nur `vegetarisch`, das wäre eine eigene Datenmodell-Erweiterung), sowie das feingliedrige zweigeteilte Hero-Overlay aus 3c (stattdessen eine zusätzliche `.hero-vignette`-Ebene für den unteren Rand, siehe `landingPageGenerator.js`).
3. Stage 4a: `public/wirt.html` auf ein dunkles Token-Set umgestellt – erledigt. Die vorhandenen Variablennamen (`--bg`, `--card`, `--line`, `--text`, `--muted`, `--accent`, `--warn`, `--danger`) behalten ihre Bedeutung, nur ihre Werte sind jetzt dunkel (`--bg:#0f1117` usw.), ergänzt um `--radius-sm/lg/pill`, `--shadow-soft/card`, `--transition-fast/base`. Kopfzeile bleibt beim Scrollen stehen, die Reiter sind jetzt ein flacher Unterstrich mit Akzentfarbe statt Aktenordner-Optik, Status-Chips (`.marke.*`) sind getönte Flächen statt Pastell-auf-Weiß, Formularfokus läuft über denselben `color-mix()`-Glow wie die Landingpages.
   - Bewusst zurückgestellt: die visuelle Neuordnung der drei Tabs selbst (4c Tischplan als Karten-Raster mit Statusfarbe, 4d Reservierungen als Zeitleiste mit Status-Badges, 4e Bestellungen als Drei-Spalten-Kanban) – das sind eigene, strukturelle Eingriffe in die client-seitigen Render-Funktionen (`renderTischplan`, `renderReservierungen`, `renderBestellungen` in `public/wirt.html`), nicht nur CSS, und verdienen einen eigenen, gesondert getesteten Schritt. Ebenso zurückgestellt: der Akzentton aus der Küchen-Stimmung des jeweiligen Betriebs statt eines festen Tons – `wirt.html` wird bisher als statische Datei ausgeliefert (`wirtServer.js`), eine Betriebs-abhängige Einfärbung bräuchte serverseitiges Templating.
4. Stage 5: dasselbe Token-Set (hell, wie im bestehenden Nutzer-Dashboard) auf `public/dashboard.html` und `public/bearbeiten.html` übertragen – erledigt. Die vier KPI-Kacheln sind jetzt groß (2.25rem/800) und je Kennzahl eingefärbt (Gesamt = Akzentblau, Sehr-hoch = Rot, ohne Website = Gelb, Entwürfe = Grün), mit `--shadow-card`/`--radius-lg`. Score ist ein farbcodierter 0–100-Balken statt nackter Zahl, Resonanz hat einen grünen/grauen Punkt vor dem Text, sortierbare Spaltenköpfe zeigen ein Dreieck für Richtung und aktive Spalte. Das Pitch-Fenster ist jetzt eine 640px-Leiste, die von rechts einfährt (statt zentriertem Modal) und oben eine eingebettete `<iframe>`-Vorschau des Entwurfs zeigt (mit `?vorschau=1`, damit der eigene Blick nicht als Öffnung durch den Wirt in die Resonanz-Zahlen einfließt); `bearbeiten.html` hat dieselben Radien/Schatten/Übergänge für Bildkarten, Prompt-Box und Buttons bekommen.
   - Bewusst zurückgestellt: ein eigenes dunkles Schema wie beim Wirt-Dashboard – für dieses interne Agentur-Werkzeug gab der Auftrag keine Dunkel-Vorgabe vor, und ein drittes eigenständiges Farbsystem neben Landing-Pages (hell, küchenabhängig) und Wirt-Dashboard (dunkel) hätte der "System statt Flickwerk"-Leitplanke widersprochen; stattdessen nutzt es das bereits vorhandene helle Schema, nur mit demselben Radius-/Schatten-/Übergangs-Token-Set.
5. Stage 6: die drei benannten Piloten (Italienisch/Trattoria, Japanisch/Izakaya, Bayerisch/Wirtshaus) gebaut und per Headless-Browser (Desktop + Mobil, Hero/Highlights/Speisekarte/Kontakt/Fußzeile) gegengeprüft – erledigt, keine Code-Änderung nötig.
   - **Hinweis zur Vorgabe:** Laut den Stimmung-Daten (`stimmungenFuer()`) sind alle drei benannten Piloten tatsächlich Archetyp `traditionell` (Izakaya nicht `abend`, wie der ursprüngliche Auftrag annahm). Um die anderen beiden Archetypen nicht ungeprüft zu lassen, wurden zusätzlich Omakase (`abend`) und Washitsu (`hell`) – beide Japanisch, derselben Küche wie Izakaya – mitgebaut und geprüft.
   - **Ergebnis:** Keine Regressionen. Der kräftige linke Kicker-Strich, die SVG-Sterne, der Glas-Effekt auf dem zweiten Hero-Button, die schattenbasierten Highlight-Karten, der rotierende Speisekarten-Pfeil mit Akzentstreifen, die gezeichneten Kontakt-Icons und die dreispaltige Fußzeile tragen über sehr unterschiedliche Paletten hinweg (dunkles Izakaya-Rot/Montserrat-Großschrift, warmes Trattoria-Terrakotta, helles Bayerisch-Grün, fast-schwarzes Omakase, cremefarbenes Washitsu) und über alle drei Archetypen. Die gezeichneten Hero-Signaturen (Pizzahälften, Bierkrug) sind unabhängig von Stockfotos und blieben auch ohne Netzwerkzugriff im Prüf-Sandbox intakt; das Sushi-Band (echte Fotos) ließ sich mangels Netzwerk nicht abschließend beurteilen, seine Layout-Logik (Positionierung unabhängig vom Content-Fluss) ist aber dieselbe wie bei den anderen Signaturen und unauffällig.
6. Stage 7: Rollout auf alle 12×3, README-Abschnitt "Designsystem" – noch offen.
7. Jede Preset-/Stimmungs-Änderung weiterhin hier dokumentieren, bevor sie in Code übersetzt wird.
