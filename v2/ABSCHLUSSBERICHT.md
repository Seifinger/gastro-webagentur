# Abschlussbericht v2-Pipeline

Stand: 22.09.2026, Branch `claude/gastro-v2-pipeline-01hf58`. Alle Stufen 0–8 wurden ohne
Rückfrage durchgearbeitet. Jede Entscheidung ist mit Begründung in
[`ENTSCHEIDUNGSLOG.md`](ENTSCHEIDUNGSLOG.md) festgehalten (E0.1–E8.6). Hier steht die
Zusammenfassung: was entstanden ist, was automatisch entschieden wurde, wo v2 von v1
abweicht und was ein Mensch noch tun muss.

## Ergebnis in Zahlen

| | |
|---|---|
| Küche×Stimmung-Kombinationen | 36 (12 Küchen × 3 Stimmungen) |
| Referenzen im Katalog | 101 (40 Refero-Styles, 61 reale Restaurant-Websites), alle analysiert |
| Designsysteme | 36 + 1 für das Agentur-Dashboard, je als JSON und Markdown |
| Gebaute v2-Seiten | 36/36, keine Gate-Abbrüche (WCAG AA, Hero-Varianten, Funktionsvertrag, Anti-Slop-Lint, Copy) |
| Design-Judge | 36/36 in Runde 1 bestanden, 34 mit 10,0, zwei mit 9,4 (Hero „karte“, siehe E5.5) |
| Vorher/Nachher | [`output/vergleich.md`](output/vergleich.md): alle 36, Desktop + Mobil. Mit denselben Judge-Regeln gemessen erreicht v1 im Mittel 6,0 (0/36 bestanden), v2 10,0 (36/36) |
| Tests | `npm test`: 501 von 501 grün, davon 94 neue v2-Tests in `test/v2-*.test.js` (vorher 407) |
| Eingriffe in v1 | einer: der ausdrücklich beauftragte Engine-Hook in `src/dashboardServer.js` (7 Zeilen) |

## Was entstanden ist

| Stufe | Dateien | Kurz |
|---|---|---|
| 0 Architektur | `v2/README.md`, Ordnerstruktur | 4+1-Stufenmodell, Verhältnis zu v1 |
| 1 Referenz | `referenzen/referenzkatalog.json`, `build/referenzAnalyse.js`, `build/referoSuche.js` | 2–3 Referenzen je Kombination, Analyse im echten Browser (Palette, Typo-Charakter, Spacing-Rhythmus, Asymmetrie, Motion) |
| 2 Designsystem | `build/designsystemGenerator.js`, `designsysteme/*.json/.md` | 18 Farbrollen mit Aufgabe, Typo-Skala ohne Inter/Roboto/system-ui, 8-px-Raster, Radius/Schatten/Motion, Hero-Varianten, verbotene Muster, Bild- und Sprachkanon |
| 3 Build | `build/siteBuilder.js`, `build/antiSlopLint.js`, `build/sektionen/*`, `build/stil.js` | liest nur das Designsystem; harte Gates; v1-Funktionen byte-gleich |
| 4 Medien | `assets-pipeline/mediaGenerator.js`, `medienCli.js` | Provider Platzhalter (lokal) und Replicate; eigene Fotos haben immer Vorrang; Badges |
| 5 Judge | `judge/designJudge.js`, `build/zyklus.js`, `build/cli.js` | Messung im Browser, bis zu 3 Korrekturrunden, Protokoll im Entscheidungslog |
| 6 Copy | `build/copyRefiner.js`, `COPY-PRINZIPIEN.md` | Regeln gegen KI-Formulierungen als Gate, optionaler Sprachmodell-Durchgang |
| 7 Anbindung | `integration/wirtAdapter.js`, `wirtServerV2.js`, `telegramBot.js`, `dashboardV2.js`, `TELEGRAM-SETUP.md` | Wirt-Dashboard im Hausstil, Engine-Umschalter, Telegram mit Knöpfen, E2E-Test |
| 8 Rollout | `output/sites/*`, `output/vergleich.md`, `build/vergleich.js`, dieser Bericht | alle 36 im vollen Zyklus, Vorher/Nachher, README |

Befehle: `npm run v2:build:all -- --judge`, `npm run v2:vergleich`, `npm run v2:wirt`,
`npm run v2:telegram` (vollständige Liste in [`README.md`](README.md)).

## Automatisch getroffene Entscheidungen (Auswahl)

Die wichtigsten, vollständig im Entscheidungslog:

- **Refero ohne MCP (E1.1).** Es war kein Refero-MCP verbunden. Genutzt wurde die öffentliche
  JSON-API von styles.refero.design (1322 Styles). Refero hat kaum Gastronomie. Deshalb
  bekommt jede Kombination einen Refero-Style als *Stimmungsspender* und 1–2 reale
  Restaurant-Websites als Gastro-Beleg (E1.2).
