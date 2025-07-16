import * as fs from "fs";
import * as path from "path";
import XLSX from "xlsx";
import { createDocxDocument, writeToWord } from "./EAC_helpers";


const initial = "PSB";
const centers = ["10", "20", "30", "19", "29", "39", "17", "27", "37", "15", "", "35", "13", "23", "33", "11", "21", "31"];
const disc_drum_yvno_range: string[] = Array.from({ length: 1600 }, (_, i) => String(i + 1).padStart(3, '0'));


function psbNumberGenerator(initial: string, centers: string[], disc_drum_yvno_range: string[]): Record<string, string[]> {
    const psbCodesMap: Record<string, string[]> = {};

    centers.flatMap((center) => {
        const array: string[] = [];
        disc_drum_yvno_range.forEach((yvno) => {
            array.push(initial + yvno.substring(0, 2) + center + yvno.substring(2));
        });
        psbCodesMap[center] = array;
    });

    return psbCodesMap;
}

function psbNumberGeneratetorForWord(initial: string, centers: string[], disc_drum_yvno_range: string[]) {
    const result: string[] = [];
    centers.flatMap((center) => {
        disc_drum_yvno_range.forEach((yvNo:string) => {
            result.push(initial + yvNo.substring(0, 2) + center + yvNo.substring(2));
        })
    })
    return result;
}

function writeToExcel_PSB(data: { [key: string]: string[] }, fileName: string, sheetName: string): void {
    const maxRows = Math.max(...Object.values(data).map(arr => arr.length));

    const headers = Object.keys(data);
    const sheetData: any[][] = [headers]; // İlk satır başlıklar

    for (let i = 0; i < maxRows; i++) {
        const row: any[] = [];
        for (const key of headers) {
            row.push(data[key][i] || '');
        }
        sheetData.push(row);
    }

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(sheetData);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    XLSX.writeFile(wb, fileName);
}

function main() {
    const disc_drum_yvCodes = psbNumberGenerator(initial, centers, disc_drum_yvno_range);
    const dsic_drum_yvCodes_word = psbNumberGeneratetorForWord(initial, centers, disc_drum_yvno_range);
    const OUTPUT_PATH = path.join(`src/data/Produced/ECA/`);
    //fs.writeFileSync(`${OUTPUT_PATH}PSB_map.json`, JSON.stringify(disc_drum_yvCodes, null, 2), "utf-8");

    //writeToExcel_PSB(disc_drum_yvCodes, `${OUTPUT_PATH}PSB_map.xlsx`, "PSB");
    writeToWord([{ document: createDocxDocument(dsic_drum_yvCodes_word.join(',')), filename: "PSB_Disc_Drum.docx" }]);
}

main();