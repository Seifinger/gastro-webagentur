// Demo-Panel in bearbeiten.html (ausgeliefert unter /v2/demo-panel.js,
// Server: v2/integration/demoDashboard.js). Küche, Vorlage, drei
// Farbschemata, Slogan, bestätigte Angaben, lokaler Bau mit Vorschau (Desktop
// und Handy), Medienstatus, Status der früheren öffentlichen Adresse und die
// Präsentation im WLAN. Veröffentlichen gibt es für Lead-Demos nicht mehr.
(function () {
  "use strict";
  var slug = new URLSearchParams(location.search).get("lead");
  if (!slug) return;

  var ZUSTAND = {
    neu: ["Noch nicht gespeichert", "neutral"],
    gespeichert: ["Gespeichert – nur lokal", "neutral"],
    baut: ["Build läuft …", "laeuft"],
    "wird-veroeffentlicht": ["Früher: Veröffentlichung gestartet", "neutral"],
    online: ["Früher veröffentlicht – inzwischen abgeschaltet", "neutral"],
    fehler: ["Fehler", "fehler"],
  };

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function zeit(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
  }
  function post(pfad, daten) {
    var aufruf = window.geschuetzterFetch || fetch;
    return aufruf(pfad, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(daten || {}) })
      .then(function (r) { return r.json().then(function (j) { j.status = r.status; return j; }); });
  }

  var stil = document.createElement("style");
  stil.textContent = [
    ".demo-panel{margin:0 0 28px;padding:22px;border:1px solid var(--line,#ddd);border-radius:6px;background:var(--surface,#fff)}",
    ".demo-panel h2{margin:0 0 4px}",
    ".demo-kopf{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:16px}",
    ".demo-status{padding:6px 10px;border-radius:4px;font-size:14px;background:var(--bg,#f4f4f4)}",
    ".demo-status.ok{background:#e3f1e6;color:#1d5a2c}.demo-status.fehler{background:#fbe5e2;color:#8a2416}.demo-status.laeuft{background:#fff3d6;color:#6b4a00}",
    ".demo-raster{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px}",
    "@media (max-width:900px){.demo-raster{grid-template-columns:1fr}}",
    ".demo-feld{margin:0 0 16px}.demo-feld>label,.demo-feld>.demo-label{display:block;font-weight:600;margin:0 0 6px}",
    ".demo-feld select,.demo-feld input[type=text]{width:100%;padding:8px;font:inherit;box-sizing:border-box}",
    ".demo-hilfe{font-size:13px;color:var(--muted,#666);margin:4px 0 0}",
    ".demo-schemata{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}",
    ".demo-schema{border:2px solid var(--line,#ddd);border-radius:6px;padding:8px;cursor:pointer;display:block}",
    ".demo-schema input{position:absolute;opacity:0}.demo-schema.aktiv{border-color:var(--accent,#333)}",
    ".demo-schema i{display:inline-block;width:18px;height:18px;border-radius:50%;margin-right:3px;border:1px solid rgba(0,0,0,.15)}",
    ".demo-angabe{border-top:1px solid var(--line,#eee);padding:10px 0}.demo-angabe .demo-quelle{font-size:13px;color:var(--muted,#666)}",
    ".demo-angabe.bestaetigt .demo-quelle{color:#1d5a2c}",
    ".demo-zeile{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.demo-zeile input{flex:1 1 180px}",
    ".demo-knoepfe{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}",
    ".demo-vorschau dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 14px;margin:0 0 14px}.demo-vorschau dt{font-weight:600}",
    ".demo-vorschau dd{margin:0}.demo-hindernis{color:#8a2416}",
    ".demo-rahmen{width:100%;height:520px;border:1px solid var(--line,#ddd);border-radius:4px;background:#fff}",
    ".demo-geraete{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}.demo-geraet{flex:1 1 320px}.demo-geraet--mobil{flex:0 0 auto}",
    ".demo-rahmen--mobil{width:390px;max-width:100%;height:700px}",
    ".demo-medien{width:100%;border-collapse:collapse;font-size:14px;margin:0 0 8px}.demo-medien td,.demo-medien th{border-bottom:1px solid var(--line,#eee);padding:4px 6px;text-align:left}",
    ".demo-fehlt{color:#8a2416}.demo-da{color:#1d5a2c}",
    ".demo-praes{margin:14px 0;padding:14px;border:1px dashed var(--line,#ccc);border-radius:6px}.demo-praes img{width:180px;height:180px;background:#fff;padding:6px;border:1px solid var(--line,#ddd)}",
  ].join("\n");
  document.head.appendChild(stil);

  var panel = document.createElement("section");
  panel.className = "demo-panel";
  panel.id = "demo-panel";
  var ziel = document.getElementById("raster");
  ziel.parentNode.insertBefore(panel, ziel);

  var daten = null;
  var takt = null;
  var meldung = "";

  function statusHtml(d) {
    var s = d.status || { zustand: "neu" };
    var z = ZUSTAND[s.zustand] || [s.zustand, "neutral"];
    var teile = ['<span class="demo-status ' + z[1] + '" id="demo-status">' + esc(z[0])];
    if (s.zustand === "online" && s.online) {
      teile.push(' · <a href="' + esc(s.online.url) + '" target="_blank" rel="noopener">' + esc(s.online.url) + "</a> · " + esc(zeit(s.online.zeitpunkt)));
    } else if (s.online) {
      teile.push(' · zuletzt online: <a href="' + esc(s.online.url) + '" target="_blank" rel="noopener">' + esc(zeit(s.online.zeitpunkt)) + "</a>");
    }
    if (s.zustand === "fehler") teile.push("<br>" + esc(s.fehler || ""));
    teile.push("</span>");
    return teile.join("");
  }

  function angabe(feld, titel, a) {
    return '<div class="demo-angabe' + (a.bestaetigt ? " bestaetigt" : "") + '" data-feld="' + feld + '">' +
      '<div><b>' + esc(titel) + ':</b> ' + (a.wert ? esc(a.wert) : "<em>keine Angabe</em>") + "</div>" +
      '<div class="demo-quelle">' + (a.bestaetigt ? "Bestätigt am " + esc(zeit(a.bestaetigtAm)) + (a.notiz ? " · Quelle: " + esc(a.notiz) : "") : esc(a.quelle || "–") + " – erscheint erst nach Bestätigung auf der Demo") + "</div>" +
      '<div class="demo-zeile"><input type="text" data-wert value="' + esc(a.wert) + '" aria-label="' + esc(titel) + '">' +
      '<input type="text" data-notiz placeholder="Quelle, z. B. Impressum, Schild" value="' + esc(a.notiz || "") + '" aria-label="Quelle">' +
      '<button type="button" data-bestaetigen>' + (a.bestaetigt ? "Ändern" : "Bestätigen") + "</button>" +
      (a.bestaetigt ? '<button type="button" data-zuruecknehmen>Zurücknehmen</button>' : "") + "</div></div>";
  }

  function render() {
    var d = daten;
    var laeuft = d.laeuft || d.status.zustand === "baut" || d.status.zustand === "wird-veroeffentlicht";
    var kuechen = d.kuechen.map(function (k) {
      return '<option value="' + esc(k.wert) + '"' + (d.kuecheManuell && k.wert === d.kueche ? " selected" : "") + ">" + esc(k.label) + "</option>";
    }).join("");
    var vorlagen = '<option value=""' + (d.vorlage.quelle === "standard" ? " selected" : "") + ">Standard der Küche: " + esc(d.vorlagen.filter(function (v) { return v.id === d.vorlage.standard; })[0].label) + "</option>" +
      d.vorlagen.map(function (v) {
        return '<option value="' + esc(v.id) + '"' + (d.vorlage.quelle === "gewaehlt" && v.id === d.vorlage.ausdruck ? " selected" : "") + ">" + esc(v.label) + " – " + esc(v.passtZu) + "</option>";
      }).join("");
    var schemata = d.farbschemata.map(function (f) {
      var aktiv = f.id === d.farbschema.id;
      var punkte = f.farben ? ["grund", "tint", "akzent", "text"].map(function (k) { return '<i style="background:' + esc(f.farben[k]) + '"></i>'; }).join("") : "";
      return '<label class="demo-schema' + (aktiv ? " aktiv" : "") + '"><input type="radio" name="farbschema" value="' + esc(f.id) + '"' + (aktiv ? " checked" : "") + ">" + punkte + "<br><b>" + esc(f.label) + "</b><br><small>" + esc(f.archetyp) + "</small></label>";
    }).join("");
    var ms = d.medienStatus || { zeilen: [], fehlend: [] };
    var medien = '<table class="demo-medien" id="demo-medien"><tr><th>Bühne</th><th>Status</th><th>Herkunft</th></tr>' +
      ms.zeilen.map(function (z) {
        return "<tr><td>" + esc(z.label) + "</td><td class=\"" + (z.vorhanden ? "demo-da\">vorhanden" + (z.wiedergabe ? " (" + esc(z.wiedergabe) + ")" : "") : "demo-fehlt\">fehlt") + "</td><td>" + esc(z.kennzeichnung || "–") + "</td></tr>";
      }).join("") + "</table>" +
      (ms.fehlend.length ? '<p class="demo-hilfe">' + ms.fehlend.map(esc).join("<br>") + "</p>" : "");
    var alt = d.altDemo || { status: "nie" };
    var altText = alt.status === "online" ? '<span class="demo-hindernis">Unter der früheren Adresse steht noch eine öffentliche Demo (docs/). Abschalten: npm run demo:migration -- --abschalten</span>'
      : alt.status === "abgeschaltet" ? "Früher öffentlich, abgeschaltet am " + esc(alt.seit) + " – die alte Adresse zeigt nur noch den neutralen Hinweis der Agentur."
      : "Nie öffentlich.";
    var pr = d.praesentation || { aktiv: false };
    var praes = '<div class="demo-praes" id="demo-praes"><b>Präsentation im WLAN</b><p class="demo-hilfe">Zeigt die lokal gebaute Demo auf einem Handy im selben WLAN oder Hotspot – nicht im Internet, ohne Passwort, nur solange sie läuft (höchstens ' + esc(d.praesentationDauer) + ' Min.).</p>' +
      (pr.aktiv
        ? '<p><img alt="QR-Code zur Präsentation" src="/api/qr?url=' + encodeURIComponent(pr.url) + '"></p><p><a href="' + esc(pr.url) + '" target="_blank" rel="noopener">' + esc(pr.url) + "</a><br>läuft bis " + esc(zeit(pr.bis)) + '</p><button type="button" id="demo-praes-stop">Präsentation beenden</button>'
        : (pr.andere ? '<p class="demo-hilfe">Gerade läuft eine Präsentation für ' + esc(pr.andere) + " – ein Start hier beendet sie.</p>" : "") +
          '<button type="button" id="demo-praes-start"' + (d.vorschau ? "" : " disabled") + ">Präsentation im WLAN starten</button>" + (d.vorschau ? "" : '<p class="demo-hilfe">Erst „Konzept-Demo lokal bauen“.</p>')) +
      "</div>";
    var g = d.gebaut;
    var o = d.oeffentlich;

    panel.innerHTML =
      '<div class="demo-kopf"><div><h2>Demo: ' + esc(d.name.wert) + "</h2><div class=\"demo-hilfe\">Vorlage " + esc(d.vorlage.id) + " · Farbschema " + esc(d.farbschema.label) + "</div></div>" + statusHtml(d) + "</div>" +
      '<div class="demo-raster"><form id="demo-form">' +
      '<div class="demo-feld"><label for="demo-kueche">Küche</label><select id="demo-kueche" name="kueche"><option value=""' + (d.kuecheManuell ? "" : " selected") + ">Automatisch erkannt (" + esc(d.kueche) + ")</option>" + kuechen + "</select></div>" +
      '<div class="demo-feld"><label for="demo-vorlage">Vorlage</label><select id="demo-vorlage" name="vorlage">' + vorlagen + '</select><p class="demo-hilfe">' + esc(d.vorlage.prinzip) + "</p></div>" +
      '<div class="demo-feld"><span class="demo-label">Farbschema (drei zur Küche passende)</span><div class="demo-schemata">' + schemata + "</div></div>" +
      '<div class="demo-feld"><label for="demo-slogan">Slogan</label><input type="text" id="demo-slogan" name="slogan" maxlength="60" value="' + esc(d.slogan.wert) + '" placeholder="' + esc(d.slogan.standard) + '"><p class="demo-hilfe">Leer lassen = Vorlagenstandard („' + esc(d.slogan.standard) + '“).</p></div>' +
      '<div class="demo-feld"><span class="demo-label">Angaben zum Betrieb</span>' + angabe("name", "Name", d.name) + angabe("adresse", "Adresse", d.adresse) + angabe("telefon", "Telefon", d.telefon) + "</div>" +
      '<div class="demo-knoepfe"><button type="submit" class="knopf-primaer" id="demo-speichern"' + (laeuft ? " disabled" : "") + ">Speichern</button>" +
      '<button type="button" id="demo-vorschau-bauen"' + (laeuft ? " disabled" : "") + ">Konzept-Demo lokal bauen</button></div>" +
      '<p class="demo-hilfe" id="demo-meldung" role="status">' + esc(meldung) + "</p>" +
      '</form><aside class="demo-vorschau" aria-label="Vorschau">' +
      "<dl><dt>Vorlage</dt><dd>" + esc(d.vorlage.label) + " (" + esc(d.vorlage.id) + ")</dd>" +
      "<dt>Farbschema</dt><dd>" + esc(d.farbschema.label) + "</dd>" +
      "<dt>Name</dt><dd>" + esc(o.name) + (d.name.bestaetigt ? "" : " <em>(unbestätigt)</em>") + "</dd>" +
      "<dt>Slogan</dt><dd>" + esc(d.slogan.wert || d.slogan.standard) + (d.slogan.manuell ? "" : " <em>(Standard)</em>") + "</dd>" +
      "<dt>Gebaut</dt><dd>" + (g ? esc(g.ausdruck || "ohne Vorlage") + " · " + esc(g.designsystem) + " · " + esc(g.heroVariante) : "<em>noch nicht</em>") + "</dd>" +
      "<dt>Frühere Adresse</dt><dd id=\"demo-alt\">" + altText + "</dd>" +
      "<dt>Adresse (öffentlich)</dt><dd>" + (o.adresse ? esc(o.adresse) : "<em>nicht auf der Demo</em>") + "</dd>" +
      "<dt>Telefon (öffentlich)</dt><dd>" + (o.telefon ? esc(o.telefon) : "<em>nicht auf der Demo</em>") + "</dd>" +
      "<dt>Google</dt><dd>" + (d.google.rating ? esc(String(d.google.rating).replace(".", ",")) + " (" + esc(d.google.anzahl) + ") – nur hier im Dashboard; auf der Demo nur der " : "Auf der Demo nur der ") + (o.googleMapsUrl ? '<a href="' + esc(o.googleMapsUrl) + '" target="_blank" rel="noopener">Link zum Maps-Profil</a>' : "Maps-Link (keine Place ID)") + "</dd></dl>" +
      medien + praes +
      (d.vorschau ? '<p><a href="' + esc(d.vorschau) + '" target="_blank" rel="noopener">Vorschau in neuem Tab</a></p><div class="demo-geraete"><div class="demo-geraet"><b>Desktop</b><iframe class="demo-rahmen" title="Vorschau der Demo, Desktop" src="' + esc(d.vorschau) + "?t=" + Date.now() + '"></iframe></div><div class="demo-geraet demo-geraet--mobil"><b>Handy</b><iframe class="demo-rahmen demo-rahmen--mobil" title="Vorschau der Demo, Handy" src="' + esc(d.vorschau) + "?t=" + Date.now() + '"></iframe></div></div>' : '<p class="demo-hilfe">Noch keine Konzept-Demo gebaut.</p>') +
      "</aside></div>";
    binde();
    plane(laeuft);
  }

  function formDaten() {
    var f = document.getElementById("demo-form");
    var schema = f.querySelector('input[name="farbschema"]:checked');
    return { vorlage: f.vorlage.value, farbschema: schema ? schema.value : "", slogan: f.slogan.value };
  }

  function aktion(pfad, nutzlast, text) {
    meldung = text;
    var m = document.getElementById("demo-meldung");
    if (m) m.textContent = text;
    return post("/intern/v2/demo/" + encodeURIComponent(slug) + "/" + pfad, nutzlast).then(function (r) {
      if (r.demo) daten = r.demo;
      meldung = r.ok ? ({ speichern: "Gespeichert.", vorschau: "Konzept-Demo lokal gebaut.", praesentation: nutzlast.aktion === "stop" ? "Präsentation beendet." : "Präsentation läuft." })[pfad] : "Fehler: " + (r.fehler || r.status);
      render();
    }).catch(function (fehler) {
      meldung = "Fehler: " + fehler.message;
      render();
    });
  }

  function binde() {
    var f = document.getElementById("demo-form");
    f.addEventListener("submit", function (e) { e.preventDefault(); aktion("speichern", formDaten(), "Speichert …"); });
    // Ein Küchenwechsel ändert die drei Farbschemata – sofort speichern und neu zeichnen.
    f.kueche.addEventListener("change", function () { aktion("speichern", { kueche: f.kueche.value, farbschema: "" }, "Speichert Küche …"); });
    Array.prototype.forEach.call(f.querySelectorAll('input[name="farbschema"]'), function (r) {
      r.addEventListener("change", function () {
        Array.prototype.forEach.call(f.querySelectorAll(".demo-schema"), function (l) { l.classList.toggle("aktiv", l.contains(r) && r.checked); });
      });
    });
    document.getElementById("demo-vorschau-bauen").addEventListener("click", function () { aktion("vorschau", formDaten(), "Baut die Vorschau …"); });
    var start = document.getElementById("demo-praes-start");
    if (start) start.addEventListener("click", function () { aktion("praesentation", { aktion: "start" }, "Startet die Präsentation …"); });
    var stop = document.getElementById("demo-praes-stop");
    if (stop) stop.addEventListener("click", function () { aktion("praesentation", { aktion: "stop" }, "Beendet …"); });
    Array.prototype.forEach.call(panel.querySelectorAll(".demo-angabe"), function (zeile) {
      var feld = zeile.getAttribute("data-feld");
      zeile.querySelector("[data-bestaetigen]").addEventListener("click", function () {
        var n = {};
        n[feld] = { wert: zeile.querySelector("[data-wert]").value, notiz: zeile.querySelector("[data-notiz]").value };
        aktion("speichern", n, "Bestätigt …");
      });
      var zurueck = zeile.querySelector("[data-zuruecknehmen]");
      if (zurueck) zurueck.addEventListener("click", function () { var n = {}; n[feld] = null; aktion("speichern", n, "Nimmt zurück …"); });
    });
  }

  function plane(laeuft) {
    clearTimeout(takt);
    if (laeuft) takt = setTimeout(lade, 3000);
  }

  function lade() {
    return fetch("/api/v2/demo/" + encodeURIComponent(slug), { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) { panel.innerHTML = "<p>Zu diesem Entwurf gibt es keinen Lead.</p>"; return; }
        daten = d;
        render();
      });
  }
  lade();
})();
