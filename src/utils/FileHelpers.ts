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


export const padPairs = [

  { yvNo: "21827201", brandRefs: { "ICER": "181121" } },
  { yvNo: "21934201", brandRefs: { "ICER": "181707" } },
  { yvNo: "23215208", brandRefs: { "ICER": "181431" } },
  // { yvNo: "24137201", brandRefs: { "ICER": "181651" } },
  // { yvNo: "24142201", brandRefs: { "ICER": "181805" } },
  // { yvNo: "24170201", brandRefs: { "ICER": "181919" } },
  // { yvNo: "25014201", brandRefs: { "ICER": "182063" } },
  // { yvNo: "25147303", brandRefs: { "ICER": "141999" } },
  // { yvNo: "25965201", brandRefs: { "ICER": "182188" } },
  // { yvNo: "25603206", brandRefs: { "ICER": "142116-203" } },
  // { yvNo: "24098401", brandRefs: { "ICER": "181789" } },
  

];