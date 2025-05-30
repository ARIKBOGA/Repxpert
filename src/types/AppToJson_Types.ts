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

export { ModelData, ModelMatch, MarkaData, UnmatchedModel, LookupExcelRow };