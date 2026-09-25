# Kundenwebsites im vorhandenen Editor

Stand: 25.09.2026. Es gibt **keinen zweiten Editor**. Die bestehende Bearbeiten-Ansicht (`public/bearbeiten.html` mit Demo-Panel) hat jetzt zwei Modi.

## 1. Bestand vor dieser Erweiterung

| Was | Wo | Bearbeitbar |
|---|---|---|
| Lead-Demo: Küche, Vorlage, Farbschema, Slogan, bestätigte Angaben (Name/Adresse/Telefon), lokaler Bau, Präsentation | Demo-Panel (`v2/integration/demoPanel.browser.js`, Server `demoDashboard.js`) → `data/lead-edits/<slug>.json`, `data/kuechen.json`, `data/stimmungen.json`, Manifest | ja |
| Bilder hero/haus/team/bestseller (v1-Rollen) | Bild-Raster in `bearbeiten.html` → `public/uploads/<slug>/` + `lead-edits.bilder` | ja (JPEG, verkleinert) |
| Headline/Schlagzeile/Gerichtsbeschreibungen per Prompt (Anthropic) | `promptEdits.js` → `lead-edits.texte` | ja |
| Speisekarte des Betriebs | `lead-edits.speisekarte` wurde gelesen (`karteDesBetriebs`) | **nur von Hand in JSON** |
| Logo, Favicon, Hero-Video/Poster je Gerät, Alt-Texte, Öffnungszeiten, Allergene, Preise | – | **nein** |
| Kundenprojekt (eigene Fassung, Status, Freigabe) | – | **fehlte** |
| Preisprüfung beim Bestellen | Server übernahm Preise ungeprüft aus dem Browser | **fehlte** |

Wiederverwendet statt neu gebaut:
- Seite, Anmeldung bzw. Token und Upload-Verfahren (`bildUpload.js`: Byte-Prüfung, multipart)
- Bauweg der Demos (`baueImZyklus`) mit derselben Vorlage
- Medienauflösung (`loeseMedien`)
- Speisekarten-Aufbereitung (`karteAusDaten`, stabile Schlüssel)
- Rechtstext-Stand des Wirt-Betriebs für die Veröffentlichungsprüfung

## 2. Modi

- `bearbeiten.html?lead=<slug>` → **Konzept-Demo** (unverändert), dazu der Kasten „Kundenwebsite“ mit „Kundenfassung aus dieser Demo anlegen“ und Links zu bestehenden Fassungen.
- `bearbeiten.html?kunde=<k-id>` → **Kundenwebsite**. Oben schaltet der Umschalter „Konzept-Demo / Kundenwebsite“ zurück zur Demo.
- `bearbeiten.html` ohne Angabe → Liste der Kundenfassungen und „Testkunde aus einer fiktiven Beispielseite“.

Beim Anlegen werden übernommen:
- **Designrichtung:** Küche, Farbschema, Vorlage.
- **Als unbestätigter Entwurf:** Name, Adresse und Telefon aus der Demo sowie die Musterkarte. Jedes Mustergericht ist als „Muster – unbestätigt“ markiert.

Die Lead-Demo bleibt unverändert, `lead-edits` wird nicht angefasst.

## 3. Bearbeitbare Felder

Jedes Feld zeigt aktuellen Wert, Quelle, Status (fehlt / Vorlagentext / Entwurf / vom Kunden bestätigt / freigegeben) und die passenden Aktionen (Speichern, Bestätigen, Entfernen).

