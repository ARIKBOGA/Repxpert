import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { formatDateTime } from '../utils/DateHelper';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../data/Configs/.env') });
const productType = process.env.PRODUCT_TYPE as string;

async function oeNumbersToExcel() {
    const jsonFilesFolderPath = path.resolve(`src/data/Gathered_Informations/${productType}/Technical_Details/YV_CODES`);
    const outputExcelFolderPath = path.resolve(`src/data/Gathered_Informations/${productType}/Technical_Details/excels`);

    const formattedDateTime = formatDateTime(new Date());
    const excelFileName = `${productType}_OE_Numbers_UMMU${formattedDateTime.numericDate}.xlsx`;
    const excelFilePath = path.join(outputExcelFolderPath, excelFileName);

    const workbook = XLSX.utils.book_new();
    const combinedSheetData: any[] = []; // Tüm sheet verilerini buraya toplayacağız

    try {
        const jsonFolders = fs.readdirSync(jsonFilesFolderPath);
        console.log("jsonFolders count: ", jsonFolders.length);

        for (const folder of jsonFolders) {
            const folderPath = path.join(jsonFilesFolderPath, folder);
            if (fs.statSync(folderPath).isDirectory()) {
                const jsonFiles = fs.readdirSync(folderPath)
                    .filter(file => file.endsWith('.json'));

                const allOEnumbers = new Set<string>();
                const allWVAnumbers = new Set<string>();

                for (const file of jsonFiles) {
                    const filePath = path.join(folderPath, file);

                    try {
                        const fileContent = fs.readFileSync(filePath, 'utf-8');
                        const jsonData = JSON.parse(fileContent);

                        const oeNumbersArrayOfFile: string[] = (Object.values(jsonData.brand_oe_map) as string[][]).flat();
                        oeNumbersArrayOfFile.forEach((oeNumber: string) => {
                            allOEnumbers.add(oeNumber);
                        });

                        const wvaNumbersArrayOfFile: string[] = jsonData.wvaNumbers as string[];
                        wvaNumbersArrayOfFile.forEach((wvaNumber: string) => {
                            allWVAnumbers.add(wvaNumber);
                        });

                    } catch (error) {
                        console.error(`Dosya işlenirken hata oluştu: ${filePath}`, error);
                    }
                }

                // Her klasör için bir satır (tek obje) ekliyoruz
                combinedSheetData.push({
                    "YV": folder,
                    "WVA_numbers": Array.from(allWVAnumbers).join(", "),
                    "OE_1": Array.from(allOEnumbers).slice(0, 1)[0],
                    "OE_2": Array.from(allOEnumbers).slice(1, 2)[0],
                    "OE_3": Array.from(allOEnumbers).slice(2, 3)[0],
                    "OE_4": Array.from(allOEnumbers).slice(3, 4)[0],
                    "OE_5": Array.from(allOEnumbers).slice(4, 5)[0],
                    "OE Numbers ALL": Array.from(allOEnumbers).join(", ")
                });
            }
        }

        if (combinedSheetData.length > 0) {
            const worksheet = XLSX.utils.json_to_sheet(combinedSheetData);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'All_YV_Data');

            if (!fs.existsSync(outputExcelFolderPath)) {
                fs.mkdirSync(outputExcelFolderPath, { recursive: true });
            }
            XLSX.writeFile(workbook, excelFilePath);
            console.log(`Excel dosyası oluşturuldu: ${excelFilePath}`);
        } else {
            console.log('Hiçbir veri bulunamadı, Excel dosyası oluşturulmadı.');
        }
    } catch (error) {
        console.error("Genel bir hata oluştu:", error);
    }
}

oeNumbersToExcel();
