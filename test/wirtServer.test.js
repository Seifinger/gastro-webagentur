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
const { ladeBetrieb, speichereBetrieb, legeTischAn, uhrHook } = await import("../src/betriebStore.js");

// Feste Uhr (Donnerstag, 24.09.2026, 17:00 Berlin): "18:30" ist dann eine
// angebotene Abholzeit – unabhängig davon, wann der Test läuft.
const JETZT = new Date("2026-09-24T17:00:00+02:00");
uhrHook.jetzt = () => new Date(JETZT);
const { pushSendenHook } = await import("../src/pushNotify.js");
const { telegramSendenHook } = await import("../src/telegramNotify.js");
const { smsHook, emailHook } = await import("../src/kundenBenachrichtigung.js");
const { ladeLernTabelle, lerneAusBeobachtung, wochentag, zeitfenster } = await import(
  "../src/wartezeitLernStore.js"
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dateiPfad = path.join(__dirname, "..", "data", "betrieb", `${SLUG}.json`);
const lernDateiPfad = path.join(__dirname, "..", "data", "wartezeitLernen", `${SLUG}.json`);
const zuverlaessigkeitDateiPfad = path.join(__dirname, "..", "data", "zuverlaessigkeit", `${SLUG}.json`);

// Voller Reset vor jedem Testfall: Push-Subscriptions und Bestellungen aus
// einem Test dürfen die Zähl-Assertions eines späteren Tests nicht
// verfälschen (z. B. "genau ein Push-Aufruf").
beforeEach(() => {
  speichereBetrieb(SLUG, { tische: [], reservierungen: [], bestellungen: [], pushSubscriptions: [] });
  legeTischAn(SLUG, { name: "Tisch 1", plaetze: 4 });
  rmSync(lernDateiPfad, { force: true });
  rmSync(zuverlaessigkeitDateiPfad, { force: true });
});

after(() => {
  rmSync(dateiPfad, { force: true });
  rmSync(lernDateiPfad, { force: true });
  rmSync(zuverlaessigkeitDateiPfad, { force: true });
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

async function bestellungAnlegen(basis, zusatz = {}) {
  const antwort = await fetch(`${basis}/oeffentlich/bestellung`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      positionen: [{ name: "Pizza", menge: 1, preis: 9.9 }],
      abholzeit: "18:30",
      name: "Testgast",
      telefon: "0170 1234567",
      email: "gast@beispiel.de",
      ...zusatz,
    }),
  });
  return (await antwort.json()).bestellung;
}

test("POST /intern/bestellung/:id/verzoegerung setzt die neue Abholzeit und meldet den Kanal (SMS)", async () => {
  await mitServer(async (basis) => {
    const { id } = await bestellungAnlegen(basis);

    const aufrufe = [];
    const altSms = smsHook.aktuell;
    smsHook.aktuell = async (telefon, text) => aufrufe.push({ telefon, text });

    try {
      const antwort = await fetch(`${basis}/intern/bestellung/${id}/verzoegerung`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ neueZeit: "19:15", grund: "Küche im Rückstand" }),
      });
      const ergebnis = await antwort.json();

      assert.equal(antwort.status, 200);
      assert.equal(ergebnis.kanal, "sms");
      assert.equal(ergebnis.bestellung.bestaetigteAbholzeit, "19:15");
      assert.equal(ergebnis.bestellung.status, "bestaetigt");
      assert.equal(aufrufe.length, 1);
      assert.equal(aufrufe[0].telefon, "0170 1234567");
      assert.match(aufrufe[0].text, /19:15/);
      assert.match(aufrufe[0].text, /Küche im Rückstand/);
    } finally {
      smsHook.aktuell = altSms;
    }
  });
});

test("POST /intern/bestellung/:id/verzoegerung schickt genau eine E-Mail, wenn Adresse und Versand vorhanden sind", async () => {
  await mitServer(async (basis) => {
    const { id } = await bestellungAnlegen(basis);

    const emailAufrufe = [];
    const altSms = smsHook.aktuell;
    const altEmail = emailHook.aktuell;
    const altUrl = process.env.WIRT_OEFFENTLICHE_URL;
    smsHook.aktuell = null;
    emailHook.aktuell = async (empfaenger, betreff, text) => emailAufrufe.push({ empfaenger, betreff, text });
    process.env.WIRT_OEFFENTLICHE_URL = "https://wirt.beispiel.de";

    try {
      const antwort = await fetch(`${basis}/intern/bestellung/${id}/verzoegerung`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ neueZeit: "19:15", grund: "" }),
      });
      const ergebnis = await antwort.json();

      assert.equal(ergebnis.kanal, "email");
      assert.equal(emailAufrufe.length, 1);
      assert.equal(emailAufrufe[0].empfaenger, "gast@beispiel.de");
      assert.match(emailAufrufe[0].text, /19:15/);
      assert.match(emailAufrufe[0].text, /https:\/\/wirt\.beispiel\.de\/status#/);
      assert.equal(ergebnis.gast.letzteMeldung.zustand, "uebergeben");
      assert.equal(ergebnis.gast.anrufNoetig, false);
    } finally {
      smsHook.aktuell = altSms;
      emailHook.aktuell = altEmail;
      if (altUrl === undefined) delete process.env.WIRT_OEFFENTLICHE_URL;
      else process.env.WIRT_OEFFENTLICHE_URL = altUrl;
    }
  });
});