- **Marke:** Restaurantname, Unterzeile (Küche · Ort), Slogan, kurzer Hero-Text, Farbschema (eins der drei der Küche), Logo (ersetzt die Wortmarke in der Kopfzeile), Favicon.
- **Hero:** Poster Desktop (quer), Poster Mobile (hoch), Video Desktop, Video Mobile, Fokus (Bildausschnitt) für die Poster.
- **Texte:** Überschrift und Einleitung Empfehlungen, Überschrift und Text „Über uns“ (Geschichte), Überschrift und Einleitung der Kartenauswahl, Einleitung der Speisekarten-Seite, Hinweis unter der Karte, Knopftexte Reservieren/Bestellen, Alt-Text des Hero-Bilds, Satz in der Fußzeile; dazu Alt-Texte je Bild.
- **Bilder:** Außenansicht/Gastraum (Haus-Band). Produktbilder je Gericht stehen in der Speisekarte.
- **Speisekarte:**
  - Kategorien anlegen, umbenennen, leere löschen
  - Gerichte mit Name, Beschreibung, Preis, Varianten und Extras mit Preisen, verfügbar/ausverkauft, sichtbar, vegetarisch, Allergene/Zusatzstoffe (vom Betrieb geliefert), Produktbild
  - Gerichte verschieben, hinzufügen, löschen
- **Betrieb:** Adresse, Telefon, E-Mail, Wirt-Betrieb (Kürzel), Adresse des Bestellservers, Öffnungszeiten und Ausnahmen, Online-Bestellung an/aus.

Pflicht für die Freigabe:
- Name, Adresse, Telefon, Unterzeile, Hero-Text, Geschichte/Über uns, Öffnungszeiten, Poster Desktop
- alle sichtbaren Gerichte bestätigt und mit Allergenangaben
- keine offenen Uploads

Die Pflicht für Unterzeile, Hero-Text und Geschichte gibt es, weil dort sonst der Mustertext der Küche stünde.

## 4. Absichtlich gesperrt

Sektionsreihenfolge, Hero-Aufbau, Kopfzeile, Typografie, Motion, Raster, Abstände und Design-Tokens sind gesperrt. Es gibt kein Drag-and-drop und keine CSS- oder JS-Eingabe. **Galerie** und **Team-Foto** existieren in den Standardvorlagen nicht (eine Galerie wäre eine neue Sektion); das Haus-Band trägt genau ein Bild. Reservierung ist in jeder Vorlage enthalten und nicht abschaltbar. Layout-Wünsche gehen weiter an Claude Code im Chat.

Die einzigen Vorlagen-Ergänzungen – alle nur aktiv, wenn der Inhalt existiert, deshalb bleiben Demo- und Beispielseiten Byte für Byte gleich (Snapshot-Test):
- Logo-Bild im vorhandenen Element der Wortmarke (`.kopf-marke`) und Favicon-Datei
- Allergen-Zeile in der Speisekarten-Zeile
- Öffnungs-Ausnahmen als weitere Zeilen der vorhandenen Tafel
- Alt-Text je Medium
- ein leerer Fußzeilensatz entfällt

## 5. Speicher

- `data/kunden/<k-id>/projekt.json`: Inhalte, Status, Freigabe, Verlauf, Revision.
- `data/kunden/<k-id>/medien/`: Medien mit Dateinamen, die der Server vergibt; nie Nutzerpfade.
- Beide Ordner sind gitignoriert und werden nur über geschützte `/intern/`-Routen ausgeliefert.
- **Gebaute Vorschau:** `v2/output/kunden/<k-id>/` (gitignoriert). Anzeige unter `/intern/kunde/<k-id>/vorschau/` mit `noindex`, nie in `docs/`.
- **Dashboard und Chat nutzen denselben Stand:** `npm run kunde -- …` (`scripts/kunde.mjs`) ruft dieselben Funktionen auf.
- **Revisionszähler:** Speichert das Dashboard mit veralteter Revision, antwortet der Server mit 409 „bitte neu laden“ – es wird nichts überschrieben.

## 6. Speisekarte, Warenkorb, Server

Die Projektkarte ist die kanonische Karte. Jedes Gericht behält seine ID `g-…`, auch beim Umbenennen, Verschieben oder Bildwechsel. Aus dieser ID entstehen:
- Anker (`speisekarte/#gericht-g-…`),
- Warenkorb-Schlüssel,
- Katalog des Servers.

