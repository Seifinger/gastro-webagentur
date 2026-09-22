import test from "node:test";
import assert from "node:assert/strict";
import { handschriftCss, handschriftKlasse } from "../src/styles/handschrift.css.js";
import { ARCHETYP_PRESET, withDesignDefaults } from "../src/designPresets.js";
import { buildLandingPage, themeForLead } from "../src/landingPageGenerator.js";
import { menuForCuisine } from "../src/menuCatalog.js";
import { stimmungenFuer, STIMMUNGEN } from "../src/stimmungen.js";
import { contrastRatio } from "../src/colorMath.js";
import { kuechenMarke, hatKuechenMarke, KONTAKT_IKONEN } from "../src/signaturIcons.js";
import { SIGNATUR_CSS, signaturCssFuer } from "../src/heroSignature.js";

const lead = {
  name: "Gasthof Beispiel",
  ort: "Mühldorf am Inn",
  adresse: "Marktplatz 1, 84453 Mühldorf am Inn",
  telefon: "08631 123456",
  placeId: "test-handschrift",
  rating: 4.7,
  anzahlBewertungen: 428,
};

function seite(cuisine, stimmungsId, extra = {}) {
  const gestaltung = themeForLead(lead, cuisine, stimmungsId);
  return buildLandingPage(lead, { menu: menuForCuisine(cuisine), gestaltung, ...extra });
}

function stimmungFuer(cuisine, archetyp) {
  return stimmungenFuer(cuisine).find((s) => s.archetyp === archetyp).id;
}

// Welche Archetypen ihre Handschrift schon haben und welche noch nicht. Beim
// nächsten Archetyp wandert einer von rechts nach links.
const MIT_HANDSCHRIFT = ["traditionell", "abend", "hell"];
const OHNE_HANDSCHRIFT = ["editorial"];

/* ---------- Die Handschrift kann keinen anderen Archetyp erreichen ---------- */

/**
 * Sammelt alle Selektoren eines CSS-Blocks, die nicht bereits in einem
 * Elternselektor mit der Körperklasse stecken. CSS-Verschachtelung zählt als
 * Bindung (`.hs-abend { ... }`), eine @media-Regel nicht – die bindet nichts.
 */
function ungebundeneSelektoren(css, klasse) {
  const ohneKommentare = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const lose = [];
  const stapel = [];
  let gelesen = 0;
  let gesamt = 0;

  for (let i = 0; i < ohneKommentare.length; i += 1) {
    const zeichen = ohneKommentare[i];
    if (zeichen === "{") {
      const sel = ohneKommentare.slice(gelesen, i).trim().replace(/\s+/g, " ");
      const gebundenDurchEltern = stapel.some((eltern) => eltern.includes(klasse));
      if (sel && !sel.startsWith("@")) {
        gesamt += 1;
        if (!sel.includes(klasse) && !gebundenDurchEltern) lose.push(sel);
      }
      stapel.push(sel);
      gelesen = i + 1;
    } else if (zeichen === "}") {
      stapel.pop();
      gelesen = i + 1;
    }
  }
  return { lose, gesamt };
}

test("jeder Selektor der Handschrift hängt an ihrer Körperklasse", () => {
  // Das ist der eigentliche Regressionsschutz: Solange jede Regel an
  // .hs-<archetyp> hängt, kann der Block die übrigen Archetypen selbst dann
  // nicht verändern, wenn ihn jemand versehentlich überall einhängt.
  // Geprüft wird auch die Fassung, die eine Küche zusätzlich mitbringt (der
  // gezeichnete Maßkrug bei bayerisch).
  for (const [archetyp, cuisine] of [["traditionell", "bayerisch"], ["abend", "bayerisch"], ["hell", "bayerisch"]]) {
    const { lose, gesamt } = ungebundeneSelektoren(
      handschriftCss(archetyp, cuisine),
      `.hs-${archetyp}`,
    );
    assert.ok(gesamt > 20, `${archetyp}: zu wenige Selektoren – der Test prüft nichts`);
    assert.deepEqual(lose, [], `${archetyp}: ungebundene Selektoren`);
  }
});

