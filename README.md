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

Das Dashboard liest beim Aufruf einfach die vorhandenen CSV-Dateien neu ein – lass es also nach einem neuen `npm start`-Lauf laufen, um aktuelle Daten zu sehen (Browser-Seite neu laden reicht, der Server muss nicht neu gestartet werden). Es braucht keinen API-Key und läuft komplett offline auf deinem Rechner.

## Landing-Page-Entwürfe erzeugen

Für den Pitch lässt sich zu jedem Lead automatisch eine fertige Beispiel-Website erzeugen – mit Speisekarte, Online-Reservierung und Abholbestellung:

```bash
npm run pages
```

Die Seiten landen unter `data/landingpages/`. Es gibt zwei Wege, sie anzusehen:

- **Über das Dashboard** (empfohlen): `npm run dashboard` starten und in der Spalte „Entwurf" auf „ansehen" klicken. Der Server liefert die Entwürfe unter `/entwuerfe/` gleich mit aus.
- **Direkt im Dateisystem**: `data/landingpages/index.html` im Browser öffnen – eine Übersicht mit Vorschaubildern, von dort geht es zu jedem einzelnen Entwurf.

Welcher Lead zu welchem Entwurf gehört, hält der Generator in `data/landingpages/entwuerfe.json` fest; das Dashboard liest diese Datei bei jedem Aufruf neu. Nach einem neuen `npm run pages` genügt es also, die Dashboard-Seite neu zu laden.

