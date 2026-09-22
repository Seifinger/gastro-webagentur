# Workflow: Anti-Slop Design Upgrade – gastro-webagentur

Dieser Guide beschreibt, wie CLAUDE.md und DESIGN.md gemeinsam genutzt werden.

## Schritt 1 – Dateien einlesen lassen
- Claude liest README.md, CLAUDE.md, DESIGN.md vollständig.
- Kein Code wird in diesem Schritt verändert.

## Schritt 2 – Audit (Stage 1 aus CLAUDE.md)
- Claude liefert eine kurze Audit-Zusammenfassung: was ist gut, was wirkt generisch, was bleibt unangetastet.
- Ich (der Nutzer) gebe Feedback und Freigabe für Stage 2.

## Schritt 3 – Referenz-Recherche (Stage 2)
- Claude sucht pro Küche/Stimmung passende Referenzen:
  - über Refero Styles (https://styles.refero.design/), idealerweise via MCP-Suche.
  - über echte Restaurant-Websites (von mir vorgegebene URLs oder eigene Recherche).
- Ergebnisse werden in DESIGN.md, Abschnitt 5, dokumentiert.

## Schritt 4 – Designsystem-Feinschliff (Stage 3)
- Claude schlägt konkrete Werte für src/designPresets.js vor.
- Ich prüfe und gebe frei, bevor Code geändert wird.

## Schritt 5 – Incremental Refactor (Stage 4)
- Claude ändert landingPageGenerator.js, heroSignature.js, motion.js, testimonials.js in kleinen Schritten.
- Nach jedem Schritt: npm test, npm run pages / npm run preview.

## Schritt 6 – Pilot-Küchen (Stage 5)
- 2–3 Küchen werden exemplarisch auf "Designer-Level" gebracht.
- Ich gebe visuelles Feedback, Claude iteriert.

## Schritt 7 – Rollout (Stage 6)
- Erfolgreiche Muster werden auf alle 12 Küchen übertragen.
- README.md wird um eine Designsystem-Sektion ergänzt.

## Wichtige Leitplanken
- Jede Stage endet mit einer kurzen Zusammenfassung von Claude und wartet auf meine Freigabe.
- Bestehende npm-Skripte, Tests und Business-Logik (Scoring, Dashboard, Wirt-Server) dürfen nicht brechen.
- Refero-Referenzen sind Inspiration, keine 1:1-Vorlagen – Anpassung an Sprache, Zielgruppe und Küche ist Pflicht.
