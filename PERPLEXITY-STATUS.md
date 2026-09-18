# Perplexity-Statusdokument (gastro-webagentur)

Dieses Dokument wird von Perplexity (KI-Assistent) gepflegt, ergänzend zur
bestehenden `README.md`. Es fasst den aktuellen Funktionsstand des Projekts
zusammen, damit spätere Planungs-Sessions nicht bei null anfangen müssen.
Es ersetzt die README nicht und sollte nicht mit ihr synchronisiert oder
zusammengeführt werden – beide Dokumente können unabhängig aktualisiert
werden.

Letzte Prüfung: 18. September 2026, basierend auf Commit `d97b1c8f`
(main-Branch).

## Projektüberblick

Lead-Generierung für eine Restaurant-Web-Agentur: Findet Gaststätten ohne
Website über die Google Places API, scort sie nach Qualitätsmerkmalen und
generiert automatisch Landing-Page-Entwürfe als Pitch-Material.

## npm-Scripts (bestätigt)

```
node src/index.js --region "<Ort>" --limit 5   # Leads sammeln
npm run pages                                   # Entwürfe bauen
npm run pages -- --region "Altötting"          # nur ein Ort
npm run pages -- --min-score 80                # nur dringende Fälle
npm run pages -- --limit 10                    # Top 10 nach Score
npm run pages -- --email info@restaurant.de    # Bestellungen/Reservierungen per E-Mail
npm run pages -- --cuisine japanisch           # Küche manuell vorgeben
npm run dashboard                                # Lokales Lead-Dashboard (Port 3000)
npm run wirt -- --betrieb <betrieb>             # Wirt-Dashboard (Port 3200)
npm run publish-site                            # Export nach docs/ für GitHub Pages
npm test                                        # Test-Suite (node:test)
```

Wichtig: Dashboard (Port 3000) und Wirt-Server (Port 3200) nutzen getrennte
Umgebungsvariablen `DASHBOARD_PORT` und `WIRT_PORT` (vorher gemeinsames
`PORT`, das zu einer Portkollision führte – seit Commit `4ec4f32` behoben).

## Die 12 Küchen-Stilrichtungen

| Küche | Beispiel-Ausrichtung |
|---|---|
| Bayerisch | Wirtshausküche & Biergarten |
| Italienisch | Pizza, Pasta & Antipasti |
| Griechisch | Gyros, Grill & Meze |
| Türkisch | Döner, Grill & Pide |
| Syrisch | Mezze, Schawarma & Grill |
| Chinesisch | Wok, Dim Sum & Ente |
| Thailändisch | Curry, Wok & Street Food |
| Vietnamesisch | Phở, Bánh Mì & Sommerrollen |
| Japanisch | Sushi, Ramen & Izakaya |
| Indisch | Curry, Tandoor & Biryani |
| Asiatisch (gemischt) | Sammelkategorie für nicht genauer einordbare panasiatische Konzepte |
| Café | Frühstück, Kuchen & Kaffee |

Namenserkennung prüft die genaueren Küchen zuerst (z.B. "Sushi Bar Kyoto"
wird japanisch, nicht pauschal asiatisch). Küchen und Beschriftungen liegen
zentral in `src/menuCatalog.js`.

## Hero-Signaturen je Küche (src/heroSignature.js)

- Italienisch: gegenläufig drehende Pizzahälften
- Bayerisch: wechselnde Tagesempfehlung (Tafel)
- Griechisch: ruhiger Bildwechsel mit Annäherung
- Türkisch: rotierender Drehspieß (auch von Syrisch geerbt)
- Chinesisch: Drehteller in der Tischmitte
- Vietnamesisch: dampfende Schale Phở
- Japanisch: Sushi-Band (Laufband-Optik)
- Café: aufsteigender Dampf über der Tasse
- Thailändisch, Indisch, Asiatisch (gemischt): aktuell ohne dediziertes
  eigenes Signatur-Element (nutzen generische/geerbte Mechanismen) –
  Kandidaten für zukünftige Ergänzung.

Seit dem Design-Preset-Merge zusätzlich 3 generische, küchenunabhängige
Hero-Varianten: `dish_photo`, `ambience_photo`, `reservation_hero`.

## Design-Preset-System (src/designPresets.js) — neu

