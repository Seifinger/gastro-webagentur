# Sicherheits-Audit vor dem Launch

**Stand:** 25.09.2026
**Umfang:** dieses Repository, lokale Testinstanzen, synthetische Daten. Keine fremden Websites, keine Produktivsysteme, keine echten Konten.
**Was dieses Audit nicht ist:** kein externer Penetrationstest und keine Rechtsberatung. Es sagt weder „sicher“ noch „DSGVO-konform“. Ein grüner `npm test` ist keine Sicherheitsfreigabe.

**Nachweisstufen** (Spalte „Nachweis“):
- **C** = im Code nachgewiesen
- **L** = lokal nachgestellt und nach der Behebung lokal getestet (Node-Tests, teils echtes Chromium)
- **M** = mit Mock getestet
- **H** = in echter Hosting-Umgebung geprüft (**trifft auf keinen Befund zu**, es gibt noch keinen Produktivbetrieb)
- **offen** = fachlich oder rechtlich zu prüfen bzw. vom Betreiber zu entscheiden

Prioritäten:
- **P0** = akute Gefahr
- **P1** = Launch-Blocker
- **P2** = bald
- **P3** = Verbesserung

## Übersicht

| ID | Prio | Befund | Status | Nachweis |
|---|---|---|---|---|
| S-01 | **P0** | Echter Google-API-Schlüssel in der öffentlichen Git-Historie | **offen: Rotation durch dich**; Wiederholung per Test verhindert | C |
| S-02 | P1 | Wirt-Server ohne `WIRT_PASSWORT` hinter Proxy oder unter öffentlicher Adresse: Gastdaten und Wirt-Aktionen offen | behoben | L |
| S-03 | P1 | CSRF: fremde Seite löst Wirt-Aktionen mit gespeicherter Basic-Anmeldung aus (z. B. Bankverbindung ändern) | behoben | L, Chromium |
| S-04 | P1 | Hinter einem Proxy teilen sich alle Gäste eine Bremse; eine Person kann Online-Reservierungen und Status-Links für alle sperren | behoben (mit `VERTRAUTER_PROXY`) | L |
| S-05 | P1 | Eine einzige Anfrage (`GET //[`) beendet den Wirt-Server-Prozess | behoben (auch Resonanz, v2-Hülle, Präsentation, Telegram-Takt) | L |
| S-06 | P1 | Betriebsdatei nicht atomar geschrieben; beschädigte Datei wird als leer gelesen und beim nächsten Speichern überschrieben (Totalverlust) | behoben | L |
| S-07 | P1 | Wirt-Anmeldung ohne Grenze für Fehlversuche; kurzes Passwort galt in der Launch-Prüfung als Schutz | behoben | L |
| S-08 | P2 | Dashboard-Anmeldung: selbst geschriebene `X-Forwarded-For`-Zeile setzt die Fehlversuch-Sperre zurück | behoben | L |
| S-09 | P2 | Kundenfotos samt Aufnahmeort (GPS), Kamera und Namen gespeichert und in die Kundenseite kopiert | behoben für JPEG/PNG/WebP; MP4 mit GPS wird abgelehnt | L, Chromium |
| S-10 | P2 | Gasteingaben ohne Längengrenze (bis ca. 20 KB je Feld in die Betriebsdatei) | behoben | L |
| S-11 | P2 | Laufzeitdaten mit Personenbezug nicht gitignoriert (u. a. Telefonnummern nicht erschienener Gäste) – Repo ist öffentlich | behoben | L |
| S-12 | P2 | Lokales Dashboard ohne Anmeldung: DNS-Rebinding und CSRF aus dem Browser des Betreibers | behoben | L |
| S-13 | P2 | Wirt-Dashboard einbettbar (Klick-Falle) und zwischenspeicherbar | behoben | L |
| S-14 | P2 | Bremsen merken sich unbegrenzt viele Adressen (Speicher) | behoben | L |
| S-15 | P2 | Keine Sicherung und keine Wiederherstellungsprobe | Werkzeug gebaut (`npm run sicherung`); Betrieb offen | L |
| O-01 … O-13 | P2–P3 | offene Punkte mit Entscheidungsbedarf | siehe unten | C / offen |

---

## P0

### S-01 – Echter Google-Places-Schlüssel in der öffentlichen Git-Historie

