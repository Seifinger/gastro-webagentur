# „Passt gut dazu“ – Empfehlungen im Warenkorb

Stand: 26.09.2026.

## 1. Bestand, auf dem das Feature aufsetzt

| Was | Wo |
|---|---|
| Kanonische Karte: Kategorien, Gruppen, Gerichte, Varianten, Extras, ausverkauft/ausgeblendet, stabile Kennungen (`schluessel`, Varianten `schluessel--variante`) | `v2/build/speisekarte.js` (`karteAusDaten`) |
| Warenkorb-Katalog `{ id: [Name, Preis] }` – nur Bestellbares | `karteAusDaten(...).katalog`, auf der Seite `PAGE_DATA.warenkorb.karte` |
| Warenkorb, Summe, Abholzeit, Checkout, Absenden | `PAGE_SCRIPT` in `src/landingPageGenerator.js` (von v2 unverändert übernommen, `v2/build/v1Funktionen.js`) |
| Bestellübersicht | Drawer aus `renderBestellweg` (`v2/build/sektionen/service.js`) |
| Kundenkarte (bestätigt/unbestätigt, Bilder) | `src/kundenProjekt.js` → `karteFuerBau` |
| Musterkarten der 12 Küchen | `src/menuCatalog.js` |
| Serverseitige Prüfung (Name und Preis aus der Karte, Ausverkauftes abgelehnt) | `betriebStore.legeBestellungAn` → `pruefePositionenGegenKarte` mit `bestellkarte` |
| Wirt-Dashboard | `public/wirt.html` + `src/wirtServer.js` (v2-Hülle `wirtServerV2.js` reicht durch) |

Extras sind auf der Karte nur Text (keine Auswahl im Warenkorb). Empfehlungen bieten deshalb Varianten an, aber keine Extras.

## 2. Wo es erscheint

Im Warenkorb-Drawer auf Startseite **und** Speisekarten-Seite, direkt unter den gewählten Positionen und vor Abholzeit, Kontaktfeldern und dem Absenden-Knopf. Nur auf Seiten mit Speisekarten-Seite (Ausdruck) und Bestellweg. Seiten ohne Ausdruck bleiben Byte für Byte gleich (Snapshot-Test).

Pro Vorschlag: Name, vorhandene Kurzbeschreibung (an der Wortgrenze gekürzt), aktueller Preis aus dem Katalog, Bild nur wenn zulässig (Kundenseite: nur bestätigt), bei mehreren Varianten eine Auswahl, Knopf „Hinzufügen“. Höchstens zwei Vorschläge; ohne passenden Vorschlag ist das Modul ganz ausgeblendet. Kein Popup, nichts vorausgewählt, nichts automatisch im Warenkorb.

Nach „Hinzufügen“: Der Knopf ist ein ganz normaler Hinzufügen-Knopf des bestehenden Warenkorbs (`data-add`). `PAGE_SCRIPT` legt das Produkt zum Katalogpreis hinein und aktualisiert Summe und Checkout. Das Modul rechnet neu: Das hinzugefügte Produkt verschwindet, eine Meldung „… liegt jetzt im Warenkorb.“ bekommt den Fokus.

## 3. Regeln (`src/empfehlungen.js`, im Browser und auf dem Server dieselbe Funktion)

**Rollen:** Vorspeise, Salat, Beilage (gemeinsamer Platz „Ergänzung“), Hauptgericht, Dessert, Getränk. Reihenfolge: Einstellung des Wirts → optionales Feld `empfehlungsrolle` am Gericht, an der Gruppe oder an der Kategorie → Name der Gruppe bzw. Kategorie („Antipasti“, „Nachspeisen“, „Getränke“ …). Passt ein Kategoriename zu zwei Plätzen („Pasta & Dolci“), bleibt die Rolle offen; in den Musterkarten stehen dafür Rollen am Gericht.

**Standardregeln:**
- Hauptgericht im Warenkorb, noch keine Vorspeise/Salat/Beilage → eines davon
- Hauptgericht im Warenkorb, noch kein Dessert → Dessert
- noch kein Getränk → Getränk

**Vorrang:** Kombinationen des Wirts → bevorzugte Produkte (wenn ihr Platz offen ist) → Standardregeln. Je Platz höchstens ein Vorschlag, gesamt höchstens zwei.

**Harte Filter (auch für Regeln des Wirts):**
- nur eigene Karte, nur Bestellbares (nicht ausverkauft, nicht ausgeblendet, Preis über 0 €)
- mit Betriebsserver zusätzlich nur, was dessen Karte zum selben Preis führt
- nichts, was schon im Warenkorb liegt (außer „mehrfach“)
- kein Hauptgericht, wenn schon eines im Warenkorb liegt (keine zweite Pizza/Pasta); das Dashboard lehnt auch Kombinationen „Hauptgericht zu Hauptgericht“ ab
- nichts Ausgeschlossenes; auf Kundenseiten nichts Unbestätigtes

