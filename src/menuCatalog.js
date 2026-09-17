// Google Places liefert keine Speisekarten. Für den Pitch-Entwurf wählen wir
// anhand des Restaurantnamens eine passende Beispielkarte aus, die der Wirt
// später durch seine echten Gerichte ersetzt.

const CUISINE_RULES = [
  {
    cuisine: "italienisch",
    keywords: [
      "pizz", "italien", "trattoria", "osteria", "ristorante", "napoli",
      "roma", "toscana", "vesuvio", "milano", "venezia", "sapori",
    ],
  },
  {
    cuisine: "asiatisch",
    keywords: [
      "asia", "china", "chines", "thai", "sushi", "wok", "bambus", "lotus",
      "mongol", "vietnam", "panda", "saigon", "bangkok",
    ],
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
          { name: "Schweinsbraten mit Knödel", beschreibung: "Dunkle Biersoße, Semmelknödel, Krautsalat", preis: 16.9 },
          { name: "Wiener Schnitzel vom Kalb", beschreibung: "Mit Preiselbeeren, Petersilienkartoffeln", preis: 22.5 },
          { name: "Schweinshaxe", beschreibung: "Knusprig gebraten, mit Kartoffelknödel", preis: 18.9 },
          { name: "Käsespätzle", beschreibung: "Mit Bergkäse und Röstzwiebeln", preis: 13.5, vegetarisch: true },
          { name: "Forelle Müllerin", beschreibung: "Aus heimischer Zucht, Butter, Mandeln, Salzkartoffeln", preis: 19.5 },
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
          { name: "Margherita", beschreibung: "Tomaten, Mozzarella, frisches Basilikum", preis: 9.9, vegetarisch: true },
          { name: "Salame Piccante", beschreibung: "Scharfe Salami, Mozzarella, Chili", preis: 12.5 },
          { name: "Quattro Stagioni", beschreibung: "Schinken, Champignons, Artischocken, Oliven", preis: 13.5 },
          { name: "Tartufo", beschreibung: "Trüffelcreme, Parmesan, Rucola", preis: 15.9, vegetarisch: true },
        ],
      },
      {
        name: "Pasta & Dolci",
        gerichte: [
          { name: "Tagliatelle al Ragù", beschreibung: "Klassisches Ragù, 4 Stunden geschmort", preis: 14.9 },
          { name: "Gnocchi Gorgonzola", beschreibung: "Cremige Gorgonzolasoße, Walnüsse", preis: 13.9, vegetarisch: true },
          { name: "Tiramisù", beschreibung: "Hausgemacht, nach Familienrezept", preis: 7.5, vegetarisch: true },
        ],
      },
    ],
  },

  asiatisch: {
    label: "Asiatische Küche",
    tagline: "Frisch im Wok gebraten, aromatisch gewürzt",
    kategorien: [
      {
        name: "Vorspeisen",
        gerichte: [
          { name: "Frühlingsrollen (4 Stück)", beschreibung: "Mit süß-saurer Soße", preis: 6.9, vegetarisch: true },
          { name: "Wan-Tan-Suppe", beschreibung: "Mit gefüllten Teigtaschen und Frühlingszwiebeln", preis: 5.9 },
          { name: "Edamame", beschreibung: "Mit Meersalz", preis: 5.5, vegetarisch: true },
        ],
      },
      {
        name: "Aus dem Wok",
        gerichte: [
          { name: "Pad Thai mit Hähnchen", beschreibung: "Reisnudeln, Erdnüsse, Limette", preis: 14.5 },
          { name: "Rindfleisch Szechuan", beschreibung: "Scharf, mit Paprika und Bambus", preis: 16.5 },
          { name: "Gebratener Reis mit Gemüse", beschreibung: "Mit Ei, Erbsen und Karotten", preis: 11.9, vegetarisch: true },
          { name: "Ente knusprig", beschreibung: "Mit Hoisin-Soße und Gemüse", preis: 19.5 },
        ],
      },
      {
        name: "Sushi & Dessert",
        gerichte: [
          { name: "Sushi-Box (12 Stück)", beschreibung: "Gemischte Auswahl, mit Wasabi und Ingwer", preis: 18.9 },
          { name: "Gebackene Banane", beschreibung: "Mit Honig und Vanilleeis", preis: 6.5, vegetarisch: true },
        ],
      },
    ],
  },

  griechisch: {
    label: "Griechische Küche",
    tagline: "Mediterrane Gastfreundschaft, wie am Meer",
    kategorien: [
      {
        name: "Vorspeisen",
        gerichte: [
          { name: "Tzatziki mit Pitabrot", beschreibung: "Joghurt, Gurke, Knoblauch", preis: 6.5, vegetarisch: true },
          { name: "Gegrillter Schafskäse", beschreibung: "Mit Tomaten, Oliven und Oregano", preis: 8.9, vegetarisch: true },
          { name: "Dolmades", beschreibung: "Gefüllte Weinblätter mit Reis und Kräutern", preis: 7.5, vegetarisch: true },
        ],
      },
      {
        name: "Vom Grill",
        gerichte: [
          { name: "Gyros mit Tzatziki", beschreibung: "Mit Pommes und Salat", preis: 14.9 },
          { name: "Souvlaki-Spieße", beschreibung: "Schweinefilet, Reis, Zaziki", preis: 16.5 },
          { name: "Bifteki gefüllt", beschreibung: "Mit Schafskäse, Kartoffeln, Salat", preis: 15.9 },
          { name: "Grillteller für 2", beschreibung: "Gyros, Souvlaki, Bifteki, Beilagen", preis: 34.9 },
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
          { name: "Döner Kebab", beschreibung: "Im Fladenbrot, mit Salat und Soße nach Wahl", preis: 7.5 },
          { name: "Dürüm Teller", beschreibung: "Mit Reis, Salat und Joghurtsoße", preis: 13.9 },
          { name: "Adana Kebab", beschreibung: "Scharfes Hackfleisch vom Spieß, Bulgur, Salat", preis: 15.5 },
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
    kategorien: [
      {
        name: "Frühstück",
        gerichte: [
          { name: "Frühstück Klassik", beschreibung: "Semmeln, Butter, Marmelade, Ei, Aufschnitt", preis: 11.5, vegetarisch: true },
          { name: "Avocado-Brot", beschreibung: "Sauerteigbrot, pochiertes Ei, Kresse", preis: 12.5, vegetarisch: true },
          { name: "Müsli-Bowl", beschreibung: "Joghurt, Obst der Saison, Granola", preis: 8.9, vegetarisch: true },
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
          { name: "Cappuccino", beschreibung: "Aus regional gerösteten Bohnen", preis: 3.9, vegetarisch: true },
          { name: "Heiße Schokolade", beschreibung: "Mit Sahnehaube", preis: 4.5, vegetarisch: true },
          { name: "Frisch gepresster Orangensaft", beschreibung: "0,3 l", preis: 4.9, vegetarisch: true },
        ],
      },
    ],
  },
};

/**
 * Liefert die Beispielkarte zu einer Küche (mit bayerischem Fallback).
 */
export function menuForCuisine(cuisine) {
  return MENUS[cuisine] ?? MENUS.bayerisch;
}

export function menuForLead(lead) {
  return menuForCuisine(detectCuisine(lead?.name));
}
