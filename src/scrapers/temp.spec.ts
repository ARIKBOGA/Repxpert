import { test } from "@playwright/test";
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