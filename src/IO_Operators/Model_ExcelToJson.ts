import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

const filePathToRead = path.resolve(__dirname, '../data/katalogInfo/excels/model_new.xlsx');
const filePathToWrite = path.resolve(__dirname, '../data/katalogInfo/jsons/model_new.json');

const convertToArrayOfObjectsJSON = (filePath: string) => {
    // Çalışma kitabını dosyadan okuyun
    const workbook = XLSX.readFile(filePath, { cellDates: true });

    // İlk sayfayı alın
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Sayfayı JSON'a dönüştürün, başlık satırını anahtar olarak kullanın
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

    return jsonData;
};

// Excel dosyasını nesne dizisi formatında JSON'a dönüştürün
const arrayOfObjectsJsonData = convertToArrayOfObjectsJSON(filePathToRead);

// JSON verilerini bir dosyaya yazın
fs.writeFile(filePathToWrite, JSON.stringify(arrayOfObjectsJsonData, null, 2), (err) => {
    if (err) {
        console.error('JSON dosyası yazılırken hata oluştu:', err);
    } else {
        console.log('JSON dosyası kaydedildi.');
    }
});

console.log('Excel dosyası nesne dizisi formatında JSON\'a dönüştürüldü:');