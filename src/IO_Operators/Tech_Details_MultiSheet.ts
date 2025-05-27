import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import { formatDateTime } from "../utils/DateHelper";


async function jsonToExcel() {
    const yvCodesFolderPath = path.resolve("src/data/Gathered_Informations/Pads/Technical_Details/YV_Codes");
    const excelFolderPath = path.resolve("src/data/Gathered_Informations/Pads/Technical_Details/excels");

    // Excel dosyasının adını timestamp ile oluşturalım
    const formattedDateTime = formatDateTime(new Date());
    const excelFileName = `PAD_OE_NUMBERS_${formattedDateTime.numericDate}.xlsx`;
    const excelFilePath = path.join(excelFolderPath, excelFileName);

    const workbook = XLSX.utils.book_new();

    try {
        const yvCodeFolders = fs.readdirSync(yvCodesFolderPath);

        for (const yvCodeFolder of yvCodeFolders) {
            const yvCodeFolderPathFull = path.join(yvCodesFolderPath, yvCodeFolder);

            // Sadece klasörleri işleyelim
            if (fs.statSync(yvCodeFolderPathFull).isDirectory()) {
                const jsonFiles = fs.readdirSync(yvCodeFolderPathFull).filter((file) => file.endsWith(".json"));
                const sheetData: any[] = [];

                for (const jsonFile of jsonFiles) {
                    const jsonFilePath = path.join(yvCodeFolderPathFull, jsonFile);
                    try {
                        const fileContent = fs.readFileSync(jsonFilePath, "utf-8");
                        const jsonData = JSON.parse(fileContent);

                        const rowData: any = {
                            "YV No": yvCodeFolder,
                            Katalog_Referans: jsonData.reference,
                            ID: jsonData.id,
                            //"Ürün Adı": jsonData.name,
                            Marka: jsonData.brand,
                            "EAN Numarası": jsonData.eanNumber,
                            "Genişlik 1": jsonData.dimensions?.width1,
                            "Yükseklik 1": jsonData.dimensions?.height1,
                            "Kalınlık 1": jsonData.dimensions?.thickness1,
                            "Genişlik 2": jsonData.dimensions?.width2,
                            "Yükseklik 2": jsonData.dimensions?.height2,
                            "Kalınlık 2": jsonData.dimensions?.thickness2,
                            //"Üretici Kısıtlaması": jsonData.dimensions?.manufacturerRestriction,
                            //"Kontrol İşareti": jsonData.dimensions?.checkmark,
                            //SVHC: jsonData.dimensions?.SVHC,
                            "WVA Numaraları": jsonData.wvaNumbers ? jsonData.wvaNumbers.join(", ") : "",
                        };

                        // OE numaralarını markalara göre sütunlara ekleyelim
                        if (jsonData.brand_oe_map) {
                            for (const brand in jsonData.brand_oe_map) {
                                rowData[`${brand} OE Numaraları`] = jsonData.brand_oe_map[brand].join(", ");
                            }
                        }

                        sheetData.push(rowData);
                    } catch (error) {
                        console.error(`JSON dosyası okunurken veya işlenirken hata oluştu: ${jsonFilePath}`, error);
                    }
                }

                // Eğer o YV klasöründe veri varsa, yeni bir sheet oluşturup ekleyelim
                if (sheetData.length > 0) {
                    const worksheet = XLSX.utils.json_to_sheet(sheetData);
                    XLSX.utils.book_append_sheet(workbook, worksheet, yvCodeFolder);
                }
            }
        }

        // Excel dosyasını belirtilen klasöre kaydedelim
        const sheetCount = workbook.SheetNames.length;
        if (sheetCount > 0) {
            if (!fs.existsSync(excelFolderPath)) {
                fs.mkdirSync(excelFolderPath, { recursive: true });
            }
            XLSX.writeFile(workbook, excelFilePath);
            console.log(`Veriler başarıyla "${excelFilePath}" dosyasına aktarıldı. Toplam sayfa sayısı: ${sheetCount}`);
        } else {
            console.log("Excel dosyası oluşturulamadı ya da işlenecek herhangi bir JSON dosyası bulunamadı.");
        }
    } catch (error) {
        console.error("Klasör okuma veya genel bir hata oluştu:", error);
    }
}

jsonToExcel();