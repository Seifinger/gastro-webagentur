#!/bin/sh
# Lokaler Container-Test der Wirt-App – ohne Fly-Konto, nur synthetische Daten.
#
#   deploy/wirt/lokal-test.sh [commit]      (Standard: HEAD)
#
# Baut das Image aus "git archive <commit>" (genau wie release.sh), startet es
# mit einem lokalen Ordner als Volume und prüft:
#   1. ohne Volume: startet nicht
#   2. Health-Check /gesund
#   3. interne Routen ohne Anmeldung 401, mit Anmeldung 200, fremde Origin 403
#   4. öffentliche Reservierung geht durch (synthetischer Tisch und Gast)
#   5. Neustart: Tisch und Reservierung sind noch da
#   6. sauberes Beenden (SIGTERM, Exit 0) und Speicherbedarf
# Hinter einem TLS-Proxy (z. B. Cloud-Sandbox): BUILD_CA=/pfad/zur/ca.crt setzen.
set -eu

COMMIT="${1:-HEAD}"
SHA="$(git rev-parse "$COMMIT")"
PORT="${PORT:-18080}"
NAME="gastro-wirt-lokaltest"
ARBEIT="$(mktemp -d)"
DATEN="$ARBEIT/daten"
PASSWORT="lokal-test-passwort-$(date +%s)"
GEHEIM="$(openssl rand -base64 48)"
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true; rm -rf "$ARBEIT"' EXIT

echo "▶ Quelle: $SHA (git archive, keine lokalen Änderungen)"
mkdir -p "$ARBEIT/quelle" "$DATEN"
git archive "$SHA" | tar -x -C "$ARBEIT/quelle"
SECRET_ARG=""
[ -n "${BUILD_CA:-}" ] && SECRET_ARG="--secret id=build_ca,src=$BUILD_CA"
# shellcheck disable=SC2086
docker build --network host $SECRET_ARG -f "$ARBEIT/quelle/deploy/wirt/Dockerfile" \
  --build-arg GIT_COMMIT="$SHA" -t "gastro-wirt:$SHA" -q "$ARBEIT/quelle" >/dev/null
echo "✅ Image gastro-wirt:$SHA ($(docker image inspect "gastro-wirt:$SHA" --format '{{.Size}}' | awk '{printf "%.0f MB", $1/1048576}'))"

umgebung() {
  echo "-e BETRIEB=pilot-lokal -e WIRT_PASSWORT=$PASSWORT -e GAST_STATUS_GEHEIMNIS=$GEHEIM \
    -e WIRT_OEFFENTLICHE_URL=http://127.0.0.1:$PORT -e VERTRAUTER_PROXY=1 \
    -e WIRT_ERLAUBTE_ORIGINS=https://kunde.example"
}

echo "▶ 1. Ohne Volume"
# shellcheck disable=SC2046
if docker run --rm $(umgebung) "gastro-wirt:$SHA" >/dev/null 2>&1; then echo "⛔ startete ohne Volume"; exit 1; fi
echo "✅ startet ohne Volume nicht"

starte() {
  # shellcheck disable=SC2046
  docker run -d --init --name "$NAME" -p "127.0.0.1:$PORT:8080" -v "$DATEN:/data" $(umgebung) "gastro-wirt:$SHA" >/dev/null
  for _ in $(seq 1 40); do curl -sf "http://127.0.0.1:$PORT/gesund" >/dev/null && return 0; sleep 0.5; done
  docker logs "$NAME"; echo "⛔ Health-Check nicht erreichbar"; exit 1
}
code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
pruefe() { [ "$2" = "$3" ] && echo "✅ $1 ($3)" || { echo "⛔ $1: erwartet $2, bekommen $3"; exit 1; }; }

echo "▶ 2.–4. Start mit Volume"
starte
pruefe "Health-Check" 200 "$(code "http://127.0.0.1:$PORT/gesund")"
curl -s "http://127.0.0.1:$PORT/gesund" | grep -q "\"version\":\"$SHA\"" && echo "✅ Version im Health-Check = Commit"
pruefe "Dashboard ohne Anmeldung" 401 "$(code "http://127.0.0.1:$PORT/")"
pruefe "API ohne Anmeldung" 401 "$(code "http://127.0.0.1:$PORT/api/betrieb")"
pruefe "Rabatt anlegen ohne Anmeldung" 401 "$(code -X POST "http://127.0.0.1:$PORT/intern/rabattaktionen" -d '{}')"
pruefe "API mit Anmeldung" 200 "$(code -u "x:$PASSWORT" "http://127.0.0.1:$PORT/api/betrieb")"
pruefe "Wirt-Aktion von fremder Seite" 403 "$(code -u "x:$PASSWORT" -H 'Origin: https://boese.example' -H 'Content-Type: application/json' -X POST "http://127.0.0.1:$PORT/api/tisch" -d '{"name":"X","plaetze":2}')"
pruefe "Tisch anlegen" 200 "$(code -u "x:$PASSWORT" -H 'Content-Type: application/json' -X POST "http://127.0.0.1:$PORT/api/tisch" -d '{"name":"Tisch Test","plaetze":4}')"
DATUM="$(date -d '+3 days' +%Y-%m-%d)"
RES='{"datum":"'"$DATUM"'","uhrzeit":"19:00","personen":2,"name":"Test Gast","telefon":"000 000"}'
pruefe "Reservierung von fremder Website" 403 "$(code -H 'Origin: https://boese.example' -H 'Content-Type: application/json' -X POST "http://127.0.0.1:$PORT/oeffentlich/reservierung" -d "$RES")"
pruefe "Reservierung von der Kundendomain" 200 "$(code -H 'Origin: https://kunde.example' -H 'Content-Type: application/json' -X POST "http://127.0.0.1:$PORT/oeffentlich/reservierung" -d "$RES")"
ls -l "$DATEN/betrieb/pilot-lokal.json" | grep -q -- "-rw-------" && echo "✅ Betriebsdatei nur für den App-Benutzer lesbar"
echo "   Speicher: $(docker stats --no-stream --format '{{.MemUsage}}' "$NAME")"

echo "▶ 5.–6. Neustart"
docker stop -t 15 "$NAME" >/dev/null
pruefe "Exit-Code beim Beenden" 0 "$(docker inspect "$NAME" --format '{{.State.ExitCode}}')"
docker rm "$NAME" >/dev/null
starte
STAND="$(curl -s -u "x:$PASSWORT" "http://127.0.0.1:$PORT/api/betrieb")"
echo "$STAND" | grep -q '"Tisch Test"' && echo "✅ Tisch nach Neustart vorhanden" || { echo "⛔ Tisch fehlt"; exit 1; }
echo "$STAND" | grep -q '"Test Gast"' && echo "✅ Reservierung nach Neustart vorhanden" || { echo "⛔ Reservierung fehlt"; exit 1; }
if docker logs "$NAME" 2>&1 | grep -q "$PASSWORT\|$GEHEIM"; then echo "⛔ Secret im Log"; exit 1; fi
echo "✅ keine Secrets im Container-Log"
echo "Fertig: alle lokalen Container-Prüfungen bestanden."
