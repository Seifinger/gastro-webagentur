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

Für jede Kombination bitte ausfüllen (Platzhalter-Struktur, von Claude/mir gemeinsam zu vervollständigen):

### [Küche] – [Stimmung]

- Refero-Referenz: [Link/Name der genutzten Refero-Style-Seite]
- Reale Restaurant-Referenz: [Link/Name]
- Typo: [Display-Font] / [Body-Font]
- Farben: [Base] / [Alt] / [Akzent 1] / [Akzent 2]
- Layout-Besonderheiten: [z. B. Hero-Typ, Menü-Layout]
- Motion-Idee: [z. B. Hero-Loop-Charakter]

*(Diese Struktur für alle 12 Küchen × 3 Stimmungen wiederholen, sobald Stage 2 der CLAUDE.md-Pipeline durchlaufen ist.)*

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
