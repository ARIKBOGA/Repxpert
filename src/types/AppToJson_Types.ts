import XLSX from "xlsx";

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
  Model: string;
  normalizedModel: string;
  Marka: string;
  marka_id: number | null;
}

// Excel satırındaki sütunları tip güvenli hale getirmek için arayüz
interface LookupExcelRow extends XLSX.CellObject {
  YV?: string;
  BREMBO?: string;
  TRW?: string;
  ICER?: string; // Excel'inizde varsa ekleyin
  TEXTAR?: string; // Excel'inizde varsa ekleyin
  [key: string]: any; // Dinamik alanlara erişim için
}


// Marka ve Model için kısaltma/çeviri haritaları
const brandAliases = new Map<string, string>([
  ["MERCEDES-BENZ", "MERCEDES"],
  ["VOLKSWAGEN", "VW"],
  ["BMW AG", "BMW"],
  ["AUDI AG", "AUDI"],
  ["FIAT CHRYSLER AUTOMOBILES", "FIAT"],
  // Daha fazla marka kısaltması eklenebilir
]);

// This map is used to tranlate the addition of the model names to their abbreviations in English
const modelAliases = new Map<string, string>([
  ["Minibüs/Otobüs", "Bus"],
  ["Kasa/eğik arka", "Hatchback Van"],
  ["Panelvan/Van", "Van"],
  ["Platform şasi", "Platform/Chassis"],
  ["Kasa/Büyük Limuzin", "Box Body/MPV"],
  ["STATION WAGON ", "SW"],
  ["Station Wagon", "SW"],
  ["CABRIOLET", "Cabrio"],
  ["Cabriolet", "Cabrio"],
  ["SERISI", "Class"],
  ["Hatchback", "HB"],
  ["Kombi van", "Estate Van"],
]);


// Body types in English and in PascalCase
// Bu liste, gövde tipi kelimelerini içerecek (artık aliased halleriyle de eşleşebilir)
// modelAliases map'inin değerlerini kullanıyoruz
// BU LİSTE ARTIK BÜYÜK HARFE ÇEVRİLMEYECEK.
const bodyTypes = [
  "Sedan",
  "Hatchback",
  "Estate",
  "Cabrio",
  "Coupe",
  "Van",
  "Bus",
  "Platform/Chassis",
  "Hatchback Van",
  "Estate Van",
  "Box Body/MPV",
  "SW",
  "Station Wagon",
  "Cabrio",
  "Pickup",
  "HB",
  "Limousine",
  "Roadster",
  "SUV",
];

export { ModelData, ModelMatch, MarkaData, UnmatchedModel, LookupExcelRow, brandAliases, modelAliases, bodyTypes };