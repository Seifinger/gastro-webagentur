// Punktevergabe: je mehr Punkte, desto dringender braucht das Restaurant unser Angebot.
// "Keine Website" ist immer der stärkste Fall (Punkte fix auf 100).
// Bei vorhandener Website werden Minuspunkte für fehlende/schlechte Merkmale addiert -
// maximal ebenfalls 100, wenn eine Website praktisch nichts davon bietet.
export const WEIGHTS = {
  keineBestellfunktion: 25,
  keineReservierungsfunktion: 20,
  nichtMobilfreundlich: 25,
  wirktVeraltet: 20,
  keinHttps: 10,
};

const PRIORITY_THRESHOLDS = [
  { min: 80, label: "Sehr hoch" },
  { min: 50, label: "Hoch" },
  { min: 25, label: "Mittel" },
  { min: 0, label: "Niedrig" },
];

export function priorityLabel(score) {
  return PRIORITY_THRESHOLDS.find(({ min }) => score >= min).label;
}

/**
 * Kombiniert einen Lead mit dem Ergebnis der Website-Analyse zu einem
 * bewerteten Lead (score, priorität, + Einzelmerkmale als CSV-Spalten).
 */
export function scoreLead(lead, analysis) {
  if (!lead.hatWebsite) {
    return {
      ...lead,
      score: 100,
      priorität: "Sehr hoch (keine Website)",
      websiteErreichbar: "",
      hatBestellfunktion: "",
      hatReservierungsfunktion: "",
      mobilFreundlich: "",
      wirktVeraltet: "",
    };
  }

  if (!analysis || !analysis.reachable) {
    return {
      ...lead,
      score: 0,
      priorität: "Zu prüfen (Website nicht erreichbar)",
      websiteErreichbar: false,
      hatBestellfunktion: "",
      hatReservierungsfunktion: "",
      mobilFreundlich: "",
      wirktVeraltet: "",
    };
  }

  let score = 0;
  if (!analysis.hasOrdering) score += WEIGHTS.keineBestellfunktion;
  if (!analysis.hasReservation) score += WEIGHTS.keineReservierungsfunktion;
  if (!analysis.mobileFriendly) score += WEIGHTS.nichtMobilfreundlich;
  if (analysis.outdated) score += WEIGHTS.wirktVeraltet;
  if (!analysis.https) score += WEIGHTS.keinHttps;

  return {
    ...lead,
    score,
    priorität: priorityLabel(score),
    websiteErreichbar: true,
    hatBestellfunktion: analysis.hasOrdering,
    hatReservierungsfunktion: analysis.hasReservation,
    mobilFreundlich: analysis.mobileFriendly,
    wirktVeraltet: analysis.outdated,
  };
}

/**
 * Sortiert Leads nach Score absteigend. Bei Gleichstand steht "keine Website"
 * immer vor einer bestehenden (aber ebenso schlecht bewerteten) Website.
 */
export function sortByPriority(leads) {
  return [...leads].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return Number(a.hatWebsite) - Number(b.hatWebsite);
  });
}
