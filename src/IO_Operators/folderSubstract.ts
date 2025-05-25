import path from "path";
import { getSubfolderNamesSync } from "../utils/FileHelpers";
import * as XLSX from "xlsx";

// Read subFolder names from a directory into an array
const dirPath = path.resolve(__dirname, "../data/Gathered_Informations/Pads/CrossNumbers/YV_CODES");
const subfolders = getSubfolderNamesSync(dirPath);

// Read YV NOs from an excel file into an array
const filePath = path.resolve(__dirname, "../data/katalogInfo/excels/Pads_katalog_full.xlsx");
const yvNoSheetName = "Sheet1";

// Read the Excel file
const workbook = XLSX.readFile(filePath);
const worksheet = workbook.Sheets[yvNoSheetName];
const excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

const yvNoColumnIndex = 0;
const yvNoColumn = excelData.slice(1).map((row) => String((row as any[])[yvNoColumnIndex]).trim());
const yvNoSet = new Set(yvNoColumn); // Store YV NOs in a Set for faster lookup

// ---
// Find folders that are present in the folders but missing in the Excel file
const missingInExcel = subfolders.filter((folderName) => !yvNoSet.has(folderName));
console.log("YV NOs present in folders but missing in Excel:", missingInExcel);

// ---
// Find YV NOs that are present in the Excel file but missing in the folders
const missingInFolders = Array.from(yvNoSet).filter((yvNo) => !subfolders.includes(yvNo));
console.log("\nYV NOs present in Excel but missing in folders:", missingInFolders);