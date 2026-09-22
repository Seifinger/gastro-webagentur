# Design-Memory: Referenzbibliothek gegen AI-Slop

Diese Datei ist **Inspiration, keine Vorgabe**. Anders als die vier Dateien
unter `design-tokens/` (die verbindliche Leitplanke je Archetyp) sammelt sie
Muster aus echten, sorgfältig gestalteten Marken – als Kalibrierung dafür,
wie eine *bewusste* Entscheidung aussieht, bevor man sich beim Bauen eines
neuen Archetyps oder einer neuen Stimmung wieder in Richtung Vorlage treiben
lässt.

**Wie das hier benutzt wird:** Nichts davon wird kopiert. Wer sich für ein
neues Archetyp/eine neue Stimmung inspirieren lässt, schreibt trotzdem
eigene, projektpassende Werte in die jeweilige `design-tokens/<archetyp>.md`
– mit echten Hex-Werten aus `stimmungen.js`, echten Kontrastmessungen, und
geprüft gegen die sieben gemeinsamen Verbote aus `README.md`. Diese Datei
beantwortet nur die Frage „wie sieht eine begründete Entscheidung aus, die
keine ist wie die anderen 47?" – nicht „was soll ich einsetzen?"

**Quellen:** ein von Julian mitgebrachtes Beispiel (`Hungry Tiger`, siehe
unten) und zwölf weitere über `styles.refero.design` (API:
`/api/styles/search?q=restaurant`, Einzelabruf `/api/styles/<id>`, Feld
`fullResult.designSystem`) am 2026-09-22 abgerufene Marken aus Gastronomie
und angrenzenden Feldern. Es sind reale, gebaute Marken – keine generierten
Beispiele.

---

## 1. Die Anatomie eines Briefs, der nicht generisch ist

Jedes der dreizehn Beispiele unten folgt derselben Form. Das ist selbst die
wichtigste Erkenntnis: **Ein Design-Brief, der Slop verhindert, hat immer
diese sieben Teile** – fehlt einer, wird der Rest beliebig.

1. **Ein Nordstern-Satz.** Ein einziger Satz, oft mit einem konkreten Ort/einer
   konkreten Lichtstimmung („moody brasserie under candlelight", „rust-tinted
   coastal morning", „torn zine pages taped to a fridge"). Kein Adjektiv wie
   „modern" oder „elegant" – ein Bild, das man sich vorstellen kann und an
   dem sich jede Einzelentscheidung mitten in der Arbeit zurückprüfen lässt.
2. **Farbe mit Rolle, nicht mit Nummer.** Jede Farbe trägt einen Namen, der
   selbst etwas Konkretes sagt (`Corten`, `Aubergine Ink`, `Tomo Red`), dazu
   *wo genau* sie steht – nie „primary/secondary/accent", sondern „füllt den
   Hero, umrandet die Knopf-Pille, färbt sonst nichts". Mehrfach steht dabei
   explizit: „*do not promote to primary CTA*" – eine Farbe kann in der
   Palette stehen und trotzdem für eine bestimmte Rolle verboten sein.
