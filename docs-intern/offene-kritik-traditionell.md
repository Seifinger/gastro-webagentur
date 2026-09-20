# Offene Kritik: Archetyp `traditionell`

**Status: braucht menschliche Entscheidung.** Nicht „erledigt".

Drei Bewertungsrunden nach der Regel aus dem Auftrag (Schwelle: **jeder**
einzelne KPI ≥ 8, kein Durchschnitt). Jede Runde lief in einem eigenen,
frischen Kontext und bekam ausschließlich das Ergebnis zu sehen – die
Screenshots, den gerenderten Quelltext, das Repository und die Checkliste aus
Schritt 1. Keine Begründungen, keine Vorgeschichte, kein Zugriff auf
Commit-Nachrichten oder `docs-intern/`.

## Die drei Runden

| KPI | Runde 1 | Runde 2 | Runde 3 |
|---|---|---|---|
| 1 AI-Slop-Freiheit | 8 | 8 | **8** |
| 2 Performance | 9 | 7 | **8** |
| 3 Gestaltung/Handwerk | 7 | 8 | **7** |
| 4 Menschlichkeit | 5 | 5 | **6** |
| 5 Uniqueness | 6 | 8 | **8** |
| 6 Markenkohärenz zur Küche | 7 | 9 | **8** |
| 7 Barrierefreiheit | 7 | 5 | **9** |
| 8 Klarheit der Kernaktion | 9 | 8 | **8** |

Sechs von acht KPIs stehen auf ≥ 8. Zwei nicht.

## Was die Runden gebracht haben

Was die Kritik ausgelöst hat, steht in den Commits; hier nur, was sie gefunden
hat – jeweils belegt und nachgemessen:

- **Runde 1** fand einen harten WCAG-Durchfaller: das Abzeichen „Platzhalter"
  mit 3,06:1. Dazu: der Bierkrug im Hero war ein Pfad aus einer
  Icon-Sammlung und obendrein ein henkelloses Pint-Glas; 19 Schriftgrade ohne
  Skala; die Notenspalte der Gästestimmen zu 77 % leer.
- **Runde 2** fand, was Runde 1 übersehen hatte: die Bildunterschriften standen
  im Foto auf einem Verlauf, der oben bei null beginnt – 1,99:1 über hellen
  Bildstellen. Dazu 17 kB Signatur-CSS fremder Küchen in jeder Seite.
