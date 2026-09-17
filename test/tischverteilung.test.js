import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ladeBetrieb,
  speichereBetrieb,
  legeTischAn,
  legeReservierungAn,
  setzeReservierungStatus,
  freiePlaetze,
  unverteilbareGruppen,
  tischVerteilung,
  tischKonflikte,
} from "../src/betriebStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLUG = "__test-verteilung";
const dateiPfad = path.join(__dirname, "..", "data", "betrieb", `${SLUG}.json`);

// Der Fall, um den es geht: 4er- und 2er-Tisch, also 6 Plätze. Zwei Dreier-
// gruppen gehen auf dem Papier auf, im Raum aber nicht.
function kleinesLokal() {
  legeTischAn(SLUG, { name: "Tisch 1", plaetze: 4 });
  legeTischAn(SLUG, { name: "Tisch 2", plaetze: 2 });
}

function gast(personen, uhrzeit = "19:00", name = "Gast") {
  return { datum: "2026-10-01", uhrzeit, personen, name };
}

beforeEach(() => {
  speichereBetrieb(SLUG, { tische: [], reservierungen: [], bestellungen: [] });
});

after(() => {
  rmSync(dateiPfad, { force: true });
});

test("unverteilbareGruppen verteilt so gut, wie es überhaupt geht", () => {
  assert.deepEqual(unverteilbareGruppen([{ plaetze: 4 }, { plaetze: 2 }], [3, 3]), [3]);
  assert.deepEqual(unverteilbareGruppen([{ plaetze: 4 }, { plaetze: 2 }], [3, 2]), []);
  // Reihenfolge der Eingabe darf das Ergebnis nicht ändern: die kleine Gruppe
  // darf nicht den großen Tisch blockieren.
  assert.deepEqual(unverteilbareGruppen([{ plaetze: 4 }, { plaetze: 2 }], [2, 4]), []);
  assert.deepEqual(unverteilbareGruppen([{ plaetze: 4 }, { plaetze: 2 }], [4, 2]), []);
  // Mehr Gruppen als Tische.
  assert.deepEqual(unverteilbareGruppen([{ plaetze: 4 }], [2, 2]), [2]);
  assert.deepEqual(unverteilbareGruppen([], [2]), [2]);
  assert.deepEqual(unverteilbareGruppen([{ plaetze: 4 }], []), []);
});

test("Zwei Dreiergruppen auf 4+2 Plätzen: die Summe stimmt, die Tische nicht", () => {
  kleinesLokal();
  legeReservierungAn(SLUG, gast(3, "19:00", "Erste Gruppe"), "manuell");

  const daten = ladeBetrieb(SLUG);
  // Rechnerisch ist noch Platz – genau das ist die Falle.
  assert.equal(freiePlaetze(daten, "2026-10-01", "19:00"), 3);

  const problem = tischVerteilung(daten, "2026-10-01", "19:00", { zusatz: 3 });
  assert.ok(problem, "die Tischverteilung müsste auffallen");
  assert.deepEqual(problem.offen, [3]);
  assert.match(problem.wirtText, /nicht die Tische/);
  assert.match(problem.wirtText, /Tische zusammenstellen/);
});

test("Online wird die zweite Dreiergruppe abgelehnt", () => {
  kleinesLokal();
  legeReservierungAn(SLUG, gast(3, "19:00", "Erste Gruppe"), "manuell");

  assert.throws(
    () => legeReservierungAn(SLUG, gast(3, "19:00", "Zweite Gruppe"), "online"),
    /keinen passenden Tisch/,
  );
  // Nichts darf gespeichert worden sein.
  assert.equal(ladeBetrieb(SLUG).reservierungen.length, 1);
});

test("Die Absage an den Gast verrät den Tischplan nicht", () => {
  kleinesLokal();
  legeReservierungAn(SLUG, gast(3, "19:00", "Erste Gruppe"), "manuell");

  try {
    legeReservierungAn(SLUG, gast(3, "19:00", "Zweite Gruppe"), "online");
    assert.fail("hätte ablehnen müssen");
  } catch (fehler) {
    assert.doesNotMatch(fehler.message, /Tisch 1|Tisch 2|zusammenstellen/);
  }
});

