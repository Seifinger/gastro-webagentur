# Pilotbetrieb: Wirt-App für EIN Restaurant auf Fly.io

**Stand:** 26.09.2026. Gilt für einen einmonatigen Produktiv-Piloten mit genau einem Betrieb.
**Nicht verwechseln:** `fly.toml` + `Dockerfile` = Agentur-Dashboard. `fly.wirt.toml` + `deploy/wirt/Dockerfile` = Wirt-App. Das sind zwei getrennte Fly-Apps mit getrennten Volumes. Ein Deploy der einen ist **kein** Deploy der anderen.

Inhalt:
1. Launch-Gate (was nachgewiesen ist, was offen ist)
2. Architektur – Antworten auf die sieben Fragen
3. Laufzeitdaten auf dem Volume
4. Secrets und Zugangsschutz
5. Sicherung und Wiederherstellung
6. Kundenseite für den statischen Host
7. Tests und lokale Nachtest-Befehle
8. **Meine Schritte nach dem Fly-Abschluss**
9. Monatliche Kosten
10. Abschalten und Rollback

---

## 1. Launch-Gate

| Punkt | Status | Nachweis bzw. was fehlt |
|---|---|---|
| Code gebaut | **BESTANDEN** | Kundenpaket des fiktiven Testkunden gebaut und geprüft (`kundenPaket.pruefePaket`: Seiten, Pfade, API-Adresse, keine Demo-Spuren). `npm audit --omit=dev`: 0 Befunde |
| Lokale Tests | **BESTANDEN** | `npm test`. Einzige Ausnahme ist `wirtServer.test.js` „abgeholte Bestellung … Lernsystem“: Der Test hängt vom Datum ab und schlägt auf `main` genauso fehl. Er gehört nicht zu dieser Arbeit |
| Container gebaut | **BESTANDEN** (lokal) | `deploy/wirt/lokal-test.sh` baut aus `git archive <commit>`. Image 89 MB, ca. 46 MiB RAM im Leerlauf. Geprüft: ohne Volume kein Start, Health-Check, 401/403, Neustart, SIGTERM mit Exit 0 |
| Browser-E2E | **BESTANDEN** (lokal) | `test/pilot-e2e.test.js` in Chromium mit echt laufender Wirt-App. Einmal als Node-Prozess, einmal **im gebauten Container** (`PILOT_E2E_IMAGE`). Alle 15 Schritte (Abschnitt 7) |
| Neustart-Persistenz | **BESTANDEN** (lokal) | E2E Schritt 13/14: Neustart per SIGTERM. Danach sind Vorgänge, Status, Tische und Status-Links unverändert da. Im Container ebenso (`lokal-test.sh`) |
| Verschlüsseltes Backup | **BESTANDEN** (lokal) / echter Upload **OFFEN** | AES-256-GCM vor dem Verlassen des Hosts. Keine Klartextdaten in der Sicherungsdatei. Geprüft gegen ein Datei-Ziel und ein lokales S3-kompatibles Testziel. **Upload nach Cloudflare R2: OFFEN** (kein Konto) |
| Restore-Test | **BESTANDEN** (lokal) | Synthetischer Betrieb Datei für Datei identisch. Eine **zweite, echt gestartete Wirt-App** liefert aus der Wiederherstellung dieselben Reservierungen, Bestellungen, Status, Rabatte, Telegram-Einstellungen und Status-Links. Mit falschem Schlüssel wird nichts wiederhergestellt |
| Secrets vorbereitet | **BESTANDEN** (Vorbereitung) | Namen aus dem Code in `deploy/wirt/wirt.env.example`. Ohne Pflicht-Secrets startet die App nicht. Keine Secrets in Protokollen, API-Antworten, Seiten oder Sicherungsbericht (E2E). **Werte setzen: dein Schritt** |
| Fly-Deploy | **OFFEN** | kein Fly-Konto. Die lokalen Tests ersetzen keinen Fly-Deploy |
| HTTPS auf Fly | **OFFEN** | erst nach dem Deploy prüfbar (Abschnitt 8, Schritt 6) |
| Cloudflare-Deployment | **OFFEN** | kein Cloudflare-Konto. Die Seite ist **nicht** online |
| Echte E-Mail | **OFFEN** | nur lokaler Test-Empfänger. Echter Versand braucht Resend-Konto und eine verifizierte Absenderdomain |
| Echter Telegram-Test | **OFFEN** | nur lokaler Test-Bot-Server. Echter Test braucht deinen eigenen Bot (BotFather) und einen eigenen Testchat |
| Kundendomain | **OFFEN** | Für den Probelauf nicht nötig (`*.fly.dev`, `*.pages.dev`). Eine echte Domain wurde nicht verbunden |
| Freigegebene Rechtstexte | **OFFEN** | Muss das Restaurant liefern und freigeben (`LAUNCH-CHECKLISTE.md` B). Für den Probelauf mit dem fiktiven Testkunden nicht nötig, vor echten Gästen Pflicht |

