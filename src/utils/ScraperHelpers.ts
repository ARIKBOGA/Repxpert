import { Locator, Page, test } from "@playwright/test"; // Playwright Page tipi, gerektiğinde import edin
import ConfigReader from "./ConfigReader";
import * as xlsx from 'xlsx';
import * as path from 'path';

// Gerekli ortam degiskenlerini oku
// const productType = ConfigReader.getEnvVariable("PRODUCT_TYPE");


export async function goToSearchResults(
  page: Page,
  oe: string,
  filterBrand: string,
  retryList: string[],
  addToRetryList: (oe: string) => void
): Promise<Locator[] | null> {
  await page.goto(process.env.REPXPERT_URL as string);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.getByRole("textbox", { name: /OE numarası/i }).fill(oe);
  await page.getByRole("textbox", { name: /OE numarası/i }).press("Enter");

  await page
    .getByRole("combobox", { name: /Markalar/i })
    .fill(filterBrand || "");
  await page
    .getByRole("checkbox", { name: new RegExp(filterBrand, "i") })
    .first()
    .click({timeout: 5000});
  await page.waitForTimeout(2000);

  const productLinks = await page
    .getByRole("link", { name: new RegExp(filterBrand, "i") })
    .all();

  if (productLinks.length === 0) {
    console.warn(`⚠️ '${oe}' için ${filterBrand} ürünü bulunamadı.`);
    if (!retryList.includes(oe)) {
      addToRetryList(oe);
    }
    return null; // hiçbir ürün yoksa null dön
  }

  return productLinks; // bulunan ürünleri geri dön
}

export async function goToSearchResultsEnglish(
  page: Page,
  oe: string,
  filterBrand: string,
  retryList: string[],
  addToRetryList: (oe: string) => void
): Promise<Locator[] | null> {

  // İngilizce RepXpert sayfasına git
  await page.goto(process.env.REPXPERT_HOME_ENGLISH_URL as string);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.getByRole("textbox", { name: /OE number/i }).fill(oe);
  await page.getByRole("textbox", { name: /OE number/i }).press("Enter");

  await page
    .getByRole("combobox", { name: /Brands/i })
    .fill(filterBrand || "");
  await page
    .getByRole("checkbox", { name: new RegExp(filterBrand, "i") })
    .first()
    .click({timeout: 5000});
  await page.waitForTimeout(2000);

  const productLinks = await page
    .getByRole("link", { name: new RegExp(filterBrand, "i") })
    .all();

  if (productLinks.length === 0) {
    console.warn(`⚠️ '${oe}' için ${filterBrand} ürünü bulunamadı.`);
    if (!retryList.includes(oe)) {
      addToRetryList(oe);
    }
    return null; // hiçbir ürün yoksa null dön
  }

  return productLinks; // bulunan ürünleri geri dön
}

export async function loginEnglishRepxpertPage(page: Page) {
  const url = process.env.REPXPERT_ENGLISH_URL as string;
  const email = process.env.REPXPERT_ENGLISH_EMAIL as string;
  const password = process.env.REPXPERT_ENGLISH_PASSWORD as string;
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.waitForSelector('button:has-text("Accept All Cookies")');

  // Click on the "Accept All Cookies" button
  await page.getByRole('button', { name: 'Accept All Cookies' }).click();
  await page.getByRole('link', { name: 'Login | Register' }).click();
  await page.getByRole('textbox', { name: 'E-Mail Address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForLoadState('domcontentloaded');
}


export function mapToSerializableObject(map: Map<string, Set<string>>): Record<string, string[]> {
  const obj: Record<string, string[]> = {};
  for (const [key, valueSet] of map.entries()) {
    obj[key] = Array.from(valueSet); // Set → Array
  }
  return obj;
}

export interface ProductReference {
  yvNo: string;
  brandRefs: { [brand: string]: string }; // { "BREMBO": "09.1234.56", "TRW": "", ... }
}

export function readProductReferencesFromExcel(productType: string): ProductReference[] {
  if (!productType) {
    throw new Error("productType is undefined. Please provide a valid productType.");
  }
  const excelPath = path.resolve(__dirname, `../data/katalogInfo/excels/${productType}_katalog_full.xlsx`);
  const workbook = xlsx.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

  const references: ProductReference[] = [];

  for (const row of data) {
    const yvNo = row['YV']?.toString()?.trim();
    if (!yvNo) continue;

    const brandRefs: { [brand: string]: string } = {};

    for (const key of Object.keys(row)) {
      if (key !== 'YV') {
        const ref = row[key]?.toString()?.trim();
        if (ref) {
          brandRefs[key] = ref;
        }
      }
    }
    references.push({ yvNo, brandRefs });
  }
  return references;
}