test("nur die Küche, die ihn im Markup hat, bekommt das CSS des Maßkrugs", () => {
  const bayern = handschriftCss("traditionell", "bayerisch");
  const italien = handschriftCss("traditionell", "italienisch");
  assert.ok(bayern.includes(".hs-traditionell .sig-krug"));
  assert.ok(!italien.includes(".sig-krug"));
  // Und in der Seite läuft er wirklich: Regel und Keyframes kommen zusammen an.
  const html = seite("bayerisch", "wirtshaus");
  assert.ok(html.includes("animation: sig-beer-schaum"));
  assert.ok(html.includes("@keyframes sig-beer-schaum"));
});

test("ohne Handschrift gibt es weder Klasse noch CSS", () => {
  assert.equal(handschriftCss(null), "");
  assert.equal(handschriftCss(undefined), "");
  assert.equal(handschriftKlasse(null), "");
  // Ein Archetyp, der noch keine Handschrift hat, bekommt auch keine.
  assert.equal(handschriftCss("editorial"), "");
  assert.equal(handschriftKlasse("editorial"), "");
});

test("jeder Archetyp mit Handschrift nennt seine eigene", () => {
  for (const archetyp of MIT_HANDSCHRIFT) {
    assert.equal(ARCHETYP_PRESET[archetyp].layout.handschrift, archetyp);
    assert.ok(handschriftCss(archetyp).length > 1000, `${archetyp}: kein CSS`);
  }
  for (const archetyp of OHNE_HANDSCHRIFT) {
    assert.equal(ARCHETYP_PRESET[archetyp].layout.handschrift, null, archetyp);
    assert.equal(handschriftCss(archetyp), "", archetyp);
  }
  // Die A/B-Varianten der Küchen bleiben ebenfalls unberührt.
  assert.equal(withDesignDefaults().layout.handschrift, null);
});

test("die Seiten der übrigen Archetypen enthalten kein Zeichen der Handschrift", () => {
  for (const archetyp of OHNE_HANDSCHRIFT) {
    const html = seite("bayerisch", stimmungFuer("bayerisch", archetyp));
    for (const teil of ["hs-traditionell", "hl-anordnung", "stimmen-blatt", "hl-siegel", "class=\"marke\""]) {
      assert.ok(!html.includes(teil), `${archetyp}: ${teil} steht fälschlich in der Seite`);
    }
    // Und sie behalten ihre bisherigen Emoji-Symbole.
    assert.ok(html.includes("📍"), `${archetyp}: Kontaktsymbol fehlt`);
  }
});

/* ---------- Was die Handschrift der traditionellen Seite gibt ---------- */

test("die traditionelle Seite trägt Körperklasse und Stilblock", () => {
  const html = seite("bayerisch", "wirtshaus");
  assert.ok(html.includes('<body class="hs-traditionell">'));
  assert.ok(html.includes(".hs-traditionell .hl-anordnung"));
  assert.ok(html.includes("--accent-bold:"));
});

test("die Highlights stufen sich nach Anzahl ab", () => {
  // Bayerisch hat vier Highlights, Italienisch sechs – die Treppe muss beide
  // Fälle benennen, sonst greift in CSS keine Regel.
  const bayern = seite("bayerisch", "wirtshaus");
  assert.ok(bayern.includes('class="hl-grid hl-anordnung hl-anordnung--4"'));

  const italien = seite("italienisch", "trattoria");
  assert.ok(italien.includes('class="hl-grid hl-anordnung hl-anordnung--6"'));

  // Für jede vorkommende Anzahl gibt es auch eine Regel.
  const css = handschriftCss("traditionell");
  for (const n of [3, 4, 6]) {
    assert.ok(css.includes(`.hl-anordnung--${n} >`), `keine Regel für ${n} Karten`);
  }
});

