# Perplexity-Statusdokument (gastro-webagentur)

Dieses Dokument wird von Perplexity (KI-Assistent) gepflegt, ergänzend zur
bestehenden `README.md`. Es fasst den aktuellen Funktionsstand des Projekts
zusammen, damit spätere Planungs-Sessions nicht bei null anfangen müssen.
Es ersetzt die README nicht und sollte nicht mit ihr synchronisiert oder
zusammengeführt werden – beide Dokumente können unabhängig aktualisiert
werden.

Letzte Prüfung: 18. September 2026, basierend auf Commit `6f8b12e`
(main-Branch, PR #9 und #10 gemerged).

## Projektüberblick

Lead-Generierung für eine Restaurant-Web-Agentur: Findet Gaststätten ohne
Website über die Google Places API, scort sie nach Qualitätsmerkmalen und
generiert automatisch Landing-Page-Entwürfe als Pitch-Material. Seit PR #9/#10
kommt eine vollständige Kunden-Bearbeitungsfunktion dazu (eigene Bilder/Texte,
Prompt-basierte Textvorschläge, gezielter Einzel-Publish).

## npm-Scripts (bestätigt)

```
node src/index.js --region "<Ort>" --limit 5     # Leads sammeln
npm run pages                                     # alle Entwürfe bauen
npm run pages -- --region "Altötting"            # nur ein Ort
npm run pages -- --min-score 80                  # nur dringende Fälle
npm run pages -- --limit 10                      # Top 10 nach Score
npm run pages -- --email info@restaurant.de      # E-Mail-Versand aktivieren
npm run pages -- --cuisine japanisch             # Küche manuell vorgeben
npm run pages -- --only <slug>                   # NEU: nur einen Entwurf bauen
npm run dashboard                                 # Lokales Lead-Dashboard (Port 3000)
npm run wirt -- --betrieb <betrieb>               # Wirt-Dashboard (Port 3200)
npm run publish-site                              # Voller Export nach docs/
npm test                                          # Test-Suite (node:test)
```

Dashboard (Port 3000) und Wirt-Server (Port 3200) nutzen weiterhin getrennte
Umgebungsvariablen `DASHBOARD_PORT`/`WIRT_PORT`.

## Die 12 Küchen-Stilrichtungen

| Küche | Beispiel-Ausrichtung | Hero-Signatur |
|---|---|---|
| Bayerisch | Wirtshausküche & Biergarten | Tagestafel + überlaufender Bierkrug (SVG, entschleunigt) |
| Italienisch | Pizza, Pasta & Antipasti | Gegenläufig drehende Pizzahälften |
| Griechisch | Gyros, Grill & Meze | Ruhiger Bildwechsel (Diashow) |
| Türkisch | Döner, Grill & Pide | Rotierender Drehspieß |
| Syrisch | Mezze, Schawarma & Grill | Drehspieß (geteilt mit Türkisch) |
| Chinesisch | Wok, Dim Sum & Ente | Drehteller in der Tischmitte |
| Thailändisch | Curry, Wok & Street Food | Naturgetreue aufblühende Orchidee (5 Blütenblätter + Labellum, SVG überarbeitet) |
| Vietnamesisch | Phở, Bánh Mì & Sommerrollen | Dampfende Phở-Schale |
| Japanisch | Sushi, Ramen & Izakaya | Sushi-Band (Laufband) |
| Indisch | Curry, Tandoor & Biryani | Gezeichnete Gewürzwolke mit Flecken (SVG überarbeitet, vorher Blur-Kreise) |
| Asiatisch (gemischt) | Sammelkategorie | Pulsierende Papierlaternen (entschleunigt) |
| Café | Frühstück, Kuchen & Kaffee | Aufsteigender Dampf über der Tasse |

Griechisch/Türkisch-Syrisch bleiben die einzigen Küchen ohne vollständig
eigenständige Hero-Signatur – Kandidaten für eine spätere Ergänzung
(z.B. Olivenzweig für Griechisch, Minztee-Glas für Syrisch, siehe
Planungs-Chatverlauf).

## NEU: Bewegungs-Toggle für Vor-Ort-Demos (`?bewegung=aus`)

Eingeführt für Pitches, bei denen situativ zwischen bewegter und ruhiger
Fassung gewechselt werden soll, unabhängig von der Systemeinstellung des
Besuchers:

- `src/motion.js`: URL-Parameter `?bewegung=aus` setzt `document.documentElement`
  auf die Klasse `.bewegung-aus` statt `.bewegt` – alle Scroll-Reveals und
  Hero-Signatur-Animationen bleiben im sichtbaren Grundzustand.
- `src/heroSignature.js`: Die geteilte reduced-motion-Konstante greift jetzt
  per CSS-Nesting sowohl unter der `prefers-reduced-motion`-Media-Query als
  auch unter `.bewegung-aus` – eine einzige gepflegte Regel-Liste statt zwei.
- Dashboard zeigt pro Entwurf zwei QR-Codes nebeneinander: "Mit Bewegung" /
  "Ohne Bewegung" (zweiter Code zeigt auf dieselbe URL + `?bewegung=aus`,
  keine Serveränderung am bestehenden `/api/qr`-Endpunkt nötig).

## NEU: Kunden-Bearbeitungsfunktion (vier Phasen, alle umgesetzt)

### Phase 1 – Lead-Edits-Datenmodell (`src/leadEdits.js`)

- Eigene Bilder/Texte je Entwurf liegen in `data/lead-edits/<slug>.json`
  (gitignored, analog zu `data/betrieb/`).
- Felder: `bilder.{hero,haus,team,bestseller}`, `texte.{headline,schlagzeile}`,
  `texte.highlightBeschreibungen` (Gericht-ID → Text).
- Jede Änderung sichert den vorherigen Stand automatisch im `verlauf`-Array
  (letzte 10 Fassungen) – Rollback-fähig.
- `src/landingPageGenerator.js`: `options.editUebersteuerung` überschreibt
  gezielt einzelne Felder, fehlende Felder fallen auf den bisherigen
  Stock-Fallback zurück. Ohne die Option ist die Ausgabe für alle 12 Küchen
  byteweise identisch zu vorher (Regressionsschutz bestätigt).
- `npm run pages` lädt die Lead-Edits automatisch pro Entwurf.

### Phase 2 – Bild-Upload (`src/bildUpload.js`, `public/bearbeiten.html`)

- Vier Upload-Plätze (Hero, Haus, Team, Bestseller) mit Vorschau des
  aktuell aktiven Bildes (eigenes Foto oder Stock-Platzhalter).
- Validierung anhand der Dateibytes (nicht nur Content-Type): JPEG/PNG/WebP,
  max. 8 MB, max. 1800px Breite. Client verkleinert zusätzlich vor dem Upload.
- Speicherung unter `public/uploads/<slug>/<rolle>.jpg` (gitignored).
- `POST /intern/lead/:slug/bild`, `GET /api/lead/:slug/bilder` in
  `src/dashboardServer.js`. Aus der Lead-Liste führt ein "Bilder"-Knopf zur
  Bearbeitungsansicht.

### Phase 3 – Prompt-basierte Textvorschläge (`src/promptEdits.js`)

- Nutzt `@anthropic-ai/sdk` (Claude Opus 5) mit strikter System-Prompt-Vorgabe:
  nur `headline`/`schlagzeile`/`highlightBeschreibungen` als JSON, kein HTML,
  keine URLs.
- Serverseitige Zweitprüfung: nur erlaubte Felder, alle Werte Strings, kein
  HTML/URL per Regex, Gericht-IDs müssen auf der Karte tatsächlich existieren.
  Jeder Verstoß verwirft die gesamte Antwort (keine Teilübernahme).
- Vorschlag wird NICHT sofort gespeichert: Vorschau via `GET .../prompt/vorschau`
  (iframe, live gerendert, nichts persistiert), erst `POST .../prompt/uebernehmen`
  schreibt über `saveLeadEdits()` endgültig (inkl. automatischem Verlauf-Eintrag).
  `POST .../prompt/verwerfen` vergisst den Zwischenstand.
- Rate-Limit: max. 10 Anfragen je Entwurf und Stunde (In-Memory-Zähler).
- Benötigt `ANTHROPIC_API_KEY` in `.env` (siehe `.env.example`); ohne Key
  funktioniert nur dieses eine Feature nicht, alles andere bleibt unberührt.

### Phase 4 – Gezielter Einzel-Publish (`src/veroeffentlichung.js`)

- `npm run pages -- --only <slug>`: baut ausschließlich einen Entwurf neu
  (inkl. Lead-Edits), aktualisiert nur dessen Manifest-Eintrag – die übrigen
  ~55 Entwürfe bleiben byteidentisch unangetastet.
- `publishSite.js`: `baueUndSchreibeEinzelnenEntwurf()` schreibt nur den
  einen `docs/<slug>/`-Ordner statt des kompletten `docs/`-Neuaufbaus (der
  volle Lauf löscht bisher `docs/` komplett – für einen Einzel-Fix unnötig
  riskant, währenddessen wären alle anderen Entwürfe offline).
- Wichtige Korrektur dabei: der volle Publish-Lauf berücksichtigte
  Lead-Edits bisher gar nicht (nur der lokale `npm run pages`-Lauf tat das) –
  jetzt für beide Pfade behoben, sonst hätte ein späterer Voll-Publish jede
  per `--only` veröffentlichte Anpassung wieder zurücksetzen können.
- `veroeffentlicheEntwurf(slug)`: Build → `git add`/`status`/`commit`/`push`
  über `execFile` (kein Shell-Interpreter, verhindert Command-Injection über
  Slug-Namen). Kein Commit ohne echte Änderung (leerer `git status`
  bricht vorher ab).
- `POST /intern/lead/:slug/veroeffentlichen` in `dashboardServer.js`, Button
  "Diesen Entwurf veröffentlichen" in `bearbeiten.html` mit Bestätigungsdialog
  und Live-URL-Anzeige bei Erfolg; Fehler (Merge-Konflikt, kein Internet)
  kommen als lesbare Meldung zurück, Server läuft danach normal weiter.

## Lead-Frische / Google-Places-Compliance (`src/leadFreshness.js`)

Unverändert: `fetchedAt`-Tracking, "stale" ab 30 Tagen, Dashboard-Warnung ab
25 Tagen (Reaktion auf die Google-Maps-Nutzungsbedingungen).

## Design-Preset-System (`src/designPresets.js`)

Unverändert seit PR #7: `getPresetVariant()`/`withDesignDefaults()`, 12
Küchen mit je einer "default"-Variante plus mind. einer A/B-Variante.
Geplante, aber noch NICHT umgesetzte Erweiterung: das im Chat besprochene
"Template"-Konzept (Bündel aus Hero + Mini-Icons + Trenner für Konsistenz
zwischen fotorealistischem und illustriertem Stil) sowie das generische
Ambient-Partikel-Modul (Rauch/Blasen/Funken je Küche) – beide warten auf
fertige Canva-Assets, bevor Claude Code sie umsetzt.

## Bekannter Teststand

Deutlich über 136 Tests seit PR #9/#10 (u.a. neue Tests für Upload-Endpoint,
Lead-Edits-Übersteuerung, Prompt-Validierung mit gemockten LLM-Antworten,
`--only`-Build-Granularität und die Veröffentlichungs-Route mit gemocktem
Git). Exakte aktuelle Zahl nicht verifiziert – vor dem nächsten Schritt
`npm test` laufen lassen.

