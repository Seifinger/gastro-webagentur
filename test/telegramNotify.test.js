import { test } from "node:test";
import assert from "node:assert/strict";
import { benachrichtigeUeberTelegram, telegramSendenHook } from "../src/telegramNotify.js";

// TELEGRAM_BOT_TOKEN wird von telegramNotify.js bei jedem Aufruf frisch aus
// process.env gelesen (nicht gecacht) – genau wie DASHBOARD_TOKEN in
// dashboardServer.js. mitToken muss selbst eine Funktion zurückgeben statt
// sofort zu laufen (siehe wirtServer.test.js für dieselbe Falle).
function mitToken(wert, fn) {
  return async (...args) => {
    const alt = process.env.TELEGRAM_BOT_TOKEN;
    if (wert === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = wert;
    try {
      return await fn(...args);
    } finally {
      if (alt === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
      else process.env.TELEGRAM_BOT_TOKEN = alt;
    }
  };
}

function mitGemocktemVersand(fn) {
  return async (...args) => {
    const alt = telegramSendenHook.aktuell;
    const aufrufe = [];
    telegramSendenHook.aktuell = async (chatId, text) => {
      aufrufe.push({ chatId, text });
    };
    try {
      return await fn(aufrufe, ...args);
    } finally {
      telegramSendenHook.aktuell = alt;
    }
  };
}

test(
  "mit hinterlegter Chat-ID und Bot-Token wird gesendet",
  mitToken(
    "test-token",
    mitGemocktemVersand(async (aufrufe) => {
      await benachrichtigeUeberTelegram("123456789", "Neue Bestellung AB-1234");
      assert.equal(aufrufe.length, 1);
      assert.equal(aufrufe[0].chatId, "123456789");
      assert.equal(aufrufe[0].text, "Neue Bestellung AB-1234");
    }),
  ),
);

test(
  "ohne Chat-ID wird nicht gesendet",
  mitToken(
    "test-token",
    mitGemocktemVersand(async (aufrufe) => {
      await benachrichtigeUeberTelegram("", "Neue Bestellung AB-1234");
      await benachrichtigeUeberTelegram(undefined, "Neue Bestellung AB-1234");
      assert.equal(aufrufe.length, 0);
    }),
  ),
);

test(
  "ohne Bot-Token wird nicht gesendet, selbst mit hinterlegter Chat-ID",
  mitToken(
    undefined,
    mitGemocktemVersand(async (aufrufe) => {
      await benachrichtigeUeberTelegram("123456789", "Neue Bestellung AB-1234");
      assert.equal(aufrufe.length, 0);
    }),
  ),
);

test(
  "ein Fehler beim Versand wirft nicht",
  mitToken("test-token", async () => {
    const alt = telegramSendenHook.aktuell;
    telegramSendenHook.aktuell = async () => {
      throw new Error("Telegram nicht erreichbar");
    };
    try {
      await assert.doesNotReject(() => benachrichtigeUeberTelegram("123456789", "Text"));
    } finally {
      telegramSendenHook.aktuell = alt;
    }
  }),
);
