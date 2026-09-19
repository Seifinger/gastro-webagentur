# Perplexity-Statusdokument

Dieses Dokument fasst den Projektstand fuer Perplexity als wiederkehrenden
Sparringspartner zusammen: was im Code bereits existiert, und was mit
Perplexity besprochen, aber noch nicht als Claude-Code-Session umgesetzt ist.
Stand: 19. September 2026, 23:55 Uhr.

## Architektur-Ueberblick

- Generator: src/landingPageGenerator.js orchestriert, src/sections/*.js
  rendert einzelne Abschnitte (Header, Hero, Highlights, Menu, Testimonials,
  Reservierung, Kontakt, Footer).
- Drei Archetypen (traditionell, abendlich, hell) x zwoelf Kuechen, je drei
  ausgearbeitete Stimmungen pro Kueche (36 Welten insgesamt). Ein vierter
  Archetyp "Editorial" (Vollbild-Hero, versetztes Highlight-Raster) erbt die
  Farben der traditionellen Stimmung.
- src/betriebStore.js haelt Betriebsdaten, src/leadEdits.js die Uebersteuerungen
  je Lead (Bilder, Texte, Stimmungswahl), src/entwurfsManifest.js die Zuordnung
  Lead -> Slug -> zuletzt veroeffentlichte Engine-Version/Archetyp.
- Dashboard (src/dashboardServer.js) und Wirt-Seite (src/wirtServer.js) laufen
  standardmaessig auf 127.0.0.1, schreibende /intern/-Routen sind ueber
  DASHBOARD_TOKEN geschuetzt.

## Umgesetzte Features (chronologisch)

- Grundgenerator: 36 Stimmungswelten, WCAG-gepruefte Farbpaarungen
  (colorMath.js, boldAccent), sechs Anzeigeschriften, Byte-identisches
  Verhalten fuer die drei urspruenglichen Archetypen ueber alle Refactorings
  hinweg per Regressionstest gesichert.
- Bild-Upload & Bearbeitung: gepruefte Uploads (Typ/Groesse aus Dateikopf,
  nicht aus Content-Type), Bearbeitungsansicht mit Vorschau der vier
  Fotoplaetze, Verkleinerung auf 1800px im Browser vor dem Upload.
- Prompt-basierte Textvorschlaege: src/promptEdits.js ruft claude-opus-5 mit
  strikter Schema-Validierung (nur headline/schlagzeile/highlightBeschreibungen,
  kein HTML, keine URLs, nur existierende Gericht-IDs), Live-Vorschau vor dem
  Uebernehmen, Ratenlimit 10/Stunde/Entwurf.
- Veroeffentlichung: src/publishSite.js + src/veroeffentlichung.js bauen,
  committen und pushen einen einzelnen Entwurf nach docs/<slug>/ (granularer
  --only-Modus statt komplettem docs/-Neuaufbau), inklusive Lokalisierung
  eigener Fotos fuer GitHub Pages. Dashboard-Knopf "Diesen Entwurf
  veroeffentlichen" mit Live-URL-Ausgabe.
- Lokale Live-Vorschau (src/previewServer.js): baut einen Entwurf nach
  .preview/<slug>/, Reload per SSE bei Aenderungen, kein Git-Befehl.
- Resonanzmessung: cookieloses Signal (Oeffnung, gerundete Verweildauer,
  Reservierungssektion erreicht) per sendBeacon an einen oeffentlichen
  Collector (src/resonanzServer.js), Nachfassliste im Dashboard. Datenschutzarm
  per Design: keine IP, kein User-Agent, keine Wiedererkennung ueber Entwuerfe
  hinweg.
- Dashboard-Sicherheit: DASHBOARD_TOKEN fuer schreibende Routen, Bindung an
  127.0.0.1 statt 0.0.0.0.
- Hero-Signaturen: eigene Animationen fuer Syrisch (Minztee-Guss) und
  Griechisch (schaukelnder Olivenzweig) statt geteilter Signaturen mit
  Tuerkisch/neutraler Diashow.
- Motion/Farbe/Editorial-Ausbau (Phasen 3-5): zeilenweiser Ueberschriften-
  Auftritt, Bild-Zoom und Unterstrich nur bei Hover-faehigen Geraeten,
  Video-Hero mit Bild-Fallback, automatisch abgeleitetes accentBold
  (4.5:1-Kontrastziel), vierter Archetyp Editorial.
- Engine-Versionierung: jede erzeugte Seite traegt Marker (engine-version,
  engine-archetype) im head; "npm run engine-status" zeigt, welche Kundenseite
  noch auf einer alten Fassung steht.

## Mit Perplexity besprochen, noch nicht umgesetzt

Diese Themen wurden in der Session vom 19.09.2026 durchgeplant (inklusive
fertiger Claude-Code-Prompts), aber wegen knappem Wochenbudget (nur noch
~25% bis Dienstag-Reset) noch nicht in Auftrag gegeben:

1. **Wirt-Benachrichtigungen bei neuer Bestellung/Reservierung.** Geplant:
   kostenlose Web-Push-Benachrichtigungen (PWA, "Zum Home-Bildschirm
   hinzufuegen") als Standardkanal, Telegram-Bot als kostenloser Fallback
   fuer weniger technikaffine Wirte, dazu eine Mindestwartezeit-Einstellung
   im Dashboard (additiver Aufschlag auf neu berechnete Abholzeiten) und ein
   optionaler SMS/E-Mail-Hinweis an Kunden bei Verzoegerung. WhatsApp/SMS als
   Hauptkanal bewusst verworfen wegen laufender Kosten pro Nachricht.

2. **Eigene Kundendomain statt gemeinsamer GitHub-Pages-Adresse.** Da GitHub
   Pages nur eine Custom Domain pro Repository erlaubt, ist der geplante Weg:
   pro zahlendem Kunden ein eigenes, schlankes Repo (nur der fertige
   docs/<slug>/-Ordner als Root plus CNAME-Datei), eigenes GitHub Pages mit
   der Kundendomain, DNS-Konfiguration beim Kunden (A-Records oder CNAME auf
   <username>.github.io). Fuer den ersten Kunden manuell umsetzbar ohne
   Claude-Code-Budget; Automatisierung erst bei mehreren Kunden pro Woche
   sinnvoll.

3. **Lernendes Wartezeit-System + No-Show-Schutz.** Zwei getrennte, aber im
   selben Auftrag geplante Funktionen:
   - Wartezeit-Lernsystem: Nachschlagetabelle pro Betrieb ueber Wochentag x
     Zeitfenster x Auslastungsstufe, gleitender Durchschnitt aus der
     Abweichung zwischen versprochener und tatsaechlicher Fertigstellungszeit,
     mindestens 5 Beobachtungen pro Zelle vor Wirkung. Die bestehende manuelle
     Zusatz-Wartezeit bleibt immer additiv und wird vom Lernsystem nie
     ueberschrieben.
   - No-Show-Schutz: aktive Checkbox-Zustimmung zu einer Ausfallpauschale bei
     Bestellung (mit gespeichertem Zustimmungstext und Zeitstempel als
     Nachweis, da der Wirt im Streitfall die Beweislast traegt), faires
     Stornofenster, Dashboard-Knopf "Kunde nicht erschienen" der eine
     PDF-Rechnung erzeugt und per E-Mail versendet, Zuverlaessigkeits-Zaehler
     pro Telefonnummer als Warnhinweis fuer den Wirt (keine automatische
     Blockade).

4. **Design-Ueberarbeitung gegen "AI-Slop"-Optik.** Die generierten Seiten
   wirken laut Rueckmeldung noch zu erkennbar KI-generiert. Geplant: Audit
   gegen eine konkrete Slop-Checkliste (generische Schrift, Lila-Verlaeufe,
   immer gleiche Dropshadow-Karten, durchgehend symmetrische Layouts,
   einheitliche Easing-Kurven), feste DESIGN.md-Tokendateien je Archetyp als
   Leitplanke, genau ein bewusster visueller Hoehepunkt pro Archetyp statt
   gleich verteilter Bewegung, gezielte Asymmetrie in einzelnen Sektionen,
   Ausweitung der handgezeichneten SVG-Signaturen (heroSignature.js) auf
   weitere wiederkehrende Stellen. Empfohlenes Modell: Claude Fable 5.1 (auf
   Layout/Animation/visuelle Wirkung spezialisiert), sonst Opus 5.

## Hinweis zum Vorgehen

Bei knappem Wochenbudget gilt: Sessions werden nach Prioritaet in Teilschritten
geplant, jeder abgeschlossene Teilschritt wird sofort committet, damit ein
Budget-Abbruch nie einen halbfertigen, nicht getesteten Zwischenstand
hinterlaesst. npm test muss nach jedem Teilschritt vollstaendig gruen sein.
