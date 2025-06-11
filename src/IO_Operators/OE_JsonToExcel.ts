import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { formatDateTime } from '../utils/DateHelper'; // Bu fonksiyonun düzgün çalıştığını varsayıyorum
import dotenv from 'dotenv';
import { brandAliases } from '../types/AppToJson_Types';
import initialMarkaData from '../data/katalogInfo/jsons/marka_new.json'; // Statik import

dotenv.config({ path: path.resolve(__dirname, '../data/Configs/.env') });
const productType = process.env.PRODUCT_TYPE as string;

const markaLookup: { [key: string]: string } = {};

async function oeNumbersToExcel() {

    for (const [markaID, markaName] of Object.entries(initialMarkaData)) {
        markaLookup[markaName] = markaID;
    }

    const jsonFilesFolderPath = path.resolve(`src/data/Gathered_Informations/${productType}/Technical_Details/YV_CODES`);
    const outputExcelFolderPath = path.resolve(`src/data/Gathered_Informations/${productType}/Technical_Details/excels`);

    const formattedDateTime = formatDateTime(new Date());
    const excelFileName = `${productType}_OE_Numbers_${formattedDateTime.numericDate}.xlsx`;
    const excelFilePath = path.join(outputExcelFolderPath, excelFileName);

    const workbook = XLSX.utils.book_new();

    try {
        const jsonFolders = fs.readdirSync(jsonFilesFolderPath);
        console.log("jsonFolders count: ", jsonFolders.length);
        //console.log(jsonFolders);

        for (const folder of jsonFolders) { // folder değişkeni burada 'YV_CODE' olan klasör adını temsil ediyor
            const folderPath = path.join(jsonFilesFolderPath, folder);
            const brandOEPairs: Set<string> = new Set<string>();
            if (fs.statSync(folderPath).isDirectory()) {
                const jsonFiles = fs.readdirSync(folderPath)
                    //.filter(file => file.includes("BREMBO"))
                    .filter(file => file.endsWith('.json'));
                const sheetData: any[] = [];

                for (const file of jsonFiles) {
                    const filePath = path.join(folderPath, file);

                    try {
                        const fileContent = fs.readFileSync(filePath, 'utf-8');
                        const jsonData = JSON.parse(fileContent);

                        for (const brand in jsonData.brand_oe_map) {
                            if (jsonData.brand_oe_map.hasOwnProperty(brand)) {
                                const oeNumbers: string[] = jsonData.brand_oe_map[brand];

                                for (const oeNumber of oeNumbers) {
                                    const formattedOeNumber = oeNumber.startsWith("0") ? `'${oeNumber}` : oeNumber;
                                    const marka = brandAliases.get(brand) || brand;
                                    const uniqueKey = `${folder}${marka}-${formattedOeNumber}`;

                                    if (!brandOEPairs.has(uniqueKey)) {
                                        brandOEPairs.add(uniqueKey);
                                        const markaId = markaLookup[brandAliases.get(brand) as string] || markaLookup[brand];

                                        sheetData.push({
                                            YV: folder,
                                            Cross: jsonData.id,
                                            Cross_Marka: jsonData.brand,
                                            Marka_ID: markaId,
                                            Marka: marka,
                                            OE_Number: formattedOeNumber,
                                            //VWA: jsonData.wvaNumbers.join(', ')
                                        });
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`Dosya işlenirken hata oluştu: ${filePath}`, error);
                    }
                }

                if (sheetData.length > 0) {
                    const worksheet = XLSX.utils.json_to_sheet(sheetData);
                    // Sayfa adını temizlemek ve 31 karakteri geçmemesini sağlamak iyi bir uygulama
                    const sheetName = folder.substring(0, 31).replace(/[\[\]\*\?\/\\:]/g, '_');
                    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
                }
            }
        }

        // Excel dosyasını belirtilen dizine yaz
        const sheetCount = workbook.SheetNames.length;
        if (sheetCount > 0) {
            if (!fs.existsSync(outputExcelFolderPath)) {
                fs.mkdirSync(outputExcelFolderPath, { recursive: true });
            }
            XLSX.writeFile(workbook, excelFilePath);
            console.log(`Excel dosyası oluşturuldu: ${excelFilePath}`);
        } else {
            console.log('Excel dosyası oluşturulamadı ya da işlenecek herhangi bir JSON dosyası bulunamadı.');
        }
    } catch (error) {
        console.error("Genel bir hata oluştu:", error);
    }
}

oeNumbersToExcel();