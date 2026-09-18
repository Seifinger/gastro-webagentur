// Bewegung unterhalb des Heros.
//
// Drei Regeln, an denen sich hier alles messen lassen muss:
//
// 1. Nichts springt. Jede Animation bewegt nur "transform" und "opacity" –
//    also das, was der Browser ohne neues Layout zeichnen kann. Sonst ruckelt
//    es auf genau den Handys, auf denen die Gäste die Seite öffnen.
// 2. Nichts versteckt Inhalt. Ohne JavaScript ist jede Sektion sichtbar; die
//    Startwerte gelten erst, wenn das Skript die Klasse gesetzt hat.
// 3. Wer Bewegung abgestellt hat, bekommt keine. "prefers-reduced-motion" ist
//    kein Sonderfall, sondern eine Ansage.

// Die Hero-Fahrt und die Verbindungslinien hängen an keiner .bewegt-Klasse,
// sondern laufen unabhängig davon. Diese Regeln braucht es deshalb unter
// beiden Auslösern (siehe unten) – der echten Media Query für Besucher mit
// Systemeinstellung und der Klasse .bewegung-aus für die Verkaufsdemo
// (?bewegung=aus).
const MOTION_REDUZIERT_REGELN = `
  .hero-media img { animation: none; }
  .step:not(:last-child)::after,
  .section-head .eyebrow::after { transform: scaleX(1); transition: none; }
`;

export const MOTION_CSS = `
/* --- Einblenden beim Scrollen ------------------------------------------ */
/* Die Startwerte hängen an .bewegt, das erst das Skript setzt. Bleibt das
   Skript aus, steht alles ganz normal da. */
.bewegt .auftritt { opacity: 0; transform: translateY(22px);
                    transition: opacity .62s cubic-bezier(.22,.61,.36,1),
                                transform .62s cubic-bezier(.22,.61,.36,1);
                    transition-delay: calc(var(--takt, 0) * 90ms); }
.bewegt .auftritt.da { opacity: 1; transform: none; }

/* Karten kommen eine Spur tiefer und leicht aus der Skalierung – dadurch
   wirken sie wie hingelegt, nicht wie eingeblendet. */
.bewegt .auftritt-karte { opacity: 0; transform: translateY(30px) scale(.985);
                          transition: opacity .6s ease, transform .6s cubic-bezier(.22,.61,.36,1);
                          transition-delay: calc(var(--takt, 0) * 85ms); }
.bewegt .auftritt-karte.da { opacity: 1; transform: none; }

/* --- Hero: langsame Fahrt ins Bild ------------------------------------- */
/* 26 Sekunden für 6 % Zoom. Bewusst so langsam, dass man die Bewegung eher
   spürt als sieht. */
.hero-media img { animation: hero-fahrt 26s ease-in-out infinite alternate;
                  transform-origin: 54% 48%; will-change: transform; }
@keyframes hero-fahrt { to { transform: scale(1.06); } }

/* Ist der Hero aus dem Bild gescrollt, steht die Fahrt still. Eine Animation,
   die niemand sieht, kostet auf dem Handy trotzdem Strom. */
.hero.ruht .hero-media img { animation-play-state: paused; will-change: auto; }

/* Parallaxe über die Scroll-Timeline: kostet keinen Scroll-Handler und läuft
   deshalb auch auf schwachen Geräten flüssig. Browser ohne Unterstützung
   lassen es einfach weg. */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) and (min-width: 900px) {
    .hero-media { animation: hero-tiefe linear both; animation-timeline: view();
                  animation-range: contain 0% exit 100%; }
    @keyframes hero-tiefe { to { transform: translateY(11%); } }

    .hero-inner { animation: hero-abschied linear both; animation-timeline: view();
                  animation-range: exit 10% exit 92%; }
    @keyframes hero-abschied { to { opacity: .12; transform: translateY(-38px); } }
  }
}

/* --- Sektionskopf: die Linie zieht sich auf ----------------------------- */
/* Ohne Skript steht die Linie fertig da; erst .bewegt zieht sie zurück. */
.section-head .eyebrow { position: relative; display: inline-block; padding-bottom: 7px; }
.section-head .eyebrow::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0;
                                height: 2px; background: var(--accent); transform: scaleX(1);
                                transform-origin: left; transition: transform .7s cubic-bezier(.22,.61,.36,1) .12s; }
.section-head.mitte .eyebrow::after { transform-origin: center; }
.bewegt .section-head.auftritt .eyebrow::after { transform: scaleX(0); }
.bewegt .section-head.auftritt.da .eyebrow::after { transform: scaleX(1); }

/* --- Ablauf der Abholung: der Faden zwischen den Schritten -------------- */
@media (min-width: 780px) {
  .steps { position: relative; }
  .step { position: relative; }
  .step:not(:last-child)::after { content: ""; position: absolute; left: 46px; top: 19px; right: -22px;
                                  height: 1px; background: var(--line); transform: scaleX(0);
                                  transform-origin: left; transition: transform .8s ease .3s; }
  .steps.da .step:not(:last-child)::after { transform: scaleX(1); }
}

/* --- Speisekarte: das Aufklappen bekommt eine Bewegung ------------------ */
@media (prefers-reduced-motion: no-preference) {
  .kat[open] > .kat-body { animation: kat-auf .3s cubic-bezier(.22,.61,.36,1); }
  @keyframes kat-auf { from { opacity: 0; transform: translateY(-9px); } }
  .kat > summary::after { transition: transform .22s ease; }
  .kat[open] > summary::after { transform: rotate(180deg); }
}

/* --- Eigene Fotos: ruhige Annäherung beim Scrollen ---------------------- */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .foto-slot img { animation: foto-naeher linear both; animation-timeline: view();
                     animation-range: entry 0% cover 62%; }
    @keyframes foto-naeher { from { transform: scale(1.1); } to { transform: scale(1); } }
  }
}

/* --- USP-Leiste: die Punkte kommen nacheinander ------------------------- */
.bewegt .usp-list span { opacity: 0; transform: translateY(9px);
                         transition: opacity .45s ease, transform .45s ease;
                         transition-delay: calc(var(--takt, 0) * 80ms); }
.bewegt .usp-list.da span { opacity: 1; transform: none; }

/* --- Wer keine Bewegung will, bekommt keine ----------------------------- */
@media (prefers-reduced-motion: reduce) {
  .bewegt .auftritt,
  .bewegt .auftritt-karte,
  .bewegt .usp-list span { opacity: 1; transform: none; transition: none; }
  ${MOTION_REDUZIERT_REGELN}
}

/* Für die Verkaufsdemo: derselbe Regelblock wie oben, unter der Klasse
   verschachtelt (natives CSS-Nesting), die MOTION_SCRIPT bei ?bewegung=aus
   setzt – statt die Selektoren ein zweites Mal auszuschreiben. Die drei
   .bewegt-Selektoren oben fehlen hier bewusst: .bewegt wird bei
   ?bewegung=aus gar nicht erst gesetzt, sie liefen also ohnehin ins Leere. */
.bewegung-aus {
  ${MOTION_REDUZIERT_REGELN}
}
`;

