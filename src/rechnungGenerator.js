import PDFDocument from "pdfkit";

// Erzeugt die Ausfallpauschale-Rechnung als PDF, sobald der Wirt eine
// Nichtabholung bestätigt (siehe bestaetigeNoShow in betriebStore.js).
// pdfkit ist reines JavaScript ohne externen Prozess oder native
// Abhängigkeiten – läuft überall, wo auch der Rest dieses Projekts läuft.

function euro(betrag) {
  return `${Number(betrag).toFixed(2).replace(".", ",")} €`;
}

function datumUhrzeit(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Baut die Rechnung und gibt sie als Buffer zurück (PDF-Bytes) – bereit für
 * einen E-Mail-Anhang oder zum direkten Speichern.
 */
export function erzeugeNoShowRechnung({ betrieb, bestellung, betrag, bankverbindung }) {
  return new Promise((resolve, reject) => {
    // compress: false hält die Textinhalte im PDF unkomprimiert – so lässt
    // sich in Tests ohne eigenen PDF-Parser prüfen, dass alle Pflichtangaben
    // wirklich im Dokument stehen (siehe test/rechnungGenerator.test.js).
    const doc = new PDFDocument({ margin: 50, compress: false });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text("Rechnung: Ausfallpauschale", { underline: true });
    doc.moveDown();

    doc.fontSize(11);
    doc.text(`Betrieb: ${betrieb}`);
    doc.text(`Rechnungsdatum: ${new Date().toLocaleDateString("de-DE")}`);
    doc.text(`Bestellnummer: ${bestellung.nummer}`);
    doc.moveDown();

    doc.text("Kunde");
    doc.text(bestellung.name);
    if (bestellung.telefon) doc.text(`Telefon: ${bestellung.telefon}`);
    if (bestellung.email) doc.text(`E-Mail: ${bestellung.email}`);
    doc.moveDown();

    doc.text("Bestelldetails");
    for (const position of bestellung.positionen) {
      doc.text(`${position.menge} × ${position.name} – ${euro(position.preis * position.menge)}`);
    }
    doc.text(`Gesamt der Bestellung: ${euro(bestellung.gesamt)}`);
    doc.moveDown();

    doc.text("Zustimmung des Kunden");
    doc.text(bestellung.noShowZustimmung?.text ?? "(kein Zustimmungstext hinterlegt)");
    doc.text(`Zugestimmt am: ${datumUhrzeit(bestellung.noShowZustimmung?.zeitpunkt)}`);
    doc.moveDown();

    doc.fontSize(14).text(`Ausfallpauschale: ${euro(betrag)}`);
    doc.moveDown();

    doc.fontSize(11).text("Bankverbindung");
    doc.text(bankverbindung || "(keine Bankverbindung hinterlegt – bitte beim Betrieb erfragen)");

    doc.end();
  });
}
