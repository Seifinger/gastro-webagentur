// „Passt gut dazu“ – die eine Stelle, an der entschieden wird, welche
// Ergänzungen ein Gast im Warenkorb vorgeschlagen bekommt. Dieselbe Funktion
// läuft im Browser (Bestellübersicht, als eigenes <script> eingebettet, siehe
// empfehlungsSkript()) und auf dem Server (Vorschau im Wirt-Dashboard). Es
// gibt keine zweite Empfehlungslogik daneben – und keinen zweiten Warenkorb:
// Hinzugefügt wird über den bestehenden (PAGE_SCRIPT, data-add).
//
// Grundlage sind Produktrollen, keine Gerichtsnamen:
//   vorspeise · salat · beilage   → Platz „ergaenzung“
//   dessert                       → Platz „dessert“
//   getraenk                      → Platz „getraenk“
//   hauptgericht                  → wird nie als Ergänzung vorgeschlagen,
//                                   solange schon ein Hauptgericht im Korb liegt
// Die Rolle kommt (in dieser Reihenfolge) aus der Einstellung des Wirts, aus
// dem optionalen Feld „empfehlungsrolle“ am Gericht, an der Gruppe oder an
// der Kategorie der Karte, sonst aus dem Namen der Gruppe bzw. Kategorie
// („Antipasti“, „Nachspeisen“, „Getränke“ …). Passt ein Kategoriename zu zwei
// verschiedenen Plätzen („Pasta & Dolci“), bleibt die Rolle offen: Solche
// Gerichte werden nur über ausdrückliche Kombinationen des Wirts empfohlen.
//
// Standardregeln (abschaltbar):
//   - Hauptgericht im Korb, noch nichts vom Platz „ergaenzung“ → Vorspeise,
//     Salat oder Beilage
//   - Hauptgericht im Korb, noch kein Dessert → Dessert
//   - noch kein Getränk im Korb → Getränk
// Vorrang haben die Regeln des Wirts: erst passende Kombinationen („Zu Pizza:
// Tiramisù oder kleiner Salat“), dann bevorzugte Produkte, dann die
// Standardregeln. Je Platz höchstens ein Vorschlag, insgesamt höchstens zwei.
//
// Harte Filter, die auch keine Regel des Wirts aufhebt:
//   - nur Produkte der eigenen Karte, die bestellbar sind (nicht ausverkauft,
//     nicht ausgeblendet, Preis über 0 €) – mit Betriebsserver zusätzlich nur,
//     was dessen Karte zum selben Preis führt
//   - nichts, was schon im Korb liegt (außer der Wirt erlaubt „mehrfach“)
//   - kein Hauptgericht, wenn schon eines im Korb liegt (keine zweite Pizza,
//     keine zweite Pasta)
//   - nichts, was der Wirt ausgeschlossen hat
//
// Deterministisch: gleicher Warenkorb, gleiche Karte, gleiche Regeln →
// gleiche Vorschläge. Kein Zufall, keine Rotation, keine Gästehistorie.
// Über Ernährung wird nichts vermutet: Nur wenn alle Speisen im Korb laut
// Karte vegetarisch sind, rücken als vegetarisch gekennzeichnete Vorschläge
// innerhalb ihres Platzes nach vorn – ausgeschlossen wird deshalb nichts,
// behauptet auch nicht.
//
// empfehlungsKern() muss für den Browser in sich geschlossen bleiben: keine
// Importe, keine Bezüge nach außen, kein "</script". Es wird per toString()
// in die Seite geschrieben (wie abholzeitKern in abholzeiten.js).

