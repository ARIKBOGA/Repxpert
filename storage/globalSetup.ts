import { Browser, Page, chromium, expect } from "@playwright/test";
import ConfigReader from "../tests/utils/ConfigReader";

async function globalSetup() {
  const browser: Browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page: Page = await context.newPage();
  await page.goto(ConfigReader.getEnvVariable("REPXPERT_URL") || "");
  if (page.getByRole("button", { name: "Tüm Tanımlama Bilgilerini" })) {
    await page.getByRole("button", { name: "Tüm Tanımlama Bilgilerini" }).click();
  }
  await page.getByRole("link", { name: "Oturum Aç | Kaydol" }).click();
  await page.getByRole("textbox", { name: "E-posta adresi" })
    .fill(ConfigReader.getEnvVariable("REPXPERT_EMAIL") || "");
  await page.getByRole("textbox", { name: "Şifre" })
    .fill(ConfigReader.getEnvVariable("REPXPERT_PASSWORD") || "");
  await page.getByRole("button", { name: "Oturum Açın" }).click();

  await expect(page.getByRole("link", { name: ConfigReader.getEnvVariable("NAME") })).toBeVisible({ timeout: 5000 });

  // Save the state of the page
  await page.context().storageState({
    path: "storage/LoginAuth.json",
  });

  // Close the browser
  await browser.close();
}

export default globalSetup;
