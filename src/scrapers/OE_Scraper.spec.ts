import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import ConfigReader from '../utils/ConfigReader';
import { Product } from '../types/Product';
import { Dimensions } from '../types/Dimensions';
import { getSubfolderNamesSync, readJsonFile, retryListFilePath, balata_katalog_full } from '../utils/FileHelpers';
import { getTextContent, getMultipleTexts, addToRetryList, getDimensionValuesSmart } from '../utils/extractHelpers';
import { goToSearchResults, mapToSerializableObject, readProductReferencesFromExcel } from '../utils/ScraperHelpers';

// Çalışılacak ürün tipini seç
const productType = process.env.PRODUCT_TYPE as string; // Örnek: 'Pads', 'Discs', 'Drums' vb.

// JSON dosyasından OE numaralarını oku
const oePath = path.resolve(__dirname, '../data/Configs/search_references.json');
const oeNumbers: string[] = JSON.parse(fs.readFileSync(oePath, 'utf-8'));

// reTry.json'u oku veya boş bir array oluştur
let retryList = readJsonFile<string[]>(retryListFilePath, []);

const references = readProductReferencesFromExcel(productType);
const existedFolders = getSubfolderNamesSync(`src/data/Gathered_Informations/${productType}/Technical_Details/YV_CODES`);

