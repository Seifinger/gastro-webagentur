import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// wirtServer.js liest den Betrieb einmalig beim Modul-Import aus argv/env
// (siehe wirtServer.js) – der Testbetrieb muss deshalb vor dem Import stehen,
// damit der Handler auf einer eigenen Datei arbeitet statt auf "mein-lokal".
const SLUG = "__test-wirt-server";
process.env.BETRIEB = SLUG;
const { handler } = await import("../src/wirtServer.js");
const { ladeBetrieb, speichereBetrieb, legeTischAn } = await import("../src/betriebStore.js");
const { pushSendenHook } = await import("../src/pushNotify.js");
const { telegramSendenHook } = await import("../src/telegramNotify.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dateiPfad = path.join(__dirname, "..", "data", "betrieb", `${SLUG}.json`);

// Voller Reset vor jedem Testfall: Push-Subscriptions und Bestellungen aus
// einem Test dürfen die Zähl-Assertions eines späteren Tests nicht
// verfälschen (z. B. "genau ein Push-Aufruf").
beforeEach(() => {
  speichereBetrieb(SLUG, { tische: [], reservierungen: [], bestellungen: [], pushSubscriptions: [] });
  legeTischAn(SLUG, { name: "Tisch 1", plaetze: 4 });
});

after(() => {
  rmSync(dateiPfad, { force: true });
});

async function mitServer(fn) {
  const server = createServer(handler);
  await new Promise((fertig) => server.listen(0, "127.0.0.1", fertig));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((fertig) => server.close(fertig));
  }
}

// VAPID_PUBLIC_KEY/PRIVATE_KEY werden von pushNotify.js bei jedem Aufruf
// frisch aus process.env gelesen – siehe pushNotify.test.js für dasselbe
// Muster. mitVapid muss selbst eine Funktion zurückgeben (statt sofort zu
// laufen): ein "async function mitVapid", das direkt in test(name, mitVapid(fn))
// aufgerufen wird, würde schon beim Aufbau der test()-Aufrufe starten und
// eine Promise statt einer Funktion übergeben.
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

function mitTelegramToken(fn) {
  return async (...args) => {
    const alt = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    try {
      return await fn(...args);
    } finally {
      if (alt === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
      else process.env.TELEGRAM_BOT_TOKEN = alt;
    }
  };
}

test("POST /intern/wartezeit setzt und liefert den neuen Wert", async () => {
  await mitServer(async (basis) => {
    const antwort = await fetch(`${basis}/intern/wartezeit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minuten: 25 }),
    });
    const ergebnis = await antwort.json();

    assert.equal(antwort.status, 200);
    assert.equal(ergebnis.ok, true);
    assert.equal(ergebnis.zusaetzlicheWartezeitMinuten, 25);
    assert.equal(ladeBetrieb(SLUG).zusaetzlicheWartezeitMinuten, 25);
  });
});

test("POST /intern/wartezeit weist ungültige Werte ab", async () => {
  await mitServer(async (basis) => {
    const antwort = await fetch(`${basis}/intern/wartezeit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minuten: 999 }),
    });
    const ergebnis = await antwort.json();

    assert.equal(antwort.status, 400);
    assert.equal(ergebnis.ok, false);
    assert.match(ergebnis.fehler, /zwischen 0 und 180/);
  });
});

test("GET /api/betrieb liefert die aktuelle Zusatz-Wartezeit mit", async () => {
  await mitServer(async (basis) => {
    await fetch(`${basis}/intern/wartezeit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minuten: 10 }),
    });

    const antwort = await fetch(`${basis}/api/betrieb`);
    const ergebnis = await antwort.json();

    assert.equal(ergebnis.zusaetzlicheWartezeitMinuten, 10);
  });
});

test("GET /sw.js liefert den Service Worker als JavaScript aus", async () => {
  await mitServer(async (basis) => {
    const antwort = await fetch(`${basis}/sw.js`);
    assert.equal(antwort.status, 200);
    assert.match(antwort.headers.get("content-type"), /javascript/);
    assert.match(await antwort.text(), /addEventListener\("push"/);
  });
});

test("GET /api/push/public-key liefert leer, solange kein VAPID-Schlüssel gesetzt ist", async () => {
  await mitServer(async (basis) => {
    const antwort = await fetch(`${basis}/api/push/public-key`);
    assert.deepEqual(await antwort.json(), { publicKey: "" });
  });
});

test(
  "GET /api/push/public-key liefert den gesetzten Schlüssel",
  mitVapid(async () => {
    await mitServer(async (basis) => {
      const antwort = await fetch(`${basis}/api/push/public-key`);
      assert.deepEqual(await antwort.json(), { publicKey: "oeffentlicher-test-schluessel" });
    });
  }),
);

test("POST /intern/push/subscribe speichert eine gültige Subscription", async () => {
  await mitServer(async (basis) => {
    const antwort = await fetch(`${basis}/intern/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: "https://push.beispiel.de/geraet-1", keys: { p256dh: "p", auth: "a" } }),
    });
    const ergebnis = await antwort.json();

    assert.equal(antwort.status, 200);
    assert.equal(ergebnis.ok, true);
    assert.equal(ladeBetrieb(SLUG).pushSubscriptions.some((s) => s.endpoint === "https://push.beispiel.de/geraet-1"), true);
  });
});