/* ======================================================================== *
 * Erweiterung (opt-in)                                                      *
 * ------------------------------------------------------------------------ *
 * Alles ab hier gehört NICHT zu MOTION_CSS/MOTION_SCRIPT. Die beiden Blöcke
 * oben stecken unverändert in jeder bereits veröffentlichten Kundenseite –
 * würde man sie erweitern, änderte sich mit dem nächsten Publish jede Seite.
 * Die neuen Effekte kommen deshalb als eigener Block, den der Generator nur
 * dort einsetzt, wo ein Preset sie anfordert (Editorial-Archetyp, Video-Hero).
 *
 * Es gelten dieselben drei Regeln wie oben: nur transform/opacity, ohne
 * JavaScript ist alles sichtbar, und wer keine Bewegung will, bekommt keine.
 * ======================================================================== */

// Derselbe Aufbau wie MOTION_REDUZIERT_REGELN: einmal geschrieben, unten
// zweimal eingehängt (Media Query für die Systemeinstellung, .bewegung-aus
// für die Verkaufsdemo).
const MOTION_EXTRA_REDUZIERT_REGELN = `
  .zeile { opacity: 1; transform: none; transition: none; }
  .bild-zoom img, .bild-zoom > picture > img { transform: none; transition: none; }
  .link-strich::after { transform: scaleX(1); transition: none; }
  .hero-video { display: none; }
  .hero-video-fallback { display: block; }
`;