Außerdem offen, aber außerhalb der Wirt-App: **S-01** (Google-Schlüssel rotieren) aus `SECURITY-AUDIT.md`.

---

## 2. Architektur – Antworten auf die sieben Fragen

Für den Pilot wurde die einfachste sichere Lösung gewählt: **eine Fly-App, eine Maschine, ein Volume, ein Prozess.**

```
Gast-Browser ──► Kundenseite (statisch, Cloudflare Pages)
     │              _headers: CSP connect-src nur zur Wirt-App
     └── fetch POST /oeffentlich/* ──► Wirt-App (Fly, https://<app>.fly.dev)
                                        scripts/wirtStart.mjs  (1 Prozess)
                                        ├─ HTTP: Gastrouten + Wirt-Dashboard
                                        ├─ Telegram-Abruf + Planer
                                        └─ tägliche Sicherung ──► R2 (verschlüsselt)
                                        Volume wirt_daten → /data
Agentur-Dashboard (eigene Fly-App, eigenes Volume)
     └── wirt-uebergabe.json ──► POST /intern/uebergabe (Wirt-Passwort)
```

**1. Welche Prozesse braucht EIN Pilotbetrieb?**
Genau einen: `node scripts/wirtStart.mjs` (im Image über `wirt-entrypoint`). Darin laufen:
- der HTTP-Server (v2-Hülle `wirtServerV2.js` um `src/wirtServer.js`),
- der Telegram-Abruf (Long Polling) mit Planer, falls `TELEGRAM_BOT_TOKEN` gesetzt ist, beschränkt auf diesen einen Betrieb,
- die tägliche Sicherung, falls `BACKUP_ZIEL` gesetzt ist.

Es gibt keinen Cron und keinen zweiten Dienst. Die Kundenseite ist statisch und braucht keinen Prozess.

**2. Wo liegen die zur Laufzeit veränderten Dateien?**
Alle unter `GASTRO_DATEN_DIR` (auf Fly `/data`, das Volume). Die Liste steht in Abschnitt 3. Das Image selbst wird nie beschrieben. `/data` wird im Image absichtlich nicht angelegt: Ohne eingehängtes Volume startet die App nicht.

**3. Welche Prozesse greifen auf denselben Betriebsspeicher zu?**
Im Normalbetrieb nur der eine App-Prozess. Er schreibt atomar (temporäre Datei, fsync, rename; 0600) und reiht Änderungen nacheinander ein.
Wartungsbefehle über `fly ssh console -C "wirt-befehl …"` laufen als eigener Prozess:
- `sicherung erstellen`, `liste` und `probe` lesen nur. Sie schreiben höchstens `sicherung/stand.json`.
- `sicherung vorbereiten` schreibt nur nach `wiederherstellung-bereit/`. Ausgetauscht wird erst beim nächsten Start.
- `uebergabe <datei>` schreibt in die Betriebsdatei. Deshalb die Übergabe **über die HTTP-Route** machen (`POST /intern/uebergabe`), dann schreibt nur der App-Prozess.

Das Agentur-Dashboard greift **nie** auf das Volume der Wirt-App zu. Fly-Volumes gehören genau einer Maschine einer App.

**4. Was passiert bei Neustart und Deploy?**
Fly schickt SIGTERM (`kill_timeout` 15 s). Die App nimmt keine neuen Anfragen mehr an, beendet laufende, gibt die Telegram-Sperre frei und endet mit Exit 0.
Beim Start:
1. Startprüfung (Pflicht-Secrets, Volume vorhanden und beschreibbar, Betriebsdatei lesbar). Eine beschädigte Datei führt zu Exit 1, statt leer zu starten.
2. Eine vorbereitete Wiederherstellung wird eingesetzt, die alten Daten bleiben daneben.
3. Verwaiste Telegram-Sperren werden entfernt.
4. Der Dienst startet.

Ein Deploy ersetzt nur das Image, das Volume bleibt. Mit einer Maschine ist die App während des Deploys einige Sekunden nicht erreichbar. Die Kundenseite zeigt dann nur reguläre Preise, und Absenden scheitert mit Hinweis. Der Release kommt immer aus einem festen Commit (`deploy/wirt/release.sh`, `git archive`), nie per `git pull`.

