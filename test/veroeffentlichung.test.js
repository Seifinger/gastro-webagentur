import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  veroeffentlicheEntwurf,
  baueEntwurfHook,
  gitAufrufHook,
} from "../src/veroeffentlichung.js";
import { siteBaseUrl } from "../src/config.js";

// Muss zum repoRoot passen, den veroeffentlichung.js selbst berechnet
// (path.join(__dirname, "..") von src/ aus) – sonst ergibt path.relative()
// im Test einen anderen Pfad als in der echten Route.
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
function fakeOrdner(slug) {
  return path.join(repoRoot, "docs", slug);
}

/**
 * Ersetzt beide Hooks für die Dauer von fn() durch Fakes – analog zu
 * llmAufrufHook in promptEdits.js. So lässt sich die komplette Route prüfen,
 * ohne wirklich zu bauen (kein Netzzugriff für Schriften) oder wirklich
 * "git" aufzurufen.
 */
async function mitFakes({ baueEntwurf, gitAufruf }, fn) {
  const alterBau = baueEntwurfHook.aktuell;
  const alterGit = gitAufrufHook.aktuell;
  baueEntwurfHook.aktuell = baueEntwurf ?? alterBau;
  gitAufrufHook.aktuell = gitAufruf ?? alterGit;
  try {
    return await fn();
  } finally {
    baueEntwurfHook.aktuell = alterBau;
    gitAufrufHook.aktuell = alterGit;
  }
}

test("veroeffentlicheEntwurf: add, status, commit, Abgleich mit dem Remote, push laufen in der richtigen Reihenfolge", async () => {
  const aufrufe = [];

  await mitFakes(
    {
      baueEntwurf: async (slug) => ({ slug, ordner: fakeOrdner(slug) }),
      gitAufruf: async (args) => {
        aufrufe.push(args);
        if (args[0] === "status") return { stdout: " M docs/mein-slug/index.html\n" };
        return { stdout: "" };
      },
    },
    async () => {
      const ergebnis = await veroeffentlicheEntwurf("mein-slug");
      assert.equal(ergebnis.veraendert, true);
      assert.equal(ergebnis.url, `${siteBaseUrl}/mein-slug/`);
    },
  );

  assert.equal(aufrufe.length, 5);
  assert.deepEqual(aufrufe[0], ["add", "docs/mein-slug"]);
  assert.deepEqual(aufrufe[1], ["status", "--porcelain", "--", "docs/mein-slug"]);
  assert.deepEqual(aufrufe[2], ["commit", "-m", "Entwurf für mein-slug aktualisiert"]);
  assert.deepEqual(aufrufe[3], ["pull", "--rebase", "--autostash"]);
  assert.deepEqual(aufrufe[4], ["push"]);
});

test("veroeffentlicheEntwurf: ohne Änderungen wird nicht committet oder gepusht", async () => {
  const aufrufe = [];

  await mitFakes(
    {
      baueEntwurf: async (slug) => ({ slug, ordner: fakeOrdner(slug) }),
      gitAufruf: async (args) => {
        aufrufe.push(args);
        if (args[0] === "status") return { stdout: "" };
        return { stdout: "" };
      },
    },
    async () => {
      const ergebnis = await veroeffentlicheEntwurf("unveraendert");
      assert.equal(ergebnis.veraendert, false);
      assert.equal(ergebnis.url, `${siteBaseUrl}/unveraendert/`);
    },
  );

  assert.equal(aufrufe.length, 2);
  assert.equal(aufrufe[0][0], "add");
  assert.equal(aufrufe[1][0], "status");
});

test("veroeffentlicheEntwurf: ein Fehler beim Push wird verständlich durchgereicht", async () => {
  await mitFakes(
    {
      baueEntwurf: async (slug) => ({ slug, ordner: fakeOrdner(slug) }),
      gitAufruf: async (args) => {
        if (args[0] === "status") return { stdout: " M docs/mein-slug/index.html\n" };
        if (args[0] === "push") {
          throw new Error("git push fehlgeschlagen: fatal: Could not resolve host: github.com");
        }
        return { stdout: "" };
      },
    },
    async () => {
      await assert.rejects(veroeffentlicheEntwurf("mein-slug"), /Could not resolve host/);
    },
  );
});