- **Inter und Co. raus (E2.1/E2.2).** v1 nutzt Inter als Textschrift. v2 verbietet
  zusätzlich zu Inter/Roboto/system-ui die typischen KI-Template-Schriften (Poppins,
  Montserrat, DM Sans, Space Grotesk …) und setzt je Stimmung ein eigenes Paar aus 45
  lokal ausgelieferten Familien.
- **Farben aus v1 plus Referenz (E2.3).** Die v1-Paletten bleiben die Basis. Die Referenzen
  korrigieren Sättigung und Akzentanteil. Kontraste werden automatisch nachgeschärft, bis
  alle 23 Paare AA erfüllen.
- **Sechs Hero-Aufbauten, je Stimmung mindestens drei (E2.6).** Die Wahl hängt am Seed wie
  in v1. Derselbe Lead ergibt also immer dieselbe Seite.
- **v1-Skript auslesen statt kopieren (E3.1).** Warenkorb, Reservierung, No-Show und
  API-Aufrufe sind zur Build-Zeit dasselbe Skript wie in v1. Ein Test prüft die
  Byte-Gleichheit.
- **Replicate als echter Medien-Provider (E4.2).** Bild und Video über eine API,
  Abrechnung pro Ergebnis, Modelle per Umgebungsvariable tauschbar.
- **Judge misst im Browser statt Pixel zu raten (E5.1).** Dazu gehört die Gegenprobe:
  dieselben Regeln auf eine v1-Seite angewandt.
- **Telegram-Verknüpfung per Einmal-Code, Long Polling, keine Migration (E7.6/E7.7).**
- **Wirt-Dashboard gethemt per Injektion (E7.2).** `public/wirt.html` bleibt unverändert.

## Abweichungen von v1

| Bereich | v1 | v2 | Warum |
|---|---|---|---|
| Schriften | Inter als Text, Display je Stimmung | eigenes Paar je Stimmung, Inter verboten | Inter ist das häufigste Merkmal generischer KI-Seiten |
| Fließtext | 15 px | 17–18 px, Zeilenlänge ≤ 90 Zeichen, Zeilenhöhe ≥ 1,4 | Lesbarkeit, Judge-Regel |
| Hero | ein Aufbau je Archetyp (Text auf Foto mit Verlauf) | 3–4 strukturell verschiedene Aufbauten je Stimmung, kein Text auf Foto mit Verlauf | „Text auf dunklem Foto“ ist das Standardmotiv von Templates |
| Abstände | frei gewählt | 8-px-Raster mit einem Halbschritt, geprüft | Rhythmus |
| Touch-Ziele | teils < 40 px (19 auf der Gegenprobe-Seite) | ≥ 40 px, vom Judge gemessen | Mobilbedienung |
| Texte | Katalogtexte | dieselben Texte, durch Copy-Regeln gefiltert (3 Floskeln bereinigt, E6.3) | Anti-Slop |
| Bilder | Stock mit Platzhalter-Hinweis | Vorrang eigen > KI > Stock > SVG, Badge je Herkunft | Transparenz, echte Häuser |
| Telegram | Text-Rückkanal, Chat-ID von Hand | Nachrichten mit Knöpfen, Verknüpfung per Code, Tagesübersicht | Bedienbarkeit |
| Bestellstatus | neu/bestätigt/abgeholt | zusätzlich „In Zubereitung“ und „Bereit“ (auf v1 abgebildet) | Küchenablauf |

Unverändert gegenüber v1: Datenhaltung (`data/betrieb/*.json`), alle Endpunkte des
Wirt-Servers, Kapazitäts- und Tischlogik, No-Show-Schutz, Wartezeit-Lernen, Speisekarten,
Seed-Determinismus, Veröffentlichung nach `docs/`.

## Was ein Mensch noch tun muss

### Schlüssel und Konten (in dieser Umgebung nicht vorhanden, deshalb nur gemockt getestet)

1. **Telegram:** Bot bei @BotFather anlegen, `TELEGRAM_BOT_TOKEN` (und optional
   `TELEGRAM_BOT_NAME`) in die `.env` eintragen, Dienst starten. Anleitung:
   [`integration/TELEGRAM-SETUP.md`](integration/TELEGRAM-SETUP.md). Einmal mit echtem Handy
   durchspielen: Code erzeugen → `/start CODE` → Testreservierung → Knopf „Bestätigen“.
2. **Replicate** (KI-Bilder/-Videos, optional): `REPLICATE_API_TOKEN` setzen, dann
   `npm run v2:build -- --kueche … --stimmung … --medien`. Der Provider ist gegen die
   dokumentierte API geschrieben, lief aber noch nie live. Beim ersten Lauf Kosten und
   Ergebnis prüfen.
3. **Anthropic** (Copy-Durchgang, optional): `ANTHROPIC_API_KEY` und `V2_COPY_LLM=1`. Ohne
   diese Werte gelten nur die Regeln, und die reichen für die aktuellen Katalogtexte.
4. **`V2_API_URL`**: Adresse des Wirt-Servers, damit aus dem Dashboard gebaute v2-Entwürfe
   echte Reservierungen annehmen. Ohne sie laufen die Formulare im Demo-Modus wie in v1.

