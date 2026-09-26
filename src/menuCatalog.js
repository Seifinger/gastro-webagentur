// Google Places liefert keine Speisekarten. Für den Pitch-Entwurf wählen wir
// anhand des Restaurantnamens eine passende Beispielkarte aus, die der Wirt
// später durch seine echten Gerichte ersetzt.
//
// Gerichte mit "bild" können in der Highlights-Sektion der Landingpage
// erscheinen – dort wird nur ein Auszug der Karte gezeigt, kein volles Menü.

const CUISINE_RULES = [
  {
    cuisine: "italienisch",
    keywords: [
      "pizz", "italien", "trattoria", "osteria", "ristorante", "napoli",
      "roma", "toscana", "vesuvio", "milano", "venezia", "sapori",
    ],
  },
  // Die spezielleren Küchen stehen vor "asiatisch": ein "Sushi Bar Kyoto"
  // soll japanisch werden und nicht in der Sammelkategorie landen. Die Regeln
  // werden der Reihe nach geprüft, die erste passende gewinnt.
  {
    cuisine: "japanisch",
    keywords: [
      "sushi", "japan", "ramen", "sakura", "kyoto", "tokio", "tokyo", "osaka",
      "izakaya", "teriyaki", "wasabi", "nippon", "yakitori", "maki",
    ],
  },
  {
    cuisine: "thailaendisch",
    keywords: [
      "thai", "bangkok", "siam", "chiang", "phuket", "krabi", "isaan",
      "lemongras", "lemongrass", "wong",
    ],
  },
  {
    cuisine: "vietnamesisch",
    keywords: [
      "vietnam", "saigon", "hanoi", "pho ", "phở", "bánh", "banh mi",
      "mekong", "viet", "hoi an", "da nang",
    ],
  },
  {
    cuisine: "indisch",
    keywords: [
      "indi", "tandoor", "curry", "masala", "bombay", "mumbai", "delhi",
      "punjab", "goa", "taj", "maharaja", "namaste", "himalaya", "ganesha",
    ],
  },
  {
    cuisine: "chinesisch",
    keywords: [
      "china", "chines", "peking", "beijing", "shanghai", "szechuan",
      "sichuan", "kanton", "canton", "mandarin", "dragon", "bambus",
      "lotus", "panda", "dim sum", "ming", "jade", "wan tan", "drache",
    ],
  },
  {
    cuisine: "syrisch",
    keywords: [
      "syri", "damaskus", "damascus", "aleppo", "halab", "levante",
      "schawarma", "shawarma", "hummus", "falafel", "orient", "beirut",
      "libanes", "cedar", "zeder",
    ],
  },
  // Sammelkategorie für alles, was sich nicht genauer einordnen lässt –
  // die panasiatische Nudelbar gibt es ja wirklich.
  {
    cuisine: "asiatisch",
    keywords: ["asia", "asien", "mongol", "fusion", "bowl", "noodle", "nudelbar"],
  },
  {
    cuisine: "griechisch",
    keywords: [
      "griech", "hellas", "akropolis", "poseidon", "santorini", "mykonos",
      "olymp", "athen", "delphi", "rhodos", "kreta", "taverna",
    ],
  },
  {
    cuisine: "tuerkisch",
    keywords: [
      "döner", "doener", "kebab", "kebap", "türk", "tuerk", "istanbul",
      "anatolien", "bosporus", "antalya", "pide",
    ],
  },
  {
    cuisine: "cafe",
    keywords: ["café", "cafe", "kaffee", "konditorei", "bäckerei", "baeckerei", "eisdiele"],
  },
];

/**
 * Rät die Küche aus dem Restaurantnamen. Alle Zielregionen liegen in
 * Oberbayern, deshalb ist "bayerisch" der Standardfall.
 */
export function detectCuisine(name) {
  const haystack = String(name ?? "").toLowerCase();
  const match = CUISINE_RULES.find(({ keywords }) =>
    keywords.some((keyword) => haystack.includes(keyword)),
  );
  return match ? match.cuisine : "bayerisch";
}

