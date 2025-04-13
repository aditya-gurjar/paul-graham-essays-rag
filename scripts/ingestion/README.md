# Paul Graham Essays RAG System - Data Ingestion

This script scrapes Paul Graham's essays, generates embeddings, and stores them in a Supabase database.

## Setup Instructions

1. First, set up the database schema by running the SQL in `setup_database.sql`:
   - Open your Supabase Studio
   - Navigate to the SQL Editor
   - Copy the contents of `setup_database.sql` and run the script

2. Set up environment variables in a `.env` file:
   ```env
   OPENAI_API_KEY=your_openai_api_key
   SUPABASE_URL=your_supabase_url (e.g., http://localhost:8000)
   SUPABASE_KEY=your_service_role_key
   ```

3. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the ingestion script:
   ```bash
   python scrape.py
   ```

## What the Script Does

The script will:
- Check if the database tables exist
- Scrape Paul Graham's essays
- Generate embeddings for each chunk
- Store everything in your Supabase database
