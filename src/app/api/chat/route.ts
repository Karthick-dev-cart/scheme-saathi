import { NextRequest, NextResponse } from "next/server";
import { hybridSearch } from "@/lib/search";
import { generateAnswer } from "@/lib/generate";

export async function POST(req: NextRequest) {
  const { question } = await req.json();

  if (typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  // Wider window than the English-only baseline (5) because the multilingual embedding
  // model's cross-lingual ranking is meaningfully weaker for Tamil — see README for the
  // measured gap. The extra candidates cost little at this corpus size (31 chunks) and give
  // the generation step a better chance of still seeing the right chunk.
  const contextChunks = await hybridSearch(question, 8);

  try {
    const answer = await generateAnswer(question, contextChunks);
    return NextResponse.json(answer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json(
      {
        error: message,
        retrievedOnly: contextChunks.map((c) => ({
          docTitle: c.docTitle,
          heading: c.heading,
          text: c.text,
          sourceType: c.sourceType,
          sourceUrl: c.sourceUrl,
          sourceName: c.sourceName,
        })),
      },
      { status: 503 }
    );
  }
}
