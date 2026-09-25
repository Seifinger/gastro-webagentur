# Statistik, Rechtstexte, Bestätigungen und No-Show

Stand: 25.09.2026. **Keine Rechtsberatung.** Dieses Dokument beschreibt Technik, Prüfgates und offene Fragen. Ob ein Text, eine Klausel oder ein Ablauf rechtlich trägt, muss fachlich geprüft werden. Eine Freigabe im Dashboard und eine Checkbox im Formular ändern daran nichts.

## 0. Bestandsaufnahme (vor der Umsetzung)

| Bereich | Vorher vorhanden | Tatsächlich aktiv | Gefehlt |
|---|---|---|---|
| Reservierungen | `betriebStore.legeReservierungAn`, Feld `quelle` (`online` über `/oeffentlich/reservierung`, `manuell` über `/api/reservierung`), vom Server gesetzt | ja, pro Betrieb eine JSON-Datei unter `data/betrieb/` | Auswertung, Zeiträume |
| Manuelle Reservierungen | Formular im Wirt-Dashboard, sofort „bestätigt“ | ja | getrennte Zählung |
| Bestellungen | nur über `/oeffentlich/bestellung`, Status `neu/bestaetigt/abgeholt/abgelehnt/storniert`, v2-Küchenstatus `bereit` | ja | Feld `quelle` (Altdaten haben keins) |
| No-Show (Bestellung) | Schalter, Betrag, Stornofenster im Dashboard; Text serverseitig aus diesen Werten gebaut; Zustimmung + Zeitpunkt am Vorgang; Rechnung (PDF) nur manuell durch den Wirt | standardmäßig aus | Freigabe, Versionierung, Bindung an einen freigegebenen Wortlaut |
| No-Show (Reservierung) | – | – | alles (jetzt nur vorbereitet, aus) |
| Formulare v1/v2 | E-Mail optional, Status-Link-Hinweis, No-Show-Checkbox | Button „Abholung verbindlich bestellen“ | Impressum-/Datenschutz-Links, Bedingungen, Hinweis „Anfrage vs. verbindliche Bestellung“ |
| Impressum / Datenschutz / AGB | **nicht vorhanden** – keine Seite, kein Link | – | alles |
| Wirt-Server / Auth | optional `WIRT_PASSWORT` (HTTP-Basic), ein Prozess je Betrieb; v2-Hülle nutzt dieselbe Prüfung | ohne gesetztes Passwort **offen** | Launch-Blocker-Warnung |
| Hosting Kundenseiten | GitHub Pages nur für fiktive Beispielseiten; Lead-Demos nur lokal; Fly.io-Konfiguration nur für das Agentur-Dashboard | **kein** produktiver Host für echte Kundenseiten oder den Wirt-Server | Hosting-Entscheidung |
| Analytics | Resonanz-Beacon (`src/resonanzBeacon.js`) misst, ob ein **Agentur-Entwurf** geöffnet wurde | nur mit `RESONANZ_URL`, nur Entwürfe | Messquelle für Kundenseiten |

Nebenbei gefunden und behoben: Ein unbekannter `POST /oeffentlich/…`-Pfad ließ die Anfrage hängen. Jetzt kommt 404.

## 1. Quellen

- **Reservierung:** `online` (Website-Formular), `manuell` (Wirt), `unbekannt` (fehlendes oder anderes Feld). Die Quelle ergibt sich allein aus dem aufgerufenen Server-Weg. Ein `quelle`-Wert im Formular wird ignoriert, und `legeReservierungAn` lehnt alles außer `online`/`manuell` ab.
- **Bestellung:** Neue Bestellungen tragen `quelle: "online"`, weil es keinen anderen Weg gibt. **Altdaten ohne Feld zählen als „unbekannt“**. Belegt wäre die Herkunft nur durch den Code-Verlauf, nicht durch den Datensatz.
- Ein Vorgang wird mit seinem **aktuellen** Status einmal gezählt. Statuswechsel verschieben ihn zwischen den Spalten.

## 2. Zeiträume

`src/statistik.js`: Heute, diese Woche (ab Montag), dieser Monat, dieses Quartal, dieses Jahr, eigener Zeitraum (höchstens 3 Jahre). Grenzen gelten in der Zeitzone des Betriebs (`zeitzone`, Standard Europe/Berlin), auch an den Umstellungstagen (23 bzw. 25 Stunden).

- **Hauptauswertung:** zählt nach `eingegangen` (Zeitpunkt der Anfrage bzw. Bestellung).
- **„Was steht heute an?“:** separat, nach Besuchs- bzw. Abholtag.

## 3. Kennzahlen

