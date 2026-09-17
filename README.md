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
- Kennzahlen oben (Anzahl Leads gesamt, "Sehr hoch"-Priorität, ohne Website)
- Tabelle sortierbar per Klick auf eine Spaltenüberschrift (Standard: nach Score)
- Filter nach Ort und Priorität, Suchfeld nach Name
- Website-Spalte verlinkt direkt zur jeweiligen Seite

Das Dashboard liest beim Aufruf einfach die vorhandenen CSV-Dateien neu ein – lass es also nach einem neuen `npm start`-Lauf laufen, um aktuelle Daten zu sehen (Browser-Seite neu laden reicht, der Server muss nicht neu gestartet werden). Es braucht keinen API-Key und läuft komplett offline auf deinem Rechner.

## Landing-Page-Entwürfe erzeugen

Für den Pitch lässt sich zu jedem Lead automatisch eine fertige Beispiel-Website erzeugen – mit Speisekarte, Online-Reservierung und Abholbestellung:

```bash
npm run pages
```

Die Seiten landen unter `data/landingpages/`. Öffne `data/landingpages/index.html` im Browser für die Übersicht, von dort geht es zu jedem einzelnen Entwurf.

Optionen:
```bash
npm run pages -- --region "Altötting"      # nur ein Ort
npm run pages -- --min-score 80            # nur die dringendsten Fälle
npm run pages -- --limit 10                # die Top 10 nach Score
npm run pages -- --email info@restaurant.de  # Bestellungen/Reservierungen per E-Mail versendbar machen
```

Was jede erzeugte Seite kann:
- **Tisch reservieren** – Datum, Uhrzeit, Personenzahl, Kontaktdaten, mit Pflichtfeldprüfung
- **Abholung vorbestellen** – Gerichte in den Warenkorb legen, Menge ändern, Abholzeit wählen, Gesamtsumme live berechnet
- **Kontakt & Anfahrt** – Telefonnummer als Direktwahl-Link, Adresse mit Route-planen-Link zu Google Maps
- Echte Google-Bewertung des Restaurants im Kopfbereich
- Mobilfreundlich, ohne externe Abhängigkeiten – eine einzige HTML-Datei pro Restaurant

Die **Speisekarte wird anhand des Restaurantnamens passend gewählt** (Pizzeria → italienisch, Döner → türkisch, Gasthof → bayerisch usw.). Gerichte, Preise und Öffnungszeiten sind bewusst Platzhalter und auf der Seite auch als solche gekennzeichnet – sie werden vor einer Veröffentlichung durch die echten Angaben des Wirts ersetzt.

## Tests ausführen

Es gibt Unit-Tests für die Filterlogik, den Landing-Page-Generator und den Speisekarten-Katalog, die **ohne** echten API-Key laufen:
```bash
npm test
```

## Geplante Erweiterungen (nicht Teil dieser ersten Version)

- Outreach-Anschreiben pro Lead vorbereiten (Versand bleibt bewusst manuell freizugeben).
