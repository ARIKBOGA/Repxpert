import * as fs from "fs";
import * as path from "path";
import XLSX from "xlsx";

const barcode_initials: string[] = Array.from({ length: 291 }, (_, i) => String(i + 10));
const disc_drum_yvno_range: string[] = Array.from({ length: 2999 }, (_, i) => String(i + 1).padStart(3, '0'));
const wva_range: string[] = Array.from({ length: 28000 }, (_, i) => String(i + 10000));
//const drumBrakePad_range: string[] = Array.from({ length: 10000 }, (_, i) => String(i + 10000));
//const clutchFacingsPad_range: string[] = Array.from({ length: 5000 }, (_, i) => String(i + 30000));
//const frictionPlatesPad_range: string[] = Array.from({ length: 3000 }, (_, i) => String(i + 35000));

const disc_drum_additions: string[] = ["", "B", "C", "CS", "H", "S"];
const pad_centers: string[] = Array.from({ length: 9 }, (_, i) => String(i + 1));
const pad_additions: string[] = Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, '0'));

function numberGenerator(initial: string[], centers: string[], additions: string[]): string[] {
  return  initial.flatMap((initial) =>
          centers.flatMap((center) =>
          additions.map((addition) => initial + center + addition)
    )
  );
}


function main() {

  const disc_drum_yvCodes = numberGenerator(barcode_initials, disc_drum_yvno_range, disc_drum_additions);
  const pad_yvCodes = numberGenerator(wva_range, pad_centers, pad_additions);
  
  // Create an array of objects that contain the file name, numbers and column count to be used when generating the Excel file
  const data: { fileName: string; numbers: string[]; columnCount: number; }[] = [
    { fileName: "DISC_DRUM", numbers: disc_drum_yvCodes, columnCount: 6},
    { fileName: "PAD", numbers: pad_yvCodes, columnCount: 15},
  ];
  
  const wb = XLSX.utils.book_new();
  const OUTPUT_PATH = path.join(`src/data/Produced/ECA/`);

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
    
    fs.writeFileSync(`${OUTPUT_PATH}${fileName}.json`, JSON.stringify(numbers, null, 2), "utf-8");
  });

  const outputFileName = "Full_ECA_Numbers.xlsx";
  XLSX.writeFile(wb, `${OUTPUT_PATH}${outputFileName}`);

  console.log(`✨ Excel dosyası oluşturuldu: ${OUTPUT_PATH}${outputFileName}`);
  
}

main();