# Rabattaktionen für Abholbestellungen

Stand: 26.09.2026.

## 1. Bestand und Architektur

| Was | Wo |
|---|---|
| Kanonische Karte, stabile Gericht-/Varianten-IDs | `v2/build/speisekarte.js` (`karteAusDaten`), Kundenkarte `src/kundenProjekt.js` |
| Warenkorb, Summe, Checkout (alle Seiten) | `PAGE_SCRIPT` in `src/landingPageGenerator.js`, von v2 übernommen |
| Katalog des Servers `{ id: [Name, Preis] }` + Produkte mit Kategorie | `bestellkarte` im Betriebsspeicher, übergeben beim Bau (`v2/integration/kundenBau.js`) |
| Serverseitige Preisprüfung | `betriebStore.legeBestellungAn` → `pruefePositionenGegenKarte` |
| Statistik „Bestellwert“ | `src/statistik.js` (Summe von `gesamt`) |
| No-Show-Rechnung | `src/rechnungGenerator.js` (liest Positionen und `gesamt` der Bestellung) |
| Live-Abfragen vorhandener Art | `/oeffentlich/abholzeiten`, `/oeffentlich/rechtstexte`, `/oeffentlich/empfehlungen` |

**Wie eine Aktion ohne Neuveröffentlichung sichtbar wird:** Die Kundenseite ist statisch. Sie kennt aber die Adresse ihres Wirt-Servers (`apiUrl`) und fragt schon heute live Abholzeiten und Rechtstexte ab. Genauso fragt `PAGE_SCRIPT` jetzt `POST /oeffentlich/preise` ab: beim Laden, beim Öffnen des Warenkorbs (höchstens einmal pro Minute) und genau dann, wenn laut Server eine Aktion beginnt oder endet (`naechsteAenderung`). Die Antwort enthält nur Kennungen mit gerade gültigem Rabatt und fertig berechnete Preise. Das HTML trägt nur reguläre Preise und Anker (`data-preis-fuer`, `data-aktion-fuer`).

## 2. Modell (je Betrieb, `data/betrieb/<slug>.json` → `rabattaktionen`)

```
{ id: "ra-…", name, art: "abholung" | "gericht",
  rabatt: { typ: "prozent", wert } | { typ: "betrag", cent },
  gerichte: [Gericht-IDs], ausgenommeneKategorien: [Kategorien],
  start, ende|null (ISO, absolute Zeitpunkte), zeitzone,
  status: "aktiv" | "pausiert" | "beendet", beendetAm?, erstellt, geaendert }
```

- Standardmäßig gibt es keine Aktionen.
- Allgemeiner Abholrabatt: nur Prozent. Er gilt für alle online bestellbaren Produkte, optional ohne einzelne Kategorien, und nur für Abholbestellungen (Reservierungen haben keine Preise).
- Gericht-Rabatt: Prozent oder fester Euro-Betrag. Er gilt für alle Varianten des Gerichts. Extras sind nur Text auf der Karte und haben keine Preiswirkung.

**Prüfungen:**
- Name, Art, Wert > 0, Prozent ≤ 100 (höchstens zwei Nachkommastellen)
- Euro-Betrag nur bei Gericht-Rabatt und nie über dem Preis der kleinsten Variante
- Ende nach dem Start und nicht in der Vergangenheit
- nur Gerichte der eigenen, hinterlegten Karte: nicht gelöscht, nicht ausverkauft, freigegeben
- ohne Karte keine Aktion

## 3. Rechnung (`src/rabattaktionen.js`)

- In Cent, je Einheit. Prozent-Rabatt kaufmännisch gerundet (ab 0,5 Cent aufwärts). Endpreis = regulär − Rabatt, nie unter 0. Positionswert = Endpreis × Menge.
- **Überschneidung:** Rabatte werden nicht addiert. Treffen mehrere Aktionen zu, gilt der für den Gast günstigere Endpreis. Beispiel: 12,00 € – allgemein 10 % ergibt 10,80 €, Gericht −2,00 € ergibt 10,00 €, der Gast zahlt 10,00 €. Bei Gleichstand gewinnt die Gericht-Aktion, dann die früher begonnene.
- **Zeit:** Maßgeblich ist der Zeitpunkt der Bestellabgabe (Serveruhr), nie die Abholzeit. Das Intervall ist [Start, Ende): Start zählt ab der Minute, Ende gilt ab der Minute nicht mehr. Die Eingabe erfolgt als Wanduhrzeit in der Zeitzone des Betriebs.
  - Eine Uhrzeit, die es beim Wechsel auf Sommerzeit nicht gibt, wird abgelehnt.
  - Eine doppelte Uhrzeit beim Wechsel auf Winterzeit gilt beim ersten Mal.
  - Wochentags- oder Uhrzeitfenster gibt es bewusst nicht (Kernauftrag: Start/Ende, aktiv/pausiert).

## 4. Server als Preis-Autorität

