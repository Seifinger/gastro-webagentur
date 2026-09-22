# Entscheidungslog v2

Laufendes Protokoll aller Entscheidungen, die während des autonomen v2-Aufbaus
ohne Rückfrage getroffen wurden. Format: Stage · Entscheidung · Begründung.
Neueste Einträge unten.

## Stage 0 – Architektur

- **E0.1 · v2 liest aus v1, schreibt nie hinein.** Stimmungen (`src/stimmungen.js`),
  Speisekarten (`src/menuCatalog.js`), Bild-IDs (`src/imageLibrary.js`), gezeichnete
  Icons (`src/signaturIcons.js`) und Farbmathematik (`src/colorMath.js`) werden
  importiert statt kopiert. Begründung: eine Quelle der Wahrheit für Inhalte; v2
  unterscheidet sich im Gestaltungsweg, nicht in den Daten. Leitplanke „v1 bleibt
  unangetastet" ist damit technisch eingehalten.
- **E0.2 · v2-Tests liegen in `test/v2-*.test.js`.** Dadurch laufen sie automatisch
  mit `npm test` (Glob `test/*.test.js`), seriell wie die v1-Tests, und dieselbe
  Testkultur (node:test, `assert/strict`, synthetische Slugs mit `__test`-Präfix,
  Aufräumen in `after`) gilt für beide.
- **E0.3 · Ausgaben in `v2/output/`.** Gebaute Sites, Screenshots und Judge-Protokolle
  landen dort und werden committet, damit der Stand ohne lokalen Build einsehbar ist.
  Ausnahme: große Zwischenstände (volle Screenshots jeder Judge-Runde) bleiben
  gitignoriert, nur die finalen Vergleichsbilder werden eingecheckt.
- **E0.4 · Produktionsdaten.** Die im Auftrag genannte `data/betriebe.json` existiert
  nicht; Betriebsdaten liegen je Betrieb in `data/betrieb/<slug>.json` (gitignoriert).
  Im Repository liegen keine echten Betriebsdaten. v2 fasst sie nur über die
  v1-Funktionen aus `betriebStore.js` an und fügt ausschließlich optionale Felder
  hinzu. Alle Tests nutzen Slugs mit Präfix `__test-v2`.
