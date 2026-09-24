import { test } from "node:test";
import assert from "node:assert/strict";
import { baueSite } from "../v2/build/siteBuilder.js";
import { buehnenSchleier, SCHLEIER_ZIELE } from "../v2/build/ausdruck.js";
import { ladeDesignsystem, kombinationen } from "../v2/build/designsystemGenerator.js";
import { pruefeFunktionsVertrag } from "../v2/build/v1Funktionen.js";
import { lint } from "../v2/build/antiSlopLint.js";
import { contrastRatio, mixColors } from "../src/colorMath.js";
import { DEMO_LEADS } from "../src/demoLeads.js";

const demo = DEMO_LEADS.find((l) => l.kueche === "bayerisch");
const bau = (optionen = {}) => baueSite({ lead: demo, kueche: "bayerisch", optionen: { fiktiv: true, veroeffentlicht: true, fontCss: "", ausdruck: "gesellig", ...optionen } });

test("Schleier trägt Kopfzeile (4,5:1) und Slogan (3:1) selbst über reinem Weiß – alle 36 Designsysteme", () => {
  for (const { kueche, stimmung } of kombinationen()) {
    const ds = ladeDesignsystem(kueche, stimmung.id);
    const s = buehnenSchleier(ds);
    assert.ok(s.ok, ds.id);
    const r = ds.farben.rollen;
    assert.ok(contrastRatio(r.aufTint.hex, mixColors(r.tint.hex, "#ffffff", s.kopf)) >= SCHLEIER_ZIELE.kopf, ds.id);
    assert.ok(contrastRatio(r.aufTint.hex, mixColors(r.tint.hex, "#ffffff", s.slogan)) >= SCHLEIER_ZIELE.slogan, ds.id);
    assert.match(s.verlauf, /^linear-gradient\(180deg, rgba\(var\(--tint-rgb\)/);
  }
});

test("erster Bildschirm: Kopfzeile mit Zustand, Bühne mit Poster, Slogan, Einladung mit h1", () => {
  const { html, bericht } = bau();
  assert.match(html, /<header class="kopf" id="topbar" data-zustand="fest" data-ueber="transparent">/, "ohne Skript: fest (lesbar)");
  assert.match(html, /<section class="buehne" data-hero="buehne"/);
  assert.match(html, /<img class="buehne-poster" src="[^"]+" alt="[^"]+" fetchpriority="high"/);
  assert.match(html, /<p class="buehne-slogan">Einkehren in Mühldorf am Inn<\/p>/);
  assert.match(html, /<h1 class="einladung-name">Wirtshaus zur Alten Linde<\/h1>/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /id="kopf-menue"/);
  assert.match(html, /--schleier: linear-gradient/);
  assert.ok(!html.includes('class="leiste"'), "keine Häkchen-Leiste mit Ausdruck");
  assert.ok(!html.includes('class="kopfzeile'), "alte Kopfzeile ersetzt");
  assert.equal(bericht.heroVariante, "buehne");
  assert.deepEqual(pruefeFunktionsVertrag(html), []);
  assert.equal(lint(html).ok, true);
});

test("Aktionen folgen dem Ausdruck: gesellig → Reservieren zuerst (Kopf, Einladung, Aktionsleiste)", () => {
  const { html } = bau();
  const kopf = html.slice(html.indexOf('class="kopf-aktionen"'), html.indexOf('class="kopf-menue-knopf"'));
  assert.match(kopf, /btn-ghost kopf-zweit" href="#karte"[^>]*>Bestellen<\/a><a class="btn btn-primary kopf-erst" href="#reservierung"/);
  const leiste = html.slice(html.indexOf('id="mobilebar"'));
  assert.ok(leiste.indexOf("#reservierung") < leiste.indexOf('id="bar-order"'));
  const handwerk = bau({ ausdruck: "handwerk" }).html;
  assert.match(handwerk, /class="btn btn-primary kopf-erst" href="#karte"/);
});

test("Video nur mit Poster und erst per Skript (preload=none, data-src)", () => {
  const medien = {
    hero: { src: "medien/hero.jpg", herkunft: "ki", kennzeichnung: "KI-generiert" },
    heroVideo: { src: "medien/heroVideo.mp4", herkunft: "ki", typ: "video" },
    heroVideoMobil: { src: "medien/heroVideoMobil.mp4", herkunft: "ki", typ: "video" },
    haus: null,
    team: null,
    bestseller: null,
    gericht: () => null,
  };
  const { html } = bau({ medien });
  assert.match(html, /<video class="buehne-video" muted loop playsinline preload="none" aria-hidden="true" data-src="medien\/heroVideo.mp4" data-src-mobil="medien\/heroVideoMobil.mp4"><\/video>/);
  assert.ok(!/<video[^>]*\ssrc=/.test(html), "kein src im Markup – das Poster lädt zuerst");
  assert.match(html, /<span class="buehne-herkunft">KI-generiert<\/span>/);
});

test("Lint: Verlauf in der Bühne nur als geprüfter Schleier-Token", () => {
  const { html } = bau();
  const manipuliert = html.replace(".buehne-schleier { position: absolute; inset: 0; background: var(--schleier); }", ".buehne-schleier { position: absolute; inset: 0; background: linear-gradient(180deg, var(--tint), transparent); }");
  assert.notEqual(manipuliert, html);
  assert.ok(lint(manipuliert).fehler.some((f) => f.regel === "text-auf-foto-mit-verlauf"));
});

test("Poster quer + hoch mit eigenem Bildausschnitt; beide Dateien werden mitkopiert", () => {
  const medien = {
    hero: { src: "medien/hero.jpg", datei: "/x/hero.jpg", herkunft: "ki", kennzeichnung: "KI-generiert", fokus: "50% 82%" },
    heroMobil: { src: "medien/heroMobil.jpg", datei: "/x/heroMobil.jpg", herkunft: "ki", kennzeichnung: "KI-generiert", fokus: "50% 55%" },
    haus: null,
    team: null,
    bestseller: null,
    gericht: () => null,
  };
  const { html, dateien } = bau({ medien });
  assert.match(html, /<section class="buehne" data-hero="buehne" data-slogan="ueber-medium" data-rueckzug aria-label="Willkommen" style="--fokus: 50% 82%; --fokus-mobil: 50% 55%">/);
  assert.match(html, /<picture><source media="\(max-width: 767px\)" srcset="medien\/heroMobil.jpg"><img class="buehne-poster" src="medien\/hero.jpg"/);
  assert.deepEqual(dateien.map((d) => d.src).sort(), ["medien/hero.jpg", "medien/heroMobil.jpg"]);
});

test("Video 'einmal': ohne Schleife, WebM-Alternative, auf dem Handy nur Poster, beide Dateien mitkopiert", () => {
  const medien = {
    hero: { src: "medien/hero.jpg", herkunft: "ki", kennzeichnung: "KI-generiert" },
    heroMobil: { src: "medien/heroMobil.jpg", herkunft: "ki" },
    heroVideo: { src: "medien/heroVideo.mp4", datei: "/x/heroVideo.mp4", herkunft: "ki", typ: "video", wiedergabe: "einmal", webm: { src: "medien/heroVideo.webm", datei: "/x/heroVideo.webm" } },
    haus: null,
    team: null,
    bestseller: null,
    gericht: () => null,
  };
  const { html, dateien } = bau({ medien });
  const video = html.match(/<video[^>]*>/)[0];
  assert.ok(!/\sloop\b/.test(video), "keine Schleife");
  assert.match(video, /data-src="medien\/heroVideo.mp4" data-src-webm="medien\/heroVideo.webm"/);
  assert.match(video, /data-einmal data-nur-breit/);
  assert.ok(dateien.some((d) => d.src === "medien/heroVideo.webm"));
  assert.match(html, /if \(einmal && video\.ended\) return;/);
});

test("handwerk: Kopfzeile immer fest, Slogan unter dem Medium, kein Rückzug", () => {
  const { html } = bau({ ausdruck: "handwerk" });
  assert.match(html, /<header class="kopf" id="topbar" data-zustand="fest" data-ueber="flaeche">/);
  assert.match(html, /<section class="buehne" data-hero="buehne" data-slogan="unter-medium" aria-label=/);
  assert.match(html, /var transparent = kopf.getAttribute\("data-ueber"\) !== "flaeche";/);
});

test("editorial: Titelblatt mit Medium im Rahmen (quer, auf dem Handy hoch), kein Schleier", () => {
  const medien = {
    hero: { src: "medien/hero.jpg", herkunft: "ki", kennzeichnung: "KI-generiert" },
    heroMobil: { src: "medien/heroMobil.jpg", herkunft: "ki", kennzeichnung: "KI-generiert", fokus: "50% 40%" },
    haus: null, team: null, bestseller: null, gericht: () => null,
  };
  const { html, bericht } = bau({ ausdruck: "editorial", medien });
  assert.equal(bericht.heroVariante, "titelblatt");
  assert.match(html, /<section class="titelblatt" data-hero="titelblatt"/);
  assert.match(html, /<figure class="titelblatt-bild" style="--fokus-mobil: 50% 40%"><picture><source media="\(max-width: 767px\)" srcset="medien\/heroMobil.jpg"><img class="buehne-poster" src="medien\/hero.jpg"/);
  assert.ok(!html.includes('<section class="buehne"'));
  assert.equal(lint(html).ok, true);
  assert.deepEqual(pruefeFunktionsVertrag(html), []);
});