test("veroeffentlicheEntwurf: ein Fehler beim Bauen bricht ab, bevor irgendein Git-Befehl läuft", async () => {
  const aufrufe = [];

  await mitFakes(
    {
      baueEntwurf: async () => {
        throw new Error('Kein Lead für Slug "unbekannt" gefunden.');
      },
      gitAufruf: async (args) => {
        aufrufe.push(args);
        return { stdout: "" };
      },
    },
    async () => {
      await assert.rejects(veroeffentlicheEntwurf("unbekannt"), /Kein Lead für Slug/);
    },
  );

  assert.equal(aufrufe.length, 0);
});

/* ------------------------ Route in dashboardServer.js ------------------------ */

async function mitServer(fn) {
  const { handler } = await import("../src/dashboardServer.js");
  const server = createServer(handler);
  await new Promise((fertig) => server.listen(0, "127.0.0.1", fertig));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((fertig) => server.close(fertig));
  }
}

test("POST /intern/lead/:slug/veroeffentlichen: Erfolg liefert URL und veraendert:true", async () => {
  await mitFakes(
    {
      baueEntwurf: async (slug) => ({ slug, ordner: fakeOrdner(slug) }),
      gitAufruf: async (args) =>
        args[0] === "status" ? { stdout: " M docs/route-slug/index.html\n" } : { stdout: "" },
    },
    () =>
      mitServer(async (basis) => {
        const antwort = await fetch(`${basis}/intern/lead/route-slug/veroeffentlichen`, { method: "POST" });
        const ergebnis = await antwort.json();

        assert.equal(antwort.status, 200);
        assert.equal(ergebnis.ok, true);
        assert.equal(ergebnis.veraendert, true);
        assert.equal(ergebnis.url, `${siteBaseUrl}/route-slug/`);
      }),
  );
});

test("POST /intern/lead/:slug/veroeffentlichen: ein Git-Fehler antwortet mit 400 statt den Server abstürzen zu lassen", async () => {
  await mitFakes(
    {
      baueEntwurf: async (slug) => ({ slug, ordner: fakeOrdner(slug) }),
      gitAufruf: async (args) => {
        if (args[0] === "status") return { stdout: " M docs/route-fehler/index.html\n" };
        if (args[0] === "commit") {
          throw new Error(
            "git commit fehlgeschlagen: CONFLICT (content): Merge conflict in docs/route-fehler/index.html",
          );
        }
        return { stdout: "" };
      },
    },
    () =>
      mitServer(async (basis) => {
        const antwort = await fetch(`${basis}/intern/lead/route-fehler/veroeffentlichen`, { method: "POST" });
        const ergebnis = await antwort.json();

        assert.equal(antwort.status, 400);
        assert.equal(ergebnis.ok, false);
        assert.match(ergebnis.fehler, /Merge conflict/);
      }),
  );

  // Der Server steht danach weiterhin – eine ganz normale Folgeanfrage klappt.
  await mitServer(async (basis) => {
    const antwort = await fetch(`${basis}/api/leads`);
    assert.equal(antwort.status, 200);
  });
});

test("POST /intern/lead/:slug/veroeffentlichen: ein unbekannter Slug antwortet mit 400", async () => {
  await mitFakes(
    {
      baueEntwurf: async () => {
        throw new Error('Kein Lead für Slug "unbekannt-xyz" gefunden.');
      },
    },
    () =>
      mitServer(async (basis) => {
        const antwort = await fetch(`${basis}/intern/lead/unbekannt-xyz/veroeffentlichen`, { method: "POST" });
        const ergebnis = await antwort.json();

        assert.equal(antwort.status, 400);
        assert.match(ergebnis.fehler, /Kein Lead für Slug/);
      }),
  );
});
