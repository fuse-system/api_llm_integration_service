import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { LLMResponse } from 'src/types/interface';
import { HandleLLMResponseService } from './handle-llm-response.servce';

@Injectable()
export class DeepseekService {
  constructor(
    private readonly httpService: HttpService,
    private readonly handleLLMResponseService: HandleLLMResponseService,
  ) {}

  async askDeepseek(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<{ chatResponse: string; structuredResponse: LLMResponse[] } | string> {
    const apiUrl = process.env.DEEPSEEK_API_URL;
    const apiKey = process.env.DEEPSEEK_API_KEY;

    console.log('messages', messages);
    const requestPayload = {
      model: 'deepseek-chat',
      messages: messages,
      stream: true, // Enable streaming
    };

    try {
      const startTime = performance.now();
      const response = await firstValueFrom(
        this.httpService.post(apiUrl, requestPayload, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream', // Set response type to stream
        }),
      );

      let chatResponse = '';
      const structuredResponse: any[] = [];

      // Handle streamed data
      response.data.on('data', (chunk) => {
        const chunkString = chunk.toString();
        const lines = chunkString.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          const message = line.replace(/^data: /, '');
          if (message === '[DONE]') {
            // Stream is complete
            return;
          }

          try {
            const parsed = JSON.parse(message);
            const content = parsed.choices[0]?.delta?.content || '';
            chatResponse += content;

            // Process each chunk (optional)
            console.log('Received chunk:', content);
          } catch (err) {
            console.error('Error parsing chunk:', err);
          }
        }
      });

      response.data.on('end', () => {
        const endTime = performance.now();
        const processingTimeMs = Math.round(endTime - startTime);
        const total_token = chatResponse.length; // Approximate token count

        const llm = 'deepseek-v3';
        const structuredChunk = this.handleLLMResponseService.handleResponse(
          llm,
          chatResponse,
          processingTimeMs,
          total_token,
        );
        structuredResponse.push(structuredChunk);

        console.log('Stream completed. Final response:', chatResponse);
      });

      return {
        chatResponse,
        structuredResponse,
      };
    } catch (err) {
      throw new Error(`Failed to get response from DeepSeek API, ${err}`);
    }
  }
}
// import { HttpService } from '@nestjs/axios';
// import {Injectable} from '@nestjs/common';
// import { firstValueFrom } from 'rxjs';

// import openAI from 'openai'
// import { HandleLLMResponseService } from './handle-llm-response.servce';
// import { LLMResponse } from 'src/types/interface';

// @Injectable()
// export class DeepseekService {
//   constructor(
//     private readonly httpService: HttpService,
//     private readonly handleLLMResponseService: HandleLLMResponseService
  
//   ) { }
  
//     async askDeepseek(messages: Array<{role:"user" | "assistant", content: string}>): 
//      Promise<{ chatResponse: string, structuredResponse: LLMResponse[] } | string>{
//       const apiUrl = process.env.DEEPSEEK_API_URL;
//       const apiKey = process.env.DEEPSEEK_API_KEY;

//       console.log('messages', messages)
//       const requestPayload = {
//         model: 'deepseek-chat',
//         messages: messages,
//           // { role: 'system', content: 'You are a helpful assistant.' },
//         stream: false,
//       };

//       try{
//         const startTime = performance.now()
//         const completion = await firstValueFrom(
//           this.httpService.post(apiUrl, requestPayload, {
//             headers: {
//               'Authorization': `Bearer ${apiKey}`,
//               'Content-Type': 'application/json',
//             },
//           }),
//         );
//         const endTime = performance.now();
//         const processingTimeMs = Math.round(endTime - startTime);
//         const chatResponse = completion.data.choices[0].message.content;
//         const total_token = completion.data.usage.total_tokens;
//         const llm = "deepseek-v3";

//         const structuredResponse = this.handleLLMResponseService.handleResponse(
//           llm,
//           chatResponse,
//           processingTimeMs,
//           total_token
//         );
//         return {
//           chatResponse,
//           structuredResponse,
//         }
//       }catch(err){
//         throw new Error(`Failed to get response from DeepSeek API, ${err}`);
//       }
    

//   }
// }
