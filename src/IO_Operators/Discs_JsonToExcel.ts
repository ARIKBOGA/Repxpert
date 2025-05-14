import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

interface SpecificationData {
  [key: string]: string;
}

interface CrossReference {
  brand: string;
  oe: string;
}

interface ProductJson {
  oe: string;
  productID: string;
  productType: string;
  specifications: SpecificationData;
  crossReferences: CrossReference[];
}

const rootDir = path.resolve(__dirname, "../data/Gathered_Informations/Discs/Technical_Details");
const allRows: Record<string, string>[] = [];

const allSpecKeys = new Set<string>();
let maxCrossRefCount = 0;

// 1. Tüm json dosyalarını tara
const oeFolders = fs.readdirSync(rootDir, { withFileTypes: true }).filter(d => d.isDirectory());

for (const folder of oeFolders) {
  const folderPath = path.join(rootDir, folder.name);
  const jsonFiles = fs.readdirSync(folderPath).filter(file => file.endsWith(".json"));

  for (const file of jsonFiles) {
    const filePath = path.join(folderPath, file);
    const raw = fs.readFileSync(filePath, "utf-8");
    const data: ProductJson = JSON.parse(raw);

    const row: Record<string, string> = {
      OE: data.oe,
      "Product ID": data.productID,
      "Product Type": data.productType,
    };

    // Spec değerlerini ekle
    for (const [key, value] of Object.entries(data.specifications)) {
      row[key] = value;
      allSpecKeys.add(key);
    }

    // Cross references
    data.crossReferences.forEach((ref, index) => {
      row[`OE_${index + 1}`] = `${ref.brand} | ${ref.oe}`;
    });

    maxCrossRefCount = Math.max(maxCrossRefCount, data.crossReferences.length);
    allRows.push(row);
  }
}

// 2. Başlıkları sırala
const headers = [
  "OE",
  "Product ID",
  "Product Type",
  ...Array.from(allSpecKeys),
  ...Array.from({ length: maxCrossRefCount }, (_, i) => `OE_${i + 1}`),
];

// 3. Sheet oluştur
const worksheetData = [headers];

for (const rowObj of allRows) {
  const row = headers.map(h => rowObj[h] || "");
  worksheetData.push(row);
}

const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Discs");

// 4. Dosyaya yaz
const outputPath = path.resolve(__dirname, "../data/Discs_Technical_Details_XLSX.xlsx");
XLSX.writeFile(workbook, outputPath);
console.log(`✅ Excel dosyası oluşturuldu: ${outputPath}`);
