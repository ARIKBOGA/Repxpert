import * as XLSX from 'xlsx';
import * as path from 'path';

// Dosya yolları
const rankingPadsFilePath = path.join(__dirname, '..', 'data', 'katalogInfo', 'excels', 'PAD_match', 'RANKING_PADS_TURKEY.xls');
const padOeNumbersFilePath = path.join(__dirname, '..', 'data', 'katalogInfo', 'excels', 'PAD_match', 'PAD_OE_NUMBERS_20.05.2025-18_00_58.xlsx');

interface RankingPadEntry {
    OE: string;
    'YV No': string | null; // Bulunan sayfa adı
    'BULUNAN OE': string | null; // Eşleşen OE kodu
    // Diğer sütunlar buraya eklenebilir
}

async function processExcelFiles() {
    try {
        // 1. RANKING PADS TURKEY.xls dosyasını oku
        console.log(`'${rankingPadsFilePath}' okunuyor...`);
        const rankingPadsWorkbook = XLSX.readFile(rankingPadsFilePath);
        const rankingPadsSheetName = rankingPadsWorkbook.SheetNames[0]; // İlk sayfayı alıyoruz
        const rankingPadsSheet = rankingPadsWorkbook.Sheets[rankingPadsSheetName];
        const rankingPadsData: RankingPadEntry[] = XLSX.utils.sheet_to_json(rankingPadsSheet);
        console.log(`'${rankingPadsFilePath}' okundu. Toplam ${rankingPadsData.length} kayıt.`);

        // 2. PAD_OE_NUMBERS_20.05.2025-18_00_58.xlsx dosyasını oku (Tüm sayfalar)
        console.log(`'${padOeNumbersFilePath}' okunuyor (arama için kullanılacak)...`);
        const padOeNumbersWorkbook = XLSX.readFile(padOeNumbersFilePath);
        const padOeNumbersSheetNames = padOeNumbersWorkbook.SheetNames; // Sayfa adlarını bir kere alalım

        // 3. RANKING PADS TURKEY.xls'deki OE kodlarını işle ve YV No ile BULUNAN OE'yi güncelle
        console.log(`'${rankingPadsFilePath}' güncelleniyor...`);
        let updatedCount = 0;

        // Her bir RANKING PADS TURKEY kaydı için döngü
        for (let i = 0; i < rankingPadsData.length; i++) {
            const row = rankingPadsData[i];
            
            // Eğer OE sütunu boşsa, ilgili YV No ve BULUNAN OE sütunlarını 'OE Değeri Boş' olarak işaretleyip bir sonraki satıra geç
            if (!row.OE) { 
                row['YV No'] = 'OE Değeri Boş';
                row['BULUNAN OE'] = 'OE Değeri Boş';
                continue;
            }

            const oeCodes = String(row.OE).split('_'); // OE değerini ayır
            let foundYvNoForThisRow: string | null = null; // Bu satır için YV No'yu (sayfa adını) bulduğumuzda saklayacak değişken
            let foundOeCodeForThisRow: string | null = null; // Bu satır için bulunan OE kodunu saklayacak değişken

            // Her bir OE kodu elemanı için döngü (oeCodes[0], oeCodes[1], ...)
            for (const searchCode of oeCodes) {
                if (!searchCode) continue; // Boş searchCode varsa atla

                let foundInPadNumbers = false;
                // PAD_OE_NUMBERS dosyasının tüm sayfaları içinde arama
                for (const sheetName of padOeNumbersSheetNames) {
                    // console.log(`  Sayfa '${sheetName}' içinde '${searchCode}' aranıyor...`);
                    const sheet = padOeNumbersWorkbook.Sheets[sheetName];

                    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');

                    for (let R = range.s.r; R <= range.e.r; ++R) {
                        for (let C = range.s.c; C <= range.e.c; ++C) {
                            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                            const cell = sheet[cellAddress];

                            if (cell && cell.v !== undefined) {
                                const cellValue = String(cell.v);
                                if (cellValue.includes(searchCode)) {
                                    foundYvNoForThisRow = sheetName; // Eşleşen sayfa adını kaydet
                                    foundOeCodeForThisRow = searchCode; // Bulunan OE kodunu kaydet
                                    foundInPadNumbers = true;
                                    break; // Hücre bulundu, bu sayfada başka aramaya gerek yok
                                }
                            }
                        }
                        if (foundInPadNumbers) break; // Satır bulundu, bu sayfada başka satırlara bakmaya gerek yok
                    }
                    if (foundInPadNumbers) break; // Sayfa bulundu, diğer sayfalara bakmaya gerek yok
                }

                if (foundInPadNumbers) {
                    break; // Bu oeCodes elemanı bulundu, bu RANKING PADS TURKEY satırı için diğer oeCodes elemanlarını aramayı bırak
                }
            }

            // Bu RANKING PADS TURKEY satırı için YV No ve BULUNAN OE'yi ata
            if (foundYvNoForThisRow && foundOeCodeForThisRow) {
                row['YV No'] = foundYvNoForThisRow;
                row['BULUNAN OE'] = foundOeCodeForThisRow;
                updatedCount++;
            } else {
                row['YV No'] = 'Bulunamadı'; // Hiçbir OE elemanı bulunamazsa
                row['BULUNAN OE'] = 'Bulunamadı'; // Hiçbir OE elemanı bulunamazsa
            }
        }
        console.log(`${updatedCount} adet kayıt güncellendi.`);

        // 4. Güncellenmiş veriyi RANKING PADS TURKEY.xls'ye geri yaz
        const newWorksheet = XLSX.utils.json_to_sheet(rankingPadsData);
        rankingPadsWorkbook.Sheets[rankingPadsSheetName] = newWorksheet;
        XLSX.writeFile(rankingPadsWorkbook, rankingPadsFilePath);
        console.log(`'${rankingPadsFilePath}' başarıyla güncellendi.`);

    } catch (error) {
        console.error('Bir hata oluştu:', error);
    }
}

// Fonksiyonu çalıştır
processExcelFiles();