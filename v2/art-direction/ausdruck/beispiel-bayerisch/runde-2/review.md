# Runde 2 – Atmosphäre (AP5) und Abfolge `gesellig` (AP6), `beispiel-bayerisch`

Gebaut wie Runde 1 (offline, neutraler Bühnen-Platzhalter). In dieser Umgebung sind Unsplash-Fotos
gesperrt: Gerichte und das Haus-Band zeigen deshalb Platzhalter bzw. kein Bild. Online kämen die
gekennzeichneten Beispielbilder dazu.

Zusätzlich zur Scroll-Sequenz: `*--mit-bewegung--<abschnitt>.jpg` (Atmosphäre ist bei reduzierter
Bewegung und in den ganzseitigen Aufnahmen absichtlich aus).

## Was neu ist

| Abschnitt | Vorher (v2-Standard) | Jetzt (`gesellig`) |
|---|---|---|
| Einladung | zentrierter Block | links Haus (Rubrik, Name, ein Satz), rechts „Besuch“ nur mit echten Angaben: Adresse, Route, Google-Note, zwei Wege |
| Empfehlungen | „Was unsere Gäste am liebsten bestellen“ + Kartenraster + Häkchen-Ablauf | „Was hier auf den Tisch kommt“: Collage aus drei ungleich großen Tellern, versetzt; jeder vorbestellbar |
| Karte | unverändert | unverändert (Mobil-Feinschliff folgt in AP7) |
| Haus | Text + drei „Foto folgt“-Kästen | Raum-Band: breites Bild, der Text schiebt sich versetzt darüber; ohne echtes Bild nur der Text |
| Gästestimmen | Platzhalter-Kästen | entfallen (Verzicht des Ausdrucks: keine erfundenen Stimmen) |
| Reservierung | mit Häkchen-Liste | ohne Häkchen-Liste |
| Atmosphäre | – | gezeichnetes Lindenblatt, Deckkraft 0,08, hinter dem Inhalt; erscheint bei Einladung, Tisch und Haus, verschwindet hinter den Flächen von Karte und Reservierung |

## Gemessen

- Scroll-Sequenz wie Runde 1 (Kopfzeile, Slogan, Menü, reduzierte Bewegung, ohne JS): unverändert gut, keine Skriptfehler.
- Atmosphäre (`body.atmo-an`): an bei Einladung, Tisch und Haus; aus bei der Reservierung. Das gilt auf Desktop und Mobil.
- Funktion im Browser (Mobil): „Vorbestellen“ aus der Collage legt das Gericht in den Warenkorb (1 Position, 19,50 €). Die Reservierung zeigt „Vorschau – nichts gesendet“.
- Funktionsvertrag, Anti-Slop-Lint und Snapshot sind bestanden. Seiten ohne Ausdruck sind unverändert.

## In der Runde korrigiert

1. Das Haus-Band streckte den kleinen SVG-Platzhalter zu einer leeren Fläche. Jetzt gilt: nur ein echtes Foto,
   auf Beispielseiten auch ein gekennzeichnetes Beispielbild, sonst nur Text (Plan F.2).
2. Der Offline-Platzhalter zeigte interne Kennungen („gericht:1-5“). Jetzt steht dort neutral „Foto folgt“.

## Kritik

**Trägt:**
- Die Einladung wirkt wie der Eingang eines Hauses, nicht wie ein Hero-Duplikat.
- „Besuch“ ist das erste Element, das eindeutig nur für dieses Haus stimmt.
- Die Collage bricht das Kartenraster.
- Das Blatt verbindet die hellen Abschnitte, ohne sich aufzudrängen.
- Weniger ist mehr: Häkchen, erfundene Stimmen und Foto-Aufgabenlisten sind weg.

**Noch offen:**
- **Karte:** lange Liste mit viel Leerraum links (Desktop). Auf Mobil fehlt die Sprungleiste der Kategorien. → AP7.
- **Kontakt:** „Musterstraße“ als Überschrift ist schwach, die Öffnungszeiten stehen als Platzhalter. → AP8.
- **Mobil:** Die Wortmarke bricht zweizeilig, neben „Reservieren“ in der Kopfzeile. Das ist lesbar, aber eng.
  Ein kürzerer Kurzname („Alte Linde“) wäre eine Dashboard-Option, keine Automatik.
- **Bildwirkung:** Collage und Haus-Band leben von echten Fotos. Erst mit P4–P7 (J.3) lässt sich
  beurteilen, ob die Größenverhältnisse stimmen.
