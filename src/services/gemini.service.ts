import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HandleLLMResponseService } from './handle-llm-response.servce';
import { LLMResponse } from 'src/types/interface';

@Injectable()
export class GeminiAiService {
  private readonly model;
  private genAI: GoogleGenerativeAI;
  private chatSessions: Map<string, any> // store session by session

  constructor(
    private readonly handleLLMResponseService: HandleLLMResponseService,
  ) {
    const genAI = new GoogleGenerativeAI(process.env.Gemini_Api);
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.chatSessions = new Map();
  }

  async generateContent(sessionId: string, messages: Array<{role: any, content: string}>):
   Promise<{ chatResponse: string, structuredResponse: LLMResponse[] } | string> {
    if (!messages || messages.length === 0) {
      throw new NotFoundException('Messages must be provided');
    }
    try {
      const startTime = performance.now();

      let chatSession = this.chatSessions.get(sessionId);
      if (!chatSession) {
        const history = messages
        .slice(0, -1)
        .filter(msg => msg.role !== 'system')
        .map((msg)=>({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        }));

        chatSession = this.model.startChat({
          history,
        });

        this.chatSessions.set(sessionId, chatSession)
      }
      const systemMessage = messages.find(msg => msg.role === 'system');
      const lastestMessage = messages[messages.length - 1].content;
      const finalMessage = systemMessage ? `${systemMessage.content}\n\n${lastestMessage}` : lastestMessage;
      const result = await chatSession.sendMessage(finalMessage);
      const endTime = performance.now();
      const processingTimeMs = Math.round(endTime - startTime);
      const chatResponse = result.response.text();
      const total_token = result.response.usageMetadata.totalTokenCount;
      const llm = "gemini-1.5-flash";

      const structuredResponse = this.handleLLMResponseService.handleResponse(llm, chatResponse, processingTimeMs, total_token);
      return {
        chatResponse,
        structuredResponse,
      }
    } catch (err) {
      console.error('Error generating content:', err);
      throw new InternalServerErrorException('Failed to generate content');
    }
  }
  async endSession(sessionId: string) {
    this.chatSessions.delete(sessionId)
  }

  // this function still not working
  async sendImage(sessionId: string, messages: Array<{role: string, content: string}>):
  Promise<{ chatResponse: string, structuredResponse: LLMResponse[] } | string> {
   if (!messages || messages.length === 0) {
     throw new NotFoundException('Messages must be provided');
   }
   try {
     const startTime = performance.now();

     let chatSession = this.chatSessions.get(sessionId);
     if (!chatSession) {
      // Parse history messages for multi-modal support
      const history = messages.slice(0, -1).map(msg => {
        try {
          const content = JSON.parse(msg.content);
          const parts = [];
          if (content.text) parts.push({ text: content.text });
          if (content.image) {
            const imageMatch = content.image.match(/^data:(image\/\w+);base64,(.+)$/);
            if (imageMatch) {
              parts.push({
                inlineData: {
                  mimeType: imageMatch[1],
                  data: imageMatch[2]
                }
              });
            }
          }
          return {
            role: msg.role === 'user' ? 'user' : 'model',
            parts: parts
          };
        } catch {
          // If parsing fails, treat as text
          return {
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          };
        }
      });

      chatSession = this.model.startChat({ history });
      this.chatSessions.set(sessionId, chatSession);
    }
     const lastestMessage = messages[messages.length - 1].content;
     let parts = [];
     try{
        const content = JSON.parse(lastestMessage);
        if(content.text) parts.push({ text: content.text });
        if(content.image){
          const imageMatch = content.image.match(/^data:(image\/\w+);base64,(.+)$/);
          if(imageMatch){
            parts.push({
              inlineData: {
                mimeType: imageMatch[1],
                data: imageMatch[2]
              }
            });
          }
        }
     }catch{
        parts.push({ text: lastestMessage });
     }
     const systemMessage = messages.find(msg => msg.role === 'system');
     const finalMessage = systemMessage ? `${systemMessage.content}\n\n${lastestMessage}` : lastestMessage;
     const result = await chatSession.sendMessage(finalMessage);
     const endTime = performance.now();
     const processingTimeMs = Math.round(endTime - startTime);
     const chatResponse = result.response.text();
     const total_token = result.response.usageMetadata.totalTokenCount;
     const llm = "gemini-1.5-flash";
    //  console.log('parts', parts)
     const structuredResponse = this.handleLLMResponseService.handleResponse(llm, chatResponse, processingTimeMs, total_token);
     return {
       chatResponse,
       structuredResponse,
     }
   } catch (err) {
     console.error('Error generating content:', err);
     throw new InternalServerErrorException('Failed to generate content');
   }
 }
}