export const MOTION_EXTRA_CSS = `
/* --- Zeilenweiser Auftritt der Überschrift ------------------------------ */
/* Die Zeilen werden beim Rendern serverseitig in <span class="zeile"> gelegt
   (siehe sections/hero.js) – kein Zerlegen von Text im Browser, das je nach
   Schriftgröße anders ausfällt und beim Laden sichtbar springt.
   Ohne Skript steht die Überschrift ganz normal da: die Startwerte hängen an
   .bewegt, das erst das Skript setzt. */
.zeilen { display: block; }
.zeile { display: block; }
.bewegt .auftritt-zeile .zeile { opacity: 0; transform: translateY(0.38em);
                                 transition: opacity .66s cubic-bezier(.22,.61,.36,1),
                                             transform .66s cubic-bezier(.22,.61,.36,1);
                                 transition-delay: calc(var(--takt, 0) * 105ms); }
.bewegt .auftritt-zeile.da .zeile { opacity: 1; transform: none; }

/* --- Bild-Zoom beim Überfahren ----------------------------------------- */
/* Nur für Geräte mit echtem Zeiger: Auf dem Handy gibt es kein "hover", der
   Effekt bliebe dort nach dem Antippen hängen. */
@media (hover: hover) {
  .bild-zoom { overflow: hidden; }
  .bild-zoom img { transition: transform .62s cubic-bezier(.22,.61,.36,1); will-change: transform; }
  .bild-zoom:hover img, .bild-zoom:focus-within img { transform: scale(1.06); }
}

/* --- Unterstrich, der sich aufzieht ------------------------------------ */
@media (hover: hover) {
  .link-strich { position: relative; text-decoration: none; }
  .link-strich::after { content: ""; position: absolute; left: 0; right: 0; bottom: -3px; height: 1px;
                        background: currentColor; transform: scaleX(0); transform-origin: left;
                        transition: transform .38s cubic-bezier(.22,.61,.36,1); }
  .link-strich:hover::after, .link-strich:focus-visible::after { transform: scaleX(1); }
}

/* --- Video-Hero --------------------------------------------------------- */
/* Das Poster ist dasselbe Bild, das der Hero ohne Video zeigt. Fehlt das
   Video oder will der Besucher keine Bewegung, bleibt genau dieses Bild
   stehen – der Hero ist also nie leer. */
.hero-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hero-video-fallback { display: none; }
/* Angehalten wird das Video vom Skript (MOTION_EXTRA_SKRIPT) über einen
   IntersectionObserver – genau wie die Hero-Fahrt oben, nur dass ein Video
   mehr kostet als eine CSS-Animation. Ohne Skript läuft es einfach weiter,
   ohne Skript UND ohne Bewegungswunsch greift die Regel im Block unten. */

/* --- Wer keine Bewegung will, bekommt keine ----------------------------- */
@media (prefers-reduced-motion: reduce) {
  .bewegt .auftritt-zeile .zeile { opacity: 1; transform: none; transition: none; }
  ${MOTION_EXTRA_REDUZIERT_REGELN}
}

/* Verkaufsdemo (?bewegung=aus): derselbe Regelblock, verschachtelt. Der
   .bewegt-Selektor fehlt hier bewusst – bei ?bewegung=aus wird .bewegt gar
   nicht gesetzt. */
.bewegung-aus {
  ${MOTION_EXTRA_REDUZIERT_REGELN}
}
`;

// Ergänzendes Skript für die neuen Effekte. Eigenständig: Es prüft selbst auf
// prefers-reduced-motion und ?bewegung=aus und setzt .bewegt notfalls selbst,
// damit es nicht von der Reihenfolge der Skriptblöcke abhängt.
export const MOTION_EXTRA_SKRIPT = `
(function () {
  var erzwungenRuhig = new URLSearchParams(location.search).get("bewegung") === "aus";
  if (erzwungenRuhig) document.documentElement.classList.add("bewegung-aus");

  var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");
  var video = document.querySelector(".hero-video");

  // Ohne Bewegung bleibt das Poster stehen: Das Video wird per CSS versteckt,
  // hier wird es zusätzlich angehalten, damit es keine Daten nachlädt.
  if (ruhig.matches || erzwungenRuhig) {
    if (video) { video.pause(); video.removeAttribute("autoplay"); }
    return;
  }

  if (!("IntersectionObserver" in window)) return;

  // Video anhalten, sobald der Hero durch ist – wie die Hero-Fahrt oben.
  if (video) {
    new IntersectionObserver(function (eintraege) {
      if (eintraege[0].isIntersecting) {
        var versuch = video.play();
        if (versuch && versuch.catch) versuch.catch(function () {});
      } else {
        video.pause();
      }
    }, { threshold: 0 }).observe(video);
  }

  var zeilenBloecke = document.querySelectorAll(".auftritt-zeile");
  if (zeilenBloecke.length === 0) return;
  document.documentElement.classList.add("bewegt");

  var beobachter = new IntersectionObserver(function (eintraege) {
    eintraege.forEach(function (eintrag) {
      if (!eintrag.isIntersecting) return;
      eintrag.target.classList.add("da");
      beobachter.unobserve(eintrag.target);
    });
  }, { threshold: 0.1 });

  Array.prototype.forEach.call(zeilenBloecke, function (el) { beobachter.observe(el); });

  // Stellt jemand die Bewegung mitten im Besuch ab, wird sofort alles gezeigt.
  var aus = function () {
    if (!ruhig.matches) return;
    beobachter.disconnect();
    Array.prototype.forEach.call(zeilenBloecke, function (el) { el.classList.add("da"); });
    if (video) video.pause();
  };
  if (ruhig.addEventListener) ruhig.addEventListener("change", aus);
})();
`;

