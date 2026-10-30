import { NextRequest, NextResponse } from "next/server";
import { hybridSearch } from "@/lib/search";
import { generateAnswer } from "@/lib/generate";

export async function POST(req: NextRequest) {
  const { question } = await req.json();

  if (typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  const contextChunks = await hybridSearch(question, 5);

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
