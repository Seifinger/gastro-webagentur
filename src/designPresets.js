// Design-Feature-Model: pro Küche eine Handvoll Stellschrauben, die die
// generierte Landingpage sichtbar unterscheiden – Menü-Layout, Social-Proof-
// Darstellung, Header/Hero-Details. Inspiriert an realen Referenzseiten der
// jeweiligen Küche (siehe Planungsnotizen), aber bewusst grob genug, dass
// neue Küchen später einfach ergänzt werden können.
//
// "italienisch" und "bayerisch" bleiben absichtlich bei layout: "list" – die
// bestehenden Tests prüfen für beide Küchen konkret die Akkordeon-Karte.

export const DEFAULT_PRESET = {
  hero: { type: "classic", primaryAction: "Zur Abholung bestellen", secondaryAction: "Tisch reservieren" },
  header: { sticky: true, ctaButton: "Tisch reservieren", phoneVisible: true, trustStrip: true },
  layout: { sectionOrder: ["highlights", "karte", "ambiente", "stimmen", "reservierung", "kontakt"], sectionSpacing: "normal" },
  menu: { layout: "list", showBadges: true, highlightMostLoved: false },
  reservation: { widgetVariant: "inline", externalSystem: null },
  ordering: { enabled: true, mode: "pickup", ctaPlacement: "hero" },
  social: { layout: "grid", includeRatingStrip: true },
  mobile: { stickyActionBar: true },
};

