// src/scrapers/repxpertScraper.ts

import { test } from '@playwright/test';
import * as fs from 'fs';
import { Product } from '../../types/Product';
import { Dimensions } from '../../types/Dimensions';
import { getTextContent, getMultipleTexts } from '../utils/extractHelpers';

test('REPXPERT ürün bilgisi çekme', async ({ page }) => {
  await page.goto('https://www.repxpert.com.tr/tr');
  await page.getByRole('button', { name: 'Tüm Tanımlama Bilgilerini' }).click();
  await page.getByRole('link', { name: 'Oturum Aç | Kaydol' }).click();

  await page.getByRole('textbox', { name: 'E-posta adresi' }).fill('barikboga42@gmail.com');
  await page.getByRole('textbox', { name: 'Şifre' }).fill('92CJ68XwD@z+x7b');
  await page.getByRole('button', { name: 'Oturum Açın' }).click();

  // OE numarası arama
  await page.getByRole('textbox', { name: /OE numarası/i }).click();
  await page.getByRole('textbox', { name: /OE numarası/i }).fill('2K5 698 451');
  await page.getByRole('textbox', { name: /OE numarası/i }).press('Enter');

  // Marka seçimi
  await page.getByRole('combobox', { name: /Markalar/i }).click();
  await page.getByRole('combobox', { name: /Markalar/i }).fill('trw');
  await page.getByText('TRW', { exact: true }).click();

  await page.pause();

  const productTitle = (await getTextContent(page.locator('.h1').nth(0))) || 'Unknown Product';
  const productId = productTitle.split(' ')[1] || 'UnknownID';

  const productName = (await getTextContent(page.locator('.article-number>div'))) || 'Unknown Name';
  const eanNumber = await getTextContent(page.locator('.ean-value'));

  const usageNumbers = await getMultipleTexts(page.locator('.tradeNumbers-value > span'));
  const oeNumbers = await getMultipleTexts(page.locator('.mat-mdc-list-item-unscoped-content'));

  const dimensions: Dimensions = {
    manufacturerRestriction: await getTextContent(page.locator("(//*[.='Üretici kısıtlaması']/following-sibling::dd)[1]/span")),
    width: await getTextContent(page.locator("(//*[.='Genişlik [mm]']/following-sibling::dd)[1]/span")),
    height: await getTextContent(page.locator("(//*[.='Yükseklik [mm]']/following-sibling::dd)[1]/span")),
    thickness: await getTextContent(page.locator("(//*[.='Kalınlık/Kuvvet [mm]']/following-sibling::dd)[1]/span")),
    checkmark: await getTextContent(page.locator("(//*[.='Kontrol işareti']/following-sibling::dd)[1]/span")),
    SVHC: await getTextContent(page.locator("(//*[.='SVHC']/following-sibling::dd)[1]/span"))
  };

  const product: Product = {
    id: productId,
    name: productName,
    brand: 'TRW',
    usageNumbers,
    oeNumbers,
    eanNumber,
    dimensions
  };

  const fileName = `${productId}_${productName.replace(/\s+/g, '_')}.json`;
  fs.writeFile(`./data/${fileName}`, JSON.stringify(product, null, 2), (err) => {
    if (err) {
      console.error('Dosya yazma hatası:', err);
    } else {
      console.log(`✅ Ürün bilgileri "${fileName}" dosyasına kaydedildi.`);
    }
  });
});