test("genau ein Gericht bekommt das Siegel der Hausempfehlung", () => {
  const html = seite("bayerisch", "wirtshaus");
  assert.equal(html.split('class="hl-siegel"').length - 1, 1);
  // Das Siegel steht im Textteil, nicht als Abzeichen auf dem Foto.
  assert.ok(html.indexOf('class="hl-siegel"') > html.indexOf('class="hl-body"'));
});

test("die Speisekarte steht ohne Kästen und ohne Mittelachse", () => {
  const html = seite("bayerisch", "wirtshaus");
  const karteStart = html.indexOf('id="karte"');
  const kopf = html.slice(karteStart, karteStart + 200);
  assert.ok(kopf.includes('<div class="section-head">'));
  assert.ok(!kopf.includes("section-head mitte"));
  assert.ok(handschriftCss("traditionell").includes(".hs-traditionell .kat { background: transparent; border: 0;"));
});

test("die Gästestimmen stehen als Blatt, nicht als drei leere Kästen", () => {
  const html = seite("bayerisch", "wirtshaus");
  assert.ok(html.includes('class="stimmen-blatt'));
  assert.ok(html.includes('class="stimmen-note-spalte"'));
  // Bei einem echten Haus gibt es keine Zitate. Dann stehen dort auch keine
  // leeren Plätze, sondern die Zusage – die Note trägt die Sektion allein.
  assert.ok(html.includes('class="stimmen-blatt stimmen-blatt--zusage"'));
  assert.ok(!html.includes('class="stimme ist-platzhalter"'));
  assert.ok(!html.includes("Ihre erste Bewertung"));
  assert.ok(html.includes("Was Ihre Gäste sagen"));

  // Ein erfundenes Beispiel-Lokal hat Zitate – dort bleibt das Raster.
  const fiktiv = buildLandingPage(lead, {
    menu: menuForCuisine("bayerisch"),
    gestaltung: themeForLead(lead, "bayerisch", "wirtshaus"),
    fiktiv: true,
  });
  assert.ok(fiktiv.includes('class="stimmen-grid'));
  assert.ok(!fiktiv.includes('class="stimmen-blatt stimmen-blatt--zusage"'));
  assert.ok(fiktiv.includes("Was unsere Gäste sagen"));
  // Ohne Google-Note gäbe es links nichts zu zeigen – dann kein Blatt.
  const ohneNote = buildLandingPage(
    { ...lead, rating: undefined, anzahlBewertungen: undefined },
    { menu: menuForCuisine("bayerisch"), gestaltung: themeForLead(lead, "bayerisch", "wirtshaus") },
  );
  assert.ok(!ohneNote.includes('class="stimmen-blatt"'));
  assert.ok(ohneNote.includes('class="stimmen-grid"'));
});

/* ---------- Signatur-CSS: nur noch die eigene Küche ---------- */

test("ohne Handschrift trägt die Seite weiter alle Signaturregeln", () => {
  // Die Blöcke sind nur anders abgelegt, nicht anders geschrieben. Eine Seite
  // ohne Handschrift muss Zeichen für Zeichen dieselbe bleiben.
  const html = buildLandingPage(lead, { menu: menuForCuisine("bayerisch"), preset: {} });
  assert.ok(html.includes(SIGNATUR_CSS), "die vollständige Vorlage fehlt");
  assert.equal(signaturCssFuer("erfundene-kueche"), SIGNATUR_CSS);
});

test("mit Handschrift bleiben die Regeln der elf anderen Küchen draußen", () => {
  const nurBayern = signaturCssFuer("bayerisch");
  assert.ok(nurBayern.includes(".sig-tafel {"));

  // Geprüft wird der Teil vor dem Block für abgestellte Bewegung. Dessen
  // Selektorliste nennt weiterhin alle Küchen: Sie ist eine einzige Liste von
  // 947 Bytes, und sie zu zerlegen kostete mehr Klarheit, als sie spart.
  const gestaltung = nurBayern.slice(0, nurBayern.indexOf("/* Wer Bewegung im System"));
  assert.ok(gestaltung.length > 1000, "Schnitt an der falschen Stelle");
  for (const fremd of [".sig-pizza", ".sig-band", ".sig-spiess", ".sig-tea-form",
                       ".sig-drehteller", ".sig-tasse", ".sig-orchid", ".sig-spice",
                       ".sig-lanterns", ".sig-schale", ".sig-olive-form",
                       // seit dem gezeichneten Olivenzweig erzeugt niemand mehr .sig-diashow
                       ".sig-diashow"]) {
    assert.ok(!gestaltung.includes(fremd), `${fremd} reist mit`);
  }
  assert.ok(nurBayern.length * 3 < SIGNATUR_CSS.length, "kaum etwas gespart");
});

