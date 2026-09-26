#!/bin/sh
# Wartungsbefehle IN der laufenden Wirt-App (auf Fly: fly ssh console -C "…").
#
#   wirt-befehl sicherung erstellen | liste | probe | vorbereiten [--name …]
#   wirt-befehl sicherung wiederherstellen --ziel <leerer Ordner> [--name …]
#   wirt-befehl uebergabe <wirt-uebergabe.json>
#
# fly ssh console arbeitet als root. Die Daten auf dem Volume gehören "node";
# der Befehl läuft deshalb als "node", damit keine root-eigenen Dateien entstehen,
# die die App danach nicht mehr schreiben kann.
set -eu
case "${1:-}" in
  sicherung) SKRIPT=wirtSicherung.mjs ;;
  uebergabe) SKRIPT=wirtUebergabe.mjs ;;
  *) echo "Aufruf: wirt-befehl sicherung <erstellen|liste|probe|vorbereiten|wiederherstellen …> | uebergabe <datei>"; exit 1 ;;
esac
shift
if [ "$(id -u)" = "0" ]; then
  exec setpriv --reuid=node --regid=node --init-groups node "/app/scripts/$SKRIPT" "$@"
fi
exec node "/app/scripts/$SKRIPT" "$@"
