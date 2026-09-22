import { createRoot } from "react-dom/client";
import { Player } from "@remotion/player";
import { RemotionSignature, ZEICHNEN_PRO_PFAD, VERSATZ, letzterPfadFertig } from "./RemotionSignature.jsx";

const FPS = 30;
// Nach dem letzten Strich noch Platz für das Einrasten plus eine kurze Ruhe,
// bevor der Player anhält – siehe RemotionSignature.jsx.
const EINRASTEN_UND_RUHE = 34;
const MINDESTDAUER = 60;

/**
 * Hängt einen Remotion-Player in einen `.remotion-mount`-Container. Die
 * Striche kommen nicht aus einem zweiten Datensatz, sondern direkt aus dem
 * serverseitig gerenderten `<svg>`, das `kuechenMarke()` schon in die Seite
 * geschrieben hat (siehe landingPageGenerator.js) – dieselben `d`-Attribute,
 * keine Drift möglich. Diese statische Fassung bleibt im DOM stehen, nur
 * unsichtbar geschaltet: Schlägt das Bundle fehl oder lädt JavaScript gar
 * nicht erst, steht die fertig gezeichnete Marke da, so wie überall sonst
 * auf der Seite.
 */
function montiere(el) {
  const svg = el.querySelector("svg");
  if (!svg) return;
  const paths = [...svg.querySelectorAll("path")].map((p) => p.getAttribute("d")).filter(Boolean);
  if (!paths.length) return;

  // Die Farbe kommt nicht als eigens mitgegebenes Attribut, sondern aus
  // demselben currentColor, den auch die statische Marke schon trägt (siehe
  // signaturIcons.js: stroke="currentColor", gesetzt über die umgebende CSS-
  // Regel, z. B. .hl-siegel { color: var(--accent-bold) }). Ein
  // data-accent bleibt als Notlösung möglich, ist aber im Normalfall
  // überflüssig – dieselbe Kaskade, die die statische Marke schon richtig
  // einfärbt, färbt auch die animierte.
  const accent = el.dataset.accent || getComputedStyle(svg).color || "#2b2a1f";
  const dauer = Math.max(MINDESTDAUER, letzterPfadFertig(paths.length) + EINRASTEN_UND_RUHE);

  const buehne = document.createElement("div");
  buehne.className = "remotion-stage";
  // position:absolute + inset:0 statt width/height:100% – ein Prozentwert
  // bekam in einem inline-flex-Elternelement (.remotion-mount) keine
  // aufgelöste Breite (0px), obwohl die Höhe korrekt stimmte. Der Player
  // rechnete daraufhin mit einer 0×0-Bühne und rendert seine Komposition
  // dann in ihrer vollen, unskalierten Größe irgendwo auf der Seite statt
  // im Siegel. Absolute Positionierung gegen ein position:relative-Elternteil
  // mit fester em-Größe ist eindeutig, keine Flex-Prozentrechnung nötig.
  buehne.style.position = "absolute";
  buehne.style.inset = "0";
  el.appendChild(buehne);
  svg.style.visibility = "hidden";

  createRoot(buehne).render(
    <Player
      ref={(spieler) => spieler?.mute()} // keine Tonspur in der Komposition – stumm, statt den Autoplay-Ton-Hinweis zu riskieren
      component={RemotionSignature}
      inputProps={{ paths, accent }}
      durationInFrames={dauer}
      fps={FPS}
      compositionWidth={112}
      compositionHeight={112}
      style={{ width: "100%", height: "100%" }}
      autoPlay
      loop={false}
      // Ohne das hier springt der Player nach dem letzten Frame auf den
      // ersten zurück (Remotion-Standard) – die Marke stünde am Ende wieder
      // ungezeichnet da. Genau das Gegenteil von "eine Bewegung, dann Ruhe".
      moveToBeginningWhenEnded={false}
      controls={false}
      clickToPlay={false}
      showVolumeControls={false}
      doubleClickToFullscreen={false}
      allowFullscreen={false}
    />,
  );
}

function starten() {
  // Wer Bewegung abgestellt hat, bekommt keine – dieselbe Regel wie überall
  // sonst auf der Seite (siehe motion.js). Die serverseitig schon fertig
  // gezeichnete Marke bleibt dann einfach stehen.
  const reduziert = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduziert) return;
  document.querySelectorAll(".remotion-mount").forEach(montiere);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", starten);
} else {
  starten();
}

export { ZEICHNEN_PRO_PFAD, VERSATZ };
