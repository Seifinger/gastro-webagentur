import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { speichereBetrieb, fuegePushSubscriptionHinzu, ladeBetrieb } from "../src/betriebStore.js";
import { benachrichtigeBetrieb, oeffentlicherVapidSchluessel, pushSendenHook } from "../src/pushNotify.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLUG_A = "__test-push-a";
const SLUG_B = "__test-push-b";

function dateiPfad(slug) {
  return path.join(__dirname, "..", "data", "betrieb", `${slug}.json`);
}

beforeEach(() => {
  speichereBetrieb(SLUG_A, { tische: [], reservierungen: [], bestellungen: [], pushSubscriptions: [] });
  speichereBetrieb(SLUG_B, { tische: [], reservierungen: [], bestellungen: [], pushSubscriptions: [] });
});

after(() => {
  rmSync(dateiPfad(SLUG_A), { force: true });
  rmSync(dateiPfad(SLUG_B), { force: true });
});

// VAPID_PUBLIC_KEY/PRIVATE_KEY werden von pushNotify.js bei jedem Aufruf
// frisch aus process.env gelesen (nicht gecacht) – genau wie DASHBOARD_TOKEN
// in dashboardServer.js. Das erlaubt, sie je Testfall zu setzen.
// mitVapid/ohneVapid müssen selbst eine Funktion zurückgeben, statt sofort
// zu laufen: test(name, mitVapid(fn)) darf nur eine Funktion als zweites
// Argument übergeben – ein sofort aufgerufenes "async function mitVapid"
// würde beim Aufbau der test()-Aufrufe (Datei-Ladezeit) sofort starten und
// eine Promise statt einer Funktion übergeben, unabhängig vom eigentlichen
// Testlauf. Siehe mitGemocktemVersand oben für dasselbe Muster.
function mitVapid(fn) {
  return async (...args) => {
    const alterPublic = process.env.VAPID_PUBLIC_KEY;
    const alterPrivate = process.env.VAPID_PRIVATE_KEY;
    process.env.VAPID_PUBLIC_KEY = "oeffentlicher-test-schluessel";
    process.env.VAPID_PRIVATE_KEY = "privater-test-schluessel";
    try {
      return await fn(...args);
    } finally {
      if (alterPublic === undefined) delete process.env.VAPID_PUBLIC_KEY;
      else process.env.VAPID_PUBLIC_KEY = alterPublic;
      if (alterPrivate === undefined) delete process.env.VAPID_PRIVATE_KEY;
      else process.env.VAPID_PRIVATE_KEY = alterPrivate;
    }
  };
}

function ohneVapid(fn) {
  return async (...args) => {
    const alterPublic = process.env.VAPID_PUBLIC_KEY;
    const alterPrivate = process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    try {
      return await fn(...args);
    } finally {
      if (alterPublic !== undefined) process.env.VAPID_PUBLIC_KEY = alterPublic;
      if (alterPrivate !== undefined) process.env.VAPID_PRIVATE_KEY = alterPrivate;
    }
  };
}

function mitGemocktemVersand(fn) {
  return async (...args) => {
    const alt = pushSendenHook.aktuell;
    const aufrufe = [];
    pushSendenHook.aktuell = async (subscription, nutzlast) => {
      aufrufe.push({ subscription, nutzlast });
    };
    try {
      return await fn(aufrufe, ...args);
    } finally {
      pushSendenHook.aktuell = alt;
    }
  };
}

test(
  "ohne VAPID-Schlüssel wird gar nicht erst versendet",
  ohneVapid(
    mitGemocktemVersand(async (aufrufe) => {
      fuegePushSubscriptionHinzu(SLUG_A, { endpoint: "e1", keys: { p256dh: "p", auth: "a" } });
      await benachrichtigeBetrieb(SLUG_A, { titel: "T", text: "X" });
      assert.equal(aufrufe.length, 0);
      assert.equal(oeffentlicherVapidSchluessel(), "");
    }),
  ),
);

test(
  "eine simulierte neue Bestellung löst Push an alle Subscriptions des richtigen Betriebs aus",
  mitVapid(
    mitGemocktemVersand(async (aufrufe) => {
      fuegePushSubscriptionHinzu(SLUG_A, { endpoint: "a1", keys: { p256dh: "p", auth: "a" } });
      fuegePushSubscriptionHinzu(SLUG_A, { endpoint: "a2", keys: { p256dh: "p", auth: "a" } });
      fuegePushSubscriptionHinzu(SLUG_B, { endpoint: "b1", keys: { p256dh: "p", auth: "a" } });

      await benachrichtigeBetrieb(SLUG_A, { titel: "Neue Bestellung", text: "AB-1234" });

      assert.equal(aufrufe.length, 2, "beide Geräte von Betrieb A bekommen die Nachricht");
      assert.deepEqual(
        aufrufe.map((a) => a.subscription.endpoint).sort(),
        ["a1", "a2"],
      );
      assert.ok(
        aufrufe.every((a) => a.nutzlast.titel === "Neue Bestellung" && a.nutzlast.text === "AB-1234"),
      );
    }),
  ),
);

test(
  "kein Betrieb bekommt die Push-Nachricht eines anderen Betriebs",
  mitVapid(
    mitGemocktemVersand(async (aufrufe) => {
      fuegePushSubscriptionHinzu(SLUG_B, { endpoint: "b1", keys: { p256dh: "p", auth: "a" } });

      await benachrichtigeBetrieb(SLUG_A, { titel: "Neue Reservierung", text: "2 Personen" });

      assert.equal(aufrufe.length, 0, "Betrieb A hat keine Subscriptions – Betrieb B darf trotzdem nichts bekommen");
    }),
  ),
);

test(
  "eine vom Push-Dienst abgelehnte Subscription (410) wird aufgeräumt",
  mitVapid(async () => {
    fuegePushSubscriptionHinzu(SLUG_A, { endpoint: "veraltet", keys: { p256dh: "p", auth: "a" } });

    const alt = pushSendenHook.aktuell;
    pushSendenHook.aktuell = async () => {
      const fehler = new Error("Gone");
      fehler.statusCode = 410;
      throw fehler;
    };
    try {
      await benachrichtigeBetrieb(SLUG_A, { titel: "T", text: "X" });
    } finally {
      pushSendenHook.aktuell = alt;
    }

    assert.deepEqual(ladeBetrieb(SLUG_A).pushSubscriptions, []);
  }),
);

test(
  "ein anderer Fehler beim Versand löscht die Subscription nicht",
  mitVapid(async () => {
    fuegePushSubscriptionHinzu(SLUG_A, { endpoint: "kurzzeitig-offline", keys: { p256dh: "p", auth: "a" } });

    const alt = pushSendenHook.aktuell;
    pushSendenHook.aktuell = async () => {
      const fehler = new Error("Netzwerkfehler");
      fehler.statusCode = 500;
      throw fehler;
    };
    try {
      await benachrichtigeBetrieb(SLUG_A, { titel: "T", text: "X" });
    } finally {
      pushSendenHook.aktuell = alt;
    }

    assert.equal(ladeBetrieb(SLUG_A).pushSubscriptions.length, 1);
  }),
);
