import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { HandleLLMResponseService } from './handle-llm-response.servce';
import { LLMResponse } from 'src/types/interface';
@Injectable()
export class ClaudeAiService {
  private anthropic: Anthropic;

  constructor(
    private readonly handleLLMResponseService: HandleLLMResponseService
  ) {
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async generateContent(messages: Array<{role: "user" | "assistant", content: string}>):
   Promise<{ chatResponse: string, structuredResponse: LLMResponse[] } | string>{
    if (!messages) {
      throw new NotFoundException('Message must be provided');
    }
    try {
      const startTime = performance.now()
      const result = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: messages,
      });
      const endTime = performance.now();
      const processingTimeMs = Math.round(endTime - startTime);
      const chatResponse = result.content[0]['text'];
      const total_token = result.usage.output_tokens;
      const llm = "claude-3-5-sonnet";
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
      //console.log(error);
      throw new InternalServerErrorException(`Failed to generate content`);
    }
  }
}
