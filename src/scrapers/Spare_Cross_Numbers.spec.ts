import { test, expect, Locator } from '@playwright/test'
import { ProductReference, readProductReferencesFromExcel } from '../utils/ScraperHelpers';
import { writeFileSync } from 'fs';
import path from 'path';
import { crankshaftPairs } from '../utils/FileHelpers';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';


//const filterBrand = process.env.FILTER_BRAND_APPLICATION as string;
const productType = process.env.PRODUCT_TYPE as string;
const references: ProductReference[] = readProductReferencesFromExcel(productType);
const scrapedCrossSet = new Set<string>();

const OUTPUT_DIR = path.join(__dirname, `../data/Gathered_Informations/${productType}/CrossNumbers/YV_CODES`);

test.describe('Spare Cross Numbers Scraper', () => {

    crankshaftPairs
        .filter(({ brandRefs }) => brandRefs && Object.keys(brandRefs).length > 0)
        .forEach(({ yvNo, brandRefs }) => {

            //console.log(`Processing YV No: ${yvNo} with Brand References:`, brandRefs);
            
            const filterBrand = Object.keys(brandRefs)[0]; // Get the first brand reference
            const brandRefValue = brandRefs[filterBrand];
            if (!brandRefValue) return; // Skip if the brand reference is missing
            const crossNumber = brandRefValue.split(",")[0].trim();
            
            console.log(`Cross Number: ${crossNumber} - filterBrand: ${filterBrand}`);

            if (scrapedCrossSet.has(crossNumber)) return; // Already scraped, ski
            scrapedCrossSet.add(crossNumber);
            test(`YV No: ${yvNo} - Cross Number: ${crossNumber}`, async () => {
                chromium.use(stealth());
                var proxy = 'ENDPOINT:PORT';
                const launchOptions = {
                    headless: false,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                };
                const browser = await chromium.launch(launchOptions);
                const context = await browser.newContext({
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
                });
                const page = await context.newPage();
                await page.goto('https://spareto.com/');
                await page.fill('#keywords', crossNumber);
                await page.press('#keywords', 'Enter', { delay: 100 });
                await page.waitForLoadState('networkidle');

                const filterInput = page.getByPlaceholder("Search", { exact: true });
                await filterInput.fill(filterBrand);
                await filterInput.press('Enter', { delay: 100 });
                await page.waitForLoadState('networkidle');

                const brandCheckbox = page.getByRole('checkbox', { name: new RegExp(filterBrand, 'i') });
                if (await brandCheckbox.isVisible() && !(await brandCheckbox.isChecked())) {
                    await brandCheckbox.click();
                }

                await page.waitForTimeout(1000); // Wait for the brand filter to apply

                const productLink = page.locator(`span:has-text("${crossNumber}")`).first();
                const locator_cnl: string = "//h3[.='Cross-Reference Numbers']/following-sibling::div";
                const crossNumbersLines: Locator = page.locator(locator_cnl);
                await Promise.all([
                    productLink.click(),
                    page.waitForLoadState('networkidle'),
                    page.waitForSelector(locator_cnl, { timeout: 5000 })
                ])


                await crossNumbersLines.first().waitFor({ state: 'visible', timeout: 5000 });
                const count = await crossNumbersLines.count();
                if (count === 0) {
                    console.error(`No cross numbers found for YV No: ${yvNo} and Cross Number: ${crossNumber}`);
                    return;
                }

                const crosNumbersMap: Map<string, string> = new Map();

                for (let i = 0; i < await crossNumbersLines.count(); i++) {

                    const producerName = (await crossNumbersLines.nth(i).locator('div:nth-of-type(1)').textContent())?.trim() || '';
                    const rawTexts = await crossNumbersLines.nth(i).locator('div:nth-of-type(2)').allTextContents();

                    const crossNumbers = rawTexts
                        .flatMap(text => text.split('\n')) // \n ile böl
                        .map(n => n.trim())                // boşlukları temizle
                        .filter(n => n.length > 0)         // boş satırları çıkar
                        .join(', ');                       // virgülle birleştir

                    crosNumbersMap.set(producerName, crossNumbers);
                }

                //console.log(crosNumbersMap);

                const outputDir = path.join(OUTPUT_DIR, yvNo);
                if (!require('fs').existsSync(outputDir)) {
                    require('fs').mkdirSync(outputDir, { recursive: true });
                }

                const filePath = path.join(outputDir, `${filterBrand}_${crossNumber}.json`);
                const mapAsObj = Object.fromEntries(crosNumbersMap);

                writeFileSync(filePath, JSON.stringify(mapAsObj, null, 2), 'utf-8');
                console.log(`✅ Cross numbers for ${crossNumber} saved to ${filePath}`);

                page.close();
                await browser.close();
            });
        });
});
