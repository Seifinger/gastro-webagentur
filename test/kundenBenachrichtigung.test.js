import { test } from "node:test";
import assert from "node:assert/strict";
import { informiereUeberVerzoegerung, smsHook, emailHook } from "../src/kundenBenachrichtigung.js";

// smsHook.aktuell/emailHook.aktuell sind Modul-Singletons – jeder Testfall
// setzt sie selbst und stellt den Ausgangszustand (null) danach wieder her,
// damit nichts zwischen Testfällen durchsickert.
function mitHooks({ sms, email }, fn) {
  return async (...args) => {
    const altSms = smsHook.aktuell;
    const altEmail = emailHook.aktuell;
    smsHook.aktuell = sms ?? null;
    emailHook.aktuell = email ?? null;
    try {
      return await fn(...args);
    } finally {
      smsHook.aktuell = altSms;
      emailHook.aktuell = altEmail;
    }
  };
}

test(
  "mit konfiguriertem SMS-Hook und Telefonnummer wird per SMS informiert",
  mitHooks({ sms: async () => {} }, async () => {
    const aufrufe = [];
    smsHook.aktuell = async (telefon, text) => aufrufe.push({ telefon, text });

    const ergebnis = await informiereUeberVerzoegerung({
      telefon: "0170 1234567",
      email: "gast@beispiel.de",
      nachricht: "Neue Abholzeit: 19:00",
    });

    assert.equal(ergebnis.kanal, "sms");
    assert.equal(aufrufe.length, 1);
    assert.equal(aufrufe[0].telefon, "0170 1234567");
    assert.equal(aufrufe[0].text, "Neue Abholzeit: 19:00");
  }),
);

test(
  "ohne SMS-Hook greift der E-Mail-Fallback, wenn eine Adresse hinterlegt ist",
  mitHooks({}, async () => {
    const aufrufe = [];
    emailHook.aktuell = async (empfaenger, betreff, text) => aufrufe.push({ empfaenger, betreff, text });

    const ergebnis = await informiereUeberVerzoegerung({
      telefon: "0170 1234567",
      email: "gast@beispiel.de",
      nachricht: "Neue Abholzeit: 19:00",
    });

    assert.equal(ergebnis.kanal, "email");
    assert.equal(aufrufe.length, 1);
    assert.equal(aufrufe[0].empfaenger, "gast@beispiel.de");
    assert.equal(aufrufe[0].text, "Neue Abholzeit: 19:00");
  }),
);

test(
  "ohne SMS-Hook und ohne hinterlegte E-Mail bleibt nur der Dashboard-Hinweis",
  mitHooks({ email: async () => {} }, async () => {
    const ergebnis = await informiereUeberVerzoegerung({
      telefon: "0170 1234567",
      email: "",
      nachricht: "Neue Abholzeit: 19:00",
    });
    assert.equal(ergebnis.kanal, "keiner");
  }),
);

test(
  "ganz ohne konfigurierte Kanäle bleibt nur der Dashboard-Hinweis",
  mitHooks({}, async () => {
    const ergebnis = await informiereUeberVerzoegerung({
      telefon: "0170 1234567",
      email: "gast@beispiel.de",
      nachricht: "Neue Abholzeit: 19:00",
    });
    assert.equal(ergebnis.kanal, "keiner");
  }),
);

test(
  "SMS konfiguriert, aber keine Telefonnummer hinterlegt: E-Mail-Fallback greift",
  mitHooks({ sms: async () => {}, email: async () => {} }, async () => {
    const smsAufrufe = [];
    const emailAufrufe = [];
    smsHook.aktuell = async (...args) => smsAufrufe.push(args);
    emailHook.aktuell = async (...args) => emailAufrufe.push(args);

    const ergebnis = await informiereUeberVerzoegerung({
      telefon: "",
      email: "gast@beispiel.de",
      nachricht: "Neue Abholzeit: 19:00",
    });

    assert.equal(ergebnis.kanal, "email");
    assert.equal(smsAufrufe.length, 0);
    assert.equal(emailAufrufe.length, 1);
  }),
);

test(
  "ein fehlschlagender SMS-Versand fällt auf E-Mail zurück, statt zu werfen",
  mitHooks({ email: async () => {} }, async () => {
    smsHook.aktuell = async () => {
      throw new Error("Anbieter nicht erreichbar");
    };
    const emailAufrufe = [];
    emailHook.aktuell = async (...args) => emailAufrufe.push(args);

    const ergebnis = await informiereUeberVerzoegerung({
      telefon: "0170 1234567",
      email: "gast@beispiel.de",
      nachricht: "Neue Abholzeit: 19:00",
    });

    assert.equal(ergebnis.kanal, "email");
    assert.equal(emailAufrufe.length, 1);
  }),
);
