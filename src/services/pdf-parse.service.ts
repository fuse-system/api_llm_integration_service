const pdfParse =require ('pdf-parse');
import { Injectable } from '@nestjs/common';

@Injectable()
export class PdfParseService {
  async parsePdf(dataBuffer: Buffer): Promise<string> {
    const pdfData = await pdfParse(dataBuffer);
    console.log(pdfData.text);
    return pdfData.text;
  }
}
