const normalizeString = (input: string): string => {
    return input
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/İ/g, "I")
        .replace(/[^A-Z0-9]/g, "")
        .trim();
};

const rawBrandAliases = {
    "VW": "VOLKSWAGEN",
    "VAG": "VOLKSWAGEN",
    "ŠKODA": "SKODA",
    "MERCEDES-BENZ": "MERCEDES",
    "MERCEDES BENZ": "MERCEDES",
    "DAEWOO": "DAEWOO - CHEVROLET",
    "CHEVROLET": "DAEWOO - CHEVROLET",
    "TOFAS": "FIAT",
    "EMGRAND": "GEELY"
};

const REPLACE_MAP: Record<string, string> = {
    "CABRIOLET": "CABRIO",
    "LIMOUSINE": "LIMUZIN",
    "LIMO": "LIMUZIN",
    "TOURER": "STATION",
    "PLATFORM CHASSIS": "PLATFORM SASI",
    "CHASSIS": "SASI",
    "KASA BUYUK LIMUZIN": "BOX GRAND LIMUZIN",
    "BOX GRAND LIMUZIN": "KASA BUYUK LIMUZIN",
    "PLATFORM ŞASİ": "PLATFORM SASI",
    "ŞASİ": "SASI",
    "MINIBUS OTOBUS": "BUS",
    "KASA EGIK ARKA": "HB VAN",
    "SERISI": "CLASS",
    "COMBI": "KOMBI",
    "CEE'D": "CEED",
    "PRO CEED": "PROCEED",
    "PRO CEE'D": "PROCEED",
};

const brandAliases: Record<string, string> = Object.fromEntries(
    Object.entries(rawBrandAliases).map(([key, value]) => [
        normalizeString(key),
        value
    ])
);

const normalizedBrandCache = new Map<string, string>();

function getTargetBrandName(brand: string): string {
    const trimmedBrand = brand.trim();
    if (normalizedBrandCache.has(trimmedBrand)) {
        return normalizedBrandCache.get(trimmedBrand)!;
    }

    const normalizedInputBrand = normalizeString(trimmedBrand);
    const aliasedOrOriginal = brandAliases[normalizedInputBrand] || trimmedBrand;
    const result = normalizeString(aliasedOrOriginal);

    normalizedBrandCache.set(trimmedBrand, result);
    return result;
}

const normalizedModelCache = new Map<string, string>();
function normalizeModel(model: string): string {
    const trimmedModel = model.trim();
    if (normalizedModelCache.has(trimmedModel)) {
        return normalizedModelCache.get(trimmedModel)!;
    }
    let normalizedModelValue = trimmedModel.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if ((normalizedModelValue.match(/\(/g) || []).length > (normalizedModelValue.match(/\)/g) || []).length) {
        normalizedModelValue += ")";
    }
    normalizedModelValue = normalizedModelValue
        .replace(/,/g, " ")
        .replace(/İ/g, "I")
        .replace(/[|/]/g, " ")
        .replace(/([^\\s])\(/g, "$1 (")
        .replace(/[\s\-_.]+/g, " ")
        .replace(/([,])\s*/g, "$1")
        .replace(/\s+([,])/g, "$1")
        .replace(/[()]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    for (const [target, replacement] of Object.entries(REPLACE_MAP)) {
        const pattern = new RegExp(`\\b${target}\\b`, "g");
        normalizedModelValue = normalizedModelValue.replace(pattern, replacement);
    }
    normalizedModelCache.set(trimmedModel, normalizedModelValue);
    return normalizedModelValue;
}

export { getTargetBrandName, normalizeModel, normalizeString, brandAliases, REPLACE_MAP, rawBrandAliases, normalizedModelCache };