import path from "path";
import * as XLSX from "xlsx";
import fs from "fs";

// Ortak Yardımcı Fonksiyonlar
async function readSheetNames(filePath: string): Promise<string[]> {
  try {
    const workbook = XLSX.readFile(filePath);
    return workbook.SheetNames;
  } catch (error: any) {
    console.error("Error reading Excel file:", error.message);
    return [];
  }
}

async function readColumnFromExcel(
  filePath: string,
  columnLetter: string
): Promise<any[]> {
  try {
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");
    const columnData: any[] = [];

    for (let row = range.s.r; row <= range.e.r; row++) {
      const cellAddress = `${columnLetter}${row + 1}`;
      const cell = worksheet[cellAddress];
      if (cell) {
        columnData.push(cell.v);
      }
    }
    return columnData.slice(1); // Başlık satırını atla
  } catch (error: any) {
    console.error("Error reading column from Excel file:", error.message);
    return [];
  }
}

async function writeJson(
  filePath: string,
  data: any,
  pretty: boolean = true
): Promise<void> {
  const jsonString = pretty
    ? JSON.stringify(data, null, 2)
    : JSON.stringify(data);
  fs.writeFileSync(filePath, jsonString);
}

// Dönüşüm Stratejileri
interface ExcelToJsonConverter {
  convert(columnData: any[], sheetNames: string[]): string[];
}

class SheetNameExclusionConverter implements ExcelToJsonConverter {
  convert(columnData: any[], sheetNames: string[]): string[] {
    const trimmedSheetNames = sheetNames.map((name) =>
      typeof name === "string" ? name.trim().toLowerCase() : String(name).trim().toLowerCase()
    );
    const sheetNameSet = new Set(trimmedSheetNames);
    const result: string[] = [];

    if (Array.isArray(columnData)) {
      for (const item of columnData) {
        if (!item || String(item).trim() === "Textar" || String(item).trim() === "") {
          continue;
        }
        const trimmedItem = String(item).trim().toLowerCase();
        if (trimmedItem.includes(", ")) {
          const subItems = trimmedItem.split(", ");
          for (const subItem of subItems) {
            const trimmedSubItem = subItem.trim();
            if (trimmedSubItem !== "" && !sheetNameSet.has(trimmedSubItem)) {
              result.push(trimmedSubItem);
            }
          }
        } else if (!sheetNameSet.has(trimmedItem)) {
          result.push(trimmedItem);
        }
      }
    }
    return Array.from(new Set(result));
  }
}

// Dosya Yolları
const downloadedExcelPath_TEXTAR = path.resolve(
  "src/data/Gathered_Informations/Pads/Applications/excels/English_PAD_APPLICATIONS_TEXTAR.xlsx"
);
const fullListExcelPath = path.resolve(
  "src/data/katalogInfo/excels/ExtendedList.xlsx"
);
const willBeScrapedJsonPath = path.resolve(
  "src/data/willBefixed/willBeScraped.json"
);

(async () => {
  try {
    const existingSheetNames = await readSheetNames(downloadedExcelPath_TEXTAR);
    const extendedListValues = await readColumnFromExcel(
      fullListExcelPath,
      "B"
    );
    const exclusionConverter = new SheetNameExclusionConverter();
    const valuesToScrape = exclusionConverter.convert(
      extendedListValues,
      existingSheetNames
    );
    await writeJson(willBeScrapedJsonPath, valuesToScrape);
    console.log("Eksik değerler JSON dosyasına yazıldı:", willBeScrapedJsonPath);
  } catch (error) {
    console.error("Bir hata oluştu:", error);
  }
})();