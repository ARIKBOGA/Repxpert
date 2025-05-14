import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';
//import ConfigReader from '../utils/ConfigReader';
import { loginEnglishRepxpertPage } from '../utils/ScraperHelpers';


test.describe('Model Name Scraper', () => {
    
    test(`Scrape model names for all brands`, async ({ page }) => {

        // Navigate to the English RepXpert page
        await loginEnglishRepxpertPage(page);

        // Wait for the user name to be visible
        await page.waitForSelector("//*[@class='name']");
        const userName = await page.locator("//*[@class='name']").textContent().then((text) => text?.trim());
        await (await page.waitForSelector("//*[@class='name']")).isVisible();
        //expect(userName).toBe(ConfigReader.getEnvVariable("REPXPERT_ENGLISH_NAME"));

        // Navigate to the "Vehicles Globally" section
        const vehiclesGloballyButton = page.locator("//button[.='Vehicles Globally']");
        await vehiclesGloballyButton.click();
        await page.waitForLoadState('domcontentloaded');

        // Click on the "Select Manufacturer" dropdown
        await page.waitForTimeout(1000);
        const selectBox = page.getByText('Select Manufacturer');
        await selectBox.click();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);

        // Get all the brand names from the dropdown
        const brandNames = await page.locator('//mat-option').allTextContents();

        const allBrands: string[] = [];
        for (const brandName of brandNames) {
            const trimmedBrandName = brandName.trim();
            allBrands.push(trimmedBrandName);
        }

        // Write allMadels to a JSON file
        const jsonFilePath = path.resolve('src/data/Gathered_Informations/CarModels/brand_names.json');
        const jsonData = JSON.stringify(allBrands, null, 2);
        fs.writeFileSync(jsonFilePath, jsonData, 'utf-8');
        console.log(`Brands have been written to ${jsonFilePath}`);

        // Write the json data to an excel file
        const excelFilePath = path.resolve('src/data/Gathered_Informations/CarModels/brand_names.xlsx');
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(allBrands.map((brand) => ({ brand })));
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Brands');
        xlsx.writeFile(workbook, excelFilePath);
        console.log(`Brands have been written to ${excelFilePath}`);

    });
});
