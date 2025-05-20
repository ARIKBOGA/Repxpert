import * as fs from "fs";
import * as path from "path";

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


export const balata_katalog_full = [

  { yvNo: "21945204", brandRefs: { "ICER": "181157-203" } },
  { yvNo: "23669401", brandRefs: { "ICER": "141511-703" } },
  { yvNo: "23549408", brandRefs: { "ICER": "181165-700" } },
  { yvNo: "24098401", brandRefs: { "ICER": "181789" } },
  { yvNo: "25603206", brandRefs: { "ICER": "142116-203" } },
  { yvNo: "25205101", brandRefs: { "ICER": "181826-201" } }

];