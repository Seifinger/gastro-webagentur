// „Passt gut dazu“ in der Bestellübersicht (Stand 26.09.2026).
//
// Erscheint im bestehenden Warenkorb-Drawer direkt nach den gewählten
// Positionen und vor den Abhol- und Kontaktfeldern mit dem Absenden-Knopf.
// Nur auf Seiten mit Speisekarten-Seite (Ausdruck) und Bestellweg – dort gibt
// es den kanonischen Katalog der Karte (PAGE_DATA.warenkorb). Seiten ohne
// Ausdruck bleiben Byte für Byte gleich (test/v2-unveraendert.test.js).
//
// Warenkorb bleibt der bestehende (PAGE_SCRIPT aus src/landingPageGenerator.js,
// unverändert):
//   - Die zwei Vorschlagsplätze stehen fest im Markup und tragen je einen
//     Knopf mit data-add/data-name/data-preis. PAGE_SCRIPT bindet ihn beim
//     Laden wie jeden Hinzufügen-Knopf der Karte und legt beim Klick genau
//     das Produkt zum Preis des Katalogs in den Warenkorb – mit Summe,
//     Abholzeit und Checkout wie bisher.
//   - Dieses Skript liest den Warenkorb nur (den Stand, den PAGE_SCRIPT
//     selbst in sessionStorage schreibt) und setzt Produkt, Variante und
//     Preis der beiden Plätze. Ohne lesbaren Stand bleibt das Modul aus.
//   - Welche Positionen über „Passt gut dazu“ kamen, wird nur für die
//     laufende Bestellung vermerkt (sessionStorage dieser Website, kein
//     Cookie) und beim Absenden als „empfohlen“ an der Position mitgeschickt.
//     Das geschieht als schmale Brücke an der einen Bestell-Anfrage, damit
//     PAGE_SCRIPT unverändert bleiben kann.
//
// Nichts wird automatisch hinzugefügt, nichts ist vorausgewählt, kein Popup:
// Wer nicht reagiert, bestellt wie bisher. Gibt es keinen passenden
// Vorschlag, ist das Modul ganz ausgeblendet.

import { escapeHtml } from "../v1Funktionen.js";
import { empfehlungsProdukte, empfehlungsKernSkript } from "../../../src/empfehlungen.js";
import { bildZulaessig, mediumVonUnterseite } from "./speisekarte.js";

const e = escapeHtml;
const PLAETZE = 2;

/**
 * Daten für PAGE_DATA.passtDazu.
 *
 * @param {object} p
 * @param {object} p.karte - karteAusDaten()
 * @param {object} p.medien - Medien der Seite (gericht(g) → Medium)
 * @param {object} p.texte - Texte der Seite (bestellung.passtDazu)
 * @param {boolean} p.fiktiv - erfundene Beispielseite (Stockfotos als Muster erlaubt)
 * @param {boolean} p.kundenfassung - echte Kundenseite: nur bestätigte Produkte und Bilder
 * @param {string} p.apiUrl - Betriebsserver; mit ihm gelten die Einstellungen des Wirts
 * @param {"start"|"karte"} [p.seite]
 */
export function passtDazuDaten({ karte, medien, texte, fiktiv = false, kundenfassung = false, apiUrl = "", seite = "start" }) {
  const bild = (g) => {
    if (kundenfassung && g.bildBestaetigt !== true) return null;
    const m = medien?.gericht?.({ ...g, id: g.index });
    if (!bildZulaessig(m, { fiktiv })) return null;
    const pfad = seite === "karte" ? mediumVonUnterseite(m) : m;
    return { src: pfad.src, alt: m.alt || g.name, datei: m.datei, index: g.index, medium: m };
  };
  const genutzt = [];
  const produkte = empfehlungsProdukte(karte, {
    nurBestaetigt: kundenfassung,
    bild: (g) => {
      const b = bild(g);
      if (b) genutzt.push([`gericht:${b.index}`, b.medium]);
      return b;
    },
  });
  const t = texte.bestellung.passtDazu;
  return {
    daten: {
      // Demo- und Beispielseiten zeigen Muster aus der Musterkarte – gekennzeichnet.
      muster: !kundenfassung,
      // Mit Betriebsserver erst nach dessen Einstellungen (an/aus, Regeln, Karte).
      live: Boolean(apiUrl),
      produkte,
      texte: { hinzufuegen: t.hinzufuegen, hinzugefuegt: t.hinzugefuegt, variante: t.variante },
    },
    medien: genutzt,
  };
}

