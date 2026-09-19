// Informiert den Gast, wenn sich eine bereits bestätigte Abholzeit
// verschiebt. Anders als Push (pushNotify.js) und Telegram (telegramNotify.js)
// braucht dieser Kanal einen echten SMS-Anbieter (z. B. Twilio) – den gibt es
// in diesem Projekt noch nicht. Deshalb bleibt smsHook.aktuell standardmäßig
// leer: Der Anbieter lässt sich später eintragen, ohne diesen Code noch
// einmal anzufassen. Dasselbe gilt für E-Mail, für die dieses Projekt
// ebenfalls keinen Versanddienst hinterlegt hat.
//
// Austauschbar für Tests und für den späteren echten Anbieter, wie
// llmAufrufHook in promptEdits.js.
export const smsHook = { aktuell: null };
export const emailHook = { aktuell: null };

function smsKonfiguriert() {
  return typeof smsHook.aktuell === "function";
}

function emailKonfiguriert() {
  return typeof emailHook.aktuell === "function";
}

/**
 * Informiert den Gast über eine geänderte Abholzeit: SMS, wenn ein Anbieter
 * konfiguriert ist und eine Telefonnummer vorliegt; sonst E-Mail, wenn ein
 * Versanddienst konfiguriert ist und eine Adresse hinterlegt wurde; sonst
 * bleibt nur der Hinweis im Dashboard, dass der Gast telefonisch informiert
 * werden muss. Wirft nie – ein fehlschlagender Kanal fällt auf den nächsten
 * zurück, statt die Anfrage des Wirts scheitern zu lassen.
 */
export async function informiereUeberVerzoegerung({ telefon, email, nachricht }) {
  if (smsKonfiguriert() && telefon) {
    try {
      await smsHook.aktuell(telefon, nachricht);
      return { kanal: "sms" };
    } catch {
      // Anbieter gerade nicht erreichbar o. Ä. – weiter zum nächsten Kanal
      // statt den Wirt mit einem Fehler dastehen zu lassen.
    }
  }

  if (emailKonfiguriert() && email) {
    try {
      await emailHook.aktuell(email, "Ihre Abholzeit hat sich geändert", nachricht);
      return { kanal: "email" };
    } catch {
      // s. o.
    }
  }

  return { kanal: "keiner" };
}