**5. Wie erreicht die Kundenseite die Wirt-API?**
- Die Adresse steht zur Bauzeit in der Seite (`PAGE_DATA.apiUrl` = `WIRT_OEFFENTLICHE_URL`).
- Der Browser ruft `POST https://<app>.fly.dev/oeffentlich/*` auf (Preise, Abholzeiten, Empfehlungen, Bestellung, Reservierung, Status, Rechtstexte).
- CORS gibt nur die Adressen in `WIRT_ERLAUBTE_ORIGINS` frei, dazu die eigene Adresse der Wirt-App (Statusseite).
- Die CSP der Seite (`_headers`) erlaubt Verbindungen nur zu dieser Wirt-App.
- Status-Link und Rechtstexte zeigen auf die Wirt-App (`/status#…`, `/rechtstexte/…`).

**6. Welche Routen sind öffentlich, welche intern?**
- **Öffentlich** (`istOeffentlicheRoute`), mit Bremsen:
  - `POST /oeffentlich/*`: status, reservierung, bestellung, bestellung/<id>/stornieren, preise, abholzeiten, empfehlungen, verfuegbarkeit, rechtstexte, no-show-einstellungen
  - `GET /status`, `/rechtstexte/*`, `/sw.js`, `/gesund` (ohne Daten, nur ok/Version)
  - `OPTIONS`
  - Schriften unter `/v2/assets/fonts/*`
  - Fremde Origins bekommen 403.
- **Intern:** alles andere, also `/`, `/api/*`, `/intern/*` (auch `/intern/uebergabe`), `/v2/api/*` und `/v2/intern/*`.
  - Anmeldung mit HTTP-Basic und `WIRT_PASSWORT`, 10 Fehlversuche je 15 min.
  - Schreibende Anfragen von fremder Herkunft bekommen 403.
  - Dazu `no-store` und `frame-ancestors 'none'`.
- Geprüft in `test/sicherheit.test.js`, `test/pilot-e2e.test.js` und `deploy/wirt/lokal-test.sh`.

**7. Welche Launch-Blocker stehen im Security-Audit?**
- **S-01:** Google-Schlüssel rotieren (dein Schritt, betrifft die Agentur).
- **S-15:** Sicherung und Wiederherstellungsprobe. Technisch gelöst und lokal bestanden (Abschnitt 5). Offen sind der echte R2-Upload und die erste Probe auf Fly.
- ⛔-Punkte der `LAUNCH-CHECKLISTE.md`:
  - A (HTTPS, Passwort, Proxy, interne Routen, Probe) wird nach dem Deploy auf Fly wiederholt (Abschnitt 8).
  - B (Impressum, Datenschutz, Allergene, Freigabe) liefert das Restaurant.
  - C (AVV, EU-Region, Sicherungskonzept) organisierst du bzw. die Agentur.

**Übergabeweg Agentur → Wirt-App (getestet):**
1. Das Agentur-Dashboard erzeugt aus einer **freigegebenen, aktuellen** Kundenfassung ein Paket: `npm run kunde -- paket --kunde k-…`.
2. `wirt-uebergabe.json` enthält Bestellkarte, Öffnungszeiten, Name, Rückfragenummer und Design. Es hat eine SHA-256-Prüfsumme und ist an den Betrieb gebunden. Gastdaten und Agentur-Notizen stehen nicht darin.
3. Die Wirt-App übernimmt es nur per `POST /intern/uebergabe` mit Wirt-Passwort.
4. Die App lehnt ab: veränderte Pakete, Pakete für andere Betriebe, Pakete ohne Freigabe.
5. Reservierungen, Bestellungen und Einstellungen bleiben dabei unberührt.

---

## 3. Laufzeitdaten auf dem Volume (`/data`)

| Pfad | Inhalt |
|---|---|
| `betrieb/<slug>.json` | Tische, Reservierungen, Bestellungen mit Statusverlauf, Gastmeldungen und Versandstände, Rechtstexte und Zustimmungsnachweise, Bestellkarte, Öffnungszeiten, Rabattaktionen, Empfehlungen, Telegram-Verknüpfungen und Erinnerungszustände, Push-Abos, Wartezeit, Übergabe-Vermerk |
| `betrieb/.gast-status-geheimnis` | nur, falls `GAST_STATUS_GEHEIMNIS` fehlt (auf Fly Pflicht, die Datei entsteht dort nicht) |
| `betrieb/.telegram-sperren/` | „ein Abruf je Bot-Token“, wird beim Start geleert |
| `zuverlaessigkeit/<slug>.json` | No-Show-Zähler je Telefonnummer |
| `wartezeitLernen/<slug>.json` | gelernte Wartezeiten |
| `seitenaufrufe/<slug>.json` | aggregierte Aufrufzahlen |
| `sicherung/stand.json` | letzter Versuch, letzter Erfolg, Fehler (nur Metadaten; Warnung im Dashboard nach 36 h ohne Erfolg) |
| `wiederherstellung-bereit/`, `vor-wiederherstellung-<zeit>/` | nur bei einer Wiederherstellung |