test("POST /intern/bestellung/:id/verzoegerung meldet 'keiner' ohne jeden konfigurierten Kanal", async () => {
  await mitServer(async (basis) => {
    const { id } = await bestellungAnlegen(basis, { email: "" });

    const altSms = smsHook.aktuell;
    const altEmail = emailHook.aktuell;
    smsHook.aktuell = null;
    emailHook.aktuell = null;

    try {
      const antwort = await fetch(`${basis}/intern/bestellung/${id}/verzoegerung`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ neueZeit: "19:15" }),
      });
      const ergebnis = await antwort.json();

      assert.equal(antwort.status, 200);
      assert.equal(ergebnis.kanal, "keiner");
      // Die neue Zeit ist trotzdem gespeichert – und der Wirt muss anrufen.
      assert.equal(ergebnis.bestellung.bestaetigteAbholzeit, "19:15");
      assert.equal(ergebnis.gast.anrufNoetig, true);
      assert.match(ergebnis.gast.anrufText, /bitte unter 0170 1234567 anrufen/);
    } finally {
      smsHook.aktuell = altSms;
      emailHook.aktuell = altEmail;
    }
  });
});

test("POST /intern/bestellung/:id/verzoegerung mit unbekannter ID antwortet mit 400", async () => {
  await mitServer(async (basis) => {
    const antwort = await fetch(`${basis}/intern/bestellung/unbekannt/verzoegerung`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ neueZeit: "19:15" }),
    });
    const ergebnis = await antwort.json();

    assert.equal(antwort.status, 400);
    assert.match(ergebnis.fehler, /nicht gefunden/);
  });
});

test("POST /intern/wartezeit-lernen/aktiv schaltet das Lernsystem um", async () => {
  await mitServer(async (basis) => {
    const antwort = await fetch(`${basis}/intern/wartezeit-lernen/aktiv`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktiv: true }),
    });
    const ergebnis = await antwort.json();

    assert.equal(antwort.status, 200);
    assert.equal(ergebnis.wartezeitLernenAktiv, true);
    assert.equal(ladeBetrieb(SLUG).wartezeitLernenAktiv, true);

    const betrieb = await (await fetch(`${basis}/api/betrieb`)).json();
    assert.equal(betrieb.wartezeitLernenAktiv, true);
  });
});

test("GET /api/wartezeit-lernen liefert die gelernten Zuschläge", async () => {
  lerneAusBeobachtung(SLUG, { datum: "2026-09-20", uhrzeit: "19:00", auslastung: "niedrig", differenzMinuten: 7 });

  await mitServer(async (basis) => {
    const antwort = await fetch(`${basis}/api/wartezeit-lernen`);
    const ergebnis = await antwort.json();

    assert.equal(antwort.status, 200);
    assert.equal(ergebnis.eintraege.length, 1);
    assert.equal(ergebnis.eintraege[0].beobachtungen, 1);
    assert.equal(ergebnis.eintraege[0].gelernt, false);
  });
});

