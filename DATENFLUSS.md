# Datenfluss

**Stand:** 25.09.2026 (Audit, siehe `SECURITY-AUDIT.md`)
**Grundlage:** Code in diesem Repository. Nichts davon wurde in einer echten Hosting-Umgebung beobachtet.
**Rechtliche Einordnung:** Die Spalten „Rolle“ und „Frist“ sind Vorschläge. Rechtlich geprüft sind sie nicht.

## 1. Systeme

| System | Start | Lauscht | Zweck | Schutz (Stand nach dem Audit) |
|---|---|---|---|---|
| Agentur-Dashboard | `npm run dashboard` (`src/dashboardServer.js` + `v2/integration/dashboardV2.js`, `demoDashboard.js`, `creativeDashboard.js`, `kundenDashboard.js`) | `DASHBOARD_HOST:DASHBOARD_PORT`, Standard `127.0.0.1:3000`; online `0.0.0.0:8080` (Fly, `fly.toml`) | Leads, Demos, Kundenprojekte, Bearbeiten-Editor | **Online:** Pflicht-Anmeldung (`DASHBOARD_PASSWORT_HASH`, scrypt, Sitzung HttpOnly/SameSite=Strict, CSRF-Prüfung, 10 Fehlversuche/15 min). **Lokal:** nur `localhost` als Host, keine Schreibaktionen von fremden Seiten, `/intern/*` optional mit `DASHBOARD_TOKEN` |
| Präsentation im WLAN | aus dem Dashboard (`src/praesentation.js`) | eigener Port im LAN, zeitlich begrenzt | eine Demo vor Ort zeigen | zufälliger Pfad-Token, Ablaufzeit, nur GET/HEAD |
| Wirt-Server | `npm run wirt` bzw. `npm run v2:wirt` (`src/wirtServer.js`, `v2/integration/wirtServerV2.js`) – ein Prozess je Betrieb | Standard `127.0.0.1:3200`; für Gäste muss er öffentlich erreichbar sein | Reservierungen, Bestellungen, Tischplan, Statusseite, Rechtstexte, Statistik | **Gastrouten** `/oeffentlich/*`, `/status`, `/rechtstexte/*`: offen, mit Bremsen. **Alles andere:** `WIRT_PASSWORT` (HTTP-Basic, 10 Fehlversuche/15 min, Herkunftsprüfung). Ohne Passwort nur direkt über localhost |
| Telegram-Bot | `--telegram` im Wirt-Prozess oder eigener Prozess | ausgehend (Long-Polling, ein Abruf je Bot-Token), kein offener Port | Benachrichtigung des Wirts in den Telegram-Zeiten, Nachmelden, eine Erinnerung, Knöpfe | Knöpfe wirken nur für Betrieb, Chat und Bot, die für diese Art konfiguriert sind, und nur für zulässige Statuswechsel; Verknüpfung per Einmal-Code je Kanal (30 min, 5 Fehlversuche je Chat) |
| Resonanz-Sammler | `npm run resonanz` (`src/resonanzServer.js`) | Standard `127.0.0.1:3300` | Aufrufzähler veröffentlichter Entwürfe (derzeit ohne veröffentlichte Lead-Demos kaum genutzt) | nur existierende Entwürfe, Bremse, keine Adresse auf der Platte |
| Öffentliche Beispielseiten | `npm run publish-site` → `docs/` → GitHub Pages | `seifinger.github.io/gastro-webagentur` | fiktive Beispielseiten der Agentur | statisch; Prüfung `src/oeffentlichkeit.js` verhindert Lead-Demos |
| Kundenseite (später) | `baueKundenfassung` → `v2/output/kunden/<id>/` | noch nicht veröffentlicht | Website des Restaurants | Veröffentlichen ist nicht implementiert (`veroeffentlichungsPlan`) |
| Kundenseite (Pilot) | `npm run kunde -- paket` → `v2/output/pakete/<id>/site/` | statischer Host, z. B. Cloudflare Pages (**noch nicht eingerichtet**) | Website eines Pilotbetriebs | nur freigegebene Fassung; `_headers` mit CSP (`connect-src` nur Wirt-App), HSTS, `nosniff` |
| Wirt-App (Pilot) | `node scripts/wirtStart.mjs` im Container (`deploy/wirt/Dockerfile`, `fly.wirt.toml`) – eigene Fly-App, **nicht** die des Agentur-Dashboards | `0.0.0.0:8080` hinter dem Fly-Proxy (HTTPS) | wie Wirt-Server, dazu Telegram und tägliche Sicherung im selben Prozess; Daten nur auf dem Volume `/data` | wie Wirt-Server; Pflicht-Secrets sonst kein Start; CORS nur `WIRT_ERLAUBTE_ORIGINS` + eigene Adresse (`docs-intern/PILOT-BETRIEB.md`) |

## 2. Datenarten und wo sie liegen