| | |
|---|---|
| **Dienst** | Google Cloud, Places API (`GOOGLE_PLACES_API_KEY`) |
| **Datei** | `.env` – am 17.09.2026 kurz versioniert, im selben Zeitraum wieder entfernt |
| **Commit** | im Abschlussbericht an den Betreiber genannt. Hier bewusst nicht, weil das Repository öffentlich ist |
| **Warum echt** | Format und Länge eines echten Google-Schlüssels, kein Platzhalter. Das Repository ist öffentlich (per GitHub-API geprüft) |
| **Risiko** | Fremde nutzen den Schlüssel auf Kosten des Google-Kontos (Abrechnung, Kontingent). Gast- oder Kundendaten hängen nicht daran |
| **Nicht getan** | Nicht gegen Google getestet (keine Tests mit fremden Zugangsdaten), nicht rotiert (keine Zugangsdaten) |
| **Wichtig** | Das Löschen aus `main` entfernt den Schlüssel **nicht** aus der Historie. Automatische Scanner lesen öffentliche Repos in Minuten; Forks und Caches können ihn behalten |

**Rotation (durch dich):**
1. Google Cloud Console → APIs & Dienste → Anmeldedaten: einen **neuen** Schlüssel anlegen.
2. Den neuen Schlüssel einschränken:
   - API-Einschränkung: nur „Places API (New)“
   - Anwendungseinschränkung: wenn möglich IP-Adressen des Rechners bzw. Hosts, der `npm start` ausführt
3. Den neuen Schlüssel nur lokal in `.env` bzw. als Host-Secret eintragen (`fly secrets set GOOGLE_PLACES_API_KEY=…`).
4. Den **alten Schlüssel löschen**. „Neu generieren“ allein reicht nicht, wenn der alte weiter gilt.
5. Abrechnung → Berichte und APIs & Dienste → Messwerte: Nutzung seit 17.09.2026 auf fremde Aufrufe prüfen. Ein Budget mit Warnung setzen.
6. Optional, danach: die Historie bereinigen (`git filter-repo`, erzwungener Push) und beim GitHub-Support den Cache leeren lassen. Das ersetzt die Rotation **nicht**.

**Gegen Wiederholung:**
- `test/repoHygiene.test.js` sucht in allen versionierten Dateien nach Schlüsselmustern:
  - Google, Anthropic, Resend, Telegram, GitHub, AWS
  - private Schlüssel, scrypt-Hashes
- Der Test meldet nur Datei und Muster, nie den Wert.
- Er schlägt außerdem fehl, wenn eine `.env` versioniert ist.

**Geprüft ohne weiteren Treffer:** Die übrigen Zuweisungen in der Historie sind Platzhalter:
- `ANTHROPIC_API_KEY`, `DASHBOARD_TOKEN` und `TELEGRAM_BOT_TOKEN` in `.env.example`
- die VAPID- und Passwort-Werte in den Tests

---

## P1 (behoben)

### S-02 – Wirt-Server offen, sobald er hinter einem Proxy steht

- **Ort:** `src/wirtServer.js` – `/`, `/api/*`, `/intern/*`; über die v2-Hülle auch `/v2/api/*`, `/v2/intern/*`.
- **Vorher:**
  - Ohne `WIRT_PASSWORT` war alles offen.
  - Die Startwarnung kam nur bei `DASHBOARD_HOST≠127.0.0.1`.
  - Ein Reverse Proxy (Caddy, nginx, Tunnel) auf demselben Rechner verbindet sich aber über 127.0.0.1, die Warnung blieb also aus.
- **Szenario:** Der Server wird für Gäste veröffentlicht, das Passwort vergessen. Jeder mit der Adresse, die in jeder Restaurantseite steht, kann:
  - Namen, Telefonnummern, E-Mails und Bestätigungsnachweise lesen,
  - Reservierungen absagen,
  - die Bankverbindung für No-Show-Rechnungen ändern.
- **Nachgestellt:** Anfrage an `/api/betrieb` mit `X-Forwarded-For`, `X-Real-IP`, `Forwarded` oder einem fremden `Host`. Ergebnis: 200 mit Gastdaten.
- **Behebung:** Ohne `WIRT_PASSWORT` gibt es internen Zugang nur, wenn
  - die Verbindung von Loopback kommt,
  - keine Weiterleitungs-Köpfe gesetzt sind,
  - der Host-Kopf `localhost`/`127.x` ist,
  - **und** weder `WIRT_OEFFENTLICHE_URL` noch `NODE_ENV=production` gesetzt ist.

  Sonst antwortet der Server mit 403 und dem Hinweis auf `WIRT_PASSWORT`. Die Gastrouten funktionieren weiter.
