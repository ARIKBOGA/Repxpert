import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";

// 
// const filePath = 

// JSON dosyalarını içeren klasör
const jsonFolder = path.resolve("src/data/Gathered_Informations/Pads/Technical_Details/YV_CODES");

// Excel dosyalarının oluşturulacağı klasör
const excelFolder = path.resolve("src/data/Gathered_Informations/Pads/Technical_Details/excels");

// Sabit başlıklar
const headers = [
    'YV_NO', 'brand', 'reference', 'eanNumber', 'width1', 'height1', 'thickness1', 'manufacturerRestriction', 
    'checkmark', 'SVHC', 'wvaNumbers' // Başlangıç başlıkları
  ];
  
  // Klasördeki tüm klasörleri al
  const getFolders = (dir: string) => {
    return fs.readdirSync(dir).filter((file) => fs.statSync(path.join(dir, file)).isDirectory());
  };
  
  const writeToExcel = (jsonData: any[], outputFile: string) => {
    const wb = XLSX.utils.book_new();
  
    // Veriyi satırlara uygun şekilde yerleştir
    let finalHeaders: string[] = [];
    const wsData = jsonData.map((item) => {
      // Brand OE Map içerisindeki her markaya göre ilgili sütunları doldur
      const brandOeMap = item.brand_oe_map || {};
      
      // Markalar için dinamik sütun başlıkları ekle
      const dynamicHeaders = Object.keys(brandOeMap).map((brand) => `${brand.toLowerCase()}_oe_numbers`);
  
      // Başlıkları dinamik olarak güncelle
      finalHeaders = [...headers, ...dynamicHeaders]; // Final başlıkları, sabit ve dinamik başlıkları birleştirir.
  
      // Satır verisini oluştur
      const row = [
        item.YV_NO || '',                             // İlk sütun: YV NO (Klasör adı)
        item.brand || '',                             // brand
        item.reference || '',                        // reference
        item.eanNumber || '',                        // eanNumber
        item.width1 || '',                           // width1
        item.height1 || '',                          // height1
        item.thickness1 || '',                       // thickness1
        item.manufacturerRestriction || '',          // manufacturerRestriction
        item.checkmark || '',                        // checkmark
        item.SVHC || '',                             // SVHC
        item.wvaNumbers || '',                       // wvaNumbers
        // Dinamik brand_oe_map verilerini ekle
        ...Object.keys(brandOeMap).map((brand) => {
          return brandOeMap[brand] ? brandOeMap[brand].join(', ') : '';
        })
      ];
  
      return row;
    });
  
    // Sayfayı ve başlıkları oluştur
    const ws = XLSX.utils.aoa_to_sheet([finalHeaders, ...wsData]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, outputFile);
  };
  
  // Klasördeki tüm klasörleri al
  const folders = getFolders(jsonFolder);
  
  folders.forEach((folder) => {
    const folderPath = path.join(jsonFolder, folder);
    const jsonFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith('.json'));
  
    jsonFiles.forEach((file) => {
      const jsonFilePath = path.join(folderPath, file);
      const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
      
      // Excel dosyasının ismini timestamp ekleyerek oluştur
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputFile = path.join(excelFolder, `PAD_TECH_DETAILS_${timestamp}.xlsx`);
  
      writeToExcel([jsonData], outputFile);
    });
  });