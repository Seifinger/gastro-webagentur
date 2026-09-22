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

## Stage 1 – Referenzsystem

- **E1.1 · Refero über die öffentliche JSON-API statt MCP.** Kein Refero-MCP-Server
  verbunden. `styles.refero.design/api/styles?limit=…&page=…` liefert je Style Farben,
  Schriften und einen Leitsatz („northStar“). Der Gesamtkatalog (1.322 Styles) wurde
  geladen und per Volltext durchsucht; `v2/build/referoSuche.js` macht das
  wiederholbar. Befund wie schon in DESIGN.md 5.0: Refero ist überwiegend SaaS. Echte
  Gastro-/Food-Styles gibt es nur eine Handvoll (Amrit Palace, Hungry Tiger, Limón,
  Roberta's Pizza, Lamanna, GRAZA, Assembly/Redbrick/Escape Coffee, Fallen Grape …).
- **E1.2 · Mischung pro Kombination: 1 Refero-Style + 1–2 reale Restaurant-Websites.**
  Refero liefert die Stimmung (Leitsatz, Palette), die Restaurant-Site die Gastro-
  Domäne (Reservierung, Karte, Bildsprache). Wo Refero keinen Gastro-Style hat, wurde
  der nächstliegende Stimmungs-Style gewählt (z. B. „Embers on saddle leather“ für die
  Kellerstube) und im Katalog als solcher begründet. 36 Kombinationen, 101 Referenzen,
  jede mit „übernehmen“ und „bewusst nicht übernehmen“.
- **E1.3 · Restaurant-Auswahl.** Kriterien: echter Betrieb der jeweiligen Küche,
  eigenständiger Web-Auftritt (keine Lieferplattform), erreichbar. Recherche per
  Websuche plus eigene Kenntnis von Award-/Guide-Häusern (Dishoom, Mikla, Hakkasan,
  Ottolenghi, Café Central …). Neun Kandidaten fielen bei der Erreichbarkeitsprüfung
  heraus (u. a. tim-raue.de, ciya.com.tr, xulondon.com, gymkhanalondon.com mit 429).
- **E1.4 · Referenzanalyse im echten Browser.** Statisches CSS-Zählen war durch
  Framework-CSS (Icon-Fonts, WordPress-Blöcke) verrauscht. `referenzAnalyse.js` rendert
  deshalb per Playwright/Chromium und misst berechnete Styles (Flächen nach Fläche
  gewichtet, Knopffarben, Schrift von h1/h2/p, Abstände, Rasterbreiten, laufende
  Animationen). Statisch bleibt als Rückfall. Seiten hinter Cookie-Wall liefern nur
  Browser-Standardwerte – das wird erkannt und nicht als Referenz gezählt.
- **E1.5 · Browser hinter dem TLS-Proxy der Sandbox.** Chromium vertraut per
  `--ignore-certificate-errors-spki-list` genau dem Proxy-CA (SPKI-Pin), die
  Zertifikatsprüfung bleibt für alles andere aktiv. Außerhalb der Sandbox greift das
  nur, wenn `V2_PROXY_CA` gesetzt ist.

## Stage 2 – Designsystem-Generator

- **E2.1 · Eigenes Schriftpaar je Stimmung, keine Inter mehr als Textschrift.** v1 setzt
  Inter unter alle 36 Welten – genau das macht die Seiten verwechselbar. v2 wählt je
  Stimmung Anzeige- *und* Textschrift (45 Familien, alle OFL, lokal gehostet). Leitlinie
  der Auswahl: die Schrift erzählt vom Ort, nicht vom Trend – Vollkorn (Wirtshaus,
  „Werkserife“), Bodoni Moda (Osteria Notte, Parma), Old Standard TT (Kaffeehaus-Zeitung),
  Amiri (Damaszener Hof, Naskh-Buchantiqua), Shippori/Zen Old Mincho (Omakase/Washitsu),
  Big Shoulders/Barlow Condensed für Markt- und Grillschilder. Die Referenzanalyse
  bestätigt oder widerspricht der Schriftart; das steht je Dokument unter „Herleitung“.
- **E2.2 · Verbotene Schriften über Inter/Roboto/system-ui hinaus.** Ebenfalls
  ausgeschlossen: Montserrat, Poppins, DM Sans, Manrope, Plus Jakarta Sans, Space
  Grotesk, Syne, Satoshi, Outfit, Clash/General Sans, Open Sans, Lato, Raleway. Grund:
  Sie sind die Standardausgabe generierter Landing-Pages. Damit entfallen auch die vier
  Montserrat-Stimmungen aus DESIGN.md (⚠) – dort stehen jetzt Tenor Sans (Athener
  Moderne), Poiret One (Shanghai Nacht), Antonio (Izakaya), Saira Extra Condensed (Neon).
- **E2.3 · Farben: v1-Palette als Basis, Referenzen als Korrektiv.** Die v1-Paletten sind
  bereits gegen 288 Farbpaare geprüft und tragen die Küchenidentität. v2 verschiebt sie
  nur: Temperatur der Referenzen tönt die Neutralen, gedeckte Referenzen dämpfen den
  Akzent (×0,8/0,9 Sättigung), ein Referenz-Akzent derselben Farbfamilie (≤ 35° Farbton-
  abstand) zieht den eigenen um 20 %. Danach werden alle 23 Kontrastpaare gesichert,
  inklusive 3:1 Knopf-gegen-Grund (WCAG 1.4.11) – das fing den Gewürzmarkt-Orange ab.
- **E2.4 · Jede Farbe hat genau eine Aufgabe.** 18 Rollen (grund, flaeche, flaecheTief,
  text, textLeise, linie, linieStark, akzent, akzentTief, aufAkzent, akzentText, signal,
  signalText, tint, aufTint, aufTintLeise, signalAufTint, fehler). Der Akzent ist
  ausschließlich Handlung (Knöpfe, aktive Zustände, max. 8 % Fläche). Gold („signal“)
  ist nie Fläche.
- **E2.5 · 8px-Raster mit genau einem Halbschritt (4px).** Kleine Marken (Badges,
  Mengenknöpfe) brauchen 4px; alles andere liegt auf 8. Sektionsabstand aus der Dichte
  der Referenzen (luftig 128 / ausgewogen 96 / dicht 80px).
- **E2.6 · Sechs Hero-Aufbauten, je Archetyp vier erlaubt.** spalte-bild, tafel, karte,
  typo, passepartout, streifen – strukturell verschieden (eigene `struktur`-Signatur).
  Kein Aufbau setzt Text auf ein Foto mit Verlaufsschleier; die Tafel ist deckend.
  Symmetrische Referenzen schieben die versetzten Aufbauten nach hinten.
- **E2.7 · Schatten nur im traditionellen Haus.** Dunkle Häuser (Schatten unsichtbar) und
  helle Häuser (flach) arbeiten mit Kanten. „Weicher Schatten auf jeder Karte“ gilt als
  Template-Merkmal.
- **E2.8 · Bild- und Sprachkanon gleich mit im Dokument.** Damit jedes Designsystem ein
  vollständiges Dokument ist, schreibt der Generator schon in Stage 2 Bildkanon
  (Stage 4 nutzt ihn für Prompts) und Sprachkanon (Stage 6 für den Copy-Refiner) mit.
- **E2.9 · Designsysteme sind generiert, nicht handgepflegt.** Ein Test prüft, dass die
  eingecheckten JSON-Dateien exakt der Generatorausgabe entsprechen.
