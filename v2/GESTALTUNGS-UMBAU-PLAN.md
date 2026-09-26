# Gestaltungs-Umbau der Demo-Seiten – Umsetzungsplan

Stand 24.09.2026, Branch `claude/stoic-cray-blbbfp`. Dies ist **nur ein Plan**: In dieser Runde
wurde kein Anwendungscode geändert, nichts gebaut und nichts veröffentlicht.

Ziel: Die generierten Restaurant-Seiten sollen das Qualitätsniveau und die
Interaktionsprinzipien von Zuma, Big Mamma, Brindisa und Black Bear Burger erreichen, **ohne**
deren Layouts, Texte, Medien oder Markenzeichen zu übernehmen und **ohne** einem lokalen
Wirtshaus einen falschen Premium-Charakter aufzuzwingen. Umgebaut wird die Pipeline, die heute
tatsächlich veröffentlicht, nicht ein neues System daneben.


## Fortschritt

| Paket | Stand | Commit |
|---|---|---|
| Freigaben (24.09.) | Pilot `beispiel-bayerisch`/`gesellig` bestätigt, Namen bestätigt, Vorschau auf Beispielseiten behalten, AP1 freigegeben | – |
| AP0 Sicherung | ✅ Snapshot (94 Seiten, `npm run v2:snapshot`), Baseline `v2/art-direction/baseline/` (Bilder hier gesperrt, siehe README dort), CLAUDE.md | `08dfcc0` |
| AP1 Ehrliche Aktionen | ✅ „Vorschau – nichts gesendet/bestellt“, keine erfundenen Nummern, Hinweis am Formular, `v2/build/aktionsziele.js` | `b7bd7f5` |
| AP2 Ausdruck-Gerüst | ✅ `v2/build/ausdruck.js`, Option `ausdruck` in `baueSite`, `npm run v2:build -- --demo beispiel-bayerisch --ausdruck gesellig --ziel v2/output/piloten-ausdruck` | (dieser Stand) |
| AP3 Erster Bildschirm | ✅ mit neutralem Platzhalter (freigegeben): Kopfzeile mit Zuständen + Menü, Bühne mit Poster/Video-Steuerung, Schleier mit Kontrastnachweis, Slogan-Rückzug, Einladung. Runde 1: `v2/art-direction/ausdruck/beispiel-bayerisch/runde-1/` (review.md) – **wartet auf Zwischenfreigabe** | (dieser Stand) |
| AP3 mit echten Postern (P3) | ✅ quer + hoch vom Inhaber (KI, gekennzeichnet), Bildausschnitt je Medium (`fokus`), Runde 3: `v2/art-direction/ausdruck/beispiel-bayerisch/runde-3/`. Video noch nicht eingesetzt (andere Szene, keine Schleife) – Bühne ist vorbereitet | (dieser Stand) |
| AP5 Atmosphäre | ✅ `v2/build/atmosphaere.js`: Lindenblatt (Haus) bzw. Küchenmarke, hinter dem Inhalt, nur Deckkraft, aus bei reduzierter Bewegung/ohne JS | (dieser Stand) |
| AP6 Abfolge `gesellig` | ✅ `v2/build/sektionen/abfolge.js`: Einladung zweispaltig mit „Besuch“, Tisch-Collage, Haus-Band; keine Stimmen, keine Häkchen. Runde 2: `v2/art-direction/ausdruck/beispiel-bayerisch/runde-2/` | (dieser Stand) |
| Video (Pilot) | ✅ einmalige Wiedergabe, MP4 + WebM, auf dem Handy nur Poster (kein Hochformat-Video) | (dieser Stand) |
| Video mobil | ✅ Hochformat-Video (MP4 + WebM) für 9 Küchen (ohne Chinesisch, Vietnamesisch, Asiatisch); Ausschnitt wie das Hochformat-Poster (`--fokus-video-mobil`); Startfrist 4 s, sonst bleibt das Poster | 25.09.2026 |
| AP7 Karte/Bestellen mobil | ✅ mitlaufende Sprungleiste mit aktiver Kategorie, 48-px-Tippflächen, Aktionsleiste weicht der Tastatur | (dieser Stand) |
| AP8 Reservierung/Anfahrt/Fuß | ✅ „Lieber anrufen?“ nur mit echter Nummer, Anfahrt als Hausschild + Öffnungstafel, Fuß mit Wortmarke. Runde 4: `v2/art-direction/ausdruck/beispiel-bayerisch/runde-4/` | (dieser Stand) |
| AP4 Prüfwerkzeuge | ✅ `npm run v2:sequenz -- --seite … --runde n`: Scroll-Sequenz, reduzierte Bewegung, ohne JS, Menü, dazu Slow 4G + 4× CPU (LCP) und „ohne Video“; Auslieferung über lokalen HTTP-Server statt file://. Pilot: LCP 1,72 s, Poster ohne Video stabil | – |
| AP10 Vorbau (ohne Medien) | ✅ Farbwelt je Seite in `v2/ausdruck-wahl.json` (optional `stimmung`), `--stimmung` im Build; Bühnenformen: `handwerk` (feste Kopfzeile, Slogan unter dem Bild, kein Rückzug), `editorial` (Titelblatt, Bild im Rahmen), `kino` (dunkle Bühne, leiserer Slogan). Vorschauen mit Platzhaltern: `v2/output/piloten-ausdruck/beispiel-{tuerkisch,cafe,japanisch}` – **nicht veröffentlicht**, wartet auf Medien | – |

**Abweichung in AP2:** Der Ausdruck ist eine **Build-Option** (später je Lead im Dashboard),
kein Feld der 36 Designsystem-Dokumente. Er hängt am Haus, nicht an der Stimmung, und so
bleiben die Designsystem-Dateien unverändert.

---

## 0. Kurzfassung

1. **Die veröffentlichten Seiten stammen alle von v2.** Alle 85 Seiten unter `docs/` tragen
   `<meta name="engine" content="v2">`, auch die 11 Beispielseiten der Startseite. Gebaut
   hat sie `v2/build/siteBuilder.js` über `baueImZyklus()` aus `src/publishSite.js`.
   Die Engine-Wahl steht in `data/v2-engine.json`. Diese Datei ist gitignoriert. Ohne sie
   fällt der Code auf **v1** zurück.
2. **v1 ist trotzdem das Fundament.** v2 liest aus v1 zur Build-Zeit:
   - das Bestell-/Reservierungsskript (`PAGE_SCRIPT`)
   - Stimmungen und Farben (`src/stimmungen.js`)
   - Speisekarten, Bild-IDs, Icons und Zeitfenster
   `src/landingPageGenerator.js` darf deshalb nicht gelöscht werden, auch wenn seine
   Gestaltung nicht mehr genutzt wird.
3. **Der Einheitsbrei ist eingebaut, nicht zufällig.** Die Ursachen:
   - drei Baupläne, einer je Archetyp
   - ein Hero, der per Hash verlost wird
   - eine Häkchen-Leiste auf jeder Seite
   - eine Lint-Regel, die Text auf Bild und damit jede atmosphärische Bühne verbietet
   - null Video, verlinkte Unsplash-Fotos und ein einziges Team-Foto
   - Stimmungen, die per Hash vergeben werden: 24 von 47 bayerischen Seiten sind die
     dunkle „Kellerstube“.
4. **Vorschlag:** Wir führen eine neue Ebene **Ausdruck** ein: `kino`, `gesellig`, `handwerk`,
   `editorial`. Sie sitzt im v2-Designsystem und steuert:
   - Komposition
   - Hero
   - Kopfzeile
   - Bewegung
   - Atmosphäre

   Die Stimmungen bleiben der Farb- und Schrift-Unterbau. Der Ausdruck ist **opt-in**: Jede
   Seite ohne Ausdruck baut Byte für Byte wie heute. Das sichert ein Test ab.
5. **Pilot:** `beispiel-bayerisch` („Wirtshaus zur Alten Linde“, Mühldorf am Inn), Ausdruck
   `gesellig`. Bayerisch ist 47 von 85 veröffentlichten Seiten. Der Betrieb ist erfunden und
   in dieser Umgebung reproduzierbar. Er ist der härteste Test für „hochwertig ohne falsches
   Premium“.
6. **Vor jeder Gestaltung:** Eine ehrliche Vorschau für Reservierung und Bestellung. Heute
   bestätigt jede veröffentlichte Seite „Tisch reserviert“, obwohl keine Seite einen Server
   angebunden hat (`apiUrl` ist bei allen 85 Seiten leer).

---

## A. Ist-Architektur

### A.1 Welcher Pfad erzeugt die vorführbaren Seiten?

