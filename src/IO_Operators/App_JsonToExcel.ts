// src/IO_Operators/App_JsonToExcel.ts

import fs from "fs-extra";
import path from "path";
import glob from "fast-glob";
import * as XLSX from "xlsx";
import { Application } from "../types/Application";
import { extractYears } from "../utils/extractHelpers";
import markaMap from "../data/katalogInfo/jsons/marka_tur.json";
import dotenv from "dotenv";
import { formatDateTime } from "../utils/DateHelper";
// Type importlarınıza marka_id içerecek şekilde ModelData'yı ekledim.
import { MarkaData, ModelData, ModelMatch, UnmatchedModel, LookupExcelRow } from "../types/AppToJson_Types";
// Normalizer'lardan importlarınız doğru
import { getTargetBrandName, normalizeModel, normalizeString } from "../utils/NormalizersForJsonToExcels";
import { Locale } from "locale-enum";
import { lookupReference } from "../utils/FileHelpers";

// .env dosyasındaki ortam değişkenlerini yükle
dotenv.config({ path: path.resolve(__dirname, '../data/Configs/.env') });

const filterBrand = process.env.FILTER_BRAND_APPLICATION as string;
const productType = process.env.PRODUCT_TYPE as string;
const formattedDate = formatDateTime(new Date());

const OUTPUT_FILE = `${productType}_APPLICATIONS_${filterBrand}_${formattedDate.numericDate}.xlsx`;
const ROOT_PATH = `src/data/Gathered_Informations/${productType}/Applications/TR/NewlyAdded`;
const MARKA_FILE_PATH = "src/data/katalogInfo/jsons/marka_tur.json";
const MODEL_FILE_PATH = "src/data/katalogInfo/jsons/model_tur.json";
const LOOKUP_FILE_PATH = `src/data/katalogInfo/excels/${productType}_katalog_full.xlsx`;
const MODEL_MATCH_POOL_PATH = "src/data/katalogInfo/jsons/modelMatchPool.json";

// UNMATCHED_MODELS_FILE adlandırmasını güncelledim, sürekli güncellenen bir dosya olması mantıklı
const UNMATCHED_MODELS_FILE = `src/data/katalogInfo/jsons/unmatched_models_ALWAYS_UPDATED.json`;

// --- Lookup Verisi İşleme Başlangıcı ---
const lookupDataMap = lookupReference(productType);

function findYvNoOptimized(partNumber: string | undefined): string[] {
    if (!partNumber || partNumber.trim() === "") {
        console.warn(`⚠️ findYvNoOptimized'a geçersiz (boş veya undefined) partNumber geldi.`);
        return [];
    }
    console.log("partNumber: ", partNumber);
    const result = lookupDataMap.get(partNumber.trim());
    return result ? [result] : [];
}
// --- Lookup Verisi İşleme Sonu ---

