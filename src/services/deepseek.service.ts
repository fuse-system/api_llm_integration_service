import { HttpService } from '@nestjs/axios';
import {Injectable} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DeepseekService {

    constructor(private readonly httpService: HttpService) { }

    async askDeepseek(prompt: string): Promise<string> {
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
    }
}
