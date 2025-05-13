import { test } from '@playwright/test';
import { mapToSerializableObject, readProductReferencesFromExcel } from '../utils/ScraperHelpers';
import { getMultipleTexts } from '../utils/extractHelpers';
import * as fs from 'fs';
import * as path from 'path';

// Çiftleri temsil eden arayüz
interface StringPair {
    maker: string;
    crossNumber: string;
}

// Yardımcı fonksiyon: StringPair nesnelerini içeren Set'i JSON.stringify ile kullanılabilir bir nesneye dönüştürür
function setToSerializableObject(set: Set<StringPair>) {
    return Array.from(set);
}

const refrences = readProductReferencesFromExcel();

test.describe('YV NO ve Textar kodları ile Cross Numbers tarayıcı', () => {

    for (const ref of refrences) {
        const yvNo = ref.yvNo;
        const brandRefs = ref.brandRefs;
        const textarNo = brandRefs['TEXTAR']; // Textar değerini brandRefs objesinden alıyoruz.

        test(`${yvNo} / ${textarNo} koduyla veri topla`, async ({ page }) => {

            await page.goto('https://www.icerbrakes.com/en/Catalogue');

            await page.waitForLoadState('networkidle')
            await page.getByRole('button', { name: 'Accept Recommended Settings' }).click();

            await page.waitForLoadState('networkidle')
            await page.getByText('&amp;lt;br /&amp;gt;&amp;lt;p').contentFrame().getByRole('link', { name: 'Cross reference' }).click();

            await page.waitForLoadState('networkidle')
            await page.getByText('&amp;lt;br /&amp;gt;&amp;lt;p').contentFrame().getByRole('textbox', { name: 'Cross reference' }).fill(textarNo);
            await page.getByText('&amp;lt;br /&amp;gt;&amp;lt;p').contentFrame().getByRole('button', { name: 'Filter' }).click();

            await page.waitForLoadState('domcontentloaded')

            // iframe e gir
            const iframe = page.frameLocator('#frmCatalogo');
            const seeMoreInfoLink = iframe.locator("//a[.='See more info']");
            await seeMoreInfoLink.click();

            await page.waitForLoadState('domcontentloaded')
            const othersLink = iframe.locator("//a[.='Others']");
            await othersLink.click();


            await page.waitForLoadState('domcontentloaded')
            const productTitlePromise = iframe.locator('//h2').nth(1).textContent() || 'Unknown Product';
            let productTitle = await productTitlePromise;
            if (!productTitle) {
                productTitle = 'Unknown Product';
            }

            const makersPromise = getMultipleTexts(iframe.locator("//div[@id='referenciasOtras']//tr/td[1]"));
            const crossNumbersPromise = getMultipleTexts(iframe.locator("//div[@id='referenciasOtras']//tr/td[2]"));

            const makers = await makersPromise;
            const crossNumbers = await crossNumbersPromise;

            const crossNumbersSet = new Set<string>(); // StringPair yerine string saklayacağız
            const stringPairs: StringPair[] = []; // StringPair[] dizisi oluşturduk

            for (let i = 0; i < makers.length; i++) {
                const maker = makers[i].trim();
                const crossNumberArray = crossNumbers[i].split(',').map(crossNumber => crossNumber.trim());

                for (const number of crossNumberArray) {
                    const pairString = JSON.stringify({ maker, crossNumber: number }); // Çifti stringe dönüştür
                    if (!crossNumbersSet.has(pairString)) { // String yoksa ekle
                        crossNumbersSet.add(pairString);
                        stringPairs.push({ maker, crossNumber: number }); // stringPairs dizisine de ekle
                    }
                }
            }

            const crossNumbersMapSerializable = setToSerializableObject(new Set(stringPairs)); // stringPairs Set'e dönüştürülerek gönderildi
            const productId = productTitle.replace('Product', '').trim();

            const product: any = {
                yvNo: yvNo,
                id: productId,
                Reference: textarNo,
                crossNumbers: crossNumbersMapSerializable,
            }

            // Klasör yolunu oluştur
            const dirPath = path.resolve(`src/data/Gathered_Informations/Pads/CrossNumbers/${yvNo}`);

            // Klasör yoksa oluştur
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true }); // recursive: true ile iç içe klasörler oluşturulabilir
                console.log(`Klasör oluşturuldu: ${dirPath}`);
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