Medien und Uploads braucht die Wirt-App nicht: Bilder liegen im Paket der Kundenseite, `public/uploads` wird im Image gelöscht.

Schutz:
- Jede Datei wird atomar geschrieben. Ein Abbruch hinterlässt die alte Datei, nie eine halbe.
- Fehlende Ordner werden angelegt.
- Eine beschädigte Betriebsdatei wird **nie** still durch einen leeren Betrieb ersetzt. Der Start endet mit Exit 1, Gastanfragen bekommen 503 mit „bitte telefonisch“, die Sicherung bricht ab und meldet es.
- Beschädigte Nebendateien werden als `.beschaedigt-<zeit>` beiseitegelegt.
- Test: `test/sicherheit.test.js` („beschädigte Betriebsdatei …“) und `test/wirtSicherung.test.js`.

---

## 4. Secrets und Zugangsschutz

Vollständige Namensliste mit Erklärung: **`deploy/wirt/wirt.env.example`**. Die Namen stammen aus dem Code. Werte gehören nur in `fly secrets`, nie ins Repository.

| Gruppe | Namen |
|---|---|
| Pflicht | `BETRIEB`, `WIRT_PASSWORT`, `WIRT_OEFFENTLICHE_URL`, `GAST_STATUS_GEHEIMNIS` (`GASTRO_DATEN_DIR`, `VERTRAUTER_PROXY` stehen in `fly.wirt.toml`) |
| Empfohlen | `WIRT_ERLAUBTE_ORIGINS`, `BACKUP_ZIEL`, `BACKUP_SCHLUESSEL`, `BACKUP_S3_ENDPOINT`, `BACKUP_S3_BUCKET`, `BACKUP_S3_REGION`, `BACKUP_S3_ZUGANG`, `BACKUP_S3_GEHEIM`, optional `BACKUP_S3_PRAEFIX` |
| Optional | `RESEND_API_KEY`, `GAST_EMAIL_ABSENDER`, `GAST_EMAIL_ANTWORT_AN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_NAME` (+ `_RESERVIERUNG`/`_BESTELLUNG`), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |
| Nur lokale Tests | `RESEND_API_BASIS`, `TELEGRAM_API_BASIS` – auf Fly nie setzen (die Startprüfung warnt) |

Geprüft (lokal, an der echt laufenden App):
- Interne Routen ohne Anmeldung liefern 401, mit falschem Passwort 401, von fremder Herkunft 403.
- Gastrouten sind erreichbar.
- Fremde Websites bekommen 403 ohne CORS-Freigabe. Die Kundendomain und die eigene Statusseite sind erlaubt.
- Betrieb A sieht und ändert nichts von Betrieb B (`test/betriebTrennung.test.js`, auch per Telegram-Knopf).
- Kein Secret steht in Protokollen, im Dashboard, in API-Antworten, auf der Kundenseite oder im Sicherungsbericht.

Beim Aufbau gefunden und behoben:
- **Statusseite gesperrt:** Mit `WIRT_ERLAUBTE_ORIGINS` wurde die Statusseite der Wirt-App selbst abgewiesen. Jeder Gast hätte „Status nicht verfügbar“ gesehen.
- **Telegram für fremde Betriebe:** Der Telegram-Dienst bediente alle Betriebsdateien auf dem Volume, statt nur `BETRIEB`.
- **Root-Dateien nach Wartung:** Wartungsbefehle über `fly ssh console` (root) hätten root-eigene Dateien hinterlassen. Jetzt gibt es `wirt-befehl`, das als Benutzer `node` läuft.

---

## 5. Sicherung und Wiederherstellung

- **Was:** alle Ordner aus Abschnitt 3 (außer Sperren), mit Manifest (SHA-256 je Datei).
- **Wie:** AES-256-GCM mit `BACKUP_SCHLUESSEL`, **bevor** etwas den Host verlässt. Das Ziel sieht nur Chiffretext.
- **Wohin:** Speicher-Adapter (`src/sicherungExtern.js`):
  - `BACKUP_ZIEL=s3`: S3-kompatibel. Empfohlen ist **Cloudflare R2**: EU-Standort wählbar, keine Abrufgebühren, kostenloses Kontingent. Backblaze B2 oder AWS S3 gehen ebenso, eigene SigV4-Signatur, keine Zusatzabhängigkeit.
  - `datei:<ordner>` für Tests oder Notfälle.
