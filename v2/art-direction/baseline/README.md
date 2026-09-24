# Baseline vor dem Gestaltungs-Umbau

Aufgenommen 2026-09-24 aus `docs/` mit `npm run v2:baseline`.
Erster Bildschirm (`--desktop.jpg`, `--mobil.jpg`), reduzierte Bewegung. Ganze Seiten (`--ganz.jpg`) nur mit `--ganz`,
für den Piloten: `npm run v2:baseline -- beispiel-bayerisch --ganz`.

| Seite | Ansicht | Bilder geladen |
|---|---|---|
| beispiel-bayerisch | desktop | 0 / 7 |
| beispiel-bayerisch | mobil | 0 / 7 |
| beispiel-cafe | desktop | 0 / 8 |
| beispiel-cafe | mobil | 0 / 8 |
| beispiel-chinesisch | desktop | 0 / 8 |
| beispiel-chinesisch | mobil | 0 / 8 |
| beispiel-griechisch | desktop | 0 / 7 |
| beispiel-griechisch | mobil | 0 / 7 |
| beispiel-indisch | desktop | 0 / 7 |
| beispiel-indisch | mobil | 0 / 7 |
| beispiel-italienisch | desktop | 0 / 7 |
| beispiel-italienisch | mobil | 0 / 7 |
| beispiel-japanisch | desktop | 0 / 7 |
| beispiel-japanisch | mobil | 0 / 7 |
| beispiel-syrisch | desktop | 0 / 5 |
| beispiel-syrisch | mobil | 0 / 5 |
| beispiel-thailaendisch | desktop | 0 / 5 |
| beispiel-thailaendisch | mobil | 0 / 5 |
| beispiel-tuerkisch | desktop | 0 / 5 |
| beispiel-tuerkisch | mobil | 0 / 5 |
| beispiel-vietnamesisch | desktop | 0 / 8 |
| beispiel-vietnamesisch | mobil | 0 / 8 |

**Einschränkung dieser Aufnahme:** In der Cloud-Umgebung vom 24.09.2026 sperrt der
Netzwerk-Proxy `images.unsplash.com`. Alle Bildflächen sind deshalb leer (siehe Spalte
„Bilder geladen“). Aufbau, Typografie, Farben und Abstände sind korrekt. Mit Freigabe
der Domain oder auf dem eigenen Rechner einfach `npm run v2:baseline` erneut ausführen.