**Deterministisch:** gleicher Warenkorb, gleiche Karte, gleiche Regeln → gleiche Vorschläge (Reihenfolge der Karte, „Signatur“ zuerst). Kein Zufall, keine Rotation, keine Gästehistorie.

**Ernährung:** keine Vermutung. Nur wenn alle Speisen im Warenkorb laut Karte vegetarisch sind, rücken vegetarisch gekennzeichnete Vorschläge innerhalb ihres Platzes nach vorn. Ausgeschlossen wird deshalb nichts, und es wird keine Eignung behauptet.

## 4. Steuerung durch den Wirt

Wirt-Dashboard → Reiter **„Empfehlungen“**:
- Funktion an/aus, Standardregeln an/aus
- je Produkt: Rolle (automatisch oder fest), „Nach Regeln“ / „Bevorzugt“ / „Nie empfehlen“, „mehrfach“
- Reihenfolge der bevorzugten Produkte
- Kombinationen „Wenn im Warenkorb [Kategorie | Rolle | Produkt] → dann [Produkt] oder [Produkt] oder [Produkt]“
- Vorschau mit Beispiel-Warenkorb (auch mit ungespeicherten Einstellungen)
- Wirkung, nur aggregiert: Bestellungen mit empfohlenen Produkten, Stück, Bestellwert dieser Produkte (letzte 30 Tage / gesamt, ohne abgelehnte und stornierte)

Gespeichert wird in der Datei des Betriebs (`data/betrieb/<slug>.json`, Feld `empfehlungen`). Das gilt strikt je Betrieb und bleibt nach einem Neustart erhalten. Produkte, die nicht auf der hinterlegten Karte stehen, lehnt der Server ab. Die Produktliste stammt aus der Bestellkarte, die der Bau einer Kundenfassung übergibt (`kundenBau.synchronisiereBetrieb` → `setzeBestellkarte({ katalog, produkte })`).

Routen: `GET /api/empfehlungen`, `POST /intern/empfehlungen`, `POST /api/empfehlungen/vorschau` (Wirt-Zugang) und `POST /oeffentlich/empfehlungen` (Seite: Regeln und Katalog, nichts Personenbezogenes).

Mit Betriebsserver zeigt die Seite erst dann etwas, wenn sie dessen Einstellungen geladen hat. Ist die Funktion abgeschaltet oder der Server nicht erreichbar, bleibt das Modul aus. Bestellen geht in beiden Fällen.

## 5. Demos und echte Kunden

- **Fiktive Beispielseiten / Konzept-Demos:** Musterprodukte mit Marke „Muster“ und Hinweis. Kein Betriebsserver, also kein Versand; die Bestätigung sagt „Vorschau – nichts bestellt“. Konzept-Demos sind auch mit bekanntem Server nie live.
- **Kundenseiten:** nur bestätigte Gerichte und bestätigte Bilder, keine Muster-Marke. Unbestätigte Gerichte zählen im Warenkorb mit, werden aber nie vorgeschlagen.

## 6. Erfolgsnachweis ohne Tracking

Legt ein Gast etwas über „Passt gut dazu“ in den Warenkorb, merkt sich die Seite das nur für die laufende Bestellung (sessionStorage dieser Website, kein Cookie). Beim Absenden trägt die Position `empfohlen: true` und `empfohlenMenge`. `PAGE_SCRIPT` bleibt dafür unverändert: Eine schmale Brücke ergänzt nur die eine Anfrage an `…/oeffentlich/bestellung` des eigenen Betriebsservers. Der Server übernimmt die Angabe an die geprüfte Position. Das Dashboard zeigt nur Summen.

## 7. Tests

- `test/empfehlungen.test.js`: Rollen, Standardregeln (Pizza, Pasta, Dessert), Filter (ausverkauft, deaktiviert, ohne Preis, Server-Karte), höchstens zwei, Determinismus, Japanisch/Indisch/Café, Ernährung, Wirt aus, Priorisierung, Fallback bei ausverkaufter Kombination, Validierung, Einbau in die Seite, Konzept-Demo, Kundenseite A/B, Einstellungen je Betrieb und nach Neustart, Markierung, Preisprüfung, Statistik
- `test/empfehlungen-browser.test.js`: Chromium mit Desktop, Tastatur (Variante, Hinzufügen, Fokus), Summe, Absenden an den Server, Bestellung ohne Empfehlung, Wirt schaltet ab, Handy 360 px, Beispielseite ohne jeden Versand, Wirt-Dashboard (Vorschau, Ausschließen, Speichern)
