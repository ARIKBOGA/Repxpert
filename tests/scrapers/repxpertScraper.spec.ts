import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { getTextContent, getMultipleTexts } from '../utils/extractHelpers';
import ConfigReader from '../utils/ConfigReader';
import { Product } from '../../types/Product';
import { Dimensions } from '../../types/Dimensions';

// JSON dosyasından OE numaralarını oku

const oePath = path.resolve(__dirname, '../../data/oe-references.json');
const oeNumbers: string[] = JSON.parse(fs.readFileSync(oePath, 'utf-8'));

test.describe('REPXPERT TRW ürünleri', () => {
  for (const oe of oeNumbers) {
    test(`OE No: ${oe} ile TRW ürünlerini al`, async ({ page }) => {
      try {
        await page.goto(ConfigReader.getEnvVariable('REPXPERT_URL') || '');
        await page.getByRole('button', { name: 'Tüm Tanımlama Bilgilerini' }).click();
        await page.getByRole('link', { name: 'Oturum Aç | Kaydol' }).click();
        await page.getByRole('textbox', { name: 'E-posta adresi' }).fill(ConfigReader.getEnvVariable('REPXPERT_EMAIL') || '');
        await page.getByRole('textbox', { name: 'Şifre' }).fill(ConfigReader.getEnvVariable('REPXPERT_PASSWORD') || '');
        await page.getByRole('button', { name: 'Oturum Açın' }).click();

        await page.getByRole('textbox', { name: /OE numarası/i }).fill(oe);
        await page.getByRole('textbox', { name: /OE numarası/i }).press('Enter');

        await page.getByRole('combobox', { name: /Markalar/i }).fill('trw');

        await page.getByRole('checkbox', { name: /TRW/i }).click();
        await page.waitForTimeout(2000);
        const productLinks = await page.getByRole('link', { name: /TRW/ }).all();

        if (productLinks.length === 0) {
          console.warn(`⚠️ '${oe}' için TRW ürünü bulunamadı.`);
          return;
        }

        for (let i = 0; i < productLinks.length; i++) {
          console.log(`🔍 ${oe} için ${i + 1}. ürünü işliyor...`);
          if(i > 0) {
            await page.goBack();
          }
          await Promise.all([
            page.waitForLoadState('domcontentloaded'),
            page.waitForTimeout(3000),
            productLinks[i].click(),
          ]);

          const productTitle = (await getTextContent(page.locator('.h1').nth(0))) || 'Unknown Product';
          const productId = productTitle.split(' ')[1] || `TRW_${i}`;
          const productName = (await getTextContent(page.locator('.article-number>div'))) || 'Unknown Name';
          const eanNumber = await getTextContent(page.locator('.ean-value'));
          const usageNumbers = await getMultipleTexts(page.locator('.tradeNumbers-value > span'));
          const oeNumbers = await getMultipleTexts(page.locator('.mat-mdc-list-item-unscoped-content'));

          const dimensions: Dimensions = {
            manufacturerRestriction: await getTextContent(page.locator("(//*[.='Üretici kısıtlaması']/following-sibling::dd)[1]/span")),
            width: await getTextContent(page.locator("(//*[contains(text(), 'Genişlik')]/following-sibling::dd)[1]/span")),
            height: await getTextContent(page.locator("(//*[contains(text(), 'Yükseklik')]/following-sibling::dd)[1]/span")),
            thickness: await getTextContent(page.locator("(//*[contains(text(), 'Kalınlık')]/following-sibling::dd)[1]/span")),
            checkmark: await getTextContent(page.locator("(//*[.='Kontrol işareti']/following-sibling::dd)[1]/span")),
            SVHC: await getTextContent(page.locator("(//*[.='SVHC']/following-sibling::dd)[1]/span")),
          };

          const product: Product = {
            id: productId,
            name: productName,
            brand: 'TRW',
            usageNumbers,
            oeNumbers,
            eanNumber,
            dimensions,
          };

          const folderPath = path.join('data', `${product.brand}_${oe}`);
          if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

          const fileName = `TRW_${productId}.json`;
          const filePath = path.join(folderPath, fileName);

          fs.writeFileSync(filePath, JSON.stringify(product, null, 2), 'utf-8');
          console.log(`✅ ${oe} için ${fileName} kaydedildi.`);
        }
      } catch (err) {
        console.error(`❌ ${oe} için hata:`, err);
      }
    });
  }
});
