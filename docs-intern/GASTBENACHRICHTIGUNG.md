# Gastbenachrichtigung: Status-Link, E-Mail, Anruf

Stand: 25.09.2026. Gilt für den Wirt-Server (`npm run wirt`, `npm run v2:wirt`) und alle Landing-Pages, die mit `--api` an ihn angebunden sind (v1 und v2 teilen sich das Seiten-Skript).

## Kurzfassung

| Kanal | Kosten | Aktiv oder abrufen? | Voraussetzung |
|---|---|---|---|
| Persönlicher Status-Link | keine | **nur abrufen** – der Gast sieht Änderungen, wenn er den Link öffnet | laufender, öffentlich erreichbarer Wirt-Server |
| Transaktionale E-Mail | Resend (Gratis-Kontingent) | aktiv | Gast gibt freiwillig eine Adresse an; `RESEND_API_KEY`, `GAST_EMAIL_ABSENDER`, `WIRT_OEFFENTLICHE_URL` |
| Anruf durch den Wirt | keine | aktiv, von Hand | Telefonnummer des Gastes (Pflichtfeld wie bisher) |
| SMS | kostenpflichtig | aktiv | nur, wenn jemand ausdrücklich einen Anbieter in `smsHook` einträgt – **nicht** Teil des Standards |

Eine Telefonnummer allein ermöglicht **keine** kostenlose automatische Benachrichtigung. Sie dient für Rückfragen und den Anruf des Wirts.

## Status aus Sicht des Gastes

„Ihre Anfrage ist eingegangen“ und „Ihr Tisch ist bestätigt“ werden überall getrennt: in der Bestätigung nach dem Absenden, auf der Statusseite und in der E-Mail.

| Art | Gespeicherter Zustand | Gast sieht |
|---|---|---|
| Reservierung | `neu` | Anfrage eingegangen – noch nicht bestätigt |
| | `bestaetigt` | Ihr Tisch ist bestätigt |
| | `abgesagt` | Reservierung abgelehnt |
| | verschoben (`/api/reservierung/verschieben`) | bestätigt, **neuer Termin** hervorgehoben, ursprünglicher Termin genannt |
| Bestellung | `neu` | Bestellung eingegangen – noch nicht bestätigt (Abholzeit „gewünscht“) |
| | `bestaetigt` (v2: „in Zubereitung“) | Bestätigt – wird zubereitet (Abholzeit „bestätigt“) |
| | andere bestätigte Zeit / Verzögerung | **Neue Abholzeit** hervorgehoben, bisherige Zeit und Grund genannt |
| | v2-Küchenstatus `bereit` | Bereit zur Abholung |
| | `abgelehnt` / `storniert` | Bestellung abgelehnt / storniert |
| | `abgeholt` | Abgeholt (keine Nachricht) |

Reservierungen haben keine Gast-Stornierung; der Status „storniert“ gibt es deshalb nur für Bestellungen (bestehender Storno-Weg `/oeffentlich/bestellung/:id/stornieren`).

## Ereignisse und ausgelöste Meldungen

Eine Gastmeldung entsteht **ausschließlich** in `speichereBetrieb` (src/betriebStore.js) aus dem Vergleich „was stand auf der Platte“ ↔ „was wird gespeichert“ – in derselben Schreiboperation wie die Änderung selbst. Damit gilt für jeden Weg (v1-Dashboard, v2-Küchenstatus, Telegram-Knopf, Verzögerung):

- keine Meldung ohne tatsächlich gespeicherte Änderung;
- ein zweiter Klick auf „Bestätigen“ ändert nichts → keine zweite Mail;
- eine gescheiterte Mail rollt nichts zurück.

| Ereignis (`typ`) | Auslöser | E-Mail-Betreff |
|---|---|---|
| `eingegangen` | Online-Reservierung/-Bestellung gespeichert | „Anfrage/Bestellung eingegangen – noch nicht bestätigt“ |
| `bestaetigt` | Wirt bestätigt (v1-Knopf, v2 „in Zubereitung“, Telegram ✓) – mit anderer Zeit: ein einziges Ereignis mit Hinweis „mit geänderter Zeit“ | „Reservierung/Bestellung bestätigt“ |
| `abgelehnt` | Wirt sagt ab / lehnt ab | „… abgelehnt“ |
| `zeit-geaendert` | bereits bestätigte Zeit geändert (z. B. `POST /intern/bestellung/:id/verzoegerung`) | „Neue Abholzeit“ / „Termin geändert“ |
| `bereit` | v2-Küchenstatus bzw. Telegram „Bereit“ | „Bereit zur Abholung“ |
| `storniert` | Gast storniert die Bestellung | „Bestellung storniert“ |