test("POST /intern/push/subscribe weist eine unvollständige Subscription ab", async () => {
  await mitServer(async (basis) => {
    const antwort = await fetch(`${basis}/intern/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: "https://push.beispiel.de/kaputt" }),
    });
    const ergebnis = await antwort.json();

    assert.equal(antwort.status, 400);
    assert.match(ergebnis.fehler, /Ungültige Push-Subscription/);
  });
});

test(
  "eine neue Bestellung über /oeffentlich/bestellung löst einen (gemockten) Push aus",
  mitVapid(async () => {
    await mitServer(async (basis) => {
      await fetch(`${basis}/intern/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: "https://push.beispiel.de/best-test", keys: { p256dh: "p", auth: "a" } }),
      });

      const aufrufe = [];
      const alt = pushSendenHook.aktuell;
      pushSendenHook.aktuell = async (subscription, nutzlast) => {
        aufrufe.push({ subscription, nutzlast });
      };

      try {
        const antwort = await fetch(`${basis}/oeffentlich/bestellung`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            positionen: [{ name: "Pizza", menge: 1, preis: 9.9 }],
            abholzeit: "18:30",
            name: "Testgast",
          }),
        });
        assert.equal(antwort.status, 200);
      } finally {
        pushSendenHook.aktuell = alt;
      }

      assert.equal(aufrufe.length, 1);
      assert.equal(aufrufe[0].subscription.endpoint, "https://push.beispiel.de/best-test");
      assert.equal(aufrufe[0].nutzlast.titel, "Neue Bestellung");
    });
  }),
);

test(
  "eine manuell (vom Wirt) eingetragene Reservierung löst keinen Push aus",
  mitVapid(async () => {
    await mitServer(async (basis) => {
      await fetch(`${basis}/intern/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: "https://push.beispiel.de/manuell-test", keys: { p256dh: "p", auth: "a" } }),
      });

      const aufrufe = [];
      const alt = pushSendenHook.aktuell;
      pushSendenHook.aktuell = async (subscription, nutzlast) => {
        aufrufe.push({ subscription, nutzlast });
      };

      try {
        await fetch(`${basis}/api/reservierung`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ datum: "2026-09-20", uhrzeit: "19:00", personen: 2, name: "Theke" }),
        });
      } finally {
        pushSendenHook.aktuell = alt;
      }

      assert.equal(aufrufe.length, 0);
    });
  }),
);

test("POST /intern/telegram/chat-id speichert und liefert den neuen Wert", async () => {
  await mitServer(async (basis) => {
    const antwort = await fetch(`${basis}/intern/telegram/chat-id`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: "987654321" }),
    });
    const ergebnis = await antwort.json();

    assert.equal(antwort.status, 200);
    assert.equal(ergebnis.telegramChatId, "987654321");
    assert.equal(ladeBetrieb(SLUG).telegramChatId, "987654321");
  });
});

test("POST /intern/telegram/chat-id weist eine ungültige Chat-ID ab", async () => {
  await mitServer(async (basis) => {
    const antwort = await fetch(`${basis}/intern/telegram/chat-id`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: "keine-zahl" }),
    });
    const ergebnis = await antwort.json();

    assert.equal(antwort.status, 400);
    assert.match(ergebnis.fehler, /nur aus Ziffern/);
  });
});

test("GET /api/betrieb liefert die aktuelle Telegram-Chat-ID mit", async () => {
  await mitServer(async (basis) => {
    await fetch(`${basis}/intern/telegram/chat-id`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: "42" }),
    });
    const antwort = await fetch(`${basis}/api/betrieb`);
    assert.equal((await antwort.json()).telegramChatId, "42");
  });
});

test(
  "ohne funktionierendes Web Push springt Telegram als Fallback ein",
  mitTelegramToken(async () => {
    await mitServer(async (basis) => {
      await fetch(`${basis}/intern/telegram/chat-id`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: "555" }),
      });
      // Bewusst keine VAPID-Konfiguration und keine Push-Subscription –
      // Web Push ist also nicht verfügbar.

      const telegramAufrufe = [];
      const altTelegram = telegramSendenHook.aktuell;
      telegramSendenHook.aktuell = async (chatId, text) => {
        telegramAufrufe.push({ chatId, text });
      };

      try {
        const antwort = await fetch(`${basis}/oeffentlich/bestellung`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            positionen: [{ name: "Pizza", menge: 1, preis: 9.9 }],
            abholzeit: "18:30",
            name: "Testgast",
          }),
        });
        assert.equal(antwort.status, 200);
      } finally {
        telegramSendenHook.aktuell = altTelegram;
      }

      assert.equal(telegramAufrufe.length, 1);
      assert.equal(telegramAufrufe[0].chatId, "555");
      assert.match(telegramAufrufe[0].text, /Neue Bestellung/);
    });
  }),
);

test(
  "mit funktionierendem Web Push bleibt Telegram stumm",
  mitVapid(
    mitTelegramToken(async () => {
      await mitServer(async (basis) => {
        await fetch(`${basis}/intern/telegram/chat-id`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId: "555" }),
        });
        await fetch(`${basis}/intern/push/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: "https://push.beispiel.de/aktiv", keys: { p256dh: "p", auth: "a" } }),
        });

        const altPush = pushSendenHook.aktuell;
        const altTelegram = telegramSendenHook.aktuell;
        const telegramAufrufe = [];
        pushSendenHook.aktuell = async () => {};
        telegramSendenHook.aktuell = async (chatId, text) => {
          telegramAufrufe.push({ chatId, text });
        };

        try {
          const antwort = await fetch(`${basis}/oeffentlich/bestellung`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              positionen: [{ name: "Pizza", menge: 1, preis: 9.9 }],
              abholzeit: "18:30",
              name: "Testgast",
            }),
          });
          assert.equal(antwort.status, 200);
        } finally {
          pushSendenHook.aktuell = altPush;
          telegramSendenHook.aktuell = altTelegram;
        }

        assert.equal(telegramAufrufe.length, 0, "Web Push war verfügbar – Telegram darf nicht zusätzlich feuern");
      });
    }),
  ),
);
