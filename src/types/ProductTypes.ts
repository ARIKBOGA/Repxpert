export type Product = {
  reference: string; // Ürünün referansı
  id: string; // Ürünün eşsiz ID'si veya referans kodu
  name: string; // Ürün adı
  brand?: string;
  eanNumber?: string | number;
  //oeNumbers?: string[] | Set<string>; // OE numaraları
  brand_oe_map?: Record<string, string[]> | Map<string, Set<string>>; // Markaya göre OE numaraları
  wvaNumbers?: string[];
  attributes?: ProductAttributes | undefined; // Boyutlar
  [key: string]: any; // Ek alanlar için esneklik
};

export type ProductAttributes = {
    manufacturerRestriction: string | undefined;
    width1: string | undefined;
    width2: string | undefined;
    height1: string | undefined;
    height2: string | undefined;
    thickness1: string | undefined;
    thickness2: string | undefined;
    checkmark: string | undefined;
    SVHC: string | undefined;
    [key: string]: any; // Ek alanlar için esneklik
};