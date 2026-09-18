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
