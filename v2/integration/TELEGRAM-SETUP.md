# Telegram-Bot für Wirte – Einrichtung

Der Bot ist ein **zusätzlicher, optionaler Kanal** neben dem Wirt-Dashboard. Er meldet
neue Reservierungen, neue Abholbestellungen und Stornierungen durch Gäste. Der Wirt kann
direkt in Telegram antworten:

| Ereignis | Nachricht | Knöpfe |
|---|---|---|
| Neue Reservierung | Personen, Datum, Uhrzeit, Name, Telefon, Wunsch | **Bestätigen** · **Absagen** |
| Neue Bestellung | Positionen, Summe, gewünschte Abholzeit, No-Show-Zustimmung | **In Zubereitung** · **Ablehnen** → **Bereit** → **Abgeholt** |
| Stornierung durch Gast | Bestellung mit Vermerk „Storniert“ | – |
| Tagesübersicht (morgens) | Reservierungen des Tages, Gäste gesamt, offene Bestellungen | – |

Betriebe ohne verknüpften Chat merken davon nichts: Alles läuft wie bisher über das
Dashboard. Das Dashboard zeigt dann „Nicht verbunden – das Dashboard funktioniert trotzdem
wie gewohnt.“

## 1. Bot anlegen (einmal für die ganze Agentur)

1. In Telegram **@BotFather** öffnen, `/newbot` senden, Namen und Benutzernamen vergeben
   (z. B. `MeinLokalBot`).
2. BotFather schickt den **Token** (`123456:ABC…`). In die `.env` eintragen:

   ```
   TELEGRAM_BOT_TOKEN=123456:ABC…
   TELEGRAM_BOT_NAME=MeinLokalBot     # optional: macht aus dem Code einen Direktlink
   ```

3. Optional bei BotFather `/setcommands` mit:

   ```
   heute - Reservierungen und Bestellungen von heute
   offen - alles, was auf eine Entscheidung wartet
   abmelden - diesen Chat vom Betrieb trennen
   hilfe - Übersicht der Befehle
   ```

Ein Token reicht für alle Betriebe. Welcher Chat zu welchem Betrieb gehört, steht in der
Datei des Betriebs (`data/betrieb/<slug>.json`, Feld `telegramChatId`).

## 2. Dienst starten

Der Bot braucht **keinen öffentlichen Webhook**. Er fragt Telegram per Long Polling ab und
läuft deshalb auch auf dem Rechner im Lokal hinter dem Router.

- Zusammen mit dem Wirt-Dashboard (empfohlen bei einem Betrieb):

  ```
  npm run v2:wirt -- --betrieb <slug> --telegram
  ```

- Als eigener Dienst für alle Betriebe (empfohlen bei mehreren Betrieben auf einem Server):

  ```
  npm run v2:telegram
  ```

  Dann den Wirt-Server ohne `--telegram` starten (`npm run v2:wirt -- --betrieb <slug>`).
  Pro Token darf nur **ein** Prozess Updates abholen. Laufen zwei, meldet Telegram
  „Conflict: terminated by other getUpdates request“.

Die Pushes (neue Reservierung/Bestellung) verschickt immer der Wirt-Server selbst, direkt
nach der Anfrage des Gastes. Der Dienst beantwortet nur Knöpfe und Befehle und verschickt
die Tagesübersicht.

## 3. Chat mit dem Betrieb verbinden (macht der Wirt selbst)

1. Wirt-Dashboard öffnen (`npm run v2:wirt …`) → Bereich **Telegram** →
   **„Verbindungs-Code erzeugen“**.
2. Das Dashboard zeigt einen 6-stelligen Code (30 Minuten gültig, nur einmal nutzbar).
3. Im Bot `/start CODE` senden. Mit `TELEGRAM_BOT_NAME` reicht auch der Link
   `https://t.me/<BotName>?start=<CODE>`.
4. Der Bot antwortet „Verbunden mit ‚<slug>‘“. Ab jetzt kommen die Nachrichten.

Trennen geht über **„Trennen“** im Dashboard oder `/abmelden` im Bot. Gruppen funktionieren
genauso: Bot in die Gruppe holen, dort `/start CODE` senden, dann bekommt z. B. das
ganze Küchenteam die Bestellungen.

Die Chat-ID landet im bestehenden Feld `telegramChatId`, das auch v1 nutzt. Eine manuell
eingetragene Chat-ID aus v1 funktioniert deshalb ohne neuen Code weiter.

## 4. Tagesübersicht

Standard: jeden Tag um **09:00** Uhr (Serverzeit), einmal pro Tag und Betrieb. Umstellen:

```
curl -X POST http://localhost:3200/v2/intern/telegram/tagesuebersicht \
  -d '{"aktiv": true, "uhrzeit": "10:30"}'
```

`"aktiv": false` schaltet sie ab. `/heute` liefert die Übersicht jederzeit auf Abruf.

## 5. Was mit den Daten passiert

- Neue Felder im Betrieb sind **optional**: `telegramV2` (Code, Ablauf, Verknüpfungsdatum,
  Tagesübersicht) und `v2Design`, je Bestellung `kuechenStatus`. Es gibt keine
  Migration. Bestehende Dateien werden erst geändert, wenn der Wirt eine dieser Funktionen
  benutzt.
- Der Küchenstatus bleibt mit v1 konsistent: „In Zubereitung“ bestätigt die Bestellung mit
  der gewünschten Abholzeit (v1 `bestaetigt`), „Abgeholt“ setzt v1 `abgeholt` (inkl.
  Zeitpunkt fürs Wartezeit-Lernen), „Ablehnen“ setzt v1 `abgelehnt`. „Bereit“ gibt es nur
  in v2 (`kuechenStatus: "bereit"`).
- Knöpfe wirken nur im verknüpften Chat. Ein fremder Chat bekommt „Dieser Chat ist mit
  keinem Betrieb verbunden“ und ändert nichts.
- Mit gesetztem Token ersetzt der v2-Wirt-Server den reinen Text-Rückkanal aus v1
  (`telegramNotify.js`) durch die Nachricht mit Knöpfen, sonst käme alles doppelt. Der
  v1-Wirt-Server (`npm run wirt`) verhält sich unverändert.
- Ein fehlgeschlagener Versand (Telegram nicht erreichbar, Token falsch) lässt die Anfrage
  des Gastes nie scheitern.

## 6. Prüfen ohne echten Versand

`test/v2-integration.test.js` und `test/v2-e2e.test.js` laufen mit einem gemockten
`telegramApiHook` (`npm test`). Der E2E-Test reserviert über das Formular einer
gebauten v2-Seite und prüft dann Dashboard, Telegram-Nachricht und Bestätigung per Knopf.
