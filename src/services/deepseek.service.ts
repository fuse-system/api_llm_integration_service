import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
// import { HandleLLMResponseService } from './handle-llm-response.service';
import { LLMResponse } from 'src/types/interface';
import { GateWay } from './gateway.events.service';
import { HandleLLMResponseService } from './handle-llm-response.servce';
import { Readable } from 'node:stream';

interface DeepSeekError {
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

interface DeepSeekStreamResponse {
  choices: Array<{
    delta: {
      content?: string;
    };
  }>;
}

@Injectable()
export class DeepseekService {
  private buffer: string = '';
  private wordBuffer: string[] = [];
  private readonly CHUNK_SIZE = 15;

  constructor(
    private readonly httpService: HttpService,
    private readonly handleLLMResponseService: HandleLLMResponseService,
    private readonly gateWay: GateWay,
  ) {}

  async askDeepseek(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  ): Promise<
    { chatResponse: string; structuredResponse: LLMResponse[] } | string
  > {
    const apiUrl = process.env.DEEPSEEK_API_URL;
    const apiKey = process.env.DEEPSEEK_API_KEY;

    // Validate message structure first
    const validatedMessages = messages.filter((msg) => {
      // Check for required message structure
      if (!msg.role || !['user', 'assistant'].includes(msg.role)) return false;
      if (typeof msg.content !== 'string') return false;
      return true;
    });

    // Filter out invalid assistant messages
    const filteredMessages = validatedMessages.filter((message) => {
      if (message.role === 'assistant') {
        return message.content?.trim() !== ''; // Safe navigation operator
      }
      return true;
    });
    console.log('messages', messages);
    const requestPayload = {
      model: 'deepseek-chat',
      messages: filteredMessages,
      temperature: 0.7,
      stream: false,
    };

    try {
      const startTime = performance.now();
      const completion = await firstValueFrom(
        this.httpService.post(apiUrl, requestPayload, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const endTime = performance.now();
      const processingTimeMs = Math.round(endTime - startTime);
      const chatResponse = completion.data.choices[0].message.content;
      const total_token = completion.data.usage.total_tokens;
      const llm = 'deepseek-v3';

      const structuredResponse = this.handleLLMResponseService.handleResponse(
        llm,
        chatResponse,
        processingTimeMs,
        total_token,
      );
      return {
        chatResponse,
        structuredResponse,
      };
    } catch (err) {
      throw new Error(`Failed to get response from DeepSeek API, ${err}`);
    }
  }

  async askDeepseekStream(
    messages: Array<{ role: 'user' | 'system' | 'assistant'; content: string }>,
    sessionId: string,
  ): Promise<
    { chatResponse: string; structuredResponse: LLMResponse[] } | string
  > {
    const apiUrl = process.env.DEEPSEEK_API_URL;
    const apiKey = process.env.DEEPSEEK_API_KEY;

    // Validate message structure first
    const validatedMessages = messages.filter((msg) => {
      // Check for required message structure
      if (!msg.role || !['user', 'assistant'].includes(msg.role)) return false;
      if (typeof msg.content !== 'string') return false;
      return true;
    });

    // Filter out invalid assistant messages
    const filteredMessages = validatedMessages.filter((message) => {
      if (message.role === 'assistant') {
        return message.content?.trim() !== ''; // Safe navigation operator
      }
      return true;
    });

    // Validate conversation structure
    if (filteredMessages.length === 0) {
      this.handleValidationError(sessionId, 'Conversation history is empty');
      return;
    }

    if (!apiUrl || !apiKey) {
      this.handleValidationError(sessionId, 'Missing API configuration');
      return;
    }

    const requestPayload = {
      model: 'deepseek-chat',
      messages: messages,
      temperature: 0.7,
      stream: true,
    };
    let fullChatResponse = '';
    let start = performance.now();
    let structuredResponse: LLMResponse[] = [];
    try {
      const response = await firstValueFrom(
        this.httpService.post(apiUrl, requestPayload, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          responseType: 'stream',
          validateStatus: () => true,
        }),
      );

      if (response.status !== 200) {
        const errorData = await this.getStreamError(response.data);
        this.handleStreamError(
          sessionId,
          new Error(`API Error: ${response.status} - ${errorData}`),
        );
        return;
      }

      const stream = response.data;

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          this.buffer += chunk.toString();

          let eventEndIndex;
          while ((eventEndIndex = this.buffer.indexOf('\n\n')) !== -1) {
            const eventData = this.buffer.substring(0, eventEndIndex).trim();
            this.buffer = this.buffer.substring(eventEndIndex + 2);

            if (eventData.startsWith('data: ')) {
              const jsonData = eventData.substring(6);
              if (jsonData === '[DONE]') {
                // (this.gateWay.server as any).to(sessionId).emit('stream-end', { sessionId });
                return;
              }

              try {
                const parsedData: DeepSeekStreamResponse = JSON.parse(jsonData);
                const content = parsedData.choices[0]?.delta?.content || '';
                fullChatResponse += content;
                this.processContent(content, sessionId, this.CHUNK_SIZE);
              } catch (err) {
                console.error('Error parsing JSON:', err);
              }
            }
          }
        });

        stream.on('end', () => {
          this.sendRemainingContent(sessionId);
          const endTime = performance.now();
          const processingTimeMs = Math.round(endTime - start);
          const llm = 'deepseek-v3';
          const total_token = 0;
          structuredResponse = this.handleLLMResponseService.handleResponse(
            llm,
            fullChatResponse,
            processingTimeMs,
            total_token,
          );
          (this.gateWay.server as any)
            .to(sessionId)
            .emit('stream-end', { sessionId });
          resolve({ chatResponse: fullChatResponse, structuredResponse });
        });

        stream.on('error', (err: Error) => {
          this.handleStreamError(sessionId, err);
          reject(err);
        });
      });
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      console.error('DeepSeek API Error:', errorMessage);
      this.handleStreamError(
        sessionId,
        new Error(`API Error: ${errorMessage}`),
      );
    }
  }

  private handleValidationError(sessionId: string, message: string) {
    console.error('Validation Error:', message);
    (this.gateWay.server as any)
      .to(sessionId)
      .emit('stream-error', { msg: message });
    throw new Error(`Validation Error: ${message}`);
  }

  private async getStreamError(stream: any): Promise<string> {
    return new Promise((resolve) => {
      let errorData = '';
      stream.on('data', (chunk: Buffer) => {
        errorData += chunk.toString();
      });
      stream.on('end', () => {
        try {
          const parsed: DeepSeekError = JSON.parse(errorData);
          resolve(parsed.error?.message || 'Unknown error');
        } catch {
          resolve(errorData.slice(0, 100));
        }
      });
    });
  }

  private processContent(
    content: string,
    sessionId: string,
    chunkSize: number,
  ) {
    // Split content into tokens while preserving whitespace
    const tokens = content.split(/(\s+)/).filter((t) => t !== '');
    this.wordBuffer.push(...tokens);

    while (this.wordBuffer.length >= chunkSize) {
      const chunk = this.wordBuffer.splice(0, chunkSize).join('');
      (this.gateWay.server as any)
        .to(sessionId)
        .emit('stream-data', { data: chunk });
    }
  }

  private sendRemainingContent(sessionId: string) {
    if (this.wordBuffer.length > 0) {
      const chunk = this.wordBuffer.join('');
      (this.gateWay.server as any)
        .to(sessionId)
        .emit('stream-data', { data: chunk });
      this.wordBuffer = [];
    }
    this.buffer = '';
  }

  private handleStreamError(sessionId: string, err: Error) {
    console.error('Stream error:', err);
    this.sendRemainingContent(sessionId);
    (this.gateWay.server as any).to(sessionId).emit('stream-error', {
      msg: `Stream error: ${err.message}`,
    });
  }
  // fetchDeepseekResponse

  async fetchDeepseekResponse(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  ): Promise<
    { chatResponse: string; structuredResponse: LLMResponse[] } | Readable
  > {
    const apiUrl = process.env.DEEPSEEK_API_URL;
    const apiKey = process.env.DEEPSEEK_API_KEY;

    const requestPayload = {
      model: 'deepseek-chat',
      messages,
    };
    try {
      // Non-streaming logic
      const startTime = performance.now();
      const completion = await firstValueFrom(
        this.httpService.post(apiUrl, requestPayload, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const endTime = performance.now();
      const processingTimeMs = Math.round(endTime - startTime);
      const chatResponse = completion.data.choices[0].message.content;
      const total_token = completion.data.usage.total_tokens;
      const llm = 'deepseek-v3';

      const structuredResponse = this.handleLLMResponseService.handleResponse(
        llm,
        chatResponse,
        processingTimeMs,
        total_token,
      );

      return {
        chatResponse,
        structuredResponse,
      };
    } catch (err) {
      throw new BadRequestException(
        `Failed to get response from DeepSeek API: ${err.message}`,
      );
    }
  }
}
