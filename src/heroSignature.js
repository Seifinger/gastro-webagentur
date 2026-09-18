import { assetFileName } from "./imageLibrary.js";

// Ein bewegtes Element je Küche, damit die Seiten nicht nur andere Farben
// haben, sondern eine eigene Handschrift. Jede Küche bekommt einen anderen
// Mechanismus – reine CSS-Animationen, keine Bibliothek, kein JavaScript.
//
// Vorbild ist die gegenläufig drehende Pizza bei L'Osteria. Zurückhaltung ist
// dabei Absicht: das Element schmückt den Hero, es überlagert ihn nicht.

const SIGNATUR_CSS = `
.sig { position: absolute; z-index: 1; pointer-events: none; }

/* Italienisch: zwei Pizzahälften, die gegeneinander drehen */
.sig-pizza { right: -14%; top: 50%; transform: translateY(-50%);
             width: clamp(240px, 42vw, 460px); aspect-ratio: 1; border-radius: 50%;
             overflow: hidden; opacity: .92; box-shadow: 0 30px 70px -30px rgba(0,0,0,.8); }
.sig-pizza .haelfte { position: absolute; inset: 0; }
.sig-pizza .haelfte.links { clip-path: polygon(0 0, 50% 0, 50% 100%, 0 100%); }
.sig-pizza .haelfte.rechts { clip-path: polygon(50% 0, 100% 0, 100% 100%, 50% 100%); }
.sig-pizza img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%;
                 animation: sig-dreh 38s linear infinite; }
.sig-pizza .haelfte.rechts img { animation-direction: reverse; }
@keyframes sig-dreh { to { transform: rotate(360deg); } }
@media (max-width: 899px) {
  .sig-pizza { right: -26%; top: 16%; transform: none; width: 62vw; opacity: .5; }
}

/* Asiatisch: Gerichte laufen wie auf dem Sushi-Band durchs Bild */
.sig-band { left: 0; right: 0; top: 70px; height: clamp(74px, 11vw, 108px); overflow: hidden;
            opacity: .9; mask-image: linear-gradient(90deg, transparent, #000 9%, #000 91%, transparent); }
.sig-band .band { display: flex; gap: 12px; width: max-content; animation: sig-band 34s linear infinite; }
.sig-band img { height: clamp(74px, 11vw, 108px); width: clamp(104px, 15vw, 150px);
                object-fit: cover; border-radius: 4px; }
@keyframes sig-band { to { transform: translateX(-50%); } }
@media (max-width: 899px) { .sig-band { top: 62px; opacity: .55; } }

/* Türkisch: der Drehspieß dreht sich weiter */
.sig-spiess { right: 6%; top: 50%; transform: translateY(-50%);
              width: clamp(120px, 17vw, 190px); height: clamp(260px, 38vw, 400px);
              border-radius: 999px; overflow: hidden; opacity: .9;
              box-shadow: inset 26px 0 44px -22px rgba(0,0,0,.95), inset -26px 0 44px -22px rgba(0,0,0,.95),
                          0 30px 60px -28px rgba(0,0,0,.8); }
.sig-spiess .fleisch { position: absolute; inset: 0; background-size: 220% 100%;
                       background-repeat: repeat-x; animation: sig-spiess 16s linear infinite; }
@keyframes sig-spiess { to { background-position-x: -220%; } }
@media (max-width: 899px) {
  .sig-spiess { right: -4%; top: 12%; transform: none; width: 34vw; height: 46vw; opacity: .5; }
}

/* Bayerisch: die Tagesempfehlung wechselt durch */
.sig-tafel { right: 5%; top: 50%; transform: translateY(-50%);
             width: clamp(210px, 27vw, 310px); aspect-ratio: 3 / 4; }
.sig-tafel .karte { position: absolute; inset: 0; opacity: 0; border-radius: 10px; overflow: hidden;
                    box-shadow: 0 26px 56px -26px rgba(0,0,0,.85); animation: sig-tafel 21s infinite; }
.sig-tafel .karte:nth-child(2) { animation-delay: 7s; }
.sig-tafel .karte:nth-child(3) { animation-delay: 14s; }
.sig-tafel img { width: 100%; height: 100%; object-fit: cover; }
.sig-tafel .schild { position: absolute; left: 0; right: 0; bottom: 0; padding: 26px 14px 12px;
                     background: linear-gradient(180deg, transparent, rgba(0,0,0,.85));
                     color: #fff; font-size: 14px; font-weight: 600; text-align: center; }
.sig-tafel .schild small { display: block; font-size: 10px; font-weight: 700; letter-spacing: .14em;
                           text-transform: uppercase; opacity: .75; margin-bottom: 3px; }
@keyframes sig-tafel { 0%, 3% { opacity: 0; } 6%, 30% { opacity: 1; } 36%, 100% { opacity: 0; } }
@media (max-width: 899px) {
  .sig-tafel { right: 4%; top: 11%; transform: none; width: 34vw; opacity: .6; }
  .sig-tafel .schild { display: none; }
}

/* Griechisch: ruhiger Bildwechsel mit langsamer Annäherung */
.sig-diashow { right: 4%; top: 50%; transform: translateY(-50%);
               width: clamp(230px, 34vw, 400px); aspect-ratio: 4 / 5; border-radius: 200px 200px 14px 14px;
               overflow: hidden; opacity: .92; box-shadow: 0 30px 66px -28px rgba(0,0,0,.8); }
.sig-diashow img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
                   opacity: 0; animation: sig-diashow 24s infinite; }
.sig-diashow img:nth-child(2) { animation-delay: 8s; }
.sig-diashow img:nth-child(3) { animation-delay: 16s; }
@keyframes sig-diashow {
  0% { opacity: 0; transform: scale(1); }
  5%, 29% { opacity: 1; }
  33%, 100% { opacity: 0; }
  100% { transform: scale(1.12); }
}
@media (max-width: 899px) {
  .sig-diashow { right: -8%; top: 12%; transform: none; width: 46vw; opacity: .5; }
}

/* Café: aufsteigender Dampf über der Tasse */
.sig-tasse { right: 6%; top: 50%; transform: translateY(-50%);
             width: clamp(210px, 30vw, 340px); aspect-ratio: 1; }
.sig-tasse .becher { position: absolute; inset: 0; border-radius: 50%; overflow: hidden;
                     box-shadow: 0 28px 60px -26px rgba(0,0,0,.8); }
.sig-tasse img { width: 100%; height: 100%; object-fit: cover; }
.sig-tasse .dampf { position: absolute; left: 50%; top: -6%; width: 34%; height: 46%;
                    transform: translateX(-50%); }
.sig-tasse .dampf i { position: absolute; bottom: 0; width: 20px; height: 20px; border-radius: 50%;
                      background: rgba(255,255,255,.7); filter: blur(9px); opacity: 0;
                      animation: sig-dampf 5.5s ease-in infinite; }
.sig-tasse .dampf i:nth-child(1) { left: 12%; }
.sig-tasse .dampf i:nth-child(2) { left: 42%; animation-delay: 1.6s; }
.sig-tasse .dampf i:nth-child(3) { left: 70%; animation-delay: 3.2s; }
@keyframes sig-dampf {
  0% { opacity: 0; transform: translateY(0) scale(.7); }
  25% { opacity: .75; }
  100% { opacity: 0; transform: translateY(-110px) scale(1.9); }
}
@media (max-width: 899px) {
  .sig-tasse { right: -4%; top: 13%; transform: none; width: 44vw; opacity: .55; }
}

/* Chinesisch: der Drehteller in der Tischmitte, wie beim Essen in der Runde */
.sig-drehteller { right: 2%; top: 50%; transform: translateY(-50%);
                  width: clamp(250px, 40vw, 440px); aspect-ratio: 1; }
/* Nur ein Rand, keine graue Fläche: über einem Foto wird die sonst schnell
   zu Schlieren. Die Schalen sollen die Form tragen, nicht die Scheibe. */
.sig-drehteller .teller { position: absolute; inset: 0; border-radius: 50%;
                          box-shadow: inset 0 0 0 1px rgba(255,255,255,.22),
                                      inset 0 0 60px -20px rgba(0,0,0,.55);
                          animation: sig-drehteller 44s linear infinite; }
.sig-drehteller .schale { position: absolute; width: 40%; aspect-ratio: 1; border-radius: 50%;
                          overflow: hidden;
                          box-shadow: 0 16px 30px -12px rgba(0,0,0,.85), 0 0 0 3px rgba(255,255,255,.14);
                          left: 50%; top: 50%; }
/* Drei Schalen im Kreis, jede auf ihrem Platz. Die Gegendrehung hält die
   Bilder aufrecht, sonst stünde das Essen zwischendurch auf dem Kopf. */
/* Der Abstand zur Mitte ist in Vielfachen der Schale angegeben: bei 33 %
   Schalengröße liegt der Rand des Tellers bei gut einer Schalenbreite. */
.sig-drehteller .schale:nth-child(1) { transform: translate(-50%, -50%) rotate(0deg) translateY(-76%) rotate(0deg); }
.sig-drehteller .schale:nth-child(2) { transform: translate(-50%, -50%) rotate(120deg) translateY(-76%) rotate(-120deg); }
.sig-drehteller .schale:nth-child(3) { transform: translate(-50%, -50%) rotate(240deg) translateY(-76%) rotate(-240deg); }
.sig-drehteller img { width: 100%; height: 100%; object-fit: cover;
                      animation: sig-drehteller-zurueck 44s linear infinite; }
@keyframes sig-drehteller { to { transform: rotate(360deg); } }
@keyframes sig-drehteller-zurueck { to { transform: rotate(-360deg); } }
@media (max-width: 899px) {
  .sig-drehteller { right: -14%; top: 11%; transform: none; width: 60vw; opacity: .5; }
}

/* Vietnamesisch: die Schale Phở, über der der Dampf steht */
.sig-schale { right: 5%; top: 50%; transform: translateY(-50%);
              width: clamp(220px, 32vw, 380px); aspect-ratio: 1; }
.sig-schale .napf { position: absolute; inset: 0; border-radius: 50%; overflow: hidden;
                    box-shadow: 0 28px 62px -26px rgba(0,0,0,.8); }
.sig-schale img { width: 100%; height: 100%; object-fit: cover;
                  animation: sig-schale-atmen 14s ease-in-out infinite alternate; }
@keyframes sig-schale-atmen { to { transform: scale(1.07); } }
.sig-schale .dampf { position: absolute; left: 50%; top: -14%; width: 52%; height: 54%;
                     transform: translateX(-50%); }
.sig-schale .dampf i { position: absolute; bottom: 0; width: 26px; height: 26px; border-radius: 50%;
                       background: rgba(255,255,255,.62); filter: blur(11px); opacity: 0;
                       animation: sig-schale-dampf 6.5s ease-in infinite; }
.sig-schale .dampf i:nth-child(1) { left: 8%; }
.sig-schale .dampf i:nth-child(2) { left: 40%; animation-delay: 2.1s; }
.sig-schale .dampf i:nth-child(3) { left: 68%; animation-delay: 4.2s; }
@keyframes sig-schale-dampf {
  0% { opacity: 0; transform: translateY(0) scale(.6); }
  22% { opacity: .7; }
  100% { opacity: 0; transform: translateY(-130px) scale(2.1); }
}
@media (max-width: 899px) {
  .sig-schale { right: -6%; top: 12%; transform: none; width: 48vw; opacity: .55; }
}

/* Generische, küchenunabhängige Hero-Varianten – wählbar über das
   Design-Preset-Modell (designPresets.js) für A/B-Tests, ohne die
   küchenspezifischen Signaturen oben zu verändern. */
.sig-dish { right: 5%; top: 50%; transform: translateY(-50%);
            width: clamp(230px, 34vw, 400px); aspect-ratio: 4 / 5; border-radius: 22px;
            overflow: hidden; opacity: .95; box-shadow: 0 30px 66px -28px rgba(0,0,0,.8); }
.sig-dish img { width: 100%; height: 100%; object-fit: cover; }
@media (max-width: 899px) {
  .sig-dish { right: -6%; top: 12%; transform: none; width: 46vw; opacity: .55; }
}

.sig-ambience { right: 4%; top: 50%; transform: translateY(-50%);
                width: clamp(280px, 40vw, 460px); aspect-ratio: 16 / 11; border-radius: 18px;
                overflow: hidden; opacity: .92; box-shadow: 0 30px 66px -28px rgba(0,0,0,.8); }
.sig-ambience img { width: 100%; height: 100%; object-fit: cover; }
@media (max-width: 899px) {
  .sig-ambience { right: -10%; top: 12%; transform: none; width: 56vw; opacity: .5; }
}

.sig-reservation { right: 6%; top: 22%; }
.sig-reservation-card { background: rgba(0,0,0,.4); border: 1px solid rgba(255,255,255,.35);
                         backdrop-filter: blur(6px); border-radius: 14px; padding: 16px 20px;
                         color: #fff; text-align: center; box-shadow: 0 20px 44px -20px rgba(0,0,0,.7); }
.sig-reservation-kicker { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase;
                           letter-spacing: .14em; opacity: .75; margin-bottom: 4px; }
.sig-reservation-text { display: block; font-size: 15px; font-weight: 600; }
@media (max-width: 899px) { .sig-reservation { display: none; } }

/* Wer Bewegung im System abgestellt hat, bekommt das Standbild. */
@media (prefers-reduced-motion: reduce) {
  .sig-pizza img, .sig-band .band, .sig-spiess .fleisch,
  .sig-tafel .karte, .sig-diashow img, .sig-tasse .dampf i,
  .sig-drehteller .teller, .sig-drehteller img,
  .sig-schale img, .sig-schale .dampf i { animation: none; }
  .sig-tafel .karte:first-child, .sig-diashow img:first-child { opacity: 1; }
}
`;

