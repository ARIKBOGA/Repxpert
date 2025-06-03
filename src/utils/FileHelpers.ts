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
  { yvNo: "23554410", brandRefs: { "ICER": "180697-703" } },
  { yvNo: "23775201", brandRefs: { "ICER": "181596" } },
  { yvNo: "23901206", brandRefs: { "ICER": "141103" } },
  { yvNo: "24072401", brandRefs: { "ICER": "181659" } },
  { yvNo: "24510201", brandRefs: { "ICER": "181798" } },
  { yvNo: "24710201", brandRefs: { "ICER": "181856" } },
  { yvNo: "24883401", brandRefs: { "ICER": "181925-201" } },
  { yvNo: "26188208", brandRefs: { "ICER": "182410-203" } },
  { yvNo: "29153401", brandRefs: { "ICER": "141126-700" } }


];

//YV NO		AÇIKLAMA	TRW	Textar	balata:wva no
//13	21827201	#YOK	STANDART VERSİYON I	GDB1322	2182702	21430
//235	21934201	#YOK	STANDART VERSİYON I	GDB1344	2193402	21934
//269	21471401	#YOK	STANDART VERSİYON I	GDB1269	2147102	23945
//438	24727203	#YOK	SABİT 1 KABLOLU	GDB1864	2472701	24727
//544	21158401	#YOK	STANDART VERSİYON I	GDB351	2115801	21158

export const discPairs: ProductReference[] = [
  //{ yvNo: "261579", brandRefs: { "BREMBO": "09.B630.10" } }, // 40206EB70B
  //{ yvNo: "511578", brandRefs: { "BREMBO": "09.B524.10" } }, // 43512B1030
  //{ yvNo: "511576", brandRefs: { "BREMBO": "08.9138.10" } }, // 4351297204
  //{ yvNo: "341575", brandRefs: { "BREMBO": "08.A273.10" } }, // 4243112250
  //{ yvNo: "261574", brandRefs: { "BREMBO": "09.7263.30" } }, // 432079X100
  //{ yvNo: "531572", brandRefs: { "FREMAX": "BD-5452" } }, // 13514522       **************************
  //{ yvNo: "531571", brandRefs: { "BOSCH": "0 986 479 W30" } }, // 22950036
  //{ yvNo: "581573", brandRefs: { "BREMBO": "09.A402.10" } }, // 780255
  //{ yvNo: "731570", brandRefs: { "TEXTAR": "92343203" } }, // 10174827      **************************
  //{ yvNo: "681569", brandRefs: { "FREMAX": "BD-4438" } }, // T153502075EP   **************************
  //{ yvNo: "34759CS", brandRefs: { "BREMBO": "09.E229.1X" } }, // 4351202390
  //{ yvNo: "15672CS", brandRefs: { "BREMBO": "09.D218.11" } }, // 45251T1GG01
  //{ yvNo: "52657CS", brandRefs: { "BREMBO": "09.9793.1X" } }, // 34216783754
  //{ yvNo: "301520", brandRefs: { "BREMBO": "08.A135.17" } }, // 432004943R
  //{ yvNo: "30438CS", brandRefs: { "BREMBO": "09.A727.1X" } }, // 402060010R
  //{ yvNo: "15443CS", brandRefs: { "BREMBO": "09.A866.1X" } }, // 45251SWWG01
  //{ yvNo: "18486CS", brandRefs: { "BREMBO": "09.A807.11" } }, // 517120Z000
  //{ yvNo: "511089", brandRefs: { "TEXTAR": "94036400" } }, // 42431B1020
  //{ yvNo: "261090", brandRefs: { "TRW": "DB4141" } }, // 43206VM00B
  //{ yvNo: "261091", brandRefs: { "TEXTAR": "94026900" } }, // 432064M400
  //{ yvNo: "341092", brandRefs: { "TEXTAR": "94045200" } }, // 424310D030
  //{ yvNo: "681569", brandRefs: { JNBK: "RN2502" } }, // T153502075EP - FREMAX - BD-4438
  //{ yvNo: "731570", brandRefs: { JNBK: "RN2530V" } }, // 10174827 - TEXTAR - 92343203
  //{ yvNo: "531572", brandRefs: { JNBK: "RN2289V" } }, // 582458R - FREMAX - BD-5452
  //{ yvNo: "511577", brandRefs: { JNBK: "RN2452V" } }, // 43512BZ100
  //{ yvNo: "36168", brandRefs: { ICER: "78BD4063-2" } },
  { yvNo: "33051", brandRefs: { TEXTAR: "92034400" } },
  { yvNo: "13024", brandRefs: { TEXTAR: "92063503" } },
  { yvNo: "60206", brandRefs: { TEXTAR: "93084900" } },
  { yvNo: "36320", brandRefs: { TEXTAR: "92012103" } },
  { yvNo: "28501", brandRefs: { TEXTAR: "92092803" } },
  { yvNo: "67517", brandRefs: { TEXTAR: "92294203" } },
  { yvNo: "53514", brandRefs: { TEXTAR: "92241400" } },
  { yvNo: "13553", brandRefs: { TEXTAR: "92275803" } },
  { yvNo: "13572", brandRefs: { TEXTAR: "92274103" } },
  { yvNo: "16608", brandRefs: { TEXTAR: "92292203" } },
  { yvNo: "26634C", brandRefs: { TEXTAR: "92199105" } },
  { yvNo: "15676", brandRefs: { TEXTAR: "92257303" } },
  { yvNo: "32736", brandRefs: { TEXTAR: "92204703" } },
  { yvNo: "27769", brandRefs: { TEXTAR: "92305505" } },
  { yvNo: "32802", brandRefs: { TEXTAR: "92305703" } },
  { yvNo: "27811", brandRefs: { TEXTAR: "92256803" } },
  { yvNo: "13816", brandRefs: { TEXTAR: "92268703" } },
  { yvNo: "24916", brandRefs: { TEXTAR: "92279403" } },
  { yvNo: "55932", brandRefs: { TEXTAR: "92287303" } },
  { yvNo: "13986", brandRefs: { TEXTAR: "92315503" } },
  { yvNo: "151536", brandRefs: { TEXTAR: "92298703" } },
  { yvNo: "131553", brandRefs: { TEXTAR: "92352603" } },
  { yvNo: "161562", brandRefs: { TEXTAR: "92351203" } },
  { yvNo: "731570", brandRefs: { TEXTAR: "92343203" } },
  { yvNo: "34575", brandRefs: { TEXTAR: "92274903 / 92230403" } }
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