export const designPresets = {
  bayerisch: {
    hero: { type: "classic", primaryAction: "Zur Abholung bestellen", secondaryAction: "Tisch reservieren" },
    header: { sticky: true, ctaButton: "Tisch reservieren", phoneVisible: true, trustStrip: true },
    layout: { sectionOrder: ["highlights", "karte", "ambiente", "stimmen", "reservierung", "kontakt"], sectionSpacing: "normal" },
    menu: { layout: "list", showBadges: true, highlightMostLoved: false },
    reservation: { widgetVariant: "inline", externalSystem: null },
    ordering: { enabled: true, mode: "pickup", ctaPlacement: "hero" },
    social: { layout: "grid", includeRatingStrip: true },
    mobile: { stickyActionBar: true },
  },

  italienisch: {
    // Orientiert an L'Osteria / Limoni: warme Bildsprache, Reservierung
    // prominent im Hero. Menü bleibt bewusst als Akkordeon (Testabdeckung).
    hero: { type: "classic", primaryAction: "Zur Abholung bestellen", secondaryAction: "Tisch reservieren" },
    header: { sticky: true, ctaButton: "Tavolo reservieren", phoneVisible: true, trustStrip: true },
    layout: { sectionOrder: ["highlights", "karte", "ambiente", "stimmen", "reservierung", "kontakt"], sectionSpacing: "normal" },
    menu: { layout: "list", showBadges: true, highlightMostLoved: true },
    reservation: { widgetVariant: "hero_widget", externalSystem: null },
    ordering: { enabled: true, mode: "pickup", ctaPlacement: "hero" },
    social: { layout: "carousel", includeRatingStrip: true },
    mobile: { stickyActionBar: true },
  },

  asiatisch: {
    hero: { type: "classic", primaryAction: "Zur Abholung bestellen", secondaryAction: "Tisch reservieren" },
    header: { sticky: true, ctaButton: "Tisch reservieren", phoneVisible: true, trustStrip: true },
    layout: { sectionOrder: ["highlights", "karte", "ambiente", "stimmen", "reservierung", "kontakt"], sectionSpacing: "normal" },
    menu: { layout: "card", showBadges: true, highlightMostLoved: true },
    reservation: { widgetVariant: "inline", externalSystem: null },
    ordering: { enabled: true, mode: "pickup", ctaPlacement: "hero" },
    social: { layout: "carousel", includeRatingStrip: true },
    mobile: { stickyActionBar: true },
  },

  chinesisch: {
    // Orientiert an seen / yā / Jinling: reduziertere Farbwelt, Karte in
    // Kartenoptik mit Badges statt reiner Textliste.
    hero: { type: "classic", primaryAction: "Zur Abholung bestellen", secondaryAction: "Tisch reservieren" },
    header: { sticky: true, ctaButton: "Tisch reservieren", phoneVisible: true, trustStrip: true },
    layout: { sectionOrder: ["highlights", "karte", "ambiente", "stimmen", "reservierung", "kontakt"], sectionSpacing: "normal" },
    menu: { layout: "card", showBadges: true, highlightMostLoved: true },
    reservation: { widgetVariant: "hero_widget", externalSystem: null },
    ordering: { enabled: true, mode: "pickup", ctaPlacement: "hero" },
    social: { layout: "grid", includeRatingStrip: true },
    mobile: { stickyActionBar: true },
  },

  thailaendisch: {
    // Orientiert an Rabiang Thai / Spicery: dichte, bunte Kartenoptik im Grid.
    hero: { type: "classic", primaryAction: "Zur Abholung bestellen", secondaryAction: "Tisch reservieren" },
    header: { sticky: true, ctaButton: "Tisch reservieren", phoneVisible: true, trustStrip: true },
    layout: { sectionOrder: ["highlights", "karte", "ambiente", "stimmen", "reservierung", "kontakt"], sectionSpacing: "normal" },
    menu: { layout: "grid", showBadges: true, highlightMostLoved: true },
    reservation: { widgetVariant: "inline", externalSystem: null },
    ordering: { enabled: true, mode: "pickup", ctaPlacement: "hero" },
    social: { layout: "carousel", includeRatingStrip: true },
    mobile: { stickyActionBar: true },
  },

  vietnamesisch: {
    // Orientiert an Thanh: schlichter, schnellere Karte im Grid.
    hero: { type: "classic", primaryAction: "Zur Abholung bestellen", secondaryAction: "Tisch reservieren" },
    header: { sticky: true, ctaButton: "Tisch reservieren", phoneVisible: true, trustStrip: true },
    layout: { sectionOrder: ["highlights", "karte", "ambiente", "stimmen", "reservierung", "kontakt"], sectionSpacing: "normal" },
    menu: { layout: "grid", showBadges: true, highlightMostLoved: false },
    reservation: { widgetVariant: "inline", externalSystem: null },
    ordering: { enabled: true, mode: "pickup", ctaPlacement: "hero" },
    social: { layout: "grid", includeRatingStrip: true },
    mobile: { stickyActionBar: true },
  },

  tuerkisch: {
    // Orientiert an Divan / Antep: kompakte Grid-Karte, kräftige USPs.
    hero: { type: "classic", primaryAction: "Zur Abholung bestellen", secondaryAction: "Tisch reservieren" },
    header: { sticky: true, ctaButton: "Tisch reservieren", phoneVisible: true, trustStrip: true },
    layout: { sectionOrder: ["highlights", "karte", "ambiente", "stimmen", "reservierung", "kontakt"], sectionSpacing: "normal" },
    menu: { layout: "grid", showBadges: true, highlightMostLoved: true },
    reservation: { widgetVariant: "inline", externalSystem: null },
    ordering: { enabled: true, mode: "pickup", ctaPlacement: "hero" },
    social: { layout: "grid", includeRatingStrip: true },
    mobile: { stickyActionBar: true },
  },

  griechisch: {
    // Orientiert an Jannis: gesellige Grillteller, Kartenoptik mit Badges.
    hero: { type: "classic", primaryAction: "Zur Abholung bestellen", secondaryAction: "Tisch reservieren" },
    header: { sticky: true, ctaButton: "Tisch reservieren", phoneVisible: true, trustStrip: true },
    layout: { sectionOrder: ["highlights", "karte", "ambiente", "stimmen", "reservierung", "kontakt"], sectionSpacing: "normal" },
    menu: { layout: "card", showBadges: true, highlightMostLoved: true },
    reservation: { widgetVariant: "hero_widget", externalSystem: null },
    ordering: { enabled: true, mode: "pickup", ctaPlacement: "hero" },
    social: { layout: "carousel", includeRatingStrip: true },
    mobile: { stickyActionBar: true },
  },

  japanisch: {
    // Orientiert an sansaro / RAYA: reduziertes Fine-Dining-Layout, eine
    // hervorgehobene Stimme statt vieler kleiner Karten.
    hero: { type: "classic", primaryAction: "Zur Abholung bestellen", secondaryAction: "Tisch reservieren" },
    header: { sticky: true, ctaButton: "Omakase reservieren", phoneVisible: true, trustStrip: false },
    layout: { sectionOrder: ["highlights", "karte", "ambiente", "stimmen", "reservierung", "kontakt"], sectionSpacing: "reduziert" },
    menu: { layout: "list", showBadges: false, highlightMostLoved: true },
    reservation: { widgetVariant: "hero_widget", externalSystem: null },
    ordering: { enabled: true, mode: "pickup", ctaPlacement: "hero" },
    social: { layout: "featured_quote", includeRatingStrip: true },
    mobile: { stickyActionBar: true },
  },

  indisch: {
    // Orientiert an Fine-Dining-Referenzen: reduziertes Layout, hervorgehobene
    // Stimme statt Grid.
    hero: { type: "classic", primaryAction: "Zur Abholung bestellen", secondaryAction: "Tisch reservieren" },
    header: { sticky: true, ctaButton: "Tisch reservieren", phoneVisible: true, trustStrip: false },
    layout: { sectionOrder: ["highlights", "karte", "ambiente", "stimmen", "reservierung", "kontakt"], sectionSpacing: "reduziert" },
    menu: { layout: "list", showBadges: true, highlightMostLoved: true },
    reservation: { widgetVariant: "inline", externalSystem: null },
    ordering: { enabled: true, mode: "pickup", ctaPlacement: "hero" },
    social: { layout: "featured_quote", includeRatingStrip: true },
    mobile: { stickyActionBar: true },
  },

  syrisch: {
    // Mezze-Karte lebt von der Auswahl auf einen Blick -> Grid.
    hero: { type: "classic", primaryAction: "Zur Abholung bestellen", secondaryAction: "Tisch reservieren" },
    header: { sticky: true, ctaButton: "Tisch reservieren", phoneVisible: true, trustStrip: true },
    layout: { sectionOrder: ["highlights", "karte", "ambiente", "stimmen", "reservierung", "kontakt"], sectionSpacing: "normal" },
    menu: { layout: "grid", showBadges: true, highlightMostLoved: false },
    reservation: { widgetVariant: "inline", externalSystem: null },
    ordering: { enabled: true, mode: "pickup", ctaPlacement: "hero" },
    social: { layout: "grid", includeRatingStrip: true },
    mobile: { stickyActionBar: true },
  },

  cafe: {
    hero: { type: "classic", primaryAction: "Zur Abholung bestellen", secondaryAction: "Tisch reservieren" },
    header: { sticky: true, ctaButton: "Platz reservieren", phoneVisible: true, trustStrip: true },
    layout: { sectionOrder: ["highlights", "karte", "ambiente", "stimmen", "reservierung", "kontakt"], sectionSpacing: "normal" },
    menu: { layout: "grid", showBadges: false, highlightMostLoved: false },
    reservation: { widgetVariant: "inline", externalSystem: null },
    ordering: { enabled: true, mode: "pickup", ctaPlacement: "hero" },
    social: { layout: "grid", includeRatingStrip: true },
    mobile: { stickyActionBar: true },
  },
};
