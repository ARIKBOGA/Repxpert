import { Dimensions } from "./Dimensions";

export type Product = {
  reference: string; // Ürünün referansı
  id: string; // Ürünün eşsiz ID'si veya referans kodu
  name: string; // Ürün adı
  brand?: string;
  eanNumber?: string | number;
  //oeNumbers?: string[] | Set<string>; // OE numaraları
  brand_oe_map?: Record<string, string[]> | Map<string, Set<string>>; // Markaya göre OE numaraları
  wvaNumbers?: string[];
  dimensions?: Dimensions | undefined; // Boyutlar
  [key: string]: any; // Ek alanlar için esneklik
};
