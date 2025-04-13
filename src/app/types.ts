// types.ts
export interface Essay {
    id: number;
    title: string;
    url: string;
    content?: string;
}
  
export interface EssayChunk {
id: number;
essay_id: number;
chunk_text: string;
similarity?: number;
}

export interface SearchResult {
chunk_id: number;
essay_id: number;
essay_title: string;
essay_url: string;
chunk_text: string;
similarity: number;
}

export interface RAGResponse {
answer: string;
sources: Array<{ title: string; url: string }>;
}

// In types.ts, make sure you have:
export interface Source {
    id: number;
    title: string;
    url: string;
  }
  
  // And update your Message interface if needed:
  export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: Source[];
  }