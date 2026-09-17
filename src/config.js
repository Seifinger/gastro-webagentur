import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const regionsPath = path.join(__dirname, "..", "data", "regions.json");

export const apiKey = process.env.GOOGLE_PLACES_API_KEY;

export function loadRegions() {
  return JSON.parse(readFileSync(regionsPath, "utf-8"));
}

export const outputDir = path.join(__dirname, "..", "data", "output");