function bild(id, rolle, bildUrl) {
  return bildUrl ? bildUrl(id, rolle) : `../assets/${assetFileName(id, rolle)}`;
}

/**
 * Liefert das bewegte Hero-Element zur Küche. Ohne passende Bilder bleibt es
 * weg – lieber kein Effekt als ein leerer Rahmen.
 */
export function heroSignatur(cuisine, { highlights = [], bildUrl, escape } = {}) {
  const esc = escape ?? ((v) => String(v));
  const gerichte = highlights.filter((g) => g.bild);

  // Die Highlights wechseln je Lead. Für die drehende Scheibe braucht es
  // aber ein rundes Gericht, für den Spieß etwas vom Grill – deshalb wird
  // gezielt nach Kategorie gesucht statt einfach das erste zu nehmen.
  const ausKategorie = (muster, fallback) => {
    const treffer = gerichte.find((g) => muster.test(g.kategorie ?? ""));
    return bild(treffer?.bild ?? gerichte[0]?.bild ?? fallback, "gericht", bildUrl);
  };

  if (cuisine === "italienisch") {
    const pizza = esc(ausKategorie(/pizza/i, "photo-1574071318508-1cdbab80d002"));
    return `
      <div class="sig sig-pizza" aria-hidden="true">
        <div class="haelfte links"><img src="${pizza}" alt=""></div>
        <div class="haelfte rechts"><img src="${pizza}" alt=""></div>
      </div>`;
  }

  // Das Sushi-Band gehört zu Japan, wird aber auch von der panasiatischen
  // Sammelkategorie genutzt – dort passt nichts Genaueres.
  if (cuisine === "asiatisch" || cuisine === "japanisch") {
    if (gerichte.length < 3) return "";
    const bilder = gerichte.slice(0, 5);
    // Doppelt ausgeben, damit der Umlauf ohne Sprung schließt.
    const kette = [...bilder, ...bilder]
      .map((g) => `<img src="${esc(bild(g.bild, "gericht", bildUrl))}" alt="">`)
      .join("");
    return `<div class="sig sig-band" aria-hidden="true"><div class="band">${kette}</div></div>`;
  }

  // Der Drehteller in der Tischmitte: drei Schalen, die langsam vorbeiziehen.
  if (cuisine === "chinesisch") {
    if (gerichte.length < 3) return "";
    const schalen = gerichte
      .slice(0, 3)
      .map((g) => `<div class="schale"><img src="${esc(bild(g.bild, "gericht", bildUrl))}" alt=""></div>`)
      .join("");
    return `<div class="sig sig-drehteller" aria-hidden="true"><div class="teller">${schalen}</div></div>`;
  }

  // Die dampfende Schale Phở.
  if (cuisine === "vietnamesisch") {
    const suppe = esc(ausKategorie(/phở|pho|suppe/i, "photo-1597345637412-9fd611e758f3"));
    return `
      <div class="sig sig-schale" aria-hidden="true">
        <div class="napf"><img src="${suppe}" alt=""></div>
        <div class="dampf"><i></i><i></i><i></i></div>
      </div>`;
  }

  // Schawarma und Döner drehen sich am selben Spieß – ein eigener Mechanismus
  // wäre hier erfunden, nicht gefunden.
  if (cuisine === "tuerkisch" || cuisine === "syrisch") {
    const spiess = esc(ausKategorie(/spieß|spiess|grill/i, "photo-1529006557810-274b9b2fc783"));
    return `
      <div class="sig sig-spiess" aria-hidden="true">
        <div class="fleisch" style="background-image:url('${spiess}')"></div>
      </div>`;
  }

  // Die wechselnde Tagesempfehlung – bei der indischen Karte trägt sie die
  // Currys, beim Wirtshaus den Braten.
  if (cuisine === "bayerisch" || cuisine === "indisch") {
    if (gerichte.length < 3) return "";
    const karten = gerichte
      .slice(0, 3)
      .map(
        (g) => `
        <div class="karte">
          <img src="${esc(bild(g.bild, "gericht", bildUrl))}" alt="">
          <div class="schild"><small>Heute empfohlen</small>${esc(g.name)}</div>
        </div>`,
      )
      .join("");
    return `<div class="sig sig-tafel" aria-hidden="true">${karten}</div>`;
  }

  if (cuisine === "griechisch" || cuisine === "thailaendisch") {
    if (gerichte.length < 3) return "";
    const bilder = gerichte
      .slice(0, 3)
      .map((g) => `<img src="${esc(bild(g.bild, "gericht", bildUrl))}" alt="">`)
      .join("");
    return `<div class="sig sig-diashow" aria-hidden="true">${bilder}</div>`;
  }

  if (cuisine === "cafe") {
    const tasse = esc(ausKategorie(/kaffee|getränke/i, "photo-1495474472287-4d71bcdd2085"));
    return `
      <div class="sig sig-tasse" aria-hidden="true">
        <div class="becher"><img src="${tasse}" alt=""></div>
        <div class="dampf"><i></i><i></i><i></i></div>
      </div>`;
  }

  return "";
}

