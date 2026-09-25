# Telegram – Datenschutzübersicht

**Stand:** 25.09.2026 · **Grundlage:** Code in diesem Repository (`src/telegramRegeln.js`,
`src/telegramZeitfenster.js`, `v2/integration/telegram*.js`). Nicht in einer echten Umgebung
beobachtet, **nicht rechtlich geprüft**. Diese Übersicht ist keine Aussage „DSGVO-konform“.

## 1. Grundsatz

- Telegram ist ein **optionaler Alarm- und Aktionskanal für den Betrieb**, kein Ersatz für das
  Wirt-Dashboard. Das Dashboard (geschützt mit `WIRT_PASSWORT`) bleibt die maßgebliche Quelle.
- **Gäste brauchen kein Telegram.** Reservieren und Bestellen läuft über die Website und den
  Wirt-Server; Gäste haben mit dem Bot nie Kontakt.
- Telegram bekommt nur, was als Alarm nötig ist. Details stehen nur im Dashboard.

## 2. Welche Daten an Telegram gehen

| Nachricht | Inhalt |
|---|---|
| Reservierung (neu, nachgemeldet, Erinnerung, nach Knopfdruck) | Name des Betriebs, Referenz `RES-1234`, Datum, Uhrzeit, Personenzahl, Status, ggf. Eingangszeit |
| Bestellung (neu, nachgemeldet, Erinnerung, nach Knopfdruck, Storno) | Name des Betriebs, Bestellnummer `AB-1234`, gewünschte bzw. bestätigte Abholzeit, Status, ggf. Eingangszeit |
| Sammelmeldung | Anzahl offener Vorgänge und die Zeilen oben |
| Tagesübersicht, `/heute` | Uhrzeit, Personenzahl und Referenz je Reservierung; Nummern laufender Bestellungen |
| `/offen`, „Einzeln anzeigen“ | wie Reservierung/Bestellung oben |
| Hinweis nach Ablehnung/Terminänderung ohne zugestellte Gastnachricht | „bitte anrufen (Nummer im Wirt-Dashboard)“ – ohne Nummer |
| Testnachricht | Name des Betriebs, welcher Kanal |
| Knöpfe (`callback_data`) | `r:ok:<Vorgangs-ID>` usw. – interne Zufalls-ID, kein Status-Link-Token |

**Nicht** an Telegram: Namen, Telefonnummern, E-Mail-Adressen, Wünsche und Hinweise (können
Allergien oder Gesundheitsangaben enthalten), Bestellpositionen, Summen, No-Show-Zustimmungen,
Rechnungen, Status-Links oder andere Tokens. Geprüft in `test/telegramBenachrichtigung.test.js`
(Test 20) und in den E2E-Tests.

Auch diese Angaben können zusammen mit dem Wissen im Team auf eine Person verweisen (z. B.
„4 Personen, Samstag 19:00“ und ein bekannter Stammgast). Sie sind deshalb weiter als
personenbezogen zu behandeln – nur deutlich weniger als vorher.

Unabhängig davon verarbeitet Telegram eigene **Metadaten**: Telefonnummer und Konto der
Chat-Mitglieder, Zeitpunkte, IP-Adressen der Geräte und des Servers, der den Bot betreibt.

## 3. Wer die Chats sehen kann

- **Privater Chat mit dem Bot:** die Person mit diesem Telegram-Konto, auf allen ihren Geräten.
- **Gruppe:** alle aktuellen Mitglieder – und je nach Gruppeneinstellung auch den Verlauf von
  **vor** ihrem Beitritt („Chatverlauf für neue Mitglieder sichtbar“).
- **Telegram selbst:** Bot-Chats und normale Gruppen sind **keine** Ende-zu-Ende-verschlüsselten
  „geheimen Chats“. Telegram speichert sie auf eigenen Servern.
- **Wer den Bot-Token hat,** kann als Bot Nachrichten senden und neue Updates abrufen.

## 4. Was in Gruppen zusätzlich zu beachten ist

- Nur Personen aufnehmen, die die Meldungen für ihre Arbeit brauchen (z. B. Service-Chat für
  Reservierungen, Küchen-Chat für Bestellungen – dafür gibt es „zwei Chats mit einem Bot“).
- Gruppe **privat** halten, keinen öffentlichen Einladungslink, „Verlauf für neue Mitglieder“
  ausschalten.
- Jedes Mitglied kann die Knöpfe drücken (Bestätigen, Absagen, Ablehnen). Wer das nicht darf,
  gehört nicht in die Gruppe.
- Beim Bot bei @BotFather: `/setprivacy` → **Enable** (Bot sieht nur Befehle, nicht die übrigen
  Gespräche der Gruppe), `/setjoingroups` → **Disable**, sobald die Gruppen verbunden sind.
- Private Handys: Nachrichten erscheinen auf dem Sperrbildschirm. Vorschau im Telegram-Konto
  ggf. ausschalten.

## 5. Welche Bot- und Chat-IDs gespeichert werden

In `data/betrieb/<slug>.json` (nicht im Git, Dateirechte 0600):

| Feld | Inhalt |
|---|---|
| `telegramChatId` | Chat-ID des gemeinsamen Chats (Modus „ein Chat“, wie bisher) |
| `telegramKanaele.<art>.links.<bot>` | Chat-ID je Kanal und Bot, Zeitpunkt der Verknüpfung |
| `telegramKanaele.<art>.code`, `telegramV2.code` | offener Einmal-Code (30 Minuten) |
| `telegramBenachrichtigung` | Einstellungen (Zeiten, Fristen, Modus) |
| `telegramZustand` | letzter Erfolg / letzter Fehler beim Versand |
| `telegram` je Vorgang | Versandstand (Zeitpunkte, Versuche, Fehlertext, Ziel-Bot) |