| Kennzahl | Quelle | Anmerkung |
|---|---|---|
| Online-Reservierungen, davon bestätigt / abgelehnt / offen | echte Datensätze | „storniert“ gibt es bei Reservierungen nicht; Absagen macht der Wirt |
| Manuelle Reservierungen | echte Datensätze | |
| Herkunft unbekannt | echte Datensätze | nur angezeigt, wenn > 0 |
| Personen | Feld `personen` (ganze Zahl) | laut Anfrage, nicht tatsächlich erschienen |
| Bestellungen je Status | echte Datensätze | neu, bestätigt/in Zubereitung, bereit, abgeholt, abgelehnt, storniert |
| **Bestellwert** | Summe `gesamt` der Status bestätigt, bereit, abgeholt | **kein bezahlter Umsatz** (Zahlung vor Ort, keine Online-Zahlung); dazu „davon abgeholt“ und Durchschnitt |

## 4./5. Website-Aufrufe

- **Heute nicht messbar.** Es gibt keinen Host für echte Kundenseiten. GitHub-Repository-Traffic ist kein Nachweis für Seitenaufrufe. Das Dashboard zeigt „Website-Aufrufe: noch nicht messbar.“ – nie 0.
- **Vorbereitet** (`src/seitenaufrufe.js`): Quelle `host-aggregat`. Der Server, der später die Kundenseite ausliefert, ruft pro Anfrage `zaehleAbruf()` auf. Gespeichert werden nur Zähler je Tag und Seitentyp (`data/seitenaufrufe/<betrieb>.json`, gitignoriert): keine IP, kein User-Agent, kein Referer, keine Kennung, kein Cookie, kein localStorage, kein Skript im Browser.
- **Nicht gezählt:** statische Dateien, Nicht-GET, Fehlerseiten, Health-Checks, Bots mit ehrlicher Kennung, Prefetch, `?vorschau`/`?intern`, Kopf `X-Agentur-Vorschau`, Aufrufe vor dem Aktivierungszeitpunkt. Bots, die sich als Browser ausgeben, zählen mit; das steht so im Dashboard.
- **Einschalten** erst, wenn der Host wirklich zählt: `node scripts/seitenaufrufMessung.mjs --betrieb <slug> --quelle host-aggregat`.
- **Bezeichnungen:** „Seitenaufrufe (Seitenabrufe, keine Personen)“. Besuche oder eindeutige Besucher werden nicht angezeigt. „Online-Anfragen und -Bestellungen je 100 Seitenaufrufe“ erscheint nur bei vollständig gemessenem Zeitraum, ausdrücklich als Ereignisverhältnis und nicht als Conversion-Rate.
- **Vor dem Einschalten prüfen:**
  - TDDDG: § 25 greift nicht, solange nichts auf dem Endgerät gespeichert oder ausgelesen wird. Genau so ist es gebaut.
  - DSGVO: Die IP-Adresse wird vom Host verarbeitet, auch wenn die Zählung sie nicht speichert. Rechtsgrundlage (berechtigtes Interesse) und Hinweis in der Datenschutzerklärung klären.
  - Hostingort und AVV mit dem Host klären.

## 6. Rechtsdokumente je Restaurant

Die Dokumente liegen im Betriebsspeicher (`rechtsdokumente`), die Verwaltung ist im Wirt-Dashboard unter „Rechtstexte“. Arten: Impressum, Datenschutzerklärung, Bestellbedingungen, Reservierungsbedingungen, No-Show-Regel Bestellung, No-Show-Regel Reservierung.

Gespeichert werden je Fassung:
- Betrieb, Art, Version (`v1`, `v2` …) und Status (Entwurf / freigegeben / zurückgezogen)
- freigegeben von, Prüfvermerk, Freigabezeitpunkt, gültig ab
- Inhalt, Bestätigungstext und Parameter (Betrag, Frist, Nachweisweg)
- SHA-256 über Art, Version, Inhalt, Bestätigungstext und Parameter

Regeln:
- **Freigabe verweigert**, solange der Entwurfsvermerk oder `[[Platzhalter]]` im Text stehen, Name oder Prüfvermerk fehlen oder die Bestätigung fehlt. Bei No-Show-Regeln zusätzlich, solange Betrag, Frist oder der Gegenbeweis-Satz fehlen, und bei Reservierungen, solange der Nachweisweg fehlt.
- Freigegebene Fassungen sind **unveränderlich** und werden nie gelöscht. Änderungen ergeben eine neue Version. „Zurückziehen“ beendet die Gültigkeit, die Fassung bleibt als Nachweis abrufbar.
- Öffentlich (`/rechtstexte/<art>`, `/rechtstexte/<art>/<version>`, `.txt` zum Speichern) sind nur freigegebene bzw. zurückgezogene Fassungen, **nie Entwürfe**. Ohne Fassung steht dort „noch keine freigegebene Fassung“.

### Vom Restaurant zu liefern