- **Wann:** täglich um `BACKUP_UHRZEIT` (03:30 Europe/Berlin, im Prozess). Dazu von Hand: `fly ssh console -C "wirt-befehl sicherung erstellen"`.
- **Aufbewahrung:** Sicherungen älter als `BACKUP_BEHALTEN_TAGE` (30) werden gelöscht, die neuesten `BACKUP_MINDESTENS` (7) bleiben immer.
- **Fehler:**
  - Ausgabe im Fly-Log (`fly logs`).
  - Vermerk in `sicherung/stand.json`.
  - Das Wirt-Dashboard zeigt „⚠ Sicherung“, wenn der letzte Versuch scheiterte oder der letzte Erfolg älter als 36 h ist.
  - Eine beschädigte Betriebsdatei bricht die Sicherung ab, statt Schrott zu sichern.
- **Probe:** `wirt-befehl sicherung probe` lädt die neueste Sicherung, entschlüsselt sie in einen Temp-Ordner, prüft alle Prüfsummen und JSON-Dateien und zeigt je Betrieb die gesicherten Zahlen neben den Live-Zahlen. Danach wird der Temp-Ordner gelöscht.
- **Echte Wiederherstellung:**
  1. `wirt-befehl sicherung vorbereiten [--name …]`
  2. `fly apps restart <app>`
  3. Die Live-Daten werden beim Start ersetzt, die alten bleiben unter `vor-wiederherstellung-<zeit>/` liegen.
- **Fly-Volume-Snapshots** (täglich, standardmäßig 5 Tage) sind eine zusätzliche Absicherung, aber **kein Ersatz**: Sie liegen beim selben Anbieter.
- `BACKUP_SCHLUESSEL` **zusätzlich offline aufbewahren** (Passwortmanager). Ohne ihn ist keine Sicherung lesbar.

---

## 6. Kundenseite für den statischen Host

```bash
# Fiktiver Testkunde (Probelauf) – Name „Trattoria Probelauf“, Musteradresse, keine echten Daten:
npm run pilot:testkunde -- --betrieb <slug> --api https://<app>.fly.dev --noindex
# Echter Kunde (erst nach Freigabe im Editor; Felder betriebSlug und apiUrl gesetzt):
npm run kunde -- paket --kunde k-… [--noindex]
```

Ergebnis in `v2/output/pakete/<k-id>/` (gitignoriert, nie `docs/`):

| Teil | Was damit passiert |
|---|---|
| `site/` | **genau das** kommt auf den statischen Host: `index.html`, `speisekarte/`, `medien/` (Desktop- und Hochformat-Hero), `assets/fonts/`, `_headers` (CSP mit `connect-src` nur zur Wirt-App, HSTS, `nosniff`, `frame-ancestors 'none'`, bei `--noindex` auch `X-Robots-Tag`) |
| `wirt-uebergabe.json` | an die Wirt-App (`POST /intern/uebergabe`) |
| `intern/` | Baubericht und Prüfprotokoll (Dateiliste mit SHA-256, Commit) – **nicht** hochladen |

Das Paket wird nur gebaut, wenn:
- die Fassung freigegeben ist und die Freigabe zum aktuellen Inhalt passt,
- die Bestellung aktiv ist,
- die API-Adresse https ist.

Danach prüft es sich selbst:
- alle Verweise sind relativ und vorhanden, auch bei `url(…)`,
- keine Demo- oder Platzhalter-Spuren, keine Agentur-Pfade,
- die API-Adresse stimmt,
- die Rechtstext-Links zeigen auf die Wirt-App.

**GitHub Pages ist für Bestellseiten ausgeschlossen.** Dort bleiben nur die fiktiven Beispielseiten der Agentur.

---

## 7. Tests und lokale Nachtest-Befehle

