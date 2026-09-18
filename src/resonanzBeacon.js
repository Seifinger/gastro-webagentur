// Das Signal, das der Entwurf an die Agentur zurückgibt: wurde er geöffnet,
// wie lange war er sichtbar, kam der Besucher bis zur Reservierungssektion.
//
// Bewusst nicht an MOTION_SCRIPT angedockt: das steigt bei
// prefers-reduced-motion und ?bewegung=aus per return aus, bevor überhaupt ein
// Observer entsteht (siehe motion.js). Ein Wirt mit reduzierter Bewegung
// würde dort nie als "hat gescrollt" gezählt – und das ist genau der Wirt,
// dem man die Seite sonst falsch nachträgt.
//
// Ebenso bewusst getrennt von data.apiUrl: das ist der spätere Betriebsserver
// des Wirts für Reservierungen und Bestellungen, nicht die Agentur. Bei einem
// Entwurf an einen Interessenten ist er leer.

// Länger zu zählen sagt nichts mehr aus – wer so lange offen hat, hat den Tab
// liegen lassen. Deckel und Rundung spiegeln resonanzStore.js.
const MAX_SEKUNDEN = 600;

/**
 * Baut das Inline-Skript für einen Entwurf. Ohne Collector-Adresse entsteht
 * gar nichts – die Seite bleibt dann exakt wie vorher.
 */
export function resonanzSkript(resonanzUrl, slug) {
  const ziel = String(resonanzUrl ?? "").replace(/\/+$/, "");
  const kennung = String(slug ?? "").trim();
  if (!ziel || !kennung) return "";

  return `
(function () {
  // Der Betreiber sieht sich seinen eigenen Entwurf oft an – beim Bauen, vor
  // Ort beim Wirt, zur Kontrolle. Das darf nicht als Öffnung durch den Wirt
  // zählen, sonst ist die Nachfassliste wertlos. Dieselbe Mechanik wie
  // "?bewegung=aus": ein Parameter an der URL, den nur die interne
  // Verlinkung trägt.
  if (new URLSearchParams(location.search).get("vorschau") === "1") return;

  var ZIEL = ${JSON.stringify(`${ziel}/resonanz`)};
  var SLUG = ${JSON.stringify(kennung)};
  var MAX = ${MAX_SEKUNDEN};

  // Eine Kennung je Tab, damit Öffnen- und Weggehen-Signal zusammenfinden.
  // sessionStorage und nicht localStorage oder ein Cookie: sie endet mit dem
  // Tab, Besuche an verschiedenen Tagen zählen deshalb getrennt.
  var besuch;
  try {
    besuch = sessionStorage.getItem("resonanz");
    if (!besuch) {
      besuch = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
      sessionStorage.setItem("resonanz", besuch);
    }
  } catch (e) {
    // Privates Fenster, blockierte Speicher: dann eben nur das erste Signal.
    besuch = String(Date.now()) + Math.random();
  }

  // Gezählt werden nur die sichtbaren Millisekunden. Ein Tab, der eine Stunde
  // im Hintergrund liegt, war nicht eine Stunde interessant.
  var sichtbarSeit = document.visibilityState === "visible" ? Date.now() : 0;
  var gesammelt = 0;
  var reservierungGesehen = false;

  function sekunden() {
    var summe = gesammelt + (sichtbarSeit ? Date.now() - sichtbarSeit : 0);
    return Math.min(MAX, Math.round(summe / 1000));
  }

  function nutzlast() {
    return JSON.stringify({
      slug: SLUG,
      besuch: besuch,
      sekunden: sekunden(),
      reservierungGesehen: reservierungGesehen
    });
  }

  // text/plain und nicht application/json, obwohl der Inhalt JSON ist: Nur
  // die harmlosen Inhaltstypen lösen keine CORS-Vorabfrage aus. Das ist hier
  // keine Feinoptimierung, sondern Bedingung – sendBeacon sendet immer im
  // Credentials-Modus "include", und dagegen lehnt der Browser ein
  // "Access-Control-Allow-Origin: *" ab. Mit application/json käme das
  // Abschluss-Signal von einer veröffentlichten Seite nie an.
  var TYP = "text/plain;charset=UTF-8";

  // Erstes Signal sofort: Auch ein Besuch von zwei Sekunden ist die
  // Information, dass der Link ankam.
  try {
    fetch(ZIEL, {
      method: "POST",
      headers: { "Content-Type": TYP },
      body: nutzlast(),
      keepalive: true,
      mode: "cors"
    }).catch(function () {});
  } catch (e) {}

  // Abschluss-Signal bei visibilitychange und nicht bei unload: unload feuert
  // auf iOS-Safari unzuverlässig, visibilitychange dort verlässlich.
  var gemeldet = false;
  function melde() {
    if (gemeldet) return;
    gemeldet = true;
    try {
      navigator.sendBeacon(ZIEL, new Blob([nutzlast()], { type: TYP }));
    } catch (e) {}
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      if (sichtbarSeit) { gesammelt += Date.now() - sichtbarSeit; sichtbarSeit = 0; }
      melde();
    } else {
      // Kommt der Tab zurück, läuft die Uhr weiter und ein weiterer Abschluss
      // darf wieder gemeldet werden.
      sichtbarSeit = Date.now();
      gemeldet = false;
    }
  });
  window.addEventListener("pagehide", melde);

  // Wer bis zur Reservierung scrollt, denkt über die Seite nach – das ist das
  // stärkste Signal, das die Seite ohne Klick hergibt.
  if ("IntersectionObserver" in window) {
    var abschnitt = document.getElementById("reservierung");
    if (abschnitt) {
      var beobachter = new IntersectionObserver(function (eintraege) {
        if (eintraege[0].isIntersecting) {
          reservierungGesehen = true;
          beobachter.disconnect();
        }
      }, { threshold: 0.25 });
      beobachter.observe(abschnitt);
    }
  }
})();`;
}
