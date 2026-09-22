# Offene Kritik: Archetyp `abend`

Stand nach **drei Bewertungsdurchläufen** (Maximum laut Auftrag). Jeder
Durchlauf lief mit einem Kritik-Agenten in frischem Kontext, der nur das
Ergebnis gesehen hat – Screenshots, gerendertes HTML/CSS und die
Tokendatei –, nie die Begründungen oder die Historie.

## Die drei Durchläufe

| KPI | Runde 1 | Runde 2 | Runde 3 |
| --- | --- | --- | --- |
| AI-Slop-Freiheit | 7 | 8 | **9** |
| Performance | 8 | 9 | **8** |
| Gestaltung/Handwerk | 6 | 6 | **7** |
| Menschlichkeit | 6 | 8 | **8** |
| Uniqueness | 7 | 8 | **8** |
| Markenkohärenz | 7 | 8 | **9** |
| Barrierefreiheit | 8 | 9 | **6** |
| Klarheit der Kernaktion | 7 | 7 | **9** |

Die Schwelle lautet: **jeder einzelne KPI mindestens 8.** Nach drei
Durchläufen erreichen das sechs von acht.

## Was nach Runde 3 noch geändert wurde

Runde 3 hat zwei Mängel benannt. Beide sind nachträglich behoben und mit
eigener Messung geprüft – nicht mit einer vierten Bewertungsrunde, die das
Budget nicht hergibt.

**Barrierefreiheit (6/10) – ein echter WCAG-Verstoß.** Hero-Kicker und
Sternzeile standen in der Akzentfarbe direkt auf dem Herofoto. Eine eigene
Pixelmessung gegen den gerenderten Hintergrund bestätigte den Befund und
zeigte zugleich, dass er viel weiter reicht als die bewertete japanische
Fassung: Über alle zwölf Küchen lagen bei 390 px bis zu **100 %** der
Kickerfläche unter 4.5:1, im schlimmsten Fall bei **1.60:1** (café).

Eine hellere Akzentfarbe hilft nicht – cafés `#cd3b72` erreicht gegen jeden
dunkleren Grund rechnerisch nie 4.5:1. Über dem Foto steht der Text jetzt in
Weiß; das Gold fängt an, wo die Seite anfängt. Gemessen danach: alle zwölf
Küchen, 390 px und 1440 px, **kein einziges Pixel unter 4.5:1**,
schlechtester Einzelwert 5.01:1.

**Gestaltung (7/10) – drei Fundstellen.** Die Formularfelder fuhren als
einziger Bereich 16 px statt der Skala und stellten in einer Zeile ein 50 px
hohes Auswahlfeld neben ein 48 px hohes Textfeld: jetzt alle 17 px und
einheitlich 48 px hoch (gemessen). In der Highlights-Leseliste füllte der
Text nur 138 px einer 361 px hohen Zeile; das Leitbild ist jetzt ein breiter
2:1-Anschnitt statt eines Quadrats, womit der Leerraum auf 40 % der
Zeilenhöhe fällt und beide Spalten weiterhin gemeinsam abschließen
(Differenz 0 px).

Zusätzlich der Punkt, den Runde 3 in drei KPIs zugleich als „einzigen Rest
Werkzeugkasten-Optik" nannte, ohne ihn zum Mangel zu erklären: 17 Elemente
standen auf `border-radius: 999px`, während der Archetyp `--radius: 2px`
setzt. Knöpfe und Abzeichen tragen jetzt `--radius`; rund bleibt allein, was
rund gemeint ist.

## Was offen bleibt

1. **Keine vierte Bewertung.** Die Änderungen oben sind gemessen, aber nicht
   von einem unabhängigen Kritiker im Ergebnis beurteilt. Ob Barrierefreiheit
   und Gestaltung damit über 8 liegen, ist begründet zu erwarten, aber nicht
   belegt.

2. **Die Highlights-Anordnung bei genau drei Gerichten.** Runde 2 und Runde 3
   ziehen hier in entgegengesetzte Richtungen: Runde 2 bemängelte, dass die
   rechte Spalte 517 px zu früh ausläuft, Runde 3, dass die Zeilen zu luftig
   sind. Beides folgt daraus, dass drei Highlights nur zwei Listenzeilen
   ergeben. Der 2:1-Anschnitt trifft beide Kriterien knapp, ist aber ein
   Kompromiss, kein Entwurf. Sauberer wäre eine eigene Anordnung für den
   Fall „drei Gerichte" – das ist eine Gestaltungsentscheidung, keine
   Korrektur.

3. **Performance steht bei 8**, also über der Schwelle, aber der Abstand ist
   klein: Die Gestaltungsschicht kostet +1.213 B gzip (+5,2 %) gegenüber dem
   Stand vor aller Handschrift. Dafür fallen die tatsächlich laufenden
   Animationen von 7 auf 1 – und die eine ist ein Zustandswechsel, keine
   Bewegung.

## Archetypübergreifende Punkte

Mehrfach angemerkt, aber bewusst nicht in dieser Schicht behoben, weil sie
alle vier Archetypen zugleich betreffen und damit den Byte-Diff der noch
unveränderten Archetypen brechen würden:

- **Keine `:focus-visible`-Gestaltung.** Außer den Formularfeldern hat kein
  Bedienelement einen sichtbaren Tastaturfokus. Das ist ein WCAG-Verstoß im
  gemeinsamen Grundstylesheet.
- **Keine Navigation unter 940 px.** `.topnav` ist dort ausgeblendet, ein
  Menü-Knopf existiert nicht; Sektionen sind nur durch Scrollen erreichbar.
- **Agenturprosa in der Gästesektion.** `.stimmen-erklaerung` richtet sich
  an den Betreiber („Die Stimmen Ihrer Gäste holen wir …"), steht aber im
  Bereich, den der Gast liest.
- **`.mini-add` und `.icon-btn` erben keine Schriftfamilie** und rendern in
  Arial.
- **Leere Überschrift** `<h3 id="confirm-title">` im Bestätigungsdialog.

## Status

**Braucht menschliche Entscheidung.** Der Archetyp ist nicht auf den
Ausgangsstand zurückgesetzt: Zwei der Änderungen nach Runde 3 beheben einen
echten WCAG-Verstoß, der über alle zwölf Küchen reicht. Ihn zurückzunehmen,
um eine Bewertungsregel einzuhalten, wäre die falsche Reihenfolge.
