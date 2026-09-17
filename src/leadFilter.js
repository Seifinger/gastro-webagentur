/**
 * Wandelt ein rohes Places-API-Ergebnis in einen einheitlichen Lead um
 * und markiert, ob eine Website hinterlegt ist.
 */
export function toLead(place, region) {
  return {
    name: place.displayName?.text ?? "",
    adresse: place.formattedAddress ?? "",
    telefon: place.nationalPhoneNumber ?? "",
    website: place.websiteUri ?? "",
    hatWebsite: Boolean(place.websiteUri),
    rating: place.rating ?? "",
    anzahlBewertungen: place.userRatingCount ?? "",
    placeId: place.id ?? "",
    ort: region,
  };
}

/**
 * Entfernt Duplikate (z.B. wenn sich Suchregionen überschneiden) anhand der placeId
 * und sortiert Leads ohne Website nach oben (= höchste Priorität für den Pitch).
 */
export function dedupeAndPrioritize(leads) {
  const seen = new Map();
  for (const lead of leads) {
    if (lead.placeId && !seen.has(lead.placeId)) {
      seen.set(lead.placeId, lead);
    }
  }
  return [...seen.values()].sort((a, b) => Number(a.hatWebsite) - Number(b.hatWebsite));
}
