# Runde 4 – Video (einmal), AP7 Karte/Bestellen mobil, AP8 Reservierung/Anfahrt/Fuß

## Video

Das vom Inhaber gelieferte Video ist als `heroVideo` registriert (KI, gekennzeichnet). Fassungen:
- MP4/H.264, 1,5 MB, ohne Ton
- WebM/VP9, 1,2 MB, nur für Browser ohne H.264

Wiedergabe `einmal`:

| Prüfung (Browser) | Ergebnis |
|---|---|
| Desktop nach 1,5 s | läuft (Poster → Video weich überblendet) |
| Desktop nach 9,5 s | beendet, letztes Bild (Teller + Krug) bleibt stehen |
| Zurückscrollen zur Bühne | kein Neustart |
| Handy | kein Video – das Hochformat-Poster bleibt (es gibt kein Hochformat-Video) |
| Reduzierte Bewegung | kein Video |

Bilder: `desktop--video-1s.jpg`, `desktop--video-ende.jpg`.

**Hinweis:** Auf dem Bierkrug im Video steht ein markenähnlicher Schriftzug. Auf einer erfundenen Beispielseite
ist das vertretbar; für eine Kundenseite ein Video ohne erkennbare Marke verwenden.

## AP7 – Karte und Bestellen mobil

- **Sprungleiste der Kategorien:** läuft auf dem Handy unter der Kopfzeile mit und markiert die aktuelle
  Kategorie (`aria-current`). Ein Tipp springt so, dass die Kategorie sichtbar unter Kopfzeile und Leiste
  liegt (gemessen: Oberkante bei 158 px, Kopfzeile + Leiste enden bei ca. 150 px).
- **Plus-Knöpfe:** 40 px sichtbar, 48 px Tippfläche.
- **Aktionsleiste:** verschwindet, sobald ein Formularfeld den Fokus hat (Tastatur), und kommt danach
  wieder (gemessen: Deckkraft 0 → 1).
- Die Verträge `data-add` / `data-name` / `data-preis` und Drawer sind unverändert. Der Funktionsvertrag ist
  bestanden, die E2E-Tests sind grün.

**In der Runde korrigiert:** Nach einem Sprung lag die Kategorie hinter Kopfzeile und Leiste (bei 72 px).
Eine spezifischere Regel (`section[id]`) hatte den Sprungabstand überschrieben.

## AP8 – Reservierung, Anfahrt, Fuß

- **Reservierung:** ohne Häkchen-Liste. „Lieber anrufen?“ mit Nummer erscheint nur bei echter Nummer, nie auf
  erfundenen Seiten.
- **Anfahrt:** Die Adresse steht als Schild (Straße groß, Ort darunter). Darunter „Route planen“, bei echter
  Nummer zusätzlich Anrufen. Die Öffnungszeiten stehen als Tafel mit untereinander gesetzten Zeitfenstern;
  bei echten Betrieben sind sie als Platzhalter markiert.
- **Fuß:** große Wortmarke, Adresse mit Route, Telefon (nur echt), drei Anker und der Entwurfshinweis.

**In der Runde korrigiert:** Die Zeitfenster brachen auf Desktop mitten in Tagen und Uhrzeiten um.

## Kritik

**Trägt:**
- Die Karte ist auf dem Handy benutzbar wie eine App-Karte, ohne ihr Wirtshaus-Gesicht zu verlieren.
- Die Anfahrt liest sich wie ein Hausschild.
- Der Fuß schließt mit dem Namen statt mit einem Linkfriedhof.

**Offen:**
- Im Fuß bleibt die mittlere Spalte auf erfundenen Seiten leer (keine Nummer). Bei echten Betrieben steht dort das Telefon.
- Der Entwurfshinweis im Fuß ist lang; für Beispielseiten reicht der kurze Hinweis aus der Kopfzeile.
- Die Wortmarke bricht auf dem Handy zweizeilig (Kurzname im Dashboard, siehe Runde 2).
