# v2 – Website-Pipeline mit Referenz, Designsystem, Build, Judge und Integration

v2 ist eine zweite Generierungs-Pipeline für die Landing-Pages der Agentur. Sie
läuft **parallel** zu v1 (`src/`) und ersetzt nichts, solange niemand es
ausdrücklich umstellt. v1 bleibt die produktive Standard-Engine.

Der Unterschied zu v1 ist nicht in erster Linie das Aussehen, sondern der Weg
dorthin: In v1 entsteht eine Seite in einem Durchgang aus Stimmung + Preset.
In v2 wird **keine Seite mehr in einem Schuss gebaut**. Jede Seite durchläuft
vier Stufen plus eine fünfte, die sie an die echten Funktionen anschließt.

```
 Referenz ──► Designsystem ──► Build ──► Judge ──┐
    ▲                             ▲              │ Korrekturliste (≤ 5 Punkte,
    │                             └──────────────┘ max. 3 Runden)
    │                                            │
    │                                            ▼
    └── v2/referenzen/                     Integration
                                    (Wirt-Dashboard, Nutzer-Dashboard, Telegram)
```

## Die Stufen

| Stufe | Ordner / Datei | Was passiert | Was sie erzwingt |
|---|---|---|---|
| 1. Referenz | `referenzen/referenzkatalog.json`, `build/referenzAnalyse.js` | 2–3 reale Websites je Küche × Stimmung, deren Farben, Schriftcharakter, Abstände, Asymmetrie und Bewegung maschinell ausgelesen werden | Kein Designwert ohne Herkunft |
| 2. Designsystem | `build/designsystemGenerator.js` → `designsysteme/*.json` + `*.md` | Aus Referenzanalyse + Archetyp/Atmosphäre aus `src/stimmungen.js` entsteht ein vollständiges Designsystem je Kombination | Farben mit Aufgabe, 8px-Raster, keine Inter/Roboto/system-ui, Liste verbotener Muster |
| 3. Build | `build/siteBuilder.js`, `build/antiSlopLint.js` | Rendert die Seite **nur** aus dem Designsystem-Dokument | WCAG-AA, ≥ 3 strukturell verschiedene Hero-Varianten je Stimmung, Anti-Slop-Lint – sonst bricht der Build ab |
| 4. Judge | `judge/designJudge.js` | Screenshot per Playwright, Bewertung von Farbdisziplin, Typo-Hierarchie, Rhythmus, Bildintegration, verbotenen Mustern | Bei Durchfallen gehen konkrete Korrekturen zurück an den Build, maximal 3 Runden |
| +1. Integration | `integration/` | Anbindung an `src/wirtServer.js`, `src/dashboardServer.js`, Telegram | Reservierung, Bestellung, No-Show-Schutz funktionieren exakt wie in v1 |

Quer dazu:

- **Medien** (`assets-pipeline/mediaGenerator.js`): austauschbare Provider für
  Bild/Video. Eigene Fotos haben immer Vorrang vor KI-Material, KI vor
  Stock/Platzhalter. Jedes Bild trägt ein Badge (`eigenes Foto` /
  `KI-generiert` / `Platzhalter`).
- **Copy** (`build/copyRefiner.js`, `COPY-PRINZIPIEN.md`): Jeder Text läuft vor
  dem Build durch einen Filter gegen typische KI-Formulierungen.

## Befehle

```bash
npm run v2:referenzen                                  # Referenzanalyse für alle Katalog-URLs
npm run v2:designsysteme                               # alle 36 Designsysteme neu erzeugen
npm run v2:build -- --kueche italienisch --stimmung trattoria --judge
npm run v2:build:all                                   # alle 36 durch den vollen Zyklus
npm run v2:medien -- zeigen --slug <slug>             # Bildherkunft je Bildplatz (eigen/KI/Platzhalter)
npm run v2:vergleich                                   # v1↔v2-Screenshots aller 36 → output/vergleich.md
npm run v2:wirt -- --betrieb <slug> --kueche bayerisch --stimmung wirtshaus --telegram
npm run v2:telegram                                    # Telegram-Bot als eigener Dienst
npm run v2:dashboard-design                            # Token-Set des Agentur-Dashboards neu erzeugen
```

Weiterführend: [`integration/TELEGRAM-SETUP.md`](integration/TELEGRAM-SETUP.md),
[`COPY-PRINZIPIEN.md`](COPY-PRINZIPIEN.md), [`output/vergleich.md`](output/vergleich.md),
[`ABSCHLUSSBERICHT.md`](ABSCHLUSSBERICHT.md).

## Verhältnis zu v1

| | v1 (`src/`) | v2 (`v2/`) |
|---|---|---|
| Status | produktiv, Standard | parallel, opt-in |
| Gestaltungsquelle | `stimmungen.js` + `designPresets.js` | Designsystem-Dokument je Kombination (abgeleitet aus v1-Stimmung **und** Referenzen) |
| Qualitätssicherung | Tests nach dem Bau | Gates im Bau + Judge-Schleife |
| Funktionen (Warenkorb, Reservierung, No-Show) | `PAGE_SCRIPT` in `landingPageGenerator.js` | **dasselbe Skript**, zur Build-Zeit 1:1 aus v1 gelesen |
| Server | `wirtServer.js`, `dashboardServer.js` | nutzt dieselben Server; v2 legt nur einen Adapter bzw. eine dünne Hülle darum |
| Daten | `data/betrieb/*.json` usw. | dieselben Dateien, nur additive optionale Felder |

v2 **liest** aus v1 (Stimmungen, Speisekarten, Bild-IDs, gezeichnete Icons,
Formular-Skript), schreibt aber nie in v1-Quelldateien. Die einzige Stelle, an
der v1-Code eine Zeile dazubekommt, ist der ausdrücklich beauftragte
Engine-Umschalter im Nutzer-Dashboard (`src/dashboardServer.js`), und auch der
ist so gebaut, dass ohne v2-Auswahl alles exakt wie vorher läuft.

Alle Zufallsentscheidungen hängen wie in v1 am Seed des Leads: derselbe Lead
ergibt immer dieselbe Seite.

Jede autonome Entscheidung steht in [`ENTSCHEIDUNGSLOG.md`](ENTSCHEIDUNGSLOG.md).

## Art-Direction: Briefing → Creative Direction → Komposition

Zweiter Baupfad für Kundenseiten mit echtem Gespräch (Details:
[`ART-DIRECTION-BERICHT.md`](ART-DIRECTION-BERICHT.md), Audit: [`ART-DIRECTION-AUDIT.md`](ART-DIRECTION-AUDIT.md)).

```bash
npm run v2:briefing -- ableiten --slug <slug> --kueche <k> --stimmung <s> --name "…"   # Briefing aus Lead-Daten
npm run v2:briefing -- aus-chat --slug <slug> --kueche <k> --name "…" --text "…" --dateien a.jpg,b.jpg
npm run v2:pilot                         # alle Briefings mit Creative Direction bauen → output/piloten/
npm run v2:art-review -- --runde <n>     # Screenshot-Review mit Zuständen → art-direction/piloten/
npm run v2:tauschprobe                   # Gestaltung A + Inhalte B
npm run v2:art-audit                     # Struktur-/Bild-/Überschriften-Wiederholungen der 36 Seiten
```

Im Agentur-Dashboard: `/v2/creative` (Briefing mit Status je Feld, Creative Direction, Bildplan, Editor).
