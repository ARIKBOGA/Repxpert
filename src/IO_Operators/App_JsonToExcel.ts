import fs from "fs-extra";
import path from "path";
import glob from "fast-glob";
import * as XLSX from "xlsx";
import { Application } from "../types/Application";
import { extractYears } from "../utils/extractHelpers";
import markaMap from "../data/katalogInfo/jsons/marka_tur.json";
import { formatDateTime } from "../utils/DateHelper";
import { ModelData, ModelMatch, UnmatchedModel, LookupExcelRow } from "../types/AppToJson_Types";
import { getTargetBrandName, normalizeModel, normalizeString, findYvNoOptimized } from "../utils/NormalizersForJsonToExcels";
import { Locale } from "locale-enum";
// lookupReference fonksiyonunu kaldırın, lookupReferenceFromExcel kullanacağız
import { lookupReferenceFromExcel } from "../utils/FileHelpers";

import {
    PRODUCT_TYPE,
    ROOT_PATH_APPLICATIONS,
    MODEL_FILE_PATH,
    LOOKUP_EXCEL_FILE_PATH,
    MODEL_MATCH_POOL_PATH,
    UNMATCHED_MODELS_FILE,
    OUTPUT_EXCEL_BASE_NAME
} from "../config";

const formattedDate = formatDateTime(new Date());
const OUTPUT_FILE = `${OUTPUT_EXCEL_BASE_NAME}_${formattedDate.numericDate}.xlsx`;

// ** Önemli Değişiklik: lookupDataMap'in tipi Map<string, string> oldu **
const lookupDataMap: Map<string, string> = lookupReferenceFromExcel(LOOKUP_EXCEL_FILE_PATH);


// --- Yardımcı Fonksiyonlar ---

async function loadJsonData<T>(filePath: string): Promise<T | null> {
    try {
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ Dosya bulunamadı, boş obje döndürülüyor: ${filePath}`);
            return null;
        }
        return await fs.readJSON(filePath);
    } catch (error: any) {
        console.error(`❌ JSON dosyasını yüklerken hata oluştu: ${filePath}`, error);
        throw error;
    }
}

async function saveJsonData(filePath: string, data: any) {
    try {
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeJSON(filePath, data, { spaces: 2 });
    } catch (error) {
        console.error(`❌ JSON dosyasını kaydederken hata oluştu: ${filePath}`, error);
        throw error;
    }
}

// --- Ana İş Akışı ---

async function processApplicationFiles() {
    const modelData = (await loadJsonData<ModelData[]>(MODEL_FILE_PATH)) || [];

    const files = await glob(`${ROOT_PATH_APPLICATIONS}/**/*.json`);
    const workbook = XLSX.utils.book_new();

    const markaDataMap = new Map<string, number>();
    for (const [key, value] of Object.entries(markaMap)) {
        markaDataMap.set(normalizeString(value), parseInt(key));
    }

    const modelDataMap = new Map<string, ModelData>();
    modelData.forEach(model => {
        if (model.marka_id) {
            const normalizedModelName = normalizeModel(model.model);
            const compositeKey = `${model.marka_id}_${normalizedModelName}`;
            modelDataMap.set(compositeKey, model);
        } else {
            console.warn(`⚠️ Model verisinde marka_id bulunamadı: ${JSON.stringify(model)}. Bu model atlanıyor.`);
        }
    });

    let modelMatchPool: ModelMatch[] = (await loadJsonData<ModelMatch[]>(MODEL_MATCH_POOL_PATH)) || [];
    const existingMatches = new Map<string, boolean>();
    modelMatchPool.forEach(match => {
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
        // partNumberRaw artık bir Cross Number (örn. 'P 06 033')
        const crossNumberRaw = fileName.split("_")[1];

        if (!crossNumberRaw) {
            console.warn(`⚠️ Dosya adı formatı beklenenden farklı: ${fileName}. Geçerli bir crossNumber bulunamadı. Bu dosya atlanıyor.`);
            continue;
        }

        // partNumber artık crossNumber'ı temsil ediyor ve normalize edilmeli
        const crossNumber = crossNumberRaw.trim();
        const yvNos = findYvNoOptimized(crossNumber, lookupDataMap);

        const yvNosToProcess = yvNos.length > 0 ? yvNos : ["YV_BULUNAMADI"];

        for (let i = 0; i < yvNosToProcess.length; i++) {
            const currentYvNo = yvNosToProcess[i];
            // Sayfa adında hala partNumber (yani crossNumber) kullanıyoruz gibi duruyor
            let baseSheetName = crossNumber;

            if (yvNosToProcess.length > 1 && currentYvNo !== "YV_BULUNAMADI") {
                baseSheetName = `${crossNumber}_${i + 1}`;
            }

            const rows = await Promise.all(json.map(async (app) => {
                const { start, end } = extractYears(app.madeYear, Locale.tr_TR);

                const targetNormalizedBrandFromApp = getTargetBrandName(app.brand);
                const marka_id = markaDataMap.get(targetNormalizedBrandFromApp) ?? null;

                let model_id: number | null = null;
                if (marka_id !== null) {
                    const compositeKeyForLookup = `${marka_id}_${normalizeModel(app.model)}`;
                    const modelEntry = modelDataMap.get(compositeKeyForLookup);
                    model_id = modelEntry ? modelEntry.id : null;
                }

                if (model_id === null) {
                    const uniqueKey = `${marka_id || 'UNKNOWN_BRAND'}_${normalizeModel(app.model)}`;
                    if (!unmatchedModelsMap.has(uniqueKey)) {
                        unmatchedModelsMap.set(uniqueKey, {
                            Model: app.model.trim(),
                            normalizedModel: normalizeModel(app.model),
                            Marka: app.brand.trim(),
                            marka_id: marka_id
                        });
                    }
                }

                if (model_id !== null && marka_id !== null) {
                    const newMatchCompositeKey = `${marka_id}_${normalizeModel(app.model)}`;
                    if (!existingMatches.has(newMatchCompositeKey)) {
                        const newMatch: ModelMatch = {
                            original: app.model.trim(),
                            normalized: normalizeModel(app.model),
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
                    "YV": currentYvNo, // Burası doğru YV Numarası olacak
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
            }));

            const worksheet = XLSX.utils.json_to_sheet(rows, {
                header: [
                    "YV", "marka_id", "marka", "model_id", "model", "Baş. Yıl", "Bit. Yıl",
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
            //console.log(JSON.stringify(match, null, 2));
        });
    } else {
        console.log("\nℹ️ Yeni model eşleşmesi bulunamadı.");
    }

    XLSX.writeFile(workbook, OUTPUT_FILE);
    console.log(`✅ Excel oluşturuldu: ${OUTPUT_FILE}`);
    console.log(`💾 Model eşleşmeleri kaydedildi: ${MODEL_MATCH_POOL_PATH}`);
}

processApplicationFiles().catch(console.error);