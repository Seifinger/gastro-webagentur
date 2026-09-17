import { loadRegions } from "./config.js";
import { searchRestaurants } from "./placesClient.js";
import { toLead, dedupeLeads } from "./leadFilter.js";
import { analyzeWebsites } from "./websiteAnalyzer.js";
import { scoreLead, sortByPriority } from "./scoring.js";
import { writeLeadsCsv } from "./csvExport.js";

function parseArgs(argv) {
  const args = { region: null, limit: null, pages: 1, skipWebsiteCheck: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--region") args.region = argv[++i];
    if (argv[i] === "--limit") args.limit = Number(argv[++i]);
    if (argv[i] === "--pages") args.pages = Number(argv[++i]);
    if (argv[i] === "--skip-website-check") args.skipWebsiteCheck = true;
  }
  return args;
}

async function scoreAllLeads(leads, { skipWebsiteCheck }) {
  const leadsWithWebsite = leads.filter((lead) => lead.hatWebsite);

  let analysisByPlaceId = new Map();
  if (!skipWebsiteCheck && leadsWithWebsite.length > 0) {
    console.log(`  🌐 Prüfe ${leadsWithWebsite.length} bestehende Website(s) ...`);
    const analyses = await analyzeWebsites(leadsWithWebsite.map((lead) => lead.website));
    analysisByPlaceId = new Map(
      leadsWithWebsite.map((lead, i) => [lead.placeId, analyses[i]]),
    );
  }

  return leads.map((lead) => scoreLead(lead, analysisByPlaceId.get(lead.placeId)));
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const regions = args.region ? [args.region] : loadRegions();

  for (const region of regions) {
    console.log(`\n🔎 Suche Restaurants in "${region}" ...`);

    let places;
    try {
      places = await searchRestaurants(region, { maxPages: args.pages });
    } catch (error) {
      console.error(`  ⚠️  Fehler bei "${region}": ${error.message}`);
      continue;
    }

    const leads = dedupeLeads(places.map((place) => toLead(place, region)));
    let scoredLeads = sortByPriority(
      await scoreAllLeads(leads, { skipWebsiteCheck: args.skipWebsiteCheck }),
    );
    if (args.limit) scoredLeads = scoredLeads.slice(0, args.limit);

    const sehrHoch = scoredLeads.filter((lead) => lead.score >= 80).length;
    console.log(
      `  ${scoredLeads.length} Treffer, davon ${sehrHoch} mit Priorität "Sehr hoch".`,
    );

    const filePath = writeLeadsCsv(scoredLeads, region);
    console.log(`  ✅ Ergebnis gespeichert: ${filePath}`);
  }
}

run().catch((error) => {
  console.error("Unerwarteter Fehler:", error);
  process.exitCode = 1;
});
