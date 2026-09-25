// Sicherer Einzeltest der echten Resend-Anbindung – EINE E-Mail an EINE
// ausdrücklich angegebene Adresse (deine eigene). Kein Betrieb, keine
// Gastdaten, kein Status-Link eines echten Gastes.
//
//   npm run gast:mailtest -- --an deine-adresse@example.de
//
// Braucht RESEND_API_KEY und GAST_EMAIL_ABSENDER (aus .env oder Umgebung).
// Erfolg heißt: Resend hat die Mail mit einer ID angenommen – ob sie
// ankommt, zeigt erst dein Postfach (und ggf. der Spam-Ordner).

import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { emailEinrichtung, versendeUeberResend } from "../src/kundenBenachrichtigung.js";
import { gastEmail, pruefeEmail } from "../src/gastStatus.js";

config();

const i = process.argv.indexOf("--an");
const an = i === -1 ? "" : String(process.argv[i + 1] ?? "");
if (!an) {
  console.log("Bitte die eigene Adresse angeben: node scripts/gastMailTest.mjs --an deine-adresse@example.de");
  process.exit(1);
}
try {
  pruefeEmail(an);
} catch (fehler) {
  console.log(fehler.message);
  process.exit(1);
}

const einrichtung = emailEinrichtung();
if (!einrichtung.eingerichtet || einrichtung.anbieter !== "resend") {
  console.log(einrichtung.grund ?? "Resend ist nicht eingerichtet.");
  process.exit(1);
}

const { betreff, text } = gastEmail(
  {
    art: "bestellung",
    typ: "bestaetigt",
    referenz: "AB-TEST",
    zeitGeaendert: false,
    sicht: { phase: "bestaetigt", datum: new Date().toISOString().slice(0, 10), uhrzeit: "19:00", zeitBestaetigt: true },
  },
  { betrieb: { name: "Testbetrieb (Versandtest)", telefon: "" }, statusUrl: "(Testmail – kein Status-Link)" },
);

try {
  const { id } = await versendeUeberResend(an, `[Versandtest] ${betreff}`, text, [], { idempotenzSchluessel: `versandtest-${randomUUID()}` });
  console.log(`Von Resend angenommen (ID ${id}). Jetzt im Postfach von ${an} nachsehen.`);
} catch (fehler) {
  console.log(`Nicht versendet: ${fehler.message}`);
  process.exitCode = 1;
}
