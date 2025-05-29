import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

// 🔧 Ayarlar
const inputPath = path.resolve('src/data/katalogInfo/jsons/unmatched_models_ALWAYS_UPDATED.json');
const outputPath = path.resolve('src/data/katalogInfo/excels/unmatched_models.xlsx');

// 📥 JSON dosyasını oku
const jsonData = JSON.parse(fs.readFileSync(inputPath, 'utf-8')) as {
  originalModel: string;
  normalizedModel: string;
  originalBrand: string;
  marka_id: number;
}[];

// 🧾 Excel için satırlar
const worksheetData = [
  ['originalModel', 'normalizedModel', 'originalBrand', 'marka_id'], // Başlık satırı
  ...jsonData.map(item => [
    item.originalModel,
    item.normalizedModel,
    item.originalBrand,
    item.marka_id
  ])
];

// 📄 Worksheet ve Workbook oluştur
const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Unmatched Models');

// 💾 Excel dosyasını yaz
XLSX.writeFile(workbook, outputPath);

console.log('Excel dosyası başarıyla oluşturuldu:', outputPath);
