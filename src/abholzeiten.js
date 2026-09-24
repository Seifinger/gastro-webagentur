// Abholzeiten – die eine Stelle, an der gerechnet wird, wann ein Gast sein
// Essen abholen kann. Dieselbe Funktion läuft im Browser (Bestellformular,
// als eigenes <script> vor PAGE_SCRIPT eingebettet, siehe abholzeitSkript())
// und auf dem Server (betriebStore.legeBestellungAn prüft jede Bestellung
// erneut). Es gibt keine zweite Zeitlogik daneben.
//
// Regeln:
//   Start          = max(jetzt, Beginn des nächsten gültigen Öffnungsintervalls)
//   So schnell wie möglich (ASAP)
//                  = Start + 20 Min. + Zusatz-Wartezeit des Wirts,
//                    nicht aufs Raster gerundet, nur auf die volle Minute
//                    (aufgerundet – nie früher versprechen, als es ist)
//   Geplante Zeiten = Start + 25 Min. + Zusatz, aufgerundet auf das
//                    5-Minuten-Raster der Uhr, dann alle 5 Minuten
//   Jede Abholzeit liegt im Öffnungsintervall: frühestens bei Öffnung,
//   spätestens 5 Minuten vor der Schließzeit (zur Schließzeit ist zu).
//   Angeboten wird nur der laufende Öffnungstag: Intervalle, die gerade
//   laufen (auch über Mitternacht hinweg) oder heute noch beginnen. Ist
//   heute nichts mehr möglich, gibt es keine Zeit, nur den Hinweis auf die
//   nächste Öffnung – Abholung ist immer am selben Tag.
//
// Die Zusatz-Wartezeit (betriebStore.setzeWartezeit, "Wartezeit" im
// Wirt-Dashboard) wirkt additiv: effektiver Vorlauf = 20 + Zusatz (ASAP)
// bzw. 25 + Zusatz (geplante Zeiten). So war sie immer gemeint (siehe
// setzeWartezeit und wartezeitLernStore.js).
//
// Gerechnet wird mit vollen Zeitpunkten (Millisekunden seit 1970) in der
// Zeitzone des Restaurants (Standard Europe/Berlin) – nie in UTC-Uhrzeiten
// oder der Zeitzone des Browsers. Die Umrechnung Wanduhr ↔ Zeitpunkt macht
// Intl.DateTimeFormat, dadurch stimmen Sommer-/Winterzeit und Tageswechsel.
//
// abholzeitKern() muss für den Browser in sich geschlossen bleiben: keine
// Importe, keine Bezüge nach außen, kein "</script". Es wird per toString()
// in die Seite geschrieben.

