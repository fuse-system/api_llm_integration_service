import { Injectable, NotFoundException } from '@nestjs/common';
import { UUID } from 'crypto';
import { OpenAI } from 'openai';
import { v4 as uuiidv4 } from 'uuid';
import { HandleLLMResponseService } from './handle-llm-response.servce';
import { LLMResponse } from 'src/types/interface';



@Injectable()
export class OpenAiService {
    private openai: OpenAI;

    constructor(
      private readonly handleLLMResponseService: HandleLLMResponseService
    ) {
      this.openai = new OpenAI({
        apiKey: process.env.OpenAI_Api,
    });
    }
  
    async getChatGptResponse(messages: Array<{role:"user" | "assistant", content: string}>): 
     Promise<{ chatResponse: string, structuredResponse: LLMResponse[] } | string> {
      
      if (!messages) {
        throw new NotFoundException('Message must be provided');
      }
      try {
        const startTime = performance.now()
        const chatCompletion = await this.openai.chat.completions.create({
          messages: messages,
          model: "gpt-4o-mini",
        });
        const endTime = performance.now();
        const processingTimeMs = Math.round(endTime - startTime);
        const chatResponse = chatCompletion.choices[0].message.content;
        const total_token = chatCompletion.usage.total_tokens;
        const llm = "gpt-4o";

        const structuredResponse = this.handleLLMResponseService.handleResponse(
          llm,
          chatResponse,
          processingTimeMs,
          total_token
        );
        
        return {
          chatResponse,
          structuredResponse
        }
      } catch (error) {
        console.error('Error interacting with OpenAI:', error);
        return 'Sorry, something went wrong.';
      }
    }
}