function empfehlungsKern() {
  var ROLLEN = ["vorspeise", "salat", "beilage", "hauptgericht", "dessert", "getraenk"];
  var ROLLEN_ANZEIGE = {
    vorspeise: "Vorspeise",
    salat: "Salat",
    beilage: "Beilage",
    hauptgericht: "Hauptgericht",
    dessert: "Dessert",
    getraenk: "Getränk"
  };
  var PLATZ = { vorspeise: "ergaenzung", salat: "ergaenzung", beilage: "ergaenzung", dessert: "dessert", getraenk: "getraenk" };
  var PLAETZE = ["ergaenzung", "dessert", "getraenk"];
  var MAX = 2;

  // Wortanfänge nach Normalisierung (klein, ä→ae, ohne Akzente). Längere
  // Stämme dürfen auch mitten im Wort stehen („Blattsalate“, „Heißgetränke“).
  // "=" heißt: nur das ganze Wort („Eis“, aber nicht „Eisbein“; „Bier“, aber
  // nicht „Biergarten“).
  var STICHWORTE = {
    getraenk: ["getraenk", "drink", "=wein", "=weine", "rotwein", "weisswein", "=bier", "=biere", "fassbier", "flaschenbier", "softdrink", "limonade", "=limo", "=saft", "saefte", "schorle", "kaffee", "espresso", "=tee", "cocktail", "spirituose", "aperitif", "aperitivo", "digestif", "wasser", "bevande", "=vini", "birre", "alkoholfrei"],
    dessert: ["dessert", "nachspeise", "nachtisch", "suess", "dolci", "dolce", "kuchen", "torten", "=eis", "eisbecher", "gelato", "sweets", "patisserie"],
    salat: ["salat", "insalat", "salad"],
    beilage: ["beilage", "contorn", "sides"],
    vorspeise: ["vorspeise", "antipast", "mezze", "=meze", "starter", "anfangen", "vorweg", "kleinigkeit", "appetizer", "tapas", "=dim", "suppe", "zuppa"],
    hauptgericht: ["hauptgericht", "hauptspeise", "hauptgang", "pizza", "pizze", "pasta", "nudel", "grill", "=wok", "curry", "sushi", "=maki", "ramen", "=pho", "bowl", "burger", "schnitzel", "braten", "fleisch", "fisch", "tandoor", "biryani", "=ente", "spiess", "doener", "fruehstueck", "secondi", "primi", "=banh", "pinsa", "flammkuchen", "steak", "gyros", "kebab", "spezialitaet", "tagesgericht", "mittagstisch"]
  };
  // Reihenfolge der Prüfung: Innerhalb des Platzes „ergaenzung“ gewinnt die erste.
  var PRUEFREIHENFOLGE = ["getraenk", "dessert", "hauptgericht", "vorspeise", "salat", "beilage"];

  function normiere(text) {
    var t = String(text == null ? "" : text).toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
    if (t.normalize) t = t.normalize("NFD").replace(/[̀-ͯ]/g, "");
    return t;
  }

  function gueltigeRolle(r) {
    return ROLLEN.indexOf(r) !== -1 ? r : null;
  }

  function trifft(woerter, stichwort) {
    var ganz = stichwort.charAt(0) === "=";
    if (ganz) stichwort = stichwort.slice(1);
    for (var i = 0; i < woerter.length; i += 1) {
      var w = woerter[i];
      if (ganz) { if (w === stichwort) return true; continue; }
      if (w.indexOf(stichwort) === 0) return true;
      if (stichwort.length >= 5 && w.indexOf(stichwort) !== -1) return true;
    }
    return false;
  }

  /**
   * Rolle aus einem Kategorie- oder Gruppennamen. null, wenn nichts passt
   * oder der Name zu zwei verschiedenen Plätzen passt („Pasta & Dolci“).
   */
  function rolleAusName(name) {
    var woerter = normiere(name).split(/[^a-z0-9]+/).filter(Boolean);
    if (!woerter.length) return null;
    var gefunden = [];
    for (var i = 0; i < PRUEFREIHENFOLGE.length; i += 1) {
      var rolle = PRUEFREIHENFOLGE[i];
      var liste = STICHWORTE[rolle];
      for (var j = 0; j < liste.length; j += 1) {
        if (trifft(woerter, liste[j])) { gefunden.push(rolle); break; }
      }
    }
    if (!gefunden.length) return null;
    var platz = PLATZ[gefunden[0]] || gefunden[0];
    for (var k = 1; k < gefunden.length; k += 1) {
      if ((PLATZ[gefunden[k]] || gefunden[k]) !== platz) return null;
    }
    // Innerhalb von „ergaenzung“: Vorspeise vor Salat vor Beilage.
    if (platz === "ergaenzung") {
      var ordnung = ["vorspeise", "salat", "beilage"];
      for (var m = 0; m < ordnung.length; m += 1) if (gefunden.indexOf(ordnung[m]) !== -1) return ordnung[m];
    }
    return gefunden[0];
  }

  /** Rolle eines Gerichts ohne Einstellung des Wirts. */
  function erkannteRolle(g) {
    return gueltigeRolle(g && g.empfehlungsrolle) ||
      gueltigeRolle(g && g.gruppenRolle) ||
      gueltigeRolle(g && g.kategorieRolle) ||
      (g && g.gruppe ? rolleAusName(g.gruppe) : null) ||
      rolleAusName(g && g.kategorie);
  }

  // Empfohlen wird nur, was einen echten Preis hat (0 € ist meist ein leeres Preisfeld).
  function preisOk(p) {
    return typeof p === "number" && isFinite(p) && p > 0;
  }

  function cent(p) {
    return Math.round(Number(p) * 100);
  }

  function liste(x) {
    return Array.isArray(x) ? x : [];
  }

  /** Regeln mit Standardwerten: ohne Einstellungen gelten die Standardregeln. */
  function regelnMitStandard(r) {
    r = r || {};
    return {
      aktiv: r.aktiv !== false,
      standard: r.standard !== false,
      ausgeschlossen: liste(r.ausgeschlossen),
      priorisiert: liste(r.priorisiert),
      mehrfach: liste(r.mehrfach),
      rollen: r.rollen && typeof r.rollen === "object" ? r.rollen : {},
      kombinationen: liste(r.kombinationen)
    };
  }

  /**
   * Wählt höchstens zwei Ergänzungen.
   *
   * e.produkte   – [{ id, name, preis, rolle?, kategorie, gruppe?, varianten: [{ id, preis }],
   *                   vegetarisch?, signatur?, empfehlbar? }] in Reihenfolge der Karte; nur
   *                   bestellbare. empfehlbar: false zählt im Korb mit, wird aber nie vorgeschlagen.
   * e.warenkorb  – [{ id, menge }] mit Warenkorb-Kennungen (Gericht oder Variante)
   * e.regeln     – Einstellungen des Wirts (fehlend = Standard)
   * e.bestellbar – optional { id: preis } bzw. { id: [name, preis] }: was der
   *                Betriebsserver annimmt; ohne Angabe gilt die Karte der Seite
   * Ergebnis: [{ id, grund: "kombination"|"bevorzugt"|"standard", platz, varianten: [ids] }]
   */
  function waehle(e) {
    var regeln = regelnMitStandard(e && e.regeln);
    if (!regeln.aktiv) return [];
    var max = Math.min(MAX, Math.max(0, Number(e.max) || MAX));
    var bestellbar = e.bestellbar || null;

    var produkte = liste(e.produkte);
    var nachId = {};
    var zuGericht = {};
    produkte.forEach(function (p) {
      if (!p || typeof p.id !== "string" || nachId[p.id]) return;
      nachId[p.id] = p;
      zuGericht[p.id] = p.id;
      liste(p.varianten).forEach(function (v) { if (v && typeof v.id === "string") zuGericht[v.id] = p.id; });
    });

    function rolle(p) {
      if (Object.prototype.hasOwnProperty.call(regeln.rollen, p.id)) {
        var r = regeln.rollen[p.id];
        return r === "keine" ? null : gueltigeRolle(r) || erkannteRolle(p);
      }
      return gueltigeRolle(p.rolle) || erkannteRolle(p);
    }

    function serverPreis(id) {
      if (!bestellbar) return null;
      var eintrag = bestellbar[id];
      if (eintrag === undefined) return undefined;
      return Array.isArray(eintrag) ? eintrag[1] : eintrag;
    }

    /** Bestellbare Kennungen eines Produkts (Gericht oder seine Varianten). */
    function bestellbareIds(p) {
      var varianten = liste(p.varianten);
      var kandidaten = varianten.length ? varianten : [{ id: p.id, preis: p.preis }];
      return kandidaten.filter(function (v) {
        if (!v || typeof v.id !== "string" || !preisOk(v.preis)) return false;
        if (!bestellbar) return true;
        var s = serverPreis(v.id);
        return s !== undefined && s !== null && cent(s) === cent(v.preis);
      }).map(function (v) { return v.id; });
    }

    // Was liegt im Korb?
    var imKorb = {};
    var reihenfolgeKorb = [];
    liste(e.warenkorb).forEach(function (zeile) {
      if (!zeile || !(Number(zeile.menge) > 0)) return;
      var gid = zuGericht[String(zeile.id)];
      if (!gid || imKorb[gid]) return;
      imKorb[gid] = true;
      reihenfolgeKorb.push(nachId[gid]);
    });
    if (!reihenfolgeKorb.length) return [];

    var rollenImKorb = {};
    var nurVegetarisch = true;
    var speisen = 0;
    reihenfolgeKorb.forEach(function (p) {
      var r = rolle(p);
      if (r) rollenImKorb[r] = (rollenImKorb[r] || []).concat([p.id]);
      if (r !== "getraenk") {
        speisen += 1;
        if (p.vegetarisch !== true) nurVegetarisch = false;
      }
    });
    var vegetarischZuerst = speisen > 0 && nurVegetarisch;
    var hatHaupt = Boolean(rollenImKorb.hauptgericht);

    function belegt(platz, ohne) {
      for (var r in rollenImKorb) {
        if (!Object.prototype.hasOwnProperty.call(rollenImKorb, r)) continue;
        if ((PLATZ[r] || r) !== platz) continue;
        var andere = rollenImKorb[r].filter(function (id) { return id !== ohne; });
        if (andere.length) return true;
      }
      return false;
    }

    /** Offen nach den Standardregeln (für Standard und bevorzugte Produkte). */
    function offen(platz, ohne) {
      if (platz === "getraenk") return !belegt("getraenk", ohne);
      if (platz === "ergaenzung" || platz === "dessert") return hatHaupt && !belegt(platz, ohne);
      return false;
    }

    function zulaessig(p) {
      if (!p || p.empfehlbar === false) return false;
      if (regeln.ausgeschlossen.indexOf(p.id) !== -1) return false;
      if (imKorb[p.id] && regeln.mehrfach.indexOf(p.id) === -1) return false;
      if (rolle(p) === "hauptgericht" && hatHaupt) return false;
      return bestellbareIds(p).length > 0;
    }

    var gewaehlt = [];
    var plaetze = {};
    function nimm(p, grund) {
      if (gewaehlt.length >= max) return;
      for (var i = 0; i < gewaehlt.length; i += 1) if (gewaehlt[i].id === p.id) return;
      var r = rolle(p);
      var platz = r ? PLATZ[r] || r : "eigen:" + p.id;
      if (plaetze[platz]) return;
      plaetze[platz] = true;
      gewaehlt.push({ id: p.id, grund: grund, platz: platz, rolle: r, varianten: bestellbareIds(p) });
    }

    // 1. Kombinationen des Wirts: Auslöser im Korb → genannte Produkte, in
    //    genannter Reihenfolge; ein ausverkauftes fällt still auf das nächste.
    regeln.kombinationen.forEach(function (k) {
      if (!k || typeof k.zu !== "string") return;
      var ausgeloest = reihenfolgeKorb.some(function (p) {
        if (k.zu.indexOf("kat:") === 0) return p.kategorie === k.zu.slice(4);
        if (k.zu.indexOf("rolle:") === 0) return rolle(p) === k.zu.slice(6);
        return p.id === k.zu;
      });
      if (!ausgeloest) return;
      liste(k.produkte).forEach(function (id) {
        var p = nachId[id];
        if (!zulaessig(p)) return;
        var r = rolle(p);
        // Liegt vom selben Platz schon etwas im Korb, ist die Ergänzung erledigt.
        if (r && PLATZ[r] && belegt(PLATZ[r], p.id)) return;
        nimm(p, "kombination");
      });
    });

    // 2. Bevorzugte Produkte – wenn ihr Platz nach den Standardregeln offen ist.
    regeln.priorisiert.forEach(function (id) {
      var p = nachId[id];
      if (!zulaessig(p)) return;
      var r = rolle(p);
      if (!r || !PLATZ[r] || !offen(PLATZ[r], p.id)) return;
      nimm(p, "bevorzugt");
    });

    // 3. Standardregeln: je offenem Platz das erste passende Produkt der Karte.
    if (regeln.standard) {
      PLAETZE.forEach(function (platz) {
        if (plaetze[platz] || gewaehlt.length >= max) return;
        var passend = produkte.filter(function (p) {
          if (!nachId[p.id] || nachId[p.id] !== p) return false;
          var r = rolle(p);
          return r && PLATZ[r] === platz && offen(platz, p.id) && zulaessig(p);
        });
        passend = passend.map(function (p, i) { return { p: p, i: i }; });
        passend.sort(function (a, b) {
          if (vegetarischZuerst) {
            var va = a.p.vegetarisch === true ? 0 : 1;
            var vb = b.p.vegetarisch === true ? 0 : 1;
            if (va !== vb) return va - vb;
          }
          var sa = a.p.signatur === true ? 0 : 1;
          var sb = b.p.signatur === true ? 0 : 1;
          if (sa !== sb) return sa - sb;
          return a.i - b.i;
        });
        if (passend.length) nimm(passend[0].p, "standard");
      });
    }

    return gewaehlt;
  }

  return {
    ROLLEN: ROLLEN,
    ROLLEN_ANZEIGE: ROLLEN_ANZEIGE,
    PLATZ: PLATZ,
    MAX: MAX,
    normiere: normiere,
    rolleAusName: rolleAusName,
    erkannteRolle: erkannteRolle,
    regelnMitStandard: regelnMitStandard,
    waehle: waehle
  };
}

