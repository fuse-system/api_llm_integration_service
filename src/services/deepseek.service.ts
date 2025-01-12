import { HttpService } from '@nestjs/axios';
import {Injectable} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import openAI from 'openai'

@Injectable()
export class DeepseekService {
  constructor(private readonly httpService: HttpService) { }
  
    async askDeepseek(prompt: string): Promise<any> {
      const apiUrl = process.env.DEEPSEEK_API_URL;
      const apiKey = process.env.DEEPSEEK_API_KEY;

      const requestPayload = {
        model: 'deepseek-chat',
        messages: [
          // { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt },
        ],
        stream: false,
      };

      try{
        const completion = await firstValueFrom(
          this.httpService.post(apiUrl, requestPayload, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }),
        );
        return await completion.data.choices[0].message.content;
      }catch(err){
        return new Error('Failed to get response from DeepSeek API.');
      }
    

  }
}
