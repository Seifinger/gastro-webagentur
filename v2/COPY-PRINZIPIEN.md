# Copy-Prinzipien v2

Texte auf einer Restaurant-Seite klingen nach einem Menschen, wenn sie **Dinge** nennen
(Teig, Ofen, Uhrzeit, Straße) und nach einer Maschine, wenn sie **Gefühle behaupten**
(unvergesslich, einzigartig, mit Liebe). Diese Datei ist die Grundlage von
`v2/build/copyRefiner.js`: Jede Regel dort hat hier ihre Begründung.

Jeder sichtbare Text einer v2-Seite läuft vor dem Build durch den Refiner
(`texte.js` → `copyRefiner.js` → `siteBuilder.js`). Eine Seite mit einem verbleibenden
Verstoß der Stufe **Fehler** wird nicht gebaut (Gate `copy`). **Hinweise** stehen im
Build-Bericht und im Dashboard, blockieren aber nicht.

## 1. Typische KI-Muster (deutsch) – und was stattdessen

| Muster | Beispiel | Warum es nach KI klingt | Refiner | Stattdessen |
|---|---|---|---|---|
| Begrüßungsformel | „Willkommen bei Trattoria Rossi!“ | Jede generierte Seite beginnt so; kein Wirt sagt das auf einem Schild. | Fehler – Satz entfällt | Direkt mit der Sache beginnen: „Holzofenpizza seit 1998.“ |
| Eintauchen / Entdecken / Erleben | „Tauchen Sie ein in die Welt Italiens“, „Entdecken Sie unsere Karte“ | Imperativ-Werbesprech ohne Information. | Fehler – Satz entfällt bzw. „Entdecken Sie unsere Karte“ → „Unsere Karte“ | Sagen, was es gibt. |
| Verwöhn-Formeln | „Lassen Sie sich verwöhnen“ | Leere Einladung. | Fehler – Satz entfällt | – |
| Reise-/Erlebnis-Metaphern | „kulinarische Reise“, „Geschmackserlebnis“, „Gaumenschmaus“, „Geschmacksexplosion“, „Herzstück“, „Oase“ | Abstrakte Nomen statt Essen. | Fehler – ersetzt durch Karte / Aroma / Teller / Würze / Zentrum | Das Gericht beim Namen nennen. |
| Superlativ-Adjektive | unvergesslich, einzigartig, exquisit, erlesen, himmlisch, atemberaubend, unwiderstehlich, perfekt | Unbelegbar – und jede Konkurrenz behauptet dasselbe. | Fehler – Adjektiv entfällt | Zahl, Herkunft, Zeit: „48 Stunden Teigruhe“. |
| „authentisch“ | „authentische italienische Küche“ | Das häufigste Füllwort der Gastro-Werbung. | Fehler – entfällt | Herkunft konkret: „Rezepte aus Kalabrien“. |
| „mit Liebe zubereitet“ | „mit viel Liebe gekocht“ | Behauptete Emotion. | Fehler – „von Hand zubereitet“ | Handgriff nennen. |
| „nicht nur …, sondern auch …“ | „nicht nur Pizza, sondern auch Pasta“ | Typische Satzschablone generierter Texte. | Fehler – „Pizza und Pasta“ | Aufzählen. |
| Adjektivketten aus drei Allgemeinplätzen | „bodenständig, ehrlich und frisch“ | Drei Adjektive, null Information – die klassische Dreierfigur. | Fehler – nur das letzte bleibt | Ein Adjektiv mit Beleg. |
| Klischees der Küche | „Dolce Vita“, „wie am Meer“, „mediterrane Gastfreundschaft“, „gemütliche Stunden“ | Postkarte statt Haus. | Fehler – entfällt bzw. durch den ersten konkreten Punkt des Hauses ersetzt | – |
| Geviertstrich „—“ | „Pasta — frisch“ | Englische Typografie; im Deutschen steht der Halbgeviertstrich mit Leerzeichen. | Fehler – „ – “ | – |
| Ausrufezeichen-Häufung | „Bestellen Sie jetzt! Wir freuen uns!“ | Lautstärke statt Inhalt. | Fehler – ab dem zweiten „!“ je Seite wird es ein Punkt | Höchstens eins je Seite. |
| Füll-Intensivierer | absolut, wirklich, ganz besonders | Verstärken, was nicht da ist. | Fehler – entfällt | – |
| Unbelegter Superlativ | „die beste Pizza der Stadt“ | Rechtlich heikel (§ 5 UWG), inhaltlich leer. | Hinweis | Auszeichnung mit Quelle oder weglassen. |
| „Egal ob … oder …“ | „Egal ob Mittag oder Abend“ | Schablone. | Hinweis | „Mittags und abends“. |
| „Ihr Partner für …“ | „Ihr Restaurant für besondere Anlässe“ | Agentursprache. | Hinweis | – |
| Duzen | „Komm vorbei“ | Unser Sprachkanon ist „Sie“ (siehe Designsysteme). | Hinweis | Sie-Form. |
| Englische Füllwörter | „Food Lover“, „Vibes“, „Experience“ | Passt nicht zu einem Wirtshaus in Mühldorf. | Hinweis | Deutsch. |

## 2. Was ein guter Satz enthält

1. **Eine Sache**: ein Gericht, ein Werkzeug, eine Uhrzeit, einen Ort.
2. **Einen Beleg**: eine Zahl („12 Stunden“), eine Herkunft („vom Metzger im Ort“), einen Vorgang („von Hand gefaltet“).
3. **Die Anrede „Sie“**, kurze Sätze (Abendhaus 6–14 Wörter, sonst 8–18), Zahlen als Ziffern, Zeiten im 24-Stunden-Format.

Das Wortfeld je Küche steht im Sprachkanon jedes Designsystems (`v2/designsysteme/*.md`, Abschnitt „Sprache“).

## 3. Optionaler zweiter Durchgang mit einem Sprachmodell

Regeln können streichen und ersetzen, aber nicht umformulieren. Für Texte, bei denen der
Refiner etwas gefunden hat, kann ein Sprachmodell einen Gegenvorschlag machen
(`V2_COPY_LLM=1` plus `ANTHROPIC_API_KEY`). Leitplanken:

- Es bekommt **nur die betroffenen Textstücke**, den Sprachkanon und diese Verbotsliste.
- Es darf **keine neuen Fakten** erfinden (keine Jahreszahlen, Auszeichnungen, Herkünfte).
- Seine Ausgabe läuft **danach noch einmal durch alle Regeln** – das Modell ist Zulieferer, nicht Schiedsrichter.
- Ergebnisse werden je Seite zwischengespeichert (`v2/output/copy/<slug>.json`); derselbe Text wird nicht zweimal bezahlt.
- Ohne Schlüssel läuft alles regelbasiert weiter.

Die Schnittstelle ist austauschbar (`SPRACHMODELLE` in `copyRefiner.js`): ein Objekt mit
`name`, `verfuegbar()` und `umschreiben()`.