Optionen:
```bash
npm run pages -- --region "Altötting"        # nur ein Ort
npm run pages -- --min-score 80              # nur die dringendsten Fälle
npm run pages -- --limit 10                  # die Top 10 nach Score
npm run pages -- --email info@restaurant.de  # Bestellungen/Reservierungen per E-Mail versendbar machen
npm run pages -- --cuisine asiatisch         # Küche vorgeben (siehe unten)
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

### Drei Themes statt Zufallsfarben

Die Küche bestimmt die Gestaltungswelt, das Layout bleibt gleich:

| Theme | Küchen | Anmutung |
|---|---|---|
| **Trattoria** | italienisch, griechisch, Café | Warme Erdtöne, Playfair Display als Serifenschrift, gemütlich-rustikal |
| **Neo-Asian** | asiatisch, türkisch | Dunkler Hintergrund, kräftige Akzente (Neonrot, Gold, Orange), Montserrat in Versalien, urbaner Streetfood-Look |
| **Wirtshaus** | bayerisch | Helles Holz mit Waldgrün, Dunkelrot oder Braun, Merriweather, bodenständig |

Innerhalb eines Themes gibt es drei Akzentvarianten, dazu sechs Titelbilder je Küche – zwei benachbarte Wirtshäuser sehen also trotz gleichem Theme unterschiedlich aus. Die Zuordnung hängt fest am Lead: derselbe Lead ergibt immer denselben Entwurf.

### Bilder und Schriften

Stockfotos (Unsplash) und Schriften (Google Fonts, alle unter der SIL Open Font License) werden beim ersten Lauf **einmalig heruntergeladen** und unter `data/landingpages/assets/` abgelegt. Danach funktionieren die Entwürfe komplett offline – praktisch, wenn du sie beim Termin im Lokal auf dem Laptop zeigst und dort kein Empfang ist. Ein erneuter Lauf lädt nur noch Fehlendes nach. Schlägt der Schriften-Download fehl, greifen die Seiten auf Systemschriften zurück.

### Gästestimmen

Vor der Reservierung steht eine Referenzen-Sektion. Auf den Entwürfen echter Häuser bleiben die drei Plätze **bewusst leer** und zeigen nur den Aufbau – die einzige echte Sozialbestätigung dort ist die Google-Gesamtnote.

Das hat zwei Gründe, die sich nicht umgehen lassen:

- Google untersagt das **Speichern von Rezensionstexten**. Dauerhaft gespeichert werden darf nur die `place_id`; Bewertungen müssen live abgerufen und mit Attribution angezeigt werden. Unsere Seiten sind statische Dateien im Git – genau das wäre nicht erlaubt.
- Rezensionen enthalten **Namen echter Gäste**. Die auf einer Entwurfsseite zu veröffentlichen, die dem Lokal nicht gehört und die niemand beauftragt hat, wäre datenschutzrechtlich nicht sauber.

Erfundene Zitate unter dem echten Namen eines Hauses kommen ebenfalls nicht in Frage – sie wären als echte Bewertungen lesbar. Ein Test stellt sicher, dass das nie passiert.

Die **erfundenen Beispiel-Lokale** auf der Startseite haben dagegen ausformulierte Stimmen; dort ist klar gekennzeichnet, dass das Lokal nicht existiert.

Sobald ein Wirt Kunde ist, lassen sich seine echten Bewertungen sauber einbinden: per Live-Abruf beim Seitenaufruf, mit Google-Attribution und ohne Speicherung.

### Küche im Dashboard zuordnen

Die Namenserkennung liegt bei Lokalen ohne Stichwort daneben. Im Dashboard gibt es deshalb pro Lead ein Auswahlfeld für die Küche; die Zuordnung landet in `data/kuechen.json` und hat Vorrang vor der automatischen Erkennung. Von Hand gesetzte Werte sind farbig hervorgehoben. Nach einer Änderung einmal `npm run pages` laufen lassen, damit der Entwurf die neue Stilrichtung bekommt.

### QR-Code und Anschreiben

In der Spalte **Pitch** öffnet „QR & Text" ein Fenster mit:

- einem **QR-Code** auf die Demo-Adresse des Lokals – zum Zeigen auf dem Handy oder zum Ausdrucken
- der Adresse zum Kopieren
- einem **Anschreiben-Entwurf**, der den konkreten Befund aus der Analyse aufgreift („keine eigene Website hinterlegt", „auf dem Handy schwer zu bedienen" …)

Der Text ist ein Entwurf zum Prüfen und Anpassen, kein Serienbrief. Unaufgeforderte Werbe-E-Mails an Gewerbetreibende sind in Deutschland nur eingeschränkt zulässig (§ 7 UWG) – der unproblematische Weg ist, den QR-Code beim Besuch vor Ort zu zeigen.

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

## Entwürfe öffentlich zeigen (GitHub Pages, kostenlos)

Damit du einem Wirt vorab einen Link schicken kannst, einen QR-Code aufs Handy bringst oder er den Entwurf abends jemandem zeigen kann, lässt sich eine öffentliche Fassung erzeugen:

```bash
npm run publish-site -- --limit 12 --kontakt "Dein Name · deine@mail.de"
git add docs && git commit -m "Entwürfe veröffentlichen" && git push
```

Einmalig einrichten: auf GitHub unter **Settings → Pages** als Quelle **„Deploy from a branch"** wählen, Branch `main`, Ordner `/docs`. Nach ein bis zwei Minuten liegt alles unter
`https://seifinger.github.io/gastro-webagentur/`.

Der Ordner `docs/` wird bei jedem Lauf **komplett neu gebaut** – nimmst du einen Lead aus der Auswahl, verschwindet sein Entwurf beim nächsten Push auch wirklich aus dem Netz. Es gelten dieselben Filter wie bei `npm run pages` (`--region`, `--limit`, `--min-score`, `--cuisine`).

### Unterschiede zur lokalen Fassung

| | `npm run pages` | `npm run publish-site` |
|---|---|---|
| Ordner | `data/landingpages/` (nicht in Git) | `docs/` (wird committet) |
| Bilder | lokal heruntergeladen, **offline nutzbar** | direkt von Unsplash geladen, hält das Repository klein |
| Schriften | lokal | lokal (rund 760 KB, wegen DSGVO nicht von Googles Servern) |
| Hinweis | keiner | Leiste „Unverbindlicher Gestaltungsentwurf – **nicht** die offizielle Website von …" |
| Suchmaschinen | – | `noindex, nofollow` auf jeder Seite |
| Übersicht | mit Lead-Score und Priorität | neutrale Showcase-Seite **ohne** interne Vertriebsdaten |

### Wichtig vor dem Veröffentlichen

Die Seiten tragen Namen und Adresse echter Lokale, die davon nichts wissen. Deshalb:

