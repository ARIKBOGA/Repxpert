import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

const filePathToRead = path.resolve(__dirname, '../data/katalogInfo/excels/marka_seri_no.xlsx');
const filePathToWrite = path.resolve(__dirname, '../data/katalogInfo/jsons/marka_new.json');

const convertToSingleValueJSON = (filePath: string) => {
    // Çalışma kitabını dosyadan okuyun
    const workbook = XLSX.readFile(filePath, { cellDates: true });

    // İlk sayfayı alın
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Sayfayı JSON'a dönüştürün, ancak başlık satırını almayın
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

    // Sonuç nesnesini oluşturun
    const result: { [key: string]: any } = {};

    // İkinci satırdan başlayarak verileri işleyin
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        // İlk sütunu anahtar, ikinci sütunu değer olarak alıyoruz
        const key = row[0];
        const value = row[1];

        // Anahtar ve değer geçerliyse sonuca ekleyin
        if (key !== null && key !== undefined && value !== null && value !== undefined) {
            result[key] = value;
        }
    }

    return result;
};

// Excel dosyasını tek değerli JSON formatına dönüştürün
const singleValueJsonData = convertToSingleValueJSON(filePathToRead);

// JSON verilerini bir dosyaya yazın
fs.writeFile(filePathToWrite, JSON.stringify(singleValueJsonData, null, 2), (err) => {
    if (err) {
        console.error('JSON dosyası yazılırken hata oluştu:', err);
    } else {
        console.log('JSON dosyası kaydedildi.');
    }
});

console.log('Excel dosyası tek değerli JSON formatına dönüştürüldü:', singleValueJsonData);