function abholzeitKern() {
  var MINUTE = 60000;
  var ASAP_VORLAUF_MINUTEN = 20;
  var PLAN_VORLAUF_MINUTEN = 25;
  var RASTER_MINUTEN = 5;
  // Spielraum für die Prüfung auf dem Server: Zwischen der letzten
  // Berechnung im Browser und dem Eingang der Bestellung vergehen Sekunden.
  var TOLERANZ_MINUTEN = 2;
  // Eine als "so schnell wie möglich" geschickte Zeit darf nicht beliebig
  // spät liegen – sonst ist sie keine ASAP-Zeit mehr.
  var ASAP_SPIELRAUM_MINUTEN = 10;
  // Sicherheitsgrenze für durchgehend geöffnete Betriebe (verbundene Intervalle).
  var HORIZONT_MINUTEN = 36 * 60;
  var ZEITZONE_STANDARD = "Europe/Berlin";

  // Index = Date#getUTCDay(): 0 = Sonntag.
  var TAGE = ["sonntag", "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag"];
  var TAGE_KURZ = ["so", "mo", "di", "mi", "do", "fr", "sa"];
  var TAGE_ANZEIGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

  function zweistellig(n) { return (n < 10 ? "0" : "") + n; }

  function tagIndex(wort) {
    var w = wort.replace(/\./g, "");
    for (var i = 0; i < 7; i += 1) {
      if (w === TAGE[i] || w === TAGE_KURZ[i]) return i;
    }
    return -1;
  }

  /** "Montag – Donnerstag", "Sa & So", "Fr, Sa" → Liste von Wochentag-Indizes. */
  function tageAus(text) {
    var tage = [];
    var teile = String(text || "").toLowerCase().split(/,|&|\/|\bund\b/);
    teile.forEach(function (teil) {
      var bereich = teil.split(/\s*(?:–|—|-|\bbis\b)\s*/);
      var von = tagIndex(bereich[0].trim().split(/\s+/)[0] || "");
      var bis = bereich.length > 1 ? tagIndex(bereich[1].trim().split(/\s+/)[0] || "") : -1;
      if (von === -1) return;
      if (bis === -1) { tage.push(von); return; }
      // Montag = 1 … Sonntag = 0: Bereiche dürfen über das Wochenende laufen.
      for (var i = von; ; i = (i + 1) % 7) {
        tage.push(i);
        if (i === bis) break;
      }
    });
    return tage;
  }

  /** "12:00 – 15:00 & 18:00 – 01:00" → [[720, 900], [1080, 1500]] (Minuten ab Mitternacht des Tages). */
  function intervalleAus(text) {
    var liste = [];
    var muster = /(\d{1,2})[:.](\d{2})\s*(?:uhr\s*)?(?:–|—|-|bis)\s*(\d{1,2})[:.](\d{2})/gi;
    var treffer;
    while ((treffer = muster.exec(String(text || "")))) {
      var start = Number(treffer[1]) * 60 + Number(treffer[2]);
      var ende = Number(treffer[3]) * 60 + Number(treffer[4]);
      if (start >= 1440 || ende > 1440) continue;
      // Über Mitternacht: Ende liegt am Folgetag.
      if (ende <= start) ende += 1440;
      liste.push([start, ende]);
    }
    return liste;
  }

  /**
   * Wochenplan aus den Anzeigezeilen der Seite ({ tage, zeiten }) – dieselben
   * Zeilen, die die Seite als Öffnungszeiten zeigt. Feiertage kennt die
   * Rechnung nicht; sie zählen wie der Wochentag. null, wenn sich nichts lesen lässt.
   */
  function wochenplan(zeilen) {
    if (!Array.isArray(zeilen)) return null;
    var plan = [[], [], [], [], [], [], []];
    var gefunden = false;
    zeilen.forEach(function (zeile) {
      if (!zeile) return;
      var intervalle = intervalleAus(zeile.zeiten);
      tageAus(zeile.tage).forEach(function (tag) {
        intervalle.forEach(function (iv) { plan[tag].push(iv); gefunden = true; });
      });
    });
    return gefunden ? plan : null;
  }

  var formatierer = {};
  function wandzeit(ms, zeitzone) {
    var f = formatierer[zeitzone];
    if (!f) {
      f = new Intl.DateTimeFormat("en-US", {
        timeZone: zeitzone, hourCycle: "h23",
        year: "numeric", month: "numeric", day: "numeric",
        hour: "numeric", minute: "numeric", second: "numeric",
      });
      formatierer[zeitzone] = f;
    }
    var w = {};
    f.formatToParts(new Date(ms)).forEach(function (p) { w[p.type] = p.value; });
    var stunde = Number(w.hour) % 24;
    return {
      jahr: Number(w.year), monat: Number(w.month), tag: Number(w.day),
      stunde: stunde, minute: Number(w.minute), sekunde: Number(w.second),
      wochentag: new Date(Date.UTC(Number(w.year), Number(w.month) - 1, Number(w.day))).getUTCDay(),
    };
  }

  /** Abstand der Wanduhr zu UTC in Millisekunden zum Zeitpunkt ms. */
  function versatz(ms, zeitzone) {
    var sekunden = Math.floor(ms / 1000) * 1000;
    var w = wandzeit(sekunden, zeitzone);
    return Date.UTC(w.jahr, w.monat - 1, w.tag, w.stunde, w.minute, w.sekunde) - sekunden;
  }

  /** Zeitpunkt für ein Wanduhr-Datum plus Minuten (auch ≥ 1440 = Folgetag). */
  function zeitpunkt(jahr, monat, tag, minuten, zeitzone) {
    var geschaetzt = Date.UTC(jahr, monat - 1, tag, 0, minuten);
    var v1 = versatz(geschaetzt, zeitzone);
    var ergebnis = geschaetzt - v1;
    var v2 = versatz(ergebnis, zeitzone);
    return v2 === v1 ? ergebnis : geschaetzt - v2;
  }

  function uhrzeit(ms, zeitzone) {
    var w = wandzeit(ms, zeitzone);
    return zweistellig(w.stunde) + ":" + zweistellig(w.minute);
  }

  function datum(ms, zeitzone) {
    var w = wandzeit(ms, zeitzone);
    return w.jahr + "-" + zweistellig(w.monat) + "-" + zweistellig(w.tag);
  }

  /** "heute, 17:30 Uhr" / "morgen, 11:30 Uhr" / "Montag, 11:30 Uhr". */
  function beschreibe(ms, jetzt, zeitzone) {
    var heute = wandzeit(jetzt, zeitzone);
    var dann = wandzeit(ms, zeitzone);
    var tage = Math.round((Date.UTC(dann.jahr, dann.monat - 1, dann.tag) - Date.UTC(heute.jahr, heute.monat - 1, heute.tag)) / 86400000);
    var tag = tage === 0 ? "heute" : tage === 1 ? "morgen" : TAGE_ANZEIGE[dann.wochentag];
    return tag + ", " + uhrzeit(ms, zeitzone) + " Uhr";
  }

  /**
   * Öffnungsintervalle als Zeitpunkte, von gestern (läuft evtl. noch über
   * Mitternacht) bis eine Woche voraus. Aneinanderstoßende Intervalle
   * werden verbunden. tag: Tag des Beginns relativ zu heute (−1, 0, 1 …).
   */
  function intervalle(plan, jetzt, zeitzone) {
    var heute = wandzeit(jetzt, zeitzone);
    var liste = [];
    for (var d = -1; d <= 7; d += 1) {
      var t = new Date(Date.UTC(heute.jahr, heute.monat - 1, heute.tag + d));
      var j = t.getUTCFullYear();
      var m = t.getUTCMonth() + 1;
      var tg = t.getUTCDate();
      plan[t.getUTCDay()].forEach(function (iv) {
        var start = zeitpunkt(j, m, tg, iv[0], zeitzone);
        var ende = zeitpunkt(j, m, tg, iv[1], zeitzone);
        if (ende > start) liste.push({ start: start, ende: ende, tag: d });
      });
    }
    liste.sort(function (a, b) { return a.start - b.start; });
    var verbunden = [];
    liste.forEach(function (iv) {
      var letztes = verbunden[verbunden.length - 1];
      if (letztes && iv.start <= letztes.ende) letztes.ende = Math.max(letztes.ende, iv.ende);
      else verbunden.push({ start: iv.start, ende: iv.ende, tag: iv.tag });
    });
    return verbunden;
  }

  function aufrunden(ms, schritt) { return Math.ceil(ms / schritt) * schritt; }

  function eintrag(ms, art, iv, zeitzone) {
    return {
      art: art,
      zeitpunkt: ms,
      iso: new Date(ms).toISOString(),
      uhrzeit: uhrzeit(ms, zeitzone),
      datum: datum(ms, zeitzone),
      intervall: { start: iv.start, ende: iv.ende, von: uhrzeit(iv.start, zeitzone), bis: uhrzeit(iv.ende, zeitzone) },
    };
  }

  function einstellungen(e) {
    var zeitzone = (e && e.zeitzone) || ZEITZONE_STANDARD;
    var zusatz = Math.max(0, Math.round(Number(e && e.zusatzMinuten) || 0));
    var jetzt = e && e.jetzt !== undefined ? Number(new Date(e.jetzt).getTime()) : Date.now();
    // Ohne Öffnungszeiten keine Abholzeiten – erfunden wird nichts.
    return { zeitzone: zeitzone, zusatz: zusatz, jetzt: jetzt, plan: wochenplan(e && e.oeffnungszeiten) };
  }

  /**
   * Alle heute noch möglichen Abholzeiten.
   *
   * @param {object} e
   * @param {Date|number|string} [e.jetzt] - Zeitpunkt der Berechnung (Standard: jetzt).
   * @param {Array<{tage: string, zeiten: string}>} e.oeffnungszeiten - Anzeigezeilen der Öffnungszeiten (ohne: keine Zeiten).
   * @param {string} [e.zeitzone] - Zeitzone des Restaurants (Standard Europe/Berlin).
   * @param {number} [e.zusatzMinuten] - Zusatz-Wartezeit des Wirts, additiv.
   * @returns {{ asap: object|null, slots: object[], naechsteOeffnung: object|null, geoeffnet: boolean, zusatzMinuten: number, zeitzone: string }}
   */
  function berechne(e) {
    var s = einstellungen(e);
    var ergebnis = { asap: null, slots: [], naechsteOeffnung: null, geoeffnet: false, ohneOeffnungszeiten: !s.plan, zusatzMinuten: s.zusatz, zeitzone: s.zeitzone, jetzt: s.jetzt };
    if (!s.plan) return ergebnis;

    var asapVorlauf = (ASAP_VORLAUF_MINUTEN + s.zusatz) * MINUTE;
    var planVorlauf = (PLAN_VORLAUF_MINUTEN + s.zusatz) * MINUTE;
    var schritt = RASTER_MINUTEN * MINUTE;
    var horizont = s.jetzt + HORIZONT_MINUTEN * MINUTE;
    var alle = intervalle(s.plan, s.jetzt, s.zeitzone);

    alle.forEach(function (iv) {
      if (iv.start <= s.jetzt && s.jetzt < iv.ende) ergebnis.geoeffnet = true;
      // Nur der laufende Öffnungstag: was gerade läuft oder heute beginnt.
      if (iv.ende <= s.jetzt || iv.tag > 0) return;
      var start = Math.max(s.jetzt, iv.start);

      var asap = aufrunden(start + asapVorlauf, MINUTE);
      if (!ergebnis.asap && asap < iv.ende) ergebnis.asap = eintrag(asap, "asap", iv, s.zeitzone);

      for (var t = aufrunden(start + planVorlauf, schritt); t < iv.ende && t <= horizont; t += schritt) {
        ergebnis.slots.push(eintrag(t, "geplant", iv, s.zeitzone));
      }
    });

    if (!ergebnis.asap) {
      for (var i = 0; i < alle.length; i += 1) {
        var iv = alle[i];
        if (iv.tag <= 0 && iv.start <= s.jetzt) continue;
        if (iv.start > s.jetzt && iv.start + asapVorlauf < iv.ende) {
          ergebnis.naechsteOeffnung = {
            zeitpunkt: iv.start,
            iso: new Date(iv.start).toISOString(),
            uhrzeit: uhrzeit(iv.start, s.zeitzone),
            text: beschreibe(iv.start, s.jetzt, s.zeitzone),
          };
          break;
        }
      }
    }
    return ergebnis;
  }

  /** Das Vorkommen von "HH:MM" (Wanduhr), das dem Referenzzeitpunkt am nächsten liegt. */
  function zeitpunktFuerUhrzeit(referenz, hhmm, zeitzone) {
    var treffer = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || "").trim());
    if (!treffer) return null;
    var minuten = Number(treffer[1]) * 60 + Number(treffer[2]);
    if (minuten >= 1440 || Number(treffer[2]) >= 60) return null;
    var zz = zeitzone || ZEITZONE_STANDARD;
    var ref = Number(new Date(referenz).getTime());
    var w = wandzeit(ref, zz);
    var bester = null;
    for (var d = -1; d <= 1; d += 1) {
      var kandidat = zeitpunkt(w.jahr, w.monat, w.tag + d, minuten, zz);
      if (bester === null || Math.abs(kandidat - ref) < Math.abs(bester - ref)) bester = kandidat;
    }
    return bester;
  }

  function keineMehr(r) {
    return "Heute nehmen wir keine Abholbestellungen mehr an." +
      (r.naechsteOeffnung ? " Nächste Öffnung: " + r.naechsteOeffnung.text + "." : "");
  }

  /**
   * Prüft eine eingegangene Abholzeit gegen dieselben Regeln wie die Anzeige.
   * Nichts wird still umgebucht: Passt die Zeit nicht (mehr), gibt es einen
   * Fehler mit der frühesten möglichen Zeit.
   *
   * @param {object} e - wie berechne(), dazu:
   * @param {"asap"|"geplant"} [e.art]
   * @param {string|number} [e.zeitpunkt] - ISO-Zeitpunkt der gewählten Option.
   * @param {string} [e.abholzeit] - Nur "HH:MM" (ältere Seiten): gilt als geplante Zeit am nächstliegenden Tag.
   * @returns {{ ok: true, art: string, zeitpunkt: number, iso: string, uhrzeit: string } | { ok: false, fehler: string }}
   */
  function pruefe(e) {
    var s = einstellungen(e);
    var toleranz = TOLERANZ_MINUTEN * MINUTE;
    var streng = berechne({ jetzt: s.jetzt, oeffnungszeiten: e.oeffnungszeiten, zeitzone: s.zeitzone, zusatzMinuten: s.zusatz });
    var milde = berechne({ jetzt: s.jetzt - toleranz, oeffnungszeiten: e.oeffnungszeiten, zeitzone: s.zeitzone, zusatzMinuten: s.zusatz });

    var art = e.art;
    var t = NaN;
    if (!art && /^\d{1,2}:\d{2}$/.test(String(e.abholzeit || "").trim())) {
      art = "geplant";
      t = zeitpunktFuerUhrzeit(s.jetzt, e.abholzeit, s.zeitzone);
    } else if (e.zeitpunkt !== undefined && e.zeitpunkt !== null && e.zeitpunkt !== "") {
      t = new Date(e.zeitpunkt).getTime();
    }
    if (art !== "asap" && art !== "geplant") return { ok: false, fehler: "Bitte wählen Sie eine Abholzeit aus der Liste." };
    if (!isFinite(t)) return { ok: false, fehler: "Bitte wählen Sie eine Abholzeit aus der Liste." };

    function ok() {
      return { ok: true, art: art, zeitpunkt: t, iso: new Date(t).toISOString(), uhrzeit: uhrzeit(t, s.zeitzone), datum: datum(t, s.zeitzone) };
    }
    function frueheste() {
      if (!streng.asap) return " " + keineMehr(streng);
      var f = art === "asap" ? streng.asap : streng.slots[0];
      if (!f) return " Heute ist nur noch „so schnell wie möglich“ möglich (ca. " + streng.asap.uhrzeit + " Uhr).";
      return " Frühestens möglich: " + f.uhrzeit + " Uhr. Bitte wählen Sie die Abholzeit neu.";
    }

    if (streng.ohneOeffnungszeiten) return { ok: false, fehler: "F\u00FCr diesen Betrieb sind keine \u00D6ffnungszeiten hinterlegt \u2013 bitte bestellen Sie telefonisch." };
    if (!streng.asap && !milde.asap) return { ok: false, fehler: keineMehr(streng) };

    if (art === "asap") {
      var kandidaten = [streng.asap, milde.asap].filter(Boolean);
      var passend = kandidaten.some(function (a) {
        return t >= a.zeitpunkt && t <= a.zeitpunkt + toleranz + ASAP_SPIELRAUM_MINUTEN * MINUTE && t < a.intervall.ende;
      });
      if (passend) return ok();
      var zuFrueh = kandidaten.every(function (a) { return t < a.zeitpunkt; });
      return { ok: false, fehler: (zuFrueh ? "Die Abholzeit " + uhrzeit(t, s.zeitzone) + " Uhr ist nicht mehr zu schaffen." : "Diese Abholzeit passt nicht zu „so schnell wie möglich“.") + frueheste() };
    }

    var angeboten = streng.slots.concat(milde.slots).some(function (slot) { return slot.zeitpunkt === t; });
    if (angeboten) return ok();
    var imRaster = t % (RASTER_MINUTEN * MINUTE) === 0;
    var ersteZeit = streng.slots[0];
    if (imRaster && ersteZeit && t < ersteZeit.zeitpunkt && t > s.jetzt - HORIZONT_MINUTEN * MINUTE) {
      return { ok: false, fehler: "Die Abholzeit " + uhrzeit(t, s.zeitzone) + " Uhr ist nicht mehr möglich." + frueheste() };
    }
    return { ok: false, fehler: "Um " + uhrzeit(t, s.zeitzone) + " Uhr bieten wir keine Abholung an." + frueheste() };
  }

  return {
    ASAP_VORLAUF_MINUTEN: ASAP_VORLAUF_MINUTEN,
    PLAN_VORLAUF_MINUTEN: PLAN_VORLAUF_MINUTEN,
    RASTER_MINUTEN: RASTER_MINUTEN,
    TOLERANZ_MINUTEN: TOLERANZ_MINUTEN,
    ZEITZONE_STANDARD: ZEITZONE_STANDARD,
    wochenplan: wochenplan,
    berechne: berechne,
    pruefe: pruefe,
    zeitpunktFuerUhrzeit: zeitpunktFuerUhrzeit,
    uhrzeit: uhrzeit,
    datum: datum,
    beschreibe: beschreibe,
  };
}