| Daten | Personenbezug | Ort | Wer hat Zugriff | Git | Frist heute |
|---|---|---|---|---|---|
| Leads (Name, Adresse, Telefon, Website, Bewertung des **Betriebs**) | geschäftlich; Einzelunternehmer können natürliche Personen sein | `data/output/*.csv`, `data/landingpages/entwuerfe.json` | Agentur | ignoriert | Warnung vor Ablauf der Google-Zwischenspeicherfrist (`leadFreshness.js`) |
| Lead-Zuordnungen (Place-ID → Küche/Farbschema) | wie oben | `data/kuechen.json` (**versioniert, 1 echte Place-ID**), `data/stimmungen.json` (seit Audit ignoriert) | Agentur, öffentlich über Git | siehe Befund O-02 | – |
| Lead-Bearbeitungen, Uploads, KI-Texte | Fotos können Personen zeigen | `data/lead-edits/`, `public/uploads/`, `v2/output/leads/`, `v2/output/copy/` | Agentur | ignoriert | keine |
| Kundenprojekte (Texte, Karte, Medien, Freigaben mit Namen) | Namen der Freigebenden, Fotos | `data/kunden/<k-id>/` | Agentur | ignoriert | keine |
| **Reservierungen** (Name, Telefon, E-Mail optional, Wunsch, Personen, Termin, Bestätigungsnachweise) | **ja** | `data/betrieb/<slug>.json` (seit Audit Dateirechte 0600, atomar geschrieben) | Wirt, Host, Agentur (falls sie hostet) | ignoriert | **keine automatische Löschung** |
| **Bestellungen** (Name, Telefon, E-Mail optional, Hinweis, Positionen, Abholzeit, No-Show-Zustimmung) | **ja** | wie oben | wie oben | ignoriert | keine |
| Rabattaktionen des Wirts (Name, Rabatt, Gerichte, Zeitraum, Status) und je Bestellung der Preisnachweis (`preisermittlung`) | nein | Betriebsdatei `rabattaktionen`, `bestellungen` | Wirt; die Seite bekommt über `/oeffentlich/preise` nur gerade gültige Preise | ignoriert | mit der Bestellung |
| Empfehlungen „Passt gut dazu“: Einstellungen des Wirts (Regeln, Produkte) und je Bestellposition nur `empfohlen`/`empfohlenMenge` | nein (keine Klickprofile; im Browser nur sessionStorage der laufenden Bestellung, kein Cookie) | Betriebsdatei `empfehlungen`, Positionen in `bestellungen` | Wirt (Dashboard zeigt nur Summen) | ignoriert | mit der Bestellung |
| Gastmeldungen (Ereignis, Referenz, Versandstand – keine Kontaktdaten, Bezug über die Vorgangs-ID) | mittelbar | `gastMeldungen` in der Betriebsdatei | wie oben | ignoriert | höchstens 500 je Betrieb |
| Status-Link | Token nur beim Gast, im Server nur SHA-256-Hash | Betriebsdatei + Geheimnis `data/betrieb/.gast-status-geheimnis` (0600) oder `GAST_STATUS_GEHEIMNIS` | Gast mit Link | ignoriert | 30 Tage nach Termin ungültig |
| Telefonnummern nicht erschienener Gäste | **ja** | `data/zuverlaessigkeit/<slug>.json` | Wirt (als Warnhinweis) | **seit Audit ignoriert** | zählt 90 Tage, **löscht nie** (Befund O-01) |
| Gelernte Wartezeiten | nein (aggregiert) | `data/wartezeitLernen/` | Wirt | seit Audit ignoriert | – |
| Rechtstexte des Restaurants (versioniert, Hash) | Name des Freigebenden | Betriebsdatei `rechtsdokumente` | öffentlich nur freigegebene Fassungen | ignoriert | nie automatisch gelöscht |
| Bankverbindung des Betriebs | geschäftlich | Betriebsdatei | Wirt; erscheint auf No-Show-Rechnungen | ignoriert | – |
| Push-Abos (Endpunkt-URL + Schlüssel des Wirt-Geräts) | Gerätebezug | Betriebsdatei | Server | ignoriert | bis Dienst sie als ungültig meldet |
| Seitenaufruf-Zähler | nein | `data/seitenaufrufe/` | Wirt | ignoriert | – |
| Dashboard-Sitzungen, Bremsen, Fehlversuche | IP-Adressen | **nur Arbeitsspeicher** | – | – | Neustart / Zeitfenster; höchstens 10 000 Adressen je Bremse |
| Sicherungen | alles oben | `data/sicherung/*.tar.gz` (0600) oder `--ziel` | wer das Archiv hat | ignoriert | manuell |
| Externe Sicherungen der Wirt-App (Pilot) | alle Wirt-Daten oben | S3-kompatibler Speicher (Vorschlag Cloudflare R2), **verschlüsselt** mit `BACKUP_SCHLUESSEL` (nur beim Betreiber) | wer Speicher **und** Schlüssel hat | – | 30 Tage, mindestens die neuesten 7 |

## 3. Wege zu Dritten