export const Empfehlungen = empfehlungsKern();
export const { ROLLEN, ROLLEN_ANZEIGE, rolleAusName, erkannteRolle, regelnMitStandard, waehle } = Empfehlungen;

/** Der Kern als Skript für die Seite: window.Empfehlungen. */
export function empfehlungsKernSkript() {
  return `window.Empfehlungen = (${empfehlungsKern.toString()})();`;
}

/**
 * Aus einer aufbereiteten Karte (v2/build/speisekarte.js, karteAusDaten) die
 * Produktliste für Empfehlungen: nur, was der Warenkorb-Katalog als bestellbar
 * führt, in Reihenfolge der Karte, mit erkannter Rolle.
 *
 * @param {{ gerichte: object[], katalog: Record<string, [string, number]> }} karte
 * @param {object} [o]
 * @param {boolean} [o.nurBestaetigt] - Kundenfassung: nur vom Kunden bestätigte Gerichte empfehlen
 * @param {(g: object) => {src: string, alt?: string}|null} [o.bild] - zulässiges Bild je Gericht
 */
export function empfehlungsProdukte(karte, { nurBestaetigt = false, bild = () => null } = {}) {
  const katalog = karte?.katalog ?? {};
  const produkte = [];
  for (const g of karte?.gerichte ?? []) {
    if (g.ausverkauft) continue;
    const varianten = (g.varianten ?? []).filter((v) => !v.ausverkauft && katalog[v.id]).map((v) => ({ id: v.id, name: v.name, preis: katalog[v.id][1] }));
    if ((g.varianten ?? []).length && !varianten.length) continue;
    if (!(g.varianten ?? []).length && !katalog[g.schluessel]) continue;
    const produkt = {
      id: g.schluessel,
      name: g.name,
      beschreibung: kurz(g.beschreibung),
      preis: varianten.length ? Math.min(...varianten.map((v) => v.preis)) : katalog[g.schluessel][1],
      kategorie: g.kategorie,
      ...(g.gruppe ? { gruppe: g.gruppe } : {}),
      rolle: erkannteRolle(g),
      varianten,
      ...(g.vegetarisch === true ? { vegetarisch: true } : {}),
      ...(g.signatur === true ? { signatur: true } : {}),
      // Kundenfassung: Unbestätigtes zählt im Warenkorb mit, wird aber nie empfohlen.
      ...(nurBestaetigt && g.bestaetigt !== true ? { empfehlbar: false } : {}),
    };
    const b = produkt.empfehlbar === false ? null : bild(g);
    if (b?.src) produkt.bild = { src: b.src, alt: b.alt || g.name };
    produkte.push(produkt);
  }
  return produkte;
}

