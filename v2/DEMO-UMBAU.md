# Umbau Lead → Demo (Stand 24.09.2026)

Neue Demos für echte Leads entstehen nur noch aus den neuen Vorlagen:
Küche → Vorlage (Ausdruck) → eines von drei Farbschemata. Lead-Suche,
Scoring, QR-Codes, Textvorschläge und die Wirt-Funktionen bleiben, wie
sie sind.

## Teil 0 – Ist-Zustand (aus Code und npm-Skripten geprüft)

| # | Frage | Befund |
|---|---|---|
| 1 | Leads und Küchenzuordnung | `npm start` → `src/index.js` → `placesClient.searchRestaurants` (Places API (New) Textsuche, FieldMask: id, displayName, formattedAddress, nationalPhoneNumber, websiteUri, rating, userRatingCount) → `leadFilter.toLead` (+ `fetchedAt`) → `websiteAnalyzer` + `scoring.scoreLead` → `csvExport` nach `data/output/*.csv` (gitignoriert). Gelesen über `csvImport.readAllLeads`. Küche: automatisch aus dem Namen (`cuisineOverrides.kuecheFuerLead`), von Hand in `data/kuechen.json` bzw. über `POST /api/kueche`. |
| 2 | Bewertung, QR, Texte | Scoring: `src/scoring.js`. QR: `GET /api/qr?url=` in `src/dashboardServer.js` (Paket `qrcode`, nur Ziele unter `SITE_BASE_URL`). Anschreiben: `src/outreach.js`. Textvorschläge: `src/promptEdits.js` (Anthropic-API, Felder headline/schlagzeile/highlightBeschreibungen), Routen `/intern/lead/:slug/prompt*`. |
| 3 | Bau und Veröffentlichung | Lokal (Dashboard „Entwurf ansehen“): `npm run pages` → v1 `buildLandingPage` nach `data/landingpages/`. Online: `npm run publish-site` → `src/publishSite.js`; je Lead Engine v1 (`schreibeSeiten`) oder v2 (`baueImZyklus`), seit AP11 für alle Küchen v2 mit Ausdruck. Einzeln: `--only <slug>` bzw. Dashboard-Knopf → `src/veroeffentlichung.js` (bauen, `git commit`, `git push`). GitHub Pages liefert `main:/docs` aus. |
| 4 | Vorlage „Wirtshaus zur Alten Linde“ | Kein eigener Vorlagen-Ordner. Sie entsteht aus `v2/build/siteBuilder.js` mit Ausdruck `gesellig` (`v2/build/ausdruck.js`), Designsystem `v2/designsysteme/bayerisch--wirtshaus.json`, Bühne/Kopf `v2/build/sektionen/buehne.js`, Stil `v2/build/buehneStil.js`, Bewegung `v2/build/bewegung.js`/`scrollSequenz.js` und den Medien `v2/medien/eigene/beispiel-bayerisch/`. Veröffentlicht unter `docs/beispiel-bayerisch/`. |
| 5 | src/ vs. v2/ | `src/landingPageGenerator.js` (v1) baut noch die lokalen Entwürfe (`npm run pages`, `/entwurf/…` im Dashboard) und liefert `PAGE_SCRIPT` (Bestellung/Reservierung), den v2 zur Build-Zeit ausliest. `v2/build/siteBuilder.js` baut alle veröffentlichten Seiten. Daneben gibt es den Kompositions-Builder `v2/build/komposition/` nur für die vier Art-Direction-Piloten (`pilot-*`), nicht für Leads. |
| 6 | Name, Adresse, Rating, Rezensionen | Alles aus der Places-API-Textsuche (siehe 1), im CSV zwischengespeichert, Frist 30 Tage (`src/leadFreshness.js`). Rezensionen werden nicht abgerufen. Rating und Anzahl landen heute im statischen HTML (`v2/build/sektionen/kopf.js` `bewertung()`, `inhalt.js`). **Rund 70 veröffentlichte Lead-Seiten unter `docs/` enthalten die Google-Note als statischen Text – in einem öffentlichen Repo.** |
| 7 | Manuelle Änderungen | `data/lead-edits/<slug>.json` (Bilder, Texte, Verlauf der letzten 10 Fassungen, `src/leadEdits.js`), `data/kuechen.json`, `data/stimmungen.json` (Farbwelt je placeId), `data/landingpages/entwuerfe.json` (Manifest placeId ↔ Slug, Veröffentlichung), `public/uploads/<slug>/`. Alles gitignoriert. Versioniert: `v2/ausdruck-wahl.json` und `v2/medien/eigene.json` (nur Beispielseiten). **Fehler aus AP11:** Die Ausdruck-Wahl je Lead wäre in `v2/ausdruck-wahl.json` gelandet, also mit dem Slug des echten Betriebs im öffentlichen Repo. Wird korrigiert (Teil 1). |
| 8 | Tests | 597 Tests, u. a. `scoring`, `leadFilter`, `csvImport`, `leadFreshness`, `promptEdits`, `publishSite`, `veroeffentlichung`, `dashboardAuth`, `stimmungsWahl`, `v2-*` (Build, Snapshot, E2E), Wirt-Server. |
| 9 | Server vs. statisch | Node-Server: `dashboardServer.js` (Leads, Bearbeiten, Veröffentlichen; Port 3000), `wirtServer.js`/`v2:wirt` (Betrieb, Telegram), `resonanzServer.js`, `previewServer.js`. Statisch: alles unter `docs/` auf GitHub Pages. Schutz heute: `DASHBOARD_TOKEN` nur für `/intern/*` und schreibende `/api/*`; **`/api/leads` und die Seiten sind ohne Anmeldung lesbar.** |

