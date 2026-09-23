// Abschnitte der komponierten Seiten (Phase D).
//
// Jede Funktion bekommt den Kontext k = { briefing, cd, ds, texte, lead,
// menu, bildplan, gewicht, fiktiv, entwurfsModus } und gibt HTML zurück.
// Welche Abschnitte in welcher Reihenfolge und Gewichtung erscheinen,
// entscheidet allein cd.seitenfolge – hier gibt es keine feste Folge.
//
// Funktionsvertrag: Alle Bestell-Knöpfe tragen data-add/-name/-preis mit
// den Gericht-IDs aus gerichtId(Kategorie, Gericht) der Originalkarte, die
// Karte trägt id="karte", die Kopfzeile id="topbar" – wie in v1.

import { escapeHtml, formatPrice, formatCount, plus, stern, KONTAKT_IKONEN, gerichtId } from "../v1Funktionen.js";
import { renderReservierung } from "../sektionen/service.js";
import { platz, bildMarkup } from "../../assets-pipeline/bildplan.js";
import { offenePunkte, tatsache } from "../../briefing/briefing.js";
import { oeffnungszeiten } from "./texte.js";

const e = escapeHtml;

export const entwurfMarke = (k, an = true) => (an && k.entwurfsModus ? ` <span class="k-entwurf">${e(k.texte.entwurf)}</span>` : "");

/** Karte mit stabilen IDs (Index der Originalkarte), optional umsortiert. */
export function karteMitIds(menu, reihenfolge = null) {
  const kats = menu.kategorien.map((kat, ki) => ({ ...kat, anker: `karte-${ki}`, gerichte: kat.gerichte.map((g, gi) => ({ ...g, id: gerichtId(ki, gi), kategorie: kat.name })) }));
  if (!reihenfolge?.length) return kats;
  const rang = (n) => {
    const i = reihenfolge.indexOf(n);
    return i === -1 ? reihenfolge.length : i;
  };
  return [...kats].sort((a, b) => rang(a.name) - rang(b.name));
}

const alleGerichte = (kats) => kats.flatMap((k) => k.gerichte);

function mini(g) {
  return `<button class="mini-add" type="button" data-add="${e(g.id)}" data-name="${e(g.name)}" data-preis="${g.preis}" aria-label="${e(g.name)} vormerken">${plus()}</button>`;
}

function kopf(rubrik, titel, intro = "", { klasse = "", marke = "" } = {}) {
  return `<header class="k-kopf ${klasse}">
      <p class="rubrik">${e(rubrik)}</p>
      <h2>${e(titel)}${marke}</h2>
      ${intro ? `<p class="intro">${e(intro)}</p>` : ""}
    </header>`;
}

function fotoMarke(p, k) {
  return p?.gewaehlt && p.gewaehlt.herkunft !== "eigen" ? `<span class="herkunft herkunft--${e(p.gewaehlt.herkunft)}">${e(p.gewaehlt.kennzeichnung)}</span>` : "";
}

/* ------------------------------------------------------------------ */
/* Kopfzeile mit mobiler Navigation                                    */
/* ------------------------------------------------------------------ */

export function hauptAktionHref(k) {
  const tel = (tatsache(k.briefing, "betrieb.telefon") ?? "").replace(/[^\d+]/g, "");
  return { reservieren: "#reservierung", bestellen: "#karte", anrufen: tel ? `tel:${tel}` : "#kontakt", informieren: "#wochenplan" }[k.texte.aktion];
}

export function renderKopf(k, anker) {
  const links = anker.map(([id, label]) => `<a href="#${id}">${e(label)}</a>`).join("");
  return `<header class="kopfzeile k-kopfzeile" id="topbar">
  <div class="rahmen kopfzeile-innen">
    <a class="marke-name" href="#">${e(k.texte.name)}</a>
    <nav class="kopf-nav" aria-label="Hauptnavigation">${links}</nav>
    <a class="btn btn-primary kopf-aktion" href="${e(hauptAktionHref(k))}">${e(k.texte.ctaHaupt)}</a>
    <details class="k-menue">
      <summary>${e(k.texte.menueKnopf)}</summary>
      <nav class="k-menue-liste" aria-label="Hauptnavigation mobil">${links}<a class="btn btn-primary" href="${e(hauptAktionHref(k))}">${e(k.texte.ctaHaupt)}</a></nav>
    </details>
  </div>
</header>`;
}

