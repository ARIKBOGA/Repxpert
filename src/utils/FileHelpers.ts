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
  
  { yvNo: "13003", brandRefs: { KRAFTVOLL: "07040962" } },
  { yvNo: "18068", brandRefs: { KRAFTVOLL: "07040294" } },
  { yvNo: "43134", brandRefs: { KRAFTVOLL: "07040208" } },
  { yvNo: "43188", brandRefs: { KRAFTVOLL: "07040327" } },
  { yvNo: "25240", brandRefs: { KRAFTVOLL: "07040323" } },
  { yvNo: "59239", brandRefs: { KRAFTVOLL: "07040105" } },
  { yvNo: "33247", brandRefs: { KRAFTVOLL: "07040012" } },
  { yvNo: "43255", brandRefs: { KRAFTVOLL: "07040251" } },
  { yvNo: "49113", brandRefs: { KRAFTVOLL: "07040244" } },
  { yvNo: "43302", brandRefs: { KRAFTVOLL: "07040280" } },
  { yvNo: "49306", brandRefs: { KRAFTVOLL: "07040189" } },
  { yvNo: "53338", brandRefs: { KRAFTVOLL: "07040319" } },
  { yvNo: "28341", brandRefs: { KRAFTVOLL: "07040003" } },
  { yvNo: "25236", brandRefs: { KRAFTVOLL: "07040124" } },
  { yvNo: "59354", brandRefs: { KRAFTVOLL: "07040268" } },
  { yvNo: "25368", brandRefs: { KRAFTVOLL: "07040326" } },
  { yvNo: "40369", brandRefs: { KRAFTVOLL: "07040330" } },
  { yvNo: "18150", brandRefs: { KRAFTVOLL: "07040264" } },
  { yvNo: "43398", brandRefs: { KRAFTVOLL: "07040289" } },
  { yvNo: "43399", brandRefs: { KRAFTVOLL: "07040309" } },
  { yvNo: "63417", brandRefs: { KRAFTVOLL: "07040607" } },
  { yvNo: "63418", brandRefs: { KRAFTVOLL: "07040608" } },
  { yvNo: "18436", brandRefs: { KRAFTVOLL: "07040352" } },
  { yvNo: "43464", brandRefs: { KRAFTVOLL: "07040283" } },
  { yvNo: "43465", brandRefs: { KRAFTVOLL: "07040334" } },
  { yvNo: "25439", brandRefs: { KRAFTVOLL: "07040589" } },
  { yvNo: "32472", brandRefs: { KRAFTVOLL: "07040246" } },
  { yvNo: "18489", brandRefs: { KRAFTVOLL: "07040167" } },
  { yvNo: "40527", brandRefs: { KRAFTVOLL: "07040140" } },
  { yvNo: "69556", brandRefs: { KRAFTVOLL: "07040083" } },
  { yvNo: "18566", brandRefs: { KRAFTVOLL: "07040092" } },
  { yvNo: "34575", brandRefs: { KRAFTVOLL: "07040142" } },
  { yvNo: "13577", brandRefs: { KRAFTVOLL: "07040260" } },
  { yvNo: "69592", brandRefs: { KRAFTVOLL: "07040400" } },
  { yvNo: "15672", brandRefs: { KRAFTVOLL: "07040428" } },
  { yvNo: "13680", brandRefs: { KRAFTVOLL: "07040599" } },
  { yvNo: "40748", brandRefs: { KRAFTVOLL: "07040621" } },
  { yvNo: "25730", brandRefs: { KRAFTVOLL: "07040489" } },
  { yvNo: "15785", brandRefs: { KRAFTVOLL: "07040808" } },
  { yvNo: "16795", brandRefs: { KRAFTVOLL: "07040614" } },
  { yvNo: "25902", brandRefs: { KRAFTVOLL: "07040688" } },
  { yvNo: "40903", brandRefs: { KRAFTVOLL: "07040622" } },
  { yvNo: "40904", brandRefs: { KRAFTVOLL: "07040623" } },
  { yvNo: "25905", brandRefs: { KRAFTVOLL: "07040689" } },
  { yvNo: "25909", brandRefs: { KRAFTVOLL: "07041088" } },
  { yvNo: "25910", brandRefs: { KRAFTVOLL: "07050074" } },
  { yvNo: "15676CS", brandRefs: { KRAFTVOLL: "07040986" } },
  { yvNo: "15677CS", brandRefs: { KRAFTVOLL: "07040987" } },
  { yvNo: "15785CS", brandRefs: { KRAFTVOLL: "07040989" } },
  { yvNo: "24814CS", brandRefs: { KRAFTVOLL: "07041021" } },
  { yvNo: "24831CS", brandRefs: { KRAFTVOLL: "07041023" } },
  { yvNo: "27590CS", brandRefs: { KRAFTVOLL: "07041026" } },
  { yvNo: "27756CS", brandRefs: { KRAFTVOLL: "07041027" } },
  { yvNo: "28405CS", brandRefs: { KRAFTVOLL: "07041029" } },
  { yvNo: "28679CS", brandRefs: { KRAFTVOLL: "07041030" } },
  { yvNo: "28770CS", brandRefs: { KRAFTVOLL: "07041031" } },
  { yvNo: "30513CS", brandRefs: { KRAFTVOLL: "07041033" } },
  { yvNo: "33375CS", brandRefs: { KRAFTVOLL: "07041035" } },
  { yvNo: "36178CS", brandRefs: { KRAFTVOLL: "07041037" } },
  { yvNo: "36313CS", brandRefs: { KRAFTVOLL: "07041039" } },
  { yvNo: "36461CS", brandRefs: { KRAFTVOLL: "07041040" } },
  { yvNo: "36567CS", brandRefs: { KRAFTVOLL: "07041041" } },
  { yvNo: "36753CS", brandRefs: { KRAFTVOLL: "07041043" } },
  { yvNo: "36758CS", brandRefs: { KRAFTVOLL: "07041044" } },
  { yvNo: "36920CS", brandRefs: { KRAFTVOLL: "07041045" } },
  { yvNo: "36925CS", brandRefs: { KRAFTVOLL: "07041046" } },
  { yvNo: "41423CS", brandRefs: { KRAFTVOLL: "07041049" } },
  { yvNo: "52536CS", brandRefs: { KRAFTVOLL: "07041057" } },
  { yvNo: "52541CS", brandRefs: { KRAFTVOLL: "07041058" } },
  { yvNo: "52887CS", brandRefs: { KRAFTVOLL: "07041077" } },
  { yvNo: "15112CS", brandRefs: { KRAFTVOLL: "07040982" } },
  { yvNo: "15245CS", brandRefs: { KRAFTVOLL: "07040983" } },
  { yvNo: "15328CS", brandRefs: { KRAFTVOLL: "07040984" } },
  { yvNo: "15498CS", brandRefs: { KRAFTVOLL: "07040985" } },
  { yvNo: "24182CS", brandRefs: { KRAFTVOLL: "07041018" } },
  { yvNo: "30220CS", brandRefs: { KRAFTVOLL: "07041032" } },
  { yvNo: "36193CS", brandRefs: { KRAFTVOLL: "07041038" } },
  { yvNo: "36750CS", brandRefs: { KRAFTVOLL: "07041042" } },
  { yvNo: "36926CS", brandRefs: { KRAFTVOLL: "07041047" } },
  { yvNo: "24654CS", brandRefs: { KRAFTVOLL: "07041019" } },
  { yvNo: "36116CS", brandRefs: { KRAFTVOLL: "07041036" } },
  { yvNo: "161062", brandRefs: { KRAFTVOLL: "07040990" } },
  { yvNo: "161063", brandRefs: { KRAFTVOLL: "07040991" } },
  { yvNo: "53477CS", brandRefs: { KRAFTVOLL: "07041078" } },
  { yvNo: "201076", brandRefs: { KRAFTVOLL: "07041007" } },
  { yvNo: "201077", brandRefs: { KRAFTVOLL: "07041008" } },
  { yvNo: "28122CS", brandRefs: { KRAFTVOLL: "07041028" } },
  { yvNo: "13986C", brandRefs: { KRAFTVOLL: "07040981" } },
  { yvNo: "13680CS", brandRefs: { KRAFTVOLL: "07040979" } },
  { yvNo: "13681CS", brandRefs: { KRAFTVOLL: "07040980" } },
  { yvNo: "36938CS", brandRefs: { KRAFTVOLL: "07041048" } },
  { yvNo: "401539", brandRefs: { KRAFTVOLL: "07041086" } },
  { yvNo: "681546", brandRefs: { KRAFTVOLL: "07040959" } },
  { yvNo: "681547", brandRefs: { KRAFTVOLL: "07040960" } },
  { yvNo: "761548", brandRefs: { KRAFTVOLL: "07041016" } },
  { yvNo: "761549", brandRefs: { KRAFTVOLL: "07041017" } },
  { yvNo: "131553", brandRefs: { KRAFTVOLL: "07041082" } },
  { yvNo: "131554", brandRefs: { KRAFTVOLL: "07041083" } },
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