Weitere Befunde:
- Der Slug hängt am Namen (`slugify(name)-token(placeId)`), der Bestand liegt im Manifest. Wird ein Name geändert, darf der Slug **nicht** neu berechnet werden – sonst bricht der QR-Code.
- Die heutige v2-Seite für einen echten Lead zeigt eine Katalog-Speisekarte mit Preisen, erfundene Öffnungszeiten und eine erfundene Haus-Geschichte („Seit Generationen …“). Alles ist als „Platzhalter“ markiert, erfunden ist es trotzdem.

## Entscheidungen

### Datenmodell (Teil 1) – keine neue Datenhaltung
| Feld | Ort |
|---|---|
| Stabile Lead-ID | `placeId` (Google Place ID, darf dauerhaft gespeichert werden) |
| Slug/URL | Manifest `data/landingpages/entwuerfe.json` – einmal vergeben, nie neu berechnet |
| Küche | `data/kuechen.json` (bestehend) |
| Farbschema | `data/stimmungen.json` (bestehend), nur noch die **drei** Stimmungen der Küche (traditionell/abend/hell), nicht die Editorial-Varianten aus v1. Ohne Wahl gilt das Farbschema der Beispielseite |
| Vorlage | die Vorlage der Beispielseite der Küche (Ausdruck aus `v2/ausdruck-wahl.json`, sonst `STANDARD_JE_KUECHE`); eine Abweichung je Lead liegt in `lead-edits.demo.vorlage` (nicht im öffentlichen `v2/ausdruck-wahl.json`) |
| Slogan | `lead-edits.texte.slogan` (war im Builder schon vorgesehen) |
| Name/Adresse | `lead-edits.demo.name`/`demo.adresse` als `{ wert, quelle, bestaetigtAm }`. Ein Google-Abruf überschreibt nur die CSV, nie diese bestätigten Werte |
| Status, Build, Veröffentlichung | Manifest-Eintrag je Slug (`status`, `letzterBuild`, `veroeffentlichung`) |
| Verlauf | `lead-edits.verlauf` (bestehend, 10 Fassungen) |

