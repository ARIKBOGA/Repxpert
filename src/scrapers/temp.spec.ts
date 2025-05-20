import { test, expect } from "@playwright/test";
import ConfigReader from "../utils/ConfigReader";

test("ConfigReader", async ({ page }) => {
  const result = ConfigReader.getEnvVariable("REPXPERT_EMAIL");
  console.log("Result:", result);
});

test("Repxpert login auth", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto(ConfigReader.getEnvVariable("REPXPERT_URL") || "");
  await page.getByRole("button", { name: "Tüm Tanımlama Bilgilerini" }).click();
  await page.getByRole("link", { name: "Oturum Aç | Kaydol" }).click();
  await page
    .getByRole("textbox", { name: "E-posta adresi" })
    .fill(ConfigReader.getEnvVariable("REPXPERT_EMAIL") || "");
  await page
    .getByRole("textbox", { name: "Şifre" })
    .fill(ConfigReader.getEnvVariable("REPXPERT_PASSWORD") || "");
  await page.getByRole("button", { name: "Oturum Açın" }).click();
  await page.pause();
});


test('yavuzsan', async ({ page }) => {
  await page.goto('https://www.yavuzsan.com/register');
  await page.waitForTimeout(10000);
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('textbox', { name: 'First Name*' }).click();
  await page.getByRole('textbox', { name: 'First Name*' }).fill('John');

  await page.getByRole('textbox', { name: 'Last Name*' }).fill('Doe');

  await page.getByRole('textbox', { name: 'Email*' }).fill('work_env1@outlook.com');

  await page.getByRole('textbox', { name: 'Phone*', exact: true }).fill('05494392200');

  await page.getByRole('textbox', { name: 'Office Phone*' }).fill('05494392200');

  await page.getByRole('textbox', { name: 'Company *' }).fill('Yavuzsan');

  await page.getByRole('textbox', { name: 'Password*' }).fill('Konya42**');

  await page.getByRole('textbox', { name: 'Password Again*' }).fill('Konya42**');

  await page.getByRole('textbox', { name: 'City *' }).fill('Konya');
  await page.getByRole('combobox', { name: 'I don\'t want to specify' }).click();
  await page.locator('#bs-select-1-1').click();


  await page.pause();

  await page.waitForTimeout(2000);
  expect(page.getByRole('heading', { name: 'Register' })).not.toBeVisible();
});