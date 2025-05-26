import fs from "fs-extra";
import path from "path";
import glob from "fast-glob";
import * as XLSX from "xlsx";
import { Application } from "../types/Application";
import { extractYears, cleanKBA } from "../utils/extractHelpers";
import markaMap from "../data/katalogInfo/jsons/marka_seri_no.json";
import dotenv from "dotenv";
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

interface UnmatchedModel {
  marka_name: string;
  model_name: string;
  original_brand: string; // Orjinal marka adını tutmak için
  original_model: string; // Orjinal model adını tutmak için
}

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const filterBrand = process.env.FILTER_BRAND_APPLICATION || "BREMBO";
const formattedDate = formatDateTime(new Date());

const OUTPUT_FILE = `PAD_APPLICATIONS_${filterBrand}_${formattedDate.numericDate}.xlsx`;
const ROOT_PATH = "src/data/Gathered_Informations/Pads/Applications/" + filterBrand;
const MARKA_FILE_PATH = "src/data/katalogInfo/jsons/marka_seri_no.json";
const MODEL_FILE_PATH = "src/data/katalogInfo/jsons/model_seri_no.json";
const LOOKUP_FILE_PATH = "src/data/katalogInfo/excels/balata_katalog_full.xlsx";
const MODEL_MATCH_POOL_PATH = "src/data/katalogInfo/jsons/modelMatchPool.json"; // Yeni dosya yolu
const UNMATCHED_MODELS_PATH = "src/data/katalogInfo/jsons/unmatchedModels.json"; // Eşleşmeyen modeller için yeni dosya

// Lookup verisini başlangıçta bir Map içinde saklayarak arama hızını artırıyoruz.
const lookupDataMap = new Map<string, string | undefined>();
const lookupWorkbook = XLSX.readFile(LOOKUP_FILE_PATH, { cellDates: true });
const lookupSheet = lookupWorkbook.Sheets[lookupWorkbook.SheetNames[0]];
XLSX.utils.sheet_to_json<{ YV: string; BREMBO: string; TRW: string }>(lookupSheet).forEach(row => {
  const bremboValue = row.BREMBO?.toString().trim();
  if (bremboValue) {
    lookupDataMap.set(bremboValue, row.YV?.toString().trim());
  }
  const trwValue = row.TRW?.toString().trim();
  if (trwValue) {
    lookupDataMap.set(trwValue, row.YV?.toString().trim());
  }
});

function findYvNoOptimized(partNumber: string): string | null {
  return lookupDataMap.get(partNumber.trim()) || null;
}

async function loadJsonData<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const data = await fs.readJSON(filePath);
    return data as T;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // @ts-ignore
      return defaultValue; // Dosya yoksa belirtilen varsayılan değeri döndür
    }
    throw error;
  }
}

async function saveJsonData(filePath: string, data: any) {
  await fs.writeJSON(filePath, data, { spaces: 2 });
}

const normalizedBrandCache = new Map<string, string>();
function normalizeBrand(brand: string): string {
  const trimmedBrand = brand.trim();
  if (normalizedBrandCache.has(trimmedBrand)) {
    return normalizedBrandCache.get(trimmedBrand)!;
  }
  const normalized = normalizeString(trimmedBrand);
  const result = brandAliases[normalized] || normalized;
  normalizedBrandCache.set(trimmedBrand, result);
  return result;
}

