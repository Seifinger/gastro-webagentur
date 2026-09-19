import webpush from "web-push";
import { ladeBetrieb, entfernePushSubscription } from "./betriebStore.js";

// VAPID-Schlüssel werden bei jedem Aufruf frisch aus process.env gelesen
// (nicht einmalig gecacht) – genau wie ANTHROPIC_API_KEY in promptEdits.js.
// Das erlaubt Tests, sie je Testfall zu setzen, ohne das Modul neu zu laden.
function vapidKonfiguriert() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

// Für das Frontend: der öffentliche Schlüssel, den PushManager.subscribe()
// braucht. Leer, solange kein Schlüsselpaar hinterlegt ist – wirt.html lässt
// die Registrierung dann ausfallen, statt einen Fehler zu zeigen.
export function oeffentlicherVapidSchluessel() {
  return vapidKonfiguriert() ? process.env.VAPID_PUBLIC_KEY : "";
}

async function sendeEchtenPush(subscription, nutzlast) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:kontakt@example.de",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  return webpush.sendNotification(subscription, JSON.stringify(nutzlast));
}

// Austauschbar für Tests, wie llmAufrufHook in promptEdits.js – zeigt per
// Default auf den echten Versand über den Push-Dienst des Browsers.
export const pushSendenHook = { aktuell: sendeEchtenPush };

/**
 * Schickt allen registrierten Geräten eines Betriebs eine kurze
 * Push-Nachricht (neue Bestellung/Reservierung). Ohne hinterlegtes
 * Schlüsselpaar oder ohne Subscriptions passiert nichts. Ein einzelner
 * fehlschlagender Versand darf die Anfrage des Gastes nie zum Scheitern
 * bringen – deshalb wirft diese Funktion nie, sie räumt bei erkennbar
 * ungültigen Subscriptions nur deren Eintrag auf.
 */
export async function benachrichtigeBetrieb(slug, { titel, text, url = "/" }) {
  if (!vapidKonfiguriert()) return;

  const subscriptions = ladeBetrieb(slug).pushSubscriptions ?? [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await pushSendenHook.aktuell(subscription, { titel, text, url });
      } catch (fehler) {
        // 404/410: der Push-Dienst hat die Registrierung endgültig verworfen
        // (Gerät lange offline, Berechtigung entzogen, Browser-Daten
        // gelöscht) – ein Zombie-Eintrag, der sonst bei jedem weiteren
        // Versand erneut fehlschlägt.
        if (fehler.statusCode === 404 || fehler.statusCode === 410) {
          entfernePushSubscription(slug, subscription.endpoint);
        }
      }
    }),
  );
}
