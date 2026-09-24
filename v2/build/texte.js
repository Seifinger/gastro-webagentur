// Alle sichtbaren Texte einer v2-Seite an einer Stelle.
//
// Die Sektionen setzen nur, was hier steht. Dadurch kann der Copy-Refiner
// (copyRefiner.js, Stage 6) jeden Text vor dem Build prüfen und umschreiben,
// ohne in die Markup-Funktionen greifen zu müssen – und ein Text, der nicht
// durch diese Funktion läuft, kommt gar nicht erst auf die Seite.
//
// Der Ton richtet sich nach dem Sprachkanon des Designsystems: das Abendhaus
// sagt weniger, das helle Haus antwortet zuerst auf „was, wann, wie schnell“.

import { ortsbezug, strasseAusAdresse } from "./v1Funktionen.js";

// Slogan der Bühne (nur Seiten mit Ausdruck): höchstens sechs Wörter, keine
// Behauptung über das Haus (kein "seit 1890", kein "bestes"), nur eine
// Einladung mit Ortsbezug. Eigener Slogan aus dem Dashboard hat Vorrang.
const SLOGAN = {
  bayerisch: (ort) => (ort ? `Einkehren in ${ort}` : "Einkehren und bleiben"),
  italienisch: (ort) => (ort ? `Zu Tisch in ${ort}` : "Zu Tisch, bitte"),
  griechisch: (ort) => (ort ? `Zu Gast in ${ort}` : "Zu Gast am Tisch"),
  tuerkisch: (ort) => (ort ? `Vom Grill, mitten in ${ort}` : "Vom Grill auf die Hand"),
  cafe: (ort) => (ort ? `Guten Morgen, ${ort}` : "Guten Morgen"),
  japanisch: (ort) => (ort ? `Abends am Tresen in ${ort}` : "Abends am Tresen"),
};
const sloganFuer = (kueche, ort) => (SLOGAN[kueche] ?? ((o) => (o ? `Zu Gast in ${o}` : "Zu Gast bei uns")))(ort);

