import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { EssayChunk } from '@/app/types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// The embedding model
const embeddingModel = 'text-embedding-3-small';

async function getEmbedding(text: string) {
  // Clean text - remove extra whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  const embeddingResponse = await openai.embeddings.create({
    model: embeddingModel,
    input: text,
  });
  
  return embeddingResponse.data[0].embedding;
}

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Generate embedding using our helper function
    const embedding = await getEmbedding(query);

    // Lower threshold and increase match count to get more potentially relevant results
    const { data: chunks, error } = await supabase.rpc('match_essay_chunks', {
      query_embedding: embedding,
      match_threshold: 0.5,  // More permissive threshold
      match_count: 15,       // Get more chunks for better context
    });

    if (error) {
      console.error('Error performing similarity search:', error);
      return NextResponse.json(
        { error: 'Failed to perform search' },
        { status: 500 }
      );
    }

    if (!chunks || chunks.length === 0) {
      // Create a streaming response for no relevant information
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send a not found message
            const noResultsMessage = "I couldn't find any relevant information in Paul Graham's essays for your query.";
            
            // Stream the message in smaller chunks to simulate typing
            const words = noResultsMessage.split(' ');
            for (let i = 0; i < words.length; i++) {
              const content = words[i] + ' ';
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`)
              );
              // Small delay between words for a natural typing effect
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            // Send empty sources and done flag
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ sources: [], done: true })}\n\n`)
            );
            
            controller.close();
          } catch (error) {
            console.error('Error:', error);
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Get essay information for each chunk
    const essayIds = [...new Set(chunks.map((chunk: EssayChunk) => chunk.essay_id))];
    
    const { data: essays, error: essaysError } = await supabase
      .from('essays')
      .select('id, title, url')
      .in('id', essayIds);

    if (essaysError) {
      console.error('Error fetching essay details:', essaysError);
      return NextResponse.json(
        { error: 'Failed to fetch essay details' },
        { status: 500 }
      );
    }

    // Create a map of essay ID to a consistent reference number
    const essayRefMap = new Map();
        essays.forEach((essay, index) => {
        essayRefMap.set(essay.id, index + 1);
    });

    // Create context using the consistent reference numbers
    const context = chunks
    .map((chunk: EssayChunk) => {
        const essay = essays.find((e) => e.id === chunk.essay_id);
        const refNumber = essayRefMap.get(essay?.id);
        return `[${refNumber}] From essay "${essay?.title}" (${essay?.url}):\n${chunk.chunk_text}`;
    })
    .join('\n\n');

    // Format sources using the same reference numbers
    const sources = essays.map((essay) => ({
        id: essayRefMap.get(essay.id),
        title: essay.title,
        url: essay.url,
    }));

    // Format the references section
    const uniqueSources = sources.filter(
      (source, index, self) => 
        index === self.findIndex((s) => s.title === source.title)
    ).map(source => ({
      id: source.id,
      title: source.title,
      url: source.url
    }));

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Create context and sources as before
          
          // Use streaming OpenAI API
          const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo',
            messages: [
              {
                role: 'system',
                content: `You are an AI assistant that helps users understand Paul Graham's essays.
                You will be given excerpts from his essays along with a user query.
      
                Respond to the query based ONLY on the essay excerpts provided. Be confident, detailed, and direct in your response.
      
                - If the information IS in the excerpts, provide a detailed, knowledgeable response with specific examples, quotes, and concepts from Paul Graham's writing.
                - Include direct insights from the essays, mentioning specific stories, companies, or individuals that Paul Graham discusses.
                - Provide rich, nuanced analysis that captures the depth of Paul Graham's thinking.
                - If the information IS NOT clearly in the excerpts but the topic is related, provide the closest relevant insights from Paul Graham's essays that were included.
                - Only if the query is completely unrelated to the provided content, state that Paul Graham hasn't specifically addressed this topic in the provided essays.
      
                Format your response in a clear, structured way similar to this example:
      
                Paul Graham believes that good startup founders have several key qualities. They exhibit **persistent adaptability**, pushing through challenges while being open to change [2]. They possess **determination** to overcome obstacles, as seen with WePay's founders who literally froze their accounts in blocks of ice when PayPal shut them down [3], and **flexibility** to pivot when necessary, like Daniel Gross who shifted his idea multiple times before creating a successful search engine [3].
      
                Additional guidance:
                - Bold key concepts and phrases using ** ** for emphasis
                - Use [index] citations to reference which essay the information comes from
                - Structure your response with paragraphs and clear organization
                - Include specific examples, companies, and stories that Paul Graham mentions
                - Provide direct insights and concrete details rather than general statements
                - End with a concise summary that captures the essence of Paul Graham's thinking
      
                Your goal is to sound like an expert on Paul Graham's writing who can provide concrete, specific insights from his essays with rich detail and nuance.`,
              
              },
              {
                role: 'user',
                content: `User query: ${query}\n\nEssay excerpts:\n${context}`,
              },
            ],
            temperature: 0.5,
            stream: true, // Enable streaming
          });

          // let responseText = '';
          
          // Process the stream
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            // responseText += content;
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`)
            );
          }
          
          // Send the sources at the end
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ sources: uniqueSources, done: true })}\n\n`)
          );
          
          controller.close();
        } catch (error) {
          console.error('Error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}