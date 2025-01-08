import { HttpService } from '@nestjs/axios';
import {Injectable, InternalServerErrorException, NotFoundException} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DeepseekService {

    constructor(private readonly httpService: HttpService) { }

    async generateContent(prompt: string): Promise<string> {
      if (!prompt) {
          throw new NotFoundException('Prompt must be provided');
        }
        try {
          const apiUrl = process.env.DEEPSEEK_API_URL;
          const apiKey = process.env.DEEPSEEK_API_KEY;
          const response = await firstValueFrom(
              this.httpService.post(
                apiUrl,
                {
                  model: 'deepseek-v3', // Specify the model
                  messages: [{ role: 'user', content: prompt }],
                },
                {
                  headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                  },
                },
              ),
            );
          return response.data.choices[0].message.content;
        } catch (err) {
          console.error('Error generating content:', err);
          throw new InternalServerErrorException('Failed to generate content');
        }
  }
    
}
