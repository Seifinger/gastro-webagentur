// Highlights, Speisekarte, Haus und Gästestimmen.
//
// Jede Sektion kennt mehrere Anordnungen; welche gilt, steht im
// Designsystem (layout.highlights / layout.karte / layout.stimmen). Keine
// Anordnung stellt drei gleiche Karten nebeneinander – die Hausempfehlung ist
// immer größer, oder die Reihe hat einen Rhythmus (jede dritte breiter).

import { escapeHtml, formatPrice, formatCount, plus, stern, kuechenMarke, gerichtId, stimmenFuer } from "../v1Funktionen.js";
import { bild } from "./kopf.js";

const e = escapeHtml;

function sektionsKopf({ rubrik, titel, intro, seitlich = false, marke = "" }) {
  return `<header class="sektion-kopf${seitlich ? " sektion-kopf--seitlich" : ""}">
      <p class="rubrik">${marke}${e(rubrik)}</p>
      <div>
        <h2>${e(titel)}</h2>
        ${intro ? `<p class="intro">${e(intro)}</p>` : ""}
      </div>
    </header>`;
}

function hinzufuegen(g, texte, { klein = false } = {}) {
  return klein
    ? `<button class="mini-add" type="button" data-add="${e(g.id)}" data-name="${e(g.name)}" data-preis="${g.preis}" aria-label="${e(g.name)} vorbestellen">${plus()}</button>`
    : `<button class="btn btn-ghost btn-klein" type="button" data-add="${e(g.id)}" data-name="${e(g.name)}" data-preis="${g.preis}">${plus()} ${e(texte.highlights.vorbestellen)}</button>`;
}

function veg(g, texte) {
  return g.vegetarisch ? ` <span class="marke-klein">${e(texte.karte.vegetarisch)}</span>` : "";
}

function gericht(g, { texte, medien, klasse, siegel = "", rang = "" }) {
  return `<article class="gericht ${klasse} auftritt">
        <figure class="gericht-bild">${bild(medien.gericht(g), { alt: g.name })}</figure>
        <div class="gericht-text">
          ${siegel}${rang ? `<span class="rang">${rang}</span>` : ""}<p class="gericht-kat">${e(g.kategorie)}</p>
          <h3>${e(g.name)}</h3>
          <p class="gericht-desc">${e(g.beschreibung)}</p>
          <div class="gericht-fuss"><span class="preis">${formatPrice(g.preis)}</span>${veg(g, texte)}${hinzufuegen(g, texte)}</div>
        </div>
      </article>`;
}

function ablauf(texte) {
  return `<ol class="ablauf">${texte.ablauf
    .map((s, i) => `<li><span class="ablauf-n">${i + 1}</span><span><strong>${e(s.titel)}</strong> ${e(s.text)}</span></li>`)
    .join("")}</ol>`;
}

export function renderHighlights({ ds, texte, highlights, medien, cuisine, betont }) {
  const art = ds.layout.highlights;
  const marke = kuechenMarke(cuisine, "marke");
  const siegel = `<p class="siegel">${marke}${e(texte.highlights.siegel)}</p>`;
  let inhalt;
  if (art === "leseliste") {
    const [erstes, ...rest] = highlights;
    inhalt = `<div class="leseliste">
      ${gericht(erstes, { texte, medien, klasse: "gericht--haupt", siegel })}
      <ol class="leseliste-zeilen">${rest
        .map(
          (g) => `<li class="auftritt"><div class="zeile-kopf"><h3>${e(g.name)}</h3><span class="menue-punkte" aria-hidden="true"></span><span class="preis">${formatPrice(g.preis)}</span>${hinzufuegen(g, texte, { klein: true })}</div><p class="gericht-desc">${e(g.beschreibung)}${veg(g, texte)}</p></li>`,
        )
        .join("")}</ol>
    </div>`;
  } else if (art === "reihe") {
    inhalt = `<div class="reihe reihe--${highlights.length}">${highlights
      .map((g, i) => gericht(g, { texte, medien, klasse: `gericht--reihe${(i + 1) % 3 === 0 ? " gericht--breit" : ""}`, rang: String(i + 1).padStart(2, "0") }))
      .join("")}</div>`;
  } else {
    const [erstes, ...rest] = highlights;
    inhalt = `<div class="treppe treppe--${highlights.length}">
      ${gericht(erstes, { texte, medien, klasse: "gericht--haupt", siegel })}
      <div class="treppe-rest">${rest.map((g) => gericht(g, { texte, medien, klasse: "gericht--neben" })).join("")}</div>
    </div>`;
  }
  return `<section class="sektion${betont ? " sektion--betont" : ""}" id="highlights">
  <div class="rahmen">
    ${sektionsKopf({ ...texte.highlights, seitlich: ds.archetyp === "abend" })}
    ${inhalt}
    ${ablauf(texte)}
  </div>
</section>`;
}

function kartenZeile(g, texte) {
  return `<li class="karten-zeile">
          <div class="zeile-kopf"><span class="karten-name">${e(g.name)}</span>${veg(g, texte)}<span class="menue-punkte" aria-hidden="true"></span><span class="preis">${formatPrice(g.preis)}</span>${hinzufuegen(g, texte, { klein: true })}</div>
          ${g.beschreibung ? `<p class="gericht-desc">${e(g.beschreibung)}</p>` : ""}
        </li>`;
}

