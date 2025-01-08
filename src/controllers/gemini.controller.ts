import { Body, Controller, Post, Query } from '@nestjs/common';
import { CreatePromptDto } from 'src/dtos/create-prompt.dto';
import { QueryModelDto } from 'src/dtos/query-model.dto';
import { ResponseDto } from 'src/dtos/response.dto';
import { DeepseekService } from 'src/services/deepseek.service';
import { GeminiAiService } from 'src/services/gemini.service';
import { MODEL } from 'src/types/enum';

@Controller('api/v1')
export class GeminiController {
  constructor(private googleAiService: GeminiAiService,
    private deepseekService: DeepseekService
  ) {}

  @Post('llms')
  async askLlms(@Body('question') question: string, @Query() query: QueryModelDto) {
    console.log('query', query);
    console.log('question', question);
    try {
      if(query.model === MODEL.DEEPSEEK){
        return ResponseDto.ok(
          await this.deepseekService.generateContent(question),
        );
      } else if(query.model === MODEL.GEMINI){
        return ResponseDto.ok(
          await this.googleAiService.generateContent(question),
        );
      } 
      // add your conditions here
      // add your conditions here

    } catch (error) {
      return ResponseDto.throwBadRequest(error.message, error);
    }
  }

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

  @Post('deepseek')
  async askDeepseek(@Body('question') question: string) {
    try {
      return ResponseDto.ok(
         await  this.deepseekService.generateContent(question),
      );
    } catch (error) {
      return ResponseDto.throwBadRequest(error.message, error);
    }
      
  }
}
