import { loadRegions } from "./config.js";
import { searchRestaurants } from "./placesClient.js";
import { toLead, dedupeAndPrioritize } from "./leadFilter.js";
import { writeLeadsCsv } from "./csvExport.js";

function parseArgs(argv) {
  const args = { region: null, limit: null, pages: 1 };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--region") args.region = argv[++i];
    if (argv[i] === "--limit") args.limit = Number(argv[++i]);
    if (argv[i] === "--pages") args.pages = Number(argv[++i]);
  }
  return args;
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

    let leads = dedupeAndPrioritize(places.map((place) => toLead(place, region)));
    if (args.limit) leads = leads.slice(0, args.limit);

    const ohneWebsite = leads.filter((lead) => !lead.hatWebsite).length;
    console.log(`  ${leads.length} Treffer, davon ${ohneWebsite} ohne Website.`);

    const filePath = writeLeadsCsv(leads, region);
    console.log(`  ✅ Ergebnis gespeichert: ${filePath}`);
  }
}

run().catch((error) => {
  console.error("Unerwarteter Fehler:", error);
  process.exitCode = 1;
});
