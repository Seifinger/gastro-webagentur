import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// Wie lange ein einzelner Strich zum Zeichnen braucht, und wie viel Versatz
// zum nächsten Strich dazukommt – Werte in Frames bei 30 fps. 16/7 ergibt ein
// Tempo, das wie eine Hand wirkt, die zügig zeichnet, nicht wie ein Balken,
// der lädt.
export const ZEICHNEN_PRO_PFAD = 16;
export const VERSATZ = 7;

/** Ab wann (in Frames) der letzte Strich fertig gezeichnet ist. */
export function letzterPfadFertig(anzahlPfade) {
  if (anzahlPfade <= 0) return 0;
  return (anzahlPfade - 1) * VERSATZ + ZEICHNEN_PRO_PFAD;
}

/**
 * Zeichnet eine Küchenmarke – dieselben `<path>`-Daten aus
 * `src/signaturIcons.js`, unverändert übernommen, kein zweiter Datensatz,
 * keine Drift möglich – strichweise nach, wie eine Hand sie zöge, statt sie
 * fertig einzublenden. Jeder Pfad trägt `pathLength="1"`: Damit ist die
 * Weglänge normiert und `stroke-dashoffset` braucht keine gemessene Länge je
 * Pfad, egal wie krumm oder lang er ist.
 *
 * Danach ein einziges kurzes Einrasten (spring) – die eine Bewegung, dann
 * Ruhe, wie es die anderen Archetypen dieser Seite auch halten. Keine
 * Endlosschleife: Ist der letzte Strich gezogen und eingerastet, steht das
 * Zeichen still, genau wie seine statische Fassung im übrigen Markup.
 *
 * @param {object} props
 * @param {string[]} props.paths - die `d`-Attribute der Marke.
 * @param {string} [props.accent] - Strichfarbe, kommt vom Akzentton der Küche.
 * @param {number} [props.strokeWidth]
 */
export function RemotionSignature({ paths = [], accent = "#2b2a1f", strokeWidth = 1.5 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fertigAb = letzterPfadFertig(paths.length);
  const einrasten = spring({
    frame: frame - fertigAb,
    fps,
    config: { damping: 13, mass: 0.4, stiffness: 140 },
  });
  const skalierung = interpolate(einrasten, [0, 1], [0.94, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      <svg
        viewBox="0 0 28 28"
        width="100%"
        height="100%"
        fill="none"
        stroke={accent}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transform: `scale(${skalierung})`, transformOrigin: "50% 50%" }}
      >
        {paths.map((d, i) => {
          const start = i * VERSATZ;
          const fortschritt = interpolate(frame, [start, start + ZEICHNEN_PRO_PFAD], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: (t) => t * (2 - t),
          });
          return (
            <path
              // eslint-disable-next-line react/no-array-index-key -- die Reihenfolge der Striche steht fest
              key={i}
              d={d}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - fortschritt}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}
