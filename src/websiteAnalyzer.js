// Erkennungs-Stichwörter für gängige Bestell- und Reservierungs-Anbieter/Formulierungen.
// Bewusst als einfache Textsuche gehalten (kein Browser-Rendering nötig) - schnell und
// ohne zusätzliche Abhängigkeiten wie Playwright, damit das Skript leicht lauffähig bleibt.
const ORDERING_KEYWORDS = [
  "jetzt bestellen",
  "online bestellen",
  "essen bestellen",
  "speisen bestellen",
  "zur bestellung",
  "gloriafood",
  "lieferando",
  "lieferservice online",
  "wolt.com",
  "ubereats",
  "foodora",
  "smoothr",
  "orderbird",
];

const RESERVATION_KEYWORDS = [
  "tisch reservieren",
  "jetzt reservieren",
  "tisch buchen",
  "reservierung online",
  "opentable",
  "quandoo",
  "resmio",
  "bookatable",
  "formitable",
  "tablein",
  "aleno",
];

const VIEWPORT_PATTERN = /<meta[^>]+name=["']viewport["']/i;
const COPYRIGHT_YEAR_PATTERN = /(?:©|&copy;|copyright)\s*(\d{4})/i;
const OUTDATED_YEAR_THRESHOLD = 3; // Jahre

function containsAny(haystack, keywords) {
  return keywords.some((keyword) => haystack.includes(keyword));
}

function detectOutdatedYear(html) {
  const match = html.match(COPYRIGHT_YEAR_PATTERN);
  if (!match) return false;
  const year = Number(match[1]);
  const currentYear = new Date().getFullYear();
  return currentYear - year >= OUTDATED_YEAR_THRESHOLD;
}

/**
 * Ruft eine Website ab und prüft sie auf einfache Qualitätsmerkmale.
 * Wirft nie einen Fehler nach außen - bei Problemen (Timeout, DNS, HTTP-Fehler)
 * wird reachable: false zurückgegeben, damit ein einzelner kaputter Link nicht
 * den ganzen Lauf abbricht.
 */
export async function analyzeWebsite(url, { timeoutMs = 8000 } = {}) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadCheckBot/1.0)" },
    });

    if (!response.ok) {
      return { reachable: false };
    }

    const html = (await response.text()).toLowerCase();

    return {
      reachable: true,
      https: response.url.startsWith("https://"),
      hasOrdering: containsAny(html, ORDERING_KEYWORDS),
      hasReservation: containsAny(html, RESERVATION_KEYWORDS),
      mobileFriendly: VIEWPORT_PATTERN.test(html),
      outdated: detectOutdatedYear(html),
    };
  } catch {
    return { reachable: false };
  }
}

/**
 * Ruft mehrere Websites mit begrenzter Parallelität ab (höflich gegenüber den
 * Ziel-Servern und schneller als eine rein sequenzielle Abarbeitung).
 */
export async function analyzeWebsites(urls, { concurrency = 5 } = {}) {
  const results = new Array(urls.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < urls.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await analyzeWebsite(urls[currentIndex]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, worker);
  await Promise.all(workers);
  return results;
}
