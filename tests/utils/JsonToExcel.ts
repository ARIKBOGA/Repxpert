import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

interface Product {
  reference_OE: string; // Ürünün referansı
  id: string;
  name: string;
  brand: string;
  wvaNumbers?: string[];
  oeNumbers?: string[];
  eanNumber?: string;
  dimensions?: {
    manufacturerRestriction?: string;
    width?: string;
    height?: string;
    thickness?: string;
    checkmark?: string;
    SVHC?: string;
  };
}

// Ana klasör yolu
const ROOT_DIR = "./data/TRW";

// Excel'e yazmak üzere tüm verileri bu dizide toplayacağız
const excelData: any[] = [];

function getAllJsonFiles(dirPath: string): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return getAllJsonFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      return [fullPath];
    }
    return [];
  });
}

function prepareRow(json: Product): any {
    const idColumnName = `${json.brand}_ID`;
  const row: any = {
    REFERENCE_OE: json.reference_OE || "",
    [idColumnName]: json.id || "",
    BRAND: json.brand || "",
    EAN: json.eanNumber || "",
    MANUFACTURER_RESTRICTION: json.dimensions?.manufacturerRestriction || "",
    WIDTH: json.dimensions?.width || "",
    HEIGHT: json.dimensions?.height || "",
    THICKNESS: json.dimensions?.thickness || "",
    CHECKMARK: json.dimensions?.checkmark || "",
  };

  // wvaNumbers: wva1, wva2, wva3, ...
  const wva = json.wvaNumbers || [];
  for (let i = 0; i < 4; i++) {
    row[`WVA_${i + 1}`] = wva[i] || "";
  }

  // oeNumbers: oe1, oe2, oe3, ...
  const oe = json.oeNumbers || [];
  oe.forEach((num, index) => {
    row[`OE_${index + 1}`] = num;
  });

  return row;
}

function exportToExcel(data: any[], outputPath: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  XLSX.writeFile(wb, outputPath);
}

function main() {
  const jsonFiles = getAllJsonFiles(ROOT_DIR);

  jsonFiles.forEach((filePath) => {
    const raw = fs.readFileSync(filePath, "utf-8");
    try {
      const json: Product = JSON.parse(raw);
      const row = prepareRow(json);
      excelData.push(row);
    } catch (err) {
      console.error(`Hatalı JSON: ${filePath}`, err);
    }
  });

  exportToExcel(excelData, "output.xlsx");
  console.log(`✅ Excel dosyası oluşturuldu: output.xlsx`);
}

main();
