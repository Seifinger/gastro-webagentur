// Welche Aktion auf einer Seite ein echtes Ziel hat (Gestaltungs-Umbau, AP1).
//
// Grundsatz: Kein Knopf ohne Ziel, und kein Ziel, das mehr verspricht, als es
// hält. Reservieren und Bestellen gehen an wirtServer.js, sobald eine apiUrl
// gesetzt ist ("live"). Ohne Server bleiben die Formulare als ehrliche
// Vorschau stehen ("vorschau") – die Seite sagt dann vor und nach dem Absenden,
// dass nichts verschickt wird (PAGE_SCRIPT, Demo-Zweig).
//
// Anrufen und Route gibt es nur mit echter Nummer bzw. Adresse. Auf
// erfundenen Beispielseiten (fiktiv) ist die Nummer eine Filmnummer – dorthin
// wird niemand zum Anrufen geschickt.
//
// Mit eigener Speisekarten-Seite (karteHref) führen Speisekarte und Bestellen
// dorthin. bestellung: false heißt: Dieser Betrieb nimmt keine Bestellungen
// über die Website an – dann gibt es keinen Bestellen-Knopf, die Karte bleibt
// erreichbar.

export function aktionsziele({ lead = {}, apiUrl = "", fiktiv = false, bestellung = true, karteHref = "" } = {}) {
  const modus = String(apiUrl ?? "").trim() ? "live" : "vorschau";
  const telefon = fiktiv ? "" : String(lead.telefon ?? "").trim();
  const tel = telefon.replace(/[^\d+]/g, "");
  const adresse = String(lead.adresse ?? "").trim();
  return {
    modus,
    reservieren: { art: modus, href: "#reservierung" },
    bestellen: bestellung ? { art: modus, href: karteHref || "#karte" } : null,
    ...(karteHref ? { karte: { href: karteHref } } : {}),
    anrufen: tel ? { art: "telefon", href: `tel:${tel}`, text: telefon } : null,
    route: adresse ? { art: "extern", href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}` } : null,
  };
}
