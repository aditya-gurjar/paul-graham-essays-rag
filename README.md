# Paul Graham Essay RAG System

A Retrieval Augmented Generation (RAG) system that provides intelligent search and analysis of Paul Graham's essays.

## Features

- **Essay Scraping**: Automatically scrapes essays from [paulgraham.com](http://paulgraham.com/articles.html)
- **Vector Search**: Uses OpenAI embeddings and pgvector for semantic search
- **AI-Powered Responses**: Generates insightful answers based on relevant essay content
- **Source Citations**: Provides links to original essays for further reading
- **Modern UI**: Clean, responsive interface built with Next.js and Shadcn UI

## Tech Stack

- **Frontend**: Next.js with Shadcn UI components
- **Database**: Supabase (PostgreSQL + pgvector)
- **Data Processing**: Python for scraping and embedding generation
- **AI**: OpenAI API for embeddings and text generation

## Setup Instructions

### 1. Clone this repository

```bash
git clone https://github.com/yourusername/paul-graham-rag.git
cd paul-graham-rag
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Set up Supabase

Create a Supabase project (or use a self-hosted instance)
Run the SQL in `scripts/setup_database.sql` to set up necessary tables and extensions

### 4. Configure environment variables

Create a `.env.local` file in the root directory:

```env
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 5. Run the data ingestion script

```bash
cd scripts/ingestion
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python scrape.py
```

### 6. Start the development server

```bash
npm run dev
```

Visit http://localhost:3000 to use the application.

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Next.js        │     │  Supabase       │     │  OpenAI API     │
│  Frontend       │◄────┤  Vector DB      │◄────┤  Embeddings     │
│                 │     │                 │     │  & Generation   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
▲                       ▲                       ▲
│                       │                       │
│                       │                       │
▼                       ▼                       ▼
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│                Python Data Ingestion Pipeline                 │
│                                                               │
└───────────────────────────────────────────────────────────────┘
▲
│
▼
┌─────────────────────┐
│                     │
│  Paul Graham's      │
│  Essays Website     │
│                     │
└─────────────────────┘
```
