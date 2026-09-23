// Sprach-Kanon je Küche × Stimmung: Ton, Satzlänge, Wortfeld.
//
// Der Kanon sagt dem Copy-Refiner (copyRefiner.js) und einem optionalen
// Sprachmodell, wie diese Seite klingen soll. Er ergänzt die Verbotsliste
// aus COPY-PRINZIPIEN.md um das, was stattdessen erwünscht ist: konkrete
// Dinge aus der Küche statt Adjektive über die Küche.

const TON = {
  traditionell: "bodenständig und konkret – sagt, was es gibt und wie es gemacht wird, ohne zu schwärmen",
  abend: "ruhig und knapp – wenige Worte, eher Einladung als Werbung",
  hell: "direkt und praktisch – beantwortet zuerst: was, wann, wie schnell",
};

const WORTFELD = {
  bayerisch: ["Kruste", "Knödel", "Brotzeit", "Wirtsstube", "Fass", "Stammtisch", "Kastanien"],
  italienisch: ["Teig", "Holzofen", "Basilikum", "Pecorino", "al dente", "Tagesgericht"],
  griechisch: ["Holzkohle", "Oregano", "Zitrone", "Meze", "Hafen", "Tagesfang"],
  tuerkisch: ["Holzkohlegrill", "Fladenbrot", "Sumach", "Çay", "Spieß", "Joghurt"],
  syrisch: ["Mezze", "Tahini", "Granatapfel", "Fladenbrot", "Za'atar", "Tee"],
  chinesisch: ["Wok", "Dampfkorb", "Teigtaschen", "Szechuanpfeffer", "Tee"],
  thailaendisch: ["Currypaste", "Mörser", "Limette", "Zitronengras", "Schärfegrad"],
  vietnamesisch: ["Brühe", "Kräuter", "Reisnudeln", "Bánh Mì", "Fischsauce"],
  japanisch: ["Reis", "Brühe", "Schnitt", "Tresen", "Saison"],
  indisch: ["Tandoor", "Gewürze", "Naan", "Masala", "Linsen"],
  asiatisch: ["Wok", "Nudeln", "Brühe", "Schärfe", "Abholung"],
  cafe: ["Röstung", "Kuchen", "Frühstück", "Tasse", "Zeitung"],
};

export function sprachKanonFuer(kueche, stimmung) {
  return {
    ton: TON[stimmung.archetyp] ?? TON.traditionell,
    anrede: "Sie",
    satzlaenge: stimmung.archetyp === "abend" ? "kurz, 6–14 Wörter" : "kurz bis mittel, 8–18 Wörter",
    wortfeld: WORTFELD[kueche] ?? [],
    regeln: [
      "Konkrete Dinge statt Adjektive: „Teig ruht 48 Stunden“ statt „authentischer Genuss“.",
      "Keine Anrede-Floskeln („Willkommen bei …“), keine Aufforderungen zum Eintauchen oder Entdecken.",
      "Höchstens ein Ausrufezeichen pro Seite.",
      "Zahlen als Ziffern, Zeiten im 24-Stunden-Format.",
    ],
  };
}