test("eine abgeholte Bestellung fließt bei aktiviertem Lernsystem in die Tabelle ein", async () => {
  await mitServer(async (basis) => {
    await fetch(`${basis}/intern/wartezeit-lernen/aktiv`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktiv: true }),
    });

    const bestellAntwort = await fetch(`${basis}/oeffentlich/bestellung`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positionen: [{ name: "Pizza", menge: 1, preis: 9.9 }],
        abholzeit: "18:30",
        name: "Testgast",
      }),
    });
    const { id } = (await bestellAntwort.json()).bestellung;

    await fetch(`${basis}/api/bestellung/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "abgeholt" }),
    });

    const wt = wochentag(new Date().toISOString().slice(0, 10));
    const fenster = zeitfenster("18:30");
    const tabelle = ladeLernTabelle(SLUG);
    const treffer = Object.keys(tabelle).some((key) => key.startsWith(`${wt}|${fenster}|`));
    assert.ok(treffer, "die passende Tabellenzeile sollte jetzt eine Beobachtung haben");
  });
});

test("eine abgeholte Bestellung fließt ohne aktiviertes Lernsystem nicht in die Tabelle ein", async () => {
  await mitServer(async (basis) => {
    const bestellAntwort = await fetch(`${basis}/oeffentlich/bestellung`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positionen: [{ name: "Pizza", menge: 1, preis: 9.9 }],
        abholzeit: "18:30",
        name: "Testgast",
      }),
    });
    const { id } = (await bestellAntwort.json()).bestellung;

    await fetch(`${basis}/api/bestellung/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "abgeholt" }),
    });

    assert.deepEqual(ladeLernTabelle(SLUG), {});
  });
});

/* ---------- No-Show-Schutz ---------- */

async function aktiviereNoShow(basis, betrag = 10, fenster = 30, schwelle = 2) {
  await fetch(`${basis}/intern/no-show-schutz`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aktiv: true, gebuehrBetrag: betrag, stornofensterMinuten: fenster, warnSchwelle: schwelle }),
  });
}

