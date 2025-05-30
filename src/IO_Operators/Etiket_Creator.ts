// src/main.ts
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

interface AppEntry {
  brand: string;
  model: string;
  engineType: string;
  madeYear: string;
  kw: string;
  hp: string;
  cc: string;
  engineCodes: string;
  KBA_Numbers: string;
}

// Yardımcı: PascalCase yapar
function toPascalCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
}

// Yardımcı: Model adlarını anlamlı şekilde kısalt
function shortenModel(model: string): string {
  // "|" ile ayrılmış kısımlardan en kısa olanı ve içindeki en belirgin anahtar kelimeyi seç
  const parts = model.split("|").map((s) => s.trim());
  parts.sort((a, b) => a.length - b.length); // en kısa öncelikli
  return toPascalCase(parts[0]); // örneğin: "TIIDA"
}

// Yardımcı: En çok geçenleri al
function getTopEntries<T>(map: Map<T, number>, limit: number): T[] {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

function processFile(filePath: string): [string, string] {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const data: AppEntry[] = JSON.parse(fileContent);

  const brandModelMap = new Map<string, Map<string, number>>();
  const brandCountMap = new Map<string, number>();

  for (const entry of data) {
    const brand = entry.brand.trim().toUpperCase();
    const model = shortenModel(entry.model);

    brandCountMap.set(brand, (brandCountMap.get(brand) || 0) + 1);
    if (!brandModelMap.has(brand)) {
      brandModelMap.set(brand, new Map());
    }

    const modelMap = brandModelMap.get(brand)!;
    modelMap.set(model, (modelMap.get(model) || 0) + 1);
  }

  const topBrands = getTopEntries(brandCountMap, 5);

  const lines: string[] = [];

  for (const brand of topBrands) {
    const modelMap = brandModelMap.get(brand)!;
    const topModels = getTopEntries(modelMap, 10); // max 10 model yazmaya çalış

    const line = `**${brand}** - ${topModels.join(", ")}`;
    lines.push(line);
  }

  // Satır limiti 4, toplam karakter limiti 65 * 4 = 260
  let totalText = "";
  for (let i = 0; i < lines.length; i++) {
    if ((totalText + lines[i] + "\n").length <= 260) {
      totalText += lines[i] + "\n";
    } else {
      break;
    }
  }

  const filename = path.basename(filePath);
  const crossNumber = filename.split("_")[1].replace(".json", "");
  return [crossNumber, totalText.trim()];
}

// === Main Akış ===

const inputDir = path.join(__dirname, "..", "data/Gathered_Informations/Pad/Applications/TR/NewlyAdded/ICER/140884");
const outputExcel = path.join(__dirname, "..", "data/Gathered_Informations/Pad/Applications/excels", "ETIKET_VERILERI.xlsx");

const rows: [string, string][] = [];

const files = fs.readdirSync(inputDir).filter((f) => f.endsWith(".json"));
//console.log("Dosyalar okundu:", files.length);
for (const file of files) {
  const fullPath = path.join(inputDir, file);
  const [cross, etiket] = processFile(fullPath);
  rows.push([cross, etiket]);
}

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([["CROSS", "ETIKET"], ...rows]);
XLSX.utils.book_append_sheet(wb, ws, "Etiketler");
XLSX.writeFile(wb, outputExcel);

console.log("Excel dosyası oluşturuldu:", outputExcel);
