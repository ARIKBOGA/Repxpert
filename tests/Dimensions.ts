export type Dimensions = {
    manufacturerRestriction: string | undefined;
    width: string | undefined;
    height: string | undefined;
    thickness: string | undefined;
    checmark: string | undefined;
    SVHC: string | undefined;
    [key: string]: any; // Ek alanlar için esneklik
};