test("jede Animation, die eine Seite anfordert, bekommt auch ihre Keyframes", () => {
  // Der Fallstrick beim Filtern, an dem der Maßkrug eine Weile stillstand:
  // Die Regel mit "animation: sig-beer-schaum" wurde ausgeliefert, die
  // dazugehörigen @keyframes lagen im aussortierten Block. Im Browser
  // passiert dann nichts, und im Quelltext sieht alles richtig aus.
  for (const cuisine of Object.keys(STIMMUNGEN)) {
    const html = seite(cuisine, stimmungFuer(cuisine, "traditionell"));
    const css = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));

    const vorhanden = new Set([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((t) => t[1]));
    const gefordert = new Set();
    for (const treffer of css.matchAll(/animation:\s*([\w-]+)/g)) gefordert.add(treffer[1]);
    for (const treffer of css.matchAll(/animation-name:\s*([\w-]+)/g)) gefordert.add(treffer[1]);
    gefordert.delete("none");

    assert.ok(gefordert.size > 0, `${cuisine}: keine Animation gefunden, der Test prüft nichts`);
    for (const name of gefordert) {
      assert.ok(vorhanden.has(name), `${cuisine}: "animation: ${name}" ohne @keyframes`);
    }
  }
});

test("jede Küche behält die Regeln, die ihr Markup wirklich braucht", () => {
  // Der eigentliche Fallstrick beim Filtern: eine Küche, deren Signatur im
  // Markup steht, deren Regeln aber herausgefallen sind.
  for (const cuisine of Object.keys(STIMMUNGEN)) {
    const html = seite(cuisine, stimmungFuer(cuisine, "traditionell"));
    const koerper = html.slice(html.indexOf("</head>"));
    const klassen = new Set();
    for (const treffer of koerper.matchAll(/class="sig ([a-z-]+)"/g)) klassen.add(treffer[1]);
    for (const klasse of klassen) {
      assert.ok(html.includes(`.${klasse} `) || html.includes(`.${klasse}{`),
        `${cuisine}: keine Regel für .${klasse}`);
    }
  }
});

/* ---------- Gezeichnete Zeichen statt Symbolschrift ---------- */

test("die traditionelle Seite kommt ohne Emoji-Symbole aus", () => {
  const html = seite("bayerisch", "wirtshaus");
  for (const emoji of ["📍", "📞", "🥡"]) {
    assert.ok(!html.includes(emoji), `${emoji} steht noch in der Seite`);
  }
  // Der Haken der USP-Leiste und der Reservierungs-Pluspunkte ist gezeichnet.
  assert.ok(!html.includes('<span aria-hidden="true">✓</span>'));
  assert.ok(html.includes("ikon-haken"));
  for (const svg of Object.values(KONTAKT_IKONEN)) {
    assert.ok(html.includes(svg), "ein Kontaktsymbol fehlt");
  }
});

test("jede der zwölf Küchen hat eine eigene Marke", () => {
  for (const cuisine of Object.keys(STIMMUNGEN)) {
    assert.ok(hatKuechenMarke(cuisine), `${cuisine} hat keine Marke`);
    assert.match(kuechenMarke(cuisine), /^<svg class="marke"/);
  }
  // Eine unbekannte Küche bekommt lieber gar nichts als ein fremdes Zeichen.
  assert.equal(kuechenMarke("erfundene-kueche"), "");
});