/**
 * Generische, küchenunabhängige Hero-Varianten – nutzbar für A/B-Tests über
 * das Design-Preset-Modell (siehe designPresets.js). Sie ergänzen die
 * küchenspezifischen Signaturen oben, ersetzen sie aber nicht: Standard
 * bleibt heroSignatur() (hero.type "signature").
 */

/**
 * Ein einzelnes, großes Gerichtsfoto statt der bewegten Signatur – für Häuser,
 * bei denen ein starkes Produktfoto mehr trägt als ein Bewegungseffekt.
 */
export function heroDishPhoto({ highlights = [], bildUrl, escape } = {}) {
  const esc = escape ?? ((v) => String(v));
  const gericht = highlights.find((g) => g.bild);
  if (!gericht) return "";

  const src = esc(bild(gericht.bild, "gericht", bildUrl));
  return `
    <div class="sig sig-dish" aria-hidden="true">
      <img src="${src}" alt="">
    </div>`;
}

/**
 * Ein Ambiente-Foto (Außenansicht/Innenraum) statt Gericht oder Bewegung –
 * für Häuser, die vor allem mit ihrem Raum oder ihrer Lage überzeugen.
 */
export function heroAmbiencePhoto({ hausBild, bildUrl, escape } = {}) {
  const esc = escape ?? ((v) => String(v));
  if (!hausBild) return "";

  const src = esc(bild(hausBild, "ambiente", bildUrl));
  return `
    <div class="sig sig-ambience" aria-hidden="true">
      <img src="${src}" alt="">
    </div>`;
}

/**
 * Ein schlichter Reservierungs-Teaser statt Bild – für Häuser, bei denen der
 * reservierte Tisch (nicht die Abholung) im Vordergrund steht. Rein
 * dekorativ, deshalb aria-hidden: der eigentliche, erreichbare Link zur
 * Reservierung steht bereits in den Hero-Actions.
 */
export function heroReservationHero() {
  return `
    <div class="sig sig-reservation" aria-hidden="true">
      <div class="sig-reservation-card">
        <span class="sig-reservation-kicker">Tisch sichern</span>
        <span class="sig-reservation-text">In 60 Sekunden reserviert</span>
      </div>
    </div>`;
}

export { SIGNATUR_CSS };
