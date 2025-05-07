import fs from "fs-extra";
import path from "path";
import glob from "fast-glob";
import * as XLSX from "xlsx";
import { Application } from "../types/Application";
import { extractYears, cleanKBA, logMatchedModel } from "./extractHelpers";
import { log } from "console";
import markaMap from "../data/katalogInfo/jsons/marka_seri_no.json";
import ConfigReader from "./ConfigReader";
import { formatDateTime } from "./DateHelper";

interface ModelData {
  id: number;
  marka_id: number;
  ["modeller_markalar::marka"]: string;
  model: string;
  model_Web: string;
}

const filterBrand = ConfigReader.getEnvVariable("FILTER_BRAND_APPLICATION") || "BREMBO";
const formattedDate = formatDateTime(new Date());

const OUTPUT_FILE = `PAD_APPLICATIONS_${filterBrand}_${formattedDate}.xlsx`;
const ROOT_PATH = "src/data/Gathered_Informations/Pads/Applications/" + filterBrand;
const MARKA_FILE_PATH = "src/data/katalogInfo/jsons/marka_seri_no.json";
const MODEL_FILE_PATH = "src/data/katalogInfo/jsons/model_seri_no.json";

async function loadJsonData(filePath: string) {
  return await fs.readJSON(filePath);
}

function logUnmatchedBrand(brand: string) {
  const norm = normalizeString(brand);
  if (!brandAliases[norm]) {
    console.warn(`❗ Unmatched brand: "${brand}" → normalized: "${norm}"`);
  }
}


const normalizeString = (input: string): string => {
  return input
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/İ/g, "I")  // Türkçe büyük İ düzeltmesi
    .replace(/[^A-Z0-9]/g, "")  // sadece harf ve rakam
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
  "KASA EGIK ARKA": "HB VAN"
};

const normalizeBrand = (brand: string): string => {
  const normalized = normalizeString(brand);
  //logUnmatchedBrand(brand); // Log unmatched brands. Use it only for testing purposes.
  return brandAliases[normalized] || normalized;
};


const normalizeModel = (model: string): string => {
  let normalized = model
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/İ/g, "I") // Türkçe karakter düzeltme
    .replace(/[|\/]/g, " ")
    .replace(/([^\s])\(/g, "$1 (")
    .replace(/[\s\-_.]+/g, " ")
    .replace(/([,\/])\s*/g, "$1")
    .replace(/\s+([,\/])/g, "$1")
    .replace(/[()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  for (const [target, replacement] of Object.entries(REPLACE_MAP)) {
    const pattern = new RegExp(`\\b${target}\\b`, "g");
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized;
};

async function main() {
  const markaData = await loadJsonData(MARKA_FILE_PATH);
  const modelData = await loadJsonData(MODEL_FILE_PATH);
  const files = await glob(`${ROOT_PATH}/**/${filterBrand}*.json`);
  const workbook = XLSX.utils.book_new();

  for (const file of files) {
    const json: Application[] = await fs.readJSON(file);
    const sheetName = path.basename(file, ".json").split("_")[1];

    const rows = json.map((app) => {
      const { start, end } = extractYears(app.madeYear);

      const normalizedBrand = normalizeBrand(app.brand.trim());
      const marka_id_raw = Object.entries(markaData).find(
        ([, value]) => normalizeString(value as string) === normalizeString(normalizedBrand)
      )?.[0] ?? null;

      const marka_id = marka_id_raw ? parseInt(marka_id_raw) : null;

      const normalizedModel = normalizeModel(app.model.trim());
      const modelEntry = modelData.find(
        (m: ModelData) =>
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

      function getMappedValue(
        map: Record<string, string>,
        id: number | null,
        fallback: string
      ): string {
        return id !== null ? map[id.toString()] || fallback : fallback;
      }

      // kullanım:
      const katalogMarka = getMappedValue(markaMap, marka_id, app.brand.trim());


      return {
        marka_id,
        marka: katalogMarka.trim(),
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

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  }

  XLSX.writeFile(workbook, OUTPUT_FILE);
  console.log(`✅ Excel oluşturuldu: ${OUTPUT_FILE}`);
}

main().catch(console.error);