```
npm run publish-site            (src/publishSite.js)
  ├─ Leads: data/output/*.csv (gitignoriert)  ─┐
  ├─ Demo-Leads: src/demoLeads.js (11 Stück)  ─┤
  │                                            ▼
  │   engineFuerLead(placeId)  ← v2/integration/dashboardV2.js
  │        liest data/v2-engine.json (gitignoriert) bzw. ENGINE_STANDARD
  │        Standard OHNE Datei: "v1"
  │
  ├─ "v1" → src/buildSite.js schreibeSeiten() → src/landingPageGenerator.js buildLandingPage()
  └─ "v2" → baueUndSchreibeV2Entwurf() → v2/build/zyklus.js baueImZyklus()
              ├─ Referenzanalyse (nur mit Netz; v2/referenzen/)
              ├─ erzeugeDesignsystem() → v2/designsysteme/<küche>--<stimmung>.json/.md
              ├─ Medien: v2/assets-pipeline/mediaGenerator.js loeseMedien()
              ├─ Copy: v2/build/texte.js + copyRefiner.js
              └─ baueSite() → v2/build/siteBuilder.js
                    ├─ sektionen/kopf.js     (Kopfzeile, 6 Hero-Aufbauten, Häkchen-Leiste)
                    ├─ sektionen/inhalt.js   (Highlights, Karte, Ambiente, Stimmen)
                    ├─ sektionen/service.js  (Reservierung, Kontakt, Warenkorb/Drawer, Fuß)
                    ├─ stil.js + tokens.js   (CSS aus dem Designsystem)
                    ├─ bewegung.js           (Auftritt beim Scrollen, 1 betonter Moment)
                    ├─ v1Funktionen.js       (PAGE_SCRIPT 1:1 aus src/landingPageGenerator.js)
                    └─ Gates: WCAG-AA, ≥3 Hero-Aufbauten, Funktionsvertrag, Anti-Slop-Lint, Copy
```

Beleg: `grep 'name="engine" content="v2"' docs/*/index.html` trifft 85 von 85 Seiten. Die
Commits `9a49876` („publish-site: v2-Seiten nach docs/ veröffentlichen“) und `b4da91d`
(„Entwürfe veröffentlichen“, 23.09.) haben sie geschrieben.

Weitere Wege zu einer Seite:

| Weg | Datei | Engine |
|---|---|---|
| Einzel-Veröffentlichung aus dem Dashboard | `src/veroeffentlichung.js` → `baueUndSchreibeEinzelnenEntwurf()` | Engine-Wahl (v1/v2) |
| Live-Vorschau | `src/previewServer.js` → `baueUndSchreibeEinzelnenEntwurf()` nach `.preview/` | Engine-Wahl |
| Lokale Entwürfe | `npm run pages` → `src/generateLandingPages.js` | **immer v1** |
| Vorschau der Prompt-Textvorschläge | `src/dashboardServer.js` (`/intern/lead/:slug/prompt/vorschau`) | **immer v1** |
| v2-Entwurf im Dashboard | `/intern/v2/lead/:slug/bauen` → `v2/output/leads/` | v2 |
| Art-Direction-Piloten | `npm run v2:pilot` → `v2/build/komposition/*` | eigener dritter Pfad, **nie veröffentlicht** |

### A.2 Was von v2 ist integriert, was läuft separat?

**Integriert, also im Veröffentlichungspfad aktiv:**
- `v2/integration/dashboardV2.js` (Engine-Wahl, Routen, Dashboard-Einblendung)
- `v2/build/zyklus.js`, `siteBuilder.js`, `sektionen/*`, `stil.js`, `tokens.js`, `bewegung.js`,
  `schriften.js`, `texte.js`, `copyRefiner.js`, `antiSlopLint.js`, `parser.js`
- `designsystemGenerator.js` (läuft bei jedem Bau neu), `referenzAnalyse.js` (nur Lesen der
  Analysen, offline)
- `v2/assets-pipeline/mediaGenerator.js`: Vorrang eigene → Upload → KI-Cache → Stock →
  SVG-Platzhalter
- `v2/judge/designJudge.js`: im Zyklus, braucht einen Browser, sonst statisch

**Separat, nicht im Veröffentlichungspfad:**
- `v2/build/komposition/*`, `v2/briefing/*`, `v2/creative/*`,
  `v2/integration/creativeDashboard.js`: Art-Direction-Pfad
- `v2/judge/screenshotReview.js`, `artDirectionScreenshots.js`, `artDirectionAudit.js`,
  `tauschprobe.js`, `vergleich.js`: Prüfwerkzeuge
- `v2/integration/wirtServerV2.js`, `telegramBot.js`: Hüllen um `src/wirtServer.js`
- `referoSuche.js`: Refero hat keine Gastro-Referenzen (DESIGN.md 5.0)

### A.3 Bausteine, die erhalten bleiben

| Baustein | Datei | Warum er bleibt |
|---|---|---|
| Funktionsschicht Bestellung/Reservierung/No-Show | `PAGE_SCRIPT` in `src/landingPageGenerator.js`, gelesen über `v2/build/v1Funktionen.js` | eine Fassung für v1 und v2; von Tests und E2E abgesichert |
| Funktionsvertrag | `PFLICHT_IDS`, `PFLICHT_FELDER`, `pruefeFunktionsVertrag()` in `v1Funktionen.js` | Gate 3 im Bau: keine Seite ohne funktionierende Formulare |
| Stimmungen und Farben | `src/stimmungen.js`, `src/colorMath.js`, v2-Farbrollen | geprüfte Kontraste; bleiben der Farbunterbau |
| Designsystem-Dokument | `v2/build/designsystemGenerator.js` → `v2/designsysteme/*.json` | richtige Stelle für den neuen Ausdruck |
| Schriften lokal (woff2) | `v2/build/schriften.js`, `docs/assets/fonts`, `v2/output/assets/fonts` | offline, DSGVO-freundlich; 45 Familien vorhanden |
| Motion-Regeln | `v2/build/bewegung.js`, `src/motion.js` | „nichts springt, nichts versteckt Inhalt, abschaltbar“ bleibt Gesetz |
| Gezeichnete Signaturen | `src/signaturIcons.js`, SVGs in `src/heroSignature.js` (Maßkrug, Olivenzweig, Laterne …) | Rohstoff für die neue Atmosphäre-Ebene |
| Medien-Vorrang und Kennzeichnung | `mediaGenerator.js`, `v2/medien/eigene.json`, `bildplan.js` | „eigenes Foto / KI-generiert / Platzhalter“ ist schon da |
| Beleg-Logik | `v2/briefing/briefing.js`, `komposition/texte.js` | keine erfundenen Tatsachen; wird für Texte wiederverwendet |
| Prüfwerkzeuge | `v2/build/browser.js`, `screenshot.js`, `v2/judge/screenshotReview.js` | laufen in dieser Umgebung; geprüft am 24.09. |
| Engine-Marker | `<meta name="engine">`, `v2-designsystem`, `v2-hero` | zeigt, welche Kundenseite auf welchem Stand ist |

### A.4 Bekannte Risiken und Abhängigkeiten

1. **Die Engine-Wahl ist nicht versioniert.** Geht `data/v2-engine.json` verloren, etwa in
   einem neuen Checkout oder auf einem anderen Rechner, baut `publish-site` wieder v1. Das
   wäre ein stiller Rückfall auf die alte Optik.
2. **Unterschiedliche Engines je Weg** (siehe A.1): Die lokalen Entwürfe und die Vorschau der
   Textvorschläge zeigen v1, veröffentlicht wird v2.
3. **`PAGE_SCRIPT` wird per Text ausgeschnitten** (`seitenSkript()`). Er wirft einen Fehler,
   sobald `const PAGE_SCRIPT = \`` oder das Ende verändert wird oder `${` darin auftaucht.
   Das ist so gewollt; jede Änderung dort braucht aber Vorsicht.
4. **`baueImZyklus()` schreibt bei jedem Bau das Designsystem-JSON neu.** Ein Pilot-Bau
   verändert also die Datei unter `v2/designsysteme/`. Das muss man beim Committen wissen.
5. **Bilder sind verlinkt** (`remoteImageUrl`, `images.unsplash.com`). In dieser
   Cloud-Umgebung sind Unsplash und alle vier Referenzseiten vom Netzwerk-Proxy gesperrt.
   Screenshots zeigen hier leere Bildflächen (geprüft).
6. **Tests:** `npm test` = 521/521 grün (Baseline 24.09., 19 s). Die E2E-Tests
   (`v2-e2e`, `v2-artdirection-e2e`) starten Chromium und `wirtServer`.