### Google-Daten (Teil 4)
- Die Demo ist statisches HTML auf GitHub Pages. Dort ist eine rechtlich saubere, aktuelle Google-Note (Laufzeitabruf, Attribution, 30-Tage-Grenze) nicht zu leisten. **Entscheidung: Auf Demos erscheinen keine Google-Note und keine Rezensionen.** Die Note bleibt im geschützten Dashboard, auf der Demo steht nur ein Link zum Google-Maps-Profil (über die Place ID).
- **Name und Adresse** kommen aus Places. Auf der öffentlichen Demo erscheinen sie erst, wenn sie im Dashboard bestätigt sind. Die Bestätigung heißt: Du hast sie mit einer eigenen Quelle abgeglichen, etwa Impressum, Schild oder Speisekarte. Das Dashboard speichert die Quelle mit. Unbestätigt baut die Vorschau zwar, das Veröffentlichen wird aber abgelehnt.
- Die Place ID darf gespeichert und für den Maps-Link genutzt werden.
- Das ist eine technische Umsetzung der Places-Richtlinien nach bestem Wissen und keine Rechtsberatung.

### Konzept-Demo (Teil 3)
- Die Vorlage bestimmen Küche und Vorlagen-Wahl, das Farbschema kommt aus den drei Stimmungen der Küche. Gebaut wird mit `siteBuilder` und dem Ausdruck, also mit derselben Qualität wie die Beispielseiten.
- Es gibt keine erfundenen Öffnungszeiten und keine Haus-Geschichte. Die Abholzeit läuft ohne Öffnungszeiten automatisch über „bitte telefonisch“.
- Die Speisekarte bleibt als ausdrücklich gekennzeichnete **Musterkarte** („Beispielgerichte – nicht die Karte von …“). Ohne sie ließen sich Warenkorb und Bestellweg nicht zeigen. Das ist bewusst entschieden und kann auf Wunsch abgeschaltet werden.
- Medien: Eigene Uploads gibt es nur, wenn du welche bereitstellst. Sonst kommen die Konzeptbilder der Küchenrichtung (die Medien der Beispielseite), gekennzeichnet als „Konzeptbild“. Es gibt keine Fotos, die den Betrieb vortäuschen.
- Die Kennzeichnung oben und unten sagt: „Konzept-Demo – unverbindlicher Entwurf, nicht die Website von …“.

### Veröffentlichen (Teil 5)
- Zuerst wird in einen Temp-Ordner gebaut und geprüft (Gates, Funktionsvertrag). Erst dann wird `docs/<slug>` ersetzt. Ein fehlerhafter Bau lässt die Online-Fassung stehen.
- Je Slug läuft höchstens ein Bau gleichzeitig, alle Git-Schritte laufen über eine gemeinsame Warteschlange.
- Status in dieser Reihenfolge: `gespeichert` → `baut` → `wird veroeffentlicht` (Commit gepusht) → `online` (öffentliche URL liefert die neue Build-ID) bzw. `fehler` mit Ursache.

### Dashboard-Host (Teil 6)
Siehe `docs-intern/HOSTING.md`.

## Umsetzung (Stand nach dem Umbau)

| Baustein | Datei(en) |
|---|---|
| Einstellungen je Demo | `src/demoEinstellungen.js` |
| Konzept-Modus der Vorlage | `v2/build/konzept.js`, `siteBuilder.js` (`optionen.konzept`), `mediaGenerator.js` (`konzeptVon`) |
| Ein Erzeugungsweg | `v2/integration/demoBau.js` (`baueDemo`) – Dashboard-Vorschau, `publish-site --only`, Veröffentlichen-Knopf, Migration |
| Dashboard | `v2/integration/demoDashboard.js` + `demoPanel.browser.js` (in `bearbeiten.html`) |
| Veröffentlichen mit Nachweis | `src/veroeffentlichung.js` (`starteVeroeffentlichung`, `pruefeOeffentlich`) |
| Anmeldung | `src/dashboardAnmeldung.js`, `npm run dashboard:passwort` |
| Hosting | `Dockerfile`, `deploy/start.sh`, `fly.toml`, `docs-intern/HOSTING.md` |
| Migration | `npm run demo:migration -- --plan / --sichern / --vorschau <slug> / --freigeben <slug>` |

