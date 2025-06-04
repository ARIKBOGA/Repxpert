import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import { ProductReference } from "./ScraperHelpers";
import { normalizeString } from "./NormalizersForJsonToExcels";
import { LookupExcelRow } from "../types/AppToJson_Types";

export const retryListFilePath = path.resolve(
  __dirname,
  "../data/willBefixed/reTry.json"
);

export function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } else {
      const folderPath = path.dirname(filePath);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf-8");
    }
  } catch (err) {
    console.error(`Error reading JSON file at ${filePath}:`, err);
  }
  return fallback;
}

export function getSubfolderNamesSync(dirPath: string): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

export const padPairs: ProductReference[] = [



  { yvNo: "20341401", brandRefs: { "ICER": "180324" } },
  { yvNo: "21201201", brandRefs: { "ICER": "181366" } },
  { yvNo: "21312201", brandRefs: { "ICER": "180752-701" } },
  { yvNo: "21347201", brandRefs: { "ICER": "140884" } },
  { yvNo: "21576201", brandRefs: { "ICER": "141104-046" } },
  { yvNo: "21621201", brandRefs: { "ICER": "141102" } },
  { yvNo: "21857201", brandRefs: { "ICER": "181150" } },
  { yvNo: "22531201", brandRefs: { "ICER": "182198-200" } },
  { yvNo: "23177401", brandRefs: { "ICER": "180674-700" } },
  { yvNo: "23258108", brandRefs: { "ICER": "181271-702" } },
  { yvNo: "23279401", brandRefs: { "ICER": "180801" } },
  { yvNo: "23554410", brandRefs: { "ICER": "180697-703" } },
  { yvNo: "23775201", brandRefs: { "ICER": "181596" } },
  { yvNo: "23901206", brandRefs: { "ICER": "141103" } },
  { yvNo: "24072401", brandRefs: { "ICER": "181659" } },
  { yvNo: "24073303", brandRefs: { "ICER": "181845" } },
  { yvNo: "24073401", brandRefs: { "ICER": "181621-703" } },
  { yvNo: "24498201", brandRefs: { "ICER": "181799" } },
  { yvNo: "24510201", brandRefs: { "ICER": "181798" } },
  { yvNo: "24710201", brandRefs: { "ICER": "181856" } },
  { yvNo: "24883401", brandRefs: { "ICER": "181925-201" } },
  { yvNo: "26188208", brandRefs: { "ICER": "182410-203" } },
  { yvNo: "29153401", brandRefs: { "ICER": "141126-700" } },



];


export const discPairs: ProductReference[] = [


];

export const crankshaftPairs: ProductReference[] = [
  { yvNo: "7050010", brandRefs: { FAI: "FVD1117" } }, // 04L105251
  { yvNo: "7051010", brandRefs: { CORTECO: "80004350" } }, // 059105251AA
  { yvNo: "7052010", brandRefs: { CORTECO: "80000835" } }, // 6C1Q6B319EA
  { yvNo: "7053010", brandRefs: { RIDEX: "3213B0103" } }, // 12303AD200
  { yvNo: "7054010", brandRefs: { WILMINK: "WG2258147" } }, // 12303EB300
  { yvNo: "7055010", brandRefs: { CAUTEX: "754662" } }, // 13810P2K003
  { yvNo: "7056010", brandRefs: { RUVILLE: "520378" } }, // 13810PWA003
  { yvNo: "7057010", brandRefs: { CORTECO: "80000990" } }, // 30637335
  { yvNo: "7058010", brandRefs: { RIDEX: "3213B0013" } }, // 96419497
  { yvNo: "7059010", brandRefs: { CORTECO: "80000919" } }, // 504017415
  { yvNo: "7060010", brandRefs: { RUVILLE: "520398" } }, // 1340811012
  { yvNo: "7061010", brandRefs: { CORTECO: "49378102" } }, // 1347015110
  { yvNo: "7062010", brandRefs: { CORTECO: "80000544" } }, // 1660300103
  { yvNo: "7063010", brandRefs: { CORTECO: "80001111" } }, // 640 030 02 03
  { yvNo: "7064010", brandRefs: { CORTECO: "80001108" } }, // 6110300103
  { yvNo: "7065010", brandRefs: { CORTECO: "80000819" } }, // 6420300403
  { yvNo: "7066010", brandRefs: { KRAFTVOLL: "15050090" } }, // 7700273916
  { yvNo: "7067010", brandRefs: { CORTECO: "49467798" } }, // 11238477129
  { yvNo: "7068010", brandRefs: { RIDEX: "3213B0032" } }, // MD338316
];