7. **Echte Leads fehlen in diesem Repo** (`data/output/` ist gitignoriert). Hier sind nur die
   11 Demo-Leads und die synthetischen `v2/build/testLeads.js` baubar.

### A.5 Was den Eindruck von Einheitsbrei verursacht

Nachvollzogen im Code und an Screenshots von `docs/beispiel-bayerisch` sowie der
Vergleichsbilder in `v2/output/vergleich/`:

| # | Mechanismus | Wo | Wirkung |
|---|---|---|---|
| 1 | Sektionsfolge, Highlights/Karte/Stimmen und Hauptaktion hängen am **Archetyp** | `designsystemGenerator.js` → `layout.*`, `siteBuilder.js` | 12 Küchen teilen sich 3 Baupläne (Audit Phase A) |
| 2 | **Hero per Hash-Lotterie**: `waehleHeroVariante()` = `(seed >>> 7) % n` | `siteBuilder.js`, `kopf.js` | Der Aufbau sagt nichts über das Haus |
| 3 | **Gate „≥ 3 Hero-Aufbauten“** | `pruefeHeroVarianten()` | erzwingt Vielfalt per Zufall statt per Entscheidung |
| 4 | **Anti-Slop-Lint verbietet jeden Verlaufsschleier im Hero** | `antiSlopLint.js` (`text-auf-foto-mit-verlauf`) | kein Text auf Bild, also keine Bühne: v2 wirkt wie eine Papierkarte in Kästen |
| 5 | **Stimmung per Hash**, wenn nichts gewählt ist | `stimmungsWahl.js`, `resolveStimmung()` | 24 bayerische Gasthöfe haben zufällig die dunkle Kellerstube bekommen: falscher Charakter per Zufall |
| 6 | **Häkchen-Leiste** mit Katalog-USPs unter jedem Hero | `renderLeiste()` in `kopf.js` | das klassische KI-Landingpage-Muster |
| 7 | **Kopfzeile** = Name als Text + 4 Links + 1 Knopf, auf Mobil ohne Menü | `renderKopfzeile()`, `stil.js` | wirkt wie ein Template; mobile Navigation fehlt |
| 8 | **Bewegung** = nur „Auftritt von unten“ + ein betonter Moment | `bewegung.js` | keine scrollgebundene Dramaturgie, kein Übergang, keine Atmosphäre |
| 9 | **Medien**: kein Video, verlinkte Stockfotos, 1 Team-Foto überall, 22 gesichtete Stockmotive | `imageLibrary.js`, `stockKatalog.json` | austauschbare Bildwelt; offline leere Flächen |
| 10 | **Gleichförmiger Rhythmus**: jede Sektion `.rahmen` 1200 px, jede zweite auf `flaecheTief` | `siteBuilder.js` (`i % 2 === 1`), `stil.js` | alles gleich breit und gleich laut |
| 11 | **Generische Texte**: „Frisch aus der Region – in der Musterstraße …“, „Was unsere Gäste am liebsten bestellen“ | `v2/build/texte.js` | kein Satz, der nur zu diesem Haus passt |

### A.6 Wie die Küchen verbessert werden, ohne 12 gleiche Seiten zu bauen

Heute gibt es zwei Achsen: Küche × Stimmung. Beide steuern praktisch nur Farbe und Schrift;
die Struktur kommt vom Archetyp. Vorschlag: **drei getrennte Achsen**.

| Achse | Bestimmt | Quelle |
|---|---|---|
| **Stimmung** (bleibt) | Farbrollen, Schriftpaar, Hell/Dunkel | `src/stimmungen.js` → Designsystem |
| **Ausdruck** (neu) | Seitenkomposition, Hero-Typ, Kopfzeilen-Verhalten, Motion-Profil, Atmosphäre-Motiv, Rangfolge der Aktionen | `v2/build/ausdruck.js` (neu) → Designsystem-Feld `ausdruck` |
| **Haus** (vorhanden, bisher kaum genutzt) | Slogan, Motiv der Atmosphäre, welche Sektionen es überhaupt gibt (nur Belegtes) | Lead, Dashboard-Edits, Briefing (`v2/briefing/briefing.js`) |

So bekommen zwei italienische Lokale mit gleicher Stimmung verschiedene Seiten, wenn sie
verschieden auftreten. Umgekehrt kann eine Trattoria und ein Wirtshaus denselben Ausdruck
`gesellig` haben und trotzdem nicht verwechselbar sein: Farbe, Schrift, Motiv und Texte
unterscheiden sie.

---

## B. Zielbild

### B.1 Das gemeinsame Fundament (für alle Ausdrucksweisen gleich)

1. **Kopfzeile mit zwei Zuständen**
   - Über dem Hero: transparent über einem einfarbigen Schleier-Token.
   - Nach dem Hero: ruhige Fläche mit Haarlinie.
   - Umschalten per IntersectionObserver an einem Sentinel am Hero-Ende, nicht per
     Scroll-Schwelle.
   - Übergang nur über `opacity` eines Pseudo-Elements, damit die Motion-Regel gilt.
   - Wortmarke links, immer sichtbar.
   - Desktop: höchstens 4 Textlinks plus Aktionen.
   - Mobil: Wortmarke, Menü-Knopf und eine Hauptaktion.
2. **Aktionen**
   - Reservieren und Bestellen erscheinen in der Kopfzeile nur mit echtem Ziel (siehe E.2).
   - Mobil gibt es eine feste Aktionsleiste unten.
   - Sie erscheint erst nach dem Hero, damit die Knöpfe nicht doppelt stehen.
   - Sie weicht Formular, Warenkorb und Tastatur.
   - Sie berücksichtigt `safe-area-inset-bottom`.
3. **Hero-Medium**
   - Video **oder** Bild, immer mit einem echten `<img>`-Poster als LCP-Element.
   - Getrennte Ausschnitte für Desktop (16:9) und Mobil (4:5 oder 9:16) über `<picture>`
     bzw. zwei Videoquellen.
   - Das Video lädt erst nach `load`, und nur ohne `prefers-reduced-motion`, ohne
     `Save-Data`/`prefers-reduced-data` und ohne langsames Netz (`effectiveType` 2g/3g).
   - Läuft es nicht binnen 4 Sekunden an (Browser ohne Netz-Auskunft wie Safari,
     zähes Netz, Stromsparmodus), wird das Laden abgebrochen und das Poster bleibt.
   - Es pausiert außerhalb des Sichtfelds.
   - Bei einem Fehler bleibt das Poster stehen.
4. **Slogan-Rückzug**
   - Der Slogan hat höchstens 6 Wörter.
   - Über die ersten 50 % der Hero-Höhe geht Opazität 1 → 0 und Versatz 0 → −24 px.
   - Umsetzung per CSS `animation-timeline: scroll()` hinter `@supports`.
   - Rückfall: ein passiver Scroll-Handler, der genau eine CSS-Variable schreibt
     (`requestAnimationFrame`).
   - Bei reduzierter Bewegung steht der Slogan still.
5. **Atmosphäre-Ebene**
   - Ein zurückhaltendes Motiv je Seite (Linie, Licht, Muster aus den vorhandenen
     SVG-Zeichnungen).
   - Fest hinter dem Inhalt, `pointer-events: none`.
   - Erscheint und geht pro Abschnitt über `data-atmosphaere` (nur Opazität).
   - Nie unter Fließtext mit Kontrastverlust.
   - Bei reduzierter Bewegung statisch oder aus.
6. **Rhythmus**
   - Mindestens 3 unterschiedlich gebaute Abschnitte pro Seite: Bildband vollbreit, Text
     schmal, Liste, Split.
   - Abstände aus der vorhandenen 8-px-Skala.
   - Keine Seite aus lauter gleich breiten 1200-px-Kästen.
7. **Robustheit**
   - Ohne JavaScript ist aller Inhalt sichtbar (vorhandenes `.bewegt`-Prinzip).
   - Ohne Video bleibt das Poster.
   - Bei langsamem Netz gibt es erst Poster, Schrift und Text.
   - Leistungsbudget siehe F.4.

### B.2 Die vier Ausdrucksweisen

Benennung passend zum Repo: „Archetyp“ und „Stimmung“ sind schon belegt, daher heißt die neue
Ebene **Ausdruck**. `editorial` greift den vorhandenen Editorial-Archetyp auf, meint hier aber
das Kompositionsprinzip, nicht die Farbquelle.