| Befehl | Was es beweist |
|---|---|
| `npm test` | alle Tests. Die Browser-Tests überspringen sich ohne Chromium |
| `npm run pilot:e2e` | die 15 Schritte im Browser gegen eine echt gestartete Wirt-App (siehe unten) |
| `PILOT_E2E_IMAGE=gastro-wirt:<commit> npm run pilot:e2e` | dieselben 15 Schritte gegen den **gebauten Container**. Wartungsbefehle laufen dabei wie `fly ssh console` als root über `wirt-befehl` |
| `npm run wirt:container-test` (= `sh deploy/wirt/lokal-test.sh [commit]`) | Image aus `git archive`, ohne Volume kein Start, Health-Check, 401/403, Neustart, SIGTERM, RAM |
| `node --test test/wirtSicherung.test.js` | Verschlüsselung, Wiederherstellung (Datei für Datei und mit echt gestarteter App), Aufräumregel, Fehlerfälle, Zeitplan, SigV4 gegen AWS-Beispielwerte |
| `npm i --no-save s3rver@3.7.1 && node --test test/wirtSicherung.test.js` | zusätzlich das S3-Protokoll gegen ein lokales S3-kompatibles Ziel. s3rver ist absichtlich keine Projektabhängigkeit: npm meldet für sein Paket Befunde |
| `node --test test/betriebTrennung.test.js` | Betrieb A und B getrennt, auch per Telegram |

Hinter einem TLS-Proxy (z. B. Firmennetz): `BUILD_CA=/pfad/ca.crt npm run wirt:container-test`. Die CA wird nur beim `npm ci` benutzt und landet nicht im Image.

**Die 15 E2E-Schritte** (`test/pilot-e2e.test.js`):
1. Paket des fiktiven Testkunden bauen.
2. Statischer Host liefert `site/` mit den `_headers` aus (CSP aktiv). Startseite, Speisekarte, lokale Schriften, Handy-Hero, Rechtstext-Links.
3. Preise live vom Server (Rabatt −10 %).
4. Gericht und ein „Passt gut dazu“-Vorschlag in den Warenkorb.
5. Abholzeiten aus Öffnungszeiten plus 15 min Wirt-Verzögerung.
6. Bestellung absenden.
7. Die Bestellung erscheint im Dashboard (Basic-Anmeldung).
8. Der Wirt bestätigt mit späterer Zeit und meldet dann eine Verzögerung.
9. Die Statusseite zeigt den neuen Stand, ohne Namen.
10. Drei Mails im Test-Empfänger. Absender, Schlüssel und Link stimmen.
11. Telegram-Meldung mit Knöpfen, ohne Telefonnummer.
12. Reservierung wird per Telegram-Knopf bestätigt. Der Knopf aus einem fremden Chat wird abgewiesen. Mail und Statusseite folgen.
13. Manipulation wird abgewiesen: fremde Origin, gefälschter Preis, unbekanntes Gericht, veränderter Status-Link, Übergabe ohne Anmeldung, veränderte Übergabe (Prüfsumme), Übergabe für einen anderen Betrieb.
14. Neustart: alles ist noch da, auch Status-Link und Rabatt.
15. Sicherung erstellen (kein Klartext), Probe, Wiederherstellung (ein falscher Schlüssel scheitert). Eine zweite App auf den wiederhergestellten Daten liefert dieselben Datensätze.

Zum Schluss: kein Secret in Protokollen, Antworten oder Seite.

Hinweis: Die Uhr der Wirt-App steht im Test über `test/hilfen/uhrVorlauf.mjs` auf demselben Startzeitpunkt wie der Browser. Diese Datei ist nur ein Test-Hilfsmittel und kommt nicht ins Image.

---

## 8. Meine Schritte nach dem Fly-Abschluss

Voraussetzung: Du hast lokal `flyctl`, Docker ist nicht nötig. Alle Werte erzeugst und setzt du **nur in deinem eigenen Terminal**. Kopiere sie nie in einen Chat, ein Issue oder einen Commit.

**Benötigte Konten:**
- **Fly.io:** Kreditkarte, Zwei-Faktor-Anmeldung einschalten.
- **Cloudflare:** für Pages und R2 (kostenlos, Zwei-Faktor).
- Optional **Resend:** verifizierte Absenderdomain nötig.
- Optional ein **eigener Telegram-Bot:** BotFather, dazu ein eigener Testchat.

**1. Anmelden und App anlegen** (Name frei wählbar, im Beispiel `trattoria-pilot`):
```bash
fly auth login
fly apps create trattoria-pilot
fly volumes create wirt_daten --region fra --size 1 --app trattoria-pilot
```

**2. Backup-Ziel anlegen (Cloudflare R2):**
- Bucket anlegen, z. B. `gastro-wirt-sicherung`, Standort EU.
- API-Token nur für diesen Bucket mit „Object Read & Write“ anlegen. Daraus stammen Zugangsschlüssel, Geheimnis und Endpoint.

