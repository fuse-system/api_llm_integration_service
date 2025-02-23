import { Injectable } from '@nestjs/common';

@Injectable()
export class PdfParseService {
  async parsePdf(dataBuffer: Buffer): Promise<string> {
    const pdfParse =require ('pdf-parse');
    const pdfData = await pdfParse(dataBuffer);
    console.log(pdfData.text);
    return pdfData.text;
  }
}