1. Der Browser schickt wie bisher je Position die ID und den regulären Katalogpreis (Prüfung „Preis hat sich geändert“ bei einem Neubau der Karte). Dazu schickt er nur `erwarteterBetragCent`: den Betrag, den der Gast gesehen hat, als Zustimmung, nicht als Vorgabe.
2. Der Server rechnet mit den gerade gültigen Aktionen neu. Weicht sein Endbetrag ab, antwortet er mit **409 `PREIS_GEAENDERT`** und dem aktuellen Preisstand, und es wird nichts gespeichert. Der Warenkorb zeigt sofort den neuen Betrag; der Gast schickt bewusst erneut ab.
   - Das gilt auch für Seiten, die gar keinen Betrag schicken (ältere Fassung) oder die nur reguläre Preise zeigen konnten, weil der Live-Dienst nicht erreichbar war.
3. Angenommen: Positionen tragen den vereinbarten Einzelpreis (`preis`), bei Rabatt zusätzlich `regulaerPreis` und `aktion { id, name, text }`. `gesamt` ist der Endbetrag. Dazu kommt der unveränderliche Nachweis `preisermittlung` mit Zeitpunkt, Zeitzone, Zwischensumme, Ersparnis, Endbetrag und je Position regulär/Endpreis/Rabatt/Aktion samt ID und Regel. Er wird nie neu berechnet; eine später beendete oder neue Aktion ändert ihn nicht.

## 5. Anzeige

- **Speisekarte, Auswahl der Startseite, Tisch, „Passt gut dazu“:** Aktionspreis, daneben „statt“ und der durchgestrichene reguläre Preis, dazu „Aktion „Name“ −10 % · bis …“. Nur mit live bestätigtem Stand.
- **Warenkorb:** je Position der Stückpreis mit „statt …“ und die Aktion, darüber „Zwischensumme (regulär)“ und „Ersparnis durch Aktionen“, dann der zu zahlende Gesamtbetrag. Die Bestätigung nennt den vom Server bestätigten Gesamtbetrag und die Ersparnis.
- **Server nicht erreichbar:** nur reguläre Preise. Ein bereits gezeigter Aktionspreis verschwindet, wenn ein Neuladen scheitert.
- **Beispielseiten und Konzept-Demos:** Sie haben keinen Betriebsserver und fragen keine Preise ab. Beispielaktionen zeigen sie bewusst nicht.

## 6. Wirt-Dashboard → Reiter „Rabattaktionen“

- **Anlegen:** Name, Art, Prozent/Euro, Wert, Gerichte aus der eigenen Karte (nicht freigegebene sind ausgegraut) bzw. geltende Kategorien, Start/Ende, optional pausiert.
- **Vorschau:** regulär, mit dieser Aktion, was der Gast wirklich zahlt – samt offenem Hinweis, wenn eine andere, günstigere Aktion greift.
- **Listen:** laufende/geplante/pausierte Aktionen mit Zustand, Zeitraum, Geltungsbereich und Preisen; Pausieren, Fortsetzen, Beenden. Darunter abgelaufene und beendete Aktionen.
- **Bestellungen:** je Position Aktion und regulärer Preis, dazu „Vor Rabatt“ und „Ersparnis durch Aktionen“.
- **Statistik:** „Bestellwert“ ist der vereinbarte Betrag nach Rabatt und ausdrücklich kein bezahlter Umsatz. „vor Rabatt (nur zur Einordnung)“ und „gewährte Rabatte“ erscheinen zusätzlich, wenn es Rabatte gab.
- **Routen:** `GET /api/rabattaktionen`, `POST /intern/rabattaktionen`, `POST /intern/rabattaktionen/status`, `POST /api/rabattaktionen/vorschau` (Wirt-Zugang) und `POST /oeffentlich/preise` (Seite).

## 7. Vor einem Live-Launch prüfen (Preiswerbung)

- **§ 11 PAngV (Preisermäßigung):** Wird eine Ermäßigung mit einem „statt“-Preis beworben, muss der Vergleichspreis der niedrigste Preis der letzten 30 Tage vor der Ermäßigung sein. Die Seite zeigt heute den aktuellen regulären Katalogpreis. Wurde dieser in den letzten 30 Tagen gesenkt oder lief schon eine Aktion, kann der „statt“-Preis unzulässig sein. Eine Preishistorie gibt es noch nicht.
- **Gesamtpreise (PAngV):** Die Endpreise sind inklusive MwSt. zu verstehen; für Abholung gibt es keine Versandkosten. Der Hinweis dazu ist fachlich zu bestätigen.
- **Zeitliche Befristung:** „bis …“ steht nur, wenn ein Ende gesetzt ist. Unbefristete Aktionen und lange „Dauer-Rabatte“ sind rechtlich zu bewerten (Irreführung, UWG).
- **Aktionsname:** Er erscheint wörtlich beim Gast. Werbeaussagen im Namen („Bester Preis der Stadt“) prüfen.
- **100-%-Rabatte / 0,00 €:** technisch erlaubt (nie negativ). Ob „gratis“ so beworben werden darf, ist zu prüfen.
- **Rechnung/Nachweis:** Die No-Show-Rechnung nennt den vereinbarten Preis samt Aktion. Steuerliche Anforderungen an Belege (Kasse vor Ort) bleiben außerhalb dieses Systems.
