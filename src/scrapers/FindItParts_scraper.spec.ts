import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Geçici dosyaların saklanacağı dizin
const TEMP_DATA_DIR = path.join(__dirname, '..', 'data', 'temp_results');

test.describe('FindItParts Scraper - Paralel ve Birleşik Sonuçlar', () => {
    const raybestosNumbers: string[] = ["56140", "56631", "56641", "56655"];

    const URL_1 = "https://www.finditparts.com/search?aggs=true&ioos=true&m%5B%5D=RAYBESTOS&per=24&s=";
    const URL_2 = "&strict_phrase=true";

    // Testler başlamadan önce geçici dizini temizle
    test.beforeAll(() => {
        if (fs.existsSync(TEMP_DATA_DIR)) {
            fs.rmSync(TEMP_DATA_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(TEMP_DATA_DIR, { recursive: true });
    });

    raybestosNumbers.forEach(number => {
        test(`Get Interchangable Part numbers for ${number}`, async ({ page }) => {
            const targetURL = URL_1 + number + URL_2;

            await page.goto(targetURL);
            await page.waitForTimeout(2000); // Dinamik bekleme kullanılması daha iyi olabilir
            await page.waitForLoadState('networkidle');

            const firstProductLink = page.locator('.product_results_main > div:nth-child(3) > div > div > a').first();
            await expect(firstProductLink).toBeVisible();
            await firstProductLink.click();

            await page.waitForTimeout(2000); // Dinamik bekleme kullanılması daha iyi olabilir
            await expect(page.locator("//*[@class='list-unstyled cross-reference-list']//a").first()).toBeVisible({ timeout: 5000 });

            const crossReferences = page.locator("//*[@class='list-unstyled cross-reference-list']//a");
            const interchanges = page.locator("(//*[@class='product_description__row'])[4]//a");

            const crossReferencesTexts = await crossReferences.allInnerTexts();
            const crossReferencesPairs: Record<string, string> = {};
            crossReferencesTexts.forEach(text => {
                const parts = text.split(' ');
                if (parts.length >= 2) {
                    crossReferencesPairs[parts[0]] = parts[1];
                }
            });

            const interchangesTexts = await interchanges.allInnerTexts();
            const interchangesPairs: Record<string, string> = {};
            interchangesTexts.forEach(text => {
                const lastBlankIndex = text.lastIndexOf(' ');
                if (lastBlankIndex !== -1) {
                    interchangesPairs[text.substring(0, lastBlankIndex)] = text.substring(lastBlankIndex + 1);
                } else {
                    interchangesPairs[text] = '';
                }
            });

            const testResult = {
                raybestosNumber: number,
                interchanges: interchangesPairs,
                crossReferences: crossReferencesPairs
            };

            // Her test kendi sonucunu ayrı bir geçici dosyaya yazar
            if (Object.keys(testResult.interchanges).length > 0) {
                const tempFilePath = path.join(TEMP_DATA_DIR, `${number}.json`);
                fs.writeFileSync(tempFilePath, JSON.stringify(testResult, null, 2));
                console.log(`Veri ${number} için geçici dosyaya yazıldı: ${tempFilePath}`);
            } else {
                console.warn(`Uyarı: ${number} için değişim bilgisi bulunamadı, geçici dosyaya yazılmadı.`);
            }
        });
    });

    // ---
    // TÜM TESTLER BİTTİKTEN SONRA ÇALIŞACAK BLOK
    // Bu blok, tüm worker'lar testlerini bitirdikten sonra ana süreçte çalışır.
    // ---
    test.afterAll(async () => {
        const finalResults: any[] = [];
        const files = fs.readdirSync(TEMP_DATA_DIR);

        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(TEMP_DATA_DIR, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                try {
                    finalResults.push(JSON.parse(content));
                } catch (error) {
                    console.error(`Hata: ${filePath} dosyası parse edilemedi:`, error);
                }
            }
        }

        const outputDir = path.join(__dirname, '..', 'data', 'katalogInfo', 'jsons');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, 'findItParts.json');
        try {
            fs.writeFileSync(outputPath, JSON.stringify(finalResults, null, 2));
            console.log(`Tüm veriler başarıyla ${outputPath} konumuna birleştirilerek yazıldı. Toplam ${finalResults.length} kayıt.`);
        } catch (error) {
            console.error('Nihai dosya yazılırken bir hata oluştu:', error);
        } finally {
            // Geçici dizini temizle
            fs.rmSync(TEMP_DATA_DIR, { recursive: true, force: true });
            console.log(`Geçici dizin temizlendi: ${TEMP_DATA_DIR}`);
        }
    });
});