export function renderKarte({ ds, texte, menu, tief, sprung = false }) {
  const art = ds.layout.karte;
  const kategorien = menu.kategorien.map((k, ki) => ({
    ...k,
    anker: `karte-${ki}`,
    gerichte: k.gerichte.map((g, gi) => ({ ...g, id: gerichtId(ki, gi) })),
  }));
  const liste = (k) => `<ul class="karten-liste">${k.gerichte.map((g) => kartenZeile(g, texte)).join("")}</ul>`;

  let inhalt;
  if (art === "spalten") {
    inhalt = `<div class="karte-spalten">${kategorien
      .map((k) => `<section class="karten-kategorie auftritt" id="${k.anker}"><h3>${e(k.name)}</h3>${liste(k)}</section>`)
      .join("")}</div>`;
  } else if (art === "liste") {
    inhalt = `<nav class="karten-sprung" aria-label="Kategorien">${kategorien
      .map((k) => `<a href="#${k.anker}">${e(k.name)}</a>`)
      .join("")}</nav>
    <div class="karte-liste">${kategorien
      .map((k) => `<section class="karten-kategorie" id="${k.anker}"><h3>${e(k.name)} <span class="anzahl">${k.gerichte.length} ${e(texte.karte.gerichteEinheit)}</span></h3>${liste(k)}</section>`)
      .join("")}</div>`;
  } else {
    inhalt = `<div class="karte-tafel">${kategorien
      .map((k) => `<section class="tafel-kategorie" id="${k.anker}"><h3 class="tafel-name">${e(k.name)}</h3>${liste(k)}</section>`)
      .join("")}</div>`;
  }
  // Seiten mit Ausdruck: Sprungleiste der Kategorien (läuft auf dem Handy unter
  // der Kopfzeile mit). Die Anordnung "liste" hat schon eine eigene.
  if (sprung && art !== "liste") {
    inhalt = `<nav class="karten-sprung karten-sprung--fest" aria-label="Kategorien">${kategorien.map((k) => `<a href="#${k.anker}">${e(k.name)}</a>`).join("")}</nav>
    ${inhalt}`;
  }
  return `<section class="sektion${tief ? " sektion--tief" : ""}" id="karte">
  <div class="rahmen">
    ${sektionsKopf({ ...texte.karte, seitlich: ds.archetyp === "abend" })}
    ${inhalt}
  </div>
</section>`;
}

export function renderAmbiente({ ds, texte, medien, fiktiv, tief }) {
  const hinweis = fiktiv ? "" : ` <span class="marke-klein marke-klein--signal">${e(texte.platzhalter)}</span>`;
  const [haus, team, bestseller] = texte.ambiente.slots;
  const figur = (slot, klasse) => `<figure class="haus-foto ${klasse} auftritt">
        ${bild(medien[slot.rolle], { alt: slot.titel })}
        <figcaption><strong>${e(slot.titel)}</strong><span>${e(slot.hinweis)}</span></figcaption>
      </figure>`;
  return `<section class="sektion${tief ? " sektion--tief" : ""}" id="ambiente">
  <div class="rahmen haus-raster">
    <div class="haus-text">
      <p class="rubrik">${e(texte.ambiente.rubrik)}</p>
      <h2>${e(texte.ambiente.titel)}</h2>
      <p class="intro">${e(texte.ambiente.text)}${hinweis}</p>
    </div>
    <div class="haus-fotos">
      ${figur(haus, "haus-foto--hoch")}
      ${figur(team, "haus-foto--quer")}
      ${figur(bestseller, "haus-foto--klein")}
    </div>
  </div>
</section>`;
}

export function renderStimmen({ ds, texte, lead, cuisine, fiktiv, tief }) {
  const { stimmen, slots, platzhalter } = stimmenFuer(cuisine, { fiktiv });
  const art = ds.layout.stimmen;
  const note = lead.rating
    ? `<div class="stimmen-note"><span class="note-zahl">${String(lead.rating).replace(".", ",")}</span><span class="sterne" aria-hidden="true">${Array.from({ length: 5 }, (_, i) => stern(i < Math.round(Number(lead.rating)))).join("")}</span><span>${e(texte.stimmen.aufGoogle)}${lead.anzahlBewertungen ? ` · ${formatCount(lead.anzahlBewertungen)} ${e(texte.stimmen.bewertungen)}` : ""}</span></div>`
    : "";

  const eintraege = platzhalter
    ? slots.map((titel) => `<li class="stimme stimme--platzhalter"><p class="stimme-titel">${e(titel)}</p><p class="stimme-quelle">${e(texte.stimmen.slotHinweis)}</p></li>`)
    : stimmen.map((s, i) => `<li class="stimme${art === "zitat" && i === 0 ? " stimme--gross" : ""}"><blockquote><p>${e(s.text)}</p></blockquote><p class="stimme-quelle">${e(s.autor)} · ${e(s.wann)}</p></li>`);

  return `<section class="sektion${tief ? " sektion--tief" : ""}" id="stimmen">
  <div class="rahmen stimmen stimmen--${art}">
    <div class="stimmen-kopf">
      <p class="rubrik">${e(texte.stimmen.rubrik)}</p>
      <h2>${e(texte.stimmen.titel)}</h2>
      ${note}
    </div>
    <ul class="stimmen-liste">${eintraege.join("")}</ul>
  </div>
</section>`;
}
