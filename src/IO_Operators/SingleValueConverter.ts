import path from "path";
import * as XLSX from "xlsx";
import fs from "fs";

/**
 * Reads an Excel file and converts its content to JSON format.
 *
 * @param filePath - The path to the Excel file to be read.
 * @param options - Optional Parsing options including an optional column to filter by.
 * @returns A Promise that resolves to an array of JSON data extracted from the Excel file.
 * @throws Will throw an error if the specified column is not found.
 */
async function readExcel(filePath: string, options?: XLSX.ParsingOptions & { column?: string }): Promise<any[]> {
  // Read the Excel file into a workbook object
  const workbook = XLSX.readFile(filePath, options);

  // Get the name of the first sheet in the workbook
  const firstSheetName = workbook.SheetNames[0];

  // Access the first worksheet by its name
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert the worksheet data into JSON format
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
  });

  // If a specific column is specified, filter the data to include only that column
  if (options?.column) {
    const columnIndex = getColumnIndex(worksheet, options.column); // Helper function
    if (columnIndex === -1) {
      throw new Error(`Column "${options.column}" not found in Excel file.`);
    }
    return jsonData.map((row) => (row as any[])[columnIndex]);
  }

  // Return the complete JSON data if no specific column is specified
  return jsonData;
}


/**
 * Writes the provided data to a file in JSON format.
 *
 * @param filePath - The path to the file to be written.
 * @param data - The data to be written to the file.
 * @param pretty - An optional boolean indicating whether to format the JSON output with indentation. Defaults to true.
 * @returns A Promise that resolves when the data has been written to the file.
 */
async function writeJson(
  filePath: string,
  data: any,
  pretty: boolean = true
): Promise<void> {
  const jsonString = pretty
    ? JSON.stringify(data, null, 2) // Format the JSON output with indentation
    : JSON.stringify(data); // Write the JSON output in a single line
  fs.writeFileSync(filePath, jsonString); // Write the JSON output to the file
}

/**
 * Returns the column index of the specified column letter in the given worksheet.
 * 
 * @param sheet - The worksheet to search.
 * @param columnLetter - The column letter to search for (e.g. "A", "B", etc.).
 * @returns The column index of the specified column letter, or -1 if not found.
 */
function getColumnIndex(sheet: XLSX.WorkSheet, columnLetter: string): number {
  // Decode the range of cells in the worksheet
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");
  
  // Iterate through the columns in the range
  for (let c = range.s.c; c <= range.e.c; ++c) {
    // Encode the cell address using the current column index
    const address = XLSX.utils.encode_cell({ r: range.s.r, c });
    
    // Check if the cell address starts with the specified column letter
    if (address.startsWith(columnLetter)) {
      // Return the column index if a match is found
      return c;
    }
  }
  
  // Return -1 if the column letter is not found
  return -1;
}

// Dönüşüm Stratejileri (Önceki Önerilerden Uyarlanmış)
interface ExcelToJsonConverter {
  convert(excelData: any[], ...args: any[]): any;
}

class SheetNameExclusionConverter implements ExcelToJsonConverter {
  /**
   * Converts the provided column data by removing any entries that match the given sheet names.
   *
   * @param columnData - An array of strings representing data from a specific column in an Excel sheet.
   * @param sheetNames - An array of strings representing the names of sheets to be excluded from the column data.
   * @returns A new array of unique strings from the column data, excluding any entries that match the trimmed sheet names.
   */
  convert(columnData: string[], sheetNames: string[]): string[] {
    // Create a Set from the sheet names for efficient lookups
    const sheetNameSet = new Set(sheetNames.map((name) => name.trim()));

    // Filter out any entries that match the sheet names or are empty strings
    const filteredData = columnData
      .map((item) => item.trim())
      .filter((item) => item !== "" && !sheetNameSet.has(item));

    // Return a new array of unique strings from the filtered data
    return Array.from(new Set(filteredData));
  }
}

/**
 * Converts an Excel file to JSON format using the provided converter.
 *
 * @param excelFilePath - The path to the Excel file to be converted.
 * @param jsonFilePath - The path to write the converted JSON data to.
 * @param converter - An instance of a class implementing the ExcelToJsonConverter interface.
 * @param converterArgs - An optional array of arguments to be passed to the converter.
 */
async function convertExcelToJson(
  excelFilePath: string,
  jsonFilePath: string,
  converter: ExcelToJsonConverter,
  converterArgs: any[] = []
): Promise<void> {
  try {
    // Read the Excel file's data
    const excelData = await readExcel(excelFilePath, {
      column: converterArgs[1], // converterArgs[1] = column name
    });

    // Convert the Excel data to JSON using the provided converter
    const jsonData = converter.convert(excelData, converterArgs[0]); // converterArgs[0] = sheetNames

    // Write the JSON data to the specified file path
    await writeJson(jsonFilePath, jsonData);

    console.log(`Excel dosyası JSON'a dönüştürüldü: ${jsonFilePath}`);
  } catch (error: any) {
    console.error("Dönüşüm sırasında hata oluştu:", error);
    throw error;
  }
}

// Dosya Yolları
const downloadedExcelPath = path.resolve(
  "src/data/Gathered_Informations/Pads/Applications/excels/English_PAD_APPLICATIONS_TRW.xlsx"
);
const fullListExcelPath = path.resolve(
  "src/data/katalogInfo/excels/ExtendedList.xlsx"
);
const willBeScrapedJsonPath = path.resolve(
  "src/data/willBefixed/willBeScraped.json"
);

(async () => {
  try {
    const sheetNames = await readExcel(downloadedExcelPath); //read sheet names
    const exclusionConverter = new SheetNameExclusionConverter();
    await convertExcelToJson(
      fullListExcelPath,
      willBeScrapedJsonPath,
      exclusionConverter,
      [sheetNames, "C"]
    );
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
