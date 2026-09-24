// Erzeugt den Wert für DASHBOARD_PASSWORT_HASH (scrypt, mit Salz).
// Aufruf: npm run dashboard:passwort   – das Passwort wird ohne Anzeige
// abgefragt und nirgends gespeichert. Den ausgegebenen Hash beim Host als
// Umgebungsvariable (Secret) eintragen, nie ins Repository.
import { erzeugePasswortHash } from "../src/dashboardAnmeldung.js";

async function liesPasswort() {
  if (!process.stdin.isTTY) {
    let roh = "";
    for await (const teil of process.stdin) roh += teil;
    return roh.replace(/\r?\n$/, "");
  }
  process.stdout.write("Neues Dashboard-Passwort (mind. 12 Zeichen): ");
  process.stdin.setRawMode(true);
  let eingabe = "";
  return new Promise((fertig) => {
    process.stdin.on("data", (b) => {
      for (const z of b.toString("utf8")) {
        if (z === "\r" || z === "\n") {
          process.stdin.setRawMode(false);
          process.stdout.write("\n");
          process.stdin.pause();
          return fertig(eingabe);
        }
        if (z === "\u0003") process.exit(1);
        if (z === "\u007f") eingabe = eingabe.slice(0, -1);
        else eingabe += z;
      }
    });
  });
}

try {
  console.log(erzeugePasswortHash(await liesPasswort()));
} catch (fehler) {
  console.error(fehler.message);
  process.exitCode = 1;
}