/* ------------------------------------------------------------------ */
/* Heroes                                                              */
/* ------------------------------------------------------------------ */

function aktionen(k, { zweit = "karte" } = {}) {
  const zweitHref = zweit === "karte" ? "#karte" : "#kontakt";
  const zweitText = zweit === "karte" ? k.texte.nav.karte : k.texte.nav.kontakt;
  return `<div class="hero-aktionen"><a class="btn btn-primary" href="${e(hauptAktionHref(k))}">${e(k.texte.ctaHaupt)}</a><a class="btn btn-ghost" href="${zweitHref}">${e(zweitText)}</a></div>`;
}

function claim(k) {
  return `<p class="hero-claim">${e(k.texte.claim)}${entwurfMarke(k, k.texte.claimEntwurf)}</p>`;
}

const HEROS = {
  "karte-titel": (k) => {
    const p = platz(k.bildplan, "hero");
    return `<section class="k-hero k-hero--karte" data-hero="karte-titel">
  <div class="rahmen">
    <div class="k-titelblatt">
      <div class="k-titel-text">
        <p class="rubrik">${e(k.texte.kicker)}</p>
        <h1>${e(k.texte.headline)}</h1>
        ${claim(k)}
        ${aktionen(k)}
      </div>
      ${p ? `<figure class="k-titel-foto">${bildMarkup(p, { prioritaet: true, breiteDesktop: 1000 })}${fotoMarke(p, k)}</figure>` : ""}
    </div>
  </div>
</section>`;
  },

  noren: (k) => {
    const p = platz(k.bildplan, "hero");
    const zeiten = oeffnungszeiten(k.briefing);
    const ab = zeiten?.[0]?.zeiten?.split(/\s*–\s*/)[0];
    return `<section class="k-hero k-hero--noren" data-hero="noren">
  <figure class="k-noren-bild">${bildMarkup(p, { prioritaet: true })}${fotoMarke(p, k)}</figure>
  <div class="k-noren" aria-hidden="true"><span></span><span></span><span></span></div>
  <div class="rahmen k-noren-kopf">
    <h1><span class="k-noren-name">${e(k.texte.headline)}</span></h1>
  </div>
  <div class="k-noren-fuss">
    <div class="rahmen k-noren-zeile">
      <p class="rubrik">${e(k.texte.kicker)}</p>
      ${ab ? `<p class="k-noren-ab">ab ${e(ab)} Uhr</p>` : ""}
      ${claim(k)}
      ${aktionen(k)}
    </div>
  </div>
</section>`;
  },

  aushang: (k) => {
    const adresse = tatsache(k.briefing, "betrieb.adresse");
    const tel = tatsache(k.briefing, "betrieb.telefon");
    return `<section class="k-hero k-hero--aushang" data-hero="aushang">
  <div class="rahmen k-aushang">
    ${lindenblatt()}
    <p class="rubrik">${e(k.texte.kicker)}</p>
    <h1 class="k-schild">${e(k.texte.headline)}</h1>
    ${adresse ? `<p class="k-aushang-adresse">${e(adresse)}</p>` : ""}
    ${tel ? `<p class="k-aushang-tel"><a href="tel:${e(tel.replace(/[^\d+]/g, ""))}">${e(tel)}</a></p>` : ""}
    <div class="hero-aktionen"><a class="btn btn-primary" href="${e(hauptAktionHref(k))}">${e(k.texte.ctaHaupt)}</a><a class="btn btn-ghost" href="#offen">${e(k.texte.nav.offen)}</a></div>
  </div>
</section>`;
  },

  werkbank: (k) => {
    const p = platz(k.bildplan, "hero");
    return `<section class="k-hero k-hero--werkbank" data-hero="werkbank">
  <div class="rahmen k-werkbank">
    <div class="k-werkbank-text">
      <p class="rubrik">${e(k.texte.kicker)}</p>
      <h1>${e(k.texte.headline)}</h1>
      ${claim(k)}
      <p class="k-status" id="k-status" hidden></p>
      ${aktionen(k)}
    </div>
    ${p ? `<figure class="k-werkbank-foto">${bildMarkup(p, { prioritaet: true, breiteDesktop: 1000 })}${fotoMarke(p, k)}</figure>` : ""}
  </div>
</section>`;
  },

  "bild-voll": (k) => {
    const p = platz(k.bildplan, "hero");
    return `<section class="k-hero k-hero--bild" data-hero="bild-voll">
  <figure class="k-bild-voll">${bildMarkup(p, { prioritaet: true })}${fotoMarke(p, k)}</figure>
  <div class="rahmen k-bild-text"><p class="rubrik">${e(k.texte.kicker)}</p><h1>${e(k.texte.headline)}</h1>${claim(k)}${aktionen(k)}</div>
</section>`;
  },
};