| | `kino` (cinematic) | `gesellig` (warm-social) | `handwerk` (honest-craft) | `editorial` (quiet-editorial) |
|---|---|---|---|---|
| Referenz-Prinzip | Zuma: Raum und Licht zuerst, ein Grundton, wenige Worte | Big Mamma: Wärme, Leute, Tisch, Persönlichkeit | Black Bear Burger: Essen, Öffnungszeiten, Anfahrt – sofort | Brindisa: Zutaten, Herkunft, gemeinsames Essen, ruhiger Satz |
| Passt zu | Abendlokal mit echtem Raumerlebnis | Wirtshaus, Trattoria, Taverne, Familienbetrieb | Döner, Imbiss, Pizzeria mit Abholung, Streetfood, Burger | Café, Sushi-Bar, Weinlokal, Feinkost |
| Hero | Bühne: Video/Bild auf ca. 85 % Höhe, Slogan klein über dem Medium, Rückzug beim Scrollen | Bühne auf ca. 75 % Höhe, darunter sofort ein Tisch-Moment (Gericht/Leute) | kurze Bühne auf ca. 60 % Höhe, großer Claim, Karte und Bestellen direkt darunter | Titelblatt: Typo auf Grund, Bild im Passepartout, kein Schleier |
| Kopfzeile | transparent → dunkle Fläche, sehr ruhig | transparent → warme Fläche | früh fest; Bestellen hervorgehoben | fest, hell, Haarlinie |
| Hauptaktion | Reservieren | Reservieren (Bestellen zweitrangig) | Bestellen / Anrufen | je nach Haus |
| Komposition (Vorschlag) | Einladung → Raum-Band → Karte (Leseliste) → Reservierung → Anfahrt | Einladung → Heute auf dem Tisch (Collage) → Karte → Haus (nur echte Fotos) → Reservierung/Gruppen → Anfahrt | Karte mit Warenkorb → Öffnungszeiten + Anfahrt groß → Haus kurz → Reservierung klein | Einleitung → Zutaten/Herkunft (nur belegt) → Karte → Besuch |
| Bewegung | langsam, lange Übergänge, Atmosphäre deutlich | mittel, warm; Atmosphäre sparsam | kurz und direkt, fast keine Atmosphäre | kaum Bewegung, nur Auftritte |
| Atmosphäre-Motiv | Licht/Linien der Stimmung | Zeichnung aus der Küche (z. B. Lindenblatt, Maßkrug, Olivenzweig) | keins oder Textur | Linie/Raster |
| Verzicht | keine Collagen, keine Preise im Hero | keine Häkchen, keine erfundenen Gästestimmen | kein Slogan-Theater, kein Dunkel-Luxus | keine Vollbild-Videos |

### B.3 Standard-Zuordnung (Vorschlag, gilt erst beim Rollout)

Der Ausdruck wird **nie per Hash** vergeben. Standard nach Küche, änderbar je Lead im
Dashboard:

| Küche | Standard-Ausdruck | Anmerkung |
|---|---|---|
| bayerisch, italienisch, griechisch, syrisch, chinesisch, indisch | `gesellig` | typisches Familienlokal |
| tuerkisch, vietnamesisch, asiatisch, thailaendisch | `handwerk` | Abholung und Streetfood |
| japanisch, cafe | `editorial` | ruhiger Auftritt |
| alle `*-editorial`-Stimmungen | `editorial` | |
| `kino` | **nur auf ausdrückliche Wahl** | z. B. Omakase, Osteria Notte oder eine echte Kellerstube am Abend; sonst droht falsches Premium |

---

## C. Pilot

### C.1 Vorschlag: `beispiel-bayerisch` – „Wirtshaus zur Alten Linde“

Eintrag in `src/demoLeads.js`: Wirtshausküche & Biergarten, Mühldorf am Inn. Stimmung
`wirtshaus` (Archetyp traditionell), neuer Ausdruck `gesellig`.

Begründung:
1. **Das häufigste Kundenprofil.** 47 von 85 veröffentlichten Seiten sind bayerisch, davon 46
   echte Leads (Gasthof, Bräu, Wirt, Alm, Sportheim).
2. **Der härteste Test.** Ein familiäres Wirtshaus muss hochwertig wirken, ohne nach Zuma
   auszusehen. Gelingt das hier, gelingt es auch beim Italiener.
3. **Erfunden und öffentlich sichtbar.** Die Seite steht auf der Startseite der Beispiele. Es
   gibt keine Kundendaten, die man falsch darstellen könnte. Demo-Medien sind erlaubt, wenn
   sie gekennzeichnet sind.
4. **Hier vollständig baubar.** `DEMO_LEADS` liegt im Repo, echte Leads nicht.
5. **Vergleich vorhanden.** Es gibt die heutige Seite (`docs/beispiel-bayerisch`) und den
   Art-Direction-Piloten „Gasthaus Zur Alten Linde“ (`v2/art-direction/piloten/`).

Alternative, wenn du schneller einen sichtbaren Effekt willst: `beispiel-italienisch`
(„Trattoria Bella Vista“) mit `gesellig`.

Der Pilot wird nach `v2/output/piloten-ausdruck/beispiel-bayerisch/` gebaut, **nicht nach
`docs/`**.

### C.2 Akzeptanzkriterien Desktop (1440 × 900, zusätzlich 1920 × 1080)

**Hero und Kopfzeile**
1. Das Hero-Medium füllt 70–80 % der Höhe. Die nächste Sektion ist angeschnitten sichtbar.
2. Die Kopfzeile ist über dem Hero transparent, die Wortmarke gut lesbar.
3. Nach dem Hero hat die Kopfzeile eine Fläche. Der Wechsel geschieht ohne Sprung, ohne
   Layoutverschiebung und in höchstens 300 ms.
4. Reservieren und Bestellen stehen nur in der Kopfzeile, wenn E.2 ein Ziel liefert.
   Im Vorschau-Modus steht eine erkennbare Vorschau-Kennzeichnung auf der Seite.
5. Der Slogan hat höchstens 6 Wörter, steht in einer Zeile und hat Kontrast ≥ 4,5:1.
   Gemessen wird gegen die hellste Stelle des Posters unter dem Text, mit Schleier.
6. Die Scroll-Sequenz (0/25/50/75/100 % Hero-Höhe) zeigt:
   - einen stetigen Rückzug des Slogans
   - keinen Sprung
   - eine jederzeit sichtbare Wortmarke

**Aufbau und Gestaltung**
7. Mindestens 3 strukturell verschiedene Abschnittsformen.
8. Keine Häkchen-Leiste. Keine drei gleichen Karten nebeneinander.
9. Die Atmosphäre-Ebene erscheint in mindestens 2 und höchstens 4 Abschnitten. Sie liegt nie
   unter Fließtext mit weniger als 4,5:1.

**Technik**
10. CLS ≤ 0,05 (Labor), keine horizontale Scrollleiste, Tastaturfokus überall sichtbar.

### C.3 Akzeptanzkriterien Mobil (390 × 844, zusätzlich 360 × 780)

**Kopfzeile und Aktionen**
1. Die Kopfzeile ist höchstens 64 px hoch und enthält Wortmarke, Menü-Knopf und eine
   Hauptaktion.
2. Das Menü öffnet als volle Fläche. Es schließt per Knopf und Esc, behält den Fokus im Menü
   und ist ohne JavaScript als Ankerliste erreichbar.
3. Der Hero hat einen eigenen Hochformat-Ausschnitt. Slogan und erste Aktion sind ohne
   Scrollen sichtbar.
4. Die Aktionsleiste erscheint nach dem Hero:
   - nur echte Aktionen, höchstens 3 (Reservieren / Bestellen / Anrufen)
   - Ziele ≥ 48 px
   - verdeckt nie einen Absende-Knopf und verschwindet bei geöffneter Tastatur

**Karte und Formulare**
5. Karte:
   - Kategorie-Sprungleiste
   - Text ≥ 16 px
   - tabellarische Preise
   - Hinzufügen-Knöpfe ≥ 44 px
   - Warenkorb erreichbar, ohne Inhalt zu verdecken
6. Formulare: Eingaben ≥ 16 px (kein iOS-Zoom), Fehlertexte direkt am Feld.

**Technik**
7. LCP ≤ 2,5 s bei Slow 4G und 4× CPU (Labor), CLS ≤ 0,05.

### C.4 Kriterien für beide (Robustheit)

1. **Reduzierte Bewegung:**
   - kein Video-Autoplay (nur Poster)
   - keine scrollgebundene Animation, keine Atmosphäre-Bewegung
   - aller Inhalt sichtbar
2. **Ohne Video** (Anfrage auf `*.mp4`/`*.webm` blockiert): Poster steht, keine leere Fläche,
   keine Konsolenfehler.