### Referenzen nachprüfen

- **Alle 40 Refero-Referenzen** stammen aus der API und sind nicht von Hand auf der
  Website angesehen worden. Bitte vor allem diese 14 prüfen. Sie sind keine Restaurants
  und wurden als reine Stimmungsspender gewählt: Relief (griechisch/Taverne am Hafen),
  Michael Wandelmaier (griechisch/Athener Moderne), VALIENTE BRANDS (türkisch/Basar),
  Customer.io (türkisch/Bosporus-Nacht), Chantlings (syrisch/Gewürzbasar), Freshman
  (chinesisch/Shanghai-Nacht), Woven (chinesisch/Teehaus), Wise Design
  (thailändisch/Streetfood-Nacht), Aspelin Reitan (vietnamesisch/Indochine), Atoms
  (japanisch/Omakase), Kinfolk (japanisch/Washitsu), Slab (indisch/Maharadscha),
  Bang & Olufsen (asiatisch/Fusion minimal), Monocle (café/Wiener Kaffeehaus). Taugt
  einer nicht, reicht es, ihn in `referenzen/referenzkatalog.json` zu ersetzen und
  `npm run v2:build -- --kueche … --stimmung … --judge` laufen zu lassen. Designsystem
  und Seite entstehen dabei neu.
- **Zwei Restaurant-Analysen** liefen nur statisch (Browser blockiert):
  deltarestaurant.gr und speedboatbar.co.uk. Ihre Werte sind gröber.

### Gestaltung, die Regeln nicht erfassen

- **Fotos sind Stock.** Alle 36 Seiten zeigen Unsplash-Bilder aus der v1-Bibliothek. Die
  Seiten wirken erst dann wie ein echtes Haus, wenn eigene Fotos kommen. Der Weg dafür
  steht: im Chat liefern → `npm run v2:medien -- eintragen …` oder im Dashboard hochladen.
  Die Foto-Anleitung je Stimmung (Licht, Perspektive, Requisiten) steht im Designsystem und
  in der Bearbeiten-Ansicht.
- **Sichtprüfung der 36 Seiten** anhand von [`output/vergleich.md`](output/vergleich.md).
  Der Judge prüft Regeln, keinen Geschmack (E5.6).
- **Die Hero-Variante „karte“** (asiatisch/Marktstand, vietnamesisch/Indochine) hat bewusst ein
  kleines Titelbild und bekommt deshalb 9,4. Wem das zu zurückhaltend ist, der streicht
  „karte“ in `HERO_VARIANTEN` für diese Stimmung.
- **Wirt-Dashboard:** Die Zähl-Pillen oben rechts (z. B. „1 neue Reservierung“) behalten
  ihre v1-Warnfarbe, weil sie in wirt.html fest gesetzt ist. Die Titel-Emojis im
  Lead-Dashboard stammen aus v1 und blieben unangetastet.

### Entscheidungen, die bei dir liegen

1. **Wann v2 Standard wird.** Im Dashboard „Standard-Engine v2“ wählen oder
   `ENGINE_STANDARD=v2` setzen. Vorher einige echte Leads mit „v2 bauen“ ausprobieren.
2. **Veröffentlichen mit v2.** `npm run publish-site` baut weiterhin v1 nach `docs/`. Der
   Umbau (v2-Seiten der gewählten Leads nach `docs/<slug>/`, Schriften nach
   `docs/assets/fonts`) ist klein, verändert aber die öffentliche Seite. Deshalb ist er
   nicht ohne deine Anweisung passiert („v1 bleibt produktiv und unangetastet“).
3. **Wirt-Server öffentlich betreiben:** Die `/intern/…`- und `/v2/intern/…`-Routen sind wie in
   v1 nicht mit einem Token geschützt. Das ist lokal in Ordnung, aber nicht hinter einer
   öffentlichen Adresse (E7.10).

### Produktionsdaten

Die im Auftrag genannte `data/betriebe.json` gibt es nicht. Betriebsdaten liegen je
Betrieb in `data/betrieb/<slug>.json` (gitignored). In dieser Umgebung war das Verzeichnis
leer. Kein Test und keine Stufe hat echte Betriebe oder Reservierungen gelesen oder
verändert. Alle Tests arbeiten auf synthetischen `__test-…`-Betrieben und fiktiven
Test-Leads und räumen ihre Dateien wieder weg. Neue Felder sind optional und werden erst
geschrieben, wenn ein Wirt eine v2-Funktion nutzt (E7.6).

## Hinweis zu CLAUDE.md

Die `CLAUDE.md` im Repository beschreibt eine frühere Arbeitsweise („erste Phase nur
Planung“, „nach jeder Stage auf Freigabe warten“). Dieser Auftrag hat das ausdrücklich
ersetzt („ohne Rückfragen und ohne auf Freigaben zu warten“). Die Datei selbst wurde
nicht geändert. Wenn v2 der neue Weg ist, sollte sie angepasst werden.
