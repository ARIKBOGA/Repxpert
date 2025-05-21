import { test } from "@playwright/test";
import { Application } from "../types/Application";
import fs from "fs";
import path from "path";
import { addToRetryList, getTextContent } from "../utils/extractHelpers";
import ConfigReader from "../utils/ConfigReader";
import { selector } from "../utils/Selectors";
import { readJsonFile, retryListFilePath } from "../utils/FileHelpers";
import { goToSearchResultsEnglish } from "../utils/ScraperHelpers";

const crossNumbersPath = path.resolve( __dirname, "../data/willBefixed/willBeScraped.json");

// Read crossNumbers form a json file and remove duplicates
const crossNumbers: string[] = Array.from(new Set(JSON.parse(fs.readFileSync(crossNumbersPath, "utf-8"))));

//const manualArray: string[] = ["2932003"];

let retryList = readJsonFile<string[]>(retryListFilePath, []);

test.describe("REPXPERT Aplikasyon bilgilerini al", () => {
  const filterBrand = ConfigReader.getEnvVariable("FILTER_BRAND_APPLICATION");

  for (const cross of crossNumbers) {
    test(`${filterBrand} - ${cross} ürününün araç uyumluluklarını getir`, async ({ page }) => {
      try {
        const productLinks = await goToSearchResultsEnglish(page, cross, filterBrand, retryList, addToRetryList);
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

          //if (processedBrands.has(brand)) continue; 
          processedBrands.add(brand);

          await brandEl.click();
          await page.waitForTimeout(2000); // Kısa bekleme

          try {
            await page.waitForSelector(selector.aria_level_2_vehicle, {
              timeout: 5000,
            });
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
              await page.waitForTimeout(1000); // collapse işlemi tamamlanana kadar bekle
            }

            await vehicleEl.click(); // tekrar aç
            await page.waitForTimeout(2500); // açılmasını bekle

      
            await page.waitForSelector(selector.aria_level_3_rows, { state: "visible", timeout: 5000, });
            // Eğer araç açılmadıysa, hata ver
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
              const cells = page.locator(selector.cells_part_1 + (k + 1) + selector.cells_part_2);
              const cellTexts = await cells.allTextContents();
              const cellValues = cellTexts
                .map((text) => text.trim())
                .filter((text) => text !== "");

              applications.push({
                brand,
                model: vehicle,
                engineType: cellValues[0] || "",
                madeYear: cellValues[1] || "",
                kw: cellValues[2] || "",
                hp: cellValues[3] || "",
                cc: cellValues[4] || "",
                engineCodes: cellValues[5] || "",
                KBA_Numbers: cellValues[6] || "",
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
          "src/data/Gathered_Informations/Discs/Applications/English",
          productProducer || "UnknownBrand"
        );

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
