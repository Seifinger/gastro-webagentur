// Konzept-Demo für einen echten Betrieb (v2/DEMO-UMBAU.md, Teil 3/4).
//
// Dieselbe Vorlage wie die Beispielseiten (Ausdruck, Bühne, Bewegung), aber
// nichts, was über den Betrieb behauptet würde, ohne dass er es gesagt hat:
//   - keine Google-Note, keine Rezensionen (statisches HTML, siehe Teil 4)
//   - keine erfundenen Öffnungszeiten, keine Haus-Geschichte, kein
//     "Biergarten", den es vielleicht nicht gibt
//   - die Karte ist eine ausdrücklich gekennzeichnete Musterkarte
//   - Bilder: eigene, wenn geliefert, sonst Konzeptbilder der Küchenrichtung
//   - oben und unten: "Konzept-Demo – nicht die offizielle Website"

/** Nimmt aus einem Lead alles, was auf einer Konzept-Demo nicht erscheinen darf. */
export function konzeptLead(lead) {
  const { rating: _r, anzahlBewertungen: _a, ...rest } = lead;
  return { ...rest, rating: "", anzahlBewertungen: "" };
}

/**
 * Überschreibt die Texte, die sonst etwas über das Haus behaupten würden.
 * Läuft vor dem Copy-Refiner, damit auch diese Sätze die Regeln bestehen.
 */
export function konzeptTexte(texte, { lead, menu, eigeneTexte = {} }) {
  const name = lead.name || "Ihr Restaurant";
  const ort = lead.ort || "";
  const richtung = menu.label;
  return {
    ...texte,
    kicker: `${richtung}${ort ? ` · ${ort}` : ""}`,
    // Was im Dashboard selbst geschrieben oder per Textvorschlag übernommen
    // wurde, gilt – ersetzt wird nur, was sonst die Vorlage behaupten würde.
    claim: eigeneTexte.schlagzeile ?? `So könnte sich ${name} im Netz zeigen.`,
    einladungText: eigeneTexte.schlagzeile ?? `Ein Entwurf, wie sich ${name} im Netz zeigen könnte – mit eigener Karte, eigenen Zeiten und eigenen Fotos.`,
    entwurfsleiste: `Konzept-Demo – unverbindlicher Entwurf, nicht die offizielle Website von ${name}.`,
    platzhalter: "Beispiel",
    tisch: {
      ...texte.tisch,
      rubrik: "Aus der Musterkarte",
      titel: "So könnten Empfehlungen aussehen",
      intro: `Beispielgerichte der Küchenrichtung – nicht die Karte von ${name}.`,
    },
    highlights: { ...texte.highlights, titel: "So könnten Empfehlungen aussehen", intro: `Beispielgerichte – nicht die Karte von ${name}.` },
    karte: {
      ...texte.karte,
      rubrik: "Musterkarte",
      titel: "So könnte die Karte aussehen",
      intro: `Beispielgerichte und Beispielpreise der Küchenrichtung – nicht die Karte von ${name}. Jedes Gericht lässt sich zur Probe in den Warenkorb legen.`,
    },
    ambiente: {
      ...texte.ambiente,
      rubrik: "Ihr Haus",
      titel: "Hier steht Ihre Geschichte",
      text: "Platz für Ihr Haus, Ihre Herkunft und Ihr Team – mit Ihren Fotos und Ihren Worten. Wir schreiben hier nichts, was Sie nicht selbst erzählen.",
    },
    fuss: {
      ...texte.fuss,
      hinweis: `Konzept-Demo für ${name}: Name und Adresse sind öffentliche Angaben des Betriebs, alles andere – Gerichte, Preise, Bilder – sind Beispiele der Küchenrichtung. Auf dieser Seite wird nichts verschickt.`,
    },
    kontakt: {
      ...texte.kontakt,
      route: "Auf Google Maps ansehen",
      zeitenOffen: "Ihre Öffnungszeiten tragen Sie selbst ein – hier erfinden wir keine.",
      abholzeitBeispiel: "Beispielzeiten zur Probe – auf Ihrer Seite gelten Ihre Öffnungszeiten.",
    },
  };
}