**3. Secrets setzen.** Lege die Datei **außerhalb** des Repositories an, z. B. `~/pilot-secrets.env` mit `chmod 600`. Die Namen stehen in `deploy/wirt/wirt.env.example`. Werte erzeugst du so:
- `openssl rand -base64 18` für `WIRT_PASSWORT`
- `openssl rand -base64 48` für `GAST_STATUS_GEHEIMNIS`
- `openssl rand -base64 32` für `BACKUP_SCHLUESSEL`, zusätzlich im Passwortmanager ablegen

Für den Probelauf setzt du:
- `BETRIEB=probe-trattoria`
- `WIRT_OEFFENTLICHE_URL=https://trattoria-pilot.fly.dev`
- `BACKUP_ZIEL=s3`, `BACKUP_S3_REGION=auto`
- `WIRT_ERLAUBTE_ORIGINS` erst in Schritt 7 (bis dahin warnt die Startprüfung nur)

```bash
fly secrets import --stage --app trattoria-pilot < ~/pilot-secrets.env
fly secrets list --app trattoria-pilot      # zeigt nur Namen, nie Werte
```

**4. Vorher lokal prüfen** (im Repository, auf dem Commit, den du deployen willst):
```bash
git switch <branch> && git pull
npm ci && npm test
npm run wirt:container-test      # braucht Docker; ohne Docker überspringen
```

**5. Deploy aus genau diesem Commit:**
```bash
deploy/wirt/release.sh $(git rev-parse HEAD) trattoria-pilot
```
Nicht getestet ist, ob Fly beim Remote-Build das optionale BuildKit-Secret `build_ca` im Dockerfile akzeptiert. Falls der Build daran scheitert: in `release.sh` `--local-only` ergänzen (baut mit deinem Docker).

**6. Prüfung über HTTPS:**
```bash
curl -sS https://trattoria-pilot.fly.dev/gesund                     # {"ok":true,…,"version":"<commit>"}
curl -sI http://trattoria-pilot.fly.dev/gesund | head -1            # 301 → https
curl -sI https://trattoria-pilot.fly.dev/gesund | grep -i strict    # Strict-Transport-Security
curl -s -o /dev/null -w '%{http_code}\n' https://trattoria-pilot.fly.dev/api/betrieb   # 401
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Origin: https://boese.example' \
  -H 'Content-Type: application/json' -d '{}' https://trattoria-pilot.fly.dev/oeffentlich/reservierung   # 403 (nach Schritt 7)
fly logs --app trattoria-pilot     # keine ⛔-Zeilen; ℹ️-Hinweise lesen
```
Dann im Browser `https://trattoria-pilot.fly.dev/` öffnen. Die Anmeldung erfolgt mit einem beliebigen Benutzernamen und `WIRT_PASSWORT`. Die Launch-Prüfung im Reiter „Rechtstexte“ zeigt die Punkte an.

**7. Kundenseite des fiktiven Testkunden auf Cloudflare Pages:**
```bash
npm run pilot:testkunde -- --betrieb probe-trattoria --api https://trattoria-pilot.fly.dev --noindex
npx wrangler pages deploy v2/output/pakete/<k-id>/site --project-name trattoria-probelauf
fly secrets set WIRT_ERLAUBTE_ORIGINS=https://trattoria-probelauf.pages.dev --app trattoria-pilot
curl --user wirt -H 'Content-Type: application/json' --data @v2/output/pakete/<k-id>/wirt-uebergabe.json \
  https://trattoria-pilot.fly.dev/intern/uebergabe      # fragt nach dem Passwort; Antwort: "gerichte": 13
```
Statt `wrangler` geht auch der Upload im Cloudflare-Dashboard: Pages → Direct Upload, den Ordner `site/` hochladen.

**8. Erstes Backup und Restore-Probe:**
```bash
fly ssh console --app trattoria-pilot -C "wirt-befehl sicherung erstellen"
fly ssh console --app trattoria-pilot -C "wirt-befehl sicherung probe"     # muss „✅ Wiederherstellungsprobe“ zeigen
```
Im R2-Bucket liegt dann `gastro-wirt-probe-trattoria-<zeit>.gbk`. Erst die bestandene Probe zählt, ein bloß geschriebenes Backup nicht. Nicht getestet ist, ob `fly ssh console` die Secrets als Umgebung mitgibt. Falls `BACKUP_ZIEL ist nicht gesetzt` erscheint, bitte melden.

