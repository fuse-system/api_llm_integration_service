import { Injectable, NotFoundException } from '@nestjs/common';
import { OpenAI } from 'openai';
@Injectable()
export class OpenAiService {
    private openai: OpenAI;

    constructor() {
      this.openai = new OpenAI({
        apiKey: process.env.OpenAI_Api,
    });
    }
  
    async getChatGptResponse(message: string): Promise<string> {
      if (!message) {
        throw new NotFoundException('Message must be provided');
      }
      try {
        const chatCompletion = await this.openai.chat.completions.create({
          messages: [{ role: 'user', content: message }],
          model: "gpt-4o-mini",
          
         
        });
  
        return chatCompletion.choices[0].message.content;
      } catch (error) {
        console.error('Error interacting with OpenAI:', error);
        return 'Sorry, something went wrong.';
      }
    }
}
