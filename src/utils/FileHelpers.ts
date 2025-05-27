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
  { yvNo: "20341401", brandRefs: { "ICER": "180324" } },
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
  { yvNo: "29153401", brandRefs: { "ICER": "141126-700" } },


  // { yvNo: "21621201", brandRefs: { "ICER": "141102" } },
  // { yvNo: "23554410", brandRefs: { "ICER": "180697-703" } },
  // { yvNo: "23775201", brandRefs: { "ICER": "181596" } },
  // { yvNo: "23901206", brandRefs: { "ICER": "141103" } },
  // { yvNo: "24510201", brandRefs: { "ICER": "181798" } },
  // { yvNo: "24710201", brandRefs: { "ICER": "181856" } },
  // { yvNo: "25833201", brandRefs: { "BREMBO": "P 61 127" } },
  { yvNo: "23510101", brandRefs: { "BREMBO": "P 83 051" } },
  { yvNo: "21056401", brandRefs: { "BREMBO": "P 50 134" } },
  // { yvNo: "20392401", brandRefs: { "BREMBO": "P 50 002" } },
  // { yvNo: "22434401", brandRefs: { "BREMBO": "P 83 160" } },
  // { yvNo: "23914401", brandRefs: { "BREMBO": "P 85 073" } },
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