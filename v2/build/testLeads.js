// Synthetische Test-Leads für den v2-Rollout (Stage 8) und die Tests.
//
// Frei erfunden – wie DEMO_LEADS in v1: keine echten Lokale, Musteradressen,
// Telefonnummern aus dem für Film und Fernsehen reservierten Bereich
// (0151 / 0176 … sind echte Netze, deshalb 0 30 23125 xxx: von der
// Bundesnetzagentur für fiktive Zwecke freigehalten).
//
// Je Kombination ein Lead. Die placeId trägt Küche und Stimmung, damit der
// Seed stabil und jede Seite reproduzierbar ist.

import { kombinationen } from "./designsystemGenerator.js";

const NAMEN = {
  bayerisch: { wirtshaus: "Gasthaus Zur Alten Linde", kellerstube: "Kellerstüberl am Stadtplatz", biergarten: "Biergarten Innauen" },
  italienisch: { trattoria: "Trattoria Da Nonna Lucia", "osteria-notte": "Osteria Lanterna", costiera: "Bar Amalfi" },
  griechisch: { "taverne-am-hafen": "Taverna Kalimera", "athener-moderne": "Ktima Athena", olivenhain: "Elies – Griechische Küche" },
  tuerkisch: { basar: "Karaköy Grillhaus", "bosporus-nacht": "Boğaz Restaurant", "anatolische-erde": "Toprak Lokanta" },
  syrisch: { "damaszener-hof": "Dar Al-Yasmin", gewuerzbasar: "Souk Al-Hamidiyah", "levante-modern": "Zaatar & Co." },
  chinesisch: { "rote-laterne": "Goldene Laterne", "shanghai-nacht": "Bund 1930", teehaus: "Jadeblatt Teehaus" },
  thailaendisch: { orchidee: "Baan Orchid", "streetfood-nacht": "Soi 38 Grill", andamanen: "Krabi Kitchen" },
  vietnamesisch: { indochine: "Maison Saigon", "hanoi-nacht": "Hanoi Lantern", strassenkueche: "Phở Góc Phố" },
  japanisch: { izakaya: "Izakaya Kurenai", omakase: "Sushi Kaede", washitsu: "Udon Hinoki" },
  indisch: { gewuerzmarkt: "Masala Bazaar", maharadscha: "Rajmahal", "suedindisch-hell": "Kerala Café" },
  asiatisch: { marktstand: "Nudelbar Wokstand", neon: "Neon Noodles", "fusion-minimal": "Kin – Asian Kitchen" },
  cafe: { "wiener-kaffeehaus": "Café Hofgarten", konditorei: "Konditorei Zuckerwerk", "third-wave": "Rösterei Kornfeld" },
};

const ORTE = [
  ["Mühldorf am Inn", "Stadtplatz", "84453"],
  ["Altötting", "Kapellplatz", "84503"],
  ["Tüßling", "Marktplatz", "84577"],
  ["Kraiburg am Inn", "Marktplatz", "84559"],
];

export function testLeads() {
  return kombinationen().map(({ kueche, stimmung }, i) => {
    const [ort, platz, plz] = ORTE[i % ORTE.length];
    return {
      placeId: `v2-test-${kueche}-${stimmung.id}`,
      slug: `${kueche}--${stimmung.id}`,
      kueche,
      stimmung: stimmung.id,
      name: NAMEN[kueche][stimmung.id],
      ort,
      adresse: `${platz} ${3 + (i % 17)}, ${plz} ${ort}`,
      telefon: `030 23125 ${String(100 + i).padStart(3, "0")}`,
      rating: Number((4.3 + ((i * 7) % 7) / 10).toFixed(1)),
      anzahlBewertungen: 80 + ((i * 53) % 540),
      fiktiv: true,
    };
  });
}

export function testLeadFuer(kueche, stimmung) {
  return testLeads().find((l) => l.kueche === kueche && l.stimmung === stimmung) ?? null;
}
