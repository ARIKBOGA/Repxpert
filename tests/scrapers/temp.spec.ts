import { test } from "@playwright/test";
import ConfigReader from "../utils/ConfigReader";

test("ConfigReader", async ({page}) => {
    const result = ConfigReader.getEnvVariable("REPXPERT_EMAIL");
    console.log("Result:", result);
});