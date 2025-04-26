import { Dimensions } from "./Dimensions";

export type Product = {
    reference_OE: string; // Ürünün referansı
    id: string; // Ürünün eşsiz ID'si veya referans kodu
    name: string; // Ürün adı
    brand?: string;
    eanNumber?: string | number;
    oeNumbers?: string[] | Set<string>; // OE numaraları
    usageNumbers?: string[];
    dimensions?: Dimensions | undefined; // Boyutlar
    [key: string]: any; // Ek alanlar için esneklik
  };
  