Geänderte Abläufe:
- `npm run publish-site` ohne Option baut nur noch die Beispielseiten und die Übersicht. `docs/` wird dabei nicht mehr gelöscht, Lead-Demos werden nicht mehr gesammelt überschrieben.
- `--only <slug>` baut über die neue Vorlage und veröffentlicht nur mit bestätigtem Namen.
- `npm run pages` (lokale v1-Entwürfe unter `/entwurf/…`) bleibt als alter Vorschauweg bestehen, ist aber kein Veröffentlichungsweg mehr. Die Demo-Vorschau im Dashboard läuft über „Vorschau bauen“ (`/v2/leads/<slug>/`).
- Altpfade (v1-Gestaltung, `lokalisiereEigeneBilder`, der v1-Zweig für Leads in `publishSite`) sind für Leads entfernt bzw. stillgelegt. Die v1-Dateien bleiben, solange `npm run pages` sie nutzt.

## Öffentlich vs. lokal (Stand 25.09.2026)

Ist-Befund vor der Umstellung (aus `main:/docs` geprüft): 74 Lead-Demos öffentlich, alle am 23.09. über den alten Pfad (v2 **ohne** Ausdruck) gebaut – alte Kopfzeile, Hero-Varianten `spalte-bild`/`tafel`/`passepartout`/…, Stockfoto statt Bühne, kein Video, keine Konzept-Kennzeichnung oben, Google-Note und Bewertungsanzahl im statischen HTML (74), erfundene Haus-Geschichte (46), dazu `bericht.json`/`zyklus.json` je Ordner. Frische Konzept-Demos über `baueDemo` stimmten dagegen schon mit den Beispielseiten überein (Ausdruck, Designsystem, Bühne, Video/Poster, Abfolge, Skripte). Ursache der Abweichung: Die öffentlichen Seiten wurden nach dem Vorlagen-Umbau nie neu gebaut.

Entscheidung und Umsetzung:
- Typ A (fiktive Beispiele) bleibt öffentlich; Typ B (Konzept-Demos echter Betriebe) nie in `docs/`; Typ C (Kundenwebsite) später. Durchgesetzt in `src/oeffentlichkeit.js`, geprüft in `baueImZyklus`, `baueUndSchreibeEinzelnenEntwurf`, `schreibeSeiten`, `veroeffentlicheEntwurf`/`starteVeroeffentlichung`, Dashboard-Routen (410) und `demo:migration --freigeben`.
- Altbestand: `npm run demo:migration -- --abschalten` (Sicherung nach `data/sicherung/` mit URL-Liste, Entfernen, `docs/404.html` als neutraler Hinweis, Hashes in `v2/abgeschaltete-demos.json`).
- Zeigen vor Ort: Präsentation im WLAN (`src/praesentation.js`), eine Demo, Zufallspfad, Ablauf nach 2 Stunden, QR mit LAN-Adresse. Kein Passwort, kein HTTPS, nicht im Internet – so wird sie auch benannt.
- Medien: Kennzeichnung „Konzeptmaterial“; Medienstatus (Video Desktop/Mobil, Poster quer/hoch, Herkunft, Fehlendes) im Build-Bericht und Dashboard. Videos laufen ohne ausdrückliche `wiedergabe: "schleife"` einmal und bleiben auf dem letzten Bild stehen. Konzeptmaterial kommt nur aus der Beispielseite der eigenen Küche; fehlt ein Video, steht das Poster.
- Verfügbar je Küche: Poster quer, Poster hoch, Video quer (MP4+WebM, einmal). Hochformat-Video (MP4+WebM, 1024×1536, einmal, ohne Ton) seit 25./26.09.2026 für Bayerisch, Café, Griechisch, Indisch, Italienisch, Japanisch, Syrisch und Türkisch – dort ist das Hochformat-Poster das erste Videobild, damit der Übergang nicht springt. Noch ohne Hochformat-Video (Handy zeigt das Hochformat-Poster): Chinesisch, Thailändisch sowie Vietnamesisch und Asiatisch (die die chinesischen Medien nutzen).
