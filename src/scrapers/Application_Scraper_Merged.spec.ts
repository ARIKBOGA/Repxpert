// Application_Scraper_Merged.spec.ts
import { expect, test } from "@playwright/test";
import { Application } from "../types/Application";
import fs from "fs";
import path from "path";
import { addToRetryList, getTextContent } from "../utils/extractHelpers";
import { selector } from "../utils/Selectors";
import {
  crankshaftTrios,
  padTrios,
  readJsonFile,
  retryListFilePath,
} from "../utils/FileHelpers";
import {
  goToSearchResults,
  goToSearchResultsEnglish,
  ProductreferenceTrio,
  readProductReferencesTrio
} from "../utils/ScraperHelpers";

const productType = process.env.PRODUCT_TYPE as string;
const filterBrand = process.env.FILTER_BRAND_APPLICATION?.toUpperCase() as string;
const language = (process.env.PAGE_LANGUAGE || "TR").toUpperCase(); // "TR" veya "EN"

const references: ProductreferenceTrio[] = Array.from(readProductReferencesTrio());
const goToSearchFn = language === "EN" ? goToSearchResultsEnglish : goToSearchResults;
const outputLangFolder = language === "EN" ? "English" : "TR";

const scrapedCrosses: Set<string> = new Set<string>();
let retryList = readJsonFile<string[]>(retryListFilePath, []);

test.describe(`REPXPERT ${language} uygulama verisi çek`, () => {
  references
    .filter(ref => ref.supplier.toUpperCase() === filterBrand)
    .forEach(ref => {
      const { yvNo, supplier, crossNumber } = ref;
      if (!crossNumber) {
        console.log(`YV No: ${yvNo} için geçerli bir referans kodu bulunamadı.`);
        return;
      }

      const crossNumbers = crossNumber.split(",").map(c => c.trim());

      crossNumbers.forEach(cross => {
        test(`YV No: ${yvNo} - ${supplier} - ${cross} araç uyumluluklarını getir`, async ({ page }) => {
            const filterBrand = supplier.toUpperCase();
          try {
            const productLinks = await goToSearchFn(page, cross, filterBrand, retryList, addToRetryList);
            if (!productLinks) return;

            await Promise.all([
              page.waitForLoadState("domcontentloaded"),
              page.waitForSelector(".h1"),
              productLinks[0].click(),
            ]);

            await page.waitForSelector(selector.aria_level_1_brand);
            await page.waitForTimeout(500);

            const productTitle = (await getTextContent(page.locator(".h1").nth(0))) || "Unknown Product";
            const productProducer = productTitle.split(" ")[0];
            const brands = page.locator(selector.aria_level_1_brand);
            const applications: Application[] = [];
            const processedBrands = new Set<string>();

            for (let i = 0; i < await brands.count(); i++) {
              const brandEl = brands.nth(i);
              const brand = (await brandEl.textContent())?.trim() || "";

              if (processedBrands.has(brand)) continue;
              processedBrands.add(brand);

              await brandEl.click();
              await page.waitForTimeout(2000);

              try {
                await page.waitForSelector(selector.aria_level_2_vehicle, { timeout: 5000 });
              } catch {
                console.warn(`⚠️ ${brand} için araç listesi yüklenemedi. Kod: ${cross}`);
                await brandEl.click();
                await page.waitForTimeout(1000);
                continue;
              }

              const vehicles = page.locator(selector.aria_level_2_vehicle);
              const vehicleBoxes = page.locator(selector.aria_level_2_vehicleBox);
              const processedVehicles = new Set<string>();

              for (let j = 0; j < await vehicles.count(); j++) {
                const vehicleEl = vehicles.nth(j);
                const vehicleBoxEl = vehicleBoxes.nth(j);
                const vehicleText = (await vehicleEl.textContent())?.trim() || "";

                if (processedVehicles.has(vehicleText)) continue;
                processedVehicles.add(vehicleText);

                const isExpanded = await vehicleBoxEl.getAttribute("aria-expanded");
                if (isExpanded === "true") {
                  await vehicleEl.click();
                  await page.waitForTimeout(1000);
                }

                await vehicleEl.click();
                await expect(vehicleBoxEl).toHaveAttribute("aria-expanded", "true");
                await page.waitForTimeout(1500);

                const rows = page.locator(selector.aria_level_3_rows);
                if (await rows.count() === 0) {
                  console.warn(`⚠️⚠️⚠️ ${brand} - ${vehicleText} için uyumluluk satırı bulunamadı. Kod: ${cross}`);
                  await vehicleEl.click();
                  await page.waitForTimeout(1000);
                  continue;
                }

                for (let k = 0; k < await rows.count(); k++) {
                  const rowSelector = selector.cells_part_1 + (k + 1) + selector.cells_part_2;
                  const cells = page.locator(rowSelector);
                  const cellTexts = await cells.allTextContents();
                  const cellValues = cellTexts.map(t => t.trim()).filter(t => t !== "");

                  const engineCodes = (await page.locator(`(${rowSelector})[6]//span`).allTextContents()).join(", ").trim();
                  const KBA_Numbers = (await page.locator(`(${rowSelector})[7]//span`).allTextContents()).join(", ").trim();

                  applications.push({
                    brand,
                    model: vehicleText,
                    engineType: cellValues[0] || "",
                    madeYear: cellValues[1] || "",
                    kw: cellValues[2] || "",
                    hp: cellValues[3] || "",
                    cc: cellValues[4] || "",
                    engineCodes,
                    KBA_Numbers,
                  });
                }

                await page.waitForTimeout(500);
                await vehicleEl.click();
                await page.waitForTimeout(1000);
              }

              await brandEl.click();
              await page.waitForTimeout(1000);
            }

            const folderPath = path.join(`src/data/Gathered_Informations/${productType}/Applications/${outputLangFolder}`, productProducer || "UnknownBrand", cross);
            await fs.promises.mkdir(folderPath, { recursive: true });
            const filePath = path.join(folderPath, `${productTitle}.json`);
            await fs.promises.writeFile(filePath, JSON.stringify(applications, null, 2));
            console.log(`✅ ${cross} için ${productTitle}.json kaydedildi.`);

          } catch (err) {
            console.error(`❌ ${cross} için hata:`, err);
            addToRetryList(cross);
          }
        });
      });
    });
});
