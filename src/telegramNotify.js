const TELEGRAM_API_BASIS = "https://api.telegram.org";

function telegramKonfiguriert() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

/**
 * Schickt eine Nachricht über die kostenlose Telegram Bot API. Der Bot muss
 * einmalig angelegt sein (Token in .env, siehe .env.example) – die Chat-ID
 * bekommt der Wirt selbst angezeigt, sobald er den Bot öffnet und /start
 * sendet.
 */
export async function sendeTelegramNachricht(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Kein TELEGRAM_BOT_TOKEN gesetzt (siehe .env.example).");

  const antwort = await fetch(`${TELEGRAM_API_BASIS}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!antwort.ok) {
    throw new Error(`Telegram-Versand fehlgeschlagen (HTTP ${antwort.status}).`);
  }
  return antwort.json();
}

// Austauschbar für Tests, wie llmAufrufHook in promptEdits.js – zeigt per
// Default auf den echten Versand über die Telegram Bot API.
export const telegramSendenHook = { aktuell: sendeTelegramNachricht };

/**
 * Fallback-Kanal für neue Bestellungen/Reservierungen: greift nur, wenn der
 * Wirt eine Chat-ID hinterlegt hat und ein Bot-Token konfiguriert ist. Ein
 * fehlschlagender Versand darf die Anfrage des Gastes nie zum Scheitern
 * bringen – wie bei benachrichtigeBetrieb in pushNotify.js wird hier nie
 * geworfen, ein Fehlschlag bleibt still.
 */
export async function benachrichtigeUeberTelegram(chatId, text) {
  if (!telegramKonfiguriert() || !String(chatId ?? "").trim()) return;

  try {
    await telegramSendenHook.aktuell(chatId, text);
  } catch {
    // Fallback-Kanal, kein kritischer Pfad – ein stiller Fehlschlag reicht.
  }
}