/** Ein Lindenblatt als Linienzeichnung – abgeleitet aus dem Hausnamen. */
function lindenblatt() {
  return `<svg class="k-blatt" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M32 58 V30 M32 30 C20 30 10 22 12 12 C18 16 26 12 32 6 C38 12 46 16 52 12 C54 22 44 30 32 30 Z M32 30 L22 20 M32 30 L42 20 M32 22 V10" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

export function renderHero(k) {
  const r = HEROS[k.cd.hero.typ];
  if (!r) throw new Error(`Unbekannter Hero-Typ ${k.cd.hero.typ}`);
  return r(k);
}

/* ------------------------------------------------------------------ */
/* Signature-Details                                                   */
/* ------------------------------------------------------------------ */

const SIGNATUR_RENDER = {
  tageskarte: (k) => {
    const kats = karteMitIds(k.menu);
    const pasta = kats.find((c) => /pasta/i.test(c.name));
    const signatur = new Set(tatsache(k.briefing, "karte.signaturgerichte") ?? []);
    const gerichte = (pasta?.gerichte ?? []).filter((g) => !/panna|tiramis/i.test(g.name)).slice(0, 3);
    gerichte.sort((a, b) => Number(signatur.has(b.name)) - Number(signatur.has(a.name)));
    const p = platz(k.bildplan, "tageskarte");
    return `<section class="sektion k-sig k-sig--tageskarte" id="tageskarte">
  <div class="rahmen k-tageskarte">
    ${p ? `<figure class="k-tages-foto">${bildMarkup(p, { breiteDesktop: 900 })}${fotoMarke(p, k)}</figure>` : ""}
    <aside class="k-zettel auftritt" aria-labelledby="k-zettel-titel">
      <p class="rubrik">${e(k.texte.tageskarte.rubrik)}</p>
      <h2 id="k-zettel-titel">${e(k.texte.tageskarte.titel)}</h2>
      <ol class="k-zettel-liste">${gerichte
        .map((g, i) => `<li><span class="k-nr">${i + 1}</span><span class="k-zettel-gericht"><strong>${e(g.name)}</strong><span>${e(g.beschreibung)}</span></span><span class="preis">${formatPrice(g.preis)}</span>${mini(g)}</li>`)
        .join("")}</ol>
      <p class="k-zettel-fuss">${e(k.texte.tageskarte.intro)}</p>
    </aside>
  </div>
</section>`;
  },

  zettelwand: (k) => {
    const kats = karteMitIds(k.menu);
    const klein = alleGerichte(kats).filter((g) => g.preis <= 8).slice(0, 8);
    const p = platz(k.bildplan, "zettel");
    return `<section class="sektion k-sig k-sig--zettelwand" id="zettelwand">
  <div class="rahmen">
    ${kopf(k.texte.zettelwand.rubrik, k.texte.zettelwand.titel, k.texte.zettelwand.intro)}
    <div class="k-wand">
      <ul class="k-zettelreihe">${klein
        .map((g) => `<li class="k-zettelchen"><h3>${e(g.name)}</h3><p>${e(g.beschreibung ?? "")}</p><span class="k-zettelchen-fuss"><span class="k-zettel-preis">${formatPrice(g.preis)}</span>${mini(g)}</span></li>`)
        .join("")}</ul>
      ${p ? `<figure class="k-wand-foto">${bildMarkup(p, { breiteDesktop: 800 })}${fotoMarke(p, k)}</figure>` : ""}
    </div>
  </div>
</section>`;
  },

  wochenplan: (k) => {
    const zeiten = oeffnungszeiten(k.briefing) ?? [];
    return `<section class="sektion k-sig k-sig--wochenplan" id="wochenplan">
  <div class="rahmen k-plan">
    ${kopf(k.texte.wochenplan.rubrik, k.texte.wochenplan.titel)}
    <ol class="k-plan-liste">${zeiten
      .map((z) => `<li data-tag="${z.tag ?? ""}"><span class="k-plan-tag">${e(z.tage)}</span><span class="k-plan-zeit">${e(z.zeiten)}</span><span class="k-plan-notiz">${z.notiz ? `<span class="k-plan-marke">${e(z.notiz)}</span>` : ""}</span></li>`)
      .join("")}</ol>
  </div>
</section>`;
  },

  hausschild: () => "",
};

/** Skript für den Wochenplan: heutigen Tag markieren, Status im Hero. Ohne JS bleibt der volle Plan stehen. */
export const WOCHENPLAN_SKRIPT = `
(function () {
  var heute = new Date().getDay();
  var zeile = document.querySelector('.k-plan-liste li[data-tag="' + heute + '"]');
  if (!zeile) return;
  zeile.classList.add("k-heute");
  var status = document.getElementById("k-status");
  if (!status) return;
  var zeit = zeile.querySelector(".k-plan-zeit").textContent;
  status.textContent = (/ruhetag/i.test(zeit) ? "Heute Ruhetag" : "Heute geöffnet · " + zeit);
  status.hidden = false;
})();
`;

/* ------------------------------------------------------------------ */
/* Abschnitte                                                          */
/* ------------------------------------------------------------------ */

function kartenZeile(g, k, { vegMarke = true } = {}) {
  return `<li class="k-zeile"><span class="k-zeile-name">${e(g.name)}${vegMarke && g.vegetarisch ? ` <span class="marke-klein">${e(k.texte.karte.vegetarisch)}</span>` : ""}</span><span class="preis">${formatPrice(g.preis)}</span>${mini(g)}${g.beschreibung ? `<span class="k-zeile-desc">${e(g.beschreibung)}</span>` : ""}</li>`;
}

/** Ist eine ganze Kategorie vegetarisch, steht das einmal am Kopf statt an jeder Zeile. */
function kategorie(c, k) {
  const alleVeg = c.gerichte.length > 1 && c.gerichte.every((g) => g.vegetarisch);
  return `<section class="k-kategorie" id="${c.anker}"><h3>${e(c.name)}</h3>${alleVeg ? `<p class="k-kat-hinweis">${e(k.texte.karte.alleVegetarisch)}</p>` : ""}<ul>${c.gerichte.map((g) => kartenZeile(g, k, { vegMarke: !alleVeg })).join("")}</ul></section>`;
}

const ABSCHNITT = {
  signatur: (k, a) => SIGNATUR_RENDER[a.signatur]?.(k) ?? "",

  karte: (k, a) => {
    const art = k.cd.komposition?.karte ?? "druckkarte";
    const reihenfolge = tatsache(k.briefing, "karte.speisekarte")?.reihenfolge ?? null;
    const kats = karteMitIds(k.menu, reihenfolge);
    const muster = art === "muster" || !tatsache(k.briefing, "karte.speisekarte");
    const hinweis = muster ? `<p class="k-muster-hinweis"><span class="k-entwurf">${e(k.texte.entwurf)}</span> ${e(k.texte.karteK.musterHinweis)}</p>` : "";
    return `<section class="sektion k-karte k-karte--${art} k-gewicht--${a.gewicht}" id="karte">
  <div class="rahmen">
    ${kopf(k.texte.karteK.rubrik, k.texte.karteK.titel)}
    ${hinweis}
    <div class="k-karte-spalten">${kats.map((c) => kategorie(c, k)).join("")}</div>
  </div>
</section>`;
  },

  haus: (k, a) => {
    const text = k.texte.geschichte ?? k.texte.konzept;
    if (!text) return "";
    const zusatz = k.texte.geschichte && k.texte.konzept ? `<p class="k-haus-zitat">${e(k.texte.konzept)}${entwurfMarke(k, k.texte.konzeptEntwurf)}</p>` : "";
    return `<section class="sektion k-haus k-gewicht--${a.gewicht}" id="haus">
  <div class="rahmen k-haus-raster">
    <p class="rubrik">${e(k.texte.haus.rubrik)}</p>
    ${zusatz}
    <p class="k-haus-text">${e(text)}</p>
  </div>
</section>`;
  },

  ambiente: (k, a) => {
    if (!k.texte.hinweise.length) return "";
    return `<section class="sektion k-ambiente k-gewicht--${a.gewicht}" id="ambiente">
  <div class="rahmen">
    ${kopf(k.texte.ambiente.rubrik, k.texte.ambiente.titel)}
    <ul class="k-regeln">${k.texte.hinweise.map((h) => `<li>${e(h)}</li>`).join("")}</ul>
  </div>
</section>`;
  },

  reservierung: (k, a) => {
    const t = { ...k.texte, reservierung: { ...k.texte.reservierung, rubrik: k.texte.reservierungK.rubrik, titel: k.texte.reservierungK.titel, intro: k.texte.reservierungK.intro, punkte: [] } };
    const html = renderReservierung({ ds: k.ds, texte: t, betont: a.gewicht === "gross", tief: false });
    const klasse = `k-reservierung k-gewicht--${a.gewicht}`;
    if (a.gewicht !== "klein") return html.replace('class="sektion reservierung', `class="sektion ${klasse} reservierung`);
    // Klein: das Formular steht hinter einem Aufklapper – Gruppenanfrage statt Hauptweg.
    return html
      .replace('class="sektion reservierung', `class="sektion ${klasse} reservierung`)
      .replace('<form class="formular', `<details class="k-aufklapper"><summary class="btn btn-ghost">${e(k.texte.reservierungK.aufklappen)}</summary><form class="formular`)
      .replace("</form>", "</form></details>");
  },

  abholung: (k, a) => `<section class="sektion k-abholung k-gewicht--${a.gewicht}" id="abholung">
  <div class="rahmen k-abholung-zeile">
    <div><p class="rubrik">${e(k.texte.abholung.rubrik)}</p><h2>${e(k.texte.abholung.titel)}</h2><p class="intro">${e(k.texte.abholung.text)}</p></div>
    <a class="btn btn-ghost" href="#karte">${e(k.texte.abholung.knopf)}</a>
  </div>
</section>`,

  zeiten: (k, a) => {
    const z = oeffnungszeiten(k.briefing);
    return `<section class="sektion k-zeiten k-gewicht--${a.gewicht}" id="zeiten"><div class="rahmen">${kopf(k.texte.kontakt.oeffnungszeiten, k.texte.kontakt.oeffnungszeiten)}${z ? z.map((x) => `<div class="zeiten-zeile"><span>${e(x.tage)}</span><span>${e(x.zeiten)}</span></div>`).join("") : `<p>${e(k.texte.kontaktK.zeitenUnbekannt)}</p>`}</div></section>`;
  },

  kontakt: (k, a) => {
    const adresse = tatsache(k.briefing, "betrieb.adresse");
    const tel = tatsache(k.briefing, "betrieb.telefon");
    const g = tatsache(k.briefing, "belege.googleBewertung");
    const z = oeffnungszeiten(k.briefing);
    const maps = adresse ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}` : "";
    return `<section class="sektion k-kontakt k-gewicht--${a.gewicht}" id="kontakt">
  <div class="rahmen k-kontakt-raster">
    <div>
      <p class="rubrik">${e(k.texte.kontaktK.rubrik)}</p>
      <h2>${e(k.texte.kontaktK.titel)}</h2>
      <ul class="kontakt-liste">
        ${adresse ? `<li><span class="k">${KONTAKT_IKONEN.ort}</span><span>${e(adresse)}<br><a href="${e(maps)}" target="_blank" rel="noopener">${e(k.texte.kontakt.route)}</a></span></li>` : ""}
        ${tel ? `<li><span class="k">${KONTAKT_IKONEN.telefon}</span><span><a href="tel:${e(tel.replace(/[^\d+]/g, ""))}">${e(tel)}</a></span></li>` : ""}
        ${g ? `<li><span class="k">${stern()}</span><span>${String(g.note).replace(".", ",")} von 5 ${e(k.texte.kontaktK.google)}${g.anzahl ? ` · ${formatCount(g.anzahl)} ${e(k.texte.kontaktK.bewertungen)}` : ""}</span></li>` : ""}
      </ul>
    </div>
    <div class="zeiten">
      <h3>${e(k.texte.kontakt.oeffnungszeiten)}</h3>
      ${z ? z.map((x) => `<div class="zeiten-zeile"><span>${e(x.tage)}</span><span>${e(x.zeiten)}</span></div>`).join("") : `<p class="k-unbekannt">${e(k.texte.kontaktK.zeitenUnbekannt)}</p>`}
    </div>
  </div>