**9. Kontrollierter Testbetrieb (Probelauf, 1–2 Tage):**
- Auf dem eigenen Handy die Seite `https://trattoria-probelauf.pages.dev` öffnen.
- Mit **eigener** Test-Mail und eigenem Telegram-Testchat die 15 Schritte aus Abschnitt 7 von Hand durchgehen:
  - Telegram verbinden: im Dashboard unter „Telegram“ einen Code erzeugen und `/start CODE` im Testchat senden.
  - Bestellen und reservieren.
  - Im Dashboard bestätigen und verschieben.
  - Statusseite und Mail prüfen.
  - `fly apps restart <app>`, dann ist alles noch da.
  - Die Sicherung am nächsten Morgen in `fly logs` und im R2-Bucket prüfen.

**10. Umstellen auf das echte Restaurant.** Erst wenn diese Voraussetzungen erfüllt sind:
- LAUNCH-CHECKLISTE B (Impressum, Datenschutz, Allergene, Freigabe) und C (AVV) sind erledigt.
- Die Kundenfassung ist im Editor freigegeben, mit `betriebSlug` = echtes Kürzel und `apiUrl` = Wirt-App.

Dann:
1. `fly secrets set BETRIEB=<echtes-kürzel> --app trattoria-pilot`. Die App startet mit leerem Betrieb neu, die Probedaten bleiben unbenutzt daneben liegen.
2. `npm run kunde -- paket --kunde k-…` bauen und `site/` als eigenes Pages-Projekt hochladen.
3. `WIRT_ERLAUBTE_ORIGINS` auf die neue Adresse setzen.
4. Übergabe wie in Schritt 7 posten.
5. Tische anlegen, Telegram neu verbinden, dann Schritt 8 wiederholen.
6. Die Probedatei entfernen: `fly ssh console -C "rm /data/betrieb/probe-trattoria.json"`.
7. Eine eigene Domain ist optional: `fly certs add` bzw. Pages → Custom domain. Das ist erst nach deiner Entscheidung dran.

---

## 9. Monatliche Kosten (Schätzung, vor Abschluss auf den Preisseiten prüfen)

| Posten | Schätzung | Quelle |
|---|---|---|
| Fly-Maschine `shared-cpu-1x`, 256 MB, dauerhaft an | ca. 2–3 US-$ | `docs-intern/HOSTING.md` (RAM-Preis ab 1.10.2026 beachten) |
| Fly-Volume 1 GB | ca. 0,15 US-$, Snapshots ggf. wenige Cent | Fly-Preisseite |
| Ausgehender Traffic, geteilte IPv4 | für einen Piloten vernachlässigbar bzw. 0 | Fly-Preisseite |
| Cloudflare Pages | 0 € (Free) | – |
| Cloudflare R2 (Sicherungen, wenige MB) | 0 € im kostenlosen Kontingent | – |
| Resend | 0 € in der kostenlosen Stufe | – |
| Telegram | 0 € | – |
| Domain | 0 € (nicht nötig für den Piloten) | – |
| **Summe** | **ca. 2–5 US-$ pro Monat** | – |

---

## 10. Abschalten und Rollback

**Rollback des Codes:** `deploy/wirt/release.sh <vorheriger-commit> trattoria-pilot`. Die Daten bleiben auf dem Volume. Den Commit zeigt `/gesund` (`version`).

**Rollback der Daten:**
```bash
fly ssh console --app trattoria-pilot -C "wirt-befehl sicherung liste"
fly ssh console --app trattoria-pilot -C "wirt-befehl sicherung vorbereiten --name <datei>"
fly apps restart trattoria-pilot
```
Die bisherigen Daten liegen danach unter `/data/vor-wiederherstellung-<zeit>/`.

**Pilot pausieren:** `fly scale count 0 --app trattoria-pilot`. Das Volume bleibt und kostet weiter wenige Cent. Die Kundenseite zeigt dann nur reguläre Preise, und Absenden scheitert mit dem Hinweis „bitte telefonisch“. Entweder vorher die Seite entfernen oder einen Hinweis einbauen.

**Nach dem Monat endgültig abschalten**, in dieser Reihenfolge:
1. Eine letzte Sicherung erstellen und eine Probe machen (Schritt 8). Mit dem Restaurant klären, was es behält, und die Frist gemäß AVV und Datenschutzerklärung festlegen.
2. Die Cloudflare-Pages-Projekte löschen, damit keine Seite mehr Bestellungen annimmt.
3. `fly apps destroy trattoria-pilot`. Das löscht App, Maschine und Volume **unwiderruflich**, also erst nach Schritt 1.
4. Die R2-Sicherungen nach Ablauf der vereinbarten Frist löschen, danach Bucket und API-Token.
5. Den Telegram-Bot-Token widerrufen (BotFather `/revoke`), den Resend-Schlüssel löschen.
6. Den `BACKUP_SCHLUESSEL` erst löschen, wenn keine Sicherung mehr existiert.