3. **Slow 4G:** Poster, Schrift und Text vor dem Video. Das Video startet nicht bei
   `effectiveType` 2g/3g.
4. **Ohne JavaScript:** alle Inhalte, Links und Telefonnummer sichtbar. Die Formulare zeigen
   den Telefon-Rückfall.
5. **Funktion:** alle bestehenden Tests grün, der Funktionsvertrag erfüllt, E2E Reservierung
   und Bestellung gegen `wirtServer` grün.

---

## D. Arbeitspakete

Reihenfolge = Abhängigkeitsreihenfolge. Jedes Paket endet mit:
- `npm test` grün
- Screenshots
- einem kleinen Commit

Aufwand in Sitzungen (≈ eine konzentrierte Claude-Code-Sitzung):
- S = unter 1
- M = etwa 1
- L = 2 oder mehr

### AP0 – Sicherung und Messbasis (keine sichtbare Änderung) · S

- **Dateien:**
  - `v2/build/artDirectionScreenshots.js`: Option `--docs <slug>`, um veröffentlichte Seiten
    zu fotografieren
  - neuer Test `test/v2-unveraendert.test.js`
  - `package.json`: Skript `v2:baseline`
  - `.gitignore`: `.referenzen/`
  - `CLAUDE.md`: Abschnitt „aktive Pipeline“ korrigieren
- **Änderung:**
  - Baseline-Screenshots der 11 Beispielseiten, Desktop und Mobil, nach
    `v2/art-direction/baseline/`.
  - Unveränderungs-Test: Hash der `baueSite()`-Ausgabe für alle 11 Demo-Leads und die 36
    Designsysteme. Er garantiert, dass Seiten ohne Ausdruck gleich bleiben.
  - Referenz-Frames lokal unter `.referenzen/` ablegen, **nicht** einchecken. Das Repo ist
    für GitHub Pages öffentlich, und es sind fremde Inhalte.
- **Abhängigkeit:** Für Screenshots mit Bildern muss `images.unsplash.com` erreichbar sein
  (Netzfreigabe) oder der Lauf findet auf deinem Rechner statt.
- **Tests:** neuer Test. Die bestehenden 521 bleiben grün.
- **Sichtbar:** nichts auf den Seiten; ein Ordner mit Vorher-Bildern.
- **Risiko:** gering.

### AP1 – Ehrliche Aktionen und Vorschau-Modus · S–M

- **Dateien:**
  - neu `v2/build/aktionsziele.js`
  - `v2/build/sektionen/kopf.js`, `v2/build/sektionen/service.js`, `v2/build/texte.js`
  - `src/landingPageGenerator.js`: **nur** die Texte im Demo-Zweig von `PAGE_SCRIPT`
- **Änderung:**
  - `aktionsziele()` liefert je Aktion (reservieren, bestellen, anrufen, route) ein Ziel:
    `live` (apiUrl gesetzt), `vorschau` (Beispiel/Entwurf ohne Server), `telefon`, `extern`
    oder `null`.
  - Kopfzeile und Aktionsleiste zeigen nur Aktionen mit Ziel.
  - Im Demo-Zweig heißt die Bestätigung nicht mehr „Tisch reserviert … liegt uns vor“,
    sondern ehrlich: **„Vorschau – nichts gesendet“**. Ergänzt um den Satz, wohin die Anfrage
    auf der fertigen Seite geht, und die Telefonnummer, falls vorhanden.
  - Der Live-Zweig bleibt Zeichen für Zeichen gleich.
- **Abhängigkeit:** keine.
- **Tests:**
  - `landingPageGenerator.test.js` und `v2-build.test.js` um die Demo-Texte ergänzen
  - `v2-e2e.test.js` und `v2-artdirection-e2e.test.js` (Live-Zweig) unverändert grün
  - neuer Test für `aktionsziele()`
- **Sichtbar:** ehrliche Bestätigung; keine Schein-Knöpfe.
- **Risiko:** mittel. Das Paket berührt die gemeinsame Funktionsschicht, aber nur Texte im
  Zweig `ergebnis.demo`. Es braucht **deine ausdrückliche Freigabe**, weil es `src/` ändert.

### AP2 – Ausdruck-Gerüst und Opt-in-Schalter (unsichtbar) · M

- **Dateien:**
  - neu `v2/build/ausdruck.js`: die vier Profile aus B.2 als Daten (Sektionsfolge, Hero-Typ,
    Kopfzeile, Motion-Profil, Atmosphäre, Verbote)
  - `v2/build/designsystemGenerator.js`: Feld `ausdruck`, standardmäßig `null`
  - `v2/build/tokens.js`: neue Variablen `--kopf-hoehe`, `--hero-hoehe`, `--schleier`,
    `--m-scroll-*`
  - `v2/build/siteBuilder.js`: Option `ausdruck`; der Pfad verzweigt nur mit Ausdruck
  - `v2/build/cli.js`: `--ausdruck`, `--demo <slug>`, `--ziel <ordner>`
  - Meta-Marker `v2-ausdruck`
- **Änderung:** Ohne Ausdruck: identische Ausgabe. Mit Ausdruck: vorerst derselbe Aufbau,
  nur mit neuem Marker und den Tokens.
- **Abhängigkeit:** AP0 (Unveränderungs-Test).
- **Tests:** `v2-designsysteme.test.js`, `v2-build.test.js`, Unveränderungs-Test.
- **Sichtbar:** nichts.
- **Risiko:** gering.

### AP3 – Erster Bildschirm: Kopfzeile, Hero-Medium, Slogan-Rückzug · L

- **Dateien:**
  - `v2/build/sektionen/kopf.js`: neue Hero-Typen `buehne` und `titelblatt`, Kopfzeile mit
    Zuständen, mobiles Menü; `id="topbar"` bleibt
  - `v2/build/stil.js`
  - `v2/build/bewegung.js`: Sentinel, Slogan-Timeline, Video-Steuerung
  - `v2/build/siteBuilder.js`: Hero-Gate nur ohne Ausdruck; neues Gate „Poster vorhanden +
    Slogan-Kontrast“
  - `v2/assets-pipeline/mediaGenerator.js`: Rollen `heroVideoMobil` und `heroMobil`
  - `v2/build/antiSlopLint.js`: siehe unten
- **Lint-Änderung:** `text-auf-foto-mit-verlauf` erlaubt **einen einfarbigen** Schleier aus
  dem Token `--schleier` mit Kontrastnachweis. Mehrfarbige Verläufe bleiben verboten.
- **Abhängigkeit:** AP1 (Aktionen), AP2.
- **Tests:**
  - Markup-Tests für Zustände und Aktionen
  - Lint-Tests für die geänderte Regel
  - Funktionsvertrag
  - E2E mobil: Menü öffnet und schließt
- **Sichtbar:** der neue erste Bildschirm. **Danach Zwischenfreigabe durch dich**, bevor der
  Rest gebaut wird.
- **Risiko:** mittel. Scroll-Verhalten auf iOS Safari; Rückfall ohne scroll-timeline muss
  sauber sein.

### AP4 – Prüfwerkzeuge für Bewegung und Robustheit · M

- **Dateien:**
  - `v2/judge/screenshotReview.js`, `v2/build/artDirectionScreenshots.js`
  - neu `v2/build/scrollSequenz.js`
- **Neue Szenarien:**
  - Slow 4G per CDP (`Network.emulateNetworkConditions`)
  - „ohne Video“ (`page.route('**/*.{mp4,webm}', abort)`)
  - reduzierte Bewegung
  - JavaScript aus
  - Scroll-Sequenz mit 5 Frames für Slogan und Kopfzeile
  - Kopfzeilen-Zustand vor und nach dem Hero
- **Ausgabe:** `v2/art-direction/ausdruck/<slug>/runde-<n>/`
- **Abhängigkeit:** AP3 (etwas zu prüfen).
- **Tests:** ein Smoke-Test der Szenarien mit einer statischen Testseite.
- **Sichtbar:** Screenshot-Sätze je Runde.
- **Risiko:** gering.

### AP5 – Atmosphäre-Ebene · M

- **Dateien:**
  - neu `v2/build/atmosphaere.js`: Motive aus `src/signaturIcons.js` und `src/heroSignature.js`
    wiederverwenden, dazu neu ein Lindenblatt für den Piloten
  - `stil.js`, `bewegung.js`: `data-atmosphaere` je Abschnitt, Ein- und Ausblenden per
    IntersectionObserver
- **Regeln:**
  - höchstens ein Motiv gleichzeitig
  - Opazität ≤ 0,12
  - nie unter Fließtext mit weniger als 4,5:1
  - bei reduzierter Bewegung statisch
