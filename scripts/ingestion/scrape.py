import os
import requests
from bs4 import BeautifulSoup
import re
from tqdm import tqdm
import time
from dotenv import load_dotenv
from supabase import create_client
from openai import OpenAI
import tiktoken
import sys

# Load environment variables
load_dotenv()

# Initialize variables
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
openai_api_key = os.getenv("OPENAI_API_KEY")

# Validate configuration
if not openai_api_key:
    print("Error: OPENAI_API_KEY not set in .env file")
    sys.exit(1)

if not supabase_url:
    print("Error: SUPABASE_URL not set in .env file")
    sys.exit(1)

if not supabase_key:
    print("Error: SUPABASE_KEY not set in .env file")
    sys.exit(1)

print(f"Connecting to Supabase at: {supabase_url}")
print(f"Using key ending with: ...{supabase_key[-4:]}")

# Initialize clients
try:
    openai_client = OpenAI(api_key=openai_api_key)
    supabase = create_client(supabase_url, supabase_key)
    print("Successfully connected to Supabase!")
except Exception as e:
    print(f"Error connecting to clients: {e}")
    sys.exit(1)

# Create embeddings model
embedding_model = "text-embedding-3-small"
embedding_encoding = "cl100k_base"  # Encoding for text-embedding-3-small
max_tokens = 8191  # Max tokens for text-embedding-3-small

# Initialize tokenizer
tokenizer = tiktoken.get_encoding(embedding_encoding)

def get_essays_list():
    """Scrape the list of Paul Graham essays from the articles page."""
    url = "http://www.paulgraham.com/articles.html"
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Find all links in the page
    links = soup.find_all('a')
    
    essays = []
    for link in links:
        href = link.get('href')
        title = link.text.strip()
        
        # Only include links to essays that have a title and are relative links
        if href and title and not href.startswith('http'):
            # Convert relative to absolute URL
            if not href.startswith('http'):
                href = f"http://www.paulgraham.com/{href}"
            
            essays.append({
                'title': title,
                'url': href
            })
    
    return essays

def get_essay_content(url):
    """Scrape the content of a Paul Graham essay."""
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Find the main content (usually in the first font tag)
    main_content = soup.find('font')
    
    if main_content:
        # Extract text and clean it
        content = main_content.get_text()
        # Clean up whitespace
        content = re.sub(r'\s+', ' ', content).strip()
        return content
    
    return None

def split_text_into_chunks(text, chunk_size=1000, overlap=100):
    """Split text into chunks of specified size with overlap."""
    words = text.split()
    chunks = []
    
    for i in range(0, len(words), chunk_size - overlap):
        chunk = ' '.join(words[i:i + chunk_size])
        chunks.append(chunk)
    
    return chunks

def get_embedding(text):
    """Get embeddings for a text using OpenAI API."""
    # Truncate text to max token length
    tokens = tokenizer.encode(text)
    if len(tokens) > max_tokens:
        tokens = tokens[:max_tokens]
        text = tokenizer.decode(tokens)
    
    response = openai_client.embeddings.create(
        model=embedding_model,
        input=text
    )
    
    return response.data[0].embedding

def check_essays_table():
    """Try to check if the essays table exists by attempting to query it."""
    try:
        supabase.table("essays").select("id").limit(1).execute()
        return True
    except Exception:
        return False

def main():
    """Main function to scrape essays and store them in Supabase."""
    # Check if database is set up
    if not check_essays_table():
        print("Error: The 'essays' table doesn't exist in the database.")
        print("Please run the setup_database.sql script in your Supabase SQL Editor before continuing.")
        print("You can find this file in the scripts/ingestion directory.")
        sys.exit(1)
    
    print("Getting list of essays...")
    essays = get_essays_list()
    print(f"Found {len(essays)} essays.")
    
    for i, essay in enumerate(tqdm(essays)):
        title = essay['title']
        url = essay['url']
        
        # Check if essay already exists
        result = supabase.table("essays").select("id").eq("url", url).execute()
        if result.data:
            print(f"Essay '{title}' already exists. Skipping...")
            continue
        
        print(f"Processing essay {i+1}/{len(essays)}: {title}")
        content = get_essay_content(url)
        
        if content:
            # Insert essay
            essay_result = supabase.table("essays").insert({
                "title": title,
                "url": url,
                "content": content
            }).execute()
            
            essay_id = essay_result.data[0]['id']
            
            # Split content into chunks
            chunks = split_text_into_chunks(content)
            
            # Process each chunk
            for chunk in chunks:
                # Get embedding for chunk
                embedding = get_embedding(chunk)
                
                # Insert chunk with embedding
                supabase.table("essay_chunks").insert({
                    "essay_id": essay_id,
                    "chunk_text": chunk,
                    "embedding": embedding
                }).execute()
            
            # Sleep to avoid rate limits
            time.sleep(1)
        else:
            print(f"Failed to get content for essay: {title}")
    
    print("Ingestion complete!")

if __name__ == "__main__":
    main()