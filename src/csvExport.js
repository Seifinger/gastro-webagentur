import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { outputDir } from "./config.js";

const COLUMNS = [
  "name",
  "adresse",
  "telefon",
  "website",
  "hatWebsite",
  "rating",
  "anzahlBewertungen",
  "placeId",
  "ort",
];

function escapeCsvValue(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(leads) {
  const header = COLUMNS.join(",");
  const rows = leads.map((lead) =>
    COLUMNS.map((column) => escapeCsvValue(lead[column])).join(","),
  );
  return [header, ...rows].join("\n");
}

export function writeLeadsCsv(leads, regionLabel) {
  mkdirSync(outputDir, { recursive: true });

  const datestamp = new Date().toISOString().slice(0, 10);
  const safeLabel = regionLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const filePath = path.join(outputDir, `leads-${safeLabel}-${datestamp}.csv`);

  writeFileSync(filePath, toCsv(leads), "utf-8");
  return filePath;
}