test("die Marke steht an drei Stellen derselben Seite", () => {
  const html = seite("griechisch", stimmungFuer("griechisch", "traditionell"));
  // Kopf der Highlights, Siegel der Hausempfehlung, Fußzeile.
  assert.equal(html.split('<svg class="marke"').length - 1, 3);
});

test("jedes gezeichnete Zeichen ist dekorativ und erbt seine Farbe", () => {
  const alle = [...Object.values(KONTAKT_IKONEN), kuechenMarke("bayerisch")];
  for (const svg of alle) {
    assert.ok(svg.includes('aria-hidden="true"'), svg.slice(0, 60));
    assert.ok(svg.includes('stroke="currentColor"'), svg.slice(0, 60));
    // Keine eigene Farbe: Der Kontrast des Zeichens ist damit der seines Textes.
    assert.ok(!/(fill|stroke)="#/.test(svg), svg.slice(0, 60));
  }
});

/* ---------- Ruhe statt Gleichverteilung ---------- */

test("die Handschrift nimmt Bewegung zurück, statt neue hinzuzufügen", () => {
  const css = handschriftCss("traditionell");
  // Die Hero-Fahrt, die Parallaxe, der Foto-Zoom und die Karten-Hover sind aus.
  for (const regel of [
    ".hs-traditionell .hero-media img { animation: none; }",
    ".hs-traditionell .foto-slot img { animation: none; }",
    ".hs-traditionell .hl-card:hover { transform: none; }",
  ]) {
    assert.ok(css.includes(regel), `fehlt: ${regel}`);
  }
  // Neue @keyframes gibt es keine – der eine Moment ist die Signatur der
  // Küche, und die stand schon vorher in heroSignature.js.
  assert.ok(!css.includes("@keyframes"));
});

test("auch die Handschrift bewegt nur transform und opacity", () => {
  const erlaubt = /^(transform|opacity|none)$/;
  for (const treffer of handschriftCss("traditionell").matchAll(/transition:\s*([^;]+);/g)) {
    const liste = treffer[1].replace(/\([^)]*\)/g, "");
    for (const teil of liste.split(",")) {
      assert.match(teil.trim().split(/\s+/)[0], erlaubt, `teure Eigenschaft: ${teil}`);
    }
  }
});

test("wer keine Bewegung will, bekommt auch von der Handschrift keine", () => {
  const css = handschriftCss("traditionell");
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(css.includes(".bewegung-aus .hs-traditionell .auftritt"));
});

/* ---------- Farbe ---------- */

test("der Akzent der Handschrift erreicht 4.5:1 auf allen drei Gründen", () => {
  // accentBold ist nur gegen bg geprüft; Text steht aber auch auf surface
  // (Formulare) und soft (Karten- und Stimmen-Sektion).
  for (const [cuisine, liste] of Object.entries(STIMMUNGEN)) {
    for (const s of liste) {
      for (const grund of ["bg", "surface", "soft"]) {
        const wert = contrastRatio(s.accentLesbar, s[grund]);
        assert.ok(wert >= 4.5, `${cuisine}/${s.id}: accentLesbar auf ${grund} nur ${wert.toFixed(2)}:1`);
      }
    }
  }
});

test("die traditionelle Seite setzt den lesbaren Akzent, nicht den Magazin-Akzent", () => {
  const stimmung = STIMMUNGEN.japanisch.find((s) => s.archetyp === "traditionell");
  const html = seite("japanisch", stimmung.id);
  assert.ok(html.includes(`--accent-bold: ${stimmung.accentLesbar};`));
  assert.notEqual(stimmung.accentLesbar, stimmung.accentBold, "Testfall ohne Unterschied gewählt");
});

test("Flächen behalten den geprüften Akzent", () => {
  // onAccent ist gegen accent geprüft, nicht gegen accentLesbar – eine Fläche
  // in accentLesbar würde die Knopfschrift ungeprüft lassen.
  const css = handschriftCss("traditionell");
  assert.ok(!/background:\s*var\(--accent-bold\)/.test(css));
});
