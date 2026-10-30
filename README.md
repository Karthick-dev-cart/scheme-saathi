# Scheme Saathi

A grounded RAG assistant that helps Tamil Nadu unorganised-sector workers (drivers, domestic
workers, construction workers, street vendors, etc.) figure out which government welfare
schemes they're eligible for — with every claim cited back to its source document, and every
source labeled with how authoritative it actually is.

Built as a deliberately production-shaped RAG project rather than a "chat with a PDF" demo:
retrieval, grounding, source provenance, and evaluation are treated as first-class engineering
problems, not an afterthought around an LLM call.

## Why this exists

Eligibility for Tamil Nadu's 17 Unorganised Workers Welfare Boards is genuinely confusing: most
benefits (marriage, maternity, accidental death, pension, education) follow one common schedule
across all 17 boards, but a couple of benefits are board-specific exceptions (e.g. construction
workers get ₹5,00,000 for a work-site accidental death vs. ₹1,00,000 elsewhere, and only the
Construction board offers a family pension) — and the information is spread across PDFs and
district-level pages with no single authoritative, queryable source.

## Architecture

```
data/schemes/*.md        hand-curated corpus, one doc per welfare board/topic, each
                          frontmatter-tagged with its real source URL AND a source_type
                          (official / news / mixed) so the UI can show provenance honestly
scripts/build-index.ts   chunks docs by heading, embeds locally, writes data/index.json
src/lib/embeddings.ts    local embeddings via @huggingface/transformers (all-MiniLM-L6-v2,
                          runs on-device — no API key, no per-query cost)
src/lib/search.ts        hybrid retrieval: cosine similarity + keyword overlap with a small
                          domain synonym map (closes the "died" vs "death" vocabulary gap
                          between colloquial queries and formal government text)
src/lib/generate.ts      Claude (claude-sonnet-4-5) generates the final answer, instructed to
                          cite every factual claim, weight official sources over news/aggregator
                          sources, and ask a clarifying question when the user's occupation/board
                          is ambiguous rather than guess
eval/testset.json        16 real eligibility questions with expected source documents
scripts/eval.ts          hit-rate@k over the test set — currently 93.8% @3, 100% @5
src/app/api/chat/route.ts   retrieval + generation, with a graceful fallback that still
                             surfaces raw retrieved context (with source-type badges) if
                             generation fails (e.g. no API key)
src/app/page.tsx         mobile-first chat UI with inline source citations, color-coded by
                          source type (green=official, amber=news, gray=aggregator/mixed)
data/eligibility-rules.json   structured eligibility schema: common age/EPF-ESI rules, common
                               benefit schedule, and per-board occupation keywords + exceptions
src/lib/eligibility.ts   deterministic rule-based eligibility matcher — no LLM call, same
                          answer every time for the same inputs
scripts/test-eligibility.ts   regression tests for the rule engine, including the exact
                               driver/family-pension bug caught during re-sourcing
src/app/api/eligibility/route.ts + "Quick eligibility check" tab in the UI
```

## Key engineering decisions (and why)

- **Local embeddings, not a hosted embeddings API.** Retrieval has zero external dependency and
  zero per-query cost — only the final generation call needs a key. Makes the retrieval half of
  the system independently testable and demoable without any credentials.
- **Hybrid search, not pure vector similarity.** Pure cosine similarity missed the right benefit
  table for "my husband died in a road accident, what compensation can I claim" because the
  source table says "Accidental death" not "died." Fixed via (a) prefixing each chunk's embedding
  text with its document title for more semantic context, and (b) a small synonym map for keyword
  scoring.
- **Source provenance is a first-class field, not an afterthought.** Every doc is tagged
  `source_type: official | news | mixed`. The first corpus draft cited a news aggregator
  (pressreader.com) and a third-party scheme-listing site for load-bearing benefit figures, which
  turned out to disagree with the real government citizen's charter on several amounts (e.g.
  marriage assistance ₹3,000/₹5,000 official vs. ₹20,000 from the aggregator). The corpus was
  rebuilt from the actual 38-page Tamil Nadu Labour Department citizen's charter
  (`labour.tn.gov.in/pdf/citizens.pdf`) — the generation prompt now explicitly tells the model to
  prefer official chunks and flag non-official claims as unconfirmed.
- **Eval-first, not vibes-first.** `eval/testset.json` encodes expected source docs per query,
  including deliberately ambiguous cases (occupation not stated) where multiple boards are valid
  hits — so the eval distinguishes "wrong retrieval" from "appropriately ambiguous."
- **Citations are structural, not cosmetic.** The generation prompt requires every factual claim
  to carry a `[n]` marker tied to a specific retrieved chunk, source URL, and source type; the UI
  renders these as clickable, color-coded source links.
- **Eligibility is rules, not RAG-vibes.** Age limits, EPF/ESI exclusion, and board-specific
  benefit amounts are deterministic facts, not something an LLM should be re-deriving from
  retrieved text on every call. `src/lib/eligibility.ts` encodes them as a rule engine with its
  own regression tests — fully functional and testable with zero API key, and more
  correct/auditable than asking an LLM to read a benefits table and do the matching itself.

## A real correction this process caught

The first corpus draft (sourced from aggregator sites because the official PDF initially failed
to fetch) stated that auto/taxi drivers register under the **Manual Workers** board and could
claim a family pension. Re-sourcing from the official citizen's charter showed drivers have their
**own dedicated board** (Tamil Nadu Unorganised Drivers Welfare Board), and that family pension
is actually **Construction Workers board-only** — a wrong answer that would have told a driver
they qualify for a benefit they don't. This is now corrected in `drivers-welfare-pension.md` and
`common-benefit-schedule.md`, with the old, lower-confidence figures dropped rather than kept
"for comparison."

## Running it

```bash
npm install
npm run build-index        # builds data/index.json from data/schemes/*.md (one-time, local only)
npm run eval                # retrieval-only eval, no API key needed
npm run test-eligibility    # rule-engine regression tests, no API key needed
cp .env.local.example .env.local   # add your ANTHROPIC_API_KEY to enable chat generation
npm run dev
```

## Known limitations / next steps

- Corpus covers 5 documents across 3 of TN's 17 welfare boards plus the common schedule — real
  breadth would need systematic ingestion from tn.data.gov.in for the other 14 boards.
- One eval query ("marriage assistance for construction workers") misses the top-3 ranking
  because board-specific queries naturally route to that board's doc, while the actual figure
  lives in the shared common-schedule doc — it still surfaces at rank 4–5, which is within the
  top-5 window generation actually uses, so it doesn't affect answer quality, but it's a known
  retrieval-ranking rough edge.
- No reranking model yet — hybrid score is a fixed linear blend (0.65 vector / 0.35 keyword),
  not learned or cross-encoder reranked. Not worth adding at this corpus size (31 chunks).
- Generation quality (groundedness, not just retrieval hit-rate) hasn't been eval'd with a real
  API key yet — an LLM-judge groundedness pass is the next step once a key is wired in.
