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
          { name: "Tagliatelle al Ragù", beschreibung: "Klassisches Ragù, 4 Stunden geschmort", preis: 14.9, bild: "photo-1551183053-bf91a1d81141" },
          { name: "Farfalle al Pesto", beschreibung: "Basilikumpesto, Kirschtomaten, Pinienkerne", preis: 13.9, vegetarisch: true, bild: "photo-1473093295043-cdd812d0e601" },
          { name: "Penne all'Arrabbiata", beschreibung: "Tomate, Knoblauch, Chili, Parmesan", preis: 12.9, vegetarisch: true, bild: "photo-1621996346565-e3dbc646d9a9" },
          { name: "Panna cotta mit Feigen", beschreibung: "Mit karamellisierten Feigen und Beeren", preis: 8.5, vegetarisch: true, bild: "photo-1544510808-91bcbee1df55" },
          { name: "Tiramisù", beschreibung: "Hausgemacht, nach Familienrezept", preis: 7.5, vegetarisch: true },
        ],
      },
    ],
  },

  asiatisch: {
    label: "Asiatische Küche",
    tagline: "Frisch im Wok gebraten, aromatisch gewürzt",
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
          { name: "Sushi-Box (12 Stück)", beschreibung: "Gemischte Auswahl, mit Wasabi und Ingwer", preis: 18.9, bild: "photo-1553621042-f6e147245754" },
          { name: "Gebackene Banane", beschreibung: "Mit Honig und Vanilleeis", preis: 6.5, vegetarisch: true },
        ],
      },
    ],
  },

  griechisch: {
    label: "Griechische Küche",
    tagline: "Mediterrane Gastfreundschaft, wie am Meer",
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

/**
 * Alle Gerichte einer Karte, die ein Foto haben – die Kandidaten für die
 * Highlights-Sektion.
 */
export function highlightCandidates(menu) {
  return menu.kategorien.flatMap((kategorie) =>
    kategorie.gerichte
      .filter((gericht) => gericht.bild)
      .map((gericht) => ({ ...gericht, kategorie: kategorie.name })),
  );
}
