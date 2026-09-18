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

/* Thailändisch: eine Orchidee blüht auf, sobald der Hero ins Bild scrollt.
   Die Blütenblätter nutzen dieselbe Intersection-Observer-Kopplung wie der
   Rest der Seite (.bewegt/.da aus motion.js) statt einer eigenen Schleife –
   das Aufblühen soll einmal passieren, nicht dauerhaft laufen. */
.sig-orchid { right: 6%; top: 50%; transform: translateY(-50%);
              width: clamp(170px, 24vw, 260px); aspect-ratio: 1; opacity: .95;
              filter: drop-shadow(0 22px 40px rgba(0,0,0,.35)); }
.sig-orchid svg { width: 100%; height: 100%; overflow: visible; }
.sig-orchid .bluete { fill: #c99bdb; transform-box: fill-box; transform-origin: center;
                      transition: opacity .7s ease, transform .7s cubic-bezier(.22,.61,.36,1);
                      transition-delay: calc(var(--i, 0) * .1s); }
.sig-orchid .bluete-mitte { fill: #f4d35e; }
/* Vor dem Sichtbarwerden klein und unsichtbar, .da lässt sie zur vollen
   Größe aufblühen – pro Blütenblatt um .1s versetzt (macht bei .7s
   Übergang und 6 Blättern 1.2s Gesamtdauer, einmalig). */
.bewegt .sig-orchid .bluete { opacity: 0; transform: scale(.3); }
.bewegt .sig-orchid.da .bluete { opacity: 1; transform: scale(1); }
@media (max-width: 899px) {
  .sig-orchid { right: -6%; top: 12%; transform: none; width: 40vw; opacity: .6; }
}

/* Indisch: ein Puder-Wölkchen platzt auf, sobald der Hero ins Bild scrollt –
   dieselbe .bewegt/.da-Kopplung wie bei der Orchidee, aber als einmalige
   @keyframes-Animation statt Übergang, weil Start- und Zielwert hier auf
   zwei verschiedene Zwischenstufen fallen (nicht nur an/aus). */
.sig-spice { right: 8%; top: 50%; transform: translateY(-50%);
             width: clamp(160px, 22vw, 240px); aspect-ratio: 1; }
.sig-spice .puff { position: absolute; border-radius: 50%; filter: blur(7px); }
.sig-spice .puff-1 { left: 20%; top: 30%; width: 46%; aspect-ratio: 1;
                      background: radial-gradient(circle, #ffb238, #e2790a 72%); }
.sig-spice .puff-2 { left: 42%; top: 46%; width: 38%; aspect-ratio: 1;
                      background: radial-gradient(circle, #ffd27a, #d9660a 72%); }
.sig-spice .puff-3 { left: 10%; top: 54%; width: 30%; aspect-ratio: 1;
                      background: radial-gradient(circle, #ffc25c, #c65a06 72%); }
.bewegt .sig-spice .puff { opacity: 0; transform: scale(.5); }
.bewegt .sig-spice.da .puff { animation: sig-spice-puff .8s ease-out forwards; }
@keyframes sig-spice-puff {
  from { opacity: .8; transform: scale(.5); }
  to { opacity: 0; transform: scale(1.3); }
}
@media (max-width: 899px) {
  .sig-spice { right: -2%; top: 15%; transform: none; width: 40vw; }
}

/* Asiatisch (gemischt): ein bis zwei Laternen pulsieren dezent am Rand –
   nicht mittig über dem Essen wie das Sushi-Band, das Japanisch behält.
   Statt box-shadow direkt zu animieren (teuer, löst Repaints aus), pulsiert
   die Opazität des .glow-Elements im SVG – der sichtbare Effekt ist
   derselbe, animiert wird trotzdem nur opacity. */
.sig-lanterns { left: 3%; top: 14%; display: flex; flex-direction: column; gap: 26px; }
.sig-lanterns .laterne { position: relative; height: clamp(70px, 9vw, 104px); aspect-ratio: 60 / 110;
                          transform-origin: 50% 4%;
                          animation: sig-laterne-schaukel 7s ease-in-out infinite; }
.sig-lanterns .laterne .sig-lantern-form { width: 100%; height: 100%; display: block; overflow: visible; }
.sig-lanterns .laterne .glow { animation: sig-laterne-puls 4s ease-in-out infinite; }
.sig-lanterns .laterne:nth-child(2) { height: clamp(54px, 7vw, 80px); animation-delay: 1.6s; }
.sig-lanterns .laterne:nth-child(2) .glow { animation-delay: .8s; }
@keyframes sig-laterne-puls { 0%, 100% { opacity: .35; } 50% { opacity: .85; } }
@keyframes sig-laterne-schaukel { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
@media (max-width: 899px) {
  .sig-lanterns { left: 2%; top: 8%; gap: 16px; }
}

/* Bayerisch: zusätzlich zur Tagestafel ein kleines Detail – der Bierkrug
   läuft alle 8s kurz über. Ergänzt die bestehende Signatur, ersetzt sie
   nicht. Das Glas selbst (sig-beer-glas) ist ein statisches SVG-Icon,
   Schaum und Tropfen sitzen als eigene Elemente darauf. */
.sig-beer { position: relative; right: 4%; bottom: 6%; width: clamp(80px, 8vw, 110px);
            aspect-ratio: 1 / 1.4; }
.sig-beer-glas { position: absolute; inset: 0; width: 100%; height: 100%;
                 color: rgba(255, 226, 150, .3);
                 filter: drop-shadow(0 12px 18px rgba(0,0,0,.4)); }
.sig-beer .schaum { position: absolute; left: 16%; right: 16%; top: 3%; height: 20%;
                     border-radius: 999px 999px 6px 6px; background: #fdf3d6;
                     box-shadow: 0 8px 14px -8px rgba(0,0,0,.4);
                     transform-origin: 50% 100%;
                     animation: sig-beer-schaum 8s ease-in-out infinite; }
.sig-beer .tropfen { position: absolute; left: 50%; top: 18%; width: 5px; height: 5px;
                      border-radius: 50%; background: #fdf3d6; opacity: 0;
                      animation: sig-beer-tropfen 8s ease-in infinite; }
.sig-beer .tropfen-2 { left: 64%; animation-delay: .25s; }
@keyframes sig-beer-schaum {
  0%, 88% { transform: scaleY(1) translateY(0); }
  93% { transform: scaleY(1.22) translateY(-12%); }
  100% { transform: scaleY(1) translateY(0); }
}
@keyframes sig-beer-tropfen {
  0%, 88% { opacity: 0; transform: translateY(0); }
  90% { opacity: .9; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(20px); }
}
@media (max-width: 899px) {
  .sig-beer { right: 6%; bottom: 5%; width: 32px; }
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
  /* Auch bei einer Umstellung mitten im Besuch (.bewegt bleibt gesetzt) darf
     die Blüte nicht wieder verschwinden – deshalb hier dieselbe Spezifität
     wie die .da-Regel, aber als spätere Quelle. */
  .bewegt .sig-orchid .bluete, .bewegt .sig-orchid.da .bluete {
    opacity: 1; transform: none; transition: none;
  }
  .bewegt .sig-spice .puff, .bewegt .sig-spice.da .puff {
    opacity: 1; transform: none; animation: none;
  }
  .sig-lanterns .laterne { animation: none; }
  .sig-lanterns .laterne .glow { animation: none; opacity: .6; }
  .sig-beer .schaum, .sig-beer .tropfen { animation: none; }
}
`;

function bild(id, rolle, bildUrl) {
  return bildUrl ? bildUrl(id, rolle) : `../assets/${assetFileName(id, rolle)}`;
}

const ORCHID_BLUETENBLAETTER = 6;

/**
 * Sechs Blütenblätter (SVG-Pfade) im Kreis um eine Mitte – jedes mit eigenem
 * --i für den gestaffelten Übergang in der CSS-Regel .bewegt .sig-orchid.
 */
function heroOrchidBloom() {
  const winkel = 360 / ORCHID_BLUETENBLAETTER;
  const bluetenblaetter = Array.from({ length: ORCHID_BLUETENBLAETTER })
    .map(
      (_, i) => `
        <g transform="rotate(${i * winkel} 50 50)" style="--i:${i}">
          <path class="bluete" d="M50,50 C38,38 38,18 50,8 C62,18 62,38 50,50 Z"></path>
        </g>`,
    )
    .join("");
  return `
    <div class="sig sig-orchid" aria-hidden="true">
      <svg viewBox="0 0 100 100" focusable="false">
        ${bluetenblaetter}
        <circle class="bluete-mitte" cx="50" cy="50" r="6"></circle>
      </svg>
    </div>`;
}

function heroSpicePuff() {
  return `
    <div class="sig sig-spice" aria-hidden="true">
      <div class="puff puff-1"></div>
      <div class="puff puff-2"></div>
      <div class="puff puff-3"></div>
    </div>`;
}

const LATERNE_SVG = `
      <svg class="sig-lantern-form" viewBox="0 0 60 110" aria-hidden="true">
        <rect x="20" y="4" width="20" height="6" rx="2" fill="#8a4a1c"></rect>
        <ellipse cx="30" cy="14" rx="16" ry="5" fill="#8a4a1c"></ellipse>
        <path d="M14,16 C4,30 4,60 14,80 C20,90 40,90 46,80 C56,60 56,30 46,16 Z" fill="#e2461f"></path>
        <path d="M20,18 C12,32 12,62 20,78" stroke="#b23414" stroke-width="1.5" fill="none"></path>
        <path d="M30,16 C24,32 24,64 30,84" stroke="#b23414" stroke-width="1.5" fill="none"></path>
        <path d="M40,18 C48,32 48,62 40,78" stroke="#b23414" stroke-width="1.5" fill="none"></path>
        <ellipse class="glow" cx="30" cy="48" rx="10" ry="18" fill="#ffd27a" opacity=".6"></ellipse>
        <ellipse cx="30" cy="82" rx="16" ry="5" fill="#8a4a1c"></ellipse>
        <rect x="20" y="88" width="20" height="6" rx="2" fill="#8a4a1c"></rect>
        <line x1="30" x2="30" y1="94" y2="104" stroke="#8a4a1c" stroke-width="2"></line>
        <circle cx="30" cy="106" r="4" fill="#8a4a1c"></circle>
      </svg>`;

function heroLanternGlow() {
  return `
    <div class="sig sig-lanterns" aria-hidden="true">
      <div class="laterne">${LATERNE_SVG}</div>
      <div class="laterne">${LATERNE_SVG}</div>
    </div>`;
}

function heroBeerFoamOverflow() {
  return `
    <div class="sig sig-beer" aria-hidden="true">
      <svg class="sig-beer-glas" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17 2a2 2 0 0 1 1.995 1.85L19 4v4c0 1.335-.229 2.386-.774 3.692l-.157.363l-.31.701a8.9 8.9 0 0 0-.751 3.242l-.008.377V20a2 2 0 0 1-1.85 1.995L15 22H9a2 2 0 0 1-1.995-1.85L7 20v-3.625c0-1.132-.21-2.25-.617-3.28l-.142-.34l-.31-.699c-.604-1.358-.883-2.41-.925-3.698L5 8V4a2 2 0 0 1 1.85-1.995L7 2z"></path>
      </svg>
      <div class="schaum"></div>
      <span class="tropfen tropfen-1"></span>
      <span class="tropfen tropfen-2"></span>
    </div>`;
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

  // Das Sushi-Band gehört zu Japan.
  if (cuisine === "japanisch") {
    if (gerichte.length < 3) return "";
    const bilder = gerichte.slice(0, 5);
    // Doppelt ausgeben, damit der Umlauf ohne Sprung schließt.
    const kette = [...bilder, ...bilder]
      .map((g) => `<img src="${esc(bild(g.bild, "gericht", bildUrl))}" alt="">`)
      .join("");
    return `<div class="sig sig-band" aria-hidden="true"><div class="band">${kette}</div></div>`;
  }

  // Die panasiatische Sammelkategorie bekommt Laternen am Rand statt des
  // Sushi-Bands – rein dekorativ, deshalb ohne Abhängigkeit von Gerichtsfotos.
  if (cuisine === "asiatisch") {
    return heroLanternGlow();
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

  // Die wechselnde Tagesempfehlung trägt beim Wirtshaus den Braten.
  if (cuisine === "bayerisch") {
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
    return `<div class="sig sig-tafel" aria-hidden="true">${karten}</div>${heroBeerFoamOverflow()}`;
  }

  // Ein Wölkchen aus Gewürzpuder platzt auf, sobald der Hero ins Bild
  // scrollt – rein dekorativ, deshalb ohne Abhängigkeit von Gerichtsfotos.
  if (cuisine === "indisch") {
    return heroSpicePuff();
  }

  if (cuisine === "griechisch") {
    if (gerichte.length < 3) return "";
    const bilder = gerichte
      .slice(0, 3)
      .map((g) => `<img src="${esc(bild(g.bild, "gericht", bildUrl))}" alt="">`)
      .join("");
    return `<div class="sig sig-diashow" aria-hidden="true">${bilder}</div>`;
  }

  // Eine Orchidee, die beim Sichtbarwerden des Heros aufblüht – rein
  // dekorativ, deshalb ohne Abhängigkeit von Gerichtsfotos.
  if (cuisine === "thailaendisch") {
    return heroOrchidBloom();
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
