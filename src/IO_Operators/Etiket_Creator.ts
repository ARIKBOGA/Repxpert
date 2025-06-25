// src/main.ts
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import glob from "fast-glob";

import { Application } from "../types/Application";
import { modelAliases, brandAliases, bodyTypes } from "../types/AppToJson_Types";
import { lookupReferenceFromExcel } from "../utils/FileHelpers";
import { PRODUCT_TYPE, LOOKUP_EXCEL_FILE_PATH, ROOT_PATH_APPLICATIONS, FILTER_BRAND_APPLICATION } from "../config";
import { findYvNoOptimized } from "../utils/NormalizersForJsonToExcels";
import { formatDateTime } from "../utils/DateHelper";


const lookupDataMap: Map<string, string> = lookupReferenceFromExcel(LOOKUP_EXCEL_FILE_PATH);

// Yardımcı: PascalCase yapar (4 karakterden kısa kelimelere dokunmaz)
function toPascalCase(str: string): string {
  return str
    .replace(/\b(\p{L}+)\b/gu, (word) => {
      // Kelime 4 karakter veya daha azsa, olduğu gibi bırak
      if (word.length <= 4) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .trim();
}

// Yardımcı: Model adlarını anlamlı şekilde kısalt, parantez içindekileri kaldır ve gövde tipini ayıkla
// Yardımcı: Model adlarını anlamlı şekilde kısalt, parantez içindekileri kaldır ve gövde tipini ayıkla
function extractAndShortenModels(modelString: string): string[] {
  const extractedModels: string[] = [];

  // Öncelikle model string'ine tüm aliasları uygula (parantezli kısımlar hariç)
  let preAliasedModelString = modelString.replace(/\([^)]*\)/g, ""); // Parantez içini kaldırıyoruz ki aliaslar doğru uygulansın
  for (const [key, value] of modelAliases.entries()) {
    // Regex'i kelime sınırlarına göre (\\b) ve case-insensitive (gi) olarak ayarla
    const regex = new RegExp(`\\b${key}\\b`, "gi");
    preAliasedModelString = preAliasedModelString.replace(regex, value);
  }

  // Model adını '|' ile ayır ve her bir parçayı işle
  const parts = preAliasedModelString
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Uzun kelimeleri önce işle (örneğin "Hatchback Van" "Van"dan önce yakalansın)
  bodyTypes.sort((a, b) => b.length - a.length);

  for (let part of parts) {
    let currentModel = part;
    let bodyType = ""; // Yakalanan orijinal bodyType

    // Gövde tipi kelimelerini yakala ve model adından çıkar
    for (const bt of bodyTypes) {
      const regex = new RegExp(`\\b${bt}\\b`, "gi"); // Case-insensitive arama
      if (currentModel.match(regex)) {
        bodyType = bt; // bodyType burada PascalCase (Bus, Van) olarak atanıyor
        currentModel = currentModel.replace(regex, "").trim();
        break; // Bir gövde tipi bulduk, dur
      }
    }

    // finalModel zaten toPascalCase'den geçiyor
    let finalModel = toPascalCase(currentModel);

    // bodyType'ı tekrar toPascalCase'den geçirerek ekle
    if (bodyType && !finalModel.toUpperCase().includes(bodyType.toUpperCase())) {
      finalModel = `${finalModel} ${toPascalCase(bodyType)}`.trim();
    }

    if (!extractedModels.includes(finalModel)) {
      extractedModels.push(finalModel);
    }
  }

  return extractedModels;
}
// Yardımcı: En çok geçenleri al
function getTopEntries<T>(map: Map<T, number>, limit?: number): T[] {
  const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  if (limit !== undefined) {
    return sorted.slice(0, limit).map(([key]) => key);
  }
  return sorted.map(([key]) => key);
}

function processFile(filePath: string): [string, string, string] {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const data: Application[] = JSON.parse(fileContent);

  const brandModelMap = new Map<string, Map<string, number>>();
  const brandCountMap = new Map<string, number>();

  for (const entry of data) {
    let brand = entry.brand.trim().toUpperCase();
    // Marka aliaslarını uygula
    if (brandAliases.has(brand)) {
      brand = brandAliases.get(brand)!;
    }

    // shortenModel yerine extractAndShortenModels kullan
    const models = extractAndShortenModels(entry.model);

    brandCountMap.set(brand, (brandCountMap.get(brand) || 0) + 1);
    if (!brandModelMap.has(brand)) {
      brandModelMap.set(brand, new Map());
    }

    const modelMap = brandModelMap.get(brand)!;
    for (const model of models) {
      // Her bir çıkarılan modeli ayrı ayrı işle
      modelMap.set(model, (modelMap.get(model) || 0) + 1);
    }
  }

  const sortedBrands = getTopEntries(brandCountMap); // Tüm markaları popülerliğe göre sırala

  const lines: string[] = [];
  const maxLines = 5; // Maksimum satır sayısı
  const maxLineLength = 65; // Her satırın maksimum karakter sayısı
  let currentLineIndex = 0;

  // Her markanın tüketebileceği model listesi (kopyasını alıyoruz)
  const brandModelsToUse = new Map<string, string[]>();
  sortedBrands.forEach((brand) => {
    const sortedModels = getTopEntries(brandModelMap.get(brand)!); // Bu markaya ait tüm modelleri popülerliğe göre sırala
    brandModelsToUse.set(brand, [...sortedModels]);
  });

  // İlk olarak markaların satır haklarını belirleyelim
  const brandLineAllocation = new Map<string, number>();
  let remainingLines = maxLines;

  if (sortedBrands.length === 1) {
    brandLineAllocation.set(sortedBrands[0], maxLines);
    remainingLines = 0;
  } else if (sortedBrands.length > 0) {
    // En popüler marka için 2 satır ayır (eğer varsa ve 2 satır hakkı kalmışsa)
    if (currentLineIndex < maxLines && sortedBrands.length > 1) {
      const brand = sortedBrands[0];
      const allocated = Math.min(2, remainingLines);
      brandLineAllocation.set(brand, allocated);
      remainingLines -= allocated;
    }

    // Geri kalan markalara 1'er satır ayır
    for (let i = 1; i < sortedBrands.length && remainingLines > 0; i++) {
      const brand = sortedBrands[i];
      brandLineAllocation.set(brand, (brandLineAllocation.get(brand) || 0) + 1);
      remainingLines--;
    }

    // Kalan satırları en popüler markadan başlayarak doldur
    let brandIndex = 0;
    while (remainingLines > 0 && brandIndex < sortedBrands.length) {
      const brand = sortedBrands[brandIndex];
      brandLineAllocation.set(brand, (brandLineAllocation.get(brand) || 0) + 1);
      remainingLines--;
      brandIndex = (brandIndex + 1) % sortedBrands.length;
    }
  }

  // Şimdi ayrılan satırları doldurmaya başlayalım
  for (let i = 0; i < sortedBrands.length && currentLineIndex < maxLines; i++) {
    const brand = sortedBrands[i];
    const modelsToProcess = brandModelsToUse.get(brand)!;
    let allocatedLinesForThisBrand = brandLineAllocation.get(brand) || 0;

    for (let j = 0; j < allocatedLinesForThisBrand && currentLineIndex < maxLines; j++) {
      let currentLine = "";
      let linePrefix = `${brand} - `;
      currentLine += linePrefix;

      let modelsArray: string[] = [];
      let currentLineLength = linePrefix.length;

      // Bu satıra sığabilecek tüm modelleri ekle
      while (currentLineLength <= maxLineLength && modelsToProcess.length > 0) {
        const model = modelsToProcess[0];
        const potentialNewLength =
          currentLineLength + (modelsArray.length > 0 ? 2 : 0) + model.length;

        if (potentialNewLength <= maxLineLength) {
          modelsArray.push(modelsToProcess.shift()!);
          currentLineLength = potentialNewLength;
        } else {
          break;
        }
      }
      currentLine += modelsArray.join(", ");

      // Eğer satıra en az bir model eklenebildiyse VEYA markanın adı tek başına sığıyorsa ve bu ilk satırıysa
      if (
        currentLine.length > linePrefix.length ||
        (j === 0 && linePrefix.trim().length <= maxLineLength)
      ) {
        lines.push(currentLine.trim());
        currentLineIndex++;
      }
    }
  }

  // Son olarak, kalan boş satırlar varsa, en popüler markalardan devam ederek doldur.
  // Bu, özellikle çok az marka ve çok model olan durumlarda işe yarayacak.
  let brandLoopIndex = 0;
  while (currentLineIndex < maxLines && sortedBrands.length > 0) {
    const brand = sortedBrands[brandLoopIndex % sortedBrands.length];
    const modelsToProcess = brandModelsToUse.get(brand)!;

    if (modelsToProcess.length === 0) {
      brandLoopIndex++;
      if (brandLoopIndex >= sortedBrands.length * 2) break;
      continue;
    }

    let currentLine = "";
    let linePrefix = `${brand} - `;
    currentLine += linePrefix;

    let modelsArray: string[] = [];
    let currentLineLength = linePrefix.length;

    while (currentLineLength <= maxLineLength && modelsToProcess.length > 0) {
      const model = modelsToProcess[0];
      const potentialNewLength =
        currentLineLength + (modelsArray.length > 0 ? 2 : 0) + model.length;

      if (potentialNewLength <= maxLineLength) {
        modelsArray.push(modelsToProcess.shift()!);
        currentLineLength = potentialNewLength;
      } else {
        break;
      }
    }
    currentLine += modelsArray.join(", ");

    if (currentLine.length > linePrefix.length) {
      lines.push(currentLine.trim());
      currentLineIndex++;
    } else {
      break;
    }
    brandLoopIndex++;
  }

  // Oluşturulan satırları toplam 260 karakter ve 5 satır limitini aşmayacak şekilde birleştir
  let totalText = "";
  for (let i = 0; i < lines.length && i < maxLines; i++) {
    const lineToAdd = lines[i];
    if (
      (totalText + lineToAdd + (i < lines.length - 1 && i < maxLines - 1 ? "\n" : ""))
        .length <=
      maxLineLength * maxLines
    ) {
      totalText += lineToAdd;
      if (i < lines.length - 1 && i < maxLines - 1) {
        totalText += "\n";
      }
    } else {
      break;
    }
  }

  const filename = path.basename(filePath);
  try {
    const crossNumber = filename.split("_")[1].replace(".json", "");
    const YV = findYvNoOptimized(crossNumber, lookupDataMap);
    return [YV[0] || "YV_Bulunamadı", crossNumber, totalText.trim()];
  } catch (error) {
    console.log(filename, error);
    // Return default values in case of error
    return ["YV_Bulunamadı", "CROSS_Bulunamadı", ""];
  }
  
}

// === Main Akış ===

const date = formatDateTime(new Date()).lettericDate;
const inputDir = ROOT_PATH_APPLICATIONS;
const outputExcel = path.join( __dirname, "..", "data/Gathered_Informations/Pad/Applications/excels", `ETIKET_VERILERI_${PRODUCT_TYPE}_${FILTER_BRAND_APPLICATION}-${date}.xlsx`);

const rows: [string,string, string][] = [];

(async () => {
  const files = await glob(`${inputDir}/**/*.json`);
  console.log("Dosya yolu:", inputDir);
  console.log("Dosyalar okundu:", files.length);
  for (const file of files) {
    const [YV,crossNumber, label] = processFile(file);
    rows.push([YV, crossNumber, label]);
  }
  console.log("Toplam etiket sayısı:", rows.length);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([["YV", "CROSS", "ETIKET"], ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, "Etiketler");
  XLSX.writeFile(wb, outputExcel);

  console.log("Excel dosyası oluşturuldu:", outputExcel);
})();