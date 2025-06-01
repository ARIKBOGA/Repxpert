import path from "path";
import dotenv from "dotenv";

// .env dosyasındaki ortam değişkenlerini yükle
dotenv.config({ path: path.resolve(__dirname, './data/Configs/.env') });

export const PRODUCT_TYPE = process.env.PRODUCT_TYPE as string;
export const FILTER_BRAND_APPLICATION = process.env.FILTER_BRAND_APPLICATION as string;

// Sabit dosya yolları
export const ROOT_PATH_APPLICATIONS = `src/data/Gathered_Informations/${PRODUCT_TYPE}/Applications/${FILTER_BRAND_APPLICATION}`;
export const MARKA_FILE_PATH = "src/data/katalogInfo/jsons/marka_tur.json";
export const MODEL_FILE_PATH = "src/data/katalogInfo/jsons/model_tur.json";
export const LOOKUP_EXCEL_FILE_PATH = `src/data/katalogInfo/excels/${PRODUCT_TYPE}_katalog_full.xlsx`;
export const MODEL_MATCH_POOL_PATH = "src/data/katalogInfo/jsons/modelMatchPool.json";
export const UNMATCHED_MODELS_FILE = `src/data/katalogInfo/jsons/unmatched_models_ALWAYS_UPDATED.json`;

// Diğer sabitler
export const OUTPUT_EXCEL_BASE_NAME = `${PRODUCT_TYPE}_APPLICATIONS`; // Tarih eklentisi sonradan yapılacak