| Empfänger | Was geht hin | Auslöser | Einrichtung | Sitz / Drittland (zu prüfen) |
|---|---|---|---|---|
| Google Places API | Suchbegriffe, Regionen | `npm start` (Lead-Suche) | `GOOGLE_PLACES_API_KEY` | USA/EU |
| Anthropic | Wunschtext, Lead-Name, Karte (Texte für Demos) | „Vorschlag generieren“ im Dashboard | `ANTHROPIC_API_KEY` | USA |
| Resend | E-Mail-Adresse des Gastes, Betreff, Statustext, Link | Statuswechsel mit E-Mail-Angabe | `RESEND_API_KEY`, `GAST_EMAIL_ABSENDER`, `WIRT_OEFFENTLICHE_URL` | USA |
| Telegram | Betrieb, Referenznummer, Datum/Uhrzeit bzw. Abholzeit, Personenzahl, Status – **keine** Namen, Telefonnummern, E-Mails, Wünsche, Positionen (`v2/integration/TELEGRAM-DATENSCHUTZ.md`) | neue Anfrage (nur in den Telegram-Zeiten), Nachmeldung, Erinnerung, Tagesübersicht | `TELEGRAM_BOT_TOKEN` (optional `…_RESERVIERUNG`, `…_BESTELLUNG`), Verknüpfung | Telegram FZ-LLC (VAE) |
| Web-Push-Dienste (Google FCM, Mozilla, Apple) | verschlüsselte Nachricht mit Gastname/Termin an das Wirt-Gerät | neue Anfrage | `VAPID_*` | USA |
| GitHub (Repo, Pages) | Code, fiktive Beispielseiten | `git push`, `publish-site` | – | USA; **Repo öffentlich** |
| Fly.io (Dashboard-Host, wenn eingerichtet) | alle Dashboard-Daten auf dem Volume | Betrieb | `fly.toml` | USA-Firma, Region `fra` |
| Fly.io (Wirt-App des Pilotbetriebs, eigene App) | alle Gastdaten des Betriebs auf dem Volume | Betrieb | `fly.wirt.toml` | USA-Firma, Region `fra` |
| Cloudflare (Pages, R2) | Pages: IP-Adressen der Seitenbesucher; R2: nur verschlüsselte Sicherungen | Seitenaufruf bzw. tägliche Sicherung | Pages-Projekt, `BACKUP_S3_*` | USA-Firma, R2-Standort EU wählbar |
| Unsplash | IP-Adresse der Besucher der **öffentlichen Beispielseiten** (Bilder werden direkt von images.unsplash.com geladen) | Seitenaufruf | – | USA (Befund O-03). Kundenfassungen laden keine Unsplash-Bilder (Test in `test/kundenProjekt.test.js`) |
| Google Maps | nur ein Link, kein eingebettetes Element | Klick des Besuchers | – | – |

Schriften sind lokal eingebunden, auf den Seiten gibt es keine Tracker und keine Analyse-Skripte (geprüft in `docs/beispiel-*`).

## 4. Ablauf einer Gastanfrage

1. Der Gast füllt das Formular auf der Restaurantseite aus: Name, Telefon, optional E-Mail, Wunsch bzw. Karte. Er bestätigt die freigegebenen Rechtstexte, sofern welche vorhanden sind.
2. Der Browser schickt einen `POST` an `https://<wirt-server>/oeffentlich/reservierung` bzw. `/bestellung`.
   - **CORS:** ohne `WIRT_ERLAUBTE_ORIGINS` `*`; mit Liste nur diese Adressen und die eigene Adresse der Wirt-App (Statusseite), fremde Seiten 403
   - **Bremse:** 20 schreibende Anfragen je Adresse und Minute; hinter einem Proxy gilt die Adresse nur mit `VERTRAUTER_PROXY`.
3. Der Server prüft:
   - Pflichtfelder und Feldlängen
   - E-Mail-Format
   - Tisch bzw. Öffnungszeit
   - Preise gegen die Bestellkarte
   - Bestätigungen gegen die gültigen Fassungen
4. Der Server speichert atomar in `data/betrieb/<slug>.json`. Ist die Datei beschädigt, speichert er **nicht** und antwortet mit 503 und „bitte telefonisch“.
5. Aus der Änderung entsteht genau eine Gastmeldung. Zugestellt wird sie per Resend, falls eingerichtet. Der Wirt erfährt es über Web-Push und/oder Telegram – Telegram nur in den Telegram-Zeiten des Betriebs, sonst im nächsten Zeitfenster; eine Telegram-Störung ändert an der Anfrage nichts.
6. Der Gast bekommt Nummer, Status „eingegangen“ und den Status-Link (Token im Fragment `#…`, nie in Server-Logs).
7. Der Wirt sieht die Anfrage im Dashboard (Basic-Anmeldung) und bestätigt, verschiebt oder lehnt ab. Aus der Änderung entsteht wieder genau eine Meldung.

## 5. Protokolle

- Die Server schreiben nur auf die Konsole (stdout/stderr) des Hosts.
- Fehlerzeilen enthalten Methode und Pfad (höchstens 200 Zeichen), keine Anfragedaten.
- Status-Tokens stehen im Fragment und erreichen den Server nie über die URL.
- Wie lange der Host die Konsolenausgabe aufbewahrt, hängt vom Host ab. Das ist mit dem Host zu klären (siehe `LAUNCH-CHECKLISTE.md`).
