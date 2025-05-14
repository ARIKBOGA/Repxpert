import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

// JSON dosyasının bulunduğu dizin ve dosya adı
const rootDir = path.resolve(__dirname, '../data/Gathered_Informations/CarModels/model_names_tam.json');
// Oluşturulacak Excel dosyasının dizini ve dosya adı
const outputDir = path.resolve(__dirname, '../data/Gathered_Informations/CarModels/model_names_tam.xlsx');

try {
    // JSON dosyasını oku
    const jsonData = fs.readFileSync(rootDir, 'utf-8');
    // JSON verisini JavaScript objesine dönüştür
    const jsonObject = JSON.parse(jsonData);

    // Excel'e aktarılacak veriyi hazırlamak için boş bir dizi oluşturuyoruz
    const excelData: any[] = [];

    // JSON objesindeki her bir anahtar (marka) için döngü başlatıyoruz
    for (const marka in jsonObject) {
        // Eğer marka objenin bir özelliği ise (prototip zincirinden gelmiyorsa) işleme devam et
        if (jsonObject.hasOwnProperty(marka)) {
            // Markaya ait modeller dizisini alıyoruz
            const modeller = jsonObject[marka];
            // Her bir model için bir satır oluşturup excelData dizisine ekliyoruz
            if (Array.isArray(modeller)) {
                modeller.forEach((model) => {
                    excelData.push({ Marka: marka, Model: model });
                });
            } else if (typeof modeller === 'string') {
                // Eğer değer bir string ise (tek bir model varsa) onu da ekleyelim
                excelData.push({ Marka: marka, Model: modeller });
            }
        }
    }

    // Oluşturduğumuz JavaScript objelerini kullanarak bir çalışma sayfası (worksheet) oluşturuyoruz
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Yeni bir çalışma kitabı (workbook) oluşturuyoruz
    const workbook = XLSX.utils.book_new();

    // Oluşturduğumuz çalışma sayfasını çalışma kitabına ekliyoruz. İkinci parametre sayfanın adı.
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Model Listesi');

    // Çalışma kitabını belirtilen dizine bir Excel dosyası olarak yazıyoruz
    XLSX.writeFile(workbook, outputDir);

    console.log('Excel dosyası başarıyla oluşturuldu:', outputDir);

} catch (error) {
    console.error('Bir hata oluştu:', error);
}