test("POST /oeffentlich/no-show-einstellungen liefert die aktuelle Konfiguration", async () => {
  await mitServer(async (basis) => {
    await aktiviereNoShow(basis, 9.5, 20);
    const antwort = await fetch(`${basis}/oeffentlich/no-show-einstellungen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const ergebnis = await antwort.json();

    assert.equal(ergebnis.aktiv, true);
    assert.equal(ergebnis.gebuehrBetrag, 9.5);
    assert.equal(ergebnis.stornofensterMinuten, 20);
  });
});

test("eine Bestellung ohne Häkchen wird bei aktiviertem No-Show-Schutz abgelehnt", async () => {
  await mitServer(async (basis) => {
    await aktiviereNoShow(basis);
    const antwort = await fetch(`${basis}/oeffentlich/bestellung`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positionen: [{ name: "Pizza", menge: 1, preis: 9.9 }],
        abholzeit: "18:30",
        name: "Testgast",
      }),
    });
    const ergebnis = await antwort.json();

    assert.equal(antwort.status, 400);
    assert.match(ergebnis.fehler, /Ausfallpauschale zu/);
  });
});

test("eine Bestellung mit Häkchen wird angenommen, die Zustimmung wird gespeichert", async () => {
  await mitServer(async (basis) => {
    await aktiviereNoShow(basis, 10, 30);
    const antwort = await fetch(`${basis}/oeffentlich/bestellung`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positionen: [{ name: "Pizza", menge: 1, preis: 9.9 }],
        abholzeit: "18:30",
        name: "Testgast",
        telefon: "0170 999",
        noShowZustimmung: true,
      }),
    });
    const { bestellung } = await antwort.json();
    assert.equal(antwort.status, 200);

    const gespeichert = ladeBetrieb(SLUG).bestellungen.find((x) => x.id === bestellung.id);
    assert.ok(gespeichert.noShowZustimmung);
    assert.match(gespeichert.noShowZustimmung.text, /10,00 €/);
    assert.ok(gespeichert.noShowZustimmung.zeitpunkt);
  });
});

test("Stornieren über /oeffentlich/bestellung/:id/stornieren meldet, ob es gebührenfrei war", async () => {
  await mitServer(async (basis) => {
    await aktiviereNoShow(basis, 10, 30);
    const bestellAntwort = await fetch(`${basis}/oeffentlich/bestellung`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positionen: [{ name: "Pizza", menge: 1, preis: 9.9 }],
        abholzeit: "18:30",
        name: "Testgast",
        noShowZustimmung: true,
      }),
    });
    const { bestellung } = await bestellAntwort.json();

    const stornoAntwort = await fetch(`${basis}/oeffentlich/bestellung/${bestellung.id}/stornieren`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const ergebnis = await stornoAntwort.json();

    assert.equal(stornoAntwort.status, 200);
    assert.equal(typeof ergebnis.kostenfrei, "boolean");
    assert.match(ergebnis.hinweis, /storniert/);
    assert.equal(ladeBetrieb(SLUG).bestellungen.find((x) => x.id === bestellung.id).status, "storniert");
  });
});

test("'Kunde nicht erschienen' erzeugt mit gemocktem E-Mail-Hook eine Rechnung und versendet sie", async () => {
  await mitServer(async (basis) => {
    await aktiviereNoShow(basis, 12, 30);
    const bestellAntwort = await fetch(`${basis}/oeffentlich/bestellung`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positionen: [{ name: "Pizza", menge: 1, preis: 9.9 }],
        abholzeit: "18:30",
        name: "Testgast",
        telefon: "0170 555",
        email: "gast@beispiel.de",
        noShowZustimmung: true,
      }),
    });
    const { bestellung } = await bestellAntwort.json();

    const emailAufrufe = [];
    const altEmail = emailHook.aktuell;
    emailHook.aktuell = async (empfaenger, betreff, text, anhaenge) => {
      emailAufrufe.push({ empfaenger, betreff, text, anhaenge });
    };

    try {
      const antwort = await fetch(`${basis}/intern/bestellung/${bestellung.id}/no-show`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betrag: 12 }),
      });
      const ergebnis = await antwort.json();

      assert.equal(antwort.status, 200);
      assert.equal(ergebnis.rechnungVersendet, true);
      assert.equal(ergebnis.bestellung.noShowBetrag, 12);
      assert.equal(emailAufrufe.length, 1);
      assert.equal(emailAufrufe[0].empfaenger, "gast@beispiel.de");
      assert.equal(emailAufrufe[0].anhaenge[0].dateiname, "rechnung.pdf");
      assert.ok(Buffer.isBuffer(emailAufrufe[0].anhaenge[0].inhalt));
      assert.equal(emailAufrufe[0].anhaenge[0].inhalt.subarray(0, 5).toString("latin1"), "%PDF-");
    } finally {
      emailHook.aktuell = altEmail;
    }
  });
});

test("'Kunde nicht erschienen' meldet rechnungVersendet:false ohne konfigurierten E-Mail-Hook", async () => {
  await mitServer(async (basis) => {
    await aktiviereNoShow(basis, 12, 30);
    const bestellAntwort = await fetch(`${basis}/oeffentlich/bestellung`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positionen: [{ name: "Pizza", menge: 1, preis: 9.9 }],
        abholzeit: "18:30",
        name: "Testgast",
        noShowZustimmung: true,
      }),
    });
    const { bestellung } = await bestellAntwort.json();

    const antwort = await fetch(`${basis}/intern/bestellung/${bestellung.id}/no-show`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ betrag: 12 }),
    });
    const ergebnis = await antwort.json();

    assert.equal(antwort.status, 200);
    assert.equal(ergebnis.rechnungVersendet, false);
  });
});

test("der Warnhinweis im Dashboard erscheint erst ab der eingestellten Schwelle", async () => {
  await mitServer(async (basis) => {
    await aktiviereNoShow(basis, 10, 30, 2);

    async function neueBestellung() {
      const antwort = await fetch(`${basis}/oeffentlich/bestellung`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionen: [{ name: "Pizza", menge: 1, preis: 9.9 }],
          abholzeit: "18:30",
          name: "Testgast",
          telefon: "0170 777",
          noShowZustimmung: true,
        }),
      });
      return (await antwort.json()).bestellung;
    }

    async function alsNoShowBestaetigen(id) {
      await fetch(`${basis}/intern/bestellung/${id}/no-show`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betrag: 10 }),
      });
    }

    const erste = await neueBestellung();
    await alsNoShowBestaetigen(erste.id);

    const zweite = await neueBestellung();
    let uebersicht = await (await fetch(`${basis}/api/betrieb`)).json();
    assert.equal(
      uebersicht.bestellungen.find((b) => b.id === zweite.id).unzuverlaessig,
      false,
      "nach nur einem bestätigten No-Show noch keine Warnung (Schwelle 2)",
    );

    await alsNoShowBestaetigen(zweite.id);

    const dritte = await neueBestellung();
    uebersicht = await (await fetch(`${basis}/api/betrieb`)).json();
    assert.equal(
      uebersicht.bestellungen.find((b) => b.id === dritte.id).unzuverlaessig,
      true,
      "ab dem zweiten bestätigten No-Show greift die Warnung",
    );
  });
});

test("POST /intern/bankverbindung speichert und liefert den Text", async () => {
  await mitServer(async (basis) => {
    const antwort = await fetch(`${basis}/intern/bankverbindung`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankverbindung: "Musterbetrieb, DE00 1234 5678" }),
    });
    const ergebnis = await antwort.json();

    assert.equal(antwort.status, 200);
    assert.equal(ergebnis.bankverbindung, "Musterbetrieb, DE00 1234 5678");
    assert.equal(ladeBetrieb(SLUG).bankverbindung, "Musterbetrieb, DE00 1234 5678");
  });
});
