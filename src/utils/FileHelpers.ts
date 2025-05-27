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

  { yvNo: "21621201", brandRefs: { "ICER": "141102" } },
  { yvNo: "23554410", brandRefs: { "ICER": "180697-703" } },
  { yvNo: "23775201", brandRefs: { "ICER": "181596" } },
  { yvNo: "23901206", brandRefs: { "ICER": "141103" } },
  { yvNo: "24510201", brandRefs: { "ICER": "181798" } },
  { yvNo: "24710201", brandRefs: { "ICER": "181856" } },
  // { yvNo: "20906207", brandRefs: { "BREMBO": "P 61 099" } },
  // { yvNo: "21365401", brandRefs: { "BREMBO": "P 23 096" } },
  // { yvNo: "21576206", brandRefs: { "BREMBO": "P 50 080" } },
  // { yvNo: "23018104", brandRefs: { "BREMBO": "P 85 085" } },
  // { yvNo: "23057201", brandRefs: { "BREMBO": "P 59 045" } },
  // { yvNo: "23130203", brandRefs: { "BREMBO": "P 85 072" } },
  // { yvNo: "23138401", brandRefs: { "BREMBO": "P 50 058" } },
  // { yvNo: "23290408", brandRefs: { "BREMBO": "P 54 020" } },
  // { yvNo: "23312201", brandRefs: { "BREMBO": "P 06 054" } },
  // { yvNo: "23417201", brandRefs: { "BREMBO": "P 30 120" } },
  // { yvNo: "23584408", brandRefs: { "BREMBO": "P 54 030" } },
  // { yvNo: "23682204", brandRefs: { "BREMBO": "P 85 102" } },
  // { yvNo: "23711303", brandRefs: { "BREMBO": "P 23 145" } },
  // { yvNo: "23730201", brandRefs: { "BREMBO": "P 06 026" } },
  // { yvNo: "23845201", brandRefs: { "BREMBO": "P 49 023" } },
  // { yvNo: "24079203", brandRefs: { "BREMBO": "P 36 027" } },
  // { yvNo: "24175104", brandRefs: { "BREMBO": "P 61 109" } },
  // { yvNo: "24451408", brandRefs: { "BREMBO": "P 83 141" } },
  // { yvNo: "24467103", brandRefs: { "BREMBO": "P 23 136" } },
  // { yvNo: "24922401", brandRefs: { "BREMBO": "P 06 102" } },
  // { yvNo: "25016201", brandRefs: { "BREMBO": "P 83 133" } },
  // { yvNo: "25096201", brandRefs: { "BREMBO": "P 59 080" } },
  // { yvNo: "25110401", brandRefs: { "BREMBO": "P 85 135" } },
  // { yvNo: "25202408", brandRefs: { "BREMBO": "P 79 028" } },
  // { yvNo: "25683201", brandRefs: { "BREMBO": "P 85 147" } },
  // { yvNo: "25833201", brandRefs: { "BREMBO": "P 61 127" } },
  // { yvNo: "21934201", brandRefs: { "ICER": "181707" } },
  // { yvNo: "23215208", brandRefs: { "ICER": "181431" } },
  // { yvNo: "24137201", brandRefs: { "ICER": "181651" } },
  // { yvNo: "24142201", brandRefs: { "ICER": "181805" } },
  // { yvNo: "24170201", brandRefs: { "ICER": "181919" } },
  // { yvNo: "25014201", brandRefs: { "ICER": "182063" } },
  // { yvNo: "25147303", brandRefs: { "ICER": "141999" } },
  // { yvNo: "25965201", brandRefs: { "ICER": "182188" } },
  // { yvNo: "25603206", brandRefs: { "ICER": "142116-203" } },
  // { yvNo: "24098401", brandRefs: { "ICER": "181789" } },
  

];