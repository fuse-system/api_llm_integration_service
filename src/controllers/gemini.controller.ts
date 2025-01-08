import { Body, Controller, Post } from '@nestjs/common';
import { ResponseDto } from 'src/dtos/response.dto';
import { GeminiAiService } from 'src/services/gemini.service';

@Controller('api/v1')
export class GeminiController {
  constructor(private googleAiService: GeminiAiService) {}

  @Post('gemini')
  async generateContent(@Body('question') question: string) {
    try {
      return ResponseDto.ok(
        await this.googleAiService.generateContent(question),
      );
    } catch (error) {
      return ResponseDto.throwBadRequest(error.message, error);
    }
  }
}
