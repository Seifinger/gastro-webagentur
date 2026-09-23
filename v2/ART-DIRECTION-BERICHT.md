# Art-Direction-Runde – Abschlussbericht

Stand 23.09.2026, Branch `claude/v2-art-direction-quality-eblbj0` (baut auf
`claude/gastro-v2-pipeline-01hf58` auf, Stage 8). Ziel: Jede Kundenseite bekommt eine eigene,
nachvollziehbare Idee aus dem Betrieb – statt Küche × Stimmung + Seed-Hero.

## Was geliefert ist

| Lieferung | Wo |
|---|---|
| Ehrlicher visueller Audit mit Screenshots und Zählungen | [`ART-DIRECTION-AUDIT.md`](ART-DIRECTION-AUDIT.md), [`art-direction/vorher/`](art-direction/vorher/) |
| 4 visuell unterschiedliche Pilotseiten | `output/piloten/<slug>/index.html` (`npm run v2:pilot`) |
| Desktop-, Tablet- und Mobil-Screenshots + kritische Zustände | [`art-direction/piloten/<slug>/`](art-direction/piloten/) |
| Je ein Restaurant-Briefing und eine Creative Direction | `briefings/*.json`, `creative-direction/*.json/.md`, lesbar in `art-direction/piloten/<slug>/briefing.md` + `creative-direction.md` |
| Bildplan je Seite inkl. abgelehnter Medien | `art-direction/piloten/<slug>/bildplan.md` |
| Vorher/Nachher-Kritik | [`art-direction/VORHER-NACHHER.md`](art-direction/VORHER-NACHHER.md) |
| Review je Pilot (3 Runden, subjektiv getrennt von messbar) | `art-direction/piloten/<slug>/review.md` + `automatisch.md` + `review.json` |
| Dashboard: Briefing + Creative Direction ansehen/bearbeiten | `/v2/creative` im Agentur-Dashboard (`npm run dashboard`) |

## Neue Bausteine

| Phase | Datei | Kurz |
|---|---|---|
| B | `briefing/briefing.js` | Briefing mit Status je Feld: bestätigt / übernommen / Vorschlag / unbekannt. `leiteBriefingAb()` übernimmt nur, was Lead und Dashboard wirklich enthalten. Nur Tatsachen stehen ungekennzeichnet auf der Seite, Vorschläge mit Marke „Entwurf“, Unbekanntes nie. |
| C | `creative/creativeDirection.js` | Leitidee, Wirkung, Metapher, Bildregeln, Typo-Rollen, Dramaturgie mit „warum“ je Position, 1–2 Signature-Details, Verzicht. Regelbasierter, reproduzierbarer Entwurf; bearbeitete Fassungen werden nie überschrieben. `belegPruefung()` verwirft Signaturen ohne Beleg im Briefing. |
| D | `build/komposition/*` | Seitenbau aus Briefing + CD: 5 Hero-Typen (Titelblatt, Noren, Aushang, Werkbank, Bild voll), 3 Signaturen (Tageskarte, Zettelwand, Wochenplan) + Hausschild, 4 Kartendarstellungen, Gewichtung groß/normal/klein, mobile Navigation, Aktionsleiste abhängig vom Hero. Alle v2-Gates gelten weiter (WCAG, Funktionsvertrag, Anti-Slop-Lint, Copy) + Beleg- und Entwurfs-Gate. |
| E | `assets-pipeline/bildplan.js`, `medien/stockKatalog.json` | Bildplan je Platz: Motiv, Rolle, Zuschnitt Desktop/Mobil, Fokuspunkt, Overlay, Alt-Text, Herkunft. Eigene Fotos mit Freigabe vor KI vor gesichtetem Stock; Stock muss das benannte Gericht zeigen; Haus-/Team-/Raumplätze nehmen nie Stock. `<picture>` mit eigenem Mobil-Ausschnitt oder -Motiv, feste Maße, priorisiertes Hero-Bild. |
| E6 | `briefing/chatIntake.js`, `npm run v2:briefing -- aus-chat …` | Text + Dateien aus dem Chat → Briefing-Entwurf, Slot-Zuordnung, Rückfragen nur bei Mehrdeutigkeit, Qualität oder ungeklärten Rechten. |
| F | `build/komposition/texte.js` | Claim aus belegtem USP, CTA nach Register der CD, keine Gästestimmen ohne Freigabe, keine Häkchen-Leiste, Öffnungszeiten nur als Tatsache, Beispiel-/Entwurfsleiste + `noindex` bis zur Freigabe. |
| G/H | `judge/screenshotReview.js`, `npm run v2:art-review` | Desktop/Tablet/Mobil, Zustände (mobile Navigation, Formularfehler, Reservierung bestätigt, Warenkorb, Bestellung bestätigt), automatische Prüfungen (fehlende Assets, Überläufe, abgeschnittene Bedienelemente, Kontrast, Tastaturfokus, Touch-Ziele, Skriptfehler, CLS), Labor-LCP/CLS/INP-Näherung. |
| – | `build/tauschprobe.js`, `npm run v2:tauschprobe` | Gestaltung von A mit Name, Karte und Fotos von B – misst, was von A's Konzept nicht mehr getragen wird. |

