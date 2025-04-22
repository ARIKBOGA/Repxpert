import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

interface Product {
    id: string;
    name: string;
    brand: string;
    usageNumbers?: string[];
    oeNumbers?: string[];
    eanNumber?: string;
    dimensions?: {
        manufacturerRestriction?: string;
        width?: string;
        height?: string;
        thickness?: string;
        checkmark?: string;
        SVHC?: string;
    };
}

// Ana klasör yolu
const ROOT_DIR = '../../data';

// Excel'e yazmak üzere tüm verileri bu dizide toplayacağız
const excelData: any[] = [];

function getAllJsonFiles(dirPath: string): string[] {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    return entries.flatMap((entry) => {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            return getAllJsonFiles(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
            return [fullPath];
        }
        return [];
    });
}

function prepareRow(json: Product): any {
    const row: any = {
        id: json.id || '',
        brand: json.brand || '',
        eanNumber: json.eanNumber || '',
        manufacturerRestriction: json.dimensions?.manufacturerRestriction || '',
        width: json.dimensions?.width || '',
        height: json.dimensions?.height || '',
        thickness: json.dimensions?.thickness || '',
        checkmark: json.dimensions?.checkmark || '',
    };

    // usageNumbers: usage1, usage2, usage3, usage4
    const usage = json.usageNumbers || [];
    for (let i = 0; i < 4; i++) {
        row[`usage${i + 1}`] = usage[i] || '';
    }

    // oeNumbers: oe1, oe2, oe3, ...
    const oe = json.oeNumbers || [];
    oe.forEach((num, index) => {
        row[`oe${index + 1}`] = num;
    });

    return row;
}

function exportToExcel(data: any[], outputPath: string) {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, outputPath);
}

function main() {
    const jsonFiles = getAllJsonFiles(ROOT_DIR);

    jsonFiles.forEach((filePath) => {
        const raw = fs.readFileSync(filePath, 'utf-8');
        try {
            const json: Product = JSON.parse(raw);
            const row = prepareRow(json);
            excelData.push(row);
        } catch (err) {
            console.error(`Hatalı JSON: ${filePath}`, err);
        }
    });

    exportToExcel(excelData, 'output.xlsx');
    console.log(`✅ Excel dosyası oluşturuldu: output.xlsx`);
}

main();
