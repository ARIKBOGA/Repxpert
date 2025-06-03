import { test, expect } from '@playwright/test';
const data = process.env;
test('test', async ({ page }) => {

    await page.goto(data.FIND_IT_PARTS_URL as string);

    await page.pause();


    await page.getByRole('searchbox', { name: 'Search' }).fill('HST1126AB');

    await page.getByRole('button', { name: 'Perform Search' }).click();
    await page.waitForTimeout(2000);
    await page.getByRole('checkbox', { name: 'Brake' }).check();
    await page.waitForTimeout(2000);

    await page.getByRole('checkbox', { name: 'Drums and Rotors' }).check();
    await page.waitForTimeout(2000);
    await page.getByRole('checkbox', { name: 'RAYBESTOS' }).check();
    await page.waitForTimeout(2000);

    await page.locator('.product_results_main > div:nth-child(3) > div').first().click();

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000);

    const allLinks = page.locator("//*[@class='list-unstyled cross-reference-list']//a");

    const allTexts = await allLinks.allInnerTexts();
    const allPairs: Map<string, string> = new Map();
    allTexts.forEach(text => {
        allPairs.set(text.split(' ')[0], text.split(' ')[1]);
    })
    console.log(allPairs);



    //*[@class='list-unstyled cross-reference-list']//a

});