- **Abhängigkeit:** AP3.
- **Tests:** Markup, Lint (nur `transform`/`opacity`), Reduced-Motion-Screenshot.
- **Sichtbar:** ein ruhiges, wiederkehrendes Motiv, das Abschnitte verbindet.
- **Risiko:** gering bis mittel (Überladung). Wird in der Designkritik gezielt geprüft.

### AP6 – Komposition `gesellig` (Sektionsformen und -folge) · L

- **Dateien:**
  - `v2/build/siteBuilder.js`: Folge aus dem Ausdruck; kein `renderLeiste` mit Ausdruck
  - `v2/build/sektionen/inhalt.js`: neue Formen `einladung` und `tisch` (Collage mit
    ungleichen Bildgrößen), Karte als Leseliste
  - Wiederverwendung aus `v2/build/komposition/sektionen.js` (Tageskarte/Aushang) per Import,
    nicht per Kopie
  - `stil.js`
  - `v2/build/texte.js`: Texte ohne Musterfloskeln; Beleg-Regeln aus `komposition/texte.js`
- **Abhängigkeit:** AP3, AP5.
- **Tests:** Build-Tests, Lint, Tauschprobe (`v2/build/tauschprobe.js`) auf den Piloten.
- **Sichtbar:** die Seite erzählt ein Wirtshaus statt eine Vorlage.
- **Risiko:** mittel (Umfang). Deshalb nur `gesellig` im Piloten.

### AP7 – Karte und Bestellen mobil · M

- **Dateien:** `v2/build/sektionen/inhalt.js` (`renderKarte`), `service.js` (Drawer),
  `stil.js`.
- **Änderung:**
  - Kategorie-Sprungleiste
  - `tabular-nums`
  - Ziele ≥ 44 px
  - Warenkorbleiste über der Aktionsleiste ohne Überdeckung
  - Die Verträge `data-add`, `data-name`, `data-preis` sowie Drawer-IDs und -Klassen
    bleiben.
- **Abhängigkeit:** AP3 (Aktionsleiste).
- **Tests:** Funktionsvertrag, E2E Bestellung, mobile Warenkorb-Screenshots.
- **Risiko:** mittel. Hier liegt die Bestellfunktion; Änderungen nur an Markup und CSS, nicht
  am Skript.

### AP8 – Reservierung, Anfahrt, Fußzeile · M

- **Dateien:** `v2/build/sektionen/service.js`, `stil.js`, `texte.js`.
- **Änderung:**
  - Ruhiges Formular mit klaren Zuständen (Fehler, Senden, Bestätigt, Vorschau).
  - Öffnungszeiten nur als Tatsache oder deutlich als Platzhalter markiert.
  - Anfahrt mit Maps-Link.
  - Fußzeile mit Wortmarke statt Linkfriedhof.
  - Die Formular-IDs und -Feldnamen bleiben.
- **Abhängigkeit:** AP1, AP3.
- **Tests:** Funktionsvertrag, E2E Reservierung, Formularfehler-Screenshot.
- **Risiko:** mittel.

### AP9 – Pilot-Iterationen mit Designkritik · M je Runde, höchstens 3 Runden

- **Ablauf je Runde:**
  1. Bauen (`npm run v2:build -- --demo beispiel-bayerisch --ausdruck gesellig --ziel
     v2/output/piloten-ausdruck`)
  2. AP4-Sätze erzeugen
  3. Kritik schreiben: was trägt, was ist generisch, höchstens 5 Änderungen
  4. Umsetzen
- **Ablage:** `v2/art-direction/ausdruck/beispiel-bayerisch/review-runde-<n>.md`
- **Ende:** deine visuelle Freigabe, nicht ein Score.

### AP10 – Drei Archetypen · L

- **Inhalt:** Nach der Freigabe drei deutlich verschiedene Häuser:
  - `handwerk`, z. B. `beispiel-tuerkisch` (Anatolia Grillhaus, Abholung)
  - `editorial`, z. B. `beispiel-cafe` (Café Morgenrot)
  - `kino`, z. B. `beispiel-japanisch` (Sakura), ausdrücklich gewählt
- **Wieder:** AP4-Prüfung und Designkritik je Seite.

### AP11 – Übrige Küchen, Dashboard-Wahl, Aufräumen · L

- **Dashboard-Wahl:**
  - Standard-Zuordnung B.3 aktivieren
  - Ausdruck-Wahl je Lead im Dashboard: `v2/integration/dashboardV2.js` plus die Einblendung
    in `bearbeiten.html` über `v2HtmlInjektion`, analog zur Stimmungswahl
- **Engine vereinheitlichen:**
  - Standard-Engine im Code auf v2 setzen (Risiko A.4.1)
  - Vorschau der Prompt-Textvorschläge über die Engine-Wahl laufen lassen (A.4.2)
- **v1-Gestaltung:** Danach entscheiden wir, ob die v1-Gestaltung (`sections/*`, `styles/*`,
  `heroSignature.js`, `motion.js`) stillgelegt wird. `PAGE_SCRIPT` und die Hilfsmodule
  bleiben in jedem Fall.
- **Veröffentlichung:** nur nach deiner Freigabe und nur je Seite
  (`npm run publish-site -- --only <slug>`).

**Stand AP11 (24.09.2026):**
- Standard-Zuordnung B.3 ist aktiv: `ausdruckZumBauen(slug, kueche)` in `v2/build/ausdruck.js`
  liefert die Wahl aus `v2/ausdruck-wahl.json`, sonst den Standard der Küche; `"aus"` heißt
  bewusst ohne Ausdruck. `publishSite.js` und der Einzelbau im Dashboard nutzen dieselbe Funktion.
- Ausdruck-Wahl je Lead in `bearbeiten.html` (Auswahl im v2-Panel, Route
  `POST /intern/v2/lead/:slug/ausdruck`, am Dashboard-Token). Gespeichert wird versioniert in
  `v2/ausdruck-wahl.json`, nicht im gitignorierten `data/`.
- Standard-Engine ist v2, auch ohne `data/v2-engine.json` (A.4.1 behoben); v1 bleibt je Lead
  oder global wählbar.
- Die Vorschau der Textvorschläge rendert für v2-Leads die v2-Seite mit Ausdruck (A.4.2 behoben).
- v1-Gestaltung: noch nicht stillgelegt. Sie wird nur noch gebraucht, wenn ein Lead ausdrücklich
  auf v1 steht, einen Ausdruck „aus“ hat und die Küche keinen Standard hat.

---

## E. Funktionsschutz

### E.1 Nicht angefasst werden

Zulässig bleiben nur die ausdrücklich genannten Stellen in AP1 und AP11.

- **Leads:** `src/placesClient.js`, `scoring.js`, `csvImport.js`, `csvExport.js`,
  `leadFilter.js`, `leadFreshness.js`, `outreach.js`, `websiteAnalyzer.js`
- **Wirt-Funktionen:** `src/wirtServer.js`, `betriebStore.js`, `telegramNotify.js`,
  `pushNotify.js`, `kundenBenachrichtigung.js`, `rechnungGenerator.js`,
  `wartezeitLernStore.js`, `zuverlaessigkeitStore.js`
- **Dashboard:** `src/dashboardServer.js`, `public/*.html`, `src/promptEdits.js`,
  `leadEdits.js`, `bildUpload.js`
- **Veröffentlichung:** `src/publishSite.js`, `veroeffentlichung.js`, `entwurfsManifest.js`,
  `engineVersion.js`
- **Resonanz:** `src/resonanz*.js`
- **v2-Integration:** `v2/integration/wirtServerV2.js`, `telegramBot.js`, `wirtAdapter.js`
- **Inhalte:** `src/menuCatalog.js` (Speisekarten), `PAGE_SCRIPT` (Live-Zweig)

### E.2 Regeln für Aktionen

| Lage | Kopfzeile / Aktionsleiste | Formular-Bestätigung |
|---|---|---|
| `apiUrl` gesetzt (Betrieb in `wirtServer` angelegt) | Reservieren + Bestellen | wie heute („Anfrage eingegangen“) |
| Beispielseite oder Entwurf ohne Server | Reservieren + Bestellen, dazu die Vorschau-Leiste der Seite | „Vorschau – nichts gesendet“ + Hinweis, wohin es auf der fertigen Seite geht |
| nur Telefon bekannt, kein Formular gewollt | Anrufen | – |
| Link auf ein externes Reservierungssystem (später, Dashboard-Feld) | Reservieren als externer Link | – |
| nichts davon | keine Aktion; kein Knopf ohne Ziel | – |