async function loadJsonData<T>(filePath: string): Promise<T> {
    try {
        return await fs.readJSON(filePath);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
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
    const files = await glob(`${ROOT_PATH}/**/*.json`);
    const workbook = XLSX.utils.book_new();

    const markaDataMap = new Map<string, number>();
    for (const [key, value] of Object.entries(markaData)) {
        markaDataMap.set(normalizeString(value), parseInt(key));
    }

    // *** Burası Güncellendi: modelDataMap'i Marka ID ve Normalize Model ile oluştur ***
    // ModelData interface'inizin 'marka_id' veya 'brandId' gibi bir alanı olduğunu varsayıyorum.
    const modelDataMap = new Map<string, ModelData>();
    modelData.forEach(model => {
        // ModelData objesinin içinde marka_id'nin bulunduğunu varsayıyoruz
        if (model.marka_id) { // model.marka_id'nin null veya undefined olmaması için kontrol
            const normalizedModelName = normalizeModel(model.model);
            const compositeKey = `${model.marka_id}_${normalizedModelName}`; // Composite Key: "marka_id_normalizedModel"
            modelDataMap.set(compositeKey, model);
        } else {
            console.warn(`⚠️ Model verisinde marka_id bulunamadı: ${JSON.stringify(model)}. Bu model atlanıyor.`);
        }
    });

    let modelMatchPool: ModelMatch[] = await loadJsonData<ModelMatch[]>(MODEL_MATCH_POOL_PATH) || [];
    // *** Burası Güncellendi: existingMatches'i Composite Key ile doldur ***
    const existingMatches = new Map<string, boolean>();
    modelMatchPool.forEach(match => {
        // ModelMatch içinde de marka_id'nin olması gerekir.
        if (match.marka_id && match.normalized) {
            const matchCompositeKey = `${match.marka_id}_${match.normalized}`;
            existingMatches.set(matchCompositeKey, true);
        }
    });

    const newlyAddedModels: ModelMatch[] = [];
    const unmatchedModelsMap = new Map<string, UnmatchedModel>();

    const sheetNameCounters = new Map<string, number>();

    for (const file of files) {
        const json: Application[] = await fs.readJSON(file);
        const fileName = path.basename(file, ".json");
        const partNumberRaw = fileName.split("_")[1];

        if (!partNumberRaw) {
            console.warn(`⚠️ Dosya adı formatı beklenenden farklı: ${fileName}. Geçerli bir partNumber bulunamadı. Bu dosya atlanıyor.`);
            continue;
        }

        const partNumber = partNumberRaw;
        const yvNos = findYvNoOptimized(partNumber);
        const yvNosToProcess = yvNos.length > 0 ? yvNos : ["YV_BULUNAMADI"];

        for (let i = 0; i < yvNosToProcess.length; i++) {
            const currentYvNo = yvNosToProcess[i];
            let baseSheetName = partNumber;

            if (yvNosToProcess.length > 1 && currentYvNo !== "YV_BULUNAMADI") {
                baseSheetName = `${partNumber}_${i + 1}`;
            }

            const rows = json.map(async (app) => {
                const { start, end } = extractYears(app.madeYear, Locale.tr_TR);

                // Bu kısım getTargetBrandName'den dönen normalize edilmiş marka adını alır
                const targetNormalizedBrandFromApp = getTargetBrandName(app.brand);
                
                // Marka_id'yi bulmak için normalize edilmiş marka adını kullan
                const marka_id_raw = markaDataMap.get(targetNormalizedBrandFromApp) ?? null;
                const marka_id = marka_id_raw !== null ? marka_id_raw : null;

                const normalizedModel = normalizeModel(app.model);

                // *** Burası Güncellendi: Model ararken composite key kullan ***
                let model_id: number | null = null;
                if (marka_id !== null) { // Marka ID'si varsa model araması yap
                    const compositeKeyForLookup = `${marka_id}_${normalizedModel}`;
                    const modelEntry = modelDataMap.get(compositeKeyForLookup);
                    model_id = modelEntry ? modelEntry.id : null;
                }
                
                // Eşleşemeyen modelleri buraya benzersiz olarak ekliyoruz
                // *** Burası Güncellendi: unmatchedModelsMap'e marka_id'yi de dahil et ***
                if (model_id === null) {
                    const uniqueKey = `${marka_id || 'UNKNOWN'}_${normalizedModel}`; // Marka ID'si de bulunamamış olabilir
                    if (!unmatchedModelsMap.has(uniqueKey)) {
                        unmatchedModelsMap.set(uniqueKey, {
                            originalModel: app.model.trim(),
                            normalizedModel: normalizedModel,
                            originalBrand: app.brand.trim(),
                            marka_id: marka_id // mark_id'nin null olma ihtimali var
                        });
                    }
                }

                // *** Burası Güncellendi: modelMatchPool'a eklerken composite key kontrolü yap ***
                if (model_id !== null && marka_id !== null) {
                    const newMatchCompositeKey = `${marka_id}_${normalizedModel}`;
                    if (!existingMatches.has(newMatchCompositeKey)) {
                        const newMatch: ModelMatch = {
                            original: app.model.trim(),
                            normalized: normalizedModel,
                            model_id: model_id,
                            marka_id: marka_id,
                        };
                        modelMatchPool.push(newMatch);
                        newlyAddedModels.push(newMatch);
                        existingMatches.set(newMatchCompositeKey, true);
                    }
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

    const finalUnmatchedModels = Array.from(unmatchedModelsMap.values());

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