- **Test:** `test/sicherheit.test.js` – „ohne WIRT_PASSWORT: Gastdaten nur bei direktem Zugriff …“
- **Rest:** Ein Proxy, der weder Weiterleitungs-Köpfe noch den echten Host setzt, **und** fehlende `WIRT_OEFFENTLICHE_URL` bleiben nicht erkennbar. Im Launch ist `WIRT_OEFFENTLICHE_URL` aber Pflicht (Status-Links).

### S-03 – CSRF gegen Wirt-Aktionen

- **Ort:** alle schreibenden internen Routen des Wirt-Servers (v1 und v2-Hülle).
- **Vorher:**
  - Der Körper wurde unabhängig vom `Content-Type` als JSON gelesen; ein `text/plain`-Formular braucht keinen Preflight.
  - Browser schicken eine gespeicherte Basic-Anmeldung auch bei Formularen von fremden Seiten mit.
- **Szenario:** Der Wirt ist angemeldet und öffnet eine präparierte Seite. Die Seite
  - setzt die Bankverbindung auf ein fremdes Konto (erscheint auf No-Show-Rechnungen),
  - verknüpft Telegram mit einem fremden Chat (Gastnamen und Telefonnummern fließen ab),
  - sagt Reservierungen ab.
- **Nachgestellt:** Ein POST mit gültiger Anmeldung und `Sec-Fetch-Site: cross-site`, `Origin: https://boese.example` oder `Origin: null` wurde angenommen (200).
- **Behebung:** `pruefeWirtZugang` lehnt schreibende Anfragen ab, wenn
  - `Sec-Fetch-Site` `cross-site` oder `same-site` meldet, oder
  - `Origin` weder dem Host noch `X-Forwarded-Host` noch dem Host von `WIRT_OEFFENTLICHE_URL` entspricht.

  Werkzeuge ohne Browser (curl, Tests) bleiben möglich.
- **Test:** „Wirt-Aktionen, die eine fremde Seite im Browser auslöst …“. Zusätzlich im echten Chromium mit Basic-Anmeldung geprüft:
  - Klick auf „Bestätigen“ (v1) → 200
  - „Verbindungs-Code erzeugen“ (v2) → 200

### S-04 – Bremsen hinter einem Proxy

- **Ort:** `/oeffentlich/*` (Bremse 20/min schreibend, 240/min lesend), Status-Link-Fehlversuche (10 in 10 min).
- **Vorher:** Die Adresse kam aus der Verbindung. Hinter Caddy, nginx oder Fly ist das für alle Gäste die Adresse des Proxys.
- **Szenario:**
  - An einem vollen Abend bekommt der 21. Gast in einer Minute „Zu viele Anfragen“.
  - Eine Person mit 21 Anfragen pro Minute blockiert alle Online-Reservierungen und -Bestellungen.
  - Zehn falsche Status-Links sperren die Statusseite für alle Gäste.
- **Nachgestellt:** 30 Gäste mit verschiedener Adresse hinter demselben Proxy. Gast 21 bekam 429.
- **Behebung:**
  - `src/anfrageSchutz.js` → `clientAdresse()`. Weiterleitungs-Köpfe zählen **nur** mit `VERTRAUTER_PROXY` (`fly` oder Anzahl eigener Proxys `1`–`5`) **und** wenn die Verbindung aus einem lokalen oder privaten Netz kommt.
  - Ohne Einstellung bleibt es bei der Verbindungsadresse. Eine erfundene `X-Forwarded-For`-Zeile umgeht die Bremse dann nicht (getestet).
- **Tests:**
  - „hinter vertrautem Proxy: Gäste teilen sich keine Bremse …“
  - „… falsche Status-Links eines Aufrufers sperren andere Gäste nicht“
  - „clientAdresse: …“
- **Betrieb:** Hinter einem Proxy **muss** `VERTRAUTER_PROXY` gesetzt werden (`.env.example`, `LAUNCH-CHECKLISTE.md`).

### S-05 – Absturz durch eine einzige Anfrage

