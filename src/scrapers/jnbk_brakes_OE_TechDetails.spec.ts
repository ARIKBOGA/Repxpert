import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { addToRetryList } from '../utils/extractHelpers';
import { Application } from '../types/Application';
import { discPairs, lookupReference, readJsonFile, retryListFilePath } from '../utils/FileHelpers';

// env dosyasından değişkenleri oku
const productKind = process.env.PRODUCT_TYPE as string;
const scrapedCrosses: Set<string> = new Set<string>();

let retryList = readJsonFile<string[]>(retryListFilePath, []);


test.describe('JNBK Brakes OE Tech Details', () => {

    for (const ref of discPairs) {

        const { yvNo, brandRefs } = ref;
        const filterBrand = Object.keys(brandRefs)[0];
        let crossNumber = ref.brandRefs && (ref.brandRefs[filterBrand] as string);

        if (!crossNumber || crossNumber === "") {
            console.log(`YV No: ${yvNo} için geçerli bir referans kodu bulunamadı.`);
            continue; // Geçerli bir referans kodu yoksa next iteration a geç
        }

        if (crossNumber.includes(",")) {
            console.warn(`⚠️ ${crossNumber} birden fazla referans içeriyor, bu durumda sadece ilk referansı kullanılıyor.`);
            const firstCross = crossNumber.split(",")[0].trim();
            console.log(`İlk referans: ${firstCross}`);
            crossNumber = firstCross; // Sadece ilk referansı kullan
        }

        if (scrapedCrosses.has(crossNumber)) {
            console.log(`✅ ${crossNumber} zaten işlendi, atlanıyor.`);
            continue; // Eğer bu cross zaten işlendi ise atla
        }
        scrapedCrosses.add(crossNumber); // İşlenen crossları kaydet

        test(`${filterBrand} - ${crossNumber} no ile ürünün teknik detaylarını al`, async ({ page }) => {
            try {

                // Search results sayfasına git
                await page.goto(process.env.JNKB_BRAKES_URL as string);
                await page.waitForLoadState('domcontentloaded');
                await page.waitForTimeout(1000); // Sayfanın yüklenmesini bekle
                await page.getByRole('textbox', { name: 'Enter OEM, NiBK, WVA, FMSI or' }).waitFor(); // Arama çubuğunun yüklendiğinden emin olmak için bekle
                const searchInput = page.getByRole('textbox', { name: 'Enter OEM, NiBK, WVA, FMSI or' });
                await searchInput.fill(crossNumber); // OE numarasını arama çubuğuna yaz
                await page.getByRole('button', { name: 'Search' }).click(); // Arama butonuna tıkla

                //await page.pause(); // Arama sonuçlarının yüklenmesini bekle


                await page.waitForTimeout(2000); // Arama sonuçlarının yüklenmesini bekle
                await page.waitForLoadState('domcontentloaded'); // Sayfanın yüklenmesini bekle
                await page.locator('#divImgCrossSpec').getByText('Specification').waitFor(); // Ürün detaylarının yüklendiğinden emin olmak için bekle

                console.log(`🔍 ${crossNumber} için ürünü işliyor...`);

                const productTitle = await page.locator("//*[@id='msg']/following-sibling::div//h2").textContent();
                console.log(`Ürün Başlığı: ${productTitle}`);

                let productType = "";
                let productID = "";

                if (productTitle && productTitle.includes("»")) {
                    const parts = productTitle.split("»").map(p => p.trim());
                    productType = parts[0]; // ROTOR DISC
                    productID = parts[1];   // RN2264V
                } else {
                    const words = productTitle ? productTitle.trim().split(" ") : [];
                    productType = words.slice(0, -1).join(" ");
                    productID = words.at(-1) || "";
                }


                const specificationTitles = await page.locator("//*[@class='d-lg-flex']//div[@class='param-title']").allTextContents();
                const specificationValues = await page.locator("//*[@class='d-lg-flex']//div[@class='param-field']").allTextContents();

                const crossReferenceOwners = await page.locator("//div[@class='owner']").allTextContents();
                const crossReferenceNumbers = await page.locator("//div[@class='field']").allTextContents();


                const specificationMap = new Map<string, string>();

                for (let i = 0; i < specificationTitles.length; i++) {
                    const title = specificationTitles[i].trim();
                    const value = specificationValues[i].trim();
                    if (title && value) {
                        specificationMap.set(title, value);
                    }
                }

                const crossReferencePairs: { brand: string; oe: string }[] = [];

                for (let i = 0; i < crossReferenceOwners.length; i++) {
                    const owner = crossReferenceOwners[i].trim();
                    const number = crossReferenceNumbers[i].trim();

                    if (owner && number) {
                        crossReferencePairs.push({ brand: owner, oe: number });
                    }
                }

                const brand_oe_map_serializable: { [key: string]: string[] } = {};
                for (const pair of crossReferencePairs) {
                    const oeNumbers = brand_oe_map_serializable[pair.brand] || [];
                    oeNumbers.push(pair.oe);
                    brand_oe_map_serializable[pair.brand] = oeNumbers;
                }

                // Her iki map i de JSON formatında dosyaya yaz
                const dirPath = path.resolve(__dirname, `../data/Gathered_Informations/${productKind}/Technical_Details/NewlyAdded/${yvNo}`);
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true }); // klasörü oluştur
                }
                const outputPath = path.resolve(dirPath, `JNBK_${productID}.json`);

                const outputData = {
                    reference: yvNo,
                    id: productID,
                    brand: filterBrand,
                    brand_oe_map: brand_oe_map_serializable, // artık dizi objesi
                    specifications: Object.fromEntries(specificationMap),
                };

                fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');

                console.log(`✅ ${crossNumber} için ürün detayları başarıyla alındı ve ${outputPath} dosyasına yazıldı.`);


                // Application Gatheiring process
                const applications = new Array<Application>();

                const marka_model_locator = "//div[contains(@class, 'model-title')]";  // çoklu locating, dizi döndürür
                const marka_model = page.locator(marka_model_locator);
                const marka_model_count = await marka_model.count();

                for (let i = 1; i <= marka_model_count; i++) {
                    const marka_model = await page.locator(`(${marka_model_locator})[${i}]`).textContent();
                    const marka_model_text = marka_model?.trim();
                    const marka = marka_model_text?.split("»")[0].trim();
                    const model = marka_model_text?.split("»")[1].trim();

                    const rows_locator = `(//div[contains(@class, 'model-body')])[${i}]//tr`; // Mosulu locate et
                    const app_rows = await page.locator(rows_locator).all();
                    for (let j = 0; j < app_rows.length; j++) {
                        const madeYear = await page.locator(`${rows_locator}[${j + 1}]//td[1]`).textContent() || "";
                        const engineType = await page.locator(`${rows_locator}[${j + 1}]//td[2]`).textContent() || "";
                        const engineCodes = await page.locator(`${rows_locator}[${j + 1}]//td[3]`).textContent() || "";
                        const body = await page.locator(`${rows_locator}[${j + 1}]//td[4]`).textContent() || "";
                        const app: Application = {
                            brand: marka || "",
                            model: model || "",
                            madeYear: madeYear.trim(),
                            engineType: engineType.trim(),
                            engineCodes: engineCodes.trim(),
                            body: body.trim(),
                            kw: "",
                            hp: "",
                            cc: "",
                            KBA_Numbers: ""
                        }
                        applications.push(app);
                    }
                }

                const outputPath_app = path.join(`src/data/Gathered_Informations/Discs/Applications/TR/NewlyAdded`, "JNBK", `${productID}.json`);
                if (!fs.existsSync(path.dirname(outputPath_app))) {
                    fs.mkdirSync(path.dirname(outputPath_app), { recursive: true });
                }
                fs.writeFileSync(outputPath_app, JSON.stringify(applications, null, 2), 'utf-8');
                console.log(`✅ ${crossNumber} için uygulamalar basarıyla alındı ve ${outputPath_app} dosyasına yazıldı.`);

            } catch (err) {
                console.error(`❌ ${crossNumber} için hata:`, err);

                // Hata yakalanırsa da o OE numarasını reTry listesine ekle
                addToRetryList(crossNumber);  // Use the helper function here
            }
        });
    }
});
