// Drei Gestaltungswelten statt zufälliger Farbkombinationen: Die Küche
// bestimmt das Theme, das Layout bleibt überall gleich. Innerhalb eines
// Themes sorgen mehrere Akzentvarianten dafür, dass zwei Nachbarlokale
// derselben Küche trotzdem unterschiedlich wirken.

const SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const THEMES = {
  trattoria: {
    label: "Trattoria",
    dark: false,
    display: "'Playfair Display', Georgia, 'Times New Roman', serif",
    body: SANS,
    displayTransform: "none",
    displayTracking: "-0.01em",
    radius: "16px",
    basis: {
      bg: "#fdfaf5",
      surface: "#ffffff",
      ink: "#2a211a",
      inkSoft: "#6f6154",
      line: "#e9dfd1",
      soft: "#f6eee3",
    },
    varianten: [
      { name: "terracotta", accent: "#b4451f", accentDark: "#8d3416", onAccent: "#ffffff", gold: "#c1872c", tint: "#2e2018", tintRgb: "46,32,24" },
      { name: "olive", accent: "#5f7042", accentDark: "#46542f", onAccent: "#ffffff", gold: "#c1872c", tint: "#262b1c", tintRgb: "38,43,28" },
      { name: "wein", accent: "#8c2f39", accentDark: "#6d222b", onAccent: "#ffffff", gold: "#c39b3f", tint: "#2b171a", tintRgb: "43,23,26" },
    ],
  },

  neoasian: {
    label: "Neo-Asian",
    dark: true,
    display: "'Montserrat', 'Inter', Helvetica, Arial, sans-serif",
    body: SANS,
    displayTransform: "uppercase",
    displayTracking: "0.01em",
    radius: "6px",
    basis: {
      bg: "#0f1012",
      surface: "#17181c",
      ink: "#f4f4f6",
      inkSoft: "#a0a0ac",
      line: "#2a2b33",
      soft: "#141519",
    },
    varianten: [
      { name: "neonrot", accent: "#e8383d", accentDark: "#c02a2f", onAccent: "#ffffff", gold: "#d9a441", tint: "#08090b", tintRgb: "8,9,11" },
      { name: "gold", accent: "#d4a437", accentDark: "#b08722", onAccent: "#1a1206", gold: "#d4a437", tint: "#0a0a0c", tintRgb: "10,10,12" },
      { name: "orange", accent: "#f36d1f", accentDark: "#cc5512", onAccent: "#1a0d05", gold: "#e3a13a", tint: "#0b0a0a", tintRgb: "11,10,10" },
    ],
  },

  wirtshaus: {
    label: "Wirtshaus",
    dark: false,
    display: "'Merriweather', Georgia, 'Times New Roman', serif",
    body: SANS,
    displayTransform: "none",
    displayTracking: "-0.005em",
    radius: "12px",
    basis: {
      bg: "#fbf8f2",
      surface: "#ffffff",
      ink: "#241f18",
      inkSoft: "#675b4c",
      line: "#e6dccb",
      soft: "#f4efe4",
    },
    varianten: [
      { name: "waldgruen", accent: "#3f5d3a", accentDark: "#2d452a", onAccent: "#ffffff", gold: "#b8862f", tint: "#1e2a1c", tintRgb: "30,42,28" },
      { name: "dunkelrot", accent: "#8a2f2a", accentDark: "#6b231f", onAccent: "#ffffff", gold: "#b8862f", tint: "#2a1816", tintRgb: "42,24,22" },
      { name: "holz", accent: "#9a6428", accentDark: "#7a4e1c", onAccent: "#ffffff", gold: "#c08a33", tint: "#2b2013", tintRgb: "43,32,19" },
    ],
  },
};

export const CUISINE_THEMES = {
  italienisch: "trattoria",
  griechisch: "trattoria",
  cafe: "trattoria",
  asiatisch: "neoasian",
  tuerkisch: "neoasian",
  bayerisch: "wirtshaus",
};

export function themeNameForCuisine(cuisine) {
  return CUISINE_THEMES[cuisine] ?? "wirtshaus";
}

/**
 * Setzt Theme und Akzentvariante zu einem fertigen Satz CSS-Werte zusammen.
 */
export function resolveTheme(cuisine, variantIndex = 0) {
  const themeName = themeNameForCuisine(cuisine);
  const theme = THEMES[themeName];
  const variante = theme.varianten[variantIndex % theme.varianten.length];

  return {
    themeName,
    label: theme.label,
    dark: theme.dark,
    varianteName: variante.name,
    display: theme.display,
    body: theme.body,
    displayTransform: theme.displayTransform,
    displayTracking: theme.displayTracking,
    radius: theme.radius,
    ...theme.basis,
    ...variante,
  };
}