- **Ort:**
  - `src/wirtServer.js` und `v2/integration/wirtServerV2.js`: `new URL(req.url, "http://" + Host)` im asynchronen Handler ohne `try`
  - `src/resonanzServer.js` (gleich)
  - `src/praesentation.js`: `decodeURIComponent` im synchronen Handler
  - `v2/integration/telegramBot.js`: Tagesübersicht im `setInterval` ohne `.catch`
- **Szenario:** Jemand schickt `GET //[` oder einen kaputten `Host`-Kopf. Das Promise wird verworfen, Node beendet den Prozess, keine Reservierung kommt mehr an, bis jemand neu startet.
- **Nachgestellt:** echter Serverprozess, eine Anfrage → „Prozess beendet mit Code 1“, danach keine Verbindung mehr.
- **Behebung:**
  - Jeder Handler fängt Fehler ab und antwortet mit 400.
  - Die URL wird mit festem Basiswert gelesen.
  - Die Präsentation antwortet mit 404.
  - Der Telegram-Takt protokolliert den Fehler und versucht es in einer Minute neu.
- **Test:** „kaputte Adresse oder kaputter Host-Kopf beendet den Server nicht“ (Wirt, Resonanz, v2-Hülle, Rohdaten über einen Socket).

### S-06 – Totalverlust bei beschädigter Betriebsdatei

- **Ort:** `src/betriebStore.js` – `speichereBetrieb` / `ladeBetrieb`.
- **Vorher:**
  - `writeFileSync` schrieb direkt in die Datei.
  - Ein Absturz, `kill` oder eine volle Platte mitten im Schreiben hinterließ halbes JSON.
  - `ladeBetrieb` fing den Lesefehler ab und lieferte einen **leeren** Betrieb.
  - Die nächste Online-Reservierung schrieb diesen leeren Stand zurück. Damit waren alle Reservierungen, Bestellungen, Rechtstexte, Nachweise, Bankverbindung und Push-Abos weg. Das Dashboard zeigte „keine Reservierung“.
- **Nachgestellt:** Datei auf die halbe Länge gekürzt, neue Reservierung. Danach stand nur noch die neue Reservierung in der Datei.
- **Behebung:**
  - Schreiben über eine Nachbardatei, `fsync`, `rename` (atomar), Dateirechte 0600.
  - Eine fehlende Datei gilt als leerer Betrieb, eine unlesbare oder beschädigte wirft `BetriebsdatenBeschaedigt`. Der Server antwortet dann mit 503, bei Gästen mit „bitte telefonisch melden“.
  - Die Datei bleibt unverändert für die Wiederherstellung liegen. Die Konsole nennt den Pfad.
- **Tests:**
  - „beschädigte Betriebsdatei wird nie still als leer behandelt …“
  - „Betriebsdatei wird atomar und nur für den Besitzer lesbar geschrieben“

### S-07 – Wirt-Anmeldung ohne Fehlversuch-Grenze

- **Vorher:** unbegrenzte Basic-Versuche; `WIRT_PASSWORT=abc` galt in der Launch-Prüfung als „geschützt“.
- **Behebung:**
  - Höchstens 10 falsche Anmeldungen je Adresse in 15 Minuten, danach 429.
  - Andere Adressen bleiben unberührt. Hinter einem Proxy braucht es dafür `VERTRAUTER_PROXY`, sonst trifft die Sperre alle.
  - In der Launch-Prüfung zählt das Passwort erst ab 12 Zeichen. Beim Start gibt es eine Warnung.
- **Tests:**
  - „falsches WIRT_PASSWORT: nach 10 Fehlversuchen …“
  - „kurzes WIRT_PASSWORT zählt … nicht“

---

## P2 (behoben)

