# Dashboard-Host (v2/DEMO-UMBAU.md, Teil 6; Anleitung: docs-intern/HOSTING.md).
#
# Das Image enthält nur Node und Git. Der Code liegt als Git-Klon auf dem
# persistenten Volume (/data/repo): Dort liegen auch data/ (Leads, Einstellungen,
# Manifest), public/uploads/ und v2/output/leads/ – alles gitignoriert und
# damit nur hier gespeichert. Veröffentlichen heißt: in diesem Klon committen
# und nach main pushen; GitHub Pages liefert docs/ aus.
FROM node:22-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates tini \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    DASHBOARD_HOST=0.0.0.0 \
    DASHBOARD_PORT=8080 \
    REPO_DIR=/data/repo \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY deploy/start.sh /usr/local/bin/dashboard-start
RUN chmod +x /usr/local/bin/dashboard-start

EXPOSE 8080
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["dashboard-start"]
