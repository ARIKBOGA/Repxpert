// src/main.ts
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import glob from 'fast-glob';

interface AppEntry {
  brand: string;
  model: string;
  engineType: string;
  madeYear: string;
  kw: string;
  hp: string;
  cc: string;
  engineCodes: string;
  KBA_Numbers: string;
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

const modelAliases = new Map<string, string>([
  ["Minibüs/Otobüs", "Bus"],
  ["Kasa/eğik arka", "Hatchback Van"],
  ["Panelvan/Van", "Van"],
  ["Platform şasi", "Platform/Chassis"],
  ["Kasa/Büyük Limuzin","Box Body/MPV"],
  ["STATION WAGON ", "SW"],
  ["Station Wagon", "SW"],
  ["CABRIOLET", "Cabrio"],
  ["Cabriolet", "Cabrio"],
  ["SERISI","Class"]
]);


// Yardımcı: PascalCase yapar (4 karakterden kısa kelimelere dokunmaz)
function toPascalCase(str: string): string {
  return str
    .replace(/\b(\p{L}+)\b/gu, (word) => {
      // Kelime 4 karakter veya daha azsa, veya tamamen büyük harfliyse (örn: II, IV), olduğu gibi bırak
      if (word.length <= 4) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .trim();
  }

// Yardımcı: Model adlarını anlamlı şekilde kısalt ve parantez içindekileri kaldır
function shortenModel(model: string): string {
  // Parantezli kısımları tamamen kaldır
  let cleanedModel = model.replace(/\([^)]*\)/g, '').trim();

  // "|" ile ayrılmış kısımlardan en kısa olanı ve içindeki en belirgin anahtar kelimeyi seç
  const parts = cleanedModel.split("|").map((s) => s.trim());
  parts.sort((a, b) => a.length - b.length); // en kısa öncelikli

  let finalModel = parts[0];

  // Model aliaslarını uygula
  for (const [key, value] of modelAliases.entries()) {
    const regex = new RegExp(`\\b${key}\\b`, 'gi'); // Tam kelime eşleşmesi için regex
    finalModel = finalModel.replace(regex, value);
  }

  return toPascalCase(finalModel);
}

// Yardımcı: En çok geçenleri al
function getTopEntries<T>(map: Map<T, number>, limit?: number): T[] {
    const sorted = Array.from(map.entries())
        .sort((a, b) => b[1] - a[1]);
    if (limit !== undefined) {
        return sorted.slice(0, limit).map(([key]) => key);
    }
    return sorted.map(([key]) => key);
}

function processFile(filePath: string): [string, string] {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const data: AppEntry[] = JSON.parse(fileContent);

  const brandModelMap = new Map<string, Map<string, number>>();
  const brandCountMap = new Map<string, number>();

  for (const entry of data) {
    let brand = entry.brand.trim().toUpperCase();
    // Marka aliaslarını uygula
    if (brandAliases.has(brand)) {
      brand = brandAliases.get(brand)!;
    }

    const model = shortenModel(entry.model);

    brandCountMap.set(brand, (brandCountMap.get(brand) || 0) + 1);
    if (!brandModelMap.has(brand)) {
      brandModelMap.set(brand, new Map());
    }

    const modelMap = brandModelMap.get(brand)!;
    modelMap.set(model, (modelMap.get(model) || 0) + 1);
  }

  const sortedBrands = getTopEntries(brandCountMap); // Tüm markaları popülerliğe göre sırala

  const lines: string[] = [];
  const maxLines = 5; // Maksimum satır sayısı
  const maxLineLength = 65; // Her satırın maksimum karakter sayısı
  let currentLineIndex = 0;

  // Her markanın tüketebileceği model listesi (kopyasını alıyoruz)
  const brandModelsToUse = new Map<string, string[]>();
  sortedBrands.forEach(brand => {
      // Burada sortedModels tanımlanmalıydı!
      const sortedModels = getTopEntries(brandModelMap.get(brand)!); // Bu markaya ait tüm modelleri popülerliğe göre sırala
      brandModelsToUse.set(brand, [...sortedModels]);
  });


  // İlk olarak markaların satır haklarını belirleyelim ve boş satırları oluşturalım
  // Popülerliğe göre markalara satır tahsisatı yapıldıktan sonra kalan satırları dolduracağız.
  const brandLineAllocation = new Map<string, number>();
  let remainingLines = maxLines;

  // Tek marka varsa tüm satırlar ona
  if (sortedBrands.length === 1) {
      brandLineAllocation.set(sortedBrands[0], maxLines);
      remainingLines = 0;
  } else if (sortedBrands.length > 0) {
      // En popüler marka için 2 satır ayır (eğer varsa ve 2 satır hakkı kalmışsa)
      if (currentLineIndex < maxLines && sortedBrands.length > 1) { // Birden fazla marka varsa
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
          brandIndex = (brandIndex + 1) % sortedBrands.length; // Sıradaki markaya geç (döngüsel)
      }
  }


  // Şimdi ayrılan satırları doldurmaya başlayalım
  for (let i = 0; i < sortedBrands.length && currentLineIndex < maxLines; i++) {
      const brand = sortedBrands[i];
      const modelsToProcess = brandModelsToUse.get(brand)!; // Bu markanın kalan modelleri
      let allocatedLinesForThisBrand = brandLineAllocation.get(brand) || 0;

      for (let j = 0; j < allocatedLinesForThisBrand && currentLineIndex < maxLines; j++) {
          let currentLine = "";
          let linePrefix = `${brand} - `;
          currentLine += linePrefix;

          let modelsArray: string[] = [];
          let currentLineLength = linePrefix.length;

          while (currentLineLength <= maxLineLength && modelsToProcess.length > 0) {
              const model = modelsToProcess[0]; // Modeli listeden henüz çıkarmıyoruz, sığıp sığmadığına bakacağız
              const potentialNewLength = currentLineLength + (modelsArray.length > 0 ? 2 : 0) + model.length;

              if (potentialNewLength <= maxLineLength) {
                  modelsArray.push(modelsToProcess.shift()!); // Sığıyorsa listeden çıkar
                  currentLineLength = potentialNewLength;
              } else {
                  break; // Bu model sığmıyorsa, bu satırı bırak
              }
          }
          currentLine += modelsArray.join(", ");

          // Eğer en az bir model eklenebildiyse VEYA bu markanın ilk satırı ise ve hiç model sığmasa bile markayı ekle
          if (currentLine.length > linePrefix.length || (j === 0 && modelsArray.length === 0)) {
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
      const modelsToProcess = brandModelsToUse.get(brand)!; // Bu markanın kalan modelleri

      if (modelsToProcess.length === 0) {
          // Bu markanın eklenecek modeli kalmadıysa, bir sonraki markaya geç
          brandLoopIndex++;
          if (brandLoopIndex >= sortedBrands.length * 2) break; // Sonsuz döngüyü engelle
          continue;
      }

      let currentLine = "";
      let linePrefix = `${brand} - `;
      currentLine += linePrefix;

      let modelsArray: string[] = [];
      let currentLineLength = linePrefix.length;

      while (currentLineLength <= maxLineLength && modelsToProcess.length > 0) {
          const model = modelsToProcess[0];
          const potentialNewLength = currentLineLength + (modelsArray.length > 0 ? 2 : 0) + model.length;

          if (potentialNewLength <= maxLineLength) {
              modelsArray.push(modelsToProcess.shift()!);
              currentLineLength = potentialNewLength;
          } else {
              break;
          }
      }
      currentLine += modelsArray.join(", ");

      if (currentLine.length > linePrefix.length) { // Eğer en az bir model eklenebildiyse satırı ekle
          lines.push(currentLine.trim());
          currentLineIndex++;
      } else {
          // Eğer bu satıra hiçbir model sığmadıysa, daha fazla model deneyemeyiz.
          // Sonsuz döngüyü engellemek için buradan çıkmalıyız.
          break;
      }
      brandLoopIndex++; // Sıradaki markaya geç veya döngüsel olarak başa dön
  }


  // Oluşturulan satırları toplam 260 karakter ve 5 satır limitini aşmayacak şekilde birleştir
  let totalText = "";
  for (let i = 0; i < lines.length && i < maxLines; i++) {
    const lineToAdd = lines[i];
    if ((totalText + lineToAdd + (i < lines.length - 1 && i < maxLines - 1 ? "\n" : "")).length <= (maxLineLength * maxLines)) {
      totalText += lineToAdd;
      if (i < lines.length - 1 && i < maxLines - 1) {
        totalText += "\n";
      }
    } else {
      break;
    }
  }


  const filename = path.basename(filePath);
  const crossNumber = filename.split("_")[1].replace(".json", "");
  return [crossNumber, totalText.trim()];
}

// === Main Akış ===

const inputDir = path.join(__dirname, "..", "data/Gathered_Informations/Pad/Applications/TR/NewlyAdded/ICER");
const outputExcel = path.join(__dirname, "..", "data/Gathered_Informations/Pad/Applications/excels", "ETIKET_VERILERI.xlsx");

const rows: [string, string][] = [];

(async () => {
  const files = await glob(`${inputDir}/**/*.json`);
  console.log("Dosya yolu:", inputDir);
  console.log("Dosyalar okundu:", files.length);
  for (const file of files) {
    const [crossNumber, label] = processFile(file);
    rows.push([crossNumber, label]);
  }
  console.log("Toplam etiket sayısı:", rows.length);
  console.log("Etiketler (ilk 5):");
  rows.slice(0, 5).forEach(row => console.log(row[0], ":\n", row[1], "\n---")); // İlk 5 etiketi daha okunaklı göster

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([["CROSS", "ETIKET"], ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, "Etiketler");
  XLSX.writeFile(wb, outputExcel);

  console.log("Excel dosyası oluşturuldu:", outputExcel);
})();