const normalizedModelCache = new Map<string, string>();
function normalizeModel(model: string): string {
  const trimmedModel = model.trim();
  if (normalizedModelCache.has(trimmedModel)) {
    return normalizedModelCache.get(trimmedModel)!;
  }
  // Parantez açma ve kapama sayısını eşitleme
  let normalizedModelValue = trimmedModel.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if ((normalizedModelValue.match(/\(/g) || []).length > (normalizedModelValue.match(/\)/g) || []).length) {
    normalizedModelValue += ")";
  }
  normalizedModelValue = normalizedModelValue
    .replace(/,/g, " ") // Virgül düzeltme
    .replace(/İ/g, "I") // Türkçe karakter düzeltme
    .replace(/[|/]/g, " ") // Pipe ve slash düzeltme
    .replace(/([^\\s])\(/g, "$1 (") // Parantez düzeltme
    .replace(/[\s\-_.]+/g, " ") // Boşlukları düzeltme
    .replace(/([,])\s*/g, "$1") // Boşlukları düzeltme
    .replace(/\s+([,])/g, "$1") // Boşlukları düzeltme
    .replace(/[()]/g, "") // Parantez düzeltme
    .replace(/\s+/g, " ") // Birden fazla boşluğu tek boşluğa çevirme
    .trim();

  for (const [target, replacement] of Object.entries(REPLACE_MAP)) {
    const pattern = new RegExp(`\\b${target}\\b`, "g");
    normalizedModelValue = normalizedModelValue.replace(pattern, replacement);
  }
  normalizedModelCache.set(trimmedModel, normalizedModelValue);
  return normalizedModelValue;
}

async function main() {
  const markaData = await loadJsonData<MarkaData>(MARKA_FILE_PATH, {});
  const modelData = await loadJsonData<ModelData[]>(MODEL_FILE_PATH, []);
  const files = await glob([
  `${ROOT_PATH}/**/${filterBrand}*.json`, // Örneğin, BREMBO_*.json dosyaları
  `${ROOT_PATH}/**/ICER_*.json`           // ICER_*.json dosyaları
  ]);
  const workbook = XLSX.utils.book_new();

  // markaData'yı bir Map'e dönüştürerek arama hızını artırıyoruz.
  const markaDataMap = new Map<string, number>();
  for (const [key, value] of Object.entries(markaData)) {
    markaDataMap.set(normalizeString(value), parseInt(key));
  }

  // modelData'yı model ismine göre bir Map'e dönüştürerek arama hızını artırıyoruz.
  const modelDataMap = new Map<string, ModelData>();
  modelData.forEach(model => {
    modelDataMap.set(normalizeModel(model.model), model);
  });

  // modelMatchPool.json dosyasını yükle veya boş bir array oluştur
  let modelMatchPool: ModelMatch[] = await loadJsonData<ModelMatch[]>(MODEL_MATCH_POOL_PATH, []);
  const existingMatches = new Map<string, boolean>();
  modelMatchPool.forEach(match => {
    existingMatches.set(match.normalized, true);
  });

  const newlyAddedModels: ModelMatch[] = [];

  // ID'si bulunamayan modeller için yeni bir liste yükle veya oluştur
  let unmatchedModels: UnmatchedModel[] = await loadJsonData<UnmatchedModel[]>(UNMATCHED_MODELS_PATH, []);
  // Mevcut eşleşmeyen modelleri takip etmek için bir Set kullan
  const existingUnmatched = new Map<string, boolean>();
  unmatchedModels.forEach(um => {
    // normalized marka ve model adlarını birleştirerek benzersiz bir anahtar oluştur
    existingUnmatched.set(`${normalizeString(um.marka_name)}_${normalizeModel(um.model_name)}`, true);
  });
  const newlyAddedUnmatchedModels: UnmatchedModel[] = [];


  for (const file of files) {
    const json: Application[] = await fs.readJSON(file);
    const partNumber = path.basename(file, ".json").split("_")[1];
    const yvNo = findYvNoOptimized(partNumber) || "YV_BULUNAMADI";
    const sheetName = path.basename(file, ".json").split("_")[1];

    const rows = json.map(async (app) => { // map içinde async kullanıldığına dikkat
      const { start, end } = extractYears(app.madeYear);

      const originalBrand = app.brand.trim();
      const originalModel = app.model.trim();

      const normalizedBrand = normalizeBrand(originalBrand);
      const marka_id_raw = markaDataMap.get(normalizeString(normalizedBrand)); // undefined yerine null kontrolü için
      const marka_id = marka_id_raw !== undefined ? marka_id_raw : null;

      const normalizedModel = normalizeModel(originalModel);
      const modelEntry = modelDataMap.get(normalizedModel);
      const model_id = modelEntry ? modelEntry.id : null;

      // ModelMatchPool'a ekleme mantığı
      if (model_id !== null && marka_id !== null && !existingMatches.has(normalizedModel)) {
        const newMatch: ModelMatch = {
          original: originalModel,
          normalized: normalizedModel,
          model_id: model_id,
          marka_id: marka_id,
        };
        modelMatchPool.push(newMatch);
        newlyAddedModels.push(newMatch);
        existingMatches.set(normalizedModel, true); // Hemen işaretle ki aynı model tekrar eklenmesin
      }

      // Eşleşmeyen modelleri kaydetme
      if (model_id === null || marka_id === null) {
        const unmatchedKey = `${normalizeString(normalizedBrand)}_${normalizeModel(normalizedModel)}`;
        if (!existingUnmatched.has(unmatchedKey)) {
          const newUnmatched: UnmatchedModel = {
            marka_name: normalizedBrand,
            model_name: normalizedModel,
            original_brand: originalBrand,
            original_model: originalModel
          };
          unmatchedModels.push(newUnmatched);
          newlyAddedUnmatchedModels.push(newUnmatched);
          existingUnmatched.set(unmatchedKey, true);
        }
      }

      const katalogMarkaKey = marka_id !== null ? marka_id.toString() : null;
      const katalogMarka = katalogMarkaKey && markaMap[katalogMarkaKey as keyof typeof markaMap] ? markaMap[katalogMarkaKey as keyof typeof markaMap].trim() : originalBrand; // app.brand.trim() yerine originalBrand

      return {
        "YV No": yvNo,
        marka_id,
        marka: katalogMarka,
        model_id,
        model: originalModel, // app.model.trim() yerine originalModel
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

  // Tüm dosyalar işlendikten sonra modelMatchPool ve unmatchedModels'ı kaydet
  await saveJsonData(MODEL_MATCH_POOL_PATH, modelMatchPool);
  await saveJsonData(UNMATCHED_MODELS_PATH, unmatchedModels);

  // Yeni eklenen modelleri konsola yazdır
  if (newlyAddedModels.length > 0) {
    console.log("\n✨ Yeni eklenen model eşleşmeleri:");
    newlyAddedModels.forEach(match => {
      console.log(JSON.stringify(match.original, null, 2));
    });
  } else {
    console.log("\nℹ️ Yeni model eşleşmesi bulunamadı.");
  }

  // Yeni eklenen eşleşmeyen modelleri konsola yazdır
  if (newlyAddedUnmatchedModels.length > 0) {
    console.log("\n⚠️ Yeni eşleşmeyen modeller (veri tabanına eklenmesi gerekenler):");
    newlyAddedUnmatchedModels.forEach(unmatched => {
      console.log(`Original Marka: "${unmatched.original_brand}", Original Model: "${unmatched.original_model}" -> Normalized Marka: "${unmatched.marka_name}", Normalized Model: "${unmatched.model_name}"`);
    });
  } else {
    console.log("\n✅ Yeni eşleşmeyen model bulunamadı.");
  }

  XLSX.writeFile(workbook, OUTPUT_FILE);
  console.log(`✅ Excel oluşturuldu: ${OUTPUT_FILE}`);
  console.log(`💾 Model eşleşmeleri kaydedildi: ${MODEL_MATCH_POOL_PATH}`);
  console.log(`❌ Eşleşmeyen modeller kaydedildi: ${UNMATCHED_MODELS_PATH}`);
}

const normalizeString = (input: string): string => {
  return input
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/İ/g, "I")  // Türkçe büyük İ düzeltmesi
    .replace(/[^A-Z0-9]/g, "")  // sadece harf ve rakam
    .trim();
};

const rawBrandAliases = {
  "VW": "VOLKSWAGEN",
  "VAG": "VOLKSWAGEN",
  "ŠKODA": "SKODA",
  "MERCEDES-BENZ": "MERCEDES",
  "TOFAS": "FIAT",
  "DAEWOO": "DAEWOO - CHEVROLET",
  "CHEVROLET": "DAEWOO - CHEVROLET",
  "EMGRAND": "GEELY"
};

// Normalized brandAliases map
const brandAliases: Record<string, string> = Object.fromEntries(
  Object.entries(rawBrandAliases).map(([key, value]) => [
    normalizeString(key),
    value
  ])
);

const REPLACE_MAP: Record<string, string> = {
  "CABRIOLET": "CABRIO",
  "LIMOUSINE": "LIMUZIN",
  "LIMO": "LIMUZIN",
  "TOURER": "STATION",
  "PLATFORM CHASSIS": "PLATFORM SASI",
  "CHASSIS": "SASI",
  "KASA BUYUK LIMUZIN": "BOX GRAND LIMUZIN",
  "BOX GRAND LIMUZIN": "KASA BUYUK LIMUZIN",
  "PLATFORM ŞASİ": "PLATFORM SASI",
  "ŞASİ": "SASI",
  "MINIBUS OTOBUS": "BUS",
  "KASA EGIK ARKA": "HB VAN",
  "HATCHBACK VAN": "KASA EGIK ARKA",
  "SERISI": "CLASS",
  "COMBI": "KOMBI",
  "CEE'D": "CEED",
  "PRO CEED": "PROCEED",
  "PRO CEE'D": "PROCEED",
  "SEDAN": "SALOON"
};

main().catch(console.error);