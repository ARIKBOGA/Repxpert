import fs from "fs-extra";
import path from "path";
import glob from "fast-glob";
import * as XLSX from "xlsx";
import dotenv from 'dotenv';
import { Application } from "../types/Application";
import { extractYears } from "../utils/extractHelpers";
import initialMarkaData from "../data/katalogInfo/jsons/marka_new.json"; // Statik import
import initialModelData from "../data/katalogInfo/jsons/model_new.json";   // Statik import
import { formatDateTime } from "../utils/DateHelper";
import { debuglog } from "util"; // Hata ayıklama logları için
import { Locale } from "locale-enum";
import { ModelData, ModelMatch, UnmatchedModel, LookupExcelRow } from "../types/AppToJson_Types";

// .env dosyasındaki ortam değişkenlerini yükle
dotenv.config({ path: path.resolve(__dirname, '../data/Configs/.env') });

// Hata ayıklama loglarını etkinleştirmek için bir env değişkeni kullanabilirsiniz:
// export NODE_DEBUG=excel-app (ya da uygulamanızın adı)
const logDebug = debuglog('excel-app');

const filterBrand = process.env.FILTER_BRAND_APPLICATION as string;
const productType = process.env.PRODUCT_TYPE as string;
const formattedDate = formatDateTime(new Date());

const OUTPUT_FILE = `English_${productType}_APPLICATIONS_${filterBrand}_${formattedDate.numericDate}.xlsx`;
const ROOT_PATH = `src/data/Gathered_Informations/${productType}/Applications/English/${filterBrand}`;
const LOOKUP_FILE_PATH = `src/data/katalogInfo/excels/${productType}_katalog_full.xlsx`;
const MODEL_MATCH_POOL_PATH = "src/data/katalogInfo/jsons/modelMatchPool.json";

// Arama hızını artırmak için tüm veri Excel'den okunup MAP'te saklandı
const lookupDataMap = new Map<string, string[]>();

/**
 * Verilen değeri virgülle ayırarak map'e ekler.
 * Aynı anahtar için birden fazla değer varsa, mevcut diziye ekler.
 */
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

// Excel lookup verilerini yükleme ve Map'e doldurma (Uygulama başlatıldığında bir kez yapılır)
try {
  const lookupWorkbook = XLSX.readFile(LOOKUP_FILE_PATH, { cellDates: false });
  const lookupSheet = lookupWorkbook.Sheets[lookupWorkbook.SheetNames[0]];

  const fieldsToProcess = ["BREMBO", "TRW", "ICER", "TEXTAR", "KRAFTVOLL"];

  XLSX.utils.sheet_to_json<LookupExcelRow>(lookupSheet).forEach(row => {
    const yvValue = row.YV?.toString();
    fieldsToProcess.forEach(field => {
      const sourceValue = row[field]?.toString();
      processAndSetLookupData(lookupDataMap, sourceValue, yvValue);
    });
  });

  logDebug("Lookup Map oluşturuldu: %d benzersiz parça numarası kaydı.", lookupDataMap.size);

} catch (error) {
  console.error("⛔️ Hata: Lookup dosyasını okurken bir hata oluştu:", error);
  process.exit(1); // Kritik hata durumunda uygulamayı sonlandır
}

/**
 * Verilen parça numarasına ait tüm YV No'ları döndürür.
 * Eğer bulunamazsa boş bir dizi döndürür.
 */
function findYvNos(partNumber: string): string[] {
  return lookupDataMap.get(partNumber.trim()) || [];
}

async function loadJsonData<T>(filePath: string): Promise<T> {
  try {
    return await fs.readJSON(filePath);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      logDebug("Dosya bulunamadı, boş obje döndürüldü: %s", filePath);
      return {} as T;
    }
    console.error(`⛔️ Hata: ${filePath} dosyasını yüklerken bir hata oluştu:`, error);
    throw error;
  }
}

async function saveJsonData(filePath: string, data: any) {
  try {
    await fs.writeJSON(filePath, data, { spaces: 2 });
    logDebug("Veri kaydedildi: %s", filePath);
  } catch (error) {
    console.error(`⛔️ Hata: ${filePath} dosyasına yazarken bir hata oluştu:`, error);
    throw error;
  }
}

