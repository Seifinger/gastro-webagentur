# Runde 1 – erster Bildschirm (AP3), `beispiel-bayerisch` / `gesellig`

Gebaut mit `npm run v2:build -- --demo beispiel-bayerisch --ausdruck gesellig --ziel v2/output/piloten-ausdruck --offline`,
geprüft mit `node v2/build/scrollSequenz.js --seite v2/output/piloten-ausdruck/beispiel-bayerisch/index.html --runde 1`.

**Medium:** neutraler Platzhalter, wie freigegeben (Grundton der Stimmung, warmer Lichtschein,
senkrechte Täfelung), auf der Bühne als „Platzhalter“ gekennzeichnet. Fotos und Video (J.3) fehlen
noch. Über Bildwirkung sagt diese Runde deshalb nichts; sie prüft Mechanik, Typografie und Rangfolge.

## Gemessen (`sequenz.json`)

| | 0 % | 25 % | 50 % | 75 % | 100 % Bühnenhöhe |
|---|---|---|---|---|---|
| Kopfzeile Desktop / Mobil | über Bühne | über Bühne | über Bühne | über Bühne | fest (Fläche) |
| Slogan-Deckkraft Desktop / Mobil | 1 / 1 | 0,17 / 0,16 | 0 / 0 | 0 / 0 | 0 / 0 |

- Reduzierte Bewegung: Slogan bleibt bei 1, kein Übergang, kein Video.
- Ohne JavaScript: Die Kopfzeile ist fest (Fläche, lesbar), das Menü öffnet über `:target`, alles ist sichtbar.
- Mobiles Menü: Es öffnet, der Fokus springt auf den ersten Link, Esc schließt, der Fokus kehrt zum Knopf zurück.
- Keine Skriptfehler, keine horizontale Scrollleiste. Funktionsvertrag und Anti-Slop-Lint sind bestanden.
- Kontrast mit Nachweis gegen reines Weiß unter dem Schleier: Kopfzeile 4,54:1, Slogan 3,01:1.

## In der Runde korrigiert

1. Menü: Die Knöpfe übernahmen die helle Schrift der Kopfzeile über der Bühne (unlesbar). Jetzt gilt der Knopfstil.
2. Menü: Der Fokus sprang nicht hinein, weil die Sichtbarkeit verzögert umschaltete. Jetzt schaltet sie beim Öffnen sofort um.
3. Slogan: Bei 25 % lief er halb sichtbar durch die Navigation. Jetzt verblasst er über 30 % statt 50 % der Bühne
   und bleibt hinter der Seite zurück (halbe Geschwindigkeit). Er erreicht die Kopfzeile nicht mehr sichtbar.
4. Aktionsleiste unten: Sie stellte „Bestellen“ vorn hin, die Kopfzeile „Reservieren“. Jetzt folgt sie der Hauptaktion des Ausdrucks.
5. Einladung: Der Name stand gleich groß wie der Slogan, beide konkurrierten. Er ist jetzt eine Stufe kleiner (h1).

## Kritik – was trägt, was noch nach Vorlage aussieht

**Trägt:**
- Eine ruhige Kopfzeile mit wenigen Zielen.
- Die Wortmarke bleibt in allen Zuständen gleich präsent.
- Ein kurzer Slogan statt Headline, Claim und Häkchen.
- Die Bühne endet bei 75 %; die Einladung ist auf Desktop angeschnitten und lädt zum Scrollen ein.
- Die Häkchen-Leiste ist weg.

**Noch generisch (für AP5/AP6, nicht jetzt):**
- Die Einladung ist ein zentrierter Standardblock (Rubrik, Name, Claim, Sterne, zwei Knöpfe).
- „Frisch aus der Region – in der Musterstraße …“ ist Katalogtext.
- Unter der Einladung beginnt sofort wieder die alte Sektionsfolge („Was unsere Gäste am liebsten bestellen“).
- Das Mobil-Menü ist nur eine Liste; ein kleiner Block mit Adresse und Öffnungszeiten würde es zum Haus machen.

**Offen, braucht Medien:** Ob Schleier-Stärke und Slogan-Größe über einem echten Wirtshausbild richtig
wirken, zeigt erst P1/P3. Der Schleier ist gegen den schlimmsten Fall (reines Weiß) bemessen; bei einem
dunklen Innenraumbild könnte er leichter sein. Das entscheiden wir am echten Bild, nicht jetzt.
