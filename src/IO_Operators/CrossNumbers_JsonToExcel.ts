import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';

async function convertCrossNumbersJsonToExcel() {
    const rootDir = path.join(__dirname, '..', 'data', 'Gathered_Informations', 'Pads', 'CrossNumbers', 'YV_CODES');
    const outputDir = path.join(__dirname, '..', 'data', 'Gathered_Informations', 'Pads', 'CrossNumbers', 'excels');

    // Output klasörünü kontrol et ve gerekirse oluştur
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const allData: any[] = [];
    let headers: Set<string> = new Set(['yvNo', 'ICER', 'Brand_Reference']);

    // YV_NO klasörlerini oku
    const yvnoFolders = fs.readdirSync(rootDir).filter(file => fs.statSync(path.join(rootDir, file)).isDirectory());

    // Her YV_NO klasöründeki JSON dosyalarını oku
    for (const yvnoFolder of yvnoFolders) {

        // Klasör yolunu oluştur
        const folderPath = path.join(rootDir, yvnoFolder);
        // JSON dosyalarını oku
        const jsonFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.json'));

        for (const jsonFile of jsonFiles) {
            // Dosya yolunu oluştur ve dosyayı oku 
            const filePath = path.join(folderPath, jsonFile);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const jsonData = JSON.parse(fileContent);

            // statik verileri ata
            const rowData: any = {
                yvNo: jsonData.yvNo,
                ICER: jsonData.id,
                Brand_Reference: jsonData.Brand_Reference,
            };

            // Markaları ve cross numaralarını oku
            const crossNumbersByMaker: { [key: string]: string[] } = {};
            const crossNumbers = jsonData.crossNumbers || [];

            crossNumbers.forEach((item: any) => {
                if (!crossNumbersByMaker[item.maker]) {
                    crossNumbersByMaker[item.maker] = [];
                    headers.add(item.maker);
                }
                crossNumbersByMaker[item.maker].push(item.crossNumber);
            });

            for (const maker in crossNumbersByMaker) {
                rowData[maker] = crossNumbersByMaker[maker].join(', ');
            }

            allData.push(rowData);
        }
    }

    if (allData.length > 0) {
        const headerArray = Array.from(headers);
        const worksheetData = [headerArray]; // Başlık satırı

        allData.forEach(row => {
            const rowValues: any[] = [];
            headerArray.forEach(header => {
                rowValues.push(row[header] || ''); // Eğer ilgili marka yoksa boş hücre
            });
            worksheetData.push(rowValues);
        });

        const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Cross Numbers');

        const now = new Date();
        const formattedDateTime = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}`;
        const outputFilePath = path.join(outputDir, `Pad_Cross_Numbers_${formattedDateTime}.xlsx`);

        xlsx.writeFile(workbook, outputFilePath);
        console.log(`Excel dosyası başarıyla oluşturuldu: ${outputFilePath}`);
    } else {
        console.log('Herhangi bir JSON dosyası bulunamadı.');
    }
}

convertCrossNumbersJsonToExcel();