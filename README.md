# Scheme Saathi

A grounded RAG assistant that helps Tamil Nadu unorganised-sector workers (drivers, domestic
workers, construction workers, street vendors, etc.) figure out which government welfare
schemes they're eligible for — with every claim cited back to its source document.

Built as a deliberately production-shaped RAG project rather than a "chat with a PDF" demo:
retrieval, grounding, and evaluation are treated as first-class engineering problems, not an
afterthought around an LLM call.

## Why this exists

Eligibility for schemes like the Tamil Nadu Unorganised Workers Welfare Board (TNUWWB) is
genuinely confusing — benefit amounts differ across 18 separate welfare boards for
similar-sounding schemes (e.g. "marriage assistance" pays ₹3,000 under the Manual Workers board
but ₹20,000 under the Construction Workers board), and the information is spread across PDFs and
district-level pages with no single authoritative, queryable source.

## Architecture

```
data/schemes/*.md        hand-curated corpus, one doc per welfare board, each
                          frontmatter-tagged with its real source URL
scripts/build-index.ts   chunks docs by heading, embeds locally, writes data/index.json
src/lib/embeddings.ts    local embeddings via @huggingface/transformers (all-MiniLM-L6-v2,
                          runs on-device — no API key, no per-query cost)
src/lib/search.ts        hybrid retrieval: cosine similarity + keyword overlap with a small
                          domain synonym map (closes the "died" vs "death" vocabulary gap
                          between colloquial queries and formal government text)
src/lib/generate.ts      Claude (claude-sonnet-4-5) generates the final answer, instructed to
                          cite every factual claim and ask a clarifying question when the
                          user's occupation/board is ambiguous rather than guess
eval/testset.json        16 real eligibility questions with expected source documents
scripts/eval.ts          hit-rate@k over the test set — currently 100% @1/@3/@5
src/app/api/chat/route.ts   retrieval + generation, with a graceful fallback that still
                             surfaces raw retrieved context if generation fails (e.g. no API key)
src/app/page.tsx         mobile-first chat UI with inline source citations
```

## Key engineering decisions (and why)

- **Local embeddings, not a hosted embeddings API.** Retrieval has zero external dependency and
  zero per-query cost — only the final generation call needs a key. Makes the retrieval half of
  the system independently testable and demoable without any credentials.
- **Hybrid search, not pure vector similarity.** Pure cosine similarity missed the right benefit
  table for "my husband died in a road accident, what compensation can I claim" because the
  source table says "Accidental death" not "died" — see eval history for the before/after.
  Fixed via (a) prefixing each chunk's embedding text with its document title for more semantic
  context, and (b) a small synonym map for keyword scoring.
- **Eval-first, not vibes-first.** `eval/testset.json` encodes expected source docs per query,
  including deliberately ambiguous cases (occupation not stated) where multiple boards are valid
  hits — so the eval distinguishes "wrong retrieval" from "appropriately ambiguous."
- **Citations are structural, not cosmetic.** The generation prompt requires every factual claim
  to carry a `[n]` marker tied to a specific retrieved chunk and source URL; the UI renders these
  as clickable source links.

## Running it

```bash
npm install
npm run build-index   # builds data/index.json from data/schemes/*.md (one-time, local only)
npm run eval           # retrieval-only eval, no API key needed
cp .env.local.example .env.local   # add your ANTHROPIC_API_KEY to enable generation
npm run dev
```

## Known limitations / next steps

- Corpus currently covers 4 documents across 3 of TN's 18 welfare boards — real breadth would
  need systematic ingestion from tn.data.gov.in rather than hand-curated docs.
- No reranking model yet — hybrid score is a fixed linear blend (0.65 vector / 0.35 keyword),
  not learned or cross-encoder reranked.
- Generation quality (groundedness, not just retrieval hit-rate) hasn't been eval'd yet — that
  needs an LLM-judge pass once a Claude API key is wired in for real.