/*  
    Yukardaki pairlerden herhangi birini scrape ettikten sonra SADECE bunların aplikasyonları excel e almak için 
    App_JsonToExcel ya da New_App_JsonToExcel dosyalarını çalıştıracağında, 
    oradaki "lookupDataMap" değişkenine bu methodun return değerini ata.
*/
export function lookupReference(productType: string): Map<string, string> {
  switch (productType) {
    case "Pad":
      return new Map<string, string>(
        padPairs.map((x) => [Object.values(x.brandRefs)[0], x.yvNo])
      );
    case "Disc":
      return new Map<string, string>(
        discPairs.map((x) => [Object.values(x.brandRefs)[0], x.yvNo])
      );
    case "Crankshaft":
      return new Map<string, string>(
        crankshaftPairs.map((x) => [Object.values(x.brandRefs)[0], x.yvNo])
      );
    default:
      console.log("Unknown product type:", productType);
      return new Map<string, string>();
  }
}

// console.log(lookupProductReference);

export function lookupReferenceFromExcel(excelFilePath: string): Map<string, string> {
  if (!fs.existsSync(excelFilePath)) {
    console.error(`❌ Lookup Excel dosyası bulunamadı: ${excelFilePath}`);
    return new Map<string, string>();
  }

  try {
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0]; // İlk sayfayı al
    const worksheet = workbook.Sheets[sheetName];
    const rawData: LookupExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

    const lookupMap = new Map<string, string>(); // Key: CrossNumber, Value: YV_No

    // Excel'deki sütun başlıklarını dinamik olarak al
    // Sadece "YV No" olmayan sütunları marka sütunu olarak kabul ediyoruz
    const brandColumns = Object.keys(rawData[0] || {}).filter(header => header !== "YV");

    for (const row of rawData) {
      const yvNo = (String(row["YV"] || "")).trim(); // YV No'yu normalize et
      if (!yvNo) {
        console.warn(`⚠️ Excel satırında YV bulunamadı, bu satır atlanıyor: ${JSON.stringify(row)}`);
        continue;
      }

      for (const col of brandColumns) {
        const cellValue = (String(row[col as keyof LookupExcelRow] || "")).trim();
        if (cellValue) {
          // Virgülle ayrılmış birden fazla cross numarası olabilir
          const crossNumbers = cellValue.split(',').map(num => (num)).filter(num => num !== "");

          crossNumbers.forEach(crossNum => {
            if (crossNum) {
              crossNum = crossNum.trim(); // Cross numarasını kırp boşluklardan arındır
              // Eğer bu crossNum zaten Map'te varsa bir uyarı verebiliriz
              // çünkü bir crossNum'a birden fazla YV atanmamalıdır.
              if (lookupMap.has(crossNum) && lookupMap.get(crossNum) !== yvNo) {
                console.warn(`Conflict: Cross numara '${crossNum}' zaten YV '${lookupMap.get(crossNum)}' ile eşleşmişti, şimdi '${yvNo}' ile eşleşiyor. İlk eşleşme korunacak.`);
                // Ya da burada ne yapılacağına karar verin: ilkini mi korusun, sonuncuyu mu, yoksa array'e mi atsın.
                // Şimdilik ilkini koruyalım. Eğer sonuncuyu istiyorsanız if'i kaldırın.
              } else {
                lookupMap.set(crossNum, yvNo);
              }
            }
          });
        }
      }
    }
    console.log(`✅ Excel'den ${lookupMap.size} adet cross-YV eşleşmesi yüklendi.`);

    return lookupMap;
  } catch (error) {
    console.error(`❌ Excel dosyasını okurken veya işlerken bir hata oluştu: ${excelFilePath}`, error);
    return new Map<string, string>();
  }
}