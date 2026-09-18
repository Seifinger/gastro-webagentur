import test from "node:test";
import assert from "node:assert/strict";
import { resonanzSkript } from "../src/resonanzBeacon.js";

const skript = resonanzSkript("https://resonanz.example/", "gasthof-zur-linde");

test("ohne Collector-Adresse entsteht kein Skript", () => {
  assert.equal(resonanzSkript("", "gasthof-zur-linde"), "");
  assert.equal(resonanzSkript(undefined, "gasthof-zur-linde"), "");
  assert.equal(resonanzSkript("https://resonanz.example", ""), "");
});

test("die Zieladresse wird ohne doppelten Schrägstrich zusammengesetzt", () => {
  assert.match(skript, /"https:\/\/resonanz\.example\/resonanz"/);
  assert.doesNotMatch(skript, /example\/\/resonanz/);
});

test("die Vorschau des Betreibers zählt nicht als Öffnung durch den Wirt", () => {
  assert.match(skript, /vorschau/);
  // Der Ausstieg muss vor jedem Senden stehen, sonst ist er wirkungslos.
  assert.ok(skript.indexOf("vorschau") < skript.indexOf("fetch("));
});

test("beide Signale werden gesendet: sofort beim Öffnen und beim Weggehen", () => {
  assert.match(skript, /keepalive/);
  assert.match(skript, /sendBeacon/);
  assert.match(skript, /visibilitychange/);
});

test("das Sektionssignal hängt an einem eigenen Observer auf der Reservierung", () => {
  // Nicht an MOTION_SCRIPT andocken: das steigt bei reduzierter Bewegung aus,
  // bevor ein Observer entsteht (motion.js). Sonst verlöre genau der Wirt mit
  // prefers-reduced-motion sein stärkstes Signal.
  assert.match(skript, /IntersectionObserver/);
  assert.match(skript, /getElementById\("reservierung"\)/);
});

test("die Kennung lebt im sessionStorage, nicht in einem Cookie", () => {
  assert.match(skript, /sessionStorage\.setItem/);
  assert.doesNotMatch(skript, /document\.cookie/);
  // Auf Verwendung prüfen, nicht auf Erwähnung: der Kommentar im Skript nennt
  // localStorage als das, was hier bewusst nicht genommen wurde.
  assert.doesNotMatch(skript, /localStorage\./);
});

test("das Beacon fasst den Betriebsserver des Wirts nicht an", () => {
  // apiUrl gehört dem Wirt (Reservierungen, Bestellungen) und ist bei einem
  // Entwurf leer – das Beacon hat dort nichts zu suchen.
  assert.doesNotMatch(skript, /apiUrl/);
});

test("nichts Personenbezogenes wird eingesammelt", () => {
  assert.doesNotMatch(skript, /userAgent|navigator\.language|screen\.|Intl\.|referrer/);
});
