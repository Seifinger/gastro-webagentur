# Dashboard online betreiben

**Stand:** 24.09.2026. Die Preise stammen aus Suchergebnissen und sind vor der Buchung auf der Anbieterseite zu prüfen.

GitHub Pages liefert nur die **fiktiven Beispielseiten** aus (`main:/docs`); Konzept-Demos echter Betriebe werden seit 25.09.2026 nicht mehr veröffentlicht (`src/oeffentlichkeit.js`, README „Was öffentlich ist“). Das Dashboard ist ein Node-Server mit Dateispeicher (`data/`), Git-Push und API-Schlüsseln. Es braucht einen eigenen Host, auf dem es serverseitig geschützt läuft.

## Architekturvergleich

| | A) Bestehender Node-Server auf einem Container-Host mit Volume | B) Serverlos (z. B. Cloudflare Workers + R2/D1 + Access) |
|---|---|---|
| Umbau | klein: Dockerfile, Startskript, Login (vorhanden) | groß: Der Server nutzt `fs`, `git` und `child_process`; alle Speicher und das Publishing müssten neu geschrieben werden |
| Persistenz | Volume unter `/data` (Git-Klon inkl. `data/`, Uploads, Vorschauen) | neue Datenhaltung nötig |
| Anmeldung | eingebauter Login (scrypt, Sitzung, CSRF-Schutz), optional Cloudflare Access davor | Access vorgeschaltet |
| Secrets | Umgebungsvariablen des Hosts | Worker-Secrets |
| Wartung | ein Container, Update = Neustart (`git pull` beim Start) | mehrere Dienste |
| **Ergebnis** | **gewählt** | für dieses Repo nicht sinnvoll |

### Host für A

| Host | Kosten/Monat (ca.) | Persistenz | Bemerkung |
|---|---|---|---|
| **Fly.io** (empfohlen) | shared-cpu-1x: 256 MB ≈ $2, 512 MB etwas mehr (RAM $6/GB ab 1.10.2026), Volume $0,15/GB | Volume | keine kostenlose Stufe mehr, Kreditkarte nötig; `fly.toml` liegt bei |
| Render | Starter $7 + Disk $0,25/GB | Disk nur auf bezahlten Instanzen | Free-Tier schläft nach 15 Min. und hat keine Disk – ungeeignet |
| Eigener VPS (z. B. Hetzner) | ab ca. €4–5 | lokale Platte | billig, aber Betriebssystem, TLS und Updates liegen bei dir |

