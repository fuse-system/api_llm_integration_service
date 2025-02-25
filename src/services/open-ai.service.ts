import { Injectable, NotFoundException } from '@nestjs/common';
import { OpenAI } from 'openai';
import { HandleLLMResponseService } from './handle-llm-response.servce';
import { LLMResponse } from 'src/types/interface';
import { createReadStream } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

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
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: any }>,
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
        model: 'gpt-4o',
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

  //audio

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    console.log(
      'OpenAI API Key:',
      process.env.OpenAI_Api ? 'Exists' : 'Not Found',
    );

    console.log('Sending request to OpenAI API...');
    try {
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Empty audio buffer');
      }

      const tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.mp3`);
      console.log('Temp file path:', tempFilePath);

      require('fs').writeFileSync(tempFilePath, audioBuffer);

      console.log('Attempting to transcribe audio file111111:', tempFilePath);

      const fs = require('fs');
      if (!fs.existsSync(tempFilePath)) {
        throw new Error(`File not found: ${tempFilePath}`);
      }
      console.log('Attempting to transcribe audio file222:', tempFilePath);

      const transcription = await this.openai.audio.transcriptions.create({
        file: createReadStream(tempFilePath),
        model: 'whisper-1',
      });
      console.log('Transcription success:', transcription);
      console.log('Attempting to transcribe audio file33333:', tempFilePath);

      require('fs').unlinkSync(tempFilePath);
      return transcription.text;
    } catch (error) {
      console.error('OpenAI API Error:', error.response?.data || error);
      console.error('Detailed transcription error:', {
        message: error.message,
        status: error.status,
        stack: error.stack,
      });

      if (error.message.includes('Connection error')) {
        throw new Error(
          'OpenAI API connection failed. Check your internet or API key.',
        );
      }

      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }
    async analyzePronunciation(
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    ) {
      const systemPrompt = `Analyze the pronunciation quality based on these criteria:
        1. Phonetic accuracy (0-10)
        2. Intonation (0-10)
        3. Rhythm and pacing (0-10)
        4. Common errors detection
        5. Improvement suggestions
        Provide response in JSON format with detailed analysis.`;
  
      const response = await this.getChatGptResponse([
        { role: 'system', content: systemPrompt },
        ...messages,
      ]);
  
      console.log('AI Response:', response);
    }
  async convertImageToText(imageBuffer: Buffer): Promise<string> {
      const base64Image = imageBuffer.toString('base64');

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all text from this image. Output just the raw text without any additional commentary." },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                }
              }
            ]
          }
        ]
      });
      
      const text = response.choices[0].message.content;
      return text;

  }
  async convertTextToSpeech(text: string): Promise<string> {
    const response = await this.openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy", 
      input: text,
    });
    
    const speechFileName = `speech_${Date.now()}.mp3`;
    const speechFilePath = `./uploads/${speechFileName}`;
    
    const buffer = Buffer.from(await response.arrayBuffer());
    
    fs.writeFileSync(speechFilePath, buffer);
    
    return "/"+speechFileName;
  }
}