// Wird als eigener Block in die Seite geschrieben. Bewusst früh ausgeführt und
// nicht erst bei "load": sonst blitzt der unsichtbare Zustand kurz auf.
export const MOTION_SCRIPT = `
(function () {
  // Für Vor-Ort-Demos: "?bewegung=aus" an der URL stellt die Seite exakt so
  // ruhig wie prefers-reduced-motion – unabhängig von der Systemeinstellung
  // des Besuchers. Die Klasse greift sofort, auch falls unten aus anderem
  // Grund (kein IntersectionObserver, keine bewegten Gruppen) weitergemacht
  // würde – sie ist an die Media-Query-Regeln gekoppelt, nicht an den Ablauf
  // dieses Skripts.
  var erzwungenRuhig = new URLSearchParams(location.search).get("bewegung") === "aus";
  if (erzwungenRuhig) document.documentElement.classList.add("bewegung-aus");

  var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (ruhig.matches || erzwungenRuhig) return;

  // Browser ohne IntersectionObserver zeigen einfach die fertige Seite.
  if (!("IntersectionObserver" in window)) return;

  var GRUPPEN = [
    [".section-head", "auftritt"],
    [".hl-card", "auftritt-karte"],
    [".foto-slot", "auftritt-karte"],
    [".stimme", "auftritt-karte"],
    [".step", "auftritt"],
    [".reserve-grid > *", "auftritt"],
    [".contact-grid > *", "auftritt"],
    [".kat", "auftritt"],
    [".sig-orchid", "auftritt-orchid"],
    [".sig-spice", "auftritt-spice"]
  ];

  var beobachtet = [];
  GRUPPEN.forEach(function (gruppe) {
    var knoten = document.querySelectorAll(gruppe[0]);
    // Der Takt zählt innerhalb einer Reihe, nicht über die ganze Seite –
    // sonst wartet man unten ewig auf die letzte Karte.
    var eltern = null;
    var zaehler = 0;
    Array.prototype.forEach.call(knoten, function (el) {
      if (el.parentElement !== eltern) { eltern = el.parentElement; zaehler = 0; }
      el.classList.add(gruppe[1]);
      el.style.setProperty("--takt", String(Math.min(zaehler, 5)));
      zaehler += 1;
      beobachtet.push(el);
    });
  });

  // Die USP-Leiste und die Schrittkette schalten als Ganzes.
  Array.prototype.forEach.call(document.querySelectorAll(".usp-list"), function (liste) {
    Array.prototype.forEach.call(liste.children, function (el, i) {
      el.style.setProperty("--takt", String(i));
    });
    beobachtet.push(liste);
  });
  Array.prototype.forEach.call(document.querySelectorAll(".steps"), function (el) {
    beobachtet.push(el);
  });

  if (beobachtet.length === 0) return;
  document.documentElement.classList.add("bewegt");

  // Hero-Fahrt anhalten, sobald der Hero durch ist.
  var hero = document.querySelector(".hero");
  if (hero) {
    new IntersectionObserver(function (eintraege) {
      hero.classList.toggle("ruht", !eintraege[0].isIntersecting);
    }, { threshold: 0 }).observe(hero);
  }

  var beobachter = new IntersectionObserver(function (eintraege) {
    eintraege.forEach(function (eintrag) {
      if (!eintrag.isIntersecting) return;
      eintrag.target.classList.add("da");
      // Einmal sichtbar, immer sichtbar. Inhalt, der beim Zurückscrollen
      // wieder verschwindet, ist eine Spielerei und keine Gestaltung.
      beobachter.unobserve(eintrag.target);
    });
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });

  beobachtet.forEach(function (el) { beobachter.observe(el); });

  // Stellt jemand die Bewegung mitten im Besuch ab, wird sofort alles gezeigt.
  var aus = function () {
    if (!ruhig.matches) return;
    beobachter.disconnect();
    beobachtet.forEach(function (el) { el.classList.add("da"); });
  };
  if (ruhig.addEventListener) ruhig.addEventListener("change", aus);
})();
`;
