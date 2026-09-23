// Texte einer komponierten Seite – aus Briefing und Creative Direction.
//
// Regeln (Phase F):
// - Überschriften kommen aus dem belegten USP/Konzept, nicht aus Adjektiven.
// - Nur Tatsachen (bestätigt/übernommen) stehen ohne Marke da; Vorschläge
//   tragen `entwurf: true` und werden sichtbar markiert; Unbekanntes fehlt.
// - Ton und CTA folgen cd.ton.register.
// - Die funktionalen Texte (Formularfelder, Warenkorb, Fehlermeldungen)
//   kommen unverändert aus texteFuer(), damit Skript und Formular gleich
//   bleiben.

import { texteFuer } from "../texte.js";
import { feldAn, istTatsache, tatsache, zeigbar, istFreigegeben } from "../../briefing/briefing.js";

const CTA = {
  herzlich: { reservieren: "Tisch reservieren", bestellen: "Zum Abholen bestellen", anrufen: "Anrufen", informieren: "Öffnungszeiten" },
  direkt: { reservieren: "Tisch für die Gruppe", bestellen: "Bestellen", anrufen: "Anrufen", informieren: "Heute offen?" },
  sachlich: { reservieren: "Tisch anfragen", bestellen: "Vorbestellen", anrufen: "Anrufen", informieren: "Wochenplan" },
};

export function texteKomponiert({ briefing, cd, ds, menu, lead }) {
  const basis = texteFuer({ ds, menu, lead, eigeneTexte: {} });
  const register = cd.ton?.register ?? "sachlich";
  const cta = CTA[register] ?? CTA.sachlich;
  const name = tatsache(briefing, "betrieb.name") ?? lead.name ?? "Ihr Restaurant";
  const ort = tatsache(briefing, "betrieb.ort") ?? "";
  const kuecheLabel = tatsache(briefing, "betrieb.kueche") ?? menu.label;
  const usp = zeigbar(briefing, "konzept.usp");
  const kurz = zeigbar(briefing, "konzept.kurz");
  const aktion = zeigbar(briefing, "aktion.haupt")?.wert ?? "anrufen";
  const hinweise = tatsache(briefing, "aktion.hinweise") ?? [];
  const freigegeben = istFreigegeben(briefing);
  // Copy-Entscheidungen der Creative Direction (Überschriften, Intros).
  // Tatsachen darin müssen im Briefing belegt sein – das prüft der Review.
  const t = cd.texte ?? {};

  // Claim: belegter USP > Konzept > nüchterne Tatsache. Nie ein Adjektiv-Satz.
  const claim = usp ?? kurz ?? { wert: `${kuecheLabel}${ort ? ` in ${ort}` : ""}.`, entwurf: false };

  return {
    ...basis,
    name,
    headline: name,
    kicker: `${kuecheLabel}${ort ? ` · ${ort}` : ""}`,
    claim: claim.wert,
    claimEntwurf: claim.entwurf,
    konzept: kurz?.wert ?? null,
    konzeptEntwurf: kurz?.entwurf ?? false,
    geschichte: tatsache(briefing, "konzept.geschichte"),
    belege: tatsache(briefing, "konzept.belege") ?? [],
    hinweise,
    aktion,
    cta,
    ctaHaupt: cta[aktion],
    ctaReservieren: cta.reservieren,
    usps: [],
    nav: { karte: "Karte", reservierung: "Reservieren", kontakt: "Anfahrt", tageskarte: "Tageskarte", zettelwand: "Kleine Teller", wochenplan: "Öffnungszeiten", haus: "Das Haus", offen: "Offene Punkte" },
    menueKnopf: "Menü",
    entwurf: "Entwurf",
    tageskarte: {
      rubrik: "Tageskarte",
      titel: t.tageskarteTitel ?? "Tageskarte",
      intro: t.tageskarteIntro ?? "Diese Gerichte stehen auf der Karte – die Tageskarte vor Ort kann abweichen.",
    },
    zettelwand: {
      rubrik: "Kleine Teller",
      titel: t.zettelwandTitel ?? "Kleine Teller",
      intro: t.zettelwandIntro ?? "Jeder Zettel lässt sich direkt vorbestellen.",
    },
    wochenplan: {
      rubrik: "Wochenplan",
      titel: t.wochenplanTitel ?? "Wann offen ist",
      heute: "heute",
      heuteOffen: "Heute geöffnet",
      heuteZu: "Heute geschlossen",
    },
    karte: { ...basis.karte, alleVegetarisch: "Alles in dieser Rubrik ist vegetarisch." },
    karteK: {
      rubrik: "Speisekarte",
      titel: cd.komposition?.karte === "tresen" ? "Am Tresen" : cd.komposition?.karte === "muster" ? "So könnte Ihre Karte aussehen" : "Die ganze Karte",
      musterHinweis: "Musterkarte aus unserem Katalog – Gerichte und Preise sind nicht die des Hauses. Wir setzen hier Ihre echte Karte ein.",
    },
    haus: {
      rubrik: "Das Haus",
      titel: name,
    },
    ambiente: {
      rubrik: t.ambienteRubrik ?? "Hausregeln",
      titel: t.ambienteTitel ?? "Gut zu wissen",
    },
    reservierungK: {
      rubrik: "Reservierung",
      titel: t.reservierungTitel ?? (aktion === "reservieren" ? "Tisch reservieren" : "Für Gruppen"),
      intro: t.reservierungIntro ?? "Datum, Uhrzeit, Personen – das Haus meldet sich mit einer Bestätigung.",
      aufklappen: "Tisch für eine Gruppe anfragen",
    },
    abholung: {
      rubrik: "Zum Mitnehmen",
      titel: hinweise.find((h) => /abhol|mitnehm/i.test(h)) ?? "Auch zum Abholen",
      text: "Gerichte in der Karte mit + vormerken, Abholzeit wählen, bezahlt wird vor Ort.",
      knopf: "Zur Karte",
    },
    kontaktK: {
      rubrik: "Anfahrt",
      titel: tatsache(briefing, "betrieb.adresse")?.split(",")[0] ?? "So finden Sie uns",
      zeitenUnbekannt: "Öffnungszeiten sind noch nicht bestätigt – bitte telefonisch erfragen.",
      google: "bei Google",
      bewertungen: "Bewertungen",
    },
    offen: {
      rubrik: "Entwurf",
      titel: "Was wir vom Haus noch brauchen",
      intro: "Diese Seite zeigt nur, was feststeht. Alles andere fragen wir beim Termin – und setzen es dann hier ein.",
    },
    fussK: {
      hinweis: briefing.fiktiv
        ? "Beispielseite der Agentur – dieses Lokal ist frei erfunden. Fotos sind Beispielfotos aus einer Bilddatenbank und als solche markiert."
        : freigegeben
          ? ""
          : "Unverbindlicher Gestaltungsentwurf – nicht die offizielle Website dieses Lokals. Als „Entwurf“ markierte Angaben sind noch nicht vom Haus bestätigt.",
    },
    leiste: briefing.fiktiv
      ? `Beispielseite – ${name} ist frei erfunden.`
      : `Unverbindlicher Entwurf – nicht die offizielle Website von ${name}.`,
    fotoMarke: "Beispielfoto",
  };
}

/** Öffnungszeiten: nur Tatsachen, sonst null. */
export function oeffnungszeiten(briefing) {
  const f = feldAn(briefing, "betrieb.oeffnungszeiten");
  return istTatsache(f) ? f.wert : null;
}
