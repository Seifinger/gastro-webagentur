# Wirt-App für GENAU EINEN Pilotbetrieb (docs-intern/PILOT-BETRIEB.md).
#
# Getrennt vom Agentur-Dashboard (Dockerfile im Wurzelordner, fly.toml):
# - Code wird beim Build aus einem festen Commit kopiert – kein git pull zur Laufzeit.
#   Release: deploy/wirt/release.sh <commit> baut aus "git archive" genau dieses Commits.
# - Laufzeitdaten ausschließlich auf dem Volume unter GASTRO_DATEN_DIR (/data).
#   /data wird im Image NICHT angelegt: ohne eingehängtes Volume startet die App nicht.
# - Keine Secrets im Image; alles kommt zur Laufzeit als Fly-Secret.
# - Läuft als Benutzer "node", nicht als root.
FROM node:22-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c

# Keine Zusatzpakete: setpriv gehört zum Basis-Image, Node bringt eigene
# CA-Zertifikate mit. PID 1 ist auf Fly das Init von Fly; lokal "docker run --init".
WORKDIR /app
ENV NODE_ENV=production \
    GASTRO_DATEN_DIR=/data \
    WIRT_PORT=8080 \
    DASHBOARD_HOST=0.0.0.0 \
    TZ=Europe/Berlin \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY package.json package-lock.json ./
# Optional: zusätzliche CA nur für diesen Schritt (Build hinter einem TLS-Proxy),
# als BuildKit-Secret – sie landet nicht im Image. Auf Fly nicht nötig.
RUN --mount=type=secret,id=build_ca,required=false \
    if [ -s /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    npm ci --omit=dev --ignore-scripts --no-audit --no-fund && npm cache clean --force

COPY src ./src
COPY public ./public
COPY scripts/wirtStart.mjs scripts/wirtSicherung.mjs scripts/wirtUebergabe.mjs ./scripts/
COPY v2/build ./v2/build
COPY v2/integration ./v2/integration
COPY v2/assets-pipeline ./v2/assets-pipeline
COPY v2/designsysteme ./v2/designsysteme
COPY v2/output/assets/fonts ./v2/output/assets/fonts
COPY deploy/wirt/entrypoint.sh /usr/local/bin/wirt-entrypoint
RUN chmod 0755 /usr/local/bin/wirt-entrypoint && rm -rf /app/public/uploads

ARG GIT_COMMIT=unbekannt
ENV GIT_COMMIT=${GIT_COMMIT}
LABEL org.opencontainers.image.revision=${GIT_COMMIT} \
      org.opencontainers.image.title="gastro-wirt"

EXPOSE 8080
STOPSIGNAL SIGTERM
ENTRYPOINT ["wirt-entrypoint"]
