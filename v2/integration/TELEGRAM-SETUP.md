# Telegram-Bot für Wirte – Einrichtung

Der Bot ist ein **zusätzlicher, optionaler Alarm- und Aktionskanal** neben dem Wirt-Dashboard.
Maßgeblich bleibt das geschützte Dashboard: Jede Reservierung und Bestellung steht dort,
auch wenn Telegram gerade nichts sendet. Gäste brauchen kein Telegram.

Datenschutz, Gruppen, Tokens, offene Rechtsfragen: [`TELEGRAM-DATENSCHUTZ.md`](TELEGRAM-DATENSCHUTZ.md).

## Was der Bot schickt

| Anlass | Inhalt (nur das) | Knöpfe |
|---|---|---|
| Neue Reservierung | Betrieb, Referenz (RES-…), Datum, Uhrzeit, Personenzahl, Status | **Bestätigen** · **Absagen** |
| Neue Bestellung | Betrieb, Bestellnummer (AB-…), gewünschte Abholzeit, Status | **In Zubereitung** · **Ablehnen** → **Bereit** → **Abgeholt** |
| Nachmeldung nach einer Pause | wie oben, mit „eingegangen um …“ – ab 4 Vorgängen eine Sammelmeldung „X Reservierungen / Y Bestellungen sind noch offen“ | **Einzeln anzeigen** |
| Erinnerung (einmal je Vorgang) | wie oben, „noch nicht bestätigt“ | wie oben |
| Stornierung durch den Gast | Bestellnummer, Abholzeit, Status | – |
| Tagesübersicht | Uhrzeit, Personenzahl, Referenz je Reservierung; Nummern laufender Bestellungen | – |

Nie in Telegram: Namen, Telefonnummern, E-Mail-Adressen, Wünsche/Hinweise (Allergien),
Bestellpositionen, Summen, No-Show-Zustimmungen, Rechnungen, Status-Links oder Tokens.
Auch `/heute`, `/offen` und die nach einem Knopfdruck bearbeitete Nachricht halten sich daran.
Muss der Gast angerufen werden, steht dort nur „bitte anrufen (Nummer im Wirt-Dashboard)“.

## Wann der Bot schickt

**Standard:** jedes Öffnungsintervall des Betriebs **plus 30 Minuten davor und danach**.

| Öffnungszeiten | Telegram-Zeiten |
|---|---|
| 17:30–22:00 | 17:00–22:30 |
| 11:00–14:00 und 17:30–22:00 | 10:30–14:30 und 17:00–22:30 (dazwischen Ruhe) |
| Fr 18:00–02:00 | Fr 17:30 bis Sa 02:30 |
| Ruhetag | keine – außer eine Ausnahme sagt etwas anderes |

- Grundlage sind die **eigenen Öffnungszeiten des Betriebs** (`oeffnungszeiten` in
  `data/betrieb/<slug>.json`, kommen aus dem Kundenprojekt, `npm run kunde -- bauen …`) und
  die **Ausnahmen** (`oeffnungsAusnahmen`, z. B. „24.12. | geschlossen“, „28.09.2026 | 12:00–15:00“).
  Gerechnet wird in der Zeitzone des Betriebs (Standard Europe/Berlin), inklusive Sommer-/Winterzeit.
- Feiertage kennt das System nicht automatisch – bitte als Ausnahme mit Datum eintragen.
- **Ohne eigene Öffnungszeiten** rechnet der Bot nichts vor: Er sendet dann **keine automatischen
  Nachrichten**, das Dashboard zeigt eine rote Warnung, `/heute` und `/offen` sagen es auch.
  Die Platzhalter-Zeiten der Seite gelten dafür nicht.
- **Rund um die Uhr** gibt es nur, wenn der Wirt es im Dashboard ausdrücklich wählt.
- Außerhalb der Zeiten wird nichts gesendet. Was dann eingeht, wird gespeichert, steht im Dashboard
  und wird im **nächsten Zeitfenster nachgemeldet**, falls es dann noch offen ist.
- Antworten auf Befehle und Knöpfe sowie die Testnachricht aus dem Dashboard kommen immer – sie hat
  der Wirt selbst ausgelöst.

### Erinnerung

- Ist ein Vorgang nach der Frist (Standard **2 Minuten**, einstellbar 1–60, je Art getrennt) noch
  unbestätigt, kommt **genau eine** Erinnerung.
