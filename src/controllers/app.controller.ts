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

import { ClaudeAiService } from 'src/services/claude.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {v4 as uuidv4 } from 'uuid'

@Controller('api/v1')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly openAiService: OpenAiService,
    private readonly geminiService: GeminiAiService,
    private readonly deepseekService: DeepseekService,
    private readonly claudeAiService: ClaudeAiService,
  ) {}

  @MessagePattern('ask-llm')
  async askLlm(data:
    { 
      messages:Array<{role:"user" |"assistant", content:string}>,
      llmType:string,
      sessionId?:string
    }
  ) {
    
    let answer;
    if (data.llmType == MODEL.OPENAI) {
      answer = await this.openAiService.getChatGptResponse(data.messages);
    } else if (data.llmType == MODEL.GEMINI) {
      answer = await this.geminiService.generateContent(data.sessionId, data.messages);
    } else if(data.llmType == MODEL.DEEPSEEK){
      answer = await this.deepseekService.askDeepseek(data.messages);
    } else if(data.llmType == MODEL.CLAUDE){
      answer = await this.claudeAiService.generateContent(data.messages);
    } else {
      answer = { success: false }
    }
    return {success: true, data: answer};
  }

  @Post('/llm/:llm_type')
  async chat(
    @Body() body: {message: string}, @Param() llm_type: QueryModelDto) {
    try {
      const llmMessage: Array<{role: "user" | "assistant", content: string}> = [{role: 'user', content: body.message}]
      const sessionId = uuidv4()
      console.log(sessionId)
      if(llm_type.llm_type === MODEL.DEEPSEEK){
        return ResponseDto.ok( await this.deepseekService.askDeepseek(llmMessage),
        );
      // } else if(llm_type.llm_type === MODEL.GEMINI){
      //   return ResponseDto.ok( await this.geminiService.generateContent(sessionId, llmMessage),
      //   );
      } else if(llm_type.llm_type === MODEL.OPENAI){
        return ResponseDto.ok( await this.openAiService.getChatGptResponse(llmMessage),
        );
      } else if(llm_type.llm_type === MODEL.CLAUDE){
        return ResponseDto.ok( await this.claudeAiService.generateContent(llmMessage),
        );
      }
    } catch (error) {
      return ResponseDto.throwBadRequest(error.message, error);
    }
  }
}
