import { Browser, Page, chromium, expect } from "@playwright/test";
import ConfigReader from "../src/utils/ConfigReader";

async function globalSetup() {
  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page: Page = await context.newPage();
  await page.goto(process.env.REPXPERT_URL as string);
  if (page.getByRole("button", { name: "Tüm Tanımlama Bilgilerini" })) {
    await page.getByRole("button", { name: "Tüm Tanımlama Bilgilerini" }).click();
  }
  await page.getByRole("link", { name: "Oturum Aç | Kaydol" }).click();
  await page.getByRole("textbox", { name: "E-posta adresi" })
    .fill(process.env.REPXPERT_EMAIL as string);
  await page.getByRole("textbox", { name: "Şifre" })
    .fill(process.env.REPXPERT_PASSWORD as string);
  await page.getByRole("button", { name: "Oturum Açın" }).click();

  await page.waitForTimeout(2000); // Wait for 2 seconds to ensure the page is loaded

  await expect(page.getByRole("link", { name: process.env.NAME })).toBeVisible({ timeout: 5000 });

  // Save the state of the page
  await page.context().storageState({
    path: "storage/LoginAuth.json",
  });

  // Close the browser
  await browser.close();
}


async function globalSetupEnglish() {
  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page: Page = await context.newPage();
  await page.goto(process.env.REPXPERT_HOME_ENGLISH_URL as string);
  if (page.getByRole("button", { name: "Accept All Cookies" })) {
    await page.getByRole("button", { name: "Accept All Cookies" }).click();
  }
  await page.getByRole("link", { name: "Login | Register" }).click();
  await page.getByRole("textbox", { name: "E-Mail Address" })
    .fill(process.env.REPXPERT_ENGLISH_EMAIL as string);
  await page.getByRole("textbox", { name: "Password" })
    .fill(process.env.REPXPERT_ENGLISH_PASSWORD as string);
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByRole("link", { name: process.env.REPXPERT_ENGLISH_NAME })).toBeVisible({ timeout: 5000 });

  // Save the state of the page
  await page.context().storageState({
    path: "storage/LoginAuthEnglish.json",
  });

  // Close the browser
  await browser.close();
}

async function globalSetupICER() {
  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page: Page = await context.newPage();

  await page.goto(process.env.CROSS_NUMBERS_URL as string);

  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Accept Recommended Settings' }).click();

  await page.waitForLoadState('networkidle')
  await page.getByText('&amp;lt;br /&amp;gt;&amp;lt;p').contentFrame().getByRole('link', { name: 'Cross reference' }).click();

  await page.waitForLoadState('networkidle')

   // Save the state of the page
  await page.context().storageState({
    path: "storage/LoginAuthICER.json",
  });

  await browser.close();
}

export default globalSetup;
