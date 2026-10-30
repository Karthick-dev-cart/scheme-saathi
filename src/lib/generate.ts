import Anthropic from "@anthropic-ai/sdk";
import type { SearchResult } from "./search";

const MODEL = "claude-sonnet-4-5";

function client() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local to enable answer generation."
    );
  }
  return new Anthropic({ apiKey });
}

const SYSTEM_PROMPT = `You are Scheme Saathi, an assistant that helps Tamil Nadu residents \
(especially gig workers, drivers, and unorganised-sector workers) understand which government \
welfare schemes they may be eligible for.

Rules:
- Only state facts that are directly supported by the provided context chunks. Never invent \
eligibility criteria, benefit amounts, or deadlines.
- Every factual claim (an amount, an age limit, a document requirement) must be followed by a \
citation marker like [1], [2] referring to the numbered context chunks.
- If the user's situation is ambiguous (e.g. their occupation or which welfare board applies \
isn't clear), ask a short clarifying question instead of guessing.
- If the retrieved context does not actually answer the question, say so plainly instead of \
making something up.
- If a benefit change is described in the context as "proposed", "requested", or "not yet \
enacted", make clear to the user that it is not yet confirmed — do not state it as current policy.
- Keep answers concise and in plain language — the user may not be familiar with government \
terminology.`;

export interface GeneratedAnswer {
  text: string;
  citations: { marker: string; chunkId: string; sourceUrl: string; sourceName: string }[];
}

export async function generateAnswer(
  question: string,
  contextChunks: SearchResult[]
): Promise<GeneratedAnswer> {
  const contextBlock = contextChunks
    .map(
      (c, i) =>
        `[${i + 1}] (source: ${c.sourceName}, ${c.sourceUrl})\n${c.docTitle} — ${c.heading}\n${c.text}`
    )
    .join("\n\n---\n\n");

  const anthropic = client();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Context chunks:\n\n${contextBlock}\n\n---\n\nUser question: ${question}`,
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  const citations = contextChunks.map((c, i) => ({
    marker: `[${i + 1}]`,
    chunkId: c.chunkId,
    sourceUrl: c.sourceUrl,
    sourceName: c.sourceName,
  }));

  return { text, citations };
}
