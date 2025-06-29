import { expect, test } from "@playwright/test";
import { Application } from "../types/Application";
import fs from "fs";
import path from "path";
import { addToRetryList, getTextContent } from "../utils/extractHelpers";
import { selector } from "../utils/Selectors";
import { crankshaftTrios, readJsonFile, retryListFilePath, } from "../utils/FileHelpers";
import { goToSearchResults, ProductReference } from "../utils/ScraperHelpers";


// Çalışılacak ürün tipini seç
const productType = process.env.PRODUCT_TYPE as string; // Örnek: 'Pads', 'Discs', 'Drums' vb.
const filterBrand = process.env.FILTER_BRAND_APPLICATION as string; // Örnek: 'ICER', 'TEXTAR' vb.

// Ürün tipine karşılık gelen Excel dosyasından katalog bilgilerini oku
// const references : ProductReference[] = readProductReferencesFromExcel(productType);

const scrapedCrosses: Set<string> = new Set<string>();
let retryList = readJsonFile<string[]>(retryListFilePath, []);

test.describe("REPXPERT Aplikasyon bilgilerini al", () => {

  Array.from(crankshaftTrios)
    .filter(ref => ref.supplier.toUpperCase() === filterBrand.toUpperCase())
    .forEach(ref => {

      let { yvNo, supplier, crossNumber } = ref;

      if (!crossNumber) {
        console.log(`YV No: ${yvNo} için geçerli bir referans kodu bulunamadı.`);
        return;
      }

      const crossNumbers = crossNumber.split(',').map(cross => cross.trim());

      crossNumbers.forEach(crossNumber => {

        test(`${filterBrand} - ${crossNumber} ürününün araç uyumluluklarını getir`, async ({ page, }) => {
          const filterBrand = supplier.toUpperCase();
          try {

            const productLinks = await goToSearchResults(page, crossNumber, filterBrand, retryList, addToRetryList);
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
                await page.waitForSelector(selector.aria_level_2_vehicle, { timeout: 5000 });
              } catch {
                console.warn(`⚠️ ${brand} için araç listesi yüklenemedi. Kod: ${crossNumber}`);
                await brandEl.click();
                await page.waitForTimeout(1000); // tekrar kapat
                continue;
              }

              const processedVehicles = new Set<string>();
              const vehicleCount = await page.locator(selector.aria_level_2_vehicle).count();
              const vehicles = page.locator(selector.aria_level_2_vehicle);
              const vehicleBoxes = page.locator(selector.aria_level_2_vehicleBox);

              // Vehicle listesindeki her bir item için
              for (let j = 0; j < vehicleCount; j++) {
                const vehicleElement = vehicles.nth(j);
                const vehicleBoxElement = vehicleBoxes.nth(j);
                const vehicleText = (await vehicleElement.textContent())?.trim() || "";

                if (processedVehicles.has(vehicleText)) continue;
                processedVehicles.add(vehicleText);


                // Eğer araç zaten açıksa (expanded), önce kapat
                const isExpanded = await vehicleBoxElement.getAttribute("aria-expanded");
                if (isExpanded === "true") {
                  await vehicleElement.click();
                  await page.waitForTimeout(1000); // collapse işlemi tamamlanana kadar bekle
                }

                await vehicleElement.click(); // tekrar aç
                await expect(vehicleBoxElement).toHaveAttribute("aria-expanded", "true");
                await page.waitForTimeout(1500); // Kısa bekleme

                // Eğer araç açılmadıysa, hata logu yaz ve bir sonraki araç'a gec
                if (!page.locator(selector.aria_level_3_rows) || await page.locator(selector.aria_level_3_rows).count() === 0) {

                  console.warn(`⚠️⚠️⚠️ ${brand} - ${vehicleText} için uyumluluk satırı bulunamadı. Kod: ${crossNumber}`);
                  await vehicleElement.click(); // tekrar kapat
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

                  const engineCodes = (await page.locator(`(${rowSelector})[6]//span`).allTextContents()).map(text => text.trim()).join(", ").trim();
                  const KBA_Numbers = (await page.locator(`(${rowSelector})[7]//span`).allTextContents()).map(text => text.trim()).join(", ").trim();

                  applications.push({
                    brand,
                    model: vehicleText,
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
                await vehicleElement.click(); // collapse after processing
                await page.waitForTimeout(1000);
              }
              await brandEl.click(); // collapse
              await page.waitForTimeout(1000);
            }

            const folderPath = path.join(`src/data/Gathered_Informations/${productType}/Applications/TR`, productProducer || "UnknownBrand", crossNumber);
            await fs.promises.mkdir(folderPath, { recursive: true });
            const filePath = path.join(folderPath, `${productTitle}.json`);
            await fs.promises.writeFile(filePath, JSON.stringify(applications, null, 2));
            console.log(`✅ ${crossNumber} için ${productTitle}.json üzerine yazılarak kaydedildi.`);

          } catch (err) {
            console.error(`❌ ${crossNumber} için hata:`, err);
            addToRetryList(crossNumber);
          }
        });
      });
    });
});