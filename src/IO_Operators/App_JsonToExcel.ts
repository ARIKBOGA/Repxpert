import fs from "fs-extra";
import path from "path";
import glob from "fast-glob";
import * as XLSX from "xlsx";
import { Application } from "../types/Application";
import { cleanKBA, extractYears_Turkish } from "../utils/extractHelpers";
import markaMap from "../data/katalogInfo/jsons/marka_tur.json";
import dotenv from "dotenv";
import { formatDateTime } from "../utils/DateHelper";
import { MarkaData, ModelData, ModelMatch, UnmatchedModel, LookupExcelRow } from "../types/AppToJson_Types"
import { getTargetBrandName, normalizeModel, normalizeString } from "../utils/NormalizersForJsonToExcels"
// .env dosyasındaki ortam değişkenlerini yükle
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const filterBrand = process.env.FILTER_BRAND_APPLICATION || "BREMBO";
const formattedDate = formatDateTime(new Date());

const OUTPUT_FILE = `PAD_APPLICATIONS_${filterBrand}_${formattedDate.numericDate}.xlsx`;
const ROOT_PATH = "src/data/Gathered_Informations/Pads/Applications/" + filterBrand;
const MARKA_FILE_PATH = "src/data/katalogInfo/jsons/marka_tur.json"; // markatur.json olarak güncellendi
const MODEL_FILE_PATH = "src/data/katalogInfo/jsons/model_tur.json"; // model_tur.json olarak güncellendi
const LOOKUP_FILE_PATH = "src/data/katalogInfo/excels/Pads_katalog_full.xlsx";
const MODEL_MATCH_POOL_PATH = "src/data/katalogInfo/jsons/modelMatchPool.json";

// Yeni: Eşleşmeyen modellerin kaydedileceği tek JSON dosyası
const UNMATCHED_MODELS_FILE = `src/data/katalogInfo/jsons/unmatched_models_${formattedDate.numericDate}.json`;

// --- Lookup Verisi İşleme Başlangıcı ---
const lookupDataMap = new Map<string, string[]>();

const processAndSetLookupData = (
  map: Map<string, string[]>,
  sourceValueString: string | undefined,
  yvValue: string | undefined
) => {
  if (sourceValueString && yvValue) {
    const trimmedYvValue = yvValue.trim();
    sourceValueString.split(",").forEach(valuePart => {
      const trimmedPart = valuePart.trim();
      if (trimmedPart) {
        if (map.has(trimmedPart)) {
          const existingYvValues = map.get(trimmedPart)!;
          if (!existingYvValues.includes(trimmedYvValue)) {
            existingYvValues.push(trimmedYvValue);
          }
        } else {
          map.set(trimmedPart, [trimmedYvValue]);
        }
      }
    });
  }
};

try {
  const lookupWorkbook = XLSX.readFile(LOOKUP_FILE_PATH, { cellDates: false });
  const lookupSheet = lookupWorkbook.Sheets[lookupWorkbook.SheetNames[0]];

  const fieldsToProcess = ["BREMBO", "TRW", "ICER", "TEXTAR"];

  XLSX.utils.sheet_to_json<LookupExcelRow>(lookupSheet).forEach(row => {
    const yvValue = row.YV?.toString();
    fieldsToProcess.forEach(field => {
      const sourceValue = row[field]?.toString();
      processAndSetLookupData(lookupDataMap, sourceValue, yvValue);
    });
  });

  const logDebug = (message: string, ...args: any[]) => {
    console.log(`[DEBUG] ${message}`, ...args);
  };

  logDebug("Lookup Map oluşturuldu: %d benzersiz parça numarası kaydı.", lookupDataMap.size);

} catch (error) {
  console.error("Lookup Excel dosyası okunurken hata oluştu:", error);
  process.exit(1);
}

function findYvNoOptimized(partNumber: string): string[] {
  return lookupDataMap.get(partNumber.trim()) || [];
}
// --- Lookup Verisi İşleme Sonu ---

