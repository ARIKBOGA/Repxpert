import path from 'path';
import * as XLSX from 'xlsx';
import fs from 'fs';

const downloaded = path.resolve('src/data/Gathered_Informations/Pads/Applications/excels/English_PAD_APPLICATIONS_TRW.xlsx');
const fullList = path.resolve('src/data/katalogInfo/excels/ExtendedList.xlsx');


export const readSheetNamesExcelFile = (filePath: string): string[] => {
    try {
        return XLSX.readFile(filePath).SheetNames;
    } catch (error: any) {
        console.error('Error reading Excel file:', error.message);
        return [];
    }
};

export const readColumnFromExcel = (filePath: string, columnLetter: string): string[] => {
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(sheet['!ref'] || '');
        const columnData: string[] = [];

        for (let row = range.s.r; row <= range.e.r; row++) {
            const cellAddress = `${columnLetter}${row + 1}`;
            const cell = sheet[cellAddress];
            if (cell) {
                columnData.push(cell.v.toString());
            }
        }
        const result: string[] = [];
        for (let i = 1; i < columnData.length; i++) {
            const item = columnData[i];
            const trimmedItem = item.trim();
            if (trimmedItem === "") continue;
            if (trimmedItem.includes(", ")) {
                const items = trimmedItem.split(", ");
                for (const subItem of items) {
                    const trimmedSubItem = subItem.trim();
                    if (trimmedSubItem !== "") {
                        result.push(trimmedSubItem);
                    }
                }
                continue;
            }
            result.push(trimmedItem);

        }
        return result;
    } catch (error: any) {
        console.error('Error reading column from Excel file:', error.message);
        return [];
    }
}


let sheetNames = readSheetNamesExcelFile(downloaded);
let columnData = readColumnFromExcel(fullList, "C");

const set2 = new Set(sheetNames);
let result: Set<string> | string[] = columnData.filter(item => !set2.has(item));
result = Array.from(new Set(result.map(item => item.trim())));

console.log("Sheet names count: " + sheetNames.length);
console.log("Column data count: " + columnData.length);
console.log("Result count: " + result.length);

fs.writeFileSync('src/data/willBefixed/willBeScraped.json', JSON.stringify(result));