Beim Bau wird der Katalog `{ id: [Name, Preis] }` zusammen mit Öffnungszeiten und Rückfragenummer an den verknüpften Wirt-Betrieb übergeben (`bestellkarte`). Das geschieht nur, solange die Kundenfassung nie live war.

Der Wirt-Server prüft dann jede Position gegen diese Karte:
- Unbekannte oder ausverkaufte Gerichte werden abgelehnt.
- Ein abweichender Preis wird mit „Preis hat sich geändert (jetzt …)“ abgelehnt.
- Name und Preis kommen immer vom Server.
- Betriebe ohne Bestellkarte verhalten sich wie bisher.

## 7. Ablauf und Stufen

Bearbeiten → **Entwurf** (gespeichert) → „Nur diese Kundenwebsite lokal bauen“ → **lokal gebaute Vorschau** (Desktop und Mobile im Editor) → „Inhalte freigeben …“ (nur bei aktuellem Bau ohne inhaltliche Lücken; Name des Freigebenden) → **freigegebene Fassung** → **deployment-ready** → **live**.

- **deployment-ready** setzt zusätzlich voraus: Wirt-Betrieb verknüpft, HTTPS-Bestellserver, Impressum und Datenschutz des Restaurants freigegeben.
- **live** steht immer auf „noch nie veröffentlicht“.
- **Prüfsumme:** Jede Stufe gilt nur für den Inhaltsstand (SHA-256), auf dem sie beruht. Eine spätere Änderung macht Bau und Freigabe sichtbar „veraltet“.
- **Alte Medien:** Sie bleiben bis zur Freigabe als „vorher“ erhalten und können zurückgesetzt werden. Bei der Freigabe werden nicht mehr benutzte Dateien entfernt.

**Veröffentlichen (später):** `veroeffentlichungsPlan()` liefert heute nur den Plan und die Hindernisse; im Editor gibt es dafür nur eine Beschreibung, keinen Knopf. Der spätere Schritt würde:
1. die freigegebene Prüfsumme unverändert neu bauen, mit öffentlicher Bestellserver-Adresse und relativen Schriftpfaden;
2. Karte und Öffnungszeiten an den Wirt-Server übergeben;
3. das Paket auf das Hosting der Kundendomain laden und die Erreichbarkeit prüfen;
4. `live` vermerken.

## 8. Vor dem ersten echten Kundenlaunch fehlen

- Kundendomain, Hosting der Kundenseite und öffentlich erreichbarer Wirt-Server (HTTPS, `WIRT_PASSWORT`)
- Echte Inhalte vom Kunden:
  - Logo (Raster, keine SVG)
  - Fotos: Hero quer/hoch, Haus, Gerichte
  - Texte: Geschichte, Hero-Text, Unterzeile
  - vollständige Karte mit Preisen und **Allergenen/Zusatzstoffen**
  - Öffnungszeiten und Ausnahmen
  - E-Mail
- Impressum und Datenschutzerklärung des Restaurants, im Wirt-Dashboard freigegeben
- AVV und Rollen (Agentur, Hosting, Mail)
- Freigabe der Inhalte durch den Kunden (Name, Zeitpunkt)

## Tests

| Datei | Inhalt |
|---|---|
| `test/kundenProjekt.test.js` | Anlegen, Felder, Konflikt Dashboard↔Chat, Medienprüfung, Ersetzen, Trennung der Kunden, Karte↔Warenkorb↔Server, Bau ohne Fremdmaterial, Layout-Skelett, Stufen/Freigabe, Zugriffsschutz, neuer Prozess |
| `test/kundenEditor-browser.test.js` | Pilot im echten Editor mit Vorher/Nachher-Screenshots (Pfad über `KUNDEN_SCREENSHOTS`) |
