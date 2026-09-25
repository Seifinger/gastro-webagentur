# Launch-Checkliste (erster echter Kunde)

**Stand:** 25.09.2026. Gehört zu `SECURITY-AUDIT.md` und `DATENFLUSS.md`.
**Achtung:** Diese Liste ist keine Rechtsberatung. Ein vorhandenes Impressum oder eine Checkbox ist noch keine rechtliche Freigabe.

**Launch-Blocker** sind mit ⛔ markiert. Die Prüfliste im Wirt-Dashboard (Reiter „Rechtstexte“ → Launch) zeigt einen Teil davon live an.

## A. Technisch überprüfbar – nach dem Einrichten des Hosts dort wiederholen

| | Prüfung | Wie |
|---|---|---|
| ⛔ | Google-Schlüssel rotiert, alter gelöscht (S-01) | Google Cloud Console; danach `npm start` mit dem neuen Schlüssel |
| ⛔ | `WIRT_PASSWORT` gesetzt, mindestens 12 Zeichen, zufällig (z. B. `openssl rand -base64 18`) | Launch-Prüfung im Dashboard grün; `curl -i https://<wirt>/api/betrieb` → 401 |
| ⛔ | `WIRT_OEFFENTLICHE_URL=https://…` gesetzt | Launch-Prüfung; der Status-Link in der Bestätigung beginnt mit https |
| ⛔ | HTTPS mit gültigem Zertifikat vor dem Wirt-Server, HTTP leitet auf HTTPS um, HSTS am Proxy | `curl -I http://…` → 301/308; `curl -I https://…` zeigt `Strict-Transport-Security` |
| ⛔ | Hinter einem Proxy: `VERTRAUTER_PROXY` passend gesetzt (`1` für Caddy/nginx auf demselben Rechner, `fly` auf Fly) | Zwei Geräte in verschiedenen Netzen reservieren nacheinander, beide ohne 429. Eine selbst gesetzte `X-Forwarded-For`-Zeile ändert nichts |
| ⛔ | Interne Routen von außen gesperrt | Ohne Anmeldung: `/`, `/api/betrieb`, `/api/statistik`, `/intern/wartezeit` → 401. Mit Anmeldung von fremder Seite (`Origin: https://example.org`) → 403 |
| ⛔ | Gastseite → Reservierung und Bestellung kommen an (Testbetrieb, synthetische Daten), Statusseite lädt | im Browser auf dem Handy |
| ⛔ | Sicherung eingerichtet und **Wiederherstellung einmal geprobt** | `npm run sicherung -- erstellen --ziel <ort>`, dann `npm run sicherung -- pruefen <datei>` → „Wiederherstellungsprobe bestanden“; Archiv verschlüsselt an einen zweiten Ort (z. B. `age`/`gpg`), Zeitplan (cron/Host-Snapshots) |
| | Betriebsdatei nur für den Server-Benutzer lesbar | `ls -l data/betrieb` → `-rw-------` |
| | Dashboard (Agentur) online nur mit Anmeldung | `https://<dashboard>/api/leads` → 401; 11. falsches Passwort → 429 |
| | Dashboard-Host ohne Schreib-Token für GitHub (O-05) | `fly secrets list` |
| | Prozess startet nach Absturz neu (systemd `Restart=always`, Fly-Maschine) | Prozess beenden → kommt zurück |
| | Konsolenprotokolle: Aufbewahrung beim Host bekannt (z. B. 7–30 Tage) | Host-Einstellung |
| | E-Mail: Absenderdomain bei Resend verifiziert (SPF/DKIM), Versandtest nur an eigene Adresse | `npm run gast:mailtest -- --an <eigene Adresse>` |
| | `npm test` grün (bis auf den bekannten datumsabhängigen Test) und `npm audit` ohne Befund | lokal vor jedem Deploy |

## B. Vom Restaurant zu liefern bzw. freizugeben

| | Punkt |
|---|---|
| ⛔ | Impressum: Angaben liefern; im Wirt-Dashboard als Fassung freigeben (Name, Prüfvermerk) |
| ⛔ | Datenschutzerklärung: freigeben, mit Host, Mail-Dienst, Telegram/Web-Push, Speicherdauern und Aufsichtsbehörde (siehe `DATENFLUSS.md`) |
| ⛔ | Allergene und Zusatzstoffe je Gericht (vom Betrieb, nicht geschätzt) |
| ⛔ | Freigabe der Website-Inhalte (Name, Zeitpunkt) im Editor |
| | Bestell- und Reservierungsbedingungen, falls verwendet; No-Show-Regel nur, wenn der Betrieb Betrag und Frist begründen kann |
| | Fotos ohne Personen oder mit deren Einwilligung; Nutzungsrechte an Fotos und Logo |
| | Öffnungszeiten, Ausnahmen, Rückfragenummer |
| | Wer im Betrieb Zugang zum Wirt-Dashboard hat (Passwort nicht per Messenger teilen) |

