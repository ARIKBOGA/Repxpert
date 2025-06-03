import { test } from "@playwright/test";
import { Application } from "../types/Application";
import fs from "fs";
import path from "path";
import { addToRetryList, getTextContent } from "../utils/extractHelpers";
import ConfigReader from "../utils/ConfigReader";
import { selector } from "../utils/Selectors";
import { getSubfolderNamesSync, readJsonFile, retryListFilePath, padPairs } from "../utils/FileHelpers";
import { goToSearchResultsEnglish, ProductReference, readProductReferencesFromExcel } from "../utils/ScraperHelpers";

const crossNumbersPath = path.resolve(__dirname, "../data/willBefixed/willBeScraped.json");

// Read crossNumbers form a json file and remove duplicates
const crossNumbers: string[] = Array.from(new Set(JSON.parse(fs.readFileSync(crossNumbersPath, "utf-8"))));

//const manualArray: string[] = ["2932003"];
const filterBrand = process.env.FILTER_BRAND_APPLICATION as string;
const productType = process.env.PRODUCT_TYPE as string;
const references : ProductReference[] = readProductReferencesFromExcel(productType);

const scrapedCroossNumbers = getSubfolderNamesSync(`src/data/Gathered_Informations/${productType}/Applications/English/${filterBrand}`);
const missingCrossNumbers = crossNumbers.filter(crossNumber => !scrapedCroossNumbers.includes(crossNumber));
const scrapedCrossSet = new Set<string>();

let retryList = readJsonFile<string[]>(retryListFilePath, []);

