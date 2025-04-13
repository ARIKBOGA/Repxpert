import { test } from "@playwright/test";
import * as fs from "fs";

test("test", async ({ page }) => {
    // Siteye git
    await page.goto("https://www.repxpert.com.tr/tr");
    // Çerezleri kabul et
    await page.getByRole("button", { name: "Tüm Tanımlama Bilgilerini" }).click();

    // Oturum aç
    await page.getByRole("link", { name: "Oturum Aç | Kaydol" }).click();
    await page.getByRole("textbox", { name: "E-posta adresi" }).fill("barikboga42@gmail.com");
    await page.getByRole("textbox", { name: "Şifre" }).fill("92CJ68XwD@z+x7b");
    await page.getByRole("button", { name: "Oturum Açın" }).click();

    // Referans numara ile ürün ara 
    await page.getByRole("textbox", { name: "Ürün numarası, OE numarası," }).click();
    await page.getByRole("textbox", { name: "Ürün numarası, OE numarası," }).fill("2K5 698 451");
    await page.getByRole("textbox", { name: "Ürün numarası, OE numarası," }).press("Enter");
    await page.getByRole("combobox", { name: "Markalar" }).click();
    await page.getByRole("combobox", { name: "Markalar" }).fill("trw");
    await page.getByText("TRW", { exact: true }).click();

    // Ürün seçimi manuel olarak yapılacak
    await page.pause();
    // Ürün sayfasına git
    const productTitle = await page.locator(".h1").nth(0).textContent().then((text) => {
        if (text) {
            return text.split(" ")[1];
        }
        return null;
    });

    const oeNumbers = await page.locator(".mat-mdc-list-item-unscoped-content").all();

    // OE numaralarını yazdır
    // console.log("Bulunan tüm OE numaraları: ");
    // for (const oe of oeNumbers) {
    //     console.log(await oe.textContent());
    // }

    
    // OE numaralarını al ve benzersiz hale getir
    const uniqueOeNumbers = new Set<string|null>();
    for (const oe of oeNumbers) {
        uniqueOeNumbers.add(await oe.textContent());
    }

    // Tekil OE numaralarını yazdır
    // console.log(productTitle + " - TEKİL OE numaraları: ");
    // for (const oeNumber of uniqueOeNumbers) {
    //     console.log(oeNumber);
    // }

    const header = "OE Numbers";
    const oeNumbersArray = Array.from(uniqueOeNumbers).join("\n");
    const csvContent = `${header}\n${oeNumbersArray}`;

    fs.writeFile( productTitle + ' - OE_Numbers.csv', csvContent, (err) => {
        if (err) {
            console.error(err);
        } else {
            console.log('CSV dosyası başarıyla oluşturuldu.');
          }
    });
});