async function loadJsonData<T>(filePath: string): Promise<T> {
  try {
    return await fs.readJSON(filePath);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // @ts-ignore
      return {} as T;
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

  const markaDataMap = new Map<string, number>();
  for (const [key, value] of Object.entries(markaData)) {
    markaDataMap.set(normalizeString(value), parseInt(key));
  }

  const modelDataMap = new Map<string, ModelData>();
  modelData.forEach(model => {
    modelDataMap.set(normalizeModel(model.model), model);
  });

  let modelMatchPool: ModelMatch[] = await loadJsonData<ModelMatch[]>(MODEL_MATCH_POOL_PATH) || [];
  const existingMatches = new Map<string, boolean>();
  modelMatchPool.forEach(match => {
    existingMatches.set(match.normalized, true);
  });

  const newlyAddedModels: ModelMatch[] = [];
  // Eşleşemeyen modelleri benzersiz tutmak için Map kullanıyoruz
  const unmatchedModelsMap = new Map<string, UnmatchedModel>(); 

  const sheetNameCounters = new Map<string, number>();

  for (const file of files) {
    const json: Application[] = await fs.readJSON(file);
    const partNumber = path.basename(file, ".json").split("_")[1];
    const yvNos = findYvNoOptimized(partNumber);
    const yvNosToProcess = yvNos.length > 0 ? yvNos : ["YV_BULUNAMADI"];

    for (let i = 0; i < yvNosToProcess.length; i++) {
      const currentYvNo = yvNosToProcess[i];
      let baseSheetName = partNumber;

      if (yvNosToProcess.length > 1 && currentYvNo !== "YV_BULUNAMADI") {
        baseSheetName = `${partNumber}_${i + 1}`;
      }

      const rows = json.map(async (app) => {
        const { start, end } = extractYears_Turkish(app.madeYear);

        const targetNormalizedBrand = getTargetBrandName(app.brand);
        const marka_id_raw = markaDataMap.get(targetNormalizedBrand) ?? null;
        const marka_id = marka_id_raw !== null ? marka_id_raw : null;

        const normalizedModel = normalizeModel(app.model);
        const modelEntry = modelDataMap.get(normalizedModel);
        const model_id = modelEntry ? modelEntry.id : null;

        // Eşleşemeyen modelleri buraya benzersiz olarak ekliyoruz
        if (model_id === null) { // Sadece model_id bulunamadıysa eşleşemeyen sayıyoruz
            const uniqueKey = `${normalizedModel}_${marka_id || 'null'}`; // Marka ID'si de bulunamamış olabilir
            if (!unmatchedModelsMap.has(uniqueKey)) {
                unmatchedModelsMap.set(uniqueKey, {
                    originalModel: app.model.trim(),
                    normalizedModel: normalizedModel,
                    originalBrand: app.brand.trim(),
                    marka_id: marka_id
                    //sourceFile: file // Hangi dosyadan geldiği
                });
            }
        }

        if (model_id !== null && marka_id !== null && !existingMatches.has(normalizedModel)) {
          const newMatch: ModelMatch = {
            original: app.model.trim(),
            normalized: normalizedModel,
            model_id: model_id,
            marka_id: marka_id,
          };
          modelMatchPool.push(newMatch);
          newlyAddedModels.push(newMatch);
          existingMatches.set(normalizedModel, true);
        }

        const katalogMarka = marka_id !== null && markaMap[marka_id.toString() as keyof typeof markaMap]
          ? markaMap[marka_id.toString() as keyof typeof markaMap].trim()
          : app.brand.trim();


        return {
          "YV No": currentYvNo,
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
          "motor kodu": app.engineCodes.trim() || "",
          KBA: app.KBA_Numbers.trim() || "",
        };
      });

      const resolvedRows = await Promise.all(rows);

      const worksheet = XLSX.utils.json_to_sheet(resolvedRows, {
        header: [
          "YV No", "marka_id", "marka", "model_id", "model", "Baş. Yıl", "Bit. Yıl",
          "motor", "kw", "hp", "cc", "motor kodu", "KBA"
        ]
      });

      let finalSheetName = baseSheetName.slice(0, 31);
      let counter = sheetNameCounters.get(finalSheetName) || 0;
      let uniqueSheetName = finalSheetName;

      while (workbook.SheetNames.includes(uniqueSheetName)) {
        counter++;
        uniqueSheetName = `${finalSheetName.slice(0, 31 - (counter.toString().length + 1))}_${counter}`;
      }
      sheetNameCounters.set(finalSheetName, counter);

      XLSX.utils.book_append_sheet(workbook, worksheet, uniqueSheetName);
    }
  }

  await saveJsonData(MODEL_MATCH_POOL_PATH, modelMatchPool);

  // Eşleşemeyen modelleri tek bir JSON dosyasına kaydetme (Map'ten array'e dönüştürerek)
  const finalUnmatchedModels = Array.from(unmatchedModelsMap.values()); // Map'in değerlerini array'e çevir

  if (finalUnmatchedModels.length > 0) {
    console.log(`\n⚠️ Eşleşemeyen benzersiz modeller bulundu: ${finalUnmatchedModels.length} adet.`);
    await saveJsonData(UNMATCHED_MODELS_FILE, finalUnmatchedModels);
    console.log(`💾 Eşleşemeyen modeller kaydedildi: ${UNMATCHED_MODELS_FILE} dosyasına.`);
  } else {
    console.log("\n✅ Eşleşemeyen model bulunamadı.");
  }


  if (newlyAddedModels.length > 0) {
    console.log("\n✨ Yeni eklenen model eşleşmeleri:");
    newlyAddedModels.forEach(match => {
      console.log(JSON.stringify(match.original, null, 2));
    });
  } else {
    console.log("\nℹ️ Yeni model eşleşmesi bulunamadı.");
  }

  XLSX.writeFile(workbook, OUTPUT_FILE);
  console.log(`✅ Excel oluşturuldu: ${OUTPUT_FILE}`);
  console.log(`💾 Model eşleşmeleri kaydedildi: ${MODEL_MATCH_POOL_PATH}`);
}

main().catch(console.error);