import { test } from "@playwright/test";
import { Application } from "../types/Application";
import fs from "fs";
import path from "path";
import { addToRetryList, getTextContent } from "../utils/extractHelpers";
import ConfigReader from "../utils/ConfigReader";
import { selector } from "../utils/Selectors";
import { readJsonFile, retryListFilePath } from "../utils/FileHelpers";
import { goToSearchResults } from "../utils/ScraperHelpers";

const crossNumbersPath = path.resolve(__dirname, "../data/Gathered_Informations/Pads/Resources/references_of_pads.json");
const crossNumbers: string[] = JSON.parse(fs.readFileSync(crossNumbersPath, "utf-8"));

let retryList = readJsonFile<string[]>(retryListFilePath, []);

test.describe("REPXPERT Aplikasyon bilgilerini al", () => {
    const filterBrand = process.env.FILTER_BRAND_APPLICATION as string;

    for (const cross of crossNumbers) {
        test(`${filterBrand} No: ${cross} ile ${filterBrand} ürünlerini getir`, async ({ page }) => {
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

                const productTitle = (await getTextContent(page.locator(".h1").nth(0))) || "Unknown Product";
                const productProducer = productTitle.split(" ")[0];
                //const brands = page.locator(selector.aria_level_1_brand);
                const applications = new Array<Application>();

                const processedVehicles = new Set<string>();

                await page.pause(); // click BRAND

                //const vehicleCount = await page.locator(selector.aria_level_2_vehicle).count();

                let vehicleIndex = 12; // hangi araçtan başlayacaksan onun locator index'ini gir
                const remainingVehicles = 10; // X tane araç başlığı tıklanacak. Ona göre atama yap.
                const manuelBrand = "RENAULT"; // brand adını manuel olarak yaz

                for (let j = 0; j < remainingVehicles; j++) {

                    const vehicleEl = page.locator('(//*[@aria-level="2"]/div[1])[' + vehicleIndex + ']');
                    vehicleIndex++;
                    const vehicle = (await vehicleEl.textContent())?.trim() || "";

                    if (processedVehicles.has(vehicle)) continue;
                    processedVehicles.add(vehicle);

                    await page.pause(); // collapse previous one then click the next vehicle

                    //await vehicleEl.click();
                    //await page.waitForTimeout(3000);
                    //await page.waitForSelector(selector.aria_level_3_rows, { state: "visible", timeout: 5000 });

                    const rows = page.locator(selector.aria_level_3_rows);
                    const rowCount = await rows.count();

                    for (let k = 0; k < rowCount; k++) {
                        const rowSelector = selector.cells_part_1 + (k + 1) + selector.cells_part_2;
                        const cells = page.locator(rowSelector);
                        const cellTexts = await cells.allTextContents();
                        const cellValues = cellTexts.map((text) => text.trim()).filter((text) => text !== "");

                        const engineCodes = (await page.locator(`(${rowSelector})[6]//span`).allTextContents()).map(text => text.trim()).join(", ").trim();
                        const KBA_Numbers = (await page.locator(`(${rowSelector})[7]//span`).allTextContents()).map(text => text.trim()).join(", ").trim();

                        applications.push({
                            brand: manuelBrand,
                            model: vehicle,
                            engineType: cellValues[0] || "",
                            madeYear: cellValues[1] || "",
                            kw: cellValues[2] || "",
                            hp: cellValues[3] || "",
                            cc: cellValues[4] || "",
                            engineCodes: engineCodes,
                            KBA_Numbers: KBA_Numbers,
                        });
                    }

                    //await vehicleEl.click(); // collapse
                    //await page.waitForTimeout(2000);
                }


                const productProducerFolderPath = path.join("src/data/Gathered_Informations/Pads/Applications", productProducer || "UnknownBrand");

                if (!fs.existsSync(productProducerFolderPath)) {
                    fs.mkdirSync(productProducerFolderPath, { recursive: true });
                }

                const oeFolderPath = path.join(productProducerFolderPath, cross);
                if (!fs.existsSync(oeFolderPath)) {
                    fs.mkdirSync(oeFolderPath, { recursive: true });
                }

                const fileName = `Manuel_${productProducer}_${cross}_${manuelBrand}.json`;
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
