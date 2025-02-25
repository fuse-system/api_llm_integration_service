import { Injectable, NotFoundException } from '@nestjs/common';
import { UUID } from 'crypto';
import { OpenAI } from 'openai';
import { v4 as uuiidv4 } from 'uuid';
import { HandleLLMResponseService } from './handle-llm-response.servce';
import { LLMResponse } from 'src/types/interface';
import { createReadStream, unlinkSync, writeFileSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class OpenAiService {
  private openai: OpenAI;

  constructor(
    private readonly handleLLMResponseService: HandleLLMResponseService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OpenAI_Api,
    });
  }

  async getChatGptResponse(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  ): Promise<
    { chatResponse: string; structuredResponse: LLMResponse[] } | string
  > {
    if (!messages) {
      throw new NotFoundException('Message must be provided');
    }
    try {
      const startTime = performance.now();
      const chatCompletion = await this.openai.chat.completions.create({
        messages: messages,
        model: 'gpt-4o-mini',
      });
      const endTime = performance.now();
      const processingTimeMs = Math.round(endTime - startTime);
      const chatResponse = chatCompletion.choices[0].message.content;
      const total_token = chatCompletion.usage.total_tokens;
      const llm = 'gpt-4o';

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
    } catch (error) {
      console.error('Error interacting with OpenAI:', error);
      return 'Sorry, something went wrong.';
    }
  }

  //AI agent to upload audio and analyzePronunciation

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      //check if audio empty or not
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Empty audio buffer received');
      }
      // create temporary file
      const tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.mp3`);
      console.log('Saving temporary file:', tempFilePath);
      // save audio in this file
      await fs.writeFile(tempFilePath, audioBuffer);

      if (!(await fs.stat(tempFilePath))) {
        throw new Error(`File not found after writing: ${tempFilePath}`);
      }

      console.log('Sending file to OpenAI Whisper...');
      //convert speech to text
      const transcription = await this.openai.audio.transcriptions.create({
        file: createReadStream(tempFilePath),
        model: 'whisper-1',
      });

      if (!transcription.text || transcription.text.trim().length === 0) {
        throw new Error('No speech detected in the provided audio.');
      }

      console.log('Transcription successful:', transcription.text);
      // delete file
      await fs.unlink(tempFilePath);

      return transcription.text;
    } catch (error) {
      console.error('Transcription error:', error);

      throw new Error(`Transcription failed: ${error.message}`);
    }
  }
}
