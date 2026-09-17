import { apiKey } from "./config.js";

const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

// Wir fragen alle Felder, die wir brauchen, direkt in der Textsuche ab -
// das spart teure Extra-Anfragen pro Treffer (Places API (New) erlaubt das).
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "nextPageToken",
].join(",");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPage({ textQuery, pageToken }) {
  const body = pageToken
    ? { textQuery, pageToken }
    : { textQuery, pageSize: 20 };

  const response = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Places API Fehler (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Sucht Restaurants in einer Region über die Places API (New) Textsuche.
 * Holt bis zu maxPages Seiten à 20 Treffer (Google-Limit: max. 3 Seiten / 60 Treffer).
 */
export async function searchRestaurants(region, { maxPages = 3 } = {}) {
  if (!apiKey) {
    throw new Error(
      "GOOGLE_PLACES_API_KEY fehlt. Trage ihn in der .env-Datei ein (siehe README).",
    );
  }

  const textQuery = `Restaurants in ${region}`;
  const results = [];
  let pageToken;

  for (let page = 0; page < maxPages; page += 1) {
    const data = await fetchPage({ textQuery, pageToken });
    results.push(...(data.places ?? []));

    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
    // Google braucht ein paar Sekunden, bis ein nextPageToken aktiv wird.
    await sleep(2000);
  }

  return results;
}
