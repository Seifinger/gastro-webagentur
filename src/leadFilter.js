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
 * Entfernt Duplikate (z.B. wenn sich Suchregionen überschneiden) anhand der placeId.
 * Die Priorisierung selbst übernimmt scoring.js, nachdem die Websites geprüft wurden.
 */
export function dedupeLeads(leads) {
  const seen = new Map();
  for (const lead of leads) {
    if (lead.placeId && !seen.has(lead.placeId)) {
      seen.set(lead.placeId, lead);
    }
  }
  return [...seen.values()];
}
