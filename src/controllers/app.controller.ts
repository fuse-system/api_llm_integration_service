import { Controller, Get, UseGuards, Post, Body, Param } from '@nestjs/common';
import { AppService } from '../services/app.service';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../core/jwt-auth-guard/jwt-auth.guard';
import { OpenAiService } from 'src/services/open-ai.service';
import { GeminiAiService } from 'src/services/gemini.service';
import { ResponseDto } from 'src/dtos/response.dto';
import { MODEL } from 'src/types/enum';
import { DeepseekService } from 'src/services/deepseek.service';
import { QueryModelDto } from 'src/dtos/query-model-dto';

@Controller('api/v1')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly openAiService: OpenAiService,
    private readonly geminiService: GeminiAiService,
    private readonly deepseekService: DeepseekService,
  ) {}
  @Post('/llms/:llm_type')
  async chat(@Body() body: any, @Param() llm_type: QueryModelDto) {
    try {
      if(llm_type.llm_type === MODEL.DEEPSEEK){
        return ResponseDto.ok( await this.deepseekService.askDeepseek(body.message),
        );
      } else if(llm_type.llm_type === MODEL.GEMINI){
        return ResponseDto.ok( await this.geminiService.generateContent(body.message),
        );
      } else if(llm_type.llm_type === MODEL.OPENAI){
        return ResponseDto.ok( await this.openAiService.getChatGptResponse(body.message),
        );
      }
    } catch (error) {
      return ResponseDto.throwBadRequest(error.message, error);
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
