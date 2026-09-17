// Vorformuliertes Anschreiben je Lead. Der Entwurf greift auf, was die
// Website-Analyse ergeben hat – ein Anschreiben, das den konkreten Punkt
// nennt, liest sich anders als ein Serienbrief.
//
// Bewusst ein Entwurf zum Kopieren, kein Versand: Kaltakquise per E-Mail ist
// in Deutschland heikel (§ 7 UWG). Jede Ansprache gehört einzeln geprüft und
// von Hand abgeschickt.

function anrede(lead) {
  // "von" statt "vom": der Artikel müsste sonst zum Namen passen, und der
  // ist mal männlich ("zum Hirschen"), mal weiblich ("die Döneria").
  return lead.name ? `Guten Tag, liebes Team von ${lead.name},` : "Guten Tag,";
}

/**
 * Der konkrete Aufhänger: Was fehlt diesem Lokal im Netz?
 */
export function aufhaenger(lead) {
  if (lead.hatWebsite === false) {
    return "mir ist aufgefallen, dass bei Ihrem Google-Eintrag keine eigene Website hinterlegt ist. Wer Sie sucht, landet also beim Eintrag – und muss zum Reservieren anrufen.";
  }
  if (lead.websiteErreichbar === false) {
    return "beim Aufrufen Ihrer hinterlegten Website kam bei mir keine Seite zustande. Falls das länger so ist, verlieren Sie damit jeden Gast, der Sie online sucht.";
  }
  if (lead.hatBestellfunktion === false && lead.hatReservierungsfunktion === false) {
    return "auf Ihrer Website können Gäste derzeit weder einen Tisch reservieren noch Essen zur Abholung vorbestellen – beides läuft also übers Telefon, auch wenn bei Ihnen gerade Hochbetrieb ist.";
  }
  if (lead.hatReservierungsfunktion === false) {
    return "auf Ihrer Website können Gäste derzeit keinen Tisch reservieren. Wer abends um elf auf die Idee kommt, muss sich merken, am nächsten Tag anzurufen.";
  }
  if (lead.hatBestellfunktion === false) {
    return "auf Ihrer Website können Gäste derzeit nichts zur Abholung vorbestellen – jede Bestellung bindet damit jemanden am Telefon.";
  }
  if (lead.mobilFreundlich === false) {
    return "Ihre Website ist auf dem Handy schwer zu bedienen. Die allermeisten Gäste suchen ein Lokal genau dort, meist von unterwegs.";
  }
  return "ich habe mir Ihren Auftritt im Netz angesehen und glaube, dass sich daraus mehr machen lässt.";
}

function lobZeile(lead) {
  if (!lead.rating || !lead.anzahlBewertungen) return "";
  if (Number(lead.rating) < 4.3) return "";

  const anzahl = String(lead.anzahlBewertungen).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `\n\nBei ${String(lead.rating).replace(".", ",")} Sternen aus ${anzahl} Bewertungen spricht die Küche ohnehin für sich – es geht mir nur darum, dass Gäste das auch online genauso einfach finden.`;
}

export function betreff(lead) {
  return lead.name
    ? `Website-Entwurf für ${lead.name} – unverbindlich ansehen`
    : "Website-Entwurf – unverbindlich ansehen";
}

/**
 * Baut den Anschreiben-Entwurf. Ohne Demo-Adresse bleibt der Link-Absatz weg,
 * damit kein toter Verweis im Text steht.
 */
export function anschreibenText(lead, demoUrl, absender = "") {
  const linkAbsatz = demoUrl
    ? `Damit Sie sich das nicht nur vorstellen müssen, habe ich Ihnen einen fertigen Entwurf gebaut. Er zeigt, wie Gäste bei Ihnen online einen Tisch reservieren und Essen zur Abholung vorbestellen könnten:\n\n${demoUrl}\n\nGerichte, Preise und Fotos darin sind Platzhalter – die tauschen wir gegen Ihre echten, sobald Sie mögen.`
    : "Ich habe dazu einen Entwurf vorbereitet, den ich Ihnen gerne zeige.";

  return [
    anrede(lead),
    "",
    `${aufhaenger(lead)}${lobZeile(lead)}`,
    "",
    linkAbsatz,
    "",
    "Der Entwurf ist unverbindlich und kostet Sie nichts. Wenn es passt, komme ich diese Woche kurz bei Ihnen vorbei – und wenn Sie kein Interesse haben, sagen Sie einfach Bescheid, dann melde ich mich nicht wieder.",
    "",
    "Viele Grüße",
    absender || "[Dein Name]",
  ].join("\n");
}

export function anschreiben(lead, demoUrl, absender) {
  return {
    betreff: betreff(lead),
    text: anschreibenText(lead, demoUrl, absender),
  };
}