/** Das Modul im Drawer: zwei feste Plätze, zunächst ausgeblendet. */
export function renderPasstDazu({ texte, muster }) {
  const t = texte.bestellung.passtDazu;
  const platz = `
      <li class="passt-dazu-produkt" data-passt-slot hidden>
        <div class="passt-dazu-text">
          <p class="passt-dazu-name"><span data-passt="name"></span>${muster ? ` <span class="marke-klein" data-passt="muster">${e(t.muster)}</span>` : ""}</p>
          <p class="passt-dazu-beschreibung" data-passt="beschreibung"></p>
          <div class="passt-dazu-aktion">
            <select class="passt-dazu-variante" data-passt="variante" aria-label="${e(t.variante)}" hidden></select>
            <span class="passt-dazu-preis" data-passt="preis"></span>
            <button class="btn btn-ghost btn-klein passt-dazu-add" type="button" data-add="" data-name="" data-preis="0">${e(t.hinzufuegen)}</button>
          </div>
        </div>
      </li>`;
  return `
    <div class="passt-dazu" id="passt-dazu" role="group" aria-labelledby="passt-dazu-titel" hidden>
      <h4 class="passt-dazu-titel" id="passt-dazu-titel">${e(t.titel)}</h4>${muster ? `\n      <p class="hint passt-dazu-muster">${e(t.musterHinweis)}</p>` : ""}
      <ul class="passt-dazu-liste">${platz.repeat(PLAETZE)}
      </ul>
    </div>
    <p class="passt-dazu-status" id="passt-dazu-status" role="status" aria-live="polite" tabindex="-1"></p>`;
}

export const PASST_DAZU_CSS = `
/* „Passt gut dazu“: ruhig, unter den gewählten Positionen, vor dem Absenden */
.passt-dazu { margin: var(--s-3) 0 var(--s-4); }
.passt-dazu[hidden], .passt-dazu-produkt[hidden], .passt-dazu [hidden] { display: none; }
.passt-dazu-titel { font-family: var(--f-text); font-size: var(--t-basis); font-weight: var(--f-text-stark); text-transform: none; letter-spacing: 0; }
.passt-dazu-muster { margin-top: var(--s-halb); }
.passt-dazu-liste { list-style: none; margin: var(--s-1) 0 0; padding: 0; display: grid; gap: var(--s-1); }
.passt-dazu-produkt { display: flex; gap: var(--s-2); align-items: flex-start; padding: var(--s-2); background: var(--flaeche); border: 1px solid var(--linie); border-radius: var(--r-karte); }
.passt-dazu-bild { width: var(--s-8); height: var(--s-8); flex: none; object-fit: cover; border-radius: var(--r-bild); background: var(--flaeche-tief); }
.passt-dazu-text { flex: 1; min-width: 0; display: grid; gap: var(--s-halb); }
.passt-dazu-name { font-weight: var(--f-text-stark); overflow-wrap: anywhere; }
.passt-dazu-beschreibung { font-size: var(--t-klein); color: var(--text-leise); overflow-wrap: anywhere; }
.passt-dazu-aktion { display: flex; flex-wrap: wrap; align-items: center; gap: var(--s-1); margin-top: var(--s-halb); }
.passt-dazu-variante { flex: 1 1 100%; min-height: var(--s-5); }
.passt-dazu-preis { margin-right: auto; font-variant-numeric: tabular-nums; }
.passt-dazu-add { flex: none; }
.passt-dazu-status { margin-top: var(--s-1); font-size: var(--t-klein); color: var(--text-leise); }
.passt-dazu-status:empty { display: none; }
.passt-dazu-status:focus { outline: none; }
`;

/**
 * Browser-Skript. Läuft nach PAGE_SCRIPT (gleiche Seite, eigenes <script>),
 * registriert sich aber vor dessen DOMContentLoaded – die Knöpfe der beiden
 * Plätze stehen schon im Markup und werden von PAGE_SCRIPT gebunden.
 */
