# gastro-webagentur

Lead-Generierung für die Restaurant-Web-Agentur: findet Gaststätten in einer Region, die (noch) keine Website bei Google hinterlegt haben – als priorisierte Liste für den persönlichen Vor-Ort-Pitch.

## Was macht das Skript?

Es durchsucht über die **Google Places API** die konfigurierten Orte (`data/regions.json`, aktuell: Mühldorf am Inn, Altötting, Tüßling, Kraiburg am Inn) nach Restaurants und speichert das Ergebnis als CSV-Datei unter `data/output/`. Restaurants **ohne** hinterlegte Website werden dabei ganz oben in der Liste einsortiert – das sind die vielversprechendsten Leads für den Pitch.

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

### 7. Ergebnis ansehen
Nach dem Lauf findest du für jeden Ort eine CSV-Datei unter `data/output/`, z. B. `leads-mühldorf-am-inn-2026-09-17.csv`. Öffne sie in Excel/Numbers/Google Sheets. Spalten:

| Spalte | Bedeutung |
|---|---|
| `name` | Name des Restaurants |
| `adresse` | Adresse laut Google |
| `telefon` | Telefonnummer (falls hinterlegt) |
| `website` | Website-URL (falls vorhanden) |
| `hatWebsite` | `true`/`false` – Hauptkriterium für die Priorisierung |
| `rating` | Google-Bewertung |
| `anzahlBewertungen` | Anzahl Bewertungen |
| `placeId` | Interne Google-ID (für Debugging) |
| `ort` | Suchregion |

Restaurants ohne Website stehen ganz oben – das sind deine heißesten Leads für Phase 3 (Vor-Ort-Pitch).

## Tests ausführen

Es gibt Unit-Tests für die Filterlogik, die **ohne** echten API-Key laufen:
```bash
npm test
```

## Geplante Erweiterungen (nicht Teil dieser ersten Version)

- Automatische Erkennung "veraltet wirkender" Websites (z. B. fehlende Mobile-Optimierung) – aktuell markiert das Skript nur "hat Website" vs. "keine Website"; ob eine vorhandene Website veraltet wirkt, musst du aktuell noch manuell in der CSV beurteilen.
- Demo-Ordner-Generierung (Phase 2 des Businessplans).
