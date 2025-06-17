import { Page, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { Product, ProductAttributes } from '../types/ProductTypes';
import { getSubfolderNamesSync, readJsonFile, retryListFilePath, padPairs, discPairs, crankshaftPairs, crankshaftTrios, padTrios } from '../utils/FileHelpers';
import { getTextContent, getMultipleTexts, addToRetryList, getDimensionValuesSmart } from '../utils/extractHelpers';
import { goToSearchResults, mapToSerializableObject, readProductReferencesFromExcel, getAttrributes, goToSearchResultsEnglish, readProductReferencesTrio } from '../utils/ScraperHelpers';

// Çalışılacak ürün tipini seç
const productType = process.env.PRODUCT_TYPE as string; // Örnek: 'Pads', 'Discs', 'Drums' vb.
const filterBrand = process.env.FILTER_BRAND_APPLICATION as string;

// reTry.json'u oku veya boş bir array oluştur
let retryList = readJsonFile<string[]>(retryListFilePath, []);

const references = readProductReferencesTrio();
const existedFolders = getSubfolderNamesSync(`src/data/Gathered_Informations/${productType}/Technical_Details/YV_CODES`);

test.describe('YV NO ve Marka bazlı teknik veri tarayıcı', async () => {

  Array.from(padTrios)
    //.filter(ref => { return ref.supplier.toUpperCase() === filterBrand.toUpperCase(); })    // Marka filtrelemesi excelden okumada kullanılacak
    .forEach(ref => {

      const {yvNo, supplier, crossNumber} =ref;

      test(`${yvNo} / ${crossNumber} koduyla veri topla`, async ({ page }) => {
        const filterBrand = supplier.toUpperCase();
        try {
          // Search results sayfasına git
          const productLinks = await goToSearchResults(page, crossNumber, filterBrand, retryList, addToRetryList);
          if (!productLinks) return; // ürün yoksa işlemi kes

          console.log(`🔍 ${crossNumber} için ürün işleniyor...`);

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

          const attributes = await getAttrributes(page)

          const product: Product = {
            reference: crossNumber,
            id: productId,
            name: productName,
            brand: productTitle.split(' ')[0],
            wvaNumbers: wvaNumbers,
            //oeNumbers,
            brand_oe_map: brand_oe_map_serializable,
            eanNumber: eanNumber,
            attributes: attributes as ProductAttributes,
          };

          const basePath = path.join('src', 'data', 'Gathered_Informations', productType, 'Technical_Details', "YV_CODES", yvNo);
          if (!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true });

          const fileName = `${supplier}_${crossNumber}.json`;
          const filePath = path.join(basePath, fileName);
          fs.writeFileSync(filePath, JSON.stringify(product, null, 2), 'utf-8');

          console.log(`✅ ${supplier} - ${crossNumber} kaydedildi (${filePath})`);

        } catch (err) {
          console.error(`❌ Hata - ${yvNo} / ${supplier} / ${crossNumber}`, err);

          // Hata yakalanırsa da o OE numarasını reTry listesine ekle
          addToRetryList(crossNumber);  // Use the helper function here
        }
      });
    });




});

// Gruplu oe ler: //*[starts-with(@id,'cdk-accordion-child-0')]//span[@class='mat-mdc-list-item-unscoped-content mdc-list-item__primary-text']