test("Der Wirt wird gewarnt, aber nicht blockiert", () => {
  kleinesLokal();
  legeReservierungAn(SLUG, gast(3, "19:00", "Erste Gruppe"), "manuell");

  // Am Telefon kennt der Wirt seinen Raum und kann Tische zusammenstellen.
  const zweite = legeReservierungAn(SLUG, gast(3, "19:00", "Zweite Gruppe"), "manuell");
  assert.equal(ladeBetrieb(SLUG).reservierungen.length, 2);
  assert.match(zweite.warnung, /nicht die Tische/);
});

test("Passt alles, kommt keine Warnung", () => {
  kleinesLokal();
  legeReservierungAn(SLUG, gast(4, "19:00", "Vierergruppe"), "manuell");
  const zweite = legeReservierungAn(SLUG, gast(2, "19:00", "Zweiergruppe"), "manuell");
  assert.equal(zweite.warnung, "");
  assert.equal(tischKonflikte(ladeBetrieb(SLUG)).length, 0);
});

test("Zu anderer Zeit ist derselbe Tisch wieder frei", () => {
  kleinesLokal();
  legeReservierungAn(SLUG, gast(3, "17:00", "Früh"), "manuell");
  // 17:00 und 19:00 liegen mehr als das Belegfenster auseinander.
  const spaet = legeReservierungAn(SLUG, gast(3, "19:00", "Spät"), "online");
  assert.equal(spaet.warnung, "");
});

test("Eine Gruppe, für die es gar keinen Tisch gibt, wird beim Namen genannt", () => {
  kleinesLokal();
  // 6 Personen, aber der größte Tisch hat 4 Plätze. Die Platzsumme wäre
  // erfüllt – zusammenstellen hilft hier auch nicht weiter.
  const problem = tischVerteilung(ladeBetrieb(SLUG), "2026-10-01", "19:00", { zusatz: 6 });
  assert.ok(problem);
  assert.match(problem.wirtText, /größte Tisch im Haus hat 4 Plätze/);
});

test("Eine Absage löst den Konflikt wieder auf", () => {
  kleinesLokal();
  const erste = legeReservierungAn(SLUG, gast(3, "19:00", "Erste Gruppe"), "manuell");
  legeReservierungAn(SLUG, gast(3, "19:00", "Zweite Gruppe"), "manuell");
  assert.equal(tischKonflikte(ladeBetrieb(SLUG)).length, 1);

  setzeReservierungStatus(SLUG, erste.id, "abgesagt");
  assert.equal(tischKonflikte(ladeBetrieb(SLUG)).length, 0);
});

test("tischKonflikte nennt jeden Zeitpunkt nur einmal", () => {
  // Ein Vierer und drei Zweier: 10 Plätze für drei Dreiergruppen. Die Summe
  // reicht locker, an die Tische passen aber nur zwei der drei Gruppen.
  legeTischAn(SLUG, { name: "Tisch 1", plaetze: 4 });
  legeTischAn(SLUG, { name: "Tisch 2", plaetze: 2 });
  legeTischAn(SLUG, { name: "Tisch 3", plaetze: 2 });
  legeTischAn(SLUG, { name: "Tisch 4", plaetze: 2 });

  legeReservierungAn(SLUG, gast(3, "19:00", "A"), "manuell");
  legeReservierungAn(SLUG, gast(3, "19:00", "B"), "manuell");
  legeReservierungAn(SLUG, gast(3, "19:00", "C"), "manuell");

  const konflikte = tischKonflikte(ladeBetrieb(SLUG));
  assert.equal(konflikte.length, 1);
  assert.equal(konflikte[0].uhrzeit, "19:00");
  assert.deepEqual(konflikte[0].offen, [3, 3]);
});

test("Ohne Tischplan bleibt es bei der bisherigen Meldung", () => {
  assert.throws(() => legeReservierungAn(SLUG, gast(2), "online"), /kein Tisch angelegt/);
});
