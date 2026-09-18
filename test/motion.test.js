import test from "node:test";
import assert from "node:assert/strict";
import { MOTION_CSS, MOTION_SCRIPT } from "../src/motion.js";
import { buildLandingPage } from "../src/landingPageGenerator.js";
import { menuForCuisine } from "../src/menuCatalog.js";

const lead = {
  name: "Trattoria Beispiel",
  ort: "Mühldorf am Inn",
  adresse: "Marktplatz 1, 84453 Mühldorf am Inn",
  telefon: "08631 123456",
  placeId: "test-motion",
};

function seite(optionen = {}) {
  return buildLandingPage(lead, { menu: menuForCuisine("italienisch"), ...optionen });
}

test("Die Startwerte der Einblendung hängen an der Klasse, die erst das Skript setzt", () => {
  // Ohne diese Kopplung wäre die Seite ohne JavaScript leer – der schlimmste
  // aller Fälle, weil er beim Kunden erst auffällt, wenn es zu spät ist.
  const zeilen = MOTION_CSS.split("\n").filter((z) => /opacity:\s*0\b/.test(z));
  assert.ok(zeilen.length > 0, "keine Startwerte gefunden – Test prüft nichts");

  for (const zeile of zeilen) {
    // Startwerte innerhalb einer @keyframes-Regel sind unkritisch – die
    // gelten nur, solange die Animation läuft.
    if (/@keyframes|from\s*\{/.test(zeile)) continue;

    const regel = MOTION_CSS.slice(0, MOTION_CSS.indexOf(zeile) + zeile.length);
    const selektor = regel.slice(regel.lastIndexOf("}") + 1);
    assert.match(
      selektor,
      /\.bewegt|@keyframes|from\s*\{/,
      `Startwert ohne .bewegt-Kopplung: ${zeile.trim()}`,
    );
  }
});

test("Bewegung lässt sich systemweit abstellen", () => {
  assert.match(MOTION_CSS, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(MOTION_SCRIPT, /prefers-reduced-motion: reduce/);
  // Das Skript muss vor dem Verstecken aussteigen, nicht danach.
  const abbruch = MOTION_SCRIPT.indexOf("if (ruhig.matches || erzwungenRuhig) return;");
  const versteckt = MOTION_SCRIPT.indexOf('classList.add("bewegt")');
  assert.ok(abbruch > -1 && abbruch < versteckt);
});

test("?bewegung=aus stellt die Seite genauso ruhig wie prefers-reduced-motion", () => {
  // Kein echter Browser im Testlauf, deshalb Prüfung auf Quelltextebene
  // (wie beim Test oben) statt auf tatsächlichem DOM-Verhalten. Zusätzlich
  // manuell mit dem mitgelieferten Chromium verifiziert (siehe Commit): mit
  // ?bewegung=aus bleibt document.documentElement ohne Klasse "bewegt",
  // bekommt aber "bewegung-aus" – ohne den Parameter ändert sich nichts.
  const ausgelesen = MOTION_SCRIPT.indexOf('URLSearchParams(location.search).get("bewegung")');
  const klasseGesetzt = MOTION_SCRIPT.indexOf('classList.add("bewegung-aus")');
  const abbruch = MOTION_SCRIPT.indexOf("if (ruhig.matches || erzwungenRuhig) return;");
  const bewegtGesetzt = MOTION_SCRIPT.indexOf('classList.add("bewegt")');

  assert.ok(ausgelesen > -1, "URL-Parameter wird nicht ausgelesen");
  assert.ok(klasseGesetzt > -1 && klasseGesetzt < abbruch, ".bewegung-aus muss vor dem Abbruch gesetzt werden");
  assert.ok(abbruch > -1 && abbruch < bewegtGesetzt, "Abbruch muss vor .bewegt kommen");

  // Dieselben Regeln wie im reduced-motion-Block – per CSS-Nesting
  // verschachtelt, nicht ein zweites Mal ausgeschrieben.
  const mediaIndex = MOTION_CSS.indexOf("@media (prefers-reduced-motion: reduce)");
  const klasseIndex = MOTION_CSS.indexOf(".bewegung-aus {");
  assert.ok(mediaIndex > -1 && klasseIndex > mediaIndex);
  const geteilterInhalt = ".hero-media img { animation: none; }";
  assert.ok(MOTION_CSS.slice(mediaIndex, klasseIndex).includes(geteilterInhalt));
  assert.ok(MOTION_CSS.slice(klasseIndex).includes(geteilterInhalt));
});

test("Animiert werden nur transform und opacity", () => {
  // Alles andere löst ein neues Layout aus und ruckelt auf schwachen Geräten.
  const erlaubt = /^(transform|opacity|background-position-x|animation-play-state|none|transform-origin|will-change)$/;
  for (const treffer of MOTION_CSS.matchAll(/transition:\s*([^;]+);/g)) {
    // Klammerinhalte (cubic-bezier) zuerst entfernen, sonst zerlegt das Komma
    // darin die Liste an der falschen Stelle.
    const liste = treffer[1].replace(/\([^)]*\)/g, "");
    for (const teil of liste.split(",")) {
      const eigenschaft = teil.trim().split(/\s+/)[0];
      assert.match(eigenschaft, erlaubt, `teure Übergangs-Eigenschaft: ${eigenschaft}`);
    }
  }
});

test("Die fertige Seite bringt Stil und Skript der Bewegung mit", () => {
  const html = seite();
  assert.ok(html.includes(".bewegt .auftritt"), "Bewegungs-CSS fehlt in der Seite");
  assert.ok(html.includes("IntersectionObserver"), "Bewegungs-Skript fehlt in der Seite");
});

test("Die Hero-Fahrt hält an, wenn der Hero aus dem Bild ist", () => {
  assert.match(MOTION_CSS, /\.hero\.ruht .* animation-play-state: paused/);
  assert.match(MOTION_SCRIPT, /classList\.toggle\("ruht"/);
});

test("Einmal eingeblendete Inhalte verschwinden nicht wieder", () => {
  assert.match(MOTION_SCRIPT, /unobserve\(eintrag\.target\)/);
});