- Die Frist beginnt, sobald Telegram den Vorgang gemeldet hat – sofort oder nachgemeldet.
- Fällt die Frist in eine Pause, kommt die Erinnerung genau einmal im nächsten Zeitfenster.
- Bestätigt, abgelehnt oder storniert (Dashboard oder Telegram) → keine Erinnerung.
- Die Frist ist eine interne Erinnerung. Gäste bekommen keine Zusage über eine Reaktionszeit.

Der Stand steht dauerhaft am Vorgang (Feld `telegram`). Nach einem Neustart findet der Dienst
alles Fällige wieder; nichts wird doppelt geschickt. Scheitert Telegram, versucht der Dienst es
bis zu dreimal (nach 1 und 5 Minuten), danach steht „fehlgeschlagen“ im Dashboard. Die Anfrage des
Gastes bleibt davon immer unberührt.

## 1. Bot anlegen (BotFather)

1. In Telegram **@BotFather** öffnen, `/newbot` senden, Namen und Benutzernamen vergeben
   (z. B. `MeinLokalBot`).
2. BotFather schickt den **Token** (`123456:ABC…`). Nur in die `.env` bzw. die Secrets des Hosts:

   ```
   TELEGRAM_BOT_TOKEN=123456:ABC…
   TELEGRAM_BOT_NAME=MeinLokalBot     # optional: macht aus dem Code einen Direktlink
   ```

3. Bei BotFather `/setcommands` mit:

   ```
   heute - Überblick für heute
   offen - alles, was auf eine Entscheidung wartet
   abmelden - diesen Chat vom Betrieb trennen
   hilfe - Übersicht der Befehle
   ```

4. Für Gruppen: bei BotFather `/setprivacy` → **Enable** lassen (der Bot sieht dann nur Befehle,
   keine anderen Nachrichten der Gruppe). `/setjoingroups` nach dem Verbinden auf **Disable**,
   damit niemand den Bot in fremde Gruppen holt.

### Optional: zwei eigene Bots

Für „zwei eigene Bots“ zwei weitere Bots anlegen (z. B. `MeinLokalReservierungBot`,
`MeinLokalBestellBot`) und eintragen – jeder mit **eigenem** Token:

```
TELEGRAM_BOT_TOKEN_RESERVIERUNG=…
TELEGRAM_BOT_NAME_RESERVIERUNG=MeinLokalReservierungBot
TELEGRAM_BOT_TOKEN_BESTELLUNG=…
TELEGRAM_BOT_NAME_BESTELLUNG=MeinLokalBestellBot
```

Ohne diese Zeilen (oder mit doppeltem Token) bleibt der Modus im Dashboard gesperrt.
**Empfohlen ist „zwei Chats mit einem Bot“** – das braucht keinen weiteren Token.

## 2. Dienst starten

Der Bot braucht **keinen öffentlichen Webhook**. Er fragt Telegram per Long Polling ab und
läuft deshalb auch auf dem Rechner im Lokal hinter dem Router.

- Zusammen mit dem Wirt-Dashboard (empfohlen, ein Prozess je Betrieb):

  ```
  npm run v2:wirt -- --betrieb <slug> --telegram
  ```

- Als eigener Dienst für alle Betriebe auf einem Server:

  ```
  npm run v2:telegram
  ```

  Dann den Wirt-Server ohne `--telegram` starten.

Der Dienst ruft **je Bot-Token genau einmal** ab (bei zwei eigenen Bots also drei Abrufe) und
arbeitet alle 30 Sekunden Nachmeldungen, Erinnerungen und die Tagesübersicht ab. Sperrdateien in
`data/betrieb/.telegram-sperren/` verhindern einen zweiten Abruf desselben Tokens und einen
zweiten Planer für denselben Betrieb – auch über Prozessgrenzen. Bleibt nach einem Absturz eine
Sperre liegen, wird sie übernommen, sobald der alte Prozess nicht mehr läuft.

Die sofortige Meldung eines neuen Vorgangs verschickt der Wirt-Server selbst, direkt nach der
Anfrage des Gastes. **Nachmelden und Erinnern macht nur der Dienst** – ohne `--telegram` bzw.
`npm run v2:telegram` gibt es beides nicht.

## 3. Einstellungen im Wirt-Dashboard (Reiter „Telegram“)

Je Betrieb:

- Telegram-Benachrichtigungen an/aus
- nur Reservierungen, nur Bestellungen oder beides
- Chat-Modus: **ein Chat für alles** (bisher) · **zwei Chats mit einem Bot** (empfohlen) ·
  **zwei eigene Bots** (nur wenn eingerichtet)
