import { readFileSync } from "fs";
import path from "path";
import { embed } from "./embeddings";

export interface IndexedChunk {
  chunkId: string;
  docId: string;
  docTitle: string;
  board: string;
  sourceUrl: string;
  sourceName: string;
  heading: string;
  text: string;
  vector: number[];
}

export interface SearchResult extends Omit<IndexedChunk, "vector"> {
  vectorScore: number;
  keywordScore: number;
  score: number;
}

let indexCache: IndexedChunk[] | null = null;

function loadIndex(): IndexedChunk[] {
  if (!indexCache) {
    const indexPath = path.join(process.cwd(), "data", "index.json");
    indexCache = JSON.parse(readFileSync(indexPath, "utf-8"));
  }
  return indexCache!;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // vectors are already L2-normalized at embed time
}

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "to", "of", "for", "in", "on", "and", "or",
  "my", "i", "me", "do", "does", "what", "how", "can", "will", "be", "it",
  "this", "that", "with", "as", "if", "am", "was", "were",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9₹\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

// Colloquial query terms often don't match formal government document vocabulary
// (e.g. "died" vs "death", "compensation" vs "benefit amount"). A small domain
// synonym map closes that gap for keyword scoring without needing a real stemmer.
const SYNONYMS: Record<string, string[]> = {
  died: ["death", "dead", "deceased"],
  death: ["died", "dead", "deceased"],
  dead: ["death", "died", "deceased"],
  accident: ["accidental"],
  accidental: ["accident"],
  compensation: ["benefit", "assistance", "amount"],
  claim: ["benefit", "assistance", "compensation"],
  money: ["amount", "benefit", "assistance"],
  pay: ["benefit", "assistance", "amount"],
  husband: ["family", "worker"],
  wife: ["family", "worker"],
};

function expandWithSynonyms(terms: string[]): string[] {
  const expanded = new Set(terms);
  for (const t of terms) {
    for (const syn of SYNONYMS[t] ?? []) expanded.add(syn);
  }
  return Array.from(expanded);
}

// Simple term-overlap keyword score (fraction of query terms present in the chunk,
// after synonym expansion). Combined with vector similarity for hybrid retrieval —
// catches exact scheme names/numbers that embeddings alone sometimes under-weight.
function keywordScore(queryTerms: string[], chunkText: string): number {
  if (queryTerms.length === 0) return 0;
  const expandedTerms = expandWithSynonyms(queryTerms);
  const chunkTerms = new Set(tokenize(chunkText));
  const hits = expandedTerms.filter((t) => chunkTerms.has(t)).length;
  return hits / expandedTerms.length;
}

export async function hybridSearch(
  query: string,
  topK = 5,
  vectorWeight = 0.65
): Promise<SearchResult[]> {
  const index = loadIndex();
  const queryVector = await embed(query);
  const queryTerms = tokenize(query);

  const scored: SearchResult[] = index.map(({ vector, ...rest }) => {
    const vectorScoreRaw = cosineSimilarity(queryVector, vector);
    const kwScore = keywordScore(queryTerms, `${rest.heading} ${rest.text}`);
    const score = vectorWeight * vectorScoreRaw + (1 - vectorWeight) * kwScore;
    return { ...rest, vectorScore: vectorScoreRaw, keywordScore: kwScore, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