test.describe('YV NO ve Marka bazlı teknik veri tarayıcı', async () => {

  for (const ref of references) {
    const { yvNo, brandRefs } = ref;

    // yvNo daha önce işlenmişse atla
    //if (existedFolders.includes(yvNo)) {
    //  console.log(`❌ ${yvNo} daha önce işlenmiş, atlanıyor...`);
    //  continue;
    //}
    // Her test için yeni bir sayfa açılır, böylece her test birbirinden bağımsız çalışır
    for (const [brand, productCode] of Object.entries(brandRefs)) {

      let productCodes: string[] = [];
      if (productCode.includes(",") || productCode.includes(" ")) {
        productCodes = productCode.split(', ').filter((code: string) => code.trim() !== "");
      } else {
        productCodes = [productCode];
      }


      for (const productCode of productCodes) {
        test(`${yvNo} / ${brand} / ${productCode} koduyla veri topla`, async ({ page }) => {
          const filterBrand = brand.toUpperCase();
          try {
            // Search results sayfasına git
            const productLinks = await goToSearchResults(page, productCode, filterBrand, retryList, addToRetryList);
            if (!productLinks) return; // ürün yoksa işlemi kes

            console.log(`🔍 ${productCode} için ürün işleniyor...`);

            await Promise.all([
              page.waitForTimeout(2000),
              page.waitForLoadState('domcontentloaded'),
              page.waitForSelector('.h1'), // Ürün detay sayfasında başlık gelmeden işleme geçme
              productLinks[0].click(),
            ]);

            const brand_oe_map = new Map<string, Set<string>>();
            const brandsOfOEs = await getMultipleTexts(page.locator("//mat-panel-title"));

            //console.log(`Brands of OEs:`, brandsOfOEs);

            for (let i = 0; i < brandsOfOEs.length; i++) {
              const brand = brandsOfOEs[i].trim();
              const oeArray = await getMultipleTexts(page.locator(`(//mat-list)[${i + 1}]//span[@class='mdc-list-item__content']/span`));
              const oeSet = new Set(oeArray.map(oe => oe.trim()));
              //console.log(`Brand: ${brand}, OE Set:`, [...oeSet]);

              brand_oe_map.set(brand, oeSet);
            }

            const brand_oe_map_serializable = mapToSerializableObject(brand_oe_map);

            const productTitle = (await getTextContent(page.locator('.h1').nth(0))) || 'Unknown Product';
            const productId = productTitle.replace(filterBrand, '').trim();
            const productName = (await getTextContent(page.locator('.article-number>div'))) || 'Unknown Name';
            const eanNumber = await getTextContent(page.locator('.ean-value'));
            const wvaNumbers = await getMultipleTexts(page.locator('.tradeNumbers-value > span'));
            //const oeNumbers = await getMultipleTexts(page.locator('.mat-mdc-list-item-unscoped-content'));

            const widthValues = await getDimensionValuesSmart(page, ['Genişlik', 'Uzunluk']);
            const heightValues = await getDimensionValuesSmart(page, ['Yükseklik']);
            const thicknessValues = await getDimensionValuesSmart(page, ['Kalınlık']); // sadece gerekiyorsa


            // disc Attributes
            const disc: any = {
              Type : await getDimensionValuesSmart(page, ['Fren diski türü']),
              ThicknessValues : await getDimensionValuesSmart(page, ['Fren diski kalınlığı']),
              MinimumThicknessValues : await getDimensionValuesSmart(page, ['Asgari kalınlık']),
              Surface: await getDimensionValuesSmart(page, ['Üst yüzey']),
              HeightValues : await getDimensionValuesSmart(page, ['Yükseklik']),
              InnerDiameter : await getDimensionValuesSmart(page, ['İç çap']),
              OuterDiameter : await getDimensionValuesSmart(page, ['Dış çap']),
              BoltHoleCircle : await getDimensionValuesSmart(page, ['Delik çemberi']),
              NumberOfHoles : await getDimensionValuesSmart(page, ['Delik sayısı']),
              AxleVersion : await getDimensionValuesSmart(page, ['Aks modeli']),
              TechnicalInformationNumber : await getDimensionValuesSmart(page, ['Teknik bilgi numarası']),
              TestMark : await getDimensionValuesSmart(page, ['Kontrol işareti']),
              Diameter : await getDimensionValuesSmart(page, ['Çap']),
              Thickness : await getDimensionValuesSmart(page, ['Kalınlık/Kuvvet']),
              SupplementaryInfo : await getDimensionValuesSmart(page, ['İlave Ürün/Bilgi']),
              CenteringDiameter : await getDimensionValuesSmart(page, ['Merkezleme çapı']),
              HoleArrangement_HoleNumber : await getDimensionValuesSmart(page, ['Delik şekli/Delik sayısı']),
              WheelBoltBoreDiameter: await getDimensionValuesSmart(page, ['Bijon deliği çapı']),
              Machining: await getDimensionValuesSmart(page, ['İşleme']),
              TighteningTorque : await getDimensionValuesSmart(page, ['Sıkma torku']),
              Weight : await getDimensionValuesSmart(page, ['Agırlık']),
              Color : await getDimensionValuesSmart(page, ['Renk']),
              ThreadSize : await getDimensionValuesSmart(page, ['Dişli ölçüsü']),
            }

            await page.waitForTimeout(1000); // Sayfanın tam yüklenmesi için bekle
            //await page.pause(); // Sayfayı durdur
            const oeBrands = await getMultipleTexts(page.locator("//mat-panel-title"));
            const brandOeMap: Map<string, Set<string>> = new Map();
            for (let i = 0; i < oeBrands.length; i++) {
              const brand = oeBrands[i]?.trim() || "";
              const oeNumbersOfBrand = await getMultipleTexts(page.locator(`(//mat-panel-title)[${i + 1}]//..//..//following-sibling::div//span[@class='mat-mdc-list-item-unscoped-content']`));
              const oeNumbersSet = new Set(oeNumbersOfBrand.map(oe => oe.trim()));
              for (const oe of oeNumbersSet) {
                console.log(`OE numarası: ${oe}`);
              }
              if (brandOeMap.has(brand)) {
                oeNumbersSet.forEach(oe => brandOeMap.get(brand)?.add(oe));
              } else {
                brandOeMap.set(brand, oeNumbersSet);
              }
            }

            const dimensions: Dimensions = {
              width1: widthValues[0] ?? null,
              width2: widthValues[1] ?? null,
              height1: heightValues[0] ?? null,
              height2: heightValues[1] ?? null,
              thickness1: thicknessValues[0] ?? null,
              thickness2: thicknessValues[1] ?? null,
              manufacturerRestriction: await getTextContent(page.locator("(//*[.='Üretici kısıtlaması']/following-sibling::dd)[1]/span")),
              checkmark: await getTextContent(page.locator("(//*[.='Kontrol işareti']/following-sibling::dd)[1]/span")),
              SVHC: await getTextContent(page.locator("(//*[.='SVHC']/following-sibling::dd)[1]/span")),
            };


            const product: Product = {
              reference: productCode,
              id: productId,
              name: productName,
              brand: productTitle.split(' ')[0],
              //wvaNumbers: wvaNumbers,
              //oeNumbers,
              brand_oe_map: brand_oe_map_serializable,
              eanNumber,
              disc,
            };

            const basePath = path.join('src', 'data', 'Gathered_Informations', productType, 'Technical_Details', "YV_CODES", yvNo);
            if (!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true });

            const fileName = `${brand}_${productCode}.json`;
            const filePath = path.join(basePath, fileName);
            fs.writeFileSync(filePath, JSON.stringify(product, null, 2), 'utf-8');

            console.log(`✅ ${brand} - ${productCode} kaydedildi (${filePath})`);



          } catch (err) {
            console.error(`❌ Hata - ${yvNo} / ${brand} / ${productCode}`, err);

            // Hata yakalanırsa da o OE numarasını reTry listesine ekle
            addToRetryList(productCode);  // Use the helper function here
          }
        });
      }
    }
  }
});


// Gruplu oe ler: //*[starts-with(@id,'cdk-accordion-child-0')]//span[@class='mat-mdc-list-item-unscoped-content mdc-list-item__primary-text']