const PASST_DAZU_UI = `
(function () {
  var data = window.PAGE_DATA || {};
  var pd = data.passtDazu;
  var E = window.Empfehlungen;
  var box = document.getElementById("passt-dazu");
  var meldung = document.getElementById("passt-dazu-status");
  if (!pd || !E || !box || !data.warenkorb) return;

  var plaetze = box.querySelectorAll("[data-passt-slot]");
  var produkte = pd.produkte || [];
  var nachId = {};
  produkte.forEach(function (p) { nachId[p.id] = p; });
  // Ohne Betriebsserver gelten die Standardregeln; mit ihm erst dessen Einstellungen.
  var regeln = pd.live ? null : {};
  var serverKarte = null;
  var geladenUm = 0;
  var angezeigt = "";
  var gerade = "";
  var KORB = "warenkorb:" + data.warenkorb.schluessel;
  var MARKEN = "passt-dazu:" + data.warenkorb.schluessel;

  function euro(wert) { return wert.toFixed(2).replace(".", ",") + " \\u20AC"; }
  function lies(schluessel) {
    try { return JSON.parse(window.sessionStorage.getItem(schluessel) || "null"); } catch (e) { return undefined; }
  }
  function schreibe(schluessel, wert) {
    try { window.sessionStorage.setItem(schluessel, JSON.stringify(wert)); } catch (e) { /* ohne Speicher keine Markierung */ }
  }
  /** Der Warenkorb, wie PAGE_SCRIPT ihn zuletzt gespeichert hat – oder null. */
  function warenkorb() {
    var k = lies(KORB);
    if (k === undefined) return null;
    return Array.isArray(k) ? k : [];
  }
  /** { Warenkorb-Kennung: Menge vor dem Hinzufügen über „Passt gut dazu“ } */
  function marken() {
    var m = lies(MARKEN);
    return m && typeof m === "object" && !Array.isArray(m) ? m : {};
  }
  function feld(platz, name) { return platz.querySelector('[data-passt="' + name + '"]'); }

  function setzeAuswahl(platz, p, v) {
    var knopf = platz.querySelector("[data-add]");
    var id = v ? v.id : p.id;
    var name = v ? p.name + " (" + v.name + ")" : p.name;
    var preis = v ? v.preis : p.preis;
    knopf.setAttribute("data-add", id);
    knopf.setAttribute("data-name", name);
    knopf.setAttribute("data-preis", String(preis));
    knopf.setAttribute("aria-label", name + ", " + euro(preis) + ": " + pd.texte.hinzufuegen);
    feld(platz, "preis").textContent = euro(preis);
  }

  function fuelle(liste) {
    Array.prototype.forEach.call(plaetze, function (platz, i) {
      var eintrag = liste[i];
      if (!eintrag) { platz.hidden = true; return; }
      var p = nachId[eintrag.id];
      var varianten = (p.varianten || []).filter(function (v) { return eintrag.varianten.indexOf(v.id) !== -1; });
      feld(platz, "name").textContent = varianten.length === 1 ? p.name + " (" + varianten[0].name + ")" : p.name;
      var text = feld(platz, "beschreibung");
      text.textContent = p.beschreibung || "";
      text.hidden = !p.beschreibung;

      var bild = platz.querySelector(".passt-dazu-bild");
      if (p.bild) {
        if (!bild) {
          bild = document.createElement("img");
          bild.className = "passt-dazu-bild";
          bild.width = 64;
          bild.height = 64;
          bild.loading = "lazy";
          bild.decoding = "async";
          // Lädt ein Bild nicht, fällt es weg statt als kaputtes Symbol zu stehen.
          bild.onerror = function () { if (bild.parentNode) bild.parentNode.removeChild(bild); };
          platz.insertBefore(bild, platz.firstChild);
        }
        bild.src = p.bild.src;
        bild.alt = p.bild.alt || "";
      } else if (bild) {
        bild.parentNode.removeChild(bild);
      }

      var wahl = feld(platz, "variante");
      wahl.innerHTML = "";
      if (varianten.length > 1) {
        varianten.forEach(function (v) {
          var o = document.createElement("option");
          o.value = v.id;
          o.textContent = v.name + " \\u2013 " + euro(v.preis);
          wahl.appendChild(o);
        });
        wahl.setAttribute("aria-label", pd.texte.variante + ": " + p.name);
        wahl.hidden = false;
        wahl.onchange = function () {
          for (var j = 0; j < varianten.length; j += 1) if (varianten[j].id === wahl.value) setzeAuswahl(platz, p, varianten[j]);
        };
      } else {
        wahl.hidden = true;
        wahl.onchange = null;
      }
      setzeAuswahl(platz, p, varianten[0] || null);
      platz.hidden = false;
    });
  }

  function zeige() {
    var korb = warenkorb();
    if (!korb || !regeln) { box.hidden = true; angezeigt = ""; return; }
    // Markierungen gelten nur für Positionen, die noch im Warenkorb liegen.
    var m = marken();
    var bleibt = {};
    var geaendert = false;
    var imKorb = {};
    korb.forEach(function (z) { if (z && typeof z.id === "string") imKorb[z.id] = true; });
    for (var id in m) {
      if (!Object.prototype.hasOwnProperty.call(m, id)) continue;
      if (imKorb[id]) bleibt[id] = m[id];
      else geaendert = true;
    }
    if (geaendert) schreibe(MARKEN, bleibt);

    var liste = E.waehle({ produkte: produkte, warenkorb: korb, regeln: regeln, bestellbar: serverKarte, max: 2 });
    if (!liste.length) { box.hidden = true; angezeigt = ""; return; }
    var stand = liste.map(function (x) { return x.id + ":" + x.varianten.join(","); }).join("|");
    if (stand !== angezeigt) { fuelle(liste); angezeigt = stand; }
    box.hidden = false;
  }

  function ladeRegeln() {
    if (!pd.live || !data.apiUrl || Date.now() - geladenUm < 60000) return;
    geladenUm = Date.now();
    fetch(data.apiUrl + "/oeffentlich/empfehlungen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    })
      .then(function (antwort) { return antwort.json(); })
      .then(function (ergebnis) {
        if (!ergebnis || !ergebnis.ok) return;
        regeln = ergebnis.regeln || {};
        serverKarte = ergebnis.katalog || null;
        angezeigt = "";
        zeige();
      })
      .catch(function () {
        // Ohne Antwort des Betriebs keine Empfehlung – bestellen geht trotzdem.
        geladenUm = 0;
      });
  }

  Array.prototype.forEach.call(plaetze, function (platz) {
    var knopf = platz.querySelector("[data-add]");
    // Läuft vor dem Hinzufügen durch PAGE_SCRIPT (früher registriert).
    knopf.addEventListener("click", function () {
      var id = knopf.getAttribute("data-add");
      if (!id) return;
      var korb = warenkorb() || [];
      var vorher = 0;
      korb.forEach(function (z) { if (z && z.id === id) vorher = Number(z.menge) || 0; });
      var m = marken();
      if (!Object.prototype.hasOwnProperty.call(m, id)) m[id] = vorher;
      schreibe(MARKEN, m);
      gerade = knopf.getAttribute("data-name");
    });
  });

  // Jede Änderung am Warenkorb schreibt PAGE_SCRIPT neu in #cart-lines.
  var zeilen = document.getElementById("cart-lines");
  if (zeilen && "MutationObserver" in window) {
    new MutationObserver(function () {
      zeige();
      if (gerade) {
        meldung.textContent = gerade + " " + pd.texte.hinzugefuegt;
        gerade = "";
        // Der Knopf zeigt jetzt etwas anderes (oder ist weg): Fokus nicht verlieren.
        meldung.focus();
      } else {
        meldung.textContent = "";
      }
    }).observe(zeilen, { childList: true });
  }
  var drawer = document.getElementById("drawer");
  if (drawer && "MutationObserver" in window) {
    new MutationObserver(function () { if (drawer.classList.contains("open")) ladeRegeln(); })
      .observe(drawer, { attributes: true, attributeFilter: ["class"] });
  }

  // Markierung „empfohlen“ an der Bestellung: nur an der einen Anfrage, die
  // PAGE_SCRIPT beim Absenden an den eigenen Betriebsserver schickt.
  if (data.apiUrl && typeof window.fetch === "function") {
    var senden = window.fetch;
    var ziel = data.apiUrl + "/oeffentlich/bestellung";
    window.fetch = function (url, init) {
      try {
        if (url === ziel && init && typeof init.body === "string") {
          var m = marken();
          var nutzlast = JSON.parse(init.body);
          if (nutzlast && Array.isArray(nutzlast.positionen)) {
            nutzlast.positionen.forEach(function (p) {
              if (!p || !Object.prototype.hasOwnProperty.call(m, p.id)) return;
              var dazu = (Number(p.menge) || 0) - (Number(m[p.id]) || 0);
              if (dazu > 0) { p.empfohlen = true; p.empfohlenMenge = dazu; }
            });
            init = Object.assign({}, init, { body: JSON.stringify(nutzlast) });
          }
        }
      } catch (e) { /* im Zweifel unverändert senden */ }
      return senden.call(window, url, init);
    };
  }

  ladeRegeln();
})();
`;

/** Kern (src/empfehlungen.js) und Oberfläche als ein Skriptblock. */
export function passtDazuSkript() {
  return `${empfehlungsKernSkript()}\n${PASST_DAZU_UI}`;
}