3. **Ein Radius-Grundsatz, kein Radius-Defaultwert.** Nie „manche Ecken
   rund, manche eckig, je nach Element" – immer eine Systementscheidung:
   entweder komplett scharf (0px, teils explizit „non-negotiable") oder
   komplett voll gerundet (9999px), quer durch Karten, Knöpfe, Bilder,
   Badges. Gemischt kommt vor, aber dann als *eine* benannte Ausnahme
   (Monte: Karten 6px, alles Interaktive 9999px), nie beliebig.
4. **Eine Elevation-Philosophie, in Worten.** Fast durchgehend: „kein
   Schatten, nirgends" – Tiefe entsteht aus dem Wechsel der Flächenfarbe
   (Fläche → nächste Fläche → tiefste Fläche) oder aus einer Haarlinie, nie
   aus `box-shadow`. Wenn doch ein Schatten vorkommt (Roberta's: ein harter
   4px-Versatz, keine Weichzeichnung), ist er explizit als *die eine*
   erlaubte Form benannt, nicht als „ein bisschen Tiefe hier und da".
5. **Eine Schriftpaarung mit begründeter Arbeitsteilung.** Nie zwei
   Schriften nebeneinander, weil beide gut aussehen – eine trägt die
   *Stimme* (Display, oft ungewöhnlich groß oder ungewöhnlich leicht), die
   andere trägt die *Struktur* (Navigation, Preis, Datum, oft ein Mono oder
   ein eng-laufender Kondensierter). Tracking ist dabei kein Detail, sondern
   Signatur: positives Tracking auf Großbuchstaben liest sich wie gestempelt,
   negatives auf großer Displaygröße wie eingepresst – und mehrfach steht
   explizit, in welche Richtung es *nicht* gehen darf.
6. **Dos und Don'ts als Verbote mit Begründung, nicht als Empfehlung.**
   „Don't introduce a second chromatic accent" statt „weniger ist mehr".
   Jedes Verbot nennt, *warum* – meist, weil genau das die eine Entscheidung
   wäre, die das System wieder generisch macht.
7. **Bildregie als Teil der Marke, nicht als Lückenfüller.** Nie „schönes
   Essen-Foto" – eine benannte Lichtstimmung, ein benannter Bildausschnitt,
   und oft ein explizites Verbot generischer Food-Fotografie („no soft-focus
   food photography", „no lifestyle staging").

Das deckt sich mit dieser Codebasis fast 1:1: `design-tokens/<archetyp>.md`
hat bereits Punkt 2 (Farbtabellen mit Rolle), 4 (Verbotene-Muster-Abschnitt)
und 6. Was in den Referenzen öfter vorkommt und hier noch dünner ist: ein
harter **Radius-Grundsatz pro Archetyp** (bisher variiert der Radius vor
allem nach Küche, nicht nach Archetyp) und ein **ausformulierter
Nordstern-Satz** an prominenter Stelle in jeder Tokendatei.

---

## 2. Wiederkehrende Muster, die diese Systeme unverwechselbar machen

Über alle dreizehn Beispiele hinweg – konkret, nicht als Stilempfehlung
gemeint, sondern als das, was tatsächlich in den Briefs steht:

- **Der Hero-Kontrast-Fehler dieses Projekts (Text in Akzentfarbe direkt auf
  einem Foto) kommt in keinem der dreizehn Beispiele vor.** Wo Text auf
  einem Foto steht, ist er durchgehend Weiß/Creme oder liegt auf einer
  Fläche, nie in der Markenakzentfarbe direkt auf dem Bild. Das bestätigt,
  was die Bewertungsschleife für `abend` unabhängig gemessen hat.
- **Ein Akzent, der nicht wandert.** Fast jede Palette hat *eine* chromatische
  Farbe (Limóns Zitronengelb, Redbricks Scharlachrot, Monos Zinnoberrot) –
  der Rest ist eine warme oder kühle Neutraltonleiter. Der Akzent steht dabei
  oft nur an 2–3 Stellen im gesamten Bildschirm (Amrit Palace: „no more than
  2-3 times per fold"), nie als Wiederholung über die ganze Seite.
- **Haarlinie statt Karte.** Die Standardtrennung ist ein 1px-Rahmen in einer
  Farbe knapp neben der Textfarbe (nicht Schwarz, nicht Systemgrau) – nicht
  Fläche-mit-Schatten. Das deckt sich mit dem, was in diesem Projekt bei
  `traditionell` und `abend` schon umgesetzt ist.
- **Monospace/Kondensiert für Zahlen und Struktur.** Preis, Datum,
  Navigationslabel, Öffnungszeit laufen in einer strukturellen Schrift
  (oft Mono, oft mit fester Ziffernbreite) – die Displayschrift bleibt der
  Überschrift vorbehalten. Übertragbar: `.hours-row`, `.gericht-preis`
  könnten in künftigen Archetypen eine eigene, strukturelle Schriftrolle
  bekommen statt der Fließtextschrift.
- **Großbuchstaben + Tracking statt Farbe für „das ist ein Label".** Wo
  dieses Projekt bisher `.eyebrow` über Farbe absetzt, setzen mehrere
  Referenzen das über Großschreibung und Sperrung bei gleichbleibender
  Textfarbe ab – ein zweiter Weg, Hierarchie zu zeigen, ohne die Palette zu
  erweitern.
- **Hierarchie aus Gewicht statt aus mehr Schriftgrößen.** Intra hält eine
  einzige Displaygröße (95px) und lässt *nur* Kontext und Fläche die
  Hierarchie tragen – ein Extrem, aber ein lehrreiches: Die Anzahl der
  Schriftgrade in einer Skala ist keine Qualitätsfrage per se, die
  *Begründung* jeder Stufe ist es (siehe die Rollen-Tabelle, die inzwischen
  in `abend.md` steht).
- **Knopf-Philosophie ist eine System-Entscheidung.** Entweder komplett
  gefüllt/eine-Ausnahme (Roberta's: Rot nur für die eine wichtigste Aktion)
  oder komplett Kontur/Ghost (Bongusta, Monte, LUNKQ: „never fill the
  pill"/„actions are always outlined"). Nicht: mal so, mal so, je Sektion.

---

## 3. Dreizehn Referenzen

Kurzform je Marke: Nordstern, Palette (Auszug mit Rolle), Schrift, ein
Signaturelement, das schärfste Verbot. Keine der Zahlen ist für dieses
Projekt verbindlich – sie zeigen nur, wie eng eine Rolle formuliert sein
kann.

### Hungry Tiger — eathungrytiger.com (dunkel, mitgebracht von Julian)
> Turmeric-bright graffiti on a tandoor wall.

Ein einziges Gold (`#faae33`) auf drei Stufen warmem Braun
(`#823513 → #402011 → #281006`), eine einzige Schrift (Salmond) von 11px bis
213px, Tracking invers zur Größe (−0,02em groß → +0,02em klein). Jeder
Knopf, jedes Badge, jedes Eingabefeld ist eine volle Pille (9999px) – Karten
allein bekommen 6px. Kein Schatten im ganzen System. Signatur: gepunktete
Goldlinie als Sektionstrenner statt Weißraum. Schärfstes Verbot: keine
zweite Displayschrift, „Salmond owns the entire type system".

### Limón — limonoslo.no (dunkel)
> moody brasserie under candlelight

Olivschwarz (`#1d0b0d`) als Grund, Waldgrün für Text, ein einziges
Zitronengelb (`#f7ea48`) nur als gefüllte Knopffläche – nie als Text auf
Gelb, nie verdünnt. Radius fast bei null (1px), mit einer bewussten
Ausnahme: der runde 40px-„nach oben"-Knopf. Schrift mit ungewöhnlich weitem
positivem Tracking, fast wie gestempelt. Schärfstes Verbot: enges oder
negatives Tracking auf Displaytext – „makes headlines generic".

### Amrit Palace — amritpalace.com (hell)
> spiced parchment gallery — a candlelit beige wall holding sparse saffron
> punctuation beneath breath-soft serif headlines

Pergament-Beige als einzige große Fläche, ein einziges Safran-Orange
(`#d49653`), das höchstens zwei- bis dreimal pro Bildschirm auftaucht.
Displayschrift durchgehend bei Schriftschnitt 300 – „never bold the serif
display face; the whisper weight IS the luxury". Scharfe Kanten überall
außer bei Knöpfen. Schärfstes Verbot: kein zweiter Akzent, „the saffron
orange stands alone".

### TOMO — tomoseattle.com (hell)
> torn zine pages taped to a fridge — flat, warm, and unapologetically
> analog

Cremeleinen als Grund, reines Schwarz als einzige Displayfarbe, ein einziges
Tomatenrot nur für Werbebanner und Stempeloptik – nie als Knopffläche.
Navigation als einzelne, „abgerissene" Zettel mit 1px-Rahmen statt als
Leiste. Keine Rundung irgendwo. Signatur: Bilder überlappen sich und den
Text wie auf einer Pinnwand, keine weichgezeichnete Food-Fotografie.
Schärfstes Verbot: „do not use #ff6347 as a button background … it belongs
on marquees and stamps only" – eine Farbe für zwei Rollen zu verwenden ist
hier ausdrücklich untersagt.

### Roberta's Pizza — robertaspizza.com (hell)
> Brooklyn pizza punk parlor — a checkered tablecloth lit by neon red
> signage, where every screen is a poster

Zwei Neutrale (Weiß, Kohle) plus ein einziges lautes Rot, reserviert für
genau eine Aktion pro Fläche – „never decorate with it". Überschriften bei
80–120px in einer kondensierten Posterschrift, Fließtext in einer
sperrigen, positiv getrackten Sans. Der einzige Schatten im ganzen Korpus
dieser Sammlung: ein harter 4px-Retro-Versatz, keine Weichzeichnung.
Schärfstes Verbot: eine vierte Farbe „breaks the poster logic".

### Intra — intracbr.com.au (hell)
> white-walled gallery placard with one giant black eye

Vier Farben insgesamt: Weiß, zwei Schwarztöne, ein Haarlinien-Grau – keine
Markenfarbe überhaupt, die Farbe kommt allein von der fotografierten
Verpackung. Eine einzige Displaygröße (95px), Hierarchie entsteht aus Fläche
und Kontext, nicht aus mehr Stufen. Schärfstes Verbot: kein chromatischer
Akzent für irgendeine Rolle, auch nicht für Links oder Badges.

### Monte — montecafe.com.au (hell)
> rust-tinted coastal morning

Genau zwei Flächen (Terrakotta, Sandstein), alles andere ist Neutral.
Knöpfe ausschließlich als Kontur-Pille, „never fill the pill – the border
carries the weight". Serifen-Versalien mit breitem Tracking als
wiederkehrende Eyebrow-Geste vor jeder Überschrift. Schärfstes Verbot: eine
dritte Flächenfarbe.

### Bongusta — bongusta.dk (hell)
> editorial linen closet behind museum glass

Ein warmes Beinahe-Schwarz (`Aubergine Ink #321929`) statt reinem Schwarz
als einzige chromatische Stimme im System – die „Farbe" ist nur eine
Temperaturverschiebung, kein Farbton. Durchgehend volle Pillenform für
Interaktives, durchgehend Haarlinie statt Fläche-mit-Schatten. Schärfstes
Verbot: kein gefüllter Knopf – „actions are always outlined or ghost".

### GRAZA — graza.co (hell)
> Mediterranean deli counter, sunlit and hand-set

Olivschwarz statt Systemschwarz für jeden Text und jeden Rahmen – „never use
pure black or a neutral gray. The olive undertone is non-negotiable."
Zwei knallige Grün-/Gelbtöne laufen ausschließlich als vollflächige
Sektionsbänder, nie als kleines UI-Element: „their job is to carry pages,
not decorate buttons." Schärfstes Verbot: die Displayschrift im Fließtext
zu verwenden – sie ist ab 46px reserviert.

### LUNCH — lunchconcept.com (gemischt hell/dunkel)
> velvet runway on warm parchment

Vier Farben insgesamt, eine davon (ein Lavendel) ausdrücklich nur für
Ankündigungsleiste, Fußzeile und den Zustand „Ausverkauft" – nirgends sonst.
Keine gefüllten Knöpfe im ganzen System: Interaktion ist ein Textlink mit
1px-Unterstreichung. Hierarchie kommt aus Schriftgewicht (400/700), bevor
zur Größe gegriffen wird. Schärfstes Verbot: die Lavendelfläche als
Knopf-Hintergrund zu verwenden.

### Fallen Grape — fallengrape.com (hell)
> Sun-drenched vineyard at golden hour. Warm cream paper, walnut ink,
> terracotta warmth — a wine label breathed into a full interface

Cremepapier und Walnussbraun als Grundpalette, ein warmes Terrakotta als
einziger Aktionsakzent. Eine Serife für Anzeige und Fließtext ab 20px, eine
schmale Großbuchstaben-Sans für alles Funktionale darunter. Durchgehend 1px
Haarlinie in Sattelbraun statt Schatten. Schärfstes Verbot: kühles Grau,
Blau oder reines Weiß im Hintergrund – „the entire palette is warm earth
tones".

### Redbrick Coffee — redbrick.coffee (hell)
> Scarlet ink editorial on butcher paper

Ein einziges Scharlachrot, das *nur* als Kontur/Link auftritt, nie als
gefüllter Knopf – „Redbrick's only action surface is the outlined
chromatic link". Displayschrift bei Schriftschnitt 300, Tracking nach
Größe fein gestuft (0,013em bei 15px bis 0,06em bei 10px-Labels).
Schärfstes Verbot: die Displayschrift fetter zu setzen – „increasing weight
destroys the brand".

### Little Amps — littleampscoffee.com (hell)
> vinyl record sleeve in afternoon sun … every label set in monospace

Kaffeebraun als Grundton statt Schwarz, ein warmes Brandorange als
Aktionsfarbe, dazu ein einziges kühles Staubblau als bewusster Kontrapunkt
(„the only blue in the system, it reads as a quiet companion"). Jedes
strukturelle Element – Navigation, Knopf, Datum, Preis – läuft in
Großbuchstaben-Monospace; die Displayserife bleibt allein der Überschrift.
Schärfstes Verbot: reines Schwarz, reines Weiß oder Blaugrau irgendwo im
System – „the palette is warm and coffee-toned throughout".

---

## 4. Wofür diese Sammlung in diesem Projekt nützlich wird

Nicht jetzt umzusetzen, aber der naheliegende nächste Ort, an dem sie
einspielt:

- **Ein Radius-Grundsatz pro Archetyp**, formuliert wie in Abschnitt 1.3,
  statt Radius vor allem küchenabhängig variieren zu lassen.
- **Ein Nordstern-Satz** oben in jeder `design-tokens/<archetyp>.md` –
  `traditionell.md`, `abend.md`, `hell.md`, `editorial.md` haben Paletten
  und Verbote, aber keinen einzigen Bildsatz, an dem sich eine Entscheidung
  mitten in der Arbeit zurückprüfen lässt.
- **Zukünftige Archetypen/Stimmungen**, die dieses Projekt noch nicht
  abdeckt: ein lautes Poster-Archetyp (Roberta's-artig: zwei Neutrale + ein
  Signalrot, ausschließlich für die eine Aktion), ein analoges
  Zine-/Collage-Archetyp (TOMO-artig: Bilder überlappen sich, Navigation als
  „angeklebte" Einzelelemente statt Leiste), ein stiller
  Monochrom-Luxus-Archetyp jenseits von `abend` (Bongusta/Intra-artig: Fast
  keine Farbe, Beinahe-Schwarz statt Schwarz, Hierarchie aus Fläche statt
  aus Farbe).
- **Strukturelle Typografie**: Preis, Öffnungszeit, Datum könnten in einem
  künftigen Archetyp eine eigene Mono-/Kondensiert-Rolle bekommen statt der
  Fließtextschrift – analog zu Little Amps und Redbrick.
