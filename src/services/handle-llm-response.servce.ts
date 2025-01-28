import { Injectable } from '@nestjs/common';
import { LLMResponse } from 'src/types/interface';
import { v4 as uuiidv4 } from 'uuid';
@Injectable()
export class HandleLLMResponseService {
  constructor() {}
  handleResponse(llm: string, chatResponse: string, proccessing_time_ms, total_tokens) :LLMResponse[] {
    const segmants = chatResponse.split(/(```[\s\S]*?```)/g);
    const structuredData:LLMResponse[] = [];
    // extact lang and codeContent with regex
    const codeBlockRegex =  /```(?:([\w-]+)?\n)?([\s\S]*?)\n```/;
    // content: codeMatch?.[1]?.trim() || segment.trim(),
    segmants.forEach((segmant) => {
      if(!segmant.trim()) return;

      const isCode = segmant.startsWith('```');
      const codeMatch = segmant.match(codeBlockRegex);
      const lang = codeMatch?.[1]?.trim()
      const codeContent = codeMatch?.[2]?.trim()

      structuredData.push({
        id: uuiidv4(),
        llm: llm,
        type: isCode? 'code' :'text',
        content: codeContent || segmant.trim(),
        metadata:{
          description: isCode? 'Generated code snippet': 'text explanation',
          generated_at: new Date().toISOString(),
          usage: {
            tokens_used: total_tokens || 0,
            proccessing_time_ms: proccessing_time_ms
          }
        },
        language: lang || 'plaintext'
      })
    })
    return structuredData;
  }

}
