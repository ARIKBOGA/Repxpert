import { test, expect } from '@playwright/test';
import * as xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import ConfigReader from '../utils/ConfigReader';
import { getMultipleTexts } from '../utils/extractHelpers';
import { loginEnglishRepxpertPage, mapToSerializableObject } from '../utils/ScraperHelpers';


function readBrandsFromExcel(): string[] {
    const excelPath = path.resolve(__dirname, '../data/katalogInfo/excels/marka_new.xlsx');
    const workbook = xlsx.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

    const brands: string[] = [];

    for (const row of data) {
        const brandName = row['marka']?.toString()?.trim();
        if (brandName) {
            brands.push(brandName);
        }
    }

    return brands;
}


test.describe('Model Name Scraper', () => {

    test.describe.configure({ timeout: 2 * 60 * 60 * 1000 }); // 2 hours
    const brandNames = readBrandsFromExcel();   //["TOFAS"];  // Read from files by readBrandsFromExcel function or add brands manually to this array

    test(`Scrape model names for all brands`, async ({ page }) => {

        // Login to the English RepXpert page
        await loginEnglishRepxpertPage(page);

        // Wait for the user name to be visible
        await page.waitForSelector("//*[@class='name']");
        const userName = await page.locator("//*[@class='name']").textContent().then((text) => text?.trim());
        expect(userName).toBe(ConfigReader.getEnvVariable("REPXPERT_ENGLISH_NAME"));

        // Navigate to the "Vehicles Globally" section
        const vehiclesGloballyButton = page.locator("//button[.='Vehicles Globally']");
        await vehiclesGloballyButton.click();
        await page.waitForLoadState('domcontentloaded');

        // Click on the "Select Manufacturer" dropdown
        const selectBox = page.getByText('Select Manufacturer');

        const allModels: Map<string, Set<string>> = new Map();

        await page.waitForTimeout(1000);
            await selectBox.click();

        for (const brandName of brandNames) {
            //console.log(`Marka: ${brandName} için elementler aranıyor...`);
            
            await selectBox.fill(brandName);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(500);

            try {
                // Marka adının dropdown'da görünmesini bekle ve tıkla
                await page.waitForSelector(`//mat-option[.='${brandName}']`, { timeout: 5000 }); // Timeout ekleyerek sonsuz beklemeyi önle
                await page.locator(`//mat-option[.='${brandName}']`).click();
                await page.waitForLoadState('domcontentloaded');
                await page.waitForTimeout(2000);

                const modelNameLocators = page.locator("//mat-row/mat-cell[1]//saam-table-cell");
                const count = await modelNameLocators.count();
                console.log(`${brandName} için Bulunan element sayısı: ${count}`);

                const modelNames = (await getMultipleTexts(modelNameLocators)).map((text) => text.trim());
                //console.log(`Marka: ${brandName} için çekilen model isimleri:`, modelNames);

                const modelNamesSet = new Set<string>(modelNames);
                allModels.set(brandName, modelNamesSet);

                await page.getByRole('button', { name: 'Clear input' }).click();
                await page.waitForLoadState('domcontentloaded');

            } catch (error) {
                console.warn(`Uyarı: '${brandName}' markası için seçenek bulunamadı veya tıklanamadı. Bir sonraki markaya geçiliyor.`);
                // Hata oluştuğunda bir sonraki döngüye geçmek için herhangi bir ek işlem yapmaya gerek yok.
                // Döngü otomatik olarak bir sonraki brandName ile devam edecektir.
            }
        }
        // Serialize the Map to a JSON-compatible format
        const serializedMap = mapToSerializableObject(await allModels);


        // Write allMadels to a JSON file
        const jsonFilePath = path.resolve('src/data/Gathered_Informations/CarModels/model_names_FULL.json');
        const jsonData = JSON.stringify(serializedMap, null, 2);
        fs.writeFileSync(jsonFilePath, jsonData, 'utf-8');
        console.log(`Model names for ${brandNames} have been written to ${jsonFilePath}`);

    });
});
