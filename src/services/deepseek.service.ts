import { HttpService } from '@nestjs/axios';
import {Injectable} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import openAI from 'openai'
import { HandleLLMResponseService } from './handle-llm-response.servce';
import { LLMResponse } from 'src/types/interface';

@Injectable()
export class DeepseekService {
  constructor(
    private readonly httpService: HttpService,
    private readonly handleLLMResponseService: HandleLLMResponseService
  
  ) { }
  
    async askDeepseek(messages: Array<{role:"user" | "assistant", content: string}>): 
     Promise<{ chatResponse: string, structuredResponse: LLMResponse[] } | string>{
      const apiUrl = process.env.DEEPSEEK_API_URL;
      const apiKey = process.env.DEEPSEEK_API_KEY;

      console.log('messages', messages)
      const requestPayload = {
        model: 'deepseek-chat',
        messages: messages,
          // { role: 'system', content: 'You are a helpful assistant.' },
        stream: false,
      };

      try{
        const startTime = performance.now()
        const completion = await firstValueFrom(
          this.httpService.post(apiUrl, requestPayload, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }),
        );
        const endTime = performance.now();
        const processingTimeMs = Math.round(endTime - startTime);
        const chatResponse = completion.data.choices[0].message.content;
        const total_token = completion.data.usage.total_tokens;
        const llm = "deepseek-v3";

        const structuredResponse = this.handleLLMResponseService.handleResponse(
          llm,
          chatResponse,
          processingTimeMs,
          total_token
        );
        return {
          chatResponse,
          structuredResponse,
        }
      }catch(err){
        throw new Error(`Failed to get response from DeepSeek API, ${err}`);
      }
    

  }
}