/** Kurze vorhandene Beschreibung: höchstens rund 90 Zeichen, an einer Wortgrenze. */
export function kurz(text, max = 90) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const schnitt = t.slice(0, max);
  const leer = schnitt.lastIndexOf(" ");
  return `${(leer > max * 0.6 ? schnitt.slice(0, leer) : schnitt).replace(/[\s,.;:–-]+$/, "")} …`;
}

/**
 * Prüft und bereinigt Einstellungen aus dem Wirt-Dashboard gegen die
 * Produkte der hinterlegten Bestellkarte. Unbekannte Produkte werden
 * abgelehnt – eine Regel kann nie ein Gericht erzwingen, das es nicht gibt.
 */
export function pruefeEmpfehlungsRegeln(eingabe, produkte = []) {
  const ids = new Set(produkte.map((p) => p.id));
  const kategorien = new Set(produkte.map((p) => p.kategorie));
  const nachId = Object.fromEntries(produkte.map((p) => [p.id, p]));
  const pruefeIds = (werte, was) => {
    if (werte === undefined) return [];
    if (!Array.isArray(werte) || werte.length > 200) throw new Error(`${was}: ungültige Liste.`);
    const sauber = [...new Set(werte.map((w) => String(w)))];
    const fremd = sauber.filter((id) => !ids.has(id));
    if (fremd.length) throw new Error(`${was}: Produkt „${fremd[0]}“ steht nicht auf Ihrer Karte.`);
    return sauber;
  };
  const rollen = {};
  if (eingabe.rollen !== undefined) {
    if (!eingabe.rollen || typeof eingabe.rollen !== "object" || Array.isArray(eingabe.rollen)) throw new Error("Rollen: ungültige Angabe.");
    for (const [id, rolle] of Object.entries(eingabe.rollen)) {
      if (!ids.has(id)) throw new Error(`Rolle: Produkt „${id}“ steht nicht auf Ihrer Karte.`);
      if (rolle === "" || rolle === null || rolle === "auto") continue;
      if (rolle !== "keine" && !ROLLEN.includes(rolle)) throw new Error(`Rolle „${rolle}“ gibt es nicht.`);
      rollen[id] = rolle;
    }
  }
  const rolleVon = (id) => {
    if (!nachId[id]) return null;
    const r = rollen[id];
    return r === "keine" ? null : ROLLEN.includes(r) ? r : erkannteRolle(nachId[id]);
  };
  const kombinationen = [];
  if (eingabe.kombinationen !== undefined) {
    if (!Array.isArray(eingabe.kombinationen) || eingabe.kombinationen.length > 30) throw new Error("Höchstens 30 Kombinationen.");
    for (const k of eingabe.kombinationen) {
      const zu = String(k?.zu ?? "");
      if (zu.startsWith("kat:")) {
        if (!kategorien.has(zu.slice(4))) throw new Error(`Kombination: Kategorie „${zu.slice(4)}“ steht nicht auf Ihrer Karte.`);
      } else if (zu.startsWith("rolle:")) {
        if (!ROLLEN.includes(zu.slice(6))) throw new Error(`Kombination: Rolle „${zu.slice(6)}“ gibt es nicht.`);
      } else if (!ids.has(zu)) {
        throw new Error("Kombination: Bitte wählen Sie, wozu die Empfehlung gelten soll.");
      }
      const liste = pruefeIds(k?.produkte ?? [], "Kombination");
      if (!liste.length) throw new Error("Kombination: Bitte mindestens ein Produkt wählen.");
      if (liste.length > 3) throw new Error("Kombination: höchstens drei Produkte je Kombination.");
      // Zu einem Hauptgericht nie ein zweites Hauptgericht – auch nicht von Hand.
      const ausloeserHaupt = zu.startsWith("rolle:") ? zu.slice(6) === "hauptgericht"
        : zu.startsWith("kat:") ? produkte.some((p) => p.kategorie === zu.slice(4) && rolleVon(p.id) === "hauptgericht")
        : rolleVon(zu) === "hauptgericht";
      const zweites = liste.find((id) => ausloeserHaupt && rolleVon(id) === "hauptgericht");
      if (zweites) throw new Error(`Kombination: „${nachId[zweites].name}“ ist ein Hauptgericht – zu einem Hauptgericht wird kein zweites empfohlen.`);
      kombinationen.push({ zu, produkte: liste });
    }
  }
  const ausgeschlossen = pruefeIds(eingabe.ausgeschlossen, "Ausschluss");
  const priorisiert = pruefeIds(eingabe.priorisiert, "Bevorzugt").filter((id) => !ausgeschlossen.includes(id));
  return {
    aktiv: eingabe.aktiv !== false,
    standard: eingabe.standard !== false,
    ausgeschlossen,
    priorisiert,
    mehrfach: pruefeIds(eingabe.mehrfach, "Mehrfach"),
    rollen,
    kombinationen,
  };
}
