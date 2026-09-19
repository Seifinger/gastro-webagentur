// Konfigurationsgetriebenes "Design Feature Model" für den
// Landing-Page-Generator. Jede Küche bekommt eine "default"-Variante, die
// exakt dem bisherigen, fest verdrahteten Verhalten von
// landingPageGenerator.js und heroSignature.js entspricht – ein Aufruf ohne
// Preset-Angabe ändert also nichts am bestehenden Ergebnis. Zusätzliche
// benannte Varianten pro Küche ermöglichen A/B-Tests über
// getPresetVariant(cuisineKey, variantName).

// Diese Werte spiegeln 1:1 das bisherige Verhalten wider:
// - hero.type "signature": das bewegte, küchenspezifische Element aus
//   heroSignature.js (bisher die einzige Möglichkeit).
// - hero.primaryAction "order": "Zur Abholung bestellen" steht im Hero und
//   in der mobilen Aktionsleiste zuerst / prominenter als "Reservieren".
// - header.sticky true: die Kopfzeile bleibt beim Scrollen fest über der Seite.
// - layout.sectionOrder: die bisherige feste Reihenfolge der Hauptsektionen.
// - menu.layout "accordion": bisher die einzige Darstellung der Speisekarte.
// - menu.showBadges true: das "vegetarisch"-Abzeichen wird gezeigt.
// - reservation.widgetVariant "inline-form": bisher die einzige Umsetzung
//   des Reservierungsformulars.
// - social.layout "grid-3": dreispaltiges Raster der Gästestimmen.
// - mobile.stickyActionBar true: feste Aktionsleiste am unteren Bildschirmrand.
const BASE_DEFAULT = {
  hero: {
    type: "signature",
    primaryAction: "order",
  },
  header: {
    sticky: true,
  },
  layout: {
    sectionOrder: ["highlights", "karte", "ambiente", "stimmen", "reservierung", "kontakt"],
    // "standard" ist das bisherige, gleichmäßige Raster. "asymmetric" ist das
    // Magazin-Raster des Editorial-Archetyps (versetzte Spalten, Vollbild).
    // Additiv: Wer das Feld nicht kennt, bekommt weiter das bisherige Raster.
    gridStyle: "standard",
    // Die "Handschrift" eines Archetyps: der eine starke Moment plus die Ruhe
    // drumherum, die ihn sichtbar macht, dazu die begründeten Asymmetrien und
    // die gezeichneten Zeichen (siehe styles/handschrift.css.js und
    // docs-intern/design-tokens/). null heißt: nichts davon – exakt die
    // bisherige Ausgabe. Nur ARCHETYP_PRESET setzt hier einen Wert; ein Preset
    // aus DESIGN_PRESETS (A/B-Variante) bleibt davon unberührt.
    handschrift: null,
  },
  // Die Schriftgrößen-Stufe. Sie hängt am Archetyp, nicht an der Küche: Wie
  // groß eine Überschrift auftritt, ist eine Frage der Haltung des Hauses,
  // nicht seiner Speisekarte. "standard" ist exakt die bisherige Skala und
  // gibt gar kein zusätzliches CSS aus.
  typography: {
    scale: "standard",
  },
  menu: {
    layout: "accordion",
    showBadges: true,
  },
  reservation: {
    widgetVariant: "inline-form",
  },
  social: {
    layout: "grid-3",
  },
  mobile: {
    stickyActionBar: true,
  },
};

/**
 * Baut ein vollständiges Preset aus Überschreibungen gegenüber BASE_DEFAULT.
 * Fehlt ein Feld (oder eine ganze Feldgruppe) in den Überschreibungen, bleibt
 * dort der bisherige Standardwert stehen – genau der Fallback, den
 * landingPageGenerator.js braucht, wenn ein Preset-Feld fehlt.
 */
