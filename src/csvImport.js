import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { outputDir } from "./config.js";

const BOOLEAN_COLUMNS = [
  "hatWebsite",
  "websiteErreichbar",
  "hatBestellfunktion",
  "hatReservierungsfunktion",
  "mobilFreundlich",
  "wirktVeraltet",
];
const NUMBER_COLUMNS = ["score", "rating", "anzahlBewertungen"];

/**
 * Sehr einfacher CSV-Parser passend zum Format aus csvExport.js
 * (Komma-getrennt, Felder mit Komma/Anführungszeichen/Zeilenumbruch in "..." gequoted,
 * doppelte Anführungszeichen als Escape für ein Anführungszeichen).
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.length > 1 || r[0] !== "");
}

function rowsToLeads(rows) {
  const [header, ...dataRows] = rows;
  return dataRows.map((values) => {
    const lead = {};
    header.forEach((column, index) => {
      const raw = values[index] ?? "";
      if (BOOLEAN_COLUMNS.includes(column)) {
        lead[column] = raw === "true" ? true : raw === "false" ? false : "";
      } else if (NUMBER_COLUMNS.includes(column) && raw !== "") {
        lead[column] = Number(raw);
      } else {
        lead[column] = raw;
      }
    });
    return lead;
  });
}

export function parseLeadsCsv(text) {
  return rowsToLeads(parseCsv(text));
}

/**
 * Liest alle bisher exportierten CSV-Dateien ein und fasst sie zu einer
 * deduplizierten Lead-Liste zusammen. Bei mehrfachen Läufen für denselben
 * Ort gewinnt der Lead aus der zuletzt geschriebenen Datei.
 */
export function readAllLeads() {
  let files;
  try {
    files = readdirSync(outputDir).filter((f) => f.endsWith(".csv"));
  } catch {
    return [];
  }

  const filesByAge = files
    .map((file) => {
      const filePath = path.join(outputDir, file);
      return { filePath, mtime: statSync(filePath).mtimeMs };
    })
    .sort((a, b) => a.mtime - b.mtime);

  const leadsByPlaceId = new Map();
  for (const { filePath } of filesByAge) {
    const text = readFileSync(filePath, "utf-8");
    for (const lead of parseLeadsCsv(text)) {
      if (lead.placeId) leadsByPlaceId.set(lead.placeId, lead);
    }
  }

  return [...leadsByPlaceId.values()];
}
