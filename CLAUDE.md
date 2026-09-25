# Project: gastro-webagentur – Anti-Slop Design Upgrade

<project_context>
Repository: Seifinger/gastro-webagentur

Aktueller Stand laut README.md:
- Node.js ESM Tooling mit CLI (index.js, previewServer.js, dashboardServer.js, wirtServer.js).
- Lead-Generierung über Google Places API (placesClient.js, scoring.js, csvExport.js, csvImport.js).
- Landing-Page-Generator für 12 Küchen:
  - src/generateLandingPages.js
  - src/landingPageGenerator.js
  - src/menuCatalog.js
  - src/designPresets.js
  - src/heroSignature.js
  - src/motion.js
  - src/fontLibrary.js
  - src/imageLibrary.js
  - src/stimmungen.js, src/stimmungsWahl.js
  - src/testimonials.js
  - src/sections/*, src/styles/*
- Dashboard für Leads & Entwürfe (dashboardServer.js, previewServer.js, data/landingpages).
- Wirt-Dashboard für Tische, Reservierungen, Abholbestellungen (wirtServer.js, betriebStore.js).
- Bereits vorhanden: 12 Küchen × 3 Stimmungen (traditionell/abend/hell), eigene Hero-Bewegung je Küche, lokale Fonts, Motion-Regeln (nichts springt, nichts versteckt Inhalt, abschaltbar via prefers-reduced-motion).

Goal: Die bestehenden Landing-Pages und Dashboards sollen visuell und UX-seitig auf das Niveau außergewöhnlicher, menschlich wirkender Restaurant-Websites gehoben werden – ohne die bewährte Architektur zu zerstören. Wir vermeiden generische "AI Slop"-Optik, indem wir Design-first statt Code-first arbeiten und echte Design-Referenzen nutzen.
</project_context>

<active_pipeline>
Stand 24.09.2026 – Details und Belege: v2/GESTALTUNGS-UMBAU-PLAN.md (Abschnitt A).
- Veröffentlicht wird über `npm run publish-site` → Engine-Wahl (data/v2-engine.json, gitignoriert; ohne Datei: v1).
  Alle Seiten unter docs/ stammen aktuell von v2: v2/build/zyklus.js → v2/build/siteBuilder.js (+ sektionen/, stil.js, bewegung.js).
- Der Gestaltungs-Umbau setzt dort an (neue Ebene "Ausdruck": kino / gesellig / handwerk / editorial), opt-in.
  Seiten ohne Ausdruck bleiben Byte für Byte gleich (test/v2-unveraendert.test.js, `npm run v2:snapshot`).
- src/landingPageGenerator.js bleibt Pflicht: v2 liest PAGE_SCRIPT (Bestellung/Reservierung) zur Build-Zeit daraus.
</active_pipeline>

<kundenfassungen>
Kundenwebsites gewonnener Betriebe (Stand 25.09.2026, Details: docs-intern/KUNDENWEBSITES.md):
- EINE Quelle für Dashboard und Chat: data/kunden/<kunden-id>/projekt.json (+ medien/), gitignoriert.
- Inhaltswünsche aus dem Chat (Texte, Preise, Gerichte, Medien, Öffnungszeiten) IMMER über
  `npm run kunde -- …` (scripts/kunde.mjs) umsetzen – nie projekt.json von Hand, nie einen zweiten Speicher.
  `npm run kunde -- liste` / `anzeigen --kunde k-…` zeigt den aktuellen Stand inkl. Dashboard-Änderungen.
- Bauen: `npm run kunde -- bauen --kunde k-…` (nur lokal, v2/output/kunden/). Nichts davon nach docs/.
- Layout-Sonderwünsche sind KEINE Inhalte: die gehen in Code/Vorlage und brauchen den Snapshot-Test.
</kundenfassungen>

<constraints>
- Keine komplette Neuimplementierung: bestehender Generator, Scoring-Logik, Dashboard- und Wirt-Server bleiben erhalten.
- Der Archetypen-/Stimmungs-Ansatz in designPresets.js, stimmungen.js und heroSignature.js bleibt die Basis der Gestaltung.
- Alle bestehenden npm-Skripte (npm test, npm run pages, npm run publish-site, npm run dashboard, npm run wirt) müssen weiterhin funktionieren.
- Neue Design-Elemente laufen über designPresets.js, styles/, fontLibrary.js, motion.js und sections/* – nicht hart im HTML-String verdrahtet.
- Diese erste Phase ist NUR Planung/Audit. Keine Code-Änderungen, bevor ich das explizit freigebe.
</constraints>

<anti_slop_principles>
1. Design-First Workflow
   - Erst Designrichtung und Designsystem klären (DESIGN.md), dann den Generator in kleinen Schritten anpassen.
   - Keine Ein-Prompt-"AI Landing Pages", sondern iterative, referenzbasierte Gestaltung.

2. System statt Flickwerk
   - Typografie, Farben, Spacing, Radii, Shadows zentral über fontLibrary.js, styles/, designPresets.js pflegen.
   - Jede Änderung läuft über Presets und Themes, nicht über Ad-hoc-CSS im HTML-String.

3. Distinkt pro Küche & Stimmung
   - Jede Küche (bayerisch, italienisch, griechisch, japanisch, etc.) hat drei Stimmungen mit eigenen Fonts und Bildwelten – das wird verfeinert, nicht verworfen.
   - Ziel: jede Seite wirkt wie ein echtes Haus, nicht wie ein austauschbares AI-Template.

4. Externe Referenzen statt Bauchgefühl
   - Nutze reale Restaurant-Websites UND kuratierte Design-Referenzen (siehe Refero-Abschnitt unten), um Farbpaletten, Typo-Paare und Layout-Patterns zu validieren, statt Design-Tokens frei zu erfinden.

5. Intentional Motion
   - motion.js-Regeln bleiben gültig ("nichts springt", "nichts versteckt Inhalt", "abschaltbar").
   - Hero-Loops und Scroll-Reveals werden gezielt verfeinert, nicht durch Over-Animation ersetzt.
</anti_slop_principles>

<refero_integration>
Zusätzliche Design-Referenzquelle: https://styles.refero.design/

Was es ist:
- Eine kuratierte Bibliothek mit über 2.000 realen Produkt-Websites, aus denen Farben, Typografie, Spacing und Komponenten-Regeln extrahiert wurden.
- Jede Referenz kommt als fertiges DESIGN.md-Format, das speziell für KI-Coding-Agents (wie dich) gemacht ist.
- Es gibt einen MCP-Server (refero-design-mcp), der eine Volltextsuche über den Katalog erlaubt und direkt DESIGN.md-Dateien liefert.

Wie du es nutzt:
1. Falls ein Refero-MCP-Server in dieser Umgebung verfügbar/verbunden ist: durchsuche den Katalog nach Stilrichtungen, die zu einer bestimmten Küche/Stimmung passen (z. B. "warm mediterranean restaurant minimal", "dark elegant japanese izakaya", "cozy rustic tavern", "clean editorial food brand").
2. Falls kein MCP verbunden ist: sag mir explizit, dass du https://styles.refero.design/ manuell durchsuchen sollst, und ich gebe dir die relevanten URLs/Inhalte.
3. Behandle jede gefundene Referenz-DESIGN.md NICHT als 1:1-Vorlage, sondern als Startpunkt:
   - Übernimm Tokens (Farbpalette, Typo-Paare, Spacing-Skala, Komponentenregeln), die zur jeweiligen Küche/Stimmung passen.
   - Passe sie an unsere Bildwelt, Sprache (Deutsch) und bestehende Struktur (Hero, USP-Leiste, Menü, Reservierung) an.
   - Dokumentiere das Ergebnis in unserer eigenen DESIGN.md, nicht als Kopie der Refero-Quelle.

Ziel: Wir erfinden Design-Tokens nicht frei, sondern validieren sie gegen echte, geprüfte Produktdesigns – das reduziert generische AI-Optik erheblich.
</refero_integration>

<files_of_interest>
- README.md → Gesamtüberblick, bestehende Konzepte.
- src/index.js → CLI-Einstieg.
- src/buildSite.js, src/publishSite.js → Build & Deploy nach /docs.
- src/generateLandingPages.js → Orchestriert Landing-Page-Generation.
- src/landingPageGenerator.js → HTML/CSS-Template-Engine.
- src/designPresets.js → Archetypen, Küchenstimmungen, Layout- & Theme-Presets.
- src/menuCatalog.js → Speisekarten für 12 Küchen.
- src/heroSignature.js → bewegte Hero-Elemente je Küche.
- src/motion.js → Scroll-Reveal-Animationen.
- src/fontLibrary.js → lokale Font-Verwaltung.
- src/imageLibrary.js → Asset-Management für Bilder.
- src/testimonials.js → Gästestimmen-Komponente.
- src/styles/*, src/sections/* → zentrale CSS und HTML-Snippets.
- src/websiteAnalyzer.js → Website-Prüfung, potenziell auch für Referenzseiten-Analyse.
- src/dashboardServer.js, src/previewServer.js → Lead-/Entwürfe-Dashboard.
- src/wirtServer.js, src/betriebStore.js → Wirt-Dashboard.
</files_of_interest>

<step_plan>
Arbeite mit mir iterativ in diesen Stufen. Lies zuerst README.md, CLAUDE.md und DESIGN.md vollständig, bevor du irgendetwas tust.

### Stage 1 – Code & Design Audit (NUR lesen, NICHTS ändern)

1. Lies:
   - README.md
   - src/landingPageGenerator.js
   - src/designPresets.js
   - src/heroSignature.js
   - src/motion.js
   - src/fontLibrary.js
   - src/styles/*
   - src/sections/*
   - src/testimonials.js
   - src/websiteAnalyzer.js
   - src/dashboardServer.js, src/wirtServer.js

2. Erstelle eine kurze Audit-Zusammenfassung:
   - Was an Architektur/Design schon sehr gut ist.
   - Wo die Seiten designmäßig noch generisch oder "AI-sloppy" wirken (Typo, Farben, Layout, Forms).
   - Welche Teile aus Stabilitätsgründen möglichst unangetastet bleiben sollten.

3. Warte auf meine Freigabe, bevor du zu Stage 2 übergehst.

### Stage 2 – Referenz-Recherche (Refero + echte Restaurant-Websites)

1. Für jede unserer Küchen/Stimmungen: finde 1–2 passende Refero-Style-Referenzen (siehe refero_integration oben) UND, falls möglich, 1–2 reale Restaurant-Website-Referenzen.
2. Extrahiere aus beiden Quellen: Farbpalette, Typo-Paare, Spacing-Rhythmus, Layout-Patterns, Motion-Ideen.
3. Fasse das strukturiert in DESIGN.md zusammen (pro Küche/Stimmung ein eigener Abschnitt).

### Stage 3 – Designsystem-Feinschliff & Mapping auf designPresets.js

1. Schärfe in DESIGN.md die Font-Paare, Farbpaletten, Spacing-Skalen und Komponentenguidelines.
2. Erweitere/justiere src/designPresets.js um Felder wie:
   - hero.type, hero.primaryAction, hero.backgroundStyle
   - header.sticky, header.trustStrip, header.ctaLabel
   - layout.sectionOrder, layout.sectionSpacing
   - menu.layout, menu.showBadges, menu.highlightMostLoved
   - reservation.widgetVariant, reservation.externalSystem
   - ordering.enabled, ordering.mode, ordering.ctaPlacement
   - social.layout, social.includeRatingStrip
   - mobile.stickyActionBar
   - dashboard.themeVariant, dashboard.cards
3. Zeige mir eine kurze Übersicht der neuen Felder, bevor du den Generator anfasst.

### Stage 4 – Incremental Refactor (klein, getestet)

Für jede Änderung: kurz erklären → Code ändern → npm test laufen lassen → npm run pages / npm run preview prüfen.

1. landingPageGenerator.js: Sektionen nach designPresets.layout.sectionOrder rendern, sections/* stärker nutzen.
2. heroSignature.js: Hero-Varianten schärfen (dish_photo, ambience_photo, reservation_hero etc.).
3. motion.js: Scroll-Reveals an neue Layout-Rhythmik anpassen.
4. testimonials.js: Layout-Varianten (carousel/grid/featured_quote) je nach Preset.

### Stage 5 – Anti-Slop-Redesign für 2–3 Küchen (Pilot)

1. Wähle mit mir 2–3 Küchen/Stimmungen als Piloten (z. B. italienisch/Trattoria, japanisch/Izakaya, bayerisch/Wirtshaus).
2. Setze designPresets so, dass Hero, Menü, USP-Leiste, Reservierung, Bilder und Footer wie hochwertig gestaltete Restaurant-Websites wirken.
3. Nutze verfügbare Design-/UX-Skills für Designkritik und Feinanpassung.

### Stage 6 – Übertrag & Dokumentation

1. Übertrage die erarbeiteten Muster auf alle 12 Küchen/Stimmungen.
2. Ergänze README.md um eine kurze "Designsystem"-Sektion.
3. Stelle sicher, dass alle npm-Skripte weiterhin wie beschrieben funktionieren.
</step_plan>

<collaboration_style>
- Stelle gezielte Rückfragen, wenn Designentscheidungen unklar sind.
- Behandle bestehende Logik als wertvolles Fundament, nicht als Altlast.
- Erkläre visuelle und UX-Entscheidungen in Worten, nicht nur in Code.
- Halte jeden Schritt klein, erklärt und testbar.
- Warte nach jeder Stage auf meine Freigabe, bevor du zur nächsten übergehst.
</collaboration_style>
