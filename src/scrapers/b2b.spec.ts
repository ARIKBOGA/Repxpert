import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { test, expect } from '@playwright/test';

const rootDir = path.resolve("src/data/katalogInfo/excels/b2b.xlsx");
const filePath = path.resolve(rootDir);
const workbook = xlsx.readFile(filePath);
const worksheet = workbook.Sheets["ANA"];

// read data from excel file
const readExcelFile = (keyColumnHeader: string, valueColumnHeader: string): Map<string, string> => {
    const data: Map<string, string> = new Map();
    const range = xlsx.utils.decode_range(worksheet['!ref'] || '');
    const headers: { [key: number]: string } = {};
    let keyColumnIndex: number | undefined;
    let valueColumnIndex: number | undefined;

    // Başlıkları oku ve sütun indekslerini bul
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const headerAddress = xlsx.utils.encode_cell({ r: range.s.r, c: C });
        const headerValue = worksheet[headerAddress]?.v;
        if (headerValue) {
            headers[C] = headerValue;
            if (headerValue === keyColumnHeader) {
                keyColumnIndex = C;
            } else if (headerValue === valueColumnHeader) {
                valueColumnIndex = C;
            }
        }
    }

    // Eğer belirtilen başlıklar bulunamazsa hata fırlat
    if (keyColumnIndex === undefined || valueColumnIndex === undefined) {
        throw new Error(`Belirtilen sütun başlıkları bulunamadı: ${keyColumnHeader}, ${valueColumnHeader}`);
    }

    // Verileri oku ve Map'e ekle (boş değer kontrolü ile)
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const keyAddress = xlsx.utils.encode_cell({ r: R, c: keyColumnIndex });
        const valueAddress = xlsx.utils.encode_cell({ r: R, c: valueColumnIndex });
        let key = worksheet[keyAddress]?.v;
        const value = worksheet[valueAddress]?.v;

        // KRAFTVOLL sütünundaki value'lardan "KRAFTVOLL" içermeyen değerleri atla
        if (keyColumnHeader === "KRAFTVOLL" && value && !value.includes("KRAFTVOLL")) {
            continue;
        }

       


        if (key !== undefined && key !== null && String(key).trim() !== "" &&
            value !== undefined && value !== null && String(value).trim() !== "") {
            data.set(String(key), String(value));
        }
    }

    return data;
};

test("Read Excel File", async ({ page }) => {
    
    const kraftvoll = readExcelFile("YV NO","KRAFTVOLL");
    const braxis = readExcelFile("YV NO","BRAXIS");
    const beser = readExcelFile("YV NO","BESER KOD");
    const trw = readExcelFile("YV NO","TRW");
    const textar = readExcelFile("YV NO","Textar");
    const wva = readExcelFile("YV NO","balata:wva no");

    console.log(kraftvoll.size);
    console.log(kraftvoll)
    //console.log(braxis.size);
    //console.log(beser.size);
    //console.log(trw.size);
    //console.log(textar.size);
    //console.log(wva.size);
    
});