**Offene Entscheidung für dich:** Sollen Beispiel- und Entwurfsseiten die Formulare als
ehrliche Vorschau behalten, damit der Wirt den Ablauf sieht? Das ist mein Vorschlag. Oder
sollen die Aktionen dort ganz entfallen?

### E.3 Absicherung

- **Funktionsvertrag:** `pruefeFunktionsVertrag()` bleibt Gate im Bau. Neue Markup-Teile
  ergänzen den Vertrag, sie ersetzen ihn nicht.
- **Tests nach jedem Paket:** `npm test` vollständig, insbesondere:
  - `v2-e2e`, `v2-artdirection-e2e` (Browser: bestellen, reservieren, Wirt-Dashboard,
    Telegram gemockt)
  - `wirtServer`, `publishSite`, `veroeffentlichung`, `v2-integration`, `dashboardAuth`,
    `landingPageGenerator`
- **Veröffentlichungspfad:** Er wird im Piloten nicht benutzt. `docs/` bleibt unberührt,
  bis du freigibst.

---

## F. Medienkonzept

### F.1 Vorrang (vorhandene Logik in `mediaGenerator.js`, unverändert)

1. eigene Medien des Kunden (Chat → `v2/medien/eigene.json`, Dashboard-Upload)
2. vom Inhaber freigegebene KI-Medien
3. automatisch erzeugte KI-Medien (Cache)
4. gesichtetes Stock
5. gezeichneter SVG-Platzhalter

### F.2 Regeln

- **Demo-Assets** werden sichtbar gekennzeichnet („Beispielbild“ bzw. „KI-generiert“). Die
  Kennzeichnung existiert, sie wird im neuen Hero nur ruhiger gesetzt, etwa als kleine Zeile
  am Bildrand.
- **Haus-, Team- und Raumplätze** zeigen nie Stock oder KI als Tatsache über ein echtes Haus.
  Fehlt das Foto, fällt der Abschnitt weg; er wird nicht aufgefüllt. Diese Regel steht schon
  im Bildplan (AD7) und wird auf den Standardpfad übertragen.
- **Gerichtsbilder** zeigen nur das genannte Gericht aus dem Katalog. Auf einer echten Seite
  sind sie als Beispiel gekennzeichnet, bis der Wirt eigene liefert.
- **Keine erfundenen Speisen, Preise, Öffnungszeiten, Gästestimmen oder Geschichten als
  Tatsache.** Die Katalog-Gerichte bleiben, was sie heute sind: gekennzeichnete Platzhalter
  auf echten Leads.
- **Pilot-Medien** landen lokal (`v2/medien/eigene/beispiel-bayerisch/`) und werden beim Bau
  in den Seitenordner kopiert (`schreibeSite()` tut das bereits). Kein Hotlink, die Seite
  funktioniert offline.

### F.3 Checkliste für echte Kunden (Handy genügt)

- 2 ruhige Videos à 10–15 s, je quer und hoch, Kamera still, kein Ton:
  - Gastraum leer im Tageslicht
  - Teller am Pass oder Zapfhahn
- Außenansicht bei Tag
- 3 Lieblingsgerichte von der Seite bei Fensterlicht
- Hände bei der Arbeit
- Team nur mit Einverständnis, sonst weglassen

### F.4 Technische Vorgaben und Budget

- **Hero-Video:** H.264 (MP4), ohne Tonspur, 8–10 s, nahtlose Schleife, 24–25 fps.
  Desktop 1920×1080 ≤ 3 MB, Mobil 1080×1920 oder 1080×1350 ≤ 1,5 MB. Die Kompression
  übernehme ich (ffmpeg ist in der Sitzung verfügbar).
- **Poster:** aus dem ersten Frame, Desktop ≤ 250 KB, Mobil ≤ 120 KB.
- **Seitengewicht** beim ersten Laden ohne Video: ≤ 1 MB. Höchstens 2 Schriftfamilien.

Die Generierungs-Prompts für den Piloten stehen in **J.3**.

---

## G. Visuelle Prüfung

**Werkzeuge (am 24.09. in dieser Umgebung geprüft):**
- `v2/build/browser.js`, `starteBrowser()` mit `/opt/pw-browsers/chromium`
- `v2/build/screenshot.js`, `fotografiere()` für Desktop, Mobil und ganze Seite

Beides läuft. **Einschränkung:** Externe Bilder (Unsplash) und die Referenzseiten sind hier
gesperrt. Deshalb arbeitet der Pilot mit lokalen Medien, und für Vorher-Bilder mit Fotos
braucht es eine Netzfreigabe oder einen Lauf auf deinem Rechner.

**Je Runde:**
1. **Vorher/Nachher:** Baseline aus AP0 gegen die Pilotrunde. Desktop 1440 und 1920,
   Mobil 390 und 360; erster Bildschirm und ganze Seite.
2. **Scroll-Sequenz:** 5 Frames über die Hero-Höhe (Slogan, Kopfzeile, Atmosphäre).
3. **Robustheit:** Slow 4G, ohne Video, reduzierte Bewegung, JavaScript aus. Dazu die
   vorhandenen Zustände (mobile Navigation, Formularfehler, Reservierung bestätigt,
   Warenkorb, Bestellung bestätigt).
4. **Automatisch:** vorhandene Prüfungen aus `screenshotReview.js` (Überläufe, abgeschnittene
   Bedienelemente, Kontrast, Fokus, Touch-Ziele, Skriptfehler, CLS/LCP) plus Unveränderungs-Test.
5. **Designkritik (schriftlich):**
   - was wie ein echtes Haus wirkt
   - was noch nach Vorlage aussieht
   - Vergleich mit den Referenz-Prinzipien (nicht mit deren Pixeln)
   - höchstens 5 Änderungen für die nächste Runde
6. **Tauschprobe** (`v2/build/tauschprobe.js`): Die Gestaltung des Piloten mit den Inhalten
   einer anderen Küche darf nicht gleich plausibel bleiben.

---

## H. Rollout

1. **Pilot:** `beispiel-bayerisch` / `gesellig`. Zwischenfreigabe nach AP3 (erster
   Bildschirm), Endfreigabe nach AP9.
2. **Drei Archetypen (AP10):** `handwerk`, `editorial`, `kino` an je einer Beispielseite.
   Freigabe je Seite.
3. **Übrige Küchen (AP11):**
   - Standard-Zuordnung B.3
   - erst Beispielseiten
   - dann echte Leads **einzeln** über das Dashboard
4. **Kein Massenbuild und kein `publish-site` ohne `--only` vor Stufe 3.** Veröffentlichung
   immer je Seite nach deiner Freigabe.

---

## I. Rückfallstrategie

- **Arbeitsbranch:** `claude/stoic-cray-blbbfp`; kein Push auf `main`.
- **Opt-in:** Ohne `ausdruck` baut v2 Byte für Byte wie heute (Unveränderungs-Test aus AP0).
  Rückbau heißt: Feld entfernen.
- **Marker:** `<meta name="v2-ausdruck">` zeigt je Seite, ob sie neu gebaut ist;
  `engine-status` kann das später auswerten.
- **Baseline-Screenshots** aus AP0 als Vergleich und Beleg.
- **Kleine Commits**, eins je Paket bzw. Teilschritt, jeweils mit grünem `npm test`.
- **Veröffentlichte Seiten:** `docs/` wird nicht geschrieben. Keine bereits veröffentlichte
  Demo wird überschrieben. Pilot-Ausgaben liegen in `v2/output/piloten-ausdruck/`.
- **Designsystem-Dateien:** Nur die des Piloten ändern sich (siehe A.4.4). Andere werden
  nicht neu erzeugt.

---

## J. Offene Inputs von dir

### J.1 Referenzmaterial – zwei Wege, einer genügt

**Weg A (empfohlen, am wenigsten Arbeit für dich):** Gib in den Netzwerk-Einstellungen der
Umgebung diese Domains frei:
- `zumarestaurant.com`, `bigmammagroup.com`, `brindisatapas.com`, `blackbearburger.com`
- `images.unsplash.com` (für Vorher-Bilder)

Dann nehme ich reproduzierbare Frames selbst auf: Desktop, Mobil, reduzierte Bewegung,
Scroll-Sequenz.

**Weg B:** Du lieferst 8 Bilder bzw. Aufnahmen.