export const MENUS = {
  bayerisch: {
    label: "Bayerische Wirtshausküche",
    tagline: "Bodenständig, ehrlich und frisch aus der Region",
    konzept: "Wirtshausküche & Biergarten",
    usps: ["Abholung in 20 Minuten", "Fleisch vom Metzger im Ort", "Direkt beim Wirt, ohne Vermittlungsgebühr"],
    geschichte:
      "Seit Generationen kochen wir, was hier wächst: Fleisch vom Metzger im Ort, Fisch aus heimischer Zucht und Bier aus der Region. Kein Schnickschnack – dafür Portionen, die satt machen.",
    kategorien: [
      {
        name: "Zum Anfangen",
        gerichte: [
          { name: "Obatzda mit Brezn", beschreibung: "Hausgemacht, mit roten Zwiebeln und frischer Laugenbrezn", preis: 8.5, vegetarisch: true },
          { name: "Leberknödelsuppe", beschreibung: "Kräftige Rinderbrühe, Schnittlauch", preis: 6.9 },
          { name: "Bayerischer Wurstsalat", beschreibung: "Mit Essiggurken, Zwiebeln und Bauernbrot", preis: 9.5 },
        ],
      },
      {
        name: "Hauptgerichte",
        gerichte: [
          { name: "Schweinsbraten mit Knödel", beschreibung: "Dunkle Biersoße, Semmelknödel, Krautsalat", preis: 16.9, bild: "photo-1432139555190-58524dae6a55" },
          { name: "Wiener Schnitzel vom Kalb", beschreibung: "Mit Preiselbeeren, Petersilienkartoffeln", preis: 22.5, bild: "photo-1599921841143-819065a55cc6" },
          { name: "Krustenbraten vom Schwein", beschreibung: "Knusprige Kruste, dunkle Biersoße, Kartoffelknödel", preis: 18.9, bild: "photo-1558030006-450675393462" },
          { name: "Käsespätzle", beschreibung: "Mit Bergkäse und Röstzwiebeln", preis: 13.5, vegetarisch: true },
          { name: "Grillrippchen", beschreibung: "Mit Barbecuesoße, Kartoffelwedges und Krautsalat", preis: 16.5, bild: "photo-1544025162-d76694265947" },
          { name: "Forelle Müllerin", beschreibung: "Aus heimischer Zucht, Butter, Mandeln, Salzkartoffeln", preis: 19.5, bild: "photo-1476224203421-9ac39bcb3327" },
        ],
      },
      {
        name: "Nachspeisen",
        gerichte: [
          { name: "Kaiserschmarrn", beschreibung: "Mit Apfelmus und Puderzucker", preis: 9.5, vegetarisch: true },
          { name: "Apfelstrudel", beschreibung: "Warm, mit Vanillesoße", preis: 7.5, vegetarisch: true },
        ],
      },
    ],
  },

  italienisch: {
    label: "Italienische Küche",
    tagline: "Frische Pasta, Holzofenpizza und echtes Dolce Vita",
    konzept: "Holzofenpizza & frische Pasta",
    usps: ["Heiß aus dem Steinofen", "Teig ruht 48 Stunden", "Direkt bei uns, ohne Vermittlungsgebühr"],
    geschichte:
      "Unser Teig ruht 48 Stunden, die Soßen kochen wir jeden Morgen frisch, und der Holzofen läuft, seit wir aufgesperrt haben. Rezepte aus Kalabrien – Zutaten, wo immer es geht, von hier.",
    kategorien: [
      {
        name: "Antipasti",
        gerichte: [
          { name: "Bruschetta Classica", beschreibung: "Tomaten, Basilikum, Knoblauch, Olivenöl", preis: 7.5, vegetarisch: true },
          { name: "Vitello Tonnato", beschreibung: "Kalbfleisch mit Thunfischcreme und Kapern", preis: 12.9 },
          { name: "Caprese di Bufala", beschreibung: "Büffelmozzarella, Tomaten, Basilikumpesto", preis: 10.9, vegetarisch: true },
        ],
      },
      {
        name: "Pizza aus dem Holzofen",
        gerichte: [
          { name: "Margherita", beschreibung: "Tomaten, Mozzarella, frisches Basilikum", preis: 9.9, vegetarisch: true, bild: "photo-1574071318508-1cdbab80d002" },
          { name: "Quattro Formaggi", beschreibung: "Mozzarella, Gorgonzola, Pecorino, Parmesan, Rosmarin", preis: 13.9, vegetarisch: true, bild: "photo-1513104890138-7c749659a591" },
          { name: "Salame Piccante", beschreibung: "Scharfe Salami, Mozzarella, Chili", preis: 12.5 },
          { name: "Quattro Stagioni", beschreibung: "Schinken, Champignons, Artischocken, Oliven", preis: 13.5, bild: "photo-1565299624946-b28f40a0ae38" },
          { name: "Tartufo", beschreibung: "Trüffelcreme, Parmesan, Rucola", preis: 15.9, vegetarisch: true, bild: "photo-1593560708920-61dd98c46a4e" },
        ],
      },
      {
        name: "Pasta & Dolci",
        gerichte: [
          { name: "Tagliatelle al Ragù", beschreibung: "Klassisches Ragù, 4 Stunden geschmort", preis: 14.9, bild: "photo-1551183053-bf91a1d81141", empfehlungsrolle: "hauptgericht" },
          { name: "Farfalle al Pesto", beschreibung: "Basilikumpesto, Kirschtomaten, Pinienkerne", preis: 13.9, vegetarisch: true, bild: "photo-1473093295043-cdd812d0e601", empfehlungsrolle: "hauptgericht" },
          { name: "Penne all'Arrabbiata", beschreibung: "Tomate, Knoblauch, Chili, Parmesan", preis: 12.9, vegetarisch: true, bild: "photo-1621996346565-e3dbc646d9a9", empfehlungsrolle: "hauptgericht" },
          { name: "Panna cotta mit Feigen", beschreibung: "Mit karamellisierten Feigen und Beeren", preis: 8.5, vegetarisch: true, bild: "photo-1544510808-91bcbee1df55", empfehlungsrolle: "dessert" },
          { name: "Tiramisù", beschreibung: "Hausgemacht, nach Familienrezept", preis: 7.5, vegetarisch: true, empfehlungsrolle: "dessert" },
        ],
      },
    ],
  },

  asiatisch: {
    label: "Asiatische Küche",
    tagline: "Frisch im Wok gebraten, aromatisch gewürzt",
    konzept: "Sushi, Wok & Bowls",
    usps: ["Erst auf Bestellung im Wok", "Abholung in 20 Minuten", "Direkt bei uns, ohne Vermittlungsgebühr"],
    geschichte:
      "Jedes Gericht kommt erst in den Wok, wenn Sie es bestellen – bei voller Hitze, in unter drei Minuten. So bleibt das Gemüse knackig und die Aromen frisch.",
    kategorien: [
      {
        name: "Vorspeisen",
        gerichte: [
          { name: "Frühlingsrollen (4 Stück)", beschreibung: "Mit süß-saurer Soße", preis: 6.9, vegetarisch: true },
          { name: "Ramen-Suppe", beschreibung: "Mit Ei, Garnelen und Frühlingszwiebeln", preis: 12.9, bild: "photo-1569718212165-3a8278d5f624" },
          { name: "Edamame", beschreibung: "Mit Meersalz", preis: 5.5, vegetarisch: true },
        ],
      },
      {
        name: "Aus dem Wok",
        gerichte: [
          { name: "Pad Thai mit Hähnchen", beschreibung: "Reisnudeln, Erdnüsse, Limette", preis: 14.5, bild: "photo-1559314809-0d155014e29e" },
          { name: "Rindfleisch Szechuan", beschreibung: "Scharf, mit Paprika und Bambus", preis: 16.5, bild: "photo-1504674900247-0877df9cc836" },
          { name: "Gebratener Reis mit Gemüse", beschreibung: "Mit Ei, Erbsen und Karotten", preis: 11.9, vegetarisch: true, bild: "photo-1512058564366-18510be2db19" },
          { name: "Gebratene Nudeln mit Ente", beschreibung: "Knusprige Entenbrust, Mie-Nudeln, Pak Choi", preis: 19.5, bild: "photo-1585032226651-759b368d7246" },
        ],
      },
      {
        name: "Sushi & Dessert",
        gerichte: [
          { name: "Sushi-Box (12 Stück)", beschreibung: "Gemischte Auswahl, mit Wasabi und Ingwer", preis: 18.9, bild: "photo-1553621042-f6e147245754", empfehlungsrolle: "hauptgericht" },
          { name: "Gebackene Banane", beschreibung: "Mit Honig und Vanilleeis", preis: 6.5, vegetarisch: true, empfehlungsrolle: "dessert" },
        ],
      },
    ],
  },

  griechisch: {
    label: "Griechische Küche",
    tagline: "Mediterrane Gastfreundschaft, wie am Meer",
    konzept: "Gyros, Grill & Meze",
    usps: ["Vom Holzkohlegrill", "Abholung in 20 Minuten", "Direkt bei uns, ohne Vermittlungsgebühr"],
    geschichte:
      "Bei uns wird über offener Flamme gegrillt, das Olivenöl kommt von der Familie aus dem Peloponnes, und niemand geht hungrig nach Hause. Kalí óreksi!",
    kategorien: [
      {
        name: "Vorspeisen",
        gerichte: [
          { name: "Tzatziki mit Pitabrot", beschreibung: "Joghurt, Gurke, Knoblauch", preis: 6.5, vegetarisch: true },
          { name: "Bauernsalat mit Schafskäse", beschreibung: "Tomaten, Gurke, Oliven, rote Zwiebeln, Oregano", preis: 10.9, vegetarisch: true, bild: "photo-1540189549336-e6e99c3679fe" },
          { name: "Dolmades", beschreibung: "Gefüllte Weinblätter mit Reis und Kräutern", preis: 7.5, vegetarisch: true },
        ],
      },
      {
        name: "Vom Grill",
        gerichte: [
          { name: "Gyros mit Tzatziki", beschreibung: "Mit Pommes und Salat", preis: 14.9, bild: "photo-1529006557810-274b9b2fc783" },
          { name: "Souvlaki-Spieße", beschreibung: "Schweinefilet, Reis, Zaziki", preis: 16.5, bild: "photo-1599487488170-d11ec9c172f0" },
          { name: "Bifteki gefüllt", beschreibung: "Mit Schafskäse, Kartoffeln, Salat", preis: 15.9 },
          { name: "Grillteller für 2", beschreibung: "Gyros, Souvlaki, Bifteki, Beilagen", preis: 34.9, bild: "photo-1544025162-d76694265947" },
        ],
      },
      {
        name: "Nachspeisen",
        gerichte: [
          { name: "Baklava", beschreibung: "Blätterteig mit Nüssen und Honig", preis: 6.5, vegetarisch: true },
          { name: "Joghurt mit Honig und Walnüssen", beschreibung: "Griechischer Sahnejoghurt", preis: 6.9, vegetarisch: true },
        ],
      },
    ],
  },

  tuerkisch: {
    label: "Türkische Spezialitäten",
    tagline: "Frisch vom Grill, täglich hausgemacht",
    konzept: "Döner, Grill & Hausgemachtes",
    usps: ["Drehspieß täglich frisch geschichtet", "Abholung in 15 Minuten", "Direkt bei uns, ohne Vermittlungsgebühr"],
    geschichte:
      "Der Drehspieß wird jeden Morgen von Hand geschichtet, das Fladenbrot backen wir selbst, und die Soßen rühren wir frisch an – so, wie man es aus Istanbul kennt.",
    kategorien: [
      {
        name: "Vorspeisen",
        gerichte: [
          { name: "Linsensuppe", beschreibung: "Mit Zitrone und Fladenbrot", preis: 5.5, vegetarisch: true },
          { name: "Sucuk vom Grill", beschreibung: "Türkische Knoblauchwurst", preis: 7.9 },
          { name: "Hummus mit Fladenbrot", beschreibung: "Kichererbsencreme, Olivenöl, Paprika", preis: 6.5, vegetarisch: true },
        ],
      },
      {
        name: "Vom Drehspieß & Grill",
        gerichte: [
          { name: "Döner Kebab", beschreibung: "Im Fladenbrot, mit Salat und Soße nach Wahl", preis: 7.5, bild: "photo-1529006557810-274b9b2fc783" },
          { name: "Dürüm Teller", beschreibung: "Mit Reis, Salat und Joghurtsoße", preis: 13.9, bild: "photo-1561651823-34feb02250e4" },
          { name: "Adana Kebab", beschreibung: "Scharfes Hackfleisch vom Spieß, Bulgur, Salat", preis: 15.5, bild: "photo-1599487488170-d11ec9c172f0" },
          { name: "Lahmacun", beschreibung: "Türkische Pizza mit Salat und Zitrone", preis: 6.9 },
        ],
      },
      {
        name: "Nachspeisen",
        gerichte: [
          { name: "Künefe", beschreibung: "Warmer Käsekuchen mit Sirup und Pistazien", preis: 7.5, vegetarisch: true },
          { name: "Sütlaç", beschreibung: "Türkischer Milchreis aus dem Ofen", preis: 5.9, vegetarisch: true },
        ],
      },
    ],
  },

  cafe: {
    label: "Café & Frühstück",
    tagline: "Hausgemachter Kuchen und gemütliche Stunden",
    konzept: "Frühstück, Kuchen & Kaffee",
    usps: ["Täglich frisch gebacken", "Kaffee aus regionaler Rösterei", "Alles auch zum Mitnehmen"],
    geschichte:
      "Bei uns wird jeden Morgen gebacken – und der Kaffee kommt von einer kleinen Rösterei zwei Orte weiter. Bleiben Sie, so lange Sie mögen.",
    kategorien: [
      {
        name: "Frühstück",
        gerichte: [
          { name: "Frühstück Klassik", beschreibung: "Semmeln, Butter, Marmelade, Ei, Aufschnitt", preis: 11.5, vegetarisch: true, bild: "photo-1509440159596-0249088772ff" },
          { name: "Pancakes mit Ahornsirup", beschreibung: "Mit frischer Banane und Puderzucker", preis: 9.9, vegetarisch: true, bild: "photo-1567620905732-2d1ec7ab7445" },
          { name: "Lachs-Bowl", beschreibung: "Mit Ei, Avocado, Gurke und frischem Gemüse", preis: 13.9, bild: "photo-1546069901-ba9599a7e63c" },
        ],
      },
      {
        name: "Kuchen & Torten",
        gerichte: [
          { name: "Apfelkuchen mit Sahne", beschreibung: "Nach Omas Rezept gebacken", preis: 5.5, vegetarisch: true },
          { name: "Käsesahnetorte", beschreibung: "Luftig-frisch", preis: 5.9, vegetarisch: true },
          { name: "Schokoladenkuchen", beschreibung: "Saftig, mit Zartbitterschokolade", preis: 5.5, vegetarisch: true },
        ],
      },
      {
        name: "Kaffee & Getränke",
        gerichte: [
          { name: "Cappuccino", beschreibung: "Aus regional gerösteten Bohnen", preis: 3.9, vegetarisch: true, bild: "photo-1495474472287-4d71bcdd2085" },
          { name: "Heiße Schokolade", beschreibung: "Mit Sahnehaube", preis: 4.5, vegetarisch: true },
          { name: "Frisch gepresster Orangensaft", beschreibung: "0,3 l", preis: 4.9, vegetarisch: true },
        ],
      },
    ],
  },

  chinesisch: {
    label: "Chinesische Küche",
    tagline: "Aus dem Wok, bei voller Hitze",
    konzept: "Wok, Dim Sum & Ente",
    usps: ["Erst auf Bestellung im Wok", "Abholung in 20 Minuten", "Direkt bei uns, ohne Vermittlungsgebühr"],
    geschichte:
      "Der Wok steht bei über 300 Grad. Was hineinkommt, ist in zwei Minuten fertig – deshalb wird bei uns erst gebraten, wenn Sie bestellt haben. Die Teigtaschen falten wir jeden Morgen von Hand.",
    kategorien: [
      {
        name: "Dim Sum & Vorspeisen",
        gerichte: [
          { name: "Jiaozi (8 Stück)", beschreibung: "Teigtaschen mit Schwein und Chinakohl, dazu Chili-Essig", preis: 8.9, bild: "photo-1523905330026-b8bd1f5f320e" },
          { name: "Gedämpfte Gemüsetaschen (6 Stück)", beschreibung: "Shiitake, Frühlingszwiebel, Ingwer", preis: 7.9, vegetarisch: true, bild: "photo-1496116218417-1a781b1c416c" },
          { name: "Wan-Tan-Suppe", beschreibung: "Klare Brühe, gefüllte Teigtaschen, Frühlingszwiebel", preis: 6.5 },
          { name: "Sesam-Gurken", beschreibung: "Eingelegt mit Knoblauch und Reisessig", preis: 5.5, vegetarisch: true },
        ],
      },
      {
        name: "Aus dem Wok",
        gerichte: [
          { name: "Rindfleisch Szechuan", beschreibung: "Scharf, mit Paprika, Bambus und Szechuanpfeffer", preis: 17.5, bild: "photo-1504674900247-0877df9cc836" },
          { name: "Hähnchen Gong Bao", beschreibung: "Erdnüsse, getrocknete Chili, Frühlingszwiebel", preis: 15.9 },
          { name: "Mapo Tofu", beschreibung: "Seidentofu in scharfer Bohnensoße", preis: 13.5, vegetarisch: true },
          { name: "Gebratener Reis mit Ei und Gemüse", beschreibung: "Mit Erbsen, Karotten und Frühlingszwiebel", preis: 11.9, vegetarisch: true, bild: "photo-1512058564366-18510be2db19" },
        ],
      },
      {
        name: "Ente & Nudeln",
        gerichte: [
          { name: "Knusprige Ente auf Mie-Nudeln", beschreibung: "Mit Pak Choi und Austernsoße", preis: 19.9, bild: "photo-1585032226651-759b368d7246" },
          { name: "Gebratene Nudeln Chow Mein", beschreibung: "Mit Hähnchen, Sojasprossen und Sesam", preis: 14.5 },
          { name: "Gebackene Banane", beschreibung: "Mit Honig und Sesam", preis: 6.5, vegetarisch: true },
        ],
      },
    ],
  },

  thailaendisch: {
    label: "Thailändische Küche",
    tagline: "Scharf, sauer, süß und salzig – alles in einem Gericht",
    konzept: "Curry, Wok & Street Food",
    usps: ["Schärfe nach Wunsch", "Abholung in 20 Minuten", "Direkt bei uns, ohne Vermittlungsgebühr"],
    geschichte:
      "Unsere Currypasten stampfen wir selbst im Mörser – Zitronengras, Galgant, Kaffirlimette. Sagen Sie uns einfach, wie scharf Sie es mögen; wir kochen von mild bis thailändisch-scharf.",
    kategorien: [
      {
        name: "Suppen & Salate",
        gerichte: [
          { name: "Tom Yum Goong", beschreibung: "Scharf-saure Garnelensuppe mit Zitronengras und Pilzen", preis: 8.9, bild: "photo-1455619452474-d2be8b1e70cd" },
          { name: "Tom Kha Gai", beschreibung: "Kokosmilchsuppe mit Hähnchen und Galgant", preis: 8.5 },
          { name: "Som Tam", beschreibung: "Grüner Papayasalat mit Erdnüssen und Limette", preis: 9.5, vegetarisch: true },
        ],
      },
      {
        name: "Curry",
        gerichte: [
          { name: "Grünes Curry mit Hähnchen", beschreibung: "Kokosmilch, Thai-Auberginen, Basilikum", preis: 15.5, bild: "photo-1587040690786-b091531837a2" },
          { name: "Rotes Curry mit Ente", beschreibung: "Ananas, Tomate, Kokosmilch", preis: 18.9, bild: "photo-1628432017781-49e012d769b3" },
          { name: "Massaman Curry mit Rind", beschreibung: "Mild, mit Kartoffel, Erdnuss und Zimt", preis: 17.5, bild: "photo-1618449840665-9ed506d73a34" },
          { name: "Gemüsecurry gelb", beschreibung: "Kurkuma, Kokosmilch, Saisongemüse", preis: 13.5, vegetarisch: true },
        ],
      },
      {
        name: "Wok & Dessert",
        gerichte: [
          { name: "Pad Thai mit Hähnchen", beschreibung: "Reisnudeln, Ei, Erdnüsse, Limette", preis: 14.5, bild: "photo-1559314809-0d155014e29e", empfehlungsrolle: "hauptgericht" },
          { name: "Pad Krapao", beschreibung: "Hackfleisch mit Thai-Basilikum und Spiegelei", preis: 14.9, empfehlungsrolle: "hauptgericht" },
          { name: "Mango mit Klebreis", beschreibung: "Mit Kokossoße und Sesam", preis: 7.5, vegetarisch: true, empfehlungsrolle: "dessert" },
        ],
      },
    ],
  },

  vietnamesisch: {
    label: "Vietnamesische Küche",
    tagline: "Leicht, frisch und mit viel Kräutern",
    konzept: "Phở, Bánh Mì & Sommerrollen",
    usps: ["Brühe zieht 12 Stunden", "Abholung in 20 Minuten", "Direkt bei uns, ohne Vermittlungsgebühr"],
    geschichte:
      "Die Brühe für unser Phở köchelt zwölf Stunden mit Rinderknochen, geröstetem Ingwer, Sternanis und Zimt. Das lässt sich nicht beschleunigen – deshalb setzen wir sie jeden Abend für den nächsten Tag an.",
    kategorien: [
      {
        name: "Vorspeisen",
        gerichte: [
          { name: "Sommerrollen (3 Stück)", beschreibung: "Reispapier, Garnele, Minze, Erdnusssoße", preis: 7.9 },
          { name: "Sommerrollen vegetarisch (3 Stück)", beschreibung: "Tofu, Mango, Koriander", preis: 7.5, vegetarisch: true },
          { name: "Frittierte Frühlingsrollen (4 Stück)", beschreibung: "Mit Glasnudeln und Nước-Chấm-Dip", preis: 6.9 },
        ],
      },
      {
        name: "Phở & Suppen",
        empfehlungsrolle: "hauptgericht",
        gerichte: [
          { name: "Phở Bò", beschreibung: "Rinderbrühe, Reisbandnudeln, Rinderfilet, Thai-Basilikum", preis: 15.5, bild: "photo-1597345637412-9fd611e758f3" },
          { name: "Phở Gà", beschreibung: "Hühnerbrühe, Reisbandnudeln, Hähnchen, Frühlingszwiebel", preis: 14.5, bild: "photo-1589570658214-002314b1520f" },
          { name: "Phở Chay", beschreibung: "Gemüsebrühe mit Tofu und Pilzen", preis: 13.5, vegetarisch: true, bild: "photo-1582878826629-29b7ad1cdc43" },
        ],
      },
      {
        name: "Bánh Mì & Bowls",
        gerichte: [
          { name: "Bánh Mì mit Schweinebauch", beschreibung: "Baguette, eingelegtes Gemüse, Koriander, Chili", preis: 9.9, bild: "photo-1710532774170-9844f837ae54" },
          { name: "Bánh Mì mit Zitronengras-Tofu", beschreibung: "Baguette, Gurke, eingelegte Karotte", preis: 8.9, vegetarisch: true, bild: "photo-1677354469642-3e4fc5dbbb4a" },
          { name: "Bún Bowl mit gegrilltem Schwein", beschreibung: "Reisnudeln, Kräuter, Erdnüsse, Fischsoßen-Dressing", preis: 14.9 },
          { name: "Vietnamesischer Eiskaffee", beschreibung: "Mit gesüßter Kondensmilch", preis: 4.5, vegetarisch: true, empfehlungsrolle: "getraenk" },
        ],
      },
    ],
  },

  japanisch: {
    label: "Japanische Küche",
    tagline: "Ruhig zubereitet, klar im Geschmack",
    konzept: "Sushi, Ramen & Izakaya",
    usps: ["Fisch täglich frisch", "Abholung in 20 Minuten", "Direkt bei uns, ohne Vermittlungsgebühr"],
    geschichte:
      "Reis, Fisch, Zeit – mehr braucht gutes Sushi nicht. Unser Reis wird jeden Mittag frisch gewürzt und ist nach vier Stunden verbraucht. Was übrig bleibt, kommt nicht am nächsten Tag zurück auf die Karte.",
    kategorien: [
      {
        name: "Vorspeisen",
        gerichte: [
          { name: "Edamame", beschreibung: "Mit Meersalz", preis: 5.5, vegetarisch: true },
          { name: "Gyoza (5 Stück)", beschreibung: "Gebratene Teigtaschen mit Schwein und Kohl", preis: 7.9, bild: "photo-1588166524938-1ee110d7dcef" },
          { name: "Miso-Suppe", beschreibung: "Mit Tofu, Wakame und Frühlingszwiebel", preis: 4.5, vegetarisch: true },
        ],
      },
      {
        name: "Sushi",
        gerichte: [
          { name: "Sushi-Box (12 Stück)", beschreibung: "Gemischte Auswahl, mit Wasabi und Ingwer", preis: 18.9, bild: "photo-1553621042-f6e147245754" },
          { name: "Nigiri Lachs (2 Stück)", beschreibung: "Auf handgeformtem Reis", preis: 5.5 },
          { name: "Maki Avocado-Gurke (6 Stück)", beschreibung: "Mit Sesam", preis: 6.5, vegetarisch: true },
          { name: "Chirashi-Schale", beschreibung: "Sushireis mit Sashimi und eingelegtem Gemüse", preis: 21.5 },
        ],
      },
      {
        name: "Ramen & Warmes",
        gerichte: [
          { name: "Shoyu-Ramen", beschreibung: "Sojabrühe, Ei, Chashu-Schwein, Frühlingszwiebel", preis: 14.9, bild: "photo-1569718212165-3a8278d5f624" },
          { name: "Miso-Ramen vegetarisch", beschreibung: "Mit Mais, Pilzen und Sesamöl", preis: 13.5, vegetarisch: true },
          { name: "Katsu Curry", beschreibung: "Paniertes Hähnchen, japanische Currysoße, Reis", preis: 16.5 },
          { name: "Mochi-Eis (3 Stück)", beschreibung: "Matcha, Mango, Sesam", preis: 6.5, vegetarisch: true },
        ],
      },
    ],
  },

  indisch: {
    label: "Indische Küche",
    tagline: "Gewürze, die am Morgen geröstet werden",
    konzept: "Curry, Tandoor & Biryani",
    usps: ["Gewürze täglich frisch geröstet", "Abholung in 20 Minuten", "Direkt bei uns, ohne Vermittlungsgebühr"],
    geschichte:
      "Wir rösten unsere Gewürze jeden Morgen und mahlen sie danach – fertige Currypulver kommen uns nicht ins Haus. Der Tandoor-Ofen läuft ab elf Uhr, das Naan kommt direkt von der Ofenwand auf Ihren Teller.",
    kategorien: [
      {
        name: "Vorspeisen",
        gerichte: [
          { name: "Samosa (2 Stück)", beschreibung: "Mit Kartoffel, Erbsen und Kreuzkümmel", preis: 6.5, vegetarisch: true },
          { name: "Onion Bhaji", beschreibung: "Zwiebelringe im Kichererbsenteig, Minz-Chutney", preis: 6.9, vegetarisch: true },
          { name: "Linsensuppe Dal Shorba", beschreibung: "Mit Koriander und Ingwer", preis: 5.9, vegetarisch: true },
        ],
      },
      {
        name: "Curry",
        gerichte: [
          { name: "Butter Chicken", beschreibung: "Tomate, Sahne, Kardamom – mild", preis: 16.5, bild: "photo-1603894584373-5ac82b2ae398" },
          { name: "Chicken Tikka Masala", beschreibung: "Aus dem Tandoor, in würziger Tomatensoße", preis: 16.9, bild: "photo-1603496987351-f84a3ba5ec85" },
          { name: "Lamm Rogan Josh", beschreibung: "Kaschmirische Art, mit Joghurt und Chili", preis: 19.5, bild: "photo-1631452180519-c014fe946bc7" },
          { name: "Palak Paneer", beschreibung: "Spinat mit hausgemachtem Frischkäse", preis: 14.5, vegetarisch: true, bild: "photo-1588166524941-3bf61a9c41db" },
          { name: "Chana Masala", beschreibung: "Kichererbsen mit Tomate und Kreuzkümmel", preis: 13.5, vegetarisch: true },
        ],
      },
      {
        name: "Tandoor, Biryani & Beilagen",
        gerichte: [
          { name: "Chicken Biryani", beschreibung: "Basmati mit Safran, Röstzwiebeln und Raita", preis: 16.9, bild: "photo-1565557623262-b51c2513a641", empfehlungsrolle: "hauptgericht" },
          { name: "Tandoori-Hähnchen (halb)", beschreibung: "Über Nacht in Joghurt und Gewürzen eingelegt", preis: 17.5, empfehlungsrolle: "hauptgericht" },
          { name: "Naan mit Knoblauch", beschreibung: "Frisch aus dem Tandoor", preis: 3.9, vegetarisch: true, empfehlungsrolle: "beilage" },
          { name: "Mango-Lassi", beschreibung: "Joghurtgetränk, gekühlt", preis: 4.5, vegetarisch: true, empfehlungsrolle: "getraenk" },
        ],
      },
    ],
  },

  syrisch: {
    label: "Syrische Küche",
    tagline: "Mezze, Grill und Gastfreundschaft aus Aleppo und Damaskus",
    konzept: "Mezze, Schawarma & Grill",
    usps: ["Alles frisch am Tag zubereitet", "Abholung in 20 Minuten", "Direkt bei uns, ohne Vermittlungsgebühr"],
    geschichte:
      "Bei uns wird geteilt: Mezze kommen in die Mitte, jeder nimmt sich. Der Hummus wird morgens gestampft, das Fladenbrot backen wir selbst, und der Schawarma-Spieß dreht sich von mittags bis abends.",
    kategorien: [
      {
        name: "Mezze",
        gerichte: [
          { name: "Hummus", beschreibung: "Kichererbsen, Tahini, Zitrone, Olivenöl", preis: 6.5, vegetarisch: true, bild: "photo-1752795646140-eb70cf30640e" },
          { name: "Mutabbal", beschreibung: "Auberginencreme mit Tahini und Granatapfel", preis: 6.9, vegetarisch: true },
          { name: "Falafel (6 Stück)", beschreibung: "Mit Sesamsoße und eingelegtem Gemüse", preis: 7.5, vegetarisch: true, bild: "photo-1768812910769-d037b90aee77" },
          { name: "Tabouleh", beschreibung: "Petersiliensalat mit Bulgur, Tomate und Minze", preis: 6.5, vegetarisch: true },
          { name: "Fattoush", beschreibung: "Salat mit geröstetem Fladenbrot und Sumach", preis: 6.9, vegetarisch: true },
        ],
      },
      {
        name: "Vom Spieß & Grill",
        gerichte: [
          { name: "Schawarma vom Kalb", beschreibung: "Im Fladenbrot mit Tahini, Gurke und Tomate", preis: 11.9, bild: "photo-1699728088614-7d1d4277414b" },
          { name: "Schawarma-Teller", beschreibung: "Mit Reis, Salat und Knoblauchcreme", preis: 16.5, bild: "photo-1583060095186-852adde6b819" },
          { name: "Kafta vom Grill", beschreibung: "Hackspieße mit Petersilie und Zwiebel", preis: 15.9 },
          { name: "Shish Taouk", beschreibung: "Marinierte Hähnchenspieße mit Knoblauchcreme", preis: 15.5 },
        ],
      },
      {
        name: "Süßes",
        gerichte: [
          { name: "Baklava (3 Stück)", beschreibung: "Blätterteig mit Pistazien und Zuckersirup", preis: 5.9, vegetarisch: true },
          { name: "Halawet el Jibn", beschreibung: "Käseröllchen mit Sahne und Rosenwasser", preis: 6.5, vegetarisch: true },
          { name: "Arabischer Mokka", beschreibung: "Mit Kardamom", preis: 3.5, vegetarisch: true },
        ],
      },
    ],
  },
};

