// Kundenmodus in bearbeiten.html (ausgeliefert unter /v2/kunden-panel.js,
// Server: v2/integration/kundenDashboard.js). Dieselbe Seite wie das
// Demo-Panel – umgeschaltet über die Adresse:
//   bearbeiten.html?lead=<slug>   Konzept-Demo (bestehendes Demo-Panel) + Kasten „Kundenwebsite“
//   bearbeiten.html?kunde=<id>    Kundenfassung bearbeiten
//   bearbeiten.html               Liste der Kundenfassungen
// Keine Layout-Werkzeuge: nur Inhalte, die in vorhandene Plätze fließen.
(function () {
  "use strict";
  var params = new URLSearchParams(location.search);
  var kundeId = params.get("kunde");
  var leadSlug = params.get("lead");

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
  function holen(url, optionen) {
    var aufruf = window.geschuetzterFetch || fetch;
    return aufruf(url, optionen || {}).then(function (r) {
      return r.json().then(function (j) { j.httpStatus = r.status; return j; }, function () { return { ok: false, fehler: "Antwort unlesbar (" + r.status + ")", httpStatus: r.status }; });
    });
  }
  function post(url, daten) {
    return holen(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(daten || {}) });
  }

  var stil = document.createElement("style");
  stil.textContent = [
    ".modus{display:flex;gap:6px;margin:0 20px 18px}.modus a,.modus span{padding:7px 14px;border:1px solid var(--border,#ddd);border-radius:999px;font-size:.85rem;font-weight:600;text-decoration:none;color:var(--text,#222);background:var(--card,#fff)}",
    ".modus .aktiv{background:var(--text,#222);color:#fff;border-color:var(--text,#222)}",
    ".kp{margin:0 20px 40px}.kp h2{margin:0 0 4px;font-size:1.15rem}.kp h3{margin:0 0 8px;font-size:1rem}",
    ".kp-karte{background:var(--card,#fff);border:1px solid var(--border,#e3e6ea);border-radius:12px;padding:18px 20px;margin-bottom:18px}",
    ".kp-hilfe{font-size:.82rem;color:var(--muted,#6b7280);margin:4px 0 0}",
    ".kp-stufen{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.kp-stufe{padding:8px 12px;border-radius:8px;border:1px solid var(--border,#e3e6ea);font-size:.82rem;min-width:150px}",
    ".kp-stufe b{display:block;font-size:.85rem}.kp-stufe.ja{background:#e8f5ec;border-color:#9ad0a9}.kp-stufe.alt{background:#fff6e0;border-color:#e8c97a}",
    ".kp-nav{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 16px;position:sticky;top:0;background:var(--bg,#f6f7f9);padding:8px 0;z-index:5}.kp-nav a{font-size:.85rem;padding:6px 12px;border-radius:6px;border:1px solid var(--border,#ddd);text-decoration:none;color:var(--text,#222);background:var(--card,#fff)}",
    ".kp-feld{border-top:1px solid var(--border,#eee);padding:12px 0;display:grid;grid-template-columns:minmax(180px,240px) 1fr;gap:6px 18px}",
    "@media (max-width:760px){.kp-feld{grid-template-columns:1fr}}",
    ".kp-feld input[type=text],.kp-feld textarea,.kp-feld input[type=number],.kp input[type=text],.kp textarea{width:100%;box-sizing:border-box;padding:8px 10px;font:inherit;border:1px solid var(--border,#ccc);border-radius:6px}",
    ".kp-feld textarea{min-height:80px}.kp-meta{font-size:.78rem;color:var(--muted,#6b7280)}",
    ".kp-status{display:inline-block;padding:2px 8px;border-radius:999px;font-size:.72rem;font-weight:700;background:#eef0f3;color:#374151}",
    ".kp-status.muster{background:#fff3d6;color:#6b4a00}.kp-status.fehlt{background:#fde8e6;color:#8a2416}.kp-status.entwurf{background:#fff3d6;color:#6b4a00}.kp-status.bestaetigt{background:#e3f1e6;color:#1d5a2c}.kp-status.freigegeben{background:#1d5a2c;color:#fff}.kp-status.vorlage{background:#eef0f3;color:#6b7280}",
    ".kp-knoepfe{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.kp-knoepfe button,.kp-knopf{padding:6px 12px;border:1px solid var(--border,#ccc);border-radius:6px;background:var(--card,#fff);font:inherit;font-size:.82rem;font-weight:600;cursor:pointer}",
    ".kp-knoepfe button.primaer,.kp-knopf.primaer{background:var(--accent,#2563eb);color:#fff;border-color:var(--accent,#2563eb)}",
    ".kp-knoepfe button[disabled]{opacity:.5;cursor:not-allowed}",
    ".kp-medien{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}",
    ".kp-medium{border:1px solid var(--border,#e3e6ea);border-radius:10px;overflow:hidden;background:var(--card,#fff)}",
    ".kp-medium .kp-bild{aspect-ratio:4/3;background:#eef0f3;display:flex;align-items:center;justify-content:center;position:relative}",
    ".kp-medium .kp-bild img,.kp-medium .kp-bild video{width:100%;height:100%;object-fit:contain}",
    ".kp-medium .kp-bild .kp-marke{position:absolute;left:8px;top:8px;background:#1f2430;color:#fff;font-size:.7rem;padding:2px 8px;border-radius:999px}",
    ".kp-medium .kp-koerper{padding:12px 14px}",
    ".kp-medium input[type=file]{font-size:.8rem}",
    ".kp-fehler{color:#b42318;font-size:.82rem}.kp-ok{color:#1d5a2c;font-size:.82rem}",
    ".kp-banner{padding:12px 16px;border-radius:8px;background:#fde8e6;color:#8a2416;margin-bottom:14px;font-weight:600}",
    ".kp-gericht{border-top:1px solid var(--border,#eee);padding:12px 0;display:grid;grid-template-columns:120px 1fr;gap:12px}",
    ".kp-gericht .kp-thumb{width:120px;aspect-ratio:4/3;background:#eef0f3;border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:.7rem;color:#6b7280;text-align:center}",
    ".kp-gericht .kp-thumb img{width:100%;height:100%;object-fit:cover}",
    ".kp-reihe{display:grid;grid-template-columns:2fr 110px;gap:8px}.kp-reihe3{display:grid;grid-template-columns:repeat(3,auto);gap:10px;font-size:.82rem;align-items:center}",
    ".kp-geraete{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start}.kp-geraete iframe{border:1px solid var(--border,#ddd);border-radius:8px;background:#fff}",
    ".kp-liste li{margin:4px 0}",
  ].join("\n");
  document.head.appendChild(stil);

  /* ---------- Modus-Umschalter (in jeder Ansicht) ---------- */

  var kopf = document.querySelector("header");
  var modus = document.createElement("nav");
  modus.className = "modus";
  modus.setAttribute("aria-label", "Bearbeitungsmodus");
  if (kopf) kopf.parentNode.insertBefore(modus, kopf.nextSibling);

  function zeigeModus(demoHref, kundeHref, aktiv) {
    modus.innerHTML =
      (demoHref ? '<a href="' + esc(demoHref) + '"' + (aktiv === "demo" ? ' class="aktiv" aria-current="page"' : "") + ">Konzept-Demo</a>" : '<span' + (aktiv === "demo" ? ' class="aktiv"' : "") + ">Konzept-Demo</span>") +
      (kundeHref ? '<a href="' + esc(kundeHref) + '"' + (aktiv === "kunde" ? ' class="aktiv" aria-current="page"' : "") + ">Kundenwebsite</a>" : '<span' + (aktiv === "kunde" ? ' class="aktiv"' : "") + ">Kundenwebsite</span>");
  }

  /* ---------- Lead-Modus: Kasten „Kundenwebsite“ ---------- */

  if (leadSlug && !kundeId) {
    var box = document.createElement("section");
    box.className = "kp";
    box.id = "kunden-box";
    var ziel = document.getElementById("raster");
    if (ziel) ziel.parentNode.insertBefore(box, ziel);
    holen("/intern/kunden").then(function (r) {
      var eigene = (r.kunden || []).filter(function (k) { return k.herkunft && k.herkunft.slug === leadSlug; });
      zeigeModus(null, eigene[0] ? "/bearbeiten.html?kunde=" + eigene[0].id : "#kunden-box", "demo");
      box.innerHTML = '<div class="kp-karte"><h2>Kundenwebsite</h2><p class="kp-hilfe">Für einen gewonnenen Betrieb: eigene Kundenfassung mit derselben Designrichtung. Die Konzept-Demo bleibt dabei unverändert.</p>' +
        (eigene.length ? '<ul class="kp-liste">' + eigene.map(function (k) { return '<li><a href="/bearbeiten.html?kunde=' + esc(k.id) + '">' + esc(k.name || k.id) + "</a> · " + esc(k.id) + " · geändert " + esc(zeit(k.geaendert)) + "</li>"; }).join("") + "</ul>" : "") +
        '<div class="kp-knoepfe"><button type="button" id="kp-anlegen">Kundenfassung aus dieser Demo anlegen</button></div><p class="kp-hilfe" id="kp-anlegen-meldung"></p></div>';
      document.getElementById("kp-anlegen").addEventListener("click", function () {
        if (eigene.length && !confirm("Für diese Demo gibt es schon eine Kundenfassung. Trotzdem eine weitere anlegen?")) return;
        post("/intern/kunden/anlegen", { ausDemo: leadSlug }).then(function (a) {
          if (a.ok) location.href = a.url;
          else document.getElementById("kp-anlegen-meldung").textContent = "Fehler: " + a.fehler;
        });
      });
    });
    return;
  }

  /* ---------- Ohne Angabe: Liste der Kundenfassungen ---------- */

  if (!kundeId) {
    zeigeModus(null, null, "kunde");
    var liste = document.createElement("section");
    liste.className = "kp";
    var leer = document.getElementById("leer");
    (leer || document.body).parentNode.insertBefore(liste, leer ? leer.nextSibling : null);
    holen("/intern/kunden").then(function (r) {
      var k = r.kunden || [];
      liste.innerHTML = '<div class="kp-karte"><h2>Kundenwebsites</h2>' +
        (k.length ? '<ul class="kp-liste">' + k.map(function (x) { return '<li><a href="/bearbeiten.html?kunde=' + esc(x.id) + '">' + esc(x.name || x.id) + "</a> · " + esc(x.id) + " · aus " + esc(x.herkunft && x.herkunft.slug) + "</li>"; }).join("") + "</ul>" : '<p class="kp-hilfe">Noch keine Kundenfassung. Anlegen im Lead-Dashboard über „Bearbeiten“ einer Demo.</p>') +
        '<h3 style="margin-top:16px">Testkunde aus einer fiktiven Beispielseite</h3><div class="kp-knoepfe"><select id="kp-beispiel"><option value="italienisch">Italienisch</option><option value="bayerisch">Bayerisch</option><option value="japanisch">Japanisch</option><option value="griechisch">Griechisch</option></select><button type="button" id="kp-test">Testkunde anlegen</button></div></div>';
      document.getElementById("kp-test").addEventListener("click", function () {
        post("/intern/kunden/anlegen", { ausBeispiel: document.getElementById("kp-beispiel").value }).then(function (a) {
          if (a.ok) location.href = a.url;
          else alert(a.fehler);
        });
      });
    });
    return;
  }

  /* ---------- Kundenmodus ---------- */

  // Was nur zur Lead-Demo gehört, ausblenden (Bilder-Raster, Prompt, Hinweise).
  ["hinweis", "raster", "leer", "prompt-abschnitt", "veroeffentlichen-abschnitt"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  var titel = document.querySelector("header h1");
  if (titel) titel.textContent = "Kundenwebsite bearbeiten";

  var wurzel = document.createElement("section");
  wurzel.className = "kp";
  wurzel.id = "kunden-panel";
  modus.parentNode.insertBefore(wurzel, modus.nextSibling);

  var d = null;
  var banner = "";
  var meldungen = {};

  var STATUS_TEXT = { muster: "Muster – unbestätigt", fehlt: "fehlt", vorlage: "Vorlagentext", entwurf: "Entwurf", bestaetigt: "vom Kunden bestätigt", freigegeben: "freigegeben" };
  function status(s) { return '<span class="kp-status ' + esc(s) + '">' + esc(STATUS_TEXT[s] || s) + "</span>"; }

  function laden() {
    return holen("/intern/kunde/" + encodeURIComponent(kundeId)).then(function (r) {
      if (!r.ok) { wurzel.innerHTML = '<div class="kp-karte"><p class="kp-fehler">' + esc(r.fehler || "Kundenfassung nicht gefunden.") + "</p></div>"; return; }
      d = r.kunde;
      var unter = document.getElementById("untertitel");
      if (unter) unter.textContent = "Kundenfassung · Inhalte und Medien – Layout und Designsystem bleiben gesperrt";
      zeigeModus(d.herkunft && d.herkunft.art === "lead-demo" ? "/bearbeiten.html?lead=" + encodeURIComponent(d.herkunft.slug) : null, null, "kunde");
      render();
    });
  }

  function antwort(r, schluessel, text) {
    if (r.kunde) d = r.kunde;
    if (r.ok) { meldungen[schluessel] = ["ok", text]; banner = ""; }
    else if (r.konflikt) { banner = r.fehler; meldungen[schluessel] = ["fehler", "Nicht gespeichert – Konflikt."]; }
    else meldungen[schluessel] = ["fehler", r.fehler || "Fehler"];
    render();
    return r;
  }

  function aktion(daten, schluessel, text) {
    daten.revision = d.revision;
    return post("/intern/kunde/" + encodeURIComponent(kundeId) + "/aktion", daten).then(function (r) { return antwort(r, schluessel, text); });
  }

  function meldung(schluessel) {
    var m = meldungen[schluessel];
    return m ? '<p class="' + (m[0] === "ok" ? "kp-ok" : "kp-fehler") + '" role="status">' + esc(m[1]) + "</p>" : "";
  }

  /* ----- Felder ----- */

  function feldHtml(f) {
    var eingabe = f.mehrzeilig
      ? '<textarea data-feld="' + esc(f.id) + '" maxlength="' + f.max + '" placeholder="' + esc(f.vorlagenwert || "") + '">' + esc(f.wert) + "</textarea>"
      : '<input type="text" data-feld="' + esc(f.id) + '" maxlength="' + f.max + '" value="' + esc(f.wert) + '" placeholder="' + esc(f.vorlagenwert || "") + '">';
    var st = f.wert ? f.status : f.vorlagenwert ? "vorlage" : "fehlt";
    return '<div class="kp-feld" id="feld-' + esc(f.id.replace(/\./g, "-")) + '">' +
      "<div><b>" + esc(f.label) + (f.pflicht ? " *" : "") + '</b><div class="kp-meta">Platz: ' + esc(f.platz) + "</div><div>" + status(st) + "</div></div>" +
      "<div>" + eingabe +
      '<div class="kp-meta">Aktuell: ' + (f.wert ? esc(f.wert).slice(0, 200) : f.vorlagenwert ? "<em>" + esc(f.vorlagenwert).slice(0, 200) + "</em>" : "<em>leer</em>") +
      " · Quelle: " + esc(f.quelle || "–") + (f.geaendertAm && f.wert ? " · geändert " + esc(zeit(f.geaendertAm)) : "") + "</div>" +
      '<div class="kp-knoepfe"><button type="button" class="primaer" data-speichern="' + esc(f.id) + '">Speichern</button>' +
      (f.wert ? '<button type="button" data-bestaetigen="' + esc(f.id) + '" data-wert="' + (f.status === "bestaetigt" || f.status === "freigegeben" ? "0" : "1") + '">' + (f.status === "bestaetigt" || f.status === "freigegeben" ? "Bestätigung zurücknehmen" : "Vom Kunden bestätigt") + "</button>" : "") +
      (f.wert && !f.pflicht ? '<button type="button" data-leeren="' + esc(f.id) + '">Entfernen (Vorlagentext)</button>' : "") +
      "</div>" + meldung("feld:" + f.id) + "</div></div>";
  }

  /* ----- Medien ----- */

  function vorschauMedium(m, art) {
    if (!m) return "";
    return art === "video" ? '<video src="' + esc(m.url) + '" muted playsinline controls preload="metadata"></video>' : '<img src="' + esc(m.url) + '" alt="">';
  }

  function mediumHtml(m) {
    var anzeige = m.vorschlag || m.aktuell;
    return '<div class="kp-medium" data-rolle="' + esc(m.rolle) + '">' +
      '<div class="kp-bild">' + (anzeige ? vorschauMedium(anzeige, m.art) + '<span class="kp-marke">' + (m.vorschlag ? "Neu – noch nicht übernommen" : "Aktuell") + "</span>" : '<span class="kp-meta">Kein Medium – die Seite zeigt hier nichts bzw. eine neutrale Fläche.</span>') + "</div>" +
      '<div class="kp-koerper"><b>' + esc(m.label) + "</b> " + status(m.status) +
      '<div class="kp-meta">Platz: ' + esc(m.platz) + (m.minBreite ? " · mind. " + m.minBreite + " px breit" : "") + " · " + (m.art === "video" ? "MP4/WebM bis " + Math.round(d.limits.videoBytes / 1048576) + " MB" : "JPEG/PNG/WebP bis " + Math.round(d.limits.bildBytes / 1048576) + " MB") + "</div>" +
      (m.aktuell ? '<div class="kp-meta">Aktuell: ' + esc(m.aktuell.breite ? m.aktuell.breite + "×" + m.aktuell.hoehe + " px, " : "") + Math.round(m.aktuell.bytes / 1024) + " kB · " + esc(m.quelle) + "</div>" : "") +
      '<div class="kp-knoepfe"><label class="kp-knopf">' + (m.aktuell ? "Ersetzen" : "Hinzufügen") + '<input type="file" hidden data-upload="' + esc(m.rolle) + '" accept="' + (m.art === "video" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp") + '"></label>' +
      (m.vorschlag ? '<button type="button" class="primaer" data-medium="' + esc(m.rolle) + '" data-was="uebernehmen">Übernehmen</button><button type="button" data-medium="' + esc(m.rolle) + '" data-was="verwerfen">Abbrechen</button>' : "") +
      (m.vorher && !m.vorschlag ? '<button type="button" data-medium="' + esc(m.rolle) + '" data-was="zuruecksetzen">Zurücksetzen auf vorher</button>' : "") +
      (m.aktuell && !m.vorschlag ? '<button type="button" data-medium="' + esc(m.rolle) + '" data-was="' + (m.status === "bestaetigt" || m.status === "freigegeben" ? "unbestaetigt" : "bestaetigen") + '">' + (m.status === "bestaetigt" || m.status === "freigegeben" ? "Bestätigung zurücknehmen" : "Vom Kunden bestätigt") + '</button><button type="button" data-medium="' + esc(m.rolle) + '" data-was="entfernen">Entfernen</button>' : "") +
      "</div>" +
      (m.art === "bild" ? '<div style="margin-top:8px"><input type="text" data-alt="' + esc(m.rolle) + '" value="' + esc(m.alt) + '" placeholder="Alt-Text (was ist zu sehen?)" maxlength="160">' +
        (m.rolle === "hero" || m.rolle === "heroMobil" || m.rolle === "haus" ? '<input type="text" data-fokus="' + esc(m.rolle) + '" value="' + esc(m.fokus) + '" placeholder="Fokus, z. B. 50% 30%" style="margin-top:6px">' : "") +
        '<div class="kp-knoepfe"><button type="button" data-beschreiben="' + esc(m.rolle) + '">Alt-Text/Fokus speichern</button></div></div>' : "") +
      meldung("medium:" + m.rolle) + "</div></div>";
  }

  /* ----- Speisekarte ----- */

  function gerichtHtml(g) {
    var bild = d.medien.filter(function (m) { return m.rolle === "gericht:" + g.id; })[0];
    var thumb = bild && (bild.vorschlag || bild.aktuell);
    var st = g.herkunft === "muster" && g.status !== "bestaetigt" ? "muster" : g.status;
    var varianten = (g.varianten || []).map(function (v) { return v.name + " = " + String(v.preis).replace(".", ","); }).join("\n");
    var extras = (g.extras || []).map(function (x) { return x.name + (x.preis !== undefined ? " = " + String(x.preis).replace(".", ",") : ""); }).join("\n");
    return '<div class="kp-gericht" data-gericht="' + esc(g.id) + '">' +
      '<div><div class="kp-thumb">' + (thumb ? '<img src="' + esc(thumb.url) + '" alt="">' : "kein Bild") + "</div>" +
      '<div class="kp-knoepfe"><label class="kp-knopf">' + (bild && bild.aktuell ? "Bild ersetzen" : "Bild hinzufügen") + '<input type="file" hidden data-upload="gericht:' + esc(g.id) + '" accept="image/jpeg,image/png,image/webp"></label>' +
      (bild && bild.vorschlag ? '<button type="button" class="primaer" data-medium="gericht:' + esc(g.id) + '" data-was="uebernehmen">Übernehmen</button><button type="button" data-medium="gericht:' + esc(g.id) + '" data-was="verwerfen">Abbrechen</button>' : "") +
      (bild && bild.aktuell && !bild.vorschlag ? '<button type="button" data-medium="gericht:' + esc(g.id) + '" data-was="entfernen">Bild entfernen</button>' : "") +
      "</div>" + meldung("medium:gericht:" + g.id) + "</div>" +
      "<div>" + status(st) + ' <span class="kp-meta">ID ' + esc(g.id) + " · " + (g.herkunft === "muster" ? "aus der Musterkarte" : "Kundenangabe") + "</span>" +
      '<div class="kp-reihe" style="margin-top:6px"><input type="text" data-g="name" value="' + esc(g.name) + '" aria-label="Name" maxlength="80"><input type="text" data-g="preis" value="' + esc(Number(g.preis).toFixed(2).replace(".", ",")) + '" aria-label="Preis in Euro"></div>' +
      '<input type="text" data-g="beschreibung" value="' + esc(g.beschreibung) + '" placeholder="Beschreibung" maxlength="300" style="margin-top:6px">' +
      '<input type="text" data-g="allergene" value="' + esc(g.allergene) + '" placeholder="Allergene/Zusatzstoffe (vom Betrieb geliefert), z. B. A, C, G" maxlength="160" style="margin-top:6px">' +
      '<details style="margin-top:6px"><summary class="kp-meta">Varianten und Extras</summary><textarea data-g="varianten" placeholder="Eine je Zeile: Klein = 7,50">' + esc(varianten) + '</textarea><textarea data-g="extras" placeholder="Eine je Zeile: Extra Käse = 1,50" style="margin-top:6px">' + esc(extras) + "</textarea></details>" +
      '<div class="kp-reihe3" style="margin-top:6px"><label><input type="checkbox" data-g="verfuegbar"' + (g.verfuegbar !== false ? " checked" : "") + "> verfügbar</label><label><input type=\"checkbox\" data-g=\"sichtbar\"" + (g.sichtbar !== false ? " checked" : "") + '> sichtbar</label><label><input type="checkbox" data-g="vegetarisch"' + (g.vegetarisch ? " checked" : "") + "> vegetarisch</label></div>" +
      '<div class="kp-knoepfe"><button type="button" class="primaer" data-gericht-speichern="' + esc(g.id) + '">Gericht speichern</button>' +
      '<button type="button" data-gericht-bestaetigen="' + esc(g.id) + '" data-wert="' + (g.status === "bestaetigt" ? "0" : "1") + '">' + (g.status === "bestaetigt" ? "Bestätigung zurücknehmen" : "Vom Kunden bestätigt") + "</button>" +
      '<button type="button" data-verschieben="' + esc(g.id) + '" data-richtung="hoch" aria-label="nach oben">↑</button><button type="button" data-verschieben="' + esc(g.id) + '" data-richtung="runter" aria-label="nach unten">↓</button>' +
      '<button type="button" data-gericht-entfernen="' + esc(g.id) + '">Gericht löschen</button></div>' + meldung("gericht:" + g.id) + "</div></div>";
  }

  function karteHtml() {
    return d.speisekarte.kategorien.map(function (k) {
      return '<div class="kp-karte" data-kategorie="' + esc(k.id) + '"><div class="kp-reihe"><input type="text" data-k-name value="' + esc(k.name) + '" aria-label="Kategorie"><button type="button" class="kp-knopf" data-kategorie-speichern="' + esc(k.id) + '">Kategorie umbenennen</button></div>' +
        k.gerichte.map(gerichtHtml).join("") +
        '<div class="kp-knoepfe" style="margin-top:10px"><button type="button" data-gericht-neu="' + esc(k.id) + '">+ Gericht hinzufügen</button>' + (k.gerichte.length ? "" : '<button type="button" data-kategorie-entfernen="' + esc(k.id) + '">Leere Kategorie löschen</button>') + "</div>" + meldung("kategorie:" + k.id) + "</div>";
    }).join("") + '<div class="kp-knoepfe"><input type="text" id="kp-neue-kategorie" placeholder="Neue Kategorie" style="max-width:260px"><button type="button" id="kp-kategorie-neu">+ Kategorie</button></div>';
  }

  /* ----- Betrieb ----- */

  function zeitenHtml() {
    var o = d.oeffnungszeiten;
    var zeilen = (o.wert.length ? o.wert : [{ tage: "", zeiten: "" }]).map(function (z) { return z.tage + " | " + z.zeiten; }).join("\n");
    var aus = (o.ausnahmen || []).map(function (z) { return z.tage + " | " + z.zeiten; }).join("\n");
    return '<div class="kp-feld" id="feld-oeffnungszeiten"><div><b>Öffnungszeiten *</b><div class="kp-meta">Platz: Anfahrt; die Abholzeiten rechnen damit</div><div>' + status(o.wert.length ? o.status : "fehlt") + "</div></div><div>" +
      '<textarea id="kp-zeiten" placeholder="Mo–Fr | 11:30–14:00 & 17:00–22:00\nSa | 17:00–23:00\nSo | Ruhetag">' + esc(o.wert.length ? zeilen : "") + "</textarea>" +
      '<div class="kp-meta">Eine Zeile je Tag bzw. Tagesbereich: „Tage | Zeiten“.</div>' +
      '<textarea id="kp-ausnahmen" placeholder="24.12. | geschlossen\n27.07.–10.08. | Betriebsurlaub" style="margin-top:6px;min-height:60px">' + esc(aus) + "</textarea>" +
      '<div class="kp-meta">Ausnahmen (Feiertage, Urlaub) – erscheinen in der Anzeige; die Abholzeit-Rechnung kennt sie nicht, dann bitte Bestellung pausieren.</div>' +
      '<div class="kp-knoepfe"><button type="button" class="primaer" id="kp-zeiten-speichern">Öffnungszeiten speichern</button>' + (o.wert.length ? '<button type="button" id="kp-zeiten-bestaetigen" data-wert="' + (o.status === "bestaetigt" ? "0" : "1") + '">' + (o.status === "bestaetigt" ? "Bestätigung zurücknehmen" : "Vom Kunden bestätigt") + "</button>" : "") + "</div>" + meldung("zeiten") + "</div></div>" +
      '<div class="kp-feld"><div><b>Online-Bestellung</b><div class="kp-meta">Warenkorb und Abholung auf der Seite</div></div><div><label><input type="checkbox" id="kp-bestellung"' + (d.bestellung.aktiv ? " checked" : "") + "> Abholbestellung über die Website anbieten</label>" +
      '<div class="kp-meta">Bestellbar: ' + d.katalogGroesse + ' Einträge. Preise und Verfügbarkeit gehen beim Bau an den verknüpften Wirt-Betrieb – der Server rechnet mit genau dieser Karte.</div>' + meldung("bestellung") +
      '<div class="kp-meta" style="margin-top:6px">Reservierung: in jeder Vorlage enthalten; Tischplan und Bestätigung im Wirt-Dashboard.</div></div></div>';
  }

  /* ----- Kopf, Status, Vorschau ----- */

  function stufenHtml() {
    var s = d.stufen;
    function stufe(klasse, name, text) { return '<div class="kp-stufe ' + klasse + '"><b>' + esc(name) + "</b>" + text + "</div>"; }
    return '<div class="kp-stufen">' +
      stufe("ja", "1 · Entwurf", "Revision " + d.revision + "<br>" + esc(zeit(s.entwurf.zeitpunkt))) +
      stufe(s.lokalGebaut.erreicht ? "ja" : s.lokalGebaut.veraltet ? "alt" : "", "2 · Lokal gebaute Vorschau", s.lokalGebaut.erreicht ? esc(zeit(s.lokalGebaut.zeitpunkt)) : s.lokalGebaut.fehler ? '<span class="kp-fehler">' + esc(s.lokalGebaut.fehler) + "</span>" : s.lokalGebaut.veraltet ? "veraltet – seit dem Bau geändert" : "noch nicht gebaut") +
      stufe(s.freigegeben.erreicht ? "ja" : s.freigegeben.veraltet ? "alt" : "", "3 · Freigegebene Fassung", s.freigegeben.erreicht ? "von " + esc(s.freigegeben.von) + ", " + esc(zeit(s.freigegeben.zeitpunkt)) : s.freigegeben.veraltet ? "veraltet – seit der Freigabe geändert" : "noch nicht freigegeben") +
      stufe(s.deploymentReady.erreicht ? "ja" : "", "4 · Deployment-ready", s.deploymentReady.erreicht ? "bereit – wartet auf Domain/Hosting" : "noch nicht (" + s.deploymentReady.fehlend.length + " offene Punkte)") +
      stufe(s.live.erreicht ? "ja" : "", "5 · Live", esc(s.live.text)) + "</div>";
  }

  function render() {
    var s = d.stufen;
    var b = s.bereitschaft;
    var bereich = function (id) { return d.felder.filter(function (f) { return f.bereich === id; }).map(feldHtml).join(""); };
    var medien = function (id) { return '<div class="kp-medien">' + d.medien.filter(function (m) { return m.bereich === id; }).map(mediumHtml).join("") + "</div>"; };
    var schemata = d.design.farbschemata.map(function (f) { return '<label style="margin-right:14px"><input type="radio" name="kp-farbschema" value="' + esc(f.id) + '"' + (f.id === d.design.farbschema ? " checked" : "") + "> " + esc(f.label) + "</label>"; }).join("");
    var plan = d.plan;
    wurzel.innerHTML =
      (banner ? '<div class="kp-banner" role="alert">' + esc(banner) + ' <button type="button" id="kp-neu-laden">Neu laden</button></div>' : "") +
      '<div class="kp-karte"><h2>' + esc((d.felder.filter(function (f) { return f.id === "name"; })[0] || {}).wert || d.id) + "</h2>" +
      '<p class="kp-hilfe">Kunden-ID ' + esc(d.id) + " · angelegt aus " + esc(d.herkunft.art === "beispiel" ? "Beispielseite (fiktiver Testkunde)" : "Lead-Demo") + " " + esc(d.herkunft.slug) + " · Designrichtung: " + esc(d.design.kueche) + " / " + esc(d.design.vorlageLabel) + " · Layout gesperrt</p>" +
      stufenHtml() +
      '<div class="kp-knoepfe"><button type="button" class="primaer" id="kp-bauen">Nur diese Kundenwebsite lokal bauen</button>' +
      (d.vorschau ? '<a class="kp-knopf" href="' + esc(d.vorschau) + '" target="_blank" rel="noopener">Vorschau öffnen</a>' : "") +
      '<button type="button" id="kp-freigeben"' + (s.lokalGebaut.erreicht && !b.inhalt.length && !s.freigegeben.erreicht ? "" : " disabled") + ">Inhalte freigeben …</button></div>" + meldung("bau") +
      (b.inhalt.length ? '<details style="margin-top:10px"' + (s.lokalGebaut.erreicht ? " open" : "") + '><summary><b>Noch offen vor der Freigabe (' + b.inhalt.length + ")</b></summary><ul>" + b.inhalt.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></details>" : '<p class="kp-ok">Inhaltlich vollständig.</p>') +
      '<details style="margin-top:6px"><summary><b>Veröffentlichen</b> – noch nicht eingerichtet</summary><p class="kp-hilfe">' + esc(plan.grund) + ' Es gibt deshalb hier keinen Veröffentlichen-Knopf. Später würde dieser Schritt:</p><ol>' + plan.wuerde.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol><p><b>Vorher offen:</b></p><ul>" + plan.hindernisse.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></details></div>" +
      '<nav class="kp-nav" aria-label="Bereiche"><a href="#kp-marke">Marke</a><a href="#kp-hero">Hero</a><a href="#kp-texte">Texte</a><a href="#kp-bilder">Bilder</a><a href="#kp-speisekarte">Speisekarte</a><a href="#kp-betrieb">Betrieb</a><a href="#kp-vorschau">Vorschau</a><a href="#kp-gesperrt">Gesperrt</a></nav>' +
      '<div class="kp-karte" id="kp-marke"><h3>Marke</h3>' + bereich("marke") + '<div class="kp-feld"><div><b>Farbschema</b><div class="kp-meta">eins der drei zur Küche passenden</div></div><div>' + schemata + '<div class="kp-knoepfe"><button type="button" id="kp-farbschema">Farbschema speichern</button></div>' + meldung("farbschema") + "</div></div>" + medien("marke") + "</div>" +
      '<div class="kp-karte" id="kp-hero"><h3>Hero</h3><p class="kp-hilfe">Poster sind immer sichtbar (vor dem Video, bei reduzierter Bewegung, ohne Skript). Fehlt ein Video, zeigt die Bühne das Poster – es wird nichts ersetzt.</p>' + medien("hero") + "</div>" +
      '<div class="kp-karte" id="kp-texte"><h3>Texte</h3><p class="kp-hilfe">Leer = Vorlagentext (grau) bleibt stehen. Alle Texte werden maskiert, HTML ist nicht möglich.</p>' + bereich("texte") + "</div>" +
      '<div class="kp-karte" id="kp-bilder"><h3>Bilder</h3>' + medien("bilder") + '<p class="kp-hilfe">Produktbilder je Gericht stehen in der Speisekarte.</p></div>' +
      '<div id="kp-speisekarte"><div class="kp-karte"><h3>Speisekarte</h3><p class="kp-hilfe">Die kanonische Karte dieser Kundenfassung: Startseite, Speisekarten-Seite, Warenkorb und Server rechnen mit denselben Daten. Gerichte behalten ihre ID beim Umbenennen. Preise in Euro.</p></div>' + karteHtml() + "</div>" +
      '<div class="kp-karte" id="kp-betrieb"><h3>Betrieb</h3>' + bereich("betrieb") + zeitenHtml() + "</div>" +
      '<div class="kp-karte" id="kp-vorschau"><h3>Vorschau</h3>' + (d.vorschau ? '<div class="kp-geraete"><div><b>Desktop</b><br><iframe title="Vorschau Desktop" src="' + esc(d.vorschau) + "?t=" + Date.now() + '" style="width:1024px;max-width:100%;height:640px"></iframe></div><div><b>Mobile</b><br><iframe title="Vorschau Mobile" src="' + esc(d.vorschau) + "?t=" + Date.now() + '" style="width:390px;height:760px"></iframe></div></div>' : '<p class="kp-hilfe">Noch keine lokale Vorschau – oben „lokal bauen“.</p>') + "</div>" +
      '<div class="kp-karte" id="kp-gesperrt"><h3>Absichtlich nicht editierbar</h3><ul>' + d.gesperrt.map(function (g) { return "<li><b>" + esc(g.label) + ":</b> " + esc(g.grund) + "</li>"; }).join("") + "</ul></div>" +
      '<div class="kp-karte"><h3>Verlauf</h3><ul class="kp-liste">' + d.verlauf.map(function (v) { return "<li>Rev. " + v.revision + " · " + esc(zeit(v.zeitpunkt)) + " · " + esc(v.von) + ": " + esc(v.was) + "</li>"; }).join("") + "</ul></div>";
  }

  /* ---------- Ereignisse ---------- */

  function preiszeilen(text) {
    return String(text || "").split("\n").map(function (z) { return z.trim(); }).filter(Boolean).map(function (z) {
      var teile = z.split("=");
      var name = teile[0].trim();
      var preis = teile.length > 1 ? teile.slice(1).join("=").trim().replace(",", ".") : "";
      return preis ? { name: name, preis: preis } : { name: name };
    });
  }

  /** Prüft ein Medium schon im Browser: lässt es sich überhaupt anzeigen? */
  function pruefeImBrowser(datei, istVideo, minBreite) {
    return new Promise(function (ok, fehler) {
      var url = URL.createObjectURL(datei);
      if (istVideo) {
        var v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = function () { URL.revokeObjectURL(url); ok(); };
        v.onerror = function () { URL.revokeObjectURL(url); fehler(new Error("Dieses Video kann der Browser nicht abspielen.")); };
        v.src = url;
      } else {
        var i = new Image();
        i.onload = function () { URL.revokeObjectURL(url); if (minBreite && i.naturalWidth < minBreite) fehler(new Error("Zu klein: " + i.naturalWidth + " px breit, nötig sind " + minBreite + " px.")); else ok(); };
        i.onerror = function () { URL.revokeObjectURL(url); fehler(new Error("Das Bild ist beschädigt oder kein unterstütztes Format.")); };
        i.src = url;
      }
    });
  }

  wurzel.addEventListener("change", function (e) {
    var eingabe = e.target.closest("input[data-upload]");
    if (eingabe && eingabe.files[0]) {
      var rolle = eingabe.getAttribute("data-upload");
      var datei = eingabe.files[0];
      eingabe.value = "";
      var def = d.medien.filter(function (m) { return m.rolle === rolle; })[0] || { art: "bild", minBreite: 600 };
      var grenze = def.art === "video" ? d.limits.videoBytes : d.limits.bildBytes;
      var schluessel = "medium:" + rolle;
      if (datei.size > grenze) { meldungen[schluessel] = ["fehler", "Datei zu groß (" + Math.round(datei.size / 1048576) + " MB)."]; render(); return; }
      meldungen[schluessel] = ["ok", "Wird geprüft …"];
      render();
      pruefeImBrowser(datei, def.art === "video", def.minBreite).then(function () {
        var f = new FormData();
        f.set("rolle", rolle);
        f.set("revision", String(d.revision));
        f.set("datei", datei, datei.name.replace(/[^\w.-]/g, "_"));
        return holen("/intern/kunde/" + encodeURIComponent(kundeId) + "/medium", { method: "POST", body: f });
      }).then(function (r) {
        antwort(r, schluessel, "Hochgeladen – bitte prüfen und „Übernehmen“ oder „Abbrechen“.");
      }, function (fehler) {
        meldungen[schluessel] = ["fehler", fehler.message];
        render();
      });
    }
    if (e.target.id === "kp-bestellung") aktion({ aktion: "bestellung", aktiv: e.target.checked }, "bestellung", "Gespeichert.");
  });

  wurzel.addEventListener("click", function (e) {
    var k = e.target.closest("button");
    if (!k) return;
    var a = k.dataset;
    if (k.id === "kp-neu-laden") { banner = ""; laden(); return; }
    if (a.speichern) {
      var feldEl = wurzel.querySelector('[data-feld="' + a.speichern + '"]');
      aktion({ aktion: "feld", feld: a.speichern, wert: feldEl.value }, "feld:" + a.speichern, "Als Entwurf gespeichert.");
    } else if (a.leeren) {
      aktion({ aktion: "feld", feld: a.leeren, wert: "" }, "feld:" + a.leeren, "Entfernt – der Vorlagentext gilt wieder.");
    } else if (a.bestaetigen) {
      aktion({ aktion: "feldBestaetigen", feld: a.bestaetigen, bestaetigt: a.wert === "1" }, "feld:" + a.bestaetigen, a.wert === "1" ? "Als vom Kunden bestätigt vermerkt." : "Bestätigung zurückgenommen.");
    } else if (a.medium) {
      aktion({ aktion: "medium", rolle: a.medium, medienAktion: a.was }, "medium:" + a.medium, { uebernehmen: "Übernommen – das bisherige bleibt bis zur Freigabe erhalten.", verwerfen: "Verworfen – das bisherige gilt.", zuruecksetzen: "Zurückgesetzt.", entfernen: "Entfernt.", bestaetigen: "Bestätigt.", unbestaetigt: "Bestätigung zurückgenommen." }[a.was]);
    } else if (a.beschreiben) {
      var alt = wurzel.querySelector('[data-alt="' + a.beschreiben + '"]');
      var fokus = wurzel.querySelector('[data-fokus="' + a.beschreiben + '"]');
      aktion({ aktion: "medium", rolle: a.beschreiben, medienAktion: "beschreiben", alt: alt ? alt.value : undefined, fokus: fokus ? fokus.value : undefined }, "medium:" + a.beschreiben, "Gespeichert.");
    } else if (a.gerichtSpeichern) {
      var z = wurzel.querySelector('[data-gericht="' + a.gerichtSpeichern + '"]');
      var w = function (n) { return z.querySelector('[data-g="' + n + '"]'); };
      aktion({ aktion: "gericht", id: a.gerichtSpeichern, daten: { name: w("name").value, preis: w("preis").value, beschreibung: w("beschreibung").value, allergene: w("allergene").value, varianten: preiszeilen(w("varianten").value), extras: preiszeilen(w("extras").value), verfuegbar: w("verfuegbar").checked, sichtbar: w("sichtbar").checked, vegetarisch: w("vegetarisch").checked } }, "gericht:" + a.gerichtSpeichern, "Gericht gespeichert (Entwurf).");
    } else if (a.gerichtBestaetigen) {
      aktion({ aktion: "gerichtBestaetigen", id: a.gerichtBestaetigen, bestaetigt: a.wert === "1" }, "gericht:" + a.gerichtBestaetigen, "Gespeichert.");
    } else if (a.gerichtEntfernen) {
      if (!confirm("Gericht löschen? Ein Bild dazu bleibt bis zur Freigabe erhalten.")) return;
      aktion({ aktion: "gerichtEntfernen", id: a.gerichtEntfernen }, "bau", "Gericht gelöscht.");
    } else if (a.verschieben) {
      aktion({ aktion: "gerichtVerschieben", id: a.verschieben, richtung: a.richtung }, "gericht:" + a.verschieben, "Verschoben.");
    } else if (a.gerichtNeu) {
      var name = prompt("Name des neuen Gerichts:");
      if (!name) return;
      var preis = prompt("Preis in Euro:");
      if (!preis) return;
      aktion({ aktion: "gerichtNeu", kategorie: a.gerichtNeu, daten: { name: name, preis: preis } }, "kategorie:" + a.gerichtNeu, "Gericht angelegt (Entwurf).");
    } else if (a.kategorieSpeichern) {
      var kk = wurzel.querySelector('[data-kategorie="' + a.kategorieSpeichern + '"] [data-k-name]');
      aktion({ aktion: "kategorie", id: a.kategorieSpeichern, name: kk.value }, "kategorie:" + a.kategorieSpeichern, "Kategorie gespeichert.");
    } else if (a.kategorieEntfernen) {
      aktion({ aktion: "kategorieEntfernen", id: a.kategorieEntfernen }, "bau", "Kategorie gelöscht.");
    } else if (k.id === "kp-kategorie-neu") {
      aktion({ aktion: "kategorieNeu", name: document.getElementById("kp-neue-kategorie").value }, "bau", "Kategorie angelegt.");
    } else if (k.id === "kp-farbschema") {
      var r = wurzel.querySelector('input[name="kp-farbschema"]:checked');
      aktion({ aktion: "farbschema", farbschema: r ? r.value : "" }, "farbschema", "Farbschema gespeichert.");
    } else if (k.id === "kp-zeiten-speichern") {
      var zeilen = function (id) { return document.getElementById(id).value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) { var t = x.split("|"); return { tage: (t[0] || "").trim(), zeiten: t.slice(1).join("|").trim() }; }); };
      aktion({ aktion: "oeffnungszeiten", zeilen: zeilen("kp-zeiten"), ausnahmen: zeilen("kp-ausnahmen") }, "zeiten", "Öffnungszeiten gespeichert (Entwurf).");
    } else if (k.id === "kp-zeiten-bestaetigen") {
      aktion({ aktion: "oeffnungszeitenBestaetigen", bestaetigt: a.wert === "1" }, "zeiten", "Gespeichert.");
    } else if (k.id === "kp-bauen") {
      meldungen.bau = ["ok", "Baut nur diese Kundenwebsite lokal … (öffentlich ändert sich nichts)"];
      render();
      post("/intern/kunde/" + encodeURIComponent(kundeId) + "/bauen", {}).then(function (r) {
        antwort(r, "bau", "Lokal gebaut – Vorschau unten (Desktop und Mobile)." + (r.sync && r.sync.synchronisiert ? " Karte und Öffnungszeiten an Wirt-Betrieb „" + r.sync.betrieb + "“ übergeben." : r.sync ? " " + r.sync.grund : ""));
      });
    } else if (k.id === "kp-freigeben") {
      var von = prompt("Wer hat die Inhalte freigegeben? (Name des Kunden bzw. Ansprechpartners)");
      if (!von) return;
      var notiz = prompt("Notiz (z. B. „per Mail vom …“):", "") || "";
      post("/intern/kunde/" + encodeURIComponent(kundeId) + "/freigeben", { revision: d.revision, von: von, notiz: notiz }).then(function (r) { antwort(r, "bau", "Freigegeben. Veröffentlicht ist damit noch nichts."); });
    }
  });

  laden();
})();