- Jede Seite trägt oben eine deutlich sichtbare Leiste, dass es **nicht** die offizielle Website des Lokals ist.
- Jede Seite ist auf `noindex` gesetzt, damit sie nicht in Google auftaucht und dem Lokal die eigenen Suchergebnisse streitig macht.
- Die URL (`seifinger.github.io/...`) ist erkennbar nicht die des Restaurants.
- Die öffentliche Übersicht zeigt **keine** Lead-Scores und Prioritäten.

Die `robots.txt` liegt zwar mit im Ordner, wird auf `github.io` aber nur im Wurzelverzeichnis der Domain ausgewertet – die Absicherung leistet hier das `noindex` im Seitenkopf. Wenn ein Wirt möchte, dass sein Entwurf verschwindet, nimm ihn aus der Auswahl und pushe neu.

## Wirt-Dashboard: Tische, Reservierungen, Abholbestellungen

Die Landing-Page nimmt Reservierungen und Abholbestellungen entgegen – ankommen müssen sie beim Wirt. Dafür gibt es einen zweiten, kleinen Server, der pro Betrieb läuft:

```bash
npm run wirt -- --betrieb gasthaus-zur-post
```

Danach im Browser `http://localhost:3200` öffnen. Die Daten liegen in `data/betrieb/<betrieb>.json` (gitignoriert). Ohne `--betrieb` wird `standard` verwendet, mit `--port` lässt sich der Port ändern.

Das Dashboard hat drei Reiter:

**Tischplan.** Der Wirt trägt seine Tische mit Platzzahl ein (z. B. „Tisch 4 – 6 Plätze"). Die Summe ist die Kapazität des Hauses. Genau daran prüft der Server jede Online-Reservierung: Reicht zur gewünschten Zeit der Platz nicht mehr, bekommt der Gast sofort eine ehrliche Absage mit der freien Platzzahl statt einer Bestätigung, die später zurückgenommen werden muss. Als belegt gilt ein Tisch 120 Minuten ab der Reservierungszeit.

**Reservierungen.** Online eingegangene Anfragen stehen auf „neu" und werden vom Wirt bestätigt oder abgesagt; eine Absage gibt die Plätze sofort wieder frei. Telefonisch angenommene Reservierungen trägt der Wirt über das Formular selbst ein – die gelten sofort als bestätigt und zählen genauso gegen die Kapazität, sonst wäre die Online-Verfügbarkeit falsch. Jeder Reservierung lässt sich ein Tisch zuweisen; die Auswahl zeigt nur Tische, die groß genug und zu der Zeit noch frei sind.

**Bestellungen.** Eingehende Abholbestellungen zeigen Positionen, Summe und die **gewünschte** Abholzeit. Der Wirt bestätigt eine Abholzeit – entweder die gewünschte oder eine realistischere. Dazu gibt es einen fertig formulierten Text zum Vorlesen und die Telefonnummer als `tel:`-Link. Bis zur Bestätigung steht die Bestellung sichtbar auf „wartet auf Bestätigung"; auch der Gast liest auf der Landing-Page, dass die Abholzeit noch bestätigt wird.

### Landing-Page an den Server anbinden

Ohne Anbindung sind die Formulare eine Vorschau. Mit `--api` schicken sie echte Anfragen an den Wirt-Server:

```bash
npm run pages -- --api http://localhost:3200
```

Der Hinweis „Entwurfsansicht" verschwindet dann, weil die Anfrage wirklich beim Restaurant landet. Das gilt auch für `npm run publish-site -- --api https://...`.

**Wichtig:** Das braucht einen laufenden Server. GitHub Pages liefert nur statische Dateien aus – die dort veröffentlichten Entwürfe bleiben also ohne `--api` und damit in der Vorschau-Fassung. Für einen echten Kunden läuft der Wirt-Server auf seinem eigenen Hosting (oder deinem), und die Seite zeigt auf diese Adresse.

## Tests ausführen

Es gibt Unit-Tests für die Filterlogik, den Landing-Page-Generator und den Speisekarten-Katalog, die **ohne** echten API-Key laufen:
```bash
npm test
```

## Geplante Erweiterungen (nicht Teil dieser ersten Version)

- Outreach-Anschreiben pro Lead vorbereiten (Versand bleibt bewusst manuell freizugeben).
