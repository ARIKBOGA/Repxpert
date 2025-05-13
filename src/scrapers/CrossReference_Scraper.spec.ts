import { test } from '@playwright/test';
import { readProductReferencesFromExcel } from '../utils/ScraperHelpers';
import ConfigReader  from '../utils/ConfigReader';
import * as fs from 'fs';
import * as path from 'path';

// Çiftleri temsil eden arayüz
interface StringPair {
    maker: string;
    crossNumber: string;
}

const refrences = readProductReferencesFromExcel();

test.describe('YV NO ve Textar kodları ile Cross Numbers tarayıcı', () => {

    for (const ref of refrences) {
        const yvNo = ref.yvNo;
        const brandRefs = ref.brandRefs;
        const refBrand = brandRefs['TEXTAR']; // Brand değerini brandRefs objesinden alıyoruz. Excel'deki sütun adı TEXTAR / ICER vb.

        if(refBrand === undefined || refBrand === null || refBrand.trim() === '') {
            //console.log(`YV No: ${yvNo} için geçerli bir referans kodu bulunamadı.`);
            continue; // Geçerli bir referans kodu yoksa döngüden çık
        }

        test(`${yvNo} / ${refBrand} koduyla veri topla`, async ({ page }) => {

            await page.goto(ConfigReader.getEnvVariable("CROSS_NUMBERS_URL"));

            await page.waitForLoadState('networkidle')
            await page.getByRole('button', { name: 'Accept Recommended Settings' }).click();

            await page.waitForLoadState('networkidle')
            await page.getByText('&amp;lt;br /&amp;gt;&amp;lt;p').contentFrame().getByRole('link', { name: 'Cross reference' }).click();

            await page.waitForLoadState('networkidle')
            await page.getByText('&amp;lt;br /&amp;gt;&amp;lt;p').contentFrame().getByRole('textbox', { name: 'Cross reference' }).fill(refBrand);
            await page.getByText('&amp;lt;br /&amp;gt;&amp;lt;p').contentFrame().getByRole('button', { name: 'Filter' }).click();

            
            // iframe e gir
            await page.waitForLoadState('domcontentloaded')
            const iframe = page.frameLocator('#frmCatalogo');

            // Birden fazla ürün çıksa dahi aranan kodun bulunduğu ilk ürünü seç
            const productLink = iframe.locator("//h3/a");
            await productLink.click();
        


            await page.waitForLoadState('domcontentloaded')
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
                Brand_Reference: refBrand,
                crossNumbers: stringPairs,
            }

            // Klasör yolunu oluştur
            const dirPath = path.resolve(`src/data/Gathered_Informations/Pads/CrossNumbers/YV_CODES/${yvNo}`);

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
            console.log(`JSON dosyası kaydedildi: ${filePath}`);
        });

    }
});