Quellen:
- [Fly Pricing](https://fly.io/docs/about/pricing/) und [Fly Pricing-Update Oktober 2026](https://fly.io/pricing-update/)
- [Render Pricing (Kuberns-Übersicht)](https://kuberns.com/blogs/render-pricing/) und [Render: Free Tier ohne Disk](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026)
- [Hetzner Preisänderungen](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)

## Sicherheit
- **Passwort:** Nur der scrypt-Hash steht in `DASHBOARD_PASSWORT_HASH`, erzeugt mit `npm run dashboard:passwort`. Nichts davon liegt im Repo oder im Browsercode.
- **Anmeldepflicht:** Mit gesetztem Hash verlangt **jede** Route eine Sitzung – Seiten, `/api/leads`, Demo-Daten, Vorschauen und alle Schreibaktionen. Einzige Ausnahmen sind `/anmelden` und `/gesund`.
- **Sitzung:** zufällige ID im Serverspeicher. Das Cookie ist `HttpOnly`, `SameSite=Strict` und `Secure` hinter HTTPS. Es gilt 12 Stunden; ein Neustart meldet ab.
- **CSRF:** Schreibende Anfragen werden nur von derselben Herkunft angenommen (Origin- bzw. Referer-Prüfung).
- **Fehlversuche:** Nach 10 falschen Passwörtern in 15 Minuten ist die Adresse vorübergehend gesperrt.
- **GitHub-Token:** fine-grained, nur für dieses Repo, Berechtigung „Contents: Read and write“. Er steht nur in der Umgebungsvariable; Git holt ihn über einen Credential-Helper und schreibt ihn nicht in `.git/config`.
- **Abgrenzung zu den Demos:** Die öffentlichen Demos liegen auf einer anderen Domain (github.io). Das Dashboard sendet keine CORS-Header, und das Sitzungs-Cookie geht wegen `SameSite=Strict` nicht mit. Die Demos kommen also weder an Dashboard-APIs noch an Lead-Daten.
- **Optional:** Cloudflare Access oder Tailscale als zusätzliche Schicht vor der Domain.

## Was du einrichten musst (Fly.io)
1. **Fly-Konto und CLI:** Konto anlegen (Kreditkarte nötig) und `flyctl` installieren.
2. **App anlegen:** Im Repo `fly launch --no-deploy`. Den App-Namen in `fly.toml` übernehmen.
3. **Volume:** `fly volumes create dashboard_daten --region fra --size 1`
4. **GitHub-Token:** Unter GitHub → Settings → Developer settings → Fine-grained tokens einen Token nur für `Seifinger/gastro-webagentur` mit „Contents: Read and write“ anlegen.
5. **Secrets setzen:**
   ```
   npm run dashboard:passwort          # Hash kopieren
   fly secrets set DASHBOARD_PASSWORT_HASH='scrypt$…' GITHUB_TOKEN='github_pat_…' \
     GOOGLE_PLACES_API_KEY='…' ANTHROPIC_API_KEY='…'
   ```
6. **Deploy:** `fly deploy`. Danach `https://<app>.fly.dev/` öffnen und anmelden.
7. **Lead-Daten übertragen:** `data/output/*.csv` (Leads), `data/kuechen.json`, `data/stimmungen.json`, `data/lead-edits/`, `data/landingpages/entwuerfe.json` und `public/uploads/` einmalig auf das Volume kopieren, z. B. mit `fly ssh sftp shell` nach `/data/repo/...`. Die Lead-Suche (`npm start`) läuft danach per `fly ssh console` im Container.
8. **Optional:** eigene Domain mit `fly certs add dashboard.deine-domain.de`.

**Offen, weil Zugänge fehlen:** Einen echten Online-Test (Deploy, Login über HTTPS, Push nach `main`, Auslieferung durch Pages) konnte ich ohne Fly-Konto und ohne GitHub-Token nicht machen. Lokal geprüft ist das Startskript mit Klon, `npm ci`, Start, `/gesund`, Login und dem Token außerhalb der Repo-Konfiguration. Das Image selbst konnte ich nicht bauen, weil in dieser Umgebung kein Docker-Daemon läuft.

## Veröffentlichen vom Host aus (abgeschaltet für Lead-Demos)

> Seit 25.09.2026 lehnt der Ablauf jeden Lead-Slug ab (410 im Dashboard). Er bleibt nur als Grundlage für einen späteren Kunden-Workflow (Typ C) im Code. Eine online abrufbare, geschützte Vorschau für einen Lead wäre auf diesem Host möglich (Sitzung + Freigabe je Lead, serverseitig geprüft) – umgesetzt ist bisher nur die Präsentation im WLAN.

Der Knopf „Speichern und veröffentlichen“ läuft so ab:
1. Die Demo wird in einen Temp-Ordner gebaut und erst nach vollständigem Bau nach `docs/<slug>` getauscht.
2. Danach folgen `git commit`, `git pull --rebase` und `git push` nach `main`.
3. GitHub Pages baut die Seite, meist in 1 bis 3 Minuten.
4. Das Dashboard ruft `https://…/<slug>/?pruefung=<build-id>` ab, bis die neue Build-ID ausgeliefert wird, höchstens 15 Minuten lang. Erst dann steht der Status auf „online“.
5. Das CDN von Pages hält Seiten bis zu 10 Minuten. Wer die normale URL ohne Parameter lädt, sieht die neue Fassung deshalb unter Umständen erst nach dieser Zeit.
