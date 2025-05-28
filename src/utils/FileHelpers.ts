import * as fs from "fs";
import * as path from "path";
import { ProductReference } from "./ScraperHelpers";

export const retryListFilePath = path.resolve(__dirname, '../data/willBefixed/reTry.json');

export function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } else {
      const folderPath = path.dirname(filePath);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf-8");
    }
  } catch (err) {
    console.error(`Error reading JSON file at ${filePath}:`, err);
  }
  return fallback;
}


export function getSubfolderNamesSync(dirPath: string): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
}


export const padPairs: ProductReference[] = [
  // { yvNo: "20341401", brandRefs: { "ICER": "180324" } },
  { yvNo: "21201201", brandRefs: { "ICER": "181366" } },
  { yvNo: "21312201", brandRefs: { "ICER": "180752-701" } },
  { yvNo: "21347201", brandRefs: { "ICER": "140884" } },
  { yvNo: "21576201", brandRefs: { "ICER": "141104-046" } },
  { yvNo: "21621201", brandRefs: { "ICER": "141102" } },
  { yvNo: "21857201", brandRefs: { "ICER": "181150" } },
  { yvNo: "22531201", brandRefs: { "ICER": "182198-200" } },
  { yvNo: "23177401", brandRefs: { "ICER": "180674-700" } },
  { yvNo: "23258108", brandRefs: { "ICER": "181271-702" } },
  { yvNo: "23554410", brandRefs: { "ICER": "180697-703" } },
  { yvNo: "23775201", brandRefs: { "ICER": "181596" } },
  { yvNo: "23901206", brandRefs: { "ICER": "141103" } },
  { yvNo: "24072401", brandRefs: { "ICER": "181659" } },
  { yvNo: "24510201", brandRefs: { "ICER": "181798" } },
  { yvNo: "24710201", brandRefs: { "ICER": "181856" } },
  { yvNo: "24883401", brandRefs: { "ICER": "181925-201" } },
  { yvNo: "26188208", brandRefs: { "ICER": "182410-203" } },
  { yvNo: "29153401", brandRefs: { "ICER": "141126-700" } }
];