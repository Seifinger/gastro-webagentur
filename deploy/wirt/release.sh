#!/bin/sh
# Geprüfter Release der Wirt-App auf Fly.io – aus GENAU EINEM Commit.
#
#   deploy/wirt/release.sh <commit|tag> <fly-app-name>
#
# - Nur Commits, die auf origin vorhanden sind (kein ungeprüfter lokaler Stand).
# - Gebaut wird aus "git archive <commit>" in einem leeren Ordner: keine
#   lokalen Änderungen, keine gitignorierten Dateien, keine Laufzeitdaten.
# - Die Commit-ID steht im Image (Label) und im Health-Check (/gesund → version).
# - Vorher lokal: npm test und deploy/wirt/lokal-test.sh <commit>.
# Rollback: dasselbe Skript mit dem vorherigen Commit (Daten bleiben auf dem Volume).
set -eu
COMMIT="${1:?Commit oder Tag angeben}"
APP="${2:?Fly-App-Name angeben}"
command -v fly >/dev/null 2>&1 || { echo "flyctl fehlt (https://fly.io/docs/flyctl/install/)"; exit 1; }
SHA="$(git rev-parse --verify "$COMMIT^{commit}")"
git fetch -q origin
if ! git branch -r --contains "$SHA" | grep -q .; then
  echo "⛔ $SHA ist auf origin nicht vorhanden – erst pushen und prüfen lassen."; exit 1
fi
ARBEIT="$(mktemp -d)"
trap 'rm -rf "$ARBEIT"' EXIT
git archive "$SHA" | tar -x -C "$ARBEIT"
echo "▶ Deploy $SHA → $APP"
fly deploy "$ARBEIT" --config "$ARBEIT/fly.wirt.toml" --app "$APP" \
  --build-arg GIT_COMMIT="$SHA" --image-label "$SHA" --ha=false
echo "▶ Prüfung"
fly status --app "$APP"
curl -fsS "https://$APP.fly.dev/gesund" && echo
