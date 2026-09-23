import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  loeseMedien,
  registriereEigenesMedium,
  erzeugeMedien,
  platzhalterProvider,
  replicateProvider,
  waehleProvider,
  promptFuer,
  medienUebersicht,
  KENNZEICHNUNG,
} from "../v2/assets-pipeline/mediaGenerator.js";
import { ladeDesignsystem } from "../v2/build/designsystemGenerator.js";
import { baueSite, schreibeSite } from "../v2/build/siteBuilder.js";
import { themeForLead } from "../v2/build/v1Funktionen.js";
import { testLeadFuer } from "../v2/build/testLeads.js";

const tmp = mkdtempSync(path.join(tmpdir(), "__test-v2-medien-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

const ds = ladeDesignsystem("italienisch", "trattoria");
const lead = testLeadFuer("italienisch", "trattoria");
const gestaltung = themeForLead(lead, "italienisch", "trattoria");
const slug = "__test-v2-medien";
const kiDir = path.join(tmp, "ki");
const foto = path.join(tmp, "foto.jpg");
writeFileSync(foto, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));

test("ohne eigene Medien: Stock als Platzhalter, Badge nur an Haus-Fotos echter Häuser", () => {
  const m = loeseMedien({ slug, gestaltung, eigene: {}, leadEdits: {}, kiDir, ds });
  assert.equal(m.hero.herkunft, "platzhalter");
  assert.equal(m.hero.kennzeichnung, "Platzhalter");
  assert.equal(m.hero.badge, null);
  assert.equal(m.haus.badge, "Platzhalter");
  assert.match(m.hero.src, /images\.unsplash\.com/);
});

test("offline ohne Stock: lokaler SVG-Platzhalter statt leerer Fläche", () => {
  const m = loeseMedien({ slug, gestaltung, eigene: {}, leadEdits: {}, kiDir, ds, offline: true });
  assert.match(m.hero.src, /^data:image\/svg\+xml,/);
});

test("Vorrang: eigene (Chat) > Dashboard-Upload > KI-Cache > Stock", async () => {
  await erzeugeMedien({ slug, ds, provider: { ...platzhalterProvider, name: "fake-ki" }, rollen: ["hero", "haus"], dir: kiDir, eigene: {} });
  const ki = loeseMedien({ slug, gestaltung, eigene: {}, leadEdits: {}, kiDir, ds });
  assert.equal(ki.hero.herkunft, "ki");
  assert.equal(ki.hero.badge, "KI-generiert", "KI-Material ist auf der Seite immer gekennzeichnet");

  const upload = loeseMedien({ slug, gestaltung, eigene: {}, leadEdits: { bilder: { hero: "/uploads/x/hero.jpg" } }, kiDir, ds });
  assert.equal(upload.hero.herkunft, "eigen");
  assert.equal(upload.hero.kennzeichnung, "eigenes Foto");
  assert.equal(upload.hero.badge, null);

  const manifest = path.join(tmp, "eigene.json");
  registriereEigenesMedium({ slug, rolle: "hero", datei: foto, herkunft: "ki", quelle: "Chat", manifest, zielDir: path.join(tmp, "eigene") });
  const eigene = JSON.parse(readFileSync(manifest, "utf-8"));
  const chat = loeseMedien({ slug, gestaltung, eigene, leadEdits: { bilder: { hero: "/uploads/x/hero.jpg" } }, kiDir, ds });
  assert.equal(chat.hero.herkunft, "ki");
  assert.match(chat.hero.quelle, /^eigene:/, "Chat-Medium schlägt Upload und Generiertes");
  assert.ok(existsSync(chat.hero.datei));
});

test("erzeugeMedien gibt für Rollen mit eigenen Medien nie etwas aus", async () => {
  let aufrufe = 0;
  const zaehler = { ...platzhalterProvider, name: "zaehler", erzeuge: async (a) => { aufrufe += 1; return platzhalterProvider.erzeuge(a); } };
  await erzeugeMedien({ slug: "__test-v2-skip", ds, provider: zaehler, rollen: ["hero", "haus"], dir: kiDir, eigene: { "__test-v2-skip": { hero: { datei: "x", herkunft: "eigen" } } } });
  assert.equal(aufrufe, 1);
});

test("Platzhalter-Provider ist deterministisch und nutzt die Palette", async () => {
  const a = await platzhalterProvider.erzeuge({ ds, rolle: "hero", seed: 7, titel: "Foto folgt" });
  const b = await platzhalterProvider.erzeuge({ ds, rolle: "hero", seed: 7, titel: "Foto folgt" });
  assert.equal(a.buffer.toString(), b.buffer.toString());
  assert.ok(a.buffer.toString().includes(ds.farben.rollen.flaecheTief.hex));
});

test("Replicate-Provider: Prompt aus dem Bild-Kanon, Token Pflicht, Ergebnis wird geladen", async () => {
  const alt = process.env.REPLICATE_API_TOKEN;
  delete process.env.REPLICATE_API_TOKEN;
  assert.equal(replicateProvider.verfuegbar(), false);
  assert.equal(waehleProvider(), platzhalterProvider);
  process.env.REPLICATE_API_TOKEN = "test";
  try {
    const anfragen = [];
    const abruf = async (url, opt = {}) => {
      anfragen.push({ url, body: opt.body });
      if (url.includes("/predictions")) return { ok: true, json: async () => ({ status: "succeeded", id: "p1", output: ["https://replicate.delivery/x.jpg"] }) };
      return { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
    };
    const { prompt, negativ, format } = promptFuer(ds, "hero");
    const r = await replicateProvider.erzeuge({ prompt, negativ, format, seed: 3, abruf });
    assert.equal(r.endung, "jpg");
    assert.match(anfragen[0].url, /flux/);
    assert.match(JSON.parse(anfragen[0].body).input.prompt, /editorial restaurant photography/);
    assert.equal(JSON.parse(anfragen[0].body).input.aspect_ratio, "16:9");
  } finally {
    if (alt === undefined) delete process.env.REPLICATE_API_TOKEN;
    else process.env.REPLICATE_API_TOKEN = alt;
  }
});

test("Build übernimmt Medien, Bericht nennt die Kennzeichnung je Rolle, Dateien werden mitkopiert", () => {
  const manifest = JSON.parse(readFileSync(path.join(tmp, "eigene.json"), "utf-8"));
  const medien = loeseMedien({ slug, gestaltung, eigene: manifest, leadEdits: {}, kiDir, ds });
  const { html, bericht, dateien } = baueSite({ lead, kueche: "italienisch", stimmung: "trattoria", optionen: { medien, fiktiv: true, fontCss: "" } });
  assert.equal(bericht.medien.hero.kennzeichnung, KENNZEICHNUNG.ki);
  assert.match(html, /data-herkunft="ki"/);
  assert.ok(dateien.some((d) => d.src === "medien/hero.jpg"));
  const { ordner } = schreibeSite({ lead, kueche: "italienisch", stimmung: "trattoria", optionen: { medien, fiktiv: true, fontCss: "" } }, { zielDir: path.join(tmp, "sites"), slug });
  assert.ok(existsSync(path.join(ordner, "medien", "hero.jpg")));
});

test("Hero-Video: Poster ist das Titelbild", () => {
  const medien = loeseMedien({ slug: "__x", gestaltung, eigene: { __x: { heroVideo: { datei: path.relative(path.resolve("."), foto).replace(/foto\.jpg$/, "foto.jpg"), herkunft: "eigen" } } }, leadEdits: {}, kiDir, ds });
  medien.heroVideo = { ...medien.heroVideo, typ: "video", src: "medien/heroVideo.mp4" };
  const { html } = baueSite({ lead, kueche: "italienisch", stimmung: "trattoria", optionen: { medien, fiktiv: true, fontCss: "" } });
  assert.match(html, /<video[^>]+src="medien\/heroVideo\.mp4"[^>]+poster="https:\/\/images\.unsplash\.com/);
  assert.equal(medienUebersicht(medien).find((z) => z.rolle === "heroVideo").kennzeichnung, "eigenes Foto");
});
