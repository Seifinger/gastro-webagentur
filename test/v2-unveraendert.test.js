import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { snapshotHashes, SNAPSHOT_PFAD } from "../v2/build/unveraendert.js";

// Siehe v2/build/unveraendert.js: Seiten ohne Ausdruck bleiben Byte für Byte gleich.
test("v2-Seiten ohne Ausdruck bauen unverändert (Snapshot)", () => {
  const erwartet = JSON.parse(readFileSync(SNAPSHOT_PFAD, "utf-8"));
  const ist = snapshotHashes();
  assert.deepEqual(Object.keys(ist).sort(), Object.keys(erwartet).sort());
  const abweichend = Object.keys(erwartet).filter((k) => ist[k] !== erwartet[k]);
  assert.deepEqual(abweichend, [], `Geänderte Seiten – gewollt? Dann "npm run v2:snapshot": ${abweichend.join(", ")}`);
});