export function withDesignDefaults(overrides = {}) {
  return {
    hero: { ...BASE_DEFAULT.hero, ...overrides.hero },
    header: { ...BASE_DEFAULT.header, ...overrides.header },
    layout: { ...BASE_DEFAULT.layout, ...overrides.layout },
    menu: { ...BASE_DEFAULT.menu, ...overrides.menu },
    reservation: { ...BASE_DEFAULT.reservation, ...overrides.reservation },
    social: { ...BASE_DEFAULT.social, ...overrides.social },
    mobile: { ...BASE_DEFAULT.mobile, ...overrides.mobile },
    typography: { ...BASE_DEFAULT.typography, ...overrides.typography },
  };
}

const DEFAULT_VARIANT = "default";

/**
 * Ein Preset-Objekt pro Küche (12 Stück), jeweils mit der Standardvariante
 * (identisch zum bisherigen Verhalten) und mindestens einer alternativen
 * Variante für A/B-Tests. Die alternativen Varianten sind bewusst so
 * gewählt, dass sie zur jeweiligen Küche passen (z. B. eine Reservierungs-
 * betonte Variante für Häuser, bei denen der Tisch im Vordergrund steht).
 */
export const DESIGN_PRESETS = {
  bayerisch: {
    [DEFAULT_VARIANT]: withDesignDefaults(),
    "reservation-first": withDesignDefaults({ hero: { primaryAction: "reservation" } }),
    // Schlanke Variante ohne feste Elemente – zeigt alle steuerbaren Felder
    // auf einmal (u. a. andere Sektionsreihenfolge: Karte vor Highlights).
    minimal: withDesignDefaults({
      header: { sticky: false },
      mobile: { stickyActionBar: false },
      social: { layout: "list" },
      menu: { showBadges: false },
      layout: { sectionOrder: ["karte", "highlights", "ambiente", "stimmen", "reservierung", "kontakt"] },
    }),
  },
  italienisch: {
    [DEFAULT_VARIANT]: withDesignDefaults(),
    "photo-hero": withDesignDefaults({ hero: { type: "dish_photo" } }),
  },
  griechisch: {
    [DEFAULT_VARIANT]: withDesignDefaults(),
    "ambience-first": withDesignDefaults({ hero: { type: "ambience_photo" } }),
  },
  tuerkisch: {
    [DEFAULT_VARIANT]: withDesignDefaults(),
    "photo-hero": withDesignDefaults({ hero: { type: "dish_photo" } }),
  },
  syrisch: {
    [DEFAULT_VARIANT]: withDesignDefaults(),
    "ambience-first": withDesignDefaults({ hero: { type: "ambience_photo" } }),
  },
  chinesisch: {
    [DEFAULT_VARIANT]: withDesignDefaults(),
    "photo-hero": withDesignDefaults({ hero: { type: "dish_photo" } }),
  },
  thailaendisch: {
    [DEFAULT_VARIANT]: withDesignDefaults(),
    "ambience-first": withDesignDefaults({ hero: { type: "ambience_photo" } }),
  },
  vietnamesisch: {
    [DEFAULT_VARIANT]: withDesignDefaults(),
    "photo-hero": withDesignDefaults({ hero: { type: "dish_photo" } }),
  },
  japanisch: {
    [DEFAULT_VARIANT]: withDesignDefaults(),
    // Omakase-Häuser leben vom reservierten Tisch, nicht von der Abholung.
    "reservation-first": withDesignDefaults({
      hero: { type: "reservation_hero", primaryAction: "reservation" },
    }),
  },
  indisch: {
    [DEFAULT_VARIANT]: withDesignDefaults(),
    "photo-hero": withDesignDefaults({ hero: { type: "dish_photo" } }),
  },
  asiatisch: {
    [DEFAULT_VARIANT]: withDesignDefaults(),
    "ambience-first": withDesignDefaults({ hero: { type: "ambience_photo" } }),
  },
  cafe: {
    [DEFAULT_VARIANT]: withDesignDefaults(),
    "ambience-first": withDesignDefaults({ hero: { type: "ambience_photo" } }),
  },
};

