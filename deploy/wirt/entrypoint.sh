#!/bin/sh
# Startet die Wirt-App als Benutzer "node". Fly hängt Volumes root-eigen ein;
# deshalb gehört das Datenverzeichnis vor dem Start einmal "node".
# Das Verzeichnis wird hier NICHT angelegt – fehlt es, meldet scripts/wirtStart.mjs
# "Volume nicht eingehängt" und die App startet nicht.
set -eu
DATEN="${GASTRO_DATEN_DIR:-/data}"
if [ "$(id -u)" = "0" ]; then
  if [ -d "$DATEN" ]; then
    chown -R node:node "$DATEN"
    chmod 0700 "$DATEN"
  fi
  exec setpriv --reuid=node --regid=node --init-groups node /app/scripts/wirtStart.mjs
fi
exec node /app/scripts/wirtStart.mjs