const kern = abholzeitKern();

export const {
  ASAP_VORLAUF_MINUTEN,
  PLAN_VORLAUF_MINUTEN,
  RASTER_MINUTEN,
  TOLERANZ_MINUTEN,
  ZEITZONE_STANDARD,
} = kern;

// Auf der Seite als Platzhalter gekennzeichnet (landingPageGenerator.js,
// DEFAULT_OPENING_HOURS) – und zugleich die Zeiten, mit denen gerechnet
// wird, solange ein Betrieb keine eigenen hinterlegt hat.
export const STANDARD_OEFFNUNGSZEITEN = [
  { tage: "Montag – Donnerstag", zeiten: "11:30 – 14:00 & 17:00 – 22:00" },
  { tage: "Freitag – Samstag", zeiten: "11:30 – 14:00 & 17:00 – 23:00" },
  { tage: "Sonntag & Feiertage", zeiten: "11:30 – 21:00" },
];

export const wochenplanAus = kern.wochenplan;
export const berechneAbholzeiten = kern.berechne;
export const pruefeAbholwunsch = kern.pruefe;
export const zeitpunktFuerUhrzeit = kern.zeitpunktFuerUhrzeit;
export const uhrzeitIn = kern.uhrzeit;

/** Derselbe Kern für den Browser: setzt window.Abholzeiten. */
export function abholzeitSkript() {
  return `window.Abholzeiten = (${abholzeitKern.toString()})();`;
}

/**
 * Attribute für das Abholzeit-Feld: mit welchen Öffnungszeiten und in
 * welcher Zeitzone die Seite rechnet, solange der Betrieb (live) keine
 * eigenen liefert. Es sind dieselben Zeilen, die die Seite anzeigt. Ohne
 * bekannte Öffnungszeiten fehlt das Attribut – die Seite bietet dann keine
 * Zeiten an, statt welche zu erfinden.
 */
export function abholzeitAttribute({ oeffnungszeiten, zeitzone } = {}, escapeHtml) {
  const zeilen = Array.isArray(oeffnungszeiten) ? oeffnungszeiten.map((z) => ({ tage: z.tage, zeiten: z.zeiten })) : null;
  return `${zeilen ? ` data-oeffnungszeiten="${escapeHtml(JSON.stringify(zeilen))}"` : ""} data-zeitzone="${escapeHtml(zeitzone || ZEITZONE_STANDARD)}"`;
}
