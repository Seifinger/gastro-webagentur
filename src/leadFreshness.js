// Die Nutzungsbedingungen der Google Maps Platform erlauben das
// Zwischenspeichern von Place-Daten (Name, Adresse, Website, ...) für
// maximal 30 Tage. Danach müssen die Daten neu abgerufen oder gelöscht werden.
export const STALE_AFTER_DAYS = 30;

// Frühwarnung, damit ein Re-Fetch vor Ablauf der Frist passiert statt erst,
// wenn ein Lead schon überfällig ist.
export const WARN_AFTER_DAYS = 25;

const MS_PRO_TAG = 1000 * 60 * 60 * 24;

/**
 * Alter eines Leads in Tagen seit fetchedAt. Fehlt der Zeitstempel (z. B. bei
 * CSVs aus der Zeit vor dieser Funktion) oder ist er nicht lesbar, gilt der
 * Lead als unbekannt alt – sicherheitshalber Infinity statt 0, damit ein
 * fehlender Zeitstempel nie als "frisch" durchgeht.
 */
export function ageInDays(lead, now = new Date()) {
  const fetchedAt = lead?.fetchedAt ? new Date(lead.fetchedAt) : null;
  if (!fetchedAt || Number.isNaN(fetchedAt.getTime())) return Infinity;
  return (now.getTime() - fetchedAt.getTime()) / MS_PRO_TAG;
}

export function isStale(lead, { maxAgeDays = STALE_AFTER_DAYS, now } = {}) {
  return ageInDays(lead, now) > maxAgeDays;
}

export function isAgingSoon(lead, { warnAfterDays = WARN_AFTER_DAYS, now } = {}) {
  return ageInDays(lead, now) >= warnAfterDays;
}

/**
 * Reichert Leads um ihr Alter (in Tagen) und den stale-Status an, ohne die
 * Originalobjekte zu verändern.
 */
export function markStaleLeads(leads, options = {}) {
  return leads.map((lead) => ({
    ...lead,
    alterTage: ageInDays(lead, options.now),
    stale: isStale(lead, options),
  }));
}

/**
 * Entfernt Leads, deren Google-Daten laut Nutzungsbedingungen nicht mehr
 * gespeichert werden dürfen – für eine automatische Aufräumroutine.
 */
export function removeStaleLeads(leads, options = {}) {
  return leads.filter((lead) => !isStale(lead, options));
}

/**
 * Leads, die überfällig sind und neu von der Places API abgerufen werden
 * müssen.
 */
export function leadsNeedingRefetch(leads, options = {}) {
  return leads.filter((lead) => isStale(lead, options));
}

/**
 * Eindeutige Regionen der überfälligen Leads – praktisch, um gezielt nur
 * diese Orte per `node src/index.js --region "..."` neu abzurufen, statt
 * alle konfigurierten Regionen erneut zu durchsuchen.
 */
export function regionsNeedingRefetch(leads, options = {}) {
  const regionen = leadsNeedingRefetch(leads, options)
    .map((lead) => lead.ort)
    .filter(Boolean);
  return [...new Set(regionen)].sort();
}
