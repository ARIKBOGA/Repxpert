import fs from "fs-extra";
import path from "path";
import glob from "fast-glob";
import * as XLSX from "xlsx";
import { Application } from "../types/Application";
import { extractYears, cleanKBA } from "../utils/extractHelpers";
import { log } from "console";
import markaMap from "../data/katalogInfo/jsons/marka_new.json";
import ConfigReader from "../utils/ConfigReader";
import { formatDateTime } from "../utils/DateHelper";

interface ModelData {
  id: number;
  marka_id: number;
  ["modeller_markalar::marka"]: string;
  model: string;
  model_Web: string;
}

interface ModelMatch {
  original: string;
  normalized: string;
  model_id: number;
  marka_id: number | null;
}

interface MarkaData {
  [key: string]: string;
}

const filterBrand = ConfigReader.getEnvVariable("FILTER_BRAND_APPLICATION") || "BREMBO";
const formattedDate = formatDateTime(new Date());

const OUTPUT_FILE = `English_PAD_APPLICATIONS_${filterBrand}_${formattedDate}.xlsx`;
const ROOT_PATH = `src/data/Gathered_Informations/Pads/Applications/English/${filterBrand}`;
const MARKA_FILE_PATH = "src/data/katalogInfo/jsons/marka_new.json";
const MODEL_FILE_PATH = "src/data/katalogInfo/jsons/model_new.json";
const LOOKUP_FILE_PATH = "src/data/katalogInfo/excels/balata_katalog_full.xlsx";
const MODEL_MATCH_POOL_PATH = "src/data/katalogInfo/jsons/modelMatchPool.json"; // Yeni dosya yolu

// Lookup verisini başlangıçta bir Map içinde saklayarak arama hızını artırıyoruz.
const lookupDataMap = new Map<string, string | undefined>();
const lookupWorkbook = XLSX.readFile(LOOKUP_FILE_PATH, { cellDates: true });
const lookupSheet = lookupWorkbook.Sheets[lookupWorkbook.SheetNames[0]];
XLSX.utils.sheet_to_json<{ YV: string; BREMBO: string; TRW: string; ICER: string; TEXTAR: string }>(lookupSheet).forEach(row => {
  const bremboValue = row.BREMBO?.toString().trim();
  if (bremboValue) {
    lookupDataMap.set(bremboValue, row.YV?.toString().trim());
  }
  const trwValue = row.TRW?.toString().trim();
  if (trwValue) {
    lookupDataMap.set(trwValue, row.YV?.toString().trim());
  }
  const icersValue = row.ICER?.toString().trim();
  if (icersValue) {
    lookupDataMap.set(icersValue, row.YV?.toString().trim());
  }
  const textarValue = row.TEXTAR?.toString().trim();
  if (textarValue) {
    lookupDataMap.set(textarValue, row.YV?.toString().trim());
  }
});

function findYvNoOptimized(partNumber: string): string | null {
  return lookupDataMap.get(partNumber.trim()) || null;
}

async function loadJsonData<T>(filePath: string): Promise<T> {
  try {
    return await fs.readJSON(filePath);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // @ts-ignore
      return {} as T; // Dosya yoksa boş bir obje döndür
    }
    throw error;
  }
}

async function saveJsonData(filePath: string, data: any) {
  await fs.writeJSON(filePath, data, { spaces: 2 });
}

