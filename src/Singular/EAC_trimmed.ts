import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";
import * as fs from "fs";
import * as path from "path";
import XLSX from "xlsx";
import { barcode_current_initials, current_Pad_numbers_set_array, unique_current_disc_drum_numbers, unique_current_disc_drum_yvno, unique_current_disc_drum_yvno_set } from "../utils/variables";
import { createDocxDocument, writeToWord } from "./EAC_helpers";

const barcode_initials: string[] = Array.from({ length: 150 }, (_, i) => String(i + 10));
const disc_drum_yvno_range: string[] = Array.from({ length: 1600 }, (_, i) => String(i + 1).padStart(3, '0'))
  .filter(item => !unique_current_disc_drum_numbers.includes(item)); // unique_current_disc_drum_numbers'dan farklı olanları al

const wva_range: string[] = Array.from({ length: 10000 }, (_, i) => String(i + 20000));
const disc_drum_additions: string[] = ["", "C", "CS"];


function numberGenerator(initial: string[], centers: string[], additions: string[]): string[] {
  const result: string[] = [];
  for (const pre of initial) {
    for (const center of centers) {
      for (const addition of additions) {
        result.push(pre + center + addition);
      }
      result.push(pre + center + (["B", "H", "S"][result.length % 3]));
    }
  }
  return result;
}

function numberGeneratorWithoutAdditions(initial: string[], centers: string[]): string[] {
  return initial.flatMap((initial) => centers.map((center) => initial + center));
}

function numberGeneratorForCurrentDiscDrum(currents: string[], additions: string[]): string[] {
  const result: string[] = [];
  for (const pre of currents) {
    for (const addition of additions) {
      result.push(pre + addition);
    }
  }
  return result;
}

function writeToExcel() {
  const uniqueInitials = Array.from(new Set(barcode_current_initials));

  //const disc_drum_yvCodes = numberGenerator(barcode_initials, disc_drum_yvno_range, disc_drum_additions);
  const disc_drum_currentVersions = numberGeneratorForCurrentDiscDrum(unique_current_disc_drum_yvno, disc_drum_additions);
  const disc_drum_new_generated = numberGenerator(uniqueInitials, disc_drum_yvno_range, disc_drum_additions);
  const pad_yvCodes = Array.from({ length: (38000 - 10000) }, (_, i) => String(i + 10000));

  // Create an array of objects that contain the file name, numbers and column count to be used when generating the Excel file
  const data: { fileName: string; numbers: string[]; columnCount: number; }[] = [
    { fileName: "DISC_DRUM_CURRENT_VERSIONS", numbers: disc_drum_currentVersions, columnCount: 3 },
    { fileName: "DISC_DRUM_NEW_GENERATED", numbers: disc_drum_new_generated, columnCount: 4 },
    { fileName: "PAD", numbers: pad_yvCodes, columnCount: 10 },
  ];

  const wb = XLSX.utils.book_new();
  const OUTPUT_PATH = path.join(`src/data/Produced/EAC/`);

  // Iterate over the data array and create a worksheet for each object
  data.forEach((element) => {

    const { fileName, numbers, columnCount } = element;
    const ws_data: string[][] = [];

    // Iterate over the numbers array and create chunks of columnCount length
    for (let i = 0; i < numbers.length; i += columnCount) {
      ws_data.push(numbers.slice(i, i + columnCount)); // [1, columnCount], [columnCount+1, 2*columnCount], ...
    }

    // Create the worksheet from the worksheet data
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, fileName);

    //fs.writeFileSync(`${OUTPUT_PATH}${fileName}.json`, JSON.stringify(numbers, null, 2), "utf-8");
  });

  const outputFileName = "Full_EAC_Numbers_Current_Brands_Trimmed.xlsx";
  XLSX.writeFile(wb, `${OUTPUT_PATH}${outputFileName}`);

  console.log(`✨ Excel dosyası oluşturuldu: ${OUTPUT_PATH}${outputFileName}`);

}

function writeMYWord() {

  const uniqueInitials = Array.from(new Set(barcode_current_initials));

  //const disc_drum_currentVersions = numberGeneratorForCurrentDiscDrum(unique_current_disc_drum_yvno, disc_drum_additions).join(',');
  const disc_drum_commaSeperated = numberGeneratorWithoutAdditions(uniqueInitials, disc_drum_yvno_range).join(',');
  //const disc_drum_commaSeperated = numberGenerator(uniqueInitials, disc_drum_yvno_range, disc_drum_additions).join(',');

  const current_Pad_Numbers_commaSeperated = current_Pad_numbers_set_array.join(',');
  const pad_commaSeperated = Array.from({ length: (38000 - 10000) }, (_, i) => String(i + 10000))
    .filter((item) => !(current_Pad_numbers_set_array.map(each => each.substring(0, 5))).includes(item))
    .join(',');

  // Word belgesine paragraf olarak ekle
  const documents = [
    { document: createDocxDocument(unique_current_disc_drum_yvno_set.join(','), disc_drum_commaSeperated), filename: "DISC_DRUM_CURRENT_VERSIONS" },
    { document: createDocxDocument(current_Pad_Numbers_commaSeperated, pad_commaSeperated), filename: "PAD" },
  ];

  writeToWord(documents);
}



function main() {
  //writeToExcel(); // Excel dosyasını oluştur ve kaydet
  writeMYWord(); // Word dosyasını oluştur ve kaydet
}

main();