## C. Von Agentur bzw. Host zu organisieren

| | Punkt |
|---|---|
| ⛔ | AVV zwischen Restaurant und Agentur (wenn die Agentur hostet oder Zugriff hat), Unterauftragsverarbeiter (Host, Resend) aufgelistet |
| ⛔ | Host und Standort gewählt (EU-Region), Zugang zum Host mit Zwei-Faktor-Anmeldung |
| ⛔ | Sicherungskonzept: Ort, Verschlüsselung, Aufbewahrung, wer wiederherstellen darf, Probe dokumentiert |
| | Löschroutine nach festgelegten Fristen (O-01) – Umsetzung nach Freigabe |
| | Notfallplan: Was tun, wenn der Wirt-Server nicht erreichbar ist (Hinweis auf der Seite: telefonisch reservieren), wer wird benachrichtigt |
| | Vorgehen bei Datenpanne (Meldung binnen 72 Stunden, Art. 33 DSGVO): Ansprechpartner, Vorlage |
| | Beispielseiten: Unsplash-Bilder selbst hosten oder in der Datenschutzerklärung der Agentur nennen (O-03) |
| | `data/kuechen.json` aus Git nehmen (O-02), vorher auf dem Host sichern |
| | Passwort-Wechsel beim Personalwechsel des Betriebs |

## D. Fachlich bzw. rechtlich zu prüfen – Fragen für die Rechtsberatung

1. **Rollen:**
   - Ist die Agentur Auftragsverarbeiterin des Restaurants, wenn sie den Wirt-Server hostet oder wartet?
   - Welche AVV-Inhalte braucht es?
   - Sind Host und Resend als Unterauftragsverarbeiter korrekt eingeordnet?
2. **Drittland:**
   - Reichen die Garantien von Resend (USA), Fly.io (USA-Firma, Region Frankfurt), Telegram (VAE) und den Web-Push-Diensten?
   - Oder sollen Telegram- und Push-Nachrichten keine Gastnamen und Telefonnummern mehr enthalten (O-13)?
3. **Speicherdauer:**
   - Wie lange dürfen bzw. müssen Reservierungen, Bestellungen, Kontaktdaten und Bestätigungsnachweise aufbewahrt werden?
   - Welche Fristen gelten für No-Show-Rechnungen (steuerlich)?
4. **No-Show-Warnliste:**
   - Ist das Speichern der Telefonnummern nicht erschienener Gäste (90 Tage, nur Warnhinweis für den Wirt) zulässig?
   - Auf welcher Grundlage?
   - Muss die Datenschutzerklärung darauf hinweisen?
5. **No-Show-Gebühr:**
   - Sind Betrag, Frist und Formulierung der freigegebenen Regel wirksam (u. a. § 309 Nr. 5 BGB)?
   - Reicht die gespeicherte Bestätigung (Fassung, Hash, Zeitpunkt) als Nachweis?
6. **Bestellung:**
   - Genügt der Ablauf „Zahlungspflichtig bestellen“ mit Bezahlung vor Ort den Anforderungen an den Bestellknopf und die Bestätigung?
   - Braucht es eine Widerrufsbelehrung? Bei Speisen gilt meist eine Ausnahme – zu prüfen.
7. **E-Mail:**
   - Sind die reinen Status-E-Mails (ohne Werbung) ohne gesonderte Einwilligung zulässig?
   - Stimmt der Hinweis am Formular?
8. **Lead-Daten:**
   - Dürfen Place-Daten von Google in dieser Form gespeichert und für Anschreiben genutzt werden (Nutzungsbedingungen, Zwischenspeicherfrist, UWG bei Kontaktaufnahme)?
9. **Beispielseiten der Agentur:**
   - Braucht es für das Nachladen von Unsplash-Bildern einen Hinweis oder eine Einwilligung?
10. **Barrierefreiheit:**
    - Fällt das Bestell- oder Reservierungsangebot unter das Barrierefreiheitsstärkungsgesetz?
    - Kleinstunternehmen sind teils ausgenommen – zu prüfen.

## Was ich nicht prüfen konnte

- **Hosting:** Keine echte Hosting-Umgebung, kein Deploy, kein TLS, keine Proxy-Konfiguration. Alle Prüfungen in Teil A sind nach dem Einrichten dort zu wiederholen.
- **Google-Schlüssel:** Ob er noch gültig ist oder schon missbraucht wurde, habe ich bewusst nicht gegen Google getestet.
- **Mail-Dienst:** Echter Versand über Resend nur mit deinen Zugangsdaten; in den Tests läuft ein Mock.
- **Rechtliches:** Rechtliche Wirksamkeit von Texten, Fristen und Abläufen (Teil D).