| # | Was | Format |
|---|---|---|
| 1 | Zuma **Mobil**: kurze Bildschirmaufnahme (10–15 s), langsam vom Seitenanfang über die ersten zwei Bildschirme scrollen | Hochformat-Video |
| 2 | Zuma Mobil: geöffnetes Menü | Screenshot |
| 3 | Zuma: Weg zur Reservierung (Startseite → wo steht „Reservieren“?) | 1–2 Screenshots |
| 4 | Big Mamma Mobil: erster Bildschirm | Screenshot |
| 5 | Big Mamma: ein Abschnitt, der Wärme/Leute zeigt | Screenshot Desktop |
| 6 | Black Bear Burger Mobil: erster Bildschirm | Screenshot |
| 7 | Black Bear Burger: Karte bzw. Bestellweg | Screenshot Mobil |
| 8 | Brindisa: Abschnitt zu Zutaten oder gemeinsamem Essen | Screenshot Desktop |

Die Zuma-Desktop-Aufnahme hast du schon geliefert (siehe J.4). In der Tab-Leiste deiner Aufnahme
ist außerdem **Wahaca** offen. Wenn das auch eine Referenz ist, sag kurz, wofür.

### J.2 Entscheidungen

1. Pilot `beispiel-bayerisch` / `gesellig` bestätigen, oder die Alternative
   `beispiel-italienisch`.
2. Namen der Ausdrucksweisen (`kino`, `gesellig`, `handwerk`, `editorial`) in Ordnung?
3. E.2: Beispielseiten behalten eine ehrliche Formular-Vorschau (mein Vorschlag).
4. Freigabe für AP1: berührt die Texte im Demo-Zweig von `PAGE_SCRIPT` in `src/`.

### J.3 Medien für den Piloten mit Generierungs-Prompts

Alles wird auf der Seite als **„Beispielbild · KI-generiert“** gekennzeichnet. Keine
erkennbaren Gesichter, keine Schrift, keine Logos. Das Lindenblatt-Motiv zeichne ich selbst
als SVG; dafür brauche ich nichts.

**P1 – Hero-Video Desktop** · 16:9, 1920×1080, 8–10 s, Schleife, ohne Ton · Einsatz:
Bühne des ersten Bildschirms

```
Slow, steady camera push-in (about one meter) through the dining room of a traditional
Bavarian village inn in late-afternoon sunlight. Light scrubbed wooden tables, simple linen
table runners, a green tiled stove in the background, deep window niches with soft sunlight
and faint dust in the air. On the nearest table a freshly served plate of roast pork with a
potato dumpling and dark gravy steams gently, a half-litre glass of lager beside it. No
people in focus; at most one blurred figure passing far in the background. Natural, warm but
not orange colour grading, documentary realism, shallow depth of field, calm and quiet, room
for a short headline in the upper third. Seamless loop.
Negative: text, lettering, logo, signage, watermark, Oktoberfest tent, costumes, lederhosen,
dirndl, cartoon, CGI look, neon, luxury fine-dining styling, oversaturated, faces in focus,
fast camera movement.
```

**P2 – Hero-Video Mobil** · 9:16, 1080×1920, 8–10 s · Einsatz: Hochformat-Bühne

```
Same scene and light as P1, framed vertically: the steaming plate and beer glass sit in the
lower-middle third, the window niche with sunlight in the upper third (kept calm and fairly
even for a headline). Very slow push-in, locked horizon, seamless loop.
Negative: wie P1.
```

**P3 – Rückfall-Standbilder** (falls kein Video-Generator verfügbar) · 16:9, 3000×1688, und
4:5, 1600×2000 · Einsatz: Hero-Poster

```
Still photograph, same description as P1 (and P2 for 4:5), captured at the moment the steam
rises from the plate. Documentary, natural window light, 35mm look.
```

**P4 – Biergarten unter der alten Linde** · 3:2, 2400×1600 · Einsatz: Raum-Band („gesellig“)

```
Beer garden of a Bavarian village inn beneath one large, old linden tree on a late-summer
evening. Simple wooden tables and benches on fine gravel, a string of warm bulbs through the
branches, dappled light. A few guests small and blurred in the distance, no recognisable
faces. Documentary, natural light, calm, unstaged.
Negative: text, logo, Oktoberfest, costumes, crowds, flash, HDR look, oversaturated.
```

**P5 – Schweinsbraten mit Knödel** · 4:5, 1600×2000 · Einsatz: „Heute auf dem Tisch“

```
Roast pork with crackling, one potato dumpling and dark beer gravy on a plain white inn
plate, on a light wooden table, soft side window light, 45-degree angle, realistic home-style
portion, a linen napkin and simple cutlery only. Documentary food photography, no styling
tricks.
Negative: garnish towers, microgreens, slate plates, dark moody studio, text, logo.
```

**P6 – Forelle Müllerin** · 4:5, 1600×2000 · wie P5, Gericht: *pan-fried whole trout
„Müllerin“ with brown butter, parsley potatoes and a lemon wedge*.

**P7 – Wiener Schnitzel vom Kalb** · 4:5, 1600×2000 · wie P5, Gericht: *thin breaded veal
schnitzel with lemon wedge, potato-cucumber salad in a small bowl*.

**P8 – Hände in der Küche** · 4:5, 1600×2000 · Einsatz: kurzer Abschnitt „Küche“, als
Beispiel gekennzeichnet

```
Close-up of a cook's hands shaping potato dumplings on a floured wooden board in a rustic inn
kitchen, window light, no face visible, apron and sleeves only. Documentary.
Negative: text, logo, gloves, stainless-steel industrial look, faces.
```

Lieferung als Datei hier im Chat. Ich lege sie unter `v2/medien/eigene/beispiel-bayerisch/`
ab, trage sie in `v2/medien/eigene.json` ein und komprimiere und schneide sie zu.

### J.4 Was ich aus deiner Zuma-Aufnahme ableite – und was nicht

Aufnahme: Desktop, 1920×1032, 14,4 s, 30 fps, von Hand gescrollt. Ausgewertet als Einzelbilder
(2 je Sekunde, dazu 4 je Sekunde in den ersten 3 s). **Nicht** ableitbar: exakte Kurven,
Dauern, Parallax-Faktoren, Pixelabstände und alles zum Mobil-Verhalten. Handgescrollte 30 fps
reichen dafür nicht.

**Beobachtet:**
- **Erster Bildschirm:**
  - Ein Video (dunkler Innenraum, beleuchtete Treppe, Kamerafahrt) füllt etwa zwei Drittel
    der Höhe und läuft nach unten ins Dunkle aus.
  - Der Slogan steht in einer Zeile, klein, kleingeschrieben, zentriert im oberen Drittel.
  - Eine dünne senkrechte Linie mit Pfeil dient als Scroll-Hinweis.
  - Darunter ist schon der nächste Block angeschnitten: Wortmarke, Einordnung, drei Zeilen
    Text, Umriss-Knopf mit Pfeil.
- **Beim Scrollen** wandert der Slogan mit dem Video nach oben und verschwindet unter der
  Kopfzeile. Ob er zusätzlich ausblendet, ist in den Frames nicht sicher zu erkennen.
- **Kopfzeile:**
  - fest; Wortmarke links in der Akzentfarbe
  - rechts wenige kleingeschriebene Textlinks, einer kursiv-serifig abgesetzt, dazu ein
    Menü-Symbol
  - Auf der Startseite ist kein Reservieren-Knopf sichtbar.
  - Ein Flächenwechsel ist auf dem dunklen Grund nicht erkennbar.
- **Atmosphäre:**
  - senkrechte, blaue Licht- bzw. Vorhangstreifen, scheinbar fest hinter dem Inhalt
  - in manchen Abschnitten deutlich, in anderen zurückgenommen
- **Abschnittsfolge:** zentrierte Einleitung → Überschrift links mit Filter und 4 Bildkarten →
  zentrierte Aussage mit breitem Foto → vollbreites Bildband mit kursivem Serif-Titel →
  Bild + Text + Knopf → Fußzeile mit Wortmarke, Spalten und Newsletter.
- **Durchgängig:** ein Grundton, eine Akzentfarbe, Bildflächen ohne Rahmen und Schatten,
  sehr wenige Knöpfe.

**Übernommen werden nur Prinzipien** (in B.1/B.2 eingearbeitet):
- Medium trägt die Atmosphäre, Text ist knapp
- eine ruhige Kopfzeile mit wenigen Zielen
- eine Hintergrundebene, die Abschnitte verbindet
- wechselnde Kompositionen statt gleicher Kästen
- ein Grundton je Seite

Nicht übernommen: Farben, Treppen- und Vorhangmotiv, Wortmarke, Texte, Layout-Maße.

Big Mamma, Brindisa und Black Bear Burger konnte ich hier nicht öffnen (Netzwerksperre).
Ihre Prinzipien in B.2 stammen aus deiner Beschreibung und werden mit J.1 geprüft, bevor
AP10 beginnt.
