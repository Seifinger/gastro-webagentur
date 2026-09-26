# gastro-webagentur

Lead-Generierung für die Restaurant-Web-Agentur: findet Gaststätten in einer Region, die (noch) keine Website bei Google hinterlegt haben – als priorisierte Liste für den persönlichen Vor-Ort-Pitch.

## Was macht das Skript?

Es durchsucht über die **Google Places API** die konfigurierten Orte (`data/regions.json`, aktuell: Mühldorf am Inn, Altötting, Tüßling, Kraiburg am Inn) nach Restaurants und speichert das Ergebnis als CSV-Datei unter `data/output/`.

Für jedes gefundene Restaurant prüft das Skript zusätzlich automatisch:
- Hat es **gar keine** Website? → automatisch höchste Priorität.
- Falls es eine Website hat: Wird dort tatsächlich **online bestellt oder reserviert** (z. B. über GloriaFood, Lieferando, OpenTable, Quandoo, ...)? Ist sie **mobilfreundlich**? Wirkt sie anhand der Jahreszahl im Footer **veraltet**? Läuft sie über **HTTPS**?

Aus diesen Merkmalen berechnet das Skript einen **Score von 0–100** (siehe unten) und sortiert alle Leads danach – die dringlichsten Fälle stehen ganz oben in der CSV.

> **Wichtiger Hinweis:** Die Nutzungsbedingungen der Google Maps Platform schränken ein, wie lange Ortsdaten gespeichert und wofür sie verwendet werden dürfen (u. a. kein Aufbau von Mailinglisten für unaufgeforderte Werbung). Nutze die exportierten Listen deshalb ausschließlich als **interne Recherche-/Priorisierungshilfe** für den persönlichen Besuch vor Ort – nicht für Massen-Mailings oder die Weitergabe der Rohdaten an Dritte.

## Voraussetzungen

Node.js ist in dieser Entwicklungsumgebung bereits installiert – du musst hier nichts extra einrichten. Was du noch brauchst, ist ein **Google Cloud API-Key**. Die folgenden Schritte führen dich einmalig durch die Einrichtung.

## Schritt-für-Schritt-Anleitung