test.describe("REPXPERT Aplikasyon bilgilerini al", () => {
  
  for (const ref of padPairs) {

    const {yvNo, brandRefs} = ref;
    
    let crossNumber = brandRefs && (brandRefs[filterBrand] as string);

    if (!crossNumber || crossNumber === "") {
      console.log(`YV No: ${yvNo} için geçerli bir referans kodu bulunamadı.`);
      continue; // Geçerli bir referans kodu yoksa next iteration a geç
    }

    if(crossNumber.includes(",")){
      //console.warn(`⚠️ ${crossNumber} birden fazla referans içeriyor, bu durumda sadece ilk referansı kullanılıyor.`);
      const firstCross = crossNumber.split(",")[0].trim();
      //console.log(`İlk referans: ${firstCross}`);
      crossNumber = firstCross; // Sadece ilk referansı kullan
    }

    if(scrapedCroossNumbers.includes(crossNumber)){
      //console.warn(`⚠️ ${crossNumber} kodu zaten alınmış, atlanıyor...`);
      continue;
    }

    if(scrapedCrossSet.has(crossNumber)){
      //console.warn(`⚠️ ${crossNumber} kodu zaten alınmış, atlanıyor...`);
      continue;
    }
    scrapedCrossSet.add(crossNumber);
    test(`${filterBrand} - ${crossNumber} ürününün araç uyumluluklarını getir`, async ({ page }) => {
      try {
        const productLinks = await goToSearchResultsEnglish(page, crossNumber, filterBrand, retryList, addToRetryList);
        if (!productLinks) return;

        console.log(`🔍 ${crossNumber} için ürünü işliyor...`);

        await Promise.all([
          page.waitForLoadState("domcontentloaded"),
          page.waitForSelector(".h1"),
          productLinks[0].click(),
        ]);

        await page.waitForSelector(selector.aria_level_1_brand);
        await page.waitForTimeout(500); // Kısa bekleme

        const productTitle = (await getTextContent(page.locator(".h1").nth(0))) || "Unknown Product";
        const productProducer = productTitle.split(" ")[0];
        const productID = productTitle.substring(productTitle.indexOf(" ")).trim();
        const brands = page.locator(selector.aria_level_1_brand);

        const applications = new Array<Application>();

        const processedBrands = new Set<string>();

        for (let i = 0; i < (await brands.count()); i++) {
          const brandEl = brands.nth(i);
          const brand = (await brandEl.textContent())?.trim() || "";

          //if (processedBrands.has(brand)) continue; 
          processedBrands.add(brand);

          await brandEl.click();
          await page.waitForTimeout(2000); // Kısa bekleme

          try {
            await page.waitForSelector(selector.aria_level_2_vehicle, {
              timeout: 5000,
            });
          } catch {
            console.warn(`⚠️ ${brand} için araç listesi yüklenemedi. Kod: ${crossNumber}`);
            await brandEl.click();
            await page.waitForTimeout(1000); // tekrar kapat
            continue;
          }

          const processedVehicles = new Set<string>();

          const vehicleCount = await page.locator(selector.aria_level_2_vehicle).count();

          // Vehicle listesindeki her bir item için
          for (let j = 0; j < vehicleCount; j++) {
            const vehicles = page.locator(selector.aria_level_2_vehicle);
            const vehicleEl = vehicles.nth(j);
            const vehicle = (await vehicleEl.textContent())?.trim() || "";

            if (processedVehicles.has(vehicle)) continue;
            processedVehicles.add(vehicle);

            // Eğer araç zaten açıksa (expanded), önce kapat
            const isExpanded = await vehicleEl.getAttribute("aria-expanded");
            if (isExpanded === "true") {
              await vehicleEl.click();
              await page.waitForTimeout(1000); // collapse işlemi tamamlanana kadar bekle
            }

            await vehicleEl.click(); // tekrar aç
            await page.waitForTimeout(4000); // açılmasını bekle

            // Eğer araç açılmadıysa, hata logu yaz ve bir sonraki araç'a gec
            if (!page.locator(selector.aria_level_3_rows) || await page.locator(selector.aria_level_3_rows).count() === 0) {

              console.warn(`⚠️⚠️⚠️ ${brand} - ${vehicle} için uyumluluk satırı bulunamadı. Kod: ${crossNumber}`);
              await vehicleEl.click(); // tekrar kapat
              await page.waitForTimeout(1000);
              continue;
            }

            const rows = page.locator(selector.aria_level_3_rows);
            const rowCount = await rows.count();

            for (let k = 0; k < rowCount; k++) {
              
              const rowSelector = selector.cells_part_1 + (k + 1) + selector.cells_part_2;
              const cells = page.locator(rowSelector);
              const cellTexts = await cells.allTextContents();
              const cellValues = cellTexts
                .map((text) => text.trim())
                .filter((text) => text !== "");

              const engineCodes =  (await page.locator(`(${rowSelector})[6]//span`).allTextContents()).map(text => text.trim()).join(", ").trim();
              const KBA_Numbers =  (await page.locator(`(${rowSelector})[7]//span`).allTextContents()).map(text => text.trim()).join(", ").trim();

              applications.push({
                brand,
                model: vehicle,
                engineType: cellValues[0] || "",
                madeYear: cellValues[1] || "",
                kw: cellValues[2] || "",
                hp: cellValues[3] || "",
                cc: cellValues[4] || "",
                engineCodes: engineCodes || "",
                KBA_Numbers: KBA_Numbers || "",
              });
            }

            await page.waitForTimeout(500);
            await vehicleEl.click(); // collapse after processing
            await page.waitForTimeout(1000);
          }

          await brandEl.click(); // collapse
          await page.waitForTimeout(1000);
        }

        const productProducerFolderPath = path.join(
          `src/data/Gathered_Informations/${productType}/Applications/English`,
          productProducer || "UnknownBrand"
        );

        if (!fs.existsSync(productProducerFolderPath)) {
          fs.mkdirSync(productProducerFolderPath, { recursive: true });
        }

        const oeFolderPath = path.join(productProducerFolderPath, crossNumber);
        if (!fs.existsSync(oeFolderPath)) {
          fs.mkdirSync(oeFolderPath, { recursive: true });
        }

        const fileName = `${productProducer}_${productID}.json`;
        const filePath = path.join(oeFolderPath, fileName);

        fs.writeFileSync(filePath, JSON.stringify(applications, null, 2), "utf-8");
        console.log(`✅ ${crossNumber} için ${fileName} üzerine yazılarak kaydedildi.`);

      } catch (err) {
        console.error(`❌ ${crossNumber} için hata:`, err);
        addToRetryList(crossNumber);
      }
    });
  }
});
