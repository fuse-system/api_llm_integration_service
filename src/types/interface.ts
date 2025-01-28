export interface LLMResponse {
  id: string;
  llm: string;
  type: 'code'|'text';
  content: string;
  metadata: {
    description?: string;
    generated_at?: string;
    usage?:{
      tokens_used?:number;
      proccessing_time_ms?:number;
    }
  }
  language?: string;
}