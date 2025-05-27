import { test } from "@playwright/test";
import { Application } from "../types/Application";
import fs from "fs";
import path from "path";
import { addToRetryList, getTextContent } from "../utils/extractHelpers";
import { selector } from "../utils/Selectors";
import { readJsonFile, retryListFilePath, padPairs } from "../utils/FileHelpers";
import { goToSearchResults, ProductReference, readProductReferencesFromExcel } from "../utils/ScraperHelpers";


// Çalışılacak ürün tipini seç
const productType = process.env.PRODUCT_TYPE as string; // Örnek: 'Pads', 'Discs', 'Drums' vb.
const filterBrand = process.env.FILTER_BRAND_APPLICATION as string; // Örnek: 'ICER', 'TEXTAR' vb.

// Ürün tipine karşılık gelen Excel dosyasından katalog bilgilerini oku
const references : ProductReference[] = readProductReferencesFromExcel(productType);

const scrapedCrosses : Set<string> = new Set<string>();

let retryList = readJsonFile<string[]>(retryListFilePath, []);

test.describe("REPXPERT Aplikasyon bilgilerini al", () => {

  for (const ref of padPairs) {
    // Excel den okunan satırlardan yvNo ve brandRefs değerlerini al
    const YV = ref.yvNo;
    let cross = ref.brandRefs && (ref.brandRefs[filterBrand] as string);

    if (!cross || cross === "") {
      console.log(`YV No: ${YV} için geçerli bir referans kodu bulunamadı.`);
      continue; // Geçerli bir referans kodu yoksa next iteration a geç
    }

    if(cross.includes(",")){
      console.warn(`⚠️ ${cross} birden fazla referans içeriyor, bu durumda sadece ilk referansı kullanılıyor.`);
      const firstCross = cross.split(",")[0].trim();
      console.log(`İlk referans: ${firstCross}`);
      cross = firstCross; // Sadece ilk referansı kullan
    }

    if (scrapedCrosses.has(cross)) {
      console.log(`✅ ${cross} zaten işlendi, atlanıyor.`);
      continue; // Eğer bu cross zaten işlendi ise atla
    }
    scrapedCrosses.add(cross); // İşlenen crossları kaydet
    
    test(`${filterBrand} - ${cross} ürününün araç uyumluluklarını getir`, async ({page,}) => {
      
      try {
        const productLinks = await goToSearchResults(page, cross, filterBrand, retryList, addToRetryList);
        
        if (!productLinks) return;

        console.log(`🔍 ${cross} için ürünü işliyor...`);

        await Promise.all([
          page.waitForLoadState("domcontentloaded"),
          page.waitForSelector(".h1"),
          productLinks[0].click(),
        ]);

        await page.waitForSelector(selector.aria_level_1_brand);
        await page.waitForTimeout(500); // Kısa bekleme

        const productTitle = (await getTextContent(page.locator(".h1").nth(0))) || "Unknown Product";
        const productProducer = productTitle.split(" ")[0];
        const brands = page.locator(selector.aria_level_1_brand);
        const applications = new Array<Application>();

        const processedBrands = new Set<string>();

        for (let i = 0; i < (await brands.count()); i++) {
          const brandEl = brands.nth(i);
          const brand = (await brandEl.textContent())?.trim() || "";

          if (processedBrands.has(brand)) continue;
          processedBrands.add(brand);

          await brandEl.click();
          await page.waitForTimeout(2000); // Kısa bekleme

          try {
            await page.waitForSelector(selector.aria_level_2_vehicle, {timeout: 5000});
          } catch {
            console.warn(`⚠️ ${brand} için araç listesi yüklenemedi.`);
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
          
            // scrollIntoViewIfNeeded() DEVRE DIŞI
            // await vehicleEl.scrollIntoViewIfNeeded();
          
            // Eğer araç zaten açıksa (expanded), önce kapat
            const isExpanded = await vehicleEl.getAttribute("aria-expanded");
            if (isExpanded === "true") {
              await vehicleEl.click();
              await page.waitForTimeout(2000); // collapse işlemi tamamlanana kadar bekle
            }
          
            await vehicleEl.click(); // tekrar aç
            await page.waitForTimeout(2500); // açılmasını bekle
            await page.waitForSelector(selector.aria_level_3_rows, { state: "visible", timeout: 5000});
            
            if(!page.locator(selector.aria_level_3_rows) || await page.locator(selector.aria_level_3_rows).count() === 0) {
              console.warn(`⚠️⚠️⚠️ ${brand} - ${vehicle} için satır bulunamadı ⚠️⚠️⚠️`);
              continue;
            }

            const rows = page.locator(selector.aria_level_3_rows);
            const rowCount = await rows.count();
          
            if (rowCount === 0) {
              console.warn(`⚠️ ${brand} - ${vehicle} için satır bulunamadı`);
              continue;
            }
          
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
                engineCodes: engineCodes,
                KBA_Numbers: KBA_Numbers
              });
            }
          
            await page.waitForTimeout(500);
            await vehicleEl.click(); // collapse after processing
            await page.waitForTimeout(1000);
          }
          

          await brandEl.click(); // collapse
          await page.waitForTimeout(1000);
        }

        const productProducerFolderPath = path.join(`src/data/Gathered_Informations/${productType}/Applications`,productProducer || "UnknownBrand");

        if (!fs.existsSync(productProducerFolderPath)) {
          fs.mkdirSync(productProducerFolderPath, { recursive: true });
        }

        const oeFolderPath = path.join(productProducerFolderPath, cross);
        if (!fs.existsSync(oeFolderPath)) {
          fs.mkdirSync(oeFolderPath, { recursive: true });
        }

        const fileName = `${productProducer}_${cross}.json`;
        const filePath = path.join(oeFolderPath, fileName);

        fs.writeFileSync(filePath, JSON.stringify(applications, null, 2), "utf-8");
        console.log(`✅ ${cross} için ${fileName} üzerine yazılarak kaydedildi.`);
      } catch (err) {
        console.error(`❌ ${cross} için hata:`, err);
        addToRetryList(cross);
      }
    });
  }
});
