-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create essays table
CREATE TABLE IF NOT EXISTS essays (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create essay_chunks table with vector support
CREATE TABLE IF NOT EXISTS essay_chunks (
    id SERIAL PRIMARY KEY,
    essay_id INTEGER REFERENCES essays(id),
    chunk_text TEXT NOT NULL,
    embedding VECTOR(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create search function
CREATE OR REPLACE FUNCTION match_essay_chunks(query_embedding VECTOR(1536), match_threshold FLOAT, match_count INT)
RETURNS TABLE(
    id INTEGER,
    essay_id INTEGER,
    chunk_text TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        essay_chunks.id,
        essay_chunks.essay_id,
        essay_chunks.chunk_text,
        1 - (essay_chunks.embedding <=> query_embedding) AS similarity
    FROM essay_chunks
    WHERE 1 - (essay_chunks.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;