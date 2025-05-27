import { readProductReferencesFromExcel } from "./ScraperHelpers";

async function main(): Promise<void> {
    const references = readProductReferencesFromExcel("Pads");

    console.log("references count: ", references.length);
    let counter = 0;
    for (const ref of references) {
        if (!ref.brandRefs.BREMBO) continue;
        else {
            counter++;
            //console.log(ref.yvNo, ref.brandRefs.BREMBO.split(",")[0]);
        }
    }

    console.log("counter: ", counter);
}

main().catch(error => {
    console.error(" catastrophic error occurred: ", error);
    process.exit(1);
});