Jede E-Mail enthält Betrieb, Art der Anfrage, Referenznummer, konkreten Status, Datum/Uhrzeit und den Link zur Statusansicht – keinen Namen, keine Telefonnummer des Gastes, keine Werbung.

Zustellung (`stelleGastMeldungenZu` in src/kundenBenachrichtigung.js):

- läuft nach jeder Wirt-/Gast-Aktion im selben Request (v1, v2, Telegram);
- je Meldung höchstens ein Versand; Meldungs-ID als `Idempotency-Key` bei Resend;
- liegen zu einem Eintrag mehrere offene Meldungen vor (z. B. „bestätigt“ und sofort „bereit“), geht nur die neueste raus, die ältere wird als „ersetzt“ vermerkt;
- Versandstand je Meldung: `keine-adresse`, `nicht-eingerichtet`, `ausstehend`, `wird-gesendet`, `uebergeben`, `fehlgeschlagen`, `ueberholt`, `demo`.

„Übergeben“ heißt: Resend hat die Mail mit einer ID angenommen. Das Dashboard sagt deshalb nie „Gast informiert“, sondern „an den Versanddienst übergeben (Zustellung nicht bestätigt)“.

## Was bei nur einer Telefonnummer passiert

1. Der Gast bekommt nach dem Absenden sofort Referenz, Status „eingegangen – noch nicht bestätigt“ und seinen Status-Link. Das Formular sagt vorher ehrlich: Der Link zeigt Änderungen nur beim erneuten Öffnen.
2. Es wird **kein** Sendeversuch unternommen (Versandstand `keine-adresse`).
3. Nach **Ablehnung, Terminänderung oder Verzögerung** zeigt das Wirt-Dashboard (und die Telegram-Nachricht nach einem Knopfdruck) in Rot: „Gast nicht automatisch informiert – bitte unter [Telefonnummer] anrufen.“
4. Dieselbe Warnung erscheint, wenn eine E-Mail-Adresse da ist, der Versand aber nicht eingerichtet ist oder scheitert. Gescheiterte Meldungen lassen sich im Dashboard gezielt „erneut senden“; eine übergebene nie ein zweites Mal.

## Status-Link: Sicherheit

- Link: `https://<WIRT_OEFFENTLICHE_URL>/status#<schlüssel>`. Der Schlüssel steht im **Fragment** – Browser schicken ihn nicht an Server, Proxys oder als Referrer; die Seite liest ihn per Skript und fragt `POST /oeffentlich/status` ab.
- Schlüssel = HMAC-SHA256(Geheimnis, Betrieb/Art/ID/Version), 256 Bit, base64url. Gespeichert wird nur sein SHA-256 (zum Nachschlagen), nicht der Schlüssel selbst. Die öffentliche ID oder Referenznummer allein öffnet nichts.
- Ungültig, widerrufen oder abgelaufen (30 Tage nach dem Termin) → dieselbe neutrale 404-Antwort. Mehr als 10 Fehlversuche in 10 Minuten je Adresse → 429.
- Antworten und Statusseite: `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`, eigene CSP ohne Fremdquellen.
- Statusseite zeigt nur Betrieb, Referenz, Status, Datum/Uhrzeit, Personenzahl (Reservierung), letzte Änderung, Rückrufnummer des **Restaurants**. Keine Gastdaten.
- Widerruf: Knopf „Status-Link sperren“ im Dashboard (`POST /intern/gastlink/widerrufen`). Alle Links auf einmal: `GAST_STATUS_GEHEIMNIS` austauschen.
- Demo: Seiten ohne `--api` (Entwürfe, Konzept-Demos, GitHub Pages) schicken nichts ab. Ein Wirt-Server mit `--demo` erzeugt weder Status-Links noch Mails (gespeichert am Betrieb, zurück mit `--kein-demo`).
- **Neu und wichtig:** `WIRT_PASSWORT` schützt Dashboard, `/api/*` und `/intern/*` per HTTP-Basic. Sobald der Wirt-Server öffentlich erreichbar ist (für Status-Links nötig), muss es gesetzt sein. Seit dem Audit vom 25.09.2026 sind diese Routen ohne Passwort gesperrt, sobald die Anfrage über einen Proxy kommt oder `WIRT_OEFFENTLICHE_URL` gesetzt ist (`SECURITY-AUDIT.md`).

## Umgebungsvariablen (nur Server)

