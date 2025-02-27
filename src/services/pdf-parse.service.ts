import { Injectable } from '@nestjs/common';

@Injectable()
export class PdfParseService {
  async parsePdf(dataBuffer: Buffer): Promise<string> {
    const pdfParse =require ('pdf-parse');
    const pdfData = await pdfParse(dataBuffer);
    return pdfData.text;
  }
}
