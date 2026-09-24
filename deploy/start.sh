#!/bin/sh
# Startet das Dashboard aus einem Git-Klon auf dem persistenten Volume.
# Erwartete Umgebungsvariablen (Secrets des Hosts, nie im Repo):
#   GITHUB_TOKEN              Fine-grained Token, nur dieses Repo, "Contents: Read and write"
#   GITHUB_REPO               z. B. Seifinger/gastro-webagentur
#   DASHBOARD_PASSWORT_HASH   aus "npm run dashboard:passwort"
#   GOOGLE_PLACES_API_KEY, ANTHROPIC_API_KEY (optional, wie lokal)
#   GIT_BRANCH                optional, Standard main (von dort liefert GitHub Pages aus)
set -eu

: "${GITHUB_TOKEN:?GITHUB_TOKEN fehlt}"
: "${GITHUB_REPO:?GITHUB_REPO fehlt}"
: "${DASHBOARD_PASSWORT_HASH:?DASHBOARD_PASSWORT_HASH fehlt – ohne Anmeldung startet das Dashboard online nicht}"

# Der Token steht nie in .git/config: Git fragt ihn bei jedem Zugriff über
# diesen Helper aus der Umgebung ab.
git config --global credential.helper '!f() { echo username=x-access-token; echo "password=${GITHUB_TOKEN}"; }; f'
git config --global user.name "${GIT_AUTOR_NAME:-Gastro-Dashboard}"
git config --global user.email "${GIT_AUTOR_EMAIL:-dashboard@users.noreply.github.com}"
git config --global pull.rebase true

if [ ! -d "$REPO_DIR/.git" ]; then
  mkdir -p "$(dirname "$REPO_DIR")"
  git clone --branch "${GIT_BRANCH:-main}" "${KLON_QUELLE:-https://github.com/${GITHUB_REPO}.git}" "$REPO_DIR"
fi
cd "$REPO_DIR"
# Code-Stand von main holen; lokale, gitignorierte Daten bleiben unberührt.
git checkout "${GIT_BRANCH:-main}"
git pull --rebase --autostash origin "${GIT_BRANCH:-main}"
npm ci --omit=optional --no-audit --no-fund

exec node src/dashboardServer.js
