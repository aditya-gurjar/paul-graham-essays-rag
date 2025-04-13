import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { EssayChunk } from '../../../app/types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    console.log('Query: ', query);
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 },
      );
    }

    const queryText = query.replace(/\s+/g, ' ').trim();
    // Generate embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: queryText,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Search for similar chunks using the match_essay_chunks function
    const { data: chunks, error } = await supabase.rpc('match_essay_chunks', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 10,
    });

    if (error) {
      console.error('Error performing similarity search:', error);
      return NextResponse.json(
        { error: 'Failed to perform search' },
        { status: 500 },
      );
    }

    console.log('Found number of chunks: ', chunks.length);
    // print similarity scores
    console.log(
      'Similarity scores: ',
      chunks.map((chunk: EssayChunk) => chunk.similarity),
    );
    // Get essay information for each chunk
    const essayIds = [
      ...new Set(chunks.map((chunk: EssayChunk) => chunk.essay_id)),
    ];
    console.log('Number of unique essays: ', essayIds.length);

    const { data: essays, error: essaysError } = await supabase
      .from('essays')
      .select('id, title, url')
      .in('id', essayIds);

    if (essaysError) {
      console.error('Error fetching essay details:', essaysError);
      return NextResponse.json(
        { error: 'Failed to fetch essay details' },
        { status: 500 },
      );
    }

    // Combine chunk data with essay data
    const results = chunks.map((chunk: EssayChunk) => {
      const essay = essays.find(e => e.id === chunk.essay_id);
      return {
        chunk_id: chunk.id,
        essay_id: chunk.essay_id,
        essay_title: essay?.title,
        essay_url: essay?.url,
        chunk_text: chunk.chunk_text,
        similarity: chunk.similarity,
      };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
