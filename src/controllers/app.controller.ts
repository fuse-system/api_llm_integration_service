import { Controller, Get, UseGuards, Post, Body, Param } from '@nestjs/common';
import { AppService } from '../services/app.service';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../core/jwt-auth-guard/jwt-auth.guard';
import { OpenAiService } from 'src/services/open-ai.service';
import { GeminiAiService } from 'src/services/gemini.service';
import { ResponseDto } from 'src/dtos/response.dto';
import { ClaudeAiService } from 'src/services/claude.service';

@Controller('api/v1')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly openAiService: OpenAiService,
    private readonly geminiService: GeminiAiService,
    private readonly claudeAiService: ClaudeAiService,
  ) {}
  @Post('/llm/:llm_type')
  async chat(@Body() body: any, @Param('llm_type') llm_type: string) {
    switch (llm_type) {
      case 'open_ai':
        return ResponseDto.ok(
          await this.openAiService.getChatGptResponse(body.message),
        );
      case 'gemini':
        return ResponseDto.ok(
          await this.geminiService.generateContent(body.message),
        );
      case 'claude':
        return ResponseDto.ok(
          await this.claudeAiService.generateContent(body.message),
        );
      default:
        return ResponseDto.throwNotFound('Invalid LLM type');
    }
  }
  @Get()
  // @ApiBearerAuth('access-token')
  // @ApiOperation({summary: 'Check if the API is working'})
  // @ApiResponse({status: 200, description: 'API is working correctly.'})
  isWorking(): string {
    return this.appService.isWorking();
  }

  @UseGuards(JwtAuthGuard)
  @Get('api/v1/demo')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Demo route' })
  @ApiResponse({ status: 200, description: 'Returns a demo text.' })
  demo(): string {
    return 'demo';
  }
}