async function main() {
  const markaData = await loadJsonData<MarkaData>(MARKA_FILE_PATH);
  const modelData = await loadJsonData<ModelData[]>(MODEL_FILE_PATH) as ModelData[];
  const files = await glob(`${ROOT_PATH}/**/${filterBrand}*.json`);
  const workbook = XLSX.utils.book_new();

  // markaData'yı bir Map'e dönüştürerek arama hızını artırıyoruz.
  const markaDataMap = new Map<string, number>();
  for (const [key, value] of Object.entries(markaData)) {
    markaDataMap.set(value.trim(), parseInt(key));
  }

  // modelData'yı model ismine göre bir Map'e dönüştürerek arama hızını artırıyoruz.
  const modelDataMap = new Map<string, ModelData>();
  modelData.forEach(model => {
    modelDataMap.set(model.model.trim(), model);
  });

  // modelMatchPool.json dosyasını yükle veya boş bir array oluştur
  let modelMatchPool: ModelMatch[] = await loadJsonData<ModelMatch[]>(MODEL_MATCH_POOL_PATH) || [];
  const existingMatches = new Map<string, boolean>();
  modelMatchPool.forEach(match => {
    existingMatches.set(match.normalized, true);
  });

  const newlyAddedModels: ModelMatch[] = [];

  for (const file of files) {
    const json: Application[] = await fs.readJSON(file);
    const partNumber = path.basename(file, ".json").split("_")[1];
    const yvNo = findYvNoOptimized(partNumber) || "YV_BULUNAMADI";
    const sheetName = path.basename(file, ".json").split("_")[1];

    const rows = json.map(async (app) => { // map içinde async kullanıldığına dikkat
      const { start, end } = extractYears(app.madeYear);

      const marka_id_raw = markaDataMap.get(app.brand.trim()) ?? null;
      const marka_id = marka_id_raw !== null ? marka_id_raw : null;

      const modelEntry = modelDataMap.get(app.model.trim());
      const model_id = modelEntry ? modelEntry.id : null;

      if (model_id !== null && marka_id !== null && !existingMatches.has(app.model.trim())) {
        const newMatch: ModelMatch = {
          original: app.model.trim(),
          normalized: app.model.trim(), // Normalizasyona gerek kalmadı
          model_id: model_id,
          marka_id: marka_id,
        };
        modelMatchPool.push(newMatch);
        newlyAddedModels.push(newMatch);
        existingMatches.set(app.model.trim(), true); // Hemen işaretle ki aynı model tekrar eklenmesin
      }

      const katalogMarkaKey = marka_id !== null ? marka_id.toString() : null;
      const katalogMarka = katalogMarkaKey && markaMap[katalogMarkaKey as keyof typeof markaMap] ? markaMap[katalogMarkaKey as keyof typeof markaMap].trim() : app.brand.trim();

      return {
        "YV No": yvNo,
        marka_id,
        marka: katalogMarka,
        model_id,
        model: app.model.trim(),
        "Baş. Yıl": start,
        "Bit. Yıl": end,
        motor: app.engineType.trim(),
        kw: app.kw.trim(),
        hp: app.hp.trim(),
        cc: app.cc.trim(),
        "motor kodu": app.engineCodes.trim(),
        KBA: cleanKBA(app.KBA_Numbers),
      };
    });

    // Tüm satırlar işlendikten sonra Promise.all ile sonuçları bekle
    const resolvedRows = await Promise.all(rows);

    const worksheet = XLSX.utils.json_to_sheet(resolvedRows, {
      header: [
        "YV No", "marka_id", "marka", "model_id", "model", "Baş. Yıl", "Bit. Yıl",
        "motor", "kw", "hp", "cc", "motor kodu", "KBA"
      ]
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  }

  // Tüm dosyalar işlendikten sonra modelMatchPool'u kaydet
  await saveJsonData(MODEL_MATCH_POOL_PATH, modelMatchPool);

  // Yeni eklenen modelleri konsola yazdır
  if (newlyAddedModels.length > 0) {
    console.log("\n✨ Yeni eklenen model eşleşmeleri:");
    newlyAddedModels.forEach(match => {
      console.log(JSON.stringify(match.original, null, 2));
    });
  } else {
    console.log("\nℹ️ Yeni model eşleşmesi bulunamadı.");
  }

  const outputPath = "src/data/Gathered_Informations/Pads/Applications/excels";
  XLSX.writeFile(workbook, path.join(outputPath, OUTPUT_FILE), { bookType: "xlsx", type: "binary" });
  console.log(`✅ Excel oluşturuldu: ${OUTPUT_FILE}`);
  console.log(`💾 Model eşleşmeleri kaydedildi: ${MODEL_MATCH_POOL_PATH}`);
}

const normalizeString = (input: string): string => {
  return input
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/İ/g, "I")   // Türkçe büyük İ düzeltmesi
    .replace(/[^A-Z0-9]/g, "")   // sadece harf ve rakam
    .trim();
};

main().catch(console.error);