- Vorlauf vor Öffnung und Nachlauf nach Schließung (Standard je 30 Minuten, 0–180)
- „Rund um die Uhr“ (nur auf ausdrücklichen Wunsch, mit Rückfrage)
- Erinnerung an unbestätigte Reservierungen / Bestellungen an/aus, Frist je Art (Standard 2 Minuten)
- Tagesübersicht an/aus und Uhrzeit (kommt frühestens mit dem ersten Zeitfenster des Tages)

Der Reiter zeigt die berechneten Zeiten („Heute kommen Telegram-Nachrichten von 17:00 bis 22:30.“,
bei geteilten Zeiten beide Fenster), die nächsten sieben Tage, Warnungen (fehlende Öffnungszeiten,
unlesbare Ausnahmen, fehlender Token) und Zustellprobleme. Am einzelnen Vorgang steht, ob und wann
Telegram gemeldet und erinnert hat.

## 4. Chats verbinden

Je Kanal im Reiter „Telegram“: **Code erzeugen** → im gewünschten Chat `/start CODE` senden
(mit `TELEGRAM_BOT_NAME` auch per Direktlink). Codes gelten 30 Minuten und einmal.

| Modus | Code | verbindet |
|---|---|---|
| ein Chat | `ABC234` | den gemeinsamen Chat (Feld `telegramChatId`, wie bisher) |
| zwei Chats / zwei Bots | `R-ABC234` | den Reservierungs-Chat |
| zwei Chats / zwei Bots | `B-ABC234` | den Bestell-Chat |

- Ein Reservierungs-Code gilt nur für den Reservierungs-Kanal und nur beim zuständigen Bot.
  Ein Chat kann nicht gleichzeitig Reservierungs- und Bestell-Chat desselben Bots sein.
- **Bisherigen Chat übernehmen**: macht den bisherigen gemeinsamen Chat ohne neuen Code zum
  Reservierungs- oder Bestell-Chat (nur mit dem Haupt-Bot).
- **Testnachricht senden**, **Verbindung trennen** je Kanal. `/abmelden` im Chat trennt ebenfalls.
- Nachrichten gehen **nur** an den im gewählten Modus verbundenen Chat. Ist er nicht verbunden,
  geht nichts raus – es gibt keinen Umweg über einen anderen Chat.
- Nach fünf falschen Codes in 15 Minuten nimmt ein Chat keine Codes mehr an.

Tipp für zwei Chats: zwei Telegram-Gruppen anlegen (z. B. „Reservierungen“ und „Küche“), den Bot
in beide holen und in jeder Gruppe ihren Code senden.

## 5. Migration bestehender Betriebe

- Es gibt keine schreibende Migration. Ohne neue Felder gelten die Standardwerte: aktiv,
  beides, **ein Chat** (der bisherige `telegramChatId`), Zeitfenster nach Öffnungszeiten,
  30/30 Minuten, Erinnerung nach 2 Minuten.
- Bisherige Chat-IDs werden nie gelöscht – auch nicht beim Wechsel des Modus. Zurück auf
  „ein Chat“ gilt der alte Chat sofort wieder.
- Vorgänge von vor dem Update bekommen keine Erinnerungen (kein Schwall nach dem Start).
- **Betriebe ohne eigene Öffnungszeiten bekommen nach dem Update keine automatischen Meldungen
  mehr**, bis Öffnungszeiten hinterlegt sind oder „rund um die Uhr“ gewählt ist. Vor dem Update
  im Reiter „Telegram“ prüfen (rote Warnung) oder in `data/betrieb/*.json` nach `oeffnungszeiten`
  sehen.
- v1 (`npm run wirt`): Der Text-Rückkanal nutzt dieselben Zeiten und dieselbe Datensparsamkeit,
  sendet nur im Modus „ein Chat“ und meldet nichts nach.

## 6. Prüfen ohne echten Versand

`npm test` – Telegram ist in allen Tests ein Mock:

- `test/telegramZeitfenster.test.js` – Zeitfenster, Mitternacht, Ausnahmen, Zeitumstellung
- `test/telegramBenachrichtigung.test.js` – sofortige Meldung, Erinnerung, Nachmelden, Neustart,
  zwei Chats, zwei Bots, ein Abruf je Token, Datensparsamkeit, Demo-Modus
- `test/v2-integration.test.js`, `test/v2-e2e.test.js`, `test/v2-artdirection-e2e.test.js` –
  Formular → Dashboard → Telegram-Knopf

Ein echter Bot-Test braucht eigene Test-Chats und Tokens (siehe Abschnitt 1): Dienst starten,
im Reiter „Telegram“ verbinden, **Testnachricht senden**, dann eine Testreservierung anlegen.
