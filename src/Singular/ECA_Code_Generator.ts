import * as fs from "fs";
import * as path from "path";

const brand_initials: string[] = Array.from({ length: 291 }, (_, i) => String(i + 10));

const drum_range: string[] = Array.from({ length: 408 }, (_, i) => String(i + 1093));
const passengerCar_disc_range: string[] = Array.from({ length: 1499 }, (_, i) => String(i + 1501));
const discBrakePad_range: string[] = Array.from({ length: 28000 }, (_, i) => String(i + 10000));
//const drumBrakePad_range: string[] = Array.from({ length: 10000 }, (_, i) => String(i + 10000));
//const clutchFacingsPad_range: string[] = Array.from({ length: 5000 }, (_, i) => String(i + 30000));
//const frictionPlatesPad_range: string[] = Array.from({ length: 3000 }, (_, i) => String(i + 35000));

const disc_additions: string[] = ["", "B", "C", "CS", "H", "S"];
const drum_additions: string[] = ["", "H"];
const pad_centers: string[] = Array.from({ length: 9 }, (_, i) => String(i + 1));
const pad_additions: string[] = [ "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15"];


function numberGenerator(initial: string[], centers: string[], additions: string[]): string[] {
    return initial.flatMap((initial) =>
        centers.flatMap((center) =>
        additions.map((addition) => initial + center + addition)
      )
  );
}

function main() {

  const drumNumbers = numberGenerator(brand_initials, drum_range, drum_additions);
  const discNumbers = numberGenerator(brand_initials, passengerCar_disc_range, disc_additions);
  const padNumbers = numberGenerator(discBrakePad_range, pad_centers, pad_additions);

  const OUTPUT_PATH = path.join(`src/data/Produced/ECA/`);

  fs.writeFileSync(`${OUTPUT_PATH}drumNumbers.json`, JSON.stringify(drumNumbers, null, 2), "utf-8");
  fs.writeFileSync(`${OUTPUT_PATH}discNumbers.json`, JSON.stringify(discNumbers, null, 2), "utf-8");
  fs.writeFileSync(`${OUTPUT_PATH}padNumbers.json`, JSON.stringify(padNumbers, null, 2), "utf-8");

}

main();