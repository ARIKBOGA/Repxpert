import path from 'path';
import * as XLSX from 'xlsx';
import fs from 'fs';

// Ortak Yardımcı Fonksiyonlar (Önceki Önerilerden)
async function readExcel(filePath: string, options?: XLSX.ParsingOptions & { column?: string }): Promise<any[]> {
    const workbook = XLSX.readFile(filePath, options);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

    if (options?.column) {
        const columnIndex = getColumnIndex(worksheet, options.column); // Helper function
        if (columnIndex === -1) {
            throw new Error(`Column "${options.column}" not found in Excel file.`);
        }
        return jsonData.map(row => (row as any[])[columnIndex]);
    }
    return jsonData;
}

async function writeJson(filePath: string, data: any, pretty: boolean = true): Promise<void> {
    const jsonString = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    fs.writeFileSync(filePath, jsonString);
}

// Yeni Helper Fonksiyon
function getColumnIndex(sheet: XLSX.WorkSheet, columnLetter: string): number {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    for (let c = range.s.c; c <= range.e.c; ++c) {
        const address = XLSX.utils.encode_cell({ r: range.s.r, c });
        if (address.startsWith(columnLetter)) {
            return c;
        }
    }
    return -1;
}


// Dönüşüm Stratejileri (Önceki Önerilerden Uyarlanmış)
interface ExcelToJsonConverter {
    convert(excelData: any[], ...args: any[]): any;
}

class SheetNameExclusionConverter implements ExcelToJsonConverter {
    convert(columnData: string[], sheetNames: string[]): string[] {
        const sheetNameSet = new Set(sheetNames);
        let result = columnData.filter(item => !sheetNameSet.has(item.trim()));
        result = Array.from(new Set(result.map(item => item.trim()))); //remove duplicates
        return result;
    }
}

// Ana Dönüşüm Fonksiyonu (Önceki Önerilerden Uyarlanmış)
async function convertExcelToJson(
    excelFilePath: string,
    jsonFilePath: string,
    converter: ExcelToJsonConverter,
    converterArgs: any[] = []
): Promise<void> {
    try {
        const excelData = await readExcel(excelFilePath, { column: converterArgs[1] }); //converterArgs[1] = column name
        const jsonData = converter.convert(excelData, converterArgs[0]);  // converterArgs[0] = sheetNames
        await writeJson(jsonFilePath, jsonData);
        console.log(`Excel dosyası JSON'a dönüştürüldü: ${jsonFilePath}`);
    } catch (error: any) {
        console.error('Dönüşüm sırasında hata oluştu:', error);
        throw error;
    }
}

// Dosya Yolları
const downloadedExcelPath = path.resolve('src/data/Gathered_Informations/Pads/Applications/excels/English_PAD_APPLICATIONS_TRW.xlsx');
const fullListExcelPath = path.resolve('src/data/katalogInfo/excels/ExtendedList.xlsx');
const willBeScrapedJsonPath = path.resolve('src/data/willBefixed/willBeScraped.json');

(async () => {
    try {
        const sheetNames = await readExcel(downloadedExcelPath); //read sheet names
        const exclusionConverter = new SheetNameExclusionConverter();
        await convertExcelToJson(fullListExcelPath, willBeScrapedJsonPath, exclusionConverter, [sheetNames, "C"]);
    
    } catch (error) {
        console.error("An error occurred:", error);
    }
})();