
import * as fs from 'fs';
import * as path from 'path';


const brand_initials: string[] = Array.from({ length: 990 }, (_, i) => String(i + 1));

const drum_range: string[] = Array.from({ length: 408 }, (_, i) => String(i + 1093));
const passengerCar_disc_range: string[] = Array.from({ length: 1500 }, (_, i) => String(i + 1500));
const passengerCar_pad_range: string[] = Array.from({ length: 100 }, (_, i) => String(i + 20000));

const disc_additions: string[] = ["","B", "C", "CS", "H", "S"];
const drum_additions: string[] = ["", "H"];
const pad_centers: string[] = Array.from({ length: 9 }, (_, i) => String(i + 1));
const pad_additions: string[] = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15"];

function getDrumNumbers(): string[] {
    return brand_initials.flatMap(initial =>
        drum_range.flatMap(drum =>
            drum_additions.map(drum_addition => initial + drum + drum_addition)
        )
    );
}

function getDiscNumbers(): string[] {
    return brand_initials.flatMap(initial =>
        passengerCar_disc_range.flatMap(disc =>
            disc_additions.map(disc_addition => initial + disc + disc_addition)
        )
    );
}

function getPadnumbers(): string[] {
    return brand_initials.flatMap(initial =>
        passengerCar_pad_range.flatMap(pad =>
            pad_centers.flatMap(pad_center =>
                pad_additions.map(pad_addition => initial + pad + pad_center + pad_addition)
            )
        )
    );
}

function main() {
    const drumNumbers = getDrumNumbers();
    //const discNumbers = getDiscNumbers();
    //const padNumbers = getPadnumbers();

    const drumNumbersPath = path.resolve("src/data/Produced/ECA", "drumNumbers.json");
    fs.writeFileSync(drumNumbersPath, JSON.stringify(drumNumbers, null, 2), 'utf-8');
}


main();