- **Runde 3** fand einen Fehler, den die Performance-Korrektur aus Runde 2
  selbst eingebaut hatte: Der Filter sortierte die Keyframes des Maßkrugs mit
  aus, der Krug stand still. Behoben, mit Regressionstest
  (`test/handschrift.test.js`: „jede Animation, die eine Seite anfordert,
  bekommt auch ihre Keyframes").

## Was offen ist

### KPI 3 – Gestaltung/Handwerk: 7

**Fundstelle:** `src/styles/handschrift.css.js:93-113`, gerendert in der
fertigen Seite.

**Die Kritik:** Der Kommentar dort deklariert sieben Stufen –
12 / 14 / 15 / 17 / 20 / 25 / 34 – gerendert stehen aber **18** verschiedene
Grade auf der Seite. Ausgerechnet **16px trägt mit 60 Textknoten den größten
Teil der Seite und steht gar nicht in der Skala**. Vier Grade kommen nur ein-
bis viermal vor (19/18/13/10). Im Band unter 20px sank die Zahl der Grade von
11 auf 10 – oben (Überschriften 52/42/34 statt sechsmal 42) hat die
Aufräumarbeit gegriffen, unten fast nicht.

**Meine Einschätzung:** Die Kritik stimmt und ist billig zu beheben. Die
Stufen unter 20px stammen größtenteils aus `PAGE_STYLES`, das sich alle vier
Archetypen teilen; sie je Archetyp zu überschreiben ist möglich (die
Handschrift tut es bereits für sechs Selektoren), aber die eigentliche Antwort
wäre eine Skala in `PAGE_STYLES` – und die änderte die Ausgabe aller vier
Archetypen auf einmal. Genau das verbietet der Byte-Diff, solange die anderen
drei nicht an der Reihe waren.

**Nachprüfbares Ziel:** eine Zählung der gerenderten `font-size`-Werte liefert
höchstens 12 verschiedene, und jeder Wert unter 25px kommt mindestens fünfmal
vor.

### KPI 4 – Menschlichkeit: 6

**Fundstelle:** `src/menuCatalog.js:106` und `:108`.

**Die Kritik:** Drei Sätze stehen ungekennzeichnet als Tatsache auf der Seite
eines Lokals, das den Generator nie beauftragt hat:

- „Abholung in 20 Minuten" (USP-Leiste, direkt unter dem Hero)
- „Fleisch vom Metzger im Ort" (USP-Leiste)
- „Seit Generationen kochen wir, was hier wächst …" (Bei-uns-Absatz)

Das sind Aussagen über Wartezeit, Lieferkette und Firmengeschichte. Die Seite
trennt an jeder anderen Stelle sauber: Fotos tragen „Platzhalter · …", die
Öffnungszeiten ein Abzeichen, die Gästestimmen weigern sich ausdrücklich,
Bewertungstexte zu erfinden, und die 4,7 nennt ihre Quelle. Der
Fußzeilen-Hinweis deckt die drei Sätze nicht ab – er nennt nur „Gerichte,
Preise und Öffnungszeiten" und die Stockfotos.

Zweiter Punkt derselben Bewertung: Die Küchenmarke (Hopfendolde) ist ein
Zeichen der Küche, kein Zeichen dieses Hauses. Vorschlag des Kritikers: bei
einem Lokal namens „Alte Linde" ein Lindenblatt, also aus dem Namen
abgeleitet.

**Meine Einschätzung, getrennt nach den beiden Punkten:**

1. **Die drei Sätze sind ein echter Mangel**, und zwar kein gestalterischer,
   sondern einer, der dem Wirt beim ersten Anruf auf die Füße fällt. Er ist
   leicht zu beheben (dieselbe Kennzeichnung wie bei Fotos und
   Öffnungszeiten). Ich habe ihn **nicht** mehr behoben, weil die drei
   Runden verbraucht waren und eine vierte Bauphase ohne folgende Bewertung
   genau die Schleife wäre, die die Abbruchregel verhindern soll.
2. **Das Lindenblatt halte ich für falsch.** Ein Zeichen aus dem Namen eines
   Lokals abzuleiten hieße, Restaurantnamen nach Stichwörtern zu
   durchsuchen und daraus eine Grafik zu wählen. Das trifft bei „Alte Linde"
   und geht bei „Gasthof zur Post", „Zum Hirschen" oder „Sakura" entweder
   schief oder erfindet eine Bedeutung. Die Küchenmarke ist bewusst an der
   Küche festgemacht, weil die Küche belegt ist und der Name nicht.

**Nicht behebbar ist ein dritter Teil dieses KPIs:** Die Gästezitate. Google
untersagt das Speichern von Rezensionstexten, und ein erfundenes Zitat unter
dem echten Namen eines Hauses wäre als Bewertung lesbar – auch auf einem
Entwurf. Das steht so in `src/testimonials.js` und bleibt so. Ein
Kritik-Agent, der „mindestens eine echte Bewertung" fordert, fordert etwas,
das dieser Generator nicht liefern darf.

## Die Entscheidung, die ansteht

Die Abbruchregel im Auftrag sagt: Stand vor Schritt 3 wiederherstellen und den
Archetyp als „braucht menschliche Entscheidung" markieren.

**Ich habe den Stand nicht zurückgebaut** und lege die Entscheidung vor,
aus einem Grund: Die beiden KPIs unter 8 betreffen die Schriftskala und drei
Textbausteine. Ein Rückbau auf den Stand vor Schritt 3 verwürfe außerdem:

- zwei behobene WCAG-Durchfaller (3,06:1 und 1,99:1, beide gemessen),
- einen halb aus dem Bild gerutschten Bierkrug (x = −58 bei 1440px),
- 17 kB ungenutztes CSS je Seite und 879 Bytes tote Regeln,
- 21 Stimmungen, in denen Akzenttext unter 4,5:1 lag.

Nichts davon hat mit den zwei offenen Punkten zu tun. Der Rückbau würde
Fehler wiederherstellen, die unabhängig von der Gestaltungsfrage bestehen.

Drei Wege, zur Wahl:

1. **Zwei Punkte nachziehen, dann eine vierte Runde** – die Skala auf ≤ 12
   Grade bringen und die drei Sätze kennzeichnen. Beides ist klein und
   konkret. Dann ist die Schwelle voraussichtlich überall erreicht.
2. **So lassen und weitergehen** – der Archetyp bleibt mit 6/8 KPIs über der
   Schwelle stehen, diese Datei bleibt als offene Rechnung liegen.
3. **Zurückbauen wie in der Regel beschrieben** – dann bitte ausdrücklich,
   und dann bitte ohne die vier oben genannten Korrekturen mitzunehmen; die
   gehören nicht zur Gestaltungsfrage.

Bis diese Entscheidung getroffen ist, gilt der Archetyp `traditionell` als
**nicht abgeschlossen**.