export function texteFuer({ ds, menu, lead, eigeneTexte = {} }) {
  const ort = lead.ort || "";
  const lage = ortsbezug(lead.adresse, ort);
  const archetyp = ds.archetyp;
  const konzept = menu.konzept ?? menu.label;
  const strasse = strasseAusAdresse(lead.adresse);

  const kurz = archetyp === "abend";
  const direkt = archetyp === "hell";

  return {
    name: lead.name || "Ihr Restaurant",
    kicker: `${konzept}${ort ? ` · ${ort}` : ""}`,
    headline: eigeneTexte.headline ?? (lead.name || "Ihr Restaurant"),
    claim: eigeneTexte.schlagzeile ?? (lage ? `${menu.tagline} – ${lage}.` : `${menu.tagline}.`),
    slogan: eigeneTexte.slogan ?? sloganFuer(ds.kueche, ort),
    buehne: { bereich: "Willkommen", alt: `${lead.name || "Restaurant"} – Stimmungsbild` },
    // Seiten mit Ausdruck: Die Adresse steht rechts in "Besuch", der Satz links bleibt ohne sie.
    einladungText: eigeneTexte.schlagzeile ?? `${menu.tagline}.`,
    besuch: { titel: "Besuch", lieberAnrufen: "Lieber anrufen?" },
    tisch: {
      rubrik: kurz ? "Aus der Küche" : "Auf dem Tisch",
      titel: kurz ? "Was wir heute empfehlen" : "Was hier auf den Tisch kommt",
      intro: "Drei Gerichte aus der Karte – alle auch zum Abholen.",
    },
    ctaBestellen: direkt ? "Jetzt vorbestellen" : "Zur Abholung bestellen",
    ctaReservieren: kurz ? "Tisch anfragen" : "Tisch reservieren",
    nav: { highlights: "Empfehlungen", karte: "Karte", reservierung: "Reservieren", kontakt: "Anfahrt" },
    heuteEmpfohlen: kurz ? "Heute Abend" : "Heute empfohlen",

    usps: [...(menu.usps ?? [])],

    highlights: {
      rubrik: kurz ? "Aus der Küche" : "Hausempfehlungen",
      titel: direkt ? "Das geht hier am häufigsten raus" : kurz ? "Was wir heute empfehlen" : "Was unsere Gäste am liebsten bestellen",
      intro: direkt
        ? "Antippen, Abholzeit wählen, fertig. Bezahlt wird vor Ort."
        : "Frisch zubereitet. Vorbestellen und zur gewählten Zeit abholen.",
      siegel: "Hausempfehlung",
      vorbestellen: "Vorbestellen",
    },
    ablauf: [
      { titel: "Aussuchen", text: "Gerichte in den Warenkorb legen." },
      { titel: "Abholzeit wählen", text: "Sie sagen, wann es fertig sein soll." },
      { titel: "Abholen", text: "Bezahlt wird bei uns, bar oder mit Karte." },
    ],

    karte: {
      rubrik: "Speisekarte",
      titel: direkt ? "Die Karte" : "Unsere ganze Karte",
      intro: direkt
        ? "Jedes Gericht lässt sich mit einem Tipp vorbestellen."
        : "Jedes Gericht können Sie direkt zur Abholung vorbestellen.",
      vegetarisch: "vegetarisch",
      gerichteEinheit: "Gerichte",
    },

    ambiente: {
      rubrik: kurz ? "Der Raum" : "Das Haus",
      titel: `${konzept}${ort ? ` in ${ort}` : ""}`,
      text: menu.geschichte,
      slots: [
        { rolle: "haus", titel: "Unser Haus", hinweis: "Außenansicht – so erkennen Gäste Sie von der Straße" },
        { rolle: "team", titel: "Unser Team", hinweis: "Hände bei der Arbeit statt Gruppenfoto" },
        { rolle: "bestseller", titel: "Unser Bestseller", hinweis: "Das meistbestellte Gericht, ehrlich fotografiert" },
      ],
    },

    stimmen: {
      rubrik: "Gäste",
      titel: kurz ? "Was Gäste sagen" : "Was Gäste über uns schreiben",
      aufGoogle: "auf Google",
      bewertungen: "Bewertungen",
      slotHinweis: "wird aus Ihren Google-Bewertungen übernommen",
    },

    reservierung: {
      rubrik: "Reservierung",
      titel: kurz ? "Ihr Tisch für heute Abend" : "Tisch reservieren",
      intro: kurz
        ? "Datum, Uhrzeit, Personen. Wir bestätigen kurz darauf."
        : "Wählen Sie Datum, Uhrzeit und Personenzahl – wir halten Ihren Tisch bereit.",
      punkte: [
        "Rund um die Uhr buchbar, auch nach Küchenschluss",
        "Bestätigung ohne Anruf",
        "Kinderstuhl oder Allergien gleich mit angeben",
      ],
      absenden: "Reservierung anfragen",
      felder: {
        datum: "Datum",
        uhrzeit: "Uhrzeit",
        personen: "Personen",
        name: "Name",
        telefon: "Telefon",
        email: "E-Mail",
        wunsch: "Anmerkungen",
        optional: "(optional)",
        bitteWaehlen: "Bitte wählen",
        wunschPlatzhalter: "Kinderstuhl, Allergien, Tisch am Fenster …",
      },
      fehler: {
        datum: "Bitte wählen Sie ein Datum.",
        uhrzeit: "Bitte wählen Sie eine Uhrzeit.",
        personen: "Bitte wählen Sie die Personenzahl.",
        name: "Bitte geben Sie Ihren Namen an.",
        telefon: "Bitte geben Sie eine Telefonnummer an.",
      },
    },

    kontakt: {
      rubrik: "Anfahrt",
      titel: strasse && archetyp === "traditionell" ? strasse : "So finden Sie uns",
      untertitel: strasse && archetyp === "traditionell" ? ort : "",
      route: "Route planen",
      telefonHinweis: "Telefonisch erreichbar während der Öffnungszeiten",
      abholung: "Abholung vorbestellen – Ihr Essen steht pünktlich bereit",
      oeffnungszeiten: "Öffnungszeiten",
    },

    bestellung: {
      titel: "Ihre Abholbestellung",
      schliessen: "Schließen",
      abholzeit: "Abholzeit",
      asap: "So schnell wie möglich (ca. 20 Min.)",
      hinweis: "Hinweis",
      hinweisPlatzhalter: "Allergien, Sonderwünsche …",
      gesamt: "Gesamt",
      absenden: "Abholung verbindlich bestellen",
      bezahlung: "Bezahlung bei Abholung, bar oder mit Karte.",
      noShowFehler: "Bitte stimmen Sie zu, um die Bestellung abzuschicken.",
      warenkorb: "Warenkorb",
      bestellen: "Bestellen",
      reservieren: "Reservieren",
      mailBestaetigung: "Bestätigung per E-Mail senden",
      vorschauHinweis: "Vorschau: Auf dieser Seite wird nichts verschickt. Auf der fertigen Website geht die Anfrage direkt an das Restaurant.",
      fehlerAbholzeit: "Bitte wählen Sie eine Abholzeit.",
    },

    platzhalter: "Platzhalter",
    kiGeneriert: "KI-generiert",
    eigenesFoto: "eigenes Foto",
    fuss: {
      hinweis:
        "Unverbindlicher Gestaltungsentwurf. Was als Platzhalter gekennzeichnet ist – Gerichte, Preise, Öffnungszeiten, Angaben zu Herkunft und Geschichte des Hauses –, ist ein Vorschlag und noch nicht vom Haus bestätigt. Fotos stammen aus einer Bilddatenbank oder sind KI-generiert und entsprechend markiert.",
      navigation: "Seitennavigation",
    },
    entwurfsleiste: `Unverbindlicher Gestaltungsentwurf – nicht die offizielle Website von ${lead.name || "diesem Lokal"}.`,
    entwurfsleisteFiktiv: "Beispielseite – dieses Lokal ist frei erfunden.",
  };
}

/**
 * Alle Textblätter als flache Liste [pfad, wert] – für den Copy-Refiner.
 * Nur Zeichenketten, keine Namen/Adressen (die sind Daten, keine Copy).
 */
export function textBlaetter(texte, pfad = [], ausnahmen = new Set(["name", "headline", "kicker"])) {
  const liste = [];
  for (const [schluessel, wert] of Object.entries(texte)) {
    const hier = [...pfad, schluessel];
    if (pfad.length === 0 && ausnahmen.has(schluessel)) continue;
    if (typeof wert === "string") liste.push([hier, wert]);
    else if (Array.isArray(wert)) {
      wert.forEach((w, i) => {
        if (typeof w === "string") liste.push([[...hier, i], w]);
        else if (w && typeof w === "object") liste.push(...textBlaetter(w, [...hier, i], new Set()));
      });
    } else if (wert && typeof wert === "object") liste.push(...textBlaetter(wert, hier, new Set()));
  }
  return liste;
}

export function setzeText(texte, pfad, wert) {
  let ziel = texte;
  for (const teil of pfad.slice(0, -1)) ziel = ziel[teil];
  ziel[pfad[pfad.length - 1]] = wert;
}