| Variable | Pflicht für | Hinweis |
|---|---|---|
| `RESEND_API_KEY` | E-Mail | nur als Secret beim Host / in `.env`, nie ins Git oder Frontend |
| `GAST_EMAIL_ABSENDER` | E-Mail | Adresse einer bei Resend **verifizierten** Domain, z. B. `Trattoria <bestellung@deine-domain.de>` |
| `WIRT_OEFFENTLICHE_URL` | E-Mail-Link | öffentliche HTTPS-Adresse des Wirt-Servers |
| `WIRT_PASSWORT` | öffentlicher Betrieb | schützt Dashboard und Wirt-Aktionen |
| `GAST_STATUS_GEHEIMNIS` | optional | ≥ 32 Zeichen; sonst einmalig unter `data/betrieb/` erzeugt |
| `GAST_EMAIL_ANTWORT_AN` | optional | Reply-To für Gastantworten |

Im Dashboard (Reiter „Bestellungen“ → „Gastbenachrichtigung“) zusätzlich Name des Hauses und Telefon für Rückfragen eintragen – beides steht auf der Statusseite und in den E-Mails.

## Echter Versandtest (erst mit eigenem Resend-Zugang)

Bis das eingerichtet ist, ist die E-Mail-Strecke **nur mit Mock getestet**.

1. Bei Resend eine Domain verifizieren (DNS-Einträge SPF/DKIM) und einen API-Key mit „Sending access“ anlegen.
2. In `.env` (gitignoriert) eintragen: `RESEND_API_KEY=…`, `GAST_EMAIL_ABSENDER=Test <test@deine-domain.de>`.
3. Einzeltest an die eigene Adresse – genau eine Mail, keine Gastdaten:
   ```bash
   npm run gast:mailtest -- --an deine-eigene-adresse@example.de
   ```
   „Von Resend angenommen (ID …)“ heißt übergeben; ob sie ankommt, zeigt erst das Postfach (auch Spam prüfen).
4. Strecke mit Testbetrieb (lokal, nur eigene Adresse verwenden):
   ```bash
   WIRT_OEFFENTLICHE_URL=http://localhost:3200 npm run wirt -- --betrieb versandtest
   npm run pages -- --api http://localhost:3200   # oder v2-Entwurf mit V2_API_URL
   ```
   Tisch anlegen, auf der Seite mit der **eigenen** Adresse reservieren und bestellen, dann im Dashboard bestätigen / verschieben / ablehnen und Postfach + Statusseite vergleichen. Danach `data/betrieb/versandtest.json` löschen.

## Was erst live funktioniert

- Status-Links für echte Gäste: erst, wenn der Wirt-Server unter einer öffentlichen HTTPS-Adresse läuft und die Seite mit `--api <diese Adresse>` gebaut ist. GitHub Pages allein reicht nicht.
- E-Mails: erst mit Resend-Key, verifizierter Absenderdomain und `WIRT_OEFFENTLICHE_URL`.
- Zustellnachweise (angekommen/abgeprallt) gibt es nicht; dafür wären Resend-Webhooks nötig.

## Datenschutz – Baustein für die Datenschutzerklärung des Betriebs

Die generierten Seiten haben noch keine eigene Datenschutzseite. Für jeden Betrieb, der die Funktion live nutzt, gehört sinngemäß folgender Abschnitt in seine Datenschutzerklärung (vom Betrieb bzw. dessen Beratung zu prüfen):

> **Reservierungen und Abholbestellungen.** Für die Bearbeitung Ihrer Anfrage verarbeiten wir Name, Telefonnummer, Termin bzw. Abholzeit, Ihre Angaben zur Bestellung und – nur wenn Sie sie angeben – Ihre E-Mail-Adresse (Art. 6 Abs. 1 lit. b DSGVO). Die E-Mail-Adresse nutzen wir ausschließlich, um Ihnen Eingang, Bestätigung, Ablehnung oder Änderungen genau dieser Anfrage mitzuteilen; kein Newsletter, keine Werbung, keine Weitergabe zu Werbezwecken. Der Versand erfolgt über Resend (Resend, Inc., USA) als Auftragsverarbeiter. Nach dem Absenden erhalten Sie einen persönlichen Status-Link; er ist nur mit dem darin enthaltenen Schlüssel abrufbar, zeigt keine persönlichen Daten und läuft 30 Tage nach dem Termin ab. Auf Wunsch sperren wir ihn sofort.

Formularhinweise auf der Seite (v1 und v2): Feldbeschriftung „E-Mail-Adresse für Bestätigung und Änderungen (optional)“, darunter „Nur für Nachrichten zu dieser Anfrage – kein Newsletter, keine Werbung.“ und – nur mit angebundenem Server – der Hinweis, was der Status-Link kann und was nicht.
