// Service Worker für Web Push im Wirt-Dashboard (public/wirt.html). Zeigt
// eingehende Push-Nachrichten als Benachrichtigung – neue Bestellung oder
// Reservierung, mit Link zurück ins Dashboard.

self.addEventListener("push", (event) => {
  let daten = {};
  try {
    daten = event.data ? event.data.json() : {};
  } catch {
    // Unerwartete Nutzlast: lieber eine leere Benachrichtigung als ein
    // stiller Absturz des Service Workers.
  }

  const titel = daten.titel || "Neue Anfrage";
  event.waitUntil(
    self.registration.showNotification(titel, {
      body: daten.text || "",
      data: { url: daten.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const ziel = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const fenster = await clients.matchAll({ type: "window", includeUncontrolled: true });
      const offenes = fenster.find((f) => f.url.endsWith(ziel));
      if (offenes) {
        await offenes.focus();
      } else {
        await clients.openWindow(ziel);
      }
    })(),
  );
});