## Rechtlich/Design-relevante Entscheidungen (unverändert gültig)

- Echte Google-Rezensionstexte werden nicht gespeichert/dargestellt (nur
  Gesamtnote); nur frei erfundene Beispiel-Lokale bekommen ausformulierte
  Test-Stimmen.
- Unaufgeforderte Werbe-E-Mails nur eingeschränkt zulässig – Dashboard bietet
  vorformuliertes Anschreiben zum Kopieren statt Massenversand.
- Öffentliche Startseite zeigt nur frei erfundene Beispiel-Lokale; echte
  Entwürfe erreichbar, aber unverlinkt.

## Offene Punkte / nächste Schritte laut Planungs-Chat

1. Griechisch und Syrisch/Türkisch brauchen noch eine wirklich eigenständige
   Hero-Signatur (Olivenzweig bzw. Minztee-Glas, Konzept steht).
2. Ambient-Partikel-Effekte pro Küche (Rauch/Blasen/Funken/Puder) – wartet
   auf Canva-Assets, danach ein generisches Modul via Claude Code.
3. Template-System (`TEMPLATES` in designPresets.js) für konsistente
   fotorealistische vs. illustrierte Seitenvarianten – noch nicht begonnen,
   wartet ebenfalls auf fertige Canva-Icon-Familien.
4. `csvImport.test.js`-Fehlerstatus aus dem ursprünglichen Rundown nicht
   erneut verifiziert.

## Hinweis zur Pflege dieses Dokuments

- Dieses Dokument wird von Perplexity bei Bedarf aktualisiert, wenn neue
  Projektstände besprochen werden.
- Für Änderungen an Code oder an der eigentlichen `README.md` ist weiterhin
  Claude Code der richtige Ausführungsweg (voller Dateizugriff, `npm test`
  Verifikation). Perplexity schreibt hier nur Status-Text, keinen
  Produktionscode.
