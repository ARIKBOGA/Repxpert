import fs from "fs-extra";
import path from "path";
import glob from "fast-glob";
import * as XLSX from "xlsx";
import { Application } from "../../types/Application";
import { extractYears, cleanKBA, logMatchedModel } from "../utils/extractHelpers";

interface ModelData {
  id: number;
  marka_id: number;
  ["modeller_markalar::marka"]: string;
  model: string;
  model_Web: string;
}

// Dosya yolları
const OUTPUT_FILE = "PAD_APPLICATIONS_BREMBO.xlsx";
const ROOT_PATH = "data/apps/BREMBO";
const MARKA_FILE_PATH = "data/katalogInfo/jsons/marka_seri_no.json";
const MODEL_FILE_PATH = "data/katalogInfo/jsons/model_seri_no.json";

// Marka ve model verilerini okuyalım
async function loadJsonData(filePath: string) {
  const data = await fs.readJSON(filePath);
  return data;
}

// Örnek eşleştirme sözlüğü
const brandAliases = {
  "VW": "VOLKSWAGEN",
  "VAG": "VOLKSWAGEN",
  "ŠKODA": "SKODA",
  "SKODA": "SKODA",
  "MB": "MERCEDES-BENZ",
  "BENZ": "MERCEDES-BENZ",
  // ihtiyaca göre genişlet
};


// Marka adı normalizasyonu
const normalizeBrand = (brand: string): string => {
  const upper = brand
    .normalize('NFD')                     // Unicode normalizasyonu: özel karakterleri ayırır
    .replace(/[\u0300-\u036f]/g, "")       // Boşlukta kalmış aksanları temizler
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")             // harf ve rakam dışındakileri kaldır
    .trim();
  return brandAliases[upper as keyof typeof brandAliases] || upper; // Eğer alias varsa onu döner, yoksa normalleştirilmiş değeri döner
};

// Model isimlerini normalize etmek için eşleştirme sözlüğü
// Bu eşleştirmeler, model isimlerinin farklı varyasyonlarını normalize etmek için kullanılır
const REPLACE_MAP: Record<string, string> = {
  "CABRIOLET": "CABRIO",
  "LIMOUSINE": "LIMUZIN",
  "LIMO": "LIMUZIN",
  "TOURER": "STATION",
  "PLATFORM CHASSIS": "Platform şasi",
  // Gerekirse buraya yeni eşleştirmeler eklenebilir
};

// Model ismini normalize etmek için fonksiyon
const normalizeModel = (model: string): string => {
  let normalized = model
    .toUpperCase()
    .normalize("NFD")                 // Latin harflerdeki aksanları düzelt
    .replace(/[\u0300-\u036f]/g, "")  // Aksanları kaldır
    .replace(/[|\/]/g, " ")           // | ve / yerine boşluk koy
    .replace(/([^\s])\(/g, "$1 (")    // Parantez öncesine boşluk ekle
    .replace(/[\s\-_.]+/g, " ")       // Boşluk, tire, alt tire, nokta -> tek boşluk
    .replace(/([,\/])\s*/g, "$1")     // , veya / sonrası boşlukları kaldır
    .replace(/\s+([,\/])/g, "$1")     // , veya / öncesi boşlukları kaldır
    .replace(/[()]/g, "")             // Parantezleri kaldır
    .replace(/\s+/g, " ")             // Çoklu boşlukları tek boşluk yap
    .trim();

  // Eş anlamlı kelimeleri normalize et
  for (const [target, replacement] of Object.entries(REPLACE_MAP)) {
    const pattern = new RegExp(`\\b${target}\\b`, "g");
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized;
};



// Ana fonksiyon
async function main() {
  const markaData = await loadJsonData(MARKA_FILE_PATH); // Marka verilerini al
  const modelData = await loadJsonData(MODEL_FILE_PATH); // Model verilerini al

  const files = await glob(`${ROOT_PATH}/**/BREMBO_*.json`);
  const workbook = XLSX.utils.book_new();

  for (const file of files) {
    const json: Application[] = await fs.readJSON(file);
    const sheetName = path.basename(file, ".json").split("_")[1];

    const rows = json.map((app) => {
      const { start, end } = extractYears(app.madeYear);

      // Marka adı normalizasyonu ve marka id lookup
      const normalizedBrand = normalizeBrand(app.brand.trim());
      const marka_id_raw = Object.entries(markaData).find(
        ([key, value]) => normalizeBrand(value as string) === normalizedBrand
      )?.[0] ?? null;

      const marka_id = marka_id_raw ? parseInt(marka_id_raw) : null;

      // Model adı normalizasyonu ve model id lookup
      const normalizedModel = normalizeModel(app.model.trim());
      const modelEntry = modelData.find(
        (m: ModelData) =>
          //normalizeBrand(m["modeller_markalar::marka"]) === normalizedBrand &&
          normalizeModel(m.model) === normalizedModel
      );

      const model_id = modelEntry ? modelEntry.id : null;

      if (modelEntry) {
        logMatchedModel({
          original: app.model.trim(),
          normalized: normalizedModel,
          model_id: modelEntry.id,
          marka_id: marka_id ?? -1,
        });
      }


      return {
        marka_id,
        marka: app.brand.trim(),
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

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: [
        "marka_id", "marka", "model_id", "model", "Baş. Yıl", "Bit. Yıl",
        "motor", "kw", "hp", "cc", "motor kodu", "KBA"
      ]
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31)); // max 31 karakter
  }

  // Excel dosyasını yazalım
  XLSX.writeFile(workbook, OUTPUT_FILE);
  console.log(`✅ Excel oluşturuldu: ${OUTPUT_FILE}`);
}

/*
const model1 = "TOURAN VAN (1T1, 1T2)";
const model2 = "Touran Van(1T1, 1T2)";
const model3 = "Caddy III Kasa/ büyük Limuzin (2KA,2KH,2CA,2CH)";
const model4 = " CADDY III Kasa/büyük limuzin (2KA, 2KH, 2CA, 2CH) ";
console.log(normalizeModel(model1));  // "EOS 1F7 1F8"
console.log(normalizeModel(model2));  // "EOS 1F7 1F8"
console.log(normalizeModel(model3));  // "EOS 1F7 1F8"
console.log(normalizeModel(model4));  // "EOS 1F7 1F8"
*/


main().catch(console.error);