| ID | Ort | Szenario → Wirkung | Behebung | Test |
|---|---|---|---|---|
| S-08 | `src/dashboardAnmeldung.js` | Die Adresse wurde ungeprüft aus `Fly-Client-IP` oder `X-Forwarded-For` gelesen. Außerhalb von Fly setzt ein Angreifer je Versuch eine neue Zeile → unbegrenzte Passwortversuche | `clientAdresse()`; `fly.toml` setzt `VERTRAUTER_PROXY = "fly"` (gleiches Verhalten auf Fly) | „Dashboard-Anmeldung: erfundene X-Forwarded-For-Zeilen …“ |
| S-09 | `src/kundenProjekt.js` (`legeMediumVor`), `v2/build/siteBuilder.js` (`copyFileSync`), `src/bildUpload.js` | Fotos vom Telefon enthalten GPS-Position, Seriennummer, Aufnahmezeit, Namen. Das alles wäre mit der Kundenseite öffentlich geworden | `src/bildMetadaten.js`: JPEG (Exif/XMP/IPTC/COM/MPF weg, **Ausrichtung bleibt**), PNG (tEXt/zTXt/iTXt/eXIf/tIME), WebP (EXIF/XMP). Nicht sicher lesbare Bilder werden mit Hinweis abgelehnt. MP4 mit Ortsangabe im `moov` wird abgelehnt | `test/bildMetadaten.test.js`; im Chromium: gleiche Pixel, gleiche Drehung |
| S-10 | `src/betriebStore.js` | Name, Telefon, Wunsch und Hinweis ohne Grenze; bis zu 20 KB je Anfrage landen in der Datei, die bei jeder Anfrage ganz gelesen wird | Grenzen: Name 120, Telefon 40, Wunsch/Hinweis 1000, 100 Positionen, Gerichtname 200 | „überlange Gasteingaben …“ |
| S-11 | `.gitignore` | `data/zuverlaessigkeit/` (Telefonnummern), `data/wartezeitLernen/`, `data/stimmungen.json` (Place-IDs), `v2/output/copy/`, `v2/briefings/*` und `.env.*` fehlten. Ein `git add -A` hätte sie ins öffentliche Repo gebracht | ergänzt (Piloten und `.env.example` bleiben) | `test/repoHygiene.test.js` |
| S-12 | `src/dashboardServer.js` | Lokal ohne Anmeldung: Eine fremde Seite im Browser des Betreibers konnte über DNS-Rebinding Leads lesen oder per Formular Schreibaktionen und Anthropic-Kosten auslösen | Bei Bindung an Loopback nur `localhost`-Host (sonst 421); schreibende Anfragen fremder Herkunft 403 | „Dashboard lokal ohne Anmeldung …“ |
| S-13 | `src/wirtServer.js` | Dashboard in fremder Seite einbettbar; Gastdaten im Browser-Cache geteilter Geräte | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `Cache-Control: no-store`, `Referrer-Policy` | „Wirt-Dashboard: nicht einbettbar …“ |
| S-14 | alle Bremsen | Die Maps behielten jede Adresse für immer (viele IPv6-Adressen → Speicher) | `Bremse` mit höchstens 10 000 Adressen, alte zuerst | „Bremse: begrenzt …“ |
| S-15 | – | Keine Sicherung, kein Wiederherstellungstest | `npm run sicherung -- erstellen` (tar.gz, 0600, nur lesend) und `-- pruefen <datei>` (entpackt in einen Temp-Ordner, prüft jedes JSON, zählt Vorgänge je Betrieb) | `test/sicherung.test.js` |

---

## Offen – Entscheidung oder Zugang nötig

