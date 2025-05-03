import { Locator, Page } from "playwright"; // Playwright Page tipi, gerektiğinde import edin
import ConfigReader from "./ConfigReader";

export async function goToSearchResults(
  page: Page,
  oe: string,
  filterBrand: string,
  retryList: string[],
  addToRetryList: (oe: string) => void
): Promise<Locator[] | null> {
  await page.goto(ConfigReader.getEnvVariable("REPXPERT_URL") || "");
  await page.getByRole("textbox", { name: /OE numarası/i }).fill(oe);
  await page.getByRole("textbox", { name: /OE numarası/i }).press("Enter");

  await page
    .getByRole("combobox", { name: /Markalar/i })
    .fill(filterBrand.toLowerCase() || "");
  await page
    .getByRole("checkbox", { name: new RegExp(filterBrand, "i") })
    .first()
    .click();
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