Konfigurationsgetriebenes Feature-Modell, eingeführt in PR #7:

- `withDesignDefaults(overrides)`: baut ein vollständiges Preset, fehlende
  Felder fallen auf das bisherige Standardverhalten zurück.
- `getPresetVariant(cuisineKey, variantName = "default")`: liefert eine
  bestimmte Variante einer Küche; unbekannte Küche fällt auf "bayerisch"
  zurück, unbekannte Variante auf "default".
- Jede der 12 Küchen hat eine "default"-Variante (= bisheriges Verhalten)
  sowie mindestens eine alternative Variante für A/B-Tests.
- Preset-Felder: `hero.type`, `hero.primaryAction`, `header.sticky`,
  `layout.sectionOrder`, `menu.layout`, `menu.showBadges`,
  `reservation.widgetVariant`, `social.layout`, `mobile.stickyActionBar`.
- Nutzung in `buildLandingPage(lead, { preset: {...} })` oder
  `buildLandingPage(lead, { designVariant: "photo-hero" })`.

## Lead-Frische / Google-Places-Compliance (src/leadFreshness.js) — neu

Eingeführt in PR #5, reagiert auf die Google-Maps-Nutzungsbedingungen
(keine Speicherung von Place-Daten über 30 Tage hinaus):

- Jeder Lead bekommt einen `fetchedAt`-Timestamp.
- Leads werden ab 30 Tagen als "stale" markiert.
- Dashboard warnt bereits ab 25 Tagen, damit ein Re-Fetch rechtzeitig
  passieren kann.

## Weitere bestätigte Module

- `src/websiteAnalyzer.js` — vorhanden, Zweck/Funktionsumfang noch nicht
  im Detail verifiziert (Inhalt konnte technisch nicht vollständig
  ausgelesen werden; bei Bedarf durch Claude Code prüfen lassen).
- `src/outreach.js` — Anschreiben-/Pitch-Vorlage; kein separates Test-File
  vorhanden, daher Testabdeckung unklar.
- `src/betriebStore.js` / `src/wirtServer.js` — Tischverwaltung mit
  120-Minuten-Kapazitätsfenster, `unverteilbareGruppen()`-Logik prüft
  Tischverteilung (nicht nur Platzsumme).
- `src/motion.js` — Scroll-Animationen ausschließlich über `transform`/
  `opacity`, No-JS-Fallback über verzögert gesetzte Klasse, vollständige
  Deaktivierung via `prefers-reduced-motion`.

## Bekannter Teststand (Stand letzter Merge)

132 Tests gesamt (103 bestehend + 29 neu für das Design-Preset-Modell).
Ein zuvor gemeldeter fehlgeschlagener Test (`csvImport.test.js`,
Module-Not-Found) war zum Zeitpunkt des ursprünglichen Rundowns offen;
Status nach den jüngsten Commits nicht erneut verifiziert.

## Rechtlich/Design-relevante Entscheidungen (aus Commit-Historie)

- Echte Google-Rezensionstexte werden nicht gespeichert/dargestellt
  (nur die Google-Gesamtnote), da Google nur die Speicherung der
  `place_id` dauerhaft erlaubt und Rezensionstexte Namen echter Gäste
  enthalten. Nur frei erfundene Beispiel-Lokale bekommen ausformulierte
  Test-Stimmen.
- Unaufgeforderte Werbe-E-Mails an Gewerbetreibende sind nur eingeschränkt
  zulässig; das Dashboard bietet daher ein vorformuliertes Anschreiben
  zum Kopieren statt automatischem Massenversand.
- Öffentliche Startseite zeigt nur frei erfundene Beispiel-Lokale; echte
  Entwürfe sind zwar erreichbar, aber unverlinkt (Ordnername enthält eine
  Kennung aus dem Lead).

## Hinweis zur Pflege dieses Dokuments

- Dieses Dokument wird von Perplexity bei Bedarf aktualisiert, wenn neue
  Projektstände besprochen werden.
- Für Änderungen an Code oder an der eigentlichen `README.md` ist weiterhin
  Claude Code der richtige Ausführungsweg (voller Dateizugriff, `npm test`
  Verifikation). Perplexity schreibt hier nur Status-Text, keinen
  Produktionscode.