| ID | Prio | Punkt | Vorschlag | Wer |
|---|---|---|---|---|
| O-01 | P2 | Keine Löschfristen: Reservierungen, Bestellungen und Kontakte bleiben unbegrenzt. `data/zuverlaessigkeit` zählt 90 Tage, **löscht aber nie** | Fristen festlegen (z. B. Kontakt X Monate nach Termin anonymisieren, No-Show-Nummern nach 90 Tagen löschen), danach eine Löschroutine mit Probelauf bauen. **Ändert Gastdaten → nur nach deiner Freigabe** | du + rechtliche Prüfung |
| O-02 | P2 | `data/kuechen.json` ist versioniert und enthält die Place-ID eines echten Leads (öffentlich) | Aus Git nehmen und ignorieren. **Migration:** Auf einem Dashboard-Host mit Git-Klon löscht `git pull` die Datei bzw. erzeugt einen Autostash-Konflikt → vorher sichern, nach dem Pull zurückkopieren | du (Freigabe) |
| O-03 | P2 | Die öffentlichen Beispielseiten laden Bilder direkt von images.unsplash.com (IP-Adresse der Besucher an Unsplash, USA) | Bilder selbst hosten oder in der Datenschutzerklärung der Agentur nennen. Kundenfassungen sind nicht betroffen (getestet) | Agentur |
| O-04 | P2 | Zwei Prozesse, die dieselbe Betriebsdatei schreiben (z. B. eigener Telegram-Prozess + Wirt-Server), können sich gegenseitig Änderungen überschreiben | Ein Prozess je Betrieb (`npm run v2:wirt -- --telegram`) | Betrieb |
| O-05 | P2 | Der Dashboard-Host bekommt laut `deploy/start.sh` einen `GITHUB_TOKEN` mit Schreibrecht, obwohl Veröffentlichen abgeschaltet ist (410) | Token entfernen bzw. nur lesend (das Repo ist öffentlich, Klonen braucht keinen) | du |
| O-06 | P3 | Dashboard: ein gemeinsames Passwort, Sitzungen im Speicher, keine Zwei-Faktor-Anmeldung | Optional Cloudflare Access oder Tailscale davor (`HOSTING.md`) | Agentur |
| O-07 | P3 | Videos: nur MP4 mit GPS wird abgelehnt; Aufnahmedatum und Gerät in MP4/WebM bleiben | Vor dem Hochladen mit `ffmpeg -map_metadata -1` exportieren | Agentur |
| O-08 | P3 | ~~Telegram-Verknüpfungscode ohne Versuchsgrenze je Chat~~ **behoben:** höchstens 5 falsche Codes je Chat und Bot in 15 Minuten (`telegramBot.js`, Test 19) | – | – |
| O-09 | P3 | `public/dashboard.html` verlinkt die Lead-Website ohne Schema-Prüfung (`javascript:` aus einem CSV-Import wäre klickbar) | Nur `http(s)` verlinken | – |
| O-10 | P3 | `src/previewServer.js` (lokales Entwicklerwerkzeug) stürzt bei `/%` ab | wie S-05 | – |
| O-11 | P3 | Push-Abo nimmt jede URL an (nur angemeldeter Wirt) | Nur `https:` zulassen | – |
| O-12 | P2 | TLS, HSTS und Protokollaufbewahrung liegen beim Proxy/Host, nicht im Code | beim Einrichten festlegen (`LAUNCH-CHECKLISTE.md`) | Agentur/Host |
| O-13 | P2 | **Telegram gekürzt** (nur Referenz, Termin/Abholzeit, Personenzahl, Status – `v2/integration/TELEGRAM-DATENSCHUTZ.md`). **Web-Push** enthält weiter Gastnamen. Drittland/Rolle von Telegram weiter offen | Web-Push ebenso kürzen; Rolle und Drittland fachlich prüfen | du + rechtliche Prüfung |

---

## Geprüft ohne Befund

| Prüfung | Ergebnis | Nachweis |
|---|---|---|
| XSS im Wirt-Dashboard | Nutzlasten (`<img onerror>`, `<svg onload>`, Anführungszeichen) in allen Gastfeldern (Name, Telefon, Wunsch, Hinweis, Gerichtname) über die öffentlichen Routen: in allen Reitern nur als Text gezeigt, nichts ausgeführt | L, Chromium |
| Überlange Anfragekörper | Vermutung „unbegrenzter Speicher“ **widerlegt**: Nach der 400-Antwort liest Node den Socket nicht weiter (ca. 4 MB gelesen, Speicher stabil) | L |
| Status-Links | HMAC-SHA-256, 43 Zeichen, nur der Hash gespeichert, Token im Fragment, 30 Tage nach Termin ungültig, Fehlversuch-Bremse | C, L (bestehende Tests) |
| Pfad-Traversal | Dashboard-Dateien (`dateiImOrdner`), Kunden-Vorschau und -Medien (`sicherInnerhalb`, strenger Dateiname), Präsentation, Resonanz-Slug | C, L (bestehende Tests) |
| Shell-Injection | Nur `execFile` mit Argumentliste (`git`, `tar`), keine Shell | C |
| Uploads | Typ aus den Bytes, SVG abgelehnt, Größen: Bild 8 MB, Video 40 MB, Lead-Bild wie bisher. Kundenmedien mit `nosniff`, nur über geschützte `/intern/`-Routen | C, L |
| Abhängigkeiten | `npm audit`: 0 bekannte Schwachstellen (Stand 25.09.2026) | L |
| Telegram-Knöpfe | Wirken nur für Betrieb, Chat und Bot, die für diese Art konfiguriert sind, und nur für zulässige Statuswechsel (alter Knopf nach Dashboard-Entscheidung ändert nichts) | C, L (`test/telegramBenachrichtigung.test.js`) |
| Kundenfassungen | Kein Stock- oder Konzeptmaterial, keine Unsplash-Adressen (bestehender Test) | L |
| Öffentliche Ausgabe | `src/oeffentlichkeit.js` verhindert Lead-Demos in `docs/`; `npm run publish-site` läuft (docs danach zurückgesetzt, nichts veröffentlicht) | L |
| Geheimnisse im Code | Keine Treffer in versionierten Dateien (außer S-01 in der Historie) | L (Test) |

