import { getSubfolderNamesSync } from "./FileHelpers";
import { readProductReferencesFromExcel } from "./ScraperHelpers";
import path from "path";
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../data/Configs/.env') });

const filterBrand = process.env.FILTER_BRAND_APPLICATION as string;
const productType = process.env.PRODUCT_TYPE as string;

async function main(): Promise<void> {
    const references = readProductReferencesFromExcel();

    console.log("references count: ", references.length);
    let counter = 0;
    const crossNumbersSet = new Set<string>();
    for (const ref of references) {
        if (!ref.brandRefs.BREMBO) continue;
        else {
            crossNumbersSet.add(ref.brandRefs.BREMBO.split(",")[0]);   // Don't forget to set the correct brand accordingly
            counter++;
            //console.log(ref.yvNo, ref.brandRefs.BREMBO.split(",")[0]);
        }
    }

    console.log("counter: ", counter);

    const scrapedCroossNumbers = getSubfolderNamesSync(`src/data/Gathered_Informations/${productType}/Applications/English/${filterBrand}`);

    console.log("scrapedCroossNumbers Folder count: ", scrapedCroossNumbers.length);
    //nsole.log("scrapedCroossNumbers: ", scrapedCroossNumbers);

    const missingCrossNumbers = Array.from(crossNumbersSet).filter(crossNumber => !scrapedCroossNumbers.includes(crossNumber));
    console.log("missingCrossNumbers count: ", missingCrossNumbers.length);
    console.log("missingCrossNumbers: ", missingCrossNumbers);
}

main().catch(error => {
    console.error(" catastrophic error occurred: ", error);
    process.exit(1);
});