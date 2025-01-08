import { Body, Controller, Post } from '@nestjs/common';
import { ResponseDto } from 'src/dtos/response.dto';
import { ClaudeAiService } from 'src/services/claude.service';

@Controller('claude')
export class ClaudeController {
  constructor(private readonly claudeAiService: ClaudeAiService) {}
  @Post('prompt')
  async generateContent(@Body('prompt') prompt: string) {
    try {
      const message = await this.claudeAiService.generateContent(prompt);
      return ResponseDto.ok(message);
    } catch (error) {
      return ResponseDto.throwBadRequest(error.message, error);
    }
  }
}
