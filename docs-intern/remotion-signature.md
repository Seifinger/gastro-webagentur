# Remotion-Player: Live-Animation, opt-in

Stand: hinzugefügt auf ausdrücklichen Wunsch, um Remotion
(https://www.remotion.dev/docs) für Animationen innerhalb der generierten
Seiten nutzbar zu machen. Diese Datei hält fest, was es tut, was es kostet
und warum es so und nicht anders gebaut ist – wer das nächste Mal daran
weiterbaut, soll nicht dieselben zwei Bugs wieder einbauen, die hier beim
Verifizieren aufgefallen sind (siehe „Zwei echte Bugs" unten).

## Was Remotion tatsächlich ist

Remotion ist kein Animations-Runtime für Webseiten, sondern ein
**Video-Renderer**: React-Komponenten werden über Node.js, einen Bundler,
einen Headless-Browser und ffmpeg zu echten Videodateien gerendert
(`@remotion/cli`, `@remotion/renderer`). Das ist in diesem Projekt **nicht**
im Einsatz.

Was hier läuft, ist ausschließlich **`@remotion/player`** – eine
React-Komponente, die eine Remotion-Komposition live im Browser abspielt,
per `requestAnimationFrame`, ohne dass irgendwo eine Videodatei entsteht.
Kein ffmpeg, kein Headless-Chrome, kein Node-Rendering zur Laufzeit. Trotzdem
bleibt die Grundvoraussetzung bestehen: Es ist React, mit allem, was React
an Laufzeitgewicht mitbringt.

## Die Architektur-Entscheidung

Das Projekt ist sonst durchgehend Zero-Build: Seiten entstehen als
Template-Literal-Strings, es gibt keinen Bundler, keinen JSX-Transform,
keine Laufzeit-Abhängigkeit außer Vanilla-JS. Remotion und React brechen
damit – das war die ausdrückliche Entscheidung im Gespräch, nicht ein
Kompromiss aus Versehen.

Damit dieser Bruch möglichst klein bleibt:

- **Ein einziger, klar abgegrenzter Build-Schritt** (`scripts/buildRemotionPlayer.mjs`,
  `npm run build:motion`) statt eines projektweiten Bundlers. Der
  Seiten-Generator (`landingPageGenerator.js`) bleibt Zero-Build; er
  referenziert nur das fertige Bündel.
- **Self-hosted, kein CDN.** `docs/assets/motion/signature-player.js` ist
  eine einzige, committete Datei – dieselbe Haltung wie bei Schriften
  (`fontLibrary.js`) und Bildern (`imageLibrary.js`): offline nutzbar, kein
  externer Request zur Laufzeit.
- **Opt-in über eine Generator-Option, kein Preset-Feld.**
  `options.remotionSignature` in `buildLandingPage()`, nicht in
  `designPresets.js`. Damit bleibt jede der 48 veröffentlichten Seiten ohne
  die Option Zeichen für Zeichen dieselbe – kein Preset-Feld hätte das ohne
  erheblich mehr Threading durch `ARCHETYP_PRESET`/`DESIGN_PRESETS`
  geleistet.
- **Ein einziger Ort auf der Seite, kein zweiter Datensatz.** Die Animation
  läuft im Siegel der Hausempfehlung (`.hl-siegel`, erste Highlight-Karte),
  demselben Platz, den die statische Küchenmarke aus `signaturIcons.js`
  ohnehin schon hat. Die `d`-Attribute kommen zur Laufzeit direkt aus dem
  serverseitig gerenderten `<svg>` (siehe `src/motion/mount.jsx`) – keine
  zweite Kopie der Pfaddaten, keine Drift zwischen statischer und animierter
  Fassung möglich.

## Was es kostet – ehrlich, nicht schöngerechnet

Gemessen (`node scripts/buildRemotionPlayer.mjs`, dann `gzip -c … | wc -c`):

| | roh (minifiziert) | gzip |
|---|---|---|
| `signature-player.js` | 522 kB | 168 kB |

Zum Vergleich: Das gesamte CSS+JS einer normalen Seite dieses Projekts liegt
bei rund 20–50 kB gzip. Dieses eine Bündel wiegt damit das Drei- bis
Achtfache einer kompletten Seite. Aufgeschlüsselt (`esbuild`-Metafile):

| Anteil | kB (minifiziert) |
|---|---|
| `remotion` (Kern: Timeline, Kompositions-Kontext) | 206 |
| `react-dom` (Client-Renderer) | 201 |
| `@remotion/player` | 59 |
| `remotion/no-react` (Hilfsfunktionen) | 36 |
| `react` | 8 |
| eigener Code (`mount.jsx`, `RemotionSignature.jsx`) | < 2 |

Das lässt sich nicht sinnvoll wegoptimieren, solange `@remotion/player`
läuft – es bringt `remotion` als Abhängigkeit zwingend mit. Der einzige
Hebel, den dieses Projekt zieht, ist **Lazy Loading**: Ein winziges
Inline-Skript (`remotionBootstrapScript()` in `landingPageGenerator.js`)
lädt das Bündel erst per `IntersectionObserver`, kurz bevor die Marke ins
Bild kommt (`rootMargin: 200px`). Wer die Seite nie bis zu den Highlights
scrollt, lädt die 168 kB nie.

**Zum Vergleich, was dieselbe Wirkung in reinem CSS kostet:** Das
traditionelle und das Abendhaus zeichnen ihre Bierkrug- bzw.
Küchensignatur-Animationen bereits per CSS (`stroke-dashoffset` +
`@keyframes`/`animation-timeline: view()`) – für Bruchteile eines
Kilobytes, ohne jede Laufzeit-Abhängigkeit. Diese Remotion-Integration
liefert **dieselbe sichtbare Wirkung** (Strich-für-Strich-Zeichnen, ein
Einrasten am Ende) zu einem drei- bis vierstelligen Vielfachen des
Gewichts. Der Wert von Remotion liegt nicht in dieser einen Animation,
sondern darin, dass komplexere, sequenzierte Choreografien (mehrere
Elemente, `spring()`-Physik, später auch echte Videos aus derselben
Komposition) mit React-Werkzeugen statt handgetimten CSS-Prozentsätzen
gebaut werden können. Für eine einzelne, immer gleich lange Marke ist das
ein hoher Preis für einen kleinen Gewinn – wert, das beim nächsten
Einsatzzweck gegeneinander abzuwägen, nicht stillschweigend vorauszusetzen.

## Lizenz

Remotion ist lizenzpflichtig für Unternehmen ab einer bestimmten Größe
(`node_modules/remotion/LICENSE.md`): kostenlos für Einzelpersonen,
Non-Profits und Unternehmen bis 3 Beschäftigte; größere brauchen eine
Company License. „gastro-webagentur" ist eine Web-Agentur – ob die
Eligibility-Kriterien zutreffen, ist eine Geschäftsentscheidung, keine
technische. Der Player zeigt bei jedem Start einen Konsolen-Hinweis darauf
(`Note: Some companies are required to obtain a license…`); dieser Hinweis
wurde bewusst **nicht** über `acknowledgeRemotionLicense` unterdrückt, damit
er sichtbar bleibt, bis das geklärt ist.

## Zwei echte Bugs, beim Verifizieren gefunden (nicht nur behauptet)

Wie beim Rest dieses Projekts gilt: „Animation eingebaut" heißt nicht
„funktioniert" – erst eine echte Playwright-Messung im Browser zählt. Zwei
Bugs sind dabei aufgefallen und behoben:

1. **`moveToBeginningWhenEnded` (Remotion-Standard: `true`).** Ohne diese
   Prop sprang der Player nach dem letzten Frame auf den ersten zurück – die
   Marke stand am Ende wieder ungezeichnet da. Genau das Gegenteil von „eine
   Bewegung, dann Ruhe", der Bewegungsphilosophie, die für den Rest der
   Seite gilt. Fix in `mount.jsx`: `moveToBeginningWhenEnded={false}`.
2. **`width: 100%` in einem `inline-flex`-Elternelement.** Die Bühne
   (`.remotion-stage`) bekam per Prozentwert keine aufgelöste Breite (0 px),
   obwohl die Höhe korrekt stimmte – Chromiums Flexbox-Verhalten für
   Hauptachsen-Breite bei einem einzelnen Kind ohne `flex-grow`. Der Player
   rechnete daraufhin mit einer 0×0-Bühne und rendert seine Komposition
   dann in voller, unskalierter Größe (112×112 px) irgendwo anders auf der
   Seite – unsichtbar im eigentlichen Siegel. Fix: `.remotion-mount` ist
   jetzt `display:inline-block; position:relative` mit fester `em`-Größe,
   `.remotion-stage` liegt als `position:absolute; inset:0` darüber –
   eindeutige Geometrie ohne Flex-Prozentrechnung.

Beide Bugs wären ohne Playwright-Messung (`getBoundingClientRect()` auf
Bühne/Marke, Dashoffset vor/nach dem Laden, Screenshot) unentdeckt
geblieben – die Seite hätte optisch „funktioniert" ausgesehen (keine
JS-Fehler in der Konsole), nur eben nichts Sichtbares getan.

## Erweitern

- **Eine neue Komposition** kommt als weitere Datei unter `src/motion/`
  (Vorbild: `RemotionSignature.jsx`) und ein weiterer Mount-Punkt in
  `mount.jsx`. Jede zusätzliche Stelle auf der Seite kostet keine weiteren
  168 kB – das Bündel wird pro Seite nur einmal geladen –, aber jede
  zusätzliche *Komposition* vergrößert das Bündel selbst; `npm run
  build:motion` neu ausführen und die Größe erneut messen.
- **Ausrollen auf einen Archetyp** (statt der Generator-Option) hieße:
  `motion.remotionSignature` in `designPresets.js`s `BASE_DEFAULT`
  aufnehmen und in genau einem `ARCHETYP_PRESET`-Eintrag auf `true` setzen –
  das würde den Byte-Diff der betroffenen 12 Seiten bewusst brechen und
  gehört, wie jede andere solche Änderung in diesem Projekt, in einen
  eigenen, einzeln begründeten Commit.
- **Tests**: `test/remotionSignature.test.js` prüft Opt-in-Verhalten
  (Default unverändert, Markup nur mit Option, nur wo Handschrift + Marke
  existieren). Ein Playwright-Lauf gehört *nicht* in `npm test` (Playwright
  ist nur global installiert, nicht als Projekt-Abhängigkeit) – vor jeder
  weiteren Änderung an `mount.jsx`/`RemotionSignature.jsx` manuell über
  einen lokalen HTTP-Server verifizieren, nicht über `file://` (ES-Module-
  `import()` wird dort von Chromiums CORS-Regeln blockiert).