/**
 * Kurze Namen für das Auswahlfeld im Dashboard. Sie stehen hier neben den
 * Karten, damit eine neue Küche nicht an zwei Stellen nachgetragen werden
 * muss – vergisst man die zweite, steht im Dropdown plötzlich
 * "thailaendisch" statt "Thailändisch".
 */
export const KUECHEN_LABEL = {
  bayerisch: "Bayerisch",
  italienisch: "Italienisch",
  griechisch: "Griechisch",
  tuerkisch: "Türkisch",
  syrisch: "Syrisch",
  chinesisch: "Chinesisch",
  thailaendisch: "Thailändisch",
  vietnamesisch: "Vietnamesisch",
  japanisch: "Japanisch",
  indisch: "Indisch",
  asiatisch: "Asiatisch (gemischt)",
  cafe: "Café",
};

/**
 * Küchen in der Reihenfolge, in der sie im Dashboard stehen sollen: erst die
 * häufigen, dann die asiatischen als Block, zuletzt die Sammelkategorie.
 */
export function kuechenAuswahl() {
  const reihenfolge = Object.keys(KUECHEN_LABEL).filter((wert) => MENUS[wert]);
  // Eine Küche ohne Eintrag in der Liste soll trotzdem wählbar sein.
  const rest = Object.keys(MENUS).filter((wert) => !reihenfolge.includes(wert));
  return [...reihenfolge, ...rest].map((wert) => ({
    wert,
    label: KUECHEN_LABEL[wert] ?? wert,
  }));
}

/**
 * Liefert die Beispielkarte zu einer Küche (mit bayerischem Fallback).
 */
export function menuForCuisine(cuisine) {
  return MENUS[cuisine] ?? MENUS.bayerisch;
}

export function menuForLead(lead) {
  return menuForCuisine(detectCuisine(lead?.name));
}

/**
 * Alle Gerichte einer Karte, die ein Foto haben – die Kandidaten für die
 * Highlights-Sektion.
 */
export function highlightCandidates(menu) {
  return menu.kategorien.flatMap((kategorie, katIndex) =>
    kategorie.gerichte
      .map((gericht, gerichtIndex) => ({ ...gericht, kategorie: kategorie.name, id: `${katIndex}-${gerichtIndex}` }))
      .filter((gericht) => gericht.bild),
  );
}

/**
 * Stabile Kennung je Gericht. Highlights und vollständige Karte zeigen
 * teilweise dieselben Gerichte – über die gemeinsame Kennung landen sie im
 * Warenkorb in einer Zeile statt in zweien.
 */
export function gerichtId(katIndex, gerichtIndex) {
  return `${katIndex}-${gerichtIndex}`;
}
