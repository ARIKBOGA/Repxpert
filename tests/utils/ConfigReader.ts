import * as fs from "fs";
import * as path from "path";

class ConfigReader {
    private static envFilePath = path.resolve(__dirname, "../../data/Configs/.env");

    // .env dosyasından bir değişkeni oku
    static getEnvVariable(key: string): string | undefined {
        try {
            const envContent = fs.readFileSync(this.envFilePath, "utf8");
            const line = envContent.split("\n").find(line => line.startsWith(`${key}=`));
            return line ? line.split("=")[1].trim() : undefined;
        } catch (error) {
            console.error(`Error reading .env file: ${error}`);
            return undefined;
        }
    }
}

export default ConfigReader;