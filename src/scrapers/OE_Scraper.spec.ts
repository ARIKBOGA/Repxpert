import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { getTextContent, getMultipleTexts } from '../utils/extractHelpers';
import { addToRetryList, getDimensionValuesSmart } from '../utils/extractHelpers'; 
import ConfigReader from '../utils/ConfigReader';
import { Product } from '../types/Product';
import { Dimensions } from '../types/Dimensions';
import {readJsonFile, retryListFilePath} from '../utils/FileHelpers';
import { goToSearchResults } from '../utils/ScraperHelpers';

// JSON dosyasından OE numaralarını oku
const oePath = path.resolve(__dirname, '../data/Configs/search_references.json');
const oeNumbers: string[] = JSON.parse(fs.readFileSync(oePath, 'utf-8'));

// reTry.json'u oku veya boş bir array oluştur
let retryList = readJsonFile<string[]>(retryListFilePath, []);



test.describe('REPXPERT ürünleri', () => {

  for (const oe of oeNumbers) {
    // Her test için yeni bir sayfa açılır, böylece her test birbirinden bağımsız çalışır
    const filterBrand = ConfigReader.getEnvVariable('FILTER_BRAND_TECH_DETAIL');

    test(`${oe} no ile ${filterBrand} ürünün teknik detaylarını al`, async ({ page }) => {
      try {
        // Search results sayfasına git
        const productLinks = await goToSearchResults(page, oe, filterBrand, retryList, addToRetryList);
        if (!productLinks) return; // ürün yoksa işlemi kes

        for (let i = 0; i < productLinks.length; i++) {
          console.log(`🔍 ${oe} için ${i + 1}. ürünü işliyor...`);
          if (i > 0) {
            await page.goBack();
            await page.waitForLoadState('domcontentloaded');
            await page.waitForSelector(`text=${filterBrand}`); // Ürün listesi döndüğünde TRW yazısı görünür olacak
          }
          
          await Promise.all([
            page.waitForLoadState('domcontentloaded'),
            page.waitForSelector('.h1'), // Ürün detay sayfasında başlık gelmeden işleme geçme
            productLinks[i].click(),
          ]);
          

          const productTitle = (await getTextContent(page.locator('.h1').nth(0))) || 'Unknown Product';
          const productId = productTitle.split(' ')[1] || `${filterBrand}_${i}`;
          const productName = (await getTextContent(page.locator('.article-number>div'))) || 'Unknown Name';
          const eanNumber = await getTextContent(page.locator('.ean-value'));
          const wvaNumbers = await getMultipleTexts(page.locator('.tradeNumbers-value > span'));
          const oeNumbers = await getMultipleTexts(page.locator('.mat-mdc-list-item-unscoped-content'));

          const widthValues = await getDimensionValuesSmart(page, ['Genişlik', 'Uzunluk']);
          const heightValues = await getDimensionValuesSmart(page, ['Yükseklik']);
          const thicknessValues = await getDimensionValuesSmart(page, ['Kalınlık']); // sadece gerekiyorsa

          const dimensions: Dimensions = {
            width1: widthValues[0] ?? null,
            width2: widthValues[1] ?? null,
            height1: heightValues[0] ?? null,
            height2: heightValues[1] ?? null,
            thickness1: thicknessValues[0] ?? null,
            thickness2: thicknessValues[1] ?? null,
            manufacturerRestriction: await getTextContent(page.locator("(//*[.='Üretici kısıtlaması']/following-sibling::dd)[1]/span")),
            checkmark: await getTextContent(page.locator("(//*[.='Kontrol işareti']/following-sibling::dd)[1]/span")),
            SVHC: await getTextContent(page.locator("(//*[.='SVHC']/following-sibling::dd)[1]/span")),
          };


          const product: Product = {
            reference_OE: oe,
            id: productId,
            name: productName,
            brand: productTitle.split(' ')[0],
            wvaNumbers: wvaNumbers,
            oeNumbers,
            eanNumber,
            dimensions,
          };

          const brandFolderPath = path.join('data', product.brand || 'UnknownBrand');
          if (!fs.existsSync(brandFolderPath)) fs.mkdirSync(brandFolderPath, { recursive: true });

          const oeFolderPath = path.join(brandFolderPath, oe);
          if (!fs.existsSync(oeFolderPath)) fs.mkdirSync(oeFolderPath, { recursive: true });

          const fileName = `${product.brand}_${productId}.json`;
          const filePath = path.join(oeFolderPath, fileName);

          fs.writeFileSync(filePath, JSON.stringify(product, null, 2), 'utf-8');
          console.log(`✅ ${oe} için ${fileName} kaydedildi.`);
        }
      } catch (err) {
        console.error(`❌ ${oe} için hata:`, err);

        // Hata yakalanırsa da o OE numarasını reTry listesine ekle
        addToRetryList(oe);  // Use the helper function here
      }
    });
  }
});