## Migrationswirkung dieser Änderungen

| Änderung | Wirkung | Was du tun musst |
|---|---|---|
| Wirt-Dashboard ohne Passwort nur noch direkt über `localhost` | Lokale Entwicklung unverändert. **Tablet/Handy im WLAN** (`DASHBOARD_HOST=0.0.0.0`), Proxy, Tunnel oder gesetzte `WIRT_OEFFENTLICHE_URL` ohne Passwort → 403 | `WIRT_PASSWORT` (ab 12 Zeichen) setzen. Gastseiten laufen ohne Passwort weiter |
| Herkunftsprüfung für Wirt-Aktionen | Eigenes Dashboard, v2-Hülle und Werkzeuge ohne Browser unverändert (getestet) | nichts |
| `VERTRAUTER_PROXY` | Ohne Angabe wie bisher (Verbindungsadresse) | Hinter Caddy/nginx `VERTRAUTER_PROXY=1`, auf Fly `fly` (für das Dashboard in `fly.toml` gesetzt) |
| Betriebsdatei atomar, 0600 | Datei nur noch für den Server-Benutzer lesbar. Beschädigte Datei → 503 statt stiller Leere | Sicherung einspielen, falls es passiert |
| Feldlängen | Längere Angaben werden mit Meldung abgelehnt | nichts |
| Metadaten-Filter | Hochgeladene Fotos werden ohne Metadaten gespeichert; ungewöhnlich aufgebaute Bilder und MP4 mit GPS werden mit Hinweis abgelehnt | Bei Ablehnung neu exportieren |
| `.gitignore` | Nur neue Einträge, nichts wurde aus Git entfernt | nichts (O-02 wartet auf Freigabe) |

**Nichts davon ist in einer echten Hosting-Umgebung geprüft.** Nach dem Einrichten des Hosts sind die Punkte in `LAUNCH-CHECKLISTE.md`, Teil A, dort zu wiederholen.

## Geänderte und neue Dateien

**Neu:**
- `src/anfrageSchutz.js`
- `src/bildMetadaten.js`
- `scripts/sicherung.mjs`
- Tests: `test/sicherheit.test.js`, `test/repoHygiene.test.js`, `test/bildMetadaten.test.js`, `test/sicherung.test.js`
- Berichte: `SECURITY-AUDIT.md`, `DATENFLUSS.md`, `LAUNCH-CHECKLISTE.md`

**Geändert:**
- Server: `src/wirtServer.js`, `v2/integration/wirtServerV2.js`, `src/dashboardServer.js`, `src/dashboardAnmeldung.js`, `src/resonanzServer.js`, `src/praesentation.js`, `v2/integration/telegramBot.js`
- Daten und Uploads: `src/betriebStore.js`, `src/kundenProjekt.js`, `src/bildUpload.js`, `src/rechtstexte.js`
- Konfiguration: `package.json` (Skript `sicherung`), `.gitignore`, `.env.example`, `fly.toml`
- Doku: `README.md`, `docs-intern/GASTBENACHRICHTIGUNG.md`, `docs-intern/STATISTIK-UND-RECHTSTEXTE.md`
- Bestehende Tests: an die Passwortpflicht angepasst (`gastBenachrichtigung`, `gastStatus-browser` mit Anmeldung im Browser, `wirtServer`); `bildUpload` nutzt jetzt ein vollständiges PNG

**Testlauf:**
- 742 Tests, 741 bestanden.
- Der eine Fehlschlag („eine abgeholte Bestellung fließt bei aktiviertem Lernsystem …“) ist datumsabhängig und schlägt auf `main` ohne diese Änderungen genauso fehl (geprüft).