/**
 * Das Layout je Archetyp – einmal definiert und von allen zwölf Küchen
 * genutzt. Eine Stimmung nennt nur ihren Archetyp (siehe stimmungen.js), die
 * Küche steuert Farbe, Schrift und Bilder bei. Ohne diese Trennung wären es
 * 36 Layout-Definitionen statt drei.
 *
 * Die Hero-Signatur bleibt in allen dreien erhalten: Sie gehört der Küche,
 * nicht der Stimmung, und ist das einzige bewegte Element der Seite.
 */
export const ARCHETYP_PRESET = {
  // Das Haus, das es schon gab. Layout wie bisher; dazu die eigene
  // Handschrift: eine einzige Bewegung (die Hero-Signatur), die Treppe in den
  // Highlights, die Menütafel, das Stimmenblatt und die gezeichneten Zeichen.
  traditionell: withDesignDefaults({ layout: { handschrift: "traditionell" } }),

  // Das Abendhaus lebt vom reservierten Tisch, nicht von der Abholung. Das
  // Ambiente rückt nach vorn: Wer abends auswählt, entscheidet über den Raum,
  // bevor er die Karte liest. Die Stimmen stehen untereinander statt im
  // Raster – ruhiger, passend zur dunklen Welt.
  abend: withDesignDefaults({
    hero: { primaryAction: "reservation" },
    layout: { sectionOrder: ["ambiente", "karte", "highlights", "stimmen", "reservierung", "kontakt"] },
    social: { layout: "list" },
  }),

  // Das helle Haus wird unterwegs auf dem Handy überflogen: Karte zuerst,
  // keine mitscrollende Kopfzeile. Die feste Aktionsleiste unten bleibt – sie
  // ist auf dem Handy der Weg zur Bestellung.
  hell: withDesignDefaults({
    header: { sticky: false },
    layout: { sectionOrder: ["karte", "highlights", "ambiente", "stimmen", "reservierung", "kontakt"] },
  }),

  // Das Magazin. Hier führt nicht die Bestellung, sondern das Bild: ein
  // Vollbild-Hero mit zeilenweise auftretender Überschrift, danach die
  // Highlights im versetzten Raster. Die Karte folgt direkt darauf – wer sich
  // von einem Bild locken lässt, will als Nächstes wissen, was es gibt.
  //
  // Die Aktionsleiste unten und die feste Kopfzeile bleiben: Das Magazin ist
  // eine Gestaltung, kein Verzicht auf den Bestellweg.
  editorial: withDesignDefaults({
    hero: { type: "editorial", primaryAction: "reservation" },
    layout: {
      gridStyle: "asymmetric",
      sectionOrder: ["highlights", "karte", "ambiente", "stimmen", "reservierung", "kontakt"],
    },
    typography: { scale: "gross" },
    social: { layout: "list" },
  }),
};

const FALLBACK_ARCHETYP = "traditionell";

/**
 * Layout einer Stimmung. Ein unbekannter Archetyp fällt auf das bisherige
 * Verhalten zurück, statt die Seite ohne Layout zu lassen.
 */
export function presetFuerArchetyp(archetyp) {
  return ARCHETYP_PRESET[archetyp] ?? ARCHETYP_PRESET[FALLBACK_ARCHETYP];
}

const FALLBACK_CUISINE = "bayerisch";

/**
 * Liefert das Design-Preset einer Küche in einer bestimmten Variante –
 * Grundlage für A/B-Tests: dieselbe Küche lässt sich mit einem anderen
 * variantName in einer anderen Gestaltung ausgeben. Unbekannte Küchen fallen
 * auf "bayerisch" zurück (wie schon in menuCatalog.js), unbekannte
 * Variantennamen auf "default" – so bricht ein Tippfehler nie den Aufbau der
 * Seite.
 */
export function getPresetVariant(cuisineKey, variantName = DEFAULT_VARIANT) {
  const cuisinePresets = DESIGN_PRESETS[cuisineKey] ?? DESIGN_PRESETS[FALLBACK_CUISINE];
  return cuisinePresets[variantName] ?? cuisinePresets[DEFAULT_VARIANT];
}
