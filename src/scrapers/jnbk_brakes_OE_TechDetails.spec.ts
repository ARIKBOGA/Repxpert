import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import ConfigReader from '../utils/ConfigReader';
import { addToRetryList } from '../utils/extractHelpers';

// JSON dosyasından OE numaralarını oku
const oePath = path.resolve(__dirname, '../data/Gathered_Informations/Discs/Resources/references_of_discs.json');
const oeNumbers: string[] = JSON.parse(fs.readFileSync(oePath, 'utf-8'));

test.describe('JNBK Brakes OE Tech Details', () => {
    for (const oe of oeNumbers) {
        // Her test için yeni bir sayfa açılır, böylece her test birbirinden bağımsız çalışır
        //const filterBrand = ConfigReader.getEnvVariable('FILTER_BRAND_TECH_DETAIL');

        test(`${oe} no ile ürünün teknik detaylarını al`, async ({ page }) => {
            try {

                // Search results sayfasına git
                await page.goto(process.env.JNKB_BRAKES_URL as string);
                await page.waitForLoadState('domcontentloaded');
                await page.waitForTimeout(1000); // Sayfanın yüklenmesini bekle
                await page.getByRole('textbox', { name: 'Enter OEM, NiBK, WVA, FMSI or' }).waitFor(); // Arama çubuğunun yüklendiğinden emin olmak için bekle
                const searchInput = page.getByRole('textbox', { name: 'Enter OEM, NiBK, WVA, FMSI or' });
                await searchInput.fill(oe); // OE numarasını arama çubuğuna yaz
                await page.getByRole('button', { name: 'Search' }).click(); // Arama butonuna tıkla

                await page.pause(); // Arama sonuçlarının yüklenmesini bekle


                await page.waitForTimeout(1000); // Arama sonuçlarının yüklenmesini bekle
                await page.waitForLoadState('domcontentloaded'); // Sayfanın yüklenmesini bekle
                await page.locator('#divImgCrossSpec').getByText('Specification').waitFor(); // Ürün detaylarının yüklendiğinden emin olmak için bekle

                console.log(`🔍 ${oe} için ürünü işliyor...`);

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
                const crossReferenceMap = new Map<string, string>();

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


                // Her iki map i de JSON formatında dosyaya yaz
                const dirPath = path.resolve(__dirname, `../data/Gathered_Informations/Discs/Technical_Details/${oe}`);
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true }); // klasörü oluştur
                }
                const outputPath = path.resolve(dirPath, `${productID}.json`);

                const outputData = {
                    oe: oe,
                    productID: productID,
                    productType: productType,
                    specifications: Object.fromEntries(specificationMap),
                    crossReferences: crossReferencePairs, // artık dizi objesi
                };

                fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');

                console.log(`✅ ${oe} için ürün detayları başarıyla alındı ve ${outputPath} dosyasına yazıldı.`);

            } catch (err) {
                console.error(`❌ ${oe} için hata:`, err);

                // Hata yakalanırsa da o OE numarasını reTry listesine ekle
                addToRetryList(oe);  // Use the helper function here
            }
        });
    }
});
