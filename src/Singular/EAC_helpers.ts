import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";
import * as path from "path";
import * as fs from "fs";

export function createDocxDocument(...values: string[]) {
    const sections = values.map((value) => ({
        children: [
            new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                children: [new TextRun({
                    text: value,
                    size: 22,
                    font: "Calibri",
                    color: "000000",
                })],
            }),
        ],
    }));

    return new Document({
        sections,
    });
}

export function writeToWord(documents: {document: Document; filename: string;}[]) {
    documents.forEach((doc) => {
        const outputPath = path.join(`src/data/Produced/EAC/${doc.filename}.docx`);
        Packer.toBuffer(doc.document).then((buffer) => {
            fs.writeFileSync(outputPath, buffer);
        });
    })
}
