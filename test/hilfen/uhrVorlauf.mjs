// Nur für Tests: stellt die Uhr einer ECHT gestarteten Wirt-App (Kindprozess)
// auf einen festen Startzeitpunkt, ab dem sie normal weiterläuft.
//
//   node --import ./test/hilfen/uhrVorlauf.mjs scripts/wirtStart.mjs
//   (E2E_UHR_START=2026-09-24T15:00:00Z)
//
// So rechnen Browser (Playwright-Uhr) und Server mit derselben Zeit – der
// Test hängt nicht davon ab, zu welcher Tageszeit er läuft. Wird nie im
// Container ausgeliefert (.dockerignore lässt test/ weg).

const start = Date.parse(process.env.E2E_UHR_START ?? "");
if (Number.isFinite(start)) {
  const { uhrHook } = await import("../../src/betriebStore.js");
  const basis = Date.now();
  uhrHook.jetzt = () => new Date(start + (Date.now() - basis));
}
