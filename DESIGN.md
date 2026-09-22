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

### Spacing, Radius, Shadow

- Spacing: xs/sm/md/lg/xl.
- Radii: sm/md/lg.
- Shadows: soft/strong.
- Konsistent in Sections, Cards, Buttons, Forms, Testimonials.

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

- **Reale Referenz:** Recherche zeigt zwei Pole – klassische Wirtshäuser mit
  Holztönen/Alpin-Motiven vs. moderne Münchner Wirtshaus-Szene (z. B.
  Wirtshaus Maximilian: helles, schlichtes Interieur statt dunklem Holz;
  Servus Heidi: einfache Deko plus Kunst an der Wand). Quelle:
  [munich.travel – Young Bavarian cuisine](https://www.munich.travel/en/topics/eat-drink/modern-bavarian-taverns),
  [Time Out – Wirtshaus Maximilian](https://www.timeout.com/munich/restaurants/wirtshaus-maximilian)
- **Ableitung:**
  - *Wirtshaus* (traditionell): warme Holztöne, kräftiges Braun/Grün, derbe Typo (Merriweather).
  - *Kellerstube* (abend): dunkler, gedeckter, Kerzenlicht-Anmutung statt Tageslicht.
  - *Biergarten* (hell): das "moderne Münchner Wirtshaus" aus der Recherche – helles Interieur, reduzierte Deko, mehr Luft.

### Italienisch

- **Reale Referenz:** BoccaLupo (Atlanta, Italian Trattoria) und ein in
  Block-Agency-Roundup beschriebener Trattoria-Stil: Creme-/Off-White-/
  Erdtöne, elegante Serifen für Headings, klare Sans-Serif im Fließtext –
  editorial statt rustikal. Quelle:
  [StartDesigns – 20 Best Restaurant Websites](https://www.startdesigns.com/blog/best-restaurant-websites/),
  [Block Agency – Restaurant Website Design Examples](https://blockagency.co/blog/restaurant-website-design-examples/)
- **Ableitung:**
  - *Trattoria* (traditionell): genau dieser Creme/Erdton-Look mit Playfair Display.
  - *Osteria Notte* (abend): dieselbe Serifen-Eleganz, aber dunkler getont, mehr Kontrast (DM Serif Display statt Playfair).
  - *Costiera* (hell): heller, mediterraner – die Serife bleibt, die Erdtöne weichen Küstenfarben.

### Griechisch

- **Reale Referenz:** Athens' Akra – minimalistischer Raum (Architektin Myrto
  Kiourti); Branding-Trend "minimalistisches Design + traditionelle
  griechische Elemente"; Blau-Weiß-Küstenpalette als Moodboard-Konstante.
  Quelle: [Reise-Recherche zu Akra/Athen](https://www.travel.gr/en/best-of-en/best-athens-gastro-tavernas/),
  Pinterest-Moodboards "Greek Taverna Aesthetic"
- **Ableitung:**
  - *Taverne am Hafen* (traditionell): Blau-Weiß, gezeichneter Olivenzweig (bereits in heroSignature.js umgesetzt), warme Erdtöne im Interieur.
  - *Athener Moderne* (abend): reduzierter, dunkler, die minimalistische Akra-Linie – Montserrat als Display bleibt hier laut vorhandenem Audit ein Schwachpunkt (siehe design-audit.md, Punkt 1) und sollte in Stage 3 überprüft werden.
  - *Olivenhain* (hell): helles Naturmaterial, viel Weißraum, Cormorant Garamond.

### Türkisch

- **Reale Referenz:** Spannbreite von Street-Food-Doner (Istanbul Grill,
  DonerG – bold colors, smoky grills) bis Fine-Dining (Mikla, Istanbul –
  Mid-Century-Modern-Eleganz auf dem Dach der Marmara Pera). Quelle:
  [Websuche Turkish Grill Restaurants](https://istanbulgrillvirginia.com/),
  Mikla als Fine-Dining-Referenz
- **Ableitung:**
  - *Basar* (traditionell): warme, kräftige Farben, Street-Food-Energie, Oswald als schmale Markt-Schrift.
  - *Bosporus bei Nacht* (abend): die Mikla-Richtung – gedämpft, elegant, Mid-Century statt Basar-Trubel.
  - *Anatolische Erde* (hell): Terrakotta/Sand-Töne, ruhiger als der Basar.

### Syrisch

- **Reale Referenz:** Ammoora (Baltimore, "modern Syrian fine dining") –
  explizit "warm with plaster, pattern and light", Räume nach Ecken eines
  Damaszener Hauses modelliert. Quelle: [Ammoora](https://ammoora.com/),
  [Lebanushi – Levantine warmth](https://lebanushi.com/the-best-levantine-restaurant-in-dubai/)
- **Ableitung:**
  - *Damaszener Hof* (traditionell): genau die Ammoora-Idee – Putz-Texturen, warmes Licht, Ornamentik.
  - *Gewürzbasar* (abend): dunkler, gewürzbetont, die Minztee-Signatur (bereits vorhanden) passt hierher.
  - *Levante Modern* (hell): reduzierte, helle Variante derselben Warmtöne.

### Chinesisch

- **Reale Referenz:** 2026-Trend explizit gegen "Red lacquer walls, gold
  dragon murals" – stattdessen "Neo-Chinese luxury", gedämpfte, natürliche
  Paletten mit gezielten Akzentfarben, kulturelle Symbolik reinterpretiert
  statt wiederholt. Quelle: [Tinggi Design Guide](https://tinggidesign.com/guide-to-chinese-restaurant-design/),
  Behance "BAO — Modern Chinese Restaurant"
- **Ableitung:**
  - *Rote Laterne* (traditionell): bewusst noch die klassischen Signalfarben (Rot/Gold), aber zurückhaltender dosiert als das Klischee.
  - *Shanghai Nacht* (abend): "Neo-Chinese luxury" – gedämpfte, dunkle Basis mit präzisen Gold-Akzenten statt Fläche.
  - *Teehaus* (hell): natürliche, ruhige Materialtöne, kaum noch Rot – Cormorant Garamond passt zur reduzierten Linie.

### Thailändisch

- **Reale Referenz:** Wenig spezifische Awards gefunden; Templatemonster-
  Kategorisierung zeigt Bandbreite von "neutral, clean" bis "dark,
  minimalist" – keine dominante Konvention. Orchideen-Motiv (bereits in
  heroSignature.js) bleibt daher die stärkste kulturelle Ankerreferenz.
- **Ableitung:**
  - *Orchidee* (traditionell): die vorhandene Orchid-Bloom-Signatur, warme Farbwelt.
  - *Streetfood Nacht* (abend): dunkler, Oswald als Street-Schrift (im Audit bereits positiv vermerkt).
  - *Andamanen* (hell): helle Küstenfarben, aber laut design-audit.md aktuell mit Montserrat statt echter Paarung – Stage 3 prüfen.

### Vietnamesisch

- **Reale Referenz:** Kaum eigenständige Design-Awards; Branding-Beispiele
  (Behance: "Pho Saigon – Brand Identity", "MÚC") eher reduziert/modern statt
  folkloristisch. Quelle: Behance-Suche "Vietnamese Restaurant"
- **Ableitung:**
  - *Indochine* (traditionell): wärmere, koloniale Anmutung.
  - *Hanoi Nacht* (abend): reduziert, dunkel, urban.
  - *Straßenküche* (hell): hell, unprätentiös, Street-Food-Direktheit – aktuell Montserrat, im Audit als schwache Paarung markiert.

### Japanisch

- **Reale Referenz:** Fat Cow – dunkle, dramatische Food-Fotografie mit
  warmen Gold-Akzenten für gehobene Seafood-/Omakase-Anmutung; Fiola als
  Beispiel für "restrained elegance" (weiche Palette, große Weißräume).
  Quelle: [Restaurant-Website-Recherche Omakase/Izakaya](https://www.sitebuilderreport.com/inspiration/restaurant-websites)
- **Ableitung:**
  - *Izakaya* (traditionell): dunkel, aber lebendig – Sushi-Band-Signatur (vorhanden) plus warme Lichtakzente.
  - *Omakase* (abend): die Fat-Cow-Richtung – sehr dunkel, wenige Gold-Akzente, DM Serif Display.
  - *Washitsu* (hell): die Fiola-Richtung – helle, zurückhaltende Eleganz statt Dunkelheit.

### Indisch

- **Reale Referenz:** Tamasha Modern Indian – zeitgenössischer Luxus mit
  indisch inspirierten Architekturdetails: Samt, Gold-Bögen, Schichtlicht,
  erdige Texturen; "Spice-Market-Farben" als Web-Übersetzung empfohlen
  (satte Jeweltöne, Texturüberlagerungen). Quelle:
  [Tamasha Modern Indian](https://en.wikipedia.org/wiki/Tamasha_Modern_Indian)
- **Ableitung:**
  - *Gewürzmarkt* (traditionell): satte Gewürzfarben, Oswald als Markt-Schrift.
  - *Maharadscha* (abend): die Tamasha-Richtung – Gold-Akzente auf dunklem Grund, DM Serif Display.
  - *Südindisch hell* (hell): reduzierte, hellere Palette, weniger Gold, mehr Grün/Naturtöne.

### Asiatisch (gemischt/panasiatisch)

- **Reale Referenz:** Keine eigenständige reale Referenz sinnvoll (Sammel-
  kategorie per Definition ohne feste kulinarische Identität, siehe README).
  Die Laternen-Signatur (bereits vorhanden) bleibt der visuelle Anker; Ton
  orientiert sich an den Nachbarrecherchen zu Chinesisch/Thailändisch.
- **Ableitung:**
  - *Marktstand* (traditionell): warm, belebt.
  - *Neon* (abend): urban, dunkel, Laternen-Glow als Lichtquelle.
  - *Fusion Minimal* (hell): reduziert, aktuell laut Audit mit Montserrat – Stage 3 prüfen.

### Café

- **Reale Referenz:** The Barn (Berlin) – europäischer Minimalismus, neutrale
  Farbpalette, High-Contrast-Visuals, editorial; Intelligentsia – kräftige
  Typografie, lebendige Fotografie, Storytelling über Herkunft. Warme
  Erdtöne (Braun/Creme/Terracotta) dominieren die Kategorie laut Recherche.
  Quelle: [Colorlib – 25 Best Coffee Shop Websites](https://colorlib.com/wp/coffee-shop-websites/)
- **Ableitung:**
  - *Wiener Kaffeehaus* (traditionell): warme Erdtöne, klassische Eleganz, Playfair/Merriweather-Nähe.
  - *Konditorei* (abend): gedämpfter, edler – DM Serif Display passt zur Patisserie-Anmutung.
  - *Third Wave* (hell): The-Barn-Minimalismus – neutral, hell, High-Contrast – aktuell Montserrat, im Audit als schwache Paarung markiert.

---

### 5.1 Wiederkehrendes Muster aus der Recherche

Über alle 12 Küchen hinweg bestätigt die Recherche zwei Dinge aus dem
Stage-1-Audit:

1. **Die "hell"-Stimmung ist die anfälligste für generische Wirkung.** In
   5 von 12 Fällen (siehe design-audit.md) läuft dort Montserrat als
   Display-Schrift neben Inter – die reale Referenz-Recherche zeigt aber,
   dass gerade die hellen/minimalistischen Restaurant-Referenzen (Akra,
   Wirtshaus Maximilian, The Barn) sich über **Reduktion und Material**
   unterscheiden, nicht über eine neutrale Grotesk-Schrift. Empfehlung für
   Stage 3: pro "hell"-Stimmung prüfen, ob eine der fünf bereits vorhandenen
   Serifen (z. B. Cormorant Garamond, sehr hell einsetzbar) besser trägt als
   Montserrat.
2. **"Abend" ist konsistent die dunkelste, reduzierteste Stimmung** – das
   deckt sich mit allen recherchierten Fine-Dining-/Nacht-Referenzen (Fat
   Cow, Mikla, Ammoora-Gewürzbasar, Shanghai Nacht) und bestätigt die
   bestehende Architektur-Entscheidung in `ARCHETYP_PRESET.abend`.

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

1. Fülle Abschnitt 5 (Theme-Spezifika) für alle Küchen/Stimmungen aus, gestützt auf Refero-Recherche + echte Restaurant-Referenzen.
2. Leite daraus konkrete Werte für src/designPresets.js ab.
3. Dokumentiere jede Änderung an designPresets.js mit Verweis auf die hier festgehaltenen Design-Entscheidungen.
