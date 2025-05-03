import { test } from "@playwright/test";
import { Application } from "../types/Application";
import fs from "fs";
import path from "path";
import { addToRetryList, getTextContent } from "../utils/extractHelpers";
import ConfigReader from "../utils/ConfigReader";
import { selector } from "../utils/Selectors";
import { readJsonFile, retryListFilePath } from "../utils/FileHelpers";
import { goToSearchResults } from "../utils/ScraperHelpers";

// JSON dosyasından OE numaralarını oku
const crossNumbersPath = path.resolve(__dirname, "../data/Configs/search_references.json");
const crossNumbers: string[] = JSON.parse(fs.readFileSync(crossNumbersPath, "utf-8"));

// reTry.json'u oku veya boş bir array oluştur
let retryList = readJsonFile<string[]>(retryListFilePath, []);

test.describe.only("REPXPERT Brembo ürünleri", () => {
  for (const cross of crossNumbers) {
    test(`Brembo No: ${cross} ile Brembo ürünlerini getir`, async ({ page,}) => {
      try {
        // Her test için yeni bir sayfa açılır, böylece her test birbirinden bağımsız çalışır
        const filterBrand = ConfigReader.getEnvVariable("FILTER_BRAND_APPLICATION") || "BREMBO";

        // Search results sayfasına git
        const productLinks = await goToSearchResults(page, cross, filterBrand, retryList, addToRetryList);
        if (!productLinks) return; // ürün yoksa işlemi kes
        
        console.log(`🔍 ${cross} için ürünü işliyor...`);

        await Promise.all([
          page.waitForLoadState("domcontentloaded"),
          page.waitForSelector(".h1"), // Ürün detay sayfasında başlık gelmeden işleme geçme
          productLinks[0].click(),
        ]);

        await Promise.all([
          page.waitForLoadState("domcontentloaded"),
          page.waitForSelector(selector.aria_level_1_brand), // Markalar kısmı gelmeden işleme geçme
        ]);

        const productTitle = (await getTextContent(page.locator(".h1").nth(0))) || "Unknown Product";
        const productProducer = productTitle.split(" ")[0];
        const brands = page.locator(selector.aria_level_1_brand);
        const applications = new Array<Application>();

        for (let i = 0; i < (await brands.count()); i++) {
          const brand = await brands.nth(i).textContent();
          //console.log(`Brand ${i + 1}: ${brand}`);
          await brands.nth(i).click();
          await page.waitForTimeout(3000); // Wait for the page to load

          const vehicles = page.locator(selector.aria_level_2_vehicle);
          for (let j = 0; j < (await vehicles.count()); j++) {
            const vehicle = await vehicles.nth(j).textContent();

            await vehicles.nth(j).click(); // expand the vehicle details
            await page.waitForTimeout(2000); // Wait for the page to load

            const rows = page.locator(selector.aria_level_3_rows);
            for (let k = 0; k < (await rows.count()); k++) {
              const rowElement = rows.nth(k);
              const cells = page.locator(selector.cells_part_1 + (k + 1) + selector.cells_part_2);
              const cellTexts = await cells.allTextContents();
              const cellValues = cellTexts
                .map((text) => text.trim())
                .filter((text) => text !== "");
              //console.log(`${brand} - ${vehicle} -  ${cellValues.join(', ')}`);
              const application: Application = {
                brand: brand || "",
                model: vehicle || "",
                engineType: cellValues[0] || "",
                madeYear: cellValues[1] || "",
                kw: cellValues[2] || "",
                hp: cellValues[3] || "",
                cc: cellValues[4] || "",
                engineCodes: cellValues[5] || "",
                KBA_Numbers: cellValues[6] || "",
              };
              applications.push(application);
            }
            await vehicles.nth(j).click(); // collapse the vehicle details so that ONLY the next vehicle can be shown and located
          }
          await brands.nth(i).click(); // collapse the brand details so that ONLY the next brand can be shown and located
        }
        // Save the applications to a json file, create if not exists
        const productProducerFolderPath = path.join("src/data/apps", productProducer || "UnknownBrand");

        if (!fs.existsSync(productProducerFolderPath)) {
          fs.mkdirSync(productProducerFolderPath, { recursive: true });
        }

        const oeFolderPath = path.join(productProducerFolderPath, cross);
        if (!fs.existsSync(oeFolderPath)) {
          fs.mkdirSync(oeFolderPath, { recursive: true });
        }

        const fileName = `${productProducer}_${cross}.json`;
        const filePath = path.join(oeFolderPath, fileName);

        // Dosyayı doğrudan overwrite edecek şekilde yaz
        fs.writeFileSync(filePath, JSON.stringify(applications, null, 2), "utf-8");
        console.log(`✅ ${cross} için ${fileName} üzerine yazılarak kaydedildi.`);

      } catch (err) {
        console.error(`❌ ${cross} için hata:`, err);

        // Hata yakalanırsa da o OE numarasını reTry listesine ekle
        addToRetryList(cross); // Use the helper function here
      }
    });
  }
});