</section>`;
  },

  offen: (k, a) => {
    if (!k.entwurfsModus || k.briefing.fiktiv && k.briefing.modus !== "lead-simulation") return "";
    const wichtig = ["karte.speisekarte", "betrieb.oeffnungszeiten", "medien.fotos", "konzept.usp", "konzept.geschichte", "aktion.haupt", "belege.stimmen", "freigabe.veroeffentlichung"];
    const punkte = offenePunkte(k.briefing).filter((o) => wichtig.includes(o.pfad));
    return `<section class="sektion k-offen k-gewicht--${a.gewicht}" id="offen">
  <div class="rahmen">
    ${kopf(k.texte.offen.rubrik, k.texte.offen.titel, k.texte.offen.intro)}
    <ol class="k-offen-liste">${punkte.map((o) => `<li>${e(o.frage)}</li>`).join("")}</ol>
  </div>
</section>`;
  },
};

export function renderAbschnitt(k, a) {
  const r = ABSCHNITT[a.id];
  if (!r) throw new Error(`Unbekannter Abschnitt ${a.id}`);
  return r(k, a);
}

/** Navigationsanker aus den tatsächlich gerenderten Abschnitten. */
export function navAnker(k, abschnitte) {
  const label = { karte: k.texte.nav.karte, reservierung: k.texte.nav.reservierung, kontakt: k.texte.nav.kontakt, haus: k.texte.nav.haus, offen: k.texte.nav.offen };
  return abschnitte
    .map((a) => (a.id === "signatur" ? [a.signatur, k.texte.nav[a.signatur]] : [a.id, label[a.id]]))
    .filter(([id, l]) => l && id !== "hausschild");
}

/* ------------------------------------------------------------------ */
/* Aktionsleiste mobil, Fuß, Entwurfsleiste                            */
/* ------------------------------------------------------------------ */

export function mobilLeiste(k) {
  const tel = (tatsache(k.briefing, "betrieb.telefon") ?? "").replace(/[^\d+]/g, "");
  const wahl = k.cd.komposition?.mobilLeiste ?? ["reservieren", "bestellen"];
  const knopf = (w, primaer) => {
    const kl = primaer ? "btn-primary" : "btn-ghost";
    if (w === "bestellen") return `<button class="btn ${kl}" id="bar-order" type="button">${e(k.texte.bestellung.bestellen)}</button>`;
    if (w === "reservieren") return `<a class="btn ${kl}" href="#reservierung">${e(k.texte.nav.reservierung)}</a>`;
    if (w === "anrufen" && tel) return `<a class="btn ${kl}" href="tel:${e(tel)}">${e(k.texte.cta.anrufen)}</a>`;
    if (w === "karte") return `<a class="btn ${kl}" href="#karte">${e(k.texte.nav.karte)}</a>`;
    return "";
  };
  const knoepfe = wahl.map((w, i) => knopf(w, i === 0)).join("");
  // Das v1-Skript schreibt in #bar-order – steht der Knopf nicht in der Leiste, bleibt er unsichtbar im DOM.
  const versteckt = wahl.includes("bestellen") ? "" : `<button id="bar-order" type="button" hidden>${e(k.texte.bestellung.bestellen)}</button>`;
  return `<div class="mobilebar k-leiste" id="mobilebar">${knoepfe}${versteckt}</div>`;
}

/** Leiste erst zeigen, wenn die Hero-Aktionen aus dem Blick sind (kein Doppel, kein Verdecken). */
export const LEISTE_SKRIPT = `
(function () {
  var hero = document.querySelector("[data-hero]");
  var leiste = document.getElementById("mobilebar");
  if (!hero || !leiste || !("IntersectionObserver" in window)) return;
  document.body.classList.add("k-leiste-bereit");
  new IntersectionObserver(function (e) {
    leiste.classList.toggle("k-leiste--da", !e[0].isIntersecting);
  }, { threshold: 0.15 }).observe(hero);
})();
`;

export function renderFuss(k, anker) {
  const adresse = tatsache(k.briefing, "betrieb.adresse");
  const tel = tatsache(k.briefing, "betrieb.telefon");
  return `<footer class="fuss auf-tint k-fuss">
  <div class="rahmen fuss-raster">
    <div class="fuss-haus"><strong>${e(k.texte.name)}</strong>${adresse ? `<p>${e(adresse)}</p>` : ""}</div>
    <nav class="fuss-nav" aria-label="${e(k.texte.fuss.navigation)}">${anker.map(([id, l]) => `<a href="#${id}">${e(l)}</a>`).join("")}</nav>
    <div class="fuss-kontakt">${tel ? `<a href="tel:${e(tel.replace(/[^\d+]/g, ""))}">${e(tel)}</a>` : ""}</div>
    ${k.texte.fussK.hinweis ? `<p class="fuss-hinweis">${e(k.texte.fussK.hinweis)}</p>` : ""}
  </div>
</footer>`;
}
