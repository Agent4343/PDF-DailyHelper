# Deployment & Onboarding Guide

## 1. Prerequisites
- Node.js 18.17+ / npm 9+
- MongoDB instance (Atlas or self-hosted)
- Supabase project with the Vector extension enabled
- OpenAI API key
- Optional OCR provider credentials (Azure Vision or OCR.Space)
- Vercel account (or another Node-friendly hosting target)

## 2. Environment Variables
Create `.env` for local dev and configure the same values in Vercel → Project → Settings → Environment Variables:

| Key | Description |
| --- | --- |
| `PORT` | Optional local port (defaults to 3000) |
| `DATABASE_URL` | Mongo connection string |
| `SESSION_SECRET` | Random string for sessions |
| `OPENAI_API_KEY` | For chat/embeddings |
| `OPENAI_EMBEDDING_MODEL` | Defaults to `text-embedding-3-small` |
| `OPENAI_CHAT_MODEL` | Defaults to `gpt-4o-mini` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase project details |
| `SUPABASE_EMBEDDINGS_TABLE` | Defaults to `pdf_chunks` |
| `SUPABASE_MATCH_RPC` | Defaults to `match_pdf_chunks` |
| `OCR_PROVIDER` | `azure`, `ocrspace`, or empty to disable |
| `AZURE_VISION_ENDPOINT` / `AZURE_VISION_KEY` | Required when `OCR_PROVIDER=azure` |
| `OCRSPACE_API_KEY` | Required when `OCR_PROVIDER=ocrspace` |
| `OCR_TRIGGER_IF_TEXT_BELOW` | Character threshold before invoking OCR (default 40) |
| `LOG_LEVEL` | `info`, `warn`, `error`, etc. |
| `API_RATE_WINDOW_MS` / `API_RATE_MAX` | General API throttling |
| `CHAT_RATE_WINDOW_MS` / `CHAT_RATE_MAX` | Chat-specific throttling |

## 3. Supabase Setup
Run this SQL in the Supabase SQL editor (adjust names if you changed env vars):

```sql
create extension if not exists vector;

create table if not exists pdf_chunks (
  id uuid primary key,
  pdf_id text not null,
  user_id text not null,
  chunk_index int not null,
  content text,
  filename text,
  original_name text,
  embedding vector(1536),
  created_at timestamptz default now()
);

create or replace function match_pdf_chunks(
  query_embedding vector(1536),
  match_count int,
  match_threshold float,
  filter_pdf_id text,
  user_id text
)
returns table (
  id uuid,
  pdf_id text,
  user_id text,
  chunk_index int,
  content text,
  filename text,
  original_name text,
  similarity float
)
language plpgsql
as $$
begin
  return query
    select pc.id, pc.pdf_id, pc.user_id, pc.chunk_index, pc.content, pc.filename, pc.original_name,
           1 - (pc.embedding <=> query_embedding) as similarity
    from pdf_chunks pc
    where pc.user_id = match_pdf_chunks.user_id
      and (filter_pdf_id is null or pc.pdf_id = filter_pdf_id)
      and (pc.embedding <=> query_embedding) <= (1 - match_threshold)
    order by pc.embedding <=> query_embedding
    limit match_count;
end;
$$;
```

## 4. Local Development
```bash
npm install
npm run dev # or `npm start`
```

- Upload PDFs at `http://localhost:3000`
- Search via `/search`
- Chat via `/chat` (SSE streaming by default)
- Run tests: `npm test`

## 5. Deploying to Vercel
1. `vercel init` (if not already linked).
2. Ensure `vercel.json` routes everything to `api/index.js`.
3. `vercel env pull .env.local` to sync env vars or add them via dashboard.
4. `vercel --prod`

## 6. Operational Notes
- **Telemetry**: server logs use Pino (JSON) with request-level tracing. Check Vercel/host logs for ingestion/OCR/LLM errors.
- **Rate limiting**: Adjust rate env vars to tune API/Chat throughput.
- **Storage**: PDF binaries stay in MongoDB; delete endpoints clean up Supabase embeddings + Mongo index docs.
- **OCR**: If you enable a provider, the UI shows its status and each PDF is tagged as `OCR enhanced`, `Text native`, or `Processing`.
- **Chat history**: Session-based; bump `MAX_HISTORY_ENTRIES` in `routes/chatRoutes.js` if you need longer conversations.

## 7. Troubleshooting
- **Embeddings not returned**: Verify Supabase RPC exists and `SUPABASE_SERVICE_ROLE_KEY` has rights.
- **OCR skipped**: Check `OCR_PROVIDER` and provider-specific keys; logs will state when credentials are missing.
- **Uploads fail on Vercel**: Ensure Mongo/Supabase/OpenAI env vars are set and the session store can reach Mongo.
- **Streaming not working**: SSE requires HTTPS/HTTP1.1 proxies; Vercel supports this out of the box.
