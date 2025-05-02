export type Dimensions = {
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