Private Chat-IDs sind bei Telegram die **Nutzer-ID** der Person. Chat-IDs werden beim Wechsel des
Modus nicht gelöscht, erst mit „Verbindung trennen“ oder `/abmelden`. Tokens stehen **nie** in
diesen Dateien, nur in der Umgebung; Sperrdateien (`data/betrieb/.telegram-sperren/`) enthalten nur
PID und einen Kurz-Hash des Tokens.

## 6. Ausgeschiedene Mitarbeiter entfernen

1. In Telegram: Person aus der Gruppe **entfernen** (Gruppeninfo → Mitglied → Entfernen).
   Bereits empfangene Nachrichten bleiben auf ihren Geräten – das lässt sich nicht zurückholen.
2. War es ein **privater** Chat einer Person: im Wirt-Dashboard (Reiter „Telegram“) den Kanal
   **trennen** und mit einer anderen Person neu verbinden.
3. Hatte die Person Admin-Rechte in der Gruppe oder Zugriff auf den Bot-Token: Rechte entziehen,
   Token rotieren (Abschnitt 7).
4. Bei Zweifel, wer alles mitliest: neue Gruppe anlegen, neu verbinden, alte Gruppe trennen.

## 7. Bot-Tokens schützen und rotieren

- Tokens nur als Secret des Hosts bzw. in der `.env` auf dem Rechner (nie im Git – der
  Repo-Hygiene-Test sucht danach), nie in Screenshots, Chats oder Tickets.
- Wer den Token hat, kann Nachrichten an alle verbundenen Chats schicken und neue Updates lesen.
- **Rotieren:** bei @BotFather `/revoke` (bzw. `/token`) → neuen Token in die Secrets eintragen →
  Dienst neu starten. Chat-Verknüpfungen bleiben gültig (sie hängen am Bot, nicht am Token).
- Jeder Bot hat seinen eigenen Token; zwei gleiche Tokens werden nicht als zwei Bots behandelt.
- Rotieren mindestens: wenn jemand mit Zugriff ausscheidet, bei Verdacht auf Weitergabe, nach
  einem Sicherheitsvorfall.

## 8. Was in die Datenschutzerklärungen gehört

**Datenschutzerklärung des Restaurants** (gegenüber Gästen), soweit Telegram genutzt wird:

- dass Eingangs- und Statusmeldungen zu Reservierungen/Bestellungen intern über Telegram an das
  Team gehen, mit den Angaben aus Abschnitt 2;
- Empfänger: Telegram (Anbieter und Sitz laut aktueller Telegram-Datenschutzerklärung),
  Drittlandbezug und die gewählte Grundlage dafür;
- Rechtsgrundlage (z. B. Durchführung der Reservierung/Bestellung, berechtigtes Interesse an
  schneller Bearbeitung – fachlich festzulegen);
- Speicherdauer in Telegram (wie lange die Chats aufbewahrt bzw. gelöscht werden);
- dass Gäste Telegram nicht nutzen müssen.

**Datenschutzerklärung / Unterlagen des Bot-Betreibers** (Agentur oder Restaurant, je nachdem,
wer den Bot und den Server betreibt):

- Rolle gegenüber dem Restaurant (eigener Verantwortlicher oder Auftragsverarbeiter mit AVV);
- welche Daten der Server an Telegram übermittelt (Abschnitt 2) und welche IDs er speichert
  (Abschnitt 5);
- Protokolle: Der Dienst schreibt Ergebnisse von Befehlen/Knöpfen (Aktion, Betrieb, Vorgangs-ID)
  auf die Konsole – keine Gastdaten; Aufbewahrung beim Host klären;
- Löschung: Chat-IDs beim Trennen, Vorgangsdaten nach den Fristen des Betriebs (siehe Befund
  O-01 in `SECURITY-AUDIT.md` – es gibt noch keine automatische Löschung).

## 9. Fachlich zu prüfen (offen)

- **Rolle von Telegram:** Ist Telegram für den Betrieb ein Auftragsverarbeiter (Telegram bietet
  dafür keinen üblichen AVV an), ein eigener Verantwortlicher oder schlicht ein
  Kommunikationsdienst des Teams? Davon hängt ab, was vertraglich nötig ist.
- **Drittland:** Sitz des Anbieters und Serverstandorte laut aktueller Telegram-Angaben; gibt es
  einen Angemessenheitsbeschluss oder geeignete Garantien? Reicht die Datenminimierung als
  Maßnahme, oder ist Telegram für personenbezogene Vorgangsdaten gar nicht zu verwenden?
- **Personenbezug der Kurzmeldungen:** Reicht „RES-1234, Sa 19:00, 4 Personen“ als
  Pseudonymisierung, oder ist es im Einzelfall identifizierend?
- **Beschäftigtendatenschutz:** private Handys und Telegram-Konten von Mitarbeitern; Weisung zur
  Nutzung; Ruhezeiten (deshalb Zeitfenster statt rund um die Uhr als Standard).
- **Informationspflichten** gegenüber Gästen (Abschnitt 8) und Eintrag im Verzeichnis der
  Verarbeitungstätigkeiten.
- **Löschfristen** in Telegram-Chats (manuell bzw. automatische Löschung in Telegram einstellen).
- **Web-Push** (nicht Teil dieser Änderung) enthält weiterhin Gastnamen – Befund O-13 bleibt für
  Web-Push offen.
