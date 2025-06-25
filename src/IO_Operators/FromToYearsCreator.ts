import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../data/Configs/.env') });
const productType = process.env.PRODUCT_TYPE as string;

export interface Application {
    "YV No": string;
    "marka": string;
    "Baş. Yıl": string | null;
    "Bit. Yıl": string | null;
}

export interface years {
    from: number;
    to: number;
}

export interface StringYears {
    from: string;
    to: string;
}


export function readApplicationsFromExcel() {

    const inputFilePath = path.resolve(__dirname, `../data/katalogInfo/excels/English_Pad_APPLICATIONS_FULL_SON.xlsx`);
    const workbook = XLSX.readFile(inputFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    return data;
}

function serializeYV_With_Brands(map: Map<string, Map<string, years>>): Record<string, Record<string, StringYears>> {
    const result: Record<string, Record<string, StringYears>> = {};
    for (const [yvNo, yearMap] of map.entries()) {
        result[yvNo] = {};
        for (const [brand, years] of yearMap.entries()) {
            result[yvNo][brand] = { from: String(years.from).padStart(2, "0"), to: String(years.to).padStart(2, "0") };
        }
    }
    return result;
}


type VehicleData = Record<
  string, // YV numarası
  Record<
    string, // Marka adı
    {
      from: string;
      to: string;
    }
  >
>;

interface WriteOptions {
  jsonData?: VehicleData;
  jsonFilePath?: string;
  outputFilePath?: string; // default: './output.xlsx'
}

export function writeYVDataToExcel(options: WriteOptions) {
  const { jsonData, jsonFilePath, outputFilePath = path.resolve(__dirname, `../data/katalogInfo/excels/${productType}_applications_min_max.xlsx`) } = options;

  let data: VehicleData;

  // 📥 JSON verisini oku (path üzerinden veya direkt)
  if (jsonData) {
    data = jsonData;
  } else if (jsonFilePath) {
    const fileContent = fs.readFileSync(path.resolve(jsonFilePath), "utf-8");
    data = JSON.parse(fileContent);
  } else {
    throw new Error("Either jsonData or jsonFilePath must be provided.");
  }

  // 🛠 Veriyi Excel formatına dönüştür
  const rows: { YV: string; BRAND: string; FROM: string; TO: string }[] = [];

  for (const [yv, brandInfo] of Object.entries(data)) {
    for (const [brand, { from, to }] of Object.entries(brandInfo)) {
      rows.push({
        YV: yv,
        BRAND: brand,
        FROM: from.slice(-2),   // Yılın son 2 hanesi
        TO: to.slice(-2),       // Yılın son 2 hanesi
      });
    }
  }

  // 📗 Excel yazımı
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: ["YV", "BRAND", "FROM", "TO"] });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "YV Data");

  XLSX.writeFile(workbook, outputFilePath);

  console.log(`✅ Excel yazıldı: ${outputFilePath}`);
}

export function finalMerge(){

    const filepath = path.resolve(__dirname, `../data/katalogInfo/excels/${productType}_applications_min_max.xlsx`);
    const workbook = XLSX.readFile(filepath);
    //const sheetName = workbook.SheetNames[1];
    const worksheet = workbook.Sheets["Sayfa3"];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    const rowMap : Record<string, string> = {};

    data.forEach((row: any) => {
        const yvNo = row["YV"];
        const years = row["YEARS"];

        if (rowMap[yvNo]) {
            const adding = rowMap[yvNo].concat("\n".concat(years)); 
            rowMap[yvNo].concat(adding);
        } else {
            rowMap[yvNo] = years;
        }
    });

    console.log(rowMap);

    //const outputFilePath = path.resolve(__dirname, `../data/katalogInfo/excels/${productType}_applications_min_max_final.xlsx`);
    //const workbook2 = XLSX.utils.book_new();
//
    //for (const [yvNo, years] of Object.entries(rowMap)) {
    //    const worksheet2 = XLSX.utils.json_to_sheet([{ YV: yvNo, YEARS: years }], { header: ["YV", "YEARS"] });
    //    XLSX.utils.book_append_sheet(workbook2, worksheet2, "Sheet1yeni");
    //}
//
    //XLSX.writeFile(workbook2, outputFilePath);
}


function main() {

    const data = readApplicationsFromExcel();
    const outputFilePath = path.resolve(__dirname, `../data/katalogInfo/jsons/${productType}_applications_min_max.json`);

    const rows: Application[] = [];
    const YV_With_Brands = new Map<string, Map<string, years>>();       // Map<YV No, Map<marka adı, years>>

    data.forEach((row: any) => {
        const yvNo = row["YV No"];
        const marka = row["marka"];
        let basYil = row["Baş. Yıl"];
        let bitYil = row["Bit. Yıl"];

        if(Number(basYil) > 25){
            basYil = "19".concat(String(basYil));      // Bas.Yıl 25'den buyukse 19 ile birlestir. 1900'lü yıllar
        }else{
            basYil = "20".concat(String(basYil));      // Bas.Yıl 25'den kucukse 20 ile birlestir. 2000'li yıllar
        }

        if(Number(bitYil) > 25){
            bitYil = "19".concat(String(bitYil));      // Bit.Yıl 25'den buyukse 19 ile birlestir. 1900'lü yıllar
        }else{
            bitYil = "20".concat(String(bitYil));      // Bit.Yıl 25'den kucukse 20 ile birlestir. 2000'li yıllar
        }

        const application: Application = { "YV No": yvNo, "marka": marka, "Baş. Yıl": basYil, "Bit. Yıl": bitYil };
        rows.push(application);
    })

    rows.forEach((row: Application) => {
        const yvNo = row["YV No"];
        const marka = row["marka"];
        const basYil = row["Baş. Yıl"];
        const bitYil = row["Bit. Yıl"];

        if (YV_With_Brands.has(yvNo)) {
            const brandsMap = YV_With_Brands.get(yvNo);             // Map<marka adı, years>
            if (brandsMap) {
                const { from, to } = brandsMap.get(marka) || { from: Number(basYil), to: Number(bitYil) };
                brandsMap.set(marka, { from: Math.min(from, Number(basYil)), to: Math.max(to, Number(bitYil)) });
            }
        } else {
            const newBrandsMap = new Map<string, years>();          // Map<marka adı, years>
            newBrandsMap.set(marka, { from: Number(basYil), to: Number(bitYil) });
            YV_With_Brands.set(yvNo, newBrandsMap);
        }
    })

    const serialized = serializeYV_With_Brands(YV_With_Brands);
    fs.writeFileSync(outputFilePath, JSON.stringify(serialized, null, 2));

    // excel e yazma
    writeYVDataToExcel({
        jsonData: serialized,
        //outputFilePath: path.resolve(__dirname, `../data/katalogInfo/excel/${productType}_applications_min_max.xlsx`)
    });
}

//main();
finalMerge();