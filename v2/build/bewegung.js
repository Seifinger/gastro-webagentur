// Bewegung der v2-Seiten – dieselben drei Regeln wie src/motion.js in v1:
//
// 1. Nichts springt: animiert werden nur transform und opacity.
// 2. Nichts versteckt Inhalt: Die Startwerte hängen an .bewegt, das erst das
//    Skript setzt. Ohne JavaScript steht die volle Seite da.
// 3. Abschaltbar: Bei prefers-reduced-motion setzt das Skript .bewegt gar
//    nicht erst, und die CSS-Regeln greifen nur ohne Reduktionswunsch.
//
// Dazu die v2-Regel aus dem Designsystem: genau EIN betonter Moment je Seite
// (layout.betonterMoment). Alles andere tritt ruhig und gleichförmig auf.
// Dauer, Kurve, Weg und Versatz kommen aus den Motion-Tokens.

export const BEWEGUNG_CSS = `
@media (prefers-reduced-motion: no-preference) {
  .bewegt .auftritt { opacity: 0; transform: translateY(var(--m-weg));
    transition: opacity var(--m-lang) var(--m-kurve), transform var(--m-lang) var(--m-kurve);
    transition-delay: calc(var(--takt, 0) * var(--m-versatz)); }
  .bewegt .auftritt.da { opacity: 1; transform: none; }

  /* Betonter Moment "hero": das Titelbild setzt sich einmal, langsam. */
  .moment-hero .hero-bild img { animation: v2-setzen calc(var(--m-lang) * 3) var(--m-kurve) both; }
  @keyframes v2-setzen { from { transform: scale(1.04); } to { transform: none; } }

  /* Betonter Moment "reservierung": das Formular hebt sich als Letztes. */
  .moment-reservierung.bewegt .reservierung--betont .formular.auftritt { transform: translateY(calc(var(--m-weg) * 3)); }
  .moment-reservierung.bewegt .reservierung--betont .formular.auftritt.da { transform: none; }

  /* Betonter Moment "highlights": die Reihe tritt schnell nacheinander auf. */
  .moment-highlights.bewegt #highlights .auftritt { transition-delay: calc(var(--takt, 0) * var(--m-versatz) / 2); }

  .gericht-bild img, .haus-foto img { transition: transform var(--m-lang) var(--m-kurve); }
  @media (hover: hover) {
    .gericht:hover .gericht-bild img { transform: scale(1.03); }
  }
}
`;

export const BEWEGUNG_SKRIPT = `
(function () {
  var reduziert = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduziert) {
    // Bewegung abgestellt: Videos bleiben auf ihrem Poster stehen.
    Array.prototype.forEach.call(document.querySelectorAll("video[autoplay]"), function (v) { v.removeAttribute("autoplay"); v.pause(); });
    return;
  }
  if (!("IntersectionObserver" in window)) return;
  var wurzel = document.body;
  var elemente = document.querySelectorAll(".auftritt");
  Array.prototype.forEach.call(elemente, function (el) {
    var geschwister = el.parentNode ? Array.prototype.filter.call(el.parentNode.children, function (k) { return k.classList.contains("auftritt"); }) : [];
    el.style.setProperty("--takt", String(Math.max(0, geschwister.indexOf(el))));
  });
  wurzel.classList.add("bewegt");
  var beobachter = new IntersectionObserver(function (eintraege) {
    eintraege.forEach(function (eintrag) {
      if (eintrag.isIntersecting) { eintrag.target.classList.add("da"); beobachter.unobserve(eintrag.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  Array.prototype.forEach.call(elemente, function (el) { beobachter.observe(el); });
})();
`;