### 1. Google Cloud Projekt anlegen
1. Öffne [console.cloud.google.com](https://console.cloud.google.com) und logge dich mit deinem Google-Konto ein.
2. Falls du zum ersten Mal hier bist, akzeptiere die Nutzungsbedingungen.
3. Oben links auf das Projekt-Dropdown klicken → **"Neues Projekt"**.
4. Name vergeben, z. B. `gastro-webagentur`, dann **"Erstellen"**.

### 2. Places API (New) aktivieren
1. Stelle sicher, dass oben links dein neues Projekt ausgewählt ist.
2. Im Menü links: **APIs & Dienste → Bibliothek**.
3. Suche nach **"Places API (New)"** und klicke **"Aktivieren"**.
4. Google verlangt für die Nutzung ein verknüpftes **Rechnungskonto** (Kreditkarte hinterlegen) – auch für den kostenlosen Bereich. Du bekommst monatlich $200 Guthaben geschenkt; für unsere Testsuchen (ein paar hundert Anfragen) fallen keine Kosten an. Folge dem Dialog "Abrechnung aktivieren", falls er erscheint.

### 3. API-Key erstellen
1. Im Menü links: **APIs & Dienste → Anmeldedaten**.
2. **"+ Anmeldedaten erstellen" → "API-Schlüssel"**.
3. Der Key wird sofort angezeigt – kopiere ihn.
4. Klicke auf den neuen Key, um ihn zu bearbeiten, und schränke ihn unter **"API-Einschränkungen"** auf **"Places API (New)"** ein (Sicherheit: der Key kann dann für nichts anderes missbraucht werden, falls er mal irgendwo landet, wo er nicht hingehört).

### 4. API-Key im Projekt hinterlegen
1. Kopiere `.env.example` zu einer neuen Datei `.env` im Projektordner.
2. Trage dort deinen Key ein:
   ```
   GOOGLE_PLACES_API_KEY=dein_echter_key
   ```
3. Die `.env`-Datei wird **nicht** mit hochgeladen (steht in `.gitignore`) – der Key bleibt privat.

### 5. Abhängigkeiten installieren
```bash
npm install
```

### 6. Skript starten
Alle konfigurierten Orte durchsuchen:
```bash
npm start
```

Nur einen bestimmten Ort durchsuchen (praktisch für einen schnellen Test):
```bash
node src/index.js --region "Mühldorf am Inn" --limit 5
```

- `--region` – sucht nur in dem angegebenen Ort statt in allen aus `data/regions.json`.
- `--limit` – begrenzt die Ergebnisliste auf die ersten N Leads (nach Priorisierung).
- `--pages` – Anzahl der Ergebnisseiten je Ort (Standard: 1 = bis zu 20 Treffer; max. sinnvoll: 3 = bis zu 60 Treffer, kostet aber mehr Anfragen).
- `--skip-website-check` – überspringt die Website-Prüfung (schneller, aber ohne Score-Differenzierung bei bestehenden Websites).

Die Website-Prüfung ruft für jedes Restaurant mit hinterlegter Website deren Seite auf (5 gleichzeitig) – das dauert bei vielen Treffern spürbar länger als die reine Google-Suche (grob 1 Sekunde pro Website).

> **Hinweis zu Cloud-Sessions:** Läuft dieses Skript in einer Umgebung mit eingeschränktem Netzwerkzugriff (z. B. manche Claude-Code-Cloud-Sessions mit Allowlist-Richtlinie), können Website-Abrufe mit "Host not in allowlist" fehlschlagen – das ist keine echte Nichterreichbarkeit der Restaurant-Website, sondern eine Einschränkung der jeweiligen Session. Auf deinem eigenen Rechner (normales Heim-/Büro-Internet) tritt das nicht auf.

### 7. Ergebnis ansehen
Nach dem Lauf findest du für jeden Ort eine CSV-Datei unter `data/output/`, z. B. `leads-mühldorf-am-inn-2026-09-17.csv`. Öffne sie in Excel/Numbers/Google Sheets. Spalten:

| Spalte | Bedeutung |
|---|---|
| `name` | Name des Restaurants |
| `adresse` | Adresse laut Google |
| `telefon` | Telefonnummer (falls hinterlegt) |
| `website` | Website-URL (falls vorhanden) |
| `hatWebsite` | `true`/`false` |
| `score` | 0–100, siehe Scoring-System unten – **danach ist die Liste sortiert** |
| `priorität` | Lesbares Label: "Sehr hoch", "Hoch", "Mittel", "Niedrig", oder "Zu prüfen" |
| `websiteErreichbar` | `true`/`false` – ob die Website beim Check erreichbar war |
| `hatBestellfunktion` | `true`/`false` – Bestellhinweis auf der Seite gefunden |
| `hatReservierungsfunktion` | `true`/`false` – Reservierungshinweis auf der Seite gefunden |
| `mobilFreundlich` | `true`/`false` – Viewport-Tag für mobile Darstellung gefunden |
| `wirktVeraltet` | `true`/`false` – alte Jahreszahl (© ...) im Footer gefunden |
| `rating` | Google-Bewertung |
| `anzahlBewertungen` | Anzahl Bewertungen |
| `placeId` | Interne Google-ID (für Debugging) |
| `ort` | Suchregion |

Die Liste ist automatisch nach `score` absteigend sortiert – ganz oben stehen deine heißesten Leads für Phase 3 (Vor-Ort-Pitch).

## Scoring-System

**Keine Website hinterlegt → immer Score 100** ("Sehr hoch (keine Website)"). Das ist der stärkste Pitch-Fall.

**Website vorhanden** → Start bei 0 Punkten, dann Minuspunkte je fehlendem Merkmal:

| Merkmal fehlt | Punkte |
|---|---|
| Keine Bestellfunktion erkannt | +25 |
| Keine Reservierungsfunktion erkannt | +20 |
| Nicht mobilfreundlich | +25 |
| Wirkt veraltet (alte Jahreszahl im Footer) | +20 |
| Kein HTTPS | +10 |

(Maximal 100 Punkte, wenn eine bestehende Website praktisch nichts davon bietet.)

| Score | Priorität |
|---|---|
| 80–100 | Sehr hoch |
| 50–79 | Hoch |
| 25–49 | Mittel |
| 0–24 | Niedrig |

War die Website beim Check nicht erreichbar (Timeout, Fehler, Seite offline), bekommt der Lead die Priorität **"Zu prüfen"** statt eines Scores – das kann an einer echten toten Website liegen (dann eigentlich ein sehr guter Lead!) oder nur an einem Netzwerkproblem. Schau dir diese Fälle manuell an.

Die Erkennung von Bestell-/Reservierungsfunktionen basiert auf gängigen Stichwörtern und bekannten Anbietern (GloriaFood, Lieferando, OpenTable, Quandoo, Resmio, ...) im HTML-Text der Seite – sie ersetzt keine manuelle Prüfung, gibt dir aber eine gute erste Sortierung. Die Gewichtungen stehen zentral in `src/scoring.js` und lassen sich dort leicht anpassen.

## Dashboard (lokale Übersicht im Browser)

Statt die CSV-Dateien einzeln in Excel zu öffnen, gibt es ein kleines lokales Dashboard, das alle bisher gesammelten Leads aus `data/output/` in einer sortier- und filterbaren Tabelle anzeigt.

```bash
npm run dashboard
```

Danach im Browser öffnen: **http://localhost:3000**

Funktionen:
- Kennzahlen oben (Leads gesamt, "Sehr hoch"-Priorität, ohne Website, erstellte Entwürfe)
- Tabelle sortierbar per Klick auf eine Spaltenüberschrift (Standard: nach Score)
- Filter nach Ort und Priorität, Suchfeld nach Name
- Website-Spalte verlinkt direkt zur jeweiligen Seite
- **Entwurf-Spalte** öffnet die generierte Landingpage des Restaurants (siehe nächster Abschnitt) – praktisch beim Termin: Lead heraussuchen, „ansehen" klicken, dem Wirt zeigen
- **Resonanz-Spalte** zeigt, ob der Wirt den verschickten Entwurf geöffnet hat (nur mit eingerichtetem Collector, siehe „Resonanz" weiter unten)

Das Dashboard liest beim Aufruf einfach die vorhandenen CSV-Dateien neu ein – lass es also nach einem neuen `npm start`-Lauf laufen, um aktuelle Daten zu sehen (Browser-Seite neu laden reicht, der Server muss nicht neu gestartet werden). Es braucht keinen API-Key und läuft komplett offline auf deinem Rechner.

## Landing-Page-Entwürfe erzeugen

Für den Pitch lässt sich zu jedem Lead automatisch eine fertige Beispiel-Website erzeugen – mit Speisekarte, Online-Reservierung und Abholbestellung:

```bash
npm run pages
```

Die Seiten landen unter `data/landingpages/`. Es gibt zwei Wege, sie anzusehen:

- **Über das Dashboard** (empfohlen): `npm run dashboard` starten und in der Spalte „Entwurf" auf „ansehen" klicken. Der Server liefert die Entwürfe unter `/entwuerfe/` gleich mit aus.
- **Direkt im Dateisystem**: `data/landingpages/index.html` im Browser öffnen – eine Übersicht mit Vorschaubildern, von dort geht es zu jedem einzelnen Entwurf.

Welcher Lead zu welchem Entwurf gehört, hält der Generator in `data/landingpages/entwuerfe.json` fest; das Dashboard liest diese Datei bei jedem Aufruf neu. Nach einem neuen `npm run pages` genügt es also, die Dashboard-Seite neu zu laden. Am selben Eintrag hängt außerdem, mit welcher Engine-Fassung der Entwurf zuletzt wirklich *veröffentlicht* wurde (siehe unten).

### Welche Kundenseite steht noch auf dem alten Stand?

```bash
npm run engine-status
```

Jede erzeugte Seite trägt seit dem Umbau der Template-Engine einen Marker im
`<head>` (`<meta name="engine-version" content="2">` plus den Archetyp). Seiten
unter `docs/`, die vor dem Umbau veröffentlicht wurden, haben ihn nicht – sie
zählen als Fassung 1. `npm run engine-status` listet alle veröffentlichten
Ordner mit Fassung, Archetyp und Datum der letzten Veröffentlichung und nennt
für die alten gleich den passenden Vorschau-Befehl.

Wichtig: Das ist eine reine Buchführung, kein zweiter Renderpfad. Die drei
Archetypen `traditionell`/`abend`/`hell` erzeugen nach dem Umbau bis aufs
Zeichen dieselbe Seite wie vorher; alles Neue (Magazin-Raster, größere
Typografie, zusätzliche Bewegung, der kräftigere `accentBold`) hängt an einem
Preset, das es ausdrücklich anfordert, und die automatische Stimmungswahl
zieht weiterhin nur aus den drei Grund-Archetypen. Ein Sammel-Lauf stellt also
niemanden um – trotzdem gilt für den Übergang: lieber einzeln mit
`--only <slug>` veröffentlichen, nach einem Blick in `npm run preview`.

Optionen:
```bash
npm run pages -- --region "Altötting"        # nur ein Ort
npm run pages -- --min-score 80              # nur die dringendsten Fälle
npm run pages -- --limit 10                  # die Top 10 nach Score
npm run pages -- --email info@restaurant.de  # Bestellungen/Reservierungen per E-Mail versendbar machen
npm run pages -- --cuisine japanisch         # Küche vorgeben (siehe unten)
```

### Aufbau der Seite

Die Reihenfolge folgt dem Bestellweg, nicht dem Erzählbedürfnis des Wirts:

1. **Hero** – im ersten Bildschirm auf dem Handy stehen ohne Scrollen: Hintergrundbild, Konzept („Holzofenpizza & frische Pasta"), Ort, Name, die echte Google-Bewertung direkt unter der Überschrift und eine hyper-lokale Zeile („… – direkt am Stadtplatz in Tüßling.").
2. **USP-Leiste** – drei kurze Badges statt Fließtext, je nach Küche z. B. „Heiß aus dem Steinofen" oder „Abholung in 20 Minuten".
3. **Unsere Highlights** – bebilderter Auszug aus der Karte (3, 4 oder 6 Gerichte), jedes direkt vorbestellbar, dazu der Ablauf der Abholung in drei Schritten.
4. **Ganze Speisekarte** als aufklappbares Akkordeon, direkt im HTML statt als PDF – auf dem Handy lesbar ohne Zoomen und für Google indexierbar. Jedes Gericht ist bestellbar.
5. **Drei Bildplätze** für die eigenen Fotos des Wirts: Außenansicht, Team hinter der Theke, Bestseller-Gericht. Jeder Platz ist beschriftet und als Platzhalter markiert – der Entwurf ist damit gleichzeitig die Foto-Aufgabenliste.
6. **Reservierung**, **Kontakt & Anfahrt** (Telefon als Direktwahl-Link, Adresse mit Route-planen-Link).

Dazu auf dem Handy eine **feste Aktionsleiste am unteren Rand** mit „Bestellen" und „Reservieren", die immer sichtbar bleibt. „Bestellen" springt bei leerem Warenkorb zur Karte und zeigt sonst die aktuelle Summe.

### Drei Stimmungen je Küche

Jede der zwölf Küchen hat drei ausgearbeitete Gestaltungswelten. Vorher teilten sich alle zwölf nur drei Themes – Griechisch lief auf demselben Trattoria-Theme wie Italienisch, Türkisch auf dem dunklen Neo-Asian. Speisekarte und Hero-Signatur waren küchenspezifisch, die Farbwelt nicht, und genau das fällt beim Wirt auf: Sein Lokal sieht aus wie das italienische zwei Straßen weiter.

Die drei Stimmungen folgen überall denselben Archetypen. Das ist auch die Frage, die man dem Wirt stellen kann: **traditionell, abendlich oder hell – was ist Ihr Haus?**

| Küche | Traditionell | Abend | Hell & modern |
|---|---|---|---|
| Bayerisch | Wirtshaus | Kellerstube | Biergarten |
| Italienisch | Trattoria | Osteria Notte | Costiera |
| Griechisch | Taverne am Hafen | Athener Moderne | Olivenhain |
| Türkisch | Basar | Bosporus bei Nacht | Anatolische Erde |
| Syrisch | Damaszener Hof | Gewürzbasar | Levante Modern |
| Chinesisch | Rote Laterne | Shanghai Nacht | Teehaus |
| Thailändisch | Orchidee | Streetfood Nacht | Andamanen |
| Vietnamesisch | Indochine | Hanoi Nacht | Straßenküche |
| Japanisch | Izakaya | Omakase | Washitsu |
| Indisch | Gewürzmarkt | Maharadscha | Südindisch hell |
| Asiatisch | Marktstand | Neon | Fusion Minimal |
| Café | Wiener Kaffeehaus | Konditorei | Third Wave |

Der Archetyp trägt das **Layout** (Reihenfolge der Abschnitte, ob Reservierung oder Abholung vorn steht, ob die Kopfzeile mitscrollt) – einmal definiert in `designPresets.js` und von allen Küchen genutzt. Die Küche trägt **Farbe, Schrift und Bildauswahl**: Die sechs Hero-Aufnahmen einer Küche teilen sich überschneidungsfrei auf die drei Stimmungen auf, dazu je ein eigenes Interieurbild.

Der Archetyp legt dabei *nicht* fest, ob eine Welt hell oder dunkel ist. Ein Izakaya ist traditionell und trotzdem dunkel, eine Konditorei abendlich und trotzdem hell – die Küche entscheidet.

Die **Hero-Signatur bleibt über alle drei Stimmungen gleich**: Sie ist die Identität der Küche, nicht die der Stimmung.

Ohne eigene Wahl entscheidet der Seed des Leads, welche der drei Welten ein Lokal bekommt – zwei Nachbarlokale derselben Küche wirken damit von selbst verschieden. Im Dashboard lässt sich die Stimmung je Lead von Hand setzen (Spalte **Stimmung**, gespeichert in `data/stimmungen.json`); der Entwurf übernimmt sie beim nächsten Bauen. Wird später die Küche umgestellt, verfällt die dann unpassende Stimmung automatisch.

Ein Test prüft die Lesbarkeit aller 36 Welten rechnerisch – 288 Farbpaarungen, die auf der Seite wirklich vorkommen. Beim ersten Lauf fielen 16 durch, meist weiße Schrift auf zu hellen Akzentflächen.

### Schriften der Stimmungen

Sechs Anzeigeschriften geben den 36 Welten Bandbreite, dazu Inter für den Fließtext überall:

| Schrift | Anmutung | Zum Beispiel |
|---|---|---|
| **Playfair Display** | eleganter Serifenkontrast | Trattoria, Taverne am Hafen |
| **Merriweather** | bodenständige Serife | Wirtshaus, Anatolische Erde |
| **Cormorant Garamond** | fein und luftig | Olivenhain, Washitsu, Teehaus |
| **DM Serif Display** | hoher Kontrast, abendlich | Omakase, Maharadscha, Osteria Notte |
| **Montserrat** | geometrische Groteske | Athener Moderne, Neon |
| **Oswald** | schmal, Markt und Straße | Basar, Gewürzmarkt, Streetfood Nacht |

Alle liegen lokal (`fontLibrary.js` lädt sie einmalig herunter) – eingebundene Web-Schriften würden die Entwürfe offline unbrauchbar machen und bei jedem Aufruf Googles Server kontaktieren. Je Anzeigefamilie gibt es nur einen Schnitt: Jeder weitere wöge in jedem Entwurf mit, auch wo er nie zum Einsatz kommt. Pro Seite überträgt der Browser Inter plus die eine tatsächlich benutzte Anzeigeschrift.

Die Zuordnung hängt fest am Lead: derselbe Lead ergibt immer denselben Entwurf.

### Designsystem: die Handschrift eines Archetyps

Der Archetyp trägt nicht nur das Layout, sondern seit einem gezielten
Anti-Slop-Umbau auch eine eigene **Handschrift** (`src/styles/handschrift.css.js`):
ein einziger starker Bewegungsmoment statt Gleichverteilung, begründete
Asymmetrie statt Mittelachse und Dreierraster, und gezeichnete Zeichen
(`src/signaturIcons.js`) statt Emoji. Alle drei Grundarchetypen haben sie:

| Archetyp | Der eine Moment | Auffälligste Asymmetrie |
|---|---|---|
| Traditionell | die Hero-Signatur der Küche | Highlights als Treppe (eine große Karte, dann kleinere) |
| Abend | die Reservierung | Karte/Stimmen mit Kopf in der linken Randspalte |
| Hell & modern | das schnelle Auftreten der Highlights | dichte Vierer-Reihe statt Hausempfehlung |

Jede Handschrift ist an ihre eigene Körperklasse gebunden (`.hs-traditionell`,
`.hs-abend`, `.hs-hell`) und kann dadurch nachweislich keinen anderen
Archetyp verändern (siehe `test/handschrift.test.js`). Ein Preset ohne
Handschrift-Anforderung (jede A/B-Variante aus `designPresets.js`) bleibt
Zeichen für Zeichen die bisherige Seite. Hintergrund und Messwerte zum
ursprünglichen Befund stehen in `docs-intern/design-audit.md`.

### Designsystem: Token-Set und eine neue Küche ergänzen

**[`DESIGN.md`](DESIGN.md) ist die einzige verbindliche Quelle** für Designentscheidungen – Farbpaletten, Typo-Paare, das globale Token-Set, die Referenzen je Küche. Diese README beschreibt nur, *wo im Code* die Entscheidungen aus DESIGN.md landen; Änderungen an Farbe, Schrift oder Spacing werden zuerst in DESIGN.md dokumentiert, dann hier umgesetzt.

Ein gemeinsames Token-Set (`--space-*`, `--radius-*`, `--shadow-*`, `--transition-*`, `--text-*`, siehe DESIGN.md Abschnitt 4) trägt Buttons, Karten, Formulare und Übergänge auf allen drei Oberflächen – Landing-Pages, Wirt-Dashboard, Nutzer-Dashboard. Die Namen sind überall gleich, die Werte pro Oberfläche eigenständig (dunkel beim Wirt-Dashboard, hell bei den beiden anderen). Wer eine neue Komponente baut, verdrahtet sie über diese Variablen statt neue Pixelwerte zu erfinden.

Wo die Bausteine einer Stimmung liegen:

| Baustein | Datei |
|---|---|
| Farbpalette, Typo-Paar, Archetyp je Stimmung | `src/stimmungen.js` (`GRUND_STIMMUNGEN`) |
| Layout je Archetyp (Reihenfolge der Abschnitte, Kopfzeile fix/scrollend) | `src/designPresets.js` (`ARCHETYP_PRESET`) |
| Handschrift je Archetyp (der eine Bewegungsmoment, die Asymmetrie) | `src/styles/handschrift.css.js` |
| Hero-Signatur der Küche (gilt für alle drei Stimmungen) | `src/heroSignature.js` |
| Küchenmarke, gezeichnete Kontakt-/Bestell-Icons | `src/signaturIcons.js` |
| Hero- und Interieurbilder | `src/imageLibrary.js` |
| Speisekarte | `src/menuCatalog.js` |

Eine neue Küche braucht in dieser Reihenfolge: einen Eintrag in `menuCatalog.js` (Gerichte, USPs, Konzepttext), drei bis vier Stimmungen in `stimmungen.js` (gegen Referenzen aus DESIGN.md Abschnitt 3/5 validiert, nicht frei erfunden), ein Bildpaar in `imageLibrary.js`, optional eine eigene Hero-Signatur in `heroSignature.js` und eine Küchenmarke in `signaturIcons.js` (beide rein dekorativ – ohne sie bleibt es beim generischen Hero bzw. ohne Marke). Layout und Handschrift branchen über den Archetyp und müssen nicht angefasst werden.

### Bilder und Schriften

Stockfotos (Unsplash) und Schriften (Google Fonts, alle unter der SIL Open Font License) werden beim ersten Lauf **einmalig heruntergeladen** und unter `data/landingpages/assets/` abgelegt. Danach funktionieren die Entwürfe komplett offline – praktisch, wenn du sie beim Termin im Lokal auf dem Laptop zeigst und dort kein Empfang ist. Ein erneuter Lauf lädt nur noch Fehlendes nach. Schlägt der Schriften-Download fehl, greifen die Seiten auf Systemschriften zurück.

### Live-Animation mit Remotion (opt-in, standardmäßig aus)

Eine Sonderoption, keine Voreinstellung: `buildLandingPage(lead, { ..., remotionSignature: true })` zeichnet die gezeichnete Küchenmarke im Siegel der Hausempfehlung (erste Karte der Highlights) strichweise nach, statt sie fertig zu zeigen – über [Remotion](https://www.remotion.dev/docs) (`@remotion/player`) und React, live im Browser, nicht als vorgerendertes Video. Details, Kosten und Grenzen stehen in [`docs-intern/remotion-signature.md`](docs-intern/remotion-signature.md); kurz zusammengefasst:

- **Baue das Bündel einmal**, bevor du die Option nutzt: `npm run build:motion` schreibt `docs/assets/motion/signature-player.js` (self-hosted, wie Schriften und Bilder – kein CDN).
- **Kostet spürbar Gewicht**: React + Remotion für eine einzige Marke sind ~168 kB gzip, geladen erst per `IntersectionObserver`, kurz bevor die Marke ins Bild kommt – aber eben doch geladen, für alle, die so weit scrollen.
- **Respektiert `prefers-reduced-motion`** vollständig: Ohne Bewegung bleibt die serverseitig schon fertig gezeichnete Marke stehen, der Player mountet gar nicht erst.
- **Kein Preset-Feld**, sondern eine Generator-Option: Jede der 48 veröffentlichten Seiten bleibt ohne die Option Zeichen für Zeichen dieselbe (siehe `test/remotionSignature.test.js`).
- **Lizenz beachten**: Remotion ist für Einzelpersonen und kleine Unternehmen (bis 3 Beschäftigte) kostenlos nutzbar, größere brauchen eine Company License – siehe [remotion.dev/license](https://remotion.dev/license).

### Gästestimmen

Vor der Reservierung steht eine Referenzen-Sektion. Auf den Entwürfen echter Häuser bleiben die drei Plätze **bewusst leer** und zeigen nur den Aufbau – die einzige echte Sozialbestätigung dort ist die Google-Gesamtnote.

Das hat zwei Gründe, die sich nicht umgehen lassen:

- Google untersagt das **Speichern von Rezensionstexten**. Dauerhaft gespeichert werden darf nur die `place_id`; Bewertungen müssen live abgerufen und mit Attribution angezeigt werden. Unsere Seiten sind statische Dateien im Git – genau das wäre nicht erlaubt.
- Rezensionen enthalten **Namen echter Gäste**. Die auf einer Entwurfsseite zu veröffentlichen, die dem Lokal nicht gehört und die niemand beauftragt hat, wäre datenschutzrechtlich nicht sauber.

Erfundene Zitate unter dem echten Namen eines Hauses kommen ebenfalls nicht in Frage – sie wären als echte Bewertungen lesbar. Ein Test stellt sicher, dass das nie passiert.

Die **erfundenen Beispiel-Lokale** auf der Startseite haben dagegen ausformulierte Stimmen; dort ist klar gekennzeichnet, dass das Lokal nicht existiert.

Sobald ein Wirt Kunde ist, lassen sich seine echten Bewertungen sauber einbinden: per Live-Abruf beim Seitenaufruf, mit Google-Attribution und ohne Speicherung.

### Welche Küchen es gibt

Zwölf Stilrichtungen, jede mit eigener Beispielkarte, eigenen Farben, eigenen Bildern und eigener Bewegung im Kopfbereich:

| | |
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
| Asiatisch (gemischt) | für die panasiatische Nudelbar, die sich nicht genauer einordnen lässt |
| Café | Frühstück, Kuchen & Kaffee |

Die Namenserkennung prüft die genaueren Küchen zuerst: „Sushi Bar Kyoto" wird japanisch, „Kao Thai" thailändisch, „Ming Friends" chinesisch. Erst wenn nichts Genaueres passt, greift die Sammelkategorie. Ein Test hält dagegen, dass „Goldener Hirsch" oder „Zum Steer" dabei nicht versehentlich mitgerissen werden.

Küchen und ihre Beschriftungen stehen an **einer** Stelle (`src/menuCatalog.js`) und werden von dort ans Dashboard geliefert. Eine neue Küche muss also nicht zusätzlich im Dropdown nachgetragen werden.

### Küche im Dashboard zuordnen

Die Namenserkennung liegt bei Lokalen ohne Stichwort daneben. Im Dashboard gibt es deshalb pro Lead ein Auswahlfeld für die Küche; die Zuordnung landet in `data/kuechen.json` und hat Vorrang vor der automatischen Erkennung. Von Hand gesetzte Werte sind farbig hervorgehoben. Nach einer Änderung einmal `npm run pages` laufen lassen, damit der Entwurf die neue Stilrichtung bekommt.

### QR-Code und Anschreiben

> **Wichtig:** Konzept-Demos stehen nicht im Netz. Der QR-Code im Pitch-Fenster zeigt nur auf eine **laufende Präsentation im WLAN** (siehe „Was öffentlich ist“) und ist sonst ausgeblendet; das Anschreiben enthält keinen Link, sondern bietet an, den Entwurf persönlich zu zeigen.


In der Spalte **Pitch** öffnet „QR & Text" ein Fenster mit:

- einem **QR-Code** auf die laufende Präsentation im WLAN – zum Zeigen auf dem Handy vor Ort (ohne laufende Präsentation ausgeblendet, mit Hinweis)
- der Präsentationsadresse zum Kopieren
- einem **Anschreiben-Entwurf**, der den konkreten Befund aus der Analyse aufgreift („keine eigene Website hinterlegt", „auf dem Handy schwer zu bedienen" …)

Der Text ist ein Entwurf zum Prüfen und Anpassen, kein Serienbrief. Unaufgeforderte Werbe-E-Mails an Gewerbetreibende sind in Deutschland nur eingeschränkt zulässig (§ 7 UWG) – der unproblematische Weg ist, den QR-Code beim Besuch vor Ort zu zeigen.

### Bewegung beim Scrollen

Unterhalb des Heros bewegt sich die Seite mit: Sektionsköpfe und Karten blenden versetzt ein, die Linie unter der Rubrik zieht sich auf, die Kette zwischen den drei Abholschritten wächst, das Akkordeon klappt weich auf und die eigenen Fotos fahren beim Scrollen langsam zurück in ihre Größe.

Drei Regeln gelten dabei (`src/motion.js`):

- **Nichts springt.** Animiert werden nur `transform` und `opacity` – das zeichnet der Browser ohne neues Layout. Ein Test in `test/motion.test.js` lässt keine andere Eigenschaft durch.
- **Nichts versteckt Inhalt.** Die unsichtbaren Startwerte hängen an einer Klasse, die erst das Skript setzt. Ohne JavaScript steht die volle Seite da – auch das prüft ein Test.
- **Bewegung ist abschaltbar.** Bei `prefers-reduced-motion: reduce` steigt das Skript sofort aus, und die Hero-Fahrt hält an, sobald der Hero aus dem Bild gescrollt ist.

### Bewegung je Küche

Jede Stilrichtung hat ein eigenes bewegtes Element im Hero – nicht nur andere Farben, sondern ein anderer Mechanismus:

| Küche | Element |
|---|---|
| Italienisch | Zwei Pizzahälften, die gegeneinander drehen (wie bei L'Osteria) |
| Bayerisch | Die Tagesempfehlung wechselt durch |
| Asiatisch | Gerichte laufen wie auf dem Sushi-Band durchs Bild |
| Türkisch | Der Drehspieß dreht sich weiter |
| Griechisch | Ruhiger Bildwechsel mit langsamer Annäherung |
| Café | Aufsteigender Dampf über der Tasse |

Alles reine CSS-Animationen, ohne Bibliothek und ohne zusätzliche Anfragen. Wer im Betriebssystem „Bewegung reduzieren" eingestellt hat, bekommt das Standbild.

### Speisekarte

Die Karte wird **anhand des Restaurantnamens** gewählt (Pizzeria → italienisch, Döner → türkisch, Gasthof → bayerisch usw.); ohne passendes Stichwort ist bayerisch der Standard. Liegt der Generator daneben – etwa bei einem Thai-Lokal namens „Klabwong" – gib die Küche mit `--cuisine` vor. Möglich sind: `bayerisch`, `italienisch`, `asiatisch`, `griechisch`, `tuerkisch`, `cafe`.

Gerichte, Preise, Öffnungszeiten und Fotos sind Platzhalter und auf der Seite auch als solche gekennzeichnet – sie werden vor einer Veröffentlichung durch die echten Angaben und Aufnahmen des Wirts ersetzt.

#### Eigene Seite „Speisekarte & Bestellen“ (v2, Seiten mit Ausdruck)

Jede v2-Seite mit Ausdruck (alle Beispielseiten und Lead-Demos) besteht aus zwei Seiten:

| Seite | Pfad | Inhalt |
|---|---|---|
| Startseite | `<slug>/index.html` (wie bisher, QR-Ziel) | Bühne, Einladung, Tisch-Collage, **kleine Auswahl** (4–5 Gerichte, Anker `#karte`) mit Kategorien und „Gesamte Speisekarte ansehen“ |
| Speisekarte | `<slug>/speisekarte/index.html` | alle freigegebenen Gerichte je Kategorie, Kategorien-Navigation (Handy: waagrecht unter der Kopfzeile, Desktop: Seitenleiste), Hinzufügen, Warenkorb und Abholzeit |

- **Eine Datenquelle:** `v2/build/speisekarte.js` bereitet die Karte auf (Musterkarte aus `src/menuCatalog.js` oder die Karte des Betriebs aus `data/lead-edits/<slug>.json` → `speisekarte.kategorien`). Kategorien und Gruppen erscheinen nur mit Gerichten; `aktiv: false`/`freigegeben: false` blendet aus, `ausverkauft: true` zeigt ohne Hinzufügen; `varianten: [{ name, preis }]`, `extras`, `signatur: true` (für die Auswahl der Startseite).
- **Plus auf der Startseite** öffnet `speisekarte/index.html#gericht-<schlüssel>` und markiert das Gericht (`:target`, auch ohne JavaScript). Es legt nichts in den Warenkorb. Die Schlüssel kommen aus dem Gerichtnamen und bleiben beim Umsortieren gleich.
- **Warenkorb:** das bestehende `PAGE_SCRIPT` (`src/landingPageGenerator.js`), über `sessionStorage` für beide Seiten. Name und Preis kommen immer aus der aktuellen Karte (`PAGE_DATA.warenkorb.karte`); geänderte Preise und entfallene Gerichte nennt der Warenkorb ausdrücklich.
- **Bestellen im Header:** mit Betriebsserver „Bestellen“, ohne „Probebestellung“, bei `lead-edits.bestellung.aktiv = false` gar nicht (die Karte bleibt verlinkt). Konzept-Demos schicken nie etwas an einen Server.
- Alle Links sind relativ (`speisekarte/index.html`, `../index.html`) und funktionieren lokal (auch `file://`), unter `https://<user>.github.io/<repo>/<slug>/` und auf einer eigenen Domain.

## Was öffentlich ist – und wie du einem Wirt seine Demo zeigst

GitHub Pages (`main:/docs`) ist **ohne Zugriffsschutz**: Alles dort ist für jeden abrufbar. `robots.txt` und `noindex` verhindern nur das Indexieren, nicht den Zugriff. Seit 25.09.2026 gilt deshalb (`src/oeffentlichkeit.js`):

| Typ | Was | Wo |
|---|---|---|
| A | die zwölf **fiktiven** Beispielseiten (`beispiel-<küche>`) und die Übersicht | öffentlich unter `docs/` (`npm run publish-site`) |
| B | **Konzept-Demos für echte Betriebe** | nur lokal (`v2/output/leads/<slug>/`, gitignoriert) und im Dashboard – nie in `docs/` |
| C | echte Kundenwebsite nach Beauftragung | eigener, späterer Workflow (noch nicht umgesetzt) |

Jeder Weg, der nach `docs/` schreibt (Standard-Build, `--only`, Dashboard, `demo:migration`, v1), prüft das und lehnt Lead-Demos ab. Interne Build-Berichte (`bericht.json`, `zyklus.json`) der Beispielseiten landen in `v2/output/berichte/`, nicht in `docs/`.

### Demo vor Ort auf dem Handy zeigen

1. Im Dashboard beim Lead **„Bilder“** öffnen → Demo-Panel: Küche, Vorlage und eines der drei Farbschemata wählen, optional den Slogan ändern, **„Konzept-Demo lokal bauen“**. Vorschau Desktop und Handy stehen daneben, dazu der Medienstatus (Video Desktop/Mobil, Poster, Herkunft, was fehlt).
2. Laptop und Handy ins **selbe WLAN** bringen (oder den Handy-Hotspot für den Laptop nutzen).
3. **„Präsentation im WLAN starten“**: Das Panel zeigt einen QR-Code mit der Netzwerkadresse des Laptops (z. B. `http://192.168.1.23:3010/…/`), nie `localhost`. Der QR funktioniert auf jedem Handy im selben Netz.
4. Danach **„Präsentation beenden“** – spätestens nach zwei Stunden endet sie von selbst, der Link ist dann tot.

Ohne Dashboard: `npm run publish-site -- --only <slug>` (lokal bauen), dann `npm run praesentation -- <slug> [minuten]` – der QR-Code erscheint im Terminal.

Grenzen, ehrlich: Die Präsentation ist **nicht im Internet** und liefert nur diese eine Demo aus, hat aber **kein Passwort und kein HTTPS**. Wer im selben Netz den Link kennt, kann sie während der Laufzeit öffnen. Gäste-WLANs mit Client-Isolation lassen Geräte nicht miteinander sprechen – dann den Handy-Hotspot nehmen. Ein Link zum Mitgeben (Wirt schaut abends allein) ginge erst mit einem geschützten Host, etwa dem vorbereiteten Dashboard-Host (`docs-intern/HOSTING.md`).

### Früher öffentliche Lead-Demos

Bis 24.09.2026 lagen 74 Lead-Demos öffentlich unter `docs/`. Sie wurden mit `npm run demo:migration -- --abschalten` gesichert (lokal nach `data/sicherung/`, samt Liste der früheren URLs) und aus `docs/` entfernt. Jede frühere Adresse und jeder alte QR-Code zeigt jetzt `docs/404.html`: einen neutralen Hinweis der Agentur, ohne Restaurantnamen. `v2/abgeschaltete-demos.json` hält nur SHA-256-Werte der Slugs, damit das Dashboard „abgeschaltet am …“ anzeigen kann, ohne die Namen im Repo zu nennen.

Das Entfernen aus `docs/` löscht **nicht** die Git-Historie (die alten Seiten bleiben in früheren Commits abrufbar), nicht den Pages-Cache (bis ca. 10 Minuten) und keine Kopien, die andere gespeichert haben.

## Resonanz: wurde der Entwurf überhaupt angesehen?

Nach dem Verschicken weißt du sonst nicht, ob der Wirt den Link geöffnet hat – und das Anschreiben endet mit „komme ich diese Woche kurz bei Ihnen vorbei". Wer weiß, welche sechs von vierzig Wirten wirklich hineingeschaut haben, telefoniert nicht mehr kalt.

Dafür gibt es einen kleinen Collector, den die veröffentlichten Entwürfe anfunken:

```bash
npm run resonanz
```

Damit die Entwürfe ihn kennen, muss seine öffentliche Adresse beim Bauen feststehen – entweder über `RESONANZ_URL` in der `.env` oder per Flag:

```bash
npm run publish-site -- --resonanz https://resonanz.deine-domain.de
```

Im Dashboard erscheint dann neben jedem Entwurf eine Spalte **Resonanz**: geöffnet, wann zuletzt, wie lange, und ob der Besucher bis zur Reservierungssektion gescrollt ist. Das letzte ist das stärkste Signal, das die Seite ohne Klick hergibt. Der Filter „nur geöffnete Entwürfe" macht daraus die Nachfassliste.

### Was gemessen wird – und was bewusst nicht

Gemessen wird die Reichweite eines Entwurfs, den du selbst gebaut und selbst verschickt hast, nicht eine Person. Gespeichert werden je Aufruf genau drei Dinge: Zeitpunkt, auf Zehnersekunden gerundete sichtbare Verweildauer, und ob die Reservierungssektion im Bild war.

Nicht gespeichert werden IP-Adresse, User-Agent, Referer, Auflösung, Sprache oder Standort. Es gibt kein Cookie, keinen Dritt-Dienst und keine Wiedererkennung über mehrere Entwürfe oder Sitzungen hinweg. Die Besuchskennung lebt im `sessionStorage`, endet mit dem Tab und landet nie auf der Platte. Ein Test in `test/resonanzStore.test.js` sichert das ab.

**„Nicht geöffnet" heißt nicht „nicht gelesen".** Adblocker und manche Mail-Programme verschlucken das Signal. Die Spalte taugt dazu, gute Gelegenheiten zu erkennen – nicht dazu, jemandem Desinteresse zu unterstellen.

### Betrieb

Der Collector muss vom Gerät des Wirts aus erreichbar sein, die Entwürfe liegen ja auf GitHub Pages. Er lauscht per Default nur auf `127.0.0.1`; für den echten Betrieb gehört ein Reverse Proxy mit TLS davor und `RESONANZ_HOST=0.0.0.0` gesetzt. Collector und Dashboard teilen sich nur das Verzeichnis `data/resonanz/` – das Dashboard liest bei jeder Anfrage frisch von der Platte.

Ohne gesetzte `RESONANZ_URL` ist das Feature schlicht aus: Es wird kein Beacon eingebaut, und Spalte wie Filter bleiben im Dashboard weg. Die lokale Fassung (`npm run pages`) trägt grundsätzlich kein Beacon – sie ist deine eigene Vorschau. Aus demselben Grund hängt der Knopf „Entwurf öffnen" im Pitch-Fenster `?vorschau=1` an; der Link und die QR-Codes für den Wirt bleiben ohne den Parameter.

## Wirt-Dashboard: Tische, Reservierungen, Abholbestellungen

Die Landing-Page nimmt Reservierungen und Abholbestellungen entgegen – ankommen müssen sie beim Wirt. Dafür gibt es einen zweiten, kleinen Server, der pro Betrieb läuft:

```bash
npm run wirt -- --betrieb gasthaus-zur-post
```

Danach im Browser `http://localhost:3200` öffnen. **Nicht 3000** – der Port gehört dem persönlichen Dashboard. Die beiden Server haben deshalb getrennte Umgebungsvariablen (`DASHBOARD_PORT` und `WIRT_PORT`); ein gemeinsames `PORT` hätte sonst beide auf denselben Platz geschickt. Ist ein Port belegt, sagt der Start, welcher und was zu tun ist. Die Daten liegen in `data/betrieb/<betrieb>.json` (gitignoriert). Ohne `--betrieb` wird `standard` verwendet, mit `--port` lässt sich der Port ändern.

Das Dashboard hat drei Reiter:

**Tischplan.** Der Wirt trägt seine Tische mit Platzzahl ein (z. B. „Tisch 4 – 6 Plätze"). Die Summe ist die Kapazität des Hauses. Genau daran prüft der Server jede Online-Reservierung: Reicht zur gewünschten Zeit der Platz nicht mehr, bekommt der Gast sofort eine ehrliche Absage mit der freien Platzzahl statt einer Bestätigung, die später zurückgenommen werden muss. Als belegt gilt ein Tisch 120 Minuten ab der Reservierungszeit.

**Die Tische, nicht nur die Plätze.** Die reine Platzsumme führt in die Irre. Bei einem Vierer- und einem Zweiertisch sind sechs Plätze frei – zwei Dreiergruppen passen trotzdem nicht hinein, weil die zweite keinen Tisch mehr findet. Auf dem Papier geht es auf, im Raum steht die Gruppe. Der Server prüft deshalb zusätzlich, ob sich die gleichzeitig anwesenden Gruppen überhaupt auf die Tische verteilen lassen:

- **Online** wird in dem Fall abgelehnt – der Gast liest nur, dass für seine Gruppenstärke kein Tisch mehr frei ist, nicht den Tischplan des Hauses.
- **Von Hand** wird trotzdem eingetragen. Der Wirt am Telefon kennt seinen Raum und kann Tische zusammenstellen; ihn zu blockieren wäre anmaßend. Er bekommt aber einen Hinweis, der oben in der Reservierungsliste **stehen bleibt**, bis der Konflikt gelöst ist – eine Meldung, die nach vier Sekunden verschwindet, ist am Abend vergessen.

**Reservierungen.** Online eingegangene Anfragen stehen auf „neu" und werden vom Wirt bestätigt oder abgesagt; eine Absage gibt die Plätze sofort wieder frei. Telefonisch angenommene Reservierungen trägt der Wirt über das Formular selbst ein – die gelten sofort als bestätigt und zählen genauso gegen die Kapazität, sonst wäre die Online-Verfügbarkeit falsch. Jeder Reservierung lässt sich ein Tisch zuweisen; die Auswahl zeigt nur Tische, die groß genug und zu der Zeit noch frei sind.

**Bestellungen.** Eingehende Abholbestellungen zeigen Positionen, Summe und die **gewünschte** Abholzeit. Der Wirt bestätigt eine Abholzeit – entweder die gewünschte oder eine realistischere. Dazu gibt es einen fertig formulierten Text zum Vorlesen und die Telefonnummer als `tel:`-Link. Bis zur Bestätigung steht die Bestellung sichtbar auf „wartet auf Bestätigung"; auch der Gast liest auf der Landing-Page, dass die Abholzeit noch bestätigt wird.

### Landing-Page an den Server anbinden

Ohne Anbindung sind die Formulare eine Vorschau. Mit `--api` schicken sie echte Anfragen an den Wirt-Server:

```bash
npm run pages -- --api http://localhost:3200
```

Der Hinweis „Entwurfsansicht" verschwindet dann, weil die Anfrage wirklich beim Restaurant landet. Das gilt auch für `npm run publish-site -- --api https://...`.

**Wichtig:** Das braucht einen laufenden Server. GitHub Pages liefert nur statische Dateien aus – die dort veröffentlichten Entwürfe bleiben also ohne `--api` und damit in der Vorschau-Fassung. Für einen echten Kunden läuft der Wirt-Server auf seinem eigenen Hosting (oder deinem), und die Seite zeigt auf diese Adresse.

### Gastbenachrichtigung

Nach dem Absenden bekommt jeder Gast Referenznummer, den ehrlichen Stand „eingegangen – noch nicht bestätigt“ und einen persönlichen **Status-Link** (`/status#…` auf dem Wirt-Server). Wer freiwillig eine E-Mail-Adresse angibt, erhält Eingang, Bestätigung, Ablehnung, geänderte Zeiten und „bereit zur Abholung“ zusätzlich als transaktionale E-Mail (Resend). Ohne E-Mail oder ohne eingerichteten Versand zeigt das Dashboard nach Ablehnung oder Zeitänderung: „Gast nicht automatisch informiert – bitte unter … anrufen.“ Die Meldungen entstehen beim Speichern der Statusänderung – v1-Dashboard, v2-Küchenstatus und Telegram-Knöpfe lösen deshalb nie doppelte Mails aus.

### Kundenwebsites (gewonnene Betriebe)

Die vorhandene Bearbeiten-Ansicht hat zwei Modi. Unter „Konzept-Demo“ bleibt die Lead-Demo, wie sie ist. „Kundenwebsite“ legt aus der Demo eine eigene Kundenfassung an. Darin lassen sich Logo, Hero-Medien (Desktop/Mobile), Texte, das Haus-Bild, die Speisekarte mit Preisen, Allergenen und Gerichtbildern sowie die Betriebsangaben pflegen. Danach wird nur diese Seite lokal gebaut, in der Vorschau auf Desktop und Mobil geprüft und freigegeben. Layout und Designsystem bleiben gesperrt, veröffentlicht wird noch nichts. Dashboard und Claude-Code-Chat (`npm run kunde -- …`) arbeiten auf demselben Speicher unter `data/kunden/`. Details: [docs-intern/KUNDENWEBSITES.md](docs-intern/KUNDENWEBSITES.md).

### „Passt gut dazu“: Empfehlungen im Warenkorb

In der Bestellübersicht (Warenkorb vor dem Absenden) zeigen Seiten mit Speisekarten-Seite höchstens zwei passende Ergänzungen aus der Karte des Hauses – zur Pizza etwa eine Vorspeise oder ein Dessert, nie eine zweite Pizza. Nichts wird automatisch hinzugefügt; hinzugefügt wird über den bestehenden Warenkorb, der Server prüft Preise wie bisher. Der Wirt steuert die Funktion im Reiter **„Empfehlungen“** (an/aus, Standardregeln, bevorzugte und ausgeschlossene Produkte, Kombinationen, Vorschau, aggregierte Wirkung). Keine KI pro Warenkorb, keine Cookies, keine Gästehistorie. Details: [docs-intern/PASST-GUT-DAZU.md](docs-intern/PASST-GUT-DAZU.md).

### Statistik und Rechtstexte

Das Wirt-Dashboard hat zwei weitere Reiter:

- **Statistik:** Online- und manuelle Reservierungen getrennt, Bestellungen je Status, Bestellwert (ausdrücklich kein bezahlter Umsatz). Zeiträume sind Tag, Woche, Monat, Quartal, Jahr oder frei wählbar; gezählt wird nach Eingang, die Übersicht „Was steht heute an?“ steht getrennt davon. Website-Aufrufe zeigt das Dashboard erst, wenn eine echte Messquelle beim Host der Kundenseite läuft; bis dahin steht dort „noch nicht messbar“.
- **Rechtstexte:** Impressum, Datenschutz, Bestell- und Reservierungsbedingungen sowie No-Show-Regeln je Restaurant, versioniert und mit Freigabe. Die Vorlagen sind nur Entwürfe, keine Rechtsberatung. Formulare verlangen Bestätigungen nur für freigegebene Fassungen und prüfen sie serverseitig. No-Show bleibt aus, bis eine Regel freigegeben ist.

Details, Bestandsaufnahme, Checkliste der zu liefernden Angaben und Launch-Blocker: [docs-intern/STATISTIK-UND-RECHTSTEXTE.md](docs-intern/STATISTIK-UND-RECHTSTEXTE.md).

Sobald der Wirt-Server öffentlich erreichbar ist, **`WIRT_PASSWORT` setzen** (mindestens 12 Zeichen; schützt Dashboard und Wirt-Aktionen). Ohne Passwort ist das Wirt-Dashboard nur direkt über `http://localhost` erreichbar. Hinter einem Proxy zusätzlich `VERTRAUTER_PROXY` setzen (`.env.example`).

**Vor dem ersten Launch:** [SECURITY-AUDIT.md](SECURITY-AUDIT.md) (Befunde und Migrationswirkung), [DATENFLUSS.md](DATENFLUSS.md) (welche Daten wo liegen und wohin sie gehen), [LAUNCH-CHECKLISTE.md](LAUNCH-CHECKLISTE.md). Sicherung der Laufzeitdaten: `npm run sicherung -- erstellen [--ziel <ordner>]`, Wiederherstellungsprobe: `npm run sicherung -- pruefen <datei.tar.gz>`. Einrichtung, Umgebungsvariablen, Sicherheit, Datenschutz-Baustein und der sichere Versandtest an die eigene Adresse (`npm run gast:mailtest -- --an …`): [docs-intern/GASTBENACHRICHTIGUNG.md](docs-intern/GASTBENACHRICHTIGUNG.md).

## v2-Pipeline (parallel zu v1)

Neben dem bewährten Generator (v1, `src/`) gibt es eine zweite Engine unter [`v2/`](v2/README.md). Jede v2-Seite durchläuft **Referenz → Designsystem → Build → Judge → Anbindung**: echte Restaurant- und Refero-Referenzen je Küche×Stimmung, daraus ein Designsystem-Dokument (Farben mit Aufgaben, Typo-Skala ohne Inter/Roboto, 8-px-Raster, verbotene Muster), ein Build mit harten Gates (WCAG AA, drei Hero-Aufbauten je Stimmung, Anti-Slop-Lint, Textregeln) und ein Design-Judge im Browser, der bis zu drei Korrekturrunden anstößt. Reservierung, Warenkorb und No-Show-Schutz sind dasselbe Skript wie in v1, deshalb funktionieren v2-Seiten mit dem Wirt-Server wie v1-Seiten.

**v1 bleibt Standard.** Nichts ändert sich, solange niemand umschaltet.

```bash
npm run v2:build -- --kueche italienisch --stimmung trattoria --judge   # eine Kombination
npm run v2:build:all -- --judge                                         # alle 36
npm run v2:vergleich                                                    # Vorher/Nachher v1↔v2
```

### Zwischen v1 und v2 umschalten

Im Lead-Dashboard (`npm run dashboard`) steht über den Kennzahlen **„Standard-Engine v1 | v2“**. Das gilt für alle Leads. In der Spalte **Engine** lässt sich jeder Lead einzeln übersteuern („Standard“, „v1“, „v2“). Dort gibt es auch **„v2 bauen“**, das die v2-Seite dieses Leads im vollen Zyklus mit Judge erzeugt. Sobald ein Lead auf v2 steht und gebaut ist, öffnet „ansehen“ die v2-Seite. Die Wahl liegt in `data/v2-engine.json`. Ohne Dashboard lässt sich der Standard mit `ENGINE_STANDARD=v2` in der `.env` setzen. Soll ein v2-Entwurf echte Anfragen annehmen, gehört `V2_API_URL=https://…` (Adresse des Wirt-Servers) in die `.env`.

„Bilder“ (bearbeiten.html) zeigt zusätzlich das v2-Designsystem des Leads (Farben mit Aufgabe, Schriften, Hero-Aufbau, Foto-Anleitung) und für jeden Bildplatz die Herkunft: **eigenes Foto**, **KI-generiert** oder **Platzhalter**. Hochgeladene Fotos haben in v2 immer Vorrang.

Veröffentlicht (`npm run publish-site`) wird weiterhin v1. Die Umstellung auf v2 ist bewusst ein eigener, späterer Schritt (siehe [`v2/ABSCHLUSSBERICHT.md`](v2/ABSCHLUSSBERICHT.md)).

### Wirt-Dashboard im Stil des Hauses

```bash
npm run v2:wirt -- --betrieb gasthaus-zur-post --kueche bayerisch --stimmung wirtshaus
```

Das ist derselbe Wirt-Server mit allen Funktionen, aber in Farben und Schriften des Designsystems des Betriebs. Dazu kommen der Küchenstatus (Neu → In Zubereitung → Bereit → Abgeholt) und die Telegram-Anbindung. `npm run wirt` bleibt unverändert.

### Telegram aktivieren

1. Bei **@BotFather** in Telegram `/newbot` senden und den Token in die `.env` eintragen: `TELEGRAM_BOT_TOKEN=…` (optional `TELEGRAM_BOT_NAME=…` für einen Direktlink).
2. Wirt-Server mit Bot starten: `npm run v2:wirt -- --betrieb <slug> --telegram`. Bei mehreren Betrieben stattdessen einmal `npm run v2:telegram`.
3. Der Wirt öffnet im Wirt-Dashboard den Reiter **„Telegram“**, wählt den Chat-Modus (ein Chat · **zwei Chats mit einem Bot** · zwei eigene Bots), erzeugt je Chat einen Code und sendet dem Bot `/start CODE`.

Telegram ist ein zusätzlicher Alarmkanal; maßgeblich bleibt das Dashboard. Gemeldet wird nur in den **Telegram-Zeiten** des Betriebs (Öffnungszeiten ± 30 Minuten, einstellbar; „rund um die Uhr“ nur auf ausdrücklichen Wunsch). Was außerhalb eingeht, wird im nächsten Zeitfenster nachgemeldet – bei vielen Vorgängen als eine Sammelmeldung. Unbestätigtes wird nach 2 Minuten (einstellbar) **einmal** erinnert. Die Nachrichten enthalten nur Referenz, Termin bzw. Abholzeit, Personenzahl und Status – keine Namen, Telefonnummern oder Wünsche. Ohne eigene Öffnungszeiten sendet der Bot nichts automatisch und das Dashboard warnt. Details: [`v2/integration/TELEGRAM-SETUP.md`](v2/integration/TELEGRAM-SETUP.md), Datenschutz: [`v2/integration/TELEGRAM-DATENSCHUTZ.md`](v2/integration/TELEGRAM-DATENSCHUTZ.md).

## Tests ausführen

Es gibt Unit-Tests für die Filterlogik, den Landing-Page-Generator und den Speisekarten-Katalog, die **ohne** echten API-Key laufen:
```bash
npm test
```

Das Skript setzt bewusst `--test-concurrency=1`. Mehrere Testdateien legen echte Dateien unter `data/` an – Lead-CSVs und das Entwurfs-Manifest `data/landingpages/entwuerfe.json`. Parallel laufende Testdateien haben sich dabei gegenseitig die Fixtures unter den Füßen weggeschrieben: Ein Test richtete seinen Lead ein, eine andere Datei überschrieb das Manifest, und der erste bekam „Zu diesem Entwurf gibt es keinen Lead" – etwa jeder fünfte Lauf, an wechselnden Stellen. Seriell kostet die Suite gut eine Sekunde mehr und ist dafür verlässlich.

## Geplante Erweiterungen (nicht Teil dieser ersten Version)

- Outreach-Anschreiben pro Lead vorbereiten (Versand bleibt bewusst manuell freizugeben).
