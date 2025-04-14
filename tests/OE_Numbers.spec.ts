import { test } from "@playwright/test";
import * as fs from "fs";
import { Product } from "./Product"; 
import { Dimensions } from "./Dimensions";

test("Ürün bilgilerini JSON dosyasına yaz", async ({ page }) => {
    await page.goto("https://www.repxpert.com.tr/tr");
    await page.getByRole("button", { name: "Tüm Tanımlama Bilgilerini" }).click();
    await page.getByRole("link", { name: "Oturum Aç | Kaydol" }).click();
    await page.getByRole("textbox", { name: "E-posta adresi" }).fill("barikboga42@gmail.com");
    await page.getByRole("textbox", { name: "Şifre" }).fill("92CJ68XwD@z+x7b");
    await page.getByRole("button", { name: "Oturum Açın" }).click();

    await page.getByRole("textbox", { name: "Ürün numarası, OE numarası," }).click();
    await page.getByRole("textbox", { name: "Ürün numarası, OE numarası," }).fill("2K5 698 451");
    await page.getByRole("textbox", { name: "Ürün numarası, OE numarası," }).press("Enter");
    await page.getByRole("combobox", { name: "Markalar" }).click();
    await page.getByRole("combobox", { name: "Markalar" }).fill("trw");
    await page.getByText("TRW", { exact: true }).click();

    await page.pause();

    // Product title
    const productTitle = await page.locator(".h1").nth(0).textContent().then((text) => {
        if (text) {
            return text.trim();
        }
        return "Unknown Product";
    });

    // Product name
    const productName = await page.locator(".article-number>div").textContent().then((text) => {
        if (text) {
            return text.trim();
        }
        return "Unknown Product";
    })

    // EAN NUMBER
    const eanNumber = await page.locator('.ean-value').textContent();

    // USAGE NUMBERS
    const usageNumbers = (await page.locator('.tradeNumbers-value>span').all()).map(async (element) => {
        const text = await element.textContent();
        return text ? text.trim() : null;
    });
    const usageNumbersArray = await Promise.all(usageNumbers);
    const uniqueUsageNumbers = Array.from(new Set(usageNumbersArray.filter(Boolean))) as string[];

    // OE NUMBERS
    const oeElements = await page.locator(".mat-mdc-list-item-unscoped-content").all();
    const oeNumbersArray: string[] = [];

    for (const el of oeElements) {
        const text = await el.textContent();
        if (text && text.trim()) {
            oeNumbersArray.push(text.trim());
        }
    }
    const uniqueOeNumbers = Array.from(new Set(oeNumbersArray));


    // DIMENSIONS
    const manufacturerRestriction = await page.locator("(//*[.='Üretici kısıtlaması']/following-sibling::dd)[1]/span").textContent();
    const width = await page.locator("(//*[.='Genişlik [mm]']/following-sibling::dd)[1]/span").textContent();
    const height = await page.locator("(//*[.='Yükseklik [mm]']/following-sibling::dd)[1]/span").textContent();
    const thickness = await page.locator("(//*[.='Kalınlık/Kuvvet [mm]']/following-sibling::dd)[1]/span").textContent();
    const checkmark = await page.locator("(//*[.='Kontrol işareti']/following-sibling::dd)[1]/span").textContent();
    const SVHC = await page.locator("(//*[.='SVHC']/following-sibling::dd)[1]/span").textContent();

    const dimensions: Dimensions = {
        manufacturerRestriction: manufacturerRestriction ? manufacturerRestriction.trim() : undefined,
        width: width ? width.trim() : undefined,
        height: height ? height.trim() : undefined,
        thickness: thickness ? thickness.trim() : undefined,
        checkmark: checkmark ? checkmark.trim() : undefined,
        SVHC: SVHC ? SVHC.trim() : undefined
    };

    // JSON OBJEYİ OLUŞTUR
    const product: Product = {
        id: productTitle.split(" ")[1], // Ürün ID'si, baştaki sayıyı al
        name: productName,
        brand: "TRW",
        usageNumbers: uniqueUsageNumbers,
        oeNumbers: uniqueOeNumbers,
        eanNumber: eanNumber ? eanNumber.trim() : undefined,
        dimensions: dimensions
    };

    // Dosya adı
    const jsonFileName = `${productTitle} .json`;
    // JSON dosyaya yaz
    fs.writeFile(jsonFileName, JSON.stringify(product, null, 2), (err) => {
        if (err) {
            console.error("JSON dosyasına yazılırken hata:", err);
        } else {
            console.log(`Ürün bilgileri ${jsonFileName} dosyasına başarıyla yazıldı.`);
        }
    });
});