- **Impressum:** vollständiger Name bzw. Firma, Rechtsform, vertretungsberechtigte Person, ladungsfähige Anschrift, Telefon, E-Mail, ggf. Handelsregister, USt-IdNr., ggf. Verantwortlicher nach § 18 MStV, Angabe zur Verbraucherstreitbeilegung (§ 36 VSBG).
- **Datenschutz:** Verantwortlicher, ggf. DSB, Host des Wirt-Servers (Anbieter, Sitz, Serverstandort), Agentur als Auftragsverarbeiter (ja/nein), Mail-Dienst, Benachrichtigungswege des Wirts (Web-Push, Telegram – enthalten Gastname und Telefon), Speicherdauern, zuständige Aufsichtsbehörde, Datum.
- **Bestellbedingungen:** Annahmefrist, Zahlungsarten, Stornoweg, **Allergen- und Zusatzstoffinformationen** (fehlen in der Speisekarte der Website), Aussage zum Widerrufsrecht, § 36 VSBG.
- **Reservierungsbedingungen:** Haltezeit bei Verspätung, Absageweg, Gruppenregeln.
- **No-Show-Regel(n):** Betrag bzw. Berechnungsweise, Stornofrist, Stornoweg, **Begründung, dass der Betrag den typischen Schaden nicht übersteigt** (intern), Nachweisweg (Reservierung).
- **Keine** dieser Angaben wird vom System erfunden. Ohne sie bleibt der Entwurf gesperrt.

## 7. Formulare

- **Über dem Absenden (v1 und v2, nur mit Betriebsserver):**
  - Art des Vorgangs: „Mit ‚Zahlungspflichtig bestellen‘ geben Sie eine verbindliche Bestellung ab …“ bzw. „Sie senden eine Reservierungsanfrage …“.
  - Datenschutz-Hinweis mit Link. **Keine** Pflicht-Einwilligung, die Verarbeitung beruht auf Vertrag bzw. Anfrage.
  - Bedingungen: eigenes, **nicht vorangekreuztes** Feld mit Link auf die konkrete Fassung, nur wenn freigegeben.
  - No-Show: eigenes Feld, **getrennt** und direkt vor dem Knopf, nur wenn wirksam.
- **Server:** prüft je Vorgang, ob für **genau die gültige Version** bestätigt wurde. Fehlt die Bestätigung oder ist sie veraltet, wird abgelehnt (nichts gespeichert), und das Formular lädt die Fassungen neu.
- **Nachweis am Vorgang:** Art, Dokument-ID, Version, SHA-256, Zeitpunkt, Status, bei No-Show der Betrag. **Keine IP-Adresse.**
- **Bestellknopf:** „Zahlungspflichtig bestellen“ (§ 312j Abs. 3 BGB – fachlich prüfen). Der Gesamtpreis steht direkt darüber. Die Reservierung bleibt eine „Anfrage“, nach dem Absenden steht „Anfrage eingegangen“.
- **Newsletter/Marketing:** gibt es nicht und ist nicht gekoppelt.
- **Konzept-Demos, Entwürfe und Beispielseiten** haben keine `apiUrl`. Damit gibt es keinen Rechtsblock und keine Bestätigung, und nichts wird verschickt.

## 8. No-Show

| | Bestellung | Reservierung |
|---|---|---|
| Vorher | Schalter mit frei eingetragenem Betrag, Text aus den Werten gebaut | nicht vorhanden |
| Jetzt | bestehende Logik weiterverwendet; **einschaltbar nur mit freigegebener Regel**, Betrag und Frist kommen aus der Regel, abweichende Werte werden abgelehnt; Altbestand „an“ ohne Regel wirkt nicht und wird im Dashboard angezeigt | technisch vorbereitet (Dokumentart, Gate, Bestätigung, Nachweis); **aus**; eine Freigabe schaltet nichts ein; Einschalten nur mit Regel inkl. Nachweisweg; **keine Abrechnung im System** |
| Standard | aus | aus |
| Abrechnung | nur manuell: „Kunde nicht erschienen“ durch den Wirt, Betrag nur nach unten korrigierbar, keine Abbuchung; die Rechnung nennt Fassung und Gegenbeweis | keine |

Vorlagen: Anwendungsfall, Betrag, Frist, Stornoweg, ausdrücklicher Nachweis eines fehlenden oder wesentlich geringeren Schadens (vgl. § 309 Nr. 5 BGB), keine automatische Abbuchung. **Die Höhe muss der Betrieb begründen.** Ob sie den typischen Schaden übersteigt, prüft das System nicht.

## 9. Aufbewahrung und Löschung (Vorschlag – mit dem Betrieb festlegen)