async function main() {
  //console.log(`🚀 İşlem Başladı: ${formattedDate}`);

  // Marka verilerini bir kez import edip Map'lere dönüştürüyoruz
  const markaNameToIdMap = new Map<string, number>();
  const markaIdToNameMap = new Map<number, string>();
  for (const [idString, name] of Object.entries(initialMarkaData)) {
    const id = parseInt(idString);
    markaNameToIdMap.set(name.trim(), id);
    markaIdToNameMap.set(id, name.trim());
  }
  logDebug("Marka Map'leri oluşturuldu.");

  // Model verilerini bir kez import edip Map'e dönüştürüyoruz
  const modelDataMap = new Map<string, ModelData>();
  (initialModelData as ModelData[]).forEach(model => {
    modelDataMap.set(model["modeller_markalar::marka"].trim() + "_" + model.model.trim(), model);
  });
  logDebug("Model Map'i oluşturuldu.");


  // Tüm JSON uygulama dosyalarını paralel olarak oku
  const files = await glob(`${ROOT_PATH}/**/${filterBrand}*.json`);
  if (files.length === 0) {
    console.warn(`⚠️ Uyarı: ${ROOT_PATH} altında ${filterBrand}*.json dosyası bulunamadı. Çıkış yapılıyor.`);
    return;
  }
  logDebug("%d adet JSON uygulama dosyası bulundu.", files.length);

  const fileReadPromises = files.map(async file => {
    const json: Application[] = await fs.readJSON(file);
    const partNumber = path.basename(file, ".json").split("_")[1];
    return { file, json, partNumber };
  });
  const allJsonData = await Promise.all(fileReadPromises);
  logDebug("Tüm JSON uygulama dosyaları okundu.");

  const workbook = XLSX.utils.book_new();

  let modelMatchPool: ModelMatch[] = await loadJsonData<ModelMatch[]>(MODEL_MATCH_POOL_PATH) || [];
  const existingMatches = new Map<string, boolean>();
  modelMatchPool.forEach(match => {
    existingMatches.set(match.normalized, true);
  });
  const newlyAddedModels: ModelMatch[] = [];

  // Her bir JSON dosyasını işleme döngüsü
  for (const { file, json, partNumber } of allJsonData) {
    const yvNos = findYvNos(partNumber);
    const baseSheetName = partNumber;

    // Eğer YV No bulunamazsa varsayılan bir değer ekle
    if (yvNos.length === 0) {
      yvNos.push("YV_BULUNAMADI");
    }

    // Her bir YV No için ayrı bir sayfa oluştur
    for (let i = 0; i < yvNos.length; i++) {
      const yvNo = yvNos[i];
      let sheetName = baseSheetName;

      // Eğer birden fazla YV No varsa sayfa adını numaralandır
      if (yvNos.length > 1) {
        sheetName = `${baseSheetName}_${i + 1}`; // _1, _2 şeklinde numaralandırma
      }

      // Excel sayfa adı limiti 31 karakter
      sheetName = sheetName.slice(0, 31);

      const resolvedRows: any[] = [];

      // JSON dosyasındaki her bir uygulama satırını işle
      for (const app of json) {
        const { start, end } = extractYears(app.madeYear, Locale.en_US);

        const marka_id = markaNameToIdMap.get(app.brand.trim()) ?? null;
        const modelEntry = modelDataMap.get(app.brand.trim() + "_" + app.model.trim());
        const model_id = modelEntry ? modelEntry.id : null;

        // Yeni model eşleşmesi bulunursa havuza ekle
        if (model_id !== null && marka_id !== null && !existingMatches.has(app.model.trim())) {
          const newMatch: ModelMatch = {
            original: app.model.trim(),
            normalized: app.model.trim(),
            model_id: model_id,
            marka_id: marka_id,
          };
          modelMatchPool.push(newMatch);
          newlyAddedModels.push(newMatch);
          existingMatches.set(app.model.trim(), true);
        }

        const katalogMarka = marka_id !== null ? markaIdToNameMap.get(marka_id) ?? app.brand.trim() : app.brand.trim();

        resolvedRows.push({
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
          KBA: app.KBA_Numbers.trim(),
        });
      }

      const worksheet = XLSX.utils.json_to_sheet(resolvedRows, {
        header: [
          "YV No", "marka_id", "marka", "model_id", "model", "Baş. Yıl", "Bit. Yıl",
          "motor", "kw", "hp", "cc", "motor kodu", "KBA"
        ]
      });

      // Excel çalışma kitabına sayfayı ekle
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      logDebug("Sayfa oluşturuldu: %s", sheetName);
    }
  }

  // Tüm dosyalar işlendikten sonra modelMatchPool'u kaydet
  await saveJsonData(MODEL_MATCH_POOL_PATH, modelMatchPool);

  // Yeni eklenen modelleri konsola yazdır (İstediğiniz gibi sadece bu log kaldı)
  if (newlyAddedModels.length > 0) {
    console.log("\n✨ Yeni eklenen model eşleşmeleri:");
    newlyAddedModels.forEach(match => {
      console.log(JSON.stringify(match.original)); // Daha kısa çıktı için tek satır
    });
  } else {
    console.log("\nℹ️ Yeni model eşleşmesi bulunamadı.");
  }

  const outputPath = `src/data/Gathered_Informations/${productType}/Applications/excels`;
  // Çıktı klasörünü kontrol et ve gerekirse oluştur
  await fs.ensureDir(outputPath);

  XLSX.writeFile(workbook, path.join(outputPath, OUTPUT_FILE), { bookType: "xlsx", type: "binary" });
  console.log(`✅ Excel oluşturuldu: ${OUTPUT_FILE}`);
  console.log(`💾 Model eşleşmeleri kaydedildi: ${MODEL_MATCH_POOL_PATH}`);
}

// normalizeString fonksiyonu, mevcut haliyle bırakıldı ve kullanıldığı yerlerde doğrudan trim() ile benzer işlev görüyor.
// Eğer normalizasyon (Türkçe karakter düzeltme, özel karakter çıkarma) ihtiyacı olursa,
// app.model.trim() yerine normalizeString(app.model) gibi kullanılmalıdır.
const normalizeString = (input: string): string => {
  return input
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/İ/g, "I")
    .replace(/[^A-Z0-9]/g, "")
    .trim();
};

main().catch(error => {
  console.error(" catastrophic error occurred: ", error); // En genel hata yakalayıcı
  process.exit(1);
});