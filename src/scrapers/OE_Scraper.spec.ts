import { Page, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { Product, ProductAttributes } from '../types/ProductTypes';
import { getSubfolderNamesSync, readJsonFile, retryListFilePath, padPairs, discPairs, crankshaftPairs } from '../utils/FileHelpers';
import { getTextContent, getMultipleTexts, addToRetryList, getDimensionValuesSmart } from '../utils/extractHelpers';
import { goToSearchResults, mapToSerializableObject, readProductReferencesFromExcel } from '../utils/ScraperHelpers';

// Çalışılacak ürün tipini seç
const productType = process.env.PRODUCT_TYPE as string; // Örnek: 'Pads', 'Discs', 'Drums' vb.
const filterBrand = process.env.FILTER_BRAND_APPLICATION as string;

// reTry.json'u oku veya boş bir array oluştur
let retryList = readJsonFile<string[]>(retryListFilePath, []);

const references = readProductReferencesFromExcel(productType);
const existedFolders = getSubfolderNamesSync(`src/data/Gathered_Informations/${productType}/Technical_Details/YV_CODES`);

test.describe('YV NO ve Marka bazlı teknik veri tarayıcı', async () => {

  for (const ref of padPairs) {

    const { yvNo, brandRefs } = ref;
    // yvNo daha önce işlenmişse atla
    if (existedFolders.includes(yvNo)) {
      console.log(`❌ ${yvNo} daha önce işlenmiş, atlanıyor...`);
      continue;
    }
    // Her test için yeni bir sayfa açılır, böylece her test birbirinden bağımsız çalışır
    for (const [brand, productCode] of Object.entries(brandRefs)) {

      const productCodes = productCode
        .split(/,|\s+/)
        .map((code) => code.trim())
        .filter((code) => code !== "");
      for (const productCode of productCodes) {

        //if (yvNo && brand === 'TEXTAR' && productCode.includes(" ")) continue;
        //if (brand === 'BREMBO') continue;

        test(`${yvNo} / ${productCode} koduyla veri topla`, async ({ page }) => {
          const filterBrand = brand.toUpperCase();
          try {
            // Search results sayfasına git
            const productLinks = await goToSearchResults(page, productCode, filterBrand, retryList, addToRetryList);
            if (!productLinks) return; // ürün yoksa işlemi kes

            console.log(`🔍 ${productCode} için ürün işleniyor...`);

            await Promise.all([
              page.waitForTimeout(2000),
              page.waitForLoadState('domcontentloaded'),
              page.waitForSelector('.h1'), // Ürün detay sayfasında başlık gelmeden işleme geçme
              productLinks[0].click(),
            ]);

            const brand_oe_map = new Map<string, Set<string>>();
            const brandsOfOEs = await getMultipleTexts(page.locator("//mat-panel-title"));

            for (let i = 0; i < brandsOfOEs.length; i++) {
              const brand = brandsOfOEs[i].trim();
              const oeArray = await getMultipleTexts(page.locator(`(//mat-list)[${i + 1}]//span[@class='mdc-list-item__content']/span`));
              const oeSet = new Set(oeArray.map(oe => oe.trim()));
              brand_oe_map.set(brand, oeSet);
            }

            const brand_oe_map_serializable = mapToSerializableObject(brand_oe_map);

            const productTitle = (await getTextContent(page.locator('.h1').nth(0))) || 'Unknown Product';
            const productId = productTitle.replace(filterBrand, '').trim();
            const productName = (await getTextContent(page.locator('.article-number>div'))) || 'Unknown Name';
            const eanNumber = await getTextContent(page.locator('.ean-value'));
            const wvaNumbers = await getMultipleTexts(page.locator('.tradeNumbers-value > span'));

            
            

            await page.waitForTimeout(1000); // Sayfanın tam yüklenmesi için bekle
            //await page.pause(); // Sayfayı durdur
            const oeBrands = await getMultipleTexts(page.locator("//mat-panel-title"));
            const brandOeMap: Map<string, Set<string>> = new Map();
            for (let i = 0; i < oeBrands.length; i++) {
              const brand = oeBrands[i]?.trim() || "";
              const oeNumbersOfBrand = await getMultipleTexts(page.locator(`(//mat-panel-title)[${i + 1}]//..//..//following-sibling::div//span[@class='mat-mdc-list-item-unscoped-content']`));
              const oeNumbersSet = new Set(oeNumbersOfBrand.map(oe => oe.trim()));
              for (const oe of oeNumbersSet) {
                console.log(`OE numarası: ${oe}`);
              }
              if (brandOeMap.has(brand)) {
                oeNumbersSet.forEach(oe => brandOeMap.get(brand)?.add(oe));
              } else {
                brandOeMap.set(brand, oeNumbersSet);
              }
            }

            const product: Product = {
              reference: productCode,
              id: productId,
              name: productName,
              brand: productTitle.split(' ')[0],
              wvaNumbers: wvaNumbers,
              //oeNumbers,
              brand_oe_map: brand_oe_map_serializable,
              eanNumber: eanNumber,
              attributes: getAttributes(page, productType), // change it accordingly
            };

            const basePath = path.join('src', 'data', 'Gathered_Informations', productType, 'Technical_Details', "YV_CODES", yvNo);
            if (!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true });

            const fileName = `${brand}_${productCode}.json`;
            const filePath = path.join(basePath, fileName);
            fs.writeFileSync(filePath, JSON.stringify(product, null, 2), 'utf-8');

            console.log(`✅ ${brand} - ${productCode} kaydedildi (${filePath})`);

          } catch (err) {
            console.error(`❌ Hata - ${yvNo} / ${brand} / ${productCode}`, err);

            // Hata yakalanırsa da o OE numarasını reTry listesine ekle
            addToRetryList(productCode);  // Use the helper function here
          }
        });
      }
    }
  }

});

function getAttributes(page: Page, productType: string): ProductAttributes | undefined {
  throw new Error('Function not implemented.');
}
// Gruplu oe ler: //*[starts-with(@id,'cdk-accordion-child-0')]//span[@class='mat-mdc-list-item-unscoped-content mdc-list-item__primary-text']