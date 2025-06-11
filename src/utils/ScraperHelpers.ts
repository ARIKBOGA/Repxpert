import { Locator, Page, test } from "@playwright/test"; // Playwright Page tipi, gerektiğinde import edin
import ConfigReader from "./ConfigReader";
import * as xlsx from 'xlsx';
import * as path from 'path';
import { getDimensionValuesSmart, getTextContent } from "./extractHelpers";
import { ProductAttributes } from "../types/ProductTypes";

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
    .click({ timeout: 5000 });
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
  await page.waitForTimeout(1000);
  await page.getByRole("textbox", { name: /OE number/i }).fill(oe);
  await page.getByRole("textbox", { name: /OE number/i }).press("Enter");

  await page
    .getByRole("combobox", { name: /Brands/i })
    .fill(filterBrand || "");
  await page
    .getByRole("checkbox", { name: new RegExp(filterBrand, "i") })
    .first()
    .click({ timeout: 5000 });
  await page.waitForTimeout(1000);

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

// pad attributes
type AttributeFetcher = (page: Page) => Promise<{ [key: string]: any }>;

const attributeFetchers: Record<string, AttributeFetcher> = {
  Pad: async (page: Page): Promise<{ [key: string]: any; }> => {
    return {
      width1: (await getDimensionValuesSmart(page, ['Genişlik', 'Uzunluk']))[0] ?? null,
      width2: (await getDimensionValuesSmart(page, ['Genişlik', 'Uzunluk']))[1] ?? null,
      height1: (await getDimensionValuesSmart(page, ['Yükseklik']))[0] ?? null,
      height2: (await getDimensionValuesSmart(page, ['Yükseklik']))[1] ?? null,
      thickness1: (await getDimensionValuesSmart(page, ['Kalınlık']))[0] ?? null,
      thickness2: (await getDimensionValuesSmart(page, ['Kalınlık']))[1] ?? null,
      wvaNumber: await getDimensionValuesSmart(page, ['WVA numarası']),
      Quality: await getDimensionValuesSmart(page, ['Kalite']),
      AxleVersion: await getDimensionValuesSmart(page, ['Aks modeli']),
      BrakeSystem: await getDimensionValuesSmart(page, ['Fren sistemi', 'Fren tertibatı']),
      manufacturerRestriction: await getTextContent(page.locator("(//*[.='Üretici kısıtlaması']/following-sibling::dd)[1]/span")),
      checkmark: await getTextContent(page.locator("(//*[.='Kontrol işareti']/following-sibling::dd)[1]/span")),
      SVHC: await getTextContent(page.locator("(//*[.='SVHC']/following-sibling::dd)[1]/span")),
      Weight: await getDimensionValuesSmart(page, ['Ağırlık']),
    }

  },
  Disc: async (page: Page): Promise<{ [key: string]: any; }> => {
    return {
      Type: await getDimensionValuesSmart(page, ['Fren diski türü']),
      ThicknessValues: await getDimensionValuesSmart(page, ['Fren diski kalınlığı']),
      MinimumThicknessValues: await getDimensionValuesSmart(page, ['Asgari kalınlık']),
      Surface: await getDimensionValuesSmart(page, ['Üst yüzey']),
      HeightValues: await getDimensionValuesSmart(page, ['Yükseklik']),
      InnerDiameter: await getDimensionValuesSmart(page, ['İç çap']),
      OuterDiameter: await getDimensionValuesSmart(page, ['Dış çap']),
      BoltHoleCircle: await getDimensionValuesSmart(page, ['Delik çemberi']),
      NumberOfHoles: await getDimensionValuesSmart(page, ['Delik sayısı']),
      AxleVersion: await getDimensionValuesSmart(page, ['Aks modeli']),
      TechnicalInformationNumber: await getDimensionValuesSmart(page, ['Teknik bilgi numarası']),
      TestMark: await getDimensionValuesSmart(page, ['Kontrol işareti']),
      Diameter: await getDimensionValuesSmart(page, ['Çap']),
      Thickness: await getDimensionValuesSmart(page, ['Kalınlık/Kuvvet']),
      SupplementaryInfo: await getDimensionValuesSmart(page, ['İlave Ürün/Bilgi']),
      CenteringDiameter: await getDimensionValuesSmart(page, ['Merkezleme çapı']),
      HoleArrangement_HoleNumber: await getDimensionValuesSmart(page, ['Delik şekli/Delik sayısı']),
      WheelBoltBoreDiameter: await getDimensionValuesSmart(page, ['Bijon deliği çapı']),
      Machining: await getDimensionValuesSmart(page, ['İşleme']),
      TighteningTorque: await getDimensionValuesSmart(page, ['Sıkma torku']),
      Weight: await getDimensionValuesSmart(page, ['Ağırlık']),
      Color: await getDimensionValuesSmart(page, ['Renk']),
      ThreadSize: await getDimensionValuesSmart(page, ['Dişli ölçüsü']),
    }
  },
  Crankshaft: async (page: Page): Promise<{ [key: string]: any; }> => {
    return {
      BoltHoleCircle: await getDimensionValuesSmart(page, ['Delik çemberi']),
      NumberOfGrooves: await getDimensionValuesSmart(page, ['Olukların sayısı']),
      Diameter: await getDimensionValuesSmart(page, ['Çap']),
      InnerDiameter_1: await getDimensionValuesSmart(page, ['İç Çap 1']),
      InnerDiameter_2: await getDimensionValuesSmart(page, ['İç Çap 2']),
      KaburgaSayisi: await getDimensionValuesSmart(page, ['Kaburga sayısı']),
      SupplementaryInfo: await getDimensionValuesSmart(page, ['İlave Ürün/Bilgi']),
      OuterDiameter: await getDimensionValuesSmart(page, ['Dış çap']),
      Parameter: await getDimensionValuesSmart(page, ['Parametre']),
      VehicleEquipment: await getDimensionValuesSmart(page, ['Araç donanımı']),
      Thickness: await getDimensionValuesSmart(page, ['Kalınlık/Kuvvet']),
      Weight: await getDimensionValuesSmart(page, ['Ağırlık [kg]']),
      Color: await getDimensionValuesSmart(page, ['Renk']),
    }
  }
};

export async function getAtrributes(page: Page, productType: string): Promise<{ [key: string]: any }> {
  const fetcher = attributeFetchers[productType];
  if (!fetcher) {
    throw new Error(`Unsupported product type: ${productType}`);
  }
  return fetcher(page);
}
