// Speisekarten für die Tests der Speisekarten-Seite (v2/build/speisekarte.js).

/** Italienische Karte eines Betriebs: mit Varianten, Extras, Gruppen, leerer Kategorie, Ausverkauftem und Deaktiviertem. */
export function italienischeBetriebskarte() {
  return {
    label: "Italienische Küche",
    tagline: "Aus dem Holzofen",
    konzept: "Pizzeria & Trattoria",
    usps: [],
    quelle: "betrieb",
    kategorien: [
      {
        name: "Vorspeisen",
        gerichte: [
          { name: "Bruschetta", beschreibung: "Tomaten, Basilikum, Knoblauch", preis: 6.5, vegetarisch: true },
          { name: "Vitello Tonnato", beschreibung: "Kalb, Thunfischcreme, Kapern", preis: 12.9 },
        ],
      },
      {
        name: "Pizza",
        beschreibung: "Aus dem Holzofen, Teig 48 Stunden gereift.",
        gerichte: [
          {
            name: "Margherita",
            beschreibung: "Tomaten, Fior di Latte, Basilikum",
            vegetarisch: true,
            signatur: true,
            varianten: [{ name: "Ø 26 cm", preis: 8.5 }, { name: "Ø 32 cm", preis: 10.5 }],
            extras: [{ name: "Büffelmozzarella", preis: 2.5 }, { name: "Scharfes Öl" }],
          },
          { name: "Diavola", beschreibung: "Scharfe Salami, Chili", preis: 11.9 },
          { name: "Tartufo", beschreibung: "Trüffelcreme, Rucola", preis: 16.9, ausverkauft: true },
          { name: "Pizza des Monats", beschreibung: "Noch nicht freigegeben", preis: 13.5, freigegeben: false },
        ],
      },
      {
        name: "Pasta",
        gerichte: [
          { name: "Tagliatelle al Ragù", beschreibung: "Vier Stunden geschmort", preis: 14.9 },
          { name: "Spaghetti Aglio e Olio con Peperoncino e Prezzemolo della Casa nach Art der Nonna", beschreibung: "Ein sehr langer Name und eine lange Beschreibung: Knoblauch, Olivenöl, Peperoncino, Petersilie, dazu geröstete Brotbrösel und ein Hauch Zitronenschale, damit auch schmale Bildschirme umbrechen müssen.", preis: 11.5 },
        ],
      },
      { name: "Fleisch", gerichte: [{ name: "Saltimbocca", beschreibung: "Kalb, Salbei, Parmaschinken", preis: 21.5 }] },
      { name: "Fisch", gerichte: [] },
      { name: "Desserts", gerichte: [{ name: "Tiramisù", beschreibung: "Hausgemacht", preis: 7.5, vegetarisch: true }] },
      {
        name: "Getränke",
        gruppen: [
          { name: "Alkoholfrei", gerichte: [{ name: "Acqua Frizzante 0,75 l", preis: 5.5 }, { name: "Chinotto", preis: 3.9 }] },
          { name: "Wein", gerichte: [{ name: "Montepulciano 0,2 l", preis: 6.9 }] },
          { name: "Spirituosen", gerichte: [{ name: "Grappa", preis: 4.5, aktiv: false }] },
        ],
      },
    ],
  };
}

/** Große Karte: 12 Kategorien × 20 Gerichte. */
export function grosseKarte() {
  return {
    label: "Große Karte",
    tagline: "Viel Auswahl",
    konzept: "Große Karte",
    usps: [],
    kategorien: Array.from({ length: 12 }, (_, k) => ({
      name: `Kategorie ${k + 1} mit etwas längerem Namen`,
      gerichte: Array.from({ length: 20 }, (_, g) => ({ name: `Gericht ${k + 1}.${g + 1}`, beschreibung: "Beschreibung eines Gerichts", preis: 5 + g / 2 })),
    })),
  };
}