## Die vier Piloten

| Pilot | Leitidee | Hero | Dramaturgie | Briefing (bestätigt/übern./Vorschl./unbek.) | Bilder genutzt / abgelehnt |
|---|---|---|---|---|---|
| Trattoria Da Nonna Lucia | Die Seite ist die Karte auf dem Tisch – mit eingelegter Tageskarte | Titelblatt | Tageskarte → Reservierung → Karte → Haus → Kontakt | 22 / 1 / 1 / 6 | 2 / 0 |
| Izakaya Kurenai | Durch den Vorhang an den Tresen – Zettel für Zettel | Noren | Zettelwand → Hausregeln → Gruppen-Reservierung → Karte → Kontakt | 22 / 1 / 1 / 6 | 2 / 1 |
| Gasthaus Zur Alten Linde | Nur was stimmt, gesetzt wie der Schriftzug über der Tür | Aushang | Kontakt → Musterkarte → Anfrage → Offene Punkte | 0 / 6 / 3 / 21 | 0 / 2 |
| Rösterei Kornfeld | Kaffee zuerst, mit Datum: der Wochenplan an der Tür | Werkbank | Wochenplan → Karte → Haus → Abholung → Gruppen → Kontakt | 21 / 1 / 1 / 7 | 1 / 2 |

Drei Piloten sind **frei erfundene Beispielbetriebe** mit reichem Briefing („bestätigt“ heißt dort:
innerhalb der Fiktion festgelegt); der vierte simuliert einen echten Lead mit nur Google-Daten. Alle
Gerichte und Preise stammen aus dem bestehenden Küchenkatalog – nichts wurde neu erfunden. Jede Seite
trägt „Beispielseite … frei erfunden“ und `noindex`.

## Testergebnisse

- `npm test`: **521 / 521 grün** (vorher 501; neu: `test/v2-artdirection.test.js` mit 19 Tests,
  `test/v2-artdirection-e2e.test.js` mit 1 E2E-Test).
- **E2E (echter Browser):** Trattoria mobil – Menü → Reservierung → Bestätigung „Anfrage eingegangen“;
  Rösterei Desktop – Cappuccino in den Warenkorb → Abholbestellung; beide stehen im Wirt-Dashboard
  (`/api/betrieb`), beide lösen Telegram-Nachrichten mit Knöpfen aus (API gemockt), Bestätigen per
  Telegram setzt die Reservierung auf „bestätigt“. Der bestehende v2-E2E-Test läuft unverändert.
- **Screenshot-Review Runde 3:** 0 automatische Fehler und 0 Warnungen auf allen vier Seiten, alle
  9 Zustände je Seite erfolgreich (Details in `automatisch.md` je Pilot).
- **Tauschprobe:** Trattoria, Izakaya und Rösterei verlieren in allen 9 Kombinationen mit fremden
  Inhalten ihre Signatur; die meisten Bildplätze bleiben leer, weil fremde Fotos das verlangte Motiv
  nicht zeigen. Die Wirtshaus-Seite (dünnes Briefing) ist absichtlich neutral und besteht die Probe nur
  schwach.
- Übrige npm-Skripte: `dashboard`, `wirt` starten wie vorher; `pages` meldet wie vorher „keine
  passenden Leads“ (keine Lead-Daten in dieser Umgebung); `preview` verlangt wie vorher `--only`.

### Core Web Vitals – nur Laborwerte

| Seite | LCP Desktop | LCP Mobil* | CLS Desktop | CLS Mobil | INP-Näherung |
|---|---|---|---|---|---|
| Trattoria | 104 ms | 236 ms | 0 | 0,047 | 16–24 ms |
| Izakaya | 220 ms | 576 ms | 0 | 0 | 16 ms |
| Wirtshaus | 88 ms | 84 ms | 0 | 0,001 | 16–24 ms |
| Rösterei | 216 ms | 728 ms | 0 | 0,047 | 24 ms |