| Datentyp | Ort | Vorschlag | Umgesetzt? |
|---|---|---|---|
| Reservierungen/Bestellungen inkl. Kontakt | `data/betrieb/<slug>.json` | X Monate nach Termin löschen bzw. anonymisieren | **nein** – manuell; eine Löschroutine fehlt |
| Bestätigungsnachweise | am Vorgang | solange Ansprüche möglich sind (Verjährung prüfen), sonst mit dem Vorgang | mit dem Vorgang |
| Freigegebene Rechtstexte | `rechtsdokumente` | solange ein Vorgang darauf verweist | nie automatisch gelöscht |
| No-Show-Rechnungen | per E-Mail / PDF | steuerliche Aufbewahrungsfristen | außerhalb des Systems |
| Gastmeldungen (Versandstand) | `gastMeldungen` | höchstens 500 je Betrieb | Deckel vorhanden |
| Seitenaufruf-Zähler | `data/seitenaufrufe/` | aggregiert, ohne Personenbezug | – |
| Status-Link | Hash am Vorgang | 30 Tage nach Termin ungültig | ja |

Keine dieser Daten liegen in `docs/`, GitHub Pages oder Git (`data/betrieb/` und `data/seitenaufrufe/` sind gitignoriert). Es werden keine AGB-Volltexte, Gastdaten oder Statistikdaten an Dritte geschickt. Ausnahmen, nur wenn eingerichtet: der Mail-Dienst (nur E-Mail-Adresse und Statusmeldung) und Telegram/Web-Push an den Wirt.

## 10. Zugriff und Launch-Blocker

- Ein Wirt-Server-Prozess bedient genau einen Betrieb. Die APIs haben keinen Betriebsparameter, fremde Daten sind nicht adressierbar. Mehrere Betriebe auf einem Host teilen sich aber `data/` und brauchen je ein eigenes Passwort (Prozess).
- `/api/*` (Statistik, Rechtstexte, Nachweise) und `/intern/*` sind nie öffentlich. Mit `WIRT_PASSWORT` nur nach Anmeldung. Ohne Passwort nur direkt auf dem Rechner (localhost, ohne Proxy), bei `WIRT_OEFFENTLICHE_URL` oder `NODE_ENV=production` gar nicht (seit Audit 25.09.2026, `SECURITY-AUDIT.md`). Öffentlich sind nur `/oeffentlich/*`, `/status` und `/rechtstexte/*`.
- **Launch-Blocker** (Prüfliste im Reiter „Rechtstexte“, Warnung beim Start ohne Passwort auf 0.0.0.0):
  1. `WIRT_PASSWORT` fehlt oder ist kürzer als 12 Zeichen
  2. keine öffentliche HTTPS-Adresse
  3. Impressum nicht freigegeben
  4. Datenschutzerklärung nicht freigegeben
  5. Allergeninformation fehlt
  6. AVV ungeklärt
- HTTP-Basic ist ein Minimalschutz. Vorhanden: höchstens 10 Fehlversuche je Adresse in 15 Minuten, Herkunftsprüfung gegen CSRF. Für den Produktivbetrieb zusätzlich prüfen: TLS-Terminierung, `VERTRAUTER_PROXY` hinter einem Proxy, eigene Zugänge je Person statt eines geteilten Passworts.

## Rollen und AVV (zu prüfen)

- **Restaurant:** Verantwortlicher für Gast-, Reservierungs- und Bestelldaten.
- **Agentur**, wenn sie den Wirt-Server hostet, wartet oder Zugriff hat: voraussichtlich Auftragsverarbeiter (Art. 28 DSGVO). Das gilt auch dann, wenn sie die Daten „nicht aktiv liest“ – Zugriffsmöglichkeit und Hosting genügen in der Regel. AVV mit jedem Betrieb.
- **Host** (z. B. Fly.io, Hetzner): Unterauftragsverarbeiter der Agentur bzw. Auftragsverarbeiter des Betriebs; Serverstandort und Drittland prüfen.
- **Resend** (USA): Auftragsverarbeiter für E-Mails; Drittlandübermittlung und Garantien prüfen.
- **Telegram / Web-Push-Dienste:** Die Benachrichtigung an den Wirt enthält Gastname und Telefonnummer. Rolle und Drittland klären oder den Inhalt kürzen.

## Verbraucherrecht (fachlich zu prüfen)

- Bestellsituation und Knopf „Zahlungspflichtig bestellen“ (§ 312j Abs. 2 und 3 BGB), Pflichtinformationen vor der Bestellung (Art. 246a EGBGB)
- Widerrufsrecht bei Speisen (§ 312g Abs. 2 Nr. 2 BGB)
- Vertragsschluss und Annahmefrist
- Allergenkennzeichnung im Fernabsatz (LMIV Art. 14, LMIDV)
- Einbeziehung der AGB (§ 305 Abs. 2 BGB)
- No-Show-Pauschale (§ 309 Nr. 5 BGB)
- § 36 VSBG
- Preisangaben (PAngV)
