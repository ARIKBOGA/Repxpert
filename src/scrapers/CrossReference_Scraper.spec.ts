import { test } from '@playwright/test';
import { readProductReferencesFromExcel, ProductReference } from '../utils/ScraperHelpers';
import ConfigReader from '../utils/ConfigReader';
import * as fs from 'fs';
import * as path from 'path';
import { getSubfolderNamesSync, balata_katalog_full } from '../utils/FileHelpers';

// Çiftleri temsil eden arayüz
interface StringPair {
    maker: string;
    crossNumber: string;
}


// Çalışılacak ürün tipini seç
const productType = ConfigReader.getEnvVariable("PRODUCT_TYPE");

// Ürün tipine karşılık gelen Excel dosyasından katalog bilgilerini oku
const references : ProductReference[] = readProductReferencesFromExcel(productType);
//const existedFolders = getSubfolderNamesSync(`src/data/Gathered_Informations/${productType}/CrossNumbers/YV_CODES`);

test.describe('YV NO ve Textar kodları ile Cross Numbers tarayıcı', () => {

    for (const ref of references) {
        const yvNo = ref.yvNo;
        const brandRefs = ref.brandRefs;
        const searchBrand = 'ICER';
        const refBrand = brandRefs[searchBrand]; // Brand değerini brandRefs objesinden alıyoruz. Excel'deki sütun adı TEXTAR / ICER vb.

        if (refBrand === undefined || refBrand === null || refBrand.trim() === '') {
            //console.log(`YV No: ${yvNo} için geçerli bir referans kodu bulunamadı.`);
            continue; // Geçerli bir referans kodu yoksa döngüden çık
        }

        let refs: string[] = [];
        if (refBrand.includes(",")) {
            refs = refBrand.split(",");
        } else {
            refs[0] = refBrand.trim();
        }

        for (const ref of refs) {
            test(`${yvNo} / ${searchBrand} - ${ref} koduyla veri topla`, async ({ page }) => {

                await page.goto(ConfigReader.getEnvVariable("CROSS_NUMBERS_URL"));
                await page.waitForLoadState("domcontentloaded")

                await page.getByText('&amp;lt;br /&amp;gt;&amp;lt;p').contentFrame().getByRole('link', { name: 'Cross reference' }).click();
                await page.waitForLoadState("domcontentloaded");

                await page.getByText('&amp;lt;br /&amp;gt;&amp;lt;p').contentFrame().getByRole('textbox', { name: 'Cross reference' }).fill(ref);
                await page.getByText('&amp;lt;br /&amp;gt;&amp;lt;p').contentFrame().getByRole('button', { name: 'Filter' }).click();
                await page.waitForLoadState('networkidle')
                await page.waitForTimeout(2000);

                // iframe e gir
                const iframe = page.frameLocator('#frmCatalogo');

                // Birden fazla ürün çıksa dahi aranan kodun bulunduğu ilk ürünü seç
                const productLink = iframe.locator("//h3/a");
                if (await productLink.count() > 0) { // Check if at least one product link exists
                    // Always click the first one, whether there's one or many
                    await productLink.first().click();
                    await page.waitForTimeout(1500);
                } else {
                    // Handle the case where no product links are found, e.g., log a warning or throw an error
                    console.warn(`No product link found for the reference: ${searchBrand} - ${ref}`);
                }

                await page.waitForLoadState('networkidle')
                const productTitlePromise = iframe.locator('//h2').nth(1).textContent() || 'Unknown Product';
                let productTitle = await productTitlePromise;
                if (!productTitle) {
                    productTitle = 'Unknown Product';
                }

                const makerElements = iframe.locator("//div[@id='referenciasOtras']//tr/td[1]").allTextContents();
                const crossNumbersElements = iframe.locator("//div[@id='referenciasOtras']//tr/td[2]").allInnerTexts();

                const makers = (await makerElements).map((element) => {
                    return element.trim();
                });
                const crossNumbers = (await crossNumbersElements).map((element) => {
                    return element.trim();
                });

                const stringPairs: StringPair[] = []; // StringPair[] dizisi oluşturduk

                for (let i = 0; i < makers.length; i++) {
                    const maker = makers[i];
                    const crossNumber = crossNumbers[i];
                    const existingPair = stringPairs.find(pair => pair.maker === maker && pair.crossNumber === crossNumber);
                    if (!existingPair) {
                        stringPairs.push({ maker, crossNumber });
                    }
                }

                const productId = productTitle.replace('Product', '').trim();

                const product: any = {
                    yvNo: yvNo,
                    id: productId,
                    Brand_Reference: ref,
                    crossNumbers: stringPairs,
                }

                // Klasör yolunu oluştur
                const dirPath = path.resolve(`src/data/Gathered_Informations/${productType}/CrossNumbers/YV_CODES/${yvNo}`);

                // Klasör yoksa oluştur
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true }); // recursive: true ile iç içe klasörler oluşturulabilir
                    //console.log(`Klasör oluşturuldu: ${dirPath}`);
                }

                // Dosya adını ve yolunu oluştur
                const fileName = `ICER_${productId}.json`;
                const filePath = path.join(dirPath, fileName);

                // JSON dosyasını kaydet
                const jsonData = JSON.stringify(product, null, 2);
                fs.writeFileSync(filePath, jsonData, 'utf-8');
                console.log(`✅ JSON dosyası kaydedildi: ${filePath}`);
            });
        }

    }
});


test.describe('Cross Reference Scraper', () => {
    test('Cross Reference Scraper', async ({ page }) => {
        await page.goto(ConfigReader.getEnvVariable("CROSS_NUMBERS_URL"));
        await page.waitForLoadState("domcontentloaded")
    });
});