\* Mobil gedrosselt (Slow 4G, 4× CPU). Alle Werte stammen aus **einem** Headless-Lauf mit lokal
geladener Seite und Schriften; Bilder kommen von images.unsplash.com. Sie liegen unter den
Orientierungswerten (LCP ≤ 2,5 s, CLS ≤ 0,1, INP ≤ 200 ms), sind aber **keine Felddaten** – über echte
Nutzer sagen sie nichts. Die INP-Näherung ist ein einzelner Klick auf „vormerken“, kein INP.

## Verbliebene Einschränkungen

1. **Keine eigenen Fotos.** Alle Bilder sind gesichtete Stockfotos mit Kennzeichnung. Die Seiten sind
   dadurch bewusst bildarm; das wichtigste nächste Material sind echte Fotos (je Pilot im Bildplan
   benannt: Lucia am Pastabrett, voller Tresen, Röstmaschine).
2. **Stock-Katalog ist klein.** 22 von Hand gesichtete Motive. Ungesichtete Stockfotos werden nie
   verwendet („nicht gesichtet“). Für den Rollout muss der Katalog wachsen – oder eigene Fotos kommen.
3. **Signaturen sind noch wenige.** Tageskarte, Zettelwand, Wochenplan, Hausschild. Für andere Häuser
   braucht es neue, jeweils an Briefing-Belege gebundene Details – nicht die vier überall.
4. **Creative Direction der Piloten ist von Hand geschärft** (`bearbeitet: true`). Der regelbasierte
   Entwurf liefert Struktur und Begründungen, aber keine gute Leitidee in einem Satz; die bleibt
   Arbeit der Art-Direction im Dashboard.
5. **Kleiner CLS-Anteil (0,047)** durch die per Skript eingesetzte Statuszeile im Café und
   Schrift-Tausch; unter 0,1, aber vermeidbar.
6. **Chat-Aufnahme ist regelbasiert.** Sie erkennt Schlüsselwörter und Dateinamen, keine Bildinhalte.
   Ein Foto ohne sprechenden Namen erzeugt eine Rückfrage statt einer Vermutung.
7. **Datumsfeld im Test-Chromium im US-Format** – Folge der Browser-Oberflächensprache, nicht der
   Seite (siehe Audit, korrigiert).
8. **Veröffentlichung:** Komponierte Seiten werden (wie v2) nicht nach `docs/` veröffentlicht; das
   bleibt eine Entscheidung je Kunde.

## Empfehlung: Was auf alle Küchen ausgerollt werden sollte

**Sofort, für alle Seiten (auch v1/v2-Standard):**
1. **Bildplan mit Eignungsprüfung** – kein Tellerfoto mehr, das ein anderes Gericht zeigt, kein
   Stockfoto als „Unser Haus“/„Team“, keine Foto-Anweisungen als Bildunterschrift. Das beseitigt die
   auffälligsten Glaubwürdigkeitsfehler aller 36 Seiten.
2. **Mobile Navigation** und **Aktionsleiste, die an die Hero-Knöpfe gekoppelt ist** – technischer
   Mangel aller bisherigen v2-Seiten.
3. **Briefing-Status als Pflicht vor jedem Kundentermin:** `npm run v2:briefing -- ableiten …`. Schon
   das dünne Briefing verhindert erfundene Geschichten, USPs, Stimmen und Öffnungszeiten.
4. **Screenshot-Review mit Zuständen** zusätzlich zum Judge (`npm run v2:art-review`).

**Pro Kunde, nicht pauschal:**
5. **Creative Direction + Komposition** für jeden Lead, der ein echtes Gespräch hatte. Die
   Signature-Details nur dort, wo das Briefing sie belegt – nicht als Standardkomponente.
6. Neue Signaturen entstehen aus echten Briefings (z. B. Mittagstisch-Aushang, Biergarten-Wetterlage,
   Saisonkarte) und werden erst dann ins System aufgenommen.

**Nicht ausrollen:** die Pilot-CDs selbst oder ihre Texte auf andere Häuser derselben Küche – genau
das würde wieder eine Template-Lotterie erzeugen.

## Entscheidungen

Alle autonomen Entscheidungen dieser Runde stehen in [`ENTSCHEIDUNGSLOG.md`](ENTSCHEIDUNGSLOG.md)
unter „Art-Direction-Runde“ (AD1–AD12).
